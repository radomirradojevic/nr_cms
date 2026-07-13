import { normalizeCmsLanguage } from "@/lib/i18n/languages";
import { MESSAGE_LOADERS } from "@/lib/i18n/messages";
import type { Messages } from "@/lib/i18n/types";

export async function loadMessages(language: unknown): Promise<Messages> {
  const normalizedLanguage = normalizeCmsLanguage(language);
  return MESSAGE_LOADERS[normalizedLanguage]();
}
