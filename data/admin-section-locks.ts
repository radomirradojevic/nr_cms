// Race-safe primitives for admin section edit locks.
// Mirrors data/content-locks.ts. See:
//   .github/instructions/cms-content-edit-locking.instructions.md

import { and, eq, inArray, lt, sql } from "drizzle-orm";

import { db } from "@/db";
import { adminSectionLockAudit, adminSectionLocks } from "@/db/schema";
import {
  LEASE_TTL_SECONDS,
  type AdminSectionLockAuditEvent,
  type AdminSectionLockHolder,
} from "@/lib/admin-section-locks";

type LockRow = typeof adminSectionLocks.$inferSelect;

function rowToHolder(row: LockRow): AdminSectionLockHolder {
  return {
    userId: row.userId,
    userDisplayName: row.userDisplayName,
    userRole: row.userRole as AdminSectionLockHolder["userRole"],
    sessionId: row.sessionId,
    clientId: row.clientId,
    acquiredAt: row.acquiredAt.toISOString(),
    lastHeartbeatAt: row.lastHeartbeatAt.toISOString(),
    leaseExpiresAt: row.leaseExpiresAt.toISOString(),
  };
}

function normalizeRow(row: LockRow): LockRow {
  return {
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
}

export type AcquireInput = {
  sectionKey: string;
  userId: string;
  userDisplayName: string;
  userRole: string;
  sessionId: string;
  clientId: string;
};

export type AcquireResult =
  | { ok: true; holder: AdminSectionLockHolder }
  | { ok: false; holder: AdminSectionLockHolder };

export async function acquireLock(input: AcquireInput): Promise<AcquireResult> {
  const result = await db.execute(sql`
    INSERT INTO admin_section_locks (
      section_key, user_id, user_display_name, user_role,
      session_id, client_id,
      acquired_at, last_heartbeat_at, lease_expires_at, taken_over_by
    )
    VALUES (
      ${input.sectionKey}, ${input.userId}, ${input.userDisplayName}, ${input.userRole},
      ${input.sessionId}, ${input.clientId},
      now(), now(), now() + interval ${sql.raw(`'${LEASE_TTL_SECONDS} seconds'`)}, NULL
    )
    ON CONFLICT (section_key) DO UPDATE
      SET user_id            = EXCLUDED.user_id,
          user_display_name  = EXCLUDED.user_display_name,
          user_role          = EXCLUDED.user_role,
          session_id         = EXCLUDED.session_id,
          client_id          = EXCLUDED.client_id,
          acquired_at        = CASE
            WHEN admin_section_locks.user_id = EXCLUDED.user_id
             AND admin_section_locks.session_id = EXCLUDED.session_id
            THEN admin_section_locks.acquired_at
            ELSE now()
          END,
          last_heartbeat_at  = now(),
          lease_expires_at   = now() + interval ${sql.raw(`'${LEASE_TTL_SECONDS} seconds'`)},
          taken_over_by      = NULL
      WHERE admin_section_locks.lease_expires_at < now()
         OR (admin_section_locks.user_id = EXCLUDED.user_id
             AND admin_section_locks.session_id = EXCLUDED.session_id)
    RETURNING
      section_key       AS "sectionKey",
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

  const rows = (result as unknown as { rows: LockRow[] }).rows ?? [];
  if (rows.length === 1) {
    return { ok: true, holder: rowToHolder(normalizeRow(rows[0])) };
  }

  const current = await getLock(input.sectionKey);
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
      } satisfies AdminSectionLockHolder),
  };
}

export type HeartbeatInput = {
  sectionKey: string;
  userId: string;
  sessionId: string;
  clientId: string;
};

export async function heartbeatLock(
  input: HeartbeatInput,
): Promise<AdminSectionLockHolder | null> {
  const rows = await db
    .update(adminSectionLocks)
    .set({
      lastHeartbeatAt: sql`now()`,
      leaseExpiresAt: sql.raw(
        `now() + interval '${LEASE_TTL_SECONDS} seconds'`,
      ),
    })
    .where(
      and(
        eq(adminSectionLocks.sectionKey, input.sectionKey),
        eq(adminSectionLocks.userId, input.userId),
        eq(adminSectionLocks.sessionId, input.sessionId),
        eq(adminSectionLocks.clientId, input.clientId),
        sql`${adminSectionLocks.leaseExpiresAt} > now()`,
      ),
    )
    .returning();
  if (rows.length === 0) return null;
  return rowToHolder(rows[0]);
}

export type ReleaseInput = HeartbeatInput;

export async function releaseLock(input: ReleaseInput): Promise<boolean> {
  const rows = await db
    .delete(adminSectionLocks)
    .where(
      and(
        eq(adminSectionLocks.sectionKey, input.sectionKey),
        eq(adminSectionLocks.userId, input.userId),
        eq(adminSectionLocks.sessionId, input.sessionId),
        eq(adminSectionLocks.clientId, input.clientId),
      ),
    )
    .returning({ sectionKey: adminSectionLocks.sectionKey });
  return rows.length > 0;
}

export type TakeoverInput = {
  sectionKey: string;
  newUserId: string;
  newUserDisplayName: string;
  newSessionId: string;
  newClientId: string;
};

export type TakeoverResult =
  | {
      ok: true;
      previousUserId: string;
      holder: AdminSectionLockHolder;
    }
  | { ok: false; reason: "ADMIN_HELD" | "NOT_HELD" };

/**
 * Admin-only force-takeover. Cannot silently steal from another admin —
 * caller must surface a confirmation in that case (returns ADMIN_HELD).
 *
 * Because admin sections are admin-only by definition, in practice this
 * almost always returns ADMIN_HELD when another user holds the lock. The
 * UI MUST therefore display a "contact the other admin" message rather
 * than a force-takeover button. The endpoint still exists for completeness
 * and to handle the edge case where the holder's role has been demoted.
 */
export async function takeoverLock(
  input: TakeoverInput,
): Promise<TakeoverResult> {
  const result = await db.execute(sql`
    UPDATE admin_section_locks
       SET user_id            = ${input.newUserId},
           user_display_name  = ${input.newUserDisplayName},
           user_role          = 'admin',
           session_id         = ${input.newSessionId},
           client_id          = ${input.newClientId},
           acquired_at        = now(),
           last_heartbeat_at  = now(),
           lease_expires_at   = now() + interval ${sql.raw(`'${LEASE_TTL_SECONDS} seconds'`)},
           taken_over_by      = ${input.newUserId}
     WHERE section_key = ${input.sectionKey}
       AND user_role <> 'admin'
       AND lease_expires_at > now()
    RETURNING
      section_key       AS "sectionKey",
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
    const row = normalizeRow(rows[0]);
    return {
      ok: true,
      previousUserId: row.takenOverBy ?? "",
      holder: rowToHolder(row),
    };
  }

  const current = await getLock(input.sectionKey);
  if (!current) return { ok: false, reason: "NOT_HELD" };
  if (current.userRole === "admin") return { ok: false, reason: "ADMIN_HELD" };
  return { ok: false, reason: "NOT_HELD" };
}

export async function getLock(
  sectionKey: string,
): Promise<AdminSectionLockHolder | null> {
  await db
    .delete(adminSectionLocks)
    .where(
      and(
        eq(adminSectionLocks.sectionKey, sectionKey),
        lt(adminSectionLocks.leaseExpiresAt, sql`now()`),
      ),
    );

  const rows = await db
    .select()
    .from(adminSectionLocks)
    .where(eq(adminSectionLocks.sectionKey, sectionKey))
    .limit(1);
  if (rows.length === 0) return null;
  return rowToHolder(rows[0]);
}

export async function getLocks(
  sectionKeys: string[],
): Promise<AdminSectionLockHolder[]> {
  if (sectionKeys.length === 0) return [];

  await db
    .delete(adminSectionLocks)
    .where(
      and(
        inArray(adminSectionLocks.sectionKey, sectionKeys),
        lt(adminSectionLocks.leaseExpiresAt, sql`now()`),
      ),
    );

  const rows = await db
    .select()
    .from(adminSectionLocks)
    .where(inArray(adminSectionLocks.sectionKey, sectionKeys));

  return rows.map(rowToHolder);
}

/**
 * Single-statement ownership check intended for use inside admin section
 * server actions to prevent saves once the lock has been lost or stolen.
 */
export async function isLockedBy(input: HeartbeatInput): Promise<boolean> {
  const rows = await db
    .select({ sectionKey: adminSectionLocks.sectionKey })
    .from(adminSectionLocks)
    .where(
      and(
        eq(adminSectionLocks.sectionKey, input.sectionKey),
        eq(adminSectionLocks.userId, input.userId),
        eq(adminSectionLocks.sessionId, input.sessionId),
        eq(adminSectionLocks.clientId, input.clientId),
        sql`${adminSectionLocks.leaseExpiresAt} > now()`,
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function logLockEvent(args: {
  sectionKey: string;
  userId: string;
  event: AdminSectionLockAuditEvent;
  previousUserId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await db.insert(adminSectionLockAudit).values({
      sectionKey: args.sectionKey,
      userId: args.userId,
      event: args.event,
      previousUserId: args.previousUserId ?? null,
      metadata: (args.metadata ?? null) as object | null,
    });
  } catch (err) {
    // Audit failures must never block lock operations.
    console.error("[admin-section-locks] audit insert failed", err);
  }
}
