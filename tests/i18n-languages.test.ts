import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_APPEARANCE } from "@/lib/appearance";
import {
  AI_WRITING_ASSISTANT_DEFAULTS,
  DEFAULT_FOOTER_SETTINGS,
  DEFAULT_HEADER_SETTINGS,
  DEFAULT_MAX_BATCH_UPLOAD_SIZE_BYTES,
  DEFAULT_MAX_UPLOAD_SIZE_BYTES,
  DEFAULT_RESOLVED_GLOBAL_SETTINGS,
  SESSION_SECURITY_DEFAULTS,
  UpdateGlobalSettingsSchema,
} from "@/lib/global-settings";
import {
  DEFAULT_CMS_LANGUAGE_SETTINGS,
  SUPPORTED_CMS_LANGUAGES,
  cmsLanguageToLocale,
  getCmsLanguageDirection,
  isSupportedCmsLanguage,
  normalizeCmsLanguage,
  normalizeCmsLanguageSettings,
} from "@/lib/i18n/languages";
import { buildAddonI18nContext } from "@/lib/i18n/addon-contract";

function createBaseSettingsPayload() {
  return {
    siteName: "Night Raven CMS",
    publicSiteUrl: null,
    frontendLanguage: "en",
    backendLanguage: "en",
    defaultLanguage: "en-US",
    timezone: "UTC",
    siteLogoFileId: null,
    headerContent: null,
    footerContent: null,
    headerSettings: DEFAULT_HEADER_SETTINGS,
    footerSettings: DEFAULT_FOOTER_SETTINGS,
    stickyHeaderHeight: 80,
    stickyFooterHeight: 110,
    maxUploadSizeBytes: DEFAULT_MAX_UPLOAD_SIZE_BYTES,
    maxBatchUploadSizeBytes: DEFAULT_MAX_BATCH_UPLOAD_SIZE_BYTES,
    ...DEFAULT_APPEARANCE,
    contentHistoryEnabled: true,
    aiWritingAssistantEnabled: AI_WRITING_ASSISTANT_DEFAULTS.enabled,
    aiPageBuilderAssistantEnabled:
      AI_WRITING_ASSISTANT_DEFAULTS.pageBuilderEnabled,
    aiWebshopAssistantEnabled: AI_WRITING_ASSISTANT_DEFAULTS.webshopEnabled,
    aiDefaultProvider: AI_WRITING_ASSISTANT_DEFAULTS.defaultProvider,
    aiProviders: AI_WRITING_ASSISTANT_DEFAULTS.providers,
    maxSessionDurationMinutes:
      SESSION_SECURITY_DEFAULTS.maxSessionDurationMinutes,
    idleLogoutMinutes: SESSION_SECURITY_DEFAULTS.idleLogoutMinutes,
  };
}

test("CMS language helpers accept only supported CMS languages", () => {
  assert.equal(isSupportedCmsLanguage("de"), true);
  assert.equal(isSupportedCmsLanguage("pt-BR"), true);
  assert.equal(isSupportedCmsLanguage("en-US"), false);
  assert.equal(isSupportedCmsLanguage("klingon"), false);
});

test("CMS language helpers normalize legacy regional locales", () => {
  assert.equal(normalizeCmsLanguage("sr-RS"), "sr-Latn");
  assert.equal(normalizeCmsLanguage("sr-Cyrl-RS"), "sr-Cyrl");
  assert.equal(normalizeCmsLanguage("zh-CN"), "zh-Hans");
  assert.equal(normalizeCmsLanguage("zh-TW"), "zh-Hant");
  assert.equal(normalizeCmsLanguage("de-CH"), "de");
  assert.equal(normalizeCmsLanguage("unknown"), "en");
});

test("CMS language helpers expose locale and direction metadata", () => {
  assert.equal(cmsLanguageToLocale("sr-Cyrl"), "sr-Cyrl-RS");
  assert.equal(cmsLanguageToLocale("pt-BR"), "pt-BR");
  assert.equal(getCmsLanguageDirection("ar"), "rtl");
  assert.equal(getCmsLanguageDirection("de"), "ltr");
});

test("CMS language settings normalize each side independently", () => {
  assert.deepEqual(
    normalizeCmsLanguageSettings({
      frontendLanguage: "fr-FR",
      backendLanguage: "sr-Cyrl-RS",
    }),
    {
      frontendLanguage: "fr",
      backendLanguage: "sr-Cyrl",
    },
  );
  assert.deepEqual(
    normalizeCmsLanguageSettings({}),
    DEFAULT_CMS_LANGUAGE_SETTINGS,
  );
});

test("global settings schema accepts every supported frontend/backend language", () => {
  for (const language of SUPPORTED_CMS_LANGUAGES) {
    const parsed = UpdateGlobalSettingsSchema.safeParse({
      ...createBaseSettingsPayload(),
      frontendLanguage: language.code,
      backendLanguage: language.code,
    });

    assert.equal(parsed.success, true, language.code);
  }
});

test("global settings schema rejects unsupported CMS language codes", () => {
  const parsed = UpdateGlobalSettingsSchema.safeParse({
    ...createBaseSettingsPayload(),
    frontendLanguage: "en-US",
    backendLanguage: "de",
  });

  assert.equal(parsed.success, false);
});

test("resolved global settings default to English CMS languages", () => {
  assert.deepEqual(
    DEFAULT_RESOLVED_GLOBAL_SETTINGS.languages,
    DEFAULT_CMS_LANGUAGE_SETTINGS,
  );
});

test("add-on i18n context carries separate frontend/backend language metadata", () => {
  const context = buildAddonI18nContext({
    languages: {
      frontendLanguage: "sr-Latn",
      backendLanguage: "de",
    },
    regional: {
      timezone: "Europe/Belgrade",
    },
  });

  assert.deepEqual(context, {
    frontendLanguage: "sr-Latn",
    backendLanguage: "de",
    frontendLocale: "sr-Latn-RS",
    backendLocale: "de-DE",
    frontendDirection: "ltr",
    backendDirection: "ltr",
    timezone: "Europe/Belgrade",
  });
});
