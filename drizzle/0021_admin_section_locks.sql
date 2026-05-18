-- Admin section locks: same collaborative edit-locking pattern as
-- content_edit_locks but keyed by a string section_key (no FK), so it can
-- guard admin singleton pages (global-settings, top-menu).
-- See .github/instructions/cms-content-edit-locking.instructions.md

CREATE TABLE "admin_section_locks" (
  "section_key" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "user_display_name" text NOT NULL,
  "user_role" text NOT NULL,
  "session_id" text NOT NULL,
  "client_id" text NOT NULL,
  "acquired_at" timestamp with time zone NOT NULL DEFAULT now(),
  "last_heartbeat_at" timestamp with time zone NOT NULL DEFAULT now(),
  "lease_expires_at" timestamp with time zone NOT NULL,
  "taken_over_by" text
);--> statement-breakpoint

CREATE INDEX "admin_section_locks_user_id_idx"
  ON "admin_section_locks" ("user_id");--> statement-breakpoint

CREATE INDEX "admin_section_locks_lease_expires_at_idx"
  ON "admin_section_locks" ("lease_expires_at");--> statement-breakpoint

CREATE TABLE "admin_section_lock_audit" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY NOT NULL,
  "section_key" text NOT NULL,
  "user_id" text NOT NULL,
  "event" text NOT NULL,
  "previous_user_id" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "metadata" jsonb
);--> statement-breakpoint

CREATE INDEX "admin_section_lock_audit_section_key_idx"
  ON "admin_section_lock_audit" ("section_key");--> statement-breakpoint

CREATE INDEX "admin_section_lock_audit_created_at_idx"
  ON "admin_section_lock_audit" ("created_at");--> statement-breakpoint

ALTER TABLE "admin_section_lock_audit"
  ADD CONSTRAINT "admin_section_lock_audit_event_check"
  CHECK ("event" IN ('acquired','refreshed','released','expired','force_taken','save_rejected_stale'));
