ALTER TABLE "global_settings" ADD COLUMN "ai_default_provider" text DEFAULT 'openai' NOT NULL;--> statement-breakpoint
ALTER TABLE "global_settings" ADD COLUMN "ai_provider_settings" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "global_settings"
SET "ai_default_provider" = 'openai',
    "ai_provider_settings" = jsonb_build_object(
      'openai', jsonb_build_object(
        'enabled', "ai_writing_assistant_enabled" OR "openai_api_key" IS NOT NULL,
        'apiKey', "openai_api_key",
        'model', "ai_writing_assistant_model",
        'maxOutputTokens', "ai_writing_assistant_max_output_tokens",
        'instructions', "ai_writing_assistant_instructions"
      ),
      'anthropic', jsonb_build_object(
        'enabled', false,
        'apiKey', NULL,
        'model', 'claude-sonnet-4-5',
        'maxOutputTokens', 48,
        'instructions', NULL
      ),
      'google', jsonb_build_object(
        'enabled', false,
        'apiKey', NULL,
        'model', 'gemini-2.5-pro',
        'maxOutputTokens', 48,
        'instructions', NULL
      ),
      'mistral', jsonb_build_object(
        'enabled', false,
        'apiKey', NULL,
        'model', 'mistral-large-latest',
        'maxOutputTokens', 48,
        'instructions', NULL
      ),
      'xai', jsonb_build_object(
        'enabled', false,
        'apiKey', NULL,
        'model', 'grok-4',
        'maxOutputTokens', 48,
        'instructions', NULL
      )
    )
WHERE "ai_provider_settings" = '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "global_settings" ADD CONSTRAINT "global_settings_ai_default_provider_check" CHECK ("global_settings"."ai_default_provider" IN ('openai','anthropic','google','mistral','xai'));
