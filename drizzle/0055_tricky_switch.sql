CREATE TABLE "webshop_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"action" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "webshop_audit_events_actor_idx" ON "webshop_audit_events" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "webshop_audit_events_action_idx" ON "webshop_audit_events" USING btree ("action");--> statement-breakpoint
CREATE INDEX "webshop_audit_events_created_idx" ON "webshop_audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "webshop_audit_events_entity_idx" ON "webshop_audit_events" USING btree ("entity_type","entity_id","created_at");