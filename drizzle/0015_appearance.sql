ALTER TABLE "global_settings" ADD COLUMN "theme" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "global_settings" ADD COLUMN "content_width" text DEFAULT 'contained' NOT NULL;--> statement-breakpoint
ALTER TABLE "global_settings" ADD COLUMN "font_preset" text DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "global_settings" ADD COLUMN "radius_preset" text DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "global_settings" ADD COLUMN "shadow_preset" text DEFAULT 'soft' NOT NULL;--> statement-breakpoint
ALTER TABLE "global_settings" ADD CONSTRAINT "global_settings_theme_check" CHECK ("global_settings"."theme" IN ('default','dark','minimal','corporate','cyberpunk','elegant'));--> statement-breakpoint
ALTER TABLE "global_settings" ADD CONSTRAINT "global_settings_content_width_check" CHECK ("global_settings"."content_width" IN ('full-width','contained','narrow','wide','ultra-wide'));--> statement-breakpoint
ALTER TABLE "global_settings" ADD CONSTRAINT "global_settings_font_preset_check" CHECK ("global_settings"."font_preset" IN ('system','sans','serif','mono','display','humanist'));--> statement-breakpoint
ALTER TABLE "global_settings" ADD CONSTRAINT "global_settings_radius_preset_check" CHECK ("global_settings"."radius_preset" IN ('none','small','medium','large','rounded'));--> statement-breakpoint
ALTER TABLE "global_settings" ADD CONSTRAINT "global_settings_shadow_preset_check" CHECK ("global_settings"."shadow_preset" IN ('none','soft','medium','strong'));--> statement-breakpoint
-- Backfill the singleton row defaults. The column defaults handle new rows
-- automatically, but this ensures any pre-existing row picks up the values
-- explicitly. Enum lists MUST stay in sync with lib/appearance.ts.
UPDATE "global_settings"
SET "theme" = 'default',
    "content_width" = 'contained',
    "font_preset" = 'system',
    "radius_preset" = 'medium',
    "shadow_preset" = 'soft'
WHERE "id" = 1;