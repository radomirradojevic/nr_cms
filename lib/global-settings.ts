import { z } from "zod";

import {
  CONTENT_WIDTHS,
  DEFAULT_APPEARANCE,
  FONT_PRESETS,
  MAX_CUSTOM_CONTENT_WIDTH_PX,
  MIN_CUSTOM_CONTENT_WIDTH_PX,
  RADIUS_PRESETS,
  SHADOW_PRESETS,
  THEMES,
  normalizeContentWidth,
  type AppearanceSettings,
  type ContentWidth,
} from "@/lib/appearance";
import {
  AppearanceRecipeV2Schema,
  buildDefaultClassicAppearanceRecipe,
  type AppearanceRecipe,
} from "@/lib/appearance-recipe";
import { DEFAULT_GLOW, GlowEffectSchema } from "@/lib/glow";

// ─── Cache tags ───────────────────────────────────────────────────────────────

export const GLOBAL_SETTINGS_TAG = "global-settings";

// ─── Byte-size constants ──────────────────────────────────────────────────────

export const MB = 1024 * 1024;
export const GB = 1024 * MB;

export const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 50 * MB;
export const DEFAULT_MAX_BATCH_UPLOAD_SIZE_BYTES = 500 * MB;
export const HARD_MAX_UPLOAD_SIZE_BYTES = 5 * GB;
export const HARD_MAX_BATCH_UPLOAD_SIZE_BYTES = 20 * GB;

export const MAX_STICKY_HEIGHT_PX = 400;

// ─── Session security ─────────────────────────────────────────────────────────

export const MIN_MAX_SESSION_MINUTES = 5;
export const MAX_MAX_SESSION_MINUTES = 10_080; // 7 days
export const MIN_IDLE_MINUTES = 1;

export const SESSION_SECURITY_DEFAULTS = {
  maxSessionDurationMinutes: 480,
  idleLogoutMinutes: 30,
} as const;

export const SessionSecuritySchema = z
  .object({
    maxSessionDurationMinutes: z
      .number()
      .int()
      .min(MIN_MAX_SESSION_MINUTES)
      .max(MAX_MAX_SESSION_MINUTES),
    idleLogoutMinutes: z.number().int().min(MIN_IDLE_MINUTES),
  })
  .refine((v) => v.idleLogoutMinutes <= v.maxSessionDurationMinutes, {
    path: ["idleLogoutMinutes"],
    message: "Idle logout cannot exceed max session duration.",
  });

export type SessionSecuritySettings = z.infer<typeof SessionSecuritySchema>;

// ─── JSON shapes ──────────────────────────────────────────────────────────────

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export const HeaderSettingsSchema = z.object({
  showLogo: z.boolean().default(true),
  showSiteName: z.boolean().default(true),
  sticky: z.boolean().default(false),
  background: z.string().regex(HEX_COLOR).optional(),
  glow: GlowEffectSchema.optional(),
});

export const FooterSettingsSchema = z.object({
  showLogo: z.boolean().default(false),
  copyright: z.string().max(200).optional(),
  sticky: z.boolean().default(false),
  background: z.string().regex(HEX_COLOR).optional(),
  glow: GlowEffectSchema.optional(),
});

export type HeaderSettings = z.infer<typeof HeaderSettingsSchema>;
export type FooterSettings = z.infer<typeof FooterSettingsSchema>;

export const DEFAULT_HEADER_SETTINGS: HeaderSettings = {
  showLogo: true,
  showSiteName: true,
  sticky: false,
  glow: DEFAULT_GLOW,
};

export const DEFAULT_FOOTER_SETTINGS: FooterSettings = {
  showLogo: false,
  sticky: false,
  glow: DEFAULT_GLOW,
};

// ─── Update payload schema ────────────────────────────────────────────────────

/**
 * Accepts a preset key from `CONTENT_WIDTHS` OR a positive integer-as-string
 * representing the `max-width` in pixels. Numeric inputs (numbers or strings
 * like `"900"` / `"900px"`) are normalized to a digit-only string and clamped
 * to `[MIN_CUSTOM_CONTENT_WIDTH_PX, MAX_CUSTOM_CONTENT_WIDTH_PX]`.
 */
const ContentWidthSchema = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    const normalized = normalizeContentWidth(v, "" as ContentWidth);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Content width must be one of ${CONTENT_WIDTHS.join(
          ", ",
        )} or a positive integer between ${MIN_CUSTOM_CONTENT_WIDTH_PX} and ${MAX_CUSTOM_CONTENT_WIDTH_PX} pixels.`,
      });
      return z.NEVER;
    }
    return normalized;
  });

export const UpdateGlobalSettingsSchema = z
  .object({
    siteName: z.string().trim().min(1).max(120),
    siteLogoFileId: z.string().uuid().nullable(),
    headerContent: z.string().max(20_000).nullable(),
    footerContent: z.string().max(20_000).nullable(),
    headerSettings: HeaderSettingsSchema,
    footerSettings: FooterSettingsSchema,
    stickyHeaderHeight: z.number().int().min(0).max(MAX_STICKY_HEIGHT_PX),
    stickyFooterHeight: z.number().int().min(0).max(MAX_STICKY_HEIGHT_PX),
    maxUploadSizeBytes: z
      .number()
      .int()
      .positive()
      .max(HARD_MAX_UPLOAD_SIZE_BYTES),
    maxBatchUploadSizeBytes: z
      .number()
      .int()
      .positive()
      .max(HARD_MAX_BATCH_UPLOAD_SIZE_BYTES),
    theme: z.enum(THEMES),
    frontendContentWidth: ContentWidthSchema,
    backendContentWidth: ContentWidthSchema,
    fontPreset: z.enum(FONT_PRESETS),
    radiusPreset: z.enum(RADIUS_PRESETS),
    shadowPreset: z.enum(SHADOW_PRESETS),
    appearanceRecipe: AppearanceRecipeV2Schema.optional(),
    maxSessionDurationMinutes: z
      .number()
      .int()
      .min(MIN_MAX_SESSION_MINUTES)
      .max(MAX_MAX_SESSION_MINUTES),
    idleLogoutMinutes: z.number().int().min(MIN_IDLE_MINUTES),
  })
  .refine((v) => v.maxBatchUploadSizeBytes >= v.maxUploadSizeBytes, {
    message:
      "Max batch upload size must be greater than or equal to max per-file upload size.",
    path: ["maxBatchUploadSizeBytes"],
  })
  .refine((v) => v.idleLogoutMinutes <= v.maxSessionDurationMinutes, {
    message: "Idle logout cannot exceed max session duration.",
    path: ["idleLogoutMinutes"],
  });

export type UpdateGlobalSettingsInput = z.infer<
  typeof UpdateGlobalSettingsSchema
>;

// ─── Legacy appearance fallback parsing ─────────────────────────────────────

export type GlobalSettingsAppearanceInput = {
  theme: unknown;
  frontendContentWidth: unknown;
  backendContentWidth: unknown;
  fontPreset: unknown;
  radiusPreset: unknown;
  shadowPreset: unknown;
};

function pickEnum<T extends readonly string[]>(
  list: T,
  value: unknown,
  fallback: T[number],
): T[number] {
  return typeof value === "string" &&
    (list as readonly string[]).includes(value)
    ? (value as T[number])
    : fallback;
}

export function parseGlobalSettingsAppearance(
  row: GlobalSettingsAppearanceInput,
): AppearanceSettings {
  return {
    theme: pickEnum(THEMES, row.theme, DEFAULT_APPEARANCE.theme),
    frontendContentWidth: normalizeContentWidth(
      row.frontendContentWidth,
      DEFAULT_APPEARANCE.frontendContentWidth,
    ),
    backendContentWidth: normalizeContentWidth(
      row.backendContentWidth,
      DEFAULT_APPEARANCE.backendContentWidth,
    ),
    fontPreset: pickEnum(
      FONT_PRESETS,
      row.fontPreset,
      DEFAULT_APPEARANCE.fontPreset,
    ),
    radiusPreset: pickEnum(
      RADIUS_PRESETS,
      row.radiusPreset,
      DEFAULT_APPEARANCE.radiusPreset,
    ),
    shadowPreset: pickEnum(
      SHADOW_PRESETS,
      row.shadowPreset,
      DEFAULT_APPEARANCE.shadowPreset,
    ),
  };
}

// ─── Resolved (read) shape consumed by the public site ────────────────────────

export type ResolvedSiteLogo = {
  fileId: string;
  storagePath: string;
  alt: string | null;
};

export type ResolvedGlobalSettings = {
  siteName: string;
  siteLogo: ResolvedSiteLogo | null;
  headerContent: string | null;
  footerContent: string | null;
  headerSettings: HeaderSettings;
  footerSettings: FooterSettings;
  stickyHeaderHeight: number;
  stickyFooterHeight: number;
  maxUploadSizeBytes: number;
  maxBatchUploadSizeBytes: number;
  appearance: AppearanceSettings;
  resolvedAppearanceRecipe: AppearanceRecipe;
  sessionSecurity: SessionSecuritySettings;
};

export const DEFAULT_RESOLVED_GLOBAL_SETTINGS: ResolvedGlobalSettings = {
  siteName: "Night Raven CMS",
  siteLogo: null,
  headerContent: null,
  footerContent: null,
  headerSettings: DEFAULT_HEADER_SETTINGS,
  footerSettings: DEFAULT_FOOTER_SETTINGS,
  stickyHeaderHeight: 80,
  stickyFooterHeight: 110,
  maxUploadSizeBytes: DEFAULT_MAX_UPLOAD_SIZE_BYTES,
  maxBatchUploadSizeBytes: DEFAULT_MAX_BATCH_UPLOAD_SIZE_BYTES,
  appearance: DEFAULT_APPEARANCE,
  resolvedAppearanceRecipe: buildDefaultClassicAppearanceRecipe({
    appearance: DEFAULT_APPEARANCE,
    headerContent: null,
    footerContent: null,
    headerSettings: DEFAULT_HEADER_SETTINGS,
    footerSettings: DEFAULT_FOOTER_SETTINGS,
    stickyHeaderHeight: 80,
    stickyFooterHeight: 110,
  }),
  sessionSecurity: SESSION_SECURITY_DEFAULTS,
};
