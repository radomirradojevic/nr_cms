import { z } from "zod";

import { getMasterLicenseServerUrl } from "@/lib/master-license-server";
import {
  isExplicitlyAllowedLoopbackHttpUrl,
  safeFetch,
} from "@/lib/security/outbound-url";
import {
  buildHostCapabilitiesV1,
  canonicalHostCapabilitiesV1,
  entitlementClaimsV2Schema,
} from "@/lib/vendor-addon-entitlements/activation-v2-contract";
import { parseActivationChallengeV2Response } from "@/lib/vendor-addon-entitlements/activation-challenge-v2";
import { getVendorAddonEntitlementPublicKeys } from "@/lib/vendor-addon-entitlements/public-keys";
import { verifyVendorAddonEntitlement } from "@/lib/vendor-addon-entitlements/verified-entitlement";
import {
  getOrCreateVendorAddonInstallationIdentity,
  signVendorAddonActivationPayload,
} from "@/lib/vendor-addon-installation";

export const managedAddonActivationResponseV2Schema = z.object({
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

export type ManagedAddonActivationResponseV2 = z.infer<
  typeof managedAddonActivationResponseV2Schema
>;

export async function activateManagedAddonV2(input: {
  addonKey: "webshop" | "license-server";
  canonicalDomain: string;
  deploymentMode: "vercel" | "self_hosted";
  installedAddonSchemaVersion: number;
  licenseKey: string;
  platformSubject: string;
}) {
  const identity = await getOrCreateVendorAddonInstallationIdentity({
    canonicalDomain: input.canonicalDomain,
    deploymentMode: input.deploymentMode,
  });
  const hostCapabilities = currentHostCapabilitiesV1(
    input.installedAddonSchemaVersion,
  );
  const response = await completeManagedAddonV2Exchange({
    endpoint: "/api/addons/licenses/activate",
    identity,
    body: {
      addonKey: input.addonKey,
      canonicalDomain: input.canonicalDomain,
      deploymentMode: input.deploymentMode,
      hostCapabilities,
      licenseKey: input.licenseKey,
      platformSubject: input.platformSubject,
    },
    purpose: `${input.addonKey} activation`,
  });
  if (response.release.addonKey !== input.addonKey) {
    throw new Error("Managed add-on activation returned another add-on release.");
  }
  const publicKeysByKid = await getVendorAddonEntitlementPublicKeys({
    forceRefresh: true,
  });
  const claims = verifyVendorAddonEntitlement(response.signedEntitlement, {
    addonKey: input.addonKey,
    canonicalDomain: input.canonicalDomain,
    environment: response.environment,
    expectedHostCapabilityDescriptorHash:
      canonicalHostCapabilitiesV1(hostCapabilities).hash,
    installationId: identity.installationId,
    installationKeyFingerprint: identity.installationKeyFingerprint,
    publicKeysByKid,
  });
  if (
    !("release" in claims) ||
    claims.activationId !== response.activationId ||
    claims.release.releaseId !== response.release.releaseId ||
    claims.release.artifactSha256 !== response.release.artifactSha256 ||
    claims.hostCapabilityDescriptorHash !== response.hostCapabilityDescriptorHash ||
    claims.licenseStatus !== "active" ||
    claims.activationStatus !== "active" ||
    claims.signingKid !== response.signingKid ||
    claims.exp * 1000 !== Date.parse(response.entitlementEnvelopeExpiresAt)
  ) {
    throw new Error("Managed add-on activation response does not match its signed entitlement.");
  }
  return { ...response, verifiedClaims: claims };
}

async function completeManagedAddonV2Exchange(input: {
  endpoint: "/api/addons/licenses/activate" | "/api/addons/licenses/revalidate";
  identity: Awaited<ReturnType<typeof getOrCreateVendorAddonInstallationIdentity>>;
  body: Record<string, unknown>;
  purpose: string;
}) {
  const baseUrl = getMasterLicenseServerUrl();
  const localHttp = isExplicitlyAllowedLoopbackHttpUrl(baseUrl);
  const challengeResponse = await safeFetch(joinUrl(baseUrl, input.endpoint), {
    allowFirstParty: true,
    allowLocalHttp: localHttp,
    allowSelfHosted: true,
    body: JSON.stringify({
      contractVersion: 2,
      action: "challenge",
      installationId: input.identity.installationId,
      installationKeyFingerprint: input.identity.installationKeyFingerprint,
      installationPublicKey: input.identity.installationPublicKey,
      licenseEnvironment: currentLicenseEnvironment(),
      ...input.body,
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
    purpose: `${input.purpose} challenge`,
    timeoutMs: 5_000,
  });
  if (!challengeResponse.ok) {
    throw new Error(`${input.purpose} challenge was rejected by the Master.`);
  }
  const challenge = parseActivationChallengeV2Response(
    await challengeResponse.json(),
  );
  const completion = await safeFetch(joinUrl(baseUrl, input.endpoint), {
    allowFirstParty: true,
    allowLocalHttp: localHttp,
    allowSelfHosted: true,
    body: JSON.stringify({
      contractVersion: 2,
      action: "complete",
      challengeId: challenge.challengeId,
      challengeSignature: signVendorAddonActivationPayload(
        input.identity,
        challenge.signaturePayload,
      ),
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
    purpose: `${input.purpose} completion`,
    timeoutMs: 5_000,
  });
  if (!completion.ok) throw new Error(`${input.purpose} was rejected by the Master.`);
  return managedAddonActivationResponseV2Schema.parse(await completion.json());
}

function currentLicenseEnvironment(): "development" | "staging" | "production" {
  const value = process.env.NR_LICENSE_ENVIRONMENT;
  if (value === "development" || value === "staging" || value === "production") {
    return value;
  }
  throw new Error("NR_LICENSE_ENVIRONMENT is required for activation.");
}

function currentHostCapabilitiesV1(installedAddonSchemaVersion: number) {
  const cmsCommitSha = process.env.NR_CMS_RELEASE_SHA?.trim();
  if (!cmsCommitSha) {
    throw new Error("NR_CMS_RELEASE_SHA is required for signed activation host capabilities.");
  }
  return buildHostCapabilitiesV1({
    cmsCommitSha,
    cmsVersion: process.env.NR_CMS_VERSION?.trim() || "0.1.0",
    coreSchemaVersion: 1,
    installedAddonSchemaVersion,
  });
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
