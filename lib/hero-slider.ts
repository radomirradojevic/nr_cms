export const HERO_SLIDER_CONTENT_TYPE = "hero_slider" as const;

export type HeroSliderBreakpoint = "desktop" | "tablet" | "mobile";

export type HeroSliderTemplate =
  | "saas"
  | "product"
  | "agency"
  | "portfolio"
  | "ecommerce"
  | "video";

export const HERO_SLIDER_TEMPLATE_OPTIONS: Array<{
  value: HeroSliderTemplate;
  label: string;
}> = [
  { value: "saas", label: "SaaS Hero" },
  { value: "product", label: "Product Hero" },
  { value: "agency", label: "Agency Hero" },
  { value: "portfolio", label: "Portfolio Hero" },
  { value: "ecommerce", label: "Ecommerce Hero" },
  { value: "video", label: "Video Hero" },
];

export type HeroSliderSettings = {
  autoplay: boolean;
  autoplayDelayMs: number;
  infiniteLoop: boolean;
  pauseOnHover: boolean;
  pauseWhenNotVisible: boolean;
  transitionType: "slide" | "fade";
  transitionSpeedMs: number;
  showArrows: boolean;
  showDots: boolean;
  keyboardNavigation: boolean;
  swipeSupport: boolean;
  mouseDragSupport: boolean;
  fullWidth: boolean;
  fullHeight: boolean;
  customHeight: string;
  overlayColor: string;
  overlayOpacity: number;
  ariaLabel: string;
};

export type HeroSlideImage = {
  src: string;
  alt: string;
  tabletSrc?: string;
  mobileSrc?: string;
};

export type HeroSlideVideo = {
  src: string;
  poster: string;
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
};

export type HeroSlideLayout = {
  contentWidth: "contained" | "full";
  maxWidth: string;
  horizontalAlign: "left" | "center" | "right";
  verticalAlign: "top" | "center" | "bottom";
  textAlign: "left" | "center" | "right";
  padding: string;
  margin: string;
};

export type HeroSlideLayers = {
  backgroundZIndex: number;
  overlayZIndex: number;
  contentZIndex: number;
};

export type HeroSlideResponsiveLayout = {
  hidden?: boolean;
  maxWidth?: string;
  textAlign?: HeroSlideLayout["textAlign"];
  padding?: string;
};

export type HeroSlideBlockType =
  | "heading"
  | "text"
  | "button"
  | "image"
  | "card"
  | "badge"
  | "divider"
  | "icon"
  | "cta_group"
  | "custom_html"
  | "container"
  | "columns";

export const HERO_SLIDE_BLOCK_OPTIONS: Array<{
  value: HeroSlideBlockType;
  label: string;
}> = [
  { value: "heading", label: "Heading" },
  { value: "text", label: "Text" },
  { value: "button", label: "Button" },
  { value: "image", label: "Image" },
  { value: "card", label: "Card" },
  { value: "badge", label: "Badge" },
  { value: "divider", label: "Divider" },
  { value: "icon", label: "Icon" },
  { value: "cta_group", label: "CTA Group" },
  { value: "custom_html", label: "Custom HTML" },
  { value: "container", label: "Container" },
  { value: "columns", label: "Columns" },
];

export type HeroSlideBlock = {
  id: string;
  type: HeroSlideBlockType;
  props: Record<string, unknown>;
  hiddenOn?: HeroSliderBreakpoint[];
  children?: HeroSlideBlock[];
  columns?: HeroSlideBlock[][];
};

export type HeroSlide = {
  id: string;
  name: string;
  image: HeroSlideImage;
  video: HeroSlideVideo;
  layout: HeroSlideLayout;
  layers: HeroSlideLayers;
  responsive: Record<HeroSliderBreakpoint, HeroSlideResponsiveLayout>;
  blocks: HeroSlideBlock[];
};

export type HeroSliderContent = {
  version: 1;
  settings: HeroSliderSettings;
  slides: HeroSlide[];
  future?: {
    dynamicContent?: boolean;
    aiGeneratedSlides?: boolean;
  };
};

export const defaultHeroSliderSettings: HeroSliderSettings = {
  autoplay: true,
  autoplayDelayMs: 6000,
  infiniteLoop: true,
  pauseOnHover: true,
  pauseWhenNotVisible: true,
  transitionType: "slide",
  transitionSpeedMs: 500,
  showArrows: true,
  showDots: true,
  keyboardNavigation: true,
  swipeSupport: true,
  mouseDragSupport: true,
  fullWidth: true,
  fullHeight: false,
  customHeight: "620px",
  overlayColor: "#000000",
  overlayOpacity: 0.42,
  ariaLabel: "Hero slider",
};

export const defaultHeroSlideLayout: HeroSlideLayout = {
  contentWidth: "contained",
  maxWidth: "720px",
  horizontalAlign: "left",
  verticalAlign: "center",
  textAlign: "left",
  padding: "clamp(3rem, 8vw, 7rem) clamp(1.25rem, 6vw, 5rem)",
  margin: "0",
};

export const defaultHeroSlideLayers: HeroSlideLayers = {
  backgroundZIndex: 0,
  overlayZIndex: 1,
  contentZIndex: 2,
};

export function makeHeroSliderId(prefix = "hs") {
  const random =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}

export function createHeroSlideBlock(type: HeroSlideBlockType): HeroSlideBlock {
  return {
    id: makeHeroSliderId("block"),
    type,
    props: defaultBlockProps(type),
    hiddenOn: [],
    ...(type === "container"
      ? { children: [createHeroSlideBlock("heading")] }
      : {}),
    ...(type === "columns"
      ? {
          columns: [
            [createHeroSlideBlock("heading")],
            [createHeroSlideBlock("text")],
          ],
        }
      : {}),
  };
}

export function createHeroSlide(
  name = "Slide",
  blocks: HeroSlideBlock[] = [
    createHeroSlideBlock("badge"),
    createHeroSlideBlock("heading"),
    createHeroSlideBlock("text"),
    createHeroSlideBlock("cta_group"),
  ],
): HeroSlide {
  return {
    id: makeHeroSliderId("slide"),
    name,
    image: { src: "", alt: "" },
    video: { src: "", poster: "", autoplay: true, loop: true, muted: true },
    layout: { ...defaultHeroSlideLayout },
    layers: { ...defaultHeroSlideLayers },
    responsive: {
      desktop: {},
      tablet: { maxWidth: "640px", padding: "4rem 2rem" },
      mobile: {
        maxWidth: "100%",
        textAlign: "center",
        padding: "3.5rem 1.25rem",
      },
    },
    blocks,
  };
}

export function createDefaultHeroSlider(): HeroSliderContent {
  return createHeroSliderTemplate("saas");
}

export function createHeroSliderTemplate(
  template: HeroSliderTemplate,
): HeroSliderContent {
  const slide = createHeroSlide(`${templateLabel(template)} slide`);
  const settings: HeroSliderSettings = {
    ...defaultHeroSliderSettings,
    ...(template === "video"
      ? { transitionType: "fade" as const, customHeight: "720px" }
      : {}),
    ...(template === "ecommerce"
      ? { autoplayDelayMs: 5000, overlayOpacity: 0.28 }
      : {}),
  };

  slide.blocks = templateBlocks(template);
  slide.layout = {
    ...slide.layout,
    ...(template === "portfolio"
      ? { horizontalAlign: "center" as const, textAlign: "center" as const }
      : {}),
    ...(template === "product"
      ? { maxWidth: "860px", horizontalAlign: "center" as const }
      : {}),
  };

  return {
    version: 1,
    settings,
    slides: [slide],
    future: { dynamicContent: false, aiGeneratedSlides: false },
  };
}

export function normalizeHeroSliderContent(value: unknown): HeroSliderContent {
  if (!isRecord(value)) return createDefaultHeroSlider();
  const settings = {
    ...defaultHeroSliderSettings,
    ...(isRecord(value.settings) ? value.settings : {}),
  };
  const slides = Array.isArray(value.slides)
    ? value.slides.map(normalizeSlide).filter(isDefined)
    : [];

  return {
    version: 1,
    settings: normalizeSettings(settings),
    slides: slides.length > 0 ? slides : [createHeroSlide()],
    future: isRecord(value.future)
      ? {
          dynamicContent: value.future.dynamicContent === true,
          aiGeneratedSlides: value.future.aiGeneratedSlides === true,
        }
      : { dynamicContent: false, aiGeneratedSlides: false },
  };
}

export function isHeroSliderContent(
  value: unknown,
): value is HeroSliderContent {
  return isRecord(value) && value.version === 1 && Array.isArray(value.slides);
}

export function heroSliderToPlainText(value: unknown) {
  const data = normalizeHeroSliderContent(value);
  const parts: string[] = [];
  for (const slide of data.slides) {
    parts.push(slide.name);
    collectBlocksText(slide.blocks, parts);
  }
  return parts
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function templateLabel(template: HeroSliderTemplate) {
  return (
    HERO_SLIDER_TEMPLATE_OPTIONS.find((option) => option.value === template)
      ?.label ?? "Hero"
  );
}

function templateBlocks(template: HeroSliderTemplate): HeroSlideBlock[] {
  const heading = createHeroSlideBlock("heading");
  const text = createHeroSlideBlock("text");
  const cta = createHeroSlideBlock("cta_group");
  const badge = createHeroSlideBlock("badge");

  if (template === "product") {
    heading.props.text = "Launch the product story above the fold";
    text.props.text =
      "Show the promise, proof, and next action in a polished hero layout.";
    badge.props.text = "Product Launch";
    cta.props.items = [
      { label: "Explore Features", href: "#features", variant: "primary" },
      { label: "Watch Demo", href: "#demo", variant: "secondary" },
    ];
    return [badge, heading, text, cta, createHeroSlideBlock("image")];
  }

  if (template === "agency") {
    heading.props.text = "Strategy, design, and launch momentum";
    text.props.text =
      "Introduce the agency offer with a confident CTA and flexible proof blocks.";
    badge.props.text = "Agency";
    return [badge, heading, text, cta, createHeroSlideBlock("card")];
  }

  if (template === "portfolio") {
    heading.props.text = "Selected work with a strong point of view";
    text.props.text =
      "Use this slide to feature a signature project, client, or case study.";
    badge.props.text = "Portfolio";
    return [badge, heading, text, cta];
  }

  if (template === "ecommerce") {
    heading.props.text = "Seasonal drop, product story, or featured collection";
    text.props.text =
      "Pair a high-impact background with a direct shopping action.";
    badge.props.text = "New Collection";
    cta.props.items = [
      { label: "Shop Now", href: "/shop", variant: "primary" },
      { label: "View Lookbook", href: "#lookbook", variant: "secondary" },
    ];
    return [badge, heading, text, cta];
  }

  if (template === "video") {
    heading.props.text = "Cinematic hero with motion-aware playback";
    text.props.text =
      "Use a muted MP4 background with a poster image and concise foreground copy.";
    badge.props.text = "Video Hero";
    return [badge, heading, text, cta];
  }

  heading.props.text = "Build the hero your page deserves";
  text.props.text =
    "Create rich slide layouts with media, layered overlays, CTAs, cards, and responsive controls.";
  badge.props.text = "SaaS Hero";
  return [badge, heading, text, cta];
}

function defaultBlockProps(type: HeroSlideBlockType): Record<string, unknown> {
  switch (type) {
    case "heading":
      return { text: "Hero heading", level: "1" };
    case "text":
      return { text: "Write concise hero copy that supports the main action." };
    case "button":
      return { label: "Get started", href: "#", variant: "primary" };
    case "image":
      return { src: "", alt: "", width: "360px" };
    case "card":
      return {
        title: "Proof point",
        body: "Add a short supporting detail, metric, or offer.",
      };
    case "badge":
      return { text: "Featured" };
    case "divider":
      return { width: "96px" };
    case "icon":
      return { icon: "sparkles", label: "" };
    case "cta_group":
      return {
        items: [
          { label: "Get started", href: "#", variant: "primary" },
          { label: "Learn more", href: "#", variant: "secondary" },
        ],
      };
    case "custom_html":
      return { html: "<p>Custom HTML</p>" };
    case "container":
      return { gap: "1rem" };
    case "columns":
      return { gap: "1.5rem" };
  }
}

function normalizeSettings(value: HeroSliderSettings): HeroSliderSettings {
  const delay = numberInRange(value.autoplayDelayMs, 1000, 30000, 6000);
  const speed = numberInRange(value.transitionSpeedMs, 100, 3000, 500);
  const opacity = numberInRange(value.overlayOpacity, 0, 1, 0.42);
  return {
    ...defaultHeroSliderSettings,
    ...value,
    autoplayDelayMs: delay,
    transitionSpeedMs: speed,
    overlayOpacity: opacity,
    transitionType: value.transitionType === "fade" ? "fade" : "slide",
    overlayColor:
      typeof value.overlayColor === "string" && value.overlayColor.trim()
        ? value.overlayColor
        : defaultHeroSliderSettings.overlayColor,
    customHeight:
      typeof value.customHeight === "string" && value.customHeight.trim()
        ? value.customHeight
        : defaultHeroSliderSettings.customHeight,
    ariaLabel:
      typeof value.ariaLabel === "string" && value.ariaLabel.trim()
        ? value.ariaLabel
        : defaultHeroSliderSettings.ariaLabel,
  };
}

function normalizeSlide(value: unknown): HeroSlide | null {
  if (!isRecord(value)) return null;
  return {
    id: stringValue(value.id, makeHeroSliderId("slide")),
    name: stringValue(value.name, "Slide"),
    image: {
      src: stringValue(isRecord(value.image) ? value.image.src : "", ""),
      alt: stringValue(isRecord(value.image) ? value.image.alt : "", ""),
      tabletSrc: stringValue(
        isRecord(value.image) ? value.image.tabletSrc : "",
        "",
      ),
      mobileSrc: stringValue(
        isRecord(value.image) ? value.image.mobileSrc : "",
        "",
      ),
    },
    video: {
      src: stringValue(isRecord(value.video) ? value.video.src : "", ""),
      poster: stringValue(isRecord(value.video) ? value.video.poster : "", ""),
      autoplay: isRecord(value.video) ? value.video.autoplay !== false : true,
      loop: isRecord(value.video) ? value.video.loop !== false : true,
      muted: isRecord(value.video) ? value.video.muted !== false : true,
    },
    layout: {
      ...defaultHeroSlideLayout,
      ...(isRecord(value.layout) ? value.layout : {}),
    } as HeroSlideLayout,
    layers: {
      ...defaultHeroSlideLayers,
      ...(isRecord(value.layers) ? value.layers : {}),
    } as HeroSlideLayers,
    responsive: normalizeResponsive(value.responsive),
    blocks: Array.isArray(value.blocks)
      ? value.blocks.map(normalizeBlock).filter(isDefined)
      : [],
  };
}

function normalizeResponsive(value: unknown): HeroSlide["responsive"] {
  const input = isRecord(value) ? value : {};
  return {
    desktop: normalizeResponsiveLayout(input.desktop),
    tablet: normalizeResponsiveLayout(input.tablet),
    mobile: normalizeResponsiveLayout(input.mobile),
  };
}

function normalizeResponsiveLayout(value: unknown): HeroSlideResponsiveLayout {
  if (!isRecord(value)) return {};
  return {
    hidden: value.hidden === true,
    maxWidth: stringValue(value.maxWidth, ""),
    textAlign:
      value.textAlign === "center" ||
      value.textAlign === "right" ||
      value.textAlign === "left"
        ? value.textAlign
        : undefined,
    padding: stringValue(value.padding, ""),
  };
}

function normalizeBlock(value: unknown): HeroSlideBlock | null {
  if (!isRecord(value)) return null;
  const type = HERO_SLIDE_BLOCK_OPTIONS.some(
    (option) => option.value === value.type,
  )
    ? (value.type as HeroSlideBlockType)
    : null;
  if (!type) return null;
  return {
    id: stringValue(value.id, makeHeroSliderId("block")),
    type,
    props: isRecord(value.props) ? value.props : defaultBlockProps(type),
    hiddenOn: Array.isArray(value.hiddenOn)
      ? value.hiddenOn.filter(
          (item): item is HeroSliderBreakpoint =>
            item === "desktop" || item === "tablet" || item === "mobile",
        )
      : [],
    children: Array.isArray(value.children)
      ? value.children.map(normalizeBlock).filter(isDefined)
      : undefined,
    columns: Array.isArray(value.columns)
      ? value.columns.map((column) =>
          Array.isArray(column)
            ? column.map(normalizeBlock).filter(isDefined)
            : [],
        )
      : undefined,
  };
}

function collectBlocksText(blocks: HeroSlideBlock[], parts: string[]) {
  for (const block of blocks) {
    if (typeof block.props.text === "string") parts.push(block.props.text);
    if (typeof block.props.title === "string") parts.push(block.props.title);
    if (typeof block.props.body === "string") parts.push(block.props.body);
    if (typeof block.props.label === "string") parts.push(block.props.label);
    if (Array.isArray(block.props.items)) {
      for (const item of block.props.items) {
        if (isRecord(item) && typeof item.label === "string") {
          parts.push(item.label);
        }
      }
    }
    if (block.children) collectBlocksText(block.children, parts);
    if (block.columns) {
      for (const column of block.columns) collectBlocksText(column, parts);
    }
  }
}

function numberInRange(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
) {
  const next = Number(value);
  return Number.isFinite(next) ? Math.min(max, Math.max(min, next)) : fallback;
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
