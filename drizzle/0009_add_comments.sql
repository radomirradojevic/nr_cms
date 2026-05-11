CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"parent_id" uuid,
	"author_id" text,
	"author_name" text NOT NULL,
	"author_email" text,
	"body" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"ip_hash" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comments_status_check" CHECK ("comments"."status" IN ('pending','published')),
	CONSTRAINT "comments_body_length_check" CHECK (char_length("comments"."body") BETWEEN 1 AND 5000)
);
--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "enable_comments" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "auto_publish_comments" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "allow_anonymous_comments" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comments_post_status_created_idx" ON "comments" USING btree ("content_id","status","created_at");--> statement-breakpoint
CREATE INDEX "comments_parent_id_idx" ON "comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "comments_author_id_idx" ON "comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "comments_ip_hash_idx" ON "comments" USING btree ("ip_hash");