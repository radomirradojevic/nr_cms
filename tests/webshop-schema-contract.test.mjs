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
  assert.equal(WEBSHOP_CURRENT_TABLES.length, 64);
  assert.equal(
    manifest.relocatedBusinessTables.includes("webshop_addon_entitlements"),
    false,
  );
  assert.match(manifest.legacyPublicSchemaFingerprintSha256, /^[a-f0-9]{64}$/);
  assert.match(manifest.postconditionSchemaFingerprintSha256, /^[a-f0-9]{64}$/);
  assert.match(manifest.manifestHash, /^[a-f0-9]{64}$/);
});

test("canonical package migration is payload-backed and fingerprint-pinned", (t) => {
  const root = path.resolve(import.meta.dirname, "..");
  const packageRoot = path.join(root, ".private", "webshop");
  if (!fs.existsSync(packageRoot)) {
    t.skip(
      "clean core source export intentionally has no private Webshop package",
    );
    return;
  }
  const manifest = loadWebshopSchemaManifest();
  const migrations = JSON.parse(
    fs.readFileSync(path.join(packageRoot, "migrations.json"), "utf8"),
  );
  assert.deepEqual(
    migrations.map((entry) => entry.id),
    [
      "0001_webshop_core.sql",
      "0002_webshop_license_server_hmac_kid.sql",
      "0003_vendor_webshop_license_catalog.sql",
      "0004_webshop_purchase_intent_checkout.sql",
      "0005_webshop_payment_issuance_v2.sql",
      "0006_webshop_post_issue_delivery.sql",
      "0007_webshop_delivery_session_exchange.sql",
      "0008_webshop_customer_license_server_connections.sql",
      "0009_webshop_customer_license_fulfillment.sql",
      "0010_webshop_license_lifecycle_v2.sql",
    ],
  );
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
    assert.equal(
      createHash("sha256").update(sql).digest("hex"),
      descriptor.checksum,
    );
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
  const postIssueDescriptor = migrations.find(
    (entry) => entry.id === "0006_webshop_post_issue_delivery.sql",
  );
  assert.equal(
    postIssueDescriptor?.postconditionSchemaFingerprintSha256,
    "c16da74df6ab8c5d137b98c3abe2588ed105c0956c78abf885b2909670a79eb3",
  );
  const deliverySessionDescriptor = migrations.find(
    (entry) => entry.id === "0007_webshop_delivery_session_exchange.sql",
  );
  assert.equal(
    deliverySessionDescriptor?.postconditionSchemaFingerprintSha256,
    "8ccec9e4f5145815615c489a666dbc96b7efe4b423a842cca15bb1f31ebb55b5",
  );
  const connectionDescriptor = migrations.find(
    (entry) =>
      entry.id === "0008_webshop_customer_license_server_connections.sql",
  );
  assert.equal(
    connectionDescriptor?.postconditionSchemaFingerprintSha256,
    "c47cdb23c85c4b186850ef70ae98303d46808a7d0367b61270f86409e7cf649a",
  );
  const fulfillmentDescriptor = migrations.find(
    (entry) => entry.id === "0009_webshop_customer_license_fulfillment.sql",
  );
  assert.equal(
    fulfillmentDescriptor?.postconditionSchemaFingerprintSha256,
    "2962412913957e92153c421892661eb067ad81e9332ac154356effdd3a04e74f",
  );
  const lifecycleDescriptor = migrations.find(
    (entry) => entry.id === "0010_webshop_license_lifecycle_v2.sql",
  );
  assert.equal(
    lifecycleDescriptor?.postconditionSchemaFingerprintSha256,
    "d54b3734a846d91f9321b90f2d78da8a5f82cd15648b828df4ba0fe0a9f31341",
  );
  assert.equal(migrations.at(-1)?.schemaVersion, 10);
});
