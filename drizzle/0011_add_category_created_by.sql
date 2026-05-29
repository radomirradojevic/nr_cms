CREATE TABLE IF NOT EXISTS "global_settings" (
  "id" integer PRIMARY KEY NOT NULL,
  "site_name" text DEFAULT 'Night Raven CMS' NOT NULL,
  "site_logo_file_id" uuid,
  "header_content" text,
  "header_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "footer_content" text,
  "footer_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "sticky_header_height" integer DEFAULT 0 NOT NULL,
  "sticky_footer_height" integer DEFAULT 0 NOT NULL,
  "max_upload_size_bytes" bigint DEFAULT 52428800 NOT NULL,
  "max_batch_upload_size_bytes" bigint DEFAULT 524288000 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" text,
  CONSTRAINT "global_settings_singleton_check" CHECK ("global_settings"."id" = 1),
  CONSTRAINT "global_settings_sticky_header_check" CHECK ("global_settings"."sticky_header_height" BETWEEN 0 AND 400),
  CONSTRAINT "global_settings_sticky_footer_check" CHECK ("global_settings"."sticky_footer_height" BETWEEN 0 AND 400),
  CONSTRAINT "global_settings_max_upload_check" CHECK ("global_settings"."max_upload_size_bytes" > 0),
  CONSTRAINT "global_settings_max_batch_check" CHECK ("global_settings"."max_batch_upload_size_bytes" >= "global_settings"."max_upload_size_bytes")
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'global_settings_site_logo_file_id_files_id_fk'
  ) THEN
    ALTER TABLE "global_settings"
      ADD CONSTRAINT "global_settings_site_logo_file_id_files_id_fk"
      FOREIGN KEY ("site_logo_file_id") REFERENCES "public"."files"("id")
      ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "content_categories" ADD COLUMN IF NOT EXISTS "created_by" text;
