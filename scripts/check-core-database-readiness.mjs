import process from "node:process";
import pg from "pg";

import {
  assertExactTargetDatabaseUrl,
  loadCmsCorePrivilegeManifest,
  resolveCmsCoreTarget,
} from "./core-db-contract.mjs";
import { loadMigrations } from "./run-drizzle-migrations.mjs";

const { Client } = pg;

function fail(message) {
  throw new Error(`[cms-core-db] ${message}`);
}

export async function assertCoreDatabaseReady(env = process.env) {
  const profile = env.NR_CMS_DEPLOYMENT_PROFILE?.trim();
  if (profile === "development") {
    return {
      checked: false,
      reason: "development profile is not a provisioned target",
    };
  }
  const target = resolveCmsCoreTarget(profile, loadCmsCorePrivilegeManifest());
  const rawDatabaseUrl = env.DATABASE_URL?.trim();
  if (!rawDatabaseUrl)
    fail("DATABASE_URL is required for a provisioned target startup.");
  assertExactTargetDatabaseUrl(rawDatabaseUrl, target, target.roles.runtime);

  const client = new Client({ connectionString: rawDatabaseUrl });
  await client.connect();
  try {
    const role = await client.query("SELECT current_user");
    if (role.rows[0]?.current_user !== target.roles.runtime) {
      fail("CMS startup is not using the exact target runtime login.");
    }
    const grants = await client.query(
      `
        SELECT
          has_schema_privilege(current_user, 'public', 'USAGE') AS public_usage,
          has_schema_privilege(current_user, 'nr_control', 'USAGE') AS control_usage,
          has_schema_privilege(current_user, 'drizzle', 'USAGE') AS ledger_usage,
          has_table_privilege(current_user, 'drizzle.__drizzle_migrations', 'SELECT') AS ledger_select
      `,
    );
    const grant = grants.rows[0];
    if (
      !grant?.public_usage ||
      !grant.ledger_usage ||
      !grant.ledger_select ||
      grant.control_usage
    ) {
      fail("runtime role privileges drifted from CmsCorePrivilegeManifestV1.");
    }

    const applied = await client.query(
      "SELECT hash, created_at, tag FROM drizzle.__drizzle_migrations ORDER BY id ASC",
    );
    const rowsByTag = new Map(applied.rows.map((row) => [row.tag, row]));
    for (const migration of loadMigrations()) {
      const row = rowsByTag.get(migration.tag);
      if (
        !row ||
        Number(row.created_at) !== migration.when ||
        !migration.hashVariants.has(row.hash)
      ) {
        fail(
          "core migration ledger is pending or drifted; refusing CMS listen.",
        );
      }
    }
    if (rowsByTag.size !== loadMigrations().length) {
      fail(
        "core migration ledger has unknown or legacy rows; refusing CMS listen.",
      );
    }
    return { checked: true, target: target.targetName };
  } finally {
    await client.end();
  }
}

if (process.argv[1]?.endsWith("check-core-database-readiness.mjs")) {
  assertCoreDatabaseReady()
    .then((result) =>
      console.log(
        `[cms-core-db] startup readiness ${result.checked ? "passed" : "skipped"}.`,
      ),
    )
    .catch((error) => {
      console.error(
        error instanceof Error
          ? error.message
          : "[cms-core-db] startup readiness failed.",
      );
      process.exitCode = 1;
    });
}
