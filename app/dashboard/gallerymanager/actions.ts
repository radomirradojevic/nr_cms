"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getBackendUserOptionById } from "@/lib/backend-users";
import { getTranslations } from "@/lib/i18n/server";
import type { TranslateFn } from "@/lib/i18n/translate";
import { getRoles, hasRole } from "@/lib/roles";
import {
  addImagesToGallery as addImagesToGalleryRow,
  createGallery as createGalleryRow,
  reassignGallery as reassignGalleryRow,
  deleteGallery as deleteGalleryRow,
  getGalleryById,
  listGalleries,
  removeImageFromGallery as removeImageFromGalleryRow,
  reorderGalleryImages as reorderGalleryImagesRow,
  updateGallery as updateGalleryRow,
  type GalleryDetail,
  type GalleryListItem,
} from "@/data/galleries";

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

function translateGalleryDataError(message: string, t: TranslateFn): string {
  switch (message) {
    case "Gallery not found or access denied.":
      return t("dashboard.galleries.errors.galleryNotFoundOrDenied");
    case "Webshop galleries are managed from the Webshop editor.":
      return t("dashboard.galleries.errors.webshopManaged");
    case "Only image files can be added to galleries.":
      return t("dashboard.galleries.errors.onlyImages");
    default:
      return message;
  }
}

// ─── Create ───────────────────────────────────────────────────────────────────

function createSchema(t: TranslateFn) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t("dashboard.galleries.nameRequired"))
      .max(120, t("dashboard.galleries.errors.nameMax")),
    description: z
      .string()
      .trim()
      .max(1000, t("dashboard.galleries.errors.descriptionMax"))
      .optional()
      .nullable(),
  });
}

export type CreateGalleryInput = z.input<ReturnType<typeof createSchema>>;

export async function createGallery(input: CreateGalleryInput) {
  const t = await getTranslations("backend");
  const caller = await getCaller();
  if (!caller) return { error: t("dashboard.errors.forbidden") };

  const parsed = createSchema(t).safeParse(input);
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
    return { error: t("dashboard.galleries.errors.generic") };
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

function updateSchema(t: TranslateFn) {
  return z.object({
    id: z.string().uuid(t("dashboard.galleries.errors.invalidId")),
    name: z
      .string()
      .trim()
      .min(1, t("dashboard.galleries.nameRequired"))
      .max(120, t("dashboard.galleries.errors.nameMax"))
      .optional(),
    description: z
      .string()
      .trim()
      .max(1000, t("dashboard.galleries.errors.descriptionMax"))
      .optional()
      .nullable(),
    coverFileId: z
      .string()
      .uuid(t("dashboard.galleries.errors.invalidId"))
      .nullable()
      .optional(),
  });
}

export type UpdateGalleryInput = z.input<ReturnType<typeof updateSchema>>;

export async function updateGallery(input: UpdateGalleryInput) {
  const t = await getTranslations("backend");
  const caller = await getCaller();
  if (!caller) return { error: t("dashboard.errors.forbidden") };

  const parsed = updateSchema(t).safeParse(input);
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
    if (!row) {
      return { error: t("dashboard.galleries.errors.galleryNotFoundOrDenied") };
    }
    revalidatePath("/dashboard/gallerymanager");
    revalidatePath(`/dashboard/gallerymanager/${parsed.data.id}`);
    return { success: true as const, gallery: row };
  } catch (err) {
    console.error("[updateGallery] error", err);
    return { error: t("dashboard.galleries.errors.generic") };
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

function deleteSchema(t: TranslateFn) {
  return z.object({
    id: z.string().uuid(t("dashboard.galleries.errors.invalidId")),
  });
}

export async function deleteGallery(input: { id: string }) {
  const t = await getTranslations("backend");
  const caller = await getCaller();
  if (!caller) return { error: t("dashboard.errors.forbidden") };

  const parsed = deleteSchema(t).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const ok = await deleteGalleryRow(parsed.data.id, caller);
    if (!ok) {
      return { error: t("dashboard.galleries.errors.galleryNotFoundOrDenied") };
    }
    revalidatePath("/dashboard/gallerymanager");
    return { success: true as const };
  } catch (err) {
    console.error("[deleteGallery] error", err);
    return { error: t("dashboard.galleries.errors.generic") };
  }
}

// ─── Add images ───────────────────────────────────────────────────────────────

function addImagesSchema(t: TranslateFn) {
  return z.object({
    galleryId: z.string().uuid(t("dashboard.galleries.errors.invalidId")),
    fileIds: z
      .array(z.string().uuid(t("dashboard.galleries.errors.invalidId")))
      .min(1, t("dashboard.galleries.errors.selectAtLeastOneImage"))
      .max(200, t("dashboard.galleries.errors.tooManyImages")),
  });
}

export type AddImagesInput = z.input<ReturnType<typeof addImagesSchema>>;

export async function addImagesToGallery(input: AddImagesInput) {
  const t = await getTranslations("backend");
  const caller = await getCaller();
  if (!caller) return { error: t("dashboard.errors.forbidden") };

  const parsed = addImagesSchema(t).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const result = await addImagesToGalleryRow(
      parsed.data.galleryId,
      parsed.data.fileIds,
      caller,
    );
    if ("error" in result) {
      return { error: translateGalleryDataError(result.error, t) };
    }
    revalidatePath(`/dashboard/gallerymanager/${parsed.data.galleryId}`);
    return {
      success: true as const,
      added: result.added,
      duplicates: result.duplicates,
      missing: result.missing,
    };
  } catch (err) {
    console.error("[addImagesToGallery] error", err);
    return { error: t("dashboard.galleries.errors.generic") };
  }
}

// ─── Remove image ─────────────────────────────────────────────────────────────

function removeSchema(t: TranslateFn) {
  return z.object({
    galleryId: z.string().uuid(t("dashboard.galleries.errors.invalidId")),
    fileId: z.string().uuid(t("dashboard.galleries.errors.invalidId")),
  });
}

export async function removeImageFromGallery(input: {
  galleryId: string;
  fileId: string;
}) {
  const t = await getTranslations("backend");
  const caller = await getCaller();
  if (!caller) return { error: t("dashboard.errors.forbidden") };

  const parsed = removeSchema(t).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const ok = await removeImageFromGalleryRow(
      parsed.data.galleryId,
      parsed.data.fileId,
      caller,
    );
    if (!ok) {
      return { error: t("dashboard.galleries.errors.imageNotFoundOrDenied") };
    }
    revalidatePath(`/dashboard/gallerymanager/${parsed.data.galleryId}`);
    return { success: true as const };
  } catch (err) {
    console.error("[removeImageFromGallery] error", err);
    return { error: t("dashboard.galleries.errors.generic") };
  }
}

// ─── Reorder ──────────────────────────────────────────────────────────────────

function reorderSchema(t: TranslateFn) {
  return z.object({
    galleryId: z.string().uuid(t("dashboard.galleries.errors.invalidId")),
    orderedFileIds: z
      .array(z.string().uuid(t("dashboard.galleries.errors.invalidId")))
      .min(1, t("dashboard.galleries.errors.selectAtLeastOneImage"))
      .max(500, t("dashboard.galleries.errors.tooManyImages")),
  });
}

export type ReorderInput = z.input<ReturnType<typeof reorderSchema>>;

export async function reorderGalleryImages(input: ReorderInput) {
  const t = await getTranslations("backend");
  const caller = await getCaller();
  if (!caller) return { error: t("dashboard.errors.forbidden") };

  const parsed = reorderSchema(t).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const result = await reorderGalleryImagesRow(
      parsed.data.galleryId,
      parsed.data.orderedFileIds,
      caller,
    );
    if ("error" in result) {
      return { error: translateGalleryDataError(result.error, t) };
    }
    revalidatePath(`/dashboard/gallerymanager/${parsed.data.galleryId}`);
    return { success: true as const };
  } catch (err) {
    console.error("[reorderGalleryImages] error", err);
    return { error: t("dashboard.galleries.errors.generic") };
  }
}

// ─── List (client-driven search/pagination) ───────────────────────────────────

function listSchema() {
  return z.object({
    search: z.string().max(200).optional(),
    createdBy: z.string().optional(),
    limit: z.number().int().min(1).max(100).default(24),
    offset: z.number().int().min(0).default(0),
  });
}

export type ListGalleriesInput = z.input<ReturnType<typeof listSchema>>;

export async function fetchGalleries(
  input: ListGalleriesInput,
): Promise<
  { error: string } | { success: true; rows: GalleryListItem[]; total: number }
> {
  const t = await getTranslations("backend");
  const caller = await getCaller();
  if (!caller) return { error: t("dashboard.errors.forbidden") };

  const parsed = listSchema().safeParse(input);
  if (!parsed.success) return { error: t("dashboard.errors.invalidInput") };

  const { rows, total } = await listGalleries({
    caller,
    search: parsed.data.search,
    createdBy: parsed.data.createdBy,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  });
  return { success: true, rows, total };
}

// ─── Picker preview ───────────────────────────────────────────────────────────

function galleryByIdSchema(t: TranslateFn) {
  return z.object({
    id: z.string().uuid(t("dashboard.galleries.errors.invalidId")),
  });
}

export type GalleryPickerPreviewImage = {
  fileId: string;
  alt: string;
  title: string;
};

// ─── Reassign gallery owner (admin only) ──────────────────────────────────────

function reassignSchema(t: TranslateFn) {
  return z.object({
    id: z.string().uuid(t("dashboard.galleries.errors.invalidId")),
    newOwnerId: z
      .string()
      .min(1, t("dashboard.galleries.reassignDialog.selectUser")),
  });
}

export async function reassignGallery(input: {
  id: string;
  newOwnerId: string;
}) {
  const t = await getTranslations("backend");
  const caller = await getCaller();
  if (!caller) return { error: t("dashboard.errors.forbidden") };
  if (!caller.isAdmin) return { error: t("dashboard.errors.forbidden") };

  const parsed = reassignSchema(t).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const owner = await getBackendUserOptionById(parsed.data.newOwnerId);
    if (!owner) {
      return { error: t("dashboard.galleries.errors.targetUserBackend") };
    }

    const row = await reassignGalleryRow(
      parsed.data.id,
      parsed.data.newOwnerId,
    );
    if (!row) return { error: t("dashboard.galleries.errors.galleryNotFound") };
    revalidatePath("/dashboard/gallerymanager");
    return { success: true as const };
  } catch (err) {
    console.error("[reassignGallery] error", err);
    return { error: t("dashboard.galleries.errors.generic") };
  }
}

export async function fetchGalleryPreview(
  input: z.input<ReturnType<typeof galleryByIdSchema>>,
): Promise<
  | { error: string }
  | {
      success: true;
      id: string;
      name: string;
      images: GalleryPickerPreviewImage[];
    }
> {
  const t = await getTranslations("backend");
  const caller = await getCaller();
  if (!caller) return { error: t("dashboard.errors.forbidden") };

  const parsed = galleryByIdSchema(t).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const detail: GalleryDetail | null = await getGalleryById(
    parsed.data.id,
    caller,
  );
  if (!detail) {
    return { error: t("dashboard.galleries.errors.galleryNotFoundOrDenied") };
  }

  return {
    success: true,
    id: detail.id,
    name: detail.name,
    images: detail.images.map((img) => ({
      fileId: img.fileId,
      alt: img.file.alt ?? img.file.title ?? img.file.filename,
      title: img.file.title ?? img.file.filename,
    })),
  };
}
