ALTER TABLE "webshop_payment_events" DROP CONSTRAINT IF EXISTS "webshop_payment_events_provider_key_check";
--> statement-breakpoint
ALTER TABLE "webshop_payments" DROP CONSTRAINT IF EXISTS "webshop_payments_provider_key_check";
--> statement-breakpoint
UPDATE "webshop_payment_events" SET "provider_key" = 'monri' WHERE "provider_key" = 'local_card_gateway';
--> statement-breakpoint
UPDATE "webshop_payments" SET "provider_key" = 'monri' WHERE "provider_key" = 'local_card_gateway';
--> statement-breakpoint
UPDATE "webshop_addon_entitlements"
SET "metadata" = jsonb_set(
  coalesce("metadata", '{}'::jsonb),
  '{settings,payments}',
  (
    SELECT jsonb_strip_nulls(
      payments - 'localCardGateway' || jsonb_build_object(
        'enabledMethods',
        (
          SELECT jsonb_agg(
            CASE
              WHEN value = '"local_card_gateway"'::jsonb THEN '"monri"'::jsonb
              ELSE value
            END
          )
          FROM jsonb_array_elements(coalesce(payments->'enabledMethods', '[]'::jsonb))
        ),
        'monri',
        coalesce(payments->'monri', payments->'localCardGateway')
      )
    )
    FROM (SELECT coalesce("metadata"->'settings'->'payments', '{}'::jsonb) AS payments) AS current_payments
  )
)
WHERE "metadata"->'settings'->'payments' ? 'localCardGateway'
   OR "metadata"->'settings'->'payments'->'enabledMethods' @> '["local_card_gateway"]'::jsonb;
--> statement-breakpoint
ALTER TABLE "webshop_payments" ADD CONSTRAINT "webshop_payments_provider_key_check" CHECK ("webshop_payments"."provider_key" IN ('cash_on_delivery','stripe','paypal','bank_redirect','ips_qr','monri'));
--> statement-breakpoint
ALTER TABLE "webshop_payment_events" ADD CONSTRAINT "webshop_payment_events_provider_key_check" CHECK ("webshop_payment_events"."provider_key" IN ('cash_on_delivery','stripe','paypal','bank_redirect','ips_qr','monri'));
