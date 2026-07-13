import { assertSafeTestDatabaseUrl } from "./database-test-safety.mjs";

export const MIGRATION_MATRIX_VERSION = 1;

export function buildMigrationMatrixPlan() {
  return [
    "fresh",
    "upgrade_latest_production",
    "upgrade_minimum_supported",
    "rerun",
    "interrupted_backfill",
    "conflict_preflight",
    "checksum_mismatch",
    "failed_migration_atomic_recovery",
    "old_code_read_expand",
    "new_code_dual_write",
    "compatible_package_rollback",
    "incompatible_package_rollback",
  ].map((id) => ({ id, version: MIGRATION_MATRIX_VERSION }));
}

export function buildCentralMigrationApplyPlan(migrationTags) {
  const expectedMigrations = migrationTags.join(",");
  return [
    { expectedMigrations, scenario: "fresh" },
    { expectedMigrations: "", scenario: "rerun" },
  ];
}

export function canRollbackPackage({ currentSchemaVersion, supportedSchemaRange }) {
  return currentSchemaVersion >= supportedSchemaRange.min && currentSchemaVersion <= supportedSchemaRange.max;
}

if (process.argv[1]?.endsWith("migration-matrix-harness.mjs")) {
  const target = process.env.MIGRATION_MATRIX_DATABASE_URL ?? process.env.TEST_DATABASE_URL;
  assertSafeTestDatabaseUrl(target, "MIGRATION_MATRIX_DATABASE_URL");
  console.log(JSON.stringify({ database: "dedicated-test-target", plan: buildMigrationMatrixPlan(), version: MIGRATION_MATRIX_VERSION }));
}
