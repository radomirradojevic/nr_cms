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
] as const;

export const CONTENT_WIDTHS = [
  "full-width",
  "contained",
  "narrow",
  "wide",
  "ultra-wide",
] as const;

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
export type ContentWidth = (typeof CONTENT_WIDTHS)[number];
export type FontPreset = (typeof FONT_PRESETS)[number];
export type RadiusPreset = (typeof RADIUS_PRESETS)[number];
export type ShadowPreset = (typeof SHADOW_PRESETS)[number];

export const DEFAULT_THEME: Theme = "default";
export const DEFAULT_CONTENT_WIDTH: ContentWidth = "contained";
export const DEFAULT_FONT_PRESET: FontPreset = "system";
export const DEFAULT_RADIUS_PRESET: RadiusPreset = "medium";
export const DEFAULT_SHADOW_PRESET: ShadowPreset = "soft";

export type AppearanceSettings = {
  theme: Theme;
  contentWidth: ContentWidth;
  fontPreset: FontPreset;
  radiusPreset: RadiusPreset;
  shadowPreset: ShadowPreset;
};

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  theme: DEFAULT_THEME,
  contentWidth: DEFAULT_CONTENT_WIDTH,
  fontPreset: DEFAULT_FONT_PRESET,
  radiusPreset: DEFAULT_RADIUS_PRESET,
  shadowPreset: DEFAULT_SHADOW_PRESET,
};

// ─── Theme palettes ──────────────────────────────────────────────────────────

type Palette = Record<string, string>;

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
      "--primary": "oklch(0.205 0 0)",
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
      "--sidebar-primary": "oklch(0.205 0 0)",
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
      "--card": "oklch(0.205 0 0)",
      "--card-foreground": "oklch(0.985 0 0)",
      "--popover": "oklch(0.205 0 0)",
      "--popover-foreground": "oklch(0.985 0 0)",
      "--primary": "oklch(0.922 0 0)",
      "--primary-foreground": "oklch(0.205 0 0)",
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
      "--sidebar": "oklch(0.205 0 0)",
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
      "--foreground": "oklch(0.205 0 0)",
      "--card": "oklch(1 0 0)",
      "--card-foreground": "oklch(0.205 0 0)",
      "--popover": "oklch(1 0 0)",
      "--popover-foreground": "oklch(0.205 0 0)",
      "--primary": "oklch(0.35 0 0)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--secondary": "oklch(0.95 0 0)",
      "--secondary-foreground": "oklch(0.205 0 0)",
      "--muted": "oklch(0.96 0 0)",
      "--muted-foreground": "oklch(0.5 0 0)",
      "--accent": "oklch(0.93 0 0)",
      "--accent-foreground": "oklch(0.205 0 0)",
      "--destructive": "oklch(0.577 0.245 27.325)",
      "--border": "oklch(0.9 0 0)",
      "--input": "oklch(0.9 0 0)",
      "--ring": "oklch(0.7 0 0)",
      "--sidebar": "oklch(0.97 0 0)",
      "--sidebar-foreground": "oklch(0.205 0 0)",
      "--sidebar-primary": "oklch(0.35 0 0)",
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
      "--foreground": "oklch(0.2 0.03 250)",
      "--card": "oklch(1 0 0)",
      "--card-foreground": "oklch(0.2 0.03 250)",
      "--popover": "oklch(1 0 0)",
      "--popover-foreground": "oklch(0.2 0.03 250)",
      "--primary": "oklch(0.45 0.18 255)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--secondary": "oklch(0.94 0.02 245)",
      "--secondary-foreground": "oklch(0.25 0.05 255)",
      "--muted": "oklch(0.95 0.01 240)",
      "--muted-foreground": "oklch(0.5 0.03 250)",
      "--accent": "oklch(0.9 0.04 245)",
      "--accent-foreground": "oklch(0.25 0.05 255)",
      "--destructive": "oklch(0.577 0.245 27.325)",
      "--border": "oklch(0.9 0.02 245)",
      "--input": "oklch(0.9 0.02 245)",
      "--ring": "oklch(0.55 0.15 255)",
      "--sidebar": "oklch(0.96 0.015 245)",
      "--sidebar-foreground": "oklch(0.2 0.03 250)",
      "--sidebar-primary": "oklch(0.45 0.18 255)",
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
      "--card": "oklch(0.18 0.06 295)",
      "--card-foreground": "oklch(0.96 0.05 180)",
      "--popover": "oklch(0.18 0.06 295)",
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
      "--foreground": "oklch(0.2 0.02 30)",
      "--card": "oklch(0.99 0.01 80)",
      "--card-foreground": "oklch(0.2 0.02 30)",
      "--popover": "oklch(0.99 0.01 80)",
      "--popover-foreground": "oklch(0.2 0.02 30)",
      "--primary": "oklch(0.35 0.05 25)",
      "--primary-foreground": "oklch(0.97 0.02 80)",
      "--secondary": "oklch(0.9 0.03 70)",
      "--secondary-foreground": "oklch(0.25 0.03 30)",
      "--muted": "oklch(0.93 0.02 75)",
      "--muted-foreground": "oklch(0.45 0.03 40)",
      "--accent": "oklch(0.75 0.1 60)",
      "--accent-foreground": "oklch(0.2 0.02 30)",
      "--destructive": "oklch(0.55 0.22 25)",
      "--border": "oklch(0.85 0.03 70)",
      "--input": "oklch(0.85 0.03 70)",
      "--ring": "oklch(0.6 0.08 50)",
      "--sidebar": "oklch(0.94 0.02 75)",
      "--sidebar-foreground": "oklch(0.2 0.02 30)",
      "--sidebar-primary": "oklch(0.35 0.05 25)",
      "--sidebar-primary-foreground": "oklch(0.97 0.02 80)",
      "--sidebar-accent": "oklch(0.75 0.1 60)",
      "--sidebar-accent-foreground": "oklch(0.2 0.02 30)",
      "--sidebar-border": "oklch(0.85 0.03 70)",
      "--sidebar-ring": "oklch(0.6 0.08 50)",
    },
  },
};

// ─── Content width ──────────────────────────────────────────────────────────

const CONTENT_WIDTH_VALUES: Record<ContentWidth, string> = {
  "full-width": "100%",
  contained: "72rem",
  narrow: "56rem",
  wide: "90rem",
  "ultra-wide": "110rem",
};

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
  /** Max content width; mirrors `--content-max-width` so callers can read it directly. */
  containerMaxWidth: string;
  /** Optional `<link>` tags for remote font presets. */
  fontLinks: FontLink[];
};

export function resolveAppearance(
  settings: Partial<AppearanceSettings> | null | undefined,
): ResolvedAppearance {
  const s: AppearanceSettings = {
    theme: settings?.theme ?? DEFAULT_THEME,
    contentWidth: settings?.contentWidth ?? DEFAULT_CONTENT_WIDTH,
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
  const containerMaxWidth =
    CONTENT_WIDTH_VALUES[s.contentWidth] ??
    CONTENT_WIDTH_VALUES[DEFAULT_CONTENT_WIDTH];

  const cssVars: Record<string, string> = {
    ...themeEntry.vars,
    ...fontConfig.vars,
    ...shadowVars,
    "--radius": radius,
    "--content-max-width": containerMaxWidth,
  };

  return {
    htmlClass: themeEntry.dark ? "dark" : "",
    cssVars,
    containerMaxWidth,
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
