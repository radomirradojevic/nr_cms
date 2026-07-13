# Current Public Shell Contract

This inventory captures the public shell behavior that Phase 1 protects before
the composable appearance recipe is connected to rendering.

## Sources

- `app/layout.tsx` owns the current header, content wrapper, footer, Clerk
  provider, session security provider, root classes, and root CSS variables.
- `lib/appearance.ts` resolves legacy appearance fields into HTML classes,
  CSS variables, font links, content width values, radius, and shadow tokens.
- `lib/global-settings.ts` defines validated settings shapes and defaults.
- `data/global-settings.ts` reads `global_settings`, parses JSONB settings,
  normalizes legacy appearance values, and falls back to defaults on failure.
- `db/schema.ts` defines the singleton `global_settings` table and CHECK
  constraints for legacy appearance fields.
- `app/globals.css` consumes shell classes and CSS variables for content width,
  theme-specific behavior, header/footer glow, and footer HTML wrapping.
- `components/site-top-menu*.tsx` render public navigation plus mobile/tablet
  admin and auth affordances.

## Legacy Settings

The current shell is driven by these `global_settings` fields:

- Identity: `site_name`, `site_logo_file_id`.
- Header: `header_content`, `header_settings`, `sticky_header_height`.
- Footer: `footer_content`, `footer_settings`, `sticky_footer_height`.
- Appearance: `theme`, `frontend_content_width`, `backend_content_width`,
  `font_preset`, `radius_preset`, `shadow_preset`.

`header_settings` currently supports `showLogo`, `showSiteName`, `sticky`,
optional hex `background`, and optional `glow`. Defaults are logo shown, site
name shown, non-sticky, and default glow settings.

`footer_settings` currently supports `showLogo`, optional `copyright`,
`sticky`, optional hex `background`, and optional `glow`. The `showLogo` value
is editable and persisted, but the current footer rendering does not display a
footer logo.

## Header Contract

The header is always rendered above the public content wrapper. It has
`site-header bg-background flex items-center justify-between p-4 gap-4`.

Height behavior:

- `headerH` is `stickyHeaderHeight` when it is greater than zero, otherwise
  `64`.
- `<html>` always receives `--header-h: <headerH>px`.
- When `header_settings.sticky` is true, the header also gets
  `sticky top-0 z-50`.
- When sticky and `stickyHeaderHeight > 0`, `<html>` receives
  `--sticky-header-h` and the content wrapper receives matching top padding.

Brand behavior:

- The brand is an anchor to `/` with typography and hover styles.
- The logo renders only when a logo exists and `header_settings.showLogo` is
  true.
- The logo is rendered as an image in a circular container sized to
  `calc(var(--header-h) * 0.85)` with a gray border.
- The site name renders only when `header_settings.showSiteName` is true.

Custom HTML behavior:

- `header_content` is rendered between brand and navigation.
- It is injected with `dangerouslySetInnerHTML`.
- Its container is flexible, self-stretching, vertically centered, and clipped
  with `overflow-hidden`.

Navigation and auth behavior:

- `SiteTopMenu` is always mounted with backend/admin/auth state flags.
- Desktop public menu items render at `lg` and above.
- Mobile/tablet navigation is provided by `SiteTopMenuMobile`.
- Backend users get dashboard/content/file-manager navigation.
- Admin users get additional global settings, content categories, users, top
  menu, and form builder affordances.
- Desktop auth controls render at `lg` and above: signed-out users see Clerk
  sign-in/sign-up buttons; signed-in users see `UserButtonClient`.
- The mobile menu includes auth controls and backend/admin links when relevant.

Color and glow behavior:

- Header background defaults to the active theme `bg-background`.
- A valid `header_settings.background` hex value is applied as inline
  `backgroundColor`.
- Header glow variables are resolved on `<html>` and consumed by `.site-header`
  as border-bottom and box-shadow.

## Content Wrapper Contract

All route content is wrapped by `.site-content-container mx-auto w-full px-4`.
The class sets `max-width: var(--content-max-width)`.

`resolveAppearance()` emits both `--frontend-content-max-width` and
`--backend-content-max-width`. `:root` defaults `--content-max-width` to the
frontend value. `html:has(.dashboard-content-root)` switches the active content
width to the backend value for dashboard surfaces.

Public homepage, page, blog post, and blog category surfaces add their own
inner spacing and `<main>` elements, but still sit inside the root public
content container.

## Footer Contract

The footer is always rendered after the content wrapper. It has
`site-footer bg-background mt-auto px-4 py-8 text-sm text-muted-foreground
sm:px-6`.

Height and sticky behavior:

- `sticky_footer_height` defaults to `110`.
- When the value is greater than zero, footer inline style sets
  `minHeight: <sticky_footer_height>px`.
- When `footer_settings.sticky` is true, the footer gets
  `sticky bottom-0 z-50`.
- When sticky and `sticky_footer_height > 0`, `<html>` receives
  `--sticky-footer-h`, and the content wrapper receives bottom padding that
  includes `env(safe-area-inset-bottom, 0px)`.

Rendered content behavior:

- The inner footer container renders only when `footer_content` or
  `footer_settings.copyright` exists.
- `footer_content` is rendered first with `dangerouslySetInnerHTML` inside
  `.cms-content`.
- Copyright renders as plain text in a trailing responsive block.
- Footer HTML is constrained and wrapped by global CSS so links, spans,
  paragraphs, lists, and divs do not overflow the footer.

Color and glow behavior:

- Footer background defaults to the active theme `bg-background`.
- A valid `footer_settings.background` hex value is applied as inline
  `backgroundColor`.
- Footer glow variables are resolved on `<html>` and consumed by `.site-footer`
  as border-top and box-shadow.

## Appearance Contract

`resolveAppearance()` accepts a partial legacy appearance object and fills
missing values from `DEFAULT_APPEARANCE`:

- Theme: `default`.
- Frontend content width: `contained`.
- Backend content width: `contained`.
- Font preset: `system`.
- Radius preset: `medium`.
- Shadow preset: `soft`.

Theme resolution emits `theme-<name>` on `<html>` and adds `dark` for dark
themes. The protected public shell smoke themes are `default`, `dark`,
`cyberpunk`, and `aurora`.

The root inline style receives the active palette variables, font variables,
shadow variables, `--radius`, frontend/backend max-width variables, glow
variables, and sticky shell variables. Font presets may also emit `<link>` tags
in `<head>`.

The `aurora` theme additionally uses `.theme-aurora body::before` for an
animated fixed background gradient. It honors `prefers-reduced-motion` by
disabling animation while keeping the static gradient.

## Phase 1 Guardrail

Phase 1 must not change `app/layout.tsx` rendering, add a database migration,
add visible variants, or change the Global Settings UI. Later phases should use
this contract as the parity checklist for classic recipe migration.
