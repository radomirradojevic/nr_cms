import "dotenv/config";
import { spawn } from "node:child_process";

function fail(message) {
  throw new Error(`[dev-migrations] ${message}`);
}

function configuredValue(name) {
  return process.env[name]?.trim() ? "configured" : "not-set";
}

const rawDatabaseUrl = process.env.DATABASE_URL?.trim();
if (!rawDatabaseUrl) fail("DATABASE_URL is required.");

let target;
try {
  target = new URL(rawDatabaseUrl);
} catch {
  fail("DATABASE_URL must be a valid PostgreSQL connection string.");
}

if (!/^postgres(?:ql)?:$/.test(target.protocol)) {
  fail("DATABASE_URL must use the postgres or postgresql protocol.");
}

const database = decodeURIComponent(target.pathname.replace(/^\//, ""));
if (database !== "nr_cms_dev") {
  fail(`refusing database ${database || "(missing)"}; expected nr_cms_dev.`);
}

if (process.env.NODE_ENV === "production") {
  fail("NODE_ENV=production is not allowed by the development migration command.");
}

console.log(
  JSON.stringify({
    database,
    host: target.hostname,
    providerMode: process.env.NR_PROVIDER_MODE?.trim() || process.env.PROVIDER_MODE?.trim() || "not-set",
    secretVersion:
      process.env.NR_DATABASE_SECRET_VERSION?.trim() || process.env.DATABASE_SECRET_VERSION?.trim() || "not-set",
  }),
);

const child = spawn(process.execPath, ["scripts/run-drizzle-migrations.mjs"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

child.once("error", (error) => {
  console.error(`[dev-migrations] could not start migration runner: ${error.message}`);
  process.exitCode = 1;
});
child.once("exit", (code, signal) => {
  if (signal) {
    console.error(`[dev-migrations] migration runner ended from signal ${signal}.`);
    process.exitCode = 1;
  } else {
    process.exitCode = code ?? 1;
  }
});
