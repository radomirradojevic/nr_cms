import { and, asc, eq, inArray, isNull, max } from "drizzle-orm";
import { db } from "@/db";
import { content, contentCategories, menus, topMenuItems } from "@/db/schema";
import { canViewContent } from "@/lib/content-visibility";
import type { Role } from "@/lib/roles";

export type MenuRow = typeof menus.$inferSelect;
export type TopMenuItemRow = typeof topMenuItems.$inferSelect;
export type NewTopMenuItem = typeof topMenuItems.$inferInsert;

export type MenuListItem = MenuRow & {
  totalItems: number;
  nestedItems: number;
};

export type MenuOption = {
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

export async function listMenusWithItemCounts(): Promise<MenuListItem[]> {
  const [menuRows, itemRows] = await Promise.all([
    listMenus(),
    db
      .select({
        menuId: topMenuItems.menuId,
        parentId: topMenuItems.parentId,
      })
      .from(topMenuItems),
  ]);

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

  return menuRows.map((menu) => ({
    ...menu,
    totalItems: counts.get(menu.id)?.totalItems ?? 0,
    nestedItems: counts.get(menu.id)?.nestedItems ?? 0,
  }));
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
  contentType: "page" | "blog_post" | "hero_slider";
  status: string;
};

export async function listPickableContent(): Promise<ContentPickerItem[]> {
  const rows = await db
    .select({
      id: content.id,
      title: content.title,
      slug: content.slug,
      contentType: content.contentType,
      status: content.status,
    })
    .from(content)
    .orderBy(asc(content.title));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    contentType: r.contentType as "page" | "blog_post" | "hero_slider",
    status: r.status,
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
        visibility: content.visibility,
      })
      .from(content)
      .where(inArray(content.id, contentIds));
    for (const r of rows) {
      contentVis.set(r.id, {
        canSee:
          r.status === "published" && canViewContent(r.visibility, viewerRoles),
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
        visibility: content.visibility,
      })
      .from(content)
      .where(inArray(content.categoryId, categoryIds));
    for (const r of rows) {
      if (
        r.status === "published" &&
        canViewContent(r.visibility, viewerRoles)
      ) {
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
