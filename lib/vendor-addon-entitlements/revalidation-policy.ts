import type { VerifiedVendorAddonEntitlement } from "./verified-entitlement";

export const REVALIDATION_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const OUTAGE_GRACE_MS = 14 * 24 * 60 * 60 * 1000;
export const PRIVILEGED_STALE_LIMIT_MS = 48 * 60 * 60 * 1000;

export type EntitlementRuntimeMode = "ready" | "degraded" | "expired" | "revoked";

export function resolveEntitlementRuntimeMode({
  entitlement,
  lastSuccessAt,
  now = new Date(),
}: {
  entitlement: VerifiedVendorAddonEntitlement;
  lastSuccessAt: Date | null;
  now?: Date;
}): EntitlementRuntimeMode {
  if (entitlement.status === "revoked" || entitlement.status === "canceled") return "revoked";
  if (entitlement.status !== "active" || (entitlement.validUntil && new Date(entitlement.validUntil) <= now)) return "expired";
  if (!lastSuccessAt || now.getTime() - lastSuccessAt.getTime() > OUTAGE_GRACE_MS) return "expired";
  if (now.getTime() - lastSuccessAt.getTime() > PRIVILEGED_STALE_LIMIT_MS) return "degraded";
  return "ready";
}

export function canPerformEntitlementOperation(mode: EntitlementRuntimeMode, operation: "existing_runtime" | "new_activation" | "catalog" | "issue" | "update") {
  if (operation === "existing_runtime") return mode === "ready" || mode === "degraded";
  return mode === "ready";
}
