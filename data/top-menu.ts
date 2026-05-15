import { unstable_cache } from "next/cache";
import { asc, eq, isNull, max } from "drizzle-orm";
import { db } from "@/db";
import { topMenuItems, content, contentCategories } from "@/db/schema";

export type TopMenuItemRow = typeof topMenuItems.$inferSelect;
export type NewTopMenuItem = typeof topMenuItems.$inferInsert;

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

async function fetchAllRows(): Promise<TopMenuItemRow[]> {
  return db
    .select()
    .from(topMenuItems)
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

export const getTopMenuTree = unstable_cache(
  async (): Promise<TopMenuTreeNode[]> => {
    const rows = await fetchAllRows();
    const tree = buildTree(rows);
    // Production-only diagnostic: emit a compact view of the tree shape so we
    // can tell from Vercel logs whether the cached value is fresh and contains
    // the expected parent/child nesting. Cheap (no PII; bounded by row count).
    if (process.env.NODE_ENV === "production") {
      const summary = {
        rows: rows.length,
        roots: tree.length,
        shape: tree.map((r) => ({
          id: r.id,
          label: r.label,
          children: r.children.map((c) => ({ id: c.id, label: c.label })),
        })),
      };
      console.log("[top-menu] getTopMenuTree", JSON.stringify(summary));
    }
    return tree;
  },
  ["top-menu-tree"],
  { tags: [TOP_MENU_TAG] },
);

export async function getTopMenuFlat(): Promise<TopMenuItemRow[]> {
  return fetchAllRows();
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

export async function getMaxOrder(parentId: string | null): Promise<number> {
  const where = parentId
    ? eq(topMenuItems.parentId, parentId)
    : isNull(topMenuItems.parentId);
  const [{ value }] = await db
    .select({ value: max(topMenuItems.order) })
    .from(topMenuItems)
    .where(where);
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
  contentType: "page" | "blog_post";
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
    contentType: r.contentType as "page" | "blog_post",
    status: r.status,
  }));
}
