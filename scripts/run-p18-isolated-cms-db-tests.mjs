import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import pg from "pg";

const { Client } = pg;
const repositoryRoot = path.resolve(import.meta.dirname, "..");
const adminPasswordPath =
  "D:\\nr_runtime\\operator-input\\cms-core-postgres-admin.password";
const databaseName = `nr_p18_cms_${randomUUID().replaceAll("-", "").slice(0, 16)}_test`;

function fail(message) {
  throw new Error(`[p18-cms-db-tests] ${message}`);
}

function readLocalPostgresSource() {
  const envPath = path.join(repositoryRoot, ".env");
  const line = fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.startsWith("DATABASE_URL="));
  if (!line) fail("DATABASE_URL is required only to locate local PostgreSQL.");
  const source = new URL(
    line.slice("DATABASE_URL=".length).trim().replace(/^\"|\"$/g, ""),
  );
  if (!/^(postgres:|postgresql:)$/.test(source.protocol))
    fail("local database source must use PostgreSQL.");
  if (!["localhost", "127.0.0.1", "::1"].includes(source.hostname))
    fail("local database source must use a loopback host.");
  return source;
}

function readAdminPassword() {
  const stat = fs.lstatSync(adminPasswordPath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 1 || stat.size > 4096)
    fail("protected PostgreSQL administrator password file is invalid.");
  const password = fs.readFileSync(adminPasswordPath, "utf8").trim();
  if (!password) fail("protected PostgreSQL administrator password is empty.");
  return password;
}

function quoteIdentifier(value) {
  if (!/^nr_p18_cms_[a-f0-9]{16}_test$/.test(value))
    fail("generated test database name is unsafe.");
  return `"${value}"`;
}

function urlFor(source, database, password) {
  const result = new URL(source);
  result.username = "postgres";
  result.password = password;
  result.pathname = `/${database}`;
  result.search = "";
  result.hash = "";
  return result.toString();
}

async function run(command, args, databaseUrl) {
  const child = spawn(command, args, {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      NODE_ENV: "test",
      TEST_DATABASE_URL: databaseUrl,
    },
    shell: false,
    stdio: "inherit",
  });
  await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal || code !== 0) {
        reject(new Error("isolated CMS database child process failed"));
        return;
      }
      resolve();
    });
  });
}

const source = readLocalPostgresSource();
const password = readAdminPassword();
const adminUrl = urlFor(source, "postgres", password);
const databaseUrl = urlFor(source, databaseName, password);
const admin = new Client({ connectionString: adminUrl });
let connected = false;
try {
  await admin.connect();
  connected = true;
  await admin.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
  await admin.query(`REVOKE ALL ON DATABASE ${quoteIdentifier(databaseName)} FROM PUBLIC`);

  const npmCli = path.resolve(
    process.execPath,
    "..",
    "node_modules",
    "npm",
    "bin",
    "npm-cli.js",
  );
  await run(process.execPath, [npmCli, "run", "db:migrate:test"], databaseUrl);
  await run(
    process.execPath,
    [
      "--import",
      "tsx",
      "--test",
      "--test-concurrency=1",
      "tests/license-fulfillment-outbox.integration.test.mjs",
      "tests/webshop-activation-control-plane.integration.test.ts",
    ],
    databaseUrl,
  );
  console.log(
    JSON.stringify({
      contractVersion: 1,
      database: databaseName,
      purpose: "p18_isolated_cms_database_tests",
      status: "passed",
    }),
  );
} finally {
  if (connected) {
    await admin
      .query(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid <> pg_backend_pid()",
        [databaseName],
      )
      .catch(() => undefined);
    await admin
      .query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)}`)
      .catch(() => undefined);
    await admin.end().catch(() => undefined);
  }
}
