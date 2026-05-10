"use server";

import { currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { topMenuItems } from "@/db/schema";
import {
  insertCategory,
  updateCategoryName,
  deleteCategoryById,
  deleteCategoriesByIds,
  isCategoryInUse,
} from "@/data/content-categories";
import { TOP_MENU_TAG } from "@/data/top-menu";
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
  revalidateTag(TOP_MENU_TAG);
  revalidatePath("/", "layout");
}

async function getAdminSession() {
  const user = await currentUser();
  if (!user) return null;
  const roles = getRoles(user.publicMetadata);
  if (!hasRole(roles, "admin")) return null;
  return user;
}

// ─── Create ───────────────────────────────────────────────────────────────────

const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required.")
    .max(100, "Name must be 100 characters or fewer."),
  contentType: z.enum(["page", "blog_post"]),
});

export type CreateCategoryInput = {
  name: string;
  contentType: "page" | "blog_post";
};

export async function createCategory(input: CreateCategoryInput) {
  const session = await getAdminSession();
  if (!session) return { error: "Forbidden." };

  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await insertCategory({
      name: parsed.data.name,
      contentType: parsed.data.contentType,
    });
    revalidatePath("/dashboard/content-categories");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("unique") || message.includes("duplicate")) {
      return {
        error:
          "A category with that name already exists for this content type.",
      };
    }
    console.error("[createCategory] Unexpected error:", err);
    return { error: "Something went wrong. Please try again." };
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

const updateCategorySchema = z.object({
  id: z.string().uuid("Invalid category ID."),
  name: z
    .string()
    .min(1, "Name is required.")
    .max(100, "Name must be 100 characters or fewer."),
});

export type UpdateCategoryInput = {
  id: string;
  name: string;
};

export async function updateCategory(input: UpdateCategoryInput) {
  const session = await getAdminSession();
  if (!session) return { error: "Forbidden." };

  const parsed = updateCategorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await updateCategoryName(parsed.data.id, parsed.data.name);
    revalidatePath("/dashboard/content-categories");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("unique") || message.includes("duplicate")) {
      return {
        error:
          "A category with that name already exists for this content type.",
      };
    }
    console.error("[updateCategory] Unexpected error:", err);
    return { error: "Something went wrong. Please try again." };
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

const deleteCategorySchema = z.object({
  id: z.string().uuid("Invalid category ID."),
});

export type DeleteCategoryInput = {
  id: string;
};

export async function deleteCategory(input: DeleteCategoryInput) {
  const session = await getAdminSession();
  if (!session) return { error: "Forbidden." };

  const parsed = deleteCategorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const inUse = await isCategoryInUse(parsed.data.id);
    if (inUse) {
      return {
        error:
          "This category is assigned to content items and cannot be deleted.",
      };
    }

    await deleteCategoryById(parsed.data.id);
    await markMenuItemsBroken([parsed.data.id]);
    revalidatePath("/dashboard/content-categories");
    return { success: true };
  } catch (err) {
    console.error("[deleteCategory] Unexpected error:", err);
    return { error: "Something went wrong. Please try again." };
  }
}

// ─── Batch Delete ─────────────────────────────────────────────────────────────

const deleteCategoriesSchema = z.object({
  ids: z.array(z.string().uuid("Invalid category ID.")).min(1),
});

export type DeleteCategoriesInput = {
  ids: string[];
};

export async function deleteCategories(input: DeleteCategoriesInput) {
  const session = await getAdminSession();
  if (!session) return { error: "Forbidden." };

  const parsed = deleteCategoriesSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const inUseChecks = await Promise.all(
      parsed.data.ids.map((id) => isCategoryInUse(id)),
    );
    const anyInUse = inUseChecks.some(Boolean);
    if (anyInUse) {
      return {
        error:
          "One or more selected categories are assigned to content items and cannot be deleted.",
      };
    }

    await deleteCategoriesByIds(parsed.data.ids);
    await markMenuItemsBroken(parsed.data.ids);
    revalidatePath("/dashboard/content-categories");
    return { success: true };
  } catch (err) {
    console.error("[deleteCategories] Unexpected error:", err);
    return { error: "Something went wrong. Please try again." };
  }
}
