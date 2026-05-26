import { z } from "zod";

import {
  CONTENT_WIDTHS,
  DEFAULT_APPEARANCE,
  FONT_PRESETS,
  RADIUS_PRESETS,
  SHADOW_PRESETS,
  THEMES,
  isContentWidthPreset,
  parseCustomContentWidth,
  resolveAppearance,
  type AppearanceSettings,
  type ContentWidth,
} from "@/lib/appearance";
import { sanitizeCmsHtml } from "@/lib/content-sanitizer";
import { GlowEffectSchema, type GlowEffect } from "@/lib/glow";

/**
 * AppearanceRecipe defines the typed internal appearance recipe shape.
 *
 * Phase 7 keeps v1 readable, migrates it to the current v2 envelope, and
 * stores governance defaults alongside the shell/content template structure.
 */

export const APPEARANCE_RECIPE_V1_VERSION = 1 as const;
export const APPEARANCE_RECIPE_VERSION = 2 as const;
export const APPEARANCE_RECIPE_MAX_REGION_HEIGHT_PX = 400;
export const APPEARANCE_RECIPE_MAX_LINKS = 8;
export const APPEARANCE_RECIPE_EXPORT_KIND = "nr-cms.appearance-recipe";
export const APPEARANCE_RECIPE_EXPORT_VERSION = 1 as const;

export const HEADER_VARIANTS = [
  "classic",
  "centered",
  "split",
  "compact-app",
  "editorial-masthead",
  "minimal",
] as const;

export const FOOTER_VARIANTS = [
  "classic",
  "minimal",
  "multi-column",
  "centered",
  "CTA",
  "hidden",
] as const;

export const MAIN_SURFACE_VARIANTS = [
  "normal",
  "framed",
  "full-bleed-builder",
  "editorial-article",
  "category-grid",
] as const;

export const BLOG_POST_METADATA_TREATMENTS = [
  "inline",
  "stacked",
  "eyebrow",
  "compact",
] as const;

export const BLOG_POST_COVER_PLACEMENTS = [
  "top",
  "hero",
  "after-title",
  "inline",
] as const;

export const BLOG_POST_EXCERPT_TREATMENTS = [
  "lead",
  "subtle",
  "callout",
  "compact",
] as const;

export const BLOG_POST_COMMENTS_PLACEMENTS = [
  "after-content",
  "before-content",
  "aside",
] as const;

export const BLOG_POST_EDIT_AFFORDANCE_PLACEMENTS = [
  "title-inline",
  "header-actions",
  "footer-actions",
] as const;

export const BLOG_CATEGORY_TEMPLATE_VARIANTS = [
  "list",
  "cards",
  "magazine-grid",
  "compact-archive",
  "featured-first",
] as const;

export const PAGE_TEMPLATE_VARIANTS = [
  "full-bleed-builder",
  "contained-builder",
  "framed-builder",
  "landing-mode",
] as const;

export const APPEARANCE_MOTION_PREFERENCES = ["system", "reduced"] as const;

export const APPEARANCE_BACKGROUND_EFFECTS = ["system", "disabled"] as const;

export const DEFAULT_BLOG_POST_TEMPLATE_V1 = {
  metadataTreatment: "inline",
  coverPlacement: "top",
  excerptTreatment: "lead",
  commentsPlacement: "after-content",
  editAffordancePlacement: "title-inline",
} as const;

export const DEFAULT_BLOG_CATEGORY_TEMPLATE_V1 = {
  variant: "list",
} as const;

export const DEFAULT_PAGE_TEMPLATE_V1 = {
  variant: "contained-builder",
} as const;

export const DEFAULT_CONTENT_TEMPLATES_V1 = {
  blogPost: DEFAULT_BLOG_POST_TEMPLATE_V1,
  blogCategory: DEFAULT_BLOG_CATEGORY_TEMPLATE_V1,
  page: DEFAULT_PAGE_TEMPLATE_V1,
} as const;

export const DEFAULT_APPEARANCE_MOTION_V2 = {
  motionPreference: "system",
  backgroundEffects: "system",
} as const;

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const SAFE_SLOT_HREF =
  /^(\/(?!\/)|https:\/\/|http:\/\/|mailto:|tel:)[^\s<>"']*$/i;

function isRecipeContentWidth(value: unknown): value is ContentWidth {
  if (isContentWidthPreset(value)) return true;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return false;
  return parseCustomContentWidth(value) !== null;
}

export const AppearanceRecipeContentWidthSchema = z.custom<ContentWidth>(
  isRecipeContentWidth,
  {
    message: `Content width must be one of ${CONTENT_WIDTHS.join(
      ", ",
    )} or a positive integer pixel string.`,
  },
);

export const AppearanceRecipeTokensV1Schema = z
  .object({
    theme: z.enum(THEMES).default(DEFAULT_APPEARANCE.theme),
    frontendContentWidth: AppearanceRecipeContentWidthSchema.default(
      DEFAULT_APPEARANCE.frontendContentWidth,
    ),
    backendContentWidth: AppearanceRecipeContentWidthSchema.default(
      DEFAULT_APPEARANCE.backendContentWidth,
    ),
    fontPreset: z.enum(FONT_PRESETS).default(DEFAULT_APPEARANCE.fontPreset),
    radiusPreset: z
      .enum(RADIUS_PRESETS)
      .default(DEFAULT_APPEARANCE.radiusPreset),
    shadowPreset: z
      .enum(SHADOW_PRESETS)
      .default(DEFAULT_APPEARANCE.shadowPreset),
  })
  .strict();

export const AppearanceSlotVisibilitySchema = z
  .enum(["always", "signed-out", "signed-in", "backend-user", "admin"])
  .default("always");

const AppearanceSlotBaseV1Schema = z
  .object({
    id: z.string().trim().min(1).max(80),
    enabled: z.boolean().default(true),
    visibility: AppearanceSlotVisibilitySchema,
  })
  .strict();

export const BrandSlotV1Schema = AppearanceSlotBaseV1Schema.extend({
  type: z.literal("Brand"),
  showLogo: z.boolean().default(true),
  showSiteName: z.boolean().default(true),
}).strict();

export const SiteMenuSlotV1Schema = AppearanceSlotBaseV1Schema.extend({
  type: z.literal("SiteMenu"),
}).strict();

export const AdminMenuSlotV1Schema = AppearanceSlotBaseV1Schema.extend({
  type: z.literal("AdminMenu"),
}).strict();

export const AuthControlsSlotV1Schema = AppearanceSlotBaseV1Schema.extend({
  type: z.literal("AuthControls"),
}).strict();

export const RichTextSlotV1Schema = AppearanceSlotBaseV1Schema.extend({
  type: z.literal("RichText"),
  html: z.string().max(20_000).default(""),
}).strict();

export const CustomHtmlSlotV1Schema = AppearanceSlotBaseV1Schema.extend({
  type: z.literal("CustomHtml"),
  html: z.string().max(20_000).default(""),
}).strict();

export const CopyrightSlotV1Schema = AppearanceSlotBaseV1Schema.extend({
  type: z.literal("Copyright"),
  text: z.string().max(200).default(""),
}).strict();

export const SearchSlotV1Schema = AppearanceSlotBaseV1Schema.extend({
  type: z.literal("Search"),
  label: z.string().trim().max(80).default("Search"),
  placeholder: z.string().trim().max(80).default("Search"),
  action: z.string().trim().regex(SAFE_SLOT_HREF).default("/"),
  queryParam: z.string().trim().min(1).max(40).default("q"),
}).strict();

export const CTASlotV1Schema = AppearanceSlotBaseV1Schema.extend({
  type: z.literal("CTA"),
  label: z.string().trim().max(80).default(""),
  href: z
    .string()
    .trim()
    .max(300)
    .refine((value) => value === "" || SAFE_SLOT_HREF.test(value), {
      message: "CTA URL must be an internal path or a safe URL.",
    })
    .default(""),
  style: z.enum(["primary", "secondary", "link"]).default("primary"),
}).strict();

export const AppearanceLinkV1Schema = z
  .object({
    label: z.string().trim().min(1).max(80),
    href: z.string().trim().max(300).regex(SAFE_SLOT_HREF),
  })
  .strict();

export const SocialLinksSlotV1Schema = AppearanceSlotBaseV1Schema.extend({
  type: z.literal("SocialLinks"),
  links: z
    .array(AppearanceLinkV1Schema)
    .max(APPEARANCE_RECIPE_MAX_LINKS)
    .default([]),
}).strict();

export const LegalLinksSlotV1Schema = AppearanceSlotBaseV1Schema.extend({
  type: z.literal("LegalLinks"),
  links: z
    .array(AppearanceLinkV1Schema)
    .max(APPEARANCE_RECIPE_MAX_LINKS)
    .default([]),
}).strict();

export const FooterLinksSlotV1Schema = AppearanceSlotBaseV1Schema.extend({
  type: z.literal("FooterLinks"),
  links: z
    .array(AppearanceLinkV1Schema)
    .max(APPEARANCE_RECIPE_MAX_LINKS)
    .default([]),
}).strict();

export const AppearanceSlotV1Schema = z.discriminatedUnion("type", [
  BrandSlotV1Schema,
  SiteMenuSlotV1Schema,
  AdminMenuSlotV1Schema,
  AuthControlsSlotV1Schema,
  RichTextSlotV1Schema,
  CustomHtmlSlotV1Schema,
  CopyrightSlotV1Schema,
  SearchSlotV1Schema,
  CTASlotV1Schema,
  SocialLinksSlotV1Schema,
  LegalLinksSlotV1Schema,
  FooterLinksSlotV1Schema,
]);

const AppearanceRegionBaseV1Schema = z
  .object({
    background: z.string().regex(HEX_COLOR).optional(),
    glow: GlowEffectSchema.optional(),
  })
  .strict();

export const HeaderRegionV1Schema = AppearanceRegionBaseV1Schema.extend({
  variant: z.enum(HEADER_VARIANTS).default("classic"),
  sticky: z.boolean().default(false),
  heightPx: z
    .number()
    .int()
    .min(0)
    .max(APPEARANCE_RECIPE_MAX_REGION_HEIGHT_PX)
    .default(80),
  slots: z.array(AppearanceSlotV1Schema).default([]),
}).strict();

export const FooterRegionV1Schema = AppearanceRegionBaseV1Schema.extend({
  variant: z.enum(FOOTER_VARIANTS).default("classic"),
  sticky: z.boolean().default(false),
  minHeightPx: z
    .number()
    .int()
    .min(0)
    .max(APPEARANCE_RECIPE_MAX_REGION_HEIGHT_PX)
    .default(110),
  slots: z.array(AppearanceSlotV1Schema).default([]),
}).strict();

export const MainRegionV1Schema = z
  .object({
    variant: z.enum(MAIN_SURFACE_VARIANTS).default("normal"),
  })
  .strict();

export const AppearanceShellV1Schema = z
  .object({
    header: HeaderRegionV1Schema,
    main: MainRegionV1Schema,
    footer: FooterRegionV1Schema,
  })
  .strict();

export const BlogPostTemplateV1Schema = z
  .object({
    metadataTreatment: z
      .enum(BLOG_POST_METADATA_TREATMENTS)
      .default(DEFAULT_BLOG_POST_TEMPLATE_V1.metadataTreatment),
    coverPlacement: z
      .enum(BLOG_POST_COVER_PLACEMENTS)
      .default(DEFAULT_BLOG_POST_TEMPLATE_V1.coverPlacement),
    excerptTreatment: z
      .enum(BLOG_POST_EXCERPT_TREATMENTS)
      .default(DEFAULT_BLOG_POST_TEMPLATE_V1.excerptTreatment),
    commentsPlacement: z
      .enum(BLOG_POST_COMMENTS_PLACEMENTS)
      .default(DEFAULT_BLOG_POST_TEMPLATE_V1.commentsPlacement),
    editAffordancePlacement: z
      .enum(BLOG_POST_EDIT_AFFORDANCE_PLACEMENTS)
      .default(DEFAULT_BLOG_POST_TEMPLATE_V1.editAffordancePlacement),
  })
  .strict();

export const BlogCategoryTemplateV1Schema = z
  .object({
    variant: z
      .enum(BLOG_CATEGORY_TEMPLATE_VARIANTS)
      .default(DEFAULT_BLOG_CATEGORY_TEMPLATE_V1.variant),
  })
  .strict();

export const PageTemplateV1Schema = z
  .object({
    variant: z
      .enum(PAGE_TEMPLATE_VARIANTS)
      .default(DEFAULT_PAGE_TEMPLATE_V1.variant),
  })
  .strict();

export const AppearanceContentTemplatesV1Schema = z
  .object({
    blogPost: BlogPostTemplateV1Schema.default(DEFAULT_BLOG_POST_TEMPLATE_V1),
    blogCategory: BlogCategoryTemplateV1Schema.default(
      DEFAULT_BLOG_CATEGORY_TEMPLATE_V1,
    ),
    page: PageTemplateV1Schema.default(DEFAULT_PAGE_TEMPLATE_V1),
  })
  .strict();

export const AppearanceMotionV2Schema = z
  .object({
    motionPreference: z
      .enum(APPEARANCE_MOTION_PREFERENCES)
      .default(DEFAULT_APPEARANCE_MOTION_V2.motionPreference),
    backgroundEffects: z
      .enum(APPEARANCE_BACKGROUND_EFFECTS)
      .default(DEFAULT_APPEARANCE_MOTION_V2.backgroundEffects),
  })
  .strict();

const AppearanceRecipeCoreShape = {
  name: z.string().trim().min(1).max(120).default("Classic"),
  tokens: AppearanceRecipeTokensV1Schema.default(DEFAULT_APPEARANCE),
  shell: AppearanceShellV1Schema,
  contentTemplates: AppearanceContentTemplatesV1Schema.default(
    DEFAULT_CONTENT_TEMPLATES_V1,
  ),
} as const;

export const AppearanceRecipeV1Schema = z
  .object({
    version: z.literal(APPEARANCE_RECIPE_V1_VERSION),
    ...AppearanceRecipeCoreShape,
  })
  .strict();

export const AppearanceRecipeV2Schema = z
  .object({
    version: z.literal(APPEARANCE_RECIPE_VERSION),
    ...AppearanceRecipeCoreShape,
    motion: AppearanceMotionV2Schema.default(DEFAULT_APPEARANCE_MOTION_V2),
  })
  .strict();

export const AppearanceRecipeExportSchema = z
  .object({
    kind: z.literal(APPEARANCE_RECIPE_EXPORT_KIND),
    exportVersion: z.literal(APPEARANCE_RECIPE_EXPORT_VERSION),
    exportedAt: z.string().datetime(),
    recipe: z.unknown(),
  })
  .strict();

export type AppearanceRecipeLegacyInput = {
  appearance: AppearanceSettings;
  headerContent: string | null;
  footerContent: string | null;
  headerSettings: {
    showLogo: boolean;
    showSiteName: boolean;
    sticky: boolean;
    background?: string;
    glow?: GlowEffect;
  };
  footerSettings: {
    sticky: boolean;
    background?: string;
    glow?: GlowEffect;
    copyright?: string;
  };
  stickyHeaderHeight: number;
  stickyFooterHeight: number;
};

function clampRegionHeight(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(
    0,
    Math.min(APPEARANCE_RECIPE_MAX_REGION_HEIGHT_PX, Math.floor(value)),
  );
}

function isEmptyRecipe(value: unknown): boolean {
  return (
    value == null ||
    (typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0)
  );
}

function withDefaultRecipeVersion(recipe: unknown): unknown {
  if (recipe == null || typeof recipe !== "object" || Array.isArray(recipe)) {
    return recipe;
  }
  if ("version" in recipe) return recipe;
  return { version: APPEARANCE_RECIPE_V1_VERSION, ...recipe };
}

export function migrateAppearanceRecipeToCurrent(
  recipe: unknown,
): AppearanceRecipe | null {
  const candidate = withDefaultRecipeVersion(recipe);
  const current = AppearanceRecipeV2Schema.safeParse(candidate);
  if (current.success) return current.data;

  const v1 = AppearanceRecipeV1Schema.safeParse(candidate);
  if (!v1.success) return null;

  return AppearanceRecipeV2Schema.parse({
    ...v1.data,
    version: APPEARANCE_RECIPE_VERSION,
    motion: DEFAULT_APPEARANCE_MOTION_V2,
  });
}

export function buildDefaultClassicAppearanceRecipe(
  legacy: AppearanceRecipeLegacyInput,
): AppearanceRecipe {
  const headerContent = sanitizeCmsHtml(legacy.headerContent ?? "");
  const footerContent = sanitizeCmsHtml(legacy.footerContent ?? "");
  const copyright = legacy.footerSettings.copyright ?? "";

  return AppearanceRecipeV2Schema.parse({
    version: APPEARANCE_RECIPE_VERSION,
    name: "Classic",
    tokens: legacy.appearance,
    contentTemplates: DEFAULT_CONTENT_TEMPLATES_V1,
    motion: DEFAULT_APPEARANCE_MOTION_V2,
    shell: {
      header: {
        variant: "classic",
        sticky: legacy.headerSettings.sticky,
        heightPx: clampRegionHeight(legacy.stickyHeaderHeight, 80),
        ...(legacy.headerSettings.background
          ? { background: legacy.headerSettings.background }
          : {}),
        ...(legacy.headerSettings.glow
          ? { glow: legacy.headerSettings.glow }
          : {}),
        slots: [
          {
            id: "brand",
            type: "Brand",
            enabled: true,
            visibility: "always",
            showLogo: legacy.headerSettings.showLogo,
            showSiteName: legacy.headerSettings.showSiteName,
          },
          {
            id: "header-custom-html",
            type: "CustomHtml",
            enabled: headerContent.length > 0,
            visibility: "always",
            html: headerContent,
          },
          {
            id: "site-menu",
            type: "SiteMenu",
            enabled: true,
            visibility: "always",
          },
          {
            id: "admin-menu",
            type: "AdminMenu",
            enabled: true,
            visibility: "backend-user",
          },
          {
            id: "auth-controls",
            type: "AuthControls",
            enabled: true,
            visibility: "always",
          },
          {
            id: "header-search",
            type: "Search",
            enabled: false,
            visibility: "always",
            label: "Search",
            placeholder: "Search",
            action: "/",
            queryParam: "q",
          },
          {
            id: "header-cta",
            type: "CTA",
            enabled: false,
            visibility: "always",
            label: "",
            href: "",
            style: "primary",
          },
        ],
      },
      main: {
        variant: "normal",
      },
      footer: {
        variant: "classic",
        sticky: legacy.footerSettings.sticky,
        minHeightPx: clampRegionHeight(legacy.stickyFooterHeight, 110),
        ...(legacy.footerSettings.background
          ? { background: legacy.footerSettings.background }
          : {}),
        ...(legacy.footerSettings.glow
          ? { glow: legacy.footerSettings.glow }
          : {}),
        slots: [
          {
            id: "footer-custom-html",
            type: "CustomHtml",
            enabled: footerContent.length > 0,
            visibility: "always",
            html: footerContent,
          },
          {
            id: "copyright",
            type: "Copyright",
            enabled: copyright.length > 0,
            visibility: "always",
            text: copyright,
          },
          {
            id: "footer-links",
            type: "FooterLinks",
            enabled: false,
            visibility: "always",
            links: [],
          },
          {
            id: "legal-links",
            type: "LegalLinks",
            enabled: false,
            visibility: "always",
            links: [],
          },
          {
            id: "social-links",
            type: "SocialLinks",
            enabled: false,
            visibility: "always",
            links: [],
          },
          {
            id: "footer-cta",
            type: "CTA",
            enabled: false,
            visibility: "always",
            label: "",
            href: "",
            style: "primary",
          },
        ],
      },
    },
  });
}

function findStoredSlot<T extends AppearanceSlotV1["type"]>(
  slots: AppearanceSlotV1[],
  fallback: Extract<AppearanceSlotV1, { type: T }>,
): Extract<AppearanceSlotV1, { type: T }> | null {
  return (slots.find(
    (slot) => slot.id === fallback.id && slot.type === fallback.type,
  ) ??
    slots.find((slot) => slot.type === fallback.type) ??
    null) as Extract<AppearanceSlotV1, { type: T }> | null;
}

function mergeSlotWithLegacy(
  fallback: AppearanceSlotV1,
  stored: AppearanceSlotV1 | null,
): AppearanceSlotV1 {
  if (!stored || stored.type !== fallback.type) return fallback;

  const base = {
    enabled: stored.enabled,
    visibility: stored.visibility,
  };

  switch (fallback.type) {
    case "Brand":
      return {
        ...fallback,
        ...base,
      };
    case "CustomHtml":
      return {
        ...fallback,
        ...base,
        enabled: stored.enabled && fallback.html.length > 0,
      };
    case "RichText":
      return {
        ...fallback,
        ...base,
        enabled: stored.enabled && fallback.html.length > 0,
      };
    case "Copyright":
      return {
        ...fallback,
        ...base,
        enabled: stored.enabled && fallback.text.length > 0,
      };
    case "Search": {
      const searchSlot = stored as Extract<
        AppearanceSlotV1,
        { type: "Search" }
      >;
      return {
        ...fallback,
        ...base,
        label: searchSlot.label,
        placeholder: searchSlot.placeholder,
        action: searchSlot.action,
        queryParam: searchSlot.queryParam,
      };
    }
    case "CTA": {
      const ctaSlot = stored as Extract<AppearanceSlotV1, { type: "CTA" }>;
      return {
        ...fallback,
        ...base,
        label: ctaSlot.label,
        href: ctaSlot.href,
        style: ctaSlot.style,
        enabled:
          ctaSlot.enabled &&
          ctaSlot.label.length > 0 &&
          ctaSlot.href.length > 0,
      };
    }
    case "SocialLinks":
    case "LegalLinks":
    case "FooterLinks": {
      const linkSlot = stored as Extract<
        AppearanceSlotV1,
        { type: "SocialLinks" | "LegalLinks" | "FooterLinks" }
      >;
      return {
        ...fallback,
        ...base,
        links: linkSlot.links,
        enabled: linkSlot.enabled && linkSlot.links.length > 0,
      };
    }
    case "SiteMenu":
    case "AdminMenu":
    case "AuthControls":
      return {
        ...fallback,
        ...base,
      };
  }
}

function mergeRegionSlots(
  fallbackSlots: AppearanceSlotV1[],
  storedSlots: AppearanceSlotV1[],
): AppearanceSlotV1[] {
  return fallbackSlots.map((fallbackSlot) =>
    mergeSlotWithLegacy(
      fallbackSlot,
      findStoredSlot(storedSlots, fallbackSlot),
    ),
  );
}

export function resolveAppearanceRecipeForWrite(
  recipe: unknown,
  legacy: AppearanceRecipeLegacyInput,
): AppearanceRecipe {
  const fallback = buildDefaultClassicAppearanceRecipe(legacy);
  if (isEmptyRecipe(recipe)) return fallback;

  const migrated = migrateAppearanceRecipeToCurrent(recipe);
  if (!migrated) return fallback;

  return AppearanceRecipeV2Schema.parse({
    ...migrated,
    tokens: fallback.tokens,
    contentTemplates: migrated.contentTemplates,
    motion: migrated.motion,
    shell: {
      header: {
        ...fallback.shell.header,
        variant: migrated.shell.header.variant,
        slots: mergeRegionSlots(
          fallback.shell.header.slots,
          migrated.shell.header.slots,
        ),
      },
      main: {
        variant: migrated.shell.main.variant,
      },
      footer: {
        ...fallback.shell.footer,
        variant: migrated.shell.footer.variant,
        slots: mergeRegionSlots(
          fallback.shell.footer.slots,
          migrated.shell.footer.slots,
        ),
      },
    },
  });
}

export function parseAppearanceRecipe(
  recipe: unknown,
  legacy: AppearanceRecipeLegacyInput,
): AppearanceRecipe {
  return resolveAppearanceRecipeForWrite(recipe, legacy);
}

export type AppearanceRecipeTokensV1 = z.infer<
  typeof AppearanceRecipeTokensV1Schema
>;
export type HeaderVariant = (typeof HEADER_VARIANTS)[number];
export type FooterVariant = (typeof FOOTER_VARIANTS)[number];
export type MainSurfaceVariant = (typeof MAIN_SURFACE_VARIANTS)[number];
export type BlogPostMetadataTreatment =
  (typeof BLOG_POST_METADATA_TREATMENTS)[number];
export type BlogPostCoverPlacement =
  (typeof BLOG_POST_COVER_PLACEMENTS)[number];
export type BlogPostExcerptTreatment =
  (typeof BLOG_POST_EXCERPT_TREATMENTS)[number];
export type BlogPostCommentsPlacement =
  (typeof BLOG_POST_COMMENTS_PLACEMENTS)[number];
export type BlogPostEditAffordancePlacement =
  (typeof BLOG_POST_EDIT_AFFORDANCE_PLACEMENTS)[number];
export type BlogCategoryTemplateVariant =
  (typeof BLOG_CATEGORY_TEMPLATE_VARIANTS)[number];
export type PageTemplateVariant = (typeof PAGE_TEMPLATE_VARIANTS)[number];
export type AppearanceMotionPreference =
  (typeof APPEARANCE_MOTION_PREFERENCES)[number];
export type AppearanceBackgroundEffects =
  (typeof APPEARANCE_BACKGROUND_EFFECTS)[number];
export type AppearanceLinkV1 = z.infer<typeof AppearanceLinkV1Schema>;
export type AppearanceSlotVisibility = z.infer<
  typeof AppearanceSlotVisibilitySchema
>;
export type AppearanceSlotV1 = z.infer<typeof AppearanceSlotV1Schema>;
export type HeaderRegionV1 = z.infer<typeof HeaderRegionV1Schema>;
export type FooterRegionV1 = z.infer<typeof FooterRegionV1Schema>;
export type MainRegionV1 = z.infer<typeof MainRegionV1Schema>;
export type AppearanceShellV1 = z.infer<typeof AppearanceShellV1Schema>;
export type BlogPostTemplateV1 = z.infer<typeof BlogPostTemplateV1Schema>;
export type BlogCategoryTemplateV1 = z.infer<
  typeof BlogCategoryTemplateV1Schema
>;
export type PageTemplateV1 = z.infer<typeof PageTemplateV1Schema>;
export type AppearanceContentTemplatesV1 = z.infer<
  typeof AppearanceContentTemplatesV1Schema
>;
export type AppearanceMotionV2 = z.infer<typeof AppearanceMotionV2Schema>;
export type AppearanceRecipeV1 = z.infer<typeof AppearanceRecipeV1Schema>;
export type AppearanceRecipeV2 = z.infer<typeof AppearanceRecipeV2Schema>;
export type AppearanceRecipe = AppearanceRecipeV2;
export type AppearanceRecipeExport = z.infer<
  typeof AppearanceRecipeExportSchema
>;

export function resolveAppearanceContentTemplates(
  contentTemplates: unknown,
): AppearanceContentTemplatesV1 {
  const parsed = AppearanceContentTemplatesV1Schema.safeParse(contentTemplates);
  return parsed.success ? parsed.data : DEFAULT_CONTENT_TEMPLATES_V1;
}

export type AppearanceQualityViewport = "desktop" | "tablet" | "mobile";
export type AppearanceQualityAuthState =
  | "signed-out"
  | "signed-in"
  | "backend-user";
export type AppearanceQualitySeverity = "error" | "warning";
export type AppearanceQualityScenario = {
  viewport: AppearanceQualityViewport;
  authState: AppearanceQualityAuthState;
};
export type AppearanceQualityIssue = {
  code: string;
  severity: AppearanceQualitySeverity;
  message: string;
  scenario?: AppearanceQualityScenario;
};

export const APPEARANCE_QA_SCENARIOS = [
  { viewport: "desktop", authState: "signed-out" },
  { viewport: "desktop", authState: "signed-in" },
  { viewport: "desktop", authState: "backend-user" },
  { viewport: "tablet", authState: "signed-out" },
  { viewport: "tablet", authState: "signed-in" },
  { viewport: "tablet", authState: "backend-user" },
  { viewport: "mobile", authState: "signed-out" },
  { viewport: "mobile", authState: "signed-in" },
  { viewport: "mobile", authState: "backend-user" },
] as const satisfies readonly AppearanceQualityScenario[];

const QA_VIEWPORT_HEIGHTS: Record<AppearanceQualityViewport, number> = {
  desktop: 900,
  tablet: 768,
  mobile: 700,
};

function recipeSlotIsVisible(
  slot: AppearanceSlotV1,
  authState: AppearanceQualityAuthState,
): boolean {
  if (!slot.enabled) return false;

  switch (slot.visibility) {
    case "signed-out":
      return authState === "signed-out";
    case "signed-in":
      return authState === "signed-in" || authState === "backend-user";
    case "backend-user":
    case "admin":
      return authState === "backend-user";
    case "always":
      return true;
  }
}

function addQualityIssue(
  issues: AppearanceQualityIssue[],
  seen: Set<string>,
  issue: AppearanceQualityIssue,
) {
  const scenarioKey = issue.scenario
    ? `${issue.scenario.viewport}:${issue.scenario.authState}`
    : "global";
  const key = `${issue.code}:${scenarioKey}`;
  if (seen.has(key)) return;
  seen.add(key);
  issues.push(issue);
}

function oklchLightness(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/oklch\(\s*([0-9.]+)%?/i);
  if (!match) return null;
  const raw = Number(match[1]);
  if (!Number.isFinite(raw)) return null;
  return raw > 1 ? raw / 100 : raw;
}

function estimatedContrast(
  foreground: string | undefined,
  background: string | undefined,
): number | null {
  const fg = oklchLightness(foreground);
  const bg = oklchLightness(background);
  if (fg == null || bg == null) return null;
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

function checkContrastPair({
  issues,
  seen,
  vars,
  foreground,
  background,
  code,
  label,
  errorThreshold,
  warningThreshold,
}: {
  issues: AppearanceQualityIssue[];
  seen: Set<string>;
  vars: Record<string, string>;
  foreground: string;
  background: string;
  code: string;
  label: string;
  errorThreshold: number;
  warningThreshold: number;
}) {
  const contrast = estimatedContrast(vars[foreground], vars[background]);
  if (contrast == null) {
    addQualityIssue(issues, seen, {
      code: `${code}-unknown`,
      severity: "warning",
      message: `${label} contrast could not be estimated from appearance tokens.`,
    });
    return;
  }

  if (contrast < errorThreshold) {
    addQualityIssue(issues, seen, {
      code,
      severity: "error",
      message: `${label} contrast is below the minimum quality gate.`,
    });
  } else if (contrast < warningThreshold) {
    addQualityIssue(issues, seen, {
      code: `${code}-warning`,
      severity: "warning",
      message: `${label} contrast is usable but below the preferred target.`,
    });
  }
}

export function runAppearanceRecipeQualityChecks(
  recipe: AppearanceRecipe,
  scenarios: readonly AppearanceQualityScenario[] = APPEARANCE_QA_SCENARIOS,
): AppearanceQualityIssue[] {
  const issues: AppearanceQualityIssue[] = [];
  const seen = new Set<string>();
  const appearance = resolveAppearance(recipe.tokens);

  checkContrastPair({
    issues,
    seen,
    vars: appearance.cssVars,
    foreground: "--foreground",
    background: "--background",
    code: "contrast-page",
    label: "Page foreground/background",
    errorThreshold: 3,
    warningThreshold: 4.5,
  });
  checkContrastPair({
    issues,
    seen,
    vars: appearance.cssVars,
    foreground: "--card-foreground",
    background: "--card",
    code: "contrast-card",
    label: "Card foreground/background",
    errorThreshold: 3,
    warningThreshold: 4.5,
  });
  checkContrastPair({
    issues,
    seen,
    vars: appearance.cssVars,
    foreground: "--primary-foreground",
    background: "--primary",
    code: "contrast-primary",
    label: "Primary action foreground/background",
    errorThreshold: 3,
    warningThreshold: 4.5,
  });

  if (!recipe.motion) {
    addQualityIssue(issues, seen, {
      code: "motion-missing",
      severity: "error",
      message: "Recipe motion governance is missing.",
    });
  }

  for (const scenario of scenarios) {
    const visibleHeaderSlots = recipe.shell.header.slots.filter((slot) =>
      recipeSlotIsVisible(slot, scenario.authState),
    );
    const brandIndex = visibleHeaderSlots.findIndex(
      (slot) => slot.type === "Brand",
    );
    const firstInteractiveIndex = visibleHeaderSlots.findIndex((slot) =>
      ["SiteMenu", "AdminMenu", "Search", "CTA", "AuthControls"].includes(
        slot.type,
      ),
    );

    if (brandIndex === -1) {
      addQualityIssue(issues, seen, {
        code: "landmark-header-brand",
        severity: "warning",
        message: "Header landmark has no visible brand slot in this scenario.",
        scenario,
      });
    }

    if (brandIndex > firstInteractiveIndex && firstInteractiveIndex !== -1) {
      addQualityIssue(issues, seen, {
        code: "focus-brand-after-controls",
        severity: "warning",
        message:
          "Header focus order places interactive controls before the brand.",
        scenario,
      });
    }

    for (const slot of visibleHeaderSlots) {
      if (slot.type === "Search" && slot.label.trim().length === 0) {
        addQualityIssue(issues, seen, {
          code: "nav-label-search",
          severity: "error",
          message: "Search slot needs a non-empty accessible label.",
          scenario,
        });
      }
      if (slot.type === "CTA" && slot.enabled && !slot.label.trim()) {
        addQualityIssue(issues, seen, {
          code: "nav-label-cta",
          severity: "error",
          message: "CTA slot needs visible link text.",
          scenario,
        });
      }
    }

    const viewportHeight = QA_VIEWPORT_HEIGHTS[scenario.viewport];
    const stickyHeaderHeight = recipe.shell.header.sticky
      ? recipe.shell.header.heightPx
      : 0;
    const stickyFooterHeight =
      recipe.shell.footer.sticky && recipe.shell.footer.variant !== "hidden"
        ? recipe.shell.footer.minHeightPx
        : 0;

    if (stickyHeaderHeight > viewportHeight * 0.25) {
      addQualityIssue(issues, seen, {
        code: "sticky-header-height",
        severity: "warning",
        message: "Sticky header occupies more than a quarter of the viewport.",
        scenario,
      });
    }
    if (stickyFooterHeight > viewportHeight * 0.25) {
      addQualityIssue(issues, seen, {
        code: "sticky-footer-height",
        severity: "warning",
        message: "Sticky footer occupies more than a quarter of the viewport.",
        scenario,
      });
    }
    if (stickyHeaderHeight + stickyFooterHeight > viewportHeight * 0.4) {
      addQualityIssue(issues, seen, {
        code: "sticky-combined-height",
        severity: "error",
        message:
          "Combined sticky header and footer consume too much of the viewport.",
        scenario,
      });
    }

    if (recipe.shell.footer.variant === "hidden") {
      addQualityIssue(issues, seen, {
        code: "landmark-footer-hidden",
        severity: "warning",
        message: "Footer landmark is intentionally hidden for this recipe.",
        scenario,
      });
    }
  }

  return issues;
}

export function getAppearancePresetCatalogQualityIssues(
  presets: readonly AppearanceShellPreset[] = APPEARANCE_SHELL_PRESETS,
): AppearanceQualityIssue[] {
  const signatures = new Set(
    presets.map((preset) =>
      [
        preset.appearance.theme,
        preset.appearance.frontendContentWidth,
        preset.header.variant,
        preset.main.variant,
        preset.footer.variant,
        preset.contentTemplates.page.variant,
        preset.contentTemplates.blogCategory.variant,
      ].join(":"),
    ),
  );

  if (signatures.size >= 3) return [];

  return [
    {
      code: "preset-catalog-variety",
      severity: "error",
      message:
        "At least three materially different appearances must be selectable without installing code.",
    },
  ];
}

function stripPortableHtmlSlots(recipe: AppearanceRecipe): AppearanceRecipe {
  const stripSlot = (slot: AppearanceSlotV1): AppearanceSlotV1 => {
    if (slot.type !== "CustomHtml" && slot.type !== "RichText") return slot;
    return {
      ...slot,
      enabled: false,
      html: "",
    };
  };

  return AppearanceRecipeV2Schema.parse({
    ...recipe,
    shell: {
      header: {
        ...recipe.shell.header,
        slots: recipe.shell.header.slots.map(stripSlot),
      },
      main: recipe.shell.main,
      footer: {
        ...recipe.shell.footer,
        slots: recipe.shell.footer.slots.map(stripSlot),
      },
    },
  });
}

export function serializeAppearanceRecipeExport(
  recipe: AppearanceRecipe,
): string {
  const safeRecipe = AppearanceRecipeV2Schema.parse(recipe);
  const payload: AppearanceRecipeExport = {
    kind: APPEARANCE_RECIPE_EXPORT_KIND,
    exportVersion: APPEARANCE_RECIPE_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    recipe: safeRecipe,
  };

  return JSON.stringify(payload, null, 2);
}

export function parseAppearanceRecipeExport(
  raw: string,
):
  | { success: true; recipe: AppearanceRecipe }
  | { success: false; error: string } {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return { success: false, error: "Import must be valid JSON." };
  }

  const payload = AppearanceRecipeExportSchema.safeParse(decoded);
  const recipeCandidate = payload.success ? payload.data.recipe : decoded;
  const migrated = migrateAppearanceRecipeToCurrent(recipeCandidate);
  if (!migrated) {
    return {
      success: false,
      error: "Import is not a supported appearance recipe.",
    };
  }

  return { success: true, recipe: stripPortableHtmlSlots(migrated) };
}

export function resolveAppearanceMotionAttributes(
  motion: AppearanceMotionV2 | null | undefined,
): {
  motionPreference: AppearanceMotionPreference;
  backgroundEffects: AppearanceBackgroundEffects;
} {
  const parsed = AppearanceMotionV2Schema.safeParse(motion);
  const safe = parsed.success ? parsed.data : DEFAULT_APPEARANCE_MOTION_V2;
  return {
    motionPreference: safe.motionPreference,
    backgroundEffects: safe.backgroundEffects,
  };
}

export type AppearancePresetId =
  | "classic-cms"
  | "editorial"
  | "portfolio"
  | "documentation"
  | "saas-product"
  | "magazine"
  | "campaign";

export type AppearanceShellPreset = {
  id: AppearancePresetId;
  name: string;
  description: string;
  tags: string[];
  appearance: AppearanceSettings;
  header: {
    variant: HeaderVariant;
    heightPx: number;
    sticky: boolean;
    search: {
      enabled: boolean;
      placeholder: string;
      action: string;
    };
    cta: {
      enabled: boolean;
      label: string;
      href: string;
    };
  };
  main: {
    variant: MainSurfaceVariant;
  };
  footer: {
    variant: FooterVariant;
    minHeightPx: number;
    sticky: boolean;
    links: AppearanceLinkV1[];
    legalLinks: AppearanceLinkV1[];
    socialLinks: AppearanceLinkV1[];
    cta: {
      enabled: boolean;
      label: string;
      href: string;
    };
  };
  contentTemplates: AppearanceContentTemplatesV1;
};

export const APPEARANCE_SHELL_PRESETS = [
  {
    id: "classic-cms",
    name: "Classic CMS",
    description:
      "Left brand, horizontal menu, contained content, simple footer.",
    tags: ["classic", "cms", "safe"],
    appearance: DEFAULT_APPEARANCE,
    header: {
      variant: "classic",
      heightPx: 80,
      sticky: false,
      search: { enabled: false, placeholder: "Search", action: "/" },
      cta: { enabled: false, label: "", href: "" },
    },
    main: { variant: "normal" },
    footer: {
      variant: "classic",
      minHeightPx: 110,
      sticky: false,
      links: [],
      legalLinks: [],
      socialLinks: [],
      cta: { enabled: false, label: "", href: "" },
    },
    contentTemplates: DEFAULT_CONTENT_TEMPLATES_V1,
  },
  {
    id: "editorial",
    name: "Editorial",
    description:
      "Masthead header, category rail, article measure, column footer.",
    tags: ["publishing", "articles"],
    appearance: {
      ...DEFAULT_APPEARANCE,
      theme: "elegant",
      frontendContentWidth: "wide",
      fontPreset: "serif",
      radiusPreset: "small",
      shadowPreset: "soft",
    },
    header: {
      variant: "editorial-masthead",
      heightPx: 148,
      sticky: false,
      search: { enabled: true, placeholder: "Search stories", action: "/" },
      cta: { enabled: false, label: "", href: "" },
    },
    main: { variant: "editorial-article" },
    footer: {
      variant: "multi-column",
      minHeightPx: 160,
      sticky: false,
      links: [
        { label: "Latest", href: "/" },
        { label: "Archive", href: "/" },
      ],
      legalLinks: [{ label: "Privacy", href: "/" }],
      socialLinks: [],
      cta: { enabled: false, label: "", href: "" },
    },
    contentTemplates: {
      blogPost: {
        metadataTreatment: "eyebrow",
        coverPlacement: "hero",
        excerptTreatment: "lead",
        commentsPlacement: "after-content",
        editAffordancePlacement: "header-actions",
      },
      blogCategory: { variant: "magazine-grid" },
      page: { variant: "contained-builder" },
    },
  },
  {
    id: "portfolio",
    name: "Portfolio",
    description: "Minimal top chrome, full-bleed canvas, quiet footer.",
    tags: ["visual", "work"],
    appearance: {
      ...DEFAULT_APPEARANCE,
      theme: "minimal",
      frontendContentWidth: "full-width",
      fontPreset: "display",
      radiusPreset: "large",
      shadowPreset: "medium",
    },
    header: {
      variant: "minimal",
      heightPx: 72,
      sticky: true,
      search: { enabled: false, placeholder: "Search", action: "/" },
      cta: { enabled: false, label: "", href: "" },
    },
    main: { variant: "full-bleed-builder" },
    footer: {
      variant: "minimal",
      minHeightPx: 72,
      sticky: false,
      links: [{ label: "Work", href: "/" }],
      legalLinks: [],
      socialLinks: [],
      cta: { enabled: false, label: "", href: "" },
    },
    contentTemplates: {
      blogPost: {
        metadataTreatment: "compact",
        coverPlacement: "hero",
        excerptTreatment: "subtle",
        commentsPlacement: "after-content",
        editAffordancePlacement: "footer-actions",
      },
      blogCategory: { variant: "cards" },
      page: { variant: "full-bleed-builder" },
    },
  },
  {
    id: "documentation",
    name: "Documentation",
    description: "Compact app bar, narrow reading surface, sitemap footer.",
    tags: ["docs", "reading"],
    appearance: {
      ...DEFAULT_APPEARANCE,
      theme: "corporate",
      frontendContentWidth: "narrow",
      fontPreset: "sans",
      radiusPreset: "medium",
      shadowPreset: "soft",
    },
    header: {
      variant: "compact-app",
      heightPx: 64,
      sticky: true,
      search: { enabled: true, placeholder: "Search docs", action: "/" },
      cta: { enabled: false, label: "", href: "" },
    },
    main: { variant: "editorial-article" },
    footer: {
      variant: "multi-column",
      minHeightPx: 150,
      sticky: false,
      links: [
        { label: "Guides", href: "/" },
        { label: "Reference", href: "/" },
      ],
      legalLinks: [{ label: "Terms", href: "/" }],
      socialLinks: [],
      cta: { enabled: false, label: "", href: "" },
    },
    contentTemplates: {
      blogPost: {
        metadataTreatment: "stacked",
        coverPlacement: "after-title",
        excerptTreatment: "subtle",
        commentsPlacement: "after-content",
        editAffordancePlacement: "header-actions",
      },
      blogCategory: { variant: "compact-archive" },
      page: { variant: "framed-builder" },
    },
  },
  {
    id: "saas-product",
    name: "SaaS/Product",
    description: "App-style header, CTA, card-forward surface, footer columns.",
    tags: ["product", "cta"],
    appearance: {
      ...DEFAULT_APPEARANCE,
      theme: "corporate",
      frontendContentWidth: "wide",
      fontPreset: "humanist",
      radiusPreset: "large",
      shadowPreset: "medium",
    },
    header: {
      variant: "compact-app",
      heightPx: 72,
      sticky: true,
      search: { enabled: false, placeholder: "Search", action: "/" },
      cta: { enabled: true, label: "Get Started", href: "/" },
    },
    main: { variant: "framed" },
    footer: {
      variant: "CTA",
      minHeightPx: 144,
      sticky: false,
      links: [
        { label: "Product", href: "/" },
        { label: "Pricing", href: "/" },
      ],
      legalLinks: [{ label: "Privacy", href: "/" }],
      socialLinks: [],
      cta: { enabled: true, label: "Start now", href: "/" },
    },
    contentTemplates: {
      blogPost: {
        metadataTreatment: "inline",
        coverPlacement: "after-title",
        excerptTreatment: "callout",
        commentsPlacement: "after-content",
        editAffordancePlacement: "header-actions",
      },
      blogCategory: { variant: "cards" },
      page: { variant: "framed-builder" },
    },
  },
  {
    id: "magazine",
    name: "Magazine",
    description: "Split navigation, category surfaces, dense footer links.",
    tags: ["magazine", "categories"],
    appearance: {
      ...DEFAULT_APPEARANCE,
      theme: "aurora",
      frontendContentWidth: "ultra-wide",
      fontPreset: "display",
      radiusPreset: "medium",
      shadowPreset: "strong",
    },
    header: {
      variant: "split",
      heightPx: 96,
      sticky: true,
      search: { enabled: true, placeholder: "Search magazine", action: "/" },
      cta: { enabled: false, label: "", href: "" },
    },
    main: { variant: "category-grid" },
    footer: {
      variant: "multi-column",
      minHeightPx: 180,
      sticky: false,
      links: [
        { label: "Features", href: "/" },
        { label: "Reviews", href: "/" },
        { label: "Interviews", href: "/" },
      ],
      legalLinks: [{ label: "Privacy", href: "/" }],
      socialLinks: [
        { label: "Instagram", href: "https://instagram.com" },
        { label: "YouTube", href: "https://youtube.com" },
      ],
      cta: { enabled: false, label: "", href: "" },
    },
    contentTemplates: {
      blogPost: {
        metadataTreatment: "eyebrow",
        coverPlacement: "hero",
        excerptTreatment: "callout",
        commentsPlacement: "aside",
        editAffordancePlacement: "header-actions",
      },
      blogCategory: { variant: "featured-first" },
      page: { variant: "contained-builder" },
    },
  },
  {
    id: "campaign",
    name: "Campaign",
    description:
      "Minimal landing shell, full-bleed builder, strong CTA option.",
    tags: ["landing", "campaign"],
    appearance: {
      ...DEFAULT_APPEARANCE,
      theme: "luxury",
      frontendContentWidth: "full-width",
      fontPreset: "display",
      radiusPreset: "rounded",
      shadowPreset: "strong",
    },
    header: {
      variant: "minimal",
      heightPx: 72,
      sticky: false,
      search: { enabled: false, placeholder: "Search", action: "/" },
      cta: { enabled: true, label: "Act Now", href: "/" },
    },
    main: { variant: "full-bleed-builder" },
    footer: {
      variant: "hidden",
      minHeightPx: 0,
      sticky: false,
      links: [],
      legalLinks: [],
      socialLinks: [],
      cta: { enabled: false, label: "", href: "" },
    },
    contentTemplates: {
      blogPost: {
        metadataTreatment: "compact",
        coverPlacement: "hero",
        excerptTreatment: "lead",
        commentsPlacement: "before-content",
        editAffordancePlacement: "footer-actions",
      },
      blogCategory: { variant: "cards" },
      page: { variant: "landing-mode" },
    },
  },
] as const satisfies readonly AppearanceShellPreset[];

function updateSlotInList(
  slots: AppearanceSlotV1[],
  id: string,
  update: (slot: AppearanceSlotV1) => AppearanceSlotV1,
): AppearanceSlotV1[] {
  return slots.map((slot) => (slot.id === id ? update(slot) : slot));
}

export function applyAppearancePresetToRecipe(
  recipe: AppearanceRecipe,
  preset: AppearanceShellPreset,
): AppearanceRecipe {
  const headerSlotsWithSearch = updateSlotInList(
    recipe.shell.header.slots,
    "header-search",
    (slot) =>
      slot.type === "Search"
        ? {
            ...slot,
            enabled: preset.header.search.enabled,
            label: "Search",
            placeholder: preset.header.search.placeholder,
            action: preset.header.search.action,
          }
        : slot,
  );
  const headerSlots = updateSlotInList(
    headerSlotsWithSearch,
    "header-cta",
    (slot) =>
      slot.type === "CTA"
        ? {
            ...slot,
            enabled:
              preset.header.cta.enabled &&
              preset.header.cta.label.length > 0 &&
              preset.header.cta.href.length > 0,
            label: preset.header.cta.label,
            href: preset.header.cta.href,
            style: "primary",
          }
        : slot,
  );
  const footerSlotsWithLinks = updateSlotInList(
    recipe.shell.footer.slots,
    "footer-links",
    (slot) =>
      slot.type === "FooterLinks"
        ? {
            ...slot,
            enabled: preset.footer.links.length > 0,
            links: [...preset.footer.links],
          }
        : slot,
  );
  const footerSlotsWithLegal = updateSlotInList(
    footerSlotsWithLinks,
    "legal-links",
    (slot) =>
      slot.type === "LegalLinks"
        ? {
            ...slot,
            enabled: preset.footer.legalLinks.length > 0,
            links: [...preset.footer.legalLinks],
          }
        : slot,
  );
  const footerSlotsWithSocial = updateSlotInList(
    footerSlotsWithLegal,
    "social-links",
    (slot) =>
      slot.type === "SocialLinks"
        ? {
            ...slot,
            enabled: preset.footer.socialLinks.length > 0,
            links: [...preset.footer.socialLinks],
          }
        : slot,
  );
  const footerSlots = updateSlotInList(
    footerSlotsWithSocial,
    "footer-cta",
    (slot) =>
      slot.type === "CTA"
        ? {
            ...slot,
            enabled:
              preset.footer.cta.enabled &&
              preset.footer.cta.label.length > 0 &&
              preset.footer.cta.href.length > 0,
            label: preset.footer.cta.label,
            href: preset.footer.cta.href,
            style: "primary",
          }
        : slot,
  );

  return AppearanceRecipeV2Schema.parse({
    ...recipe,
    name: preset.name,
    tokens: preset.appearance,
    contentTemplates: preset.contentTemplates,
    shell: {
      header: {
        ...recipe.shell.header,
        variant: preset.header.variant,
        sticky: preset.header.sticky,
        heightPx: preset.header.heightPx,
        slots: headerSlots,
      },
      main: {
        variant: preset.main.variant,
      },
      footer: {
        ...recipe.shell.footer,
        variant: preset.footer.variant,
        sticky: preset.footer.sticky,
        minHeightPx: preset.footer.minHeightPx,
        slots: footerSlots,
      },
    },
  });
}
