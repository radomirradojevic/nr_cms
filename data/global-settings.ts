import { unstable_cache } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { files, globalSettings } from "@/db/schema";
import {
  AI_WRITING_ASSISTANT_DEFAULTS,
  DEFAULT_FOOTER_SETTINGS,
  DEFAULT_HEADER_SETTINGS,
  DEFAULT_RESOLVED_GLOBAL_SETTINGS,
  AiWritingAssistantSettingsSchema,
  FooterSettingsSchema,
  GLOBAL_SETTINGS_TAG,
  HeaderSettingsSchema,
  SESSION_SECURITY_DEFAULTS,
  parseGlobalSettingsAppearance,
  type AiWritingAssistantSettings,
  type FooterSettings,
  type HeaderSettings,
  type ResolvedGlobalSettings,
  type SessionSecuritySettings,
  type UpdateGlobalSettingsInput,
} from "@/lib/global-settings";
import { normalizeRegionalSettings } from "@/lib/regional-settings";
import {
  parseAppearanceRecipe,
  resolveAppearanceRecipeForWrite,
  type AppearanceRecipeLegacyInput,
} from "@/lib/appearance-recipe";
import { sanitizeCmsHtml } from "@/lib/content-sanitizer";

export type GlobalSettingsRow = typeof globalSettings.$inferSelect;
export type GlobalSettingsAdminFormRow = Omit<
  GlobalSettingsRow,
  "openaiApiKey"
> & {
  openaiApiKeyConfigured: boolean;
};

export type AiWritingAssistantServerSettings = AiWritingAssistantSettings & {
  openaiApiKey: string | null;
};

const SINGLETON_ID = 1;

function parseHeader(value: unknown): HeaderSettings {
  const parsed = HeaderSettingsSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_HEADER_SETTINGS;
}

function parseFooter(value: unknown): FooterSettings {
  const parsed = FooterSettingsSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_FOOTER_SETTINGS;
}

function parseAiWritingAssistant(value: unknown): AiWritingAssistantSettings {
  const parsed = AiWritingAssistantSettingsSchema.safeParse(value);
  return parsed.success ? parsed.data : AI_WRITING_ASSISTANT_DEFAULTS;
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

function isMissingRegionalSettingsColumns(err: unknown): boolean {
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
    (message.includes("default_language") ||
      message.includes("timezone") ||
      causeMessage.includes("default_language") ||
      causeMessage.includes("timezone"))
  );
}

function isMissingAiWritingAssistantColumns(err: unknown): boolean {
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
    (message.includes("ai_writing_assistant") ||
      message.includes("openai_api_key") ||
      causeMessage.includes("ai_writing_assistant") ||
      causeMessage.includes("openai_api_key"))
  );
}

async function loadGlobalSettingsRows(
  includeAppearanceRecipe: boolean,
  includeRegionalSettings: boolean,
  includeAiWritingAssistant: boolean,
) {
  return db
    .select({
      siteName: globalSettings.siteName,
      publicSiteUrl: globalSettings.publicSiteUrl,
      ...(includeRegionalSettings
        ? {
            defaultLanguage: globalSettings.defaultLanguage,
            timezone: globalSettings.timezone,
          }
        : {}),
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
      ...(includeAiWritingAssistant
        ? {
            aiWritingAssistantEnabled: globalSettings.aiWritingAssistantEnabled,
            aiWritingAssistantModel: globalSettings.aiWritingAssistantModel,
            aiWritingAssistantMaxOutputTokens:
              globalSettings.aiWritingAssistantMaxOutputTokens,
            aiWritingAssistantInstructions:
              globalSettings.aiWritingAssistantInstructions,
          }
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
  let includeAppearanceRecipe = true;
  let includeRegionalSettings = true;
  let includeAiWritingAssistant = true;
  let rows: Awaited<ReturnType<typeof loadGlobalSettingsRows>> | null = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      rows = await loadGlobalSettingsRows(
        includeAppearanceRecipe,
        includeRegionalSettings,
        includeAiWritingAssistant,
      );
      break;
    } catch (err) {
      if (includeAppearanceRecipe && isMissingAppearanceRecipeColumn(err)) {
        includeAppearanceRecipe = false;
        continue;
      }
      if (includeRegionalSettings && isMissingRegionalSettingsColumns(err)) {
        includeRegionalSettings = false;
        continue;
      }
      if (
        includeAiWritingAssistant &&
        isMissingAiWritingAssistantColumns(err)
      ) {
        includeAiWritingAssistant = false;
        continue;
      }
      throw err;
    }
  }

  if (!rows) return DEFAULT_RESOLVED_GLOBAL_SETTINGS;

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
    regional: normalizeRegionalSettings({
      defaultLanguage:
        "defaultLanguage" in row ? row.defaultLanguage : undefined,
      timezone: "timezone" in row ? row.timezone : undefined,
    }),
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
    aiWritingAssistant: parseAiWritingAssistant({
      enabled:
        "aiWritingAssistantEnabled" in row
          ? row.aiWritingAssistantEnabled
          : undefined,
      model:
        "aiWritingAssistantModel" in row
          ? row.aiWritingAssistantModel
          : undefined,
      maxOutputTokens:
        "aiWritingAssistantMaxOutputTokens" in row
          ? row.aiWritingAssistantMaxOutputTokens
          : undefined,
      instructions:
        "aiWritingAssistantInstructions" in row
          ? row.aiWritingAssistantInstructions
          : undefined,
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
  ["global-settings:resolved:v5"],
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

export async function getAdminGlobalSettings(): Promise<GlobalSettingsAdminFormRow | null> {
  const row = await getRawGlobalSettings();
  if (!row) return null;

  const { openaiApiKey, ...safeRow } = row;
  return {
    ...safeRow,
    openaiApiKeyConfigured: Boolean(openaiApiKey),
  };
}

export async function getAiWritingAssistantServerSettings(): Promise<AiWritingAssistantServerSettings> {
  try {
    const rows = await db
      .select({
        enabled: globalSettings.aiWritingAssistantEnabled,
        model: globalSettings.aiWritingAssistantModel,
        maxOutputTokens: globalSettings.aiWritingAssistantMaxOutputTokens,
        instructions: globalSettings.aiWritingAssistantInstructions,
        openaiApiKey: globalSettings.openaiApiKey,
      })
      .from(globalSettings)
      .where(eq(globalSettings.id, SINGLETON_ID))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return {
        ...AI_WRITING_ASSISTANT_DEFAULTS,
        openaiApiKey: null,
      };
    }

    return {
      ...parseAiWritingAssistant(row),
      openaiApiKey: row.openaiApiKey ?? null,
    };
  } catch (err) {
    if (!isMissingAiWritingAssistantColumns(err)) throw err;
    return {
      ...AI_WRITING_ASSISTANT_DEFAULTS,
      openaiApiKey: null,
    };
  }
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
    defaultLanguage: input.defaultLanguage,
    timezone: input.timezone,
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
    aiWritingAssistantEnabled: input.aiWritingAssistantEnabled,
    aiWritingAssistantModel: input.aiWritingAssistantModel,
    aiWritingAssistantMaxOutputTokens: input.aiWritingAssistantMaxOutputTokens,
    aiWritingAssistantInstructions: input.aiWritingAssistantInstructions,
    maxSessionDurationMinutes: input.maxSessionDurationMinutes,
    idleLogoutMinutes: input.idleLogoutMinutes,
    updatedBy: userId,
  };
  const openaiApiKeyPatch = input.clearOpenaiApiKey
    ? { openaiApiKey: null }
    : input.openaiApiKey
      ? { openaiApiKey: input.openaiApiKey }
      : {};
  const insertValues = {
    id: SINGLETON_ID,
    ...values,
    ...(input.openaiApiKey ? { openaiApiKey: input.openaiApiKey } : {}),
  };

  await db
    .insert(globalSettings)
    .values(insertValues)
    .onConflictDoUpdate({
      target: globalSettings.id,
      set: { ...values, ...openaiApiKeyPatch },
    });
}
