# Phase 01 - Global settings language foundation

## Goal

Add the persistent language foundation for CMS internationalization without
translating UI strings yet.

This phase adds:

- a canonical CMS language list;
- frontend and backend language settings in `global_settings`;
- normalization/migration from the current `default_language`;
- Global Settings UI controls under General -> Regional Settings;
- cache invalidation and refresh behavior after save;
- tests for validation and fallback behavior.

This phase must not start broad string migration. It only creates the stable
data model and settings surface that later phases will consume.

## Non-goals

- Do not translate dashboard labels in this phase.
- Do not translate public content or user-authored content.
- Do not implement URL locale routing.
- Do not create `middleware.ts`; this project uses Next.js proxy rules and the
  file must remain `proxy.ts`.
- Do not change the existing timezone behavior except where the form layout is
  updated.
- Do not introduce external i18n packages unless a later phase explicitly
  decides to do so.

## Existing files to inspect first

- `db/schema.ts`
- `drizzle/0025_regional_settings.sql`
- `drizzle/0026_expand_supported_locales.sql`
- `drizzle/0027_expand_supported_timezones.sql`
- `lib/regional-settings.ts`
- `lib/global-settings.ts`
- `data/global-settings.ts`
- `app/dashboard/global-settings/settings-form.tsx`
- `app/dashboard/global-settings/actions.ts`
- `app/layout.tsx`
- `components/regional-settings-provider.tsx`
- `tests/content-schedule.test.ts`
- `tests/appearance.test.ts`
- `tests/ai-settings.test.ts`

## Language model decision

The existing `defaultLanguage` is currently an `Intl` locale used for date and
metadata formatting. It is not a UI translation language.

Create a separate CMS UI language model with compact BCP-47 style codes:

```ts
export const DEFAULT_CMS_LANGUAGE = "en";

export const SUPPORTED_CMS_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "sr-Latn", label: "Serbian Latin" },
  { code: "sr-Cyrl", label: "Serbian Cyrillic" },
  { code: "hr", label: "Croatian" },
  { code: "de", label: "German" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "pt-BR", label: "Portuguese Brazil" },
  { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" },
  { code: "tr", label: "Turkish" },
  { code: "mk", label: "Macedonian" },
  { code: "bs", label: "Bosnian" },
  { code: "sl", label: "Slovenian" },
  { code: "ru", label: "Russian" },
  { code: "hu", label: "Hungarian" },
  { code: "bg", label: "Bulgarian" },
  { code: "ja", label: "Japanese" },
  { code: "zh-Hans", label: "Chinese Simplified" },
  { code: "zh-Hant", label: "Chinese Traditional" },
  { code: "ar", label: "Arabic" },
  { code: "id", label: "Indonesian" },
  { code: "cs", label: "Czech" },
  { code: "ro", label: "Romanian" },
  { code: "el", label: "Greek" },
  { code: "da", label: "Danish" },
  { code: "sv", label: "Swedish" },
  { code: "nb", label: "Norwegian Bokmal" },
  { code: "nn", label: "Norwegian Nynorsk" },
  { code: "fi", label: "Finnish" },
  { code: "is", label: "Icelandic" },
] as const;
```

Use this list for CMS system language. Keep `SUPPORTED_LOCALES` for regional
formatting unless a later phase deliberately consolidates it.

## Data model

Add two columns to `global_settings`:

```sql
ALTER TABLE "global_settings"
  ADD COLUMN "frontend_language" text DEFAULT 'en' NOT NULL;

ALTER TABLE "global_settings"
  ADD COLUMN "backend_language" text DEFAULT 'en' NOT NULL;
```

Add check constraints that exactly mirror `SUPPORTED_CMS_LANGUAGES`.

Recommended constraint names:

```text
global_settings_frontend_language_check
global_settings_backend_language_check
```

Do not remove `default_language` in this phase. Keep it as a legacy/regional
field so old deployments and existing date-formatting code remain safe.

## Migration behavior

The migration must backfill the new fields from existing `default_language`.

Mapping rules:

```text
en-US, en-GB, en-CA, en-AU, en-IN -> en
sr-RS, sr-Latn-RS -> sr-Latn
sr-Cyrl-RS -> sr-Cyrl
de-DE, de-AT, de-CH -> de
fr-FR, fr-CA, fr-CH -> fr
es-ES, es-MX, es-AR, es-CO, es-CL -> es
it-IT -> it
pt-PT -> pt
pt-BR -> pt-BR
nl-NL, nl-BE -> nl
sv-SE -> sv
da-DK -> da
nb-NO -> nb
fi-FI -> fi
pl-PL -> pl
cs-CZ -> cs
hu-HU -> hu
ro-RO -> ro
bg-BG -> bg
el-GR -> el
hr-HR -> hr
bs-BA -> bs
sl-SI -> sl
mk-MK -> mk
tr-TR -> tr
ru-RU -> ru
ar-SA -> ar
zh-CN -> zh-Hans
zh-TW -> zh-Hant
ja-JP -> ja
id-ID -> id
```

Unsupported legacy values should fall back to `en`.

Use SQL `CASE` for the backfill. Keep the statement deterministic and readable.

## TypeScript model

Create or extend a file such as `lib/i18n/languages.ts`:

```ts
export type CmsLanguage = (typeof SUPPORTED_CMS_LANGUAGES)[number]["code"];

export type CmsLanguageSettings = {
  frontendLanguage: CmsLanguage;
  backendLanguage: CmsLanguage;
};

export const DEFAULT_CMS_LANGUAGE_SETTINGS = {
  frontendLanguage: DEFAULT_CMS_LANGUAGE,
  backendLanguage: DEFAULT_CMS_LANGUAGE,
} as const;
```

Required helpers:

```ts
export function isSupportedCmsLanguage(value: unknown): value is CmsLanguage;
export function normalizeCmsLanguage(value: unknown): CmsLanguage;
export function normalizeCmsLanguageSettings(input: {
  frontendLanguage?: unknown;
  backendLanguage?: unknown;
}): CmsLanguageSettings;
export function cmsLanguageToLocale(language: CmsLanguage): string;
export function getCmsLanguageDirection(language: CmsLanguage): "ltr" | "rtl";
```

`getCmsLanguageDirection` returns `rtl` only for `ar` in the initial release.

`cmsLanguageToLocale` should map compact UI language to a stable locale for
`Intl`, for example:

```text
en -> en-US
sr-Latn -> sr-Latn-RS
sr-Cyrl -> sr-Cyrl-RS
zh-Hans -> zh-CN
zh-Hant -> zh-TW
pt -> pt-PT
pt-BR -> pt-BR
ar -> ar-SA
```

## Global settings schema changes

In `db/schema.ts`:

1. Add `frontendLanguage`.
2. Add `backendLanguage`.
3. Add DB check constraints for both.
4. Keep `defaultLanguage` and `timezone` untouched.

In `lib/global-settings.ts`:

1. Import the CMS language list/helpers.
2. Add `CmsLanguageSettingsSchema` or inline zod enums using
   `SUPPORTED_CMS_LANGUAGES`.
3. Add `frontendLanguage` and `backendLanguage` to
   `UpdateGlobalSettingsSchema`.
4. Extend `ResolvedGlobalSettings` with:

```ts
languages: CmsLanguageSettings;
```

5. Extend `DEFAULT_RESOLVED_GLOBAL_SETTINGS.languages`.
6. When parsing rows, normalize missing/invalid values to English.
7. Add missing-column fallback detection similar to the existing regional and AI
   column fallback logic.
8. Bump the `unstable_cache` key after adding fields.

In `data/global-settings.ts`:

1. Include the two new columns in `loadGlobalSettingsRows`.
2. Include the two new columns in `loadRawGlobalSettingsRows`.
3. Include fields in `GlobalSettingsAdminFormRow`.
4. Include fields in the `values` object inside `updateGlobalSettings`.
5. Add missing-column fallback detection to keep old databases safe during
   rolling deployment.

## Global Settings UI

In `app/dashboard/global-settings/settings-form.tsx`:

1. Add state:

```ts
const [frontendLanguage, setFrontendLanguage] = useState(
  settings?.frontendLanguage ?? DEFAULT_CMS_LANGUAGE,
);
const [backendLanguage, setBackendLanguage] = useState(
  settings?.backendLanguage ?? DEFAULT_CMS_LANGUAGE,
);
```

2. Replace the current single language control in Regional Settings with:

```text
Frontend language
Backend language
Timezone
```

3. Keep the old `Default language` control only if it is still required for
   regional `Intl` behavior. Preferred UI copy:

```text
Frontend language
Controls system labels and messages shown on the public site.

Backend language
Controls CMS dashboard labels, help text, and system messages.

Regional locale
Controls date, time, and language metadata.

Timezone
Controls date and scheduling display.
```

4. Include `frontendLanguage` and `backendLanguage` in the save payload.
5. After successful save, call `router.refresh()` if either language changed so
   server components and providers reload.
6. Keep existing lock behavior via `requireAdminSectionLock`.

Do not translate these labels yet. Translation starts in Phase 02/03.

## Root layout behavior

In `app/layout.tsx`, do not change `html lang` to backend language.

Recommended behavior after this phase:

```text
html lang -> settings.languages.frontendLanguage mapped to locale or compact code
html dir  -> getCmsLanguageDirection(settings.languages.frontendLanguage)
RegionalSettingsProvider -> existing regional settings
```

If `html lang` must remain `settings.regional.defaultLanguage` until Phase 02,
document that choice in the PR and do not mix backend language into root HTML.

## Tests

Add focused unit tests for:

- `isSupportedCmsLanguage`.
- `normalizeCmsLanguage`.
- legacy locale to CMS language mapping.
- `getCmsLanguageDirection`.
- `cmsLanguageToLocale`.
- `UpdateGlobalSettingsSchema` accepts every supported code.
- `UpdateGlobalSettingsSchema` rejects unsupported codes.
- defaults are English when database values are missing.

Add or update a Global Settings test if the project has page-level tests.

## Manual QA

1. Open `/dashboard/global-settings`.
2. Confirm General -> Regional Settings shows frontend and backend language.
3. Save `de` for backend and `sr-Latn` for frontend.
4. Refresh the page.
5. Confirm selected values persist.
6. Confirm no dashboard labels are translated yet.
7. Confirm date/time formatting still uses existing regional locale/timezone.

## Acceptance criteria

- Database has `frontend_language` and `backend_language`.
- Both fields default to `en`.
- Both fields are constrained to supported CMS language codes.
- Existing installations get safe backfilled values.
- Global Settings UI can save both values.
- `getGlobalSettings()` exposes normalized language settings.
- Typecheck passes.
- Existing tests pass.
- No broad UI string translation happens in this phase.

