CREATE TABLE "license_server_addon_entitlements" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'license_required' NOT NULL,
	"license_key_ref" text,
	"entitlement_token" text,
	"provider" text,
	"provider_mode" text,
	"provider_owner_id" text,
	"provider_project_id" text,
	"deployment_environment" text,
	"package_name" text,
	"package_version" text,
	"package_installed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "license_server_addon_entitlements_singleton_check" CHECK ("license_server_addon_entitlements"."id" = 1),
	CONSTRAINT "license_server_addon_entitlements_status_check" CHECK ("license_server_addon_entitlements"."status" IN ('license_required','ready','expired','invalid','install_pending')),
	CONSTRAINT "license_server_addon_entitlements_provider_check" CHECK ("license_server_addon_entitlements"."provider" IS NULL OR "license_server_addon_entitlements"."provider" IN ('vercel','self_hosted')),
	CONSTRAINT "license_server_addon_entitlements_environment_check" CHECK ("license_server_addon_entitlements"."deployment_environment" IS NULL OR "license_server_addon_entitlements"."deployment_environment" IN ('production','self_hosted'))
);
--> statement-breakpoint
CREATE TABLE "license_server_api_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"client_id" text NOT NULL,
	"secret_encrypted" text NOT NULL,
	"secret_fingerprint" text NOT NULL,
	"allowed_domains" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"rotated_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "license_server_api_clients_client_id_unique" UNIQUE("client_id"),
	CONSTRAINT "license_server_api_clients_status_check" CHECK ("license_server_api_clients"."status" IN ('active','inactive','revoked')),
	CONSTRAINT "license_server_api_clients_title_length_check" CHECK (char_length("license_server_api_clients"."title") BETWEEN 1 AND 160),
	CONSTRAINT "license_server_api_clients_client_id_length_check" CHECK (char_length("license_server_api_clients"."client_id") BETWEEN 1 AND 160),
	CONSTRAINT "license_server_api_clients_fingerprint_length_check" CHECK (char_length("license_server_api_clients"."secret_fingerprint") = 64)
);
--> statement-breakpoint
CREATE TABLE "license_server_api_client_nonces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_client_id" uuid NOT NULL,
	"nonce" text NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "license_server_api_client_nonces_client_nonce_unique" UNIQUE("api_client_id","nonce")
);
--> statement-breakpoint
CREATE TABLE "license_server_product_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"external_ref" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "license_server_product_types_external_ref_unique" UNIQUE("external_ref"),
	CONSTRAINT "license_server_product_types_status_check" CHECK ("license_server_product_types"."status" IN ('active','inactive','archived')),
	CONSTRAINT "license_server_product_types_title_length_check" CHECK (char_length("license_server_product_types"."title") BETWEEN 1 AND 160),
	CONSTRAINT "license_server_product_types_external_ref_length_check" CHECK ("license_server_product_types"."external_ref" IS NULL OR char_length("license_server_product_types"."external_ref") <= 160)
);
--> statement-breakpoint
CREATE TABLE "license_server_product_type_skus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_type_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"duration_days" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"key_namespace" text NOT NULL,
	"admin_note" text,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "license_server_product_type_skus_type_sku_unique" UNIQUE("product_type_id","sku"),
	CONSTRAINT "license_server_product_type_skus_namespace_unique" UNIQUE("key_namespace"),
	CONSTRAINT "license_server_product_type_skus_status_check" CHECK ("license_server_product_type_skus"."status" IN ('active','inactive','archived')),
	CONSTRAINT "license_server_product_type_skus_duration_check" CHECK ("license_server_product_type_skus"."duration_days" >= 0),
	CONSTRAINT "license_server_product_type_skus_sku_length_check" CHECK (char_length("license_server_product_type_skus"."sku") BETWEEN 1 AND 160)
);
--> statement-breakpoint
CREATE TABLE "license_server_licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_client_id" uuid NOT NULL,
	"product_type_id" uuid NOT NULL,
	"sku_id" uuid NOT NULL,
	"sku_snapshot" text NOT NULL,
	"domain" text,
	"duration_days" integer DEFAULT 0 NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"license_key_hash" text NOT NULL,
	"license_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"order_ref" text,
	"order_item_ref" text,
	"idempotency_key" text NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "license_server_licenses_client_idempotency_unique" UNIQUE("api_client_id","idempotency_key"),
	CONSTRAINT "license_server_licenses_status_check" CHECK ("license_server_licenses"."status" IN ('active','revoked','expired')),
	CONSTRAINT "license_server_licenses_key_hash_length_check" CHECK (char_length("license_server_licenses"."license_key_hash") = 64),
	CONSTRAINT "license_server_licenses_domain_length_check" CHECK ("license_server_licenses"."domain" IS NULL OR char_length("license_server_licenses"."domain") <= 255)
);
--> statement-breakpoint
CREATE TABLE "license_server_validation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_client_id" uuid,
	"license_id" uuid,
	"license_key_hash" text,
	"domain" text,
	"result" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "license_server_validation_events_result_check" CHECK ("license_server_validation_events"."result" IN ('valid','invalid'))
);
--> statement-breakpoint
ALTER TABLE "license_server_api_client_nonces" ADD CONSTRAINT "license_server_api_client_nonces_api_client_id_fk" FOREIGN KEY ("api_client_id") REFERENCES "public"."license_server_api_clients"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "license_server_product_type_skus" ADD CONSTRAINT "license_server_product_type_skus_product_type_id_fk" FOREIGN KEY ("product_type_id") REFERENCES "public"."license_server_product_types"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "license_server_licenses" ADD CONSTRAINT "license_server_licenses_api_client_id_fk" FOREIGN KEY ("api_client_id") REFERENCES "public"."license_server_api_clients"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "license_server_licenses" ADD CONSTRAINT "license_server_licenses_product_type_id_fk" FOREIGN KEY ("product_type_id") REFERENCES "public"."license_server_product_types"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "license_server_licenses" ADD CONSTRAINT "license_server_licenses_sku_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."license_server_product_type_skus"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "license_server_validation_events" ADD CONSTRAINT "license_server_validation_events_api_client_id_fk" FOREIGN KEY ("api_client_id") REFERENCES "public"."license_server_api_clients"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "license_server_validation_events" ADD CONSTRAINT "license_server_validation_events_license_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."license_server_licenses"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "license_server_api_clients_status_idx" ON "license_server_api_clients" USING btree ("status","created_at");
--> statement-breakpoint
CREATE INDEX "license_server_api_clients_fingerprint_idx" ON "license_server_api_clients" USING btree ("secret_fingerprint");
--> statement-breakpoint
CREATE INDEX "license_server_api_client_nonces_created_idx" ON "license_server_api_client_nonces" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "license_server_product_types_status_idx" ON "license_server_product_types" USING btree ("status","title");
--> statement-breakpoint
CREATE INDEX "license_server_product_type_skus_product_idx" ON "license_server_product_type_skus" USING btree ("product_type_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX "license_server_licenses_key_hash_unique" ON "license_server_licenses" USING btree ("license_key_hash");
--> statement-breakpoint
CREATE INDEX "license_server_licenses_sku_idx" ON "license_server_licenses" USING btree ("sku_id","status","created_at");
--> statement-breakpoint
CREATE INDEX "license_server_licenses_order_ref_idx" ON "license_server_licenses" USING btree ("order_ref","order_item_ref");
--> statement-breakpoint
CREATE INDEX "license_server_validation_events_license_idx" ON "license_server_validation_events" USING btree ("license_id","created_at");
--> statement-breakpoint
CREATE INDEX "license_server_validation_events_created_idx" ON "license_server_validation_events" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "license_server_validation_events_api_client_idx" ON "license_server_validation_events" USING btree ("api_client_id","created_at");
