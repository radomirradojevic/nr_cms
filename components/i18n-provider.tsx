"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import {
  DEFAULT_CMS_LANGUAGE,
  getCmsLanguageDirection,
  type CmsLanguage,
} from "@/lib/i18n/languages";
import { en } from "@/lib/i18n/messages/en";
import {
  createTranslator,
  type TranslateFn,
  type TranslatePluralFn,
} from "@/lib/i18n/translate";
import type { Messages, TextDirection } from "@/lib/i18n/types";

type I18nContextValue = {
  language: CmsLanguage;
  direction: TextDirection;
  t: TranslateFn;
  tPlural: TranslatePluralFn;
};

type I18nProviderProps = {
  language: CmsLanguage;
  direction: TextDirection;
  messages: Messages;
  children?: ReactNode;
};

const fallbackTranslator = createTranslator(en, en, DEFAULT_CMS_LANGUAGE);

const fallbackContext: I18nContextValue = {
  language: DEFAULT_CMS_LANGUAGE,
  direction: getCmsLanguageDirection(DEFAULT_CMS_LANGUAGE),
  t: fallbackTranslator,
  tPlural: fallbackTranslator.plural,
};

const I18nContext = createContext<I18nContextValue>(fallbackContext);

export function I18nProvider({
  language,
  direction,
  messages,
  children,
}: I18nProviderProps) {
  const t = useMemo(
    () => createTranslator(messages, en, language),
    [language, messages],
  );
  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      direction,
      t,
      tPlural: t.plural,
    }),
    [direction, language, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

export function useTranslations(): TranslateFn {
  return useI18n().t;
}
