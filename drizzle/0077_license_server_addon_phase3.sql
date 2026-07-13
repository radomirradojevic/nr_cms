ALTER TABLE "license_server_product_types" ADD COLUMN "public_key" text;
--> statement-breakpoint
ALTER TABLE "license_server_product_types" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "license_server_product_type_skus" ADD COLUMN "license_type" text DEFAULT 'perpetual' NOT NULL;
--> statement-breakpoint
ALTER TABLE "license_server_product_type_skus" ADD COLUMN "policy_template" text DEFAULT 'perpetual_single_device' NOT NULL;
--> statement-breakpoint
ALTER TABLE "license_server_product_type_skus" ADD COLUMN "max_devices" integer;
--> statement-breakpoint
ALTER TABLE "license_server_product_type_skus" ADD COLUMN "max_domains" integer;
--> statement-breakpoint
ALTER TABLE "license_server_product_type_skus" ADD COLUMN "max_seats" integer;
--> statement-breakpoint
ALTER TABLE "license_server_product_type_skus" ADD COLUMN "activation_reset_limit" integer;
--> statement-breakpoint
ALTER TABLE "license_server_product_type_skus" ADD COLUMN "activation_reset_window_days" integer;
--> statement-breakpoint
ALTER TABLE "license_server_product_type_skus" ADD COLUMN "validation_interval_seconds" integer;
--> statement-breakpoint
ALTER TABLE "license_server_product_type_skus" ADD COLUMN "offline_grace_seconds" integer;
--> statement-breakpoint
ALTER TABLE "license_server_product_type_skus" ADD COLUMN "features" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "license_server_product_type_skus" ADD COLUMN "policy" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "license_server_product_type_skus" ADD CONSTRAINT "license_server_product_type_skus_license_type_check" CHECK ("license_server_product_type_skus"."license_type" IN ('perpetual','subscription','trial','maintenance'));
--> statement-breakpoint
ALTER TABLE "license_server_product_type_skus" ADD CONSTRAINT "license_server_product_type_skus_policy_template_check" CHECK ("license_server_product_type_skus"."policy_template" IN ('perpetual_single_device','perpetual_multi_device','domain_license','subscription_device','subscription_domain','trial','seat_based','floating_seat','file_license','maintenance'));
--> statement-breakpoint
ALTER TABLE "license_server_product_type_skus" ADD CONSTRAINT "license_server_product_type_skus_limits_check" CHECK (("license_server_product_type_skus"."max_devices" IS NULL OR "license_server_product_type_skus"."max_devices" >= 0) AND ("license_server_product_type_skus"."max_domains" IS NULL OR "license_server_product_type_skus"."max_domains" >= 0) AND ("license_server_product_type_skus"."max_seats" IS NULL OR "license_server_product_type_skus"."max_seats" >= 0));
--> statement-breakpoint
ALTER TABLE "license_server_product_type_skus" ADD CONSTRAINT "license_server_product_type_skus_timing_check" CHECK (("license_server_product_type_skus"."activation_reset_limit" IS NULL OR "license_server_product_type_skus"."activation_reset_limit" >= 0) AND ("license_server_product_type_skus"."activation_reset_window_days" IS NULL OR "license_server_product_type_skus"."activation_reset_window_days" >= 0) AND ("license_server_product_type_skus"."validation_interval_seconds" IS NULL OR "license_server_product_type_skus"."validation_interval_seconds" > 0) AND ("license_server_product_type_skus"."offline_grace_seconds" IS NULL OR "license_server_product_type_skus"."offline_grace_seconds" >= 0));
--> statement-breakpoint
ALTER TABLE "license_server_licenses" ADD COLUMN "customer_email" text;
--> statement-breakpoint
ALTER TABLE "license_server_licenses" ADD COLUMN "customer_name" text;
--> statement-breakpoint
ALTER TABLE "license_server_licenses" ADD COLUMN "source" text;
--> statement-breakpoint
ALTER TABLE "license_server_licenses" ADD COLUMN "source_order_ref" text;
--> statement-breakpoint
ALTER TABLE "license_server_licenses" ADD COLUMN "source_order_item_ref" text;
--> statement-breakpoint
ALTER TABLE "license_server_licenses" ADD COLUMN "license_type" text DEFAULT 'perpetual' NOT NULL;
--> statement-breakpoint
ALTER TABLE "license_server_licenses" ADD COLUMN "max_devices" integer;
--> statement-breakpoint
ALTER TABLE "license_server_licenses" ADD COLUMN "max_domains" integer;
--> statement-breakpoint
ALTER TABLE "license_server_licenses" ADD COLUMN "max_seats" integer;
--> statement-breakpoint
ALTER TABLE "license_server_licenses" ADD COLUMN "features" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "license_server_licenses" ADD COLUMN "encrypted_license_key" text;
--> statement-breakpoint
ALTER TABLE "license_server_licenses" ADD COLUMN "suspended_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "license_server_licenses" ADD COLUMN "suspended_reason" text;
--> statement-breakpoint
ALTER TABLE "license_server_licenses" ADD COLUMN "revoked_reason" text;
--> statement-breakpoint
ALTER TABLE "license_server_licenses" ADD COLUMN "grace_ends_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "license_server_licenses" ADD COLUMN "last_validated_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "license_server_licenses"
SET "source" = 'webshop',
    "source_order_ref" = "order_ref",
    "source_order_item_ref" = "order_item_ref"
WHERE "order_ref" IS NOT NULL OR "order_item_ref" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "license_server_licenses" DROP CONSTRAINT "license_server_licenses_status_check";
--> statement-breakpoint
ALTER TABLE "license_server_licenses" ADD CONSTRAINT "license_server_licenses_status_check" CHECK ("license_server_licenses"."status" IN ('active','suspended','revoked','expired','refunded','chargeback'));
--> statement-breakpoint
ALTER TABLE "license_server_licenses" ADD CONSTRAINT "license_server_licenses_license_type_check" CHECK ("license_server_licenses"."license_type" IN ('perpetual','subscription','trial','maintenance'));
--> statement-breakpoint
ALTER TABLE "license_server_licenses" ADD CONSTRAINT "license_server_licenses_limits_check" CHECK (("license_server_licenses"."max_devices" IS NULL OR "license_server_licenses"."max_devices" >= 0) AND ("license_server_licenses"."max_domains" IS NULL OR "license_server_licenses"."max_domains" >= 0) AND ("license_server_licenses"."max_seats" IS NULL OR "license_server_licenses"."max_seats" >= 0));
--> statement-breakpoint
CREATE INDEX "license_server_licenses_customer_email_idx" ON "license_server_licenses" USING btree ("customer_email");
--> statement-breakpoint
CREATE INDEX "license_server_licenses_source_idx" ON "license_server_licenses" USING btree ("source","source_order_ref","source_order_item_ref");
--> statement-breakpoint
CREATE TABLE "license_server_license_activations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"license_id" uuid NOT NULL,
	"api_client_id" uuid,
	"activation_type" text NOT NULL,
	"activation_fingerprint_hash" text NOT NULL,
	"activation_label" text,
	"domain" text,
	"device_id_hash" text,
	"machine_fingerprint_hash" text,
	"app_id" text,
	"app_version" text,
	"platform" text,
	"activation_token_hash" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"first_seen_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"deactivated_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "license_server_license_activations_license_fingerprint_unique" UNIQUE("license_id","activation_fingerprint_hash"),
	CONSTRAINT "license_server_license_activations_status_check" CHECK ("license_server_license_activations"."status" IN ('active','deactivated','revoked','expired')),
	CONSTRAINT "license_server_license_activations_type_check" CHECK ("license_server_license_activations"."activation_type" IN ('domain','device','server','seat')),
	CONSTRAINT "license_server_license_activations_token_hash_length_check" CHECK (char_length("license_server_license_activations"."activation_token_hash") = 64),
	CONSTRAINT "license_server_license_activations_fingerprint_length_check" CHECK (char_length("license_server_license_activations"."activation_fingerprint_hash") = 64)
);
--> statement-breakpoint
CREATE TABLE "license_server_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" text,
	"api_client_id" uuid,
	"license_id" uuid,
	"activation_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "license_server_license_activations" ADD CONSTRAINT "license_server_license_activations_license_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."license_server_licenses"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "license_server_license_activations" ADD CONSTRAINT "license_server_license_activations_api_client_id_fk" FOREIGN KEY ("api_client_id") REFERENCES "public"."license_server_api_clients"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "license_server_audit_events" ADD CONSTRAINT "license_server_audit_events_api_client_id_fk" FOREIGN KEY ("api_client_id") REFERENCES "public"."license_server_api_clients"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "license_server_audit_events" ADD CONSTRAINT "license_server_audit_events_license_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."license_server_licenses"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "license_server_audit_events" ADD CONSTRAINT "license_server_audit_events_activation_id_fk" FOREIGN KEY ("activation_id") REFERENCES "public"."license_server_license_activations"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "license_server_license_activations_license_status_idx" ON "license_server_license_activations" USING btree ("license_id","status");
--> statement-breakpoint
CREATE INDEX "license_server_license_activations_token_idx" ON "license_server_license_activations" USING btree ("activation_token_hash");
--> statement-breakpoint
CREATE INDEX "license_server_license_activations_domain_idx" ON "license_server_license_activations" USING btree ("domain");
--> statement-breakpoint
CREATE INDEX "license_server_license_activations_device_idx" ON "license_server_license_activations" USING btree ("device_id_hash");
--> statement-breakpoint
CREATE INDEX "license_server_license_activations_last_seen_idx" ON "license_server_license_activations" USING btree ("last_seen_at");
--> statement-breakpoint
CREATE INDEX "license_server_audit_events_license_idx" ON "license_server_audit_events" USING btree ("license_id","created_at");
--> statement-breakpoint
CREATE INDEX "license_server_audit_events_activation_idx" ON "license_server_audit_events" USING btree ("activation_id","created_at");
--> statement-breakpoint
CREATE INDEX "license_server_audit_events_api_client_idx" ON "license_server_audit_events" USING btree ("api_client_id","created_at");
--> statement-breakpoint
CREATE INDEX "license_server_audit_events_action_idx" ON "license_server_audit_events" USING btree ("action","created_at");
