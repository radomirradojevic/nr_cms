ALTER TABLE "content_categories" ADD COLUMN "updated_by" text;--> statement-breakpoint
UPDATE "content_categories" SET "updated_by" = "created_by" WHERE "updated_by" IS NULL;
