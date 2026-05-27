import type {
  BackgroundStyle,
  BlockStyle,
  BlockStyleBase,
  BorderEffectsStyle,
  ColorStyle,
  LayoutStyle,
  Sides,
  SpacingStyle,
  TypographyStyle,
  Viewport,
} from "./types";
import { resolveAnimation } from "./animation";
import { resolveColor, resolveFontFamily, resolveShadow } from "./tokens";
import { cn } from "@/lib/utils";
import { isSafeCssValue, sanitizeCssUrl } from "@/lib/url-safety";

/**
 * Shallow-merges two `BlockStyleBase` envelopes per section. Used to
 * fold a viewport-specific override on top of the base style without
 * losing unrelated sections.
 */
function mergeBase(
  base: BlockStyleBase | undefined,
  override: Partial<BlockStyleBase> | undefined,
): BlockStyleBase {
  if (!override) return base ?? {};
  if (!base) return override as BlockStyleBase;
  return {
    typography: { ...base.typography, ...override.typography },
    colors: { ...base.colors, ...override.colors },
    spacing: { ...base.spacing, ...override.spacing },
    layout: { ...base.layout, ...override.layout },
    borderEffects: { ...base.borderEffects, ...override.borderEffects },
    background: { ...base.background, ...override.background },
  };
}

function sidesToCss<T>(
  sides: Sides<T> | undefined,
  toCss: (v: T) => string,
): string | undefined {
  if (!sides) return undefined;
  const { top, right, bottom, left } = sides;
  if ([top, right, bottom, left].every((v) => v === undefined))
    return undefined;
  const t = top !== undefined ? toCss(top) : "0";
  const r = right !== undefined ? toCss(right) : "0";
  const b = bottom !== undefined ? toCss(bottom) : "0";
  const l = left !== undefined ? toCss(left) : "0";
  return `${t} ${r} ${b} ${l}`;
}

function len(v: string): string {
  return v;
}

function applyTypography(
  t: TypographyStyle | undefined,
  out: React.CSSProperties,
): void {
  if (!t) return;
  const family = resolveFontFamily(t.fontFamily);
  if (family) out.fontFamily = family;
  if (t.fontSize) out.fontSize = t.fontSize;
  if (t.fontWeight)
    out.fontWeight =
      t.fontWeight as unknown as React.CSSProperties["fontWeight"];
  if (t.lineHeight) out.lineHeight = t.lineHeight;
  if (t.letterSpacing) out.letterSpacing = t.letterSpacing;
  if (t.textTransform) out.textTransform = t.textTransform;
  if (t.textAlign) {
    out.textAlign = t.textAlign;
  }
  if (t.fontStyle) out.fontStyle = t.fontStyle;
  if (t.textDecoration) out.textDecoration = t.textDecoration;
}

function gradientToCss(g: NonNullable<ColorStyle["gradient"]>): string {
  const stops = g.stops
    .map((s) => `${resolveColor(s.color) ?? s.color} ${s.at}%`)
    .join(", ");
  if (g.type === "radial") return `radial-gradient(circle, ${stops})`;
  const angle = typeof g.angle === "number" ? g.angle : 180;
  return `linear-gradient(${angle}deg, ${stops})`;
}

function applyColors(
  c: ColorStyle | undefined,
  out: React.CSSProperties,
): void {
  if (!c) return;
  const text = resolveColor(c.text);
  if (text) {
    out.color = text;
    // Expose the block-level text color as CSS custom properties so the
    // shared `.ProseMirror, .cms-content` rules in globals.css (which set
    // `color` directly on the content + headings + links and would
    // otherwise win over inherited `color`) pick up the override and
    // cascade it to paragraphs, headings, lists, links and inline marks.
    const style = out as unknown as Record<string, string | number>;
    style["--cms-text-color"] = text;
    style["--cms-link-color"] = text;
  }
  if (c.gradient && c.gradient.stops.length > 0) {
    out.backgroundImage = gradientToCss(c.gradient);
  } else {
    const bg = resolveColor(c.background);
    if (bg) out.backgroundColor = bg;
  }
  if (typeof c.opacity === "number") {
    out.opacity = Math.max(0, Math.min(1, c.opacity));
  }
}

function applySpacing(
  s: SpacingStyle | undefined,
  out: React.CSSProperties,
  emitGap: boolean,
): void {
  if (!s) return;
  const margin = sidesToCss(s.margin, len);
  if (margin) out.margin = margin;
  const padding = sidesToCss(s.padding, len);
  if (padding) out.padding = padding;
  if (emitGap && s.gap) out.gap = s.gap;
}

function applyLayout(
  l: LayoutStyle | undefined,
  out: React.CSSProperties,
): void {
  if (!l) return;
  if (l.width) out.width = l.width;
  if (l.maxWidth) out.maxWidth = l.maxWidth;
  if (l.minHeight) out.minHeight = l.minHeight;
  if (l.display) out.display = l.display;
  if (l.flexDirection) out.flexDirection = l.flexDirection;
  if (l.justifyContent) out.justifyContent = l.justifyContent;
  if (l.alignItems) out.alignItems = l.alignItems;
  if (l.overflow) out.overflow = l.overflow;
  if (typeof l.zIndex === "number") out.zIndex = l.zIndex;
}

function applyBorderEffects(
  b: BorderEffectsStyle | undefined,
  out: React.CSSProperties,
): void {
  if (!b) return;
  if (b.borderWidth) out.borderWidth = b.borderWidth;
  const bc = resolveColor(b.borderColor);
  if (bc) out.borderColor = bc;
  if (b.borderStyle) out.borderStyle = b.borderStyle;
  if (b.borderRadius) out.borderRadius = b.borderRadius;
  const shadow = resolveShadow(b.boxShadow, b.boxShadowCustom);
  if (shadow) out.boxShadow = shadow;
}

function applyBackground(
  bg: BackgroundStyle | undefined,
  out: React.CSSProperties,
): void {
  if (!bg) return;
  if (bg.image) {
    const safe = sanitizeCssUrl(bg.image);
    if (safe) out.backgroundImage = `url("${safe}")`;
  }
  if (bg.size) out.backgroundSize = bg.size;
  if (bg.position) out.backgroundPosition = bg.position;
  if (bg.repeat) out.backgroundRepeat = bg.repeat;
}

/**
 * Pure, synchronous, SSR-safe serializer that turns a `BlockStyle` into
 * a `React.CSSProperties` + className pair. Safe to call from both the
 * Craft.js editable canvas and the static/RSC renderer.
 *
 * The `viewport` parameter is ONLY used inside the editor preview frame
 * to mirror the active preview width. In production rendering, callers
 * pass `"desktop"` (the default) and responsive overrides are emitted
 * separately as media-query CSS by `buildResponsiveCss()`.
 */
export function applyBlockStyle(
  style: BlockStyle | undefined,
  viewport: Viewport = "desktop",
): { style: React.CSSProperties; className: string } {
  if (!style) return { style: {}, className: "" };

  const base: BlockStyleBase = {
    typography: style.typography,
    colors: style.colors,
    spacing: style.spacing,
    layout: style.layout,
    borderEffects: style.borderEffects,
    background: style.background,
  };

  const merged =
    viewport === "tablet"
      ? mergeBase(base, style.responsive?.tablet)
      : viewport === "mobile"
        ? mergeBase(
            mergeBase(base, style.responsive?.tablet),
            style.responsive?.mobile,
          )
        : base;

  const out: React.CSSProperties = {};
  const emitGap =
    merged.layout?.display === "flex" ||
    merged.layout?.display === "inline-flex" ||
    merged.layout?.display === "grid";

  applyTypography(merged.typography, out);
  applyColors(merged.colors, out);
  applySpacing(merged.spacing, out, emitGap);
  applyLayout(merged.layout, out);
  applyBorderEffects(merged.borderEffects, out);
  applyBackground(merged.background, out);

  const anim = resolveAnimation(style.animation);
  if (anim.className) {
    Object.assign(out, anim.inlineVars);
  }

  const hide = style.responsive?.hide;
  const hideClasses = cn(
    hide?.desktop ? "hide-on-desktop" : null,
    hide?.tablet ? "hide-on-tablet" : null,
    hide?.mobile ? "hide-on-mobile" : null,
  );

  const className = cn(anim.className, hideClasses);
  return { style: out, className };
}

// ─── Responsive CSS (media-query string) ─────────────────────────────────────

function cssPropsToString(props: React.CSSProperties): string {
  const entries = Object.entries(props as Record<string, unknown>);
  const parts: string[] = [];
  for (const [key, value] of entries) {
    if (value === undefined || value === null || value === "") continue;
    if (!isSafeCssValue(value)) continue;
    const kebab = key.startsWith("--")
      ? key
      : key.replace(/([A-Z])/g, "-$1").toLowerCase();
    parts.push(`${kebab}: ${String(value)}`);
  }
  return parts.join("; ");
}

const BREAKPOINT_TABLET_MAX = 1023;
const BREAKPOINT_MOBILE_MAX = 767;

/**
 * Builds the per-viewport media-query CSS string for a single block.
 * Returns `null` when no responsive overrides exist. The caller is
 * responsible for scoping the rules under a per-node className.
 */
export function buildResponsiveCss(
  style: BlockStyle | undefined,
  scopeClass: string,
): string | null {
  if (!style || !style.responsive) return null;
  const r = style.responsive;
  if (!r.tablet && !r.mobile) return null;

  const parts: string[] = [];

  if (r.tablet) {
    const merged = mergeBase(
      {
        typography: style.typography,
        colors: style.colors,
        spacing: style.spacing,
        layout: style.layout,
        borderEffects: style.borderEffects,
        background: style.background,
      },
      r.tablet,
    );
    const tabletCss = serializeBaseToCss(merged);
    if (tabletCss) {
      parts.push(
        `@media (max-width: ${BREAKPOINT_TABLET_MAX}px) { .${scopeClass} { ${tabletCss} } }`,
      );
    }
  }

  if (r.mobile) {
    const merged = mergeBase(
      mergeBase(
        {
          typography: style.typography,
          colors: style.colors,
          spacing: style.spacing,
          layout: style.layout,
          borderEffects: style.borderEffects,
          background: style.background,
        },
        r.tablet,
      ),
      r.mobile,
    );
    const mobileCss = serializeBaseToCss(merged);
    if (mobileCss) {
      parts.push(
        `@media (max-width: ${BREAKPOINT_MOBILE_MAX}px) { .${scopeClass} { ${mobileCss} } }`,
      );
    }
  }

  return parts.length > 0 ? parts.join("\n") : null;
}

function serializeBaseToCss(base: BlockStyleBase): string {
  const out: React.CSSProperties = {};
  const emitGap =
    base.layout?.display === "flex" ||
    base.layout?.display === "inline-flex" ||
    base.layout?.display === "grid";
  applyTypography(base.typography, out);
  applyColors(base.colors, out);
  applySpacing(base.spacing, out, emitGap);
  applyLayout(base.layout, out);
  applyBorderEffects(base.borderEffects, out);
  applyBackground(base.background, out);
  return cssPropsToString(out);
}

/**
 * Tiny deterministic hash of a JSON-serializable value. Used to generate
 * a stable per-block CSS class name (`bb-<hash>`) that scopes responsive
 * media-query rules. Not cryptographic — collisions are tolerable since
 * the worst case is a duplicate `<style>` block.
 */
export function styleHash(input: unknown): string {
  let str: string;
  try {
    str = JSON.stringify(input);
  } catch {
    str = String(input);
  }
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
