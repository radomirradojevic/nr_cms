// Race-safe primitives for Form Builder edit locks.

import { and, eq, lt, sql } from "drizzle-orm";

import { db } from "@/db";
import { formEditLockAudit, formEditLocks } from "@/db/schema";
import {
  LEASE_TTL_SECONDS,
  type FormLockAuditEvent,
  type FormLockHolder,
} from "@/lib/form-locks";

type LockRow = typeof formEditLocks.$inferSelect;

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

function rowToHolder(row: LockRow): FormLockHolder {
  return {
    userId: row.userId,
    userDisplayName: row.userDisplayName,
    userRole: row.userRole as FormLockHolder["userRole"],
    sessionId: row.sessionId,
    clientId: row.clientId,
    acquiredAt: row.acquiredAt.toISOString(),
    lastHeartbeatAt: row.lastHeartbeatAt.toISOString(),
    leaseExpiresAt: row.leaseExpiresAt.toISOString(),
  };
}

export type AcquireInput = {
  formId: string;
  userId: string;
  userDisplayName: string;
  userRole: string;
  sessionId: string;
  clientId: string;
};

export type AcquireResult =
  | { ok: true; holder: FormLockHolder }
  | { ok: false; holder: FormLockHolder };

export async function acquireLock(input: AcquireInput): Promise<AcquireResult> {
  const result = await db.execute(sql`
    INSERT INTO form_edit_locks (
      form_id, user_id, user_display_name, user_role,
      session_id, client_id, acquired_at, last_heartbeat_at, lease_expires_at
    )
    VALUES (
      ${input.formId}, ${input.userId}, ${input.userDisplayName}, ${input.userRole},
      ${input.sessionId}, ${input.clientId},
      now(), now(), now() + interval ${sql.raw(`'${LEASE_TTL_SECONDS} seconds'`)}
    )
    ON CONFLICT (form_id) DO UPDATE
      SET user_id            = EXCLUDED.user_id,
          user_display_name  = EXCLUDED.user_display_name,
          user_role          = EXCLUDED.user_role,
          session_id         = EXCLUDED.session_id,
          client_id          = EXCLUDED.client_id,
          acquired_at        = CASE
            WHEN form_edit_locks.user_id = EXCLUDED.user_id
             AND form_edit_locks.session_id = EXCLUDED.session_id
            THEN form_edit_locks.acquired_at
            ELSE now()
          END,
          last_heartbeat_at  = now(),
          lease_expires_at   = now() + interval ${sql.raw(`'${LEASE_TTL_SECONDS} seconds'`)}
      WHERE form_edit_locks.lease_expires_at < now()
         OR (form_edit_locks.user_id = EXCLUDED.user_id
             AND form_edit_locks.session_id = EXCLUDED.session_id)
    RETURNING
      form_id           AS "formId",
      user_id           AS "userId",
      user_display_name AS "userDisplayName",
      user_role         AS "userRole",
      session_id        AS "sessionId",
      client_id         AS "clientId",
      acquired_at       AS "acquiredAt",
      last_heartbeat_at AS "lastHeartbeatAt",
      lease_expires_at  AS "leaseExpiresAt"
  `);

  const rows = (result as unknown as { rows: LockRow[] }).rows ?? [];
  if (rows.length === 1) {
    return { ok: true, holder: rowToHolder(normalizeRow(rows[0])) };
  }

  const current = await getLock(input.formId);
  return {
    ok: false,
    holder:
      current ??
      ({
        userId: "unknown",
        userDisplayName: "Another admin",
        userRole: "admin",
        sessionId: "",
        clientId: "",
        acquiredAt: new Date().toISOString(),
        lastHeartbeatAt: new Date().toISOString(),
        leaseExpiresAt: new Date(
          Date.now() + LEASE_TTL_SECONDS * 1000,
        ).toISOString(),
      } satisfies FormLockHolder),
  };
}

export type HeartbeatInput = {
  formId: string;
  userId: string;
  sessionId: string;
  clientId: string;
};

export async function heartbeatLock(
  input: HeartbeatInput,
): Promise<FormLockHolder | null> {
  const rows = await db
    .update(formEditLocks)
    .set({
      lastHeartbeatAt: sql`now()`,
      leaseExpiresAt: sql.raw(
        `now() + interval '${LEASE_TTL_SECONDS} seconds'`,
      ),
    })
    .where(
      and(
        eq(formEditLocks.formId, input.formId),
        eq(formEditLocks.userId, input.userId),
        eq(formEditLocks.sessionId, input.sessionId),
        eq(formEditLocks.clientId, input.clientId),
        sql`${formEditLocks.leaseExpiresAt} > now()`,
      ),
    )
    .returning();
  if (rows.length === 0) return null;
  return rowToHolder(rows[0]);
}

export type ReleaseInput = HeartbeatInput;

export async function releaseLock(input: ReleaseInput): Promise<boolean> {
  const rows = await db
    .delete(formEditLocks)
    .where(
      and(
        eq(formEditLocks.formId, input.formId),
        eq(formEditLocks.userId, input.userId),
        eq(formEditLocks.sessionId, input.sessionId),
        eq(formEditLocks.clientId, input.clientId),
      ),
    )
    .returning({ formId: formEditLocks.formId });
  return rows.length > 0;
}

export async function getLock(formId: string): Promise<FormLockHolder | null> {
  await db
    .delete(formEditLocks)
    .where(
      and(
        eq(formEditLocks.formId, formId),
        lt(formEditLocks.leaseExpiresAt, sql`now()`),
      ),
    );

  const rows = await db
    .select()
    .from(formEditLocks)
    .where(eq(formEditLocks.formId, formId))
    .limit(1);
  if (rows.length === 0) return null;
  return rowToHolder(rows[0]);
}

export async function isLockedBy(input: HeartbeatInput): Promise<boolean> {
  const rows = await db
    .select({ formId: formEditLocks.formId })
    .from(formEditLocks)
    .where(
      and(
        eq(formEditLocks.formId, input.formId),
        eq(formEditLocks.userId, input.userId),
        eq(formEditLocks.sessionId, input.sessionId),
        eq(formEditLocks.clientId, input.clientId),
        sql`${formEditLocks.leaseExpiresAt} > now()`,
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function logLockEvent(args: {
  formId: string;
  userId: string;
  event: FormLockAuditEvent;
  previousUserId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await db.insert(formEditLockAudit).values({
      formId: args.formId,
      userId: args.userId,
      event: args.event,
      previousUserId: args.previousUserId ?? null,
      metadata: (args.metadata ?? null) as object | null,
    });
  } catch (err) {
    console.error("[form-locks] audit insert failed", err);
  }
}
