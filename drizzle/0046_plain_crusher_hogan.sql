CREATE TABLE "file_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"parent_id" uuid,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created" timestamp with time zone DEFAULT now() NOT NULL,
	"updated" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "file_folders_parent_name_unique" UNIQUE NULLS NOT DISTINCT("parent_id","normalized_name")
);
--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "folder_id" uuid;--> statement-breakpoint
ALTER TABLE "file_folders" ADD CONSTRAINT "file_folders_parent_id_file_folders_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."file_folders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "file_folders_parent_idx" ON "file_folders" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "file_folders_created_by_idx" ON "file_folders" USING btree ("created_by");--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_folder_id_file_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."file_folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "files_folder_id_idx" ON "files" USING btree ("folder_id");