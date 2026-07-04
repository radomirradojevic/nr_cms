CREATE TABLE "webshop_fulfillment_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fulfillment_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"label" text NOT NULL,
	"reference_number" text,
	"url" text,
	"note" text,
	"file_id" uuid,
	"visible_to_customer" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_fulfillment_documents_label_length_check" CHECK (char_length("webshop_fulfillment_documents"."label") BETWEEN 1 AND 160),
	CONSTRAINT "webshop_fulfillment_documents_reference_length_check" CHECK ("webshop_fulfillment_documents"."reference_number" IS NULL OR char_length("webshop_fulfillment_documents"."reference_number") <= 160),
	CONSTRAINT "webshop_fulfillment_documents_url_length_check" CHECK ("webshop_fulfillment_documents"."url" IS NULL OR char_length("webshop_fulfillment_documents"."url") <= 2000),
	CONSTRAINT "webshop_fulfillment_documents_note_length_check" CHECK ("webshop_fulfillment_documents"."note" IS NULL OR char_length("webshop_fulfillment_documents"."note") <= 1000),
	CONSTRAINT "webshop_fulfillment_documents_position_check" CHECK ("webshop_fulfillment_documents"."position" >= 0)
);
--> statement-breakpoint
ALTER TABLE "webshop_fulfillment_documents" ADD CONSTRAINT "webshop_fulfillment_documents_fulfillment_id_webshop_fulfillments_id_fk" FOREIGN KEY ("fulfillment_id") REFERENCES "public"."webshop_fulfillments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_fulfillment_documents" ADD CONSTRAINT "webshop_fulfillment_documents_order_id_webshop_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."webshop_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webshop_fulfillment_documents" ADD CONSTRAINT "webshop_fulfillment_documents_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "webshop_fulfillment_documents_fulfillment_idx" ON "webshop_fulfillment_documents" USING btree ("fulfillment_id");--> statement-breakpoint
CREATE INDEX "webshop_fulfillment_documents_order_idx" ON "webshop_fulfillment_documents" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "webshop_fulfillment_documents_file_idx" ON "webshop_fulfillment_documents" USING btree ("file_id");
