import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
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
const POSTGRES_IDENTIFIER_MAX_LENGTH = 63;

const DESTRUCTIVE_ALLOWLIST = new Set([
  "0001_safe_martin_li",
  "0003_shiny_speed",
  "0016_split_content_width",
]);

const SUPERSEDED_BY_CMS_SCHEMA = new Set([
  "0000_stiff_warpath",
  "0001_safe_martin_li",
]);

const SUPERSEDED_CONSTRAINTS = new Map([
  [
    "webshop_product_media_product_file_unique",
    new Set(["webshop_product_media_product_file_variant_unique"]),
  ],
]);

const WEBSHOP_PAYMENT_PROVIDER_CHECKS = [
  {
    constraint: "webshop_payments_provider_key_check",
    table: "webshop_payments",
  },
  {
    constraint: "webshop_payment_events_provider_key_check",
    table: "webshop_payment_events",
  },
];

const LEGACY_MIGRATION_HASHES = new Map([
  [
    "0011_add_category_created_by",
    new Set([
      "77e2c461336832a90e1dca7fa776647c62b35f9832c51ea1660eecab30a12f86",
    ]),
  ],
  [
    "0014_material_jetstream",
    new Set([
      "769e0172ee176d8980d625f352c0193617093125375be8f716681494080abf99",
    ]),
  ],
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

function normalizeLineEndings(value) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function lineEndingHashVariants(value) {
  const lf = normalizeLineEndings(value);
  const crlf = lf.replace(/\n/g, "\r\n");
  return new Set([sha256(lf), sha256(crlf)]);
}

function normalizeSql(value) {
  return value.replace(/\s+/g, " ").replace(/;$/, "").trim().toLowerCase();
}

function stripOuterParens(value) {
  let next = value.trim();
  while (next.startsWith("(") && next.endsWith(")")) {
    const inner = next.slice(1, -1).trim();
    if (!inner) break;
    next = inner;
  }
  return next;
}

function extractSqlStringLiterals(value) {
  const literals = [];
  let current = "";
  let inSingleQuote = false;

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    const next = value[i + 1];

    if (!inSingleQuote) {
      if (char === "'") {
        current = "";
        inSingleQuote = true;
      }
      continue;
    }

    if (char === "'" && next === "'") {
      current += "'";
      i += 1;
      continue;
    }

    if (char === "'") {
      literals.push(current);
      inSingleQuote = false;
      continue;
    }

    current += char;
  }

  return literals;
}

function sameStringLiteralSet(left, right) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);

  if (leftSet.size !== rightSet.size) return false;

  for (const value of leftSet) {
    if (!rightSet.has(value)) return false;
  }

  return true;
}

function normalizeConstraintDefinition(value) {
  return normalizeSql(value)
    .replace(/"public"\./g, "")
    .replace(/"([^"]+)"/g, "$1")
    .replace(/::[a-z_][a-z0-9_]*(?:\[\])?/gi, "");
}

function normalizeColumnDefault(value) {
  return normalizeSql(stripOuterParens(value)).replace(
    /::[a-z_][a-z0-9_]*(?:\[\])?/gi,
    "",
  );
}

function postgresIdentifierName(value) {
  return value.length > POSTGRES_IDENTIFIER_MAX_LENGTH
    ? value.slice(0, POSTGRES_IDENTIFIER_MAX_LENGTH)
    : value;
}

function identifierExists(names, expectedName) {
  return (
    names.has(expectedName) || names.has(postgresIdentifierName(expectedName))
  );
}

function constraintDefinitionFor(schemaState, tableName, constraintName) {
  return (
    schemaState.constraintDefinitions.get(`${tableName}.${constraintName}`) ??
    schemaState.constraintDefinitions.get(
      `${tableName}.${postgresIdentifierName(constraintName)}`,
    )
  );
}

function constraintExists(schemaState, expectedName) {
  if (identifierExists(schemaState.constraints, expectedName)) return true;

  const replacements = SUPERSEDED_CONSTRAINTS.get(expectedName);
  if (!replacements) return false;

  for (const replacement of replacements) {
    if (identifierExists(schemaState.constraints, replacement)) return true;
  }

  return false;
}

function constraintDefinitionMatches(expected, current) {
  if (!expected || !current) return true;

  const expectedLiterals = extractSqlStringLiterals(expected);
  const currentLiterals = extractSqlStringLiterals(current);

  if (expectedLiterals.length > 0 || currentLiterals.length > 0) {
    return sameStringLiteralSet(expectedLiterals, currentLiterals);
  }

  return (
    normalizeConstraintDefinition(expected) ===
    normalizeConstraintDefinition(current)
  );
}

function columnDefaultMatches(schemaState, table, column, expectedDefault) {
  return (
    schemaState.columnDefaults.get(`${table}.${column}`) ===
    normalizeColumnDefault(expectedDefault)
  );
}

function webshopPaymentProviderConstraintsInclude(schemaState, providers) {
  return WEBSHOP_PAYMENT_PROVIDER_CHECKS.every(({ table, constraint }) => {
    const definition = constraintDefinitionFor(schemaState, table, constraint);
    if (!definition) return false;

    const literals = new Set(extractSqlStringLiterals(definition));
    return providers.every((provider) => literals.has(provider));
  });
}

function splitTopLevelCommaList(value) {
  const parts = [];
  let current = "";
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    const next = value[i + 1];

    if (char === "'" && !inDoubleQuote) {
      current += char;
      if (inSingleQuote && next === "'") {
        current += next;
        i += 1;
      } else {
        inSingleQuote = !inSingleQuote;
      }
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      current += char;
      if (inDoubleQuote && next === '"') {
        current += next;
        i += 1;
      } else {
        inDoubleQuote = !inDoubleQuote;
      }
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if (char === "(") depth += 1;
      if (char === ")") depth -= 1;
      if (char === "," && depth === 0) {
        parts.push(current.trim());
        current = "";
        continue;
      }
    }

    current += char;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

function extractFirstParenthesizedBlock(value, startIndex) {
  const openIndex = value.indexOf("(", startIndex);
  if (openIndex === -1) return null;

  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = openIndex; i < value.length; i += 1) {
    const char = value[i];
    const next = value[i + 1];

    if (char === "'" && !inDoubleQuote) {
      if (inSingleQuote && next === "'") {
        i += 1;
      } else {
        inSingleQuote = !inSingleQuote;
      }
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      if (inDoubleQuote && next === '"') {
        i += 1;
      } else {
        inDoubleQuote = !inDoubleQuote;
      }
      continue;
    }

    if (inSingleQuote || inDoubleQuote) continue;
    if (char === "(") depth += 1;
    if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        return value.slice(openIndex + 1, i);
      }
    }
  }

  return null;
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
    .filter(
      (entry) => entry.isFile() && /^\d{4}_snapshot\.json$/.test(entry.name),
    )
    .map((entry) => Number(entry.name.slice(0, 4)))
    .sort((a, b) => b - a)[0];
}

function hasDestructiveSql(sql) {
  return (
    /\bDROP\s+TABLE\b/i.test(sql) ||
    /\bDROP\s+COLUMN\b/i.test(sql) ||
    /\bTRUNCATE\b/i.test(sql) ||
    /\bDELETE\s+FROM\b/i.test(sql)
  );
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
      fail(
        `entry ${entry.tag ?? position} has idx ${entry.idx}; expected ${position}`,
      );
    }
    if (seenIdx.has(entry.idx)) {
      fail(`duplicate migration idx ${entry.idx}`);
    }
    seenIdx.add(entry.idx);

    if (
      typeof entry.tag !== "string" ||
      !/^\d{4}_[a-z0-9_]+$/i.test(entry.tag)
    ) {
      fail(`entry ${entry.idx} has an invalid tag`);
    }
    if (seenTags.has(entry.tag)) {
      fail(`duplicate migration tag ${entry.tag}`);
    }
    seenTags.add(entry.tag);

    if (!Number.isSafeInteger(entry.when) || entry.when <= previousWhen) {
      fail(
        `migration ${entry.tag} must have a strictly increasing "when" value`,
      );
    }
    previousWhen = entry.when;

    const sqlPath = path.join(MIGRATIONS_DIR, `${entry.tag}.sql`);
    if (!fs.existsSync(sqlPath)) {
      fail(
        `journal references missing file ${path.relative(process.cwd(), sqlPath)}`,
      );
    }

    const sql = fs.readFileSync(sqlPath, "utf8");
    if (
      hasDestructiveSql(sql) &&
      !DESTRUCTIVE_ALLOWLIST.has(entry.tag) &&
      !sql.includes("nr-cms:allow-destructive")
    ) {
      fail(
        `${entry.tag} contains destructive SQL. Add a reviewed nr-cms:allow-destructive comment if this is intentional.`,
      );
    }

    return {
      idx: entry.idx,
      tag: entry.tag,
      when: entry.when,
      hash: sha256(normalizeLineEndings(sql)),
      hashVariants: lineEndingHashVariants(sql),
      sql,
      statements: splitStatements(sql),
    };
  });

  const journalTags = new Set(migrations.map((migration) => migration.tag));
  const orphanedFiles = findSqlFiles().filter((tag) => !journalTags.has(tag));
  if (orphanedFiles.length > 0) {
    fail(
      `SQL files are not present in the journal: ${orphanedFiles.join(", ")}`,
    );
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
  return (
    !migration.sql.includes("nr-cms:no-transaction") &&
    !/\bCREATE\s+INDEX\s+CONCURRENTLY\b/i.test(migration.sql)
  );
}

function parseCreateTable(statement) {
  const tableMatch = statement.match(
    /\bCREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:"public"\.)?"([^"]+)"/i,
  );
  if (!tableMatch) return null;

  const body = extractFirstParenthesizedBlock(statement, tableMatch.index ?? 0);
  const columns = new Set();
  const constraints = new Set();

  if (body) {
    for (const part of splitTopLevelCommaList(body)) {
      const columnMatch = part.match(/^"([^"]+)"/);
      if (columnMatch) {
        columns.add(columnMatch[1]);
        continue;
      }

      const constraintMatch = part.match(/^CONSTRAINT\s+"([^"]+)"/i);
      if (constraintMatch) constraints.add(constraintMatch[1]);
    }
  }

  return {
    kind: "createTable",
    table: tableMatch[1],
    columns: [...columns],
    constraints: [...constraints],
  };
}

function analyzeStatement(statement) {
  const operations = [];
  const createTable = parseCreateTable(statement);
  if (createTable) operations.push(createTable);

  for (const match of statement.matchAll(
    /\bDROP\s+TABLE(?:\s+IF\s+EXISTS)?\s+(?:"public"\.)?"([^"]+)"/gi,
  )) {
    operations.push({ kind: "dropTable", table: match[1] });
  }

  for (const match of statement.matchAll(
    /\bALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"public"\.)?"([^"]+)"\s+ADD\s+COLUMN(?:\s+IF\s+NOT\s+EXISTS)?\s+"([^"]+)"/gi,
  )) {
    operations.push({ kind: "addColumn", table: match[1], column: match[2] });
  }

  for (const match of statement.matchAll(
    /\bALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"public"\.)?"([^"]+)"\s+DROP\s+COLUMN(?:\s+IF\s+EXISTS)?\s+"([^"]+)"/gi,
  )) {
    operations.push({ kind: "dropColumn", table: match[1], column: match[2] });
  }

  for (const match of statement.matchAll(
    /\bALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"public"\.)?"([^"]+)"[\s\S]*?\bADD\s+CONSTRAINT\s+"([^"]+)"\s+([\s\S]+)$/gi,
  )) {
    operations.push({
      kind: "addConstraint",
      table: match[1],
      constraint: match[2],
      definition: match[3].trim().replace(/;$/, ""),
    });
  }

  for (const match of statement.matchAll(
    /\bALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"public"\.)?"([^"]+)"[\s\S]*?\bDROP\s+CONSTRAINT(?:\s+IF\s+EXISTS)?\s+"([^"]+)"/gi,
  )) {
    operations.push({
      kind: "dropConstraint",
      table: match[1],
      constraint: match[2],
    });
  }

  for (const match of statement.matchAll(
    /\bCREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+"([^"]+)"/gi,
  )) {
    operations.push({ kind: "createIndex", index: match[1] });
  }

  const alterTableMatch = statement.match(
    /\bALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"public"\.)?"([^"]+)"/i,
  );
  if (alterTableMatch) {
    for (const match of statement.matchAll(
      /\bALTER\s+COLUMN\s+"([^"]+)"\s+SET\s+DEFAULT\s+([^,;]+)/gi,
    )) {
      operations.push({
        kind: "setDefault",
        table: alterTableMatch[1],
        column: match[1],
        defaultValue: normalizeColumnDefault(match[2]),
      });
    }
  }

  return operations;
}

async function loadSchemaState(client) {
  const tables = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  const columns = await client.query(`
    SELECT table_name, column_name, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `);
  const indexes = await client.query(`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
  `);
  const constraints = await client.query(`
    SELECT
      c.conname,
      t.relname AS table_name,
      pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
  `);

  const tableNames = new Set(tables.rows.map((row) => row.table_name));
  const tableColumns = new Map();
  const columnDefaults = new Map();

  for (const row of columns.rows) {
    if (!tableColumns.has(row.table_name)) {
      tableColumns.set(row.table_name, new Set());
    }
    tableColumns.get(row.table_name).add(row.column_name);
    columnDefaults.set(
      `${row.table_name}.${row.column_name}`,
      row.column_default ? normalizeColumnDefault(row.column_default) : null,
    );
  }

  return {
    tables: tableNames,
    tableColumns,
    columnDefaults,
    indexes: new Set(indexes.rows.map((row) => row.indexname)),
    constraints: new Set(constraints.rows.map((row) => row.conname)),
    constraintDefinitions: new Map(
      constraints.rows.map((row) => [
        `${row.table_name}.${row.conname}`,
        row.definition,
      ]),
    ),
  };
}

function operationStatus(
  operation,
  schemaState,
  finalAdds = new Set(),
  definitionSensitiveConstraints = new Set(),
) {
  switch (operation.kind) {
    case "createTable": {
      if (!schemaState.tables.has(operation.table)) return { satisfied: false };

      const columns =
        schemaState.tableColumns.get(operation.table) ?? new Set();
      const missingColumns = operation.columns.filter(
        (column) => !columns.has(column),
      );
      const missingConstraints = operation.constraints.filter(
        (constraint) => !constraintExists(schemaState, constraint),
      );

      if (missingColumns.length > 0 || missingConstraints.length > 0) {
        return {
          satisfied: false,
          unsafeReason:
            `table "${operation.table}" already exists but is missing ` +
            [
              missingColumns.length > 0
                ? `columns: ${missingColumns.join(", ")}`
                : null,
              missingConstraints.length > 0
                ? `constraints: ${missingConstraints.join(", ")}`
                : null,
            ]
              .filter(Boolean)
              .join("; "),
        };
      }

      return { satisfied: true };
    }
    case "dropTable":
      return { satisfied: !schemaState.tables.has(operation.table) };
    case "addColumn":
      return {
        satisfied:
          schemaState.tableColumns
            .get(operation.table)
            ?.has(operation.column) ?? false,
      };
    case "dropColumn":
      return {
        satisfied:
          !schemaState.tables.has(operation.table) ||
          !(
            schemaState.tableColumns
              .get(operation.table)
              ?.has(operation.column) ?? false
          ),
      };
    case "addConstraint": {
      const currentDefinition = constraintDefinitionFor(
        schemaState,
        operation.table,
        operation.constraint,
      );

      if (!currentDefinition) {
        return {
          satisfied: constraintExists(schemaState, operation.constraint),
        };
      }

      if (
        definitionSensitiveConstraints.has(operation.constraint) &&
        operation.definition
      ) {
        return {
          satisfied: constraintDefinitionMatches(
            operation.definition,
            currentDefinition,
          ),
        };
      }

      return { satisfied: true };
    }
    case "dropConstraint":
      if (finalAdds.has(operation.constraint)) return { satisfied: true };
      return {
        satisfied: !identifierExists(
          schemaState.constraints,
          operation.constraint,
        ),
      };
    case "createIndex":
      return {
        satisfied: identifierExists(schemaState.indexes, operation.index),
      };
    case "setDefault": {
      const current = schemaState.columnDefaults.get(
        `${operation.table}.${operation.column}`,
      );
      return { satisfied: current === operation.defaultValue };
    }
    default:
      return { satisfied: false };
  }
}

function analyzeMigration(migration) {
  const statements = migration.statements.map((statement) => ({
    statement,
    operations: analyzeStatement(statement),
  }));
  const finalAdds = new Set(
    statements
      .flatMap((statement) => statement.operations)
      .filter((operation) => operation.kind === "addConstraint")
      .map((operation) => operation.constraint),
  );
  const droppedConstraints = new Set(
    statements
      .flatMap((statement) => statement.operations)
      .filter((operation) => operation.kind === "dropConstraint")
      .map((operation) => operation.constraint),
  );
  const replacedConstraints = new Set(
    [...finalAdds].filter((constraint) => droppedConstraints.has(constraint)),
  );

  return { statements, finalAdds, replacedConstraints };
}

function migrationHasSchemaOperations(migration) {
  return analyzeMigration(migration).statements.some(
    (statement) => statement.operations.length > 0,
  );
}

function hasGlobalSettingsColumns(schemaState, columns) {
  const tableColumns = schemaState.tableColumns.get("global_settings");
  return columns.every((column) => tableColumns?.has(column));
}

function isSplitAppearanceSchema(schemaState) {
  const tableColumns = schemaState.tableColumns.get("global_settings");
  return (
    schemaState.tables.has("global_settings") &&
    hasGlobalSettingsColumns(schemaState, [
      "theme",
      "frontend_content_width",
      "backend_content_width",
      "font_preset",
      "radius_preset",
      "shadow_preset",
    ]) &&
    !tableColumns?.has("content_width")
  );
}

function supersededMigrationReason(migration, schemaState) {
  if (
    SUPERSEDED_BY_CMS_SCHEMA.has(migration.tag) &&
    schemaState.tables.has("content_categories")
  ) {
    return "superseded by CMS schema";
  }

  if (
    migration.tag === "0030_bent_moonstone" &&
    columnDefaultMatches(
      schemaState,
      "global_settings",
      "ai_writing_assistant_model",
      "'gpt-4.1-mini'",
    )
  ) {
    return "superseded by 0039_youthful_risque";
  }

  if (
    migration.tag === "0015_appearance" &&
    isSplitAppearanceSchema(schemaState)
  ) {
    return "superseded by split appearance schema";
  }

  if (
    migration.tag === "0064_webshop_offline_payment_provider_checks" &&
    webshopPaymentProviderConstraintsInclude(schemaState, ["monri"])
  ) {
    return "superseded by Monri payment provider schema";
  }

  if (
    migration.tag === "0070_rename_local_card_gateway_to_monri" &&
    webshopPaymentProviderConstraintsInclude(schemaState, ["monri", "paddle"])
  ) {
    return "superseded by Paddle payment provider schema";
  }

  return null;
}

function migrationEndStateStatus(migration, schemaState) {
  const supersededReason = supersededMigrationReason(migration, schemaState);
  if (supersededReason) {
    return { satisfied: true, reason: supersededReason };
  }

  const analysis = analyzeMigration(migration);
  const operations = analysis.statements.flatMap(
    (statement) => statement.operations,
  );
  if (operations.length === 0) return { satisfied: false };

  for (const operation of operations) {
    const status = operationStatus(
      operation,
      schemaState,
      analysis.finalAdds,
      analysis.replacedConstraints,
    );
    if (!status.satisfied) return { satisfied: false };
  }

  return { satisfied: true, reason: "schema already satisfies migration" };
}

function statementStatus(statement, schemaState) {
  const operations = analyzeStatement(statement);
  if (operations.length === 0) return { satisfied: false, operations };

  for (const operation of operations) {
    const status = operationStatus(operation, schemaState);
    if (status.unsafeReason) return { ...status, operations };
    if (!status.satisfied) return { satisfied: false, operations };
  }

  return { satisfied: true, operations };
}

export const __migrationRunnerTesting = {
  migrationHasSchemaOperations,
  migrationEndStateStatus,
  normalizeColumnDefault,
  supersededMigrationReason,
};

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

function findAppliedRow(rows, migration, options = {}) {
  const { tolerateHashMismatch = false } = options;
  const hashMatches = (hash) =>
    migration.hashVariants.has(hash) ||
    (LEGACY_MIGRATION_HASHES.get(migration.tag)?.has(hash) ?? false);

  const byTag = rows.find((row) => row.tag === migration.tag);
  if (byTag) {
    if (
      !hashMatches(byTag.hash) ||
      Number(byTag.created_at) !== migration.when
    ) {
      if (tolerateHashMismatch && Number(byTag.created_at) === migration.when) {
        return byTag;
      }
      fail(
        `${migration.tag} was changed after it was recorded in the database. Restore the applied SQL or create a new migration.`,
      );
    }
    return byTag;
  }

  const byCreatedAndHash = rows.find(
    (row) => Number(row.created_at) === migration.when && hashMatches(row.hash),
  );
  if (byCreatedAndHash) return byCreatedAndHash;

  const byCreated = rows.find(
    (row) => Number(row.created_at) === migration.when,
  );
  if (byCreated) {
    if (tolerateHashMismatch) return byCreated;
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

async function repairMigrationRecord(client, row, migration) {
  await client.query(
    `
      UPDATE ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE}
      SET hash = $1,
          created_at = $2,
          tag = $3,
          statements = COALESCE(statements, $4)
      WHERE id = $5
    `,
    [
      migration.hash,
      migration.when,
      migration.tag,
      migration.statements.length,
      row.id,
    ],
  );
}

async function recordMigration(client, migration) {
  await client.query(
    `
      INSERT INTO ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE}
        (hash, created_at, tag, statements)
      VALUES ($1, $2, $3, $4)
    `,
    [
      migration.hash,
      migration.when,
      migration.tag,
      migration.statements.length,
    ],
  );
}

async function adoptMigration(client, migration, reason) {
  log(`adopting ${migration.tag} (${reason})`);
  await recordMigration(client, migration);
}

async function adoptExistingMigrationRecord(client, row, migration, reason) {
  log(`adopting ${migration.tag} (${reason}; repairing existing history row)`);
  await repairMigrationRecord(client, row, migration);
}

async function applyMigration(client, migration, options = {}) {
  const { existingRow = null } = options;
  if (migration.statements.length === 0) {
    fail(`${migration.tag} has no SQL statements`);
  }

  const useTransaction = shouldUseTransaction(migration);
  log(
    existingRow
      ? `reconciling ${migration.tag} (${migration.statements.length} statements)`
      : `applying ${migration.tag} (${migration.statements.length} statements)`,
  );

  if (useTransaction) {
    await client.query("BEGIN");
  }

  try {
    for (const statement of migration.statements) {
      const schemaState = await loadSchemaState(client);
      const status = statementStatus(statement, schemaState);

      if (status.unsafeReason) {
        fail(`${migration.tag}: ${status.unsafeReason}`);
      }

      if (status.satisfied) {
        continue;
      }

      await client.query(statement);
    }
    if (existingRow) {
      await repairMigrationRecord(client, existingRow, migration);
    } else {
      await recordMigration(client, migration);
    }

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
      const schemaState = await loadSchemaState(client);
      const pending = migrations
        .filter(
          (migration) =>
            !findAppliedRow(appliedRows, migration, {
              tolerateHashMismatch: migrationEndStateStatus(
                migration,
                schemaState,
              ).satisfied,
            }),
        )
        .map((migration) => {
          const status = migrationEndStateStatus(migration, schemaState);
          return `${migration.tag}:${status.satisfied ? "adopt" : "apply"}`;
        });
      log(
        pending.length === 0
          ? "database is already up to date"
          : `pending: ${pending.join(", ")}`,
      );
      return;
    }

    await ensureMigrationTable(client);
    await acquireLock(client);

    try {
      const appliedRows = await loadAppliedRows(client);
      let adopted = 0;
      let applied = 0;

      for (const migration of migrations) {
        const appliedRow = findAppliedRow(appliedRows, migration, {
          tolerateHashMismatch: true,
        });
        if (appliedRow) await backfillTag(client, appliedRow, migration);
      }

      for (const migration of migrations) {
        const schemaState = await loadSchemaState(client);
        const status = migrationEndStateStatus(migration, schemaState);
        const appliedRow = findAppliedRow(
          await loadAppliedRows(client),
          migration,
          {
            tolerateHashMismatch: true,
          },
        );

        if (appliedRow) {
          if (!migrationHasSchemaOperations(migration)) {
            continue;
          }

          if (
            status.satisfied &&
            ((!migration.hashVariants.has(appliedRow.hash) &&
              appliedRow.hash !== migration.hash) ||
              Number(appliedRow.created_at) !== migration.when ||
              appliedRow.tag !== migration.tag)
          ) {
            await adoptExistingMigrationRecord(
              client,
              appliedRow,
              migration,
              status.reason,
            );
            adopted += 1;
          }
          if (!status.satisfied) {
            await applyMigration(client, migration, {
              existingRow: appliedRow,
            });
            applied += 1;
          }
          continue;
        }

        if (status.satisfied) {
          await adoptMigration(client, migration, status.reason);
          adopted += 1;
          continue;
        }

        await applyMigration(client, migration);
        applied += 1;
      }

      if (adopted === 0 && applied === 0) {
        log("database is already up to date");
        return;
      }

      log(
        `applied ${applied} migration${applied === 1 ? "" : "s"}` +
          `, adopted ${adopted}`,
      );
    } finally {
      await releaseLock(client);
    }
  } finally {
    await client.end();
  }
}

function isMainModule() {
  const entry = process.argv[1];
  return (
    Boolean(entry) &&
    import.meta.url === pathToFileURL(path.resolve(entry)).href
  );
}

if (isMainModule()) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
