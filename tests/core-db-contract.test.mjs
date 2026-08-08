import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  __coreDbContractTesting,
  assertExactTargetDatabaseUrl,
  assertProtectedPasswordFile,
  canonicalJson,
  loadCmsCorePrivilegeManifest,
  migrationSetHash,
  parseStrictArguments,
  resolveCmsCoreTarget,
} from "../scripts/core-db-contract.mjs";
import { __coreDbMigrationTesting } from "../scripts/db-core-migrate.mjs";
import {
  __coreDbProvisioningTesting,
  assertStaticMigratorSecretPath,
  redactedProvisionReceipt,
} from "../scripts/core-db-provisioning.mjs";
import {
  __migrationRunnerTesting,
  loadMigrations,
} from "../scripts/run-drizzle-migrations.mjs";

test("CmsCorePrivilegeManifestV1 fixes the two target role triplets", () => {
  const manifest = loadCmsCorePrivilegeManifest();
  const vendor = resolveCmsCoreTarget("vendor", manifest);
  const client = resolveCmsCoreTarget("client", manifest);

  assert.equal(manifest.manifestType, "CmsCorePrivilegeManifestV1");
  assert.equal(manifest.contractVersion, 1);
  assert.equal(vendor.roles.owner, "nr_cms_vendor_core_owner");
  assert.equal(vendor.roles.migrator, "nr_cms_vendor_core_migrator");
  assert.equal(vendor.roles.runtime, "nr_cms_vendor_runtime");
  assert.equal(client.roles.owner, "nr_cms_client_core_owner");
  assert.equal(client.roles.migrator, "nr_cms_client_core_migrator");
  assert.equal(client.roles.runtime, "nr_cms_client_runtime");
  assert.notEqual(vendor.databaseResourceId, client.databaseResourceId);
  assert.notEqual(vendor.manifestHash, "");
});

test("core target connection contract rejects a swapped target or login", () => {
  const vendor = resolveCmsCoreTarget("vendor");
  assert.doesNotThrow(() =>
    assertExactTargetDatabaseUrl(
      "postgresql://nr_cms_vendor_runtime:password@127.0.0.1:5432/nr_cms_vendor_test",
      vendor,
      vendor.roles.runtime,
    ),
  );
  assert.throws(
    () =>
      assertExactTargetDatabaseUrl(
        "postgresql://nr_cms_client_runtime:password@127.0.0.1:5432/nr_cms_client_test",
        vendor,
        vendor.roles.runtime,
      ),
    /static vendor/,
  );
});

test("manifest hashing is canonical and migration set hashes include identity", () => {
  assert.equal(canonicalJson({ b: 1, a: [2] }), '{"a":[2],"b":1}');
  const first = migrationSetHash([{ tag: "0001", when: 1, hash: "a" }]);
  const changed = migrationSetHash([{ tag: "0001", when: 1, hash: "b" }]);
  assert.notEqual(first, changed);
});

test("operator secret root is static and receipts redact credentials", () => {
  const vendor = resolveCmsCoreTarget("vendor");
  assert.match(
    assertStaticMigratorSecretPath(vendor),
    /vendor-cms-core-migrator\.v1\.dpapi$/,
  );
  const receipt = redactedProvisionReceipt(vendor, "preflight", {
    database:
      "postgresql://nr_cms_vendor_runtime:***@127.0.0.1:5432/nr_cms_vendor_test",
  });
  const serialized = JSON.stringify(receipt);
  assert.doesNotMatch(
    serialized,
    /vendor-password-canary|runtime-password-canary/,
  );
  assert.match(serialized, /:\*\*\*@127\.0\.0\.1/);
  assert.match(
    serialized,
    /dpapi-machine:\/\/nr-cms-core\/vendor\/migrator\/v1/,
  );
});

test("protected password inputs cannot be inside the source checkout", () => {
  const insideSource = path.join(
    __coreDbContractTesting.SOURCE_ROOT,
    "not-a-secret.txt",
  );
  assert.throws(
    () => assertProtectedPasswordFile(insideSource),
    /outside the source checkout/,
  );
});

test("operator argument parser is fail-closed", () => {
  const parsed = parseStrictArguments(
    ["--target", "vendor", "--dry-run"],
    ["--target"],
    ["--dry-run"],
  );
  assert.equal(parsed.values.get("--target"), "vendor");
  assert.throws(
    () =>
      parseStrictArguments(
        ["--target", "vendor", "--unknown"],
        ["--target"],
        [],
      ),
    /unexpected option/,
  );
});

test("migration introspection retains the explicit nr_control schema identity", () => {
  const operation = __migrationRunnerTesting.analyzeStatement(
    'CREATE TABLE "nr_control"."cms_core_migration_receipts" ("id" uuid)',
  )[0];
  assert.deepEqual(
    { kind: operation.kind, schema: operation.schema, table: operation.table },
    {
      kind: "createTable",
      schema: "nr_control",
      table: "cms_core_migration_receipts",
    },
  );
  assert.deepEqual(__coreDbMigrationTesting.CORE_SCHEMA_IDENTITIES, [
    "public",
    "drizzle",
    "nr_control",
  ]);
});

test("core control-plane and schema-detach migrations are versioned", () => {
  const migrations = loadMigrations();
  assert.deepEqual(migrations.slice(-6).map((migration) => migration.tag), [
    "0089_cms_core_control_plane",
    "0090_webshop_core_detach",
    "0091_webshop_activation_v2_control_plane",
    "0092_addon_deployment_worker_callback_ledger",
    "0093_addon_deployment_mutation_terminal_receipts",
    "0094_webshop_purchase_intent_domain_proofs",
  ]);
  assert.ok(fs.existsSync(path.resolve("drizzle/meta/0089_snapshot.json")));
  assert.ok(fs.existsSync(path.resolve("drizzle/meta/0090_snapshot.json")));
  assert.ok(fs.existsSync(path.resolve("drizzle/meta/0091_snapshot.json")));
  assert.ok(fs.existsSync(path.resolve("drizzle/meta/0092_snapshot.json")));
  assert.ok(fs.existsSync(path.resolve("drizzle/meta/0093_snapshot.json")));
  assert.ok(fs.existsSync(path.resolve("drizzle/meta/0094_snapshot.json")));
  const sql = fs.readFileSync(
    path.resolve("drizzle/0089_cms_core_control_plane.sql"),
    "utf8",
  );
  assert.match(sql, /CREATE SCHEMA IF NOT EXISTS "nr_control"/);
  const detach = fs.readFileSync(
    path.resolve("drizzle/0090_webshop_core_detach.sql"),
    "utf8",
  );
  assert.match(detach, /operator_schema_cutover_required/);
  assert.doesNotMatch(detach, /DROP\s+TABLE[^;]*\sCASCADE/i);
});

test("provisioning constants reserve no worker-owned secret root", () => {
  assert.equal(
    __coreDbProvisioningTesting.OPERATOR_ROOT,
    "D:\\nr_runtime\\operator-secrets",
  );
  assert.deepEqual(__coreDbProvisioningTesting.CORE_SCHEMAS, [
    "public",
    "drizzle",
    "nr_control",
  ]);
});
