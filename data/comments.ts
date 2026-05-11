import { db } from "@/db";
import { comments } from "@/db/schema";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  type SQL,
} from "drizzle-orm";

export type CommentRow = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type CommentStatus = "pending" | "published";

/** Public-facing comment shape — strips PII (email, ip, ua). */
export type PublicComment = {
  id: string;
  parentId: string | null;
  authorName: string;
  body: string;
  createdAt: Date;
};

/**
 * Returns published comments for a post, ordered chronologically.
 * Caller is responsible for assembling the 2-level tree.
 */
export async function getPublishedCommentsForPost(
  contentId: string,
): Promise<PublicComment[]> {
  const rows = await db
    .select({
      id: comments.id,
      parentId: comments.parentId,
      authorName: comments.authorName,
      body: comments.body,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .where(
      and(eq(comments.contentId, contentId), eq(comments.status, "published")),
    )
    .orderBy(asc(comments.createdAt));
  return rows;
}

export async function getCommentById(
  id: string,
): Promise<CommentRow | undefined> {
  const rows = await db
    .select()
    .from(comments)
    .where(eq(comments.id, id))
    .limit(1);
  return rows[0];
}

export async function getCommentsByIds(ids: string[]): Promise<CommentRow[]> {
  if (ids.length === 0) return [];
  return db.select().from(comments).where(inArray(comments.id, ids));
}

export type ListCommentsParams = {
  contentId: string;
  page: number;
  pageSize: number;
  status?: CommentStatus;
  search?: string;
  sort?: "created_desc" | "created_asc";
};

export async function listCommentsForPost(
  params: ListCommentsParams,
): Promise<{ rows: CommentRow[]; total: number }> {
  const { contentId, page, pageSize, status, search } = params;
  const offset = (page - 1) * pageSize;

  const conditions: SQL[] = [eq(comments.contentId, contentId)];
  if (status) conditions.push(eq(comments.status, status));
  if (search) {
    const like = `%${search}%`;
    const clause = or(
      ilike(comments.body, like),
      ilike(comments.authorName, like),
    );
    if (clause) conditions.push(clause);
  }

  const where = conditions.length === 1 ? conditions[0] : and(...conditions);
  const order =
    params.sort === "created_asc"
      ? asc(comments.createdAt)
      : desc(comments.createdAt);

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(comments)
      .where(where)
      .orderBy(order)
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(comments).where(where),
  ]);

  return { rows, total: totalRows[0]?.total ?? 0 };
}

export async function countPendingForPost(contentId: string): Promise<number> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(comments)
    .where(
      and(eq(comments.contentId, contentId), eq(comments.status, "pending")),
    );
  return total;
}

export async function insertComment(values: NewComment): Promise<CommentRow> {
  const rows = await db.insert(comments).values(values).returning();
  return rows[0];
}

export async function updateCommentById(
  id: string,
  values: Partial<NewComment>,
): Promise<CommentRow | undefined> {
  const rows = await db
    .update(comments)
    .set(values)
    .where(eq(comments.id, id))
    .returning();
  return rows[0];
}

export async function deleteCommentById(id: string): Promise<void> {
  await db.delete(comments).where(eq(comments.id, id));
}
