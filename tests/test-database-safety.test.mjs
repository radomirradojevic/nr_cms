import assert from "node:assert/strict";
import test from "node:test";

import {
  assertSafeTestDatabaseUrl,
  resolveTestDatabaseUrl,
} from "../scripts/database-test-safety.mjs";

test("test database safety accepts a dedicated test database", () => {
  assert.equal(
    assertSafeTestDatabaseUrl("postgresql://user:password@localhost:5432/nr_cms_test"),
    "postgresql://user:password@localhost:5432/nr_cms_test",
  );
  assert.equal(
    assertSafeTestDatabaseUrl(
      "postgresql://user:password@localhost:5432/nr_cms_dev_test",
    ),
    "postgresql://user:password@localhost:5432/nr_cms_dev_test",
  );
});

test("test database safety rejects missing, non-test, and production targets", () => {
  assert.throws(() => resolveTestDatabaseUrl({}), /TEST_DATABASE_URL is required/);
  assert.throws(
    () =>
      assertSafeTestDatabaseUrl(
        "postgresql://user:password@localhost:5432/nr_cms_dev",
      ),
    /must target a database whose name contains a standalone test marker/,
  );
  assert.throws(
    () =>
      assertSafeTestDatabaseUrl(
        "postgresql://user:password@prod-db.example:5432/nr_cms_test",
      ),
    /must not target a development or production database/,
  );
});
