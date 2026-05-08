CREATE TABLE "top_menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"parent_id" uuid,
	"order" integer DEFAULT 0 NOT NULL,
	"content_id" uuid,
	"target" text DEFAULT '_self' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "top_menu_items_target_check" CHECK ("top_menu_items"."target" IN ('_self','_blank'))
);
--> statement-breakpoint
ALTER TABLE "top_menu_items" ADD CONSTRAINT "top_menu_items_parent_id_top_menu_items_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."top_menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "top_menu_items" ADD CONSTRAINT "top_menu_items_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "top_menu_items_parent_id_idx" ON "top_menu_items" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "top_menu_items_parent_order_idx" ON "top_menu_items" USING btree ("parent_id","order");--> statement-breakpoint
CREATE INDEX "top_menu_items_content_id_idx" ON "top_menu_items" USING btree ("content_id");