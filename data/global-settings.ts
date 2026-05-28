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
  SESSION_SECURITY_DEFAULTS,
  parseGlobalSettingsAppearance,
  type FooterSettings,
  type HeaderSettings,
  type ResolvedGlobalSettings,
  type SessionSecuritySettings,
  type UpdateGlobalSettingsInput,
} from "@/lib/global-settings";
import {
  parseAppearanceRecipe,
  resolveAppearanceRecipeForWrite,
  type AppearanceRecipeLegacyInput,
} from "@/lib/appearance-recipe";
import { sanitizeCmsHtml } from "@/lib/content-sanitizer";

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

function toAppearanceRecipeLegacyInput(
  settings: ResolvedGlobalSettings,
): AppearanceRecipeLegacyInput {
  return {
    appearance: settings.appearance,
    headerContent: settings.headerContent,
    footerContent: settings.footerContent,
    headerSettings: settings.headerSettings,
    footerSettings: settings.footerSettings,
    stickyHeaderHeight: settings.stickyHeaderHeight,
    stickyFooterHeight: settings.stickyFooterHeight,
  };
}

function normalizeResolvedGlobalSettings(
  settings: ResolvedGlobalSettings,
): ResolvedGlobalSettings {
  return {
    ...settings,
    resolvedAppearanceRecipe: parseAppearanceRecipe(
      settings.resolvedAppearanceRecipe,
      toAppearanceRecipeLegacyInput(settings),
    ),
  };
}

function isMissingAppearanceRecipeColumn(err: unknown): boolean {
  const message = err instanceof Error ? err.message : "";
  const cause =
    typeof err === "object" && err !== null && "cause" in err
      ? (err as { cause?: unknown }).cause
      : null;
  const causeCode =
    typeof cause === "object" && cause !== null && "code" in cause
      ? (cause as { code?: unknown }).code
      : null;
  const causeMessage = cause instanceof Error ? cause.message : "";
  return (
    causeCode === "42703" &&
    (message.includes("appearance_recipe") ||
      causeMessage.includes("appearance_recipe"))
  );
}

async function loadGlobalSettingsRows(includeAppearanceRecipe: boolean) {
  return db
    .select({
      siteName: globalSettings.siteName,
      publicSiteUrl: globalSettings.publicSiteUrl,
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
      ...(includeAppearanceRecipe
        ? { appearanceRecipe: globalSettings.appearanceRecipe }
        : {}),
      maxSessionDurationMinutes: globalSettings.maxSessionDurationMinutes,
      idleLogoutMinutes: globalSettings.idleLogoutMinutes,
      logoStoragePath: files.storagePath,
      logoAlt: files.alt,
    })
    .from(globalSettings)
    .leftJoin(files, eq(files.id, globalSettings.siteLogoFileId))
    .where(eq(globalSettings.id, SINGLETON_ID))
    .limit(1);
}

async function loadResolvedGlobalSettings(): Promise<ResolvedGlobalSettings> {
  let rows: Awaited<ReturnType<typeof loadGlobalSettingsRows>>;
  try {
    rows = await loadGlobalSettingsRows(true);
  } catch (err) {
    if (!isMissingAppearanceRecipeColumn(err)) throw err;
    rows = await loadGlobalSettingsRows(false);
  }

  const row = rows[0];
  if (!row) return DEFAULT_RESOLVED_GLOBAL_SETTINGS;

  const headerSettings = parseHeader(row.headerSettings);
  const footerSettings = parseFooter(row.footerSettings);
  const appearance = parseGlobalSettingsAppearance({
    theme: row.theme,
    frontendContentWidth: row.frontendContentWidth,
    backendContentWidth: row.backendContentWidth,
    fontPreset: row.fontPreset,
    radiusPreset: row.radiusPreset,
    shadowPreset: row.shadowPreset,
  });

  return {
    siteName: row.siteName,
    publicSiteUrl: row.publicSiteUrl,
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
    headerSettings,
    footerSettings,
    stickyHeaderHeight: row.stickyHeaderHeight,
    stickyFooterHeight: row.stickyFooterHeight,
    maxUploadSizeBytes: Number(row.maxUploadSizeBytes),
    maxBatchUploadSizeBytes: Number(row.maxBatchUploadSizeBytes),
    appearance,
    resolvedAppearanceRecipe: parseAppearanceRecipe(row.appearanceRecipe, {
      appearance,
      headerContent: row.headerContent,
      footerContent: row.footerContent,
      headerSettings,
      footerSettings,
      stickyHeaderHeight: row.stickyHeaderHeight,
      stickyFooterHeight: row.stickyFooterHeight,
    }),
    sessionSecurity: parseSessionSecurity({
      maxSessionDurationMinutes: row.maxSessionDurationMinutes,
      idleLogoutMinutes: row.idleLogoutMinutes,
    }),
  };
}

function parseSessionSecurity(row: {
  maxSessionDurationMinutes: unknown;
  idleLogoutMinutes: unknown;
}): SessionSecuritySettings {
  const max =
    typeof row.maxSessionDurationMinutes === "number" &&
    Number.isFinite(row.maxSessionDurationMinutes) &&
    row.maxSessionDurationMinutes >= 5 &&
    row.maxSessionDurationMinutes <= 10_080
      ? Math.floor(row.maxSessionDurationMinutes)
      : SESSION_SECURITY_DEFAULTS.maxSessionDurationMinutes;
  const idleRaw =
    typeof row.idleLogoutMinutes === "number" &&
    Number.isFinite(row.idleLogoutMinutes) &&
    row.idleLogoutMinutes >= 1
      ? Math.floor(row.idleLogoutMinutes)
      : SESSION_SECURITY_DEFAULTS.idleLogoutMinutes;
  return {
    maxSessionDurationMinutes: max,
    idleLogoutMinutes: Math.min(idleRaw, max),
  };
}

export const getGlobalSettings = unstable_cache(
  async (): Promise<ResolvedGlobalSettings> => {
    try {
      return normalizeResolvedGlobalSettings(
        await loadResolvedGlobalSettings(),
      );
    } catch (err) {
      console.error("[getGlobalSettings] failed:", err);
      return normalizeResolvedGlobalSettings(DEFAULT_RESOLVED_GLOBAL_SETTINGS);
    }
  },
  ["global-settings:resolved:v4"],
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
  const appearance = parseGlobalSettingsAppearance({
    theme: input.theme,
    frontendContentWidth: input.frontendContentWidth,
    backendContentWidth: input.backendContentWidth,
    fontPreset: input.fontPreset,
    radiusPreset: input.radiusPreset,
    shadowPreset: input.shadowPreset,
  });
  const headerSettings = parseHeader(input.headerSettings);
  const footerSettings = parseFooter(input.footerSettings);
  const headerContent = input.headerContent
    ? sanitizeCmsHtml(input.headerContent)
    : null;
  const footerContent = input.footerContent
    ? sanitizeCmsHtml(input.footerContent)
    : null;
  const values = {
    siteName: input.siteName,
    publicSiteUrl: input.publicSiteUrl,
    siteLogoFileId: input.siteLogoFileId,
    headerContent,
    footerContent,
    headerSettings,
    footerSettings,
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
    appearanceRecipe: resolveAppearanceRecipeForWrite(input.appearanceRecipe, {
      appearance,
      headerContent,
      footerContent,
      headerSettings,
      footerSettings,
      stickyHeaderHeight: input.stickyHeaderHeight,
      stickyFooterHeight: input.stickyFooterHeight,
    }),
    maxSessionDurationMinutes: input.maxSessionDurationMinutes,
    idleLogoutMinutes: input.idleLogoutMinutes,
    updatedBy: userId,
  };

  await db
    .insert(globalSettings)
    .values({ id: SINGLETON_ID, ...values })
    .onConflictDoUpdate({ target: globalSettings.id, set: values });
}
