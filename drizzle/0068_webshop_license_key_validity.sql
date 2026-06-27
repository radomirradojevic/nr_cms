ALTER TABLE "webshop_license_keys" ADD COLUMN "validity_days" integer;
--> statement-breakpoint
ALTER TABLE "webshop_license_keys" ADD COLUMN "expires_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "webshop_license_keys" ADD CONSTRAINT "webshop_license_keys_validity_days_check" CHECK ("webshop_license_keys"."validity_days" IS NULL OR "webshop_license_keys"."validity_days" > 0);
--> statement-breakpoint
CREATE INDEX "webshop_license_keys_expires_idx" ON "webshop_license_keys" USING btree ("expires_at");
