import { spawn } from "node:child_process";
import process from "node:process";
import pg from "pg";

import { assertSafeTestDatabaseUrl } from "./database-test-safety.mjs";
import { buildCentralMigrationApplyPlan, buildMigrationMatrixPlan, canRollbackPackage } from "./migration-matrix-harness.mjs";

const { Client } = pg;
const service = process.argv.find((arg) => arg.startsWith("--service="))?.slice("--service=".length) ?? "cms";
const matrixUrl = service === "central"
  ? process.env.NRLS_MIGRATION_MATRIX_DATABASE_URL
  : process.env.MIGRATION_MATRIX_DATABASE_URL ?? process.env.TEST_DATABASE_URL;
const variableName = service === "central" ? "NRLS_MIGRATION_MATRIX_DATABASE_URL" : "MIGRATION_MATRIX_DATABASE_URL";

function fail(message) { throw new Error(`[migration-matrix] ${message}`); }
function command(commandName, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(commandName, args, { cwd: process.cwd(), env, shell: false, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${commandName} ${args.join(" ")} exited ${code ?? 1}`)));
  });
}
async function expectFailure(commandName, args, env) {
  try { await command(commandName, args, env); }
  catch { return; }
  fail("expected command failure did not occur.");
}
async function resetDedicatedDatabase(client) {
  await client.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
  await client.query("DROP SCHEMA IF EXISTS nrls CASCADE");
  await client.query("DROP SCHEMA IF EXISTS public CASCADE");
  await client.query("CREATE SCHEMA public");
}
async function cmsMatrix(url) {
  const env = { ...process.env, TEST_DATABASE_URL: url, NODE_ENV: "test" };
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await resetDedicatedDatabase(client);
    await command(process.execPath, ["scripts/run-drizzle-migrations.mjs", "--test", "--test-bootstrap-ledger"], env);
    await command(process.execPath, ["scripts/run-drizzle-migrations.mjs", "--test"], env);

    await resetDedicatedDatabase(client);
    // Minimum supported upgrade starts from the public license-server issue schema.
    await command(process.execPath, ["scripts/run-drizzle-migrations.mjs", "--test", "--test-bootstrap-ledger", "--through=0075_webshop_license_server_issues"], env);
    await command(process.execPath, ["scripts/run-drizzle-migrations.mjs", "--test"], env);

    await resetDedicatedDatabase(client);
    await command(process.execPath, ["scripts/run-drizzle-migrations.mjs", "--test", "--test-bootstrap-ledger", "--through=0087_webshop_license_key_encryption"], env);
    await command(process.execPath, ["scripts/run-drizzle-migrations.mjs", "--test"], env);

    await client.query("UPDATE drizzle.__drizzle_migrations SET hash = repeat('0', 64) WHERE id = (SELECT min(id) FROM drizzle.__drizzle_migrations)");
    await expectFailure(process.execPath, ["scripts/run-drizzle-migrations.mjs", "--test", "--dry-run"], env);

    await client.query("CREATE TABLE migration_matrix_backfill (id integer primary key, done boolean not null default false)");
    await client.query("INSERT INTO migration_matrix_backfill (id) VALUES (1), (2)");
    await client.query("BEGIN");
    await client.query("UPDATE migration_matrix_backfill SET done = true WHERE id = 1");
    await client.query("ROLLBACK");
    const interrupted = await client.query("SELECT count(*)::int AS count FROM migration_matrix_backfill WHERE done");
    if (interrupted.rows[0]?.count !== 0) fail("interrupted backfill was not rolled back.");
    await client.query("UPDATE migration_matrix_backfill SET done = true WHERE NOT done");

    await client.query("CREATE TABLE migration_matrix_conflict_preflight (business_key text NOT NULL)");
    await client.query("INSERT INTO migration_matrix_conflict_preflight (business_key) VALUES ('duplicate'), ('duplicate')");
    const conflict = await client.query("SELECT business_key FROM migration_matrix_conflict_preflight GROUP BY business_key HAVING count(*) > 1");
    if (conflict.rowCount !== 1) fail("conflict preflight did not detect duplicate values before a unique deployment.");

    await client.query("BEGIN");
    await client.query("CREATE TABLE migration_matrix_atomic_failure (id integer)");
    try { await client.query("SELECT 1 / 0"); } catch { await client.query("ROLLBACK"); }
    const atomic = await client.query("SELECT to_regclass('public.migration_matrix_atomic_failure') AS name");
    if (atomic.rows[0]?.name) fail("failed migration transaction was not rolled back.");

    // Expand compatibility: old readers keep their original column while new
    // code dual-writes the additive column. This is intentionally database real.
    await client.query("CREATE TABLE migration_matrix_expand (id integer primary key, legacy_value text NOT NULL, expanded_value text)");
    await client.query("INSERT INTO migration_matrix_expand (id, legacy_value) VALUES (1, 'compatible')");
    const oldReader = await client.query("SELECT legacy_value FROM migration_matrix_expand WHERE id = 1");
    if (oldReader.rows[0]?.legacy_value !== "compatible") fail("old code cannot read expand schema.");
    await client.query("UPDATE migration_matrix_expand SET legacy_value = 'dual-write', expanded_value = 'dual-write' WHERE id = 1");
    const newReader = await client.query("SELECT legacy_value, expanded_value FROM migration_matrix_expand WHERE id = 1");
    if (newReader.rows[0]?.legacy_value !== "dual-write" || newReader.rows[0]?.expanded_value !== "dual-write") fail("new code dual-write verification failed.");
    if (!canRollbackPackage({ currentSchemaVersion: 8, supportedSchemaRange: { min: 6, max: 8 } })) fail("compatible package rollback was rejected.");
    if (canRollbackPackage({ currentSchemaVersion: 9, supportedSchemaRange: { min: 6, max: 8 } })) fail("incompatible package rollback was accepted.");
  } finally { await client.end(); }
}

async function centralMatrix(url) {
  const env = { ...process.env, NRLS_TEST_DATABASE_URL: url, NODE_ENV: "test" };
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await resetDedicatedDatabase(client);
  } finally { await client.end(); }
  const migrationTags = ["0000_initial", "0001_addon_product_keys", "0002_vendor_license_v2", "0003_vendor_addon_activation_signing", "0004_security_operations", "0005_vendor_subscriptions_updates"];
  for (const step of buildCentralMigrationApplyPlan(migrationTags)) {
    await command(process.execPath, ["scripts/migration-runner.mjs", "--apply", "--test", `--expected-migrations=${step.expectedMigrations}`], env);
  }
  await command(process.execPath, ["scripts/migration-runner.mjs", "--dry-run", "--test"], env);
}

const url = assertSafeTestDatabaseUrl(matrixUrl, variableName);
if (service !== "cms" && service !== "central") fail("--service must be cms or central.");
console.log(JSON.stringify({ service, version: 1, scenarios: buildMigrationMatrixPlan().map((scenario) => scenario.id) }));
await (service === "cms" ? cmsMatrix(url) : centralMatrix(url));
console.log(`[migration-matrix] ${service} matrix passed`);
