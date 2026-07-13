-- Phase 01 expand-only financial state. No legacy column or event is removed.
ALTER TABLE "webshop_payments"
  ADD COLUMN IF NOT EXISTS "captured_amount_minor" bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "refunded_amount_minor" bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "disputed_amount_minor" bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "state_version" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_provider_event_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "last_provider_event_id" text;

UPDATE "webshop_payments"
SET
  "captured_amount_minor" = CASE
    WHEN "status" IN ('paid','partially_refunded','refunded','disputed','chargeback') THEN "amount_minor"
    ELSE 0
  END,
  "refunded_amount_minor" = CASE WHEN "status" = 'refunded' THEN "amount_minor" ELSE 0 END
WHERE "captured_amount_minor" = 0 AND "refunded_amount_minor" = 0;

ALTER TABLE "webshop_payments"
  DROP CONSTRAINT IF EXISTS "webshop_payments_status_check";
ALTER TABLE "webshop_payments"
  ADD CONSTRAINT "webshop_payments_status_check"
  CHECK ("status" IN ('pending','authorized','paid','failed','canceled','partially_refunded','refunded','disputed','chargeback'));
ALTER TABLE "webshop_payments"
  ADD CONSTRAINT "webshop_payments_captured_amount_check" CHECK ("captured_amount_minor" >= 0),
  ADD CONSTRAINT "webshop_payments_refunded_amount_check" CHECK ("refunded_amount_minor" >= 0 AND "refunded_amount_minor" <= "captured_amount_minor"),
  ADD CONSTRAINT "webshop_payments_disputed_amount_check" CHECK ("disputed_amount_minor" >= 0),
  ADD CONSTRAINT "webshop_payments_state_version_check" CHECK ("state_version" >= 0);

ALTER TABLE "webshop_orders"
  DROP CONSTRAINT IF EXISTS "webshop_orders_payment_status_check";
ALTER TABLE "webshop_orders"
  ADD CONSTRAINT "webshop_orders_payment_status_check"
  CHECK ("payment_status" IN ('unpaid','pending','authorized','paid','partially_refunded','refunded','disputed','chargeback','failed','canceled'));

ALTER TABLE "webshop_payment_events"
  ADD COLUMN IF NOT EXISTS "normalized_version" integer,
  ADD COLUMN IF NOT EXISTS "normalized_type" text,
  ADD COLUMN IF NOT EXISTS "provider_created_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "payment_reference" text,
  ADD COLUMN IF NOT EXISTS "transaction_reference" text,
  ADD COLUMN IF NOT EXISTS "adjustment_reference" text,
  ADD COLUMN IF NOT EXISTS "amount_minor" bigint,
  ADD COLUMN IF NOT EXISTS "currency" text,
  ADD COLUMN IF NOT EXISTS "payload_hash" text,
  ADD COLUMN IF NOT EXISTS "processing_status" text NOT NULL DEFAULT 'received',
  ADD COLUMN IF NOT EXISTS "processing_attempt_count" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_processing_error" text,
  ADD COLUMN IF NOT EXISTS "processed_state_version" integer;
ALTER TABLE "webshop_payment_events"
  ADD CONSTRAINT "webshop_payment_events_processing_status_check"
  CHECK ("processing_status" IN ('received','processed','ignored','failed')),
  ADD CONSTRAINT "webshop_payment_events_processing_attempt_count_check"
  CHECK ("processing_attempt_count" >= 0);

CREATE TABLE IF NOT EXISTS "webshop_payment_provider_references" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "payment_id" uuid NOT NULL REFERENCES "webshop_payments"("id") ON DELETE cascade,
  "provider_key" text NOT NULL,
  "reference_type" text NOT NULL,
  "reference" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "webshop_payment_provider_references_type_check" CHECK ("reference_type" IN ('merchant_payment','order','checkout_session','payment_intent','charge','capture','transaction','adjustment','dispute'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "webshop_payment_provider_references_unique" ON "webshop_payment_provider_references" USING btree ("provider_key","reference");
CREATE INDEX IF NOT EXISTS "webshop_payment_provider_references_payment_idx" ON "webshop_payment_provider_references" USING btree ("payment_id");

CREATE TABLE IF NOT EXISTS "webshop_payment_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "webshop_orders"("id") ON DELETE cascade,
  "checkout_session_id" uuid NOT NULL REFERENCES "webshop_checkout_sessions"("id") ON DELETE cascade,
  "payment_id" uuid REFERENCES "webshop_payments"("id") ON DELETE set null,
  "provider_key" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "amount_minor" bigint NOT NULL,
  "currency" text NOT NULL,
  "status" text DEFAULT 'creating' NOT NULL,
  "provider_reference" text,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "webshop_payment_attempts_status_check" CHECK ("status" IN ('creating','created','failed','expired')),
  CONSTRAINT "webshop_payment_attempts_amount_check" CHECK ("amount_minor" >= 0),
  CONSTRAINT "webshop_payment_attempts_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$')
);
CREATE UNIQUE INDEX IF NOT EXISTS "webshop_payment_attempts_idempotency_unique" ON "webshop_payment_attempts" USING btree ("idempotency_key");
CREATE INDEX IF NOT EXISTS "webshop_payment_attempts_order_idx" ON "webshop_payment_attempts" USING btree ("order_id");
CREATE INDEX IF NOT EXISTS "webshop_payment_attempts_checkout_idx" ON "webshop_payment_attempts" USING btree ("checkout_session_id");

ALTER TABLE "webshop_refunds"
  ADD COLUMN IF NOT EXISTS "provider_key" text,
  ADD COLUMN IF NOT EXISTS "request_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS "idempotency_key" text NOT NULL DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS "provider_event_id" text,
  ADD COLUMN IF NOT EXISTS "provider_adjustment_id" text,
  ADD COLUMN IF NOT EXISTS "provider_transaction_reference" text,
  ADD COLUMN IF NOT EXISTS "requested_at" timestamp with time zone NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "submitted_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "settled_at" timestamp with time zone;
UPDATE "webshop_refunds" refunds
SET "provider_key" = payments."provider_key"
FROM "webshop_payments" payments
WHERE refunds."payment_id" = payments."id" AND refunds."provider_key" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "webshop_refunds_request_id_unique" ON "webshop_refunds" USING btree ("request_id");
CREATE UNIQUE INDEX IF NOT EXISTS "webshop_refunds_payment_idempotency_unique" ON "webshop_refunds" USING btree ("payment_id","idempotency_key");
CREATE UNIQUE INDEX IF NOT EXISTS "webshop_refunds_provider_event_unique" ON "webshop_refunds" USING btree ("provider_key","provider_event_id") WHERE "provider_event_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "webshop_refunds_provider_adjustment_unique" ON "webshop_refunds" USING btree ("provider_key","provider_adjustment_id") WHERE "provider_adjustment_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "webshop_refund_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "refund_id" uuid NOT NULL REFERENCES "webshop_refunds"("id") ON DELETE cascade,
  "order_item_id" uuid NOT NULL REFERENCES "webshop_order_items"("id") ON DELETE restrict,
  "quantity" integer NOT NULL,
  "amount_minor" bigint NOT NULL,
  "license_action" text DEFAULT 'none' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "webshop_refund_items_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "webshop_refund_items_amount_check" CHECK ("amount_minor" >= 0),
  CONSTRAINT "webshop_refund_items_license_action_check" CHECK ("license_action" IN ('none','suspend','revoke'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "webshop_refund_items_refund_item_unique" ON "webshop_refund_items" USING btree ("refund_id","order_item_id");
CREATE INDEX IF NOT EXISTS "webshop_refund_items_order_item_idx" ON "webshop_refund_items" USING btree ("order_item_id");

CREATE TABLE IF NOT EXISTS "webshop_payment_disputes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "payment_id" uuid NOT NULL REFERENCES "webshop_payments"("id") ON DELETE cascade,
  "order_id" uuid NOT NULL REFERENCES "webshop_orders"("id") ON DELETE cascade,
  "provider_key" text NOT NULL,
  "provider_dispute_id" text NOT NULL,
  "amount_minor" bigint NOT NULL,
  "currency" text NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "reason_code" text,
  "raw_safe_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "opened_at" timestamp with time zone DEFAULT now() NOT NULL,
  "closed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "webshop_payment_disputes_status_check" CHECK ("status" IN ('open','won','lost','closed')),
  CONSTRAINT "webshop_payment_disputes_amount_check" CHECK ("amount_minor" >= 0),
  CONSTRAINT "webshop_payment_disputes_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$')
);
CREATE UNIQUE INDEX IF NOT EXISTS "webshop_payment_disputes_provider_unique" ON "webshop_payment_disputes" USING btree ("provider_key","provider_dispute_id");
CREATE INDEX IF NOT EXISTS "webshop_payment_disputes_payment_idx" ON "webshop_payment_disputes" USING btree ("payment_id");
CREATE INDEX IF NOT EXISTS "webshop_payment_disputes_order_idx" ON "webshop_payment_disputes" USING btree ("order_id");
