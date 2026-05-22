-- Form Builder edit locking: short-lived heartbeat-refreshed leases.
-- Admin-only and form-scoped; no takeover between administrators.
-- See .github/instructions/cms-content-edit-locking.instructions.md

CREATE TABLE "form_edit_locks" (
  "form_id" uuid PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "user_display_name" text NOT NULL,
  "user_role" text NOT NULL,
  "session_id" text NOT NULL,
  "client_id" text NOT NULL,
  "acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_heartbeat_at" timestamp with time zone DEFAULT now() NOT NULL,
  "lease_expires_at" timestamp with time zone NOT NULL
);--> statement-breakpoint

ALTER TABLE "form_edit_locks"
  ADD CONSTRAINT "form_edit_locks_form_id_fk"
  FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE;--> statement-breakpoint

CREATE INDEX "form_edit_locks_user_id_idx"
  ON "form_edit_locks" ("user_id");--> statement-breakpoint

CREATE INDEX "form_edit_locks_lease_expires_at_idx"
  ON "form_edit_locks" ("lease_expires_at");--> statement-breakpoint

CREATE TABLE "form_edit_lock_audit" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
  "form_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "event" text NOT NULL,
  "previous_user_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "metadata" jsonb
);--> statement-breakpoint

CREATE INDEX "form_edit_lock_audit_form_id_idx"
  ON "form_edit_lock_audit" ("form_id");--> statement-breakpoint

CREATE INDEX "form_edit_lock_audit_created_at_idx"
  ON "form_edit_lock_audit" ("created_at");--> statement-breakpoint

ALTER TABLE "form_edit_lock_audit"
  ADD CONSTRAINT "form_edit_lock_audit_event_check"
  CHECK ("event" IN ('acquired','refreshed','released','expired','save_rejected_stale'));
