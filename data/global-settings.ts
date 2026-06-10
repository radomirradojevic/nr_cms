import { unstable_cache } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { files, globalSettings } from "@/db/schema";
import {
  AI_PROVIDER_IDS,
  AI_WRITING_ASSISTANT_DEFAULTS,
  CONTENT_HISTORY_DEFAULTS,
  DEFAULT_FOOTER_SETTINGS,
  DEFAULT_HEADER_SETTINGS,
  DEFAULT_RESOLVED_GLOBAL_SETTINGS,
  FooterSettingsSchema,
  GLOBAL_SETTINGS_TAG,
  HeaderSettingsSchema,
  SESSION_SECURITY_DEFAULTS,
  parseAiProviderServerSettingsById,
  parseAiWritingAssistantServerSettings,
  parseAiWritingAssistantSettings,
  parseGlobalSettingsAppearance,
  toAiProviderAdminSettingsById,
  type AiProviderAdminSettingsById,
  type AiProviderServerSettingsById,
  type AiWritingAssistantServerSettings,
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
  "openaiApiKey" | "aiProviderSettings"
> & {
  openaiApiKeyConfigured: boolean;
  aiProviderSettings: AiProviderAdminSettingsById;
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
      message.includes("ai_page_builder_assistant") ||
      message.includes("ai_webshop_assistant") ||
      message.includes("ai_default_provider") ||
      message.includes("ai_provider_settings") ||
      message.includes("openai_api_key") ||
      causeMessage.includes("ai_writing_assistant") ||
      causeMessage.includes("ai_page_builder_assistant") ||
      causeMessage.includes("ai_webshop_assistant") ||
      causeMessage.includes("ai_default_provider") ||
      causeMessage.includes("ai_provider_settings") ||
      causeMessage.includes("openai_api_key"))
  );
}

function isMissingContentHistoryColumn(err: unknown): boolean {
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
    (message.includes("content_history_enabled") ||
      causeMessage.includes("content_history_enabled"))
  );
}

async function loadGlobalSettingsRows(
  includeAppearanceRecipe: boolean,
  includeRegionalSettings: boolean,
  includeAiWritingAssistant: boolean,
  includeAiWebshopAssistant: boolean,
  includeContentHistory: boolean,
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
            aiPageBuilderAssistantEnabled:
              globalSettings.aiPageBuilderAssistantEnabled,
            ...(includeAiWebshopAssistant
              ? {
                  aiWebshopAssistantEnabled:
                    globalSettings.aiWebshopAssistantEnabled,
                }
              : {}),
            aiDefaultProvider: globalSettings.aiDefaultProvider,
            aiProviderSettings: globalSettings.aiProviderSettings,
            aiWritingAssistantModel: globalSettings.aiWritingAssistantModel,
            aiWritingAssistantMaxOutputTokens:
              globalSettings.aiWritingAssistantMaxOutputTokens,
            aiWritingAssistantInstructions:
              globalSettings.aiWritingAssistantInstructions,
          }
        : {}),
      ...(includeContentHistory
        ? { contentHistoryEnabled: globalSettings.contentHistoryEnabled }
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
  let includeAiWebshopAssistant = true;
  let includeContentHistory = true;
  let rows: Awaited<ReturnType<typeof loadGlobalSettingsRows>> | null = null;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      rows = await loadGlobalSettingsRows(
        includeAppearanceRecipe,
        includeRegionalSettings,
        includeAiWritingAssistant,
        includeAiWebshopAssistant,
        includeContentHistory,
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
        if (includeAiWebshopAssistant) {
          includeAiWebshopAssistant = false;
          continue;
        }
        includeAiWritingAssistant = false;
        continue;
      }
      if (includeContentHistory && isMissingContentHistoryColumn(err)) {
        includeContentHistory = false;
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
    aiWritingAssistant: parseAiWritingAssistantSettings({
      enabled:
        "aiWritingAssistantEnabled" in row
          ? row.aiWritingAssistantEnabled
          : undefined,
      pageBuilderEnabled:
        "aiPageBuilderAssistantEnabled" in row
          ? row.aiPageBuilderAssistantEnabled
          : undefined,
      webshopEnabled:
        "aiWebshopAssistantEnabled" in row
          ? row.aiWebshopAssistantEnabled
          : undefined,
      defaultProvider:
        "aiDefaultProvider" in row ? row.aiDefaultProvider : undefined,
      providerSettings:
        "aiProviderSettings" in row ? row.aiProviderSettings : undefined,
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
    contentHistory: {
      enabled:
        typeof row.contentHistoryEnabled === "boolean"
          ? row.contentHistoryEnabled
          : CONTENT_HISTORY_DEFAULTS.enabled,
    },
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
  ["global-settings:resolved:v15"],
  { tags: [GLOBAL_SETTINGS_TAG] },
);

async function loadRawGlobalSettingsRows(
  includeAiProviderSettings: boolean,
  includeAiPageBuilderAssistant: boolean,
  includeAiWebshopAssistant: boolean,
  includeContentHistory: boolean,
) {
  return db
    .select({
      id: globalSettings.id,
      siteName: globalSettings.siteName,
      publicSiteUrl: globalSettings.publicSiteUrl,
      defaultLanguage: globalSettings.defaultLanguage,
      timezone: globalSettings.timezone,
      siteLogoFileId: globalSettings.siteLogoFileId,
      headerContent: globalSettings.headerContent,
      headerSettings: globalSettings.headerSettings,
      footerContent: globalSettings.footerContent,
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
      appearanceRecipe: globalSettings.appearanceRecipe,
      openaiApiKey: globalSettings.openaiApiKey,
      aiWritingAssistantEnabled: globalSettings.aiWritingAssistantEnabled,
      ...(includeAiPageBuilderAssistant
        ? {
            aiPageBuilderAssistantEnabled:
              globalSettings.aiPageBuilderAssistantEnabled,
          }
        : {}),
      ...(includeAiWebshopAssistant
        ? {
            aiWebshopAssistantEnabled: globalSettings.aiWebshopAssistantEnabled,
          }
        : {}),
      ...(includeAiProviderSettings
        ? {
            aiDefaultProvider: globalSettings.aiDefaultProvider,
            aiProviderSettings: globalSettings.aiProviderSettings,
          }
        : {}),
      aiWritingAssistantModel: globalSettings.aiWritingAssistantModel,
      aiWritingAssistantMaxOutputTokens:
        globalSettings.aiWritingAssistantMaxOutputTokens,
      aiWritingAssistantInstructions:
        globalSettings.aiWritingAssistantInstructions,
      ...(includeContentHistory
        ? { contentHistoryEnabled: globalSettings.contentHistoryEnabled }
        : {}),
      maxSessionDurationMinutes: globalSettings.maxSessionDurationMinutes,
      idleLogoutMinutes: globalSettings.idleLogoutMinutes,
      updatedAt: globalSettings.updatedAt,
      updatedBy: globalSettings.updatedBy,
    })
    .from(globalSettings)
    .where(eq(globalSettings.id, SINGLETON_ID))
    .limit(1);
}

export async function getRawGlobalSettings(): Promise<GlobalSettingsRow | null> {
  let rows: Awaited<ReturnType<typeof loadRawGlobalSettingsRows>>;
  let includeAiProviderSettings = true;
  let includeAiPageBuilderAssistant = true;
  let includeAiWebshopAssistant = true;
  let includeContentHistory = true;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      rows = await loadRawGlobalSettingsRows(
        includeAiProviderSettings,
        includeAiPageBuilderAssistant,
        includeAiWebshopAssistant,
        includeContentHistory,
      );
      break;
    } catch (err) {
      if (includeContentHistory && isMissingContentHistoryColumn(err)) {
        includeContentHistory = false;
        continue;
      }
      if (!isMissingAiWritingAssistantColumns(err)) throw err;
      if (includeAiWebshopAssistant) {
        includeAiWebshopAssistant = false;
        continue;
      }
      if (includeAiPageBuilderAssistant) {
        includeAiPageBuilderAssistant = false;
        continue;
      }
      if (includeAiProviderSettings) {
        includeAiProviderSettings = false;
        continue;
      }
      throw err;
    }
  }

  const row = rows![0];
  if (!row) return null;
  const rowWithOptionalAi = row as typeof row & {
    aiPageBuilderAssistantEnabled?: boolean;
    aiWebshopAssistantEnabled?: boolean;
    aiDefaultProvider?: GlobalSettingsRow["aiDefaultProvider"];
    aiProviderSettings?: GlobalSettingsRow["aiProviderSettings"];
    contentHistoryEnabled?: boolean;
  };

  return {
    ...row,
    aiPageBuilderAssistantEnabled:
      rowWithOptionalAi.aiPageBuilderAssistantEnabled ?? false,
    aiWebshopAssistantEnabled:
      rowWithOptionalAi.aiWebshopAssistantEnabled ?? false,
    aiDefaultProvider: rowWithOptionalAi.aiDefaultProvider ?? "openai",
    aiProviderSettings: rowWithOptionalAi.aiProviderSettings ?? {},
    contentHistoryEnabled:
      rowWithOptionalAi.contentHistoryEnabled ??
      CONTENT_HISTORY_DEFAULTS.enabled,
  } as GlobalSettingsRow;
}

export async function getAdminGlobalSettings(): Promise<GlobalSettingsAdminFormRow | null> {
  const row = await getRawGlobalSettings();
  if (!row) return null;

  const { openaiApiKey, aiProviderSettings, ...safeRow } = row;
  const providers = parseAiProviderServerSettingsById(aiProviderSettings, {
    enabled: row.aiWritingAssistantEnabled,
    model: row.aiWritingAssistantModel,
    maxOutputTokens: row.aiWritingAssistantMaxOutputTokens,
    instructions: row.aiWritingAssistantInstructions,
    openaiApiKey,
  });

  return {
    ...safeRow,
    openaiApiKeyConfigured: Boolean(openaiApiKey),
    aiProviderSettings: toAiProviderAdminSettingsById(providers),
  };
}

async function loadAiWritingAssistantServerSettingsRows(
  includePageBuilderAssistant: boolean,
  includeWebshopAssistant: boolean,
) {
  return db
    .select({
      enabled: globalSettings.aiWritingAssistantEnabled,
      ...(includePageBuilderAssistant
        ? {
            pageBuilderEnabled: globalSettings.aiPageBuilderAssistantEnabled,
          }
        : {}),
      ...(includeWebshopAssistant
        ? {
            webshopEnabled: globalSettings.aiWebshopAssistantEnabled,
          }
        : {}),
      defaultProvider: globalSettings.aiDefaultProvider,
      providerSettings: globalSettings.aiProviderSettings,
      model: globalSettings.aiWritingAssistantModel,
      maxOutputTokens: globalSettings.aiWritingAssistantMaxOutputTokens,
      instructions: globalSettings.aiWritingAssistantInstructions,
      openaiApiKey: globalSettings.openaiApiKey,
    })
    .from(globalSettings)
    .where(eq(globalSettings.id, SINGLETON_ID))
    .limit(1);
}

export async function getAiWritingAssistantServerSettings(): Promise<AiWritingAssistantServerSettings> {
  let rows: Awaited<
    ReturnType<typeof loadAiWritingAssistantServerSettingsRows>
  >;
  let includePageBuilderAssistant = true;
  let includeWebshopAssistant = true;

  try {
    rows = await loadAiWritingAssistantServerSettingsRows(
      includePageBuilderAssistant,
      includeWebshopAssistant,
    );
  } catch (err) {
    if (!isMissingAiWritingAssistantColumns(err)) throw err;
    if (includeWebshopAssistant) {
      includeWebshopAssistant = false;
    } else {
      includePageBuilderAssistant = false;
    }
    try {
      rows = await loadAiWritingAssistantServerSettingsRows(
        includePageBuilderAssistant,
        includeWebshopAssistant,
      );
    } catch (retryErr) {
      if (!isMissingAiWritingAssistantColumns(retryErr)) throw retryErr;
      return parseAiWritingAssistantServerSettings(
        AI_WRITING_ASSISTANT_DEFAULTS,
      );
    }
  }

  const row = rows[0];
  if (!row) {
    return parseAiWritingAssistantServerSettings(AI_WRITING_ASSISTANT_DEFAULTS);
  }

  return parseAiWritingAssistantServerSettings({
    ...row,
    pageBuilderEnabled:
      "pageBuilderEnabled" in row ? row.pageBuilderEnabled : undefined,
    webshopEnabled: "webshopEnabled" in row ? row.webshopEnabled : undefined,
  });
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
  const existing = await getRawGlobalSettings();
  const existingProviders = parseAiProviderServerSettingsById(
    existing?.aiProviderSettings,
    {
      enabled: existing?.aiWritingAssistantEnabled,
      model: existing?.aiWritingAssistantModel,
      maxOutputTokens: existing?.aiWritingAssistantMaxOutputTokens,
      instructions: existing?.aiWritingAssistantInstructions,
      openaiApiKey: existing?.openaiApiKey,
    },
  );
  const aiProviderSettings = Object.fromEntries(
    AI_PROVIDER_IDS.map((id) => {
      const next = input.aiProviders[id];
      const current = existingProviders[id];
      const model =
        next.enabledModels.length > 0 &&
        !next.enabledModels.includes(next.model)
          ? next.enabledModels[0]
          : next.model;

      return [
        id,
        {
          enabled: next.enabled,
          apiKey: next.clearApiKey
            ? null
            : (next.apiKey ?? current.apiKey ?? null),
          model,
          enabledModels: next.enabledModels,
          maxOutputTokens: next.maxOutputTokens,
          instructions: next.instructions,
        },
      ];
    }),
  ) as AiProviderServerSettingsById;
  const usableProviderIds = AI_PROVIDER_IDS.filter(
    (id) =>
      input.aiProviders[id].enabled &&
      input.aiProviders[id].enabledModels.length > 0,
  );
  const enabledProviderIds = AI_PROVIDER_IDS.filter(
    (id) => input.aiProviders[id].enabled,
  );
  const aiDefaultProvider = usableProviderIds.includes(input.aiDefaultProvider)
    ? input.aiDefaultProvider
    : (usableProviderIds[0] ??
      enabledProviderIds[0] ??
      input.aiDefaultProvider);
  const openaiProvider = aiProviderSettings.openai;
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
    aiPageBuilderAssistantEnabled: input.aiPageBuilderAssistantEnabled,
    aiWebshopAssistantEnabled: input.aiWebshopAssistantEnabled,
    aiDefaultProvider,
    aiProviderSettings,
    openaiApiKey: openaiProvider.apiKey,
    aiWritingAssistantModel: openaiProvider.model,
    aiWritingAssistantMaxOutputTokens: openaiProvider.maxOutputTokens,
    aiWritingAssistantInstructions: openaiProvider.instructions,
    contentHistoryEnabled: input.contentHistoryEnabled,
    maxSessionDurationMinutes: input.maxSessionDurationMinutes,
    idleLogoutMinutes: input.idleLogoutMinutes,
    updatedBy: userId,
  };
  const insertValues = {
    id: SINGLETON_ID,
    ...values,
  };

  try {
    await db.insert(globalSettings).values(insertValues).onConflictDoUpdate({
      target: globalSettings.id,
      set: values,
    });
  } catch (err) {
    if (!isMissingContentHistoryColumn(err)) throw err;

    const { contentHistoryEnabled, ...valuesWithoutContentHistory } = values;
    void contentHistoryEnabled;

    await db
      .insert(globalSettings)
      .values({ id: SINGLETON_ID, ...valuesWithoutContentHistory })
      .onConflictDoUpdate({
        target: globalSettings.id,
        set: valuesWithoutContentHistory,
      });
  }
}
