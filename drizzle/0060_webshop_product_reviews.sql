ALTER TABLE "webshop_products" ADD COLUMN "ratings_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "webshop_products" ADD COLUMN "auto_publish_ratings" boolean DEFAULT false NOT NULL;
ALTER TABLE "webshop_products" ADD COLUMN "ratings_visibility" text DEFAULT 'public' NOT NULL;

ALTER TABLE "webshop_products" ADD CONSTRAINT "webshop_products_ratings_visibility_check" CHECK ("ratings_visibility" IN ('public','authenticated','hidden'));

CREATE TABLE "webshop_product_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"customer_user_id" text NOT NULL,
	"order_id" uuid,
	"order_item_id" uuid,
	"rating" integer NOT NULL,
	"comment" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"published_at" timestamp with time zone,
	"moderated_by" text,
	"moderated_at" timestamp with time zone,
	"ip_hash" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_product_reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
	CONSTRAINT "webshop_product_reviews_status_check" CHECK ("status" IN ('pending','published')),
	CONSTRAINT "webshop_product_reviews_comment_length_check" CHECK ("comment" IS NULL OR char_length("comment") BETWEEN 1 AND 5000)
);

ALTER TABLE "webshop_product_reviews" ADD CONSTRAINT "webshop_product_reviews_product_id_webshop_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."webshop_products"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "webshop_product_reviews" ADD CONSTRAINT "webshop_product_reviews_order_id_webshop_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."webshop_orders"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "webshop_product_reviews" ADD CONSTRAINT "webshop_product_reviews_order_item_id_webshop_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."webshop_order_items"("id") ON DELETE set null ON UPDATE no action;

CREATE UNIQUE INDEX "webshop_product_reviews_customer_unique" ON "webshop_product_reviews" USING btree ("product_id","customer_user_id");
CREATE INDEX "webshop_product_reviews_product_status_created_idx" ON "webshop_product_reviews" USING btree ("product_id","status","created_at");
CREATE INDEX "webshop_product_reviews_customer_idx" ON "webshop_product_reviews" USING btree ("customer_user_id");
CREATE INDEX "webshop_product_reviews_order_idx" ON "webshop_product_reviews" USING btree ("order_id","order_item_id");
CREATE INDEX "webshop_product_reviews_ip_hash_idx" ON "webshop_product_reviews" USING btree ("ip_hash");
