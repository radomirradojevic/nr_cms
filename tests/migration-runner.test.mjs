import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { __migrationRunnerTesting } from "../scripts/run-drizzle-migrations.mjs";

function makeSchemaState(columns) {
  return {
    tables: new Set(["global_settings"]),
    tableColumns: new Map([["global_settings", new Set(columns)]]),
    columnDefaults: new Map(),
    indexes: new Set(),
    constraints: new Set(),
    constraintDefinitions: new Map(),
  };
}

test("migration runner does not reapply legacy appearance migration after content width split", () => {
  const status = __migrationRunnerTesting.migrationEndStateStatus(
    {
      tag: "0015_appearance",
      statements: [
        'ALTER TABLE "global_settings" ADD COLUMN "content_width" text DEFAULT \'contained\' NOT NULL',
        'UPDATE "global_settings" SET "theme" = \'default\' WHERE "id" = 1',
      ],
    },
    makeSchemaState([
      "id",
      "theme",
      "frontend_content_width",
      "backend_content_width",
      "font_preset",
      "radius_preset",
      "shadow_preset",
    ]),
  );

  assert.equal(status.satisfied, true);
  assert.equal(status.reason, "superseded by split appearance schema");
});

test("migration runner still applies appearance migration before split columns exist", () => {
  const reason = __migrationRunnerTesting.supersededMigrationReason(
    { tag: "0015_appearance" },
    makeSchemaState([
      "id",
      "theme",
      "content_width",
      "font_preset",
      "radius_preset",
      "shadow_preset",
    ]),
  );

  assert.equal(reason, null);
});

test("migration runner normalizes postgres text casts in column defaults", () => {
  assert.equal(
    __migrationRunnerTesting.normalizeColumnDefault("('gpt-5.5'::text)"),
    "'gpt-5.5'",
  );
});

test("migration runner recognizes postgres-truncated constraint names", () => {
  const status = __migrationRunnerTesting.migrationEndStateStatus(
    {
      tag: "0049_massive_rawhide_kid",
      statements: [
        'ALTER TABLE "webshop_categories" ADD CONSTRAINT "webshop_categories_canonical_category_id_webshop_categories_id_fk" FOREIGN KEY ("canonical_category_id") REFERENCES "public"."webshop_categories"("id") ON DELETE set null ON UPDATE no action',
      ],
    },
    {
      tables: new Set(["webshop_categories"]),
      tableColumns: new Map([
        ["webshop_categories", new Set(["id", "canonical_category_id"])],
      ]),
      columnDefaults: new Map(),
      indexes: new Set(),
      constraints: new Set([
        "webshop_categories_canonical_category_id_webshop_categories_id_",
      ]),
      constraintDefinitions: new Map([
        [
          "webshop_categories.webshop_categories_canonical_category_id_webshop_categories_id_",
          "FOREIGN KEY (canonical_category_id) REFERENCES webshop_categories(id) ON DELETE SET NULL",
        ],
      ]),
    },
  );

  assert.equal(status.satisfied, true);
});

test("webshop public migrations are present in checked migration files", () => {
  const contentTypeMigration = fs.readFileSync(
    new URL("../drizzle/0047_webshop_foundation.sql", import.meta.url),
    "utf8",
  );
  const entitlementMigration = fs.readFileSync(
    new URL("../drizzle/0048_curly_praxagora.sql", import.meta.url),
    "utf8",
  );

  assert.match(contentTypeMigration, /'webshop'/);
  assert.match(
    entitlementMigration,
    /CREATE TABLE "webshop_addon_entitlements"/,
  );
});
