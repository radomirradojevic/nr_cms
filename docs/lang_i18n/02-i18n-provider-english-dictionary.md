# Phase 02 - I18n provider and English dictionary

## Goal

Introduce the internal i18n runtime and the canonical English dictionary.

This phase creates the translation infrastructure used by all later phases:

- server translation helpers;
- client translation provider and hook;
- typed dictionary shape;
- interpolation/plural helpers;
- source-of-truth English messages;
- fallback behavior when a key or language is missing.

Only a minimal set of visible strings should be migrated in this phase, enough
to prove the infrastructure works. Broad dashboard migration belongs to later
phases.

## Non-goals

- Do not translate all dashboard modules yet.
- Do not add every target language dictionary yet.
- Do not use URL locale segments.
- Do not translate user-authored database content.
- Do not fetch translations from a remote service.
- Do not make Server Actions return translated display strings as the only
  contract. Prefer stable codes plus optional fallback text when practical.

## Existing files to inspect first

- `app/layout.tsx`
- `app/dashboard/layout.tsx`
- `components/regional-settings-provider.tsx`
- `lib/regional-settings.ts`
- `lib/global-settings.ts`
- `data/global-settings.ts`
- `components/site-admin-menu.tsx`
- `components/site-search.tsx`
- `components/site-top-menu-mobile.tsx`
- `app/page.tsx`
- `app/search/page.tsx`
- `components/content-unauthorized.tsx`
- `components/content-unpublished.tsx`
- `components/ui/sonner.tsx`

## Architecture decision

Use a small local dictionary runtime instead of external i18n routing.

Reasons:

- the project has site-wide language settings, not per-route locale prefixes;
- Next.js 16 differences make a minimal local runtime lower risk;
- Server Components and Client Components both need translations;
- paid add-ons need a stable contract that can receive dictionary helpers or
  language codes.

Recommended directory:

```text
lib/i18n/
  languages.ts
  keys.ts
  messages/
    en.ts
  server.ts
  translate.ts
  types.ts
components/
  i18n-provider.tsx
```

## Dictionary shape

Use nested objects for authoring and dot-path keys for lookup.

Example:

```ts
export const en = {
  common: {
    actions: {
      save: "Save",
      saveChanges: "Save changes",
      saving: "Saving...",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      create: "Create",
      search: "Search",
      close: "Close",
      open: "Open",
      back: "Back",
    },
    states: {
      loading: "Loading...",
      notFound: "Not found.",
      unauthorized: "Unauthorized.",
      forbidden: "Forbidden.",
      required: "Required",
    },
  },
  dashboard: {
    nav: {
      dashboard: "Dashboard",
      content: "Content",
      globalSettings: "Global Settings",
    },
  },
} as const;
```

Generate or infer a `TranslationKey` type from `en`.

Do not make translation keys equal to English sentences. Use semantic keys.

Good:

```text
globalSettings.general.regional.backendLanguage.label
```

Bad:

```text
Backend language
```

## Translation helpers

Create `lib/i18n/translate.ts` with pure helpers:

```ts
export type TranslationValues = Record<
  string,
  string | number | boolean | Date | null | undefined
>;

export function createTranslator(
  messages: Messages,
  fallbackMessages: Messages,
): TranslateFn;
```

The `TranslateFn` should support:

```ts
t("common.actions.save")
t("search.resultsCount", { count: 3 })
t.rich? // optional, do not implement unless needed
```

Interpolation format:

```text
Hello, {name}
```

For missing keys:

1. return English fallback if present;
2. otherwise return the key in development;
3. otherwise return an empty string or key according to a documented choice.

Do not throw during production rendering because a missing translation should
not break the CMS.

## Plural support

Implement a simple plural helper for count-sensitive strings.

Recommended API:

```ts
tPlural("search.results", count, { count })
```

Dictionary shape:

```ts
search: {
  results: {
    one: "{count} result",
    other: "{count} results",
  },
}
```

Use `Intl.PluralRules(language)` internally. Fall back to `other`.

This is enough for English and prepares Slavic/Arabic rules later.

## Server helper

Create `lib/i18n/server.ts`.

Required functions:

```ts
export async function getI18nSettings(): Promise<{
  frontendLanguage: CmsLanguage;
  backendLanguage: CmsLanguage;
  frontendDirection: "ltr" | "rtl";
  backendDirection: "ltr" | "rtl";
}>;

export async function getTranslations(scope: "frontend" | "backend") {
  const settings = await getGlobalSettings();
  const language =
    scope === "frontend"
      ? settings.languages.frontendLanguage
      : settings.languages.backendLanguage;
  return createTranslator(await loadMessages(language), en);
}
```

Message loading:

- Phase 02 can load only English.
- `loadMessages(language)` should return English for all languages until Phase
  07 fills dictionaries.
- Keep the function asynchronous so later dynamic imports are easy.

Do not make `getTranslations` call `getGlobalSettings()` repeatedly inside
loops. Get the translator once per server component or action.

## Client provider

Create `components/i18n-provider.tsx`.

It should expose:

```ts
export function I18nProvider({
  language,
  direction,
  messages,
  children,
}: Props);

export function useTranslations(): TranslateFn;
export function useI18n(): {
  language: CmsLanguage;
  direction: "ltr" | "rtl";
  t: TranslateFn;
  tPlural: TranslatePluralFn;
};
```

Provider should be small and serializable. Pass only the active dictionary.

Avoid putting huge per-language maps for all languages into the client bundle.

## Layout integration

In `app/layout.tsx`:

1. Load global settings once.
2. Resolve frontend language and direction.
3. Load frontend messages.
4. Wrap public shell and children with `I18nProvider`.
5. Set:

```tsx
<html lang={cmsLanguageToLocale(settings.languages.frontendLanguage)}
      dir={getCmsLanguageDirection(settings.languages.frontendLanguage)}>
```

6. Keep `RegionalSettingsProvider` for date/time formatting.

In `app/dashboard/layout.tsx`:

1. Load backend language and direction.
2. Wrap dashboard children with a backend `I18nProvider`.
3. Ensure nested provider overrides public frontend provider for dashboard
   client components.
4. Do not break `Toaster`.

Potential pattern:

```tsx
<I18nProvider
  language={settings.languages.backendLanguage}
  direction={getCmsLanguageDirection(settings.languages.backendLanguage)}
  messages={messages}
>
  {children}
  <Toaster ... />
</I18nProvider>
```

## Initial keys to include

Add English keys for shared UI before broad migration:

```text
common.actions.*
common.states.*
common.validation.*
common.auth.signIn
common.auth.signUp
common.auth.signOut
common.auth.account
dashboard.nav.*
dashboard.sections.admin
search.title
search.placeholder
search.loading
search.noResults
search.resultType.page
search.resultType.blogPost
globalSettings.title
globalSettings.description
globalSettings.tabs.general
globalSettings.tabs.layoutDesign
globalSettings.tabs.ai
globalSettings.tabs.system
```

Keep English wording exactly as the current UI where possible.

## Server Action result strategy

For later phases, prefer this shape where practical:

```ts
type ActionResult =
  | { success: true }
  | {
      error: {
        code: string;
        message: string;
        values?: Record<string, string | number>;
      };
    };
```

During migration, existing `{ error: string }` can remain. Do not force a full
action-result refactor in Phase 02.

When a client receives a known code, it can call:

```ts
toast.error(t(error.code, error.values));
```

When only `error: string` exists, display the legacy string until that module is
migrated.

## Tests

Add tests for:

- missing key fallback;
- interpolation;
- plural selection;
- English dictionary load;
- unknown language falls back to English;
- `I18nProvider` hook returns stable language/direction values if component
  tests exist;
- TypeScript compile checks for `TranslationKey`.

Add a dictionary shape test if it can be written without Phase 07 coverage.

## Manual QA

1. Set backend language to `de`.
2. Confirm UI still displays English because only English dictionary exists.
3. Confirm no crash.
4. Set frontend language to `ar`.
5. Confirm `html dir="rtl"` only if Phase 01/02 enables direction in root.
6. Confirm dashboard provider can use backend language independently from
   frontend.

## Acceptance criteria

- Local i18n runtime exists.
- English dictionary is source-of-truth.
- Server and client components can access translations.
- Missing language falls back to English.
- Missing key behavior is documented and tested.
- Root layout can provide frontend language context.
- Dashboard layout can provide backend language context.
- No broad module migration is attempted yet.
- Typecheck passes.

