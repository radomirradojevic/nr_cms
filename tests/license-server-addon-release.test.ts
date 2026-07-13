import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { validateAddonReleaseManifest } from "@/lib/addon-runtime/release-manifest";

test("release manifest rejects the historical License Server package identity mismatch", () => {
  const manifest = { addonKey: "license-server", artifact: { sha256: "a".repeat(64), size: 1 }, capabilities: [], cmsVersionRange: "^0.1.0", entrypoints: { server: "./server.js" }, manifestVersion: 1, migrations: [], packageName: "@nr-cms/license-server-addon", packageVersion: "1.0.0", releasedAt: "2026-07-12T00:00:00.000Z", runtimeContractVersion: "1", schemaVersion: 1, signature: "test", signingKid: "test" };
  assert.equal(validateAddonReleaseManifest(manifest, { addonKey: "license-server", packageName: "@nr-cms/license-server" }).ok, false);
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
