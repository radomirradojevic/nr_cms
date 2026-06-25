// Admin section edit lock — shared constants, types, and authorization helpers.
//
// Mirrors lib/content-locks.ts but for admin-only singleton sections
// (e.g. /dashboard/global-settings, /dashboard/menus) that are not tied
// to a single `content` row. The pattern (short-lived leases + heartbeats +
// optimistic save check) is identical; only the resource identifier changes
// from a `content.id` UUID to a string `section_key`.
//
// See .github/instructions/cms-content-edit-locking.instructions.md

import { hasRole, type Role } from "@/lib/roles";

/** Server-enforced lease length. Clients receive this from /status. */
export const LEASE_TTL_SECONDS = 90;
/** Recommended client heartbeat interval. MUST be < LEASE_TTL / 2. */
export const HEARTBEAT_INTERVAL_SECONDS = 30;
/** Grace window shown to a kicked-out previous editor before forced read-only. */
export const TAKEOVER_GRACE_SECONDS = 5;

/**
 * Closed allowlist of admin sections that participate in the locking system.
 * Any value not in this list MUST be rejected at the API boundary.
 */
export const ADMIN_SECTION_KEYS = [
  "global-settings",
  "top-menu",
  "menus",
  "webshop-categories",
  "webshop-payments",
  "webshop-settings",
  "webshop-storefront",
] as const;
export type AdminSectionKey = (typeof ADMIN_SECTION_KEYS)[number];
export type DynamicAdminSectionKey =
  | `webshop-order:${string}`
  | `webshop-product:${string}`
  | `webshop-promotion:${string}`;
export type AdminSectionLockKey = AdminSectionKey | DynamicAdminSectionKey;

const UUID_PATTERN =
  "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const DYNAMIC_ADMIN_SECTION_KEY_PATTERN = new RegExp(
  `^webshop-(?:order|product|promotion):${UUID_PATTERN}$`,
  "i",
);

export function isAdminSectionKey(value: string): value is AdminSectionLockKey {
  return (
    (ADMIN_SECTION_KEYS as readonly string[]).includes(value) ||
    DYNAMIC_ADMIN_SECTION_KEY_PATTERN.test(value)
  );
}

export type AdminSectionLockHolder = {
  userId: string;
  userDisplayName: string;
  userRole: Role | "viewer";
  sessionId: string;
  clientId: string;
  acquiredAt: string;
  lastHeartbeatAt: string;
  leaseExpiresAt: string;
};

export type AdminSectionLockStatus =
  | { state: "free"; serverNow: string }
  | { state: "held"; serverNow: string; holder: AdminSectionLockHolder };

export type AdminSectionLockEvent =
  | { type: "acquired" | "refreshed"; holder: AdminSectionLockHolder }
  | { type: "released" | "expired" }
  | {
      type: "force_taken";
      holder: AdminSectionLockHolder;
      previousUserId: string;
    };

export type AdminSectionLockAuditEvent =
  | "acquired"
  | "refreshed"
  | "released"
  | "expired"
  | "force_taken"
  | "save_rejected_stale";

/**
 * Only admins may access admin sections — and therefore only admins may
 * acquire / refresh / release / takeover their locks. The route handlers
 * MUST call this; the UI may only mirror it.
 */
export function canAccessAdminSection(actor: { roles: Role[] }): boolean {
  return hasRole(actor.roles, "admin");
}

export const ADMIN_SECTION_LOCK_CHANNEL = (sectionKey: string) =>
  `admin-section-lock:${sectionKey}` as const;
