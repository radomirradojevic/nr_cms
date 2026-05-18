"use server";

import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";

import { db } from "@/db";
import { topMenuItems } from "@/db/schema";
import { getRoles, hasRole } from "@/lib/roles";
import { requireAdminSectionLock } from "@/lib/admin-section-locks-actions";
import {
  TOP_MENU_TAG,
  getMaxOrder,
  getTopMenuFlat,
  getTopMenuItemById,
} from "@/data/top-menu";
import { getContentById } from "@/data/content";
import { getCategoryById } from "@/data/content-categories";

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const user = await currentUser();
  if (!user) return null;
  const roles = getRoles(user.publicMetadata);
  if (!hasRole(roles, "admin")) return null;
  return user;
}

function bumpCaches() {
  // Use updateTag (write-through / immediate expiration) instead of
  // revalidateTag(tag, "default"), which only marks the tag stale and serves
  // the previous value to the next request via stale-while-revalidate. With
  // SWR semantics the public site keeps rendering the old top-menu tree until
  // a background refresh completes, which manifests in production as missing
  // child items right after a save. updateTag guarantees the next render of
  // any consumer of getTopMenuTree() sees the fresh tree.
  updateTag(TOP_MENU_TAG);
  revalidatePath("/", "layout");
  revalidatePath("/dashboard/top-menu");
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

// URL must be either an absolute http(s) URL or a path starting with "/"
const urlSchema = z
  .string()
  .min(1, "URL is required.")
  .max(2000)
  .refine(
    (v) => /^https?:\/\//i.test(v) || v.startsWith("/"),
    "URL must start with http(s):// or /",
  );

const targetSchema = z.enum(["_self", "_blank"]);

const createContentItemSchema = z.object({
  kind: z.literal("content"),
  contentId: z.string().uuid(),
  label: z.string().min(1).max(200).optional(),
  parentId: z.string().uuid().nullable(),
  target: targetSchema.optional(),
});

const createCustomItemSchema = z.object({
  kind: z.literal("custom"),
  label: z.string().min(1, "Label is required.").max(200),
  url: urlSchema,
  parentId: z.string().uuid().nullable(),
  target: targetSchema.optional(),
});

const createCategoryItemSchema = z.object({
  kind: z.literal("category"),
  categoryId: z.string().uuid(),
  label: z.string().min(1).max(200).optional(),
  parentId: z.string().uuid().nullable(),
  target: targetSchema.optional(),
});

const createSchema = z.discriminatedUnion("kind", [
  createContentItemSchema,
  createCustomItemSchema,
  createCategoryItemSchema,
]);

export type CreateMenuItemInput = z.infer<typeof createSchema>;

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createMenuItem(
  input: CreateMenuItemInput,
  clientId?: string,
) {
  if (!(await requireAdmin())) return { error: "Forbidden." };
  const lockError = await requireAdminSectionLock("top-menu", clientId);
  if (lockError) return lockError;

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  if (data.parentId) {
    const parent = await getTopMenuItemById(data.parentId);
    if (!parent) return { error: "Parent menu item does not exist." };
  }

  const order = (await getMaxOrder(data.parentId)) + 1;

  try {
    if (data.kind === "content") {
      const c = await getContentById(data.contentId);
      if (!c) return { error: "Selected content item does not exist." };
      await db.insert(topMenuItems).values({
        label: data.label?.trim() || c.title,
        url: "/" + c.slug,
        parentId: data.parentId,
        order,
        contentId: c.id,
        target: data.target ?? "_self",
      });
    } else if (data.kind === "category") {
      const cat = await getCategoryById(data.categoryId);
      if (!cat) return { error: "Selected category does not exist." };
      if (cat.contentType !== "blog_post") {
        return { error: "Only blog post categories can be linked." };
      }
      await db.insert(topMenuItems).values({
        label: data.label?.trim() || cat.name,
        url: "/blog-category/" + cat.id,
        parentId: data.parentId,
        order,
        categoryId: cat.id,
        target: data.target ?? "_self",
      });
    } else {
      await db.insert(topMenuItems).values({
        label: data.label.trim(),
        url: data.url.trim(),
        parentId: data.parentId,
        order,
        contentId: null,
        target: data.target ?? "_self",
      });
    }
    bumpCaches();
    return { success: true };
  } catch (err) {
    console.error("[createMenuItem] error", err);
    return { error: "Something went wrong." };
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

const updateSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(200).optional(),
  url: urlSchema.optional(),
  target: targetSchema.optional(),
});

export type UpdateMenuItemInput = z.infer<typeof updateSchema>;

export async function updateMenuItem(
  input: UpdateMenuItemInput,
  clientId?: string,
) {
  if (!(await requireAdmin())) return { error: "Forbidden." };
  const lockError = await requireAdminSectionLock("top-menu", clientId);
  if (lockError) return lockError;

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const target = await getTopMenuItemById(data.id);
  if (!target) return { error: "Menu item not found." };

  if (data.url !== undefined && (target.contentId || target.categoryId)) {
    return {
      error:
        "URL cannot be edited for linked items \u2014 it follows the linked content or category.",
    };
  }

  const updates: Partial<typeof topMenuItems.$inferInsert> = {};
  if (data.label !== undefined) updates.label = data.label.trim();
  if (data.url !== undefined) updates.url = data.url.trim();
  if (data.target !== undefined) updates.target = data.target;

  if (Object.keys(updates).length === 0) return { success: true };

  try {
    await db
      .update(topMenuItems)
      .set(updates)
      .where(eq(topMenuItems.id, data.id));
    bumpCaches();
    return { success: true };
  } catch (err) {
    console.error("[updateMenuItem] error", err);
    return { error: "Something went wrong." };
  }
}

// ─── Reorder ──────────────────────────────────────────────────────────────────

const reorderSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string().uuid(),
        parentId: z.string().uuid().nullable(),
        order: z.number().int().min(0),
      }),
    )
    .min(1),
});

export type ReorderMenuInput = z.infer<typeof reorderSchema>;

export async function reorderMenu(input: ReorderMenuInput, clientId?: string) {
  if (!(await requireAdmin())) return { error: "Forbidden." };
  const lockError = await requireAdminSectionLock("top-menu", clientId);
  if (lockError) return lockError;

  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { updates } = parsed.data;

  // Load current state to validate ids/parents and detect cycles
  const all = await getTopMenuFlat();
  const byId = new Map(all.map((r) => [r.id, r]));

  // Apply pending parents in-memory and check no cycles
  const pendingParent = new Map<string, string | null>();
  for (const u of updates) {
    if (!byId.has(u.id)) {
      return { error: `Menu item ${u.id} does not exist.` };
    }
    if (u.parentId && !byId.has(u.parentId)) {
      return { error: `Parent ${u.parentId} does not exist.` };
    }
    if (u.parentId === u.id) {
      return { error: "An item cannot be its own parent." };
    }
    pendingParent.set(u.id, u.parentId);
  }

  const resolveParent = (id: string): string | null => {
    if (pendingParent.has(id)) return pendingParent.get(id)!;
    return byId.get(id)?.parentId ?? null;
  };

  // cycle detection: walking up parents must terminate at null
  for (const u of updates) {
    let cur: string | null = u.parentId;
    const seen = new Set<string>([u.id]);
    while (cur) {
      if (seen.has(cur)) {
        return { error: "Cycle detected in menu hierarchy." };
      }
      seen.add(cur);
      cur = resolveParent(cur);
    }
  }

  try {
    await Promise.all(
      updates.map((u) =>
        db
          .update(topMenuItems)
          .set({ parentId: u.parentId, order: u.order })
          .where(eq(topMenuItems.id, u.id)),
      ),
    );
    bumpCaches();
    return { success: true };
  } catch (err) {
    console.error("[reorderMenu] error", err);
    return { error: "Something went wrong." };
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

const deleteSchema = z.object({ id: z.string().uuid() });

export async function deleteMenuItem(input: { id: string }, clientId?: string) {
  if (!(await requireAdmin())) return { error: "Forbidden." };
  const lockError = await requireAdminSectionLock("top-menu", clientId);
  if (lockError) return lockError;

  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid id." };

  const target = await getTopMenuItemById(parsed.data.id);
  if (!target) return { error: "Menu item not found." };

  try {
    // FK cascade deletes children automatically.
    await db.delete(topMenuItems).where(eq(topMenuItems.id, parsed.data.id));

    // Re-pack siblings to keep `order` dense
    await repackSiblings(target.parentId);

    bumpCaches();
    return { success: true };
  } catch (err) {
    console.error("[deleteMenuItem] error", err);
    return { error: "Something went wrong." };
  }
}

async function repackSiblings(parentId: string | null) {
  const where = parentId
    ? eq(topMenuItems.parentId, parentId)
    : isNull(topMenuItems.parentId);
  const siblings = await db
    .select({ id: topMenuItems.id, order: topMenuItems.order })
    .from(topMenuItems)
    .where(where);
  siblings.sort((a, b) => a.order - b.order);
  await Promise.all(
    siblings.map((s, i) =>
      s.order === i
        ? Promise.resolve()
        : db
            .update(topMenuItems)
            .set({ order: i })
            .where(eq(topMenuItems.id, s.id)),
    ),
  );
}

// Suppress unused import warnings in some toolchains
void and;
