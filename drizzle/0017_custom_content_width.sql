-- Allow the frontend/backend content width settings to accept either a
-- predefined preset (`full-width`, `contained`, `narrow`, `wide`,
-- `ultra-wide`) OR a custom positive integer string representing the
-- `max-width` in pixels (e.g. `'900'`). Custom values are stored as
-- digit-only strings without a `px` suffix; the application converts
-- them to `${n}px` when emitting CSS variables.

ALTER TABLE "global_settings" DROP CONSTRAINT IF EXISTS "global_settings_frontend_content_width_check";--> statement-breakpoint
ALTER TABLE "global_settings" DROP CONSTRAINT IF EXISTS "global_settings_backend_content_width_check";--> statement-breakpoint
ALTER TABLE "global_settings" ADD CONSTRAINT "global_settings_frontend_content_width_check" CHECK ("global_settings"."frontend_content_width" ~ '^(full-width|contained|narrow|wide|ultra-wide|[1-9][0-9]{0,4})$');--> statement-breakpoint
ALTER TABLE "global_settings" ADD CONSTRAINT "global_settings_backend_content_width_check" CHECK ("global_settings"."backend_content_width" ~ '^(full-width|contained|narrow|wide|ultra-wide|[1-9][0-9]{0,4})$');
