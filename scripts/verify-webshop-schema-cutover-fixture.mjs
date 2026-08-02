/**
 * Isolated populated-legacy / cutover / retry / restore acceptance fixture.
 * It uses a random test database and temporary NOLOGIN roles, then proves all
 * resources were removed in finally. Vendor/client databases and their roles
 * are never opened or changed.
 */
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

import { executeWebshopSchemaCutover } from "./db-webshop-schema-cutover.mjs";
import { loadWebshopSchemaManifest } from "./webshop-schema-contract.mjs";
import { runDrizzleMigrations } from "./run-drizzle-migrations.mjs";
import { inspectWebshopSchema } from "./webshop-schema-fingerprint.mjs";

const { Client } = pg;
const root = path.resolve(import.meta.dirname, "..");
const adminPasswordPath = "D:\\nr_runtime\\operator-input\\cms-core-postgres-admin.password";
const suffix = randomUUID().replaceAll("-", "").slice(0, 16);
const database = `nr_webshop_cutover_p03_${suffix}`;
const baselineDatabase = `nr_webshop_baseline_p03_${suffix}`;
const deployerRole = `nr_p03_webshop_deployer_${suffix}`;
const runtimeRole = `nr_p03_webshop_runtime_${suffix}`;

function fail(message) {
  throw new Error(`[webshop-cutover-fixture] ${message}`);
}

function readBaseUrl() {
  const line = fs.readFileSync(path.join(root, ".env"), "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.startsWith("DATABASE_URL="));
  if (!line) fail("DATABASE_URL is required only to locate local PostgreSQL.");
  const url = new URL(line.slice("DATABASE_URL=".length).trim().replace(/^"|"$/g, ""));
  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    fail("fixture requires loopback PostgreSQL.");
  }
  return url;
}

function readAdminPassword() {
  const stat = fs.lstatSync(adminPasswordPath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 1 || stat.size > 4096) {
    fail("protected PostgreSQL administrator password input is invalid.");
  }
  const password = fs.readFileSync(adminPasswordPath, "utf8").trim();
  if (!password) fail("protected PostgreSQL administrator password input is empty.");
  return password;
}

function quote(identifier) {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(identifier)) fail("generated identifier is invalid.");
  return `"${identifier}"`;
}

function connectionUrl(databaseName) {
  const url = readBaseUrl();
  url.username = "postgres";
  url.password = readAdminPassword();
  url.pathname = `/${databaseName}`;
  return url.toString();
}

async function insertLegacyFixtureRows(client) {
  const category = await client.query(`
    INSERT INTO public.content_categories (name, content_type)
    VALUES ('Fixture webshop', 'webshop') RETURNING id
  `);
  const content = await client.query(`
    INSERT INTO public.content (content_type, category_id, title, slug, author_id)
    VALUES ('webshop', $1, 'Fixture webshop', 'fixture-webshop-${suffix}', 'fixture-operator')
    RETURNING id
  `, [category.rows[0].id]);
  const webshopId = content.rows[0].id;
  await client.query(`
    INSERT INTO public.webshop_addon_entitlements (id, metadata)
    VALUES (1, '{"settings":{"currency":"RSD"},"storefrontPresets":{"theme":"fixture"},"orderNumberAllocator":{"next":42}}'::jsonb)
    ON CONFLICT (id) DO UPDATE SET metadata = EXCLUDED.metadata
  `);
  await client.query(
    "INSERT INTO public.webshop_carts (webshop_id, anonymous_token_hash) VALUES ($1, 'fixture-cart-token')",
    [webshopId],
  );
  await client.query(`
    INSERT INTO public.webshop_attributes (key, label, type, created_by, updated_by)
    VALUES ('fixture_attribute', 'Fixture attribute', 'text', 'fixture-operator', 'fixture-operator')
  `);
  return webshopId;
}

function splitStatements(sql) {
  return sql.split(/\r?\n--> statement-breakpoint\r?\n/).map((statement) => statement.trim()).filter(Boolean);
}

function loadWebshopMigrations() {
  const migrationsDir = path.join(root, ".private", "webshop", "migrations");
  return fs
    .readdirSync(migrationsDir)
    .filter((entry) => /^[0-9]{4}_[a-z0-9_]+\.sql$/.test(entry))
    .sort()
    .map((entry) => fs.readFileSync(path.join(migrationsDir, entry), "utf8"));
}

async function createCanonicalBaselineReference(admin, manifest) {
  await admin.query(`CREATE DATABASE ${quote(baselineDatabase)}`);
  const baseline = new Client({ connectionString: connectionUrl(baselineDatabase) });
  await baseline.connect();
  try {
    await baseline.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await baseline.query(`
      CREATE TABLE public.content (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), content_type text NOT NULL);
      CREATE TABLE public.files (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      CREATE TABLE public.galleries (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      CREATE TABLE public.webshop_addon_entitlements (id integer PRIMARY KEY, metadata jsonb NOT NULL DEFAULT '{}'::jsonb);
    `);
    for (const sql of loadWebshopMigrations()) {
      for (const statement of splitStatements(sql)) await baseline.query(statement);
    }
    return await inspectWebshopSchema(baseline, manifest);
  } finally {
    await baseline.end();
  }
}

function structuralDifferences(expected, actual, path = "projection", differences = []) {
  if (differences.length >= 40) return differences;
  if (typeof expected !== typeof actual) {
    differences.push(`${path}: type differs`);
    return differences;
  }
  if (expected === null || actual === null || typeof expected !== "object") {
    if (expected !== actual) differences.push(`${path}: ${JSON.stringify(expected)} != ${JSON.stringify(actual)}`);
    return differences;
  }
  if (Array.isArray(expected) !== Array.isArray(actual)) {
    differences.push(`${path}: array shape differs`);
    return differences;
  }
  const expectedKeys = Array.isArray(expected) ? [...expected.keys()] : Object.keys(expected).sort();
  const actualKeys = Array.isArray(actual) ? [...actual.keys()] : Object.keys(actual).sort();
  if (JSON.stringify(expectedKeys) !== JSON.stringify(actualKeys)) {
    if (path.endsWith(".constraints")) {
      differences.push(`${path}: names differ (${JSON.stringify(expected.map((entry) => entry.name))} != ${JSON.stringify(actual.map((entry) => entry.name))})`);
    } else {
      differences.push(`${path}: keys differ (${JSON.stringify(expectedKeys)} != ${JSON.stringify(actualKeys)})`);
    }
    return differences;
  }
  for (const key of expectedKeys) {
    structuralDifferences(expected[key], actual[key], `${path}.${String(key)}`, differences);
    if (differences.length >= 40) break;
  }
  return differences;
}

async function assertBackfill(client, webshopId) {
  const settings = await client.query(`
    SELECT settings, storefront_presets, order_number_allocator
      FROM webshop.webshop_settings WHERE webshop_id = $1
  `, [webshopId]);
  if (settings.rowCount !== 1 || settings.rows[0].settings.currency !== "RSD" || settings.rows[0].storefront_presets.theme !== "fixture" || settings.rows[0].order_number_allocator.next !== 42) {
    fail("entitlement metadata was not backfilled into webshop_settings.");
  }
  const metadata = await client.query("SELECT metadata FROM public.webshop_addon_entitlements WHERE id = 1");
  for (const key of ["settings", "storefrontPresets", "orderNumberAllocator"]) {
    if (Object.hasOwn(metadata.rows[0]?.metadata ?? {}, key)) {
      fail(`legacy entitlement metadata key ${key} was not removed.`);
    }
  }
}

async function dropFixture(admin) {
  await admin.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()", [database]);
  await admin.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()", [baselineDatabase]);
  await admin.query(`DROP DATABASE IF EXISTS ${quote(database)}`);
  await admin.query(`DROP DATABASE IF EXISTS ${quote(baselineDatabase)}`);
  await admin.query(`DROP ROLE IF EXISTS ${quote(deployerRole)}`);
  await admin.query(`DROP ROLE IF EXISTS ${quote(runtimeRole)}`);
  const databaseExists = await admin.query("SELECT 1 FROM pg_database WHERE datname = ANY($1::text[])", [[database, baselineDatabase]]);
  const rolesExist = await admin.query("SELECT 1 FROM pg_roles WHERE rolname = ANY($1::text[])", [[deployerRole, runtimeRole]]);
  if (databaseExists.rowCount || rolesExist.rowCount) fail("temporary fixture cleanup did not complete.");
}

const admin = new Client({ connectionString: connectionUrl("postgres") });
let adminConnected = false;
let fixture;
try {
  await admin.connect();
  adminConnected = true;
  await admin.query(`CREATE ROLE ${quote(deployerRole)} NOLOGIN`);
  await admin.query(`CREATE ROLE ${quote(runtimeRole)} NOLOGIN`);
  await admin.query(`CREATE DATABASE ${quote(database)}`);
  await runDrizzleMigrations({
    connectionString: connectionUrl(database),
    ignoreAutoMigrateDisable: true,
    schemaIdentities: ["public", "nr_control"],
    throughMigration: "0089_cms_core_control_plane",
  });
  fixture = new Client({ connectionString: connectionUrl(database) });
  await fixture.connect();
  const webshopId = await insertLegacyFixtureRows(fixture);
  const manifest = loadWebshopSchemaManifest();
  const expectedBaseline = await createCanonicalBaselineReference(admin, manifest);
  const coreTarget = { targetName: "fixture-vendor" };
  const target = { deployerRole, runtimeRole };

  const preflight = await executeWebshopSchemaCutover({
    apply: false, client: fixture, coreTarget, manifest, target,
  });
  if (preflight.operation !== "operator_schema_cutover_required" || !preflight.exactLegacy) {
    fail("exact populated legacy fixture was not rejected before operator cutover.");
  }

  const applied = await executeWebshopSchemaCutover({
    apply: true, client: fixture, coreTarget, manifest, target,
  });
  if (applied.operation !== "legacy_applied") fail("operator cutover did not apply.");
  if (applied.beforeEvidence.aggregateSha256 !== applied.afterEvidence.aggregateSha256) {
    fail("row-count aggregate changed during cutover.");
  }
  if (applied.postconditionSchemaFingerprintSha256 !== manifest.postconditionSchemaFingerprintSha256) {
    fail("cutover did not prove signed postcondition fingerprint.");
  }
  const actual = await inspectWebshopSchema(fixture, manifest);
  if (actual.fingerprint !== expectedBaseline.fingerprint) {
    fail(`cutover structure differs from canonical baseline: ${structuralDifferences(expectedBaseline.projection, actual.projection).join("; ") || "unknown difference"}`);
  }
  await assertBackfill(fixture, webshopId);

  const retry = await executeWebshopSchemaCutover({
    apply: true, client: fixture, coreTarget, manifest, target,
  });
  if (retry.operation !== "idempotent") fail("exact cutover retry was not idempotent.");

  console.log(JSON.stringify({
    fixture: "isolated-cleanup-verified",
    operation: applied.operation,
    postconditionSchemaFingerprintSha256: applied.postconditionSchemaFingerprintSha256,
    privilegeManifestHash: applied.privilegeManifestHash,
    rowCountAggregateSha256: applied.afterEvidence.aggregateSha256,
    retryOperation: retry.operation,
  }));
} finally {
  await fixture?.end().catch(() => undefined);
  if (adminConnected) await dropFixture(admin).catch(() => undefined);
  await admin.end().catch(() => undefined);
}
