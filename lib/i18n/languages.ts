export const DEFAULT_CMS_LANGUAGE = "en";

export const SUPPORTED_CMS_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "sr-Latn", label: "Serbian Latin" },
  { code: "sr-Cyrl", label: "Serbian Cyrillic" },
  { code: "hr", label: "Croatian" },
  { code: "de", label: "German" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "pt-BR", label: "Portuguese Brazil" },
  { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" },
  { code: "tr", label: "Turkish" },
  { code: "mk", label: "Macedonian" },
  { code: "bs", label: "Bosnian" },
  { code: "sl", label: "Slovenian" },
  { code: "ru", label: "Russian" },
  { code: "hu", label: "Hungarian" },
  { code: "bg", label: "Bulgarian" },
  { code: "ja", label: "Japanese" },
  { code: "zh-Hans", label: "Chinese Simplified" },
  { code: "zh-Hant", label: "Chinese Traditional" },
  { code: "ar", label: "Arabic" },
  { code: "id", label: "Indonesian" },
  { code: "cs", label: "Czech" },
  { code: "ro", label: "Romanian" },
  { code: "el", label: "Greek" },
  { code: "da", label: "Danish" },
  { code: "sv", label: "Swedish" },
  { code: "nb", label: "Norwegian Bokmal" },
  { code: "nn", label: "Norwegian Nynorsk" },
  { code: "fi", label: "Finnish" },
  { code: "is", label: "Icelandic" },
] as const;

export type CmsLanguage = (typeof SUPPORTED_CMS_LANGUAGES)[number]["code"];

export type CmsLanguageSettings = {
  frontendLanguage: CmsLanguage;
  backendLanguage: CmsLanguage;
};

export const DEFAULT_CMS_LANGUAGE_SETTINGS: CmsLanguageSettings = {
  frontendLanguage: DEFAULT_CMS_LANGUAGE,
  backendLanguage: DEFAULT_CMS_LANGUAGE,
};

const CMS_LANGUAGE_CODES = new Set<string>(
  SUPPORTED_CMS_LANGUAGES.map((language) => language.code),
);

const CMS_LANGUAGE_LOCALES: Record<CmsLanguage, string> = {
  en: "en-US",
  "sr-Latn": "sr-Latn-RS",
  "sr-Cyrl": "sr-Cyrl-RS",
  hr: "hr-HR",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
  it: "it-IT",
  pt: "pt-PT",
  "pt-BR": "pt-BR",
  nl: "nl-NL",
  pl: "pl-PL",
  tr: "tr-TR",
  mk: "mk-MK",
  bs: "bs-BA",
  sl: "sl-SI",
  ru: "ru-RU",
  hu: "hu-HU",
  bg: "bg-BG",
  ja: "ja-JP",
  "zh-Hans": "zh-CN",
  "zh-Hant": "zh-TW",
  ar: "ar-SA",
  id: "id-ID",
  cs: "cs-CZ",
  ro: "ro-RO",
  el: "el-GR",
  da: "da-DK",
  sv: "sv-SE",
  nb: "nb-NO",
  nn: "nn-NO",
  fi: "fi-FI",
  is: "is-IS",
};

const LEGACY_LOCALE_LANGUAGE_MAP: Record<string, CmsLanguage> = {
  "en-US": "en",
  "en-GB": "en",
  "en-CA": "en",
  "en-AU": "en",
  "en-IN": "en",
  "sr-RS": "sr-Latn",
  "sr-Latn-RS": "sr-Latn",
  "sr-Cyrl-RS": "sr-Cyrl",
  "de-DE": "de",
  "de-AT": "de",
  "de-CH": "de",
  "fr-FR": "fr",
  "fr-CA": "fr",
  "fr-CH": "fr",
  "es-ES": "es",
  "es-MX": "es",
  "es-AR": "es",
  "es-CO": "es",
  "es-CL": "es",
  "it-IT": "it",
  "pt-PT": "pt",
  "pt-BR": "pt-BR",
  "nl-NL": "nl",
  "nl-BE": "nl",
  "sv-SE": "sv",
  "da-DK": "da",
  "nb-NO": "nb",
  "fi-FI": "fi",
  "pl-PL": "pl",
  "cs-CZ": "cs",
  "hu-HU": "hu",
  "ro-RO": "ro",
  "bg-BG": "bg",
  "el-GR": "el",
  "hr-HR": "hr",
  "bs-BA": "bs",
  "sl-SI": "sl",
  "mk-MK": "mk",
  "tr-TR": "tr",
  "ru-RU": "ru",
  "ar-SA": "ar",
  "zh-CN": "zh-Hans",
  "zh-TW": "zh-Hant",
  "ja-JP": "ja",
  "id-ID": "id",
};

export function isSupportedCmsLanguage(value: unknown): value is CmsLanguage {
  return typeof value === "string" && CMS_LANGUAGE_CODES.has(value);
}

export function normalizeCmsLanguage(value: unknown): CmsLanguage {
  if (isSupportedCmsLanguage(value)) return value;
  if (typeof value === "string") {
    return LEGACY_LOCALE_LANGUAGE_MAP[value] ?? DEFAULT_CMS_LANGUAGE;
  }

  return DEFAULT_CMS_LANGUAGE;
}

export function normalizeCmsLanguageSettings(input: {
  frontendLanguage?: unknown;
  backendLanguage?: unknown;
}): CmsLanguageSettings {
  return {
    frontendLanguage: normalizeCmsLanguage(input.frontendLanguage),
    backendLanguage: normalizeCmsLanguage(input.backendLanguage),
  };
}

export function cmsLanguageToLocale(language: CmsLanguage): string {
  return CMS_LANGUAGE_LOCALES[language];
}

export function getCmsLanguageDirection(language: CmsLanguage): "ltr" | "rtl" {
  return language === "ar" ? "rtl" : "ltr";
}
