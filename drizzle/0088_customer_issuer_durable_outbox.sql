ALTER TABLE "customer_issuer_issue_outbox"
  ADD COLUMN IF NOT EXISTS "attempt_count" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "max_attempts" integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS "next_attempt_at" timestamp with time zone NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "lease_token" uuid,
  ADD COLUMN IF NOT EXISTS "lease_expires_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "last_error_code" text;
--> statement-breakpoint
ALTER TABLE "customer_issuer_issue_outbox" DROP CONSTRAINT IF EXISTS "customer_issuer_issue_outbox_status_check";
--> statement-breakpoint
ALTER TABLE "customer_issuer_issue_outbox" ADD CONSTRAINT "customer_issuer_issue_outbox_status_check" CHECK ("status" IN ('pending','processing','completed','failed','dead_letter'));
--> statement-breakpoint
ALTER TABLE "customer_issuer_issue_outbox" ADD CONSTRAINT "customer_issuer_issue_outbox_attempt_count_check" CHECK ("attempt_count" >= 0 AND "max_attempts" > 0);
--> statement-breakpoint
DROP INDEX IF EXISTS "customer_issuer_issue_outbox_status_idx";
--> statement-breakpoint
CREATE INDEX "customer_issuer_issue_outbox_status_idx" ON "customer_issuer_issue_outbox" USING btree ("status","next_attempt_at");
--> statement-breakpoint
ALTER TABLE "webshop_outbox_events" DROP CONSTRAINT IF EXISTS "webshop_outbox_events_type_check";
--> statement-breakpoint
ALTER TABLE "webshop_outbox_events" ADD CONSTRAINT "webshop_outbox_events_type_check" CHECK ("event_type" IN ('order.fulfillment_recalculate','order.customer_notification_requested','order.customer_license_issue_requested'));
