import type { TranslationKey } from "@/lib/i18n/keys";
import type { TranslateFn } from "@/lib/i18n/translate";
import type { TranslationValues } from "@/lib/i18n/types";

export type PublicMessage = {
  code: TranslationKey;
  message?: string;
  values?: TranslationValues;
};

export type PublicMessageLike = string | PublicMessage;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTranslationValues(value: unknown): value is TranslationValues {
  if (!isRecord(value)) return false;
  return Object.values(value).every(
    (item) =>
      item === null ||
      item === undefined ||
      typeof item === "string" ||
      typeof item === "number" ||
      typeof item === "boolean" ||
      item instanceof Date,
  );
}

export function publicMessage(
  code: TranslationKey,
  message: string,
  values?: TranslationValues,
): PublicMessage {
  return values ? { code, message, values } : { code, message };
}

export function isPublicMessage(value: unknown): value is PublicMessage {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    (value.message === undefined || typeof value.message === "string") &&
    (value.values === undefined || isTranslationValues(value.values))
  );
}

export function getPublicMessageText(
  error: PublicMessageLike,
  t: TranslateFn,
): string {
  if (typeof error === "string") return error;

  const translated = t(error.code, error.values);
  return translated === error.code ? (error.message ?? translated) : translated;
}

export function getPublicMessageTextFromUnknown(
  error: unknown,
  t: TranslateFn,
  fallback: PublicMessage,
): string {
  if (typeof error === "string") return error;
  if (isPublicMessage(error)) return getPublicMessageText(error, t);
  return getPublicMessageText(fallback, t);
}
