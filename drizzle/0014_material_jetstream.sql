ALTER TABLE "global_settings" ALTER COLUMN "sticky_header_height" SET DEFAULT 80;--> statement-breakpoint
ALTER TABLE "global_settings" ALTER COLUMN "sticky_footer_height" SET DEFAULT 110;--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "visibility" jsonb DEFAULT '{"public":true,"roles":[]}'::jsonb NOT NULL;