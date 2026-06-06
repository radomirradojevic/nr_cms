import { db } from "@/db";
import { files, fileFolders, content } from "@/db/schema";
import { updateContentWithRevision } from "@/data/content-revisions";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  count,
  gte,
  isNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";
import type { FileKind } from "@/lib/file-manager";

export type FileRow = typeof files.$inferSelect;
export type FileFolderRow = typeof fileFolders.$inferSelect;

export type Caller = { userId: string; isAdmin: boolean };

function ownerWhere(c: Caller) {
  return c.isAdmin ? undefined : eq(files.uploadedBy, c.userId);
}

function folderParentWhere(parentId: string | null) {
  return parentId === null
    ? isNull(fileFolders.parentId)
    : eq(fileFolders.parentId, parentId);
}

export function sanitizeFolderName(name: string): string {
  return name
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

export function normalizeFolderName(name: string): string {
  return sanitizeFolderName(name).toLowerCase();
}

export async function listFiles(opts: {
  caller: Caller;
  kind?: FileKind | "all";
  search?: string;
  from?: Date;
  to?: Date;
  toExclusive?: Date;
  uploadedBy?: string;
  folderId?: string | null;
  limit: number;
  offset: number;
}): Promise<{ rows: FileRow[]; total: number }> {
  const conditions = [];
  const owner = ownerWhere(opts.caller);
  if (owner) conditions.push(owner);
  if (opts.kind && opts.kind !== "all")
    conditions.push(eq(files.kind, opts.kind));
  if (opts.search && opts.search.trim()) {
    const q = `%${opts.search.trim()}%`;
    conditions.push(
      or(ilike(files.filename, q), ilike(files.title, q), ilike(files.alt, q))!,
    );
  }
  if (opts.from) conditions.push(gte(files.created, opts.from));
  if (opts.to) conditions.push(lte(files.created, opts.to));
  if (opts.toExclusive) conditions.push(lt(files.created, opts.toExclusive));
  if (opts.uploadedBy) conditions.push(eq(files.uploadedBy, opts.uploadedBy));
  if (opts.folderId !== undefined) {
    conditions.push(
      opts.folderId === null
        ? isNull(files.folderId)
        : eq(files.folderId, opts.folderId),
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(files)
      .where(where)
      .orderBy(desc(files.created))
      .limit(opts.limit)
      .offset(opts.offset),
    db.select({ total: count() }).from(files).where(where),
  ]);
  return { rows, total };
}

export async function listFolders(opts: {
  parentId: string | null;
  search?: string;
}): Promise<FileFolderRow[]> {
  const conditions = [folderParentWhere(opts.parentId)];
  if (opts.search && opts.search.trim()) {
    conditions.push(ilike(fileFolders.name, `%${opts.search.trim()}%`));
  }
  return db
    .select()
    .from(fileFolders)
    .where(and(...conditions))
    .orderBy(asc(fileFolders.name), asc(fileFolders.created));
}

export async function listAllFolders(): Promise<FileFolderRow[]> {
  return db
    .select()
    .from(fileFolders)
    .orderBy(asc(fileFolders.name), asc(fileFolders.created));
}

export async function getFolderById(id: string): Promise<FileFolderRow | null> {
  const rows = await db
    .select()
    .from(fileFolders)
    .where(eq(fileFolders.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getFolderBreadcrumb(
  id: string,
): Promise<FileFolderRow[]> {
  const breadcrumb: FileFolderRow[] = [];
  let current = await getFolderById(id);

  for (let depth = 0; current && depth < 50; depth += 1) {
    breadcrumb.unshift(current);
    if (!current.parentId) break;
    current = await getFolderById(current.parentId);
  }

  return breadcrumb;
}

export async function createFolder(input: {
  name: string;
  parentId: string | null;
  actorId: string;
}): Promise<FileFolderRow> {
  const cleanName = sanitizeFolderName(input.name);
  const rows = await db
    .insert(fileFolders)
    .values({
      name: cleanName,
      normalizedName: normalizeFolderName(cleanName),
      parentId: input.parentId,
      createdBy: input.actorId,
      updatedBy: input.actorId,
    })
    .returning();
  return rows[0];
}

export async function updateFolderName(input: {
  id: string;
  name: string;
  actorId: string;
}): Promise<FileFolderRow | null> {
  const cleanName = sanitizeFolderName(input.name);
  const rows = await db
    .update(fileFolders)
    .set({
      name: cleanName,
      normalizedName: normalizeFolderName(cleanName),
      updatedBy: input.actorId,
    })
    .where(eq(fileFolders.id, input.id))
    .returning();
  return rows[0] ?? null;
}

export async function getFolderContentCounts(id: string): Promise<{
  files: number;
  folders: number;
}> {
  const [[fileCount], [folderCount]] = await Promise.all([
    db.select({ total: count() }).from(files).where(eq(files.folderId, id)),
    db
      .select({ total: count() })
      .from(fileFolders)
      .where(eq(fileFolders.parentId, id)),
  ]);

  return {
    files: fileCount?.total ?? 0,
    folders: folderCount?.total ?? 0,
  };
}

export async function deleteFolder(id: string): Promise<FileFolderRow | null> {
  const rows = await db
    .delete(fileFolders)
    .where(eq(fileFolders.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function getFileById(
  id: string,
  caller: Caller,
): Promise<FileRow | null> {
  const conditions = [eq(files.id, id)];
  const owner = ownerWhere(caller);
  if (owner) conditions.push(owner);
  const rows = await db
    .select()
    .from(files)
    .where(and(...conditions))
    .limit(1);
  return rows[0] ?? null;
}

export async function getFileByIdUnchecked(
  id: string,
): Promise<FileRow | null> {
  const rows = await db.select().from(files).where(eq(files.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getFilesByIds(
  ids: string[],
  caller: Caller,
): Promise<FileRow[]> {
  if (ids.length === 0) return [];
  const conditions = [inArray(files.id, ids)];
  const owner = ownerWhere(caller);
  if (owner) conditions.push(owner);
  return db
    .select()
    .from(files)
    .where(and(...conditions))
    .orderBy(desc(files.created));
}

export type InsertFileInput = {
  id?: string;
  filename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  kind: FileKind;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  title?: string | null;
  folderId?: string | null;
  uploadedBy: string;
};

export async function insertFile(input: InsertFileInput): Promise<FileRow> {
  const rows = await db.insert(files).values(input).returning();
  return rows[0];
}

export type UpdateFilePatch = {
  filename?: string;
  title?: string | null;
  alt?: string | null;
};

export async function updateFile(
  id: string,
  patch: UpdateFilePatch,
  caller: Caller,
): Promise<FileRow | null> {
  const conditions = [eq(files.id, id)];
  const owner = ownerWhere(caller);
  if (owner) conditions.push(owner);
  const rows = await db
    .update(files)
    .set(patch)
    .where(and(...conditions))
    .returning();
  return rows[0] ?? null;
}

export async function deleteFiles(
  ids: string[],
  caller: Caller,
): Promise<FileRow[]> {
  if (ids.length === 0) return [];
  const conditions = [inArray(files.id, ids)];
  const owner = ownerWhere(caller);
  if (owner) conditions.push(owner);
  return db
    .delete(files)
    .where(and(...conditions))
    .returning();
}

export async function moveFilesToFolder(
  ids: string[],
  folderId: string | null,
  caller: Caller,
): Promise<FileRow[]> {
  if (ids.length === 0) return [];
  const conditions = [inArray(files.id, ids)];
  const owner = ownerWhere(caller);
  if (owner) conditions.push(owner);
  return db
    .update(files)
    .set({ folderId })
    .where(and(...conditions))
    .returning();
}

export async function findContentReferencingFile(fileId: string) {
  // Match by file id appearing anywhere in the row's content (HTML), JSON, or cover_image.
  return db
    .select()
    .from(content)
    .where(
      or(
        ilike(content.coverImage, `%${fileId}%`),
        ilike(content.content, `%${fileId}%`),
        sql`${content.contentJson}::text ILIKE ${`%${fileId}%`}`,
      ),
    );
}

function stripJsonRefs(node: unknown, fileId: string): unknown {
  if (node === null || node === undefined) return node;
  if (typeof node === "string") {
    return node.includes(fileId) ? null : node;
  }
  if (Array.isArray(node)) {
    return node
      .map((item) => stripJsonRefs(item, fileId))
      .filter((item) => {
        if (item === null) return false;
        if (typeof item === "object" && item !== null) {
          // remove now-empty objects/arrays
          if (Array.isArray(item) && item.length === 0) return false;
          if (
            !Array.isArray(item) &&
            Object.keys(item as Record<string, unknown>).length === 0
          )
            return false;
        }
        return true;
      });
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      const cleaned = stripJsonRefs(v, fileId);
      if (cleaned === null || cleaned === undefined) continue;
      out[k] = cleaned;
    }
    return out;
  }
  return node;
}

function stripHtmlRefs(html: string, fileId: string): string {
  if (!html.includes(fileId)) return html;
  // Remove <img ... fileId ...> tags
  let out = html.replace(new RegExp(`<img\\b[^>]*${fileId}[^>]*/?>`, "gi"), "");
  // Remove <a ... fileId ...>...</a> blocks
  out = out.replace(
    new RegExp(`<a\\b[^>]*${fileId}[^>]*>[\\s\\S]*?</a>`, "gi"),
    "",
  );
  return out;
}

export async function purgeFileReferences(
  fileId: string,
  actorId = "system:file-reference-purge",
): Promise<void> {
  const rows = await findContentReferencingFile(fileId);
  for (const row of rows) {
    const patch: Partial<typeof content.$inferInsert> = {};
    if (row.coverImage && row.coverImage.includes(fileId)) {
      patch.coverImage = null;
    }
    if (row.content && row.content.includes(fileId)) {
      patch.content = stripHtmlRefs(row.content, fileId);
    }
    if (row.contentJson) {
      const cleaned = stripJsonRefs(row.contentJson, fileId);
      patch.contentJson = (cleaned ?? null) as typeof row.contentJson;
    }
    if (Object.keys(patch).length > 0) {
      await updateContentWithRevision({
        id: row.id,
        actorId,
        values: patch,
        expectedVersion: row.version,
        changeType: "saved",
        changeNote: `Removed references to deleted file ${fileId}.`,
      });
    }
  }
}

export async function getDistinctUploaderIds(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ uploadedBy: files.uploadedBy })
    .from(files);
  return rows.map((r) => r.uploadedBy);
}

export async function countFilesByUploaderSince(
  uploadedBy: string,
  since: Date,
): Promise<number> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(files)
    .where(and(eq(files.uploadedBy, uploadedBy), gte(files.created, since)));
  return total;
}

export async function reassignFileOwner(
  id: string,
  newUploadedBy: string,
): Promise<FileRow | null> {
  const rows = await db
    .update(files)
    .set({ uploadedBy: newUploadedBy })
    .where(eq(files.id, id))
    .returning();
  return rows[0] ?? null;
}

// Sort export utilities reused above
export { asc };
