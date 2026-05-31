CREATE TABLE "menus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menus_name_unique" UNIQUE("name")
);
--> statement-breakpoint
INSERT INTO "menus" ("name")
SELECT 'Main Menu'
WHERE EXISTS (SELECT 1 FROM "top_menu_items")
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "top_menu_items" ADD COLUMN "menu_id" uuid;
--> statement-breakpoint
UPDATE "top_menu_items"
SET "menu_id" = (
	SELECT "id"
	FROM "menus"
	WHERE "name" = 'Main Menu'
	LIMIT 1
)
WHERE "menu_id" IS NULL;
--> statement-breakpoint
UPDATE "global_settings"
SET "header_settings" = COALESCE("header_settings", '{}'::jsonb) || jsonb_build_object(
	'navigationMenuId',
	(
		SELECT "id"
		FROM "menus"
		WHERE "name" = 'Main Menu'
		LIMIT 1
	)
)
WHERE "id" = 1
	AND EXISTS (SELECT 1 FROM "top_menu_items")
	AND ("header_settings"->>'navigationMenuId' IS NULL OR "header_settings"->>'navigationMenuId' = '');
--> statement-breakpoint
ALTER TABLE "top_menu_items" ALTER COLUMN "menu_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "top_menu_items" ADD CONSTRAINT "top_menu_items_menu_id_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menus"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "top_menu_items_menu_id_idx" ON "top_menu_items" USING btree ("menu_id");
--> statement-breakpoint
CREATE INDEX "top_menu_items_menu_parent_order_idx" ON "top_menu_items" USING btree ("menu_id","parent_id","order");
