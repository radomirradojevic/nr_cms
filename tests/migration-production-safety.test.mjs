import assert from "node:assert/strict";
import test from "node:test";

import {
  assertExpectedMigrationList,
  assertMigrationChecksum,
  assertProductionMigrationTarget,
  migrationModeAllowsRepair,
  shouldHonorAutoMigrateDisable,
} from "../scripts/migration-production-safety.mjs";

const productionEnv = {
  DATABASE_URL: "postgresql://user:password@cms-db.internal:5432/nr_cms",
  NR_MIGRATION_EXPECTED_DATABASE: "nr_cms",
  NR_MIGRATION_EXPECTED_HOST: "cms-db.internal",
  NR_MIGRATION_EXPECTED_PROVIDER_RESOURCE_ID: "cms-prod-resource-1",
  NR_MIGRATION_PROVIDER_RESOURCE_ID: "cms-prod-resource-1",
  NR_MIGRATION_SERVICE: "cms",
  NR_MIGRATION_TARGET: "production",
};

test("production migration target guard validates service host database and provider resource without echoing DSN", () => {
  assert.deepEqual(assertProductionMigrationTarget(productionEnv, "cms"), {
    database: "nr_cms",
    host: "cms-db.internal",
    providerResourceId: "cms-prod-resource-1",
    service: "cms",
  });
  assert.throws(
    () => assertProductionMigrationTarget({ ...productionEnv, NR_MIGRATION_PROVIDER_RESOURCE_ID: "other" }, "cms"),
    (error) => error instanceof Error && /provider resource ID/i.test(error.message) && !error.message.includes("postgresql://"),
  );
});

test("production mode hard-fails checksum mismatch and never enables repair or adopt", () => {
  assert.throws(() => assertMigrationChecksum({ actual: "b".repeat(64), expected: "a".repeat(64), tag: "0001_fixture" }), /checksum mismatch/i);
  assert.equal(migrationModeAllowsRepair({ NR_MIGRATION_TARGET: "production" }), false);
  assert.equal(migrationModeAllowsRepair({ NR_MIGRATION_TARGET: "test" }), true);
});

test("apply requires the exact operator-confirmed pending migration list", () => {
  assert.deepEqual(assertExpectedMigrationList(["0007_a", "0008_b"], "0007_a,0008_b"), ["0007_a", "0008_b"]);
  assert.throws(() => assertExpectedMigrationList(["0007_a"], "0007_a,0008_b"), /expected migration list/i);
});

test("dry-run ignores DRIZZLE_AUTO_MIGRATE disable while apply honors it", () => {
  assert.equal(shouldHonorAutoMigrateDisable({ DRIZZLE_AUTO_MIGRATE: "false" }, { dryRun: true }), false);
  assert.equal(shouldHonorAutoMigrateDisable({ DRIZZLE_AUTO_MIGRATE: "false" }, { dryRun: false }), true);
});
