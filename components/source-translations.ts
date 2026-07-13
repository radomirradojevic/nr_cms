"use client";

import { useMemo } from "react";

import { useI18n } from "@/components/i18n-provider";
import { DEFAULT_CMS_LANGUAGE, type CmsLanguage } from "@/lib/i18n/languages";
import { localizeSourceString } from "@/lib/i18n/messages/localized";
import type { TranslationValue, TranslationValues } from "@/lib/i18n/types";

type LocalizedLanguage = Exclude<CmsLanguage, "en">;

export type SourceTranslateFn = (
  source: string,
  values?: TranslationValues,
) => string;

function stringifyValue(value: TranslationValue): string {
  if (value === null || value === undefined) return "";
  return value instanceof Date ? value.toISOString() : String(value);
}

function interpolate(template: string, values: TranslationValues = {}): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name: string) => {
    if (!(name in values)) return match;
    return stringifyValue(values[name]);
  });
}

export function useSourceTranslations(): SourceTranslateFn {
  const { language } = useI18n();

  return useMemo(
    () => (source: string, values?: TranslationValues) => {
      const template =
        language === DEFAULT_CMS_LANGUAGE
          ? source
          : localizeSourceString(source, language as LocalizedLanguage);

      return interpolate(template, values);
    },
    [language],
  );
}
