import { db } from "@/db";
import { galleries, galleryImages, files } from "@/db/schema";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  count,
  max,
  sql,
} from "drizzle-orm";
import { slugify } from "@/lib/utils";

export type GalleryRow = typeof galleries.$inferSelect;
export type GalleryImageRow = typeof galleryImages.$inferSelect;
export type FileRow = typeof files.$inferSelect;

export type Caller = { userId: string; isAdmin: boolean };

function ownerWhere(c: Caller) {
  return c.isAdmin ? undefined : eq(galleries.createdBy, c.userId);
}

export type GalleryListItem = GalleryRow & {
  imageCount: number;
  coverFileId: string | null;
};

export async function listGalleries(opts: {
  caller: Caller;
  search?: string;
  limit: number;
  offset: number;
}): Promise<{ rows: GalleryListItem[]; total: number }> {
  const conditions = [];
  const owner = ownerWhere(opts.caller);
  if (owner) conditions.push(owner);
  if (opts.search && opts.search.trim()) {
    const q = `%${opts.search.trim()}%`;
    conditions.push(ilike(galleries.name, q));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [rowsRaw, [{ total }]] = await Promise.all([
    db
      .select({
        id: galleries.id,
        name: galleries.name,
        slug: galleries.slug,
        description: galleries.description,
        coverFileId: galleries.coverFileId,
        createdBy: galleries.createdBy,
        created: galleries.created,
        updated: galleries.updated,
        imageCount: sql<number>`COALESCE((
          SELECT COUNT(*)::int FROM ${galleryImages}
          WHERE ${galleryImages.galleryId} = ${galleries.id}
        ), 0)`,
        firstImageId: sql<string | null>`(
          SELECT ${galleryImages.fileId} FROM ${galleryImages}
          WHERE ${galleryImages.galleryId} = ${galleries.id}
          ORDER BY ${galleryImages.position} ASC
          LIMIT 1
        )`,
      })
      .from(galleries)
      .where(where)
      .orderBy(desc(galleries.created))
      .limit(opts.limit)
      .offset(opts.offset),
    db.select({ total: count() }).from(galleries).where(where),
  ]);

  const rows: GalleryListItem[] = rowsRaw.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    coverFileId: r.coverFileId ?? r.firstImageId ?? null,
    createdBy: r.createdBy,
    created: r.created,
    updated: r.updated,
    imageCount: Number(r.imageCount ?? 0),
  }));

  return { rows, total };
}

export type GalleryDetail = GalleryRow & {
  images: (GalleryImageRow & { file: FileRow })[];
};

export async function getGalleryById(
  id: string,
  caller: Caller,
): Promise<GalleryDetail | null> {
  const conditions = [eq(galleries.id, id)];
  const owner = ownerWhere(caller);
  if (owner) conditions.push(owner);

  const rows = await db
    .select()
    .from(galleries)
    .where(and(...conditions))
    .limit(1);
  const gallery = rows[0];
  if (!gallery) return null;

  const imageRows = await db
    .select({
      gi: galleryImages,
      f: files,
    })
    .from(galleryImages)
    .innerJoin(files, eq(galleryImages.fileId, files.id))
    .where(eq(galleryImages.galleryId, id))
    .orderBy(asc(galleryImages.position));

  return {
    ...gallery,
    images: imageRows.map((r) => ({ ...r.gi, file: r.f })),
  };
}

/**
 * Public read of a gallery — no ownership check. Use only for rendering
 * embedded galleries inside published content on the public-facing site.
 */
export async function getGalleryByIdPublic(
  id: string,
): Promise<GalleryDetail | null> {
  const rows = await db
    .select()
    .from(galleries)
    .where(eq(galleries.id, id))
    .limit(1);
  const gallery = rows[0];
  if (!gallery) return null;

  const imageRows = await db
    .select({ gi: galleryImages, f: files })
    .from(galleryImages)
    .innerJoin(files, eq(galleryImages.fileId, files.id))
    .where(eq(galleryImages.galleryId, id))
    .orderBy(asc(galleryImages.position));

  return {
    ...gallery,
    images: imageRows.map((r) => ({ ...r.gi, file: r.f })),
  };
}

async function generateUniqueSlug(base: string): Promise<string> {
  const baseSlug = slugify(base) || "gallery";
  let candidate = baseSlug;
  let n = 2;
  // Loop guarded by a sane max
  for (let i = 0; i < 100; i++) {
    const existing = await db
      .select({ id: galleries.id })
      .from(galleries)
      .where(eq(galleries.slug, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
    candidate = `${baseSlug}-${n++}`;
  }
  // Fallback to timestamp suffix
  return `${baseSlug}-${Date.now()}`;
}

export async function createGallery(
  input: { name: string; description?: string | null },
  caller: Caller,
): Promise<GalleryRow> {
  const slug = await generateUniqueSlug(input.name);
  const rows = await db
    .insert(galleries)
    .values({
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      createdBy: caller.userId,
    })
    .returning();
  return rows[0];
}

export type UpdateGalleryPatch = {
  name?: string;
  description?: string | null;
  coverFileId?: string | null;
};

export async function updateGallery(
  id: string,
  patch: UpdateGalleryPatch,
  caller: Caller,
): Promise<GalleryRow | null> {
  const conditions = [eq(galleries.id, id)];
  const owner = ownerWhere(caller);
  if (owner) conditions.push(owner);

  const updates: Partial<typeof galleries.$inferInsert> = {};
  if (patch.name !== undefined) updates.name = patch.name.trim();
  if (patch.description !== undefined)
    updates.description = patch.description?.trim() || null;
  if (patch.coverFileId !== undefined) updates.coverFileId = patch.coverFileId;

  if (Object.keys(updates).length === 0) {
    const existing = await db
      .select()
      .from(galleries)
      .where(and(...conditions))
      .limit(1);
    return existing[0] ?? null;
  }

  const rows = await db
    .update(galleries)
    .set(updates)
    .where(and(...conditions))
    .returning();
  return rows[0] ?? null;
}

export async function deleteGallery(
  id: string,
  caller: Caller,
): Promise<boolean> {
  const conditions = [eq(galleries.id, id)];
  const owner = ownerWhere(caller);
  if (owner) conditions.push(owner);
  const rows = await db
    .delete(galleries)
    .where(and(...conditions))
    .returning({ id: galleries.id });
  return rows.length > 0;
}

async function ensureGalleryOwnership(
  galleryId: string,
  caller: Caller,
): Promise<GalleryRow | null> {
  const conditions = [eq(galleries.id, galleryId)];
  const owner = ownerWhere(caller);
  if (owner) conditions.push(owner);
  const rows = await db
    .select()
    .from(galleries)
    .where(and(...conditions))
    .limit(1);
  return rows[0] ?? null;
}

async function nextPosition(galleryId: string): Promise<number> {
  const rows = await db
    .select({ max: max(galleryImages.position) })
    .from(galleryImages)
    .where(eq(galleryImages.galleryId, galleryId));
  const m = rows[0]?.max;
  return (m ?? -1) + 1;
}

export async function addImagesToGallery(
  galleryId: string,
  fileIds: string[],
  caller: Caller,
): Promise<
  | { error: string }
  | { added: string[]; duplicates: string[]; missing: string[] }
> {
  const gallery = await ensureGalleryOwnership(galleryId, caller);
  if (!gallery) return { error: "Gallery not found or access denied." };

  // Fetch existing files among requested set (must exist and be images? — no
  // restriction here; the picker only surfaces images, but we don't enforce
  // that server-side beyond existence).
  const existingFiles = await db
    .select({ id: files.id })
    .from(files)
    .where(inArray(files.id, fileIds));
  const existingIds = new Set(existingFiles.map((f) => f.id));
  const missing = fileIds.filter((id) => !existingIds.has(id));
  const candidates = fileIds.filter((id) => existingIds.has(id));

  if (candidates.length === 0) {
    return { added: [], duplicates: [], missing };
  }

  // Find which ones are already linked → duplicates
  const alreadyLinked = await db
    .select({ fileId: galleryImages.fileId })
    .from(galleryImages)
    .where(
      and(
        eq(galleryImages.galleryId, galleryId),
        inArray(galleryImages.fileId, candidates),
      ),
    );
  const duplicates = alreadyLinked.map((r) => r.fileId);
  const dupSet = new Set(duplicates);
  const toInsert = candidates.filter((id) => !dupSet.has(id));

  if (toInsert.length === 0) {
    return { added: [], duplicates, missing };
  }

  let position = await nextPosition(galleryId);
  const values = toInsert.map((fileId) => ({
    galleryId,
    fileId,
    position: position++,
    addedBy: caller.userId,
  }));

  // Rely on the (gallery_id, file_id) PK to swallow any race-condition
  // duplicates via ON CONFLICT DO NOTHING.
  const inserted = await db
    .insert(galleryImages)
    .values(values)
    .onConflictDoNothing()
    .returning({ fileId: galleryImages.fileId });

  const insertedIds = inserted.map((r) => r.fileId);
  const insertedSet = new Set(insertedIds);
  // Anything we tried to insert that didn't come back is a race-duplicate
  const raceDuplicates = toInsert.filter((id) => !insertedSet.has(id));
  return {
    added: insertedIds,
    duplicates: [...duplicates, ...raceDuplicates],
    missing,
  };
}

export async function removeImageFromGallery(
  galleryId: string,
  fileId: string,
  caller: Caller,
): Promise<boolean> {
  const gallery = await ensureGalleryOwnership(galleryId, caller);
  if (!gallery) return false;
  const rows = await db
    .delete(galleryImages)
    .where(
      and(
        eq(galleryImages.galleryId, galleryId),
        eq(galleryImages.fileId, fileId),
      ),
    )
    .returning({ fileId: galleryImages.fileId });
  return rows.length > 0;
}

export async function reorderGalleryImages(
  galleryId: string,
  orderedFileIds: string[],
  caller: Caller,
): Promise<{ error: string } | { success: true }> {
  const gallery = await ensureGalleryOwnership(galleryId, caller);
  if (!gallery) return { error: "Gallery not found or access denied." };

  // Sequential updates — drizzle-orm/neon-http doesn't support transactions.
  // Two-phase update to avoid clashing on the (gallery_id, position) ordering
  // (no unique constraint, but keep it tidy): bump everything well above the
  // max first, then write the final positions.
  const offset = 100000;
  await Promise.all(
    orderedFileIds.map((fileId, idx) =>
      db
        .update(galleryImages)
        .set({ position: offset + idx })
        .where(
          and(
            eq(galleryImages.galleryId, galleryId),
            eq(galleryImages.fileId, fileId),
          ),
        ),
    ),
  );
  await Promise.all(
    orderedFileIds.map((fileId, idx) =>
      db
        .update(galleryImages)
        .set({ position: idx })
        .where(
          and(
            eq(galleryImages.galleryId, galleryId),
            eq(galleryImages.fileId, fileId),
          ),
        ),
    ),
  );
  return { success: true };
}
