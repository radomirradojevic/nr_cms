ALTER TABLE "global_settings" ADD COLUMN "default_language" text DEFAULT 'en-US' NOT NULL;
ALTER TABLE "global_settings" ADD COLUMN "timezone" text DEFAULT 'UTC' NOT NULL;

ALTER TABLE "global_settings" ADD CONSTRAINT "global_settings_default_language_check" CHECK ("global_settings"."default_language" IN ('en-US','en-GB','sr-RS','de-DE','fr-FR','es-ES','it-IT','pt-BR','nl-NL','sv-SE','pl-PL','cs-CZ','hr-HR','bs-BA','sl-SI'));
ALTER TABLE "global_settings" ADD CONSTRAINT "global_settings_timezone_check" CHECK ("global_settings"."timezone" IN ('UTC','Europe/Belgrade','Europe/London','Europe/Berlin','Europe/Paris','Europe/Rome','Europe/Madrid','Europe/Amsterdam','Europe/Stockholm','Europe/Warsaw','Europe/Prague','Europe/Zagreb','Europe/Sarajevo','Europe/Ljubljana','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Toronto','America/Sao_Paulo','Asia/Tokyo','Asia/Shanghai','Asia/Singapore','Australia/Sydney'));
