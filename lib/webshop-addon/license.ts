import { z } from "zod";
import { getMasterLicenseServerUrl } from "@/lib/master-license-server";
import {
  isExplicitlyAllowedLoopbackHttpUrl,
  safeFetch,
} from "@/lib/security/outbound-url";

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
import {
  verifyWebshopAddonEntitlementV2,
} from "@/lib/vendor-addon-entitlements/verified-entitlement";
import { getVendorAddonEntitlementPublicKeys } from "@/lib/vendor-addon-entitlements/public-keys";
import {
  getOrCreateVendorAddonInstallationIdentity,
  signVendorAddonActivationPayload,
} from "@/lib/vendor-addon-installation";
import {
  buildHostCapabilitiesV1,
  canonicalHostCapabilitiesV1,
  entitlementClaimsV2Schema,
} from "@/lib/vendor-addon-entitlements/activation-v2-contract";
import { parseActivationChallengeV2Response } from "@/lib/vendor-addon-entitlements/activation-challenge-v2";
import { evaluateWebshopPublicServingGateV1 } from "@/lib/addon-runtime/serving-gate";
import {
  addonReleaseMetadata,
  cmsCoreSchemaVersion,
  cmsReleaseSha,
  cmsVersion,
  managedRuntimeBuildId,
} from "@/.generated/addon-registry";
import { resolvePersistentV2EntitlementRuntimeMode } from "@/lib/vendor-addon-entitlements/revalidation-policy";

export const WebshopActivationResponseSchema = z.object({
  ok: z.literal(true),
  contractVersion: z.literal(2),
  activationId: z.string().uuid(),
  signedEntitlement: z.string().min(1),
  entitlementEnvelopeExpiresAt: z.string().datetime(),
  licenseValidUntil: z.string().datetime().nullable(),
  nextRevalidationAt: z.string().datetime(),
  graceEndsAt: z.string().datetime().nullable(),
  environment: z.enum(["development", "staging", "production"]),
  installationId: z.string().uuid(),
  installationKeyFingerprint: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  hostCapabilityDescriptorHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  domainVerificationChallengeId: z.string().uuid(),
  domainVerificationMethod: z.enum(["https_well_known", "development_allowlist_exemption"]),
  domainVerifiedAt: z.string().datetime(),
  licenseKeyRef: z.string().min(1),
  signingKid: z.string().min(1),
  release: entitlementClaimsV2Schema.shape.release,
}).strict();
export type WebshopActivationResponse = z.infer<
  typeof WebshopActivationResponseSchema
>;
export type VerifiedWebshopActivationResponse = WebshopActivationResponse & {
  verifiedClaims: ReturnType<typeof verifyActivationResponse>;
};

export type WebshopEntitlementState = {
  entitlementToken?: string | null;
  signedEntitlement?: string | null;
  expiresAt?: Date | null;
  entitlementEnvelopeExpiresAt?: Date | null;
  graceEndsAt?: Date | null;
  lastErrorCode?: string | null;
  lastRevalidationSuccessAt?: Date | null;
  nextRevalidationAt?: Date | null;
  licenseEnvironment?: string | null;
  licenseValidUntil?: Date | null;
  verifiedClaims?: unknown;
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

class RevalidationFailure extends Error {
  constructor(
    readonly classification: "outage" | "invalid",
    message: string,
  ) {
    super(message);
  }
}

export function verifyWebshopSignedEntitlement(
  entitlement: WebshopEntitlementState,
  canonicalDomain: string,
  now = new Date(),
  publicKeysByKid: Record<string, string> = {},
) {
  if (
    !(entitlement.signedEntitlement ?? entitlement.entitlementToken) ||
    !entitlement.installationId ||
    !entitlement.installationKeyFingerprint
  )
    throw new Error("Webshop signed entitlement cache is incomplete.");
  const cached = metadataRecord(entitlement.verifiedClaims);
  const hostCapabilityDescriptorHash = cached.hostCapabilityDescriptorHash;
  const environment = entitlement.licenseEnvironment;
  if (
    typeof hostCapabilityDescriptorHash !== "string" ||
    (environment !== "development" &&
      environment !== "staging" &&
      environment !== "production")
  ) {
    throw new Error("Webshop V2 entitlement cache is incomplete.");
  }
  return verifyWebshopAddonEntitlementV2(
    entitlement.signedEntitlement ?? entitlement.entitlementToken!,
    {
    addonKey: "webshop",
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

export type InstalledWebshopLicenseModeResult =
  | { status: "ready"; mode: "ready" }
  | { status: "license_expired"; mode: "edit_existing_only" }
  | { status: "forbidden"; reason: string };

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

async function readLicenseServerError(
  response: Response | null,
  fallback: string,
) {
  if (!response) return fallback;
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string" && body.error.trim()) {
      return body.error;
    }
  } catch {
    // Keep the stable fallback when the remote response is not JSON.
  }
  return fallback;
}

export function resolveWebshopAddonStateFromInputs({
  entitlement,
  loadResult,
  now = new Date(),
  platform,
  runtimeConfig = getWebshopRuntimeConfig(),
  publicKeysByKid = {},
  verifySignedEntitlement = true,
}: {
  entitlement: WebshopEntitlementState | null;
  loadResult: WebshopAddonLoadResult;
  now?: Date;
  platform?: WebshopDeploymentPlatform;
  runtimeConfig?: WebshopRuntimeConfig;
  publicKeysByKid?: Record<string, string>;
  verifySignedEntitlement?: boolean;
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

  if (verifySignedEntitlement) {
    try {
      verifyWebshopSignedEntitlement(
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
            : "Webshop entitlement signature is invalid.",
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

export function shouldForceWebshopInstallReconciliation(
  entitlement: WebshopEntitlementState | null,
  loadResult: WebshopAddonLoadResult,
) {
  return (
    loadResult.status === "loaded" && entitlement?.status === "install_pending"
  );
}

function expectedDomain() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    "unknown"
  );
}

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
    return resolveWebshopAddonStateFromInputs({
      entitlement,
      loadResult,
      runtimeConfig,
    });
  }

  const storedEntitlement = await getWebshopAddonEntitlement();
  const entitlement = shouldForceWebshopInstallReconciliation(
    storedEntitlement,
    loadResult,
  )
    ? ((await revalidateWebshopAddonEntitlement({ force: true })).entitlement ??
      storedEntitlement)
    : await maybeRevalidateWebshopAddonEntitlement(storedEntitlement);
  const publicKeysByKid = entitlement?.entitlementToken
    ? await getVendorAddonEntitlementPublicKeys().catch(() => ({}))
    : {};
  const resolved = resolveWebshopAddonStateFromInputs({
    entitlement,
    loadResult,
    publicKeysByKid,
    runtimeConfig,
  });
  if (entitlement && resolved.status === "ready") {
    try {
      const claim = verifyWebshopSignedEntitlement(
        entitlement,
        expectedDomain(),
        new Date(),
        publicKeysByKid,
      );
      const persistentMode = resolvePersistentV2EntitlementRuntimeMode({
        activationStatus: claim.activationStatus,
        envelopeExpiresAt: entitlement.entitlementEnvelopeExpiresAt ?? null,
        graceEndsAt: entitlement.graceEndsAt ?? null,
        lastErrorCode: entitlement.lastErrorCode ?? null,
        lastSuccessAt: entitlement.lastRevalidationSuccessAt ?? null,
        licenseStatus: claim.licenseStatus,
        licenseValidUntil: entitlement.licenseValidUntil ?? null,
      });
      if (persistentMode === "revoked") {
        return { status: "license_invalid", reason: "Webshop activation lifecycle is no longer active." };
      }
      if (persistentMode === "expired") {
        return loadResult.status === "loaded"
          ? { status: "license_expired", addon: loadResult.addon, expiresAt: entitlement.licenseValidUntil?.toISOString() ?? "", mode: "edit_existing_only" }
          : { status: "license_invalid", reason: "Webshop entitlement runtime is unavailable." };
      }
    } catch {
      return { status: "license_invalid", reason: "Webshop entitlement snapshot cannot be used." };
    }
  }
  if (
    resolved.status !== "ready" ||
    !["managed_redeploy", "preinstalled"].includes(runtimeConfig.installMode)
  )
    return resolved;
  const { readWebshopServingStateV1 } = await import("@/data/webshop-addon-serving-state");
  const serving = await readWebshopServingStateV1();
  const embedded = addonReleaseMetadata.webshop;
  const gate = evaluateWebshopPublicServingGateV1({
    entitlementValid: true,
    activeServingFenceCount: serving.activeServingFenceCount,
    installation: serving.installation && { status: serving.installation.status, runtimeStatus: serving.installation.runtimeStatus, installedReleaseId: serving.installation.installedReleaseId, installedBuildId: serving.installation.installedBuildId, installedArtifactSha256: serving.installation.installedArtifactSha256 },
    terminalReceipt: serving.terminalReceipt,
    runtime: {
      releaseId: runtimeConfig.runtimeReleaseId ?? embedded?.releaseId ?? null,
      buildId: (runtimeConfig.runtimeBuildId ?? managedRuntimeBuildId) || null,
      artifactSha256:
        runtimeConfig.runtimeArtifactSha256 ??
        embedded?.artifactSha256 ??
        null,
    },
  });
  return gate.ok ? resolved : { status: "install_pending" };
}

export async function revalidateWebshopAddonEntitlement({
  force = true,
}: { force?: boolean } = {}) {
  const { getWebshopAddonEntitlement } =
    await import("@/data/webshop-addon-entitlement");
  const { persistVerifiedWebshopActivation } =
    await import("@/data/webshop-addon-control-plane");
  const entitlement = await getWebshopAddonEntitlement();
  if (!entitlement || !(entitlement.signedEntitlement ?? entitlement.entitlementToken))
    return {
      entitlement,
      ok: false as const,
      error: "Webshop entitlement is missing.",
    };
  if (!force && !shouldRevalidateWebshopEntitlement(entitlement))
    return { entitlement, ok: true as const, skipped: true as const };
  const cached = metadataRecord(entitlement.verifiedClaims);
  const activationId =
    typeof cached.activationId === "string"
      ? cached.activationId
      : metadataString(entitlement.metadata, "activationId");
  if (!activationId)
    return {
      entitlement,
      ok: false as const,
      error: "Webshop activation reference is missing.",
    };
  let identity: Awaited<ReturnType<typeof getOrCreateVendorAddonInstallationIdentity>>;
  try {
    identity = await getOrCreateVendorAddonInstallationIdentity({
      canonicalDomain: expectedDomain(),
      deploymentMode: "self_hosted",
    });
  } catch {
    return { entitlement, ok: false as const, error: "Webshop installation identity requires recovery before revalidation." };
  }
  try {
    const response = await completeV2LicenseExchange({
      endpoint: "/api/addons/licenses/revalidate",
      identity,
      body: {
        activationId,
        canonicalDomain: expectedDomain(),
        deploymentMode: identity.deploymentMode,
        hostCapabilities: currentHostCapabilitiesV1(0),
      },
      purpose: "Webshop entitlement revalidation",
    });
    const publicKeysByKid = await getVendorAddonEntitlementPublicKeys({ forceRefresh: true });
    const claims = verifyActivationResponse(response, {
      canonicalDomain: expectedDomain(),
      expectedHostCapabilityDescriptorHash:
        canonicalHostCapabilitiesV1(currentHostCapabilitiesV1(0)).hash,
      identity,
      publicKeysByKid,
    });
    await persistVerifiedWebshopActivation({
      claim: claims,
      signedEntitlement: response.signedEntitlement,
      updatedBy: "system",
    });
    return {
      entitlement: await getWebshopAddonEntitlement(),
      ok: true as const,
    };
  } catch (error) {
    const classification = error instanceof RevalidationFailure ? error.classification : "invalid";
    await persistRevalidationFailure(classification);
    return { entitlement: await getWebshopAddonEntitlement(), ok: false as const, error: classification === "outage" ? "Webshop entitlement revalidation is temporarily unavailable." : "Webshop entitlement revalidation failed closed." };
  }
}

export function shouldRevalidateWebshopEntitlement(
  entitlement: WebshopEntitlementState | null,
  now = new Date(),
) {
  const next = entitlement?.nextRevalidationAt;
  return (
    Boolean(entitlement?.entitlementToken) &&
    (!next || next.getTime() <= now.getTime())
  );
}
async function maybeRevalidateWebshopAddonEntitlement(
  entitlement: WebshopEntitlementState | null,
) {
  if (!shouldRevalidateWebshopEntitlement(entitlement)) return entitlement;
  return (
    (await revalidateWebshopAddonEntitlement({ force: true })).entitlement ??
    entitlement
  );
}
function metadataRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function metadataString(value: unknown, key: string) {
  const found = metadataRecord(value)[key];
  return typeof found === "string" ? found : null;
}

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
  const entitlement = await getWebshopAddonEntitlement();
  if (entitlement?.entitlementToken) {
    try {
      verifyWebshopSignedEntitlement(
        entitlement,
        expectedDomain(),
        new Date(),
        await getVendorAddonEntitlementPublicKeys(),
      );
    } catch {
      return {
        status: "forbidden",
        reason: "Webshop entitlement signature is invalid.",
      };
    }
  }
  return resolveInstalledWebshopLicenseModeFromEntitlement(entitlement);
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
  | { ok: true; entitlement: VerifiedWebshopActivationResponse }
  | { ok: false; error: string }
> {
  void _siteId;
  const deploymentMode =
    deploymentPlatform.provider === "vercel" ? "vercel" : "self_hosted";
  let identity: Awaited<
    ReturnType<typeof getOrCreateVendorAddonInstallationIdentity>
  >;
  try {
    identity = await getOrCreateVendorAddonInstallationIdentity({
      canonicalDomain: siteDomain,
      deploymentMode,
    });
  } catch {
    return {
      ok: false,
      error: "Server-only installation identity is not configured.",
    };
  }
  try {
    const hostCapabilities = currentHostCapabilitiesV1(0);
    const response = await completeV2LicenseExchange({
      endpoint: "/api/addons/licenses/activate",
      identity,
      body: {
        addonKey: "webshop",
        canonicalDomain: siteDomain,
        deploymentMode,
        hostCapabilities,
        licenseKey,
        platformSubject: deploymentPlatform.ownerId,
      },
      purpose: "Webshop activation",
    });
    const publicKeysByKid = await getVendorAddonEntitlementPublicKeys({ forceRefresh: true });
    const verifiedClaims = verifyActivationResponse(response, {
      canonicalDomain: siteDomain,
      expectedHostCapabilityDescriptorHash: canonicalHostCapabilitiesV1(hostCapabilities).hash,
      identity,
      publicKeysByKid,
    });
    return { ok: true, entitlement: { ...response, verifiedClaims } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error
        ? error.message
        : "Webshop license activation was rejected by the license server.",
    };
  }
}

async function completeV2LicenseExchange(input: {
  endpoint: "/api/addons/licenses/activate" | "/api/addons/licenses/revalidate";
  identity: Awaited<ReturnType<typeof getOrCreateVendorAddonInstallationIdentity>>;
  body: Record<string, unknown>;
  purpose: string;
}): Promise<WebshopActivationResponse> {
  const licenseServerUrl = getMasterLicenseServerUrl();
  const localHttp = isExplicitlyAllowedLoopbackHttpUrl(licenseServerUrl);
  let challengeResponse: Response;
  try {
    challengeResponse = await safeFetch(joinUrl(licenseServerUrl, input.endpoint), {
      allowFirstParty: true, allowLocalHttp: localHttp, allowSelfHosted: true,
      body: JSON.stringify({
        contractVersion: 2, action: "challenge", installationId: input.identity.installationId,
        installationKeyFingerprint: input.identity.installationKeyFingerprint,
        installationPublicKey: input.identity.installationPublicKey, licenseEnvironment: currentLicenseEnvironment(),
        ...input.body,
      }),
      headers: { "content-type": "application/json" }, method: "POST",
      purpose: `${input.purpose} challenge`, timeoutMs: 5_000,
    });
  } catch {
    throw new RevalidationFailure("outage", "Webshop license server could not be reached.");
  }
  if (!challengeResponse.ok) {
    const message = await readLicenseServerError(challengeResponse, `${input.purpose} challenge was rejected by the license server.`);
    throw new RevalidationFailure(challengeResponse.status >= 500 ? "outage" : "invalid", message);
  }
  let challenge: ReturnType<typeof parseActivationChallengeV2Response>;
  try {
    challenge = parseActivationChallengeV2Response(await challengeResponse.json());
  } catch {
    throw new RevalidationFailure("invalid", "Webshop license server returned an invalid V2 challenge.");
  }
  let completion: Response;
  try {
    completion = await safeFetch(joinUrl(licenseServerUrl, input.endpoint), {
      allowFirstParty: true, allowLocalHttp: localHttp, allowSelfHosted: true,
      body: JSON.stringify({
        contractVersion: 2, action: "complete", challengeId: challenge.challengeId,
        challengeSignature: signVendorAddonActivationPayload(input.identity, challenge.signaturePayload),
      }),
      headers: { "content-type": "application/json" }, method: "POST",
      purpose: `${input.purpose} completion`, timeoutMs: 5_000,
    });
  } catch {
    throw new RevalidationFailure("outage", "Webshop license server completion could not be reached.");
  }
  if (!completion.ok) {
    const message = await readLicenseServerError(completion, `${input.purpose} was rejected by the license server.`);
    throw new RevalidationFailure(completion.status >= 500 ? "outage" : "invalid", message);
  }
  const parsed = WebshopActivationResponseSchema.safeParse(await completion.json());
  if (!parsed.success) throw new RevalidationFailure("invalid", "Webshop license server returned an invalid V2 activation response.");
  return parsed.data;
}

async function persistRevalidationFailure(classification: "outage" | "invalid") {
  const { db } = await import("@/db");
  const { webshopAddonEntitlements } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  await db
    .update(webshopAddonEntitlements)
    .set({
      lastErrorCode:
        classification === "outage"
          ? "revalidation_network_outage"
          : "revalidation_invalid_response",
      lastRevalidationAttemptAt: new Date(),
      // A signed invalid/domain/auth response never receives outage grace.
      ...(classification === "invalid" ? { status: "invalid" as const } : {}),
      updatedBy: "system:revalidation",
    })
    .where(eq(webshopAddonEntitlements.id, 1));
}

function verifyActivationResponse(
  response: WebshopActivationResponse,
  input: {
    canonicalDomain: string;
    expectedHostCapabilityDescriptorHash: string;
    identity: Awaited<ReturnType<typeof getOrCreateVendorAddonInstallationIdentity>>;
    publicKeysByKid: Record<string, string>;
  },
) {
  const claims = verifyWebshopAddonEntitlementV2(response.signedEntitlement, {
    addonKey: "webshop", canonicalDomain: input.canonicalDomain,
    environment: response.environment,
    expectedHostCapabilityDescriptorHash: input.expectedHostCapabilityDescriptorHash,
    installationId: input.identity.installationId,
    installationKeyFingerprint: input.identity.installationKeyFingerprint,
    publicKeysByKid: input.publicKeysByKid,
  });
  if (
    claims.activationId !== response.activationId ||
    claims.environment !== response.environment ||
    claims.installationId !== response.installationId ||
    claims.installationKeyFingerprint !== response.installationKeyFingerprint ||
    claims.hostCapabilityDescriptorHash !== response.hostCapabilityDescriptorHash ||
    claims.domainVerificationChallengeId !== response.domainVerificationChallengeId ||
    claims.domainVerificationMethod !== response.domainVerificationMethod ||
    claims.domainVerifiedAt !== response.domainVerifiedAt ||
    claims.signingKid !== response.signingKid ||
    claims.licenseValidUntil !== response.licenseValidUntil ||
    claims.nextRevalidationAt !== response.nextRevalidationAt ||
    claims.graceEndsAt !== response.graceEndsAt ||
    claims.release.releaseId !== response.release.releaseId ||
    claims.release.artifactSha256 !== response.release.artifactSha256 ||
    claims.licenseStatus !== "active" ||
    claims.activationStatus !== "active"
  ) throw new Error("Webshop activation response does not exactly match its verified entitlement.");
  if (new Date(response.entitlementEnvelopeExpiresAt).getTime() !== claims.exp * 1000) throw new Error("Webshop entitlement envelope expiry does not match its signed claim.");
  return { ...claims, signingKid: response.signingKid };
}

function currentLicenseEnvironment(): "development" | "staging" | "production" {
  const value = process.env.NR_LICENSE_ENVIRONMENT;
  if (value === "development" || value === "staging" || value === "production") return value;
  throw new Error("NR_LICENSE_ENVIRONMENT is required for activation.");
}
function currentHostCapabilitiesV1(installedAddonSchemaVersion: number) {
  const cmsCommitSha = process.env.NR_CMS_RELEASE_SHA?.trim() || cmsReleaseSha;
  if (!cmsCommitSha) throw new Error("NR_CMS_RELEASE_SHA is required for signed activation host capabilities.");
  return buildHostCapabilitiesV1({
    cmsCommitSha,
    cmsVersion,
    coreSchemaVersion: cmsCoreSchemaVersion,
    installedAddonSchemaVersion,
  });
}
