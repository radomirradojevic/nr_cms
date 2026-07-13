# Phase 08 - RTL QA and directional layout hardening

## Goal

Harden the CMS and public shell for RTL language support, especially Arabic.

This phase verifies that translated Arabic UI is usable and fixes critical
directional layout issues caused by left/right-specific utility classes.

Primary target:

```text
frontendLanguage = ar
backendLanguage = ar
```

## Non-goals

- Do not redesign the whole UI.
- Do not convert every left/right class mechanically if it is not user-visible
  or not problematic.
- Do not localize user-authored content.
- Do not implement per-user language preferences.
- Do not translate master license-server internals.

## Existing files to inspect first

Global shell:

- `app/layout.tsx`
- `app/dashboard/layout.tsx`
- `components/site-header.tsx`
- `components/site-footer.tsx`
- `components/site-admin-menu.tsx`
- `components/site-top-menu.tsx`
- `components/site-top-menu-mobile.tsx`
- `components/site-search.tsx`
- `app/globals.css`

Dashboard modules:

- `app/dashboard/global-settings/settings-form.tsx`
- `app/dashboard/content/content-table.tsx`
- `app/dashboard/content/content-form.tsx`
- `app/dashboard/filemanager/*`
- `app/dashboard/gallerymanager/*`
- `app/dashboard/form-builder/*`
- `app/dashboard/top-menu/*`
- `app/dashboard/users/*`

Shared UI:

- `components/ui/*`
- `components/backend-tabs.tsx`
- `components/table-pagination.tsx`

## Direction source of truth

Direction is derived from the active CMS language:

```ts
getCmsLanguageDirection("ar") === "rtl"
getCmsLanguageDirection(other) === "ltr"
```

Root:

```tsx
<html dir={frontendDirection}>
```

Dashboard provider:

- The dashboard can use `backendDirection`.
- If frontend and backend directions differ, dashboard content must have an
  explicit `dir={backendDirection}` wrapper so backend UI follows backend
  language.

Recommended dashboard layout:

```tsx
<div dir={backendDirection} className="dashboard-content-root ...">
  ...
</div>
```

Do not set `dir` on small arbitrary child elements unless needed. Prefer
container-level direction.

## Directional utility audit

Search for left/right-specific classes:

```text
left-
right-
ml-
mr-
pl-
pr-
border-l
border-r
rounded-l
rounded-r
text-left
text-right
justify-start
justify-end
items-start
items-end
origin-top-left
origin-top-right
translate-x
-translate-x
```

Use `rg`:

```powershell
rg -n "left-|right-|ml-|mr-|pl-|pr-|border-l|border-r|rounded-l|rounded-r|text-left|text-right|origin-top-left|origin-top-right" app components lib -g "*.tsx" -g "*.ts" -g "*.css"
```

Do not blindly replace every match. Categorize each one.

## Replacement rules

Prefer Tailwind logical utilities when available in Tailwind v4:

```text
ml-* -> ms-*
mr-* -> me-*
pl-* -> ps-*
pr-* -> pe-*
border-l -> border-s
border-r -> border-e
rounded-l-* -> rounded-s-*
rounded-r-* -> rounded-e-*
left-* -> start-* when supported
right-* -> end-* when supported
text-left -> text-start
text-right -> text-end
```

If Tailwind logical utilities are unavailable or not configured, use CSS
logical properties in `globals.css` or component class variants.

Examples:

```css
.logical-dropdown-start {
  inset-inline-start: 0;
}

.logical-dropdown-end {
  inset-inline-end: 0;
}
```

Avoid inline styles unless a component already uses inline style for dynamic
positioning.

## High-risk UI areas

Fix these first:

1. Fixed launcher/menu positioning:
   - `SiteAdminMenuLauncher`
   - mobile navigation panel
   - search popup
   - sticky save button in Global Settings

2. Navigation:
   - desktop admin menu alignment;
   - mobile submenu indentation;
   - submenu expand/collapse icons.

3. Tables:
   - row action menus;
   - checkboxes;
   - pagination controls;
   - status badges.

4. Forms:
   - labels and help text;
   - input icons;
   - date picker trigger;
   - select/dropdown alignment.

5. Rich editors/builders:
   - content form toolbar;
   - Tiptap toolbar;
   - page builder settings panel;
   - form builder field list.

## Component-specific notes

### SiteTopMenuMobile

Current code uses:

- `right-3`
- `origin-top-right`
- child indentation via `ml-*`
- arrow glyph for child links

For RTL:

- panel should open from inline end, not hard right;
- origin should be inline end;
- child indentation should use `ms-*`;
- arrow glyph should be replaced by an icon or directional-safe marker.

### SiteSearch

Current result popup has `left-0` / `right-0` based on `resultsAlign`.

For RTL:

- `left` and `right` semantics should become `start` and `end`;
- viewport shift math can stay physical because it uses DOM rects;
- labels and placeholders come from i18n.

### Global Settings sticky save

Current floating save button uses physical right positioning.

For RTL:

- either keep save button on visual right for consistency, or move to inline
  end.
- Choose one behavior and document it.
- Recommended: inline end, because it follows reading direction.

### Tables

Table columns may stay physical if the data grid reads better that way, but
text alignment should use `text-start` unless numbers/actions require explicit
alignment.

### Icons

Directional icons must be checked:

- `ArrowLeft`
- chevrons;
- upload/download icons are not directional;
- external link icons are usually fine.

For "Back to ..." in RTL, use an icon that mirrors through CSS or choose
logical icon based on direction:

```tsx
const BackIcon = direction === "rtl" ? ArrowRight : ArrowLeft;
```

## QA tooling

Manual browser QA is required. If browser automation is available, use it.

Recommended viewport matrix:

```text
desktop: 1440x900
tablet: 768x1024
mobile: 390x844
```

Routes:

```text
/
/dashboard
/dashboard/global-settings
/dashboard/content
/dashboard/content/new/page
/dashboard/filemanager
/dashboard/gallerymanager
/dashboard/form-builder
/dashboard/menus
/dashboard/users
/search?q=test
```

If Webshop add-on is installed:

```text
/dashboard/webshop
/<webshop-slug>
```

## Visual QA checklist

For each viewport:

- no text overlaps;
- dropdowns stay inside viewport;
- mobile menu opens from expected edge;
- focus rings are visible;
- icons do not imply the wrong direction;
- table actions are reachable;
- forms remain readable;
- long Arabic labels wrap cleanly;
- save buttons remain visible;
- toast position is acceptable;
- search popup is not clipped;
- calendar/date picker is usable.

## Automated checks

Add tests where possible:

- `getCmsLanguageDirection("ar")` returns `rtl`;
- root layout sets `dir` from frontend language if testable;
- dashboard wrapper sets backend direction if frontend/backend differ;
- helper that chooses back arrow returns correct icon name or direction.

Add a source audit script/test only if it is not too noisy. A strict ban on all
`ml-`/`mr-` may be unrealistic. Prefer a documented allowlist.

Potential allowlist categories:

- decorative physical positioning that is intentionally physical;
- canvas/editor internals where direction does not matter;
- third-party component wrappers that cannot use logical classes safely.

## CSS guidelines

When adding CSS:

- use logical properties:
  - `margin-inline-start`
  - `margin-inline-end`
  - `padding-inline-start`
  - `padding-inline-end`
  - `inset-inline-start`
  - `inset-inline-end`
  - `border-inline-start`
  - `border-inline-end`
- avoid duplicating full LTR/RTL styles unless necessary;
- avoid inline styles unless dynamic values require it;
- keep Tailwind utility use consistent with the rest of the repo.

## Manual QA process

1. Set frontend and backend language to `ar`.
2. Restart or refresh the app if needed.
3. Confirm `html dir="rtl"`.
4. Open each route in the matrix.
5. Take screenshots if browser tooling is available.
6. Record issues as small targeted fixes.
7. Repeat after fixes.
8. Set backend `ar`, frontend `en`.
9. Confirm dashboard is RTL while public shell stays LTR if designed that way.
10. Set frontend `ar`, backend `en`.
11. Confirm public shell is RTL while dashboard is LTR if designed that way.

## Acceptance criteria

- Arabic frontend sets public shell to RTL.
- Arabic backend sets dashboard UI to RTL.
- Mixed frontend/backend direction works without leaking direction into the
  wrong area.
- Critical navigation, search, forms, tables, and dialogs are usable in RTL.
- Major left/right utility issues are fixed or documented with allowlist.
- Long translated labels do not overflow important buttons/cards.
- Typecheck and tests pass.
- Manual QA notes are included in the PR summary.

