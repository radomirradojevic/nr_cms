import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";

import { verifyVendorAddonEntitlement } from "@/lib/vendor-addon-entitlements/verified-entitlement";
import { canPerformEntitlementOperation, resolveEntitlementRuntimeMode } from "@/lib/vendor-addon-entitlements/revalidation-policy";

function token(privateKeyPem: string, kid: string, patch: Record<string, unknown> = {}) {
  const header = Buffer.from(JSON.stringify({ alg: "EdDSA", kid, typ: "NRV-ADDON-ENTITLEMENT+JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ v: 1, iss: "https://license-server.nrcms.com", aud: "nr-cms-addon-runtime", jti: "00000000-0000-4000-8000-000000000001", entitlementId: "00000000-0000-4000-8000-000000000002", activationId: "00000000-0000-4000-8000-000000000003", addonKey: "webshop", installationId: "00000000-0000-4000-8000-000000000004", installationKeyFingerprint: `sha256:${"a".repeat(64)}`, canonicalDomain: "shop.example.test", status: "active", features: ["webshop"], edition: "standard", activationLimit: 1, validUntil: null, updatesUntil: null, existingLicensePolicy: "allow_existing", iat: 1_800_000_000, exp: 1_800_604_800, lifecycleVersion: 2, ...patch })).toString("base64url");
  return `${header}.${payload}.${sign(null, Buffer.from(`${header}.${payload}`), privateKeyPem).toString("base64url")}`;
}

const context = (keys: Record<string, string>) => ({ addonKey: "webshop" as const, canonicalDomain: "shop.example.test", installationId: "00000000-0000-4000-8000-000000000004", installationKeyFingerprint: `sha256:${"a".repeat(64)}`, now: new Date(1_800_100_000_000), publicKeysByKid: keys });

test("strict Ed25519 parser rejects forged claims and accepts old/new kid overlap", () => {
  const first = generateKeyPairSync("ed25519");
  const second = generateKeyPairSync("ed25519");
  const firstPrivate = first.privateKey.export({ format: "pem", type: "pkcs8" }).toString();
  const secondPrivate = second.privateKey.export({ format: "pem", type: "pkcs8" }).toString();
  const keys = { old: first.publicKey.export({ format: "pem", type: "spki" }).toString(), current: second.publicKey.export({ format: "pem", type: "spki" }).toString() };
  assert.equal(verifyVendorAddonEntitlement(token(firstPrivate, "old"), context(keys)).signingKid, "old");
  assert.equal(verifyVendorAddonEntitlement(token(secondPrivate, "current"), context(keys)).signingKid, "current");
  assert.throws(() => verifyVendorAddonEntitlement(token(firstPrivate, "unknown"), context(keys)));
  assert.throws(() => verifyVendorAddonEntitlement(token(firstPrivate, "old", { canonicalDomain: "attacker.test" }), context(keys)));
  const valid = token(firstPrivate, "old");
  const [header, payload, signature] = valid.split(".");
  const forged = `${header}.${payload}.${signature!.startsWith("A") ? "B" : "A"}${signature!.slice(1)}`;
  assert.throws(() => verifyVendorAddonEntitlement(forged, context(keys)));
});

test("outage grace is bounded and never enables a new privileged action", () => {
  const entitlement = { status: "active", validUntil: null } as Parameters<typeof resolveEntitlementRuntimeMode>[0]["entitlement"];
  const now = new Date("2027-01-15T00:00:00Z");
  assert.equal(resolveEntitlementRuntimeMode({ entitlement, lastSuccessAt: new Date(now.getTime() - 3 * 86400000), now }), "degraded");
  assert.equal(canPerformEntitlementOperation("degraded", "existing_runtime"), true);
  assert.equal(canPerformEntitlementOperation("degraded", "issue"), false);
  assert.equal(resolveEntitlementRuntimeMode({ entitlement, lastSuccessAt: new Date(now.getTime() - 15 * 86400000), now }), "expired");
});
