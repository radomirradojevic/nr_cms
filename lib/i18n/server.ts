import "server-only";

import { getGlobalSettings } from "@/data/global-settings";
import { loadMessages } from "@/lib/i18n/load-messages";
import { en } from "@/lib/i18n/messages/en";
import {
  getCmsLanguageDirection,
  type CmsLanguage,
} from "@/lib/i18n/languages";
import { createTranslator } from "@/lib/i18n/translate";
import type { TextDirection } from "@/lib/i18n/types";

export { loadMessages } from "@/lib/i18n/load-messages";

export type I18nSettings = {
  frontendLanguage: CmsLanguage;
  backendLanguage: CmsLanguage;
  frontendDirection: TextDirection;
  backendDirection: TextDirection;
};

export async function getI18nSettings(): Promise<I18nSettings> {
  const settings = await getGlobalSettings();
  const frontendLanguage = settings.languages.frontendLanguage;
  const backendLanguage = settings.languages.backendLanguage;

  return {
    frontendLanguage,
    backendLanguage,
    frontendDirection: getCmsLanguageDirection(frontendLanguage),
    backendDirection: getCmsLanguageDirection(backendLanguage),
  };
}

export async function getTranslations(scope: "frontend" | "backend") {
  const settings = await getGlobalSettings();
  const language =
    scope === "frontend"
      ? settings.languages.frontendLanguage
      : settings.languages.backendLanguage;
  const messages = await loadMessages(language);

  return createTranslator(messages, en, language);
}
