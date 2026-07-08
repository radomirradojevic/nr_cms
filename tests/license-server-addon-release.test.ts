import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  checkInMemoryRateLimit,
  resetInMemoryRateLimits,
} from "@/lib/in-memory-rate-limit";
import {
  decryptSecret,
  encryptSecret,
  hmacBase64Url,
  sha256Hex,
  timingSafeStringEqual,
} from "../.private/license-server-addon/src/lib/crypto";
import { getRuntimeRateLimitChecks } from "../.private/license-server-addon/src/lib/runtime-rate-limit-policy";

test("license server HMAC canonical string is bound to the actual URL path", () => {
  const secret = "nrls_secret_test";
  const body = JSON.stringify({ productTypeId: "product", sku: "PRO-1Y" });
  const timestamp = "2026-07-06T12:00:00.000Z";
  const nonce = "nonce-1";
  const bodyHash = sha256Hex(body);
  const canonical = [
    "POST",
    "/api/license-server/v1/licenses",
    timestamp,
    nonce,
    bodyHash,
  ].join("\n");
  const signature = hmacBase64Url(secret, canonical);

  assert.equal(
    timingSafeStringEqual(signature, hmacBase64Url(secret, canonical)),
    true,
  );
  assert.equal(
    timingSafeStringEqual(
      signature,
      hmacBase64Url(
        secret,
        ["POST", "/api/v1/licenses", timestamp, nonce, bodyHash].join("\n"),
      ),
    ),
    false,
  );
});

test("license server API client secrets encrypt at rest and rotate fingerprints", () => {
  const env = {
    LICENSE_SERVER_SECRET_KEY: Buffer.alloc(32, 7).toString("base64url"),
  };
  const firstSecret = "nrls_secret_first";
  const rotatedSecret = "nrls_secret_rotated";
  const firstEncrypted = encryptSecret(firstSecret, env);
  const rotatedEncrypted = encryptSecret(rotatedSecret, env);

  assert.equal(decryptSecret(firstEncrypted, env), firstSecret);
  assert.equal(decryptSecret(rotatedEncrypted, env), rotatedSecret);
  assert.notEqual(sha256Hex(firstSecret), sha256Hex(rotatedSecret));
  assert.equal(firstEncrypted.includes(firstSecret), false);
  assert.equal(rotatedEncrypted.includes(rotatedSecret), false);
});

test("license server runtime activation rate limit blocks abuse by license key", () => {
  resetInMemoryRateLimits();

  const licenseCheck = getRuntimeRateLimitChecks({
    clientIp: "203.0.113.10",
    licenseKey: "NRLS-AAAA-BBBB-CCCC-DDDD-EEEE",
    scope: "activate",
  }).find((check) => check.key.startsWith("license:"));
  assert.ok(licenseCheck);

  for (let index = 0; index < 20; index += 1) {
    assert.equal(
      checkInMemoryRateLimit({
        key: licenseCheck.key,
        limit: licenseCheck.limit,
        namespace: "license-server-runtime:activate",
        reason: "Rate limit exceeded.",
        windowMs: licenseCheck.windowMs,
      }).allowed,
      true,
    );
  }

  const blocked = checkInMemoryRateLimit({
    key: licenseCheck.key,
    limit: licenseCheck.limit,
    namespace: "license-server-runtime:activate",
    reason: "Rate limit exceeded.",
    windowMs: licenseCheck.windowMs,
  });
  assert.equal(blocked.allowed, false);
  if (!blocked.allowed) {
    assert.equal(blocked.reason, "Rate limit exceeded.");
  }
});

test("license server release migrations include required production tables", () => {
  const migrationText = [
    "drizzle/0076_license_server_addon.sql",
    "drizzle/0077_license_server_addon_phase3.sql",
    "drizzle/0078_webshop_license_server_catalog.sql",
  ]
    .map((path) => readFileSync(resolve(process.cwd(), path), "utf8"))
    .join("\n");

  for (const table of [
    "license_server_addon_entitlements",
    "license_server_api_clients",
    "license_server_api_client_nonces",
    "license_server_product_types",
    "license_server_product_type_skus",
    "license_server_licenses",
    "license_server_license_activations",
    "license_server_validation_events",
    "license_server_audit_events",
    "webshop_license_server_catalog_items",
  ]) {
    assert.match(migrationText, new RegExp(`"${table}"`));
  }
});
