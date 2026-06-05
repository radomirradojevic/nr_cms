CREATE TABLE "content_preview_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_by" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_preview_tokens" ADD CONSTRAINT "content_preview_tokens_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_preview_tokens_hash_unique" ON "content_preview_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "content_preview_tokens_content_id_idx" ON "content_preview_tokens" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "content_preview_tokens_expires_at_idx" ON "content_preview_tokens" USING btree ("expires_at");