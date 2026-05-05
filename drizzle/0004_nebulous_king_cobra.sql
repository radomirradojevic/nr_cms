CREATE TABLE "content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type" text NOT NULL,
	"category_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"content_json" jsonb,
	"meta_title" text,
	"meta_description" text,
	"status" text DEFAULT 'unpublished' NOT NULL,
	"published_at" timestamp with time zone,
	"excerpt" text,
	"cover_image" text,
	"slug" text NOT NULL,
	"author_id" text NOT NULL,
	"homepage" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_slug_unique" UNIQUE("slug"),
	CONSTRAINT "content_type_check" CHECK ("content"."content_type" IN ('page','blog_post')),
	CONSTRAINT "content_status_check" CHECK ("content"."status" IN ('published','unpublished','archived'))
);
--> statement-breakpoint
ALTER TABLE "content" ADD CONSTRAINT "content_category_id_content_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."content_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_only_one_homepage" ON "content" USING btree ("homepage") WHERE "content"."homepage" = true;--> statement-breakpoint
CREATE INDEX "content_slug_idx" ON "content" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "content_status_idx" ON "content" USING btree ("status");--> statement-breakpoint
CREATE INDEX "content_type_idx" ON "content" USING btree ("content_type");--> statement-breakpoint
CREATE INDEX "content_category_id_idx" ON "content" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "content_author_id_idx" ON "content" USING btree ("author_id");