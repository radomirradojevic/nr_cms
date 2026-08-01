# Phase 07 - Dictionaries and key coverage tests

## Goal

Populate translation dictionaries for all supported CMS languages and add tests
that prevent missing keys from reaching release.

This phase turns the infrastructure into a complete multilingual product
surface.

Supported languages:

```text
en
sr-Latn
sr-Cyrl
hr
de
fr
es
it
pt
pt-BR
nl
pl
tr
mk
bs
sl
ru
hu
bg
ja
zh-Hans
zh-Hant
ar
id
cs
ro
el
da
sv
nb
nn
fi
is
```

## Non-goals

- Do not translate user-authored content.
- Do not build a translation management UI.
- Do not fetch translations from external services at runtime.
- Do not localize master license-server internals.
- Do not require all paid add-on private dictionaries to live in the public CMS
  repo.

## Existing files to inspect first

- `lib/i18n/languages.ts`
- `lib/i18n/messages/en.ts`
- `lib/i18n/messages/*`
- `lib/i18n/translate.ts`
- `lib/i18n/server.ts`
- all files migrated in Phases 03 to 06
- tests created in earlier phases

## File structure

Use one dictionary file per language:

```text
lib/i18n/messages/en.ts
lib/i18n/messages/sr-Latn.ts
lib/i18n/messages/sr-Cyrl.ts
lib/i18n/messages/hr.ts
...
lib/i18n/messages/is.ts
```

If TypeScript import paths with hyphenated filenames become awkward, use a
stable map file:

```text
lib/i18n/messages/index.ts
```

Example:

```ts
import { en } from "./en";
import { srLatn } from "./sr-Latn";

export const MESSAGE_LOADERS = {
  en: async () => en,
  "sr-Latn": async () => srLatn,
} satisfies Record<CmsLanguage, () => Promise<Messages>>;
```

## English source-of-truth rule

`en.ts` is the canonical schema. Every other dictionary must have:

- every key present in English;
- the same object shape;
- valid string/plural leaf values;
- no extra keys unless explicitly allowed.

Do not let translated dictionaries define new keys that English does not have.
Extra keys hide dead code and make cleanup harder.

## Dictionary leaf types

Allowed leaf values:

```ts
type MessageLeaf =
  | string
  | {
      one?: string;
      two?: string;
      few?: string;
      many?: string;
      other: string;
      zero?: string;
    };
```

Nested objects are allowed. Arrays are not allowed in dictionaries.

If a UI needs a list, use separate keys:

```text
dashboard.globalSettings.tabs.general
dashboard.globalSettings.tabs.system
```

not:

```ts
tabs: ["General", "System"]
```

## Placeholder validation

Every translated message must preserve placeholders from English.

Example:

```ts
en: "Revision #{revisionNumber} restored."
de: "Revision #{revisionNumber} wurde wiederhergestellt."
```

If English has `{count}`, translated message must have `{count}` unless the key
is explicitly marked as no-placeholder.

Add a test helper that extracts placeholders with:

```text
/\{([a-zA-Z0-9_]+)\}/g
```

Compare sets.

## Plural validation

For plural objects:

- `other` is required;
- placeholder sets must match English per plural branch where possible;
- if English has `one` and `other`, translation may add `few`, `many`, etc.;
- translation cannot omit `other`;
- translation cannot replace plural object with string.

Arabic should include enough plural categories for quality:

```text
zero
one
two
few
many
other
```

Slavic languages should include:

```text
one
few
many
other
```

If not all forms are initially available, `other` fallback is acceptable only
if documented. The key coverage test still passes as long as shape rules are
met.

## Coverage tests

Create tests such as:

```text
tests/i18n-dictionaries.test.ts
```

Test cases:

1. `SUPPORTED_CMS_LANGUAGES` has a message loader for every language.
2. Every dictionary has all English keys.
3. No dictionary has extra keys.
4. Leaf type matches English leaf type.
5. String placeholders match English.
6. Plural object placeholders are compatible.
7. Every language can create a translator without throwing.
8. `t` returns non-empty value for representative keys.
9. `tPlural` returns non-empty value for representative plural keys.

## Used-key coverage

Optional but recommended:

- Add a script/test that scans source files for `t("...")` and
  `tPlural("...")`.
- Verify every literal key exists in English.

Do not block on dynamic keys from helpers if static scan becomes brittle. For
dynamic helpers, add explicit tests.

Recommended test strategy:

- static scan for direct literals;
- unit tests for dynamic key helper functions;
- dictionary shape coverage for all languages.

## Translation quality rules

General:

- Preserve product names: `Night Raven CMS`, `Webshop`, `OpenAI`, model names.
- Preserve environment variable names exactly.
- Preserve code identifiers and route paths exactly.
- Preserve placeholders exactly.
- Avoid overly long labels in buttons.
- Avoid informal slang in system/error messages.
- Use consistent terminology for "dashboard", "content", "settings",
  "publish", "archive", "upload", "license".

Serbian:

- `sr-Latn` must use Latin script only.
- `sr-Cyrl` must use Cyrillic script only.
- Do not mix scripts except product names, code, routes, and env vars.

Bosnian/Croatian/Slovenian/Macedonian:

- Do not reuse Serbian blindly if terminology differs.
- Product names stay unchanged.

Portuguese:

- `pt` is Portugal/default Portuguese.
- `pt-BR` is Brazilian Portuguese.

Chinese:

- `zh-Hans` uses Simplified Chinese.
- `zh-Hant` uses Traditional Chinese.

Norwegian:

- `nb` is Bokmal.
- `nn` is Nynorsk.

Arabic:

- Use RTL-appropriate punctuation where possible.
- Preserve LTR code snippets/env vars.

## Loading strategy

Avoid bundling all dictionaries into client JS.

Server:

- load requested dictionary via dynamic import;
- fall back to English.

Client:

- provider receives only active messages.

If dynamic imports with variable paths are unreliable, use a map:

```ts
const MESSAGE_LOADERS = {
  en: () => import("./messages/en").then((m) => m.en),
  de: () => import("./messages/de").then((m) => m.de),
};
```

The map must satisfy `Record<CmsLanguage, Loader>`.

## Incremental translation process

Recommended steps:

1. Freeze English key shape.
2. Run key coverage test against English only.
3. Create translated files with English copies as placeholders.
4. Fill high-risk languages first:
   - `sr-Latn`
   - `sr-Cyrl`
   - `de`
   - `fr`
   - `es`
   - `ar`
   - `zh-Hans`
   - `zh-Hant`
5. Fill remaining languages.
6. Run dictionary tests.
7. Manual QA in a sample set of languages.

Do not leave English copies in non-English dictionaries unless explicitly
marked as untranslated debt. The release acceptance should require completion.

## Tests

Required:

- `npm run typecheck`
- `npm run test`
- `tests/i18n-dictionaries.test.ts`

Add focused tests for:

- Serbian Latin dictionary contains no Cyrillic code points except allowed
  product/code values.
- Serbian Cyrillic dictionary contains expected Cyrillic labels.
- Arabic direction helper returns `rtl`.
- Chinese simplified/traditional dictionary loaders are distinct.

The script/codepoint tests can be lightweight and sample representative keys
instead of scanning every string if false positives are high.

## Manual QA matrix

Smoke test these languages at minimum:

```text
en
sr-Latn
sr-Cyrl
de
fr
es
ar
ja
zh-Hans
zh-Hant
```

For each:

1. Set backend language.
2. Open `/dashboard`.
3. Open `/dashboard/global-settings`.
4. Open content list.
5. Open file manager.
6. Trigger one validation error.
7. Confirm strings are not English except product/code names.

For frontend:

1. Set frontend language.
2. Open search page.
3. Open missing homepage fallback if possible.
4. Submit an invalid public form.
5. Confirm public system messages use frontend language.

## Acceptance criteria

- Every supported language has a dictionary file or loader.
- Every dictionary matches English key shape.
- Placeholder parity tests pass.
- Plural shape tests pass.
- Static used-key tests pass for direct keys.
- English fallback remains safe.
- Manual QA covers representative LTR, RTL, Latin, Cyrillic, and CJK languages.
- Typecheck and tests pass.

