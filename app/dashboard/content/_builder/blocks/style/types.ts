/**
 * Unified BlockStyle type — the single design-data envelope attached to
 * every Craft.js page-builder block via `props.style`. All fields are
 * deeply optional. Stored values MUST be JSON-serializable primitives:
 * - Color/font fields persist semantic token IDs (resolved at render
 *   time via `./tokens.ts`), or escape-hatch CSS color strings.
 * - Length fields use CSS strings with units (`"16px"`, `"1.5rem"`,
 *   `"50%"`, `"auto"`).
 *
 * See `.github/instructions/cms-page-builder-block-properties.instructions.md`.
 */

export type Viewport = "desktop" | "tablet" | "mobile";

export type Sides<T> = {
  top?: T;
  right?: T;
  bottom?: T;
  left?: T;
};

export type LengthValue = string;

export type FontWeight =
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "600"
  | "700"
  | "800"
  | "900";

export type TypographyStyle = {
  /** Semantic font token id (see `./tokens.ts`). */
  fontFamily?: string;
  fontSize?: LengthValue;
  fontWeight?: FontWeight;
  lineHeight?: LengthValue;
  letterSpacing?: LengthValue;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textAlign?: "left" | "center" | "right" | "justify";
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline" | "line-through";
};

export type ColorStyle = {
  /** Semantic color token id (e.g. "primary") or `var(--*)` / OKLCH string. */
  text?: string;
  background?: string;
  opacity?: number;
  gradient?: {
    type: "linear" | "radial";
    angle?: number;
    stops: Array<{ color: string; at: number }>;
  };
};

export type SpacingStyle = {
  margin?: Sides<LengthValue>;
  padding?: Sides<LengthValue>;
  gap?: LengthValue;
};

export type LayoutStyle = {
  width?: LengthValue;
  maxWidth?: LengthValue;
  minHeight?: LengthValue;
  display?: "block" | "inline-block" | "flex" | "inline-flex" | "grid" | "none";
  flexDirection?: "row" | "row-reverse" | "column" | "column-reverse";
  justifyContent?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around"
    | "space-evenly";
  alignItems?: "stretch" | "flex-start" | "center" | "flex-end" | "baseline";
  overflow?: "visible" | "hidden" | "auto" | "scroll";
  zIndex?: number;
};

export type BorderEffectsStyle = {
  borderWidth?: LengthValue;
  borderColor?: string;
  borderStyle?: "solid" | "dashed" | "dotted";
  borderRadius?: LengthValue;
  boxShadow?: "none" | "xs" | "sm" | "md" | "lg" | "custom";
  /** Raw CSS — only honored when `boxShadow === "custom"`. */
  boxShadowCustom?: string;
  glow?: { color: string; intensity: 0 | 1 | 2 | 3 };
};

export type BackgroundStyle = {
  image?: string;
  size?: "auto" | "cover" | "contain";
  position?:
    | "center"
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "top left"
    | "top right"
    | "bottom left"
    | "bottom right";
  repeat?: "no-repeat" | "repeat" | "repeat-x" | "repeat-y";
};

export type BlockStyleBase = {
  typography?: TypographyStyle;
  colors?: ColorStyle;
  spacing?: SpacingStyle;
  layout?: LayoutStyle;
  borderEffects?: BorderEffectsStyle;
  background?: BackgroundStyle;
};

export type ResponsiveStyle = {
  hide?: { desktop?: boolean; tablet?: boolean; mobile?: boolean };
  tablet?: Partial<BlockStyleBase>;
  mobile?: Partial<BlockStyleBase>;
};

export type AnimationType =
  | "none"
  | "fade"
  | "slide-up"
  | "slide-down"
  | "slide-left"
  | "slide-right";

export type AnimationStyle = {
  type?: AnimationType;
  durationMs?: number;
  delayMs?: number;
};

export type BlockStyle = BlockStyleBase & {
  responsive?: ResponsiveStyle;
  animation?: AnimationStyle;
};
