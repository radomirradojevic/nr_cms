CREATE TABLE "webshop_cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_minor_snapshot" bigint DEFAULT 0 NOT NULL,
	"currency_snapshot" text DEFAULT 'RSD' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_cart_items_quantity_check" CHECK ("webshop_cart_items"."quantity" > 0),
	CONSTRAINT "webshop_cart_items_price_check" CHECK ("webshop_cart_items"."unit_price_minor_snapshot" >= 0),
	CONSTRAINT "webshop_cart_items_currency_check" CHECK ("webshop_cart_items"."currency_snapshot" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "webshop_carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webshop_id" uuid NOT NULL,
	"customer_user_id" text,
	"anonymous_token_hash" text,
	"currency" text DEFAULT 'RSD' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_carts_status_check" CHECK ("webshop_carts"."status" IN ('active','converted','abandoned','expired')),
	CONSTRAINT "webshop_carts_currency_check" CHECK ("webshop_carts"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "webshop_carts_owner_check" CHECK ("webshop_carts"."customer_user_id" IS NOT NULL OR "webshop_carts"."anonymous_token_hash" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "webshop_checkout_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checkout_session_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"status" text DEFAULT 'reserved' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_checkout_reservations_quantity_check" CHECK ("webshop_checkout_reservations"."quantity" > 0),
	CONSTRAINT "webshop_checkout_reservations_status_check" CHECK ("webshop_checkout_reservations"."status" IN ('reserved','released','converted'))
);
--> statement-breakpoint
CREATE TABLE "webshop_checkout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webshop_id" uuid NOT NULL,
	"cart_id" uuid NOT NULL,
	"customer_user_id" text,
	"confirmation_token_hash" text,
	"email" text NOT NULL,
	"billing_address" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"shipping_address" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"shipping_method_id" text,
	"coupon_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subtotal_minor" bigint DEFAULT 0 NOT NULL,
	"discount_minor" bigint DEFAULT 0 NOT NULL,
	"tax_minor" bigint DEFAULT 0 NOT NULL,
	"shipping_minor" bigint DEFAULT 0 NOT NULL,
	"total_minor" bigint DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'RSD' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"expires_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_checkout_sessions_status_check" CHECK ("webshop_checkout_sessions"."status" IN ('open','pending_payment','completed','expired','canceled')),
	CONSTRAINT "webshop_checkout_sessions_currency_check" CHECK ("webshop_checkout_sessions"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "webshop_checkout_sessions_totals_check" CHECK ("webshop_checkout_sessions"."subtotal_minor" >= 0 AND "webshop_checkout_sessions"."discount_minor" >= 0 AND "webshop_checkout_sessions"."tax_minor" >= 0 AND "webshop_checkout_sessions"."shipping_minor" >= 0 AND "webshop_checkout_sessions"."total_minor" >= 0)
);
--> statement-breakpoint
ALTER TABLE "webshop_cart_items" ADD CONSTRAINT "webshop_cart_items_cart_id_webshop_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."webshop_carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_cart_items" ADD CONSTRAINT "webshop_cart_items_product_id_webshop_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."webshop_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_cart_items" ADD CONSTRAINT "webshop_cart_items_variant_id_webshop_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."webshop_product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_carts" ADD CONSTRAINT "webshop_carts_webshop_id_content_id_fk" FOREIGN KEY ("webshop_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_checkout_reservations" ADD CONSTRAINT "webshop_checkout_reservations_checkout_session_id_webshop_checkout_sessions_id_fk" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."webshop_checkout_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_checkout_reservations" ADD CONSTRAINT "webshop_checkout_reservations_variant_id_webshop_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."webshop_product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_checkout_sessions" ADD CONSTRAINT "webshop_checkout_sessions_webshop_id_content_id_fk" FOREIGN KEY ("webshop_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_checkout_sessions" ADD CONSTRAINT "webshop_checkout_sessions_cart_id_webshop_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."webshop_carts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "webshop_cart_items_cart_idx" ON "webshop_cart_items" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "webshop_cart_items_product_idx" ON "webshop_cart_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "webshop_cart_items_variant_idx" ON "webshop_cart_items" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webshop_cart_items_cart_variant_unique" ON "webshop_cart_items" USING btree ("cart_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webshop_carts_active_customer_unique" ON "webshop_carts" USING btree ("webshop_id","customer_user_id") WHERE "webshop_carts"."status" = 'active' AND "webshop_carts"."customer_user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "webshop_carts_active_anonymous_unique" ON "webshop_carts" USING btree ("webshop_id","anonymous_token_hash") WHERE "webshop_carts"."status" = 'active' AND "webshop_carts"."anonymous_token_hash" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "webshop_carts_webshop_status_idx" ON "webshop_carts" USING btree ("webshop_id","status");--> statement-breakpoint
CREATE INDEX "webshop_carts_customer_idx" ON "webshop_carts" USING btree ("customer_user_id");--> statement-breakpoint
CREATE INDEX "webshop_carts_anonymous_token_idx" ON "webshop_carts" USING btree ("anonymous_token_hash");--> statement-breakpoint
CREATE INDEX "webshop_carts_expires_idx" ON "webshop_carts" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "webshop_checkout_reservations_session_variant_unique" ON "webshop_checkout_reservations" USING btree ("checkout_session_id","variant_id");--> statement-breakpoint
CREATE INDEX "webshop_checkout_reservations_session_idx" ON "webshop_checkout_reservations" USING btree ("checkout_session_id");--> statement-breakpoint
CREATE INDEX "webshop_checkout_reservations_variant_idx" ON "webshop_checkout_reservations" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "webshop_checkout_reservations_expires_idx" ON "webshop_checkout_reservations" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "webshop_checkout_sessions_confirmation_unique" ON "webshop_checkout_sessions" USING btree ("confirmation_token_hash") WHERE "webshop_checkout_sessions"."confirmation_token_hash" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "webshop_checkout_sessions_webshop_status_idx" ON "webshop_checkout_sessions" USING btree ("webshop_id","status");--> statement-breakpoint
CREATE INDEX "webshop_checkout_sessions_cart_idx" ON "webshop_checkout_sessions" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "webshop_checkout_sessions_customer_idx" ON "webshop_checkout_sessions" USING btree ("customer_user_id");--> statement-breakpoint
CREATE INDEX "webshop_checkout_sessions_expires_idx" ON "webshop_checkout_sessions" USING btree ("expires_at");