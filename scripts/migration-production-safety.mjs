function fail(message) {
  throw new Error(`[migration-safety] ${message}`);
}

function databaseTarget(value) {
  if (!value?.trim()) fail("DATABASE_URL is required for a production migration target check.");
  let url;
  try { url = new URL(value); }
  catch { fail("DATABASE_URL must be a valid PostgreSQL connection string."); }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    fail("DATABASE_URL must use the postgres or postgresql protocol.");
  }
  const host = url.hostname.toLowerCase();
  const database = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  if (!host || !database) fail("DATABASE_URL must contain a database host and name.");
  return { database, host };
}

export function assertProductionMigrationTarget(env, expectedService) {
  if (env.NR_MIGRATION_TARGET !== "production") {
    fail("NR_MIGRATION_TARGET must be production for a production migration command.");
  }
  if (env.NR_MIGRATION_SERVICE !== expectedService) {
    fail(`migration service must be ${expectedService}.`);
  }
  const target = databaseTarget(env.DATABASE_URL);
  const expectedHost = env.NR_MIGRATION_EXPECTED_HOST?.trim().toLowerCase();
  const expectedDatabase = env.NR_MIGRATION_EXPECTED_DATABASE?.trim();
  const expectedResource = env.NR_MIGRATION_EXPECTED_PROVIDER_RESOURCE_ID?.trim();
  const actualResource = env.NR_MIGRATION_PROVIDER_RESOURCE_ID?.trim();
  if (!expectedHost || target.host !== expectedHost) fail("database host does not match the approved migration target.");
  if (!expectedDatabase || target.database !== expectedDatabase) fail("database name does not match the approved migration target.");
  if (!expectedResource || !actualResource || actualResource !== expectedResource) fail("provider resource ID does not match the approved migration target.");
  return { database: target.database, host: target.host, providerResourceId: actualResource, service: expectedService };
}

export function assertMigrationChecksum({ actual, expected, tag }) {
  if (actual !== expected) fail(`checksum mismatch for ${tag}; restore the recorded migration or create a new migration.`);
}

export function assertExpectedMigrationList(pending, expected) {
  const normalized = expected?.split(",").map((tag) => tag.trim()).filter(Boolean) ?? [];
  if (normalized.length !== pending.length || normalized.some((tag, index) => tag !== pending[index])) {
    fail("expected migration list does not exactly match the pending migration list.");
  }
  return normalized;
}

export function migrationModeAllowsRepair(env) {
  return env.NR_MIGRATION_TARGET !== "production";
}

export function shouldHonorAutoMigrateDisable(env, { dryRun }) {
  if (dryRun) return false;
  const value = env.DRIZZLE_AUTO_MIGRATE?.trim().toLowerCase();
  return value === "0" || value === "false" || value === "off";
}
