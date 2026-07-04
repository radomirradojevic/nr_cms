CREATE TABLE "webshop_digital_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"file_id" uuid NOT NULL,
	"version" text DEFAULT '1' NOT NULL,
	"filename_override" text,
	"download_limit" integer,
	"download_expires_after_days" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_digital_assets_status_check" CHECK ("webshop_digital_assets"."status" IN ('active','disabled','archived')),
	CONSTRAINT "webshop_digital_assets_download_limit_check" CHECK ("webshop_digital_assets"."download_limit" IS NULL OR "webshop_digital_assets"."download_limit" >= 0),
	CONSTRAINT "webshop_digital_assets_expiry_check" CHECK ("webshop_digital_assets"."download_expires_after_days" IS NULL OR "webshop_digital_assets"."download_expires_after_days" >= 0)
);
--> statement-breakpoint
CREATE TABLE "webshop_download_entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"order_id" text NOT NULL,
	"order_item_id" text NOT NULL,
	"customer_user_id" text,
	"customer_email" text NOT NULL,
	"digital_asset_id" uuid NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"download_limit" integer,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_download_entitlements_count_check" CHECK ("webshop_download_entitlements"."download_count" >= 0),
	CONSTRAINT "webshop_download_entitlements_limit_check" CHECK ("webshop_download_entitlements"."download_limit" IS NULL OR "webshop_download_entitlements"."download_limit" >= 0)
);
--> statement-breakpoint
CREATE TABLE "webshop_download_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entitlement_id" uuid NOT NULL,
	"ip_hash" text,
	"user_agent" text,
	"downloaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "galleries" ADD COLUMN "origin" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "galleries" ADD COLUMN "origin_type" text;--> statement-breakpoint
ALTER TABLE "galleries" ADD COLUMN "origin_id" uuid;--> statement-breakpoint
ALTER TABLE "galleries" ADD COLUMN "locked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "webshop_digital_assets" ADD CONSTRAINT "webshop_digital_assets_product_id_webshop_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."webshop_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_digital_assets" ADD CONSTRAINT "webshop_digital_assets_variant_id_webshop_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."webshop_product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_digital_assets" ADD CONSTRAINT "webshop_digital_assets_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_download_entitlements" ADD CONSTRAINT "webshop_download_entitlements_digital_asset_id_webshop_digital_assets_id_fk" FOREIGN KEY ("digital_asset_id") REFERENCES "public"."webshop_digital_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_download_events" ADD CONSTRAINT "webshop_download_events_entitlement_id_webshop_download_entitlements_id_fk" FOREIGN KEY ("entitlement_id") REFERENCES "public"."webshop_download_entitlements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "webshop_digital_assets_product_idx" ON "webshop_digital_assets" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "webshop_digital_assets_variant_idx" ON "webshop_digital_assets" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "webshop_digital_assets_file_idx" ON "webshop_digital_assets" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "webshop_digital_assets_status_idx" ON "webshop_digital_assets" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "webshop_download_entitlements_token_hash_unique" ON "webshop_download_entitlements" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "webshop_download_entitlements_asset_idx" ON "webshop_download_entitlements" USING btree ("digital_asset_id");--> statement-breakpoint
CREATE INDEX "webshop_download_entitlements_customer_user_idx" ON "webshop_download_entitlements" USING btree ("customer_user_id");--> statement-breakpoint
CREATE INDEX "webshop_download_entitlements_customer_email_idx" ON "webshop_download_entitlements" USING btree ("customer_email");--> statement-breakpoint
CREATE INDEX "webshop_download_entitlements_order_idx" ON "webshop_download_entitlements" USING btree ("order_id","order_item_id");--> statement-breakpoint
CREATE INDEX "webshop_download_entitlements_expires_idx" ON "webshop_download_entitlements" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "webshop_download_events_entitlement_idx" ON "webshop_download_events" USING btree ("entitlement_id");--> statement-breakpoint
CREATE INDEX "webshop_download_events_downloaded_idx" ON "webshop_download_events" USING btree ("downloaded_at");--> statement-breakpoint
CREATE INDEX "galleries_origin_idx" ON "galleries" USING btree ("origin","origin_type","origin_id");--> statement-breakpoint
ALTER TABLE "galleries" ADD CONSTRAINT "galleries_origin_check" CHECK ("galleries"."origin" IN ('manual','webshop'));--> statement-breakpoint
ALTER TABLE "galleries" ADD CONSTRAINT "galleries_origin_metadata_check" CHECK (("galleries"."origin" = 'manual' AND "galleries"."origin_type" IS NULL AND "galleries"."origin_id" IS NULL) OR ("galleries"."origin" <> 'manual'));