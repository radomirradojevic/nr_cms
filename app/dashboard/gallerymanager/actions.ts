"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { getRoles, hasRole } from "@/lib/roles";
import {
  addImagesToGallery as addImagesToGalleryRow,
  createGallery as createGalleryRow,
  deleteGallery as deleteGalleryRow,
  listGalleries,
  removeImageFromGallery as removeImageFromGalleryRow,
  reorderGalleryImages as reorderGalleryImagesRow,
  updateGallery as updateGalleryRow,
  type GalleryListItem,
} from "@/data/galleries";

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

// ─── Create ───────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(120, "Name must be 120 characters or fewer."),
  description: z
    .string()
    .trim()
    .max(1000, "Description must be 1000 characters or fewer.")
    .optional()
    .nullable(),
});

export type CreateGalleryInput = z.input<typeof createSchema>;

export async function createGallery(input: CreateGalleryInput) {
  const caller = await getCaller();
  if (!caller) return { error: "Forbidden." };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const row = await createGalleryRow(
      { name: parsed.data.name, description: parsed.data.description ?? null },
      caller,
    );
    revalidatePath("/dashboard/gallerymanager");
    return { success: true as const, id: row.id, slug: row.slug };
  } catch (err) {
    console.error("[createGallery] error", err);
    return { error: "Something went wrong. Please try again." };
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  coverFileId: z.string().uuid().nullable().optional(),
});

export type UpdateGalleryInput = z.input<typeof updateSchema>;

export async function updateGallery(input: UpdateGalleryInput) {
  const caller = await getCaller();
  if (!caller) return { error: "Forbidden." };

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const row = await updateGalleryRow(
      parsed.data.id,
      {
        name: parsed.data.name,
        description: parsed.data.description ?? undefined,
        coverFileId: parsed.data.coverFileId ?? undefined,
      },
      caller,
    );
    if (!row) return { error: "Gallery not found or access denied." };
    revalidatePath("/dashboard/gallerymanager");
    revalidatePath(`/dashboard/gallerymanager/${parsed.data.id}`);
    return { success: true as const, gallery: row };
  } catch (err) {
    console.error("[updateGallery] error", err);
    return { error: "Something went wrong. Please try again." };
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

const deleteSchema = z.object({ id: z.string().uuid() });

export async function deleteGallery(input: { id: string }) {
  const caller = await getCaller();
  if (!caller) return { error: "Forbidden." };

  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid id." };

  try {
    const ok = await deleteGalleryRow(parsed.data.id, caller);
    if (!ok) return { error: "Gallery not found or access denied." };
    revalidatePath("/dashboard/gallerymanager");
    return { success: true as const };
  } catch (err) {
    console.error("[deleteGallery] error", err);
    return { error: "Something went wrong. Please try again." };
  }
}

// ─── Add images ───────────────────────────────────────────────────────────────

const addImagesSchema = z.object({
  galleryId: z.string().uuid(),
  fileIds: z
    .array(z.string().uuid())
    .min(1, "Select at least one image.")
    .max(200, "Cannot add more than 200 images at once."),
});

export type AddImagesInput = z.input<typeof addImagesSchema>;

export async function addImagesToGallery(input: AddImagesInput) {
  const caller = await getCaller();
  if (!caller) return { error: "Forbidden." };

  const parsed = addImagesSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const result = await addImagesToGalleryRow(
      parsed.data.galleryId,
      parsed.data.fileIds,
      caller,
    );
    if ("error" in result) return result;
    revalidatePath(`/dashboard/gallerymanager/${parsed.data.galleryId}`);
    return {
      success: true as const,
      added: result.added,
      duplicates: result.duplicates,
      missing: result.missing,
    };
  } catch (err) {
    console.error("[addImagesToGallery] error", err);
    return { error: "Something went wrong. Please try again." };
  }
}

// ─── Remove image ─────────────────────────────────────────────────────────────

const removeSchema = z.object({
  galleryId: z.string().uuid(),
  fileId: z.string().uuid(),
});

export async function removeImageFromGallery(input: {
  galleryId: string;
  fileId: string;
}) {
  const caller = await getCaller();
  if (!caller) return { error: "Forbidden." };

  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const ok = await removeImageFromGalleryRow(
      parsed.data.galleryId,
      parsed.data.fileId,
      caller,
    );
    if (!ok) return { error: "Image not found in gallery or access denied." };
    revalidatePath(`/dashboard/gallerymanager/${parsed.data.galleryId}`);
    return { success: true as const };
  } catch (err) {
    console.error("[removeImageFromGallery] error", err);
    return { error: "Something went wrong. Please try again." };
  }
}

// ─── Reorder ──────────────────────────────────────────────────────────────────

const reorderSchema = z.object({
  galleryId: z.string().uuid(),
  orderedFileIds: z.array(z.string().uuid()).min(1).max(500),
});

export type ReorderInput = z.input<typeof reorderSchema>;

export async function reorderGalleryImages(input: ReorderInput) {
  const caller = await getCaller();
  if (!caller) return { error: "Forbidden." };

  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const result = await reorderGalleryImagesRow(
      parsed.data.galleryId,
      parsed.data.orderedFileIds,
      caller,
    );
    if ("error" in result) return result;
    revalidatePath(`/dashboard/gallerymanager/${parsed.data.galleryId}`);
    return { success: true as const };
  } catch (err) {
    console.error("[reorderGalleryImages] error", err);
    return { error: "Something went wrong. Please try again." };
  }
}

// ─── List (client-driven search/pagination) ───────────────────────────────────

const listSchema = z.object({
  search: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(100).default(24),
  offset: z.number().int().min(0).default(0),
});

export type ListGalleriesInput = z.input<typeof listSchema>;

export async function fetchGalleries(
  input: ListGalleriesInput,
): Promise<
  { error: string } | { success: true; rows: GalleryListItem[]; total: number }
> {
  const caller = await getCaller();
  if (!caller) return { error: "Forbidden." };

  const parsed = listSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { rows, total } = await listGalleries({
    caller,
    search: parsed.data.search,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  });
  return { success: true, rows, total };
}
