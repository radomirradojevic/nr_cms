import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Client } = pg;

try {
  await import("dotenv/config");
} catch (err) {
  if (err?.code !== "ERR_MODULE_NOT_FOUND") throw err;
}

const MIGRATIONS_DIR = path.resolve(process.cwd(), "drizzle");
const JOURNAL_PATH = path.join(MIGRATIONS_DIR, "meta", "_journal.json");
const MIGRATIONS_SCHEMA = "drizzle";
const MIGRATIONS_TABLE = "__drizzle_migrations";
const LOCK_KEY = "nr_cms:drizzle_migrations";
const LATEST_EXPECTED_SNAPSHOT = 27;

const DESTRUCTIVE_ALLOWLIST = new Set([
  "0001_safe_martin_li",
  "0003_shiny_speed",
  "0016_split_content_width",
]);

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");
const dryRun = args.has("--dry-run");

function log(message) {
  console.log(`[migrations] ${message}`);
}

function fail(message) {
  throw new Error(`[migrations] ${message}`);
}

function isDisabled() {
  const value = process.env.DRIZZLE_AUTO_MIGRATE?.toLowerCase();
  return value === "0" || value === "false" || value === "off";
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function splitStatements(sql) {
  return sql
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function findSqlFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name.slice(0, -4))
    .sort();
}

function findLatestSnapshotIndex() {
  const metaDir = path.join(MIGRATIONS_DIR, "meta");
  return fs
    .readdirSync(metaDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^\d{4}_snapshot\.json$/.test(entry.name))
    .map((entry) => Number(entry.name.slice(0, 4)))
    .sort((a, b) => b - a)[0];
}

function hasDestructiveSql(sql) {
  return /\bDROP\s+TABLE\b/i.test(sql)
    || /\bDROP\s+COLUMN\b/i.test(sql)
    || /\bTRUNCATE\b/i.test(sql)
    || /\bDELETE\s+FROM\b/i.test(sql);
}

function loadMigrations() {
  if (!fs.existsSync(JOURNAL_PATH)) {
    fail(`missing ${path.relative(process.cwd(), JOURNAL_PATH)}`);
  }

  const journal = readJson(JOURNAL_PATH);
  if (journal.version !== "7" || journal.dialect !== "postgresql") {
    fail("journal must be Drizzle version 7 for the postgresql dialect");
  }

  const entries = journal.entries ?? [];
  if (!Array.isArray(entries) || entries.length === 0) {
    fail("journal has no migration entries");
  }

  const seenIdx = new Set();
  const seenTags = new Set();
  let previousWhen = -1;

  const migrations = entries.map((entry, position) => {
    if (!Number.isInteger(entry.idx)) {
      fail(`entry at position ${position} has an invalid idx`);
    }
    if (entry.idx !== position) {
      fail(`entry ${entry.tag ?? position} has idx ${entry.idx}; expected ${position}`);
    }
    if (seenIdx.has(entry.idx)) {
      fail(`duplicate migration idx ${entry.idx}`);
    }
    seenIdx.add(entry.idx);

    if (typeof entry.tag !== "string" || !/^\d{4}_[a-z0-9_]+$/i.test(entry.tag)) {
      fail(`entry ${entry.idx} has an invalid tag`);
    }
    if (seenTags.has(entry.tag)) {
      fail(`duplicate migration tag ${entry.tag}`);
    }
    seenTags.add(entry.tag);

    if (!Number.isSafeInteger(entry.when) || entry.when <= previousWhen) {
      fail(`migration ${entry.tag} must have a strictly increasing "when" value`);
    }
    previousWhen = entry.when;

    const sqlPath = path.join(MIGRATIONS_DIR, `${entry.tag}.sql`);
    if (!fs.existsSync(sqlPath)) {
      fail(`journal references missing file ${path.relative(process.cwd(), sqlPath)}`);
    }

    const sql = fs.readFileSync(sqlPath, "utf8");
    if (hasDestructiveSql(sql)
      && !DESTRUCTIVE_ALLOWLIST.has(entry.tag)
      && !sql.includes("nr-cms:allow-destructive")) {
      fail(
        `${entry.tag} contains destructive SQL. Add a reviewed nr-cms:allow-destructive comment if this is intentional.`,
      );
    }

    return {
      idx: entry.idx,
      tag: entry.tag,
      when: entry.when,
      hash: sha256(sql),
      sql,
      statements: splitStatements(sql),
    };
  });

  const journalTags = new Set(migrations.map((migration) => migration.tag));
  const orphanedFiles = findSqlFiles().filter((tag) => !journalTags.has(tag));
  if (orphanedFiles.length > 0) {
    fail(`SQL files are not present in the journal: ${orphanedFiles.join(", ")}`);
  }

  const minimumSnapshot = Math.max(
    LATEST_EXPECTED_SNAPSHOT,
    migrations[migrations.length - 1].idx,
  );
  const latestSnapshot = findLatestSnapshotIndex();
  if (latestSnapshot === undefined || latestSnapshot < minimumSnapshot) {
    fail(
      `latest snapshot must be at least ${String(minimumSnapshot).padStart(4, "0")}_snapshot.json`,
    );
  }

  return migrations;
}

function shouldUseTransaction(migration) {
  return !migration.sql.includes("nr-cms:no-transaction")
    && !/\bCREATE\s+INDEX\s+CONCURRENTLY\b/i.test(migration.sql);
}

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    fail("DATABASE_URL is required to apply migrations");
  }

  return new Client({ connectionString });
}

async function ensureMigrationTable(client) {
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${MIGRATIONS_SCHEMA}`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);
  await client.query(`
    ALTER TABLE ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE}
      ADD COLUMN IF NOT EXISTS tag text
  `);
  await client.query(`
    ALTER TABLE ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE}
      ADD COLUMN IF NOT EXISTS applied_at timestamp with time zone NOT NULL DEFAULT now()
  `);
  await client.query(`
    ALTER TABLE ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE}
      ADD COLUMN IF NOT EXISTS statements integer
  `);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS __drizzle_migrations_tag_unique
      ON ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} (tag)
      WHERE tag IS NOT NULL
  `);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS __drizzle_migrations_created_hash_unique
      ON ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} (created_at, hash)
  `);
}

async function acquireLock(client) {
  await client.query("SELECT pg_advisory_lock(hashtext($1))", [LOCK_KEY]);
}

async function releaseLock(client) {
  await client.query("SELECT pg_advisory_unlock(hashtext($1))", [LOCK_KEY]);
}

async function loadAppliedRows(client) {
  const result = await client.query(`
    SELECT id, hash, created_at, tag
    FROM ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE}
    ORDER BY id ASC
  `);
  return result.rows;
}

async function loadAppliedRowsReadOnly(client) {
  const table = await client.query("SELECT to_regclass($1) AS name", [
    `${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE}`,
  ]);
  if (!table.rows[0]?.name) return [];

  const columns = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
    `,
    [MIGRATIONS_SCHEMA, MIGRATIONS_TABLE],
  );
  const columnNames = new Set(columns.rows.map((row) => row.column_name));
  const tagSelection = columnNames.has("tag") ? "tag" : "NULL AS tag";

  const result = await client.query(`
    SELECT id, hash, created_at, ${tagSelection}
    FROM ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE}
    ORDER BY id ASC
  `);
  return result.rows;
}

function findAppliedRow(rows, migration) {
  const byTag = rows.find((row) => row.tag === migration.tag);
  if (byTag) {
    if (byTag.hash !== migration.hash || Number(byTag.created_at) !== migration.when) {
      fail(
        `${migration.tag} was changed after it was recorded in the database. Restore the applied SQL or create a new migration.`,
      );
    }
    return byTag;
  }

  const byCreatedAndHash = rows.find(
    (row) => Number(row.created_at) === migration.when && row.hash === migration.hash,
  );
  if (byCreatedAndHash) return byCreatedAndHash;

  const byCreated = rows.find((row) => Number(row.created_at) === migration.when);
  if (byCreated) {
    fail(
      `${migration.tag} has the same created_at as an applied migration but a different hash.`,
    );
  }

  return null;
}

async function backfillTag(client, row, migration) {
  if (row.tag) return;
  await client.query(
    `
      UPDATE ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE}
      SET tag = $1, statements = COALESCE(statements, $2)
      WHERE id = $3
    `,
    [migration.tag, migration.statements.length, row.id],
  );
}

async function recordMigration(client, migration) {
  await client.query(
    `
      INSERT INTO ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE}
        (hash, created_at, tag, statements)
      VALUES ($1, $2, $3, $4)
    `,
    [migration.hash, migration.when, migration.tag, migration.statements.length],
  );
}

async function applyMigration(client, migration) {
  if (migration.statements.length === 0) {
    fail(`${migration.tag} has no SQL statements`);
  }

  const useTransaction = shouldUseTransaction(migration);
  log(`applying ${migration.tag} (${migration.statements.length} statements)`);

  if (useTransaction) {
    await client.query("BEGIN");
  }

  try {
    for (const statement of migration.statements) {
      await client.query(statement);
    }
    await recordMigration(client, migration);

    if (useTransaction) {
      await client.query("COMMIT");
    }
  } catch (err) {
    if (useTransaction) {
      await client.query("ROLLBACK");
    }
    throw err;
  }
}

async function main() {
  const migrations = loadMigrations();

  if (checkOnly) {
    log(`validated ${migrations.length} migration files`);
    return;
  }

  if (isDisabled()) {
    log("DRIZZLE_AUTO_MIGRATE disables automatic migration; skipping");
    return;
  }

  const client = createClient();
  await client.connect();

  try {
    await client.query("SET lock_timeout = '15s'");
    await client.query("SET statement_timeout = '5min'");
    if (dryRun) {
      const appliedRows = await loadAppliedRowsReadOnly(client);
      const pending = migrations.filter(
        (migration) => !findAppliedRow(appliedRows, migration),
      );
      log(
        pending.length === 0
          ? "database is already up to date"
          : `pending: ${pending.map((migration) => migration.tag).join(", ")}`,
      );
      return;
    }

    await ensureMigrationTable(client);
    await acquireLock(client);

    try {
      const appliedRows = await loadAppliedRows(client);
      const pending = [];

      for (const migration of migrations) {
        const applied = findAppliedRow(appliedRows, migration);
        if (applied) {
          await backfillTag(client, applied, migration);
        } else {
          pending.push(migration);
        }
      }

      if (pending.length === 0) {
        log("database is already up to date");
        return;
      }

      for (const migration of pending) {
        await applyMigration(client, migration);
      }

      log(`applied ${pending.length} migration${pending.length === 1 ? "" : "s"}`);
    } finally {
      await releaseLock(client);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
