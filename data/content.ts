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
  sql,
  type SQL,
} from "drizzle-orm";
import { buildVisibilityWhere } from "@/lib/content-visibility";
import type { Role } from "@/lib/roles";

export type ContentType = "page" | "blog_post" | "hero_slider";
export type ContentStatus = "published" | "unpublished" | "archived";

export type ContentRow = typeof content.$inferSelect;
export type NewContent = typeof content.$inferInsert;

export type ContentListItem = ContentRow & {
  categoryName: string;
};

export type ContentAuthorInfo = {
  id: string;
  name: string;
};

export type PublicSearchResult = {
  id: string;
  title: string;
  slug: string;
  url: string;
  contentType: ContentType;
  snippet: string;
  updatedAt: Date;
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
  /**
   * When provided, restrict results to rows visible to a viewer with these
   * roles. Pass `null` for an anonymous (signed-out) visitor. Leave
   * `undefined` for backend/dashboard listings that intentionally see all
   * content regardless of visibility.
   */
  viewerRoles?: Role[] | null;
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
  if (params.viewerRoles !== undefined) {
    conditions.push(buildVisibilityWhere(params.viewerRoles));
  }
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
        updatedBy: content.updatedBy,
        homepage: content.homepage,
        enableComments: content.enableComments,
        autoPublishComments: content.autoPublishComments,
        allowAnonymousComments: content.allowAnonymousComments,
        visibility: content.visibility,
        createdAt: content.createdAt,
        updatedAt: content.updatedAt,
        version: content.version,
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

export async function getDistinctContentAuthorIds(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ authorId: content.authorId })
    .from(content)
    .orderBy(asc(content.authorId));
  return rows.map((row) => row.authorId);
}

function normalizeSearchTypes(contentTypes: ContentType[]): ContentType[] {
  return Array.from(
    new Set(
      contentTypes.filter(
        (type): type is ContentType =>
          type === "blog_post" || type === "page" || type === "hero_slider",
      ),
    ),
  );
}

function plainText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSnippet(
  row: {
    title: string;
    excerpt: string | null;
    metaDescription: string | null;
    content: string | null;
  },
  query: string,
): string {
  const text =
    plainText(row.excerpt) ||
    plainText(row.metaDescription) ||
    plainText(row.content) ||
    row.title;
  const maxLength = 180;
  if (text.length <= maxLength) return text;

  const index = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  const start = index > 40 ? Math.max(0, index - 55) : 0;
  const end = Math.min(text.length, start + maxLength);
  const prefix = start > 0 ? "... " : "";
  const suffix = end < text.length ? " ..." : "";
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

export async function searchPublishedContent(params: {
  query: string;
  contentTypes: ContentType[];
  limit: number;
  offset?: number;
  viewerRoles?: Role[] | null;
}): Promise<{ rows: PublicSearchResult[]; total: number }> {
  const query = params.query.trim();
  const contentTypes = normalizeSearchTypes(params.contentTypes);
  const limit = Math.min(Math.max(params.limit, 1), 50);
  const offset = Math.max(params.offset ?? 0, 0);

  if (query.length === 0 || contentTypes.length === 0) {
    return { rows: [], total: 0 };
  }

  const like = `%${query}%`;
  const prefixLike = `${query}%`;
  const conditions: SQL[] = [
    eq(content.status, "published"),
    inArray(content.contentType, contentTypes),
  ];
  if (params.viewerRoles !== undefined) {
    conditions.push(buildVisibilityWhere(params.viewerRoles));
  }

  const searchClause = or(
    ilike(content.title, like),
    ilike(content.slug, like),
    ilike(content.metaTitle, like),
    ilike(content.metaDescription, like),
    ilike(content.excerpt, like),
    ilike(content.content, like),
    sql`${content.contentJson}::text ILIKE ${like}`,
  );
  if (searchClause) conditions.push(searchClause);

  const whereClause = and(...conditions);
  const relevance = sql<number>`CASE
    WHEN lower(${content.title}) = lower(${query}) THEN 100
    WHEN ${content.title} ILIKE ${prefixLike} THEN 80
    WHEN ${content.title} ILIKE ${like} THEN 60
    WHEN ${content.slug} ILIKE ${prefixLike} THEN 45
    WHEN ${content.excerpt} ILIKE ${like} THEN 35
    WHEN ${content.metaDescription} ILIKE ${like} THEN 30
    ELSE 10
  END`;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: content.id,
        title: content.title,
        slug: content.slug,
        contentType: content.contentType,
        excerpt: content.excerpt,
        metaDescription: content.metaDescription,
        content: content.content,
        updatedAt: content.updatedAt,
        relevance,
      })
      .from(content)
      .where(whereClause)
      .orderBy(desc(relevance), desc(content.updatedAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(content).where(whereClause),
  ]);

  return {
    rows: rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      url: `/${row.slug}`,
      contentType: row.contentType as ContentType,
      snippet: buildSnippet(row, query),
      updatedAt: row.updatedAt,
    })),
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
