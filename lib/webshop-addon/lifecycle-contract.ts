import { createHash, createPublicKey, verify } from "node:crypto";

import { z } from "zod";

import { canonicalJson } from "@/lib/vendor-addon-entitlements/activation-v2-contract";
import { parseStrictJson } from "@/lib/webshop-addon/lifecycle-strict-json";

export const LIFECYCLE_RECEIPT_TYP = "NRV-ADDON-LIFECYCLE-RECEIPT+JWT";
export const LIFECYCLE_STATUS_TYP = "NRV-ADDON-LIFECYCLE-STATUS+JWT";
const ISSUER = "https://license-server.nrcms.com";
const AUDIENCE = "nr-cms-addon-runtime";
const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
const sha = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
const scheme = z.enum(["legacy_pem_utf8_sha256_v0", "ed25519_spki_der_sha256_v1"]);

const common = z.object({
  contractVersion: z.literal(1), tokenUse: z.literal("addon_lifecycle_receipt"), iss: z.literal(ISSUER), aud: z.literal(AUDIENCE),
  jti: uuid, iat: z.number().int().nonnegative(), nbf: z.number().int().nonnegative(), exp: z.number().int().positive(),
  lifecycleAction: z.enum(["deactivate", "transfer_source_complete"]), receiptRole: z.enum(["deactivation", "transfer_source", "transfer_target"]),
  operationId: uuid, entitlementId: uuid, addonKey: z.literal("webshop"), lifecycleVersion: z.number().int().positive(), resultBodyHash: sha,
});
const deactivation = common.extend({
  lifecycleAction: z.literal("deactivate"), receiptRole: z.literal("deactivation"), activationId: uuid,
  activationStatus: z.literal("deactivated"), canonicalDomain: z.string().min(1).max(253), installationId: uuid,
  installationKeyFingerprint: sha, installationFingerprintScheme: scheme, slotReleased: z.literal(true), deactivatedAt: iso,
}).strict();
const transferFields = {
  lifecycleAction: z.literal("transfer_source_complete"), transferId: uuid, status: z.literal("completed"),
  sourceActivationId: uuid, sourceActivationStatus: z.literal("transferred"), targetActivationId: uuid,
  targetActivationStatus: z.literal("active"), oldCanonicalDomain: z.string().min(1).max(253), newCanonicalDomain: z.string().min(1).max(253),
  sourceInstallationId: uuid, sourceInstallationKeyFingerprint: sha, sourceInstallationFingerprintScheme: scheme,
  targetInstallationId: uuid, targetInstallationKeyFingerprint: sha, targetInstallationFingerprintScheme: z.literal("ed25519_spki_der_sha256_v1"), completedAt: iso,
};
const transferSource = common.extend({ receiptRole: z.literal("transfer_source"), ...transferFields }).strict();
const transferTarget = common.extend({ receiptRole: z.literal("transfer_target"), ...transferFields }).strict();
export const lifecycleReceiptClaimsSchema = z.union([deactivation, transferSource, transferTarget]);
export type LifecycleReceiptClaimsV1 = z.infer<typeof lifecycleReceiptClaimsSchema>;

export const lifecycleStatusClaimsSchema = z.object({
  contractVersion: z.literal(1), tokenUse: z.literal("addon_lifecycle_status"), purpose: z.literal("original_operation_recovery"),
  iss: z.literal(ISSUER), aud: z.literal(AUDIENCE), jti: uuid, iat: z.number().int().nonnegative(), nbf: z.number().int().nonnegative(), exp: z.number().int().positive(),
  lifecycleOperationId: uuid, lifecycleAction: z.enum(["deactivate", "transfer_source_complete"]), lifecycleRequestBodyHash: sha,
  operationOutcome: z.enum(["committed", "not_committed", "in_progress"]), resultBodyHash: sha.nullable(), activationId: uuid,
  entitlementId: uuid, addonKey: z.literal("webshop"), installationId: uuid, sourceCanonicalDomain: z.string().min(1).max(253),
  licenseCanonicalDomain: z.string().min(1).max(253), preLifecycleVersion: z.number().int().nonnegative(), currentLifecycleVersion: z.number().int().nonnegative(),
  activationStatus: z.enum(["active", "deactivated", "transferred", "revoked"]), licenseStatus: z.enum(["active", "suspended", "expired", "revoked", "canceled"]),
  transferId: uuid.nullable(), targetActivationId: uuid.nullable(), targetInstallationId: uuid.nullable(), targetCanonicalDomain: z.string().min(1).max(253).nullable(), targetActivationStatus: z.literal("active").nullable(),
}).strict().superRefine((value, ctx) => validateStatusMatrix(value, ctx));
export type LifecycleStatusClaimsV1 = z.infer<typeof lifecycleStatusClaimsSchema>;

export function lifecycleRequestHash(value: unknown) {
  return `sha256:${createHash("sha256").update(canonicalJson(value), "utf8").digest("hex")}`;
}
export function lifecycleCoreHash(value: Record<string, unknown>) {
  return `sha256:${createHash("sha256").update(canonicalJson(value), "utf8").digest("hex")}`;
}

export function verifyLifecycleReceipt(input: { token: string; expected: { canonicalDomain?: string; entitlementId: string; installationId: string; role: "deactivation" | "transfer_source" | "transfer_target"; resultBodyHash: string }; publicKeysByKid: Record<string, string>; now?: Date }) {
  const parsed = verifyCompact(input.token, LIFECYCLE_RECEIPT_TYP, input.publicKeysByKid);
  const claims = lifecycleReceiptClaimsSchema.parse(parsed.payload);
  verifyTimes(claims, input.now);
  if (claims.receiptRole !== input.expected.role || claims.entitlementId !== input.expected.entitlementId || claims.resultBodyHash !== input.expected.resultBodyHash) throw new Error("Lifecycle receipt is not bound to the pending local operation.");
  if (claims.receiptRole === "deactivation") {
    if (claims.installationId !== input.expected.installationId || (input.expected.canonicalDomain && claims.canonicalDomain !== input.expected.canonicalDomain)) throw new Error("Lifecycle deactivation receipt identity binding does not match.");
  } else if ((claims.receiptRole === "transfer_source" ? claims.sourceInstallationId : claims.targetInstallationId) !== input.expected.installationId) {
    throw new Error("Lifecycle transfer receipt role is not bound to this installation.");
  }
  return { claims, kid: parsed.header.kid, compactHash: `sha256:${createHash("sha256").update(input.token, "ascii").digest("hex")}` };
}

export function verifyLifecycleStatus(input: { token: string; expected: { activationId: string; lifecycleAction: "deactivate" | "transfer_source_complete"; lifecycleOperationId: string; lifecycleRequestBodyHash: string; installationId: string; preLifecycleVersion: number }; publicKeysByKid: Record<string, string>; now?: Date }) {
  const parsed = verifyCompact(input.token, LIFECYCLE_STATUS_TYP, input.publicKeysByKid);
  const claims = lifecycleStatusClaimsSchema.parse(parsed.payload);
  verifyTimes(claims, input.now);
  if (claims.lifecycleOperationId !== input.expected.lifecycleOperationId || claims.lifecycleAction !== input.expected.lifecycleAction || claims.lifecycleRequestBodyHash !== input.expected.lifecycleRequestBodyHash || claims.activationId !== input.expected.activationId || claims.installationId !== input.expected.installationId || claims.preLifecycleVersion !== input.expected.preLifecycleVersion) throw new Error("Lifecycle status JWS does not bind the original pending operation.");
  return { claims, kid: parsed.header.kid };
}

function verifyCompact(token: string, typ: string, keys: Record<string, string>) {
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !part || !/^[A-Za-z0-9_-]+$/.test(part))) throw new Error("Lifecycle token is not canonical compact JWS.");
  const [h, p, s] = parts as [string, string, string]; const headerRaw = Buffer.from(h, "base64url"); const payloadRaw = Buffer.from(p, "base64url"); const signature = Buffer.from(s, "base64url");
  if (headerRaw.toString("base64url") !== h || payloadRaw.toString("base64url") !== p || signature.toString("base64url") !== s) throw new Error("Lifecycle token has non-canonical base64url.");
  const header = z.object({ alg: z.literal("EdDSA"), kid: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/), typ: z.literal(typ) }).strict().parse(parseCanonicalJson(headerRaw, "Lifecycle header"));
  const payload = parseCanonicalJson(payloadRaw, "Lifecycle payload") as Record<string, unknown>;
  const pem = keys[header.kid]; if (!pem) throw new Error("Lifecycle signing key is unknown or revoked.");
  const key = createPublicKey(pem); if (key.asymmetricKeyType !== "ed25519" || !verify(null, Buffer.from(`${h}.${p}`, "ascii"), key, signature)) throw new Error("Lifecycle token signature is invalid.");
  return { header, payload };
}
function parseCanonicalJson(raw: Buffer, label: string) {
  const text = raw.toString("utf8");
  const value = parseStrictJson(raw, label);
  if (canonicalJson(value) !== text) throw new Error(`${label} must be canonical JSON.`);
  return value;
}
function verifyTimes(claims: { exp: number; iat: number; nbf: number }, now = new Date()) { const seconds = Math.floor(now.getTime() / 1000); if (claims.iat > claims.nbf || claims.nbf >= claims.exp || claims.iat > seconds + 300 || claims.nbf > seconds + 300 || seconds >= claims.exp) throw new Error("Lifecycle token is expired or outside its allowed time window."); }
function validateStatusMatrix(value: z.infer<typeof lifecycleStatusClaimsSchema>, ctx: z.RefinementCtx) {
  const committed = value.operationOutcome === "committed"; const transfer = value.lifecycleAction === "transfer_source_complete"; const fail = (message: string) => ctx.addIssue({ code: "custom", message });
  if ((value.resultBodyHash !== null) !== committed) fail("Lifecycle status resultBodyHash nullability is invalid.");
  if (!transfer) { if (value.transferId !== null || value.targetActivationId !== null || value.targetInstallationId !== null || value.targetCanonicalDomain !== null || value.targetActivationStatus !== null || value.activationStatus !== (committed ? "deactivated" : "active") || value.currentLifecycleVersion !== value.preLifecycleVersion + (committed ? 1 : 0) || value.sourceCanonicalDomain !== value.licenseCanonicalDomain) fail("Deactivation status matrix is invalid."); return; }
  if (!value.transferId || !value.targetInstallationId || !value.targetCanonicalDomain) fail("Transfer status lacks target binding.");
  if (committed) { if (value.activationStatus !== "transferred" || value.targetActivationId === null || value.targetActivationStatus !== "active" || value.currentLifecycleVersion !== value.preLifecycleVersion + 1 || value.licenseCanonicalDomain !== value.targetCanonicalDomain) fail("Committed transfer status matrix is invalid."); }
  else if (value.activationStatus !== "active" || value.targetActivationId !== null || value.targetActivationStatus !== null || value.currentLifecycleVersion !== value.preLifecycleVersion || value.licenseCanonicalDomain !== value.sourceCanonicalDomain) fail("Uncommitted transfer status matrix is invalid.");
}
