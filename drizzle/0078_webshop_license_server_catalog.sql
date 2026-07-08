ALTER TABLE "webshop_license_servers"
  ADD COLUMN "last_catalog_sync_at" timestamp with time zone,
  ADD COLUMN "last_catalog_status" text,
  ADD COLUMN "last_catalog_message" text;

CREATE TABLE IF NOT EXISTS "webshop_license_server_catalog_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "license_server_id" uuid NOT NULL,
  "product_type_id" text NOT NULL,
  "product_external_ref" text,
  "product_title" text NOT NULL,
  "product_status" text NOT NULL,
  "sku_id" text NOT NULL,
  "sku" text NOT NULL,
  "sku_status" text NOT NULL,
  "duration_days" integer DEFAULT 0 NOT NULL,
  "license_type" text DEFAULT 'perpetual' NOT NULL,
  "policy_template" text NOT NULL,
  "max_devices" integer,
  "max_domains" integer,
  "max_seats" integer,
  "features" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "synced_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "webshop_license_server_catalog_item_unique" UNIQUE("license_server_id","product_type_id","sku"),
  CONSTRAINT "webshop_license_server_catalog_product_type_id_length_check" CHECK (char_length("product_type_id") BETWEEN 1 AND 160),
  CONSTRAINT "webshop_license_server_catalog_sku_length_check" CHECK (char_length("sku") BETWEEN 1 AND 160),
  CONSTRAINT "webshop_license_server_catalog_duration_days_check" CHECK ("duration_days" >= 0)
);

ALTER TABLE "webshop_license_server_catalog_items"
  ADD CONSTRAINT "webshop_license_server_catalog_items_license_server_id_webshop_license_servers_id_fk"
  FOREIGN KEY ("license_server_id")
  REFERENCES "public"."webshop_license_servers"("id")
  ON DELETE cascade
  ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "webshop_license_server_catalog_server_idx"
  ON "webshop_license_server_catalog_items" USING btree ("license_server_id","product_title","sku");

CREATE INDEX IF NOT EXISTS "webshop_license_server_catalog_status_idx"
  ON "webshop_license_server_catalog_items" USING btree ("license_server_id","product_status","sku_status");
