ALTER TABLE "content" ADD COLUMN "publish_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "unpublish_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "content_status_publish_at_idx" ON "content" USING btree ("status","publish_at");--> statement-breakpoint
CREATE INDEX "content_status_unpublish_at_idx" ON "content" USING btree ("status","unpublish_at");--> statement-breakpoint
ALTER TABLE "content" ADD CONSTRAINT "content_schedule_window_check" CHECK ("content"."unpublish_at" IS NULL OR "content"."publish_at" IS NULL OR "content"."unpublish_at" > "content"."publish_at");