import process from "node:process";
import pg from "pg";

import {
  buildLocalDatabaseUrl,
  loadCmsCorePrivilegeManifest,
  migrationSetHash,
  parseStrictArguments,
  quoteIdentifier,
  resolveCmsCoreTarget,
} from "./core-db-contract.mjs";
import {
  assertWindowsAdministrator,
  reconcileRuntimePrivileges,
  redactedProvisionReceipt,
  unsealMigratorPasswordRef,
} from "./core-db-provisioning.mjs";
import {
  loadMigrations,
  runDrizzleMigrations,
} from "./run-drizzle-migrations.mjs";

const { Client } = pg;
const CORE_SCHEMA_IDENTITIES = ["public", "drizzle", "nr_control"];

function fail(message) {
  throw new Error(`[cms-core-db] ${message}`);
}

function readArguments(argv) {
  const parsed = parseStrictArguments(argv, ["--target"], ["--dry-run"]);
  if (!parsed.values.has("--target")) fail("--target is required.");
  return parsed;
}

function coreLockKey(target) {
  return `nr-cms:core-migrate:${target.targetName}:v1`;
}

async function setExactCoreOwnerRole(client, target) {
  await client.query(`SET ROLE ${quoteIdentifier(target.roles.owner)}`);
  const result = await client.query("SELECT current_user, session_user");
  const row = result.rows[0];
  if (
    row?.current_user !== target.roles.owner ||
    row?.session_user !== target.roles.migrator
  ) {
    fail(
      "migration session did not bind the exact target migrator and owner roles.",
    );
  }
}

async function assertCoreOwnershipAndGrants(client, target) {
  const owner = target.roles.owner;
  const runtime = target.roles.runtime;
  const objects = await client.query(
    `
      SELECT n.nspname AS schema_name, c.relname, pg_get_userbyid(c.relowner) AS owner
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = ANY($1::text[])
        AND c.relkind IN ('r', 'p', 'S', 'v', 'm', 'f')
      ORDER BY n.nspname, c.relname
    `,
    [CORE_SCHEMA_IDENTITIES],
  );
  if (objects.rows.some((row) => row.owner !== owner)) {
    fail(
      "a core/control-plane object is not owned by the exact target core owner.",
    );
  }

  const grants = await client.query(
    `
      SELECT
        has_schema_privilege($1, 'public', 'USAGE') AS public_usage,
        has_schema_privilege($1, 'nr_control', 'USAGE') AS control_usage,
        has_schema_privilege($1, 'drizzle', 'USAGE') AS ledger_usage,
        has_table_privilege($1, 'drizzle.__drizzle_migrations', 'SELECT') AS ledger_select
    `,
    [runtime],
  );
  const grant = grants.rows[0];
  if (
    !grant?.public_usage ||
    !grant.ledger_usage ||
    !grant.ledger_select ||
    grant.control_usage
  ) {
    fail("runtime grants do not match CmsCorePrivilegeManifestV1.");
  }
}

async function recordMigrationReceipt(client, target, migrationHash) {
  await client.query(
    `
      INSERT INTO nr_control.cms_core_migration_receipts
        (target, database_resource_id, manifest_hash, migration_set_hash, status)
      VALUES ($1, $2, $3, $4, 'applied')
      ON CONFLICT (target, manifest_hash, migration_set_hash) DO NOTHING
    `,
    [
      target.targetName,
      target.databaseResourceId,
      target.manifestHash,
      migrationHash,
    ],
  );
}

export async function migrateCmsCoreDatabase({
  target,
  migratorPassword,
  dryRunOnly = false,
}) {
  const migrations = loadMigrations();
  const setHash = migrationSetHash(migrations);
  const connectionString = buildLocalDatabaseUrl(
    target,
    target.roles.migrator,
    migratorPassword,
  );
  const client = new Client({ connectionString });
  await client.connect();

  try {
    await setExactCoreOwnerRole(client, target);
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [
      coreLockKey(target),
    ]);
    try {
      const dryRun = await runDrizzleMigrations({
        connectionString,
        dryRun: true,
        ignoreAutoMigrateDisable: true,
        schemaIdentities: CORE_SCHEMA_IDENTITIES,
        setRole: target.roles.owner,
      });
      if (dryRunOnly) {
        return redactedProvisionReceipt(target, "migration-dry-run", {
          migrationSetHash: setHash,
          pendingMigrations: dryRun.pendingTags,
        });
      }

      await runDrizzleMigrations({
        connectionString,
        ignoreAutoMigrateDisable: true,
        schemaIdentities: CORE_SCHEMA_IDENTITIES,
        setRole: target.roles.owner,
      });
      await reconcileRuntimePrivileges(client, target);
      const finalCheck = await runDrizzleMigrations({
        connectionString,
        dryRun: true,
        ignoreAutoMigrateDisable: true,
        schemaIdentities: CORE_SCHEMA_IDENTITIES,
        setRole: target.roles.owner,
      });
      if (finalCheck.pendingTags.length !== 0) {
        fail("final checksum check reported pending migrations.");
      }
      await assertCoreOwnershipAndGrants(client, target);
      await recordMigrationReceipt(client, target, setHash);
      return redactedProvisionReceipt(target, "migrated", {
        migrationSetHash: setHash,
        pendingBeforeApply: dryRun.pendingTags,
      });
    } finally {
      await client.query("SELECT pg_advisory_unlock(hashtext($1))", [
        coreLockKey(target),
      ]);
    }
  } finally {
    await client.end();
  }
}

export async function runCoreMigration(argv = process.argv.slice(2)) {
  const parsed = readArguments(argv);
  const target = resolveCmsCoreTarget(
    parsed.values.get("--target"),
    loadCmsCorePrivilegeManifest(),
  );
  assertWindowsAdministrator();
  const migratorPassword = unsealMigratorPasswordRef(target);
  return migrateCmsCoreDatabase({
    target,
    migratorPassword,
    dryRunOnly: parsed.flags.has("--dry-run"),
  });
}

if (process.argv[1]?.endsWith("db-core-migrate.mjs")) {
  runCoreMigration()
    .then((receipt) => console.log(JSON.stringify(receipt)))
    .catch((error) => {
      console.error(
        error instanceof Error
          ? error.message
          : "[cms-core-db] migration failed.",
      );
      process.exitCode = 1;
    });
}

export const __coreDbMigrationTesting = { CORE_SCHEMA_IDENTITIES, coreLockKey };
