// Form Builder edit locks.
// Reuses content-lock timing and holder types so all edit-lock UX stays aligned.

export {
  HEARTBEAT_INTERVAL_SECONDS,
  LEASE_TTL_SECONDS,
  TAKEOVER_GRACE_SECONDS,
  highestRole,
  type LockHolder as FormLockHolder,
  type LockStatus as FormLockStatus,
  type LockEvent as FormLockEvent,
  type LockEventName as FormLockEventName,
} from "@/lib/content-locks";

export type FormLockAuditEvent =
  | "acquired"
  | "refreshed"
  | "released"
  | "expired"
  | "save_rejected_stale";

export const FORM_LOCK_CHANNEL = (formId: string) =>
  `form-lock:${formId}` as const;
