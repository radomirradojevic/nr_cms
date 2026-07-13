import { z } from "zod";
import { safeFetch } from "@/lib/security/outbound-url";

import {
  WEBSHOP_SUPPORTED_PROVIDERS,
  type WebshopAddonState,
  type WebshopDeploymentPlatform,
} from "@/lib/webshop-addon/contract";
import {
  getWebshopDisabledMessage,
  getWebshopRuntimeConfig,
  type WebshopRuntimeConfig,
} from "@/lib/webshop-addon/config";
import {
  loadWebshopAddon,
  type WebshopAddonLoadResult,
} from "@/lib/webshop-addon/loader";
import { verifyWebshopDeploymentPlatform } from "@/lib/webshop-addon/platform";
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
const ActivationChallengeSchema = z.object({
  challengeId: z.string().uuid(),
  expiresAt: z.string().datetime(),
  ok: z.literal(true),
  signaturePayload: z.string().min(1),
});
const RevalidationResponseSchema = z.object({
  activationId: z.string().uuid(),
  checkedAt: z.string().datetime(),
  entitlementToken: z.string().min(1),
  expiresAt: z.string().datetime(),
  features: z.array(z.string()).default([]),
  installationId: z.string().uuid(),
  installationKeyFingerprint: z.string(),
  licenseKeyRef: z.string().min(1),
  signingKid: z.string().min(1),
  status: z.enum(["active", "suspended", "expired", "revoked", "canceled"]),
});

export type WebshopActivationResponse = z.infer<
  typeof ActivationResponseSchema
>;

export type WebshopEntitlementState = {
  entitlementToken?: string | null;
  expiresAt?: Date | null;
  features?: unknown;
  installationId?: string | null;
  installationKeyFingerprint?: string | null;
  metadata?: unknown;
  packageName?: string | null;
  packageVersion?: string | null;
  provider?: string | null;
  providerMode?: string | null;
  providerOwnerId?: string | null;
  providerProjectId?: string | null;
  deploymentEnvironment?: string | null;
  licenseKeyRef?: string | null;
  status: string;
};

export function verifyWebshopSignedEntitlement(entitlement: WebshopEntitlementState, canonicalDomain: string, now = new Date()) {
  if (!entitlement.entitlementToken || !entitlement.installationId || !entitlement.installationKeyFingerprint) throw new Error("Webshop signed entitlement cache is incomplete.");
  return verifyVendorAddonEntitlement(entitlement.entitlementToken, {
    addonKey: "webshop",
    canonicalDomain,
    installationId: entitlement.installationId,
    installationKeyFingerprint: entitlement.installationKeyFingerprint,
    now,
    publicKeysByKid: configuredVendorPublicKeys(),
  });
}

export type InstalledWebshopLicenseModeResult =
  | { status: "ready"; mode: "ready" }
  | { status: "license_expired"; mode: "edit_existing_only" }
  | { status: "forbidden"; reason: string };

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export function resolveWebshopAddonStateFromInputs({
  entitlement,
  loadResult,
  now = new Date(),
  platform,
  runtimeConfig = getWebshopRuntimeConfig(),
}: {
  entitlement: WebshopEntitlementState | null;
  loadResult: WebshopAddonLoadResult;
  now?: Date;
  platform?: WebshopDeploymentPlatform;
  runtimeConfig?: WebshopRuntimeConfig;
}): WebshopAddonState {
  const disabledMessage = getWebshopDisabledMessage(runtimeConfig);
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
          "Webshop installation is disabled by WEBSHOP_INSTALL_MODE. Existing installed shops can keep running, but new activation is blocked.",
      };
    }

    if (platform?.status === "unsupported") {
      return {
        status: "platform_not_supported",
        message: platform.message,
        supportedProviders: WEBSHOP_SUPPORTED_PROVIDERS,
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
      reason: "Stored Webshop entitlement is marked invalid.",
    };
  }

  if (
    process.env.NODE_ENV === "production" ||
    process.env.VENDOR_SIGNED_ENTITLEMENTS_V1 === "true"
  ) {
    try {
      verifyWebshopSignedEntitlement(entitlement, expectedDomain());
    } catch (error) {
      return { status: "license_invalid", reason: error instanceof Error ? error.message : "Webshop entitlement signature is invalid." };
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

export async function resolveWebshopAddonState(): Promise<WebshopAddonState> {
  const runtimeConfig = getWebshopRuntimeConfig();
  const disabledMessage = getWebshopDisabledMessage(runtimeConfig);
  if (disabledMessage) {
    return { status: "disabled", message: disabledMessage };
  }

  const { getWebshopAddonEntitlement } =
    await import("@/data/webshop-addon-entitlement");
  const loadResult = await loadWebshopAddon();

  if (loadResult.status === "not_installed") {
    const entitlement = await getWebshopAddonEntitlement();
    const platform =
      entitlement?.status === "install_pending"
        ? undefined
        : await verifyWebshopDeploymentPlatform();
    return resolveWebshopAddonStateFromInputs({
      entitlement,
      loadResult,
      platform,
      runtimeConfig,
    });
  }

  const entitlement = await maybeRevalidateWebshopAddonEntitlement(await getWebshopAddonEntitlement());
  return resolveWebshopAddonStateFromInputs({
    entitlement,
    loadResult,
    runtimeConfig,
  });
}

export async function revalidateWebshopAddonEntitlement({ force = true }: { force?: boolean } = {}) {
  const { getWebshopAddonEntitlement, saveWebshopAddonEntitlement } = await import("@/data/webshop-addon-entitlement");
  const entitlement = await getWebshopAddonEntitlement();
  if (!entitlement || !entitlement.entitlementToken) return { entitlement, ok: false as const, error: "Webshop entitlement is missing." };
  if (!force && !shouldRevalidateWebshopEntitlement(entitlement)) return { entitlement, ok: true as const, skipped: true as const };
  const activationId = metadataString(entitlement.metadata, "activationId");
  if (!activationId) return { entitlement, ok: false as const, error: "Webshop activation reference is missing." };
  const url = getWebshopRuntimeConfig().licenseApiUrl;
  if (!url) return { entitlement, ok: false as const, error: "Webshop license server is not configured." };
  let response: Response;
  try { response = await safeFetch(joinUrl(url, "/api/addons/licenses/revalidate"), { allowFirstParty: true, body: JSON.stringify({ activationId }), headers: { "content-type": "application/json" }, method: "POST", purpose: "Webshop entitlement revalidation", timeoutMs: 5000 }); } catch { return persistWebshopRevalidationFailure(entitlement, "central_unreachable"); }
  if (!response.ok) return persistWebshopRevalidationFailure(entitlement, `central_${response.status}`, response.status);
  const parsed = RevalidationResponseSchema.safeParse(await response.json());
  if (!parsed.success) return persistWebshopRevalidationFailure(entitlement, "invalid_central_response");
  let claims;
  try { claims = verifyVendorAddonEntitlement(parsed.data.entitlementToken, { addonKey: "webshop", canonicalDomain: expectedDomain(), installationId: parsed.data.installationId, installationKeyFingerprint: parsed.data.installationKeyFingerprint, publicKeysByKid: configuredVendorPublicKeys() }); } catch { return persistWebshopRevalidationFailure(entitlement, "invalid_signature"); }
  const now = new Date();
  const status = claims.status === "active" ? "ready" : claims.status === "expired" ? "expired" : "invalid";
  const next = { ...entitlement, entitlementToken: parsed.data.entitlementToken, expiresAt: new Date(parsed.data.expiresAt), features: parsed.data.features, installationId: parsed.data.installationId, installationKeyFingerprint: parsed.data.installationKeyFingerprint, licenseKeyRef: parsed.data.licenseKeyRef, metadata: { ...metadataRecord(entitlement.metadata), activationId: parsed.data.activationId, graceEndsAt: new Date(now.getTime() + 14 * 86400000).toISOString(), lastRevalidationAttemptAt: now.toISOString(), lastRevalidationSuccessAt: now.toISOString(), lastRevalidationStatus: parsed.data.status, signingKid: parsed.data.signingKid }, status };
  await saveWebshopAddonEntitlement({ deploymentEnvironment: next.deploymentEnvironment, entitlementToken: next.entitlementToken!, expiresAt: next.expiresAt!, features: next.features, installationId: next.installationId, installationKeyFingerprint: next.installationKeyFingerprint, licenseKeyRef: next.licenseKeyRef!, metadata: next.metadata, packageName: next.packageName, packageVersion: next.packageVersion, provider: next.provider, providerMode: next.providerMode, providerOwnerId: next.providerOwnerId, providerProjectId: next.providerProjectId, status, updatedBy: "system" });
  return { entitlement: next, ok: true as const };
}

export function shouldRevalidateWebshopEntitlement(entitlement: WebshopEntitlementState | null, now = new Date()) { const last = metadataString(entitlement?.metadata, "lastRevalidationAttemptAt"); return Boolean(entitlement?.entitlementToken) && (!last || now.getTime() - new Date(last).getTime() >= 24 * 60 * 60 * 1000); }
async function maybeRevalidateWebshopAddonEntitlement(entitlement: WebshopEntitlementState | null) { if (!shouldRevalidateWebshopEntitlement(entitlement)) return entitlement; return (await revalidateWebshopAddonEntitlement({ force: true })).entitlement ?? entitlement; }
async function persistWebshopRevalidationFailure(entitlement: WebshopEntitlementState, error: string, statusCode?: number) { const { saveWebshopAddonEntitlement } = await import("@/data/webshop-addon-entitlement"); const now = new Date(); const lastSuccess = metadataString(entitlement.metadata, "lastRevalidationSuccessAt"); const hardFailure = Boolean(statusCode && [401, 403, 404].includes(statusCode)); const graceExpired = !lastSuccess || now.getTime() - new Date(lastSuccess).getTime() > 14 * 86400000; const nextStatus = hardFailure || graceExpired ? "invalid" : (entitlement.status as "ready" | "expired" | "invalid" | "install_pending"); const metadata = { ...metadataRecord(entitlement.metadata), lastErrorCode: error, lastRevalidationAttemptAt: now.toISOString() }; await saveWebshopAddonEntitlement({ deploymentEnvironment: entitlement.deploymentEnvironment, entitlementToken: entitlement.entitlementToken!, expiresAt: entitlement.expiresAt!, features: entitlement.features, installationId: entitlement.installationId, installationKeyFingerprint: entitlement.installationKeyFingerprint, licenseKeyRef: entitlement.licenseKeyRef!, metadata, packageName: entitlement.packageName, packageVersion: entitlement.packageVersion, provider: entitlement.provider, providerMode: entitlement.providerMode, providerOwnerId: entitlement.providerOwnerId, providerProjectId: entitlement.providerProjectId, status: nextStatus, updatedBy: "system" }); return { entitlement: { ...entitlement, metadata, status: nextStatus }, ok: false as const, error }; }
function metadataRecord(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function metadataString(value: unknown, key: string) { const found = metadataRecord(value)[key]; return typeof found === "string" ? found : null; }

export function resolveInstalledWebshopLicenseModeFromEntitlement(
  entitlement: WebshopEntitlementState | null,
  now = new Date(),
  runtimeConfig = getWebshopRuntimeConfig(),
): InstalledWebshopLicenseModeResult {
  const disabledMessage = getWebshopDisabledMessage(runtimeConfig);
  if (disabledMessage) {
    return { status: "forbidden", reason: disabledMessage };
  }

  if (!entitlement) {
    return { status: "forbidden", reason: "Webshop license is required." };
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
    reason: "Webshop add-on is not available for this license.",
  };
}

export async function resolveInstalledWebshopLicenseMode(): Promise<InstalledWebshopLicenseModeResult> {
  const { getWebshopAddonEntitlement } =
    await import("@/data/webshop-addon-entitlement");
  return resolveInstalledWebshopLicenseModeFromEntitlement(
    await getWebshopAddonEntitlement(),
  );
}

export async function requestWebshopLicenseActivation({
  deploymentPlatform,
  licenseKey,
  siteDomain,
  siteId: _siteId,
}: {
  deploymentPlatform: Extract<
    WebshopDeploymentPlatform,
    { status: "supported" }
  >;
  licenseKey: string;
  siteDomain: string;
  siteId: string;
}): Promise<
  | { ok: true; entitlement: WebshopActivationResponse }
  | { ok: false; error: string }
> {
  void _siteId;
  const licenseServerUrl = getWebshopRuntimeConfig().licenseApiUrl;
  if (!licenseServerUrl) {
    return { ok: false, error: "Webshop license server is not configured." };
  }

  const deploymentMode = deploymentPlatform.provider === "vercel" ? "vercel" : "self_hosted";
  let identity: Awaited<ReturnType<typeof getOrCreateVendorAddonInstallationIdentity>>;
  try {
    identity = await getOrCreateVendorAddonInstallationIdentity({ canonicalDomain: siteDomain, deploymentMode });
  } catch {
    return { ok: false, error: "Server-only installation identity is not configured." };
  }
  const challengeResponse = await safeFetch(joinUrl(licenseServerUrl, "/api/addons/licenses/activate"), {
    allowFirstParty: true,
    body: JSON.stringify({
      action: "challenge",
      addonKey: "webshop",
      canonicalDomain: siteDomain,
      deploymentMode,
      installationId: identity.installationId,
      installationKeyFingerprint: identity.installationKeyFingerprint,
      installationPublicKey: identity.installationPublicKey,
      licenseKey,
      platformSubject: deploymentPlatform.ownerId,
    }),
    headers: { "content-type": "application/json" }, method: "POST", purpose: "Webshop activation challenge", timeoutMs: 5000,
  }).catch(() => null);
  if (!challengeResponse?.ok) return { ok: false, error: "Webshop license activation challenge was rejected by the license server." };
  const challenge = ActivationChallengeSchema.safeParse(await challengeResponse.json());
  if (!challenge.success) return { ok: false, error: "Webshop license server returned an invalid activation challenge." };
  const response = await safeFetch(joinUrl(licenseServerUrl, "/api/addons/licenses/activate"), {
      allowFirstParty: true,
      body: JSON.stringify({ action: "complete", challengeId: challenge.data.challengeId, challengeSignature: signVendorAddonActivationPayload(identity, challenge.data.signaturePayload) }),
      headers: { "content-type": "application/json" },
      method: "POST", purpose: "Webshop activation completion", timeoutMs: 5000,
  }).catch(() => null);

  if (!response?.ok) {
    return {
      ok: false,
      error: "Webshop license activation was rejected by the license server.",
    };
  }

  const parsed = ActivationResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    return {
      ok: false,
      error: "Webshop license server returned an invalid activation response.",
    };
  }

  return { ok: true, entitlement: parsed.data };
}
