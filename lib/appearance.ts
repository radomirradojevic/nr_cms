/**
 * Appearance registry — single source of truth that maps semantic enum
 * identifiers stored in `global_settings` to CSS variables consumed by
 * the existing shadcn/Tailwind v4 token system.
 *
 * Pure module — no I/O, no React, no `'use client'` / `'use server'` —
 * safe to import from server layouts AND the Craft.js client editor.
 */

// ─── Enum option lists (single source of truth) ──────────────────────────────
//
// These arrays drive: Zod schemas, the dashboard <Select> options, the DB
// CHECK constraints (kept in sync manually with the migration files), and
// the registry lookup tables below.

export const THEMES = [
  "default",
  "dark",
  "minimal",
  "corporate",
  "cyberpunk",
  "elegant",
  // Nature / soft (light)
  "forest",
  "ocean",
  "sunset",
  "pastel",
  // Premium / high-end (dark)
  "luxury",
  "obsidian",
  "midnight",
  "aurora",
  // Expanded editorial / utility set
  "nordic",
  "graphite",
  "paper",
  "sage",
  "terracotta",
  "lavender",
  "monochrome",
  "terminal",
  "rose",
  "high-contrast",
] as const;

export const CONTENT_WIDTHS = [
  "full-width",
  "contained",
  "narrow",
  "wide",
  "ultra-wide",
] as const;

/**
 * Bounds for custom numeric content width values (pixels).
 * Mirror the regex in the Postgres CHECK constraint (see migration
 * `0017_custom_content_width.sql`) and the Zod schema in
 * `lib/global-settings.ts`. Allow up to 5 digits (max 99999) at the DB
 * level; app-level validation tightens the upper bound to `MAX_CUSTOM_CONTENT_WIDTH_PX`.
 */
export const MIN_CUSTOM_CONTENT_WIDTH_PX = 1;
export const MAX_CUSTOM_CONTENT_WIDTH_PX = 10_000;

export const FONT_PRESETS = [
  "system",
  "sans",
  "serif",
  "mono",
  "display",
  "humanist",
] as const;

export const RADIUS_PRESETS = [
  "none",
  "small",
  "medium",
  "large",
  "rounded",
] as const;

export const SHADOW_PRESETS = ["none", "soft", "medium", "strong"] as const;

export type Theme = (typeof THEMES)[number];
export type ContentWidthPreset = (typeof CONTENT_WIDTHS)[number];
/**
 * A content width value is either one of the semantic presets in
 * `CONTENT_WIDTHS` OR a positive integer-as-string representing the
 * `max-width` in pixels (e.g. `"900"`). Custom values are always stored
 * as plain digit strings (no `"px"` suffix) so the DB CHECK constraint
 * stays simple. Use `parseCustomContentWidth` / `normalizeContentWidth`
 * to validate untrusted input.
 */
export type ContentWidth = ContentWidthPreset | string;
export type FontPreset = (typeof FONT_PRESETS)[number];
export type RadiusPreset = (typeof RADIUS_PRESETS)[number];
export type ShadowPreset = (typeof SHADOW_PRESETS)[number];

export const DEFAULT_THEME: Theme = "default";
/**
 * @deprecated Prefer `DEFAULT_FRONTEND_CONTENT_WIDTH` /
 * `DEFAULT_BACKEND_CONTENT_WIDTH`. Kept as a shared fallback used by both.
 */
export const DEFAULT_CONTENT_WIDTH: ContentWidthPreset = "contained";
export const DEFAULT_FRONTEND_CONTENT_WIDTH: ContentWidthPreset = "contained";
export const DEFAULT_BACKEND_CONTENT_WIDTH: ContentWidthPreset = "contained";
export const DEFAULT_FONT_PRESET: FontPreset = "system";
export const DEFAULT_RADIUS_PRESET: RadiusPreset = "medium";
export const DEFAULT_SHADOW_PRESET: ShadowPreset = "soft";

export type AppearanceSettings = {
  theme: Theme;
  /** Max content width applied to public-facing layouts (pages, blog posts). */
  frontendContentWidth: ContentWidth;
  /** Max content width applied to admin/dashboard layouts. */
  backendContentWidth: ContentWidth;
  fontPreset: FontPreset;
  radiusPreset: RadiusPreset;
  shadowPreset: ShadowPreset;
};

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  theme: DEFAULT_THEME,
  frontendContentWidth: DEFAULT_FRONTEND_CONTENT_WIDTH,
  backendContentWidth: DEFAULT_BACKEND_CONTENT_WIDTH,
  fontPreset: DEFAULT_FONT_PRESET,
  radiusPreset: DEFAULT_RADIUS_PRESET,
  shadowPreset: DEFAULT_SHADOW_PRESET,
};

// ─── Theme palettes ──────────────────────────────────────────────────────────

type Palette = Record<string, string>;

/**
 * Shared light / dark base palettes. New themes spread the appropriate
 * base and override only the variables they need (colors, accents,
 * borders), which keeps the registry compact and avoids copy-pasting
 * a 25-key palette for every variant.
 *
 * The original `default`/`dark`/`minimal`/`corporate`/`cyberpunk`/`elegant`
 * palettes are intentionally written out in full to preserve their
 * exact values (no regression risk).
 */
const LIGHT_BASE: Palette = {
  "--background": "oklch(1 0 0)",
  "--foreground": "oklch(0.18 0 0)",
  "--card": "oklch(1 0 0)",
  "--card-foreground": "oklch(0.18 0 0)",
  "--popover": "oklch(1 0 0)",
  "--popover-foreground": "oklch(0.18 0 0)",
  "--primary": "oklch(0.35 0 0)",
  "--primary-foreground": "oklch(0.985 0 0)",
  "--secondary": "oklch(0.95 0 0)",
  "--secondary-foreground": "oklch(0.2 0 0)",
  "--muted": "oklch(0.96 0 0)",
  "--muted-foreground": "oklch(0.5 0 0)",
  "--accent": "oklch(0.92 0 0)",
  "--accent-foreground": "oklch(0.2 0 0)",
  "--destructive": "oklch(0.577 0.245 27.325)",
  "--border": "oklch(0.9 0 0)",
  "--input": "oklch(0.9 0 0)",
  "--ring": "oklch(0.6 0 0)",
  "--sidebar": "oklch(0.97 0 0)",
  "--sidebar-foreground": "oklch(0.18 0 0)",
  "--sidebar-primary": "oklch(0.35 0 0)",
  "--sidebar-primary-foreground": "oklch(0.985 0 0)",
  "--sidebar-accent": "oklch(0.92 0 0)",
  "--sidebar-accent-foreground": "oklch(0.2 0 0)",
  "--sidebar-border": "oklch(0.9 0 0)",
  "--sidebar-ring": "oklch(0.6 0 0)",
};

const DARK_BASE: Palette = {
  "--background": "oklch(0.145 0 0)",
  "--foreground": "oklch(0.97 0 0)",
  "--card": "oklch(0.2 0 0)",
  "--card-foreground": "oklch(0.97 0 0)",
  "--popover": "oklch(0.2 0 0)",
  "--popover-foreground": "oklch(0.97 0 0)",
  "--primary": "oklch(0.9 0 0)",
  "--primary-foreground": "oklch(0.2 0 0)",
  "--secondary": "oklch(0.27 0 0)",
  "--secondary-foreground": "oklch(0.97 0 0)",
  "--muted": "oklch(0.27 0 0)",
  "--muted-foreground": "oklch(0.7 0 0)",
  "--accent": "oklch(0.3 0 0)",
  "--accent-foreground": "oklch(0.97 0 0)",
  "--destructive": "oklch(0.704 0.191 22.216)",
  "--border": "oklch(1 0 0 / 12%)",
  "--input": "oklch(1 0 0 / 15%)",
  "--ring": "oklch(0.55 0 0)",
  "--sidebar": "oklch(0.2 0 0)",
  "--sidebar-foreground": "oklch(0.97 0 0)",
  "--sidebar-primary": "oklch(0.9 0 0)",
  "--sidebar-primary-foreground": "oklch(0.2 0 0)",
  "--sidebar-accent": "oklch(0.3 0 0)",
  "--sidebar-accent-foreground": "oklch(0.97 0 0)",
  "--sidebar-border": "oklch(1 0 0 / 12%)",
  "--sidebar-ring": "oklch(0.55 0 0)",
};

const THEME_PALETTES: Record<Theme, { dark: boolean; vars: Palette }> = {
  default: {
    dark: false,
    vars: {
      "--background": "oklch(1 0 0)",
      "--foreground": "oklch(0.145 0 0)",
      "--card": "oklch(1 0 0)",
      "--card-foreground": "oklch(0.145 0 0)",
      "--popover": "oklch(1 0 0)",
      "--popover-foreground": "oklch(0.145 0 0)",
      "--primary": "oklch(0.18 0 0)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--secondary": "oklch(0.97 0 0)",
      "--secondary-foreground": "oklch(0.205 0 0)",
      "--muted": "oklch(0.97 0 0)",
      "--muted-foreground": "oklch(0.556 0 0)",
      "--accent": "oklch(0.97 0 0)",
      "--accent-foreground": "oklch(0.205 0 0)",
      "--destructive": "oklch(0.577 0.245 27.325)",
      "--border": "oklch(0.922 0 0)",
      "--input": "oklch(0.922 0 0)",
      "--ring": "oklch(0.708 0 0)",
      "--sidebar": "oklch(0.985 0 0)",
      "--sidebar-foreground": "oklch(0.145 0 0)",
      "--sidebar-primary": "oklch(0.18 0 0)",
      "--sidebar-primary-foreground": "oklch(0.985 0 0)",
      "--sidebar-accent": "oklch(0.97 0 0)",
      "--sidebar-accent-foreground": "oklch(0.205 0 0)",
      "--sidebar-border": "oklch(0.922 0 0)",
      "--sidebar-ring": "oklch(0.708 0 0)",
    },
  },
  dark: {
    dark: true,
    vars: {
      "--background": "oklch(0.145 0 0)",
      "--foreground": "oklch(0.985 0 0)",
      "--card": "oklch(0.18 0 0)",
      "--card-foreground": "oklch(0.985 0 0)",
      "--popover": "oklch(0.205 0 0)",
      "--popover-foreground": "oklch(0.985 0 0)",
      "--primary": "oklch(0.95 0 0)",
      "--primary-foreground": "oklch(0.16 0 0)",
      "--secondary": "oklch(0.269 0 0)",
      "--secondary-foreground": "oklch(0.985 0 0)",
      "--muted": "oklch(0.269 0 0)",
      "--muted-foreground": "oklch(0.708 0 0)",
      "--accent": "oklch(0.269 0 0)",
      "--accent-foreground": "oklch(0.985 0 0)",
      "--destructive": "oklch(0.704 0.191 22.216)",
      "--border": "oklch(1 0 0 / 10%)",
      "--input": "oklch(1 0 0 / 15%)",
      "--ring": "oklch(0.556 0 0)",
      "--sidebar": "oklch(0.18 0 0)",
      "--sidebar-foreground": "oklch(0.985 0 0)",
      "--sidebar-primary": "oklch(0.488 0.243 264.376)",
      "--sidebar-primary-foreground": "oklch(0.985 0 0)",
      "--sidebar-accent": "oklch(0.269 0 0)",
      "--sidebar-accent-foreground": "oklch(0.985 0 0)",
      "--sidebar-border": "oklch(1 0 0 / 10%)",
      "--sidebar-ring": "oklch(0.556 0 0)",
    },
  },
  minimal: {
    dark: false,
    vars: {
      "--background": "oklch(0.985 0 0)",
      "--foreground": "oklch(0.18 0 0)",
      "--card": "oklch(1 0 0)",
      "--card-foreground": "oklch(0.18 0 0)",
      "--popover": "oklch(1 0 0)",
      "--popover-foreground": "oklch(0.18 0 0)",
      "--primary": "oklch(0.18 0 0)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--secondary": "oklch(0.95 0 0)",
      "--secondary-foreground": "oklch(0.18 0 0)",
      "--muted": "oklch(0.96 0 0)",
      "--muted-foreground": "oklch(0.5 0 0)",
      "--accent": "oklch(0.93 0 0)",
      "--accent-foreground": "oklch(0.18 0 0)",
      "--destructive": "oklch(0.577 0.245 27.325)",
      "--border": "oklch(0.9 0 0)",
      "--input": "oklch(0.9 0 0)",
      "--ring": "oklch(0.7 0 0)",
      "--sidebar": "oklch(0.97 0 0)",
      "--sidebar-foreground": "oklch(0.18 0 0)",
      "--sidebar-primary": "oklch(0.18 0 0)",
      "--sidebar-primary-foreground": "oklch(0.985 0 0)",
      "--sidebar-accent": "oklch(0.93 0 0)",
      "--sidebar-accent-foreground": "oklch(0.205 0 0)",
      "--sidebar-border": "oklch(0.9 0 0)",
      "--sidebar-ring": "oklch(0.7 0 0)",
    },
  },
  corporate: {
    dark: false,
    vars: {
      "--background": "oklch(0.99 0.005 240)",
      "--foreground": "oklch(0.17 0.03 250)",
      "--card": "oklch(1 0 0)",
      "--card-foreground": "oklch(0.17 0.03 250)",
      "--popover": "oklch(1 0 0)",
      "--popover-foreground": "oklch(0.17 0.03 250)",
      "--primary": "oklch(0.18 0.14 255)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--secondary": "oklch(0.94 0.02 245)",
      "--secondary-foreground": "oklch(0.18 0.05 255)",
      "--muted": "oklch(0.95 0.01 240)",
      "--muted-foreground": "oklch(0.5 0.03 250)",
      "--accent": "oklch(0.9 0.04 245)",
      "--accent-foreground": "oklch(0.18 0.05 255)",
      "--destructive": "oklch(0.577 0.245 27.325)",
      "--border": "oklch(0.9 0.02 245)",
      "--input": "oklch(0.9 0.02 245)",
      "--ring": "oklch(0.55 0.15 255)",
      "--sidebar": "oklch(0.96 0.015 245)",
      "--sidebar-foreground": "oklch(0.17 0.03 250)",
      "--sidebar-primary": "oklch(0.18 0.14 255)",
      "--sidebar-primary-foreground": "oklch(0.985 0 0)",
      "--sidebar-accent": "oklch(0.9 0.04 245)",
      "--sidebar-accent-foreground": "oklch(0.25 0.05 255)",
      "--sidebar-border": "oklch(0.9 0.02 245)",
      "--sidebar-ring": "oklch(0.55 0.15 255)",
    },
  },
  cyberpunk: {
    dark: true,
    vars: {
      "--background": "oklch(0.12 0.04 295)",
      "--foreground": "oklch(0.96 0.05 180)",
      "--card": "oklch(0.15 0.06 295)",
      "--card-foreground": "oklch(0.96 0.05 180)",
      "--popover": "oklch(0.15 0.06 295)",
      "--popover-foreground": "oklch(0.96 0.05 180)",
      "--primary": "oklch(0.75 0.25 330)",
      "--primary-foreground": "oklch(0.12 0.04 295)",
      "--secondary": "oklch(0.25 0.1 290)",
      "--secondary-foreground": "oklch(0.96 0.05 180)",
      "--muted": "oklch(0.22 0.06 295)",
      "--muted-foreground": "oklch(0.7 0.1 200)",
      "--accent": "oklch(0.7 0.25 195)",
      "--accent-foreground": "oklch(0.12 0.04 295)",
      "--destructive": "oklch(0.7 0.27 25)",
      "--border": "oklch(0.4 0.15 320 / 50%)",
      "--input": "oklch(0.3 0.1 295)",
      "--ring": "oklch(0.75 0.25 330)",
      "--sidebar": "oklch(0.15 0.05 295)",
      "--sidebar-foreground": "oklch(0.96 0.05 180)",
      "--sidebar-primary": "oklch(0.75 0.25 330)",
      "--sidebar-primary-foreground": "oklch(0.12 0.04 295)",
      "--sidebar-accent": "oklch(0.7 0.25 195)",
      "--sidebar-accent-foreground": "oklch(0.12 0.04 295)",
      "--sidebar-border": "oklch(0.4 0.15 320 / 50%)",
      "--sidebar-ring": "oklch(0.75 0.25 330)",
      // Navigation hover/focus/active surfaces.
      // The default (`accent` / `accent-foreground`) maps to a vivid cyan
      // background with a near-black foreground, which loses contrast inside
      // the dark-purple popover. Use a lifted purple surface with a bright
      // foreground that stays readable on the dropdown background.
      "--nav-hover-bg": "oklch(0.34 0.14 320)",
      "--nav-hover-foreground": "oklch(0.98 0.04 180)",
    },
  },
  elegant: {
    dark: false,
    vars: {
      "--background": "oklch(0.97 0.01 80)",
      "--foreground": "oklch(0.17 0.02 30)",
      "--card": "oklch(0.99 0.01 80)",
      "--card-foreground": "oklch(0.17 0.02 30)",
      "--popover": "oklch(0.99 0.01 80)",
      "--popover-foreground": "oklch(0.17 0.02 30)",
      "--primary": "oklch(0.16 0.05 25)",
      "--primary-foreground": "oklch(0.97 0.02 80)",
      "--secondary": "oklch(0.9 0.03 70)",
      "--secondary-foreground": "oklch(0.18 0.03 30)",
      "--muted": "oklch(0.93 0.02 75)",
      "--muted-foreground": "oklch(0.45 0.03 40)",
      "--accent": "oklch(0.75 0.1 60)",
      "--accent-foreground": "oklch(0.17 0.02 30)",
      "--destructive": "oklch(0.55 0.22 25)",
      "--border": "oklch(0.85 0.03 70)",
      "--input": "oklch(0.85 0.03 70)",
      "--ring": "oklch(0.6 0.08 50)",
      "--sidebar": "oklch(0.94 0.02 75)",
      "--sidebar-foreground": "oklch(0.17 0.02 30)",
      "--sidebar-primary": "oklch(0.16 0.05 25)",
      "--sidebar-primary-foreground": "oklch(0.97 0.02 80)",
      "--sidebar-accent": "oklch(0.75 0.1 60)",
      "--sidebar-accent-foreground": "oklch(0.17 0.02 30)",
      "--sidebar-border": "oklch(0.85 0.03 70)",
      "--sidebar-ring": "oklch(0.6 0.08 50)",
    },
  },

  // ─── Nature / soft (light) ────────────────────────────────────────────────
  forest: {
    dark: false,
    vars: {
      ...LIGHT_BASE,
      "--background": "oklch(0.975 0.015 130)",
      "--foreground": "oklch(0.17 0.04 150)",
      "--card": "oklch(0.99 0.01 130)",
      "--card-foreground": "oklch(0.17 0.04 150)",
      "--popover": "oklch(0.99 0.01 130)",
      "--popover-foreground": "oklch(0.17 0.04 150)",
      "--primary": "oklch(0.16 0.1 150)",
      "--primary-foreground": "oklch(0.98 0.02 130)",
      "--secondary": "oklch(0.9 0.04 135)",
      "--secondary-foreground": "oklch(0.18 0.05 150)",
      "--muted": "oklch(0.93 0.025 130)",
      "--muted-foreground": "oklch(0.45 0.04 150)",
      "--accent": "oklch(0.78 0.09 145)",
      "--accent-foreground": "oklch(0.17 0.05 150)",
      "--border": "oklch(0.85 0.035 135)",
      "--input": "oklch(0.85 0.035 135)",
      "--ring": "oklch(0.55 0.1 150)",
      "--sidebar": "oklch(0.94 0.025 135)",
      "--sidebar-foreground": "oklch(0.17 0.04 150)",
      "--sidebar-primary": "oklch(0.16 0.1 150)",
      "--sidebar-primary-foreground": "oklch(0.98 0.02 130)",
      "--sidebar-accent": "oklch(0.78 0.09 145)",
      "--sidebar-accent-foreground": "oklch(0.17 0.05 150)",
      "--sidebar-border": "oklch(0.85 0.035 135)",
      "--sidebar-ring": "oklch(0.55 0.1 150)",
    },
  },
  ocean: {
    dark: false,
    vars: {
      ...LIGHT_BASE,
      "--background": "oklch(0.98 0.015 220)",
      "--foreground": "oklch(0.17 0.05 240)",
      "--card": "oklch(1 0 0)",
      "--card-foreground": "oklch(0.17 0.05 240)",
      "--popover": "oklch(1 0 0)",
      "--popover-foreground": "oklch(0.17 0.05 240)",
      "--primary": "oklch(0.16 0.12 235)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--secondary": "oklch(0.92 0.04 220)",
      "--secondary-foreground": "oklch(0.18 0.06 240)",
      "--muted": "oklch(0.95 0.02 215)",
      "--muted-foreground": "oklch(0.48 0.05 235)",
      "--accent": "oklch(0.82 0.09 200)",
      "--accent-foreground": "oklch(0.17 0.06 240)",
      "--border": "oklch(0.88 0.03 220)",
      "--input": "oklch(0.88 0.03 220)",
      "--ring": "oklch(0.6 0.13 220)",
      "--sidebar": "oklch(0.95 0.02 220)",
      "--sidebar-foreground": "oklch(0.17 0.05 240)",
      "--sidebar-primary": "oklch(0.16 0.12 235)",
      "--sidebar-primary-foreground": "oklch(0.985 0 0)",
      "--sidebar-accent": "oklch(0.82 0.09 200)",
      "--sidebar-accent-foreground": "oklch(0.17 0.06 240)",
      "--sidebar-border": "oklch(0.88 0.03 220)",
      "--sidebar-ring": "oklch(0.6 0.13 220)",
    },
  },
  sunset: {
    dark: false,
    vars: {
      ...LIGHT_BASE,
      "--background": "oklch(0.98 0.02 60)",
      "--foreground": "oklch(0.17 0.05 30)",
      "--card": "oklch(0.99 0.015 60)",
      "--card-foreground": "oklch(0.17 0.05 30)",
      "--popover": "oklch(0.99 0.015 60)",
      "--popover-foreground": "oklch(0.17 0.05 30)",
      "--primary": "oklch(0.16 0.16 35)",
      "--primary-foreground": "oklch(0.99 0.01 60)",
      "--secondary": "oklch(0.92 0.05 50)",
      "--secondary-foreground": "oklch(0.18 0.06 30)",
      "--muted": "oklch(0.95 0.025 55)",
      "--muted-foreground": "oklch(0.48 0.05 35)",
      "--accent": "oklch(0.65 0.18 320)",
      "--accent-foreground": "oklch(0.99 0.01 320)",
      "--border": "oklch(0.88 0.04 50)",
      "--input": "oklch(0.88 0.04 50)",
      "--ring": "oklch(0.62 0.18 35)",
      "--sidebar": "oklch(0.95 0.03 50)",
      "--sidebar-foreground": "oklch(0.17 0.05 30)",
      "--sidebar-primary": "oklch(0.16 0.16 35)",
      "--sidebar-primary-foreground": "oklch(0.99 0.01 60)",
      "--sidebar-accent": "oklch(0.65 0.18 320)",
      "--sidebar-accent-foreground": "oklch(0.99 0.01 320)",
      "--sidebar-border": "oklch(0.88 0.04 50)",
      "--sidebar-ring": "oklch(0.62 0.18 35)",
      "--nav-hover-bg": "oklch(0.22 0.09 35)",
      "--nav-hover-foreground": "oklch(0.99 0.015 60)",
    },
  },
  pastel: {
    dark: false,
    vars: {
      ...LIGHT_BASE,
      "--background": "oklch(0.985 0.012 340)",
      "--foreground": "oklch(0.18 0.05 300)",
      "--card": "oklch(0.99 0.008 340)",
      "--card-foreground": "oklch(0.18 0.05 300)",
      "--popover": "oklch(0.99 0.008 340)",
      "--popover-foreground": "oklch(0.18 0.05 300)",
      "--primary": "oklch(0.18 0.09 335)",
      "--primary-foreground": "oklch(0.99 0.005 340)",
      "--secondary": "oklch(0.93 0.04 170)",
      "--secondary-foreground": "oklch(0.18 0.05 300)",
      "--muted": "oklch(0.95 0.02 340)",
      "--muted-foreground": "oklch(0.42 0.05 300)",
      "--accent": "oklch(0.88 0.07 270)",
      "--accent-foreground": "oklch(0.18 0.05 300)",
      "--border": "oklch(0.9 0.03 340)",
      "--input": "oklch(0.9 0.03 340)",
      "--ring": "oklch(0.38 0.08 335)",
      "--sidebar": "oklch(0.96 0.02 340)",
      "--sidebar-foreground": "oklch(0.18 0.05 300)",
      "--sidebar-primary": "oklch(0.18 0.09 335)",
      "--sidebar-primary-foreground": "oklch(0.99 0.005 340)",
      "--sidebar-accent": "oklch(0.88 0.07 270)",
      "--sidebar-accent-foreground": "oklch(0.18 0.05 300)",
      "--sidebar-border": "oklch(0.9 0.03 340)",
      "--sidebar-ring": "oklch(0.38 0.08 335)",
    },
  },

  // ─── Premium / high-end (dark) ────────────────────────────────────────────
  luxury: {
    dark: true,
    vars: {
      ...DARK_BASE,
      "--background": "oklch(0.13 0.005 80)",
      "--foreground": "oklch(0.95 0.03 85)",
      "--card": "oklch(0.17 0.008 80)",
      "--card-foreground": "oklch(0.95 0.03 85)",
      "--popover": "oklch(0.17 0.008 80)",
      "--popover-foreground": "oklch(0.95 0.03 85)",
      "--primary": "oklch(0.78 0.13 85)",
      "--primary-foreground": "oklch(0.13 0.01 80)",
      "--secondary": "oklch(0.24 0.015 80)",
      "--secondary-foreground": "oklch(0.95 0.03 85)",
      "--muted": "oklch(0.22 0.01 80)",
      "--muted-foreground": "oklch(0.72 0.04 85)",
      "--accent": "oklch(0.7 0.11 75)",
      "--accent-foreground": "oklch(0.13 0.01 80)",
      "--border": "oklch(0.78 0.13 85 / 25%)",
      "--input": "oklch(0.3 0.015 80)",
      "--ring": "oklch(0.78 0.13 85)",
      "--sidebar": "oklch(0.15 0.008 80)",
      "--sidebar-foreground": "oklch(0.95 0.03 85)",
      "--sidebar-primary": "oklch(0.78 0.13 85)",
      "--sidebar-primary-foreground": "oklch(0.13 0.01 80)",
      "--sidebar-accent": "oklch(0.7 0.11 75)",
      "--sidebar-accent-foreground": "oklch(0.13 0.01 80)",
      "--sidebar-border": "oklch(0.78 0.13 85 / 25%)",
      "--sidebar-ring": "oklch(0.78 0.13 85)",
      "--nav-hover-bg": "oklch(0.26 0.03 80)",
      "--nav-hover-foreground": "oklch(0.95 0.05 85)",
    },
  },
  obsidian: {
    dark: true,
    vars: {
      ...DARK_BASE,
      "--background": "oklch(0.08 0 0)",
      "--foreground": "oklch(0.93 0 0)",
      "--card": "oklch(0.13 0 0)",
      "--card-foreground": "oklch(0.93 0 0)",
      "--popover": "oklch(0.13 0 0)",
      "--popover-foreground": "oklch(0.93 0 0)",
      "--primary": "oklch(0.85 0 0)",
      "--primary-foreground": "oklch(0.1 0 0)",
      "--secondary": "oklch(0.18 0 0)",
      "--secondary-foreground": "oklch(0.93 0 0)",
      "--muted": "oklch(0.16 0 0)",
      "--muted-foreground": "oklch(0.66 0 0)",
      "--accent": "oklch(0.22 0.02 260)",
      "--accent-foreground": "oklch(0.93 0 0)",
      "--border": "oklch(1 0 0 / 8%)",
      "--input": "oklch(1 0 0 / 10%)",
      "--ring": "oklch(0.6 0.04 260)",
      "--sidebar": "oklch(0.1 0 0)",
      "--sidebar-foreground": "oklch(0.93 0 0)",
      "--sidebar-primary": "oklch(0.85 0 0)",
      "--sidebar-primary-foreground": "oklch(0.1 0 0)",
      "--sidebar-accent": "oklch(0.22 0.02 260)",
      "--sidebar-accent-foreground": "oklch(0.93 0 0)",
      "--sidebar-border": "oklch(1 0 0 / 8%)",
      "--sidebar-ring": "oklch(0.6 0.04 260)",
    },
  },
  midnight: {
    dark: true,
    vars: {
      ...DARK_BASE,
      "--background": "oklch(0.16 0.04 260)",
      "--foreground": "oklch(0.94 0.02 240)",
      "--card": "oklch(0.16 0.05 260)",
      "--card-foreground": "oklch(0.94 0.02 240)",
      "--popover": "oklch(0.16 0.05 260)",
      "--popover-foreground": "oklch(0.94 0.02 240)",
      "--primary": "oklch(0.74 0.13 245)",
      "--primary-foreground": "oklch(0.12 0.04 260)",
      "--secondary": "oklch(0.27 0.06 260)",
      "--secondary-foreground": "oklch(0.94 0.02 240)",
      "--muted": "oklch(0.25 0.05 260)",
      "--muted-foreground": "oklch(0.72 0.05 240)",
      "--accent": "oklch(0.32 0.08 255)",
      "--accent-foreground": "oklch(0.95 0.03 240)",
      "--border": "oklch(0.72 0.13 245 / 18%)",
      "--input": "oklch(1 0 0 / 12%)",
      "--ring": "oklch(0.74 0.13 245)",
      "--sidebar": "oklch(0.19 0.05 260)",
      "--sidebar-foreground": "oklch(0.94 0.02 240)",
      "--sidebar-primary": "oklch(0.74 0.13 245)",
      "--sidebar-primary-foreground": "oklch(0.12 0.04 260)",
      "--sidebar-accent": "oklch(0.32 0.08 255)",
      "--sidebar-accent-foreground": "oklch(0.95 0.03 240)",
      "--sidebar-border": "oklch(0.72 0.13 245 / 18%)",
      "--sidebar-ring": "oklch(0.74 0.13 245)",
    },
  },
  aurora: {
    dark: true,
    vars: {
      ...DARK_BASE,
      "--background": "oklch(0.14 0.05 270)",
      "--foreground": "oklch(0.96 0.03 180)",
      "--card": "oklch(0.16 0.06 270)",
      "--card-foreground": "oklch(0.96 0.03 180)",
      "--popover": "oklch(0.16 0.06 270)",
      "--popover-foreground": "oklch(0.96 0.03 180)",
      "--primary": "oklch(0.78 0.18 160)",
      "--primary-foreground": "oklch(0.12 0.05 270)",
      "--secondary": "oklch(0.26 0.08 280)",
      "--secondary-foreground": "oklch(0.96 0.03 180)",
      "--muted": "oklch(0.23 0.06 270)",
      "--muted-foreground": "oklch(0.74 0.06 200)",
      "--accent": "oklch(0.7 0.2 320)",
      "--accent-foreground": "oklch(0.14 0.05 270)",
      "--border": "oklch(0.78 0.18 160 / 25%)",
      "--input": "oklch(0.3 0.08 270)",
      "--ring": "oklch(0.78 0.18 160)",
      "--sidebar": "oklch(0.17 0.06 270)",
      "--sidebar-foreground": "oklch(0.96 0.03 180)",
      "--sidebar-primary": "oklch(0.78 0.18 160)",
      "--sidebar-primary-foreground": "oklch(0.12 0.05 270)",
      "--sidebar-accent": "oklch(0.7 0.2 320)",
      "--sidebar-accent-foreground": "oklch(0.14 0.05 270)",
      "--sidebar-border": "oklch(0.78 0.18 160 / 25%)",
      "--sidebar-ring": "oklch(0.78 0.18 160)",
      "--nav-hover-bg": "oklch(0.3 0.1 280)",
      "--nav-hover-foreground": "oklch(0.97 0.05 180)",
    },
  },

  // ─── Expanded editorial / utility set ────────────────────────────────────
  nordic: {
    dark: false,
    vars: {
      ...LIGHT_BASE,
      "--background": "oklch(0.985 0.01 245)",
      "--foreground": "oklch(0.2 0.035 250)",
      "--card": "oklch(1 0 0)",
      "--card-foreground": "oklch(0.2 0.035 250)",
      "--popover": "oklch(1 0 0)",
      "--popover-foreground": "oklch(0.2 0.035 250)",
      "--primary": "oklch(0.32 0.09 245)",
      "--primary-foreground": "oklch(0.99 0.006 240)",
      "--secondary": "oklch(0.93 0.025 235)",
      "--secondary-foreground": "oklch(0.22 0.05 245)",
      "--muted": "oklch(0.95 0.018 235)",
      "--muted-foreground": "oklch(0.48 0.035 245)",
      "--accent": "oklch(0.82 0.06 220)",
      "--accent-foreground": "oklch(0.18 0.055 245)",
      "--border": "oklch(0.88 0.025 235)",
      "--input": "oklch(0.88 0.025 235)",
      "--ring": "oklch(0.58 0.1 235)",
      "--sidebar": "oklch(0.96 0.015 240)",
      "--sidebar-foreground": "oklch(0.2 0.035 250)",
      "--sidebar-primary": "oklch(0.32 0.09 245)",
      "--sidebar-primary-foreground": "oklch(0.99 0.006 240)",
      "--sidebar-accent": "oklch(0.9 0.03 230)",
      "--sidebar-accent-foreground": "oklch(0.22 0.05 245)",
      "--sidebar-border": "oklch(0.86 0.025 235)",
      "--sidebar-ring": "oklch(0.58 0.1 235)",
    },
  },
  graphite: {
    dark: true,
    vars: {
      ...DARK_BASE,
      "--background": "oklch(0.18 0.005 250)",
      "--foreground": "oklch(0.94 0.006 250)",
      "--card": "oklch(0.22 0.007 250)",
      "--card-foreground": "oklch(0.94 0.006 250)",
      "--popover": "oklch(0.22 0.007 250)",
      "--popover-foreground": "oklch(0.94 0.006 250)",
      "--primary": "oklch(0.82 0.015 250)",
      "--primary-foreground": "oklch(0.16 0.006 250)",
      "--secondary": "oklch(0.29 0.008 250)",
      "--secondary-foreground": "oklch(0.94 0.006 250)",
      "--muted": "oklch(0.27 0.007 250)",
      "--muted-foreground": "oklch(0.72 0.012 250)",
      "--accent": "oklch(0.36 0.03 230)",
      "--accent-foreground": "oklch(0.96 0.006 250)",
      "--border": "oklch(1 0 0 / 14%)",
      "--input": "oklch(1 0 0 / 16%)",
      "--ring": "oklch(0.62 0.035 230)",
      "--sidebar": "oklch(0.16 0.006 250)",
      "--sidebar-foreground": "oklch(0.94 0.006 250)",
      "--sidebar-primary": "oklch(0.82 0.015 250)",
      "--sidebar-primary-foreground": "oklch(0.16 0.006 250)",
      "--sidebar-accent": "oklch(0.31 0.025 230)",
      "--sidebar-accent-foreground": "oklch(0.96 0.006 250)",
      "--sidebar-border": "oklch(1 0 0 / 14%)",
      "--sidebar-ring": "oklch(0.62 0.035 230)",
      "--nav-hover-bg": "oklch(0.31 0.012 250)",
      "--nav-hover-foreground": "oklch(0.96 0.006 250)",
    },
  },
  paper: {
    dark: false,
    vars: {
      ...LIGHT_BASE,
      "--background": "oklch(0.985 0.012 95)",
      "--foreground": "oklch(0.2 0.03 70)",
      "--card": "oklch(1 0.004 95)",
      "--card-foreground": "oklch(0.2 0.03 70)",
      "--popover": "oklch(1 0.004 95)",
      "--popover-foreground": "oklch(0.2 0.03 70)",
      "--primary": "oklch(0.22 0.045 70)",
      "--primary-foreground": "oklch(0.985 0.012 95)",
      "--secondary": "oklch(0.94 0.02 95)",
      "--secondary-foreground": "oklch(0.22 0.04 70)",
      "--muted": "oklch(0.95 0.015 95)",
      "--muted-foreground": "oklch(0.48 0.035 70)",
      "--accent": "oklch(0.78 0.06 210)",
      "--accent-foreground": "oklch(0.17 0.04 230)",
      "--border": "oklch(0.87 0.025 90)",
      "--input": "oklch(0.87 0.025 90)",
      "--ring": "oklch(0.52 0.08 210)",
      "--sidebar": "oklch(0.95 0.018 95)",
      "--sidebar-foreground": "oklch(0.2 0.03 70)",
      "--sidebar-primary": "oklch(0.22 0.045 70)",
      "--sidebar-primary-foreground": "oklch(0.985 0.012 95)",
      "--sidebar-accent": "oklch(0.9 0.025 95)",
      "--sidebar-accent-foreground": "oklch(0.22 0.04 70)",
      "--sidebar-border": "oklch(0.85 0.025 90)",
      "--sidebar-ring": "oklch(0.52 0.08 210)",
    },
  },
  sage: {
    dark: false,
    vars: {
      ...LIGHT_BASE,
      "--background": "oklch(0.975 0.012 145)",
      "--foreground": "oklch(0.2 0.035 160)",
      "--card": "oklch(0.99 0.008 145)",
      "--card-foreground": "oklch(0.2 0.035 160)",
      "--popover": "oklch(0.99 0.008 145)",
      "--popover-foreground": "oklch(0.2 0.035 160)",
      "--primary": "oklch(0.28 0.07 155)",
      "--primary-foreground": "oklch(0.98 0.012 145)",
      "--secondary": "oklch(0.92 0.025 130)",
      "--secondary-foreground": "oklch(0.22 0.04 155)",
      "--muted": "oklch(0.94 0.018 135)",
      "--muted-foreground": "oklch(0.48 0.035 155)",
      "--accent": "oklch(0.82 0.045 140)",
      "--accent-foreground": "oklch(0.18 0.045 155)",
      "--border": "oklch(0.86 0.025 135)",
      "--input": "oklch(0.86 0.025 135)",
      "--ring": "oklch(0.55 0.08 150)",
      "--sidebar": "oklch(0.94 0.018 140)",
      "--sidebar-foreground": "oklch(0.2 0.035 160)",
      "--sidebar-primary": "oklch(0.28 0.07 155)",
      "--sidebar-primary-foreground": "oklch(0.98 0.012 145)",
      "--sidebar-accent": "oklch(0.88 0.03 135)",
      "--sidebar-accent-foreground": "oklch(0.22 0.04 155)",
      "--sidebar-border": "oklch(0.84 0.025 135)",
      "--sidebar-ring": "oklch(0.55 0.08 150)",
    },
  },
  terracotta: {
    dark: false,
    vars: {
      ...LIGHT_BASE,
      "--background": "oklch(0.975 0.018 75)",
      "--foreground": "oklch(0.22 0.04 45)",
      "--card": "oklch(0.99 0.012 75)",
      "--card-foreground": "oklch(0.22 0.04 45)",
      "--popover": "oklch(0.99 0.012 75)",
      "--popover-foreground": "oklch(0.22 0.04 45)",
      "--primary": "oklch(0.42 0.11 42)",
      "--primary-foreground": "oklch(0.98 0.015 75)",
      "--secondary": "oklch(0.91 0.045 65)",
      "--secondary-foreground": "oklch(0.23 0.05 45)",
      "--muted": "oklch(0.94 0.028 70)",
      "--muted-foreground": "oklch(0.5 0.045 45)",
      "--accent": "oklch(0.65 0.09 85)",
      "--accent-foreground": "oklch(0.19 0.04 45)",
      "--border": "oklch(0.84 0.04 65)",
      "--input": "oklch(0.84 0.04 65)",
      "--ring": "oklch(0.52 0.12 42)",
      "--sidebar": "oklch(0.94 0.028 70)",
      "--sidebar-foreground": "oklch(0.22 0.04 45)",
      "--sidebar-primary": "oklch(0.42 0.11 42)",
      "--sidebar-primary-foreground": "oklch(0.98 0.015 75)",
      "--sidebar-accent": "oklch(0.87 0.045 70)",
      "--sidebar-accent-foreground": "oklch(0.23 0.05 45)",
      "--sidebar-border": "oklch(0.82 0.04 65)",
      "--sidebar-ring": "oklch(0.52 0.12 42)",
    },
  },
  lavender: {
    dark: false,
    vars: {
      ...LIGHT_BASE,
      "--background": "oklch(0.985 0.015 300)",
      "--foreground": "oklch(0.22 0.045 285)",
      "--card": "oklch(0.995 0.008 300)",
      "--card-foreground": "oklch(0.22 0.045 285)",
      "--popover": "oklch(0.995 0.008 300)",
      "--popover-foreground": "oklch(0.22 0.045 285)",
      "--primary": "oklch(0.34 0.11 285)",
      "--primary-foreground": "oklch(0.99 0.008 300)",
      "--secondary": "oklch(0.93 0.035 285)",
      "--secondary-foreground": "oklch(0.24 0.055 285)",
      "--muted": "oklch(0.95 0.02 295)",
      "--muted-foreground": "oklch(0.5 0.045 285)",
      "--accent": "oklch(0.87 0.06 310)",
      "--accent-foreground": "oklch(0.22 0.055 285)",
      "--border": "oklch(0.88 0.03 290)",
      "--input": "oklch(0.88 0.03 290)",
      "--ring": "oklch(0.57 0.12 285)",
      "--sidebar": "oklch(0.96 0.02 295)",
      "--sidebar-foreground": "oklch(0.22 0.045 285)",
      "--sidebar-primary": "oklch(0.34 0.11 285)",
      "--sidebar-primary-foreground": "oklch(0.99 0.008 300)",
      "--sidebar-accent": "oklch(0.9 0.045 305)",
      "--sidebar-accent-foreground": "oklch(0.24 0.055 285)",
      "--sidebar-border": "oklch(0.86 0.03 290)",
      "--sidebar-ring": "oklch(0.57 0.12 285)",
    },
  },
  monochrome: {
    dark: false,
    vars: {
      ...LIGHT_BASE,
      "--background": "oklch(0.995 0 0)",
      "--foreground": "oklch(0.12 0 0)",
      "--card": "oklch(1 0 0)",
      "--card-foreground": "oklch(0.12 0 0)",
      "--popover": "oklch(1 0 0)",
      "--popover-foreground": "oklch(0.12 0 0)",
      "--primary": "oklch(0.08 0 0)",
      "--primary-foreground": "oklch(0.99 0 0)",
      "--secondary": "oklch(0.94 0 0)",
      "--secondary-foreground": "oklch(0.12 0 0)",
      "--muted": "oklch(0.965 0 0)",
      "--muted-foreground": "oklch(0.42 0 0)",
      "--accent": "oklch(0.9 0 0)",
      "--accent-foreground": "oklch(0.12 0 0)",
      "--border": "oklch(0.82 0 0)",
      "--input": "oklch(0.82 0 0)",
      "--ring": "oklch(0.24 0 0)",
      "--sidebar": "oklch(0.96 0 0)",
      "--sidebar-foreground": "oklch(0.12 0 0)",
      "--sidebar-primary": "oklch(0.08 0 0)",
      "--sidebar-primary-foreground": "oklch(0.99 0 0)",
      "--sidebar-accent": "oklch(0.9 0 0)",
      "--sidebar-accent-foreground": "oklch(0.12 0 0)",
      "--sidebar-border": "oklch(0.8 0 0)",
      "--sidebar-ring": "oklch(0.24 0 0)",
    },
  },
  terminal: {
    dark: true,
    vars: {
      ...DARK_BASE,
      "--background": "oklch(0.11 0.03 145)",
      "--foreground": "oklch(0.91 0.06 145)",
      "--card": "oklch(0.15 0.035 145)",
      "--card-foreground": "oklch(0.91 0.06 145)",
      "--popover": "oklch(0.15 0.035 145)",
      "--popover-foreground": "oklch(0.91 0.06 145)",
      "--primary": "oklch(0.78 0.19 145)",
      "--primary-foreground": "oklch(0.08 0.03 145)",
      "--secondary": "oklch(0.22 0.045 145)",
      "--secondary-foreground": "oklch(0.91 0.06 145)",
      "--muted": "oklch(0.19 0.035 145)",
      "--muted-foreground": "oklch(0.72 0.07 145)",
      "--accent": "oklch(0.82 0.16 95)",
      "--accent-foreground": "oklch(0.09 0.025 145)",
      "--destructive": "oklch(0.7 0.21 25)",
      "--border": "oklch(0.78 0.19 145 / 22%)",
      "--input": "oklch(0.78 0.19 145 / 18%)",
      "--ring": "oklch(0.78 0.19 145)",
      "--sidebar": "oklch(0.09 0.025 145)",
      "--sidebar-foreground": "oklch(0.91 0.06 145)",
      "--sidebar-primary": "oklch(0.78 0.19 145)",
      "--sidebar-primary-foreground": "oklch(0.08 0.03 145)",
      "--sidebar-accent": "oklch(0.22 0.045 145)",
      "--sidebar-accent-foreground": "oklch(0.91 0.06 145)",
      "--sidebar-border": "oklch(0.78 0.19 145 / 22%)",
      "--sidebar-ring": "oklch(0.78 0.19 145)",
      "--nav-hover-bg": "oklch(0.22 0.06 145)",
      "--nav-hover-foreground": "oklch(0.93 0.08 145)",
    },
  },
  rose: {
    dark: false,
    vars: {
      ...LIGHT_BASE,
      "--background": "oklch(0.985 0.012 5)",
      "--foreground": "oklch(0.22 0.04 350)",
      "--card": "oklch(0.995 0.008 5)",
      "--card-foreground": "oklch(0.22 0.04 350)",
      "--popover": "oklch(0.995 0.008 5)",
      "--popover-foreground": "oklch(0.22 0.04 350)",
      "--primary": "oklch(0.36 0.11 350)",
      "--primary-foreground": "oklch(0.99 0.008 5)",
      "--secondary": "oklch(0.94 0.03 350)",
      "--secondary-foreground": "oklch(0.24 0.05 350)",
      "--muted": "oklch(0.955 0.018 5)",
      "--muted-foreground": "oklch(0.5 0.045 350)",
      "--accent": "oklch(0.88 0.06 5)",
      "--accent-foreground": "oklch(0.22 0.05 350)",
      "--border": "oklch(0.88 0.028 5)",
      "--input": "oklch(0.88 0.028 5)",
      "--ring": "oklch(0.58 0.12 350)",
      "--sidebar": "oklch(0.96 0.018 5)",
      "--sidebar-foreground": "oklch(0.22 0.04 350)",
      "--sidebar-primary": "oklch(0.36 0.11 350)",
      "--sidebar-primary-foreground": "oklch(0.99 0.008 5)",
      "--sidebar-accent": "oklch(0.9 0.04 5)",
      "--sidebar-accent-foreground": "oklch(0.24 0.05 350)",
      "--sidebar-border": "oklch(0.86 0.028 5)",
      "--sidebar-ring": "oklch(0.58 0.12 350)",
    },
  },
  "high-contrast": {
    dark: true,
    vars: {
      ...DARK_BASE,
      "--background": "oklch(0.05 0 0)",
      "--foreground": "oklch(1 0 0)",
      "--card": "oklch(0.12 0 0)",
      "--card-foreground": "oklch(1 0 0)",
      "--popover": "oklch(0.12 0 0)",
      "--popover-foreground": "oklch(1 0 0)",
      "--primary": "oklch(0.9 0.2 100)",
      "--primary-foreground": "oklch(0.05 0 0)",
      "--secondary": "oklch(0.22 0 0)",
      "--secondary-foreground": "oklch(1 0 0)",
      "--muted": "oklch(0.2 0 0)",
      "--muted-foreground": "oklch(0.86 0 0)",
      "--accent": "oklch(0.85 0.16 200)",
      "--accent-foreground": "oklch(0.05 0 0)",
      "--destructive": "oklch(0.72 0.22 25)",
      "--border": "oklch(1 0 0 / 50%)",
      "--input": "oklch(1 0 0 / 55%)",
      "--ring": "oklch(0.9 0.2 100)",
      "--sidebar": "oklch(0.08 0 0)",
      "--sidebar-foreground": "oklch(1 0 0)",
      "--sidebar-primary": "oklch(0.9 0.2 100)",
      "--sidebar-primary-foreground": "oklch(0.05 0 0)",
      "--sidebar-accent": "oklch(0.85 0.16 200)",
      "--sidebar-accent-foreground": "oklch(0.05 0 0)",
      "--sidebar-border": "oklch(1 0 0 / 55%)",
      "--sidebar-ring": "oklch(0.9 0.2 100)",
      "--nav-hover-bg": "oklch(0.9 0.2 100)",
      "--nav-hover-foreground": "oklch(0.05 0 0)",
    },
  },
};

// ─── Content width ──────────────────────────────────────────────────────────

const CONTENT_WIDTH_VALUES: Record<ContentWidthPreset, string> = {
  "full-width": "100%",
  contained: "72rem",
  narrow: "56rem",
  wide: "90rem",
  "ultra-wide": "110rem",
};

/** Type guard: is the value one of the predefined preset keys? */
export function isContentWidthPreset(
  value: unknown,
): value is ContentWidthPreset {
  return (
    typeof value === "string" &&
    (CONTENT_WIDTHS as readonly string[]).includes(value)
  );
}

/**
 * Parse a user-supplied custom width. Accepts plain digit strings
 * (`"900"`), numbers, or strings with a trailing `px` (`"900px"`,
 * `"900 px"`). Returns a clamped positive integer, or `null` when the
 * input is not a valid positive numeric width.
 */
export function parseCustomContentWidth(value: unknown): number | null {
  let n: number | null = null;
  if (typeof value === "number" && Number.isFinite(value)) {
    n = Math.trunc(value);
  } else if (typeof value === "string") {
    const trimmed = value
      .trim()
      .toLowerCase()
      .replace(/\s*px$/, "");
    if (/^\d+$/.test(trimmed)) {
      n = parseInt(trimmed, 10);
    }
  }
  if (n === null || !Number.isFinite(n)) return null;
  if (n < MIN_CUSTOM_CONTENT_WIDTH_PX) return null;
  if (n > MAX_CUSTOM_CONTENT_WIDTH_PX) return null;
  return n;
}

/** Returns true when `value` is a valid preset OR a valid custom width. */
export function isValidContentWidth(value: unknown): value is ContentWidth {
  if (isContentWidthPreset(value)) return true;
  return parseCustomContentWidth(value) !== null;
}

/**
 * Coerce arbitrary input into a canonical stored representation:
 * either a preset key, or a digit-only string for custom widths.
 * Falls back to `fallback` when the value is invalid.
 */
export function normalizeContentWidth(
  value: unknown,
  fallback: ContentWidth,
): ContentWidth {
  if (isContentWidthPreset(value)) return value;
  const n = parseCustomContentWidth(value);
  if (n !== null) return String(n);
  return fallback;
}

/** Map a `ContentWidth` value (preset OR custom px) to its CSS length string. */
export function getContentWidthValue(width: ContentWidth): string {
  if (isContentWidthPreset(width)) return CONTENT_WIDTH_VALUES[width];
  const n = parseCustomContentWidth(width);
  if (n !== null) return `${n}px`;
  return CONTENT_WIDTH_VALUES[DEFAULT_CONTENT_WIDTH];
}

// ─── Fonts ──────────────────────────────────────────────────────────────────

const SYSTEM_SANS_STACK =
  "var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const SYSTEM_MONO_STACK =
  "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

type FontLink = { href: string; rel: "stylesheet" | "preconnect" };

const GFONTS_PRECONNECT: FontLink[] = [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com" },
];

type FontConfig = {
  vars: {
    "--font-sans": string;
    "--font-heading": string;
    "--font-mono": string;
  };
  links: FontLink[];
};

const FONT_CONFIGS: Record<FontPreset, FontConfig> = {
  system: {
    vars: {
      "--font-sans": SYSTEM_SANS_STACK,
      "--font-heading": SYSTEM_SANS_STACK,
      "--font-mono": SYSTEM_MONO_STACK,
    },
    links: [],
  },
  sans: {
    vars: {
      "--font-sans": SYSTEM_SANS_STACK,
      "--font-heading": SYSTEM_SANS_STACK,
      "--font-mono": SYSTEM_MONO_STACK,
    },
    links: [],
  },
  mono: {
    vars: {
      "--font-sans": SYSTEM_MONO_STACK,
      "--font-heading": SYSTEM_MONO_STACK,
      "--font-mono": SYSTEM_MONO_STACK,
    },
    links: [],
  },
  serif: {
    vars: {
      "--font-sans":
        "'Source Serif 4', Georgia, Cambria, 'Times New Roman', Times, serif",
      "--font-heading":
        "'Playfair Display', Georgia, Cambria, 'Times New Roman', Times, serif",
      "--font-mono": SYSTEM_MONO_STACK,
    },
    links: [
      ...GFONTS_PRECONNECT,
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Source+Serif+4:wght@400;600&display=swap",
      },
    ],
  },
  display: {
    vars: {
      "--font-sans": `'Inter', ${SYSTEM_SANS_STACK}`,
      "--font-heading": `'Space Grotesk', ${SYSTEM_SANS_STACK}`,
      "--font-mono": SYSTEM_MONO_STACK,
    },
    links: [
      ...GFONTS_PRECONNECT,
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap",
      },
    ],
  },
  humanist: {
    vars: {
      "--font-sans": `'Nunito Sans', ${SYSTEM_SANS_STACK}`,
      "--font-heading": `'Lora', Georgia, Cambria, serif`,
      "--font-mono": SYSTEM_MONO_STACK,
    },
    links: [
      ...GFONTS_PRECONNECT,
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Lora:wght@500;700&family=Nunito+Sans:wght@400;600&display=swap",
      },
    ],
  },
};

// ─── Radius ─────────────────────────────────────────────────────────────────

const RADIUS_VALUES: Record<RadiusPreset, string> = {
  none: "0rem",
  small: "0.375rem",
  medium: "0.625rem",
  large: "1rem",
  rounded: "1.5rem",
};

// ─── Shadows ────────────────────────────────────────────────────────────────

type ShadowVars = {
  "--shadow-xs": string;
  "--shadow-sm": string;
  "--shadow-md": string;
  "--shadow-lg": string;
};

const SHADOW_VALUES: Record<ShadowPreset, ShadowVars> = {
  none: {
    "--shadow-xs": "none",
    "--shadow-sm": "none",
    "--shadow-md": "none",
    "--shadow-lg": "none",
  },
  soft: {
    "--shadow-xs": "0 1px 2px 0 oklch(0 0 0 / 0.04)",
    "--shadow-sm":
      "0 1px 2px 0 oklch(0 0 0 / 0.05), 0 1px 1px -1px oklch(0 0 0 / 0.04)",
    "--shadow-md":
      "0 2px 4px -1px oklch(0 0 0 / 0.06), 0 4px 6px -1px oklch(0 0 0 / 0.05)",
    "--shadow-lg":
      "0 6px 10px -2px oklch(0 0 0 / 0.08), 0 10px 16px -4px oklch(0 0 0 / 0.06)",
  },
  medium: {
    "--shadow-xs": "0 1px 2px 0 oklch(0 0 0 / 0.08)",
    "--shadow-sm":
      "0 1px 3px 0 oklch(0 0 0 / 0.10), 0 1px 2px -1px oklch(0 0 0 / 0.08)",
    "--shadow-md":
      "0 4px 6px -1px oklch(0 0 0 / 0.12), 0 2px 4px -2px oklch(0 0 0 / 0.10)",
    "--shadow-lg":
      "0 10px 15px -3px oklch(0 0 0 / 0.14), 0 4px 6px -4px oklch(0 0 0 / 0.10)",
  },
  strong: {
    "--shadow-xs": "0 2px 4px 0 oklch(0 0 0 / 0.14)",
    "--shadow-sm":
      "0 2px 6px 0 oklch(0 0 0 / 0.18), 0 1px 3px -1px oklch(0 0 0 / 0.14)",
    "--shadow-md":
      "0 6px 12px -2px oklch(0 0 0 / 0.22), 0 4px 8px -2px oklch(0 0 0 / 0.18)",
    "--shadow-lg":
      "0 16px 24px -4px oklch(0 0 0 / 0.28), 0 8px 16px -4px oklch(0 0 0 / 0.20)",
  },
};

// ─── Resolver ───────────────────────────────────────────────────────────────

export type ResolvedAppearance = {
  /** HTML class to toggle the existing `.dark` palette variant. */
  htmlClass: string;
  /** Flat map of CSS variable names → values, applied as inline style on the root element. */
  cssVars: Record<string, string>;
  /** Max content width applied to frontend layouts; mirrors `--frontend-content-max-width`. */
  frontendContainerMaxWidth: string;
  /** Max content width applied to backend (dashboard) layouts; mirrors `--backend-content-max-width`. */
  backendContainerMaxWidth: string;
  /** Optional `<link>` tags for remote font presets. */
  fontLinks: FontLink[];
};

export function resolveAppearance(
  settings: Partial<AppearanceSettings> | null | undefined,
): ResolvedAppearance {
  const s: AppearanceSettings = {
    theme: settings?.theme ?? DEFAULT_THEME,
    frontendContentWidth:
      settings?.frontendContentWidth ?? DEFAULT_FRONTEND_CONTENT_WIDTH,
    backendContentWidth:
      settings?.backendContentWidth ?? DEFAULT_BACKEND_CONTENT_WIDTH,
    fontPreset: settings?.fontPreset ?? DEFAULT_FONT_PRESET,
    radiusPreset: settings?.radiusPreset ?? DEFAULT_RADIUS_PRESET,
    shadowPreset: settings?.shadowPreset ?? DEFAULT_SHADOW_PRESET,
  };

  const themeEntry = THEME_PALETTES[s.theme] ?? THEME_PALETTES[DEFAULT_THEME];
  const fontConfig =
    FONT_CONFIGS[s.fontPreset] ?? FONT_CONFIGS[DEFAULT_FONT_PRESET];
  const shadowVars =
    SHADOW_VALUES[s.shadowPreset] ?? SHADOW_VALUES[DEFAULT_SHADOW_PRESET];
  const radius =
    RADIUS_VALUES[s.radiusPreset] ?? RADIUS_VALUES[DEFAULT_RADIUS_PRESET];
  const frontendContainerMaxWidth = getContentWidthValue(
    s.frontendContentWidth,
  );
  const backendContainerMaxWidth = getContentWidthValue(s.backendContentWidth);

  // We emit BOTH width vars on the root element. `--content-max-width` is
  // resolved per-subtree in CSS (see `app/globals.css`): frontend by default,
  // backend when the dashboard layout marker (`.dashboard-content-root`) is
  // present. We deliberately do NOT set `--content-max-width` here, so the
  // CSS rule can switch between the two without being shadowed by an inline
  // style on `<html>`.
  const cssVars: Record<string, string> = {
    ...themeEntry.vars,
    ...fontConfig.vars,
    ...shadowVars,
    "--radius": radius,
    "--frontend-content-max-width": frontendContainerMaxWidth,
    "--backend-content-max-width": backendContainerMaxWidth,
  };

  return {
    htmlClass: [themeEntry.dark ? "dark" : "", `theme-${s.theme}`]
      .filter(Boolean)
      .join(" "),
    cssVars,
    frontendContainerMaxWidth,
    backendContainerMaxWidth,
    fontLinks: fontConfig.links,
  };
}

/** Convert the `cssVars` map into a `React.CSSProperties` object. */
export function cssVarsToInlineStyle(
  cssVars: Record<string, string>,
): React.CSSProperties {
  // Cast through `unknown` — CSS custom properties are valid keys but not
  // present in the `CSSProperties` type.
  return cssVars as unknown as React.CSSProperties;
}
