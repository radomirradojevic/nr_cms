import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  lt,
  ne,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db";
import { content, contentRevisions } from "@/db/schema";
import type { ContentRow } from "@/data/content";
import { getGlobalSettings } from "@/data/global-settings";
import { hasMeaningfulContentChanges } from "@/lib/content-change-detection";
import { isContentLive } from "@/lib/content-schedule";
import type { ContentStatus } from "@/lib/content-status";
import type { ContentRevisionChangeType } from "@/lib/content-revision-policy";

type RevisionClient = Pick<
  typeof db,
  "select" | "insert" | "update" | "delete" | "execute"
>;

export type ContentRevisionRow = typeof contentRevisions.$inferSelect;
export type NewContentRevision = typeof contentRevisions.$inferInsert;
export type ContentRevisionNavigationItem = {
  id: number;
  revisionNumber: number;
};

export type ListContentRevisionsParams = {
  page?: number;
  pageSize?: number;
  changeTypes?: readonly ContentRevisionChangeType[];
};

export type UpdateContentWithRevisionResult =
  | {
      ok: true;
      row: ContentRow;
      revision: ContentRevisionRow | null;
      changed: boolean;
    }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "stale"; currentVersion: number };

export type RestoreContentRevisionResult =
  | {
      ok: true;
      row: ContentRow;
      previous: ContentRow;
      revision: ContentRevisionRow;
    }
  | { ok: false; reason: "not_found" | "revision_not_found" }
  | { ok: false; reason: "stale"; currentVersion: number }
  | { ok: false; reason: "slug_conflict" }
  | { ok: false; reason: "homepage_not_live" };

async function lockContentRow(
  client: RevisionClient,
  contentId: string,
): Promise<void> {
  await client.execute(sql`
    SELECT 1
    FROM ${content}
    WHERE ${content.id} = ${contentId}
    FOR UPDATE
  `);
}

function snapshotValues(
  row: ContentRow,
  actorId: string,
  changeType: ContentRevisionChangeType,
  revisionNumber: number,
  changeNote?: string | null,
): NewContentRevision {
  return {
    contentId: row.id,
    revisionNumber,
    contentVersion: row.version,
    contentType: row.contentType,
    title: row.title,
    slug: row.slug,
    categoryId: row.categoryId,
    content: row.content,
    contentJson: row.contentJson as object | null,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    excerpt: row.excerpt,
    coverImage: row.coverImage,
    status: row.status,
    publishedAt: row.publishedAt,
    publishAt: row.publishAt,
    unpublishAt: row.unpublishAt,
    homepage: row.homepage,
    visibility: row.visibility as object,
    enableComments: row.enableComments,
    autoPublishComments: row.autoPublishComments,
    allowAnonymousComments: row.allowAnonymousComments,
    authorId: row.authorId,
    updatedBy: row.updatedBy,
    createdBy: actorId,
    changeType,
    changeNote: changeNote ?? null,
  };
}

async function nextRevisionNumber(
  client: RevisionClient,
  contentId: string,
): Promise<number> {
  const rows = await client
    .select({
      revisionNumber: sql<number>`COALESCE(MAX(${contentRevisions.revisionNumber}), 0) + 1`,
    })
    .from(contentRevisions)
    .where(eq(contentRevisions.contentId, contentId));

  return rows[0]?.revisionNumber ?? 1;
}

async function shouldCreateContentRevision(): Promise<boolean> {
  const settings = await getGlobalSettings();
  return settings.contentHistory.enabled;
}

export async function createContentRevisionSnapshotForRow(
  client: RevisionClient,
  row: ContentRow,
  actorId: string,
  changeType: ContentRevisionChangeType,
  changeNote?: string | null,
): Promise<ContentRevisionRow | null> {
  if (!(await shouldCreateContentRevision())) return null;

  const revisionNumber = await nextRevisionNumber(client, row.id);
  const rows = await client
    .insert(contentRevisions)
    .values(snapshotValues(row, actorId, changeType, revisionNumber, changeNote))
    .returning();
  return rows[0];
}

export async function createContentRevisionSnapshot(
  contentId: string,
  actorId: string,
  changeType: ContentRevisionChangeType,
  changeNote?: string | null,
): Promise<ContentRevisionRow | null> {
  return db.transaction(async (tx) => {
    await lockContentRow(tx, contentId);
    const rows = await tx
      .select()
      .from(content)
      .where(eq(content.id, contentId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;

    return createContentRevisionSnapshotForRow(
      tx,
      row,
      actorId,
      changeType,
      changeNote,
    );
  });
}

export async function clearOtherHomepageRowsWithSnapshots(
  client: RevisionClient,
  actorId: string,
  excludeContentId?: string,
  changeType: ContentRevisionChangeType = "saved",
  changeNote?: string | null,
): Promise<ContentRow[]> {
  const conditions: SQL[] = [eq(content.homepage, true)];
  if (excludeContentId) conditions.push(ne(content.id, excludeContentId));

  const rows = await client
    .select()
    .from(content)
    .where(conditions.length === 1 ? conditions[0] : and(...conditions));

  for (const row of rows) {
    await lockContentRow(client, row.id);
    await createContentRevisionSnapshotForRow(
      client,
      row,
      actorId,
      changeType,
      changeNote,
    );
    await client
      .update(content)
      .set({
        homepage: false,
        updatedBy: actorId,
        version: sql`${content.version} + 1`,
      })
      .where(eq(content.id, row.id));
  }

  return rows;
}

export async function updateContentWithRevision(input: {
  id: string;
  actorId: string;
  values: Partial<typeof content.$inferInsert>;
  changeType: ContentRevisionChangeType;
  changeNote?: string | null;
  expectedVersion?: number;
  skipIfUnchanged?: boolean;
  beforeUpdate?: (
    tx: RevisionClient,
    current: ContentRow,
  ) => Promise<void> | void;
}): Promise<UpdateContentWithRevisionResult> {
  return db.transaction(async (tx) => {
    await lockContentRow(tx, input.id);
    const currentRows = await tx
      .select()
      .from(content)
      .where(eq(content.id, input.id))
      .limit(1);
    const current = currentRows[0];
    if (!current) return { ok: false, reason: "not_found" };
    if (
      typeof input.expectedVersion === "number" &&
      current.version !== input.expectedVersion
    ) {
      return {
        ok: false,
        reason: "stale",
        currentVersion: current.version,
      };
    }

    if (
      input.skipIfUnchanged &&
      !hasMeaningfulContentChanges(current, input.values)
    ) {
      return { ok: true, row: current, revision: null, changed: false };
    }

    await input.beforeUpdate?.(tx, current);
    const revision = await createContentRevisionSnapshotForRow(
      tx,
      current,
      input.actorId,
      input.changeType,
      input.changeNote,
    );
    const updatedRows = await tx
      .update(content)
      .set({ ...input.values, version: sql`${content.version} + 1` })
      .where(eq(content.id, input.id))
      .returning();
    const row = updatedRows[0];
    if (!row) return { ok: false, reason: "not_found" };

    return { ok: true, row, revision, changed: true };
  });
}

export async function deleteContentWithRevision(input: {
  row: ContentRow;
  actorId: string;
  changeNote?: string | null;
}): Promise<void> {
  await db.transaction(async (tx) => {
    await lockContentRow(tx, input.row.id);
    const currentRows = await tx
      .select()
      .from(content)
      .where(eq(content.id, input.row.id))
      .limit(1);
    const current = currentRows[0];
    if (!current) return;

    await createContentRevisionSnapshotForRow(
      tx,
      current,
      input.actorId,
      "deleted_snapshot",
      input.changeNote,
    );
    await tx.delete(content).where(eq(content.id, current.id));
  });
}

export async function listContentRevisions(
  contentId: string,
  params: ListContentRevisionsParams = {},
): Promise<{ rows: ContentRevisionRow[]; total: number }> {
  const page = Math.max(params.page ?? 1, 1);
  const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);
  const offset = (page - 1) * pageSize;
  const conditions: SQL[] = [eq(contentRevisions.contentId, contentId)];
  if (params.changeTypes && params.changeTypes.length > 0) {
    conditions.push(inArray(contentRevisions.changeType, params.changeTypes));
  }
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(contentRevisions)
      .where(where)
      .orderBy(
        desc(contentRevisions.createdAt),
        desc(contentRevisions.revisionNumber),
      )
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: count() })
      .from(contentRevisions)
      .where(where),
  ]);

  return { rows, total: totalRows[0]?.total ?? 0 };
}

export async function getContentRevision(
  contentId: string,
  revisionId: number,
): Promise<ContentRevisionRow | undefined> {
  const rows = await db
    .select()
    .from(contentRevisions)
    .where(
      and(
        eq(contentRevisions.contentId, contentId),
        eq(contentRevisions.id, revisionId),
      ),
    )
    .limit(1);
  return rows[0];
}

export async function getContentRevisionNavigation(
  contentId: string,
  revisionNumber: number,
): Promise<{
  previous: ContentRevisionNavigationItem | null;
  next: ContentRevisionNavigationItem | null;
}> {
  const [previousRows, nextRows] = await Promise.all([
    db
      .select({
        id: contentRevisions.id,
        revisionNumber: contentRevisions.revisionNumber,
      })
      .from(contentRevisions)
      .where(
        and(
          eq(contentRevisions.contentId, contentId),
          lt(contentRevisions.revisionNumber, revisionNumber),
        ),
      )
      .orderBy(desc(contentRevisions.revisionNumber))
      .limit(1),
    db
      .select({
        id: contentRevisions.id,
        revisionNumber: contentRevisions.revisionNumber,
      })
      .from(contentRevisions)
      .where(
        and(
          eq(contentRevisions.contentId, contentId),
          gt(contentRevisions.revisionNumber, revisionNumber),
        ),
      )
      .orderBy(asc(contentRevisions.revisionNumber))
      .limit(1),
  ]);

  return {
    previous: previousRows[0] ?? null,
    next: nextRows[0] ?? null,
  };
}

export async function restoreContentRevision(input: {
  contentId: string;
  revisionId: number;
  actorId: string;
  status: ContentStatus;
  publishAt: Date | null;
  unpublishAt: Date | null;
  homepage: boolean;
  expectedVersion?: number;
  changeNote?: string | null;
}): Promise<RestoreContentRevisionResult> {
  return db.transaction(async (tx) => {
    await lockContentRow(tx, input.contentId);

    const currentRows = await tx
      .select()
      .from(content)
      .where(eq(content.id, input.contentId))
      .limit(1);
    const current = currentRows[0];
    if (!current) return { ok: false, reason: "not_found" };
    if (
      typeof input.expectedVersion === "number" &&
      current.version !== input.expectedVersion
    ) {
      return {
        ok: false,
        reason: "stale",
        currentVersion: current.version,
      };
    }

    const revisionRows = await tx
      .select()
      .from(contentRevisions)
      .where(
        and(
          eq(contentRevisions.contentId, input.contentId),
          eq(contentRevisions.id, input.revisionId),
        ),
      )
      .limit(1);
    const revision = revisionRows[0];
    if (!revision) return { ok: false, reason: "revision_not_found" };
    if (revision.contentType !== current.contentType) {
      return { ok: false, reason: "revision_not_found" };
    }

    const slugConflicts = await tx
      .select({ id: content.id })
      .from(content)
      .where(
        and(
          eq(content.slug, revision.slug),
          ne(content.id, input.contentId),
        ),
      )
      .limit(1);
    if (slugConflicts.length > 0) {
      return { ok: false, reason: "slug_conflict" };
    }

    if (
      input.homepage &&
      (current.contentType !== "page" ||
        !isContentLive({
          status: input.status,
          publishAt: input.publishAt,
          unpublishAt: input.unpublishAt,
        }))
    ) {
      return { ok: false, reason: "homepage_not_live" };
    }

    await createContentRevisionSnapshotForRow(
      tx,
      current,
      input.actorId,
      "restored",
      input.changeNote,
    );

    if (input.homepage) {
      await clearOtherHomepageRowsWithSnapshots(
        tx,
        input.actorId,
        input.contentId,
        "restored",
        "Cleared homepage before restoring revision.",
      );
    }

    const publishedAt =
      input.status === "published"
        ? (revision.publishedAt ?? current.publishedAt ?? new Date())
        : current.publishedAt;

    const updatedRows = await tx
      .update(content)
      .set({
        categoryId: revision.categoryId ?? current.categoryId,
        title: revision.title,
        slug: revision.slug,
        content: revision.content,
        contentJson: revision.contentJson as object | null,
        metaTitle: revision.metaTitle,
        metaDescription: revision.metaDescription,
        excerpt: revision.excerpt,
        coverImage: revision.coverImage,
        status: input.status,
        publishedAt,
        publishAt: input.publishAt,
        unpublishAt: input.unpublishAt,
        homepage: input.homepage,
        visibility: revision.visibility as object,
        enableComments:
          current.contentType === "blog_post" ? revision.enableComments : false,
        autoPublishComments:
          current.contentType === "blog_post"
            ? revision.autoPublishComments
            : false,
        allowAnonymousComments:
          current.contentType === "blog_post"
            ? revision.allowAnonymousComments
            : false,
        updatedBy: input.actorId,
        version: sql`${content.version} + 1`,
      })
      .where(eq(content.id, input.contentId))
      .returning();
    const row = updatedRows[0];
    if (!row) return { ok: false, reason: "not_found" };

    return { ok: true, row, previous: current, revision };
  });
}
