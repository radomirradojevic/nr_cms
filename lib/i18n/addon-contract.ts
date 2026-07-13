import {
  cmsLanguageToLocale,
  getCmsLanguageDirection,
  type CmsLanguage,
  type CmsLanguageSettings,
} from "@/lib/i18n/languages";
import type { TextDirection } from "@/lib/i18n/types";

export type AddonI18nContext = {
  frontendLanguage: CmsLanguage;
  backendLanguage: CmsLanguage;
  frontendLocale: string;
  backendLocale: string;
  frontendDirection: TextDirection;
  backendDirection: TextDirection;
  timezone: string;
};

export type AddonI18nSettingsInput = {
  languages: CmsLanguageSettings;
  regional: {
    timezone: string;
  };
};

export function buildAddonI18nContext(
  settings: AddonI18nSettingsInput,
): AddonI18nContext {
  const frontendLanguage = settings.languages.frontendLanguage;
  const backendLanguage = settings.languages.backendLanguage;

  return {
    frontendLanguage,
    backendLanguage,
    frontendLocale: cmsLanguageToLocale(frontendLanguage),
    backendLocale: cmsLanguageToLocale(backendLanguage),
    frontendDirection: getCmsLanguageDirection(frontendLanguage),
    backendDirection: getCmsLanguageDirection(backendLanguage),
    timezone: settings.regional.timezone,
  };
}
