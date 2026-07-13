# Phase 06 - Paid add-on i18n contract

## Goal

Extend paid add-on contracts so paid add-ons can render UI and system messages
in the selected frontend/backend language.

This phase focuses on the contract and host integration. The Webshop add-on is
the first target. Future paid add-ons should reuse the same i18n input shape.

The master license-server remains excluded from translation unless explicitly
requested later.

## Non-goals

- Do not translate master license-server service internals.
- Do not translate remote activation authority messages unless they are mapped
  to CMS-owned enum codes.
- Do not make the public CMS depend on private package translation files at
  build time.
- Do not require private add-ons to import host app internals beyond the public
  contract.
- Do not implement product/content localization.

## Existing files to inspect first

Webshop public contract:

- `lib/webshop-addon/contract.ts`
- `lib/webshop-addon/loader.ts`
- `lib/webshop-addon/license.ts`
- `lib/webshop-addon/config.ts`
- `app/dashboard/webshop/page.tsx`
- `app/dashboard/webshop/[...webshopPath]/page.tsx`
- `app/[slug]/[...webshopPath]/page.tsx`
- `app/api/webshop/[...webshopPath]/route.ts`
- `app/dashboard/content-categories/webshop-categories-bridge.tsx`
- `components/webshop-addon-required.tsx`
- `components/webshop-license-activation.tsx`

License-server add-on contract:

- `lib/license-server-addon/contract.ts`
- `lib/license-server-addon/loader.ts`
- `lib/license-server-addon/license.ts`
- `app/dashboard/license-server/page.tsx`
- `app/dashboard/license-server/[...licenseServerPath]/page.tsx`
- `app/api/license-server/[...licenseServerPath]/route.ts`
- `components/license-server-addon-required.tsx`

Tests:

- `tests/webshop-addon-bridge.test.ts`
- `tests/webshop-private.test.ts`
- `tests/license-server-addon-bridge.test.ts`
- `tests/license-server-addon-release.test.ts`

## Contract shape

Add a shared i18n context type exported from the public host contract.

Recommended location:

```text
lib/i18n/addon-contract.ts
```

or inside each add-on contract file if shared import risks a cycle.

Recommended type:

```ts
export type AddonI18nContext = {
  frontendLanguage: CmsLanguage;
  backendLanguage: CmsLanguage;
  frontendLocale: string;
  backendLocale: string;
  frontendDirection: "ltr" | "rtl";
  backendDirection: "ltr" | "rtl";
  timezone: string;
};
```

Add this field to relevant inputs:

```ts
type WebshopDashboardInput = {
  licenseMode: WebshopLicenseMode;
  path: readonly string[];
  searchParams?: Record<string, string | string[] | undefined>;
  userId: string;
  i18n: AddonI18nContext;
};

type WebshopStorefrontInput = {
  contentId: string;
  licenseMode: WebshopLicenseMode;
  path: readonly string[];
  searchParams?: Record<string, string | string[] | undefined>;
  slug: string;
  i18n: AddonI18nContext;
};

type WebshopApiRouteInput = {
  licenseMode: WebshopLicenseMode;
  method: string;
  path: readonly string[];
  request: Request;
  userId: string | null;
  i18n: AddonI18nContext;
};
```

Apply the same pattern to add-ons that should be translated.

For the license-server add-on:

- If it is the excluded master license-server, do not add i18n.
- If it is a paid client add-on UI hosted in the CMS and should eventually be
  translated, add the field but allow the private package to ignore it.

Document the chosen interpretation in the PR.

## Host i18n context builder

Create a helper:

```ts
export async function getAddonI18nContext(): Promise<AddonI18nContext> {
  const settings = await getGlobalSettings();
  return {
    frontendLanguage: settings.languages.frontendLanguage,
    backendLanguage: settings.languages.backendLanguage,
    frontendLocale: cmsLanguageToLocale(settings.languages.frontendLanguage),
    backendLocale: cmsLanguageToLocale(settings.languages.backendLanguage),
    frontendDirection: getCmsLanguageDirection(settings.languages.frontendLanguage),
    backendDirection: getCmsLanguageDirection(settings.languages.backendLanguage),
    timezone: settings.regional.timezone,
  };
}
```

Do not include full host dictionaries in the default context. Passing all
messages can bloat renders and create package coupling.

If add-ons need common host labels, expose a small stable common dictionary or
let add-ons carry their own dictionaries.

## Add-on-owned translations

Paid add-ons should own their domain dictionaries.

Recommended private package structure:

```text
src/i18n/
  languages.ts
  messages/
    en.ts
    de.ts
  translate.ts
```

The host passes `i18n.backendLanguage` or `i18n.frontendLanguage`. The add-on
loads its own dictionary and falls back to English.

Rules:

- Dashboard routes use `backendLanguage`.
- Storefront routes use `frontendLanguage`.
- API routes use `frontendLanguage` when response is visitor-facing.
- API routes use stable codes for machine clients and optional localized
  fallback message for UI clients.
- Add-ons must not mutate host global settings.

## Webshop dashboard integration

In `app/dashboard/webshop/page.tsx`:

1. Build i18n context after permission checks.
2. Pass `i18n` to:

```ts
addon.renderDashboard({
  licenseMode,
  path: [],
  userId,
  i18n,
});
```

In `app/dashboard/webshop/_delegate.tsx` and catch-all route:

1. Build i18n context once.
2. Pass it to `renderDashboardPath`.
3. Translate host-owned "Back to Webshop" label through backend i18n.

## Webshop storefront integration

In `app/[slug]/[...webshopPath]/page.tsx` and root webshop storefront path:

1. Build i18n context.
2. Pass it to:

```ts
renderStorefrontRoot
renderStorefrontPath
generateStorefrontMetadata
```

3. Storefront uses `frontendLanguage`.
4. Do not translate product names/descriptions automatically. Those are product
   content and require separate content localization.

## Webshop API integration

In `app/api/webshop/[...webshopPath]/route.ts`:

1. Build i18n context after resolving addon state.
2. Pass it to `handleApiRoute`.
3. Machine-readable API errors should remain stable:

```json
{ "error": { "code": "CART_EMPTY", "message": "Cart is empty." } }
```

4. `message` may be localized if the endpoint is used by browser UI.
5. Never localize `code`.

## Content categories bridge

In `app/dashboard/content-categories/webshop-categories-bridge.tsx`:

1. Pass i18n context to `renderContentCategoriesBridge`.
2. Host fallback card text should use backend i18n.
3. Add-on bridge UI uses backend language.

## Backward compatibility

Changing TypeScript contract can break existing private packages.

Use one of these compatibility approaches:

Approach A, optional field:

```ts
i18n?: AddonI18nContext;
```

Pros:

- private package can update later.

Cons:

- less strict.

Approach B, required field plus version bump:

- bump contract expectations;
- update private packages in same release.

Recommended for this codebase:

- make `i18n` required in public contract only if private add-ons are updated in
  same task;
- otherwise make it optional in type but always pass it from host.

Document which path was taken.

## License-server exception

The user requirement says master license-server translations are not needed.

Implementation rule:

- Do not translate master activation API internals.
- Do not translate master entitlement revalidation errors returned from remote
  authority.
- Host CMS placeholder UI around activation can be translated because it is
  CMS-owned, not master-owned.

If there is ambiguity between "paid License Server client add-on" and "master
license server", ask before translating private license-server UI.

## Tests

Add/update tests:

- fake Webshop addon receives `i18n` in `renderDashboard`;
- fake Webshop addon receives `i18n` in `renderDashboardPath`;
- fake Webshop addon receives `i18n` in storefront render;
- fake Webshop addon receives `i18n` in API route if handler exists;
- frontend/backend language values differ correctly when settings differ;
- license-server master activation tests remain unchanged.

If contract field is optional, test that host still passes it.

## Manual QA

1. Set frontend language to `sr-Latn`.
2. Set backend language to `de`.
3. Open `/dashboard/webshop`.
4. Confirm fake/private addon can read `backendLanguage === "de"`.
5. Open public webshop route.
6. Confirm addon can read `frontendLanguage === "sr-Latn"`.
7. Trigger API request from storefront.
8. Confirm handler sees frontend language.
9. Confirm master license activation still works.

## Acceptance criteria

- Paid add-on input contracts can carry i18n context.
- Host passes i18n context to Webshop dashboard, storefront, API, and bridge.
- Host-owned add-on placeholder UI uses normal CMS i18n.
- Master license-server internals are not translated.
- Existing add-on bridge tests pass or are updated with explicit compatibility.
- Typecheck passes.

