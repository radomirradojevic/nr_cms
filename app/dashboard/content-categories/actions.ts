"use server";

import { z } from "zod";
import { revalidatePath, updateTag } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { topMenuItems } from "@/db/schema";
import {
  insertCategory,
  updateCategoryName,
  updateCategoryOwner,
  deleteCategoryById,
  deleteCategoriesByIds,
  isCategoryInUse,
} from "@/data/content-categories";
import { TOP_MENU_TAG } from "@/data/top-menu";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getBackendUserOptionById } from "@/lib/backend-users";
import { getTranslations } from "@/lib/i18n/server";
import type { TranslateFn } from "@/lib/i18n/translate";
import { hasRole, getRoles } from "@/lib/roles";

async function markMenuItemsBroken(categoryIds: string[]) {
  if (categoryIds.length === 0) return;
  const dependents = await db
    .select({ id: topMenuItems.id, label: topMenuItems.label })
    .from(topMenuItems)
    .where(inArray(topMenuItems.categoryId, categoryIds));
  if (dependents.length === 0) return;
  await Promise.all(
    dependents.map((d) =>
      db
        .update(topMenuItems)
        .set({
          url: "#",
          label: d.label.endsWith(" (broken)")
            ? d.label
            : d.label + " (broken)",
        })
        .where(eq(topMenuItems.id, d.id)),
    ),
  );
  // updateTag = write-through invalidation; revalidateTag(tag, "default")
  // would only mark the tag stale (SWR), causing the public site to keep
  // rendering the old top-menu tree until a background refresh.
  updateTag(TOP_MENU_TAG);
  revalidatePath("/", "layout");
}

async function getAdminSession() {
  const user = await getOptionalCurrentUser();
  if (!user) return null;
  const roles = getRoles(user.publicMetadata);
  if (!hasRole(roles, "admin")) return null;
  return user;
}

// ─── Create ───────────────────────────────────────────────────────────────────

function createCategorySchema(t: TranslateFn) {
  return z.object({
    name: z
      .string()
      .min(1, t("dashboard.contentCategories.validation.nameRequired"))
      .max(100, t("dashboard.contentCategories.validation.nameMax")),
    contentType: z.enum(["page", "blog_post"]),
  });
}

export type CreateCategoryInput = {
  name: string;
  contentType: "page" | "blog_post";
};

export async function createCategory(input: CreateCategoryInput) {
  const t = await getTranslations("backend");
  const session = await getAdminSession();
  if (!session) return { error: t("dashboard.errors.forbidden") };

  const parsed = createCategorySchema(t).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await insertCategory({
      name: parsed.data.name,
      contentType: parsed.data.contentType,
      createdBy: session.id,
    });
    revalidatePath("/dashboard/content-categories");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("unique") || message.includes("duplicate")) {
      return {
        error: t("dashboard.contentCategories.validation.duplicateName"),
      };
    }
    console.error("[createCategory] Unexpected error:", err);
    return { error: t("dashboard.contentCategories.validation.generic") };
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

function updateCategorySchema(t: TranslateFn) {
  return z.object({
    id: z
      .string()
      .uuid(t("dashboard.contentCategories.validation.invalidCategoryId")),
    name: z
      .string()
      .min(1, t("dashboard.contentCategories.validation.nameRequired"))
      .max(100, t("dashboard.contentCategories.validation.nameMax")),
  });
}

export type UpdateCategoryInput = {
  id: string;
  name: string;
};

export async function updateCategory(input: UpdateCategoryInput) {
  const t = await getTranslations("backend");
  const session = await getAdminSession();
  if (!session) return { error: t("dashboard.errors.forbidden") };

  const parsed = updateCategorySchema(t).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await updateCategoryName(parsed.data.id, parsed.data.name, session.id);
    revalidatePath("/dashboard/content-categories");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("unique") || message.includes("duplicate")) {
      return {
        error: t("dashboard.contentCategories.validation.duplicateName"),
      };
    }
    console.error("[updateCategory] Unexpected error:", err);
    return { error: t("dashboard.contentCategories.validation.generic") };
  }
}

// ─── Reassign Owner ───────────────────────────────────────────────────────────

function reassignOwnerSchema(t: TranslateFn) {
  return z.object({
    id: z
      .string()
      .uuid(t("dashboard.contentCategories.validation.invalidCategoryId")),
    ownerId: z
      .string()
      .min(1, t("dashboard.contentCategories.validation.ownerRequired")),
  });
}

export type ReassignCategoryOwnerInput = {
  id: string;
  ownerId: string;
};

export async function reassignCategoryOwner(input: ReassignCategoryOwnerInput) {
  const t = await getTranslations("backend");
  const session = await getAdminSession();
  if (!session) return { error: t("dashboard.errors.forbidden") };

  const parsed = reassignOwnerSchema(t).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const owner = await getBackendUserOptionById(parsed.data.ownerId);
    if (!owner) {
      return {
        error: t("dashboard.contentCategories.validation.targetUserBackend"),
      };
    }

    await updateCategoryOwner(parsed.data.id, parsed.data.ownerId, session.id);
    revalidatePath("/dashboard/content-categories");
    return { success: true };
  } catch (err) {
    console.error("[reassignCategoryOwner] Unexpected error:", err);
    return { error: t("dashboard.contentCategories.validation.generic") };
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

function deleteCategorySchema(t: TranslateFn) {
  return z.object({
    id: z
      .string()
      .uuid(t("dashboard.contentCategories.validation.invalidCategoryId")),
  });
}

export type DeleteCategoryInput = {
  id: string;
};

export async function deleteCategory(input: DeleteCategoryInput) {
  const t = await getTranslations("backend");
  const session = await getAdminSession();
  if (!session) return { error: t("dashboard.errors.forbidden") };

  const parsed = deleteCategorySchema(t).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const inUse = await isCategoryInUse(parsed.data.id);
    if (inUse) {
      return {
        error: t("dashboard.contentCategories.validation.categoryInUse"),
      };
    }

    await deleteCategoryById(parsed.data.id);
    await markMenuItemsBroken([parsed.data.id]);
    revalidatePath("/dashboard/content-categories");
    return { success: true };
  } catch (err) {
    console.error("[deleteCategory] Unexpected error:", err);
    return { error: t("dashboard.contentCategories.validation.generic") };
  }
}

// ─── Batch Delete ─────────────────────────────────────────────────────────────

function deleteCategoriesSchema(t: TranslateFn) {
  return z.object({
    ids: z
      .array(
        z
          .string()
          .uuid(t("dashboard.contentCategories.validation.invalidCategoryId")),
      )
      .min(1),
  });
}

export type DeleteCategoriesInput = {
  ids: string[];
};

export async function deleteCategories(input: DeleteCategoriesInput) {
  const t = await getTranslations("backend");
  const session = await getAdminSession();
  if (!session) return { error: t("dashboard.errors.forbidden") };

  const parsed = deleteCategoriesSchema(t).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const inUseChecks = await Promise.all(
      parsed.data.ids.map((id) => isCategoryInUse(id)),
    );
    const anyInUse = inUseChecks.some(Boolean);
    if (anyInUse) {
      return {
        error: t(
          "dashboard.contentCategories.validation.selectedCategoriesInUse",
        ),
      };
    }

    await deleteCategoriesByIds(parsed.data.ids);
    await markMenuItemsBroken(parsed.data.ids);
    revalidatePath("/dashboard/content-categories");
    return { success: true };
  } catch (err) {
    console.error("[deleteCategories] Unexpected error:", err);
    return { error: t("dashboard.contentCategories.validation.generic") };
  }
}
