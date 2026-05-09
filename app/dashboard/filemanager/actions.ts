"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  deleteFiles,
  listFiles,
  purgeFileReferences,
  updateFile as updateFileRow,
  type FileRow,
} from "@/data/files";
import type { FileKind } from "@/lib/file-manager";
import { deleteUpload } from "@/lib/file-storage";
import { sanitizeFilename } from "@/lib/file-manager";
import { getRoles, hasRole } from "@/lib/roles";

const ALLOWED_ROLES = ["admin", "publisher", "author"] as const;

async function getCaller() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!roles.some((r) => (ALLOWED_ROLES as readonly string[]).includes(r))) {
    return null;
  }
  return { userId, isAdmin: hasRole(roles, "admin") };
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
      await purgeFileReferences(id);
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
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
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

  const { kind, search, from, to, limit, offset } = parsed.data;

  const { rows, total } = await listFiles({
    caller,
    kind: kind as FileKind | "all",
    search,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    limit,
    offset,
  });

  return { success: true, rows, total };
}
