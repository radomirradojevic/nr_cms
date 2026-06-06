"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  createFolder as createFolderRow,
  deleteFolder as deleteFolderRow,
  deleteFiles,
  getFilesByIds,
  getFolderBreadcrumb,
  getFolderById,
  getFolderContentCounts,
  listAllFolders,
  listFiles,
  listFolders,
  moveFilesToFolder,
  purgeFileReferences,
  sanitizeFolderName,
  updateFile as updateFileRow,
  updateFolderName,
  reassignFileOwner,
  type FileRow,
  type FileFolderRow,
} from "@/data/files";
import type { FileKind } from "@/lib/file-manager";
import { deleteUpload } from "@/lib/file-storage";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { sanitizeFilename } from "@/lib/file-manager";
import { getBackendUserOptionById } from "@/lib/backend-users";
import { getRoles, hasRole } from "@/lib/roles";
import { getGlobalSettings } from "@/data/global-settings";
import {
  dateOnlyToUtcEndExclusive,
  dateOnlyToUtcStart,
} from "@/lib/regional-settings";

const ALLOWED_ROLES = ["admin", "publisher", "author"] as const;

async function getCaller() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!roles.some((r) => (ALLOWED_ROLES as readonly string[]).includes(r))) {
    return null;
  }
  return { userId, isAdmin: hasRole(roles, "admin") };
}

function canManageFolder(
  folder: FileFolderRow,
  caller: Awaited<ReturnType<typeof getCaller>>,
) {
  return Boolean(
    caller && (caller.isAdmin || folder.createdBy === caller.userId),
  );
}

function folderMutationError(err: unknown): string {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: unknown }).code)
      : "";
  if (code === "23505") {
    return "A folder with that name already exists here.";
  }
  return "Something went wrong. Please try again.";
}

// ─── Update ───────────────────────────────────────────────────────────────────

const updateFileSchema = z.object({
  id: z.string().uuid("Invalid file ID."),
  filename: z
    .string()
    .trim()
    .min(1, "Filename is required.")
    .max(200, "Filename must be 200 characters or fewer.")
    .optional(),
  title: z
    .string()
    .trim()
    .max(200, "Title must be 200 characters or fewer.")
    .optional()
    .nullable(),
  alt: z
    .string()
    .trim()
    .max(500, "Alt text must be 500 characters or fewer.")
    .optional()
    .nullable(),
});

export type UpdateFileInput = z.input<typeof updateFileSchema>;

export async function updateFile(input: UpdateFileInput) {
  const caller = await getCaller();
  if (!caller) return { error: "Forbidden." };

  const parsed = updateFileSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { id, filename, title, alt } = parsed.data;
  const patch: {
    filename?: string;
    title?: string | null;
    alt?: string | null;
  } = {};
  if (filename !== undefined) patch.filename = sanitizeFilename(filename);
  if (title !== undefined) patch.title = title === "" ? null : title;
  if (alt !== undefined) patch.alt = alt === "" ? null : alt;

  try {
    const row = await updateFileRow(id, patch, caller);
    if (!row) return { error: "File not found or access denied." };
    revalidatePath("/dashboard/filemanager");
    return { success: true, file: row };
  } catch (err) {
    console.error("[updateFile] Unexpected error:", err);
    return { error: "Something went wrong. Please try again." };
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

const bulkDeleteSchema = z.object({
  ids: z
    .array(z.string().uuid("Invalid file ID."))
    .min(1, "Select at least one file.")
    .max(100, "Cannot delete more than 100 files at once."),
});

export type BulkDeleteFilesInput = z.input<typeof bulkDeleteSchema>;

export async function bulkDeleteFiles(input: BulkDeleteFilesInput) {
  const caller = await getCaller();
  if (!caller) return { error: "Forbidden." };

  const parsed = bulkDeleteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    // Purge content references first so we don't leave dangling links if the
    // disk unlink later fails.
    for (const id of parsed.data.ids) {
      await purgeFileReferences(id, caller.userId);
    }

    const removed = await deleteFiles(parsed.data.ids, caller);

    // Best-effort disk cleanup. Failures are logged but do not roll back the DB.
    await Promise.all(removed.map((row) => deleteUpload(row.storagePath)));

    revalidatePath("/dashboard/filemanager");
    revalidatePath("/");

    return { success: true, deleted: removed.length };
  } catch (err) {
    console.error("[bulkDeleteFiles] Unexpected error:", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function deleteFile(input: { id: string }) {
  return bulkDeleteFiles({ ids: [input.id] });
}

// ─── List (client-driven filtering) ───────────────────────────────────────────

const listFilesSchema = z.object({
  kind: z.enum(["all", "image", "video", "document"]).default("all"),
  search: z.string().max(200).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  uploadedBy: z.string().optional(),
  folderId: z.string().uuid("Invalid folder ID.").nullable().optional(),
  limit: z.number().int().min(1).max(200).default(60),
  offset: z.number().int().min(0).default(0),
});

export type ListFilesInput = z.input<typeof listFilesSchema>;

export async function fetchFiles(
  input: ListFilesInput,
): Promise<
  { error: string } | { success: true; rows: FileRow[]; total: number }
> {
  const caller = await getCaller();
  if (!caller) return { error: "Forbidden." };

  const parsed = listFilesSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { kind, search, from, to, uploadedBy, folderId, limit, offset } =
    parsed.data;

  // Non-admins can only see their own files — silently ignore uploadedBy.
  const resolvedUploadedBy = caller.isAdmin ? uploadedBy : undefined;
  const settings = await getGlobalSettings();

  const { rows, total } = await listFiles({
    caller,
    kind: kind as FileKind | "all",
    search,
    from: dateOnlyToUtcStart(from, settings.regional.timezone),
    toExclusive: dateOnlyToUtcEndExclusive(to, settings.regional.timezone),
    uploadedBy: resolvedUploadedBy,
    folderId,
    limit,
    offset,
  });

  return { success: true, rows, total };
}

// ─── File Manager view (folder-aware listing) ────────────────────────────────

const fileManagerViewSchema = listFilesSchema.extend({
  folderId: z.string().uuid("Invalid folder ID.").nullable().default(null),
});

export type FileManagerViewInput = z.input<typeof fileManagerViewSchema>;

export async function fetchFileManagerView(
  input: FileManagerViewInput,
): Promise<
  | { error: string }
  | {
      success: true;
      rows: FileRow[];
      folders: FileFolderRow[];
      breadcrumb: FileFolderRow[];
      total: number;
    }
> {
  const caller = await getCaller();
  if (!caller) return { error: "Forbidden." };

  const parsed = fileManagerViewSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { kind, search, from, to, uploadedBy, folderId, limit, offset } =
    parsed.data;

  if (folderId) {
    const folder = await getFolderById(folderId);
    if (!folder) return { error: "Folder not found." };
  }

  const resolvedUploadedBy = caller.isAdmin ? uploadedBy : undefined;
  const settings = await getGlobalSettings();

  const [{ rows, total }, folders, breadcrumb] = await Promise.all([
    listFiles({
      caller,
      kind: kind as FileKind | "all",
      search,
      from: dateOnlyToUtcStart(from, settings.regional.timezone),
      toExclusive: dateOnlyToUtcEndExclusive(to, settings.regional.timezone),
      uploadedBy: resolvedUploadedBy,
      folderId,
      limit,
      offset,
    }),
    listFolders({ parentId: folderId, search }),
    folderId ? getFolderBreadcrumb(folderId) : Promise.resolve([]),
  ]);

  return { success: true, rows, folders, breadcrumb, total };
}

// ─── Folders ────────────────────────────────────────────────────────────────

const folderNameSchema = z
  .string()
  .trim()
  .min(1, "Folder name is required.")
  .max(100, "Folder name must be 100 characters or fewer.");

const createFolderSchema = z.object({
  name: folderNameSchema,
  parentId: z.string().uuid("Invalid parent folder ID.").nullable().optional(),
});

export async function createFileFolder(
  input: z.input<typeof createFolderSchema>,
): Promise<{ error: string } | { success: true; folder: FileFolderRow }> {
  const caller = await getCaller();
  if (!caller) return { error: "Forbidden." };

  const parsed = createFolderSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const parentId = parsed.data.parentId ?? null;
  if (parentId) {
    const parent = await getFolderById(parentId);
    if (!parent) return { error: "Parent folder not found." };
  }

  const name = sanitizeFolderName(parsed.data.name);
  if (!name) return { error: "Folder name is required." };

  try {
    const folder = await createFolderRow({
      name,
      parentId,
      actorId: caller.userId,
    });
    revalidatePath("/dashboard/filemanager");
    return { success: true, folder };
  } catch (err) {
    console.error("[createFileFolder] Unexpected error:", err);
    return { error: folderMutationError(err) };
  }
}

const renameFolderSchema = z.object({
  id: z.string().uuid("Invalid folder ID."),
  name: folderNameSchema,
});

export async function renameFileFolder(
  input: z.input<typeof renameFolderSchema>,
): Promise<{ error: string } | { success: true; folder: FileFolderRow }> {
  const caller = await getCaller();
  if (!caller) return { error: "Forbidden." };

  const parsed = renameFolderSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const folder = await getFolderById(parsed.data.id);
  if (!folder) return { error: "Folder not found." };
  if (!canManageFolder(folder, caller)) {
    return { error: "Only the creator or an admin can rename this folder." };
  }

  const name = sanitizeFolderName(parsed.data.name);
  if (!name) return { error: "Folder name is required." };

  try {
    const updated = await updateFolderName({
      id: parsed.data.id,
      name,
      actorId: caller.userId,
    });
    if (!updated) return { error: "Folder not found." };
    revalidatePath("/dashboard/filemanager");
    return { success: true, folder: updated };
  } catch (err) {
    console.error("[renameFileFolder] Unexpected error:", err);
    return { error: folderMutationError(err) };
  }
}

const deleteFolderSchema = z.object({
  id: z.string().uuid("Invalid folder ID."),
});

export async function deleteFileFolder(
  input: z.input<typeof deleteFolderSchema>,
): Promise<{ error: string } | { success: true; deleted: string }> {
  const caller = await getCaller();
  if (!caller) return { error: "Forbidden." };

  const parsed = deleteFolderSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const folder = await getFolderById(parsed.data.id);
  if (!folder) return { error: "Folder not found." };
  if (!canManageFolder(folder, caller)) {
    return { error: "Only the creator or an admin can delete this folder." };
  }

  const counts = await getFolderContentCounts(parsed.data.id);
  if (counts.files > 0 || counts.folders > 0) {
    return { error: "Only empty folders can be deleted." };
  }

  try {
    const deleted = await deleteFolderRow(parsed.data.id);
    if (!deleted) return { error: "Folder not found." };
    revalidatePath("/dashboard/filemanager");
    return { success: true, deleted: deleted.id };
  } catch (err) {
    console.error("[deleteFileFolder] Unexpected error:", err);
    return { error: "Something went wrong. Please try again." };
  }
}

const moveFilesSchema = z.object({
  ids: z
    .array(z.string().uuid("Invalid file ID."))
    .min(1, "Select at least one file.")
    .max(100, "Cannot move more than 100 files at once."),
  folderId: z.string().uuid("Invalid folder ID.").nullable(),
});

export async function moveSelectedFiles(
  input: z.input<typeof moveFilesSchema>,
): Promise<{ error: string } | { success: true; files: FileRow[] }> {
  const caller = await getCaller();
  if (!caller) return { error: "Forbidden." };

  const parsed = moveFilesSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (parsed.data.folderId) {
    const target = await getFolderById(parsed.data.folderId);
    if (!target) return { error: "Target folder not found." };
  }

  const selectedRows = await getFilesByIds(parsed.data.ids, caller);
  if (selectedRows.length !== parsed.data.ids.length) {
    return { error: "One or more files were not found or access was denied." };
  }

  try {
    const moved = await moveFilesToFolder(
      parsed.data.ids,
      parsed.data.folderId,
      caller,
    );
    revalidatePath("/dashboard/filemanager");
    return { success: true, files: moved };
  } catch (err) {
    console.error("[moveSelectedFiles] Unexpected error:", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function fetchFolderOptions(): Promise<
  { error: string } | { success: true; folders: FileFolderRow[] }
> {
  const caller = await getCaller();
  if (!caller) return { error: "Forbidden." };

  const folders = await listAllFolders();
  return { success: true, folders };
}

// ─── Reassign file owner (admin only) ─────────────────────────────────────────

const reassignSchema = z.object({
  fileId: z.string().uuid("Invalid file ID."),
  newOwnerId: z.string().min(1, "Target user is required."),
});

export async function reassignFile(input: {
  fileId: string;
  newOwnerId: string;
}): Promise<{ error: string } | { success: true; file: FileRow }> {
  const caller = await getCaller();
  if (!caller) return { error: "Forbidden." };
  if (!caller.isAdmin) return { error: "Only admins can reassign files." };

  const parsed = reassignSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const owner = await getBackendUserOptionById(parsed.data.newOwnerId);
  if (!owner) return { error: "Target user must be a backend user." };

  try {
    const row = await reassignFileOwner(
      parsed.data.fileId,
      parsed.data.newOwnerId,
    );
    if (!row) return { error: "File not found." };
    revalidatePath("/dashboard/filemanager");
    return { success: true, file: row };
  } catch (err) {
    console.error("[reassignFile] Unexpected error:", err);
    return { error: "Something went wrong. Please try again." };
  }
}
