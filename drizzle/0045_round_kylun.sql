ALTER TABLE "content" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "deleted_by" text;--> statement-breakpoint
CREATE INDEX "content_deleted_at_idx" ON "content" USING btree ("deleted_at");