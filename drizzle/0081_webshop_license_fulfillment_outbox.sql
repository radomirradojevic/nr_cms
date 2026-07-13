ALTER TABLE "webshop_order_items" ADD COLUMN "fulfillment_status" text DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
ALTER TABLE "webshop_order_items" ADD COLUMN "fulfilled_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "webshop_order_items" ADD COLUMN "fulfillment_failure_code" text;
--> statement-breakpoint
ALTER TABLE "webshop_order_items" ADD COLUMN "fulfillment_last_error" text;
--> statement-breakpoint
ALTER TABLE "webshop_order_items" ADD COLUMN "fulfillment_version" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "webshop_order_items" AS item
SET "fulfillment_status" = CASE
  WHEN issue."status" = 'issued' THEN 'fulfilled'
  WHEN item."product_type_snapshot" = 'physical' THEN 'pending'
  WHEN item."fulfillment_data_snapshot"->>'licenseKeyPolicy' = 'license_server' THEN 'pending'
  ELSE 'not_required'
END,
"fulfilled_at" = CASE WHEN issue."status" = 'issued' THEN COALESCE(issue."issued_at", now()) ELSE NULL END
FROM "webshop_license_server_issues" AS issue
WHERE issue."order_item_id" = item."id";
--> statement-breakpoint
UPDATE "webshop_order_items"
SET "fulfillment_status" = CASE WHEN "product_type_snapshot" = 'physical' THEN 'pending' ELSE 'not_required' END
WHERE "fulfillment_status" = 'pending' AND NOT EXISTS (
  SELECT 1 FROM "webshop_license_server_issues" issue WHERE issue."order_item_id" = "webshop_order_items"."id"
);
--> statement-breakpoint
ALTER TABLE "webshop_order_items" ADD CONSTRAINT "webshop_order_items_fulfillment_status_check" CHECK ("fulfillment_status" IN ('not_required','pending','processing','fulfilled','failed','canceled','revoked'));
--> statement-breakpoint
ALTER TABLE "webshop_order_items" ADD CONSTRAINT "webshop_order_items_fulfillment_version_check" CHECK ("fulfillment_version" >= 0);
--> statement-breakpoint
ALTER TABLE "webshop_license_server_issues" ADD COLUMN "central_entitlement_id" text;
--> statement-breakpoint
ALTER TABLE "webshop_license_server_issues" ADD COLUMN "desired_status" text DEFAULT 'active' NOT NULL;
--> statement-breakpoint
ALTER TABLE "webshop_license_server_issues" ADD COLUMN "remote_status" text DEFAULT 'not_issued' NOT NULL;
--> statement-breakpoint
ALTER TABLE "webshop_license_server_issues" ADD COLUMN "request_hash" text;
--> statement-breakpoint
ALTER TABLE "webshop_license_server_issues" ADD COLUMN "contract_version" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "webshop_license_server_issues" ADD COLUMN "lease_token" uuid;
--> statement-breakpoint
ALTER TABLE "webshop_license_server_issues" ADD COLUMN "lease_expires_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "webshop_license_server_issues" ADD COLUMN "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "webshop_license_server_issues" ADD COLUMN "max_attempts" integer DEFAULT 12 NOT NULL;
--> statement-breakpoint
ALTER TABLE "webshop_license_server_issues" ADD COLUMN "last_http_status" integer;
--> statement-breakpoint
ALTER TABLE "webshop_license_server_issues" ADD COLUMN "last_request_id" text;
--> statement-breakpoint
ALTER TABLE "webshop_license_server_issues" ADD COLUMN "dead_lettered_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "webshop_license_server_issues" ADD COLUMN "completed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "webshop_license_server_issues" ADD COLUMN "encrypted_license_key" text;
--> statement-breakpoint
ALTER TABLE "webshop_license_server_issues" ADD COLUMN "license_key_kid" text;
--> statement-breakpoint
ALTER TABLE "webshop_license_server_issues" ADD COLUMN "signed_entitlement" text;
--> statement-breakpoint
ALTER TABLE "webshop_license_server_issues" ADD COLUMN "response_signature_kid" text;
--> statement-breakpoint
ALTER TABLE "webshop_license_server_issues" ADD COLUMN "delivered_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "webshop_license_server_issues" ADD COLUMN "revoked_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "webshop_license_server_issues"
SET "remote_status" = CASE WHEN "status" = 'issued' THEN 'active' WHEN "status" = 'revoked' THEN 'revoked' ELSE 'not_issued' END,
    "completed_at" = CASE WHEN "status" = 'issued' THEN COALESCE("issued_at", now()) ELSE NULL END;
--> statement-breakpoint
ALTER TABLE "webshop_license_server_issues" ADD CONSTRAINT "webshop_license_server_issues_desired_status_check" CHECK ("desired_status" IN ('active','suspended','revoked'));
--> statement-breakpoint
ALTER TABLE "webshop_license_server_issues" ADD CONSTRAINT "webshop_license_server_issues_remote_status_check" CHECK ("remote_status" IN ('not_issued','active','suspended','revoked','unknown'));
--> statement-breakpoint
CREATE INDEX "webshop_license_server_issues_retry_idx" ON "webshop_license_server_issues" USING btree ("next_attempt_at","lease_expires_at");
--> statement-breakpoint
CREATE TABLE "webshop_license_server_operations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "issue_id" uuid NOT NULL,
  "operation" text NOT NULL,
  "reason" text NOT NULL,
  "source_type" text NOT NULL,
  "source_id" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "request_hash" text NOT NULL,
  "request_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "response_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "max_attempts" integer DEFAULT 12 NOT NULL,
  "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
  "lease_token" uuid,
  "lease_expires_at" timestamp with time zone,
  "last_attempt_at" timestamp with time zone,
  "last_http_status" integer,
  "last_error_code" text,
  "last_error_message" text,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "webshop_license_server_operations_idempotency_unique" UNIQUE("idempotency_key"),
  CONSTRAINT "webshop_license_server_operations_type_check" CHECK ("operation" IN ('issue','suspend','revoke','reactivate','renew')),
  CONSTRAINT "webshop_license_server_operations_status_check" CHECK ("status" IN ('pending','processing','retry','succeeded','canceled','dead_letter')),
  CONSTRAINT "webshop_license_server_operations_attempt_count_check" CHECK ("attempt_count" >= 0 AND "max_attempts" > 0)
);
--> statement-breakpoint
ALTER TABLE "webshop_license_server_operations" ADD CONSTRAINT "webshop_license_server_operations_issue_id_webshop_license_server_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."webshop_license_server_issues"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "webshop_license_server_operations_claim_idx" ON "webshop_license_server_operations" USING btree ("status","next_attempt_at","created_at");
--> statement-breakpoint
CREATE INDEX "webshop_license_server_operations_issue_idx" ON "webshop_license_server_operations" USING btree ("issue_id","created_at");
--> statement-breakpoint
CREATE TABLE "webshop_outbox_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_type" text NOT NULL,
  "aggregate_type" text NOT NULL,
  "aggregate_id" uuid NOT NULL,
  "deduplication_key" text NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "max_attempts" integer DEFAULT 12 NOT NULL,
  "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
  "lease_token" uuid,
  "lease_expires_at" timestamp with time zone,
  "last_error_code" text,
  "last_error_message" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "processed_at" timestamp with time zone,
  CONSTRAINT "webshop_outbox_events_deduplication_unique" UNIQUE("deduplication_key"),
  CONSTRAINT "webshop_outbox_events_type_check" CHECK ("event_type" IN ('order.fulfillment_recalculate','order.customer_notification_requested')),
  CONSTRAINT "webshop_outbox_events_status_check" CHECK ("status" IN ('pending','processing','completed','failed','dead_letter')),
  CONSTRAINT "webshop_outbox_events_attempt_count_check" CHECK ("attempt_count" >= 0 AND "max_attempts" > 0)
);
--> statement-breakpoint
CREATE INDEX "webshop_outbox_events_claim_idx" ON "webshop_outbox_events" USING btree ("status","next_attempt_at");
