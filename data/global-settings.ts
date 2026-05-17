import { unstable_cache } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { files, globalSettings } from "@/db/schema";
import {
  DEFAULT_FOOTER_SETTINGS,
  DEFAULT_HEADER_SETTINGS,
  DEFAULT_RESOLVED_GLOBAL_SETTINGS,
  FooterSettingsSchema,
  GLOBAL_SETTINGS_TAG,
  HeaderSettingsSchema,
  type FooterSettings,
  type HeaderSettings,
  type ResolvedGlobalSettings,
  type UpdateGlobalSettingsInput,
} from "@/lib/global-settings";
import {
  CONTENT_WIDTHS,
  DEFAULT_APPEARANCE,
  FONT_PRESETS,
  RADIUS_PRESETS,
  SHADOW_PRESETS,
  THEMES,
  type AppearanceSettings,
  type ContentWidth,
  type FontPreset,
  type RadiusPreset,
  type ShadowPreset,
  type Theme,
} from "@/lib/appearance";

export type GlobalSettingsRow = typeof globalSettings.$inferSelect;

const SINGLETON_ID = 1;

function parseHeader(value: unknown): HeaderSettings {
  const parsed = HeaderSettingsSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_HEADER_SETTINGS;
}

function parseFooter(value: unknown): FooterSettings {
  const parsed = FooterSettingsSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_FOOTER_SETTINGS;
}

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

function parseAppearance(row: {
  theme: unknown;
  frontendContentWidth: unknown;
  backendContentWidth: unknown;
  fontPreset: unknown;
  radiusPreset: unknown;
  shadowPreset: unknown;
}): AppearanceSettings {
  return {
    theme: pickEnum<typeof THEMES>(
      THEMES,
      row.theme,
      DEFAULT_APPEARANCE.theme,
    ) as Theme,
    frontendContentWidth: pickEnum<typeof CONTENT_WIDTHS>(
      CONTENT_WIDTHS,
      row.frontendContentWidth,
      DEFAULT_APPEARANCE.frontendContentWidth,
    ) as ContentWidth,
    backendContentWidth: pickEnum<typeof CONTENT_WIDTHS>(
      CONTENT_WIDTHS,
      row.backendContentWidth,
      DEFAULT_APPEARANCE.backendContentWidth,
    ) as ContentWidth,
    fontPreset: pickEnum<typeof FONT_PRESETS>(
      FONT_PRESETS,
      row.fontPreset,
      DEFAULT_APPEARANCE.fontPreset,
    ) as FontPreset,
    radiusPreset: pickEnum<typeof RADIUS_PRESETS>(
      RADIUS_PRESETS,
      row.radiusPreset,
      DEFAULT_APPEARANCE.radiusPreset,
    ) as RadiusPreset,
    shadowPreset: pickEnum<typeof SHADOW_PRESETS>(
      SHADOW_PRESETS,
      row.shadowPreset,
      DEFAULT_APPEARANCE.shadowPreset,
    ) as ShadowPreset,
  };
}

async function loadResolvedGlobalSettings(): Promise<ResolvedGlobalSettings> {
  const rows = await db
    .select({
      siteName: globalSettings.siteName,
      siteLogoFileId: globalSettings.siteLogoFileId,
      headerContent: globalSettings.headerContent,
      footerContent: globalSettings.footerContent,
      headerSettings: globalSettings.headerSettings,
      footerSettings: globalSettings.footerSettings,
      stickyHeaderHeight: globalSettings.stickyHeaderHeight,
      stickyFooterHeight: globalSettings.stickyFooterHeight,
      maxUploadSizeBytes: globalSettings.maxUploadSizeBytes,
      maxBatchUploadSizeBytes: globalSettings.maxBatchUploadSizeBytes,
      theme: globalSettings.theme,
      frontendContentWidth: globalSettings.frontendContentWidth,
      backendContentWidth: globalSettings.backendContentWidth,
      fontPreset: globalSettings.fontPreset,
      radiusPreset: globalSettings.radiusPreset,
      shadowPreset: globalSettings.shadowPreset,
      logoStoragePath: files.storagePath,
      logoAlt: files.alt,
    })
    .from(globalSettings)
    .leftJoin(files, eq(files.id, globalSettings.siteLogoFileId))
    .where(eq(globalSettings.id, SINGLETON_ID))
    .limit(1);

  const row = rows[0];
  if (!row) return DEFAULT_RESOLVED_GLOBAL_SETTINGS;

  return {
    siteName: row.siteName,
    siteLogo:
      row.siteLogoFileId && row.logoStoragePath
        ? {
            fileId: row.siteLogoFileId,
            storagePath: row.logoStoragePath,
            alt: row.logoAlt ?? null,
          }
        : null,
    headerContent: row.headerContent,
    footerContent: row.footerContent,
    headerSettings: parseHeader(row.headerSettings),
    footerSettings: parseFooter(row.footerSettings),
    stickyHeaderHeight: row.stickyHeaderHeight,
    stickyFooterHeight: row.stickyFooterHeight,
    maxUploadSizeBytes: Number(row.maxUploadSizeBytes),
    maxBatchUploadSizeBytes: Number(row.maxBatchUploadSizeBytes),
    appearance: parseAppearance({
      theme: row.theme,
      frontendContentWidth: row.frontendContentWidth,
      backendContentWidth: row.backendContentWidth,
      fontPreset: row.fontPreset,
      radiusPreset: row.radiusPreset,
      shadowPreset: row.shadowPreset,
    }),
  };
}

export const getGlobalSettings = unstable_cache(
  async (): Promise<ResolvedGlobalSettings> => {
    try {
      return await loadResolvedGlobalSettings();
    } catch (err) {
      console.error("[getGlobalSettings] failed:", err);
      return DEFAULT_RESOLVED_GLOBAL_SETTINGS;
    }
  },
  ["global-settings:resolved"],
  { tags: [GLOBAL_SETTINGS_TAG] },
);

export async function getRawGlobalSettings(): Promise<GlobalSettingsRow | null> {
  const rows = await db
    .select()
    .from(globalSettings)
    .where(eq(globalSettings.id, SINGLETON_ID))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateGlobalSettings(
  input: UpdateGlobalSettingsInput,
  userId: string,
): Promise<void> {
  const values = {
    siteName: input.siteName,
    siteLogoFileId: input.siteLogoFileId,
    headerContent: input.headerContent,
    footerContent: input.footerContent,
    headerSettings: input.headerSettings,
    footerSettings: input.footerSettings,
    stickyHeaderHeight: input.stickyHeaderHeight,
    stickyFooterHeight: input.stickyFooterHeight,
    maxUploadSizeBytes: input.maxUploadSizeBytes,
    maxBatchUploadSizeBytes: input.maxBatchUploadSizeBytes,
    theme: input.theme,
    frontendContentWidth: input.frontendContentWidth,
    backendContentWidth: input.backendContentWidth,
    fontPreset: input.fontPreset,
    radiusPreset: input.radiusPreset,
    shadowPreset: input.shadowPreset,
    updatedBy: userId,
  };

  await db
    .insert(globalSettings)
    .values({ id: SINGLETON_ID, ...values })
    .onConflictDoUpdate({ target: globalSettings.id, set: values });
}
