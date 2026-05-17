-- Add configurable session security timers to global_settings:
--   * max_session_duration_minutes — absolute session lifetime
--   * idle_logout_minutes — sliding idle window
-- See .github/instructions/session-security.instructions.md

ALTER TABLE "global_settings"
  ADD COLUMN "max_session_duration_minutes" integer NOT NULL DEFAULT 480;--> statement-breakpoint
ALTER TABLE "global_settings"
  ADD COLUMN "idle_logout_minutes" integer NOT NULL DEFAULT 30;--> statement-breakpoint
ALTER TABLE "global_settings"
  ADD CONSTRAINT "global_settings_max_session_range"
  CHECK ("global_settings"."max_session_duration_minutes" BETWEEN 5 AND 10080);--> statement-breakpoint
ALTER TABLE "global_settings"
  ADD CONSTRAINT "global_settings_idle_range"
  CHECK ("global_settings"."idle_logout_minutes" >= 1);--> statement-breakpoint
ALTER TABLE "global_settings"
  ADD CONSTRAINT "global_settings_idle_le_max"
  CHECK ("global_settings"."idle_logout_minutes" <= "global_settings"."max_session_duration_minutes");
