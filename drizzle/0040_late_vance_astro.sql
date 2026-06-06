ALTER TABLE "content" DROP CONSTRAINT "content_status_check";--> statement-breakpoint
UPDATE "content" SET "status" = 'draft' WHERE "status" = 'unpublished';--> statement-breakpoint
ALTER TABLE "content" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "content" ADD CONSTRAINT "content_status_check" CHECK ("content"."status" IN ('draft','in_review','approved','published','archived'));
