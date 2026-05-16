/**
 * Token registries for the BlockStyle property panel. Block styles
 * persist semantic IDs (e.g. `"primary"`, `"sans"`) that are resolved
 * at serialization time to actual CSS values. This indirection lets
 * the public site re-theme via global appearance changes without
 * having to re-save existing content.
 */

import { FONT_PRESETS, THEMES, type FontPreset } from "@/lib/appearance";

// ─── Color tokens ────────────────────────────────────────────────────────────

/** Semantic color token id → CSS color expression (uses appearance vars). */
export const COLOR_TOKENS = {
  inherit: "inherit",
  current: "currentColor",
  transparent: "transparent",
  foreground: "var(--foreground)",
  background: "var(--background)",
  primary: "var(--primary)",
  "primary-foreground": "var(--primary-foreground)",
  secondary: "var(--secondary)",
  "secondary-foreground": "var(--secondary-foreground)",
  muted: "var(--muted)",
  "muted-foreground": "var(--muted-foreground)",
  accent: "var(--accent)",
  "accent-foreground": "var(--accent-foreground)",
  destructive: "var(--destructive)",
  card: "var(--card)",
  "card-foreground": "var(--card-foreground)",
  border: "var(--border)",
} as const;

export type ColorTokenId = keyof typeof COLOR_TOKENS;
export const COLOR_TOKEN_IDS = Object.keys(COLOR_TOKENS) as ColorTokenId[];

const COLOR_TOKEN_SET = new Set<string>(COLOR_TOKEN_IDS);

/** Resolves a token id or escape-hatch CSS color into a CSS color string. */
export function resolveColor(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (COLOR_TOKEN_SET.has(value)) {
    return COLOR_TOKENS[value as ColorTokenId];
  }
  return value;
}

// ─── Font tokens ─────────────────────────────────────────────────────────────

/** Semantic font token id → CSS `font-family` value. */
export const FONT_TOKENS: Record<string, string> = {
  sans: "var(--font-sans)",
  heading: "var(--font-heading)",
  mono: "var(--font-mono)",
};

const FONT_TOKEN_SET = new Set<string>(Object.keys(FONT_TOKENS));

export function resolveFontFamily(
  value: string | undefined,
): string | undefined {
  if (!value) return undefined;
  if (FONT_TOKEN_SET.has(value)) return FONT_TOKENS[value];
  return value;
}

// Reference these so the FontPreset / THEMES exports remain a coupling
// signal (tokens here intentionally mirror the appearance registry).
void FONT_PRESETS;
void THEMES;
export type _Font = FontPreset;

// ─── Shadow tokens ───────────────────────────────────────────────────────────

export const SHADOW_TOKENS: Record<string, string> = {
  none: "none",
  xs: "var(--shadow-xs)",
  sm: "var(--shadow-sm)",
  md: "var(--shadow-md)",
  lg: "var(--shadow-lg)",
};

export function resolveShadow(
  preset: string | undefined,
  custom?: string,
): string | undefined {
  if (!preset || preset === "none")
    return preset === "none" ? "none" : undefined;
  if (preset === "custom") return custom?.trim() || undefined;
  return SHADOW_TOKENS[preset];
}
