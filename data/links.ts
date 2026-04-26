import { db } from "@/db";
import { links } from "@/db/schema";
import { desc, eq, and, count, or, ilike, inArray } from "drizzle-orm";

export async function getLinksByUserId(userId: string) {
  return db
    .select()
    .from(links)
    .where(eq(links.userId, userId))
    .orderBy(desc(links.updatedAt));
}

export async function getLinksByUserIdPaginated(
  userId: string,
  page: number,
  pageSize: number,
  search?: string,
) {
  const offset = (page - 1) * pageSize;

  const searchCondition = search
    ? or(
        ilike(links.shortCode, `%${search}%`),
        ilike(links.originalUrl, `%${search}%`),
      )
    : undefined;

  const whereClause = searchCondition
    ? and(eq(links.userId, userId), searchCondition)
    : eq(links.userId, userId);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(links)
      .where(whereClause)
      .orderBy(desc(links.updatedAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(links).where(whereClause),
  ]);

  return { links: rows, total };
}

export type InsertLinkInput = {
  shortCode: string;
  originalUrl: string;
  userId: string;
};

export async function insertLink(input: InsertLinkInput) {
  return db.insert(links).values(input).returning();
}

export type UpdateLinkInput = {
  id: number;
  shortCode: string;
  originalUrl: string;
  userId: string;
};

export async function updateLink(input: UpdateLinkInput) {
  return db
    .update(links)
    .set({ shortCode: input.shortCode, originalUrl: input.originalUrl })
    .where(and(eq(links.id, input.id), eq(links.userId, input.userId)))
    .returning();
}

export async function deleteLinkById(id: number, userId: string) {
  return db
    .delete(links)
    .where(and(eq(links.id, id), eq(links.userId, userId)))
    .returning();
}

export async function deleteLinksByIds(ids: number[], userId: string) {
  return db
    .delete(links)
    .where(and(inArray(links.id, ids), eq(links.userId, userId)))
    .returning();
}

export async function getLinkByShortCode(shortCode: string) {
  const result = await db
    .select()
    .from(links)
    .where(eq(links.shortCode, shortCode))
    .limit(1);
  return result[0] ?? null;
}
