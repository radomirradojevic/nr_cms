import { db } from "@/db";
import { contentCategories } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export type ContentType = "page" | "blog_post";

export type ContentCategory = {
  id: string;
  name: string;
  contentType: string;
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
  // When the content table is added, this query will check references.
  // For now the table doesn't exist yet; always return false so delete works.
  // TODO: replace with real join once the content table is defined in schema.
  return false;
}

export async function insertCategory(data: {
  name: string;
  contentType: string;
}): Promise<ContentCategory> {
  const rows = await db
    .insert(contentCategories)
    .values({ name: data.name, contentType: data.contentType })
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

export async function deleteCategoryById(id: string): Promise<void> {
  await db.delete(contentCategories).where(eq(contentCategories.id, id));
}
