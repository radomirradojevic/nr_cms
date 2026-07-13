CREATE TABLE IF NOT EXISTS "vendor_addon_installation_identities" (
  "id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
  "installation_id" uuid NOT NULL,
  "installation_key_id" text NOT NULL,
  "installation_public_key" text NOT NULL,
  "installation_private_key_encrypted" text NOT NULL,
  "installation_key_fingerprint" text NOT NULL,
  "key_version" integer NOT NULL DEFAULT 1,
  "deployment_mode" text NOT NULL,
  "canonical_domain" text NOT NULL,
  "staging_domains" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "vendor_addon_installation_identities_singleton_check" CHECK ("id" = 1),
  CONSTRAINT "vendor_addon_installation_identities_mode_check" CHECK ("deployment_mode" IN ('vercel','self_hosted','other')),
  CONSTRAINT "vendor_addon_installation_identities_installation_id_unique" UNIQUE ("installation_id"),
  CONSTRAINT "vendor_addon_installation_identities_key_id_unique" UNIQUE ("installation_key_id")
);

ALTER TABLE "webshop_addon_entitlements"
  ADD COLUMN IF NOT EXISTS "signed_entitlement" text,
  ADD COLUMN IF NOT EXISTS "signing_kid" text,
  ADD COLUMN IF NOT EXISTS "verified_claims" jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "last_verified_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "last_revalidation_attempt_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "last_revalidation_success_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "next_revalidation_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "grace_ends_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "last_central_status" text,
  ADD COLUMN IF NOT EXISTS "last_error_code" text,
  ADD COLUMN IF NOT EXISTS "lifecycle_version" bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "installation_id" uuid,
  ADD COLUMN IF NOT EXISTS "installation_key_fingerprint" text;

ALTER TABLE "license_server_addon_entitlements"
  ADD COLUMN IF NOT EXISTS "signed_entitlement" text,
  ADD COLUMN IF NOT EXISTS "signing_kid" text,
  ADD COLUMN IF NOT EXISTS "verified_claims" jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "last_verified_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "last_revalidation_attempt_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "last_revalidation_success_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "next_revalidation_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "grace_ends_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "last_central_status" text,
  ADD COLUMN IF NOT EXISTS "last_error_code" text,
  ADD COLUMN IF NOT EXISTS "lifecycle_version" bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "installation_id" uuid,
  ADD COLUMN IF NOT EXISTS "installation_key_fingerprint" text;
