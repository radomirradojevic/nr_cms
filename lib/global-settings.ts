import { z } from "zod";

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

// ─── JSON shapes ──────────────────────────────────────────────────────────────

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export const HeaderSettingsSchema = z.object({
  showLogo: z.boolean().default(true),
  showSiteName: z.boolean().default(true),
  sticky: z.boolean().default(false),
  background: z.string().regex(HEX_COLOR).optional(),
});

export const FooterSettingsSchema = z.object({
  showLogo: z.boolean().default(false),
  copyright: z.string().max(200).optional(),
  sticky: z.boolean().default(false),
  background: z.string().regex(HEX_COLOR).optional(),
});

export type HeaderSettings = z.infer<typeof HeaderSettingsSchema>;
export type FooterSettings = z.infer<typeof FooterSettingsSchema>;

export const DEFAULT_HEADER_SETTINGS: HeaderSettings = {
  showLogo: true,
  showSiteName: true,
  sticky: false,
};

export const DEFAULT_FOOTER_SETTINGS: FooterSettings = {
  showLogo: false,
  sticky: false,
};

// ─── Update payload schema ────────────────────────────────────────────────────

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
  })
  .refine((v) => v.maxBatchUploadSizeBytes >= v.maxUploadSizeBytes, {
    message:
      "Max batch upload size must be greater than or equal to max per-file upload size.",
    path: ["maxBatchUploadSizeBytes"],
  });

export type UpdateGlobalSettingsInput = z.infer<
  typeof UpdateGlobalSettingsSchema
>;

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
};
