import { createPublicKey, verify } from "node:crypto";

import { z } from "zod";

import { canonicalizeLicenseDomain } from "@/lib/license-domain";
import {
  canonicalJson,
  entitlementClaimsV2Schema,
  type AddonEntitlementClaimsV2,
} from "@/lib/vendor-addon-entitlements/activation-v2-contract";

export const VENDOR_ADDON_ENTITLEMENT_AUDIENCE = "nr-cms-addon-runtime";
export const VENDOR_ADDON_ENTITLEMENT_ISSUER = "https://license-server.nrcms.com";
const MAX_TOKEN_BYTES = 16_384;
const CLOCK_SKEW_SECONDS = 300;

export type VerifiedManagedAddonEntitlement = AddonEntitlementClaimsV2 & {
  signingKid: string;
};
export type VerifiedWebshopAddonEntitlement = VerifiedManagedAddonEntitlement;

export type V2VerificationContext = {
  addonKey: "webshop" | "license-server";
  canonicalDomain: string;
  environment: "development" | "staging" | "production";
  expectedHostCapabilityDescriptorHash: string;
  installationId: string;
  installationKeyFingerprint: string;
  now?: Date;
  publicKeysByKid: Record<string, string>;
};
type LegacyVerificationContext = {
  addonKey: "webshop" | "license-server" | "webConference";
  canonicalDomain: string;
  installationId: string;
  installationKeyFingerprint: string;
  now?: Date;
  publicKeysByKid: Record<string, string>;
};
export type VendorEntitlementVerificationContext =
  | V2VerificationContext
  | LegacyVerificationContext;
export type VerifiedVendorAddonEntitlement = {
  v: 1;
  iss: typeof VENDOR_ADDON_ENTITLEMENT_ISSUER;
  aud: typeof VENDOR_ADDON_ENTITLEMENT_AUDIENCE;
  jti: string;
  entitlementId: string;
  activationId: string;
  addonKey: "webshop" | "license-server" | "webConference";
  installationId: string;
  installationKeyFingerprint: string;
  canonicalDomain: string;
  status: "active" | "suspended" | "expired" | "revoked" | "canceled";
  features: string[];
  edition: string;
  activationLimit: number;
  validUntil: string | null;
  updatesUntil: string | null;
  existingLicensePolicy: "allow_existing" | "disabled";
  iat: number;
  exp: number;
  lifecycleVersion: number;
  signingKid: string;
};
const legacyPayloadSchema = z.object({
  v: z.literal(1), iss: z.literal(VENDOR_ADDON_ENTITLEMENT_ISSUER), aud: z.literal(VENDOR_ADDON_ENTITLEMENT_AUDIENCE),
  jti: z.string().uuid(), entitlementId: z.string().uuid(), activationId: z.string().uuid(),
  addonKey: z.enum(["webshop", "license-server", "webConference"]), installationId: z.string().uuid(),
  installationKeyFingerprint: z.string().regex(/^sha256:[a-f0-9]{64}$/), canonicalDomain: z.string().min(1).max(253),
  status: z.enum(["active", "suspended", "expired", "revoked", "canceled"]), features: z.array(z.string().min(1)).max(100),
  edition: z.string().min(1).max(160), activationLimit: z.number().int().nonnegative(), validUntil: z.string().datetime().nullable(),
  updatesUntil: z.string().datetime().nullable(), existingLicensePolicy: z.enum(["allow_existing", "disabled"]),
  iat: z.number().int().nonnegative(), exp: z.number().int().positive(), lifecycleVersion: z.number().int().nonnegative(),
}).strict();

/**
 * New managed deployments accept only canonical V2 JWS. The former V1 token
 * reader is deliberately absent from this path: a legacy identity must be
 * revalidated/re-enrolled before it can create a deployment operation.
 */
export function verifyVendorAddonEntitlement(
  token: string,
  context: V2VerificationContext,
): VerifiedManagedAddonEntitlement;
export function verifyVendorAddonEntitlement(
  token: string,
  context: LegacyVerificationContext,
): VerifiedVendorAddonEntitlement;
export function verifyVendorAddonEntitlement(
  token: string,
  context: VendorEntitlementVerificationContext,
): VerifiedManagedAddonEntitlement | VerifiedVendorAddonEntitlement {
  if (Buffer.byteLength(token, "utf8") > MAX_TOKEN_BYTES) throw new Error("Entitlement assertion exceeds the safe size limit.");
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !part || !/^[A-Za-z0-9_-]+$/.test(part))) throw new Error("Entitlement assertion is not a canonical compact JWS.");
  const [encodedHeader, encodedPayload, encodedSignature] = parts as [string, string, string];
  const header = decodeJson(encodedHeader, "header") as Record<string, unknown>;
  if (typeof header.kid !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(header.kid)) throw new Error("Entitlement signing KID is invalid.");
  const publicKeyPem = context.publicKeysByKid[header.kid];
  if (!publicKeyPem) throw new Error("Entitlement signing key is unknown or revoked.");
  const key = createPublicKey(publicKeyPem);
  if (key.asymmetricKeyType !== "ed25519") throw new Error("Entitlement signing key is not Ed25519.");
  const signature = Buffer.from(encodedSignature, "base64url");
  if (signature.toString("base64url") !== encodedSignature || !verify(null, Buffer.from(`${encodedHeader}.${encodedPayload}`, "ascii"), key, signature)) {
    throw new Error("Entitlement signature is invalid.");
  }
  const isV2 = "expectedHostCapabilityDescriptorHash" in context;
  if (isV2 && canonicalJson(header) !== '{"alg":"EdDSA","kid":' + JSON.stringify(header.kid) + ',"typ":"NRV-ADDON-ENTITLEMENT-V2+JWT"}') {
    throw new Error("Entitlement JWS protected header is not exact.");
  }
  if (!isV2 && (header.alg !== "EdDSA" || header.typ !== "NRV-ADDON-ENTITLEMENT+JWT")) {
    throw new Error("Legacy entitlement JWS header is not allowed.");
  }
  const payload = isV2
    ? decodeCanonicalJson(encodedPayload, "payload")
    : decodeJson(encodedPayload, "payload");
  const claims = isV2
    ? entitlementClaimsV2Schema.parse(payload)
    : legacyPayloadSchema.parse(payload);
  const nowSeconds = Math.floor((context.now ?? new Date()).getTime() / 1000);
  const nbf = isV2 ? (claims as AddonEntitlementClaimsV2).nbf : claims.iat;
  if (claims.iat > nowSeconds + CLOCK_SKEW_SECONDS || nbf > nowSeconds + CLOCK_SKEW_SECONDS || claims.exp < nowSeconds - CLOCK_SKEW_SECONDS || claims.exp <= claims.iat) {
    throw new Error("Entitlement assertion is outside its allowed time window.");
  }
  const domainOptions = isV2
    ? { environment: (context as V2VerificationContext).environment }
    : undefined;
  if (claims.addonKey !== context.addonKey || claims.installationId !== context.installationId || claims.installationKeyFingerprint !== context.installationKeyFingerprint || canonicalizeLicenseDomain(claims.canonicalDomain, domainOptions) !== canonicalizeLicenseDomain(context.canonicalDomain, domainOptions)) {
    throw new Error("Entitlement assertion is bound to another installation, environment, host descriptor, add-on, or domain.");
  }
  if (!isV2) return { ...claims, signingKid: header.kid };
  const v2Claims = claims as AddonEntitlementClaimsV2;
  const v2Context = context as V2VerificationContext;
  if (v2Claims.environment !== v2Context.environment || v2Claims.hostCapabilityDescriptorHash !== v2Context.expectedHostCapabilityDescriptorHash) {
    throw new Error("Entitlement assertion is bound to another environment or host descriptor.");
  }
  if (v2Claims.features.some((entry, index, all) => (index > 0 && all[index - 1]! >= entry))) throw new Error("Entitlement features must be sorted and unique.");
  if (v2Claims.licenseValidUntil && Date.parse(v2Claims.licenseValidUntil) > v2Claims.exp * 1000 + 366 * 24 * 60 * 60 * 1000) throw new Error("Entitlement business validity exceeds allowed policy window.");
  return { ...v2Claims, signingKid: header.kid };
}

export function verifyWebshopAddonEntitlementV2(
  token: string,
  context: V2VerificationContext,
): VerifiedWebshopAddonEntitlement {
  return verifyVendorAddonEntitlement(
    token,
    context,
  ) as unknown as VerifiedWebshopAddonEntitlement;
}

function decodeCanonicalJson(value: string, part: string): unknown {
  const bytes = Buffer.from(value, "base64url");
  if (bytes.toString("base64url") !== value) throw new Error(`Entitlement ${part} is not canonical base64url.`);
  const raw = bytes.toString("utf8");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error(`Entitlement ${part} is not valid JSON.`); }
  if (canonicalJson(parsed) !== raw) throw new Error(`Entitlement ${part} is not canonical JSON.`);
  return parsed;
}
function decodeJson(value: string, part: string): unknown {
  const bytes = Buffer.from(value, "base64url");
  if (bytes.toString("base64url") !== value) throw new Error(`Entitlement ${part} is not canonical base64url.`);
  try { return JSON.parse(bytes.toString("utf8")); } catch { throw new Error(`Entitlement ${part} is not valid JSON.`); }
}
