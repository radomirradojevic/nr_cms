import { db } from "@/db";
import {
  files,
  fileFolders,
  content,
  galleries,
  galleryImages,
  webshopCategories,
  webshopDigitalAssets,
  webshopDownloadEntitlements,
  webshopProductMedia,
  webshopProducts,
  webshopProductVariants,
} from "@/db/schema";
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
  isNotNull,
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

function digitalAssetHasDownloadEntitlements() {
  return sql<boolean>`EXISTS (
    SELECT 1 FROM ${webshopDownloadEntitlements}
    WHERE ${webshopDownloadEntitlements.digitalAssetId} = ${webshopDigitalAssets.id}
  )`;
}

function digitalAssetHasPrivateReplacement() {
  return sql<boolean>`EXISTS (
    SELECT 1 FROM "webshop_digital_assets" AS replacement
    WHERE replacement."id" <> ${webshopDigitalAssets.id}
      AND replacement."product_id" = ${webshopDigitalAssets.productId}
      AND replacement."variant_id" IS NOT DISTINCT FROM ${webshopDigitalAssets.variantId}
      AND replacement."asset_file_id" IS NOT NULL
      AND replacement."status" = 'active'
  )`;
}

export async function deleteFiles(
  ids: string[],
  caller: Caller,
): Promise<FileRow[]> {
  if (ids.length === 0) return [];
  const conditions = [inArray(files.id, ids)];
  const owner = ownerWhere(caller);
  if (owner) conditions.push(owner);

  return db.transaction(async (tx) => {
    const authorizedRows = await tx
      .select({ id: files.id })
      .from(files)
      .where(and(...conditions));
    const authorizedIds = authorizedRows.map((row) => row.id);
    if (authorizedIds.length === 0) return [];

    await tx
      .delete(webshopDigitalAssets)
      .where(
        and(
          inArray(webshopDigitalAssets.fileId, authorizedIds),
          isNull(webshopDigitalAssets.assetFileId),
          sql`NOT ${digitalAssetHasDownloadEntitlements()}`,
          or(
            sql`${webshopDigitalAssets.status} <> 'active'`,
            digitalAssetHasPrivateReplacement(),
          ),
        ),
      );

    await tx
      .update(webshopDigitalAssets)
      .set({ fileId: null })
      .where(
        and(
          inArray(webshopDigitalAssets.fileId, authorizedIds),
          isNotNull(webshopDigitalAssets.assetFileId),
        ),
      );

    return tx.delete(files).where(inArray(files.id, authorizedIds)).returning();
  });
}

export type BlockingFileDeleteReferences = {
  categoryImages: number;
  categoryNames: string[];
  digitalAssets: number;
  digitalAssetProductNames: string[];
  digitalAssetEntitlementProductNames: string[];
  digitalAssetsWithEntitlements: number;
  digitalAssetMissingReplacementProductNames: string[];
  digitalAssetsWithoutPrivateReplacement: number;
  galleryCovers: number;
  galleryImages: number;
  galleryNames: string[];
  productCovers: number;
  productCoverNames: string[];
  productMedia: number;
  productMediaProductNames: string[];
  fileIds: string[];
};

function formatProductReference(
  productTitle: string,
  variantTitle: string | null,
  variantSku: string | null,
): string {
  if (!variantTitle && !variantSku) return productTitle;
  if (variantTitle && variantSku && variantTitle !== variantSku) {
    return `${productTitle} - ${variantTitle} (${variantSku})`;
  }
  return `${productTitle} - ${variantTitle ?? variantSku}`;
}

export async function findBlockingFileDeleteReferences(
  ids: string[],
): Promise<BlockingFileDeleteReferences> {
  if (ids.length === 0) {
    return {
      categoryImages: 0,
      categoryNames: [],
      digitalAssets: 0,
      digitalAssetProductNames: [],
      digitalAssetEntitlementProductNames: [],
      digitalAssetsWithEntitlements: 0,
      digitalAssetMissingReplacementProductNames: [],
      digitalAssetsWithoutPrivateReplacement: 0,
      galleryCovers: 0,
      galleryImages: 0,
      galleryNames: [],
      productCovers: 0,
      productCoverNames: [],
      productMedia: 0,
      productMediaProductNames: [],
      fileIds: [],
    };
  }

  const [
    categoryImages,
    digitalAssets,
    manualGalleryImages,
    manualGalleryCovers,
    productCovers,
    productMedia,
  ] = await Promise.all([
    db
      .select({
        fileId: webshopCategories.imageFileId,
        categoryName: webshopCategories.name,
      })
      .from(webshopCategories)
      .where(inArray(webshopCategories.imageFileId, ids)),
    db
      .select({
        fileId: webshopDigitalAssets.fileId,
        productTitle: webshopProducts.title,
        status: webshopDigitalAssets.status,
        variantTitle: webshopProductVariants.title,
        variantSku: webshopProductVariants.sku,
        hasDownloadEntitlements: digitalAssetHasDownloadEntitlements(),
        hasPrivateReplacement: digitalAssetHasPrivateReplacement(),
      })
      .from(webshopDigitalAssets)
      .innerJoin(
        webshopProducts,
        eq(webshopDigitalAssets.productId, webshopProducts.id),
      )
      .leftJoin(
        webshopProductVariants,
        eq(webshopDigitalAssets.variantId, webshopProductVariants.id),
      )
      .where(
        and(
          inArray(webshopDigitalAssets.fileId, ids),
          isNull(webshopDigitalAssets.assetFileId),
          or(
            digitalAssetHasDownloadEntitlements(),
            and(
              eq(webshopDigitalAssets.status, "active"),
              sql`NOT ${digitalAssetHasPrivateReplacement()}`,
            ),
          ),
        ),
      ),
    db
      .select({
        fileId: galleryImages.fileId,
        galleryName: galleries.name,
      })
      .from(galleryImages)
      .innerJoin(galleries, eq(galleryImages.galleryId, galleries.id))
      .where(
        and(inArray(galleryImages.fileId, ids), eq(galleries.origin, "manual")),
      ),
    db
      .select({
        fileId: galleries.coverFileId,
        galleryName: galleries.name,
      })
      .from(galleries)
      .where(
        and(
          inArray(galleries.coverFileId, ids),
          eq(galleries.origin, "manual"),
        ),
      ),
    db
      .select({
        fileId: webshopProducts.coverImageFileId,
        productTitle: webshopProducts.title,
      })
      .from(webshopProducts)
      .where(inArray(webshopProducts.coverImageFileId, ids)),
    db
      .select({
        fileId: webshopProductMedia.fileId,
        productTitle: webshopProducts.title,
        variantTitle: webshopProductVariants.title,
        variantSku: webshopProductVariants.sku,
      })
      .from(webshopProductMedia)
      .innerJoin(
        webshopProducts,
        eq(webshopProductMedia.productId, webshopProducts.id),
      )
      .leftJoin(
        webshopProductVariants,
        eq(webshopProductMedia.variantId, webshopProductVariants.id),
      )
      .where(inArray(webshopProductMedia.fileId, ids)),
  ]);

  const fileIds = new Set<string>();
  const categoryNames = new Set<string>();
  const digitalAssetProductNames = new Set<string>();
  const digitalAssetEntitlementProductNames = new Set<string>();
  const digitalAssetMissingReplacementProductNames = new Set<string>();
  const galleryNames = new Set<string>();
  let digitalAssetsWithEntitlements = 0;
  let digitalAssetsWithoutPrivateReplacement = 0;

  for (const row of categoryImages) {
    if (row.fileId) fileIds.add(row.fileId);
    categoryNames.add(row.categoryName);
  }

  for (const row of digitalAssets) {
    if (row.fileId) fileIds.add(row.fileId);
    const productReference = formatProductReference(
      row.productTitle,
      row.variantTitle,
      row.variantSku,
    );
    digitalAssetProductNames.add(productReference);

    if (row.hasDownloadEntitlements) {
      digitalAssetsWithEntitlements += 1;
      digitalAssetEntitlementProductNames.add(productReference);
    } else if (row.status === "active" && !row.hasPrivateReplacement) {
      digitalAssetsWithoutPrivateReplacement += 1;
      digitalAssetMissingReplacementProductNames.add(productReference);
    }
  }

  for (const row of manualGalleryImages) {
    fileIds.add(row.fileId);
    galleryNames.add(row.galleryName);
  }

  for (const row of manualGalleryCovers) {
    if (row.fileId) fileIds.add(row.fileId);
    galleryNames.add(row.galleryName);
  }

  const productCoverNames = new Set<string>();
  for (const row of productCovers) {
    if (row.fileId) fileIds.add(row.fileId);
    productCoverNames.add(row.productTitle);
  }

  const productMediaProductNames = new Set<string>();
  for (const row of productMedia) {
    fileIds.add(row.fileId);
    productMediaProductNames.add(
      formatProductReference(
        row.productTitle,
        row.variantTitle,
        row.variantSku,
      ),
    );
  }

  return {
    categoryImages: categoryImages.length,
    categoryNames: Array.from(categoryNames).sort((a, b) => a.localeCompare(b)),
    digitalAssets: digitalAssets.length,
    digitalAssetProductNames: Array.from(digitalAssetProductNames).sort(
      (a, b) => a.localeCompare(b),
    ),
    digitalAssetEntitlementProductNames: Array.from(
      digitalAssetEntitlementProductNames,
    ).sort((a, b) => a.localeCompare(b)),
    digitalAssetsWithEntitlements,
    digitalAssetMissingReplacementProductNames: Array.from(
      digitalAssetMissingReplacementProductNames,
    ).sort((a, b) => a.localeCompare(b)),
    digitalAssetsWithoutPrivateReplacement,
    galleryCovers: manualGalleryCovers.length,
    galleryImages: manualGalleryImages.length,
    galleryNames: Array.from(galleryNames).sort((a, b) => a.localeCompare(b)),
    productCovers: productCovers.length,
    productCoverNames: Array.from(productCoverNames).sort((a, b) =>
      a.localeCompare(b),
    ),
    productMedia: productMedia.length,
    productMediaProductNames: Array.from(productMediaProductNames).sort(
      (a, b) => a.localeCompare(b),
    ),
    fileIds: Array.from(fileIds),
  };
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
