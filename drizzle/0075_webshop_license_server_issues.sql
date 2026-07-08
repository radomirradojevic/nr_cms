CREATE TABLE "webshop_license_server_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"license_server_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"product_id" uuid,
	"variant_id" uuid,
	"sku" text NOT NULL,
	"external_product_type_id" text NOT NULL,
	"domain" text,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"license_key" text,
	"license_key_fingerprint" text,
	"expires_at" timestamp with time zone,
	"issued_at" timestamp with time zone,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"last_error" text,
	"request_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"response_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_license_server_issues_order_item_unique" UNIQUE("order_item_id"),
	CONSTRAINT "webshop_license_server_issues_idempotency_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "webshop_license_server_issues_status_check" CHECK ("webshop_license_server_issues"."status" IN ('pending','issuing','issued','failed','canceled','revoked')),
	CONSTRAINT "webshop_license_server_issues_attempt_count_check" CHECK ("webshop_license_server_issues"."attempt_count" >= 0),
	CONSTRAINT "webshop_license_server_issues_sku_length_check" CHECK (char_length("webshop_license_server_issues"."sku") BETWEEN 1 AND 160),
	CONSTRAINT "webshop_license_server_issues_product_type_length_check" CHECK (char_length("webshop_license_server_issues"."external_product_type_id") BETWEEN 1 AND 160),
	CONSTRAINT "webshop_license_server_issues_domain_length_check" CHECK ("webshop_license_server_issues"."domain" IS NULL OR char_length("webshop_license_server_issues"."domain") <= 255),
	CONSTRAINT "webshop_license_server_issues_idempotency_length_check" CHECK (char_length("webshop_license_server_issues"."idempotency_key") BETWEEN 1 AND 255),
	CONSTRAINT "webshop_license_server_issues_key_fingerprint_length_check" CHECK ("webshop_license_server_issues"."license_key_fingerprint" IS NULL OR char_length("webshop_license_server_issues"."license_key_fingerprint") = 64)
);
--> statement-breakpoint
ALTER TABLE "webshop_license_server_issues" ADD CONSTRAINT "webshop_license_server_issues_license_server_id_webshop_license_servers_id_fk" FOREIGN KEY ("license_server_id") REFERENCES "public"."webshop_license_servers"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "webshop_license_server_issues" ADD CONSTRAINT "webshop_license_server_issues_order_id_webshop_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."webshop_orders"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "webshop_license_server_issues" ADD CONSTRAINT "webshop_license_server_issues_order_item_id_webshop_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."webshop_order_items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "webshop_license_server_issues" ADD CONSTRAINT "webshop_license_server_issues_product_id_webshop_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."webshop_products"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "webshop_license_server_issues" ADD CONSTRAINT "webshop_license_server_issues_variant_id_webshop_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."webshop_product_variants"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "webshop_license_server_issues_key_fingerprint_unique" ON "webshop_license_server_issues" USING btree ("license_key_fingerprint") WHERE "webshop_license_server_issues"."license_key_fingerprint" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "webshop_license_server_issues_status_created_idx" ON "webshop_license_server_issues" USING btree ("status","created_at");
--> statement-breakpoint
CREATE INDEX "webshop_license_server_issues_server_status_idx" ON "webshop_license_server_issues" USING btree ("license_server_id","status");
--> statement-breakpoint
CREATE INDEX "webshop_license_server_issues_order_idx" ON "webshop_license_server_issues" USING btree ("order_id","order_item_id");
