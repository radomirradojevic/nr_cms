CREATE TABLE IF NOT EXISTS "customer_issuer_identity" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "singleton_key" text NOT NULL DEFAULT 'default', "issuer_ref" text NOT NULL, "display_name" text NOT NULL DEFAULT 'Customer License Issuer', "key_version" integer NOT NULL DEFAULT 1, "active_signing_kid" text NOT NULL, "public_key_set" jsonb NOT NULL DEFAULT '[]'::jsonb, "created_at" timestamp with time zone NOT NULL DEFAULT now(), "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "customer_issuer_identity_singleton_unique" UNIQUE("singleton_key"), CONSTRAINT "customer_issuer_identity_ref_unique" UNIQUE("issuer_ref")
);
CREATE TABLE IF NOT EXISTS "customer_issuer_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "issuer_id" uuid NOT NULL REFERENCES "customer_issuer_identity"("id") ON DELETE cascade, "key_id" text NOT NULL, "public_key" text NOT NULL, "private_key_encrypted" text NOT NULL, "status" text NOT NULL DEFAULT 'active', "not_before" timestamp with time zone NOT NULL DEFAULT now(), "signing_stops_at" timestamp with time zone, "verification_stops_at" timestamp with time zone, "created_at" timestamp with time zone NOT NULL DEFAULT now(), "revoked_at" timestamp with time zone,
  CONSTRAINT "customer_issuer_keys_kid_unique" UNIQUE("key_id"), CONSTRAINT "customer_issuer_keys_status_check" CHECK ("status" IN ('prepublished','active','verification_only','retired','revoked'))
);
CREATE INDEX IF NOT EXISTS "customer_issuer_keys_issuer_status_idx" ON "customer_issuer_keys" ("issuer_id", "status");
CREATE TABLE IF NOT EXISTS "customer_issuer_api_client_scopes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "api_client_id" uuid NOT NULL REFERENCES "license_server_api_clients"("id") ON DELETE cascade, "product_type_id" uuid REFERENCES "license_server_product_types"("id") ON DELETE cascade, "action" text NOT NULL, "environment" text NOT NULL, "created_at" timestamp with time zone NOT NULL DEFAULT now(), "revoked_at" timestamp with time zone,
  CONSTRAINT "customer_issuer_api_client_scopes_unique" UNIQUE("api_client_id", "product_type_id", "action", "environment"), CONSTRAINT "customer_issuer_api_client_scopes_action_check" CHECK ("action" IN ('catalog','issue','validate','renew','suspend','revoke')), CONSTRAINT "customer_issuer_api_client_scopes_environment_check" CHECK ("environment" IN ('development','staging','production'))
);
CREATE INDEX IF NOT EXISTS "customer_issuer_api_client_scopes_lookup_idx" ON "customer_issuer_api_client_scopes" ("api_client_id", "action", "environment");
CREATE TABLE IF NOT EXISTS "customer_issuer_issue_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "source_addon" text NOT NULL, "operation_key" text NOT NULL, "product_type_id" uuid NOT NULL REFERENCES "license_server_product_types"("id") ON DELETE restrict, "sku" text NOT NULL, "payload" jsonb NOT NULL DEFAULT '{}'::jsonb, "status" text NOT NULL DEFAULT 'pending', "license_id" uuid REFERENCES "license_server_licenses"("id") ON DELETE set null, "created_at" timestamp with time zone NOT NULL DEFAULT now(), "completed_at" timestamp with time zone,
  CONSTRAINT "customer_issuer_issue_outbox_operation_unique" UNIQUE("source_addon", "operation_key"), CONSTRAINT "customer_issuer_issue_outbox_status_check" CHECK ("status" IN ('pending','processing','completed','failed'))
);
CREATE INDEX IF NOT EXISTS "customer_issuer_issue_outbox_status_idx" ON "customer_issuer_issue_outbox" ("status", "created_at");
