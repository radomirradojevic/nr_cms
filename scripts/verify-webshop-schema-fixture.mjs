/**
 * Isolated acceptance fixture for the package-owned Webshop baseline. It
 * creates and destroys a dedicated database; it never opens vendor/client
 * databases and never prints credentials.
 */
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import pg from "pg";

import {
  WEBSHOP_CURRENT_TABLES,
  canonicalJson,
  loadWebshopSchemaManifest,
  sha256,
} from "./webshop-schema-contract.mjs";
import { inspectWebshopSchema } from "./webshop-schema-fingerprint.mjs";

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webshopMigrationsDir = path.join(
  root,
  ".private",
  "webshop",
  "migrations",
);
const adminPasswordPath =
  "D:\\nr_runtime\\operator-input\\cms-core-postgres-admin.password";
const expectedHash = process.argv
  .find((value) => value.startsWith("--expect-hash="))
  ?.slice("--expect-hash=".length);
const runPaymentTest = process.argv.includes("--run-payment-test");
const runRemediationInvariants = process.argv.includes(
  "--run-remediation-invariants",
);

function fail(message) {
  throw new Error(`[webshop-schema-fixture] ${message}`);
}

function readDatabaseUrl() {
  const envPath = path.join(root, ".env");
  const line = fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.startsWith("DATABASE_URL="));
  if (!line)
    fail(
      "DATABASE_URL is required only to locate the local PostgreSQL server.",
    );
  const value = line.slice("DATABASE_URL=".length).trim().replace(/^"|"$/g, "");
  const source = new URL(value);
  if (!["localhost", "127.0.0.1", "::1"].includes(source.hostname))
    fail("fixture requires a loopback PostgreSQL DATABASE_URL.");
  return source;
}

function readAdminPassword() {
  const stat = fs.lstatSync(adminPasswordPath);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.size === 0 ||
    stat.size > 4096
  ) {
    fail("the protected PostgreSQL administrator password file is invalid.");
  }
  const password = fs.readFileSync(adminPasswordPath, "utf8").trim();
  if (!password)
    fail("the protected PostgreSQL administrator password file is empty.");
  return password;
}

function quoteIdentifier(identifier) {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(identifier))
    fail("generated fixture database identifier is invalid.");
  return `"${identifier}"`;
}

function connectionUrl(database) {
  const source = readDatabaseUrl();
  source.username = "postgres";
  source.password = readAdminPassword();
  source.pathname = `/${database}`;
  return source.toString();
}

function splitStatements(sql) {
  return sql
    .split(/\r?\n--> statement-breakpoint\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function loadWebshopMigrations() {
  return fs
    .readdirSync(webshopMigrationsDir)
    .filter((entry) => /^[0-9]{4}_[a-z0-9_]+\.sql$/.test(entry))
    .sort()
    .map((entry) => ({
      id: entry,
      sql: fs.readFileSync(path.join(webshopMigrationsDir, entry), "utf8"),
    }));
}

async function createHostReferences(client) {
  await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  await client.query(`
    CREATE TABLE public.content_categories (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      content_type text NOT NULL
    );
    CREATE TABLE public.content (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      content_type text NOT NULL,
      category_id uuid,
      title text,
      slug text,
      author_id text
    );
    CREATE TABLE public.files (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
    CREATE TABLE public.galleries (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
    CREATE TABLE public.webshop_addon_entitlements (
      id integer PRIMARY KEY,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb
    );
  `);
}

async function runIsolatedPaymentFixture(databaseUrl) {
  const packageRoot = path.join(root, ".private", "webshop");
  const loaderUrl = pathToFileURL(
    path.join(packageRoot, "tests", "register-server-only-loader.mjs"),
  ).href;
  const testPath = path
    .relative(
      root,
      path.join(packageRoot, "tests", "payment-state-v2.database.runner.ts"),
    )
    .replaceAll(path.sep, "/");
  const child = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      "--import",
      loaderUrl,
      "--test",
      "--test-concurrency=1",
      "--test-reporter",
      "spec",
      testPath,
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        NODE_ENV: "test",
        NR_WEBSHOP_ISOLATED_PAYMENT_TEST: "1",
        TEST_DATABASE_URL: databaseUrl,
        TSX_TSCONFIG_PATH: path.join(root, "tsconfig.json"),
      },
      stdio: "inherit",
    },
  );
  await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal || code !== 0) {
        reject(new Error("isolated_payment_fixture_failed"));
        return;
      }
      resolve();
    });
  });
}

async function runIsolatedRemediationInvariants(databaseUrl) {
  const centralUrl = process.env.NR_ACCEPTANCE_CENTRAL_TEST_DATABASE_URL;
  if (!centralUrl)
    fail("NR_ACCEPTANCE_CENTRAL_TEST_DATABASE_URL is required for remediation invariants.");
  const child = spawn(
    process.execPath,
    ["scripts/run-remediation-invariants.mjs", "--local"],
    {
      cwd: root,
      env: {
        ...process.env,
        NR_ACCEPTANCE_CMS_TEST_DATABASE_URL: databaseUrl,
        NR_ACCEPTANCE_CENTRAL_TEST_DATABASE_URL: centralUrl,
        NR_ACCEPTANCE_TARGET: "local",
      },
      stdio: "inherit",
    },
  );
  await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal || code !== 0) {
        reject(new Error("isolated_remediation_invariants_failed"));
        return;
      }
      resolve();
    });
  });
}

async function introspect(client) {
  const relationRows = await client.query(`
    SELECT c.relname AS table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'webshop' AND c.relkind IN ('r', 'p')
     ORDER BY c.relname
  `);
  const tableNames = relationRows.rows.map((row) => row.table_name);
  const publicLegacy = await client.query(
    `
    SELECT c.relname
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relname = ANY($1::text[])
     ORDER BY c.relname
  `,
    [loadWebshopSchemaManifest().relocatedBusinessTables],
  );
  const columns = await client.query(`
    SELECT c.table_name, c.column_name, c.ordinal_position, c.is_nullable,
           c.udt_schema, c.udt_name, c.column_default
      FROM information_schema.columns c
     WHERE c.table_schema = 'webshop'
     ORDER BY c.table_name, c.ordinal_position
  `);
  const constraints = await client.query(`
    SELECT r.relname AS table_name, c.conname, c.contype, pg_get_constraintdef(c.oid, true) AS definition
      FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
     WHERE n.nspname = 'webshop'
     ORDER BY r.relname, c.conname
  `);
  const indexes = await client.query(`
    SELECT r.relname AS table_name, i.relname AS index_name, pg_get_indexdef(i.oid, 0, true) AS definition
      FROM pg_index x
      JOIN pg_class r ON r.oid = x.indrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      JOIN pg_class i ON i.oid = x.indexrelid
     WHERE n.nspname = 'webshop'
     ORDER BY r.relname, i.relname
  `);
  const triggers = await client.query(`
    SELECT r.relname AS table_name, t.tgname AS trigger_name,
           pg_get_triggerdef(t.oid, true) AS definition
      FROM pg_trigger t
      JOIN pg_class r ON r.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
     WHERE n.nspname = 'webshop' AND NOT t.tgisinternal
     ORDER BY r.relname, t.tgname
  `);
  const crossSchemaFks = await client.query(`
    SELECT src.relname AS source_table, dstn.nspname AS destination_schema, dst.relname AS destination_table
      FROM pg_constraint c
      JOIN pg_class src ON src.oid = c.conrelid
      JOIN pg_namespace srcn ON srcn.oid = src.relnamespace
      JOIN pg_class dst ON dst.oid = c.confrelid
      JOIN pg_namespace dstn ON dstn.oid = dst.relnamespace
     WHERE c.contype = 'f' AND srcn.nspname = 'webshop' AND dstn.nspname = 'public'
     ORDER BY src.relname, dst.relname
  `);
  const projection = {
    version: "WebshopSchemaFingerprintV1",
    tables: tableNames.map((table) => ({
      name: table,
      columns: columns.rows
        .filter((row) => row.table_name === table)
        .map((row) => ({
          columnDefault: row.column_default,
          isNullable: row.is_nullable,
          name: row.column_name,
          udtName: row.udt_name,
          udtSchema: row.udt_schema,
        }))
        .sort((left, right) => left.name.localeCompare(right.name)),
      constraints: constraints.rows
        .filter((row) => row.table_name === table)
        .map((row) => ({
          definition: row.definition,
          name: row.conname,
          type: row.contype,
        })),
      indexes: indexes.rows
        .filter((row) => row.table_name === table)
        .map((row) => ({
          definition: row.definition,
          name: row.index_name,
        })),
      triggers: triggers.rows
        .filter((row) => row.table_name === table)
        .map((row) => ({
          definition: row.definition,
          name: row.trigger_name,
        })),
    })),
  };
  return {
    crossSchemaFks: crossSchemaFks.rows,
    fingerprint: sha256(canonicalJson(projection)),
    publicLegacyTables: publicLegacy.rows.map((row) => row.relname),
    tableNames,
    triggerNames: triggers.rows.map((row) => row.trigger_name),
  };
}

async function dropDatabase(admin, database) {
  await admin.query(
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
    [database],
  );
  await admin.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(database)}`);
  const exists = await admin.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [database],
  );
  if (exists.rowCount)
    fail("temporary fixture cleanup did not remove its database.");
}

const database = `nr_webshop_p03_test_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
const admin = new Client({ connectionString: connectionUrl("postgres") });
let fixture;
let adminConnected = false;
try {
  await admin.connect();
  adminConnected = true;
  await admin.query(`CREATE DATABASE ${quoteIdentifier(database)}`);
  fixture = new Client({ connectionString: connectionUrl(database) });
  await fixture.connect();
  await createHostReferences(fixture);
  const migrations = loadWebshopMigrations();
  for (const migration of migrations) {
    const statements = splitStatements(migration.sql);
    for (const [index, statement] of statements.entries()) {
      try {
        await fixture.query(statement);
      } catch (error) {
        fail(
          `${migration.id} statement ${index + 1}/${statements.length} failed: ${error instanceof Error ? error.message : "unknown PostgreSQL error"}`,
        );
      }
    }
  }
  const receipt = await introspect(fixture);
  const sharedReceipt = await inspectWebshopSchema(
    fixture,
    loadWebshopSchemaManifest(),
  );
  if (sharedReceipt.fingerprint !== receipt.fingerprint) {
    fail(
      "shared WebshopSchemaFingerprintV1 projection diverged from baseline fixture.",
    );
  }
  const expectedTables = [...WEBSHOP_CURRENT_TABLES].sort();
  if (JSON.stringify(receipt.tableNames) !== JSON.stringify(expectedTables))
    fail("package migrations did not create the exact current Webshop schema.");
  if (receipt.publicLegacyTables.length)
    fail("baseline left a legacy Webshop business table in public.");
  if (
    !receipt.crossSchemaFks.some((row) =>
      ["content", "files", "galleries"].includes(row.destination_table),
    )
  ) {
    fail(
      "baseline does not contain required schema-qualified host foreign keys.",
    );
  }
  for (const trigger of [
    "webshop_webshops_content_type_trigger",
    "webshop_orders_delete_denied",
    "webshop_payments_delete_denied",
    "webshop_refunds_delete_denied",
    "webshop_fulfillments_delete_denied",
    "webshop_license_keys_delete_denied",
    "webshop_download_entitlements_delete_denied",
  ]) {
    if (!receipt.triggerNames.includes(trigger))
      fail(`baseline is missing ${trigger}.`);
  }
  if (expectedHash && receipt.fingerprint !== expectedHash)
    fail("postcondition fingerprint does not match the pinned descriptor.");
  if (runPaymentTest) await runIsolatedPaymentFixture(connectionUrl(database));
  if (runRemediationInvariants)
    await runIsolatedRemediationInvariants(connectionUrl(database));
  console.log(
    JSON.stringify({
      fixture: "isolated-cleanup-verified",
      postconditionSchemaFingerprintSha256: receipt.fingerprint,
      tableCount: receipt.tableNames.length,
    }),
  );
} finally {
  await fixture?.end().catch(() => undefined);
  if (adminConnected)
    await dropDatabase(admin, database).catch(() => undefined);
  await admin.end().catch(() => undefined);
}
