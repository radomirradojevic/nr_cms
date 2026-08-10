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

export function centralMigrationTagsFromJournal(journal) {
  if (
    journal?.version !== "7"
    || journal?.dialect !== "postgresql"
    || !Array.isArray(journal.entries)
    || journal.entries.length === 0
  ) {
    throw new Error("[migration-matrix] invalid central Drizzle journal.");
  }
  const tags = journal.entries.map((entry, index) => {
    if (entry?.idx !== index || typeof entry?.tag !== "string" || !/^\d{4}_[a-z0-9_]+$/.test(entry.tag)) {
      throw new Error("[migration-matrix] invalid central Drizzle journal entry.");
    }
    return entry.tag;
  });
  if (new Set(tags).size !== tags.length) {
    throw new Error("[migration-matrix] duplicate central Drizzle migration tag.");
  }
  return tags;
}

export function canRollbackPackage({ currentSchemaVersion, supportedSchemaRange }) {
  return currentSchemaVersion >= supportedSchemaRange.min && currentSchemaVersion <= supportedSchemaRange.max;
}

if (process.argv[1]?.endsWith("migration-matrix-harness.mjs")) {
  const target = process.env.MIGRATION_MATRIX_DATABASE_URL ?? process.env.TEST_DATABASE_URL;
  assertSafeTestDatabaseUrl(target, "MIGRATION_MATRIX_DATABASE_URL");
  console.log(JSON.stringify({ database: "dedicated-test-target", plan: buildMigrationMatrixPlan(), version: MIGRATION_MATRIX_VERSION }));
}
