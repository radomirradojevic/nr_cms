import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  WEBSHOP_CANONICAL_TABLES,
  WEBSHOP_CURRENT_TABLES,
  loadWebshopSchemaManifest,
} from "../scripts/webshop-schema-contract.mjs";

test("WebshopSchemaPrivilegeManifestV1 locks the exact 45 public relocation tables", () => {
  const manifest = loadWebshopSchemaManifest();
  assert.equal(manifest.relocatedBusinessTables.length, 45);
  assert.equal(new Set(manifest.relocatedBusinessTables).size, 45);
  assert.equal(WEBSHOP_CANONICAL_TABLES.length, 47);
  assert.equal(WEBSHOP_CURRENT_TABLES.length, 49);
  assert.equal(manifest.relocatedBusinessTables.includes("webshop_addon_entitlements"), false);
  assert.match(manifest.legacyPublicSchemaFingerprintSha256, /^[a-f0-9]{64}$/);
  assert.match(manifest.postconditionSchemaFingerprintSha256, /^[a-f0-9]{64}$/);
  assert.match(manifest.manifestHash, /^[a-f0-9]{64}$/);
});

test("canonical package migration is payload-backed and fingerprint-pinned", (t) => {
  const root = path.resolve(import.meta.dirname, "..");
  const packageRoot = path.join(root, ".private", "webshop");
  if (!fs.existsSync(packageRoot)) {
    t.skip("clean core source export intentionally has no private Webshop package");
    return;
  }
  const manifest = loadWebshopSchemaManifest();
  const migrations = JSON.parse(
    fs.readFileSync(path.join(packageRoot, "migrations.json"), "utf8"),
  );
  assert.deepEqual(migrations.map((entry) => entry.id), [
    "0001_webshop_core.sql",
    "0002_webshop_license_server_hmac_kid.sql",
    "0003_vendor_webshop_license_catalog.sql",
  ]);
  for (const descriptor of migrations) {
    assert.deepEqual(Object.keys(descriptor).sort(), [
      "checksum",
      "destructive",
      "id",
      "path",
      "postconditionSchemaFingerprintSha256",
      "requiresBackup",
      "rollbackPolicy",
      "schemaVersion",
    ]);
    const sql = fs.readFileSync(path.join(packageRoot, descriptor.path));
    assert.equal(createHash("sha256").update(sql).digest("hex"), descriptor.checksum);
    assert.equal(descriptor.destructive, false);
    assert.equal(descriptor.requiresBackup, true);
    assert.equal(descriptor.rollbackPolicy, "expand_compatible");
  }
  const descriptor = migrations.find(
    (entry) => entry.id === "0002_webshop_license_server_hmac_kid.sql",
  );
  assert.equal(
    descriptor?.postconditionSchemaFingerprintSha256,
    manifest.postconditionSchemaFingerprintSha256,
  );
  assert.equal(migrations.at(-1)?.schemaVersion, 3);
});
