CREATE TABLE "webshop_attributes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"type" text NOT NULL,
	"unit" text,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"filterable" boolean DEFAULT false NOT NULL,
	"searchable" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_attributes_key_unique" UNIQUE("key"),
	CONSTRAINT "webshop_attributes_type_check" CHECK ("webshop_attributes"."type" IN ('text','number','select','multi_select','color','boolean','date'))
);
--> statement-breakpoint
CREATE TABLE "webshop_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"image_file_id" uuid,
	"meta_title" text,
	"meta_description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"external_id" text,
	"show_in_navigation" boolean DEFAULT true NOT NULL,
	"show_in_filters" boolean DEFAULT true NOT NULL,
	"canonical_category_id" uuid,
	"template_preset_id" text,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_categories_parent_slug_unique" UNIQUE NULLS NOT DISTINCT("parent_id","slug"),
	CONSTRAINT "webshop_categories_status_check" CHECK ("webshop_categories"."status" IN ('draft','active','hidden','archived')),
	CONSTRAINT "webshop_categories_position_check" CHECK ("webshop_categories"."position" >= 0),
	CONSTRAINT "webshop_categories_canonical_not_self_check" CHECK ("webshop_categories"."canonical_category_id" IS NULL OR "webshop_categories"."canonical_category_id" <> "webshop_categories"."id")
);
--> statement-breakpoint
CREATE TABLE "webshop_category_attribute_exclusions" (
	"category_id" uuid NOT NULL,
	"attribute_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_category_attribute_exclusions_pk" PRIMARY KEY("category_id","attribute_id")
);
--> statement-breakpoint
CREATE TABLE "webshop_category_attributes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"attribute_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"required" boolean,
	"filterable" boolean,
	"searchable" boolean,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_category_attributes_category_attribute_unique" UNIQUE("category_id","attribute_id"),
	CONSTRAINT "webshop_category_attributes_position_check" CHECK ("webshop_category_attributes"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "webshop_category_closure" (
	"ancestor_id" uuid NOT NULL,
	"descendant_id" uuid NOT NULL,
	"depth" integer NOT NULL,
	CONSTRAINT "webshop_category_closure_pk" PRIMARY KEY("ancestor_id","descendant_id"),
	CONSTRAINT "webshop_category_closure_depth_check" CHECK ("webshop_category_closure"."depth" >= 0)
);
--> statement-breakpoint
ALTER TABLE "webshop_categories" ADD CONSTRAINT "webshop_categories_parent_id_webshop_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."webshop_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_categories" ADD CONSTRAINT "webshop_categories_image_file_id_files_id_fk" FOREIGN KEY ("image_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_categories" ADD CONSTRAINT "webshop_categories_canonical_category_id_webshop_categories_id_fk" FOREIGN KEY ("canonical_category_id") REFERENCES "public"."webshop_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_category_attribute_exclusions" ADD CONSTRAINT "webshop_category_attribute_exclusions_category_id_webshop_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."webshop_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_category_attribute_exclusions" ADD CONSTRAINT "webshop_category_attribute_exclusions_attribute_id_webshop_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."webshop_attributes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_category_attributes" ADD CONSTRAINT "webshop_category_attributes_category_id_webshop_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."webshop_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_category_attributes" ADD CONSTRAINT "webshop_category_attributes_attribute_id_webshop_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."webshop_attributes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_category_closure" ADD CONSTRAINT "webshop_category_closure_ancestor_id_webshop_categories_id_fk" FOREIGN KEY ("ancestor_id") REFERENCES "public"."webshop_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_category_closure" ADD CONSTRAINT "webshop_category_closure_descendant_id_webshop_categories_id_fk" FOREIGN KEY ("descendant_id") REFERENCES "public"."webshop_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "webshop_attributes_type_idx" ON "webshop_attributes" USING btree ("type");--> statement-breakpoint
CREATE INDEX "webshop_attributes_filterable_idx" ON "webshop_attributes" USING btree ("filterable");--> statement-breakpoint
CREATE INDEX "webshop_categories_parent_position_idx" ON "webshop_categories" USING btree ("parent_id","position","name");--> statement-breakpoint
CREATE INDEX "webshop_categories_status_idx" ON "webshop_categories" USING btree ("status");--> statement-breakpoint
CREATE INDEX "webshop_categories_image_file_id_idx" ON "webshop_categories" USING btree ("image_file_id");--> statement-breakpoint
CREATE INDEX "webshop_categories_canonical_category_id_idx" ON "webshop_categories" USING btree ("canonical_category_id");--> statement-breakpoint
CREATE INDEX "webshop_category_attribute_exclusions_attribute_idx" ON "webshop_category_attribute_exclusions" USING btree ("attribute_id");--> statement-breakpoint
CREATE INDEX "webshop_category_attributes_category_position_idx" ON "webshop_category_attributes" USING btree ("category_id","position");--> statement-breakpoint
CREATE INDEX "webshop_category_attributes_attribute_idx" ON "webshop_category_attributes" USING btree ("attribute_id");--> statement-breakpoint
CREATE INDEX "webshop_category_closure_ancestor_depth_idx" ON "webshop_category_closure" USING btree ("ancestor_id","depth");--> statement-breakpoint
CREATE INDEX "webshop_category_closure_descendant_depth_idx" ON "webshop_category_closure" USING btree ("descendant_id","depth");