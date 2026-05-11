import { db } from "@/db";
import { content, contentCategories } from "@/db/schema";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  ne,
  or,
  type SQL,
} from "drizzle-orm";

export type ContentType = "page" | "blog_post";
export type ContentStatus = "published" | "unpublished" | "archived";

export type ContentRow = typeof content.$inferSelect;
export type NewContent = typeof content.$inferInsert;

export type ContentListItem = ContentRow & {
  categoryName: string;
};

export type ListContentParams = {
  page: number;
  pageSize: number;
  search?: string;
  contentType?: ContentType;
  status?: ContentStatus;
  categoryId?: string;
  authorId?: string;
  sort?: "updated_desc" | "updated_asc" | "title_asc" | "title_desc";
};

export async function listContent(
  params: ListContentParams,
): Promise<{ rows: ContentListItem[]; total: number }> {
  const { page, pageSize, search, contentType, status, categoryId, authorId } =
    params;
  const offset = (page - 1) * pageSize;

  const conditions: SQL[] = [];
  if (contentType) conditions.push(eq(content.contentType, contentType));
  if (status) conditions.push(eq(content.status, status));
  if (categoryId) conditions.push(eq(content.categoryId, categoryId));
  if (authorId) conditions.push(eq(content.authorId, authorId));
  if (search) {
    const like = `%${search}%`;
    const searchClause = or(
      ilike(content.title, like),
      ilike(content.slug, like),
      ilike(content.metaTitle, like),
      ilike(content.metaDescription, like),
      ilike(content.excerpt, like),
    );
    if (searchClause) conditions.push(searchClause);
  }

  const whereClause =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

  const orderBy = (() => {
    switch (params.sort) {
      case "updated_asc":
        return asc(content.updatedAt);
      case "title_asc":
        return asc(content.title);
      case "title_desc":
        return desc(content.title);
      case "updated_desc":
      default:
        return desc(content.updatedAt);
    }
  })();

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: content.id,
        contentType: content.contentType,
        categoryId: content.categoryId,
        title: content.title,
        content: content.content,
        contentJson: content.contentJson,
        metaTitle: content.metaTitle,
        metaDescription: content.metaDescription,
        status: content.status,
        publishedAt: content.publishedAt,
        excerpt: content.excerpt,
        coverImage: content.coverImage,
        slug: content.slug,
        authorId: content.authorId,
        homepage: content.homepage,
        enableComments: content.enableComments,
        autoPublishComments: content.autoPublishComments,
        allowAnonymousComments: content.allowAnonymousComments,
        createdAt: content.createdAt,
        updatedAt: content.updatedAt,
        categoryName: contentCategories.name,
      })
      .from(content)
      .leftJoin(contentCategories, eq(contentCategories.id, content.categoryId))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(content).where(whereClause),
  ]);

  return {
    rows: rows.map((r) => ({ ...r, categoryName: r.categoryName ?? "—" })),
    total: totalRows[0]?.total ?? 0,
  };
}

export async function getContentById(
  id: string,
): Promise<ContentRow | undefined> {
  const rows = await db
    .select()
    .from(content)
    .where(eq(content.id, id))
    .limit(1);
  return rows[0];
}

export async function getContentByIds(ids: string[]): Promise<ContentRow[]> {
  if (ids.length === 0) return [];
  return db.select().from(content).where(inArray(content.id, ids));
}

export async function getContentBySlug(
  slug: string,
): Promise<ContentRow | undefined> {
  const rows = await db
    .select()
    .from(content)
    .where(eq(content.slug, slug))
    .limit(1);
  return rows[0];
}

export async function getHomepageContent(): Promise<ContentRow | undefined> {
  const rows = await db
    .select()
    .from(content)
    .where(eq(content.homepage, true))
    .limit(1);
  return rows[0];
}

export async function countContentByCategory(
  categoryId: string,
): Promise<number> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(content)
    .where(eq(content.categoryId, categoryId));
  return total;
}

export async function existsSlug(
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  const conditions: SQL[] = [eq(content.slug, slug)];
  if (excludeId) conditions.push(ne(content.id, excludeId));
  const where = conditions.length === 1 ? conditions[0] : and(...conditions);
  const [{ total }] = await db
    .select({ total: count() })
    .from(content)
    .where(where);
  return total > 0;
}

export async function insertContent(values: NewContent): Promise<ContentRow> {
  const rows = await db.insert(content).values(values).returning();
  return rows[0];
}

export async function updateContentById(
  id: string,
  values: Partial<NewContent>,
): Promise<ContentRow | undefined> {
  const rows = await db
    .update(content)
    .set(values)
    .where(eq(content.id, id))
    .returning();
  return rows[0];
}

export async function deleteContentById(id: string): Promise<void> {
  await db.delete(content).where(eq(content.id, id));
}

export async function clearHomepageFlag(): Promise<void> {
  await db
    .update(content)
    .set({ homepage: false })
    .where(eq(content.homepage, true));
}

export async function setHomepageById(id: string): Promise<void> {
  await db.update(content).set({ homepage: true }).where(eq(content.id, id));
}
