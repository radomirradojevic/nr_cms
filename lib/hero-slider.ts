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
  // Legacy only. Menu blocks are normalized into slide.menus and are no
  // longer exposed through Add content block.
  | "menu"
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

export type HeroSlideMenu = {
  id: string;
  props: Record<string, unknown>;
  hiddenOn?: HeroSliderBreakpoint[];
};

export type HeroSlideSearchContentType = "blog_post" | "page";

export type HeroSlideSearchInput = {
  id: string;
  props: Record<string, unknown>;
  hiddenOn?: HeroSliderBreakpoint[];
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
  menus: HeroSlideMenu[];
  searchInputs: HeroSlideSearchInput[];
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

export const HERO_SLIDE_MENU_PRESETS = {
  glass: {
    label: "Glass",
    props: {
      backgroundColor: "rgba(15,23,42,0.42)",
      color: "#ffffff",
      borderColor: "rgba(255,255,255,0.18)",
      hoverBackgroundColor: "rgba(255,255,255,0.16)",
      hoverColor: "#ffffff",
      activeBackgroundColor: "rgba(255,255,255,0.22)",
      activeColor: "#ffffff",
      dropdownBackgroundColor: "rgba(15,23,42,0.96)",
      dropdownColor: "#ffffff",
      mobilePanelBackgroundColor: "rgba(15,23,42,0.96)",
      mobilePanelColor: "#ffffff",
      borderRadius: "0.9rem",
      submenuRadius: "0.85rem",
      borderWidth: "1px",
      surfaceShadow: "0 10px 30px rgba(2,6,23,0.2)",
      shadow: "0 18px 44px rgba(2,6,23,0.32)",
      itemPadding: "0.62rem 0.85rem",
      gap: "0.2rem",
    },
  },
  solid: {
    label: "Header",
    props: {
      backgroundColor: "transparent",
      color: "var(--foreground)",
      borderColor: "transparent",
      hoverBackgroundColor: "var(--muted)",
      hoverColor: "var(--foreground)",
      activeBackgroundColor: "var(--muted)",
      activeColor: "var(--foreground)",
      dropdownBackgroundColor: "var(--popover)",
      dropdownColor: "var(--popover-foreground)",
      mobilePanelBackgroundColor: "var(--popover)",
      mobilePanelColor: "var(--popover-foreground)",
      borderRadius: "0.5rem",
      submenuRadius: "0.5rem",
      borderWidth: "0",
      surfaceShadow: "none",
      shadow:
        "0 0 0 1px rgb(from var(--foreground) r g b / 0.1), 0 10px 24px rgba(15,23,42,0.14)",
      itemPadding: "0.55rem 0.75rem",
      gap: "0",
    },
  },
  minimal: {
    label: "Minimal",
    props: {
      backgroundColor: "transparent",
      color: "#ffffff",
      borderColor: "transparent",
      hoverBackgroundColor: "rgba(255,255,255,0.12)",
      hoverColor: "#ffffff",
      activeBackgroundColor: "rgba(255,255,255,0.18)",
      activeColor: "#ffffff",
      dropdownBackgroundColor: "rgba(255,255,255,0.97)",
      dropdownColor: "#111827",
      mobilePanelBackgroundColor: "rgba(255,255,255,0.97)",
      mobilePanelColor: "#111827",
      borderRadius: "0.55rem",
      submenuRadius: "0.75rem",
      borderWidth: "0",
      surfaceShadow: "none",
      shadow: "none",
      itemPadding: "0.55rem 0.65rem",
      gap: "0.1rem",
    },
  },
  pill: {
    label: "Premium Dark",
    props: {
      backgroundColor: "rgba(2,6,23,0.78)",
      color: "#ffffff",
      borderColor: "rgba(148,163,184,0.28)",
      hoverBackgroundColor: "rgba(20,184,166,0.22)",
      hoverColor: "#f8fafc",
      activeBackgroundColor: "rgba(20,184,166,0.3)",
      activeColor: "#f8fafc",
      dropdownBackgroundColor: "rgba(2,6,23,0.97)",
      dropdownColor: "#ffffff",
      mobilePanelBackgroundColor: "rgba(2,6,23,0.97)",
      mobilePanelColor: "#ffffff",
      borderRadius: "999px",
      submenuRadius: "0.9rem",
      borderWidth: "1px",
      surfaceShadow: "0 12px 32px rgba(2,6,23,0.26)",
      shadow: "0 20px 48px rgba(2,6,23,0.36)",
      itemPadding: "0.6rem 0.9rem",
      gap: "0.2rem",
    },
  },
  editorial: {
    label: "Editorial",
    props: {
      backgroundColor: "rgba(250,250,249,0.9)",
      color: "#1c1917",
      borderColor: "rgba(68,64,60,0.18)",
      hoverBackgroundColor: "#1c1917",
      hoverColor: "#fafaf9",
      activeBackgroundColor: "#44403c",
      activeColor: "#fafaf9",
      dropdownBackgroundColor: "rgba(250,250,249,0.98)",
      dropdownColor: "#1c1917",
      mobilePanelBackgroundColor: "rgba(250,250,249,0.98)",
      mobilePanelColor: "#1c1917",
      borderRadius: "0.35rem",
      submenuRadius: "0.35rem",
      borderWidth: "1px",
      surfaceShadow: "0 8px 20px rgba(28,25,23,0.1)",
      shadow: "0 16px 34px rgba(28,25,23,0.16)",
      itemPadding: "0.62rem 0.8rem",
      gap: "0.12rem",
    },
  },
} as const;

export type HeroSlideMenuPreset = keyof typeof HERO_SLIDE_MENU_PRESETS;

const LEGACY_HERO_SLIDE_MENU_PRESET_PROPS: Record<
  HeroSlideMenuPreset,
  Partial<
    Record<keyof (typeof HERO_SLIDE_MENU_PRESETS)["glass"]["props"], string>
  >
> = {
  glass: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.24)",
    hoverBackgroundColor: "rgba(255,255,255,0.24)",
    activeBackgroundColor: "rgba(255,255,255,0.3)",
    dropdownBackgroundColor: "rgba(15,23,42,0.94)",
    borderRadius: "999px",
    shadow: "0 18px 45px rgba(15,23,42,0.24)",
    itemPadding: "0.65rem 0.85rem",
    gap: "0.35rem",
  },
  solid: {
    backgroundColor: "#ffffff",
    color: "#0f172a",
    borderColor: "#e2e8f0",
    hoverBackgroundColor: "#f1f5f9",
    hoverColor: "#0f172a",
    activeBackgroundColor: "#e2e8f0",
    activeColor: "#0f172a",
    dropdownBackgroundColor: "#ffffff",
    dropdownColor: "#0f172a",
    mobilePanelBackgroundColor: "#ffffff",
    mobilePanelColor: "#0f172a",
    borderRadius: "0.75rem",
    borderWidth: "1px",
    shadow: "0 16px 35px rgba(15,23,42,0.16)",
    itemPadding: "0.7rem 0.9rem",
    gap: "0.35rem",
  },
  minimal: {
    hoverBackgroundColor: "rgba(255,255,255,0.14)",
    dropdownBackgroundColor: "#ffffff",
    dropdownColor: "#0f172a",
    mobilePanelBackgroundColor: "#ffffff",
    mobilePanelColor: "#0f172a",
    borderRadius: "0.5rem",
    itemPadding: "0.55rem 0.7rem",
    gap: "0.25rem",
  },
  pill: {
    backgroundColor: "#0f172a",
    borderColor: "rgba(255,255,255,0.16)",
    hoverBackgroundColor: "#14b8a6",
    hoverColor: "#042f2e",
    activeBackgroundColor: "#2dd4bf",
    activeColor: "#042f2e",
    dropdownBackgroundColor: "#0f172a",
    mobilePanelBackgroundColor: "#0f172a",
    shadow: "0 20px 50px rgba(20,184,166,0.22)",
    itemPadding: "0.7rem 1rem",
    gap: "0.35rem",
  },
  editorial: {
    backgroundColor: "rgba(250,250,249,0.94)",
    color: "#18181b",
    borderColor: "rgba(24,24,27,0.16)",
    hoverBackgroundColor: "#18181b",
    activeBackgroundColor: "#3f3f46",
    dropdownBackgroundColor: "#fafaf9",
    dropdownColor: "#18181b",
    mobilePanelBackgroundColor: "#fafaf9",
    mobilePanelColor: "#18181b",
    borderRadius: "0.25rem",
    shadow: "0 18px 40px rgba(24,24,27,0.16)",
    itemPadding: "0.7rem 0.85rem",
    gap: "0.15rem",
  },
};

export const HERO_SLIDE_MENU_PRESET_OPTIONS: Array<{
  value: HeroSlideMenuPreset;
  label: string;
}> = [
  { value: "glass", label: HERO_SLIDE_MENU_PRESETS.glass.label },
  { value: "solid", label: HERO_SLIDE_MENU_PRESETS.solid.label },
  { value: "minimal", label: HERO_SLIDE_MENU_PRESETS.minimal.label },
  { value: "pill", label: HERO_SLIDE_MENU_PRESETS.pill.label },
  { value: "editorial", label: HERO_SLIDE_MENU_PRESETS.editorial.label },
];

export const HERO_SLIDE_SEARCH_INPUT_PRESETS = {
  glass: {
    label: "Glass",
    props: {
      backgroundColor: "rgba(15,23,42,0.46)",
      color: "#ffffff",
      borderColor: "rgba(255,255,255,0.24)",
      placeholderColor: "rgba(255,255,255,0.68)",
      focusBorderColor: "rgba(255,255,255,0.55)",
      focusRingColor: "rgba(255,255,255,0.22)",
      resultsBackgroundColor: "rgba(15,23,42,0.97)",
      resultsColor: "#ffffff",
      resultsBorderColor: "rgba(255,255,255,0.18)",
      borderRadius: "999px",
      borderWidth: "1px",
      shadow: "0 18px 44px rgba(2,6,23,0.32)",
      resultsShadow: "0 22px 56px rgba(2,6,23,0.38)",
    },
  },
  solid: {
    label: "Header",
    props: {
      backgroundColor: "var(--background)",
      color: "var(--foreground)",
      borderColor: "var(--input)",
      placeholderColor: "var(--muted-foreground)",
      focusBorderColor: "var(--ring)",
      focusRingColor: "rgb(from var(--ring) r g b / 0.35)",
      resultsBackgroundColor: "var(--popover)",
      resultsColor: "var(--popover-foreground)",
      resultsBorderColor: "var(--border)",
      borderRadius: "0.5rem",
      borderWidth: "1px",
      shadow: "0 10px 24px rgba(15,23,42,0.12)",
      resultsShadow:
        "0 0 0 1px rgb(from var(--foreground) r g b / 0.1), 0 10px 24px rgba(15,23,42,0.14)",
    },
  },
  minimal: {
    label: "Minimal",
    props: {
      backgroundColor: "transparent",
      color: "#ffffff",
      borderColor: "rgba(255,255,255,0.56)",
      placeholderColor: "rgba(255,255,255,0.72)",
      focusBorderColor: "#ffffff",
      focusRingColor: "rgba(255,255,255,0.2)",
      resultsBackgroundColor: "rgba(255,255,255,0.97)",
      resultsColor: "#111827",
      resultsBorderColor: "rgba(17,24,39,0.12)",
      borderRadius: "0.65rem",
      borderWidth: "1px",
      shadow: "none",
      resultsShadow: "0 16px 34px rgba(15,23,42,0.16)",
    },
  },
  pill: {
    label: "Premium Dark",
    props: {
      backgroundColor: "rgba(2,6,23,0.82)",
      color: "#ffffff",
      borderColor: "rgba(148,163,184,0.3)",
      placeholderColor: "rgba(226,232,240,0.72)",
      focusBorderColor: "rgba(45,212,191,0.72)",
      focusRingColor: "rgba(20,184,166,0.24)",
      resultsBackgroundColor: "rgba(2,6,23,0.97)",
      resultsColor: "#ffffff",
      resultsBorderColor: "rgba(148,163,184,0.24)",
      borderRadius: "999px",
      borderWidth: "1px",
      shadow: "0 20px 48px rgba(2,6,23,0.36)",
      resultsShadow: "0 24px 58px rgba(2,6,23,0.44)",
    },
  },
  editorial: {
    label: "Editorial",
    props: {
      backgroundColor: "rgba(250,250,249,0.92)",
      color: "#1c1917",
      borderColor: "rgba(68,64,60,0.18)",
      placeholderColor: "rgba(68,64,60,0.64)",
      focusBorderColor: "#1c1917",
      focusRingColor: "rgba(28,25,23,0.16)",
      resultsBackgroundColor: "rgba(250,250,249,0.98)",
      resultsColor: "#1c1917",
      resultsBorderColor: "rgba(68,64,60,0.18)",
      borderRadius: "0.35rem",
      borderWidth: "1px",
      shadow: "0 12px 28px rgba(28,25,23,0.14)",
      resultsShadow: "0 18px 40px rgba(28,25,23,0.16)",
    },
  },
} as const;

export type HeroSlideSearchInputPreset =
  keyof typeof HERO_SLIDE_SEARCH_INPUT_PRESETS;

export const HERO_SLIDE_SEARCH_INPUT_PRESET_OPTIONS: Array<{
  value: HeroSlideSearchInputPreset;
  label: string;
}> = [
  { value: "glass", label: HERO_SLIDE_SEARCH_INPUT_PRESETS.glass.label },
  { value: "solid", label: HERO_SLIDE_SEARCH_INPUT_PRESETS.solid.label },
  { value: "minimal", label: HERO_SLIDE_SEARCH_INPUT_PRESETS.minimal.label },
  { value: "pill", label: HERO_SLIDE_SEARCH_INPUT_PRESETS.pill.label },
  {
    value: "editorial",
    label: HERO_SLIDE_SEARCH_INPUT_PRESETS.editorial.label,
  },
];

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

export function createHeroSlideMenu(): HeroSlideMenu {
  return {
    id: makeHeroSliderId("menu"),
    props: defaultMenuProps("glass"),
    hiddenOn: [],
  };
}

export function createHeroSlideSearchInput(): HeroSlideSearchInput {
  return {
    id: makeHeroSliderId("search"),
    props: defaultSearchInputProps("glass"),
    hiddenOn: [],
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
    menus: [],
    searchInputs: [],
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
    collectMenusText(slide.menus, parts);
    collectSearchInputsText(slide.searchInputs, parts);
  }
  return parts
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function createHeroSlideMenuPresetProps(value: unknown) {
  const preset = normalizeMenuPreset(value);
  return { ...HERO_SLIDE_MENU_PRESETS[preset].props };
}

export function createHeroSlideSearchInputPresetProps(value: unknown) {
  const preset = normalizeSearchInputPreset(value);
  return { ...HERO_SLIDE_SEARCH_INPUT_PRESETS[preset].props };
}

export function collectHeroSliderMenuIds(value: unknown): string[] {
  const data = normalizeHeroSliderContent(value);
  const ids = new Set<string>();
  for (const slide of data.slides) collectMenuIdsFromMenus(slide.menus, ids);
  return Array.from(ids);
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
    case "menu":
      return defaultMenuProps("glass");
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

function defaultMenuProps(value: unknown): Record<string, unknown> {
  const preset = normalizeMenuPreset(value);
  return {
    menuId: "",
    menuName: "",
    preset,
    layout: "horizontal",
    mobileBehavior: "collapse",
    mobileBreakpoint: "lg",
    appendBackendMenu: false,
    appendAuthMenu: false,
    positionMode: "absolute",
    flowAlign: "left",
    anchor: "top-right",
    offsetX: "clamp(1rem, 4vw, 3rem)",
    offsetY: "clamp(1rem, 4vw, 2rem)",
    zIndex: "20",
    width: "auto",
    maxWidth: "100%",
    wrapperMargin: {},
    wrapperPadding: {},
    fontSize: "0.95rem",
    fontWeight: "600",
    textTransform: "none",
    letterSpacing: "0",
    lineHeight: "1.2",
    submenuWidth: "240px",
    submenuPadding: "0.5rem",
    megaWidth: "min(48rem, calc(100vw - 2rem))",
    mobileButtonLabel: "Menu",
    mobilePanelWidth: "min(20rem, calc(100vw - 2rem))",
    mobileItemPadding: "0.75rem 0.85rem",
    ...createHeroSlideMenuPresetProps(preset),
  };
}

function defaultSearchInputProps(value: unknown): Record<string, unknown> {
  const preset = normalizeSearchInputPreset(value);
  return {
    preset,
    label: "Search",
    placeholder: "Search...",
    contentTypes: ["blog_post", "page"] satisfies HeroSlideSearchContentType[],
    positionMode: "absolute",
    flowAlign: "center",
    anchor: "bottom-center",
    offsetX: "0",
    offsetY: "clamp(4.5rem, 8vw, 6rem)",
    zIndex: "20",
    width: "min(32rem, calc(100vw - 2rem))",
    maxWidth: "100%",
    wrapperMargin: {},
    wrapperPadding: {},
    inputHeight: "3rem",
    inputPadding: "0 1rem",
    fontSize: "1rem",
    fontWeight: "500",
    letterSpacing: "0",
    resultsAlign: "left",
    resultsWidth: "min(28rem, calc(100vw - 2rem))",
    resultsRadius: "0.75rem",
    ...createHeroSlideSearchInputPresetProps(preset),
  };
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
  const extracted = normalizeBlocksWithExtractedMenus(value.blocks);
  const menus = [...normalizeMenus(value.menus), ...extracted.menus];
  const searchInputs = normalizeSearchInputs(value.searchInputs);
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
    blocks: extracted.blocks,
    menus,
    searchInputs,
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

function normalizeMenus(value: unknown): HeroSlideMenu[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeMenu).filter(isDefined);
}

function normalizeMenu(value: unknown): HeroSlideMenu | null {
  if (!isRecord(value)) return null;
  return {
    id: stringValue(value.id, makeHeroSliderId("menu")),
    props: normalizeMenuProps(
      isRecord(value.props) ? value.props : defaultMenuProps("glass"),
    ),
    hiddenOn: normalizeHiddenOn(value.hiddenOn),
  };
}

function normalizeSearchInputs(value: unknown): HeroSlideSearchInput[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeSearchInput).filter(isDefined);
}

function normalizeSearchInput(value: unknown): HeroSlideSearchInput | null {
  if (!isRecord(value)) return null;
  return {
    id: stringValue(value.id, makeHeroSliderId("search")),
    props: normalizeSearchInputProps(
      isRecord(value.props) ? value.props : defaultSearchInputProps("glass"),
    ),
    hiddenOn: normalizeHiddenOn(value.hiddenOn),
  };
}

function normalizeBlocksWithExtractedMenus(value: unknown): {
  blocks: HeroSlideBlock[];
  menus: HeroSlideMenu[];
} {
  if (!Array.isArray(value)) return { blocks: [], menus: [] };

  const blocks: HeroSlideBlock[] = [];
  const menus: HeroSlideMenu[] = [];
  for (const item of value) {
    const result = normalizeBlockWithExtractedMenus(item);
    if (result.block) blocks.push(result.block);
    menus.push(...result.menus);
  }

  return { blocks, menus };
}

function normalizeBlockWithExtractedMenus(value: unknown): {
  block: HeroSlideBlock | null;
  menus: HeroSlideMenu[];
} {
  if (!isRecord(value)) return { block: null, menus: [] };
  const type = HERO_SLIDE_BLOCK_OPTIONS.some(
    (option) => option.value === value.type,
  )
    ? (value.type as HeroSlideBlockType)
    : null;
  if (value.type === "menu") {
    const menu = normalizeMenu(value);
    return { block: null, menus: menu ? [menu] : [] };
  }
  if (!type) return { block: null, menus: [] };

  const children = normalizeBlocksWithExtractedMenus(value.children);
  const columnResults = Array.isArray(value.columns)
    ? value.columns.map((column) => normalizeBlocksWithExtractedMenus(column))
    : undefined;
  const menus = [
    ...children.menus,
    ...(columnResults?.flatMap((result) => result.menus) ?? []),
  ];

  return {
    block: {
      id: stringValue(value.id, makeHeroSliderId("block")),
      type,
      props: normalizeBlockProps(
        type,
        isRecord(value.props) ? value.props : defaultBlockProps(type),
      ),
      hiddenOn: normalizeHiddenOn(value.hiddenOn),
      children: children.blocks.length > 0 ? children.blocks : undefined,
      columns: columnResults?.map((result) => result.blocks),
    },
    menus,
  };
}

function normalizeBlockProps(
  type: HeroSlideBlockType,
  props: Record<string, unknown>,
) {
  if (type !== "menu") return props;
  return normalizeMenuProps(props);
}

function normalizeMenuProps(props: Record<string, unknown>) {
  const preset = normalizeMenuPreset(props.preset);
  const next: Record<string, unknown> = {
    ...defaultMenuProps(preset),
    ...props,
    preset,
    positionMode: "absolute",
  };
  const legacy = LEGACY_HERO_SLIDE_MENU_PRESET_PROPS[preset];
  const current = HERO_SLIDE_MENU_PRESETS[preset].props;

  for (const [key, legacyValue] of Object.entries(legacy)) {
    if (props[key] === legacyValue && key in current) {
      next[key] = current[key as keyof typeof current];
    }
  }

  next.wrapperMargin = normalizeMenuSpacingSides(next.wrapperMargin);
  next.wrapperPadding = normalizeMenuSpacingSides(next.wrapperPadding);
  next.appendBackendMenu = next.appendBackendMenu === true;
  next.appendAuthMenu = next.appendAuthMenu === true;

  return next;
}

function normalizeSearchInputProps(props: Record<string, unknown>) {
  const preset = normalizeSearchInputPreset(props.preset);
  const next: Record<string, unknown> = {
    ...defaultSearchInputProps(preset),
    ...props,
    preset,
    positionMode: "absolute",
  };

  next.wrapperMargin = normalizeMenuSpacingSides(next.wrapperMargin);
  next.wrapperPadding = normalizeMenuSpacingSides(next.wrapperPadding);
  next.contentTypes = normalizeSearchContentTypes(next.contentTypes);
  next.resultsAlign = next.resultsAlign === "right" ? "right" : "left";

  return next;
}

function normalizeMenuPreset(value: unknown): HeroSlideMenuPreset {
  return typeof value === "string" && value in HERO_SLIDE_MENU_PRESETS
    ? (value as HeroSlideMenuPreset)
    : "glass";
}

function normalizeSearchInputPreset(
  value: unknown,
): HeroSlideSearchInputPreset {
  return typeof value === "string" && value in HERO_SLIDE_SEARCH_INPUT_PRESETS
    ? (value as HeroSlideSearchInputPreset)
    : "glass";
}

function normalizeSearchContentTypes(
  value: unknown,
): HeroSlideSearchContentType[] {
  if (!Array.isArray(value)) return ["blog_post", "page"];
  const next = Array.from(
    new Set(
      value.filter(
        (item): item is HeroSlideSearchContentType =>
          item === "blog_post" || item === "page",
      ),
    ),
  );
  return next.length > 0 ? next : ["blog_post", "page"];
}

function normalizeHiddenOn(value: unknown): HeroSliderBreakpoint[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is HeroSliderBreakpoint =>
          item === "desktop" || item === "tablet" || item === "mobile",
      )
    : [];
}

function normalizeMenuSpacingSides(value: unknown) {
  if (!isRecord(value)) return {};
  return {
    top: stringValue(value.top, ""),
    right: stringValue(value.right, ""),
    bottom: stringValue(value.bottom, ""),
    left: stringValue(value.left, ""),
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

function collectMenusText(menus: HeroSlideMenu[], parts: string[]) {
  for (const menu of menus) {
    if (typeof menu.props.menuName === "string") {
      parts.push(menu.props.menuName);
    }
  }
}

function collectSearchInputsText(
  searchInputs: HeroSlideSearchInput[],
  parts: string[],
) {
  for (const searchInput of searchInputs) {
    if (typeof searchInput.props.label === "string") {
      parts.push(searchInput.props.label);
    }
    if (typeof searchInput.props.placeholder === "string") {
      parts.push(searchInput.props.placeholder);
    }
  }
}

function collectMenuIdsFromMenus(menus: HeroSlideMenu[], ids: Set<string>) {
  for (const menu of menus) {
    if (typeof menu.props.menuId === "string") {
      const id = menu.props.menuId.trim();
      if (id) ids.add(id);
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
