CREATE TABLE "webshop_digital_asset_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"storage_path" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_digital_asset_files_storage_path_unique" UNIQUE("storage_path")
);
--> statement-breakpoint
ALTER TABLE "webshop_digital_assets" ADD COLUMN "asset_file_id" uuid;
--> statement-breakpoint
ALTER TABLE "webshop_digital_assets" ALTER COLUMN "file_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "webshop_digital_assets" ADD CONSTRAINT "webshop_digital_assets_asset_file_id_webshop_digital_asset_files_id_fk" FOREIGN KEY ("asset_file_id") REFERENCES "public"."webshop_digital_asset_files"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "webshop_digital_assets" ADD CONSTRAINT "webshop_digital_assets_file_source_check" CHECK ("webshop_digital_assets"."asset_file_id" IS NOT NULL OR "webshop_digital_assets"."file_id" IS NOT NULL);
--> statement-breakpoint
CREATE INDEX "webshop_digital_asset_files_uploaded_by_idx" ON "webshop_digital_asset_files" USING btree ("uploaded_by");
--> statement-breakpoint
CREATE INDEX "webshop_digital_asset_files_created_idx" ON "webshop_digital_asset_files" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "webshop_digital_asset_files_mime_type_idx" ON "webshop_digital_asset_files" USING btree ("mime_type");
--> statement-breakpoint
CREATE INDEX "webshop_digital_assets_asset_file_idx" ON "webshop_digital_assets" USING btree ("asset_file_id");
