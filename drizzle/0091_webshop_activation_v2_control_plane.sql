ALTER TABLE "vendor_addon_installation_identities" ADD COLUMN IF NOT EXISTS "installation_fingerprint_scheme" text NOT NULL DEFAULT 'legacy_pem_utf8_sha256_v0', ADD COLUMN IF NOT EXISTS "private_key_envelope_kid" text;
--> statement-breakpoint
ALTER TABLE "vendor_addon_installation_identities" ADD CONSTRAINT "vendor_addon_installation_identities_fingerprint_scheme_check" CHECK ("installation_fingerprint_scheme" IN ('legacy_pem_utf8_sha256_v0','ed25519_spki_der_sha256_v1'));
--> statement-breakpoint
ALTER TABLE "webshop_addon_entitlements" ADD COLUMN IF NOT EXISTS "release_id" uuid, ADD COLUMN IF NOT EXISTS "license_environment" text NOT NULL DEFAULT 'development', ADD COLUMN IF NOT EXISTS "license_valid_until" timestamp with time zone, ADD COLUMN IF NOT EXISTS "entitlement_envelope_expires_at" timestamp with time zone, ADD COLUMN IF NOT EXISTS "entitlement_snapshot_hash" text;
--> statement-breakpoint
ALTER TABLE "webshop_addon_entitlements" ADD CONSTRAINT "webshop_addon_entitlements_license_environment_check" CHECK ("license_environment" IN ('development','staging','production'));
--> statement-breakpoint
UPDATE "webshop_addon_entitlements"
  SET "status" = 'invalid',
      "last_error_code" = 'legacy_entitlement_revalidation_required'
  WHERE "status" <> 'license_required';
--> statement-breakpoint
ALTER TABLE "webshop_addon_entitlements"
  ADD CONSTRAINT "webshop_addon_entitlements_v2_managed_state_check"
  CHECK ("status" NOT IN ('ready','install_pending') OR ("signed_entitlement" IS NOT NULL AND "entitlement_envelope_expires_at" IS NOT NULL AND "next_revalidation_at" IS NOT NULL AND "entitlement_snapshot_hash" ~ '^sha256:[a-f0-9]{64}$'));
--> statement-breakpoint
ALTER TABLE "cms_addon_installations"
  ADD COLUMN IF NOT EXISTS "desired_release_id" uuid,
  ADD COLUMN IF NOT EXISTS "license_environment" text NOT NULL DEFAULT 'development',
  ADD COLUMN IF NOT EXISTS "desired_dependency_lock_sha256" text,
  ADD COLUMN IF NOT EXISTS "desired_npm_tarball_sha256" text,
  ADD COLUMN IF NOT EXISTS "desired_npm_tarball_integrity" text,
  ADD COLUMN IF NOT EXISTS "desired_embedded_manifest_sha256" text,
  ADD COLUMN IF NOT EXISTS "desired_provenance_sha256" text,
  ADD COLUMN IF NOT EXISTS "desired_sbom_sha256" text,
  ADD COLUMN IF NOT EXISTS "desired_publication_attestation_hash" text,
  ADD COLUMN IF NOT EXISTS "desired_registry_package_version_id" text,
  ADD COLUMN IF NOT EXISTS "desired_source_released_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "desired_published_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "desired_release_signing_kid" text,
  ADD COLUMN IF NOT EXISTS "desired_runtime_contract_version" text,
  ADD COLUMN IF NOT EXISTS "desired_cms_version_range" text,
  ADD COLUMN IF NOT EXISTS "desired_node_version_range" text,
  ADD COLUMN IF NOT EXISTS "desired_next_version_range" text,
  ADD COLUMN IF NOT EXISTS "desired_minimum_core_schema_version" integer,
  ADD COLUMN IF NOT EXISTS "desired_schema_version" integer,
  ADD COLUMN IF NOT EXISTS "desired_supported_addon_schema_version_min" integer,
  ADD COLUMN IF NOT EXISTS "desired_supported_addon_schema_version_max" integer,
  ADD COLUMN IF NOT EXISTS "desired_migration_bundle_hash" text,
  ADD COLUMN IF NOT EXISTS "desired_supported_license_editions" jsonb,
  ADD COLUMN IF NOT EXISTS "desired_release_channel" text,
  ADD COLUMN IF NOT EXISTS "desired_host_capability_descriptor_hash" text,
  ADD COLUMN IF NOT EXISTS "installation_deployment_epoch" bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "entitlement_snapshot_hash" text,
  ADD COLUMN IF NOT EXISTS "entitlement_lifecycle_version" bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "entitlement_envelope_expires_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "installed_release_id" uuid,
  ADD COLUMN IF NOT EXISTS "installed_dependency_lock_sha256" text,
  ADD COLUMN IF NOT EXISTS "installed_npm_tarball_sha256" text,
  ADD COLUMN IF NOT EXISTS "installed_npm_tarball_integrity" text,
  ADD COLUMN IF NOT EXISTS "installed_embedded_manifest_sha256" text,
  ADD COLUMN IF NOT EXISTS "installed_provenance_sha256" text,
  ADD COLUMN IF NOT EXISTS "installed_sbom_sha256" text,
  ADD COLUMN IF NOT EXISTS "installed_publication_attestation_hash" text,
  ADD COLUMN IF NOT EXISTS "installed_registry_package_version_id" text,
  ADD COLUMN IF NOT EXISTS "installed_source_released_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "installed_published_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "installed_release_signing_kid" text,
  ADD COLUMN IF NOT EXISTS "installed_runtime_contract_version" text,
  ADD COLUMN IF NOT EXISTS "installed_cms_version_range" text,
  ADD COLUMN IF NOT EXISTS "installed_node_version_range" text,
  ADD COLUMN IF NOT EXISTS "installed_next_version_range" text,
  ADD COLUMN IF NOT EXISTS "installed_minimum_core_schema_version" integer,
  ADD COLUMN IF NOT EXISTS "installed_schema_version" integer,
  ADD COLUMN IF NOT EXISTS "installed_supported_addon_schema_version_min" integer,
  ADD COLUMN IF NOT EXISTS "installed_supported_addon_schema_version_max" integer,
  ADD COLUMN IF NOT EXISTS "installed_migration_bundle_hash" text,
  ADD COLUMN IF NOT EXISTS "installed_migration_ledger_hash" text,
  ADD COLUMN IF NOT EXISTS "installed_supported_license_editions" jsonb,
  ADD COLUMN IF NOT EXISTS "installed_release_channel" text,
  ADD COLUMN IF NOT EXISTS "installed_host_capability_descriptor_hash" text,
  ADD COLUMN IF NOT EXISTS "installed_build_id" text,
  ADD COLUMN IF NOT EXISTS "runtime_status" text NOT NULL DEFAULT 'not_installed';
--> statement-breakpoint
ALTER TABLE "cms_addon_installations" ADD CONSTRAINT "cms_addon_installations_license_environment_check" CHECK ("license_environment" IN ('development','staging','production')), ADD CONSTRAINT "cms_addon_installations_runtime_status_check" CHECK ("runtime_status" IN ('not_installed','ready','maintenance','unavailable')), ADD CONSTRAINT "cms_addon_installations_desired_runtime_contract_check" CHECK ("desired_runtime_contract_version" IS NULL OR "desired_runtime_contract_version" = '1');
--> statement-breakpoint
ALTER TABLE "cms_addon_operations" ADD COLUMN IF NOT EXISTS "deployment_intent_key" text, ADD COLUMN IF NOT EXISTS "installation_id" uuid, ADD COLUMN IF NOT EXISTS "installation_deployment_epoch" bigint, ADD COLUMN IF NOT EXISTS "generation" integer, ADD COLUMN IF NOT EXISTS "supersedes_operation_id" uuid;
--> statement-breakpoint
ALTER TABLE "cms_addon_operations" DROP CONSTRAINT IF EXISTS "cms_addon_operations_status_check";
--> statement-breakpoint
ALTER TABLE "cms_addon_operations" ADD CONSTRAINT "cms_addon_operations_status_check" CHECK ("status" IN ('pending','running','completed','failed','superseded'));
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cms_addon_operations_intent_generation_unique" ON "cms_addon_operations" ("deployment_intent_key", "generation") WHERE "deployment_intent_key" IS NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cms_addon_deployment_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "addon_key" text NOT NULL, "installation_id" uuid NOT NULL,
  "operation_id" uuid NOT NULL REFERENCES "cms_addon_operations"("id") ON DELETE RESTRICT, "installation_deployment_epoch" bigint NOT NULL,
  "deployment_intent_key" text NOT NULL, "generation" integer NOT NULL, "operation_key" text NOT NULL, "request_auth_kid" text,
  "target_profile" text NOT NULL, "license_environment" text NOT NULL, "payload_version" integer NOT NULL DEFAULT 1,
  "payload" jsonb NOT NULL, "request_hash" text NOT NULL, "status" text NOT NULL DEFAULT 'pending', "attempt_count" integer NOT NULL DEFAULT 0,
  "max_attempts" integer NOT NULL DEFAULT 20, "next_attempt_at" timestamp with time zone NOT NULL DEFAULT now(), "lease_token" uuid,
  "lease_expires_at" timestamp with time zone, "worker_job_id" text, "last_http_status" integer, "last_error_code" text,
  "last_error_message" text, "created_at" timestamp with time zone NOT NULL DEFAULT now(), "accepted_at" timestamp with time zone,
  "completed_at" timestamp with time zone, CONSTRAINT "cms_addon_deployment_outbox_operation_key_unique" UNIQUE ("operation_key"),
  CONSTRAINT "cms_addon_deployment_outbox_environment_check" CHECK ("license_environment" IN ('development','staging','production')),
  CONSTRAINT "cms_addon_deployment_outbox_status_check" CHECK ("status" IN ('pending','sending','accepted','retry','completed','failed','superseded','dead_letter'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_addon_deployment_outbox_dispatch_idx" ON "cms_addon_deployment_outbox" ("status", "next_attempt_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cms_addon_entitlement_keysets" (
  "purpose" text PRIMARY KEY NOT NULL, "sequence" integer NOT NULL, "content_sha256" text NOT NULL, "previous_keyset_sha256" text,
  "keyset_bytes" text NOT NULL, "accepted_at" timestamp with time zone NOT NULL DEFAULT now(), "refreshed_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cms_addon_worker_callbacks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "operation_id" uuid NOT NULL REFERENCES "cms_addon_operations"("id") ON DELETE RESTRICT,
  "worker_job_id" text NOT NULL, "payload_hash" text NOT NULL, "status" text NOT NULL, "received_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "cms_addon_worker_callbacks_operation_worker_unique" UNIQUE ("operation_id", "worker_job_id")
);
