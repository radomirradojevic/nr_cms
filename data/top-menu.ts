import { clerkClient } from "@clerk/nextjs/server";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  max,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import { content, contentCategories, menus, topMenuItems } from "@/db/schema";
import { canViewContent } from "@/lib/content-visibility";
import { isContentLive } from "@/lib/content-schedule";
import type { Role } from "@/lib/roles";
import type { ContentType } from "@/lib/content-types";

export type MenuRow = typeof menus.$inferSelect;
export type TopMenuItemRow = typeof topMenuItems.$inferSelect;
export type NewTopMenuItem = typeof topMenuItems.$inferInsert;

export type MenuListItem = MenuRow & {
  totalItems: number;
  nestedItems: number;
  creatorName: string | null;
  updatedByName: string | null;
};

export type MenuOption = {
  id: string;
  name: string;
};

export type MenuCreatorInfo = {
  id: string;
  name: string;
};

export type TopMenuTreeNode = {
  id: string;
  label: string;
  url: string;
  parentId: string | null;
  order: number;
  contentId: string | null;
  categoryId: string | null;
  target: "_self" | "_blank";
  children: TopMenuTreeNode[];
};

export const TOP_MENU_TAG = "top-menu";

export async function listMenus(): Promise<MenuRow[]> {
  return db.select().from(menus).orderBy(asc(menus.name));
}

export async function listMenuOptions(): Promise<MenuOption[]> {
  const rows = await db
    .select({ id: menus.id, name: menus.name })
    .from(menus)
    .orderBy(asc(menus.name));
  return rows;
}

export async function listMenuCreators(): Promise<MenuCreatorInfo[]> {
  const rows = await db
    .selectDistinct({ createdBy: menus.createdBy })
    .from(menus)
    .orderBy(asc(menus.createdBy));
  const creatorIds = rows
    .map((row) => row.createdBy)
    .filter((createdBy): createdBy is string => Boolean(createdBy));
  const names = await resolveUserNames(creatorIds);

  return creatorIds
    .map((id) => ({ id, name: names.get(id) ?? id }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listMenusWithItemCounts(opts: {
  search?: string;
  createdBy?: string;
  limit: number;
  offset: number;
}): Promise<{ rows: MenuListItem[]; total: number }> {
  const conditions: SQL[] = [];
  if (opts.search?.trim()) {
    conditions.push(ilike(menus.name, `%${opts.search.trim()}%`));
  }
  if (opts.createdBy) conditions.push(eq(menus.createdBy, opts.createdBy));
  const where = conditions.length ? and(...conditions) : undefined;

  const [menuRows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(menus)
      .where(where)
      .orderBy(desc(menus.updatedAt), asc(menus.name))
      .limit(opts.limit)
      .offset(opts.offset),
    db.select({ total: count() }).from(menus).where(where),
  ]);

  const menuIds = menuRows.map((menu) => menu.id);
  const itemRows =
    menuIds.length > 0
      ? await db
          .select({
            menuId: topMenuItems.menuId,
            parentId: topMenuItems.parentId,
          })
          .from(topMenuItems)
          .where(inArray(topMenuItems.menuId, menuIds))
      : [];

  const counts = new Map<string, { totalItems: number; nestedItems: number }>();
  for (const item of itemRows) {
    const current = counts.get(item.menuId) ?? {
      totalItems: 0,
      nestedItems: 0,
    };
    current.totalItems += 1;
    if (item.parentId) current.nestedItems += 1;
    counts.set(item.menuId, current);
  }

  const userIds = [
    ...new Set(
      menuRows
        .flatMap((menu) => [menu.createdBy, menu.updatedBy])
        .filter((userId): userId is string => Boolean(userId)),
    ),
  ];
  const userNames = await resolveUserNames(userIds);

  return {
    rows: menuRows.map((menu) => ({
      ...menu,
      totalItems: counts.get(menu.id)?.totalItems ?? 0,
      nestedItems: counts.get(menu.id)?.nestedItems ?? 0,
      creatorName: menu.createdBy
        ? (userNames.get(menu.createdBy) ?? null)
        : null,
      updatedByName: menu.updatedBy
        ? (userNames.get(menu.updatedBy) ?? null)
        : null,
    })),
    total,
  };
}

async function resolveUserNames(
  userIds: string[],
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (userIds.length === 0) return names;

  try {
    const client = await clerkClient();
    for (let i = 0; i < userIds.length; i += 100) {
      const res = await client.users.getUserList({
        userId: userIds.slice(i, i + 100),
        limit: 100,
      });
      for (const user of res.data) {
        names.set(
          user.id,
          user.fullName ||
            [user.firstName, user.lastName].filter(Boolean).join(" ") ||
            user.username ||
            user.primaryEmailAddress?.emailAddress ||
            user.emailAddresses[0]?.emailAddress ||
            user.id,
        );
      }
    }
  } catch {
    // Non-fatal: the table can still render ids/empty owners if Clerk is down.
  }

  return names;
}

export async function getMenuById(id: string): Promise<MenuRow | undefined> {
  const rows = await db.select().from(menus).where(eq(menus.id, id)).limit(1);
  return rows[0];
}

export async function getMenuByName(
  name: string,
): Promise<MenuRow | undefined> {
  const rows = await db
    .select()
    .from(menus)
    .where(eq(menus.name, name))
    .limit(1);
  return rows[0];
}

async function fetchAllRows(menuId: string): Promise<TopMenuItemRow[]> {
  return db
    .select()
    .from(topMenuItems)
    .where(eq(topMenuItems.menuId, menuId))
    .orderBy(asc(topMenuItems.parentId), asc(topMenuItems.order));
}

function buildTree(rows: TopMenuItemRow[]): TopMenuTreeNode[] {
  const byId = new Map<string, TopMenuTreeNode>();
  for (const r of rows) {
    byId.set(r.id, {
      id: r.id,
      label: r.label,
      url: r.url,
      parentId: r.parentId,
      order: r.order,
      contentId: r.contentId,
      categoryId: r.categoryId,
      target: (r.target as "_self" | "_blank") ?? "_self",
      children: [],
    });
  }
  const roots: TopMenuTreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRec = (nodes: TopMenuTreeNode[]) => {
    nodes.sort((a, b) => a.order - b.order);
    for (const n of nodes) sortRec(n.children);
  };
  sortRec(roots);
  return roots;
}

export const getTopMenuTree = async (
  menuId: string,
): Promise<TopMenuTreeNode[]> => {
  const rows = await fetchAllRows(menuId);
  return buildTree(rows);
};

export async function getTopMenuFlat(
  menuId: string,
): Promise<TopMenuItemRow[]> {
  return fetchAllRows(menuId);
}

export async function getTopMenuItemById(
  id: string,
): Promise<TopMenuItemRow | undefined> {
  const rows = await db
    .select()
    .from(topMenuItems)
    .where(eq(topMenuItems.id, id))
    .limit(1);
  return rows[0];
}

export async function getTopMenuItemInMenu(
  menuId: string,
  id: string,
): Promise<TopMenuItemRow | undefined> {
  const rows = await db
    .select()
    .from(topMenuItems)
    .where(and(eq(topMenuItems.menuId, menuId), eq(topMenuItems.id, id)))
    .limit(1);
  return rows[0];
}

export async function getMaxOrder(
  menuId: string,
  parentId: string | null,
): Promise<number> {
  const parentWhere = parentId
    ? eq(topMenuItems.parentId, parentId)
    : isNull(topMenuItems.parentId);
  const [{ value }] = await db
    .select({ value: max(topMenuItems.order) })
    .from(topMenuItems)
    .where(and(eq(topMenuItems.menuId, menuId), parentWhere));
  return value ?? -1;
}

export async function getItemsByContentId(
  contentId: string,
): Promise<TopMenuItemRow[]> {
  return db
    .select()
    .from(topMenuItems)
    .where(eq(topMenuItems.contentId, contentId));
}

export async function getItemsByCategoryId(
  categoryId: string,
): Promise<TopMenuItemRow[]> {
  return db
    .select()
    .from(topMenuItems)
    .where(eq(topMenuItems.categoryId, categoryId));
}

export type BlogCategoryPickerItem = {
  id: string;
  name: string;
};

export async function listBlogCategories(): Promise<BlogCategoryPickerItem[]> {
  const rows = await db
    .select({ id: contentCategories.id, name: contentCategories.name })
    .from(contentCategories)
    .where(eq(contentCategories.contentType, "blog_post"))
    .orderBy(asc(contentCategories.name));
  return rows;
}

export type ContentPickerItem = {
  id: string;
  title: string;
  slug: string;
  contentType: ContentType;
  status: string;
  publishAt: Date | null;
  unpublishAt: Date | null;
};

export async function listPickableContent(): Promise<ContentPickerItem[]> {
  const rows = await db
    .select({
      id: content.id,
      title: content.title,
      slug: content.slug,
      contentType: content.contentType,
      status: content.status,
      publishAt: content.publishAt,
      unpublishAt: content.unpublishAt,
    })
    .from(content)
    .orderBy(asc(content.title));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    contentType: r.contentType as ContentType,
    status: r.status,
    publishAt: r.publishAt,
    unpublishAt: r.unpublishAt,
  }));
}

// ─── Visibility-aware tree ────────────────────────────────────────────────────

/**
 * Collect every contentId/categoryId referenced anywhere in the tree.
 */
function collectLinkedIds(nodes: TopMenuTreeNode[]): {
  contentIds: string[];
  categoryIds: string[];
} {
  const contentIds = new Set<string>();
  const categoryIds = new Set<string>();
  const walk = (ns: TopMenuTreeNode[]) => {
    for (const n of ns) {
      if (n.contentId) contentIds.add(n.contentId);
      if (n.categoryId) categoryIds.add(n.categoryId);
      walk(n.children);
    }
  };
  walk(nodes);
  return {
    contentIds: Array.from(contentIds),
    categoryIds: Array.from(categoryIds),
  };
}

/**
 * Return the selected menu tree filtered for a specific viewer.
 *
 * Items are dropped when:
 *   - they link to a `content` row that is not visible to the viewer
 *     (or that is not `published`), or
 *   - they link to a blog category that has zero posts visible to the viewer.
 *
 * Pure URL items (no content/category link) are always kept.
 * Pass `null` for an anonymous (signed-out) viewer.
 */
export async function getTopMenuTreeForViewer(
  menuId: string | null,
  viewerRoles: Role[] | null,
): Promise<TopMenuTreeNode[]> {
  if (!menuId) return [];

  const tree = await getTopMenuTree(menuId);
  const { contentIds, categoryIds } = collectLinkedIds(tree);

  // Look up linked content visibility + status.
  const contentVis = new Map<string, { canSee: boolean }>();
  if (contentIds.length > 0) {
    const rows = await db
      .select({
        id: content.id,
        status: content.status,
        publishAt: content.publishAt,
        unpublishAt: content.unpublishAt,
        deletedAt: content.deletedAt,
        visibility: content.visibility,
      })
      .from(content)
      .where(inArray(content.id, contentIds));
    for (const r of rows) {
      contentVis.set(r.id, {
        canSee:
          !r.deletedAt &&
          isContentLive(r) &&
          canViewContent(r.visibility, viewerRoles),
      });
    }
  }

  // For each linked category, check whether at least one visible published
  // post exists. (Per category, this is a small targeted query.)
  const categoryHasVisible = new Map<string, boolean>();
  if (categoryIds.length > 0) {
    const rows = await db
      .select({
        categoryId: content.categoryId,
        status: content.status,
        publishAt: content.publishAt,
        unpublishAt: content.unpublishAt,
        visibility: content.visibility,
      })
      .from(content)
      .where(
        and(
          inArray(content.categoryId, categoryIds),
          isNull(content.deletedAt),
        ),
      );
    for (const r of rows) {
      if (isContentLive(r) && canViewContent(r.visibility, viewerRoles)) {
        categoryHasVisible.set(r.categoryId, true);
      }
    }
  }

  const filterRec = (nodes: TopMenuTreeNode[]): TopMenuTreeNode[] => {
    const out: TopMenuTreeNode[] = [];
    for (const n of nodes) {
      if (n.contentId) {
        const vis = contentVis.get(n.contentId);
        if (!vis || !vis.canSee) continue;
      } else if (n.categoryId) {
        if (!categoryHasVisible.get(n.categoryId)) continue;
      }
      out.push({ ...n, children: filterRec(n.children) });
    }
    return out;
  };

  return filterRec(tree);
}
