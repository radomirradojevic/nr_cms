CREATE TABLE "webshop_order_delivery_confirmations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_user_id" text NOT NULL,
	"message" text,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webshop_order_delivery_confirmations_message_length_check" CHECK ("webshop_order_delivery_confirmations"."message" IS NULL OR char_length("webshop_order_delivery_confirmations"."message") <= 2000)
);
--> statement-breakpoint
ALTER TABLE "webshop_order_delivery_confirmations" ADD CONSTRAINT "webshop_order_delivery_confirmations_order_id_webshop_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."webshop_orders"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "webshop_order_delivery_confirmations_order_unique" ON "webshop_order_delivery_confirmations" USING btree ("order_id");
--> statement-breakpoint
CREATE INDEX "webshop_order_delivery_confirmations_customer_idx" ON "webshop_order_delivery_confirmations" USING btree ("customer_user_id");
--> statement-breakpoint
CREATE INDEX "webshop_order_delivery_confirmations_confirmed_idx" ON "webshop_order_delivery_confirmations" USING btree ("confirmed_at");
