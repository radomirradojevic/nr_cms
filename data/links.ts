import { db } from '@/db';
import { links } from '@/db/schema';
import { desc, eq, and } from 'drizzle-orm';

export async function getLinksByUserId(userId: string) {
  return db.select().from(links).where(eq(links.userId, userId)).orderBy(desc(links.updatedAt));
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

export async function getLinkByShortCode(shortCode: string) {
  const result = await db.select().from(links).where(eq(links.shortCode, shortCode)).limit(1);
  return result[0] ?? null;
}
