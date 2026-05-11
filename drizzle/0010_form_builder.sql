CREATE TABLE "form_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"field_key" text NOT NULL,
	"field_type" text NOT NULL,
	"label" text NOT NULL,
	"placeholder" text,
	"help_text" text,
	"required" boolean DEFAULT false NOT NULL,
	"position" integer NOT NULL,
	"options" jsonb,
	"validation" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "form_fields_form_key_unique" UNIQUE("form_id","field_key"),
	CONSTRAINT "form_fields_type_check" CHECK ("form_fields"."field_type" IN ('text','textarea','email','number','phone','select','radio','checkbox','date','file'))
);
--> statement-breakpoint
CREATE TABLE "form_settings" (
	"form_id" uuid PRIMARY KEY NOT NULL,
	"enable_email_notifications" boolean DEFAULT false NOT NULL,
	"notification_recipients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notification_subject" text DEFAULT 'New submission for {{form_name}}' NOT NULL,
	"reply_to_field" text,
	"email_template" text DEFAULT '' NOT NULL,
	"redirect_url" text,
	"enable_turnstile" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"email_status" text DEFAULT 'not_sent' NOT NULL,
	"email_error" text,
	"ip_hash" text,
	"user_agent" text,
	"referer" text,
	"submitted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "form_submissions_status_check" CHECK ("form_submissions"."status" IN ('new','read','spam')),
	CONSTRAINT "form_submissions_email_status_check" CHECK ("form_submissions"."email_status" IN ('not_sent','sent','failed','skipped'))
);
--> statement-breakpoint
CREATE TABLE "forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"submit_label" text DEFAULT 'Submit' NOT NULL,
	"success_message" text DEFAULT 'Thank you. Your submission has been received.' NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "forms_slug_unique" UNIQUE("slug"),
	CONSTRAINT "forms_status_check" CHECK ("forms"."status" IN ('draft','published'))
);
--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_settings" ADD CONSTRAINT "form_settings_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "form_fields_form_position_idx" ON "form_fields" USING btree ("form_id","position");--> statement-breakpoint
CREATE INDEX "form_submissions_form_created_idx" ON "form_submissions" USING btree ("form_id","created_at");--> statement-breakpoint
CREATE INDEX "form_submissions_form_status_idx" ON "form_submissions" USING btree ("form_id","status");--> statement-breakpoint
CREATE INDEX "form_submissions_ip_hash_idx" ON "form_submissions" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "forms_status_idx" ON "forms" USING btree ("status");--> statement-breakpoint
CREATE INDEX "forms_created_by_idx" ON "forms" USING btree ("created_by");