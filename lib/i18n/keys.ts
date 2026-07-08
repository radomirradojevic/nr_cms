import type { en } from "@/lib/i18n/messages/en";
import type { PluralTranslationPath, TranslationPath } from "@/lib/i18n/types";

export type TranslationKey = TranslationPath<typeof en>;

export type TranslationPluralKey = PluralTranslationPath<typeof en>;
