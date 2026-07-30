const UNSAFE_DATABASE_MARKER = /(?:^|[._-])(dev|development|prod|production)(?:$|[._-])/i;
const TEST_DATABASE_MARKER = /(?:^|[._-])test(?:$|[._-])/i;

function fail(message) {
  throw new Error(`[test-database] ${message}`);
}

/**
 * Validates a test-only PostgreSQL connection string without ever echoing it.
 * A database name containing a standalone `test` marker is intentionally
 * required so an inherited development or production DATABASE_URL cannot be
 * used by accident. A local CMS development URL may derive `nr_cms_test`;
 * production/remote URLs never derive a test target.
 */
export function assertSafeTestDatabaseUrl(value, variableName = "TEST_DATABASE_URL") {
  if (!value?.trim()) {
    fail(`${variableName} is required for database tests and test migrations.`);
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`${variableName} must be a valid PostgreSQL connection string.`);
  }

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    fail(`${variableName} must use the postgres or postgresql protocol.`);
  }

  const databaseName = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  if (!databaseName || !TEST_DATABASE_MARKER.test(databaseName)) {
    fail(`${variableName} must target a database whose name contains a standalone test marker.`);
  }

  if (UNSAFE_DATABASE_MARKER.test(url.hostname)) {
    fail(`${variableName} must not target a development or production database.`);
  }

  return url.toString();
}

export function resolveTestDatabaseUrl(env = process.env) {
  const explicit = env.TEST_DATABASE_URL?.trim();
  const value =
    explicit || deriveLocalTestDatabaseUrl(env.DATABASE_URL, env.CI);
  if (!value) {
    fail(
      "TEST_DATABASE_URL is required unless DATABASE_URL targets a local development database.",
    );
  }
  return assertSafeTestDatabaseUrl(value, "TEST_DATABASE_URL");
}

function deriveLocalTestDatabaseUrl(value, ci) {
  if (ci || !value?.trim()) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const databaseName = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    if (
      !["localhost", "127.0.0.1", "::1"].includes(host) ||
      !/(?:^|[._-])dev(?:$|[._-])/i.test(databaseName)
    ) {
      return null;
    }
    url.pathname = "/nr_cms_test";
    return url.toString();
  } catch {
    return null;
  }
}
