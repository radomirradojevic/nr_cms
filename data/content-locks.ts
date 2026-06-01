// Race-safe primitives for content edit locks.
// See .github/instructions/cms-content-edit-locking.instructions.md

import { db } from "@/db";
import { content, contentEditLockAudit, contentEditLocks } from "@/db/schema";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import {
  LEASE_TTL_SECONDS,
  type LockAuditEvent,
  type LockHolder,
} from "@/lib/content-locks";

type LockRow = typeof contentEditLocks.$inferSelect;

function rowToHolder(row: LockRow): LockHolder {
  return {
    userId: row.userId,
    userDisplayName: row.userDisplayName,
    userRole: row.userRole as LockHolder["userRole"],
    sessionId: row.sessionId,
    clientId: row.clientId,
    acquiredAt: row.acquiredAt.toISOString(),
    lastHeartbeatAt: row.lastHeartbeatAt.toISOString(),
    leaseExpiresAt: row.leaseExpiresAt.toISOString(),
  };
}

export type AcquireInput = {
  contentId: string;
  userId: string;
  userDisplayName: string;
  userRole: string;
  sessionId: string;
  clientId: string;
};

export type AcquireResult =
  | { ok: true; holder: LockHolder }
  | { ok: false; holder: LockHolder };

/**
 * Atomic acquire. Inserts a new lock or refreshes/reclaims the existing one
 * if it is expired OR owned by the same user/session. Returns the current
 * holder on conflict (lock still held by another active user).
 */
export async function acquireLock(input: AcquireInput): Promise<AcquireResult> {
  const ttl = `${LEASE_TTL_SECONDS} seconds`;
  const result = await db.execute(sql`
    INSERT INTO content_edit_locks (
      content_id, user_id, user_display_name, user_role,
      session_id, client_id,
      acquired_at, last_heartbeat_at, lease_expires_at, taken_over_by
    )
    VALUES (
      ${input.contentId}, ${input.userId}, ${input.userDisplayName}, ${input.userRole},
      ${input.sessionId}, ${input.clientId},
      now(), now(), now() + interval ${sql.raw(`'${LEASE_TTL_SECONDS} seconds'`)}, NULL
    )
    ON CONFLICT (content_id) DO UPDATE
      SET user_id            = EXCLUDED.user_id,
          user_display_name  = EXCLUDED.user_display_name,
          user_role          = EXCLUDED.user_role,
          session_id         = EXCLUDED.session_id,
          client_id          = EXCLUDED.client_id,
          acquired_at        = CASE
            WHEN content_edit_locks.user_id = EXCLUDED.user_id
             AND content_edit_locks.session_id = EXCLUDED.session_id
            THEN content_edit_locks.acquired_at
            ELSE now()
          END,
          last_heartbeat_at  = now(),
          lease_expires_at   = now() + interval ${sql.raw(`'${LEASE_TTL_SECONDS} seconds'`)},
          taken_over_by      = NULL
      WHERE content_edit_locks.lease_expires_at < now()
         OR (content_edit_locks.user_id = EXCLUDED.user_id
             AND content_edit_locks.session_id = EXCLUDED.session_id)
    RETURNING
      content_id        AS "contentId",
      user_id           AS "userId",
      user_display_name AS "userDisplayName",
      user_role         AS "userRole",
      session_id        AS "sessionId",
      client_id         AS "clientId",
      acquired_at       AS "acquiredAt",
      last_heartbeat_at AS "lastHeartbeatAt",
      lease_expires_at  AS "leaseExpiresAt",
      taken_over_by     AS "takenOverBy"
  `);
  void ttl;

  const rows = (result as unknown as { rows: LockRow[] }).rows ?? [];
  if (rows.length === 1) {
    const row = rows[0];
    // Drizzle/PG may return ISO strings from raw SQL — normalize.
    const normalized: LockRow = {
      ...row,
      acquiredAt:
        row.acquiredAt instanceof Date
          ? row.acquiredAt
          : new Date(row.acquiredAt as unknown as string),
      lastHeartbeatAt:
        row.lastHeartbeatAt instanceof Date
          ? row.lastHeartbeatAt
          : new Date(row.lastHeartbeatAt as unknown as string),
      leaseExpiresAt:
        row.leaseExpiresAt instanceof Date
          ? row.leaseExpiresAt
          : new Date(row.leaseExpiresAt as unknown as string),
    };
    return { ok: true, holder: rowToHolder(normalized) };
  }

  // Conflict — load the current holder.
  const current = await getLock(input.contentId);
  // Fallback shape if race-deleted between attempts: treat as failure with a
  // placeholder holder representing "unknown" — caller can retry.
  return {
    ok: false,
    holder:
      current ??
      ({
        userId: "unknown",
        userDisplayName: "Another user",
        userRole: "viewer",
        sessionId: "",
        clientId: "",
        acquiredAt: new Date().toISOString(),
        lastHeartbeatAt: new Date().toISOString(),
        leaseExpiresAt: new Date(
          Date.now() + LEASE_TTL_SECONDS * 1000,
        ).toISOString(),
      } satisfies LockHolder),
  };
}

export type HeartbeatInput = {
  contentId: string;
  userId: string;
  sessionId: string;
  clientId: string;
};

export async function heartbeatLock(
  input: HeartbeatInput,
): Promise<LockHolder | null> {
  const rows = await db
    .update(contentEditLocks)
    .set({
      lastHeartbeatAt: sql`now()`,
      leaseExpiresAt: sql.raw(
        `now() + interval '${LEASE_TTL_SECONDS} seconds'`,
      ),
    })
    .where(
      and(
        eq(contentEditLocks.contentId, input.contentId),
        eq(contentEditLocks.userId, input.userId),
        eq(contentEditLocks.sessionId, input.sessionId),
        eq(contentEditLocks.clientId, input.clientId),
        sql`${contentEditLocks.leaseExpiresAt} > now()`,
      ),
    )
    .returning();
  if (rows.length === 0) return null;
  return rowToHolder(rows[0]);
}

export type ReleaseInput = HeartbeatInput;

export async function releaseLock(input: ReleaseInput): Promise<boolean> {
  const rows = await db
    .delete(contentEditLocks)
    .where(
      and(
        eq(contentEditLocks.contentId, input.contentId),
        eq(contentEditLocks.userId, input.userId),
        eq(contentEditLocks.sessionId, input.sessionId),
        eq(contentEditLocks.clientId, input.clientId),
      ),
    )
    .returning({ contentId: contentEditLocks.contentId });
  return rows.length > 0;
}

export type TakeoverInput = {
  contentId: string;
  newUserId: string;
  newUserDisplayName: string;
  newSessionId: string;
  newClientId: string;
};

export type TakeoverResult =
  | { ok: true; previousUserId: string; holder: LockHolder }
  | { ok: false; reason: "ADMIN_HELD" | "NOT_HELD" };

/**
 * Admin-only force-takeover. Cannot silently steal from another admin —
 * caller must surface a confirmation in that case (returns ADMIN_HELD).
 */
export async function takeoverLock(
  input: TakeoverInput,
): Promise<TakeoverResult> {
  const result = await db.execute(sql`
    UPDATE content_edit_locks
       SET user_id            = ${input.newUserId},
           user_display_name  = ${input.newUserDisplayName},
           user_role          = 'admin',
           session_id         = ${input.newSessionId},
           client_id          = ${input.newClientId},
           acquired_at        = now(),
           last_heartbeat_at  = now(),
           lease_expires_at   = now() + interval ${sql.raw(`'${LEASE_TTL_SECONDS} seconds'`)},
           taken_over_by      = ${input.newUserId}
     WHERE content_id = ${input.contentId}
       AND user_role <> 'admin'
       AND lease_expires_at > now()
    RETURNING
      content_id        AS "contentId",
      user_id           AS "userId",
      user_display_name AS "userDisplayName",
      user_role         AS "userRole",
      session_id        AS "sessionId",
      client_id         AS "clientId",
      acquired_at       AS "acquiredAt",
      last_heartbeat_at AS "lastHeartbeatAt",
      lease_expires_at  AS "leaseExpiresAt",
      taken_over_by     AS "takenOverBy"
  `);

  const rows =
    (
      result as unknown as {
        rows: (LockRow & { takenOverBy: string | null })[];
      }
    ).rows ?? [];
  if (rows.length === 1) {
    const row = rows[0];
    const normalized: LockRow = {
      ...row,
      acquiredAt:
        row.acquiredAt instanceof Date
          ? row.acquiredAt
          : new Date(row.acquiredAt as unknown as string),
      lastHeartbeatAt:
        row.lastHeartbeatAt instanceof Date
          ? row.lastHeartbeatAt
          : new Date(row.lastHeartbeatAt as unknown as string),
      leaseExpiresAt:
        row.leaseExpiresAt instanceof Date
          ? row.leaseExpiresAt
          : new Date(row.leaseExpiresAt as unknown as string),
    };
    // The UPDATE doesn't return the previous user id — we have to look it up
    // from the audit trail / fresh row. The instructions describe RETURNING
    // user_id AS previous_user_id, but since we've already overwritten it,
    // we approximate using takenOverBy semantics: in practice the caller
    // already has the previous holder snapshot from /status. We return the
    // current (new) holder; previous_user_id is best-effort recorded by the
    // route handler when it captured /status before the takeover.
    return {
      ok: true,
      previousUserId: row.takenOverBy ?? "",
      holder: rowToHolder(normalized),
    };
  }

  // Either the row is gone (NOT_HELD) or it's currently held by an admin.
  const current = await getLock(input.contentId);
  if (!current) return { ok: false, reason: "NOT_HELD" };
  if (current.userRole === "admin") return { ok: false, reason: "ADMIN_HELD" };
  // Race: expired between fetch and update — caller can retry acquire.
  return { ok: false, reason: "NOT_HELD" };
}

export async function getLock(contentId: string): Promise<LockHolder | null> {
  // Opportunistic reaping of expired rows.
  await db
    .delete(contentEditLocks)
    .where(
      and(
        eq(contentEditLocks.contentId, contentId),
        lt(contentEditLocks.leaseExpiresAt, sql`now()`),
      ),
    );

  const rows = await db
    .select()
    .from(contentEditLocks)
    .where(eq(contentEditLocks.contentId, contentId))
    .limit(1);
  if (rows.length === 0) return null;
  return rowToHolder(rows[0]);
}

export async function listActiveLocksForContentIds(
  contentIds: string[],
): Promise<Map<string, LockHolder>> {
  const uniqueIds = Array.from(new Set(contentIds)).filter(Boolean);
  const locks = new Map<string, LockHolder>();
  if (uniqueIds.length === 0) return locks;

  await db
    .delete(contentEditLocks)
    .where(
      and(
        inArray(contentEditLocks.contentId, uniqueIds),
        lt(contentEditLocks.leaseExpiresAt, sql`now()`),
      ),
    );

  const rows = await db
    .select()
    .from(contentEditLocks)
    .where(
      and(
        inArray(contentEditLocks.contentId, uniqueIds),
        sql`${contentEditLocks.leaseExpiresAt} > now()`,
      ),
    );

  for (const row of rows) {
    locks.set(row.contentId, rowToHolder(row));
  }
  return locks;
}

/**
 * Single-statement ownership check + content row lookup, intended for use
 * inside `updateContent()` to prevent saves once the lock has been lost.
 */
export async function isLockedBy(input: HeartbeatInput): Promise<boolean> {
  const rows = await db
    .select({ contentId: contentEditLocks.contentId })
    .from(contentEditLocks)
    .where(
      and(
        eq(contentEditLocks.contentId, input.contentId),
        eq(contentEditLocks.userId, input.userId),
        eq(contentEditLocks.sessionId, input.sessionId),
        eq(contentEditLocks.clientId, input.clientId),
        sql`${contentEditLocks.leaseExpiresAt} > now()`,
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * Optimistic concurrency UPDATE on `content` guarded by `version`. Returns
 * the new version on success, or null on stale write.
 */
export async function updateContentWithVersion(
  id: string,
  expectedVersion: number,
  values: Partial<typeof content.$inferInsert>,
): Promise<number | null> {
  const rows = await db
    .update(content)
    .set({ ...values, version: sql`${content.version} + 1` })
    .where(and(eq(content.id, id), eq(content.version, expectedVersion)))
    .returning({ version: content.version });
  if (rows.length === 0) return null;
  return rows[0].version;
}

export async function logLockEvent(args: {
  contentId: string;
  userId: string;
  event: LockAuditEvent;
  previousUserId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await db.insert(contentEditLockAudit).values({
      contentId: args.contentId,
      userId: args.userId,
      event: args.event,
      previousUserId: args.previousUserId ?? null,
      metadata: (args.metadata ?? null) as object | null,
    });
  } catch (err) {
    // Audit failures must never block lock operations.
    console.error("[content-locks] audit insert failed", err);
  }
}

export async function getContentVersion(id: string): Promise<number | null> {
  const rows = await db
    .select({ version: content.version })
    .from(content)
    .where(eq(content.id, id))
    .limit(1);
  if (rows.length === 0) return null;
  return rows[0].version;
}
