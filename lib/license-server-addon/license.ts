import type {
  LicenseServerAddonState,
  LicenseServerDeploymentPlatform,
} from "@/lib/license-server-addon/contract";
import {
  getLicenseServerDisabledMessage,
  getLicenseServerRuntimeConfig,
  type LicenseServerRuntimeConfig,
} from "@/lib/license-server-addon/config";
import {
  loadLicenseServerAddon,
  type LicenseServerAddonLoadResult,
} from "@/lib/license-server-addon/loader";
import {
  verifyVendorAddonEntitlement,
  type VerifiedManagedAddonEntitlement,
} from "@/lib/vendor-addon-entitlements/verified-entitlement";
import { getVendorAddonEntitlementPublicKeys } from "@/lib/vendor-addon-entitlements/public-keys";
import {
  activateManagedAddonV2,
  ManagedAddonV2ExchangeError,
  revalidateManagedAddonV2,
  type ManagedAddonActivationResponseV2,
} from "@/lib/vendor-addon-entitlements/activation-client-v2";
export type LicenseServerActivationResponse =
  ManagedAddonActivationResponseV2 & {
    verifiedClaims: VerifiedManagedAddonEntitlement;
  };

export type LicenseServerRevalidationStatus =
  | "active"
  | "suspended"
  | "expired"
  | "revoked"
  | "canceled";

export const LICENSE_SERVER_ENTITLEMENT_REVALIDATION_INTERVAL_MS =
  24 * 60 * 60 * 1000;

export type LicenseServerEntitlementState = {
  deploymentEnvironment?: string | null;
  entitlementToken?: string | null;
  signedEntitlement?: string | null;
  installationId?: string | null;
  installationKeyFingerprint?: string | null;
  expiresAt?: Date | null;
  entitlementEnvelopeExpiresAt?: Date | null;
  features?: unknown;
  graceEndsAt?: Date | null;
  lastErrorCode?: string | null;
  lastRevalidationSuccessAt?: Date | null;
  licenseKeyRef?: string | null;
  licenseEnvironment?: string | null;
  licenseValidUntil?: Date | null;
  metadata?: unknown;
  nextRevalidationAt?: Date | null;
  packageName?: string | null;
  packageVersion?: string | null;
  provider?: string | null;
  providerMode?: string | null;
  providerOwnerId?: string | null;
  providerProjectId?: string | null;
  verifiedClaims?: unknown;
  status: string;
};

export function verifyLicenseServerSignedEntitlement(
  entitlement: LicenseServerEntitlementState,
  canonicalDomain: string,
  now = new Date(),
  publicKeysByKid: Record<string, string> = {},
) {
  if (
    !(entitlement.signedEntitlement ?? entitlement.entitlementToken) ||
    !entitlement.installationId ||
    !entitlement.installationKeyFingerprint
  )
    throw new Error("License Server signed entitlement cache is incomplete.");
  const verifiedClaims = asRecord(entitlement.verifiedClaims);
  const hostCapabilityDescriptorHash =
    verifiedClaims.hostCapabilityDescriptorHash;
  const environment = entitlement.licenseEnvironment;
  if (
    typeof hostCapabilityDescriptorHash !== "string" ||
    (environment !== "development" &&
      environment !== "staging" &&
      environment !== "production")
  ) {
    throw new Error("License Server V2 entitlement cache is incomplete.");
  }
  return verifyVendorAddonEntitlement(
    entitlement.signedEntitlement ?? entitlement.entitlementToken!,
    {
      addonKey: "license-server",
      canonicalDomain,
      environment,
      expectedHostCapabilityDescriptorHash: hostCapabilityDescriptorHash,
      installationId: entitlement.installationId,
      installationKeyFingerprint: entitlement.installationKeyFingerprint,
      now,
      publicKeysByKid,
    },
  );
}

export type InstalledLicenseServerLicenseModeResult =
  | { status: "ready"; mode: "ready" }
  | { status: "license_expired"; mode: "edit_existing_only" }
  | { status: "forbidden"; reason: string };

export function resolveLicenseServerAddonStateFromInputs({
  entitlement,
  loadResult,
  now = new Date(),
  platform,
  runtimeConfig = getLicenseServerRuntimeConfig(),
  publicKeysByKid = {},
  verifySignedEntitlement = true,
}: {
  entitlement: LicenseServerEntitlementState | null;
  loadResult: LicenseServerAddonLoadResult;
  now?: Date;
  platform?: LicenseServerDeploymentPlatform;
  runtimeConfig?: LicenseServerRuntimeConfig;
  publicKeysByKid?: Record<string, string>;
  verifySignedEntitlement?: boolean;
}): LicenseServerAddonState {
  const disabledMessage = getLicenseServerDisabledMessage(runtimeConfig);
  if (disabledMessage) {
    return { status: "disabled", message: disabledMessage };
  }

  if (loadResult.status === "invalid") {
    return { status: "license_invalid", reason: loadResult.reason };
  }

  if (loadResult.status === "not_installed") {
    if (entitlement?.status === "install_pending") {
      return { status: "install_pending" };
    }

    if (runtimeConfig.installMode === "disabled") {
      return {
        status: "install_disabled",
        message:
          "License Server installation is disabled by LICENSE_SERVER_INSTALL_MODE. Existing installed license servers can keep running, but new activation is blocked.",
      };
    }

    if (platform?.status === "unsupported") {
      return {
        status: "platform_not_supported",
        message: platform.message,
        supportedProviders: ["vercel_production_oidc", "self_hosted"],
      };
    }

    return { status: "not_installed" };
  }

  if (!entitlement) return { status: "license_required" };

  if (entitlement.status === "install_pending") {
    return { status: "install_pending" };
  }

  if (entitlement.status === "invalid") {
    return {
      status: "license_invalid",
      reason:
        getLastRevalidationMessage(entitlement) ??
        "Stored License Server entitlement is marked invalid.",
    };
  }

  if (verifySignedEntitlement) {
    try {
      verifyLicenseServerSignedEntitlement(
        entitlement,
        expectedDomain(),
        now,
        publicKeysByKid,
      );
    } catch (error) {
      return {
        status: "license_invalid",
        reason:
          error instanceof Error
            ? error.message
            : "License Server entitlement signature is invalid.",
      };
    }
  }

  if (entitlement.status === "expired") {
    return {
      status: "license_expired",
      addon: loadResult.addon,
      expiresAt: entitlement.expiresAt?.toISOString() ?? "",
      mode: "edit_existing_only",
    };
  }

  if (
    entitlement.expiresAt &&
    entitlement.expiresAt.getTime() <= now.getTime()
  ) {
    return {
      status: "license_expired",
      addon: loadResult.addon,
      expiresAt: entitlement.expiresAt.toISOString(),
      mode: "edit_existing_only",
    };
  }

  if (entitlement.status !== "ready") return { status: "license_required" };
  return { status: "ready", addon: loadResult.addon };
}

function expectedDomain() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    "unknown"
  );
}

export async function resolveLicenseServerAddonState(): Promise<LicenseServerAddonState> {
  const runtimeConfig = getLicenseServerRuntimeConfig();
  const disabledMessage = getLicenseServerDisabledMessage(runtimeConfig);
  if (disabledMessage) {
    return { status: "disabled", message: disabledMessage };
  }

  const { getLicenseServerAddonEntitlement } =
    await import("@/data/license-server-addon-entitlement");
  const loadResult = await loadLicenseServerAddon();

  if (loadResult.status === "not_installed") {
    const entitlement = await maybeRevalidateLicenseServerAddonEntitlement(
      await getLicenseServerAddonEntitlement(),
      "state_resolution",
    );
    return resolveLicenseServerAddonStateFromInputs({
      entitlement,
      loadResult,
      runtimeConfig,
    });
  }

  const entitlement = await maybeRevalidateLicenseServerAddonEntitlement(
    await getLicenseServerAddonEntitlement(),
    "state_resolution",
  );
  const publicKeysByKid = entitlement?.entitlementToken
    ? await getVendorAddonEntitlementPublicKeys().catch(() => ({}))
    : {};
  return resolveLicenseServerAddonStateFromInputs({
    entitlement,
    loadResult,
    publicKeysByKid,
    runtimeConfig,
  });
}

export function resolveInstalledLicenseServerLicenseModeFromEntitlement(
  entitlement: LicenseServerEntitlementState | null,
  now = new Date(),
  runtimeConfig = getLicenseServerRuntimeConfig(),
): InstalledLicenseServerLicenseModeResult {
  const disabledMessage = getLicenseServerDisabledMessage(runtimeConfig);
  if (disabledMessage) {
    return { status: "forbidden", reason: disabledMessage };
  }

  if (!entitlement) {
    return {
      status: "forbidden",
      reason: "License Server license is required.",
    };
  }

  if (entitlement.status === "expired") {
    return { status: "license_expired", mode: "edit_existing_only" };
  }

  if (
    entitlement.expiresAt &&
    entitlement.expiresAt.getTime() <= now.getTime()
  ) {
    return { status: "license_expired", mode: "edit_existing_only" };
  }

  if (entitlement.status === "ready") {
    return { status: "ready", mode: "ready" };
  }

  return {
    status: "forbidden",
    reason: "License Server add-on is not available for this license.",
  };
}

export async function resolveInstalledLicenseServerLicenseMode(): Promise<InstalledLicenseServerLicenseModeResult> {
  const { getLicenseServerAddonEntitlement } =
    await import("@/data/license-server-addon-entitlement");
  const entitlement = await maybeRevalidateLicenseServerAddonEntitlement(
    await getLicenseServerAddonEntitlement(),
    "issue_gate",
  );
  if (entitlement?.entitlementToken) {
    try {
      verifyLicenseServerSignedEntitlement(
        entitlement,
        expectedDomain(),
        new Date(),
        await getVendorAddonEntitlementPublicKeys(),
      );
    } catch {
      return {
        status: "forbidden",
        reason: "License Server entitlement signature is invalid.",
      };
    }
  }
  return resolveInstalledLicenseServerLicenseModeFromEntitlement(entitlement);
}

export async function requestLicenseServerLicenseActivation({
  deploymentPlatform,
  licenseKey,
  siteDomain,
  siteId: _siteId,
}: {
  deploymentPlatform: Extract<
    LicenseServerDeploymentPlatform,
    { status: "supported" }
  >;
  licenseKey: string;
  siteDomain: string;
  siteId: string;
}): Promise<
  | { ok: true; entitlement: LicenseServerActivationResponse }
  | { ok: false; error: string }
> {
  void _siteId;
  const deploymentMode =
    deploymentPlatform.provider === "vercel" ? "vercel" : "self_hosted";
  try {
    const entitlement = await activateManagedAddonV2({
      addonKey: "license-server",
      canonicalDomain: siteDomain,
      deploymentMode,
      installedAddonSchemaVersion: 0,
      licenseKey,
      platformSubject: deploymentPlatform.ownerId,
    });
    return { ok: true, entitlement };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "License Server activation was rejected by the Master.",
    };
  }
}

export async function requestLicenseServerLicenseRevalidation({
  activationId,
  canonicalDomain,
  deploymentMode,
  installedAddonSchemaVersion,
}: {
  activationId: string;
  canonicalDomain: string;
  deploymentMode: "vercel" | "self_hosted";
  installedAddonSchemaVersion: number;
}): Promise<
  | {
      ok: true;
      entitlement: Awaited<ReturnType<typeof revalidateManagedAddonV2>>;
    }
  | { ok: false; error: string; statusCode?: number }
> {
  try {
    return {
      entitlement: await revalidateManagedAddonV2({
        activationId,
        addonKey: "license-server",
        canonicalDomain,
        deploymentMode,
        installedAddonSchemaVersion,
      }),
      ok: true,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Master license server could not be reached for revalidation.",
      ok: false,
      ...(error instanceof ManagedAddonV2ExchangeError && error.statusCode
        ? { statusCode: error.statusCode }
        : {}),
    };
  }
}

export function shouldRevalidateLicenseServerEntitlement(
  entitlement: LicenseServerEntitlementState | null,
  now = new Date(),
): boolean {
  if (!(entitlement?.signedEntitlement ?? entitlement?.entitlementToken))
    return false;
  if (entitlement.status === "install_pending") return false;
  if (entitlement.status === "invalid") return false;

  if (entitlement.nextRevalidationAt) {
    return entitlement.nextRevalidationAt.getTime() <= now.getTime();
  }

  const lastRevalidatedAt = dateValue(
    asRecord(entitlement.metadata).lastRevalidatedAt,
  );
  if (!lastRevalidatedAt) return true;

  return (
    now.getTime() - lastRevalidatedAt.getTime() >=
    LICENSE_SERVER_ENTITLEMENT_REVALIDATION_INTERVAL_MS
  );
}

export function mapLicenseServerRevalidationStatusToEntitlementStatus(
  status: LicenseServerRevalidationStatus,
): "expired" | "invalid" | "ready" {
  if (status === "active") return "ready";
  if (status === "expired") return "expired";
  return "invalid";
}

export async function revalidateLicenseServerAddonEntitlement({
  force = true,
  reason = "scheduled",
  updatedBy = "system",
}: {
  force?: boolean;
  reason?: string;
  updatedBy?: string;
} = {}): Promise<
  | {
      entitlement: LicenseServerEntitlementState | null;
      ok: true;
      response?: Awaited<ReturnType<typeof revalidateManagedAddonV2>>;
      skipped?: boolean;
    }
  | {
      entitlement: LicenseServerEntitlementState | null;
      error: string;
      ok: false;
      statusCode?: number;
    }
> {
  const { getLicenseServerAddonEntitlement } =
    await import("@/data/license-server-addon-entitlement");
  const entitlement = await getLicenseServerAddonEntitlement();

  if (!entitlement) {
    return {
      entitlement: null,
      error: "License Server entitlement is not configured.",
      ok: false,
    };
  }

  if (!force && !shouldRevalidateLicenseServerEntitlement(entitlement)) {
    return { entitlement, ok: true, skipped: true };
  }

  const storedEntitlementToken =
    entitlement.signedEntitlement ?? entitlement.entitlementToken;
  if (
    !storedEntitlementToken ||
    !entitlement.entitlementEnvelopeExpiresAt ||
    !entitlement.licenseKeyRef ||
    !entitlement.installationId ||
    !entitlement.installationKeyFingerprint
  ) {
    return {
      entitlement,
      error: "Stored License Server entitlement is incomplete.",
      ok: false,
    };
  }

  const verifiedClaims = asRecord(entitlement.verifiedClaims);
  const activationId =
    stringValue(verifiedClaims.activationId) ||
    stringValue(asRecord(entitlement.metadata).activationId);
  const deploymentMode = stringValue(verifiedClaims.deploymentMode);
  if (
    !activationId ||
    (deploymentMode !== "self_hosted" && deploymentMode !== "vercel")
  )
    return {
      entitlement,
      error:
        "Stored License Server activation or deployment-mode binding is missing.",
      ok: false,
    };
  const revalidation = await requestLicenseServerLicenseRevalidation({
    activationId,
    canonicalDomain: expectedDomain(),
    deploymentMode,
    // The activation identity is bound to the pre-install host descriptor.
    // A package revalidation must not manufacture a new deployment intent.
    installedAddonSchemaVersion: 0,
  });

  if (!revalidation.ok) {
    const failClosed = shouldFailClosedForRevalidationError(
      revalidation.statusCode,
    );
    await persistLicenseServerRevalidationFailure({
      entitlement,
      error: revalidation.error,
      failClosed,
      reason,
      updatedBy,
    });
    const nextEntitlement = await getLicenseServerAddonEntitlement();

    return {
      entitlement: nextEntitlement,
      error: revalidation.error,
      ok: false,
      statusCode: revalidation.statusCode,
    };
  }

  const { persistVerifiedLicenseServerActivation } =
    await import("@/data/webshop-addon-control-plane");
  await persistVerifiedLicenseServerActivation({
    claim: revalidation.entitlement.verifiedClaims,
    signedEntitlement: revalidation.entitlement.signedEntitlement,
    updatedBy,
  });
  const nextEntitlement = await getLicenseServerAddonEntitlement();

  return {
    entitlement: nextEntitlement,
    ok: true,
    response: revalidation.entitlement,
  };
}

async function maybeRevalidateLicenseServerAddonEntitlement(
  entitlement: LicenseServerEntitlementState | null,
  reason: string,
): Promise<LicenseServerEntitlementState | null> {
  if (!shouldRevalidateLicenseServerEntitlement(entitlement)) {
    return entitlement;
  }

  const result = await revalidateLicenseServerAddonEntitlement({
    force: true,
    reason,
    updatedBy: "system",
  });
  return result.entitlement ?? entitlement;
}

function shouldFailClosedForRevalidationError(statusCode: number | undefined) {
  return statusCode !== undefined && statusCode < 500;
}

async function persistLicenseServerRevalidationFailure(input: {
  entitlement: LicenseServerEntitlementState;
  error: string;
  failClosed: boolean;
  reason: string;
  updatedBy: string;
}) {
  const [{ eq }, { db }, { licenseServerAddonEntitlements }] =
    await Promise.all([
      import("drizzle-orm"),
      import("@/db"),
      import("@/db/schema"),
    ]);
  const checkedAt = new Date();
  await db
    .update(licenseServerAddonEntitlements)
    .set({
      lastErrorCode: input.failClosed
        ? "revalidation_invalid_response"
        : "revalidation_network_outage",
      lastRevalidationAttemptAt: checkedAt,
      metadata: mergeMetadata(input.entitlement.metadata, {
        lastRevalidatedAt: checkedAt.toISOString(),
        lastRevalidationError: input.error,
        lastRevalidationReason: input.reason,
        lastRevalidationStatus: input.failClosed ? "invalid" : "unreachable",
      }),
      ...(input.failClosed ? { status: "invalid" as const } : {}),
      updatedBy: input.updatedBy,
    })
    .where(eq(licenseServerAddonEntitlements.id, 1));
}

function mergeMetadata(
  metadata: unknown,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return { ...asRecord(metadata), ...patch };
}

function getLastRevalidationMessage(
  entitlement: LicenseServerEntitlementState,
) {
  const message = stringValue(
    asRecord(entitlement.metadata).lastRevalidationMessage,
  );
  return message || null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function dateValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== "string") return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
