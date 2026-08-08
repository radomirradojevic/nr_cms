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

/**
 * V2 snapshots keep business validity, revalidation cadence, outage grace and
 * JWS envelope expiry as separate facts.  Only a classified transport/5xx
 * failure may use this cached snapshot path.
 */
export function resolvePersistentV2EntitlementRuntimeMode(input: {
  activationStatus: "active" | "deactivated" | "transferred" | "revoked";
  envelopeExpiresAt: Date | null;
  graceEndsAt: Date | null;
  lastErrorCode: string | null;
  lastSuccessAt: Date | null;
  licenseStatus: "active" | "suspended" | "expired" | "revoked" | "canceled";
  licenseValidUntil: Date | null;
  now?: Date;
}): EntitlementRuntimeMode {
  const now = input.now ?? new Date();
  if (
    input.licenseStatus === "revoked" ||
    input.licenseStatus === "canceled" ||
    input.activationStatus === "deactivated" ||
    input.activationStatus === "transferred" ||
    input.activationStatus === "revoked"
  ) return "revoked";
  if (
    input.licenseStatus !== "active" ||
    !input.lastSuccessAt ||
    !input.envelopeExpiresAt ||
    input.envelopeExpiresAt <= now ||
    (input.licenseValidUntil !== null && input.licenseValidUntil <= now)
  ) return "expired";
  // A schema/signature/domain/4xx failure always fails closed; it can never be
  // reclassified as a transient outage just because a prior snapshot exists.
  if (input.lastErrorCode && input.lastErrorCode !== "revalidation_network_outage" && input.lastErrorCode !== "revalidation_master_5xx") return "expired";
  if (input.graceEndsAt !== null && input.graceEndsAt <= now) return "expired";
  if (now.getTime() - input.lastSuccessAt.getTime() > PRIVILEGED_STALE_LIMIT_MS) return "degraded";
  return "ready";
}
