/** Isolated proof for 0090_webshop_core_detach; never opens user databases. */
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { loadWebshopSchemaManifest } from "./webshop-schema-contract.mjs";

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adminPasswordPath = "D:\\nr_runtime\\operator-input\\cms-core-postgres-admin.password";
const database = `nr_core_detach_p03_${randomUUID().replaceAll("-", "").slice(0, 20)}`;

function fail(message) {
  throw new Error(`[core-detach-fixture] ${message}`);
}

function connectionUrl(databaseName) {
  const line = fs.readFileSync(path.join(root, ".env"), "utf8")
    .split(/\r?\n/).find((entry) => entry.startsWith("DATABASE_URL="));
  if (!line) fail("DATABASE_URL is missing.");
  const source = new URL(line.slice("DATABASE_URL=".length).trim().replace(/^"|"$/g, ""));
  if (!['localhost', '127.0.0.1', '::1'].includes(source.hostname)) fail("fixture requires loopback PostgreSQL.");
  const passwordStat = fs.lstatSync(adminPasswordPath);
  if (!passwordStat.isFile() || passwordStat.isSymbolicLink()) fail("protected admin password file is invalid.");
  source.username = "postgres";
  source.password = fs.readFileSync(adminPasswordPath, "utf8").trim();
  source.pathname = `/${databaseName}`;
  return source.toString();
}

function quoteIdentifier(value) {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(value)) fail("invalid generated database name.");
  return `"${value}"`;
}

async function dropDatabase(admin) {
  await admin.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()", [database]);
  await admin.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(database)}`);
  const left = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [database]);
  if (left.rowCount) fail("fixture cleanup did not remove its database.");
}

const admin = new Client({ connectionString: connectionUrl("postgres") });
let adminConnected = false;
try {
  await admin.connect();
  adminConnected = true;
  await admin.query(`CREATE DATABASE ${quoteIdentifier(database)}`);
  process.env.DATABASE_URL = connectionUrl(database);
  const { runDrizzleMigrations } = await import("./run-drizzle-migrations.mjs");
  await runDrizzleMigrations({ connectionString: process.env.DATABASE_URL });
  const fixture = new Client({ connectionString: process.env.DATABASE_URL });
  await fixture.connect();
  try {
    const relations = await fixture.query(`
      SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relname = ANY($1::text[])
    `, [loadWebshopSchemaManifest().relocatedBusinessTables]);
    if (relations.rowCount) fail("core fresh migration left Webshop business tables in public.");
    await runDrizzleMigrations({ connectionString: process.env.DATABASE_URL });
    const afterRetry = await fixture.query(`
      SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relname = ANY($1::text[])
    `, [loadWebshopSchemaManifest().relocatedBusinessTables]);
    if (afterRetry.rowCount) fail("core retry recreated detached Webshop business tables.");
    console.log(JSON.stringify({ fixture: "isolated-cleanup-verified", publicLegacyTableCount: 0 }));
  } finally {
    await fixture.end();
  }
} finally {
  if (adminConnected) await dropDatabase(admin).catch(() => undefined);
  await admin.end().catch(() => undefined);
}
