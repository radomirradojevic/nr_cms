"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { insertLink, updateLink, deleteLinkById } from "@/data/links";
import { revalidatePath } from "next/cache";

const createLinkSchema = z.object({
  originalUrl: z.string().url("Please enter a valid URL."),
  shortCode: z
    .string()
    .min(1, "Short code is required.")
    .max(50, "Short code must be 50 characters or fewer.")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Only letters, numbers, hyphens, and underscores are allowed.",
    ),
});

export type CreateLinkInput = {
  originalUrl: string;
  shortCode: string;
};

export async function createLink(input: CreateLinkInput) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized." };

  const parsed = createLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await insertLink({
      originalUrl: parsed.data.originalUrl,
      shortCode: parsed.data.shortCode,
      userId,
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("unique")) {
      return {
        error: "That short code is already taken. Please choose another.",
      };
    }
    return { error: "Something went wrong. Please try again." };
  }
}

const editLinkSchema = z.object({
  id: z.number().int().positive(),
  originalUrl: z.string().url("Please enter a valid URL."),
  shortCode: z
    .string()
    .min(1, "Short code is required.")
    .max(50, "Short code must be 50 characters or fewer.")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Only letters, numbers, hyphens, and underscores are allowed.",
    ),
});

export type EditLinkInput = {
  id: number;
  originalUrl: string;
  shortCode: string;
};

export async function editLink(input: EditLinkInput) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized." };

  const parsed = editLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const updated = await updateLink({
      id: parsed.data.id,
      shortCode: parsed.data.shortCode,
      originalUrl: parsed.data.originalUrl,
      userId,
    });

    if (updated.length === 0) {
      return {
        error: "Link not found or you do not have permission to edit it.",
      };
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("unique")) {
      return {
        error: "That short code is already taken. Please choose another.",
      };
    }
    return { error: "Something went wrong. Please try again." };
  }
}

export type DeleteLinkInput = {
  id: number;
};

export async function deleteLink(input: DeleteLinkInput) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized." };

  if (!Number.isInteger(input.id) || input.id <= 0) {
    return { error: "Invalid link ID." };
  }

  try {
    const deleted = await deleteLinkById(input.id, userId);

    if (deleted.length === 0) {
      return {
        error: "Link not found or you do not have permission to delete it.",
      };
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}
