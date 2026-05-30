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
import {
  DEFAULT_REGIONAL_SETTINGS,
  SUPPORTED_LOCALES,
  SUPPORTED_TIMEZONES,
  type RegionalSettings,
} from "@/lib/regional-settings";

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

// ─── AI writing assistant ────────────────────────────────────────────────────

export const MIN_AI_WRITING_ASSISTANT_MAX_OUTPUT_TOKENS = 8;
export const MAX_AI_WRITING_ASSISTANT_MAX_OUTPUT_TOKENS = 160;

export const AI_PROVIDER_IDS = [
  "openai",
  "anthropic",
  "google",
  "mistral",
  "xai",
] as const;

export type AIProviderId = (typeof AI_PROVIDER_IDS)[number];

export const AIProviderIdSchema = z.enum(AI_PROVIDER_IDS);

export const AI_PROVIDER_LABELS: Record<AIProviderId, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  mistral: "Mistral",
  xai: "xAI",
};

export type AIProviderModelOption = {
  id: string;
  label: string;
};

export const AI_PROVIDER_MODEL_OPTIONS = {
  openai: [
    { id: "gpt-4.1-nano", label: "GPT-4.1 nano" },
    { id: "gpt-4o-mini", label: "GPT-4o mini" },
    { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
    { id: "gpt-5-nano", label: "GPT-5 nano" },
    { id: "o4-mini", label: "o4-mini" },
    { id: "gpt-5-mini", label: "GPT-5 mini" },
    { id: "gpt-5.4-nano", label: "GPT-5.4 nano" },
    { id: "gpt-5.4-mini", label: "GPT-5.4 mini" },
    { id: "gpt-4o", label: "GPT-4o" },
    { id: "gpt-4.1", label: "GPT-4.1" },
    { id: "gpt-5", label: "GPT-5" },
    { id: "gpt-5.4", label: "GPT-5.4" },
    { id: "gpt-5.5", label: "GPT-5.5" },
  ],
  anthropic: [
    { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
    { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { id: "claude-opus-4-1-20250805", label: "Claude Opus 4.1" },
    { id: "claude-opus-4-5-20251101", label: "Claude Opus 4.5" },
    { id: "claude-opus-4-6", label: "Claude Opus 4.6" },
    { id: "claude-opus-4-7", label: "Claude Opus 4.7" },
    { id: "claude-opus-4-8", label: "Claude Opus 4.8" },
  ],
  google: [
    { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite" },
    { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite" },
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { id: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview" },
    { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview" },
  ],
  mistral: [
    { id: "ministral-3b-2512", label: "Ministral 3 3B" },
    { id: "ministral-8b-2512", label: "Ministral 3 8B" },
    { id: "open-mistral-nemo-2407", label: "Mistral Nemo 12B (legacy)" },
    { id: "ministral-14b-2512", label: "Ministral 3 14B" },
    { id: "mistral-small-2603", label: "Mistral Small 4" },
    { id: "mistral-small-latest", label: "Mistral Small latest" },
    { id: "mistral-medium-2505", label: "Mistral Medium 3" },
    { id: "mistral-large-2512", label: "Mistral Large 3" },
    { id: "mistral-medium-2508", label: "Mistral Medium 3.1 (legacy)" },
    { id: "mistral-medium-3-5", label: "Mistral Medium 3.5" },
  ],
  xai: [
    { id: "grok-3-mini-fast", label: "Grok 3 mini fast (alias)" },
    { id: "grok-3-mini", label: "Grok 3 mini (alias)" },
    { id: "grok-4.3", label: "Grok 4.3" },
  ],
} as const satisfies Record<AIProviderId, readonly AIProviderModelOption[]>;

export const AI_PROVIDER_DEFAULT_MODELS: Record<AIProviderId, string> = {
  openai: "gpt-5.5",
  anthropic: "claude-sonnet-4-6",
  google: "gemini-3.5-flash",
  mistral: "mistral-medium-3-5",
  xai: "grok-4.3",
};

export const AiProviderSettingsSchema = z.object({
  enabled: z.boolean(),
  model: z.string().trim().min(1).max(120),
  maxOutputTokens: z
    .number()
    .int()
    .min(MIN_AI_WRITING_ASSISTANT_MAX_OUTPUT_TOKENS)
    .max(MAX_AI_WRITING_ASSISTANT_MAX_OUTPUT_TOKENS),
  instructions: z.string().trim().max(2_000).nullable(),
});

export const AiProviderSettingsByIdSchema = z.object({
  openai: AiProviderSettingsSchema,
  anthropic: AiProviderSettingsSchema,
  google: AiProviderSettingsSchema,
  mistral: AiProviderSettingsSchema,
  xai: AiProviderSettingsSchema,
});

export const AiWritingAssistantSettingsSchema = z
  .object({
    enabled: z.boolean(),
    pageBuilderEnabled: z.boolean(),
    defaultProvider: AIProviderIdSchema,
    providers: AiProviderSettingsByIdSchema,
  })
  .refine(
    (v) =>
      (!v.enabled && !v.pageBuilderEnabled) ||
      v.providers[v.defaultProvider].enabled,
    {
      path: ["defaultProvider"],
      message: "Default provider must be enabled.",
    },
  );

export type AiProviderSettings = z.infer<typeof AiProviderSettingsSchema>;
export type AiProviderSettingsById = z.infer<
  typeof AiProviderSettingsByIdSchema
>;
export type AiProviderServerSettings = AiProviderSettings & {
  apiKey: string | null;
};
export type AiProviderServerSettingsById = Record<
  AIProviderId,
  AiProviderServerSettings
>;
export type AiProviderAdminSettings = AiProviderSettings & {
  apiKeyConfigured: boolean;
};
export type AiProviderAdminSettingsById = Record<
  AIProviderId,
  AiProviderAdminSettings
>;
export type AiProviderOption = {
  id: AIProviderId;
  label: string;
};

export type AiWritingAssistantSettings = z.infer<
  typeof AiWritingAssistantSettingsSchema
>;

export type AiWritingAssistantServerSettings = Omit<
  AiWritingAssistantSettings,
  "providers"
> & {
  providers: AiProviderServerSettingsById;
};

export const AI_WRITING_ASSISTANT_DEFAULTS: AiWritingAssistantSettings = {
  enabled: false,
  pageBuilderEnabled: false,
  defaultProvider: "openai",
  providers: createDefaultAiProviderSettingsById(),
};

export function createDefaultAiProviderSettings(
  id: AIProviderId,
): AiProviderSettings {
  return {
    enabled: false,
    model: AI_PROVIDER_DEFAULT_MODELS[id],
    maxOutputTokens: 48,
    instructions: null,
  };
}

export function createDefaultAiProviderSettingsById(): AiProviderSettingsById {
  return Object.fromEntries(
    AI_PROVIDER_IDS.map((id) => [id, createDefaultAiProviderSettings(id)]),
  ) as AiProviderSettingsById;
}

export function createDefaultAiProviderServerSettingsById(): AiProviderServerSettingsById {
  return Object.fromEntries(
    AI_PROVIDER_IDS.map((id) => [
      id,
      { ...createDefaultAiProviderSettings(id), apiKey: null },
    ]),
  ) as AiProviderServerSettingsById;
}

export function getEnabledAiProviderOptions(
  settings: AiWritingAssistantSettings,
): AiProviderOption[] {
  return AI_PROVIDER_IDS.filter((id) => settings.providers[id].enabled).map(
    (id) => ({
      id,
      label: AI_PROVIDER_LABELS[id],
    }),
  );
}

export function toAiProviderAdminSettingsById(
  providers: AiProviderServerSettingsById,
): AiProviderAdminSettingsById {
  return Object.fromEntries(
    AI_PROVIDER_IDS.map((id) => {
      const { apiKey, ...provider } = providers[id];
      return [id, { ...provider, apiKeyConfigured: Boolean(apiKey) }];
    }),
  ) as AiProviderAdminSettingsById;
}

export function toAiProviderPublicSettingsById(
  providers: AiProviderServerSettingsById,
): AiProviderSettingsById {
  return Object.fromEntries(
    AI_PROVIDER_IDS.map((id) => {
      const provider = providers[id];
      return [
        id,
        {
          enabled: provider.enabled,
          model: provider.model,
          maxOutputTokens: provider.maxOutputTokens,
          instructions: provider.instructions,
        },
      ];
    }),
  ) as AiProviderSettingsById;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function normalizeProviderModel(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 120)
    : fallback;
}

function normalizeAiProviderInstructions(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 2_000) : null;
}

function normalizeAiProviderTokenLimit(
  value: unknown,
  fallback: number,
): number {
  const raw = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(raw)) return fallback;

  return Math.max(
    MIN_AI_WRITING_ASSISTANT_MAX_OUTPUT_TOKENS,
    Math.min(MAX_AI_WRITING_ASSISTANT_MAX_OUTPUT_TOKENS, Math.floor(raw)),
  );
}

function normalizeOptionalApiKey(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function normalizeAiProviderId(
  value: unknown,
  fallback: AIProviderId = "openai",
): AIProviderId {
  return typeof value === "string" &&
    (AI_PROVIDER_IDS as readonly string[]).includes(value)
    ? (value as AIProviderId)
    : fallback;
}

type LegacyOpenAISettingsInput = {
  enabled?: unknown;
  model?: unknown;
  maxOutputTokens?: unknown;
  instructions?: unknown;
  openaiApiKey?: unknown;
};

export function parseAiProviderServerSettingsById(
  value: unknown,
  legacyOpenAI: LegacyOpenAISettingsInput = {},
): AiProviderServerSettingsById {
  const rawProviders = isRecord(value) ? value : {};

  return Object.fromEntries(
    AI_PROVIDER_IDS.map((id) => {
      const defaults = createDefaultAiProviderSettings(id);
      const raw = isRecord(rawProviders[id]) ? rawProviders[id] : {};
      const legacy = id === "openai" ? legacyOpenAI : {};
      const legacyApiKey = normalizeOptionalApiKey(legacy.openaiApiKey);
      const apiKey = hasOwn(raw, "apiKey")
        ? normalizeOptionalApiKey(raw.apiKey)
        : legacyApiKey;
      const enabled =
        typeof raw.enabled === "boolean"
          ? raw.enabled
          : id === "openai" && typeof legacy.enabled === "boolean"
            ? legacy.enabled || Boolean(apiKey)
            : defaults.enabled;

      return [
        id,
        {
          enabled,
          apiKey,
          model: normalizeProviderModel(
            raw.model,
            id === "openai" && typeof legacy.model === "string"
              ? legacy.model
              : defaults.model,
          ),
          maxOutputTokens: normalizeAiProviderTokenLimit(
            raw.maxOutputTokens,
            id === "openai" && legacy.maxOutputTokens !== undefined
              ? normalizeAiProviderTokenLimit(
                  legacy.maxOutputTokens,
                  defaults.maxOutputTokens,
                )
              : defaults.maxOutputTokens,
          ),
          instructions: hasOwn(raw, "instructions")
            ? normalizeAiProviderInstructions(raw.instructions)
            : id === "openai"
              ? normalizeAiProviderInstructions(legacy.instructions)
              : defaults.instructions,
        },
      ];
    }),
  ) as AiProviderServerSettingsById;
}

export function parseAiWritingAssistantSettings(value: {
  enabled?: unknown;
  pageBuilderEnabled?: unknown;
  defaultProvider?: unknown;
  providerSettings?: unknown;
  model?: unknown;
  maxOutputTokens?: unknown;
  instructions?: unknown;
  openaiApiKey?: unknown;
}): AiWritingAssistantSettings {
  const providers = toAiProviderPublicSettingsById(
    parseAiProviderServerSettingsById(value.providerSettings, {
      enabled: value.enabled,
      model: value.model,
      maxOutputTokens: value.maxOutputTokens,
      instructions: value.instructions,
      openaiApiKey: value.openaiApiKey,
    }),
  );
  const requestedDefault = normalizeAiProviderId(value.defaultProvider);
  const fallbackDefault =
    AI_PROVIDER_IDS.find((id) => providers[id].enabled) ?? requestedDefault;

  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : false,
    pageBuilderEnabled:
      typeof value.pageBuilderEnabled === "boolean"
        ? value.pageBuilderEnabled
        : false,
    defaultProvider: providers[requestedDefault].enabled
      ? requestedDefault
      : fallbackDefault,
    providers,
  };
}

export function parseAiWritingAssistantServerSettings(value: {
  enabled?: unknown;
  pageBuilderEnabled?: unknown;
  defaultProvider?: unknown;
  providerSettings?: unknown;
  model?: unknown;
  maxOutputTokens?: unknown;
  instructions?: unknown;
  openaiApiKey?: unknown;
}): AiWritingAssistantServerSettings {
  const providers = parseAiProviderServerSettingsById(value.providerSettings, {
    enabled: value.enabled,
    model: value.model,
    maxOutputTokens: value.maxOutputTokens,
    instructions: value.instructions,
    openaiApiKey: value.openaiApiKey,
  });
  const requestedDefault = normalizeAiProviderId(value.defaultProvider);
  const fallbackDefault =
    AI_PROVIDER_IDS.find((id) => providers[id].enabled) ?? requestedDefault;

  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : false,
    pageBuilderEnabled:
      typeof value.pageBuilderEnabled === "boolean"
        ? value.pageBuilderEnabled
        : false,
    defaultProvider: providers[requestedDefault].enabled
      ? requestedDefault
      : fallbackDefault,
    providers,
  };
}

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

export const RegionalSettingsSchema = z.object({
  defaultLanguage: z.enum(
    SUPPORTED_LOCALES.map((locale) => locale.code) as [string, ...string[]],
  ),
  timezone: z.enum(SUPPORTED_TIMEZONES),
});

// ─── JSON shapes ──────────────────────────────────────────────────────────────

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export const LOGO_BORDER_COLOR_MODES = ["theme", "custom"] as const;
export const LOGO_BORDER_SHAPES = ["circle", "square"] as const;

export const HeaderSettingsSchema = z.object({
  showLogo: z.boolean().default(true),
  showSiteName: z.boolean().default(true),
  sticky: z.boolean().default(false),
  background: z.string().regex(HEX_COLOR).optional(),
  glow: GlowEffectSchema.optional(),
  logoBorderEnabled: z.boolean().default(true),
  logoBorderColorMode: z.enum(LOGO_BORDER_COLOR_MODES).default("theme"),
  logoBorderColor: z.string().regex(HEX_COLOR).optional(),
  logoBorderShape: z.enum(LOGO_BORDER_SHAPES).default("circle"),
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
  logoBorderEnabled: true,
  logoBorderColorMode: "theme",
  logoBorderShape: "circle",
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

const PublicSiteUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .url("Public site URL must be a valid URL.")
  .refine(
    (url) => {
      try {
        const protocol = new URL(url).protocol;
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Public site URL must start with http:// or https://." },
  )
  .nullable();

const AiProviderUpdateSettingsSchema = AiProviderSettingsSchema.extend({
  apiKey: z.string().trim().min(20).max(512).optional(),
  clearApiKey: z.boolean().optional(),
});

const AiProviderUpdateSettingsByIdSchema = z.object({
  openai: AiProviderUpdateSettingsSchema,
  anthropic: AiProviderUpdateSettingsSchema,
  google: AiProviderUpdateSettingsSchema,
  mistral: AiProviderUpdateSettingsSchema,
  xai: AiProviderUpdateSettingsSchema,
});

export const UpdateGlobalSettingsSchema = z
  .object({
    siteName: z.string().trim().min(1).max(120),
    publicSiteUrl: PublicSiteUrlSchema,
    defaultLanguage: RegionalSettingsSchema.shape.defaultLanguage,
    timezone: RegionalSettingsSchema.shape.timezone,
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
    aiWritingAssistantEnabled: z.boolean(),
    aiPageBuilderAssistantEnabled: z.boolean(),
    aiDefaultProvider: AIProviderIdSchema,
    aiProviders: AiProviderUpdateSettingsByIdSchema,
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
  })
  .refine(
    (v) =>
      (!v.aiWritingAssistantEnabled && !v.aiPageBuilderAssistantEnabled) ||
      AI_PROVIDER_IDS.some((id) => v.aiProviders[id].enabled),
    {
      message:
        "Enable at least one AI provider before showing the assistant in editors.",
      path: ["aiProviders"],
    },
  )
  .refine(
    (v) =>
      (!v.aiWritingAssistantEnabled && !v.aiPageBuilderAssistantEnabled) ||
      v.aiProviders[v.aiDefaultProvider].enabled,
    {
      message: "Default provider must be enabled.",
      path: ["aiDefaultProvider"],
    },
  );

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
  publicSiteUrl: string | null;
  siteLogo: ResolvedSiteLogo | null;
  headerContent: string | null;
  footerContent: string | null;
  headerSettings: HeaderSettings;
  footerSettings: FooterSettings;
  stickyHeaderHeight: number;
  stickyFooterHeight: number;
  maxUploadSizeBytes: number;
  maxBatchUploadSizeBytes: number;
  regional: RegionalSettings;
  appearance: AppearanceSettings;
  resolvedAppearanceRecipe: AppearanceRecipe;
  aiWritingAssistant: AiWritingAssistantSettings;
  sessionSecurity: SessionSecuritySettings;
};

export const DEFAULT_RESOLVED_GLOBAL_SETTINGS: ResolvedGlobalSettings = {
  siteName: "Night Raven CMS",
  publicSiteUrl: null,
  siteLogo: null,
  headerContent: null,
  footerContent: null,
  headerSettings: DEFAULT_HEADER_SETTINGS,
  footerSettings: DEFAULT_FOOTER_SETTINGS,
  stickyHeaderHeight: 80,
  stickyFooterHeight: 110,
  maxUploadSizeBytes: DEFAULT_MAX_UPLOAD_SIZE_BYTES,
  maxBatchUploadSizeBytes: DEFAULT_MAX_BATCH_UPLOAD_SIZE_BYTES,
  regional: DEFAULT_REGIONAL_SETTINGS,
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
  aiWritingAssistant: AI_WRITING_ASSISTANT_DEFAULTS,
  sessionSecurity: SESSION_SECURITY_DEFAULTS,
};
