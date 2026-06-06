import "server-only";

import { and, eq, lte } from "drizzle-orm";

import { db } from "@/db";
import { content } from "@/db/schema";
import { updateContentWithRevision } from "@/data/content-revisions";

export type ContentPublishingRunResult = {
  published: Array<{ id: string; slug: string; homepage: boolean }>;
  unpublished: Array<{ id: string; slug: string; homepage: boolean }>;
};

export async function runContentPublishingSchedule(
  now = new Date(),
): Promise<ContentPublishingRunResult> {
  const systemActorId = "system:content-publishing-cron";
  const published: ContentPublishingRunResult["published"] = [];
  const unpublished: ContentPublishingRunResult["unpublished"] = [];
  const duePublish = await db
    .select()
    .from(content)
    .where(and(eq(content.status, "approved"), lte(content.publishAt, now)));

  if (duePublish.length > 0) {
    for (const row of duePublish) {
      const result = await updateContentWithRevision({
        id: row.id,
        actorId: systemActorId,
        expectedVersion: row.version,
        values: {
          status: "published",
          publishedAt: row.publishedAt ?? now,
          publishAt: null,
          updatedBy: systemActorId,
        },
        changeType: "published",
      });
      if (result.ok) {
        published.push({ id: row.id, slug: row.slug, homepage: row.homepage });
      }
    }
  }

  const dueUnpublish = await db
    .select()
    .from(content)
    .where(and(eq(content.status, "published"), lte(content.unpublishAt, now)));

  if (dueUnpublish.length > 0) {
    for (const row of dueUnpublish) {
      const result = await updateContentWithRevision({
        id: row.id,
        actorId: systemActorId,
        expectedVersion: row.version,
        values: {
          status: "draft",
          homepage: false,
          publishAt: null,
          unpublishAt: null,
          updatedBy: systemActorId,
        },
        changeType: "unpublished",
      });
      if (result.ok) {
        unpublished.push({
          id: row.id,
          slug: row.slug,
          homepage: row.homepage,
        });
      }
    }
  }

  return { published, unpublished };
}
