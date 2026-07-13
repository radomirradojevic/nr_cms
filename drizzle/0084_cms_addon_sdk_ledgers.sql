CREATE TABLE IF NOT EXISTS "cms_addon_migrations" (
  "addon_key" text NOT NULL, "migration_id" text NOT NULL, "checksum" text NOT NULL, "package_version" text NOT NULL, "schema_version" integer NOT NULL, "status" text NOT NULL DEFAULT 'pending', "started_at" timestamp with time zone, "applied_at" timestamp with time zone, "duration_ms" integer, "error_code" text, "error_message" text,
  CONSTRAINT "cms_addon_migrations_pk" PRIMARY KEY ("addon_key","migration_id"),
  CONSTRAINT "cms_addon_migrations_status_check" CHECK ("status" IN ('pending','applying','applied','failed','legacy_applied'))
);
CREATE TABLE IF NOT EXISTS "cms_addon_operations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "addon_key" text NOT NULL, "operation_key" text NOT NULL, "operation_type" text NOT NULL, "status" text NOT NULL DEFAULT 'pending', "request_hash" text NOT NULL, "result" jsonb NOT NULL DEFAULT '{}'::jsonb, "error_code" text, "created_at" timestamp with time zone NOT NULL DEFAULT now(), "completed_at" timestamp with time zone,
  CONSTRAINT "cms_addon_operations_key_unique" UNIQUE ("addon_key","operation_key"),
  CONSTRAINT "cms_addon_operations_status_check" CHECK ("status" IN ('pending','running','completed','failed'))
);
