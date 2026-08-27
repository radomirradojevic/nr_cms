ALTER TABLE "webshop_purchase_intent_domain_proofs"
  ADD COLUMN IF NOT EXISTS "purpose" text NOT NULL DEFAULT 'nr_license_domain_control';
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'webshop_purchase_intent_domain_proofs_purpose_check'
  ) THEN
    ALTER TABLE "webshop_purchase_intent_domain_proofs"
      ADD CONSTRAINT "webshop_purchase_intent_domain_proofs_purpose_check"
      CHECK ("purpose" IN ('nr_license_domain_control','nr_addon_lifecycle_transfer_target'));
  END IF;
END $$;
