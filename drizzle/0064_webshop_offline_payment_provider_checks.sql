ALTER TABLE "webshop_payments" DROP CONSTRAINT IF EXISTS "webshop_payments_provider_key_check";
--> statement-breakpoint
ALTER TABLE "webshop_payments" ADD CONSTRAINT "webshop_payments_provider_key_check" CHECK ("webshop_payments"."provider_key" IN ('cash_on_delivery','stripe','paypal','bank_redirect','ips_qr','local_card_gateway'));
--> statement-breakpoint
ALTER TABLE "webshop_payment_events" DROP CONSTRAINT IF EXISTS "webshop_payment_events_provider_key_check";
--> statement-breakpoint
ALTER TABLE "webshop_payment_events" ADD CONSTRAINT "webshop_payment_events_provider_key_check" CHECK ("webshop_payment_events"."provider_key" IN ('cash_on_delivery','stripe','paypal','bank_redirect','ips_qr','local_card_gateway'));
