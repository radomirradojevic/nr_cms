ALTER TABLE "license_server_addon_entitlements"
  ADD COLUMN IF NOT EXISTS "release_id" uuid,
  ADD COLUMN IF NOT EXISTS "license_environment" text DEFAULT 'development' NOT NULL,
  ADD COLUMN IF NOT EXISTS "license_valid_until" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "entitlement_envelope_expires_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "entitlement_snapshot_hash" text;
--> statement-breakpoint
ALTER TABLE "license_server_addon_entitlements"
  DROP CONSTRAINT IF EXISTS "license_server_addon_entitlements_license_environment_check";
--> statement-breakpoint
ALTER TABLE "license_server_addon_entitlements"
  ADD CONSTRAINT "license_server_addon_entitlements_license_environment_check"
  CHECK ("license_environment" IN ('development','staging','production'));
--> statement-breakpoint
ALTER TABLE "license_server_addon_entitlements"
  DROP CONSTRAINT IF EXISTS "license_server_addon_entitlements_v2_managed_state_check";
--> statement-breakpoint
ALTER TABLE "license_server_addon_entitlements"
  ADD CONSTRAINT "license_server_addon_entitlements_v2_managed_state_check"
  CHECK (
    "status" NOT IN ('ready','install_pending') OR (
      "signed_entitlement" IS NOT NULL
      AND "entitlement_envelope_expires_at" IS NOT NULL
      AND "next_revalidation_at" IS NOT NULL
      AND "entitlement_snapshot_hash" ~ '^sha256:[a-f0-9]{64}$'
    )
  ) NOT VALID;
