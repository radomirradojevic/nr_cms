import "server-only";

import {
  completeAddonDomainProof,
  persistAddonDomainProof,
  readAddonDomainProof,
} from "@/data/addon-domain-proofs";
import { getGlobalSettings } from "@/data/global-settings";
import { canonicalizeLicenseDomain } from "@/lib/license-domain";
import { getMasterLicenseServerUrl } from "@/lib/master-license-server";
import {
  getOrCreateVendorAddonInstallationIdentity,
  signVendorAddonActivationPayload,
} from "@/lib/vendor-addon-installation";
import {
  configuredWebshopVendorAudience,
  parseWebshopBuyUrl,
} from "@/lib/webshop-addon/buy-url-contract";
import {
  isExplicitlyAllowedLoopbackHttpUrl,
  safeFetch,
} from "@/lib/security/outbound-url";

const PURCHASE_INTENT_ENDPOINT = "/api/addons/purchase-intents";
const MANAGED_ADDON_OFFERS = Object.freeze({
  "license-server": {
    defaultOfferKey: "nr-cms-license-server-license",
    environmentName: "LICENSE_SERVER_BUY_OFFER_KEY",
    label: "License Server add-on",
  },
  webshop: {
    defaultOfferKey: "nr-cms-webshop-license",
    environmentName: "WEBSHOP_BUY_OFFER_KEY",
    label: "Webshop add-on",
  },
} as const);

export type ManagedAddonPurchaseKey = keyof typeof MANAGED_ADDON_OFFERS;

type PurchaseChallenge = {
  challengeId: string;
  contractVersion: 1;
  domainVerification: {
    method: "development_allowlist_exemption" | "https_well_known";
    path?: string;
    required: boolean;
  };
  expiresAt: string;
  proofPayload: string;
};

type PurchaseComplete = {
  contractVersion: 1;
  expiresAt: string;
  purchaseIntent: string;
  purchaseIntentId: string;
};

export type WebshopPurchaseIntentHandoff = {
  action: string;
  purchaseIntent: string;
};

export type ManagedAddonPurchaseIntentHandoff = WebshopPurchaseIntentHandoff;

/**
 * Creates one short-lived master-signed bearer only on the server. Browser
 * code receives it solely as the hidden field of a cross-origin POST form.
 */
export async function createWebshopPurchaseIntentHandoff(): Promise<WebshopPurchaseIntentHandoff> {
  return createManagedAddonPurchaseIntentHandoff("webshop");
}

export async function createLicenseServerPurchaseIntentHandoff(): Promise<ManagedAddonPurchaseIntentHandoff> {
  return createManagedAddonPurchaseIntentHandoff("license-server");
}

async function createManagedAddonPurchaseIntentHandoff(
  addonKey: ManagedAddonPurchaseKey,
): Promise<ManagedAddonPurchaseIntentHandoff> {
  const offer = MANAGED_ADDON_OFFERS[addonKey];
  const [settings, configured] = await Promise.all([
    getGlobalSettings(),
    Promise.resolve(parseWebshopBuyUrl(requireBuyUrl())),
  ]);
  const siteUrl =
    settings.publicSiteUrl ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL;
  if (!siteUrl) {
    throw new Error(`A public CMS URL is required to purchase the ${offer.label}.`);
  }
  const canonicalDomain = canonicalizeLicenseDomain(siteUrl);
  const identity = await getOrCreateVendorAddonInstallationIdentity({
    canonicalDomain,
    deploymentMode: currentDeploymentMode(),
  });
  const masterUrl = getMasterLicenseServerUrl();
  const localHttp = isExplicitlyAllowedLoopbackHttpUrl(masterUrl);
  const challenge = await postMaster<PurchaseChallenge>(masterUrl, {
    action: "challenge",
    addonKey,
    canonicalDomain,
    contractVersion: 1,
    installationFingerprintScheme: identity.installationFingerprintScheme,
    installationId: identity.installationId,
    installationKeyFingerprint: identity.installationKeyFingerprint,
    installationPublicKey: identity.installationPublicKey,
    offerKey:
      process.env[offer.environmentName]?.trim() || offer.defaultOfferKey,
    vendorAudience: configured.vendorAudience,
  }, localHttp, `${offer.label} purchase challenge`);

  if (
    challenge.contractVersion !== 1 ||
    !challenge.challengeId ||
    !challenge.proofPayload ||
    !challenge.expiresAt ||
    (challenge.domainVerification.method !== "https_well_known" &&
      challenge.domainVerification.method !== "development_allowlist_exemption")
  ) {
    throw new Error("The master purchase challenge response is invalid.");
  }
  const proofSignature = signVendorAddonActivationPayload(
    identity,
    Buffer.from(challenge.proofPayload, "base64url").toString("utf8"),
  );
  const expiresAt = new Date(challenge.expiresAt);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date()) {
    throw new Error("The master purchase challenge is already expired.");
  }

  // The master fetches this durable row only for production HTTPS proof. It
  // stores the PoP, never the eventual purchase JWS.
  await persistAddonDomainProof({
    canonicalDomain,
    challengeId: challenge.challengeId,
    expiresAt,
    installationFingerprintScheme: identity.installationFingerprintScheme,
    installationId: identity.installationId,
    installationKeyFingerprint: identity.installationKeyFingerprint,
    proofPayload: challenge.proofPayload,
    proofSignature,
    purpose: "nr_license_domain_control",
  });

  const complete = await postMaster<PurchaseComplete>(masterUrl, {
    action: "complete",
    challengeId: challenge.challengeId,
    contractVersion: 1,
    installationFingerprintScheme: identity.installationFingerprintScheme,
    installationId: identity.installationId,
    installationKeyFingerprint: identity.installationKeyFingerprint,
    proofSignature,
  }, localHttp, `${offer.label} purchase completion`);
  if (
    complete.contractVersion !== 1 ||
    !isCompactJws(complete.purchaseIntent) ||
    !complete.purchaseIntentId
  ) {
    throw new Error("The master purchase intent response is invalid.");
  }
  await completeAddonDomainProof(challenge.challengeId);
  return { action: configured.url.toString(), purchaseIntent: complete.purchaseIntent };
}

export async function readWebshopPurchaseIntentDomainProof(challengeId: string) {
  return readAddonDomainProof(challengeId);
}

async function postMaster<T>(
  masterUrl: string,
  body: Record<string, unknown>,
  localHttp: boolean,
  purpose: string,
): Promise<T> {
  const response = await safeFetch(`${masterUrl}${PURCHASE_INTENT_ENDPOINT}`, {
    allowFirstParty: true,
    allowLocalHttp: localHttp,
    allowSelfHosted: true,
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
    purpose,
    timeoutMs: 8_000,
  });
  if (!response.ok) {
    throw new Error(`${purpose} was rejected. Please retry from this activation screen.`);
  }
  return response.json() as Promise<T>;
}

function requireBuyUrl() {
  const value = process.env.WEBSHOP_BUY_URL?.trim();
  if (!value) throw new Error("WEBSHOP_BUY_URL must be configured.");
  return value;
}

function currentDeploymentMode(): "vercel" | "self_hosted" | "other" {
  const configured = process.env.WEBSHOP_DEPLOYMENT_MODE?.trim().toLowerCase();
  if (configured === "vercel") return "vercel";
  if (configured === "self_hosted") return "self_hosted";
  return "other";
}

function isCompactJws(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 16_384 &&
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)
  );
}

export { configuredWebshopVendorAudience };
