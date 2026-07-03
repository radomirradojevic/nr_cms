ALTER TABLE "webshop_license_keys" ADD COLUMN "checkout_session_id" uuid;--> statement-breakpoint
ALTER TABLE "webshop_license_keys" ADD COLUMN "reserved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "webshop_license_keys" ADD COLUMN "reservation_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "webshop_license_keys" DROP CONSTRAINT "webshop_license_keys_status_check";--> statement-breakpoint
ALTER TABLE "webshop_license_keys" ADD CONSTRAINT "webshop_license_keys_status_check" CHECK ("webshop_license_keys"."status" IN ('available','reserved','assigned','revoked'));--> statement-breakpoint
ALTER TABLE "webshop_license_keys" ADD CONSTRAINT "webshop_license_keys_reservation_check" CHECK (("webshop_license_keys"."status" <> 'reserved') OR ("webshop_license_keys"."checkout_session_id" IS NOT NULL AND "webshop_license_keys"."reserved_at" IS NOT NULL AND ("webshop_license_keys"."reservation_expires_at" IS NOT NULL OR ("webshop_license_keys"."order_id" IS NOT NULL AND "webshop_license_keys"."order_item_id" IS NOT NULL))));--> statement-breakpoint
ALTER TABLE "webshop_license_keys" ADD CONSTRAINT "webshop_license_keys_checkout_session_id_webshop_checkout_sessions_id_fk" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."webshop_checkout_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "webshop_license_keys_checkout_session_idx" ON "webshop_license_keys" USING btree ("checkout_session_id","status");--> statement-breakpoint
CREATE INDEX "webshop_license_keys_reservation_expires_idx" ON "webshop_license_keys" USING btree ("reservation_expires_at");
