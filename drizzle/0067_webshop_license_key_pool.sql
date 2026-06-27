CREATE TABLE "webshop_license_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"license_key" text NOT NULL,
	"license_key_fingerprint" text NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"order_id" uuid,
	"order_item_id" uuid,
	"customer_email" text,
	"assigned_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"notes" text,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_license_keys_status_check" CHECK ("webshop_license_keys"."status" IN ('available','assigned','revoked')),
	CONSTRAINT "webshop_license_keys_assignment_check" CHECK (("webshop_license_keys"."status" <> 'assigned') OR ("webshop_license_keys"."order_id" IS NOT NULL AND "webshop_license_keys"."order_item_id" IS NOT NULL AND "webshop_license_keys"."assigned_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "webshop_license_keys" ADD CONSTRAINT "webshop_license_keys_product_id_webshop_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."webshop_products"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "webshop_license_keys" ADD CONSTRAINT "webshop_license_keys_variant_id_webshop_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."webshop_product_variants"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "webshop_license_keys" ADD CONSTRAINT "webshop_license_keys_order_id_webshop_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."webshop_orders"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "webshop_license_keys" ADD CONSTRAINT "webshop_license_keys_order_item_id_webshop_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."webshop_order_items"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "webshop_license_keys_fingerprint_unique" ON "webshop_license_keys" USING btree ("license_key_fingerprint");
--> statement-breakpoint
CREATE UNIQUE INDEX "webshop_license_keys_order_item_unique" ON "webshop_license_keys" USING btree ("order_item_id") WHERE "webshop_license_keys"."order_item_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "webshop_license_keys_product_status_idx" ON "webshop_license_keys" USING btree ("product_id","status","created_at");
--> statement-breakpoint
CREATE INDEX "webshop_license_keys_variant_status_idx" ON "webshop_license_keys" USING btree ("variant_id","status");
--> statement-breakpoint
CREATE INDEX "webshop_license_keys_order_idx" ON "webshop_license_keys" USING btree ("order_id","order_item_id");
