import { z } from "zod";
import { safeFetch } from "@/lib/security/outbound-url";

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
import { verifyLicenseServerDeploymentPlatform } from "@/lib/license-server-addon/platform";
import { verifyVendorAddonEntitlement } from "@/lib/vendor-addon-entitlements/verified-entitlement";
import { getOrCreateVendorAddonInstallationIdentity, signVendorAddonActivationPayload } from "@/lib/vendor-addon-installation";

const ActivationResponseSchema = z.object({
  activationId: z.string().uuid(),
  entitlementToken: z.string().min(1),
  expiresAt: z.string().datetime(),
  features: z.array(z.string()).default([]),
  installationId: z.string().uuid().optional(),
  installationKeyFingerprint: z.string().optional(),
  licenseKeyRef: z.string().min(1),
  packageInstallToken: z.string().optional(),
  packageInstallTokenExpiresAt: z.string().datetime().optional(),
  packageName: z.string().optional(),
  packageVersion: z.string().optional(),
});

const RevalidationResponseSchema = z.object({
  activationId: z.string().uuid(),
  checkedAt: z.string().datetime().optional(),
  entitlementToken: z.string().min(1),
  installationId: z.string().uuid(),
  installationKeyFingerprint: z.string(),
  signingKid: z.string().min(1),
  existingLicenseValidationPolicy: z
    .enum(["allow_existing", "disabled"])
    .default("allow_existing"),
  expiresAt: z.string().datetime(),
  features: z.array(z.string()).default([]),
  licenseKeyRef: z.string().min(1),
  message: z.string().optional(),
  packageName: z.string().optional(),
  packageVersion: z.string().optional(),
  status: z.enum(["ready", "expired", "revoked", "invalid"]),
});
const ActivationChallengeSchema = z.object({ challengeId: z.string().uuid(), expiresAt: z.string().datetime(), ok: z.literal(true), signaturePayload: z.string().min(1) });

export type LicenseServerActivationResponse = z.infer<
  typeof ActivationResponseSchema
>;

export type LicenseServerRevalidationResponse = z.infer<
  typeof RevalidationResponseSchema
>;

export const LICENSE_SERVER_ENTITLEMENT_REVALIDATION_INTERVAL_MS =
  24 * 60 * 60 * 1000;

export type LicenseServerEntitlementState = {
  deploymentEnvironment?: string | null;
  entitlementToken?: string | null;
  installationId?: string | null;
  installationKeyFingerprint?: string | null;
  expiresAt?: Date | null;
  features?: unknown;
  licenseKeyRef?: string | null;
  metadata?: unknown;
  packageName?: string | null;
  packageVersion?: string | null;
  provider?: string | null;
  providerMode?: string | null;
  providerOwnerId?: string | null;
  providerProjectId?: string | null;
  status: string;
};

export function verifyLicenseServerSignedEntitlement(entitlement: LicenseServerEntitlementState, canonicalDomain: string, now = new Date()) {
  if (!entitlement.entitlementToken || !entitlement.installationId || !entitlement.installationKeyFingerprint) throw new Error("License Server signed entitlement cache is incomplete.");
  return verifyVendorAddonEntitlement(entitlement.entitlementToken, {
    addonKey: "license-server",
    canonicalDomain,
    installationId: entitlement.installationId,
    installationKeyFingerprint: entitlement.installationKeyFingerprint,
    now,
    publicKeysByKid: configuredVendorPublicKeys(),
  });
}

export type InstalledLicenseServerLicenseModeResult =
  | { status: "ready"; mode: "ready" }
  | { status: "license_expired"; mode: "edit_existing_only" }
  | { status: "forbidden"; reason: string };

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export function resolveLicenseServerAddonStateFromInputs({
  entitlement,
  loadResult,
  now = new Date(),
  platform,
  runtimeConfig = getLicenseServerRuntimeConfig(),
}: {
  entitlement: LicenseServerEntitlementState | null;
  loadResult: LicenseServerAddonLoadResult;
  now?: Date;
  platform?: LicenseServerDeploymentPlatform;
  runtimeConfig?: LicenseServerRuntimeConfig;
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

  if (
    process.env.NODE_ENV === "production" ||
    process.env.VENDOR_SIGNED_ENTITLEMENTS_V1 === "true"
  ) {
    try {
      verifyLicenseServerSignedEntitlement(entitlement, expectedDomain());
    } catch (error) {
      return { status: "license_invalid", reason: error instanceof Error ? error.message : "License Server entitlement signature is invalid." };
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

function configuredVendorPublicKeys() {
  const raw = process.env.NR_VENDOR_ENTITLEMENT_PUBLIC_KEYS_JSON;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  } catch { return {}; }
}
function expectedDomain() { return process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? "unknown"; }

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
    const platform =
      entitlement?.status === "install_pending"
        ? undefined
        : await verifyLicenseServerDeploymentPlatform();
    return resolveLicenseServerAddonStateFromInputs({
      entitlement,
      loadResult,
      platform,
      runtimeConfig,
    });
  }

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
  const licenseServerUrl = getLicenseServerRuntimeConfig().licenseApiUrl;
  if (!licenseServerUrl) {
    return { ok: false, error: "Master license server is not configured." };
  }

  const deploymentMode = deploymentPlatform.provider === "vercel" ? "vercel" : "self_hosted";
  let identity: Awaited<ReturnType<typeof getOrCreateVendorAddonInstallationIdentity>>;
  try { identity = await getOrCreateVendorAddonInstallationIdentity({ canonicalDomain: siteDomain, deploymentMode }); } catch { return { ok: false, error: "Server-only installation identity is not configured." }; }
  const challengeResponse = await safeFetch(joinUrl(licenseServerUrl, "/api/addons/licenses/activate"), { allowFirstParty: true, body: JSON.stringify({ action: "challenge", addonKey: "license-server", canonicalDomain: siteDomain, deploymentMode, installationId: identity.installationId, installationKeyFingerprint: identity.installationKeyFingerprint, installationPublicKey: identity.installationPublicKey, licenseKey, platformSubject: deploymentPlatform.ownerId }), headers: { "content-type": "application/json" }, method: "POST", purpose: "License Server activation challenge", timeoutMs: 5000 }).catch(() => null);
  if (!challengeResponse?.ok) return { ok: false, error: "License Server activation challenge was rejected by the master license server." };
  const challenge = ActivationChallengeSchema.safeParse(await challengeResponse.json());
  if (!challenge.success) return { ok: false, error: "Master license server returned an invalid activation challenge." };
  const response = await safeFetch(joinUrl(licenseServerUrl, "/api/addons/licenses/activate"), { allowFirstParty: true, body: JSON.stringify({ action: "complete", challengeId: challenge.data.challengeId, challengeSignature: signVendorAddonActivationPayload(identity, challenge.data.signaturePayload) }), headers: { "content-type": "application/json" }, method: "POST", purpose: "License Server activation completion", timeoutMs: 5000 }).catch(() => null);

  if (!response?.ok) {
    return {
      ok: false,
      error:
        "License Server activation was rejected by the master license server.",
    };
  }

  const parsed = ActivationResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    return {
      ok: false,
      error:
        "Master license server returned an invalid License Server activation response.",
    };
  }

  return { ok: true, entitlement: parsed.data };
}

export async function requestLicenseServerLicenseRevalidation({
  activationId,
}: {
  activationId: string;
}): Promise<
  | { ok: true; entitlement: LicenseServerRevalidationResponse }
  | { ok: false; error: string; statusCode?: number }
> {
  const licenseServerUrl = getLicenseServerRuntimeConfig().licenseApiUrl;
  if (!licenseServerUrl) {
    return { ok: false, error: "Master license server is not configured." };
  }

  let response: Response;
  try {
    response = await safeFetch(
      joinUrl(licenseServerUrl, "/api/addons/licenses/revalidate"),
      {
        body: JSON.stringify({ activationId }),
        headers: { "content-type": "application/json" },
        allowFirstParty: true,
        method: "POST",
        purpose: "License Server entitlement revalidation",
        timeoutMs: 5000,
      },
    );
  } catch {
    return {
      ok: false,
      error: "Master license server could not be reached for revalidation.",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      error:
        (await readErrorMessage(response)) ??
        "License Server entitlement revalidation was rejected by the master license server.",
      statusCode: response.status,
    };
  }

  const parsed = RevalidationResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    return {
      ok: false,
      error:
        "Master license server returned an invalid License Server revalidation response.",
    };
  }

  return { ok: true, entitlement: parsed.data };
}

export function shouldRevalidateLicenseServerEntitlement(
  entitlement: LicenseServerEntitlementState | null,
  now = new Date(),
): boolean {
  if (!entitlement?.entitlementToken) return false;
  if (entitlement.status === "install_pending") return false;
  if (entitlement.status === "invalid") return false;

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
  status: LicenseServerRevalidationResponse["status"],
): "expired" | "invalid" | "ready" {
  if (status === "ready") return "ready";
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
      response?: LicenseServerRevalidationResponse;
      skipped?: boolean;
    }
  | {
      entitlement: LicenseServerEntitlementState | null;
      error: string;
      ok: false;
      statusCode?: number;
    }
> {
  const {
    getLicenseServerAddonEntitlement,
    saveLicenseServerAddonEntitlement,
  } = await import("@/data/license-server-addon-entitlement");
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

  const storedEntitlementToken = entitlement.entitlementToken;
  const storedExpiresAt = entitlement.expiresAt;
  const storedLicenseKeyRef = entitlement.licenseKeyRef;
  if (!storedEntitlementToken || !storedExpiresAt || !storedLicenseKeyRef) {
    return {
      entitlement,
      error: "Stored License Server entitlement is incomplete.",
      ok: false,
    };
  }

  const activationId = stringValue(asRecord(entitlement.metadata).activationId);
  if (!activationId) return { entitlement, error: "Stored License Server activation reference is missing.", ok: false };
  const revalidation = await requestLicenseServerLicenseRevalidation({
    activationId,
  });

  const checkedAt = new Date().toISOString();
  if (!revalidation.ok) {
    const failClosed = shouldFailClosedForRevalidationError(
      revalidation.statusCode,
    );
    const nextEntitlement = {
      ...entitlement,
      metadata: mergeMetadata(entitlement.metadata, {
        lastRevalidatedAt: checkedAt,
        lastRevalidationError: revalidation.error,
        lastRevalidationReason: reason,
        lastRevalidationStatus: failClosed ? "invalid" : "unreachable",
      }),
      status: failClosed ? "invalid" : entitlement.status,
    };

    await saveLicenseServerAddonEntitlement({
      deploymentEnvironment: nextEntitlement.deploymentEnvironment,
      entitlementToken: storedEntitlementToken,
      expiresAt: storedExpiresAt,
      features: nextEntitlement.features,
      licenseKeyRef: storedLicenseKeyRef,
      metadata: nextEntitlement.metadata,
      packageName: nextEntitlement.packageName,
      packageVersion: nextEntitlement.packageVersion,
      provider: nextEntitlement.provider,
      providerMode: nextEntitlement.providerMode,
      providerOwnerId: nextEntitlement.providerOwnerId,
      providerProjectId: nextEntitlement.providerProjectId,
      status: normalizeStoredEntitlementStatus(nextEntitlement.status),
      updatedBy,
    });

    return {
      entitlement: nextEntitlement,
      error: revalidation.error,
      ok: false,
      statusCode: revalidation.statusCode,
    };
  }

  const nextStatus = mapLicenseServerRevalidationStatusToEntitlementStatus(
    revalidation.entitlement.status,
  );
  const nextEntitlement = {
    ...entitlement,
    expiresAt: new Date(revalidation.entitlement.expiresAt),
    features: revalidation.entitlement.features,
    licenseKeyRef: revalidation.entitlement.licenseKeyRef,
    entitlementToken: revalidation.entitlement.entitlementToken,
    installationId: revalidation.entitlement.installationId,
    installationKeyFingerprint: revalidation.entitlement.installationKeyFingerprint,
    metadata: mergeMetadata(entitlement.metadata, {
      activationId: revalidation.entitlement.activationId,
      existingLicenseValidationPolicy:
        revalidation.entitlement.existingLicenseValidationPolicy,
      lastRevalidatedAt: revalidation.entitlement.checkedAt ?? checkedAt,
      lastRevalidationError: null,
      lastRevalidationMessage: revalidation.entitlement.message ?? null,
      lastRevalidationReason: reason,
      lastRevalidationStatus: revalidation.entitlement.status,
    }),
    packageName:
      revalidation.entitlement.packageName ?? entitlement.packageName,
    packageVersion:
      revalidation.entitlement.packageVersion ?? entitlement.packageVersion,
    status: nextStatus,
  };

  await saveLicenseServerAddonEntitlement({
    deploymentEnvironment: nextEntitlement.deploymentEnvironment,
    entitlementToken: revalidation.entitlement.entitlementToken,
    expiresAt: nextEntitlement.expiresAt,
    features: nextEntitlement.features,
    licenseKeyRef: nextEntitlement.licenseKeyRef,
    metadata: nextEntitlement.metadata,
    packageName: nextEntitlement.packageName,
    packageVersion: nextEntitlement.packageVersion,
    provider: nextEntitlement.provider,
    providerMode: nextEntitlement.providerMode,
    providerOwnerId: nextEntitlement.providerOwnerId,
    providerProjectId: nextEntitlement.providerProjectId,
    status: normalizeStoredEntitlementStatus(nextEntitlement.status),
    updatedBy,
  });

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
  return statusCode === 401 || statusCode === 403 || statusCode === 404;
}

function normalizeStoredEntitlementStatus(
  status: string,
): "expired" | "install_pending" | "invalid" | "ready" {
  if (
    status === "expired" ||
    status === "install_pending" ||
    status === "invalid" ||
    status === "ready"
  ) {
    return status;
  }
  return "invalid";
}

function mergeMetadata(
  metadata: unknown,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return { ...asRecord(metadata), ...patch };
}

async function readErrorMessage(response: Response) {
  try {
    const payload = asRecord(await response.json());
    const error = stringValue(payload.error);
    return error || null;
  } catch {
    return null;
  }
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
