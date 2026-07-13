# Phase 04 - Core dashboard modules i18n

## Goal

Migrate the main CMS backend modules to backend-language translations.

This phase is the largest dashboard migration. It covers system labels, help
text, form labels, dialog copy, table headers, filters, toast messages, and
Server Action/API display errors for core dashboard modules.

Core modules:

- content;
- files;
- galleries;
- forms;
- menus;
- users;
- global settings;
- dashboard landing page.

## Non-goals

- Do not translate public-facing form field labels or options created by users.
- Do not translate content titles, slugs, category names, file names, gallery
  names, menu item labels, or user names from the database.
- Do not translate private paid add-on internals. That is Phase 06.
- Do not solve content localization. That is a separate feature after these
  eight phases.

## Existing files to inspect first

Content:

- `app/dashboard/content/page.tsx`
- `app/dashboard/content/content-table.tsx`
- `app/dashboard/content/content-table-container.tsx`
- `app/dashboard/content/content-form.tsx`
- `app/dashboard/content/content-row-actions.tsx`
- `app/dashboard/content/deleted-content-row-actions.tsx`
- `app/dashboard/content/batch-actions.tsx`
- `app/dashboard/content/actions.ts`
- `app/dashboard/content/comment-actions.ts`
- `app/dashboard/content/content-history-panel.tsx`
- `app/dashboard/content/revision-preview-restore-button.tsx`
- `app/dashboard/content/_hero-slider/*`
- `app/dashboard/content/_editors/*`
- `app/dashboard/content/_builder/*`
- `lib/content-status.ts`
- `lib/content-schedule.ts`

Files and galleries:

- `app/dashboard/filemanager/page.tsx`
- `app/dashboard/filemanager/file-manager.tsx`
- `app/dashboard/filemanager/file-card.tsx`
- `app/dashboard/filemanager/folder-dialogs.tsx`
- `app/dashboard/filemanager/upload-dropzone.tsx`
- `app/dashboard/filemanager/actions.ts`
- `app/dashboard/gallerymanager/page.tsx`
- `app/dashboard/gallerymanager/gallery-list.tsx`
- `app/dashboard/gallerymanager/*dialog*.tsx`
- `app/dashboard/gallerymanager/[id]/*`
- `app/dashboard/gallerymanager/actions.ts`

Forms:

- `app/dashboard/form-builder/page.tsx`
- `app/dashboard/form-builder/forms-list.tsx`
- `app/dashboard/form-builder/create-form-dialog.tsx`
- `app/dashboard/form-builder/delete-form-dialog.tsx`
- `app/dashboard/form-builder/reassign-form-dialog.tsx`
- `app/dashboard/form-builder/[id]/page.tsx`
- `app/dashboard/form-builder/[id]/form-editor.tsx`
- `app/dashboard/form-builder/[id]/field-builder.tsx`
- `app/dashboard/form-builder/[id]/form-settings-form.tsx`
- `app/dashboard/form-builder/[id]/submissions/*`
- `app/dashboard/form-builder/actions.ts`

Menus and users:

- `app/dashboard/menus/page.tsx`
- `app/dashboard/menus/[menuId]/page.tsx`
- `app/dashboard/menus/*dialog*.tsx`
- `app/dashboard/top-menu/*`
- `app/dashboard/users/page.tsx`
- `app/dashboard/users/[userId]/*`
- `app/dashboard/users/_components/*`

Global settings:

- `app/dashboard/global-settings/page.tsx`
- `app/dashboard/global-settings/settings-form.tsx`
- `app/dashboard/global-settings/logo-picker-dialog.tsx`
- `app/dashboard/global-settings/footer-content-editor.tsx`
- `app/dashboard/global-settings/appearance-preview.tsx`
- `app/dashboard/global-settings/actions.ts`

## Migration strategy

Work module by module. Do not attempt a single huge edit across the whole
dashboard.

Recommended order:

1. shared labels/enums;
2. content list and content form;
3. file manager and galleries;
4. form builder;
5. menus/top menu builder;
6. users;
7. global settings deep form;
8. dashboard landing page cleanup.

After each module:

- run `npx tsc --noEmit`;
- run targeted tests if available;
- manually scan for remaining obvious hardcoded strings in that module.

## Shared dashboard dictionary namespaces

Add English keys under these namespaces:

```text
dashboard.common.*
dashboard.content.*
dashboard.files.*
dashboard.galleries.*
dashboard.forms.*
dashboard.menus.*
dashboard.users.*
dashboard.globalSettings.*
dashboard.locks.*
dashboard.status.*
dashboard.filters.*
dashboard.pagination.*
dashboard.validation.*
dashboard.toasts.*
dashboard.errors.*
```

Keep names stable. Do not create duplicate keys for identical concepts unless
the wording needs contextual difference.

## Enum label helpers

Current helpers like `getContentStatusLabel(status)` return English.

Refactor to one of these patterns:

Pattern A, key helper:

```ts
export function getContentStatusLabelKey(status: ContentStatus): TranslationKey {
  return `dashboard.content.status.${status}`;
}
```

The component calls:

```tsx
{t(getContentStatusLabelKey(status))}
```

Pattern B, translator helper:

```ts
export function getContentStatusLabel(
  status: string,
  t: TranslateFn,
): string;
```

Prefer Pattern A for pure libraries and tests.

Apply the same idea to:

- content types;
- roles;
- comment statuses;
- form statuses;
- file kinds;
- upload states;
- AI provider UI labels only when they are product/system labels. Provider
  names like `OpenAI` remain proper nouns.

## Server Action and API error strategy

Existing actions often return `{ error: string }`.

For each migrated module, prefer:

```ts
type DashboardActionError = {
  code: TranslationKey;
  message?: string;
  values?: Record<string, string | number>;
};

type ActionResult =
  | { success: true }
  | { error: DashboardActionError };
```

Migration can be incremental:

1. Add a small client helper:

```ts
function getActionErrorMessage(error: string | DashboardActionError, t: TranslateFn) {
  return typeof error === "string" ? error : t(error.code, error.values);
}
```

2. Convert the most visible errors to codes first.
3. Leave legacy strings temporarily where risk is too high.

For server-only logs, keep English technical messages. Do not translate log
lines intended for developers.

## Content module instructions

Translate:

- page headings and descriptions;
- "New content", "Create page", "Create blog post", "Create hero slider",
  "Set up Webshop";
- content type labels;
- status labels;
- table headers;
- filters and search placeholders;
- row actions;
- dialogs and confirmations;
- homepage action labels;
- revision history labels;
- schedule labels and validation display;
- editor toolbar tooltips and buttons where they are CMS-owned;
- hero slider editor labels and toast messages.

Do not translate:

- content title;
- slug;
- excerpt;
- meta title/description;
- author display name;
- category name;
- rich text body;
- generated AI output.

Special case:

The AI writing assistant has editable custom instructions. Do not translate
custom instructions. Only translate CMS labels around them.

## File manager and gallery instructions

Translate:

- file manager page title/description;
- upload button/dropzone states;
- "Upload failed", "File type is not allowed";
- folder dialog labels;
- file card actions;
- gallery create/edit/delete/reassign dialogs;
- table/card empty states;
- ownership/reassignment system labels.

Do not translate:

- file names;
- folder names;
- gallery names/descriptions;
- alt text/title entered by users.

Upload errors returned from API should eventually use codes. If a message comes
from browser/File API and is not controlled by the CMS, display as fallback.

## Form builder instructions

Translate backend builder UI:

- form list table labels;
- create/edit/delete/reassign dialogs;
- field builder labels;
- field type labels;
- validation rule labels;
- submissions table headers;
- email notification settings;
- Turnstile configuration help text;
- builder toast messages.

Do not translate public form content entered by admins:

- form name;
- submit label;
- success message;
- field labels;
- field placeholders;
- help text;
- option labels;
- email template content.

This distinction matters: the form builder edits content that will be public.
System UI around it uses backend language; the authored form remains whatever
the site owner entered.

## Menus instructions

Translate:

- menu builder page labels;
- add/edit/delete dialogs;
- content picker system labels;
- URL target labels such as "same tab" / "new tab";
- validation errors and toast messages.

Do not translate:

- menu names;
- menu item labels;
- custom URLs;
- content titles shown as pickable items.

## Users instructions

Translate:

- page title and descriptions;
- filters;
- role labels/descriptions;
- lock/force sign-out/delete dialogs;
- user status labels;
- table headers.

Do not translate:

- user full name;
- email address;
- Clerk-provided values.

## Global Settings deep form

`settings-form.tsx` is large. Migrate it in sections:

1. tabs and save controls;
2. General card;
3. Regional Settings;
4. Header Layout and Appearance controls;
5. Footer controls;
6. Appearance preset controls;
7. AI Settings;
8. Upload Limits;
9. Content History;
10. Session Security;
11. toast messages and import/export messages.

For preset names:

- if preset names are internal product labels, translate them;
- if names are saved/imported recipe values, treat as data and do not translate.

For AI provider and model names:

- keep provider names and model labels as proper nouns;
- translate surrounding warnings and help text.

## Client component pattern

At the top of client components:

```tsx
const { t, tPlural } = useI18n();
```

Avoid creating a new translation object on every render when a static map can
be a function:

```ts
function getStatusOptions(t: TranslateFn) {
  return CONTENT_STATUSES.map((status) => ({
    value: status,
    label: t(getContentStatusLabelKey(status)),
  }));
}
```

Memoize large option lists only when it reduces real work.

## Server component pattern

At the top of async server components:

```ts
const t = await getTranslations("backend");
```

Then use:

```tsx
<h1>{t("dashboard.content.title")}</h1>
```

Do not call `getTranslations` inside loops or nested helper calls repeatedly.

## Tests

Add or update tests for:

- label-key helpers for content status/type/roles;
- action error code helpers;
- dictionaries include keys used by converted modules;
- no user-authored sample values are translated in menu/content/form render
  tests where possible;
- existing workflow/security tests still pass.

If broad component tests are not available, use pure tests for helpers and rely
on typecheck for JSX migration.

## Manual QA checklist

For each module:

1. Open the page in English.
2. Confirm text matches current English UI closely.
3. Temporarily change one backend dictionary key to a visible marker.
4. Confirm only the expected system label changes.
5. Create/edit/delete one record.
6. Confirm toast/error labels display through translation helper.
7. Confirm user-authored values remain unchanged.

## Acceptance criteria

- Core dashboard modules use backend i18n for CMS-owned UI text.
- User-authored data remains untouched.
- Action/API display errors are migrated to codes where practical.
- Legacy string fallbacks remain only where documented.
- English UI remains functionally equivalent.
- Typecheck passes.
- Existing tests pass.

