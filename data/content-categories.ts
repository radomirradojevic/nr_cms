import { db } from "@/db";
import { contentCategories, content } from "@/db/schema";
import {
  asc,
  eq,
  and,
  count,
  ilike,
  inArray,
  isNotNull,
  sql,
  type SQL,
} from "drizzle-orm";

export type ContentType = "page" | "blog_post";

export type ContentCategory = {
  id: string;
  name: string;
  contentType: string;
  createdBy: string | null;
  updatedBy: string | null;
  created: Date;
  updated: Date;
};

export type ContentCategoryAuthorInfo = {
  id: string;
  name: string;
};

export async function getAllCategories(): Promise<ContentCategory[]> {
  return db
    .select()
    .from(contentCategories)
    .orderBy(asc(contentCategories.contentType), asc(contentCategories.name));
}

export async function getCategoriesByType(
  type: ContentType,
): Promise<ContentCategory[]> {
  return db
    .select()
    .from(contentCategories)
    .where(eq(contentCategories.contentType, type))
    .orderBy(asc(contentCategories.name));
}

export async function getCategoriesPaginated(
  type: ContentType,
  page: number,
  pageSize: number,
  search?: string,
  createdBy?: string,
): Promise<{
  categories: (ContentCategory & { itemCount: number })[];
  total: number;
}> {
  const offset = (page - 1) * pageSize;

  const conditions: SQL[] = [eq(contentCategories.contentType, type)];
  if (search) conditions.push(ilike(contentCategories.name, `%${search}%`));
  if (createdBy) conditions.push(eq(contentCategories.createdBy, createdBy));
  const whereClause = and(...conditions);

  const itemCountSq = db
    .select({
      categoryId: content.categoryId,
      itemCount: count().as("item_count"),
    })
    .from(content)
    .groupBy(content.categoryId)
    .as("item_counts");

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: contentCategories.id,
        name: contentCategories.name,
        contentType: contentCategories.contentType,
        createdBy: contentCategories.createdBy,
        updatedBy: contentCategories.updatedBy,
        created: contentCategories.created,
        updated: contentCategories.updated,
        itemCount: sql<number>`COALESCE(${itemCountSq.itemCount}, 0)`.mapWith(
          Number,
        ),
      })
      .from(contentCategories)
      .leftJoin(itemCountSq, eq(contentCategories.id, itemCountSq.categoryId))
      .where(whereClause)
      .orderBy(asc(contentCategories.name))
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(contentCategories).where(whereClause),
  ]);

  return { categories: rows, total };
}

export async function getDistinctCategoryAuthorIds(
  type: ContentType,
): Promise<string[]> {
  const rows = await db
    .selectDistinct({ createdBy: contentCategories.createdBy })
    .from(contentCategories)
    .where(
      and(
        eq(contentCategories.contentType, type),
        isNotNull(contentCategories.createdBy),
      ),
    )
    .orderBy(asc(contentCategories.createdBy));

  return rows
    .map((row) => row.createdBy)
    .filter((createdBy): createdBy is string => Boolean(createdBy));
}

export async function getCategoryById(
  id: string,
): Promise<ContentCategory | undefined> {
  const rows = await db
    .select()
    .from(contentCategories)
    .where(eq(contentCategories.id, id))
    .limit(1);
  return rows[0];
}

export async function getCategoriesByIds(
  ids: string[],
): Promise<ContentCategory[]> {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(contentCategories)
    .where(inArray(contentCategories.id, ids));
}

export async function isCategoryInUse(id: string): Promise<boolean> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(content)
    .where(eq(content.categoryId, id));
  return total > 0;
}

export async function insertCategory(data: {
  name: string;
  contentType: string;
  createdBy?: string;
}): Promise<ContentCategory> {
  const rows = await db
    .insert(contentCategories)
    .values({
      name: data.name,
      contentType: data.contentType,
      createdBy: data.createdBy ?? null,
      updatedBy: data.createdBy ?? null,
    })
    .returning();
  return rows[0];
}

export async function updateCategoryName(
  id: string,
  name: string,
  updatedBy: string,
): Promise<ContentCategory> {
  const rows = await db
    .update(contentCategories)
    .set({ name, updatedBy })
    .where(eq(contentCategories.id, id))
    .returning();
  return rows[0];
}

export async function updateCategoryOwner(
  id: string,
  createdBy: string | null,
  updatedBy: string,
): Promise<ContentCategory> {
  const rows = await db
    .update(contentCategories)
    .set({ createdBy, updatedBy })
    .where(eq(contentCategories.id, id))
    .returning();
  return rows[0];
}

export async function deleteCategoryById(id: string): Promise<void> {
  await db.delete(contentCategories).where(eq(contentCategories.id, id));
}

export async function deleteCategoriesByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db.delete(contentCategories).where(inArray(contentCategories.id, ids));
}
