ALTER TABLE "links" ADD COLUMN "short_code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "original_url" text NOT NULL;--> statement-breakpoint
ALTER TABLE "links" DROP COLUMN "url";--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_short_code_unique" UNIQUE("short_code");