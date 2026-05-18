-- Content edit locking: short-lived heartbeat-refreshed leases + optimistic
-- concurrency. See .github/instructions/cms-content-edit-locking.instructions.md

-- Optimistic concurrency column on content.
ALTER TABLE "content"
  ADD COLUMN "version" integer NOT NULL DEFAULT 1;--> statement-breakpoint

-- Active locks. At most one row per content_id (enforced by PK).
CREATE TABLE "content_edit_locks" (
  "content_id" uuid PRIMARY KEY NOT NULL,
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

ALTER TABLE "content_edit_locks"
  ADD CONSTRAINT "content_edit_locks_content_id_fk"
  FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE;--> statement-breakpoint

CREATE INDEX "content_edit_locks_user_id_idx"
  ON "content_edit_locks" ("user_id");--> statement-breakpoint

CREATE INDEX "content_edit_locks_lease_expires_at_idx"
  ON "content_edit_locks" ("lease_expires_at");--> statement-breakpoint

-- Append-only audit log.
CREATE TABLE "content_edit_lock_audit" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY NOT NULL,
  "content_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "event" text NOT NULL,
  "previous_user_id" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "metadata" jsonb
);--> statement-breakpoint

CREATE INDEX "content_edit_lock_audit_content_id_idx"
  ON "content_edit_lock_audit" ("content_id");--> statement-breakpoint

CREATE INDEX "content_edit_lock_audit_created_at_idx"
  ON "content_edit_lock_audit" ("created_at");--> statement-breakpoint

ALTER TABLE "content_edit_lock_audit"
  ADD CONSTRAINT "content_edit_lock_audit_event_check"
  CHECK ("event" IN ('acquired','refreshed','released','expired','force_taken','save_rejected_stale'));
