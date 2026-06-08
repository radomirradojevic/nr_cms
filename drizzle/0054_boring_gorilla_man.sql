CREATE TABLE "webshop_coupon_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_user_id" text,
	"customer_email" text NOT NULL,
	"discount_minor" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_coupon_redemptions_discount_check" CHECK ("webshop_coupon_redemptions"."discount_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "webshop_coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webshop_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"discount_type" text NOT NULL,
	"discount_value" integer DEFAULT 0 NOT NULL,
	"currency" text,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"usage_limit" integer,
	"usage_limit_per_customer" integer,
	"minimum_subtotal_minor" bigint DEFAULT 0 NOT NULL,
	"applies_to" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_coupons_status_check" CHECK ("webshop_coupons"."status" IN ('draft','active','paused','archived')),
	CONSTRAINT "webshop_coupons_discount_type_check" CHECK ("webshop_coupons"."discount_type" IN ('percent','fixed_amount','free_shipping')),
	CONSTRAINT "webshop_coupons_discount_value_check" CHECK ("webshop_coupons"."discount_value" >= 0),
	CONSTRAINT "webshop_coupons_percent_value_check" CHECK ("webshop_coupons"."discount_type" <> 'percent' OR "webshop_coupons"."discount_value" <= 100),
	CONSTRAINT "webshop_coupons_currency_check" CHECK ("webshop_coupons"."currency" IS NULL OR "webshop_coupons"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "webshop_coupons_dates_check" CHECK ("webshop_coupons"."ends_at" IS NULL OR "webshop_coupons"."starts_at" IS NULL OR "webshop_coupons"."ends_at" > "webshop_coupons"."starts_at"),
	CONSTRAINT "webshop_coupons_usage_limit_check" CHECK ("webshop_coupons"."usage_limit" IS NULL OR "webshop_coupons"."usage_limit" >= 0),
	CONSTRAINT "webshop_coupons_customer_usage_limit_check" CHECK ("webshop_coupons"."usage_limit_per_customer" IS NULL OR "webshop_coupons"."usage_limit_per_customer" >= 0),
	CONSTRAINT "webshop_coupons_minimum_subtotal_check" CHECK ("webshop_coupons"."minimum_subtotal_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "webshop_related_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webshop_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"related_product_id" uuid NOT NULL,
	"relationship_type" text DEFAULT 'related' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_related_products_type_check" CHECK ("webshop_related_products"."relationship_type" IN ('related','upsell','cross_sell','replacement','accessory')),
	CONSTRAINT "webshop_related_products_position_check" CHECK ("webshop_related_products"."position" >= 0),
	CONSTRAINT "webshop_related_products_self_check" CHECK ("webshop_related_products"."product_id" <> "webshop_related_products"."related_product_id")
);
--> statement-breakpoint
CREATE TABLE "webshop_wishlist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wishlist_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webshop_wishlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webshop_id" uuid NOT NULL,
	"customer_user_id" text NOT NULL,
	"name" text DEFAULT 'Wishlist' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "webshop_carts" ADD COLUMN "coupon_code" text;--> statement-breakpoint
ALTER TABLE "webshop_orders" ADD COLUMN "discount_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "webshop_coupon_redemptions" ADD CONSTRAINT "webshop_coupon_redemptions_coupon_id_webshop_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."webshop_coupons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_coupon_redemptions" ADD CONSTRAINT "webshop_coupon_redemptions_order_id_webshop_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."webshop_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_coupons" ADD CONSTRAINT "webshop_coupons_webshop_id_content_id_fk" FOREIGN KEY ("webshop_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_related_products" ADD CONSTRAINT "webshop_related_products_webshop_id_content_id_fk" FOREIGN KEY ("webshop_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_related_products" ADD CONSTRAINT "webshop_related_products_product_id_webshop_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."webshop_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_related_products" ADD CONSTRAINT "webshop_related_products_related_product_id_webshop_products_id_fk" FOREIGN KEY ("related_product_id") REFERENCES "public"."webshop_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_wishlist_items" ADD CONSTRAINT "webshop_wishlist_items_wishlist_id_webshop_wishlists_id_fk" FOREIGN KEY ("wishlist_id") REFERENCES "public"."webshop_wishlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_wishlist_items" ADD CONSTRAINT "webshop_wishlist_items_product_id_webshop_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."webshop_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_wishlist_items" ADD CONSTRAINT "webshop_wishlist_items_variant_id_webshop_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."webshop_product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_wishlists" ADD CONSTRAINT "webshop_wishlists_webshop_id_content_id_fk" FOREIGN KEY ("webshop_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "webshop_coupon_redemptions_coupon_order_unique" ON "webshop_coupon_redemptions" USING btree ("coupon_id","order_id");--> statement-breakpoint
CREATE INDEX "webshop_coupon_redemptions_coupon_idx" ON "webshop_coupon_redemptions" USING btree ("coupon_id");--> statement-breakpoint
CREATE INDEX "webshop_coupon_redemptions_order_idx" ON "webshop_coupon_redemptions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "webshop_coupon_redemptions_customer_user_idx" ON "webshop_coupon_redemptions" USING btree ("customer_user_id");--> statement-breakpoint
CREATE INDEX "webshop_coupon_redemptions_customer_email_idx" ON "webshop_coupon_redemptions" USING btree ("customer_email");--> statement-breakpoint
CREATE UNIQUE INDEX "webshop_coupons_webshop_code_unique" ON "webshop_coupons" USING btree ("webshop_id","code");--> statement-breakpoint
CREATE INDEX "webshop_coupons_webshop_status_idx" ON "webshop_coupons" USING btree ("webshop_id","status");--> statement-breakpoint
CREATE INDEX "webshop_coupons_code_idx" ON "webshop_coupons" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "webshop_related_products_unique" ON "webshop_related_products" USING btree ("webshop_id","product_id","related_product_id","relationship_type");--> statement-breakpoint
CREATE INDEX "webshop_related_products_product_type_idx" ON "webshop_related_products" USING btree ("product_id","relationship_type","position");--> statement-breakpoint
CREATE INDEX "webshop_related_products_related_idx" ON "webshop_related_products" USING btree ("related_product_id");--> statement-breakpoint
CREATE INDEX "webshop_related_products_webshop_idx" ON "webshop_related_products" USING btree ("webshop_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webshop_wishlist_items_product_unique" ON "webshop_wishlist_items" USING btree ("wishlist_id","product_id") WHERE "webshop_wishlist_items"."variant_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "webshop_wishlist_items_variant_unique" ON "webshop_wishlist_items" USING btree ("wishlist_id","product_id","variant_id") WHERE "webshop_wishlist_items"."variant_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "webshop_wishlist_items_wishlist_idx" ON "webshop_wishlist_items" USING btree ("wishlist_id");--> statement-breakpoint
CREATE INDEX "webshop_wishlist_items_product_idx" ON "webshop_wishlist_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "webshop_wishlist_items_variant_idx" ON "webshop_wishlist_items" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webshop_wishlists_customer_unique" ON "webshop_wishlists" USING btree ("webshop_id","customer_user_id");--> statement-breakpoint
CREATE INDEX "webshop_wishlists_webshop_idx" ON "webshop_wishlists" USING btree ("webshop_id");--> statement-breakpoint
CREATE INDEX "webshop_wishlists_customer_idx" ON "webshop_wishlists" USING btree ("customer_user_id");