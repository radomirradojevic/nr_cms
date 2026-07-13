import { createPublicKey, verify } from "node:crypto";

import { z } from "zod";

export const VENDOR_ADDON_ENTITLEMENT_AUDIENCE = "nr-cms-addon-runtime";
export const VENDOR_ADDON_ENTITLEMENT_ISSUER = "https://license-server.nrcms.com";
const MAX_TOKEN_BYTES = 12_000;
const CLOCK_SKEW_SECONDS = 300;

const payloadSchema = z.object({
  v: z.literal(1),
  iss: z.literal(VENDOR_ADDON_ENTITLEMENT_ISSUER),
  aud: z.literal(VENDOR_ADDON_ENTITLEMENT_AUDIENCE),
  jti: z.string().uuid(),
  entitlementId: z.string().uuid(),
  activationId: z.string().uuid(),
  addonKey: z.enum(["webshop", "license-server", "webConference"]),
  installationId: z.string().uuid(),
  installationKeyFingerprint: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  canonicalDomain: z.string().min(1).max(253),
  status: z.enum(["active", "suspended", "expired", "revoked", "canceled"]),
  features: z.array(z.string().min(1)).max(100),
  edition: z.string().min(1).max(160),
  activationLimit: z.number().int().nonnegative(),
  validUntil: z.string().datetime().nullable(),
  updatesUntil: z.string().datetime().nullable(),
  existingLicensePolicy: z.enum(["allow_existing", "disabled"]),
  iat: z.number().int().nonnegative(),
  exp: z.number().int().positive(),
  lifecycleVersion: z.number().int().nonnegative(),
});

export type VerifiedVendorAddonEntitlement = z.infer<typeof payloadSchema> & {
  signingKid: string;
};

export type VendorEntitlementVerificationContext = {
  addonKey: VerifiedVendorAddonEntitlement["addonKey"];
  canonicalDomain: string;
  installationId: string;
  installationKeyFingerprint: string;
  now?: Date;
  publicKeysByKid: Record<string, string>;
};

export function verifyVendorAddonEntitlement(
  token: string,
  context: VendorEntitlementVerificationContext,
): VerifiedVendorAddonEntitlement {
  if (Buffer.byteLength(token, "utf8") > MAX_TOKEN_BYTES) {
    throw new Error("Entitlement assertion exceeds the safe size limit.");
  }
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw new Error("Entitlement assertion is not a compact JWS.");
  }
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = parseJson(encodedHeader, "header") as { alg?: unknown; kid?: unknown; typ?: unknown };
  if (
    header.alg !== "EdDSA" ||
    header.typ !== "NRV-ADDON-ENTITLEMENT+JWT" ||
    typeof header.kid !== "string" ||
    !header.kid
  ) {
    throw new Error("Entitlement JWS header is not allowed.");
  }
  const publicKeyPem = context.publicKeysByKid[header.kid];
  if (!publicKeyPem) throw new Error("Entitlement signing key is unknown.");
  const signature = Buffer.from(encodedSignature, "base64url");
  const valid = verify(
    null,
    Buffer.from(`${encodedHeader}.${encodedPayload}`, "ascii"),
    createPublicKey(publicKeyPem),
    signature,
  );
  if (!valid) throw new Error("Entitlement signature is invalid.");

  const claims = payloadSchema.parse(parseJson(encodedPayload, "payload"));
  const nowSeconds = Math.floor((context.now ?? new Date()).getTime() / 1000);
  if (claims.iat > nowSeconds + CLOCK_SKEW_SECONDS || claims.exp < nowSeconds - CLOCK_SKEW_SECONDS) {
    throw new Error("Entitlement assertion is outside its allowed time window.");
  }
  if (
    claims.addonKey !== context.addonKey ||
    claims.installationId !== context.installationId ||
    claims.installationKeyFingerprint !== context.installationKeyFingerprint ||
    canonicalDomain(claims.canonicalDomain) !== canonicalDomain(context.canonicalDomain)
  ) {
    throw new Error("Entitlement assertion is bound to another installation, add-on, or domain.");
  }
  return { ...claims, signingKid: header.kid };
}

function parseJson(value: string, part: string): unknown {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    throw new Error(`Entitlement ${part} is not valid JSON.`);
  }
}

function canonicalDomain(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0] ?? "";
}
