ALTER TABLE "global_settings"
  ADD COLUMN "frontend_language" text DEFAULT 'en' NOT NULL,
  ADD COLUMN "backend_language" text DEFAULT 'en' NOT NULL;

UPDATE "global_settings"
SET
  "frontend_language" = CASE
    WHEN "default_language" IN ('sr-RS','sr-Latn-RS') THEN 'sr-Latn'
    WHEN "default_language" = 'sr-Cyrl-RS' THEN 'sr-Cyrl'
    WHEN "default_language" = 'hr-HR' THEN 'hr'
    WHEN "default_language" IN ('de-DE','de-AT','de-CH') THEN 'de'
    WHEN "default_language" IN ('fr-FR','fr-CA','fr-CH') THEN 'fr'
    WHEN "default_language" IN ('es-ES','es-MX','es-AR','es-CO','es-CL') THEN 'es'
    WHEN "default_language" = 'it-IT' THEN 'it'
    WHEN "default_language" = 'pt-BR' THEN 'pt-BR'
    WHEN "default_language" = 'pt-PT' THEN 'pt'
    WHEN "default_language" IN ('nl-NL','nl-BE') THEN 'nl'
    WHEN "default_language" = 'pl-PL' THEN 'pl'
    WHEN "default_language" = 'tr-TR' THEN 'tr'
    WHEN "default_language" = 'mk-MK' THEN 'mk'
    WHEN "default_language" = 'bs-BA' THEN 'bs'
    WHEN "default_language" = 'sl-SI' THEN 'sl'
    WHEN "default_language" = 'ru-RU' THEN 'ru'
    WHEN "default_language" = 'hu-HU' THEN 'hu'
    WHEN "default_language" = 'bg-BG' THEN 'bg'
    WHEN "default_language" = 'ja-JP' THEN 'ja'
    WHEN "default_language" = 'zh-CN' THEN 'zh-Hans'
    WHEN "default_language" = 'zh-TW' THEN 'zh-Hant'
    WHEN "default_language" = 'ar-SA' THEN 'ar'
    WHEN "default_language" = 'id-ID' THEN 'id'
    WHEN "default_language" = 'cs-CZ' THEN 'cs'
    WHEN "default_language" = 'ro-RO' THEN 'ro'
    WHEN "default_language" = 'el-GR' THEN 'el'
    WHEN "default_language" = 'da-DK' THEN 'da'
    WHEN "default_language" = 'sv-SE' THEN 'sv'
    WHEN "default_language" = 'nb-NO' THEN 'nb'
    WHEN "default_language" = 'fi-FI' THEN 'fi'
    ELSE 'en'
  END,
  "backend_language" = CASE
    WHEN "default_language" IN ('sr-RS','sr-Latn-RS') THEN 'sr-Latn'
    WHEN "default_language" = 'sr-Cyrl-RS' THEN 'sr-Cyrl'
    WHEN "default_language" = 'hr-HR' THEN 'hr'
    WHEN "default_language" IN ('de-DE','de-AT','de-CH') THEN 'de'
    WHEN "default_language" IN ('fr-FR','fr-CA','fr-CH') THEN 'fr'
    WHEN "default_language" IN ('es-ES','es-MX','es-AR','es-CO','es-CL') THEN 'es'
    WHEN "default_language" = 'it-IT' THEN 'it'
    WHEN "default_language" = 'pt-BR' THEN 'pt-BR'
    WHEN "default_language" = 'pt-PT' THEN 'pt'
    WHEN "default_language" IN ('nl-NL','nl-BE') THEN 'nl'
    WHEN "default_language" = 'pl-PL' THEN 'pl'
    WHEN "default_language" = 'tr-TR' THEN 'tr'
    WHEN "default_language" = 'mk-MK' THEN 'mk'
    WHEN "default_language" = 'bs-BA' THEN 'bs'
    WHEN "default_language" = 'sl-SI' THEN 'sl'
    WHEN "default_language" = 'ru-RU' THEN 'ru'
    WHEN "default_language" = 'hu-HU' THEN 'hu'
    WHEN "default_language" = 'bg-BG' THEN 'bg'
    WHEN "default_language" = 'ja-JP' THEN 'ja'
    WHEN "default_language" = 'zh-CN' THEN 'zh-Hans'
    WHEN "default_language" = 'zh-TW' THEN 'zh-Hant'
    WHEN "default_language" = 'ar-SA' THEN 'ar'
    WHEN "default_language" = 'id-ID' THEN 'id'
    WHEN "default_language" = 'cs-CZ' THEN 'cs'
    WHEN "default_language" = 'ro-RO' THEN 'ro'
    WHEN "default_language" = 'el-GR' THEN 'el'
    WHEN "default_language" = 'da-DK' THEN 'da'
    WHEN "default_language" = 'sv-SE' THEN 'sv'
    WHEN "default_language" = 'nb-NO' THEN 'nb'
    WHEN "default_language" = 'fi-FI' THEN 'fi'
    ELSE 'en'
  END;

ALTER TABLE "global_settings"
  ADD CONSTRAINT "global_settings_frontend_language_check"
  CHECK ("frontend_language" IN ('en','sr-Latn','sr-Cyrl','hr','de','fr','es','it','pt','pt-BR','nl','pl','tr','mk','bs','sl','ru','hu','bg','ja','zh-Hans','zh-Hant','ar','id','cs','ro','el','da','sv','nb','nn','fi','is'));

ALTER TABLE "global_settings"
  ADD CONSTRAINT "global_settings_backend_language_check"
  CHECK ("backend_language" IN ('en','sr-Latn','sr-Cyrl','hr','de','fr','es','it','pt','pt-BR','nl','pl','tr','mk','bs','sl','ru','hu','bg','ja','zh-Hans','zh-Hant','ar','id','cs','ro','el','da','sv','nb','nn','fi','is'));
