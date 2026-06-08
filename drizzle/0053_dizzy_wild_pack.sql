CREATE TABLE "webshop_fulfillments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"status" text DEFAULT 'fulfilled' NOT NULL,
	"carrier" text,
	"tracking_number" text,
	"notes" text,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"fulfilled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_fulfillments_status_check" CHECK ("webshop_fulfillments"."status" IN ('pending','fulfilled','canceled'))
);
--> statement-breakpoint
CREATE TABLE "webshop_order_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"type" text NOT NULL,
	"snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_order_addresses_type_check" CHECK ("webshop_order_addresses"."type" IN ('billing','shipping'))
);
--> statement-breakpoint
CREATE TABLE "webshop_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"variant_id" uuid,
	"title_snapshot" text NOT NULL,
	"variant_title_snapshot" text NOT NULL,
	"sku_snapshot" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_minor_snapshot" bigint DEFAULT 0 NOT NULL,
	"discount_minor_snapshot" bigint DEFAULT 0 NOT NULL,
	"tax_minor_snapshot" bigint DEFAULT 0 NOT NULL,
	"currency_snapshot" text DEFAULT 'RSD' NOT NULL,
	"product_type_snapshot" text NOT NULL,
	"fulfillment_data_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_order_items_quantity_check" CHECK ("webshop_order_items"."quantity" > 0),
	CONSTRAINT "webshop_order_items_price_check" CHECK ("webshop_order_items"."unit_price_minor_snapshot" >= 0 AND "webshop_order_items"."discount_minor_snapshot" >= 0 AND "webshop_order_items"."tax_minor_snapshot" >= 0),
	CONSTRAINT "webshop_order_items_currency_check" CHECK ("webshop_order_items"."currency_snapshot" ~ '^[A-Z]{3}$'),
	CONSTRAINT "webshop_order_items_product_type_check" CHECK ("webshop_order_items"."product_type_snapshot" IN ('physical','digital','service'))
);
--> statement-breakpoint
CREATE TABLE "webshop_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webshop_id" uuid NOT NULL,
	"order_number" text NOT NULL,
	"checkout_session_id" uuid NOT NULL,
	"confirmation_token_hash" text,
	"customer_user_id" text,
	"customer_email" text NOT NULL,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"fulfillment_status" text DEFAULT 'unfulfilled' NOT NULL,
	"subtotal_minor" bigint DEFAULT 0 NOT NULL,
	"discount_minor" bigint DEFAULT 0 NOT NULL,
	"tax_minor" bigint DEFAULT 0 NOT NULL,
	"shipping_minor" bigint DEFAULT 0 NOT NULL,
	"total_minor" bigint DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'RSD' NOT NULL,
	"internal_notes" text,
	"canceled_at" timestamp with time zone,
	"fulfilled_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_orders_status_check" CHECK ("webshop_orders"."status" IN ('pending_payment','confirmed','processing','fulfilled','completed','canceled','refunded')),
	CONSTRAINT "webshop_orders_payment_status_check" CHECK ("webshop_orders"."payment_status" IN ('unpaid','pending','authorized','paid','partially_refunded','refunded','failed')),
	CONSTRAINT "webshop_orders_fulfillment_status_check" CHECK ("webshop_orders"."fulfillment_status" IN ('unfulfilled','partial','fulfilled','not_required')),
	CONSTRAINT "webshop_orders_currency_check" CHECK ("webshop_orders"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "webshop_orders_totals_check" CHECK ("webshop_orders"."subtotal_minor" >= 0 AND "webshop_orders"."discount_minor" >= 0 AND "webshop_orders"."tax_minor" >= 0 AND "webshop_orders"."shipping_minor" >= 0 AND "webshop_orders"."total_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "webshop_payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_key" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"signature_verification_status" text DEFAULT 'verified' NOT NULL,
	"payment_id" uuid,
	"order_id" uuid,
	"raw_safe_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_payment_events_provider_key_check" CHECK ("webshop_payment_events"."provider_key" IN ('cash_on_delivery','stripe','paypal','bank_redirect')),
	CONSTRAINT "webshop_payment_events_signature_status_check" CHECK ("webshop_payment_events"."signature_verification_status" IN ('verified','failed','skipped'))
);
--> statement-breakpoint
CREATE TABLE "webshop_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"checkout_session_id" uuid NOT NULL,
	"provider_key" text NOT NULL,
	"provider_reference" text NOT NULL,
	"amount_minor" bigint DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'RSD' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"idempotency_key" text NOT NULL,
	"raw_safe_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_payments_provider_key_check" CHECK ("webshop_payments"."provider_key" IN ('cash_on_delivery','stripe','paypal','bank_redirect')),
	CONSTRAINT "webshop_payments_status_check" CHECK ("webshop_payments"."status" IN ('pending','authorized','paid','failed','canceled','partially_refunded','refunded')),
	CONSTRAINT "webshop_payments_amount_check" CHECK ("webshop_payments"."amount_minor" >= 0),
	CONSTRAINT "webshop_payments_currency_check" CHECK ("webshop_payments"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "webshop_refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"payment_id" uuid,
	"provider_reference" text,
	"amount_minor" bigint DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'RSD' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reason" text,
	"raw_safe_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_refunds_status_check" CHECK ("webshop_refunds"."status" IN ('pending','succeeded','failed','canceled')),
	CONSTRAINT "webshop_refunds_amount_check" CHECK ("webshop_refunds"."amount_minor" > 0),
	CONSTRAINT "webshop_refunds_currency_check" CHECK ("webshop_refunds"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "webshop_fulfillments" ADD CONSTRAINT "webshop_fulfillments_order_id_webshop_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."webshop_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_order_addresses" ADD CONSTRAINT "webshop_order_addresses_order_id_webshop_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."webshop_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_order_items" ADD CONSTRAINT "webshop_order_items_order_id_webshop_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."webshop_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_order_items" ADD CONSTRAINT "webshop_order_items_product_id_webshop_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."webshop_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_order_items" ADD CONSTRAINT "webshop_order_items_variant_id_webshop_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."webshop_product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_orders" ADD CONSTRAINT "webshop_orders_webshop_id_content_id_fk" FOREIGN KEY ("webshop_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_orders" ADD CONSTRAINT "webshop_orders_checkout_session_id_webshop_checkout_sessions_id_fk" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."webshop_checkout_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_payment_events" ADD CONSTRAINT "webshop_payment_events_payment_id_webshop_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."webshop_payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_payment_events" ADD CONSTRAINT "webshop_payment_events_order_id_webshop_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."webshop_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_payments" ADD CONSTRAINT "webshop_payments_order_id_webshop_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."webshop_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_payments" ADD CONSTRAINT "webshop_payments_checkout_session_id_webshop_checkout_sessions_id_fk" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."webshop_checkout_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_refunds" ADD CONSTRAINT "webshop_refunds_order_id_webshop_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."webshop_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_refunds" ADD CONSTRAINT "webshop_refunds_payment_id_webshop_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."webshop_payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "webshop_fulfillments_order_idx" ON "webshop_fulfillments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "webshop_fulfillments_status_idx" ON "webshop_fulfillments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "webshop_order_addresses_order_type_unique" ON "webshop_order_addresses" USING btree ("order_id","type");--> statement-breakpoint
CREATE INDEX "webshop_order_addresses_order_idx" ON "webshop_order_addresses" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "webshop_order_items_order_idx" ON "webshop_order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "webshop_order_items_product_idx" ON "webshop_order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "webshop_order_items_variant_idx" ON "webshop_order_items" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webshop_orders_webshop_order_number_unique" ON "webshop_orders" USING btree ("webshop_id","order_number");--> statement-breakpoint
CREATE UNIQUE INDEX "webshop_orders_checkout_session_unique" ON "webshop_orders" USING btree ("checkout_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webshop_orders_confirmation_token_unique" ON "webshop_orders" USING btree ("confirmation_token_hash") WHERE "webshop_orders"."confirmation_token_hash" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "webshop_orders_webshop_created_idx" ON "webshop_orders" USING btree ("webshop_id","created_at");--> statement-breakpoint
CREATE INDEX "webshop_orders_status_idx" ON "webshop_orders" USING btree ("status","payment_status");--> statement-breakpoint
CREATE INDEX "webshop_orders_customer_idx" ON "webshop_orders" USING btree ("customer_user_id");--> statement-breakpoint
CREATE INDEX "webshop_orders_email_idx" ON "webshop_orders" USING btree ("customer_email");--> statement-breakpoint
CREATE UNIQUE INDEX "webshop_payment_events_provider_event_unique" ON "webshop_payment_events" USING btree ("provider_key","provider_event_id");--> statement-breakpoint
CREATE INDEX "webshop_payment_events_payment_idx" ON "webshop_payment_events" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "webshop_payment_events_order_idx" ON "webshop_payment_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "webshop_payment_events_type_idx" ON "webshop_payment_events" USING btree ("provider_key","event_type");--> statement-breakpoint
CREATE UNIQUE INDEX "webshop_payments_provider_reference_unique" ON "webshop_payments" USING btree ("provider_key","provider_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "webshop_payments_idempotency_key_unique" ON "webshop_payments" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "webshop_payments_order_idx" ON "webshop_payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "webshop_payments_checkout_idx" ON "webshop_payments" USING btree ("checkout_session_id");--> statement-breakpoint
CREATE INDEX "webshop_payments_status_idx" ON "webshop_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "webshop_refunds_order_idx" ON "webshop_refunds" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "webshop_refunds_payment_idx" ON "webshop_refunds" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "webshop_refunds_status_idx" ON "webshop_refunds" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "webshop_download_entitlements_order_item_asset_unique" ON "webshop_download_entitlements" USING btree ("order_id","order_item_id","digital_asset_id");