import { z } from "zod";

/**
 * Centralized configuration for the neon/cyberpunk-style glowing border
 * effect used by the site header, footer, and (in the future) any other
 * layout component that wants a configurable glow.
 *
 * The resolver returns a small set of CSS custom properties that are
 * attached to the <html> element in {@link app/layout.tsx}. The actual
 * styling rules live in {@link app/globals.css} and reference these
 * variables, so no inline styles or component-level hardcoded values
 * are required.
 *
 * To add glow support to a new layout area:
 *   1. Add a `glow?: GlowEffect` field to the relevant settings shape.
 *   2. Call `resolveGlowCssVars(glow, "<namespace>", "top" | "bottom")`
 *      in the layout and spread the result into the root <html> style.
 *   3. Add a rule in `globals.css` that consumes the variables, e.g.:
 *
 *        .my-section {
 *          border-top: var(--my-section-glow-border, 0);
 *          box-shadow: var(--my-section-glow-shadow, none);
 *        }
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_GLOW_COLOR = "#349aee";
/** 0–100 — controls the alpha of the inner / outer shadow layers. */
export const DEFAULT_GLOW_INTENSITY = 100;
export const MIN_GLOW_INTENSITY = 0;
export const MAX_GLOW_INTENSITY = 100;
/** Pixel value applied to the inner shadow layer; outer layer doubles it. */
export const DEFAULT_GLOW_BLUR = 16;
export const MIN_GLOW_BLUR = 0;
export const MAX_GLOW_BLUR = 64;

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

// ─── Schema / type ────────────────────────────────────────────────────────────

export const GlowEffectSchema = z.object({
  enabled: z.boolean().default(true),
  color: z.string().regex(HEX_COLOR).default(DEFAULT_GLOW_COLOR),
  intensity: z
    .number()
    .int()
    .min(MIN_GLOW_INTENSITY)
    .max(MAX_GLOW_INTENSITY)
    .default(DEFAULT_GLOW_INTENSITY),
  blurSize: z
    .number()
    .int()
    .min(MIN_GLOW_BLUR)
    .max(MAX_GLOW_BLUR)
    .default(DEFAULT_GLOW_BLUR),
});

export type GlowEffect = z.infer<typeof GlowEffectSchema>;

export const DEFAULT_GLOW: GlowEffect = {
  enabled: true,
  color: DEFAULT_GLOW_COLOR,
  intensity: DEFAULT_GLOW_INTENSITY,
  blurSize: DEFAULT_GLOW_BLUR,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function expandHex(hex: string): string {
  const v = hex.replace(/^#/, "");
  if (v.length === 3) {
    return `#${v[0]}${v[0]}${v[1]}${v[1]}${v[2]}${v[2]}`.toLowerCase();
  }
  return `#${v.toLowerCase()}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const v = expandHex(hex).slice(1);
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  };
}

function rgba(rgb: { r: number; g: number; b: number }, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a.toFixed(3)})`;
}

/**
 * Build the `box-shadow` value that visually matches the legacy
 * hardcoded effect: two stacked layers (inner + outer) projected
 * vertically in the requested direction.
 *
 * Legacy reference (header / `direction: "bottom"`):
 *   0 1px 16px 2px #349aee88, 0 2px 32px 4px #349aee33
 *
 * The historical alpha values (0x88 ≈ 0.533, 0x33 ≈ 0.20) are scaled
 * by `intensity / 100` so an intensity of 100 reproduces the original
 * look exactly.
 */
function buildBoxShadow(glow: GlowEffect, direction: "top" | "bottom"): string {
  const sign = direction === "top" ? -1 : 1;
  const rgb = hexToRgb(glow.color);
  const innerAlpha = (0x88 / 0xff) * (glow.intensity / 100);
  const outerAlpha = (0x33 / 0xff) * (glow.intensity / 100);
  const innerBlur = glow.blurSize;
  const outerBlur = glow.blurSize * 2;

  return [
    `0 ${sign * 1}px ${innerBlur}px 2px ${rgba(rgb, innerAlpha)}`,
    `0 ${sign * 2}px ${outerBlur}px 4px ${rgba(rgb, outerAlpha)}`,
  ].join(", ");
}

// ─── Public resolver ──────────────────────────────────────────────────────────

/**
 * Convert a (possibly partial / unknown) glow config into CSS custom
 * properties, scoped by `namespace`. When the glow is disabled the
 * variables are intentionally omitted so the CSS fallback (`none`, `0`)
 * applies.
 *
 * @example
 *   resolveGlowCssVars(headerGlow, "header", "bottom")
 *   // → { "--header-glow-border": "1px solid #349aee",
 *   //     "--header-glow-shadow": "0 1px 16px 2px rgba(...), ..." }
 */
export function resolveGlowCssVars(
  glow: GlowEffect | null | undefined,
  namespace: string,
  direction: "top" | "bottom",
): Record<string, string> {
  if (!glow || !glow.enabled) return {};
  const safe = GlowEffectSchema.safeParse(glow);
  const value = safe.success ? safe.data : DEFAULT_GLOW;
  const side = direction === "top" ? "top" : "bottom";
  return {
    [`--${namespace}-glow-border-${side}`]: `1px solid ${value.color}`,
    [`--${namespace}-glow-shadow`]: buildBoxShadow(value, direction),
  };
}

/**
 * Lenient parser for values coming out of JSONB columns. Always returns
 * a fully populated `GlowEffect` so consumers don't need to handle
 * partial shapes.
 */
export function parseGlow(value: unknown): GlowEffect {
  if (value == null || typeof value !== "object") return DEFAULT_GLOW;
  const parsed = GlowEffectSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_GLOW;
}
