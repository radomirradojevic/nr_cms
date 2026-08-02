/**
 * One-shot isolated derivation fixture. It replays the versioned core history
 * only through the pre-detach ledger boundary and destroys its database in a
 * finally block. It never opens vendor/client databases.
 */
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

import { runDrizzleMigrations } from "./run-drizzle-migrations.mjs";
import { inspectLegacyWebshopPublicSchema } from "./webshop-schema-fingerprint.mjs";

const { Client } = pg;
const root = path.resolve(import.meta.dirname, "..");
const adminPasswordPath = "D:\\nr_runtime\\operator-input\\cms-core-postgres-admin.password";
const database = `nr_webshop_legacy_p03_${randomUUID().replaceAll("-", "").slice(0, 18)}`;

function fail(message) {
  throw new Error(`[webshop-legacy-fixture] ${message}`);
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

async function dropDatabase(admin) {
  await admin.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()", [database]);
  await admin.query(`DROP DATABASE IF EXISTS ${quote(database)}`);
  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [database]);
  if (exists.rowCount) fail("temporary database cleanup did not complete.");
}

const admin = new Client({ connectionString: connectionUrl("postgres") });
let connected = false;
try {
  await admin.connect();
  connected = true;
  await admin.query(`CREATE DATABASE ${quote(database)}`);
  await runDrizzleMigrations({
    connectionString: connectionUrl(database),
    ignoreAutoMigrateDisable: true,
    schemaIdentities: ["public", "nr_control"],
    throughMigration: "0089_cms_core_control_plane",
  });
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, "contracts", "webshop-schema-manifest-v1.json"), "utf8"),
  );
  const fixture = new Client({ connectionString: connectionUrl(database) });
  await fixture.connect();
  try {
    const legacy = await inspectLegacyWebshopPublicSchema(fixture, manifest);
    if (!legacy.isExactLegacyTableSet || legacy.tableNames.length !== 45) {
      fail("pre-detach migration fixture did not produce the exact legacy table set.");
    }
    console.log(JSON.stringify({
      fixture: "isolated-cleanup-verified",
      legacyPublicSchemaFingerprintSha256: legacy.fingerprint,
      tableCount: legacy.tableNames.length,
    }));
  } finally {
    await fixture.end();
  }
} finally {
  if (connected) await dropDatabase(admin).catch(() => undefined);
  await admin.end().catch(() => undefined);
}
