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

function makeWebshopProviderConstraintState(providerKeys) {
  const providerList = providerKeys.map((key) => `'${key}'`).join(",");
  return {
    tables: new Set(["webshop_payment_events", "webshop_payments"]),
    tableColumns: new Map(),
    columnDefaults: new Map(),
    indexes: new Set(),
    constraints: new Set([
      "webshop_payment_events_provider_key_check",
      "webshop_payments_provider_key_check",
    ]),
    constraintDefinitions: new Map([
      [
        "webshop_payment_events.webshop_payment_events_provider_key_check",
        `"webshop_payment_events"."provider_key" IN (${providerList})`,
      ],
      [
        "webshop_payments.webshop_payments_provider_key_check",
        `"webshop_payments"."provider_key" IN (${providerList})`,
      ],
    ]),
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

test("migration runner does not reapply superseded AI model default migration", () => {
  const schemaState = makeSchemaState(["id", "ai_writing_assistant_model"]);
  schemaState.columnDefaults.set(
    "global_settings.ai_writing_assistant_model",
    "'gpt-4.1-mini'",
  );

  const status = __migrationRunnerTesting.migrationEndStateStatus(
    {
      tag: "0030_bent_moonstone",
      statements: [
        'ALTER TABLE "global_settings" ALTER COLUMN "ai_writing_assistant_model" SET DEFAULT \'gpt-5.5\'',
      ],
    },
    schemaState,
  );

  assert.equal(status.satisfied, true);
  assert.equal(status.reason, "superseded by 0039_youthful_risque");
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

test("migration runner recognizes data-only migrations", () => {
  assert.equal(
    __migrationRunnerTesting.migrationHasSchemaOperations({
      tag: "0057_webshop_product_price_minor_units",
      statements: [
        'UPDATE "webshop_products" SET "base_price_minor" = "base_price_minor" * 100',
      ],
    }),
    false,
  );

  assert.equal(
    __migrationRunnerTesting.migrationHasSchemaOperations({
      tag: "0060_webshop_product_reviews",
      statements: ['CREATE TABLE "webshop_product_reviews" ("id" uuid)'],
    }),
    true,
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

test("migration runner does not reapply superseded webshop provider checks", () => {
  const schemaState = makeWebshopProviderConstraintState([
    "cash_on_delivery",
    "stripe",
    "paypal",
    "bank_redirect",
    "ips_qr",
    "monri",
    "paddle",
  ]);

  const monriStatus = __migrationRunnerTesting.migrationEndStateStatus(
    {
      tag: "0064_webshop_offline_payment_provider_checks",
      statements: [
        'ALTER TABLE "webshop_payments" DROP CONSTRAINT IF EXISTS "webshop_payments_provider_key_check"',
        "ALTER TABLE \"webshop_payments\" ADD CONSTRAINT \"webshop_payments_provider_key_check\" CHECK (\"webshop_payments\".\"provider_key\" IN ('cash_on_delivery','stripe','paypal','bank_redirect','ips_qr','local_card_gateway'))",
        'ALTER TABLE "webshop_payment_events" DROP CONSTRAINT IF EXISTS "webshop_payment_events_provider_key_check"',
        "ALTER TABLE \"webshop_payment_events\" ADD CONSTRAINT \"webshop_payment_events_provider_key_check\" CHECK (\"webshop_payment_events\".\"provider_key\" IN ('cash_on_delivery','stripe','paypal','bank_redirect','ips_qr','local_card_gateway'))",
      ],
    },
    schemaState,
  );

  const paddleStatus = __migrationRunnerTesting.migrationEndStateStatus(
    {
      tag: "0070_rename_local_card_gateway_to_monri",
      statements: [
        'ALTER TABLE "webshop_payment_events" DROP CONSTRAINT IF EXISTS "webshop_payment_events_provider_key_check"',
        'ALTER TABLE "webshop_payments" DROP CONSTRAINT IF EXISTS "webshop_payments_provider_key_check"',
        "ALTER TABLE \"webshop_payments\" ADD CONSTRAINT \"webshop_payments_provider_key_check\" CHECK (\"webshop_payments\".\"provider_key\" IN ('cash_on_delivery','stripe','paypal','bank_redirect','ips_qr','monri'))",
        "ALTER TABLE \"webshop_payment_events\" ADD CONSTRAINT \"webshop_payment_events_provider_key_check\" CHECK (\"webshop_payment_events\".\"provider_key\" IN ('cash_on_delivery','stripe','paypal','bank_redirect','ips_qr','monri'))",
      ],
    },
    schemaState,
  );

  assert.equal(monriStatus.satisfied, true);
  assert.equal(
    monriStatus.reason,
    "superseded by Monri payment provider schema",
  );
  assert.equal(paddleStatus.satisfied, true);
  assert.equal(
    paddleStatus.reason,
    "superseded by Paddle payment provider schema",
  );
});

test("migration runner accepts superseded webshop media unique constraint", () => {
  const status = __migrationRunnerTesting.migrationEndStateStatus(
    {
      tag: "0050_chief_vivisector",
      statements: [
        `CREATE TABLE "webshop_product_media" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "product_id" uuid NOT NULL,
          "file_id" uuid NOT NULL,
          "role" text DEFAULT 'gallery' NOT NULL,
          "alt" text,
          "position" integer DEFAULT 0 NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          CONSTRAINT "webshop_product_media_product_file_unique" UNIQUE("product_id","file_id"),
          CONSTRAINT "webshop_product_media_role_check" CHECK ("webshop_product_media"."role" IN ('cover','gallery')),
          CONSTRAINT "webshop_product_media_position_check" CHECK ("webshop_product_media"."position" >= 0)
        )`,
      ],
    },
    {
      tables: new Set(["webshop_product_media"]),
      tableColumns: new Map([
        [
          "webshop_product_media",
          new Set([
            "id",
            "product_id",
            "file_id",
            "role",
            "alt",
            "position",
            "created_at",
            "variant_id",
          ]),
        ],
      ]),
      columnDefaults: new Map(),
      indexes: new Set(),
      constraints: new Set([
        "webshop_product_media_pkey",
        "webshop_product_media_product_file_variant_unique",
        "webshop_product_media_role_check",
        "webshop_product_media_position_check",
      ]),
      constraintDefinitions: new Map(),
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

test("webshop price minor-unit migrations avoid repeated scaling", () => {
  const priceUnitMigration = fs.readFileSync(
    new URL(
      "../drizzle/0057_webshop_product_price_minor_units.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const correctionMigration = fs.readFileSync(
    new URL(
      "../drizzle/0061_webshop_price_minor_unit_correction.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const repeatedCorrectionMigration = fs.readFileSync(
    new URL(
      "../drizzle/0062_webshop_repeated_price_scale_correction.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(priceUnitMigration, /"base_price_minor" < 1000000/);
  assert.match(priceUnitMigration, /"price_minor" < 1000000/);
  assert.match(correctionMigration, /"base_price_minor" >= 100000000/);
  assert.match(correctionMigration, /"price_minor" >= 100000000/);
  assert.match(repeatedCorrectionMigration, /"base_price_minor" >= 100000000/);
  assert.match(repeatedCorrectionMigration, /"price_minor" >= 100000000/);
});
