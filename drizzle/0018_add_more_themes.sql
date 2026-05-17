-- Extend the global_settings.theme CHECK constraint to allow the additional
-- built-in themes registered in lib/appearance.ts:
--   Nature / soft (light): forest, ocean, sunset, pastel
--   Premium / high-end (dark): luxury, obsidian, midnight, aurora
--
-- Postgres does not support ALTER CONSTRAINT for CHECK clauses, so we drop
-- and re-create it. Enum list MUST stay in sync with lib/appearance.ts
-- (THEMES array) and db/schema.ts (global_settings_theme_check).
ALTER TABLE "global_settings" DROP CONSTRAINT IF EXISTS "global_settings_theme_check";--> statement-breakpoint
ALTER TABLE "global_settings" ADD CONSTRAINT "global_settings_theme_check" CHECK ("global_settings"."theme" IN ('default','dark','minimal','corporate','cyberpunk','elegant','forest','ocean','sunset','pastel','luxury','obsidian','midnight','aurora'));
