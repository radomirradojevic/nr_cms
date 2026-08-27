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
import { cmsReleaseSha } from "@/.generated/addon-registry";

export const managedAddonActivationResponseV2Schema = z
  .object({
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
    domainVerificationMethod: z.enum([
      "https_well_known",
      "development_allowlist_exemption",
    ]),
    domainVerifiedAt: z.string().datetime(),
    licenseKeyRef: z.string().min(1),
    signingKid: z.string().min(1),
    release: entitlementClaimsV2Schema.shape.release,
  })
  .strict();

export type ManagedAddonActivationResponseV2 = z.infer<
  typeof managedAddonActivationResponseV2Schema
>;

export class ManagedAddonV2ExchangeError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = "ManagedAddonV2ExchangeError";
  }
}

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
    throw new Error(
      "Managed add-on activation returned another add-on release.",
    );
  }
  try {
    return await verifyManagedAddonV2Response({
      addonKey: input.addonKey,
      canonicalDomain: input.canonicalDomain,
      hostCapabilities,
      identity,
      response,
    });
  } catch (error) {
    if (error instanceof ManagedAddonV2ExchangeError) throw error;
    throw new ManagedAddonV2ExchangeError(
      "Managed add-on activation returned an untrusted V2 entitlement.",
      403,
    );
  }
}

export async function revalidateManagedAddonV2(input: {
  activationId: string;
  addonKey: "webshop" | "license-server";
  canonicalDomain: string;
  deploymentMode: "vercel" | "self_hosted";
  installedAddonSchemaVersion: number;
}) {
  const identity = await getOrCreateVendorAddonInstallationIdentity({
    canonicalDomain: input.canonicalDomain,
    deploymentMode: input.deploymentMode,
  });
  const hostCapabilities = currentHostCapabilitiesV1(
    input.installedAddonSchemaVersion,
  );
  const response = await completeManagedAddonV2Exchange({
    endpoint: "/api/addons/licenses/revalidate",
    identity,
    body: {
      activationId: input.activationId,
      canonicalDomain: input.canonicalDomain,
      deploymentMode: input.deploymentMode,
      hostCapabilities,
    },
    purpose: `${input.addonKey} revalidation`,
  });
  if (
    response.activationId !== input.activationId ||
    response.release.addonKey !== input.addonKey
  ) {
    throw new Error(
      "Managed add-on revalidation returned another activation or add-on release.",
    );
  }
  try {
    return await verifyManagedAddonV2Response({
      addonKey: input.addonKey,
      canonicalDomain: input.canonicalDomain,
      hostCapabilities,
      identity,
      response,
    });
  } catch (error) {
    if (error instanceof ManagedAddonV2ExchangeError) throw error;
    throw new ManagedAddonV2ExchangeError(
      "Managed add-on revalidation returned an untrusted V2 entitlement.",
      403,
    );
  }
}

async function verifyManagedAddonV2Response(input: {
  addonKey: "webshop" | "license-server";
  canonicalDomain: string;
  hostCapabilities: ReturnType<typeof currentHostCapabilitiesV1>;
  identity: Awaited<
    ReturnType<typeof getOrCreateVendorAddonInstallationIdentity>
  >;
  response: ManagedAddonActivationResponseV2;
}) {
  const publicKeysByKid = await getVendorAddonEntitlementPublicKeys({
    forceRefresh: true,
  });
  const claims = verifyVendorAddonEntitlement(
    input.response.signedEntitlement,
    {
      addonKey: input.addonKey,
      canonicalDomain: input.canonicalDomain,
      environment: input.response.environment,
      expectedHostCapabilityDescriptorHash: canonicalHostCapabilitiesV1(
        input.hostCapabilities,
      ).hash,
      installationId: input.identity.installationId,
      installationKeyFingerprint: input.identity.installationKeyFingerprint,
      publicKeysByKid,
    },
  );
  if (
    !("release" in claims) ||
    claims.activationId !== input.response.activationId ||
    claims.release.releaseId !== input.response.release.releaseId ||
    claims.release.artifactSha256 !== input.response.release.artifactSha256 ||
    claims.hostCapabilityDescriptorHash !==
      input.response.hostCapabilityDescriptorHash ||
    claims.licenseStatus !== "active" ||
    claims.activationStatus !== "active" ||
    claims.signingKid !== input.response.signingKid ||
    claims.exp * 1000 !==
      Date.parse(input.response.entitlementEnvelopeExpiresAt)
  ) {
    throw new Error(
      "Managed add-on activation response does not match its signed entitlement.",
    );
  }
  return { ...input.response, verifiedClaims: claims };
}

async function completeManagedAddonV2Exchange(input: {
  endpoint: "/api/addons/licenses/activate" | "/api/addons/licenses/revalidate";
  identity: Awaited<
    ReturnType<typeof getOrCreateVendorAddonInstallationIdentity>
  >;
  body: Record<string, unknown>;
  purpose: string;
}) {
  const baseUrl = getMasterLicenseServerUrl();
  const localHttp = isExplicitlyAllowedLoopbackHttpUrl(baseUrl);
  let challengeResponse: Response;
  try {
    challengeResponse = await safeFetch(joinUrl(baseUrl, input.endpoint), {
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
  } catch {
    throw new ManagedAddonV2ExchangeError(
      `${input.purpose} challenge could not reach the Master.`,
    );
  }
  if (!challengeResponse.ok) {
    throw new ManagedAddonV2ExchangeError(
      `${input.purpose} challenge was rejected by the Master.`,
      challengeResponse.status,
    );
  }
  let challenge: ReturnType<typeof parseActivationChallengeV2Response>;
  try {
    challenge = parseActivationChallengeV2Response(
      await challengeResponse.json(),
    );
  } catch {
    throw new ManagedAddonV2ExchangeError(
      `${input.purpose} returned an invalid challenge.`,
      403,
    );
  }
  let completion: Response;
  const challengeSignature = signVendorAddonActivationPayload(
    input.identity,
    challenge.signaturePayload,
  );
  const expiresAt = new Date(challenge.expiresAt);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date()) {
    throw new ManagedAddonV2ExchangeError(
      `${input.purpose} returned an expired challenge.`,
      403,
    );
  }
  const domainProofStore =
    challenge.domainVerification.method === "https_well_known"
      ? await import("@/data/addon-domain-proofs")
      : null;
  if (domainProofStore) {
    await domainProofStore.persistAddonDomainProof({
      canonicalDomain: input.body.canonicalDomain as string,
      challengeId: challenge.challengeId,
      expiresAt,
      installationFingerprintScheme:
        input.identity.installationFingerprintScheme,
      installationId: input.identity.installationId,
      installationKeyFingerprint: input.identity.installationKeyFingerprint,
      proofPayload: Buffer.from(challenge.signaturePayload, "utf8").toString(
        "base64url",
      ),
      proofSignature: challengeSignature,
      purpose: "nr_license_domain_control",
    });
  }
  try {
    completion = await safeFetch(joinUrl(baseUrl, input.endpoint), {
      allowFirstParty: true,
      allowLocalHttp: localHttp,
      allowSelfHosted: true,
      body: JSON.stringify({
        contractVersion: 2,
        action: "complete",
        challengeId: challenge.challengeId,
        challengeSignature,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
      purpose: `${input.purpose} completion`,
      timeoutMs: 5_000,
    });
  } catch {
    throw new ManagedAddonV2ExchangeError(
      `${input.purpose} completion could not reach the Master.`,
    );
  }
  if (!completion.ok) {
    throw new ManagedAddonV2ExchangeError(
      `${input.purpose} was rejected by the Master.`,
      completion.status,
    );
  }
  if (domainProofStore) {
    await domainProofStore.completeAddonDomainProof(challenge.challengeId);
  }
  try {
    return managedAddonActivationResponseV2Schema.parse(
      await completion.json(),
    );
  } catch {
    throw new ManagedAddonV2ExchangeError(
      `${input.purpose} returned an invalid V2 response.`,
      403,
    );
  }
}

function currentLicenseEnvironment(): "development" | "staging" | "production" {
  const value = process.env.NR_LICENSE_ENVIRONMENT;
  if (
    value === "development" ||
    value === "staging" ||
    value === "production"
  ) {
    return value;
  }
  throw new Error("NR_LICENSE_ENVIRONMENT is required for activation.");
}

function currentHostCapabilitiesV1(installedAddonSchemaVersion: number) {
  const cmsCommitSha = process.env.NR_CMS_RELEASE_SHA?.trim() || cmsReleaseSha;
  if (!cmsCommitSha) {
    throw new Error(
      "NR_CMS_RELEASE_SHA is required for signed activation host capabilities.",
    );
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
