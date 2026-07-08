import {
  DEFAULT_CMS_LANGUAGE,
  cmsLanguageToLocale,
  normalizeCmsLanguage,
  type CmsLanguage,
} from "@/lib/i18n/languages";
import type { TranslationKey, TranslationPluralKey } from "@/lib/i18n/keys";
import type {
  Messages,
  PluralCategory,
  PluralMessages,
  TranslationValue,
  TranslationValues,
} from "@/lib/i18n/types";

export type TranslatePluralFn = (
  key: TranslationPluralKey | (string & {}),
  count: number,
  values?: TranslationValues,
) => string;

export type TranslateFn = {
  (key: TranslationKey | (string & {}), values?: TranslationValues): string;
  plural: TranslatePluralFn;
};

const PLURAL_CATEGORIES = new Set<string>([
  "zero",
  "one",
  "two",
  "few",
  "many",
  "other",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPluralMessages(value: unknown): value is PluralMessages {
  if (!isRecord(value)) return false;
  const entries = Object.entries(value);
  return (
    entries.length > 0 &&
    entries.every(
      ([key, message]) =>
        PLURAL_CATEGORIES.has(key) && typeof message === "string",
    )
  );
}

function getPath(messages: Messages, key: string): unknown {
  let current: unknown = messages;
  for (const segment of key.split(".")) {
    if (!segment || !isRecord(current) || !(segment in current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

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

function getPluralRules(language: CmsLanguage): Intl.PluralRules {
  try {
    return new Intl.PluralRules(cmsLanguageToLocale(language));
  } catch {
    return new Intl.PluralRules(cmsLanguageToLocale(DEFAULT_CMS_LANGUAGE));
  }
}

function resolveString(
  messages: Messages,
  fallbackMessages: Messages,
  key: string,
): string | undefined {
  const message = getPath(messages, key);
  if (typeof message === "string") return message;

  const fallback = getPath(fallbackMessages, key);
  if (typeof fallback === "string") return fallback;

  if (isPluralMessages(message)) {
    return message.other ?? Object.values(message).find(Boolean);
  }
  if (isPluralMessages(fallback)) {
    return fallback.other ?? Object.values(fallback).find(Boolean);
  }

  return undefined;
}

function resolvePluralMessages(
  messages: Messages,
  fallbackMessages: Messages,
  key: string,
): PluralMessages | undefined {
  const message = getPath(messages, key);
  if (isPluralMessages(message)) return message;

  const fallback = getPath(fallbackMessages, key);
  if (isPluralMessages(fallback)) return fallback;

  return undefined;
}

function selectPluralMessage(
  messages: PluralMessages,
  category: PluralCategory,
): string | undefined {
  return (
    messages[category] ??
    messages.other ??
    messages.one ??
    Object.values(messages).find(Boolean)
  );
}

/**
 * Missing translation keys return the key itself in every environment. This
 * keeps production rendering resilient while making dictionary gaps visible.
 */
export function createTranslator(
  messages: Messages,
  fallbackMessages: Messages,
  language: CmsLanguage = DEFAULT_CMS_LANGUAGE,
): TranslateFn {
  const normalizedLanguage = normalizeCmsLanguage(language);
  const pluralRules = getPluralRules(normalizedLanguage);

  const t = ((
    key: TranslationKey | (string & {}),
    values?: TranslationValues,
  ) => {
    const resolved = resolveString(messages, fallbackMessages, key);
    return resolved ? interpolate(resolved, values) : key;
  }) as TranslateFn;

  t.plural = (
    key: TranslationPluralKey | (string & {}),
    count: number,
    values?: TranslationValues,
  ) => {
    const pluralMessages = resolvePluralMessages(
      messages,
      fallbackMessages,
      key,
    );
    if (!pluralMessages) {
      return t(key, { count, ...values });
    }

    const category = pluralRules.select(count) as PluralCategory;
    const template = selectPluralMessage(pluralMessages, category);
    return template ? interpolate(template, { count, ...values }) : key;
  };

  return t;
}
