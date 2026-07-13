import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Client } = pg;
const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
const sourceDatabasePattern = /(?:^|[._-])(dev|development)(?:$|[._-])/i;

function fail(message) { throw new Error(`[migration-matrix] ${message}`); }
function localSourceUrl() {
  const line = readFileSync(path.resolve(process.cwd(), ".env"), "utf8")
    .split(/\r?\n/)
    .find((value) => value.startsWith("DATABASE_URL="));
  const value = line?.slice("DATABASE_URL=".length).trim();
  if (!value) fail("local DATABASE_URL is required to provision a local matrix database.");
  const url = new URL(value);
  const database = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  if (!localHosts.has(url.hostname.toLowerCase()) || !sourceDatabasePattern.test(database)) {
    fail("local matrix provisioning requires a loopback development source database.");
  }
  return url;
}
function withDatabase(url, database) {
  const next = new URL(url);
  next.pathname = `/${database}`;
  return next.toString();
}
async function ensureDatabase(adminUrl, database) {
  if (!/^[a-z][a-z0-9_]*_test$/i.test(database)) fail("matrix database name must end with _test.");
  const client = new Client({ connectionString: adminUrl });
  await client.connect();
  try {
    const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [database]);
    if (existing.rowCount === 0) await client.query(`CREATE DATABASE "${database}"`);
  } finally { await client.end(); }
}
function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, shell: false, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code ?? 1}`)));
  });
}

const service = process.argv.find((arg) => arg.startsWith("--service="))?.slice("--service=".length) ?? "all";
if (!new Set(["all", "cms", "central"]).has(service)) fail("--service must be all, cms, or central.");
const source = localSourceUrl();
const admin = withDatabase(source, "postgres");
const cmsUrl = withDatabase(source, "nr_cms_migration_test");
const centralUrl = withDatabase(source, "nrls_migration_test");
if (service === "all" || service === "cms") {
  await ensureDatabase(admin, "nr_cms_migration_test");
  await run(process.execPath, ["scripts/run-migration-matrix.mjs", "--service=cms"], { cwd: process.cwd(), env: { ...process.env, MIGRATION_MATRIX_DATABASE_URL: cmsUrl } });
}
if (service === "all" || service === "central") {
  await ensureDatabase(admin, "nrls_migration_test");
  await run(process.execPath, ["../../scripts/run-migration-matrix.mjs", "--service=central"], { cwd: path.resolve(process.cwd(), ".private/license-server"), env: { ...process.env, NRLS_MIGRATION_MATRIX_DATABASE_URL: centralUrl } });
}
console.log(`[migration-matrix] local dedicated ${service} matrix passed`);
