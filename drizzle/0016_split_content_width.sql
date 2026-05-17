-- Split the single `content_width` setting into two independent settings:
-- one for public-facing (frontend) layouts and one for the admin (backend)
-- dashboard. Both reuse the existing enum: ('full-width','contained','narrow',
-- 'wide','ultra-wide'). Enum lists MUST stay in sync with lib/appearance.ts.
ALTER TABLE "global_settings" ADD COLUMN "frontend_content_width" text DEFAULT 'contained' NOT NULL;--> statement-breakpoint
ALTER TABLE "global_settings" ADD COLUMN "backend_content_width" text DEFAULT 'contained' NOT NULL;--> statement-breakpoint
-- Backfill the new columns from the existing `content_width` value so the
-- post-deploy behavior matches the pre-deploy behavior on both surfaces.
UPDATE "global_settings"
SET "frontend_content_width" = "content_width",
    "backend_content_width" = "content_width";--> statement-breakpoint
ALTER TABLE "global_settings" DROP CONSTRAINT IF EXISTS "global_settings_content_width_check";--> statement-breakpoint
ALTER TABLE "global_settings" DROP COLUMN "content_width";--> statement-breakpoint
ALTER TABLE "global_settings" ADD CONSTRAINT "global_settings_frontend_content_width_check" CHECK ("global_settings"."frontend_content_width" IN ('full-width','contained','narrow','wide','ultra-wide'));--> statement-breakpoint
ALTER TABLE "global_settings" ADD CONSTRAINT "global_settings_backend_content_width_check" CHECK ("global_settings"."backend_content_width" IN ('full-width','contained','narrow','wide','ultra-wide'));
