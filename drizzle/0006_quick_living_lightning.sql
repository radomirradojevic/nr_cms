CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"storage_path" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"kind" text NOT NULL,
	"width" integer,
	"height" integer,
	"alt" text,
	"title" text,
	"uploaded_by" text NOT NULL,
	"created" timestamp with time zone DEFAULT now() NOT NULL,
	"updated" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "files_storage_path_unique" UNIQUE("storage_path"),
	CONSTRAINT "files_kind_check" CHECK ("files"."kind" IN ('image','video','document'))
);
--> statement-breakpoint
CREATE INDEX "files_uploaded_by_idx" ON "files" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "files_kind_idx" ON "files" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "files_created_idx" ON "files" USING btree ("created");--> statement-breakpoint
CREATE INDEX "files_mime_type_idx" ON "files" USING btree ("mime_type");