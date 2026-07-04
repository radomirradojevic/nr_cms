"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { menus, topMenuItems } from "@/db/schema";
import { getRawGlobalSettings } from "@/data/global-settings";
import {
  TOP_MENU_TAG,
  getMaxOrder,
  getMenuById,
  getMenuByName,
  getTopMenuFlat,
  getTopMenuItemInMenu,
  listMenusWithItemCounts,
} from "@/data/top-menu";
import { getCategoryById } from "@/data/content-categories";
import { getContentById } from "@/data/content";
import { getBackendUserOptionById } from "@/lib/backend-users";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { requireAdminSectionLock } from "@/lib/admin-section-locks-actions";
import {
  DEFAULT_HEADER_SETTINGS,
  HeaderSettingsSchema,
} from "@/lib/global-settings";
import {
  isValidMenuUrl,
  MENU_URL_SERVER_VALIDATION_MESSAGE,
} from "@/lib/menu-url";

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const user = await getOptionalCurrentUser();
  if (!user) return null;
  const roles = getRoles(user.publicMetadata);
  if (!hasRole(roles, "admin")) return null;
  return user;
}

function bumpCaches(menuId?: string) {
  // Use updateTag (write-through / immediate expiration) instead of
  // revalidateTag(tag, "default"), which only marks the tag stale and serves
  // the previous value to the next request via stale-while-revalidate. With
  // SWR semantics the public site keeps rendering the old menu tree until a
  // background refresh completes, which manifests in production as missing
  // child items right after a save. updateTag guarantees the next render of
  // any consumer of getTopMenuTree() sees the fresh tree.
  updateTag(TOP_MENU_TAG);
  revalidatePath("/", "layout");
  revalidatePath("/dashboard/menus");
  revalidatePath("/dashboard/top-menu");
  if (menuId) revalidatePath(`/dashboard/menus/${menuId}`);
}

function isUniqueViolation(err: unknown): boolean {
  const cause =
    typeof err === "object" && err !== null && "cause" in err
      ? (err as { cause?: unknown }).cause
      : null;
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? (err as { code?: unknown }).code
      : typeof cause === "object" && cause !== null && "code" in cause
        ? (cause as { code?: unknown }).code
        : null;
  return code === "23505";
}

async function selectedHeaderMenuId(): Promise<string | null> {
  const settings = await getRawGlobalSettings();
  const parsed = HeaderSettingsSchema.safeParse(settings?.headerSettings);
  return (parsed.success ? parsed.data : DEFAULT_HEADER_SETTINGS)
    .navigationMenuId;
}

async function requireMenu(menuId: string) {
  const menu = await getMenuById(menuId);
  return menu ?? null;
}

async function touchMenu(menuId: string, userId: string) {
  await db
    .update(menus)
    .set({ updatedBy: userId, updatedAt: new Date() })
    .where(eq(menus.id, menuId));
}

// ─── Menu management ──────────────────────────────────────────────────────────

const menuNameSchema = z.object({
  name: z.string().trim().min(1, "Menu name is required.").max(120),
});

const menuIdSchema = z.object({
  id: z.string().uuid(),
});

const renameMenuSchema = menuIdSchema.extend({
  name: menuNameSchema.shape.name,
});

const reassignMenuOwnerSchema = menuIdSchema.extend({
  ownerId: z.string().min(1, "Owner is required."),
});

const listMenusSchema = z.object({
  search: z.string().trim().max(120).optional(),
  createdBy: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100),
  offset: z.number().int().min(0),
});

export async function createMenu(input: unknown, clientId?: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Forbidden." };
  const lockError = await requireAdminSectionLock("menus", clientId);
  if (lockError) return lockError;

  const parsed = menuNameSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const name = parsed.data.name;

  const existing = await getMenuByName(name);
  if (existing) return { error: "A menu with that name already exists." };

  try {
    const rows = await db
      .insert(menus)
      .values({ name, createdBy: admin.id, updatedBy: admin.id })
      .returning({ id: menus.id });
    bumpCaches(rows[0]?.id);
    return { success: true, id: rows[0]?.id };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: "A menu with that name already exists." };
    }
    console.error("[createMenu] error", err);
    return { error: "Something went wrong." };
  }
}

export async function fetchMenusList(input: unknown) {
  if (!(await requireAdmin())) return { error: "Forbidden." };

  const parsed = listMenusSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  return listMenusWithItemCounts({
    search: parsed.data.search || undefined,
    createdBy: parsed.data.createdBy,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  });
}

export async function renameMenu(input: unknown, clientId?: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Forbidden." };
  const lockError = await requireAdminSectionLock("menus", clientId);
  if (lockError) return lockError;

  const parsed = renameMenuSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, name } = parsed.data;

  const target = await getMenuById(id);
  if (!target) return { error: "Menu not found." };

  const existing = await getMenuByName(name);
  if (existing && existing.id !== id) {
    return { error: "A menu with that name already exists." };
  }

  try {
    await db
      .update(menus)
      .set({ name, updatedBy: admin.id, updatedAt: new Date() })
      .where(eq(menus.id, id));
    bumpCaches(id);
    return { success: true };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: "A menu with that name already exists." };
    }
    console.error("[renameMenu] error", err);
    return { error: "Something went wrong." };
  }
}

export async function reassignMenuOwner(input: unknown, clientId?: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Forbidden." };
  const lockError = await requireAdminSectionLock("menus", clientId);
  if (lockError) return lockError;

  const parsed = reassignMenuOwnerSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, ownerId } = parsed.data;

  const owner = await getBackendUserOptionById(ownerId);
  if (!owner) return { error: "Target user must be a backend user." };

  try {
    const rows = await db
      .update(menus)
      .set({ createdBy: ownerId, updatedBy: admin.id, updatedAt: new Date() })
      .where(eq(menus.id, id))
      .returning({ id: menus.id });
    if (rows.length === 0) return { error: "Menu not found." };
    bumpCaches(id);
    return { success: true };
  } catch (err) {
    console.error("[reassignMenuOwner] error", err);
    return { error: "Something went wrong." };
  }
}

export async function deleteMenu(input: unknown, clientId?: string) {
  if (!(await requireAdmin())) return { error: "Forbidden." };
  const lockError = await requireAdminSectionLock("menus", clientId);
  if (lockError) return lockError;

  const parsed = menuIdSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid menu id." };
  const { id } = parsed.data;

  const target = await getMenuById(id);
  if (!target) return { error: "Menu not found." };

  const selectedMenuId = await selectedHeaderMenuId();
  if (selectedMenuId === id) {
    return {
      error:
        'This menu is assigned to the Header. Select another menu or "Without menu" in Header Settings before deleting it.',
    };
  }

  try {
    await db.delete(menus).where(eq(menus.id, id));
    bumpCaches(id);
    return { success: true };
  } catch (err) {
    console.error("[deleteMenu] error", err);
    return { error: "Something went wrong." };
  }
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

// URL must be an absolute http(s) URL, a path starting with "/", or "#".
const urlSchema = z
  .string()
  .min(1, "URL is required.")
  .max(2000)
  .refine(isValidMenuUrl, MENU_URL_SERVER_VALIDATION_MESSAGE);

const targetSchema = z.enum(["_self", "_blank"]);
const menuIdField = z.object({ menuId: z.string().uuid() });

const createContentItemSchema = menuIdField.extend({
  kind: z.literal("content"),
  contentId: z.string().uuid(),
  label: z.string().min(1).max(200).optional(),
  parentId: z.string().uuid().nullable(),
  target: targetSchema.optional(),
});

const createCustomItemSchema = menuIdField.extend({
  kind: z.literal("custom"),
  label: z.string().min(1, "Label is required.").max(200),
  url: urlSchema,
  parentId: z.string().uuid().nullable(),
  target: targetSchema.optional(),
});

const createCategoryItemSchema = menuIdField.extend({
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
  const admin = await requireAdmin();
  if (!admin) return { error: "Forbidden." };
  const lockError = await requireAdminSectionLock("menus", clientId);
  if (lockError) return lockError;

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const menu = await requireMenu(data.menuId);
  if (!menu) return { error: "Menu not found." };

  if (data.parentId) {
    const parent = await getTopMenuItemInMenu(data.menuId, data.parentId);
    if (!parent) return { error: "Parent menu item does not exist." };
  }

  const order = (await getMaxOrder(data.menuId, data.parentId)) + 1;

  try {
    if (data.kind === "content") {
      const c = await getContentById(data.contentId);
      if (!c) return { error: "Selected content item does not exist." };
      await db.insert(topMenuItems).values({
        menuId: data.menuId,
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
        menuId: data.menuId,
        label: data.label?.trim() || cat.name,
        url: "/blog-category/" + cat.id,
        parentId: data.parentId,
        order,
        categoryId: cat.id,
        target: data.target ?? "_self",
      });
    } else {
      await db.insert(topMenuItems).values({
        menuId: data.menuId,
        label: data.label.trim(),
        url: data.url.trim(),
        parentId: data.parentId,
        order,
        contentId: null,
        categoryId: null,
        target: data.target ?? "_self",
      });
    }
    await touchMenu(data.menuId, admin.id);
    bumpCaches(data.menuId);
    return { success: true };
  } catch (err) {
    console.error("[createMenuItem] error", err);
    return { error: "Something went wrong." };
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

const updateSchema = menuIdField.extend({
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
  const admin = await requireAdmin();
  if (!admin) return { error: "Forbidden." };
  const lockError = await requireAdminSectionLock("menus", clientId);
  if (lockError) return lockError;

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const target = await getTopMenuItemInMenu(data.menuId, data.id);
  if (!target) return { error: "Menu item not found." };

  if (data.url !== undefined && (target.contentId || target.categoryId)) {
    return {
      error:
        "URL cannot be edited for linked items -- it follows the linked content or category.",
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
      .where(
        and(eq(topMenuItems.menuId, data.menuId), eq(topMenuItems.id, data.id)),
      );
    await touchMenu(data.menuId, admin.id);
    bumpCaches(data.menuId);
    return { success: true };
  } catch (err) {
    console.error("[updateMenuItem] error", err);
    return { error: "Something went wrong." };
  }
}

// ─── Reorder ──────────────────────────────────────────────────────────────────

const reorderSchema = menuIdField.extend({
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
  const admin = await requireAdmin();
  if (!admin) return { error: "Forbidden." };
  const lockError = await requireAdminSectionLock("menus", clientId);
  if (lockError) return lockError;

  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { menuId, updates } = parsed.data;

  const menu = await requireMenu(menuId);
  if (!menu) return { error: "Menu not found." };

  // Load current state to validate ids/parents and detect cycles
  const all = await getTopMenuFlat(menuId);
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
          .where(
            and(eq(topMenuItems.menuId, menuId), eq(topMenuItems.id, u.id)),
          ),
      ),
    );
    await touchMenu(menuId, admin.id);
    bumpCaches(menuId);
    return { success: true };
  } catch (err) {
    console.error("[reorderMenu] error", err);
    return { error: "Something went wrong." };
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

const deleteSchema = menuIdField.extend({ id: z.string().uuid() });

export async function deleteMenuItem(
  input: { menuId: string; id: string },
  clientId?: string,
) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Forbidden." };
  const lockError = await requireAdminSectionLock("menus", clientId);
  if (lockError) return lockError;

  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid id." };
  const { menuId, id } = parsed.data;

  const target = await getTopMenuItemInMenu(menuId, id);
  if (!target) return { error: "Menu item not found." };

  try {
    // FK cascade deletes children automatically.
    await db
      .delete(topMenuItems)
      .where(and(eq(topMenuItems.menuId, menuId), eq(topMenuItems.id, id)));

    // Re-pack siblings to keep `order` dense
    await repackSiblings(menuId, target.parentId);
    await touchMenu(menuId, admin.id);

    bumpCaches(menuId);
    return { success: true };
  } catch (err) {
    console.error("[deleteMenuItem] error", err);
    return { error: "Something went wrong." };
  }
}

async function repackSiblings(menuId: string, parentId: string | null) {
  const parentWhere = parentId
    ? eq(topMenuItems.parentId, parentId)
    : isNull(topMenuItems.parentId);
  const siblings = await db
    .select({ id: topMenuItems.id, order: topMenuItems.order })
    .from(topMenuItems)
    .where(and(eq(topMenuItems.menuId, menuId), parentWhere));
  siblings.sort((a, b) => a.order - b.order);
  await Promise.all(
    siblings.map((s, i) =>
      s.order === i
        ? Promise.resolve()
        : db
            .update(topMenuItems)
            .set({ order: i })
            .where(
              and(eq(topMenuItems.menuId, menuId), eq(topMenuItems.id, s.id)),
            ),
    ),
  );
}
