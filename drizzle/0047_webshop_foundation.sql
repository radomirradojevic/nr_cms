ALTER TABLE "content" DROP CONSTRAINT "content_type_check";--> statement-breakpoint
ALTER TABLE "content" ADD CONSTRAINT "content_type_check" CHECK ("content"."content_type" IN ('page','blog_post','hero_slider','webshop'));--> statement-breakpoint
ALTER TABLE "content_revisions" DROP CONSTRAINT "content_revisions_type_check";--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_type_check" CHECK ("content_revisions"."content_type" IN ('page','blog_post','hero_slider','webshop'));--> statement-breakpoint
INSERT INTO "content_categories" ("name", "content_type")
VALUES ('Webshop', 'webshop')
ON CONFLICT ("name", "content_type") DO NOTHING;
