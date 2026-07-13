CREATE TABLE "webshop_license_servers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"base_api_url" text NOT NULL,
	"auth_type" text DEFAULT 'hmac_shared_secret' NOT NULL,
	"auth_client_id" text,
	"auth_secret_encrypted" text,
	"auth_secret_fingerprint" text,
	"show_in_policy_menu" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_health_check_at" timestamp with time zone,
	"last_health_status" text,
	"last_health_message" text,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_license_servers_title_unique" UNIQUE("title"),
	CONSTRAINT "webshop_license_servers_auth_type_check" CHECK ("webshop_license_servers"."auth_type" IN ('hmac_shared_secret')),
	CONSTRAINT "webshop_license_servers_status_check" CHECK ("webshop_license_servers"."status" IN ('active','inactive','archived')),
	CONSTRAINT "webshop_license_servers_title_length_check" CHECK (char_length("webshop_license_servers"."title") BETWEEN 1 AND 160),
	CONSTRAINT "webshop_license_servers_base_api_url_length_check" CHECK (char_length("webshop_license_servers"."base_api_url") BETWEEN 1 AND 2000),
	CONSTRAINT "webshop_license_servers_auth_client_id_length_check" CHECK ("webshop_license_servers"."auth_client_id" IS NULL OR char_length("webshop_license_servers"."auth_client_id") <= 160),
	CONSTRAINT "webshop_license_servers_secret_fingerprint_length_check" CHECK ("webshop_license_servers"."auth_secret_fingerprint" IS NULL OR char_length("webshop_license_servers"."auth_secret_fingerprint") = 64)
);
--> statement-breakpoint
CREATE INDEX "webshop_license_servers_policy_menu_idx" ON "webshop_license_servers" USING btree ("status","show_in_policy_menu","title");--> statement-breakpoint
CREATE INDEX "webshop_license_servers_created_idx" ON "webshop_license_servers" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "webshop_license_servers_secret_fingerprint_idx" ON "webshop_license_servers" USING btree ("auth_secret_fingerprint");
