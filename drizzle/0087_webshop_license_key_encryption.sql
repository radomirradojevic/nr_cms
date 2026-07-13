-- Expand only. This migration does not decrypt, backfill, or delete production data.
ALTER TABLE "webshop_license_keys" ADD COLUMN "encrypted_license_key" text;
--> statement-breakpoint
ALTER TABLE "webshop_license_keys" ADD COLUMN "license_key_kid" text;
--> statement-breakpoint
ALTER TABLE "webshop_license_keys" ALTER COLUMN "license_key" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "webshop_license_keys" ADD CONSTRAINT "webshop_license_keys_encrypted_or_legacy_check"
CHECK ("encrypted_license_key" IS NOT NULL OR "license_key" IS NOT NULL) NOT VALID;
--> statement-breakpoint
-- Backfill is an operator-run, checkpointed job: decrypt none, encrypt legacy license_key
-- into encrypted_license_key, verify its fingerprint, then null license_key. Contract only
-- happens after the compatibility window and a separate approved migration.
