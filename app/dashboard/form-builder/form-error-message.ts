import type { SourceTranslateFn } from "@/components/source-translations";

const LOCK_PREFIX = "This form is currently being edited by ";
const LOCK_SUFFIX = ". Wait until the current editor closes the page.";
const LOCK_SOURCE =
  "This form is currently being edited by {name}. Wait until the current editor closes the page.";

export function translateFormBuilderError(
  st: SourceTranslateFn,
  error: string,
): string {
  if (error.startsWith(LOCK_PREFIX) && error.endsWith(LOCK_SUFFIX)) {
    return st(LOCK_SOURCE, {
      name: error.slice(LOCK_PREFIX.length, error.length - LOCK_SUFFIX.length),
    });
  }

  return st(error);
}
