import "server-only";

import crypto from "node:crypto";

import { and, eq, gt, isNull, lt } from "drizzle-orm";

import { db } from "@/db";
import { content, contentPreviewTokens } from "@/db/schema";

export const PREVIEW_TOKEN_TTL_MINUTES = 30;

export type ContentPreviewTokenRow = typeof contentPreviewTokens.$inferSelect;

export type ContentPreviewDetail = {
  token: ContentPreviewTokenRow;
  content: typeof content.$inferSelect;
};

export function generatePreviewToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashPreviewToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createContentPreviewToken(input: {
  contentId: string;
  createdBy: string;
  expiresAt?: Date;
}): Promise<{ token: string; expiresAt: Date }> {
  const token = generatePreviewToken();
  const tokenHash = hashPreviewToken(token);
  const expiresAt =
    input.expiresAt ??
    new Date(Date.now() + PREVIEW_TOKEN_TTL_MINUTES * 60 * 1000);

  await db
    .delete(contentPreviewTokens)
    .where(
      and(
        eq(contentPreviewTokens.contentId, input.contentId),
        lt(contentPreviewTokens.expiresAt, new Date()),
      ),
    );

  await db.insert(contentPreviewTokens).values({
    contentId: input.contentId,
    tokenHash,
    createdBy: input.createdBy,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function getContentPreviewByToken(
  token: string,
): Promise<ContentPreviewDetail | null> {
  const tokenHash = hashPreviewToken(token);
  const rows = await db
    .select({
      token: contentPreviewTokens,
      content,
    })
    .from(contentPreviewTokens)
    .innerJoin(content, eq(content.id, contentPreviewTokens.contentId))
    .where(
      and(
        eq(contentPreviewTokens.tokenHash, tokenHash),
        gt(contentPreviewTokens.expiresAt, new Date()),
        isNull(content.deletedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}
