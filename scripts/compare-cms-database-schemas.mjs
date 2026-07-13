import "dotenv/config";
import { Client } from "pg";

function fail(message) {
  throw new Error(`[schema-compare] ${message}`);
}

function databaseTarget(variableName, expectedDatabase) {
  const raw = process.env[variableName]?.trim();
  if (!raw) fail(`${variableName} is required.`);

  let target;
  try {
    target = new URL(raw);
  } catch {
    fail(`${variableName} must be a valid PostgreSQL connection string.`);
  }

  const database = decodeURIComponent(target.pathname.replace(/^\//, ""));
  if (database !== expectedDatabase) {
    fail(`${variableName} must target ${expectedDatabase}; got ${database || "(missing)"}.`);
  }

  return { database, host: target.hostname, raw };
}

async function snapshot(target) {
  const client = new Client({ connectionString: target.raw });
  await client.connect();
  try {
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    return tables.rows.map((row) => row.table_name);
  } finally {
    await client.end();
  }
}

function difference(left, right) {
  const rightSet = new Set(right);
  return left.filter((entry) => !rightSet.has(entry));
}

const development = databaseTarget("DATABASE_URL", "nr_cms_dev");
const test = databaseTarget("TEST_DATABASE_URL", "nr_cms_dev_test");

console.log(JSON.stringify({ development: { database: development.database, host: development.host }, test: { database: test.database, host: test.host } }));

const [developmentTables, testTables] = await Promise.all([snapshot(development), snapshot(test)]);
const developmentOnlyTables = difference(developmentTables, testTables);
const testOnlyTables = difference(testTables, developmentTables);

const result = {
  developmentOnlyTables,
  status: developmentOnlyTables.length || testOnlyTables.length ? "mismatch" : "match",
  developmentTableCount: developmentTables.length,
  testTableCount: testTables.length,
  testOnlyTables,
};

console.log(JSON.stringify(result));
if (result.status !== "match") process.exitCode = 1;
