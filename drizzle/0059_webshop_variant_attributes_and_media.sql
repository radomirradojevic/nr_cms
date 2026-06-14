ALTER TABLE "webshop_category_attributes" ADD COLUMN "scope" text DEFAULT 'product' NOT NULL;

ALTER TABLE "webshop_product_media" ADD COLUMN "variant_id" uuid;

CREATE TABLE "webshop_product_variant_attribute_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid NOT NULL,
	"attribute_id" uuid NOT NULL,
	"value_text" text,
	"value_number" bigint,
	"value_boolean" boolean,
	"value_date" date,
	"value_json" jsonb,
	"option_id" text,
	CONSTRAINT "webshop_product_variant_attribute_values_unique" UNIQUE NULLS NOT DISTINCT ("variant_id","attribute_id","option_id")
);

ALTER TABLE "webshop_product_media" ADD CONSTRAINT "webshop_product_media_variant_id_webshop_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."webshop_product_variants"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "webshop_product_variant_attribute_values" ADD CONSTRAINT "webshop_product_variant_attribute_values_variant_id_webshop_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."webshop_product_variants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "webshop_product_variant_attribute_values" ADD CONSTRAINT "webshop_product_variant_attribute_values_attribute_id_webshop_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."webshop_attributes"("id") ON DELETE restrict ON UPDATE no action;

ALTER TABLE "webshop_category_attributes" ADD CONSTRAINT "webshop_category_attributes_scope_check" CHECK ("scope" IN ('product','variant'));

ALTER TABLE "webshop_product_media" DROP CONSTRAINT IF EXISTS "webshop_product_media_product_file_unique";
ALTER TABLE "webshop_product_media" ADD CONSTRAINT "webshop_product_media_product_file_variant_unique" UNIQUE NULLS NOT DISTINCT ("product_id","file_id","variant_id");

CREATE INDEX "webshop_category_attributes_scope_idx" ON "webshop_category_attributes" USING btree ("scope");
CREATE INDEX "webshop_product_media_variant_idx" ON "webshop_product_media" USING btree ("variant_id");
CREATE INDEX "webshop_product_variant_attribute_values_variant_idx" ON "webshop_product_variant_attribute_values" USING btree ("variant_id");
CREATE INDEX "webshop_product_variant_attribute_values_attribute_idx" ON "webshop_product_variant_attribute_values" USING btree ("attribute_id");
