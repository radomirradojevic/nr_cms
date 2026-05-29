ALTER TABLE "global_settings" ADD COLUMN "openai_api_key" text;--> statement-breakpoint
ALTER TABLE "global_settings" ADD COLUMN "ai_writing_assistant_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "global_settings" ADD COLUMN "ai_writing_assistant_model" text DEFAULT 'gpt-5.2' NOT NULL;--> statement-breakpoint
ALTER TABLE "global_settings" ADD COLUMN "ai_writing_assistant_max_output_tokens" integer DEFAULT 48 NOT NULL;--> statement-breakpoint
ALTER TABLE "global_settings" ADD COLUMN "ai_writing_assistant_instructions" text;--> statement-breakpoint
ALTER TABLE "global_settings" ADD CONSTRAINT "global_settings_ai_writing_assistant_max_output_tokens_check" CHECK ("global_settings"."ai_writing_assistant_max_output_tokens" BETWEEN 8 AND 160);