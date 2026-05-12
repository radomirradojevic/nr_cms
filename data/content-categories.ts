import { db } from "@/db";
import { contentCategories, content } from "@/db/schema";
import { asc, eq, and, count, ilike, inArray } from "drizzle-orm";

export type ContentType = "page" | "blog_post";

export type ContentCategory = {
  id: string;
  name: string;
  contentType: string;
  createdBy: string | null;
  created: Date;
  updated: Date;
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
): Promise<{ categories: ContentCategory[]; total: number }> {
  const offset = (page - 1) * pageSize;

  const searchCondition = search
    ? ilike(contentCategories.name, `%${search}%`)
    : undefined;

  const typeCondition = eq(contentCategories.contentType, type);

  const whereClause = searchCondition
    ? and(typeCondition, searchCondition)
    : typeCondition;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(contentCategories)
      .where(whereClause)
      .orderBy(asc(contentCategories.name))
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(contentCategories).where(whereClause),
  ]);

  return { categories: rows, total };
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
    })
    .returning();
  return rows[0];
}

export async function updateCategoryName(
  id: string,
  name: string,
): Promise<ContentCategory> {
  const rows = await db
    .update(contentCategories)
    .set({ name })
    .where(eq(contentCategories.id, id))
    .returning();
  return rows[0];
}

export async function updateCategoryOwner(
  id: string,
  createdBy: string | null,
): Promise<ContentCategory> {
  const rows = await db
    .update(contentCategories)
    .set({ createdBy })
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
