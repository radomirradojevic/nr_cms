# Phase 03 - Global shell i18n

## Goal

Migrate the global shell and top-level fallback UI to the i18n runtime.

This phase covers labels and messages that appear across the app shell:

- dashboard layout headings where they are part of the shell;
- admin/backend navigation;
- mobile navigation;
- auth labels;
- site search UI;
- public fallback pages;
- add-on required shell placeholders owned by the public CMS;
- global settings page heading and tab labels if not already migrated.

The purpose is to make the first visible language switch useful while keeping
module-specific dashboard screens for Phase 04.

## Non-goals

- Do not migrate every content/files/forms/users screen in this phase.
- Do not translate user-authored menu labels.
- Do not translate page titles, blog post content, category names, file names,
  or form field labels from the database.
- Do not change role or authorization behavior.
- Do not translate the master license-server internals.

## Existing files to inspect first

- `app/layout.tsx`
- `app/dashboard/layout.tsx`
- `app/dashboard/page.tsx`
- `app/dashboard/global-settings/page.tsx`
- `app/dashboard/global-settings/settings-form.tsx`
- `lib/backend-menu.ts`
- `components/site-admin-menu.tsx`
- `components/site-top-menu.tsx`
- `components/site-top-menu-mobile.tsx`
- `components/site-top-menu-link.tsx`
- `components/site-top-menu-parent-trigger.tsx`
- `components/site-search.tsx`
- `components/site-header.tsx`
- `components/site-footer.tsx`
- `components/user-button-with-roles.tsx`
- `app/page.tsx`
- `app/not-found.tsx`
- `app/search/page.tsx`
- `components/content-unauthorized.tsx`
- `components/content-unpublished.tsx`
- `components/webshop-addon-required.tsx`
- `components/webshop-license-activation.tsx`
- `components/license-server-addon-required.tsx`

## Translation scope rules

Translate system/chrome text:

- "Dashboard"
- "Global Settings"
- "Content"
- "File Manager"
- "Search"
- "Sign in"
- "Sign up"
- "Account"
- "No homepage configured"
- "Access restricted"
- "This content is not published yet"
- "No results found."
- "Read more"
- add-on activation placeholder labels owned by the public CMS

Do not translate user-authored text:

- top menu item labels loaded from database;
- site name;
- custom header/footer HTML;
- CTA labels configured in Appearance recipe;
- footer link labels configured by the user;
- content titles and snippets;
- form field labels.

## Backend menu migration

Current `lib/backend-menu.ts` stores labels directly in definitions.

Change the data model from:

```ts
type BackendMenuNodeDefinition = {
  id: string;
  href: string;
  label: string;
};
```

to:

```ts
type BackendMenuNodeDefinition = {
  id: string;
  href: string;
  labelKey: TranslationKey;
};
```

Expose one of these APIs:

```ts
export function getBackendMenuTree(input: BackendMenuAccess & {
  t: TranslateFn;
}): TopMenuTreeNode[];
```

or:

```ts
export function getBackendMenuDefinitions(...): BackendMenuNodeDefinition[];
export function localizeBackendMenuTree(tree, t): TopMenuTreeNode[];
```

Choose the option with the smallest downstream blast radius.

Required keys:

```text
dashboard.nav.dashboard
dashboard.nav.globalSettings
dashboard.nav.content
dashboard.nav.contentCategories
dashboard.nav.webshop
dashboard.nav.webshopSettings
dashboard.nav.webshopStorefront
dashboard.nav.webshopCategories
dashboard.nav.webshopProducts
dashboard.nav.webshopOrders
dashboard.nav.webshopWishlist
dashboard.nav.webshopPromotions
dashboard.nav.licenseServer
dashboard.nav.licenseServerApiClients
dashboard.nav.licenseServerProductTypes
dashboard.nav.licenseServerLicenses
dashboard.nav.licenseServerEvents
dashboard.nav.fileManager
dashboard.nav.galleryManager
dashboard.nav.users
dashboard.nav.menus
dashboard.nav.formBuilder
```

If license-server navigation is considered master-only and excluded from
translation, document the exception. Otherwise these outer CMS-owned menu labels
can be translated while the master service internals remain English.

## Site admin menu

In `components/site-admin-menu.tsx`:

1. Use `useI18n()` or `useTranslations()`.
2. Replace direct labels for admin navigation.
3. Replace ARIA labels:

```text
Admin navigation
Open site menu
Site menu
Backend menu
Account
Sign out
Sign in
Sign up
```

4. Keep user display name as-is.
5. Keep role metadata values as data, but translate role descriptions in
   `components/user-button-with-roles.tsx`.

## Mobile menu

In `components/site-top-menu-mobile.tsx`:

1. Translate:

```text
Open navigation menu
Close navigation menu
Site navigation
Admin
Account
Sign in
Sign up
```

2. Submenu ARIA labels need interpolation:

```text
Collapse {label} submenu
Expand {label} submenu
```

Here `{label}` may be user-authored. Do not translate the label itself.

3. Replace the hardcoded arrow character with an icon only if needed for RTL in
   Phase 08. Do not do visual refactor here.

## Site search

In `components/site-search.tsx` and `app/search/page.tsx`:

1. Translate system labels:

```text
Search
Searching...
No results found.
No matching content was found.
Read more
Enter a search term in the site header.
Page
Blog post
{count} result
{count} results
```

2. Do not translate result titles or snippets.
3. Use plural helper for result count.
4. Ensure the client component receives translated strings from provider.

If `SiteSearch` gets `label` and `placeholder` from Appearance recipe, keep
user-configured values when present. Only fallback defaults should be
translated.

## Public fallback pages

Migrate:

- `app/page.tsx` fallback when no homepage exists;
- `app/not-found.tsx`;
- `components/content-unauthorized.tsx`;
- `components/content-unpublished.tsx`;
- restricted metadata titles in `app/[slug]/page.tsx` and
  `app/[slug]/[...webshopPath]/page.tsx` where feasible.

Required keys:

```text
public.home.noHomepage.title
public.home.noHomepage.description
public.home.noHomepage.goToContentDashboard
public.errors.notFound.title
public.errors.notFound.description
public.errors.accessRestricted.title
public.errors.accessRestricted.description
public.errors.unpublished.title
public.errors.unpublished.description
public.errors.unpublished.openInDashboard
```

If the fallback description currently embeds styled words like "page",
"Set as homepage", and "admin", either:

- split into multiple translated chunks; or
- simplify the sentence to avoid JSX fragments in this phase.

Prefer simple text over a fragile rich-text translation runtime.

## Add-on required placeholders

CMS-owned placeholder components can be translated:

- `components/webshop-addon-required.tsx`
- `components/webshop-license-activation.tsx`
- `components/license-server-addon-required.tsx`
- `app/dashboard/webshop/page.tsx`
- `app/dashboard/license-server/page.tsx`

Important:

- Webshop paid add-on UI is handled in Phase 06.
- Master license-server service internals remain out of scope.
- Activation authority messages can remain English if they come from the master
  license server.

Translate only CMS-owned static strings such as:

```text
Activate Webshop
License required
Waiting for add-on install
Available after add-on activation.
License key
Activating...
```

Dynamic `state.message` and `state.reason` may come from platform/master logic.
Leave them as-is in this phase unless they are CMS-owned enum reasons.

## Global Settings shell

If not completed in Phase 02, migrate only the outer structure:

- page title and description;
- tab labels;
- save button labels;
- "Settings saved";
- visible language control labels from Phase 01.

Do not migrate the entire 4,700-line settings form yet. Full settings module
migration belongs to Phase 04.

## Tests

Add tests where practical:

- backend menu labels localize via translator;
- search result plural helper returns correct English strings;
- missing homepage fallback renders translated title;
- mobile menu ARIA label uses translated text;
- user-authored menu item labels are not passed through translation lookup.

Component tests may be limited in this repo. At minimum add pure helper tests
for backend menu localization.

## Manual QA

1. Set frontend language to `en`.
2. Set backend language to `en`.
3. Confirm shell labels render exactly as before.
4. Temporarily add a test pseudo translation for one key such as
   `dashboard.nav.dashboard`.
5. Set backend language to that pseudo language if available.
6. Confirm only backend shell changes.
7. Confirm top menu item labels created by user remain unchanged.
8. Confirm search result titles/snippets remain unchanged.

## Acceptance criteria

- Global shell gets translations through the i18n provider.
- Public fallback pages use frontend language.
- Dashboard/admin shell uses backend language.
- User-authored labels remain untouched.
- Search system labels are translated; result content is not.
- Add-on placeholder components use CMS-owned translation keys where safe.
- No broad core dashboard module migration is included.
- Typecheck passes.

