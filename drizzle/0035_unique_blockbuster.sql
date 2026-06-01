ALTER TABLE "menus" ADD COLUMN "created_by" text;--> statement-breakpoint
CREATE INDEX "menus_created_by_idx" ON "menus" USING btree ("created_by");