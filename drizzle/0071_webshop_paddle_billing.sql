ALTER TABLE "webshop_products" ADD COLUMN "paddle_price_id" text;
--> statement-breakpoint
ALTER TABLE "webshop_product_variants" ADD COLUMN "paddle_price_id" text;
--> statement-breakpoint
ALTER TABLE "webshop_products" ADD CONSTRAINT "webshop_products_paddle_price_id_check" CHECK ("webshop_products"."paddle_price_id" IS NULL OR "webshop_products"."paddle_price_id" ~ '^pri_[a-z0-9]{26}$');
--> statement-breakpoint
ALTER TABLE "webshop_product_variants" ADD CONSTRAINT "webshop_product_variants_paddle_price_id_check" CHECK ("webshop_product_variants"."paddle_price_id" IS NULL OR "webshop_product_variants"."paddle_price_id" ~ '^pri_[a-z0-9]{26}$');
--> statement-breakpoint
CREATE INDEX "webshop_products_paddle_price_idx" ON "webshop_products" USING btree ("paddle_price_id");
--> statement-breakpoint
CREATE INDEX "webshop_product_variants_paddle_price_idx" ON "webshop_product_variants" USING btree ("paddle_price_id");
--> statement-breakpoint
ALTER TABLE "webshop_payment_events" DROP CONSTRAINT IF EXISTS "webshop_payment_events_provider_key_check";
--> statement-breakpoint
ALTER TABLE "webshop_payments" DROP CONSTRAINT IF EXISTS "webshop_payments_provider_key_check";
--> statement-breakpoint
ALTER TABLE "webshop_payments" ADD CONSTRAINT "webshop_payments_provider_key_check" CHECK ("webshop_payments"."provider_key" IN ('cash_on_delivery','stripe','paypal','bank_redirect','ips_qr','monri','paddle'));
--> statement-breakpoint
ALTER TABLE "webshop_payment_events" ADD CONSTRAINT "webshop_payment_events_provider_key_check" CHECK ("webshop_payment_events"."provider_key" IN ('cash_on_delivery','stripe','paypal','bank_redirect','ips_qr','monri','paddle'));
