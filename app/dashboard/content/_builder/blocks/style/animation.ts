import type { AnimationStyle, AnimationType } from "./types";

/**
 * CSS class names defined in `app/globals.css` for each animation
 * preset. Animation duration/delay are emitted as inline CSS variables
 * (`--bb-anim-duration`, `--bb-anim-delay`) that those classes consume.
 *
 * The keyframes themselves are CSS-only (no JS/IntersectionObserver in
 * v1) and respect `@media (prefers-reduced-motion: reduce)` via a
 * single rule in globals.css.
 */
const ANIMATION_CLASS: Record<Exclude<AnimationType, "none">, string> = {
  fade: "bb-anim-fade",
  "slide-up": "bb-anim-slide-up",
  "slide-down": "bb-anim-slide-down",
  "slide-left": "bb-anim-slide-left",
  "slide-right": "bb-anim-slide-right",
};

const MAX_MS = 2000;

function clampMs(n: number | undefined): number | undefined {
  if (typeof n !== "number" || !Number.isFinite(n)) return undefined;
  if (n < 0) return 0;
  if (n > MAX_MS) return MAX_MS;
  return Math.round(n);
}

export function resolveAnimation(animation: AnimationStyle | undefined): {
  className: string;
  inlineVars: React.CSSProperties;
} {
  if (!animation || !animation.type || animation.type === "none") {
    return { className: "", inlineVars: {} };
  }
  const className = ANIMATION_CLASS[animation.type] ?? "";
  const duration = clampMs(animation.durationMs);
  const delay = clampMs(animation.delayMs);
  const inlineVars: Record<string, string> = {};
  if (typeof duration === "number") {
    inlineVars["--bb-anim-duration"] = `${duration}ms`;
  }
  if (typeof delay === "number") {
    inlineVars["--bb-anim-delay"] = `${delay}ms`;
  }
  return {
    className,
    inlineVars: inlineVars as unknown as React.CSSProperties,
  };
}
