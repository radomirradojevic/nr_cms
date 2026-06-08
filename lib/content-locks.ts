// Content edit lock — shared constants, types, and authorization helpers.
// See .github/instructions/cms-content-edit-locking.instructions.md

import type { ContentRow } from "@/data/content";
import {
  canAuthorEditOwnContentStatus,
  isAuthorOnlyContentWorkflowRole,
  type ContentStatus,
} from "@/lib/content-status";
import { hasRole, type Role } from "@/lib/roles";

/** Server-enforced lease length. Clients receive this from /status. */
export const LEASE_TTL_SECONDS = 90;
/** Recommended client heartbeat interval. MUST be < LEASE_TTL / 2. */
export const HEARTBEAT_INTERVAL_SECONDS = 30;
/** Grace window shown to a kicked-out previous editor before forced read-only. */
export const TAKEOVER_GRACE_SECONDS = 5;

export type LockHolder = {
  userId: string;
  userDisplayName: string;
  userRole: Role | "viewer";
  sessionId: string;
  clientId: string;
  acquiredAt: string;
  lastHeartbeatAt: string;
  leaseExpiresAt: string;
};

export type LockStatus =
  | { state: "free"; serverNow: string }
  | { state: "held"; serverNow: string; holder: LockHolder };

export type LockEvent =
  | { type: "acquired" | "refreshed"; holder: LockHolder }
  | { type: "released" | "expired" }
  | { type: "force_taken"; holder: LockHolder; previousUserId: string };

export type LockEventName = LockEvent["type"];

export type LockAuditEvent =
  | "acquired"
  | "refreshed"
  | "released"
  | "expired"
  | "force_taken"
  | "save_rejected_stale";

export function highestRole(roles: Role[]): Role | "viewer" {
  if (hasRole(roles, "admin")) return "admin";
  if (hasRole(roles, "publisher")) return "publisher";
  if (hasRole(roles, "author")) return "author";
  return "viewer";
}

/**
 * Mirrors `canEdit()` in app/dashboard/content/actions.ts. Returns whether a
 * given actor (with already-loaded roles) is permitted to edit a piece of
 * content. The publisher → author cross-role check is intentionally not
 * performed here — it requires a Clerk lookup of the target author. Pass
 * `targetAuthorRoles` if you already loaded them; otherwise this returns the
 * conservative answer (false) for the publisher-vs-other-author case.
 */
export function canEditContent(
  actor: { userId: string; roles: Role[] },
  target: Pick<ContentRow, "authorId" | "status" | "contentType">,
  targetAuthorRoles?: Role[],
): boolean {
  if (hasRole(actor.roles, "admin")) return true;
  if (target.contentType === "webshop") return false;
  if (target.authorId === actor.userId) {
    if (!isAuthorOnlyContentWorkflowRole(actor.roles)) return true;
    return canAuthorEditOwnContentStatus(
      actor.roles,
      target.status as ContentStatus,
    );
  }
  if (hasRole(actor.roles, "publisher")) {
    if (!targetAuthorRoles) return false;
    return highestRole(targetAuthorRoles) === "author";
  }
  return false;
}

export const LOCK_CHANNEL = (contentId: string) =>
  `content-lock:${contentId}` as const;
