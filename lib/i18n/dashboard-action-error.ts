import type { TranslationKey } from "@/lib/i18n/keys";
import type { TranslateFn } from "@/lib/i18n/translate";
import type { TranslationValues } from "@/lib/i18n/types";

export type DashboardActionError = {
  code: TranslationKey;
  message?: string;
  values?: TranslationValues;
};

export type DashboardActionErrorLike = string | DashboardActionError;

export function getActionErrorMessage(
  error: DashboardActionErrorLike,
  t: TranslateFn,
): string {
  return typeof error === "string"
    ? error
    : (error.message ?? t(error.code, error.values));
}
