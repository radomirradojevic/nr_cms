-- Prompt 16.  A CMS records lifecycle finalization before the outbound master
-- complete call; runtime is therefore fail-safe across process crashes.
--> statement-breakpoint
ALTER TABLE "webshop_addon_entitlements"
  DROP CONSTRAINT IF EXISTS "webshop_addon_entitlements_status_check";
--> statement-breakpoint
ALTER TABLE "webshop_addon_entitlements"
  ADD CONSTRAINT "webshop_addon_entitlements_status_check"
  CHECK ("status" IN ('license_required','ready','expired','invalid','install_pending','lifecycle_finalization_pending','deactivated','transferred'));
--> statement-breakpoint
CREATE TABLE "cms_addon_lifecycle_operations" (
  "id" uuid PRIMARY KEY NOT NULL,
  "addon_key" text NOT NULL,
  "lifecycle_action" text NOT NULL,
  "receipt_role" text NOT NULL,
  "state" text NOT NULL DEFAULT 'lifecycle_finalization_pending',
  "activation_id" uuid NOT NULL,
  "entitlement_id" uuid,
  "installation_id" uuid NOT NULL,
  "canonical_domain" text NOT NULL,
  "transfer_id" uuid,
  "target_installation_id" uuid,
  "target_canonical_domain" text,
  "pre_lifecycle_version" bigint NOT NULL,
  "final_request_body_hash" text NOT NULL,
  "final_request_body" jsonb NOT NULL,
  "master_challenge_id" uuid,
  "master_proof_payload" text,
  "original_complete_accept_until" timestamp with time zone NOT NULL,
  "result_body_hash" text,
  "receipt_compact" text,
  "receipt_jti" uuid,
  "receipt_expires_at" timestamp with time zone,
  "status_observation_request_id" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "completed_at" timestamp with time zone,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "cms_addon_lifecycle_operations_action_check" CHECK ("lifecycle_action" IN ('deactivate','transfer_source_complete')),
  CONSTRAINT "cms_addon_lifecycle_operations_role_check" CHECK ("receipt_role" IN ('deactivation','transfer_source','transfer_target')),
  CONSTRAINT "cms_addon_lifecycle_operations_state_check" CHECK ("state" IN ('lifecycle_finalization_pending','committed','not_committed','restricted')),
  CONSTRAINT "cms_addon_lifecycle_operations_result_hash_check" CHECK ("result_body_hash" IS NULL OR "result_body_hash" ~ '^sha256:[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE INDEX "cms_addon_lifecycle_operations_state_idx" ON "cms_addon_lifecycle_operations" ("addon_key","state","created_at");
--> statement-breakpoint
CREATE TABLE "cms_addon_lifecycle_receipts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lifecycle_operation_id" uuid NOT NULL REFERENCES "cms_addon_lifecycle_operations"("id") ON DELETE RESTRICT,
  "receipt_role" text NOT NULL,
  "jti" uuid NOT NULL,
  "compact_hash" text NOT NULL,
  "result_body_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "received_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "cms_addon_lifecycle_receipts_operation_role_unique" UNIQUE("lifecycle_operation_id","receipt_role"),
  CONSTRAINT "cms_addon_lifecycle_receipts_jti_unique" UNIQUE("jti"),
  CONSTRAINT "cms_addon_lifecycle_receipts_role_check" CHECK ("receipt_role" IN ('deactivation','transfer_source','transfer_target'))
);
--> statement-breakpoint
CREATE TABLE "cms_addon_transfer_preparations" (
  "transfer_id" uuid PRIMARY KEY NOT NULL,
  "entitlement_id" uuid NOT NULL,
  "source_activation_id" uuid NOT NULL,
  "source_canonical_domain" text,
  "target_canonical_domain" text NOT NULL,
  "target_installation_id" uuid NOT NULL,
  "target_installation_key_fingerprint" text NOT NULL,
  "target_challenge_id" uuid NOT NULL,
  "source_approval_derivation_kid" text,
  "source_approval_code_hash" text,
  "status" text NOT NULL DEFAULT 'requested',
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "cms_addon_transfer_preparations_status_check" CHECK ("status" IN ('requested','target_proved','completed','canceled','expired')),
  CONSTRAINT "cms_addon_transfer_preparations_hash_check" CHECK ("source_approval_code_hash" IS NULL OR "source_approval_code_hash" ~ '^sha256:[a-f0-9]{64}$')
);
