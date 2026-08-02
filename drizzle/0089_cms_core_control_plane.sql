-- Operator-only control-plane metadata. Runtime roles never receive USAGE on
-- nr_control; migration receipts are deliberately separated from CMS CRUD.
CREATE SCHEMA IF NOT EXISTS "nr_control";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nr_control"."cms_core_migration_receipts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "target" text NOT NULL,
  "database_resource_id" text NOT NULL,
  "manifest_hash" text NOT NULL,
  "migration_set_hash" text NOT NULL,
  "status" text NOT NULL DEFAULT 'applied',
  "applied_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "cms_core_migration_receipts_target_hash_unique" UNIQUE("target", "manifest_hash", "migration_set_hash"),
  CONSTRAINT "cms_core_migration_receipts_status_check" CHECK ("status" = 'applied')
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_core_migration_receipts_target_applied_at_idx"
  ON "nr_control"."cms_core_migration_receipts" ("target", "applied_at" DESC);
