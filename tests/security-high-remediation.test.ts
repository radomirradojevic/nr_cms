import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = process.cwd();

function source(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

test("addon secret purposes have no generic or cross-purpose fallback", () => {
  const paths = [
    "lib/webshop-addon/buy-link.ts",
    "lib/license-server-addon/buy-link.ts",
    "app/api/cron/webshop-license-issues/route.ts",
    "app/api/cron/webshop-entitlement/route.ts",
    "app/api/cron/license-server-entitlement/route.ts",
    ".private/webshop/src/data/webshop-carts.ts",
    ".private/webshop/src/data/webshop-orders.ts",
    ".private/webshop/src/data/webshop-download-domain.ts",
    ".private/webshop/src/data/webshop-downloads.ts",
    ".private/license-server-addon/src/lib/runtime-auth.ts",
    ".private/license-server-addon/src/lib/runtime-rate-limit-policy.ts",
  ];
  const combined = paths
    .filter((path) => existsSync(resolve(root, path)))
    .map(source)
    .join("\n");

  assert.doesNotMatch(combined, /process\.env\.(AUTH_SECRET|CLERK_SECRET_KEY|CRON_SECRET)/);
  assert.doesNotMatch(combined, /development-(?:webshop-buy-link|license-server-buy-link|license-server-runtime|license-server-rate-limit)-secret/);
});

test("public schema and migration use encrypted pool-license storage", () => {
  const schema = source("db/schema.ts");
  const migration = resolve(root, "drizzle/0087_webshop_license_key_encryption.sql");

  assert.match(schema, /encryptedLicenseKey: text\("encrypted_license_key"\)/);
  assert.doesNotMatch(schema, /licenseKey: text\("license_key"\)\.notNull\(\)/);
  assert.equal(existsSync(migration), true, "the additive expand migration must exist");
  assert.match(source("drizzle/0087_webshop_license_key_encryption.sql"), /ADD COLUMN "encrypted_license_key"/);
});

test("private pool snapshots retain only encrypted-key references", {
  skip: !existsSync(resolve(root, ".private/webshop/src/data/webshop-license-keys.ts")),
}, () => {
  const pool = source(".private/webshop/src/data/webshop-license-keys.ts");
  const order = source(".private/webshop/src/data/webshop-orders.ts");
  assert.doesNotMatch(pool, /licenseKey,\s*\n\s*licenseKeyFingerprint/);
  assert.doesNotMatch(order, /licenseKey:\s*assigned\.licenseKey/);
});

test("invite and bootstrap secrets are not carried in URLs, redirects, or logs", {
  skip: !existsSync(resolve(root, ".private/license-server/app/admin/actions.ts")),
}, () => {
  const actions = source(".private/license-server/app/admin/actions.ts");
  const bootstrap = source(".private/license-server/src/lib/bootstrap.ts");

  assert.doesNotMatch(actions, /\/invite\/\$\{encodeURIComponent\(token\)\}/);
  assert.doesNotMatch(actions, /redirect\([^\n]*token/);
  assert.doesNotMatch(bootstrap, /return \{ password,/);
  assert.doesNotMatch(bootstrap, /logger\.[^(]+\([^\n]*password/i);
});

test("redeploy authentication has an independent versioned secret contract", () => {
  const configs = [
    source("lib/webshop-addon/config.ts"),
    source("lib/license-server-addon/config.ts"),
  ].join("\n");

  assert.match(configs, /REDEPLOY_AUTH_SECRET/);
  assert.match(configs, /REDEPLOY_AUTH_KID/);
  assert.doesNotMatch(configs, /redeploy[\s\S]{0,120}packageToken/i);
});
