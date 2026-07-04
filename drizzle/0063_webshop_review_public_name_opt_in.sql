ALTER TABLE "webshop_product_reviews"
  ADD COLUMN "show_customer_name" boolean DEFAULT false NOT NULL;

ALTER TABLE "webshop_product_reviews"
  ADD COLUMN "customer_display_name_snapshot" text;
