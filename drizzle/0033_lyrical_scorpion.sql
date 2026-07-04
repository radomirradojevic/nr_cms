ALTER TABLE "content" DROP CONSTRAINT "content_type_check";--> statement-breakpoint
ALTER TABLE "content" ADD CONSTRAINT "content_type_check" CHECK ("content"."content_type" IN ('page','blog_post','hero_slider','webshop'));
