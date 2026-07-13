const UNSAFE_DATABASE_MARKER = /(?:^|[._-])(dev|development|prod|production)(?:$|[._-])/i;
const TEST_DATABASE_MARKER = /(?:^|[._-])test(?:$|[._-])/i;

function fail(message) {
  throw new Error(`[test-database] ${message}`);
}

/**
 * Validates a test-only PostgreSQL connection string without ever echoing it.
 * A database name containing a standalone `test` marker is intentionally
 * required so an inherited development or production DATABASE_URL cannot be
 * used by accident. The host is additionally rejected when it is explicitly
 * marked as development or production; a separate cloned test database may
 * legitimately retain `dev` in its database name (for example `*_dev_test`).
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
  return assertSafeTestDatabaseUrl(env.TEST_DATABASE_URL, "TEST_DATABASE_URL");
}
