import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const DEPLOY_HMAC_V2 = "2";

export class DeployHmacError extends Error {
  constructor(readonly code: string, readonly status = 401) { super(code); }
}

export function sha256Hex(value: Buffer | string) { return createHash("sha256").update(value).digest("hex"); }
export function signDeployRequest(input: { secret: string; kid: string; requestId: string; timestamp: string; method: string; path: string; body: Buffer }) {
  const canonical = ["NR-DEPLOY-HMAC-V2", input.kid, input.requestId, input.timestamp, input.method, input.path, sha256Hex(input.body)].join("\n");
  return {
    "Content-Type": "application/json", "X-NR-Deploy-Auth-Version": DEPLOY_HMAC_V2,
    "X-NR-Deploy-Key-Id": input.kid, "X-NR-Deploy-Request-Id": input.requestId,
    "X-NR-Deploy-Timestamp": input.timestamp, "X-NR-Deploy-Signature": `v2=${sign(input.secret, canonical)}`,
  };
}
export function signDeployResponse(input: { secret: string; kid: string; requestId: string; status: number; body: Buffer }) {
  const canonical = ["NR-DEPLOY-HMAC-V2-RESPONSE", input.kid, input.requestId, String(input.status), sha256Hex(input.body)].join("\n");
  return { "X-NR-Deploy-Key-Id": input.kid, "X-NR-Deploy-Response-Signature": `v2=${sign(input.secret, canonical)}` };
}
export function verifyDeployRequest(input: { headers: Headers; method: string; pathname: string; body: Buffer; resolveSecret: (kid: string) => string | undefined; now?: Date }) {
  const contentType = exactHeader(input.headers, "content-type"); const version = exactHeader(input.headers, "x-nr-deploy-auth-version");
  const kid = exactHeader(input.headers, "x-nr-deploy-key-id"); const requestId = exactHeader(input.headers, "x-nr-deploy-request-id");
  const timestamp = exactHeader(input.headers, "x-nr-deploy-timestamp"); const signature = exactHeader(input.headers, "x-nr-deploy-signature");
  if (contentType !== "application/json" || version !== DEPLOY_HMAC_V2 || input.method !== "POST" || !/^\/[A-Za-z0-9_\-/]*$/.test(input.pathname)) throw new DeployHmacError("invalid_auth_request", 400);
  if (!isCanonicalUuid(requestId) || !/^[1-9][0-9]{0,12}$/.test(timestamp) || !/^v2=[A-Za-z0-9_-]{43}$/.test(signature)) throw new DeployHmacError("invalid_auth_identity");
  const seconds = Number(timestamp); if (!Number.isSafeInteger(seconds) || Math.abs(Math.floor((input.now ?? new Date()).getTime() / 1000) - seconds) > 300) throw new DeployHmacError("timestamp_out_of_window");
  const secret = input.resolveSecret(kid); if (!secret) throw new DeployHmacError("unknown_or_revoked_kid");
  const canonical = ["NR-DEPLOY-HMAC-V2", kid, requestId, timestamp, "POST", input.pathname, sha256Hex(input.body)].join("\n");
  if (!safeEqual(signature.slice(3), sign(secret, canonical))) throw new DeployHmacError("invalid_signature");
  return { kid, requestId, secret };
}
export function verifyDeployResponse(input: { headers: Headers; secret: string; expectedKid: string; requestId: string; status: number; body: Buffer }) {
  const kid = exactHeader(input.headers, "x-nr-deploy-key-id"); const signature = exactHeader(input.headers, "x-nr-deploy-response-signature");
  if (kid !== input.expectedKid || !/^v2=[A-Za-z0-9_-]{43}$/.test(signature)) throw new DeployHmacError("response_auth_missing");
  const canonical = ["NR-DEPLOY-HMAC-V2-RESPONSE", kid, input.requestId, String(input.status), sha256Hex(input.body)].join("\n");
  if (!safeEqual(signature.slice(3), sign(input.secret, canonical))) throw new DeployHmacError("response_auth_invalid");
}
export function isCanonicalUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value); }
function exactHeader(headers: Headers, name: string) { const value = headers.get(name); if (!value || value.includes(",")) throw new DeployHmacError("duplicate_or_missing_auth_header"); return value; }
function sign(secret: string, value: string) { return createHmac("sha256", secret).update(value, "utf8").digest("base64url"); }
function safeEqual(left: string, right: string) { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && timingSafeEqual(a, b); }
