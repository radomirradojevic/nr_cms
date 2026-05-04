"use server";

import { currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  insertCategory,
  updateCategoryName,
  deleteCategoryById,
  isCategoryInUse,
} from "@/data/content-categories";
import { hasRole, getRoles } from "@/lib/roles";

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
    revalidatePath("/dashboard/content-categories");
    return { success: true };
  } catch (err) {
    console.error("[deleteCategory] Unexpected error:", err);
    return { error: "Something went wrong. Please try again." };
  }
}
