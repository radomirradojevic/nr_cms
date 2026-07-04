CREATE TABLE "webshop_product_attribute_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"attribute_id" uuid NOT NULL,
	"value_text" text,
	"value_number" bigint,
	"value_boolean" boolean,
	"value_date" date,
	"value_json" jsonb,
	"option_id" text,
	CONSTRAINT "webshop_product_attribute_values_unique" UNIQUE NULLS NOT DISTINCT("product_id","attribute_id","option_id")
);
--> statement-breakpoint
CREATE TABLE "webshop_product_categories" (
	"product_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "webshop_product_categories_pk" PRIMARY KEY("product_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "webshop_product_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"role" text DEFAULT 'gallery' NOT NULL,
	"alt" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_product_media_product_file_unique" UNIQUE("product_id","file_id"),
	CONSTRAINT "webshop_product_media_role_check" CHECK ("webshop_product_media"."role" IN ('cover','gallery')),
	CONSTRAINT "webshop_product_media_position_check" CHECK ("webshop_product_media"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "webshop_product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"price_minor" bigint,
	"compare_at_price_minor" bigint,
	"currency" text DEFAULT 'RSD' NOT NULL,
	"option_values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"inventory_tracked" boolean DEFAULT false NOT NULL,
	"stock_on_hand" integer DEFAULT 0 NOT NULL,
	"stock_reserved" integer DEFAULT 0 NOT NULL,
	"stock_policy" text DEFAULT 'deny' NOT NULL,
	"low_stock_threshold" integer,
	"weight_grams" integer,
	"dimensions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_product_variants_sku_unique" UNIQUE("sku"),
	CONSTRAINT "webshop_product_variants_status_check" CHECK ("webshop_product_variants"."status" IN ('active','hidden','archived')),
	CONSTRAINT "webshop_product_variants_currency_check" CHECK ("webshop_product_variants"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "webshop_product_variants_price_check" CHECK ("webshop_product_variants"."price_minor" IS NULL OR "webshop_product_variants"."price_minor" >= 0),
	CONSTRAINT "webshop_product_variants_compare_price_check" CHECK ("webshop_product_variants"."compare_at_price_minor" IS NULL OR "webshop_product_variants"."compare_at_price_minor" >= 0),
	CONSTRAINT "webshop_product_variants_stock_check" CHECK ("webshop_product_variants"."stock_on_hand" >= 0 AND "webshop_product_variants"."stock_reserved" >= 0),
	CONSTRAINT "webshop_product_variants_stock_policy_check" CHECK ("webshop_product_variants"."stock_policy" IN ('deny','allow_backorder','preorder')),
	CONSTRAINT "webshop_product_variants_low_stock_threshold_check" CHECK ("webshop_product_variants"."low_stock_threshold" IS NULL OR "webshop_product_variants"."low_stock_threshold" >= 0),
	CONSTRAINT "webshop_product_variants_weight_check" CHECK ("webshop_product_variants"."weight_grams" IS NULL OR "webshop_product_variants"."weight_grams" >= 0)
);
--> statement-breakpoint
CREATE TABLE "webshop_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_type" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"description_json" jsonb,
	"excerpt" text,
	"meta_title" text,
	"meta_description" text,
	"canonical_url" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"primary_category_id" uuid,
	"cover_image_file_id" uuid,
	"gallery_id" uuid,
	"base_price_minor" bigint DEFAULT 0 NOT NULL,
	"compare_at_price_minor" bigint,
	"currency" text DEFAULT 'RSD' NOT NULL,
	"tax_category" text,
	"variant_options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"requires_shipping" boolean DEFAULT false NOT NULL,
	"inventory_tracked" boolean DEFAULT false NOT NULL,
	"stock_policy" text DEFAULT 'deny' NOT NULL,
	"low_stock_threshold" integer,
	"physical_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"digital_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"service_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "webshop_products_type_check" CHECK ("webshop_products"."product_type" IN ('physical','digital','service')),
	CONSTRAINT "webshop_products_status_check" CHECK ("webshop_products"."status" IN ('draft','active','hidden','archived')),
	CONSTRAINT "webshop_products_currency_check" CHECK ("webshop_products"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "webshop_products_base_price_check" CHECK ("webshop_products"."base_price_minor" >= 0),
	CONSTRAINT "webshop_products_compare_price_check" CHECK ("webshop_products"."compare_at_price_minor" IS NULL OR "webshop_products"."compare_at_price_minor" >= 0),
	CONSTRAINT "webshop_products_stock_policy_check" CHECK ("webshop_products"."stock_policy" IN ('deny','allow_backorder','preorder')),
	CONSTRAINT "webshop_products_low_stock_threshold_check" CHECK ("webshop_products"."low_stock_threshold" IS NULL OR "webshop_products"."low_stock_threshold" >= 0)
);
--> statement-breakpoint
ALTER TABLE "webshop_product_attribute_values" ADD CONSTRAINT "webshop_product_attribute_values_product_id_webshop_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."webshop_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_product_attribute_values" ADD CONSTRAINT "webshop_product_attribute_values_attribute_id_webshop_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."webshop_attributes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_product_categories" ADD CONSTRAINT "webshop_product_categories_product_id_webshop_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."webshop_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_product_categories" ADD CONSTRAINT "webshop_product_categories_category_id_webshop_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."webshop_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_product_media" ADD CONSTRAINT "webshop_product_media_product_id_webshop_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."webshop_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_product_media" ADD CONSTRAINT "webshop_product_media_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_product_variants" ADD CONSTRAINT "webshop_product_variants_product_id_webshop_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."webshop_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_products" ADD CONSTRAINT "webshop_products_primary_category_id_webshop_categories_id_fk" FOREIGN KEY ("primary_category_id") REFERENCES "public"."webshop_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_products" ADD CONSTRAINT "webshop_products_cover_image_file_id_files_id_fk" FOREIGN KEY ("cover_image_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_products" ADD CONSTRAINT "webshop_products_gallery_id_galleries_id_fk" FOREIGN KEY ("gallery_id") REFERENCES "public"."galleries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "webshop_product_attribute_values_product_idx" ON "webshop_product_attribute_values" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "webshop_product_attribute_values_attribute_idx" ON "webshop_product_attribute_values" USING btree ("attribute_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webshop_product_categories_primary_unique" ON "webshop_product_categories" USING btree ("product_id") WHERE "webshop_product_categories"."is_primary" = true;--> statement-breakpoint
CREATE INDEX "webshop_product_categories_category_idx" ON "webshop_product_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "webshop_product_media_product_position_idx" ON "webshop_product_media" USING btree ("product_id","position");--> statement-breakpoint
CREATE INDEX "webshop_product_media_file_idx" ON "webshop_product_media" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "webshop_product_variants_product_position_idx" ON "webshop_product_variants" USING btree ("product_id","position");--> statement-breakpoint
CREATE INDEX "webshop_product_variants_status_idx" ON "webshop_product_variants" USING btree ("status");--> statement-breakpoint
CREATE INDEX "webshop_products_status_updated_idx" ON "webshop_products" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "webshop_products_type_idx" ON "webshop_products" USING btree ("product_type");--> statement-breakpoint
CREATE INDEX "webshop_products_primary_category_idx" ON "webshop_products" USING btree ("primary_category_id");--> statement-breakpoint
CREATE INDEX "webshop_products_price_idx" ON "webshop_products" USING btree ("base_price_minor");--> statement-breakpoint
CREATE INDEX "webshop_products_cover_image_idx" ON "webshop_products" USING btree ("cover_image_file_id");--> statement-breakpoint
CREATE INDEX "webshop_products_gallery_idx" ON "webshop_products" USING btree ("gallery_id");