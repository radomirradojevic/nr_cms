"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Bot,
  Check,
  ChevronsUpDown,
  Clipboard,
  Download,
  ImageIcon,
  Info,
  KeyRound,
  RotateCcw,
  Save,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateGlobalSettings } from "./actions";
import type { GlobalSettingsAdminFormRow } from "@/data/global-settings";
import type { FileRow } from "@/data/files";
import {
  AI_PROVIDER_DEFAULT_MODELS,
  AI_PROVIDER_IDS,
  AI_PROVIDER_LABELS,
  AI_PROVIDER_MODEL_OPTIONS,
  AI_WRITING_ASSISTANT_DEFAULTS,
  DEFAULT_FOOTER_SETTINGS,
  DEFAULT_HEADER_SETTINGS,
  FooterSettingsSchema,
  HeaderSettingsSchema,
  LOGO_BORDER_COLOR_MODES,
  LOGO_BORDER_SHAPES,
  MAX_AI_WRITING_ASSISTANT_MAX_OUTPUT_TOKENS,
  MAX_MAX_SESSION_MINUTES,
  MB,
  MIN_AI_WRITING_ASSISTANT_MAX_OUTPUT_TOKENS,
  MIN_IDLE_MINUTES,
  MIN_MAX_SESSION_MINUTES,
  SESSION_SECURITY_DEFAULTS,
  type AIProviderId,
  type AiProviderAdminSettingsById,
} from "@/lib/global-settings";
import {
  DEFAULT_GLOW,
  MAX_GLOW_BLUR,
  MAX_GLOW_INTENSITY,
  MIN_GLOW_BLUR,
  MIN_GLOW_INTENSITY,
  type GlowEffect,
} from "@/lib/glow";
import {
  CONTENT_WIDTHS,
  DEFAULT_APPEARANCE,
  FONT_PRESETS,
  MAX_CUSTOM_CONTENT_WIDTH_PX,
  MIN_CUSTOM_CONTENT_WIDTH_PX,
  RADIUS_PRESETS,
  SHADOW_PRESETS,
  THEMES,
  isContentWidthPreset,
  normalizeContentWidth,
  parseCustomContentWidth,
  resolveAppearance,
  type ContentWidth,
  type ContentWidthPreset,
  type FontPreset,
  type RadiusPreset,
  type ShadowPreset,
  type Theme,
} from "@/lib/appearance";
import {
  APPEARANCE_SHELL_PRESETS,
  APPEARANCE_BACKGROUND_EFFECTS,
  APPEARANCE_MOTION_PREFERENCES,
  BLOG_CATEGORY_TEMPLATE_VARIANTS,
  BLOG_POST_COMMENTS_PLACEMENTS,
  BLOG_POST_COVER_PLACEMENTS,
  BLOG_POST_EDIT_AFFORDANCE_PLACEMENTS,
  BLOG_POST_EXCERPT_TREATMENTS,
  BLOG_POST_METADATA_TREATMENTS,
  FOOTER_VARIANTS,
  HEADER_VARIANTS,
  MAIN_SURFACE_VARIANTS,
  PAGE_TEMPLATE_VARIANTS,
  applyAppearancePresetToRecipe,
  buildDefaultClassicAppearanceRecipe,
  parseAppearanceRecipeExport,
  parseAppearanceRecipe,
  runAppearanceRecipeQualityChecks,
  serializeAppearanceRecipeExport,
  type AppearanceLinkV1,
  type AppearanceShellPreset,
  type AppearanceRecipe,
  type AppearanceSlotV1,
  type AppearancePresetId,
  type AppearanceBackgroundEffects,
  type AppearanceMotionPreference,
  type BlogCategoryTemplateVariant,
  type BlogPostCommentsPlacement,
  type BlogPostCoverPlacement,
  type BlogPostEditAffordancePlacement,
  type BlogPostExcerptTreatment,
  type BlogPostMetadataTreatment,
  type FooterVariant,
  type HeaderVariant,
  type MainSurfaceVariant,
  type PageTemplateVariant,
} from "@/lib/appearance-recipe";
import { LogoPickerDialog } from "./logo-picker-dialog";
import { FooterContentEditor } from "./footer-content-editor";
import { PresetCards, ShellPreview } from "./appearance-preview";
import { useAdminSectionLock } from "@/components/admin-section-lock-provider";
import { cn } from "@/lib/utils";
import {
  DEFAULT_REGIONAL_SETTINGS,
  SUPPORTED_LOCALES,
  SUPPORTED_TIMEZONES,
} from "@/lib/regional-settings";

interface GlowFieldsProps {
  idPrefix: string;
  value: GlowEffect;
  colorValid: boolean;
  onChange: (next: GlowEffect) => void;
}

function GlowFields({
  idPrefix,
  value,
  colorValid,
  onChange,
}: GlowFieldsProps) {
  const enabledId = `${idPrefix}-glow-enabled`;
  const colorId = `${idPrefix}-glow-color`;
  const intensityId = `${idPrefix}-glow-intensity`;
  const blurId = `${idPrefix}-glow-blur`;
  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <Label htmlFor={enabledId}>Border</Label>
        <Switch
          id={enabledId}
          checked={value.enabled}
          onCheckedChange={(enabled) => onChange({ ...value, enabled })}
        />
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={colorId}>Border Color</Label>
          <div className="flex items-center gap-2">
            <Input
              id={colorId}
              type="color"
              value={getColorPickerValue(value.color)}
              onChange={(e) => onChange({ ...value, color: e.target.value })}
              disabled={!value.enabled}
              className="h-9 w-14 p-1"
            />
            <Input
              type="text"
              value={value.color}
              onChange={(e) => onChange({ ...value, color: e.target.value })}
              onBlur={(e) =>
                onChange({ ...value, color: e.target.value.trim() })
              }
              disabled={!value.enabled}
              placeholder="#349aee"
              maxLength={7}
              aria-invalid={!colorValid || undefined}
            />
          </div>
          {!colorValid && (
            <p className="text-xs text-destructive">
              Enter a valid hex color like #349aee or leave it blank.
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={intensityId}>
            Glow Intensity ({value.intensity})
          </Label>
          <Input
            id={intensityId}
            type="range"
            min={MIN_GLOW_INTENSITY}
            max={MAX_GLOW_INTENSITY}
            step={1}
            value={value.intensity}
            onChange={(e) =>
              onChange({
                ...value,
                intensity: parseInt(e.target.value, 10) || 0,
              })
            }
            disabled={!value.enabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={blurId}>Glow Blur Size ({value.blurSize}px)</Label>
          <Input
            id={blurId}
            type="range"
            min={MIN_GLOW_BLUR}
            max={MAX_GLOW_BLUR}
            step={1}
            value={value.blurSize}
            onChange={(e) =>
              onChange({
                ...value,
                blurSize: parseInt(e.target.value, 10) || 0,
              })
            }
            disabled={!value.enabled}
          />
        </div>
      </div>
    </div>
  );
}

interface SettingsFormProps {
  settings: GlobalSettingsAdminFormRow | null;
  initialLogoFile: FileRow | null;
}

const CUSTOM_WIDTH_OPTION = "__custom__";

type AiProviderFormState = {
  enabled: boolean;
  apiKey: string;
  clearApiKey: boolean;
  model: string;
  maxOutputTokens: string;
  instructions: string;
  apiKeyConfigured: boolean;
};

type AiProviderFormStateById = Record<AIProviderId, AiProviderFormState>;

function buildInitialAiProviderFormState(
  providers: AiProviderAdminSettingsById | null | undefined,
): AiProviderFormStateById {
  return Object.fromEntries(
    AI_PROVIDER_IDS.map((id) => {
      const provider = providers?.[id];

      return [
        id,
        {
          enabled: provider?.enabled ?? false,
          apiKey: "",
          clearApiKey: false,
          model: provider?.model ?? AI_PROVIDER_DEFAULT_MODELS[id],
          maxOutputTokens: String(provider?.maxOutputTokens ?? 48),
          instructions: provider?.instructions ?? "",
          apiKeyConfigured: provider?.apiKeyConfigured ?? false,
        },
      ];
    }),
  ) as AiProviderFormStateById;
}

function getAiProviderModelOptions(
  providerId: AIProviderId,
  selectedModel: string,
) {
  const options = AI_PROVIDER_MODEL_OPTIONS[providerId];
  const normalizedModel = selectedModel.trim();

  if (
    normalizedModel.length === 0 ||
    options.some((option) => option.id === normalizedModel)
  ) {
    return options;
  }

  return [
    { id: normalizedModel, label: `${normalizedModel} (saved value)` },
    ...options,
  ];
}

const HEADER_VARIANT_LABELS: Record<HeaderVariant, string> = {
  classic: "Classic",
  centered: "Centered",
  split: "Split",
  "compact-app": "Compact App",
  "editorial-masthead": "Editorial Masthead",
  minimal: "Minimal",
};

const HEADER_VARIANT_SUMMARIES: Record<HeaderVariant, string> = {
  classic:
    "Brand on the left, CustomHtml in the middle, navigation and actions on the right.",
  centered:
    "Centered vertical header: brand first, then menu, search, CTA, and auth controls.",
  split:
    "Three-zone grid: brand left, navigation centered, CustomHtml and actions right.",
  "compact-app":
    "Short app-style bar with brand left and dense controls on the right.",
  "editorial-masthead":
    "Magazine masthead: search/auth top row, centered brand, menu row below.",
  minimal:
    "Quiet header with brand left and only essential controls on the right.",
};

function HeaderPreviewBlock({
  className,
  label,
  tone = "muted",
}: {
  className?: string;
  label: string;
  tone?: "muted" | "primary" | "border" | "brand";
}) {
  return (
    <span
      className={cn(
        "flex min-h-4 items-center justify-center truncate rounded-sm px-1 text-[0.6rem] leading-none",
        tone === "primary"
          ? "bg-primary text-primary-foreground"
          : tone === "border"
            ? "border border-muted-foreground/35 bg-background text-muted-foreground"
            : tone === "brand"
              ? "bg-foreground/85 text-background"
              : "bg-muted-foreground/20 text-muted-foreground",
        className,
      )}
      title={label}
    >
      {label}
    </span>
  );
}

function HeaderVariantPreview({ variant }: { variant: HeaderVariant }) {
  return (
    <div className="overflow-hidden rounded-md border bg-muted/20">
      <div className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] sm:items-center">
        <div
          className="overflow-hidden rounded border bg-background p-2"
          aria-hidden="true"
        >
          {variant === "classic" && (
            <div className="flex min-h-16 items-center justify-between gap-2">
              <HeaderPreviewBlock
                className="h-5 w-20"
                label="Brand"
                tone="brand"
              />
              <HeaderPreviewBlock className="h-5 flex-1" label="CustomHtml" />
              <div className="flex shrink-0 items-center gap-1.5">
                <HeaderPreviewBlock className="h-5 w-10" label="Menu" />
                <HeaderPreviewBlock className="h-5 w-12" label="Admin" />
                <HeaderPreviewBlock
                  className="h-5 w-12"
                  label="Search"
                  tone="border"
                />
                <HeaderPreviewBlock
                  className="h-5 w-10"
                  label="CTA"
                  tone="primary"
                />
                <HeaderPreviewBlock className="h-5 w-10" label="Auth" />
              </div>
            </div>
          )}
          {variant === "centered" && (
            <div className="flex min-h-20 flex-col items-center justify-center gap-1.5 text-center">
              <HeaderPreviewBlock
                className="h-5 w-24"
                label="Brand"
                tone="brand"
              />
              <HeaderPreviewBlock className="h-4 w-28" label="CustomHtml" />
              <div className="flex flex-wrap justify-center gap-1.5">
                <HeaderPreviewBlock className="h-4 w-12" label="Menu" />
                <HeaderPreviewBlock className="h-4 w-12" label="Admin" />
                <HeaderPreviewBlock
                  className="h-4 w-14"
                  label="Search"
                  tone="border"
                />
                <HeaderPreviewBlock
                  className="h-4 w-10"
                  label="CTA"
                  tone="primary"
                />
                <HeaderPreviewBlock className="h-4 w-10" label="Auth" />
              </div>
            </div>
          )}
          {variant === "split" && (
            <div className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
              <HeaderPreviewBlock
                className="h-5 w-20"
                label="Brand"
                tone="brand"
              />
              <div className="flex items-center justify-center gap-1.5">
                <HeaderPreviewBlock className="h-5 w-12" label="Menu" />
                <HeaderPreviewBlock className="h-5 w-12" label="Admin" />
              </div>
              <div className="flex min-w-0 items-center justify-end gap-1.5">
                <HeaderPreviewBlock className="h-5 w-16" label="CustomHtml" />
                <HeaderPreviewBlock
                  className="h-5 w-14"
                  label="Search"
                  tone="border"
                />
                <HeaderPreviewBlock
                  className="h-5 w-10"
                  label="CTA"
                  tone="primary"
                />
                <HeaderPreviewBlock className="h-5 w-10" label="Auth" />
              </div>
            </div>
          )}
          {variant === "compact-app" && (
            <div className="flex min-h-12 items-center justify-between gap-2 border-b border-muted-foreground/15">
              <HeaderPreviewBlock
                className="h-5 w-20"
                label="Brand"
                tone="brand"
              />
              <HeaderPreviewBlock
                className="hidden h-5 flex-1 md:flex"
                label="CustomHtml"
              />
              <div className="flex shrink-0 items-center gap-1.5">
                <HeaderPreviewBlock className="h-5 w-10" label="Menu" />
                <HeaderPreviewBlock className="h-5 w-12" label="Admin" />
                <HeaderPreviewBlock
                  className="h-5 w-10"
                  label="Search"
                  tone="border"
                />
                <HeaderPreviewBlock
                  className="h-5 w-10"
                  label="CTA"
                  tone="primary"
                />
                <HeaderPreviewBlock className="h-5 w-10" label="Auth" />
              </div>
            </div>
          )}
          {variant === "editorial-masthead" && (
            <div className="flex min-h-24 flex-col justify-center gap-2">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <HeaderPreviewBlock
                  className="h-5 w-16"
                  label="Search"
                  tone="border"
                />
                <HeaderPreviewBlock
                  className="h-7 w-28"
                  label="Brand"
                  tone="brand"
                />
                <HeaderPreviewBlock className="ml-auto h-5 w-12" label="Auth" />
              </div>
              <HeaderPreviewBlock
                className="mx-auto h-4 w-28"
                label="CustomHtml"
              />
              <div className="flex justify-center gap-1.5 border-t border-muted-foreground/15 pt-2">
                <HeaderPreviewBlock className="h-4 w-12" label="Menu" />
                <HeaderPreviewBlock className="h-4 w-12" label="Admin" />
                <HeaderPreviewBlock
                  className="h-4 w-10"
                  label="CTA"
                  tone="primary"
                />
              </div>
            </div>
          )}
          {variant === "minimal" && (
            <div className="flex min-h-14 items-center justify-between gap-2">
              <HeaderPreviewBlock
                className="h-5 w-20"
                label="Brand"
                tone="brand"
              />
              <HeaderPreviewBlock className="h-5 flex-1" label="CustomHtml" />
              <div className="flex shrink-0 items-center gap-1.5">
                <HeaderPreviewBlock className="h-5 w-10" label="Menu" />
                <HeaderPreviewBlock className="h-5 w-12" label="Admin" />
                <HeaderPreviewBlock
                  className="h-5 w-12"
                  label="Search"
                  tone="border"
                />
                <HeaderPreviewBlock
                  className="h-5 w-10"
                  label="CTA"
                  tone="primary"
                />
                <HeaderPreviewBlock className="h-5 w-10" label="Auth" />
              </div>
            </div>
          )}
          <div className="mt-2 border-t border-muted-foreground/15 pt-2">
            <HeaderPreviewBlock
              className="h-4 w-28 opacity-70"
              label="Page content"
            />
          </div>
        </div>
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {HEADER_VARIANT_LABELS[variant]}
            </span>
            <Badge variant="outline">Header preview</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {HEADER_VARIANT_SUMMARIES[variant]}
          </p>
        </div>
      </div>
    </div>
  );
}

const FOOTER_VARIANT_LABELS: Record<FooterVariant, string> = {
  classic: "Classic",
  minimal: "Minimal",
  "multi-column": "Multi-column",
  centered: "Centered",
  CTA: "CTA",
  hidden: "Hidden",
};

const FOOTER_VARIANT_SUMMARIES: Record<FooterVariant, string> = {
  classic: "Simple legacy footer: CustomHtml and copyright only.",
  minimal:
    "Compact row: CustomHtml and copyright on the left, links and CTA on the right.",
  "multi-column": "Three-column footer for content, navigation, and actions.",
  centered: "Centered vertical stack for balanced, quiet pages.",
  CTA: "Two-sided footer with content on the left and action on the right.",
  hidden: "No footer is rendered on the public site.",
};

function FooterPreviewBlock({
  className,
  tone = "muted",
  label,
}: {
  className?: string;
  label?: string;
  tone?: "muted" | "primary" | "border";
}) {
  return (
    <span
      className={cn(
        "flex min-h-4 items-center justify-center truncate rounded-sm px-1 text-[0.6rem] leading-none",
        tone === "primary"
          ? "bg-primary text-primary-foreground"
          : tone === "border"
            ? "border border-muted-foreground/35 bg-background text-muted-foreground"
            : "bg-muted-foreground/20 text-muted-foreground",
        className,
      )}
      title={label}
    >
      {label}
    </span>
  );
}

function FooterVariantPreview({ variant }: { variant: FooterVariant }) {
  const isHidden = variant === "hidden";

  return (
    <div className="overflow-hidden rounded-md border bg-muted/20">
      <div className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] sm:items-center">
        <div
          className={cn(
            "relative min-h-36 overflow-hidden rounded border bg-background p-3",
            isHidden && "flex items-center justify-center",
          )}
          aria-hidden="true"
        >
          <div className="absolute inset-x-0 top-0 h-7 border-b bg-muted/35">
            <FooterPreviewBlock
              className="mx-3 mt-1.5 h-4 w-24"
              label="Page content"
            />
          </div>
          <div className="absolute inset-x-0 top-7 bottom-0 border-t bg-background p-2">
            {variant === "classic" && (
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <FooterPreviewBlock className="h-4 w-24" label="CustomHtml" />
                </div>
                <FooterPreviewBlock className="h-4 w-24" label="Copyright" />
              </div>
            )}
            {variant === "minimal" && (
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <FooterPreviewBlock className="h-4 w-24" label="CustomHtml" />
                  <FooterPreviewBlock
                    className="h-4 w-24 opacity-80"
                    label="Copyright"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <FooterPreviewBlock
                    className="h-4 w-16"
                    label="Footer links"
                  />
                  <FooterPreviewBlock className="h-4 w-12" label="Legal" />
                  <FooterPreviewBlock className="h-4 w-12" label="Social" />
                  <FooterPreviewBlock
                    className="h-4 w-10"
                    label="CTA"
                    tone="primary"
                  />
                </div>
              </div>
            )}
            {variant === "multi-column" && (
              <div className="grid grid-cols-[1.5fr_1fr_1fr] gap-2">
                <div className="space-y-1.5">
                  <FooterPreviewBlock
                    className="h-4 w-full"
                    label="CustomHtml"
                  />
                  <FooterPreviewBlock
                    className="h-4 w-2/3 opacity-80"
                    label="Copyright"
                  />
                </div>
                <div className="space-y-1.5">
                  <FooterPreviewBlock
                    className="h-4 w-full"
                    label="Footer links"
                  />
                  <FooterPreviewBlock
                    className="h-4 w-4/5 opacity-80"
                    label="Legal"
                  />
                </div>
                <div className="space-y-1.5">
                  <FooterPreviewBlock
                    className="ml-auto h-4 w-14"
                    label="CTA"
                    tone="primary"
                  />
                  <FooterPreviewBlock
                    className="ml-auto h-4 w-16 opacity-80"
                    label="Social"
                  />
                </div>
              </div>
            )}
            {variant === "centered" && (
              <div className="flex flex-col items-center gap-1 text-center">
                <FooterPreviewBlock className="h-4 w-24" label="CustomHtml" />
                <FooterPreviewBlock
                  className="h-4 w-12"
                  label="CTA"
                  tone="primary"
                />
                <div className="flex gap-1.5">
                  <FooterPreviewBlock
                    className="h-4 w-16"
                    label="Footer links"
                  />
                  <FooterPreviewBlock className="h-4 w-12" label="Social" />
                  <FooterPreviewBlock className="h-4 w-12" label="Legal" />
                </div>
                <FooterPreviewBlock
                  className="h-4 w-24 opacity-80"
                  label="Copyright"
                />
              </div>
            )}
            {variant === "CTA" && (
              <div className="flex h-full items-center justify-between gap-3">
                <div className="space-y-1">
                  <FooterPreviewBlock className="h-4 w-24" label="CustomHtml" />
                  <FooterPreviewBlock
                    className="h-4 w-20 opacity-80"
                    label="Footer links"
                  />
                  <FooterPreviewBlock
                    className="h-4 w-20 opacity-80"
                    label="Legal"
                  />
                  <FooterPreviewBlock
                    className="h-4 w-24 opacity-80"
                    label="Copyright"
                  />
                </div>
                <div className="space-y-1">
                  <FooterPreviewBlock
                    className="h-5 w-14"
                    label="CTA"
                    tone="primary"
                  />
                  <FooterPreviewBlock
                    className="ml-auto h-4 w-14 opacity-80"
                    label="Social"
                  />
                </div>
              </div>
            )}
            {isHidden && (
              <div className="flex items-center justify-center py-2">
                <FooterPreviewBlock
                  className="h-6 w-28 border-dashed"
                  label="Footer hidden"
                  tone="border"
                />
              </div>
            )}
          </div>
        </div>
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {FOOTER_VARIANT_LABELS[variant]}
            </span>
            <Badge variant="outline">Footer preview</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {FOOTER_VARIANT_SUMMARIES[variant]}
          </p>
        </div>
      </div>
    </div>
  );
}

const MAIN_VARIANT_LABELS: Record<MainSurfaceVariant, string> = {
  normal: "Normal Content",
  framed: "Framed Content",
  "full-bleed-builder": "Full-bleed Builder",
  "editorial-article": "Editorial Article",
  "category-grid": "Category Grid",
};

const BLOG_POST_METADATA_LABELS: Record<BlogPostMetadataTreatment, string> = {
  inline: "Inline",
  stacked: "Stacked",
  eyebrow: "Eyebrow",
  compact: "Compact",
};

const BLOG_POST_COVER_LABELS: Record<BlogPostCoverPlacement, string> = {
  top: "Top",
  hero: "Hero",
  "after-title": "After Title",
  inline: "Inline",
};

const BLOG_POST_EXCERPT_LABELS: Record<BlogPostExcerptTreatment, string> = {
  lead: "Lead",
  subtle: "Subtle",
  callout: "Callout",
  compact: "Compact",
};

const BLOG_POST_COMMENTS_LABELS: Record<BlogPostCommentsPlacement, string> = {
  "after-content": "After Content",
  "before-content": "Before Content",
  aside: "Aside",
};

const BLOG_POST_EDIT_LABELS: Record<BlogPostEditAffordancePlacement, string> = {
  "title-inline": "Title Inline",
  "header-actions": "Header Actions",
  "footer-actions": "Footer Actions",
};

const BLOG_CATEGORY_TEMPLATE_LABELS: Record<
  BlogCategoryTemplateVariant,
  string
> = {
  list: "List",
  cards: "Cards",
  "magazine-grid": "Magazine Grid",
  "compact-archive": "Compact Archive",
  "featured-first": "Featured First",
};

const PAGE_TEMPLATE_LABELS: Record<PageTemplateVariant, string> = {
  "full-bleed-builder": "Full-bleed Builder",
  "contained-builder": "Contained Builder",
  "framed-builder": "Framed Builder",
  "landing-mode": "Landing Mode",
};

const MOTION_PREFERENCE_LABELS: Record<AppearanceMotionPreference, string> = {
  system: "Use System Preference",
  reduced: "Always Reduce Motion",
};

const BACKGROUND_EFFECTS_LABELS: Record<AppearanceBackgroundEffects, string> = {
  system: "Use System Preference",
  disabled: "Disabled",
};

const LOGO_BORDER_COLOR_MODE_LABELS: Record<
  (typeof LOGO_BORDER_COLOR_MODES)[number],
  string
> = {
  theme: "Use theme border color",
  custom: "Custom border color",
};

const LOGO_BORDER_SHAPE_LABELS: Record<
  (typeof LOGO_BORDER_SHAPES)[number],
  string
> = {
  circle: "Circle",
  square: "Square",
};

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function normalizeOptionalHexColor(value: string): string | undefined {
  const trimmed = value.trim();
  return HEX_COLOR.test(trimmed) ? trimmed : undefined;
}

function isOptionalHexColorValid(value: string): boolean {
  return value.trim() === "" || HEX_COLOR.test(value.trim());
}

function normalizeOptionalGlowEffect(
  value: GlowEffect,
): GlowEffect | undefined {
  const color = normalizeOptionalHexColor(value.color);
  return color ? { ...value, color } : undefined;
}

function isOptionalGlowColorValid(value: GlowEffect): boolean {
  return isOptionalHexColorValid(value.color);
}

function getColorPickerValue(value: string): string {
  const normalized = normalizeOptionalHexColor(value);
  if (!normalized) return "#ffffff";
  if (normalized.length === 4) {
    const [, r, g, b] = normalized;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return normalized;
}

function findRecipeSlot<T extends AppearanceSlotV1["type"]>(
  slots: AppearanceSlotV1[],
  type: T,
  id?: string,
): Extract<AppearanceSlotV1, { type: T }> | null {
  return (slots.find((slot) => slot.type === type && (!id || slot.id === id)) ??
    null) as Extract<AppearanceSlotV1, { type: T }> | null;
}

function formatLinksText(links: AppearanceLinkV1[]): string {
  return links.map((link) => `${link.label} | ${link.href}`).join("\n");
}

function parseLinksText(value: string): AppearanceLinkV1[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((line) => {
      const separatorIndex = line.indexOf("|");
      if (separatorIndex === -1) {
        return { label: line, href: line };
      }
      return {
        label: line.slice(0, separatorIndex).trim(),
        href: line.slice(separatorIndex + 1).trim(),
      };
    })
    .filter((link) => link.label.length > 0 && link.href.length > 0);
}

function inferPresetId(recipe: AppearanceRecipe): AppearancePresetId | null {
  return (
    APPEARANCE_SHELL_PRESETS.find(
      (preset) =>
        preset.header.variant === recipe.shell.header.variant &&
        preset.main.variant === recipe.shell.main.variant &&
        preset.footer.variant === recipe.shell.footer.variant,
    )?.id ?? null
  );
}

function clampMinutes(
  raw: string,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return Math.max(min, Math.min(max, fallback));
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function formatMinutesHuman(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

interface ContentWidthFieldProps {
  id: string;
  label: string;
  value: ContentWidth;
  onChange: (next: ContentWidth) => void;
}

function ContentWidthField({
  id,
  label,
  value,
  onChange,
}: ContentWidthFieldProps) {
  const valueIsPreset = isContentWidthPreset(value);
  // Track the user's selection in local state so switching to "custom" with
  // an empty/invalid input still reveals the number field (the committed
  // `value` would otherwise remain a preset and hide it).
  const [isCustom, setIsCustom] = useState<boolean>(!valueIsPreset);
  const [customDraft, setCustomDraft] = useState<string>(
    valueIsPreset ? "" : String(value),
  );
  const selectValue: string = isCustom
    ? CUSTOM_WIDTH_OPTION
    : valueIsPreset
      ? value
      : DEFAULT_APPEARANCE.frontendContentWidth;
  const customNum = parseCustomContentWidth(customDraft);
  const showError = isCustom && customDraft.length > 0 && customNum === null;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (v === CUSTOM_WIDTH_OPTION) {
            setIsCustom(true);
            // Seed the draft from the previous numeric value (or empty when
            // coming from a preset). Only commit upstream when valid so we
            // never write an invalid value.
            const seed = valueIsPreset ? "" : String(value);
            setCustomDraft(seed);
            const n = parseCustomContentWidth(seed);
            if (n !== null) onChange(String(n));
          } else {
            setIsCustom(false);
            onChange(v as ContentWidthPreset);
          }
        }}
      >
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CONTENT_WIDTHS.map((w) => (
            <SelectItem key={w} value={w}>
              {w}
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM_WIDTH_OPTION}>custom (px)</SelectItem>
        </SelectContent>
      </Select>
      {isCustom && (
        <div className="space-y-1">
          <Input
            id={`${id}-custom`}
            type="number"
            inputMode="numeric"
            min={MIN_CUSTOM_CONTENT_WIDTH_PX}
            max={MAX_CUSTOM_CONTENT_WIDTH_PX}
            step={1}
            placeholder="e.g. 1200"
            value={customDraft}
            onChange={(e) => {
              const next = e.target.value;
              setCustomDraft(next);
              const n = parseCustomContentWidth(next);
              if (n !== null) onChange(String(n));
            }}
            onBlur={() => {
              // On blur, snap the committed value to a safe default if the
              // input is empty/invalid so we never persist an invalid value.
              if (parseCustomContentWidth(customDraft) === null) {
                onChange(
                  normalizeContentWidth(
                    customDraft,
                    DEFAULT_APPEARANCE.frontendContentWidth,
                  ),
                );
              }
            }}
            aria-invalid={showError || undefined}
          />
          <p
            className={
              showError
                ? "text-xs text-destructive"
                : "text-xs text-muted-foreground"
            }
          >
            {showError
              ? `Enter a whole number between ${MIN_CUSTOM_CONTENT_WIDTH_PX} and ${MAX_CUSTOM_CONTENT_WIDTH_PX}.`
              : `Max-width in pixels. Layout stays responsive and centered (width: 100%, mx-auto).`}
          </p>
        </div>
      )}
    </div>
  );
}

type SearchableOption = {
  value: string;
  label: string;
};

interface SearchableSelectProps {
  id: string;
  label: string;
  value: string;
  options: SearchableOption[];
  placeholder: string;
  searchPlaceholder: string;
  onChange: (value: string) => void;
}

function SearchableSelect({
  id,
  label,
  value,
  options,
  placeholder,
  searchPlaceholder,
  onChange,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.value === value);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter((option) =>
        `${option.label} ${option.value}`
          .toLocaleLowerCase()
          .includes(normalizedQuery),
      )
    : options;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="truncate text-left">
              {selected ? `${selected.label} (${selected.value})` : placeholder}
            </span>
            <ChevronsUpDown className="size-4 opacity-50" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) p-2"
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="mb-2"
          />
          <div className="max-h-72 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No matches found.
              </p>
            ) : (
              filteredOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant="ghost"
                  className="h-auto w-full justify-start gap-2 px-2 py-2 text-left"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      option.value === value ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block truncate">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {option.value}
                    </span>
                  </span>
                </Button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface SessionSecurityCardProps {
  maxSessionMinutes: string;
  setMaxSessionMinutes: (v: string) => void;
  idleLogoutMinutes: string;
  setIdleLogoutMinutes: (v: string) => void;
}

function SessionSecurityCard({
  maxSessionMinutes,
  setMaxSessionMinutes,
  idleLogoutMinutes,
  setIdleLogoutMinutes,
}: SessionSecurityCardProps) {
  const maxNum = parseInt(maxSessionMinutes, 10);
  const idleNum = parseInt(idleLogoutMinutes, 10);
  const maxValid =
    Number.isFinite(maxNum) &&
    maxNum >= MIN_MAX_SESSION_MINUTES &&
    maxNum <= MAX_MAX_SESSION_MINUTES;
  const idleValid = Number.isFinite(idleNum) && idleNum >= MIN_IDLE_MINUTES;
  const idleLeqMax = maxValid && idleValid && idleNum <= maxNum;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Security</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="maxSessionMinutes">
            Max Session Duration (minutes)
          </Label>
          <Input
            id="maxSessionMinutes"
            type="number"
            min={MIN_MAX_SESSION_MINUTES}
            max={MAX_MAX_SESSION_MINUTES}
            step={1}
            value={maxSessionMinutes}
            onChange={(e) => setMaxSessionMinutes(e.target.value)}
            aria-invalid={!maxValid || undefined}
          />
          <p
            className={
              maxValid
                ? "text-xs text-muted-foreground"
                : "text-xs text-destructive"
            }
          >
            {maxValid
              ? `${maxNum} minutes = ${formatMinutesHuman(maxNum)}. Absolute lifetime — user is signed out when this elapses regardless of activity.`
              : `Enter a whole number between ${MIN_MAX_SESSION_MINUTES} and ${MAX_MAX_SESSION_MINUTES}.`}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="idleLogoutMinutes">Idle Auto-Logout (minutes)</Label>
          <Input
            id="idleLogoutMinutes"
            type="number"
            min={MIN_IDLE_MINUTES}
            max={maxValid ? maxNum : MAX_MAX_SESSION_MINUTES}
            step={1}
            value={idleLogoutMinutes}
            onChange={(e) => setIdleLogoutMinutes(e.target.value)}
            aria-invalid={!idleValid || !idleLeqMax || undefined}
          />
          <p
            className={
              idleValid && idleLeqMax
                ? "text-xs text-muted-foreground"
                : "text-xs text-destructive"
            }
          >
            {!idleValid
              ? `Enter a whole number greater than or equal to ${MIN_IDLE_MINUTES}.`
              : !idleLeqMax
                ? "Idle logout cannot exceed max session duration."
                : `${idleNum} minutes = ${formatMinutesHuman(idleNum)}. Sliding window — reset by user activity; a warning appears before sign-out.`}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Note: for hard server-side enforcement, also configure Clerk&apos;s
          session token lifetime in the Clerk dashboard to match the max session
          duration.
        </p>
      </CardContent>
    </Card>
  );
}

export function SettingsForm({ settings, initialLogoFile }: SettingsFormProps) {
  const headerSettings =
    HeaderSettingsSchema.safeParse(settings?.headerSettings).data ??
    DEFAULT_HEADER_SETTINGS;

  const footerSettings =
    FooterSettingsSchema.safeParse(settings?.footerSettings).data ??
    DEFAULT_FOOTER_SETTINGS;

  const initialAppearanceSettings = {
    theme: (settings?.theme as Theme | undefined) ?? DEFAULT_APPEARANCE.theme,
    frontendContentWidth: normalizeContentWidth(
      settings?.frontendContentWidth,
      DEFAULT_APPEARANCE.frontendContentWidth,
    ),
    backendContentWidth: normalizeContentWidth(
      settings?.backendContentWidth,
      DEFAULT_APPEARANCE.backendContentWidth,
    ),
    fontPreset:
      (settings?.fontPreset as FontPreset | undefined) ??
      DEFAULT_APPEARANCE.fontPreset,
    radiusPreset:
      (settings?.radiusPreset as RadiusPreset | undefined) ??
      DEFAULT_APPEARANCE.radiusPreset,
    shadowPreset:
      (settings?.shadowPreset as ShadowPreset | undefined) ??
      DEFAULT_APPEARANCE.shadowPreset,
  };
  const initialRecipe = parseAppearanceRecipe(settings?.appearanceRecipe, {
    appearance: initialAppearanceSettings,
    headerContent: settings?.headerContent ?? null,
    footerContent: settings?.footerContent ?? null,
    headerSettings,
    footerSettings,
    stickyHeaderHeight: settings?.stickyHeaderHeight ?? 80,
    stickyFooterHeight: settings?.stickyFooterHeight ?? 110,
  });
  const initialHeaderSlots = initialRecipe.shell.header.slots;
  const initialFooterSlots = initialRecipe.shell.footer.slots;
  const initialHeaderCustomHtmlSlot = findRecipeSlot(
    initialHeaderSlots,
    "CustomHtml",
    "header-custom-html",
  );
  const initialSiteMenuSlot = findRecipeSlot(initialHeaderSlots, "SiteMenu");
  const initialAdminMenuSlot = findRecipeSlot(initialHeaderSlots, "AdminMenu");
  const initialAuthControlsSlot = findRecipeSlot(
    initialHeaderSlots,
    "AuthControls",
  );
  const initialSearchSlot = findRecipeSlot(
    initialHeaderSlots,
    "Search",
    "header-search",
  );
  const initialHeaderCtaSlot = findRecipeSlot(
    initialHeaderSlots,
    "CTA",
    "header-cta",
  );
  const initialFooterCustomHtmlSlot = findRecipeSlot(
    initialFooterSlots,
    "CustomHtml",
    "footer-custom-html",
  );
  const initialCopyrightSlot = findRecipeSlot(
    initialFooterSlots,
    "Copyright",
    "copyright",
  );
  const initialFooterLinksSlot = findRecipeSlot(
    initialFooterSlots,
    "FooterLinks",
    "footer-links",
  );
  const initialLegalLinksSlot = findRecipeSlot(
    initialFooterSlots,
    "LegalLinks",
    "legal-links",
  );
  const initialSocialLinksSlot = findRecipeSlot(
    initialFooterSlots,
    "SocialLinks",
    "social-links",
  );
  const initialFooterCtaSlot = findRecipeSlot(
    initialFooterSlots,
    "CTA",
    "footer-cta",
  );

  const [siteName, setSiteName] = useState(
    settings?.siteName ?? "Night Raven CMS",
  );
  const [publicSiteUrl, setPublicSiteUrl] = useState(
    settings?.publicSiteUrl ?? "",
  );
  const [defaultLanguage, setDefaultLanguage] = useState(
    settings?.defaultLanguage ?? DEFAULT_REGIONAL_SETTINGS.defaultLanguage,
  );
  const [timezone, setTimezone] = useState(
    settings?.timezone ?? DEFAULT_REGIONAL_SETTINGS.timezone,
  );
  const [headerContent, setHeaderContent] = useState(
    settings?.headerContent ?? "",
  );
  const [footerContent, setFooterContent] = useState(
    settings?.footerContent ?? "",
  );
  const [headerShowLogo, setHeaderShowLogo] = useState(headerSettings.showLogo);
  const [headerShowSiteName, setHeaderShowSiteName] = useState(
    headerSettings.showSiteName,
  );
  const [headerSticky, setHeaderSticky] = useState(headerSettings.sticky);
  const [logoBorderEnabled, setLogoBorderEnabled] = useState(
    headerSettings.logoBorderEnabled,
  );
  const [logoBorderColorMode, setLogoBorderColorMode] = useState<
    (typeof LOGO_BORDER_COLOR_MODES)[number]
  >(headerSettings.logoBorderColorMode);
  const [logoBorderColor, setLogoBorderColor] = useState(
    headerSettings.logoBorderColor ?? "",
  );
  const [logoBorderShape, setLogoBorderShape] = useState<
    (typeof LOGO_BORDER_SHAPES)[number]
  >(headerSettings.logoBorderShape);
  const [headerBackground, setHeaderBackground] = useState(
    headerSettings.background ?? "",
  );
  const [headerGlow, setHeaderGlow] = useState<GlowEffect>(
    headerSettings.glow ?? DEFAULT_GLOW,
  );
  const [stickyHeaderHeight, setStickyHeaderHeight] = useState(
    String(settings?.stickyHeaderHeight ?? 80),
  );
  const [logoFileId, setLogoFileId] = useState<string | null>(
    settings?.siteLogoFileId ?? null,
  );
  const [logoFilename, setLogoFilename] = useState<string | null>(
    initialLogoFile?.filename ?? null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [headerVariant, setHeaderVariant] = useState<HeaderVariant>(
    initialRecipe.shell.header.variant,
  );
  const [headerCustomHtmlEnabled, setHeaderCustomHtmlEnabled] = useState(
    initialHeaderCustomHtmlSlot?.enabled ?? Boolean(settings?.headerContent),
  );
  const [siteMenuEnabled, setSiteMenuEnabled] = useState(
    initialSiteMenuSlot?.enabled ?? true,
  );
  const [adminMenuEnabled, setAdminMenuEnabled] = useState(
    initialAdminMenuSlot?.enabled ?? true,
  );
  const [authControlsEnabled, setAuthControlsEnabled] = useState(
    initialAuthControlsSlot?.enabled ?? true,
  );
  const [searchEnabled, setSearchEnabled] = useState(
    initialSearchSlot?.enabled ?? false,
  );
  const [searchPlaceholder, setSearchPlaceholder] = useState(
    initialSearchSlot?.placeholder ?? "Search",
  );
  const [searchBlogPosts, setSearchBlogPosts] = useState(
    initialSearchSlot?.contentTypes.includes("blog_post") ?? true,
  );
  const [searchPages, setSearchPages] = useState(
    initialSearchSlot?.contentTypes.includes("page") ?? true,
  );
  const [headerCtaEnabled, setHeaderCtaEnabled] = useState(
    initialHeaderCtaSlot?.enabled ?? false,
  );
  const [headerCtaLabel, setHeaderCtaLabel] = useState(
    initialHeaderCtaSlot?.label ?? "",
  );
  const [headerCtaHref, setHeaderCtaHref] = useState(
    initialHeaderCtaSlot?.href ?? "",
  );
  const [footerShowLogo, setFooterShowLogo] = useState(footerSettings.showLogo);
  const [footerCopyright, setFooterCopyright] = useState(
    footerSettings.copyright ?? "",
  );
  const [footerSticky, setFooterSticky] = useState(footerSettings.sticky);
  const [footerBackground, setFooterBackground] = useState(
    footerSettings.background ?? "",
  );
  const [footerGlow, setFooterGlow] = useState<GlowEffect>(
    footerSettings.glow ?? DEFAULT_GLOW,
  );
  const [stickyFooterHeight, setStickyFooterHeight] = useState(
    String(settings?.stickyFooterHeight ?? 110),
  );
  const [footerVariant, setFooterVariant] = useState<FooterVariant>(
    initialRecipe.shell.footer.variant,
  );
  const [footerCustomHtmlEnabled, setFooterCustomHtmlEnabled] = useState(
    initialFooterCustomHtmlSlot?.enabled ?? Boolean(settings?.footerContent),
  );
  const [copyrightEnabled, setCopyrightEnabled] = useState(
    initialCopyrightSlot?.enabled ?? Boolean(footerSettings.copyright),
  );
  const [footerLinksEnabled, setFooterLinksEnabled] = useState(
    initialFooterLinksSlot?.enabled ?? false,
  );
  const [footerLinksText, setFooterLinksText] = useState(
    formatLinksText(initialFooterLinksSlot?.links ?? []),
  );
  const [legalLinksEnabled, setLegalLinksEnabled] = useState(
    initialLegalLinksSlot?.enabled ?? false,
  );
  const [legalLinksText, setLegalLinksText] = useState(
    formatLinksText(initialLegalLinksSlot?.links ?? []),
  );
  const [socialLinksEnabled, setSocialLinksEnabled] = useState(
    initialSocialLinksSlot?.enabled ?? false,
  );
  const [socialLinksGenerateSocialIcons, setSocialLinksGenerateSocialIcons] =
    useState(initialSocialLinksSlot?.generateSocialIcons ?? false);
  const [socialLinksText, setSocialLinksText] = useState(
    formatLinksText(initialSocialLinksSlot?.links ?? []),
  );
  const [footerCtaEnabled, setFooterCtaEnabled] = useState(
    initialFooterCtaSlot?.enabled ?? false,
  );
  const [footerCtaLabel, setFooterCtaLabel] = useState(
    initialFooterCtaSlot?.label ?? "",
  );
  const [footerCtaHref, setFooterCtaHref] = useState(
    initialFooterCtaSlot?.href ?? "",
  );
  const [maxUploadMB, setMaxUploadMB] = useState(
    String(Math.round(Number(settings?.maxUploadSizeBytes ?? 50 * MB) / MB)),
  );
  const [maxBatchUploadMB, setMaxBatchUploadMB] = useState(
    String(
      Math.round(Number(settings?.maxBatchUploadSizeBytes ?? 500 * MB) / MB),
    ),
  );

  // ─── Appearance ────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<Theme>(initialAppearanceSettings.theme);
  const [frontendContentWidth, setFrontendContentWidth] =
    useState<ContentWidth>(initialAppearanceSettings.frontendContentWidth);
  const [backendContentWidth, setBackendContentWidth] = useState<ContentWidth>(
    initialAppearanceSettings.backendContentWidth,
  );
  const [fontPreset, setFontPreset] = useState<FontPreset>(
    initialAppearanceSettings.fontPreset,
  );
  const [radiusPreset, setRadiusPreset] = useState<RadiusPreset>(
    initialAppearanceSettings.radiusPreset,
  );
  const [shadowPreset, setShadowPreset] = useState<ShadowPreset>(
    initialAppearanceSettings.shadowPreset,
  );
  const [mainVariant, setMainVariant] = useState<MainSurfaceVariant>(
    initialRecipe.shell.main.variant,
  );
  const [blogPostMetadataTreatment, setBlogPostMetadataTreatment] =
    useState<BlogPostMetadataTreatment>(
      initialRecipe.contentTemplates.blogPost.metadataTreatment,
    );
  const [blogPostCoverPlacement, setBlogPostCoverPlacement] =
    useState<BlogPostCoverPlacement>(
      initialRecipe.contentTemplates.blogPost.coverPlacement,
    );
  const [blogPostExcerptTreatment, setBlogPostExcerptTreatment] =
    useState<BlogPostExcerptTreatment>(
      initialRecipe.contentTemplates.blogPost.excerptTreatment,
    );
  const [blogPostCommentsPlacement, setBlogPostCommentsPlacement] =
    useState<BlogPostCommentsPlacement>(
      initialRecipe.contentTemplates.blogPost.commentsPlacement,
    );
  const [blogPostEditPlacement, setBlogPostEditPlacement] =
    useState<BlogPostEditAffordancePlacement>(
      initialRecipe.contentTemplates.blogPost.editAffordancePlacement,
    );
  const [blogCategoryTemplateVariant, setBlogCategoryTemplateVariant] =
    useState<BlogCategoryTemplateVariant>(
      initialRecipe.contentTemplates.blogCategory.variant,
    );
  const [pageTemplateVariant, setPageTemplateVariant] =
    useState<PageTemplateVariant>(initialRecipe.contentTemplates.page.variant);
  const [motionPreference, setMotionPreference] =
    useState<AppearanceMotionPreference>(initialRecipe.motion.motionPreference);
  const [backgroundEffects, setBackgroundEffects] =
    useState<AppearanceBackgroundEffects>(
      initialRecipe.motion.backgroundEffects,
    );
  const [recipePortabilityText, setRecipePortabilityText] = useState("");
  const [draftPresetId, setDraftPresetId] = useState<AppearancePresetId | null>(
    inferPresetId(initialRecipe),
  );

  // ─── Session security ──────────────────────────────────────────────────────
  const [maxSessionMinutes, setMaxSessionMinutes] = useState<string>(
    String(
      settings?.maxSessionDurationMinutes ??
        SESSION_SECURITY_DEFAULTS.maxSessionDurationMinutes,
    ),
  );
  const [idleLogoutMinutesInput, setIdleLogoutMinutesInput] = useState<string>(
    String(
      settings?.idleLogoutMinutes ??
        SESSION_SECURITY_DEFAULTS.idleLogoutMinutes,
    ),
  );

  // ─── AI writing assistant ────────────────────────────────────────────────
  const [aiWritingAssistantEnabled, setAiWritingAssistantEnabled] = useState(
    settings?.aiWritingAssistantEnabled ?? false,
  );
  const [aiPageBuilderAssistantEnabled, setAiPageBuilderAssistantEnabled] =
    useState(settings?.aiPageBuilderAssistantEnabled ?? false);
  const [aiProviders, setAiProviders] = useState<AiProviderFormStateById>(() =>
    buildInitialAiProviderFormState(settings?.aiProviderSettings),
  );
  const [aiDefaultProvider, setAiDefaultProvider] = useState<AIProviderId>(
    () => {
      const configured = settings?.aiDefaultProvider;
      return configured &&
        (AI_PROVIDER_IDS as readonly string[]).includes(configured)
        ? (configured as AIProviderId)
        : AI_WRITING_ASSISTANT_DEFAULTS.defaultProvider;
    },
  );

  const previewAppearance = useMemo(
    () =>
      resolveAppearance({
        theme,
        frontendContentWidth,
        backendContentWidth,
        fontPreset,
        radiusPreset,
        shadowPreset,
      }),
    [
      theme,
      frontendContentWidth,
      backendContentWidth,
      fontPreset,
      radiusPreset,
      shadowPreset,
    ],
  );
  const currentStickyHeaderHeight = Math.max(
    0,
    Math.min(400, parseInt(stickyHeaderHeight, 10) || 0),
  );
  const currentStickyFooterHeight = Math.max(
    0,
    Math.min(400, parseInt(stickyFooterHeight, 10) || 0),
  );
  const currentHeaderSettings = useMemo(
    () => ({
      showLogo: headerShowLogo,
      showSiteName: headerShowSiteName,
      sticky: headerSticky,
      logoBorderEnabled,
      logoBorderColorMode,
      logoBorderColor:
        logoBorderColorMode === "custom"
          ? normalizeOptionalHexColor(logoBorderColor)
          : undefined,
      logoBorderShape,
      background: normalizeOptionalHexColor(headerBackground),
      glow: normalizeOptionalGlowEffect(headerGlow),
    }),
    [
      headerShowLogo,
      headerShowSiteName,
      headerSticky,
      logoBorderEnabled,
      logoBorderColorMode,
      logoBorderColor,
      logoBorderShape,
      headerBackground,
      headerGlow,
    ],
  );
  const currentFooterSettings = useMemo(
    () => ({
      showLogo: footerShowLogo,
      copyright: footerCopyright || undefined,
      sticky: footerSticky,
      background: normalizeOptionalHexColor(footerBackground),
      glow: normalizeOptionalGlowEffect(footerGlow),
    }),
    [
      footerShowLogo,
      footerCopyright,
      footerSticky,
      footerBackground,
      footerGlow,
    ],
  );
  const currentAppearanceSettings = useMemo(
    () => ({
      theme,
      frontendContentWidth,
      backendContentWidth,
      fontPreset,
      radiusPreset,
      shadowPreset,
    }),
    [
      theme,
      frontendContentWidth,
      backendContentWidth,
      fontPreset,
      radiusPreset,
      shadowPreset,
    ],
  );
  const draftRecipe = buildAppearanceRecipeForSubmit({
    nextAppearance: currentAppearanceSettings,
    nextHeaderSettings: currentHeaderSettings,
    nextFooterSettings: currentFooterSettings,
    nextStickyHeaderHeight: currentStickyHeaderHeight,
    nextStickyFooterHeight: currentStickyFooterHeight,
  });
  const qualityIssues = runAppearanceRecipeQualityChecks(draftRecipe);
  const qualityErrorCount = qualityIssues.filter(
    (issue) => issue.severity === "error",
  ).length;
  const qualityWarningCount = qualityIssues.filter(
    (issue) => issue.severity === "warning",
  ).length;

  const [isPending, startTransition] = useTransition();
  const bottomSaveButtonRef = useRef<HTMLDivElement | null>(null);
  const [bottomSaveButtonVisible, setBottomSaveButtonVisible] = useState(false);
  const lock = useAdminSectionLock();
  const canSave = lock.isEditor;
  const headerBackgroundValid = isOptionalHexColorValid(headerBackground);
  const logoBorderColorValid =
    logoBorderColorMode !== "custom" || HEX_COLOR.test(logoBorderColor.trim());
  const footerBackgroundValid = isOptionalHexColorValid(footerBackground);
  const backgroundColorsValid = headerBackgroundValid && footerBackgroundValid;
  const headerGlowColorValid = isOptionalGlowColorValid(headerGlow);
  const footerGlowColorValid = isOptionalGlowColorValid(footerGlow);
  const glowColorsValid = headerGlowColorValid && footerGlowColorValid;

  const maxSessionMinutesNum = parseInt(maxSessionMinutes, 10);
  const idleLogoutMinutesNum = parseInt(idleLogoutMinutesInput, 10);
  const sessionSecurityValid =
    Number.isFinite(maxSessionMinutesNum) &&
    maxSessionMinutesNum >= MIN_MAX_SESSION_MINUTES &&
    maxSessionMinutesNum <= MAX_MAX_SESSION_MINUTES &&
    Number.isFinite(idleLogoutMinutesNum) &&
    idleLogoutMinutesNum >= MIN_IDLE_MINUTES &&
    idleLogoutMinutesNum <= maxSessionMinutesNum;
  const enabledAiProviderIds = useMemo(
    () => AI_PROVIDER_IDS.filter((id) => aiProviders[id].enabled),
    [aiProviders],
  );
  const effectiveAiDefaultProvider = enabledAiProviderIds.includes(
    aiDefaultProvider,
  )
    ? aiDefaultProvider
    : (enabledAiProviderIds[0] ?? aiDefaultProvider);
  const aiAssistantShownInEditors =
    aiWritingAssistantEnabled || aiPageBuilderAssistantEnabled;
  const aiWritingAssistantSettingsValid =
    AI_PROVIDER_IDS.every((id) => {
      const provider = aiProviders[id];
      const maxOutputTokens = parseInt(provider.maxOutputTokens, 10);

      return (
        provider.model.trim().length > 0 &&
        provider.model.trim().length <= 120 &&
        Number.isFinite(maxOutputTokens) &&
        maxOutputTokens >= MIN_AI_WRITING_ASSISTANT_MAX_OUTPUT_TOKENS &&
        maxOutputTokens <= MAX_AI_WRITING_ASSISTANT_MAX_OUTPUT_TOKENS &&
        provider.instructions.trim().length <= 2_000 &&
        (provider.apiKey.trim().length === 0 ||
          (provider.apiKey.trim().length >= 20 &&
            provider.apiKey.trim().length <= 512))
      );
    }) &&
    (!aiAssistantShownInEditors || enabledAiProviderIds.length > 0);
  const settingsSaveDisabled =
    isPending ||
    !sessionSecurityValid ||
    !aiWritingAssistantSettingsValid ||
    !logoBorderColorValid ||
    !backgroundColorsValid ||
    !glowColorsValid ||
    !canSave;

  useEffect(() => {
    const bottomSaveButton = bottomSaveButtonRef.current;

    if (!bottomSaveButton) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setBottomSaveButtonVisible(entry.isIntersecting);
    });

    observer.observe(bottomSaveButton);

    return () => {
      observer.disconnect();
    };
  }, []);

  function buildAppearanceRecipeForSubmit({
    nextAppearance,
    nextHeaderSettings,
    nextFooterSettings,
    nextStickyHeaderHeight,
    nextStickyFooterHeight,
  }: {
    nextAppearance: typeof initialAppearanceSettings;
    nextHeaderSettings: typeof headerSettings;
    nextFooterSettings: typeof footerSettings;
    nextStickyHeaderHeight: number;
    nextStickyFooterHeight: number;
  }): AppearanceRecipe {
    const recipe = buildDefaultClassicAppearanceRecipe({
      appearance: nextAppearance,
      headerContent: headerContent || null,
      footerContent: footerContent || null,
      headerSettings: nextHeaderSettings,
      footerSettings: nextFooterSettings,
      stickyHeaderHeight: nextStickyHeaderHeight,
      stickyFooterHeight: nextStickyFooterHeight,
    });

    return {
      ...recipe,
      contentTemplates: {
        blogPost: {
          metadataTreatment: blogPostMetadataTreatment,
          coverPlacement: blogPostCoverPlacement,
          excerptTreatment: blogPostExcerptTreatment,
          commentsPlacement: blogPostCommentsPlacement,
          editAffordancePlacement: blogPostEditPlacement,
        },
        blogCategory: {
          variant: blogCategoryTemplateVariant,
        },
        page: {
          variant: pageTemplateVariant,
        },
      },
      motion: {
        motionPreference,
        backgroundEffects,
      },
      shell: {
        header: {
          ...recipe.shell.header,
          variant: headerVariant,
          slots: recipe.shell.header.slots.map((slot) => {
            if (
              slot.type === "CustomHtml" &&
              slot.id === "header-custom-html"
            ) {
              return {
                ...slot,
                enabled:
                  headerCustomHtmlEnabled && (headerContent || "").length > 0,
              };
            }
            if (slot.type === "SiteMenu") {
              return { ...slot, enabled: siteMenuEnabled };
            }
            if (slot.type === "AdminMenu") {
              return { ...slot, enabled: adminMenuEnabled };
            }
            if (slot.type === "AuthControls") {
              return { ...slot, enabled: authControlsEnabled };
            }
            if (slot.type === "Search") {
              return {
                ...slot,
                enabled: searchEnabled,
                placeholder: searchPlaceholder.trim() || "Search",
                contentTypes: [
                  ...(searchBlogPosts ? (["blog_post"] as const) : []),
                  ...(searchPages ? (["page"] as const) : []),
                ],
              };
            }
            if (slot.type === "CTA" && slot.id === "header-cta") {
              return {
                ...slot,
                enabled: headerCtaEnabled,
                label: headerCtaLabel.trim(),
                href: headerCtaHref.trim(),
                style: "primary" as const,
              };
            }
            return slot;
          }),
        },
        main: {
          variant: mainVariant,
        },
        footer: {
          ...recipe.shell.footer,
          variant: footerVariant,
          slots: recipe.shell.footer.slots.map((slot) => {
            if (
              slot.type === "CustomHtml" &&
              slot.id === "footer-custom-html"
            ) {
              return {
                ...slot,
                enabled:
                  footerCustomHtmlEnabled && (footerContent || "").length > 0,
              };
            }
            if (slot.type === "Copyright") {
              return {
                ...slot,
                enabled: copyrightEnabled && footerCopyright.length > 0,
              };
            }
            if (slot.type === "FooterLinks") {
              return {
                ...slot,
                enabled: footerLinksEnabled,
                links: parseLinksText(footerLinksText),
              };
            }
            if (slot.type === "LegalLinks") {
              return {
                ...slot,
                enabled: legalLinksEnabled,
                links: parseLinksText(legalLinksText),
              };
            }
            if (slot.type === "SocialLinks") {
              return {
                ...slot,
                enabled: socialLinksEnabled,
                generateSocialIcons: socialLinksGenerateSocialIcons,
                links: parseLinksText(socialLinksText),
              };
            }
            if (slot.type === "CTA" && slot.id === "footer-cta") {
              return {
                ...slot,
                enabled: footerCtaEnabled,
                label: footerCtaLabel.trim(),
                href: footerCtaHref.trim(),
                style: "primary" as const,
              };
            }
            return slot;
          }),
        },
      },
    };
  }

  function syncDraftFromRecipe(
    recipe: AppearanceRecipe,
    presetId: AppearancePresetId | null,
  ) {
    const brandSlot = findRecipeSlot(
      recipe.shell.header.slots,
      "Brand",
      "brand",
    );
    const headerHtmlSlot = findRecipeSlot(
      recipe.shell.header.slots,
      "CustomHtml",
      "header-custom-html",
    );
    const siteMenuSlot = findRecipeSlot(
      recipe.shell.header.slots,
      "SiteMenu",
      "site-menu",
    );
    const adminMenuSlot = findRecipeSlot(
      recipe.shell.header.slots,
      "AdminMenu",
      "admin-menu",
    );
    const authControlsSlot = findRecipeSlot(
      recipe.shell.header.slots,
      "AuthControls",
      "auth-controls",
    );
    const searchSlot = findRecipeSlot(
      recipe.shell.header.slots,
      "Search",
      "header-search",
    );
    const headerCtaSlot = findRecipeSlot(
      recipe.shell.header.slots,
      "CTA",
      "header-cta",
    );
    const footerHtmlSlot = findRecipeSlot(
      recipe.shell.footer.slots,
      "CustomHtml",
      "footer-custom-html",
    );
    const copyrightSlot = findRecipeSlot(
      recipe.shell.footer.slots,
      "Copyright",
      "copyright",
    );
    const footerLinksSlot = findRecipeSlot(
      recipe.shell.footer.slots,
      "FooterLinks",
      "footer-links",
    );
    const legalLinksSlot = findRecipeSlot(
      recipe.shell.footer.slots,
      "LegalLinks",
      "legal-links",
    );
    const socialLinksSlot = findRecipeSlot(
      recipe.shell.footer.slots,
      "SocialLinks",
      "social-links",
    );
    const footerCtaSlot = findRecipeSlot(
      recipe.shell.footer.slots,
      "CTA",
      "footer-cta",
    );

    setTheme(recipe.tokens.theme);
    setFrontendContentWidth(recipe.tokens.frontendContentWidth);
    setBackendContentWidth(recipe.tokens.backendContentWidth);
    setFontPreset(recipe.tokens.fontPreset);
    setRadiusPreset(recipe.tokens.radiusPreset);
    setShadowPreset(recipe.tokens.shadowPreset);
    setHeaderVariant(recipe.shell.header.variant);
    setMainVariant(recipe.shell.main.variant);
    setFooterVariant(recipe.shell.footer.variant);
    setBlogPostMetadataTreatment(
      recipe.contentTemplates.blogPost.metadataTreatment,
    );
    setBlogPostCoverPlacement(recipe.contentTemplates.blogPost.coverPlacement);
    setBlogPostExcerptTreatment(
      recipe.contentTemplates.blogPost.excerptTreatment,
    );
    setBlogPostCommentsPlacement(
      recipe.contentTemplates.blogPost.commentsPlacement,
    );
    setBlogPostEditPlacement(
      recipe.contentTemplates.blogPost.editAffordancePlacement,
    );
    setBlogCategoryTemplateVariant(
      recipe.contentTemplates.blogCategory.variant,
    );
    setPageTemplateVariant(recipe.contentTemplates.page.variant);
    setMotionPreference(recipe.motion.motionPreference);
    setBackgroundEffects(recipe.motion.backgroundEffects);
    setHeaderSticky(recipe.shell.header.sticky);
    setFooterSticky(recipe.shell.footer.sticky);
    setStickyHeaderHeight(String(recipe.shell.header.heightPx));
    setStickyFooterHeight(String(recipe.shell.footer.minHeightPx));
    setHeaderShowLogo(brandSlot?.showLogo ?? headerShowLogo);
    setHeaderShowSiteName(brandSlot?.showSiteName ?? headerShowSiteName);
    setHeaderCustomHtmlEnabled(headerHtmlSlot?.enabled ?? false);
    setSiteMenuEnabled(siteMenuSlot?.enabled ?? true);
    setAdminMenuEnabled(adminMenuSlot?.enabled ?? true);
    setAuthControlsEnabled(authControlsSlot?.enabled ?? true);
    setSearchEnabled(searchSlot?.enabled ?? false);
    setSearchPlaceholder(searchSlot?.placeholder ?? "Search");
    setSearchBlogPosts(searchSlot?.contentTypes.includes("blog_post") ?? true);
    setSearchPages(searchSlot?.contentTypes.includes("page") ?? true);
    setHeaderCtaEnabled(headerCtaSlot?.enabled ?? false);
    setHeaderCtaLabel(headerCtaSlot?.label ?? "");
    setHeaderCtaHref(headerCtaSlot?.href ?? "");
    setFooterCustomHtmlEnabled(footerHtmlSlot?.enabled ?? false);
    setCopyrightEnabled(copyrightSlot?.enabled ?? false);
    setFooterLinksEnabled(footerLinksSlot?.enabled ?? false);
    setFooterLinksText(formatLinksText(footerLinksSlot?.links ?? []));
    setLegalLinksEnabled(legalLinksSlot?.enabled ?? false);
    setLegalLinksText(formatLinksText(legalLinksSlot?.links ?? []));
    setSocialLinksEnabled(socialLinksSlot?.enabled ?? false);
    setSocialLinksGenerateSocialIcons(
      socialLinksSlot?.generateSocialIcons ?? false,
    );
    setSocialLinksText(formatLinksText(socialLinksSlot?.links ?? []));
    setFooterCtaEnabled(footerCtaSlot?.enabled ?? false);
    setFooterCtaLabel(footerCtaSlot?.label ?? "");
    setFooterCtaHref(footerCtaSlot?.href ?? "");
    setDraftPresetId(presetId);
  }

  function applyPresetDraft(preset: AppearanceShellPreset) {
    const nextRecipe = applyAppearancePresetToRecipe(draftRecipe, preset);
    syncDraftFromRecipe(nextRecipe, preset.id);
    toast.success(`${preset.name} applied as a draft.`);
  }

  function resetToDraftPreset() {
    const preset =
      APPEARANCE_SHELL_PRESETS.find((item) => item.id === draftPresetId) ??
      APPEARANCE_SHELL_PRESETS[0];
    const nextRecipe = applyAppearancePresetToRecipe(draftRecipe, preset);
    syncDraftFromRecipe(nextRecipe, preset.id);
    toast.success(`${preset.name} structure reset.`);
  }

  async function exportDraftRecipe() {
    const serialized = serializeAppearanceRecipeExport(draftRecipe);
    setRecipePortabilityText(serialized);

    try {
      await navigator.clipboard.writeText(serialized);
      toast.success("Appearance recipe copied.");
    } catch {
      toast.success("Appearance recipe exported.");
    }
  }

  function importDraftRecipe() {
    const parsed = parseAppearanceRecipeExport(recipePortabilityText);
    if (!parsed.success) {
      toast.error(parsed.error);
      return;
    }

    syncDraftFromRecipe(parsed.recipe, inferPresetId(parsed.recipe));
    toast.success("Appearance recipe imported as a draft.");
  }

  function updateAiProvider(
    id: AIProviderId,
    patch: Partial<AiProviderFormState>,
  ) {
    setAiProviders((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...patch,
      },
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) {
      toast.error(
        "You do not currently hold the edit lock. Another admin is editing these settings.",
      );
      return;
    }
    if (!logoBorderColorValid) {
      toast.error("Logo border custom color must be a valid hex value.");
      return;
    }
    if (!backgroundColorsValid || !glowColorsValid) {
      toast.error(
        "Header and footer background and glow colors must be valid hex values.",
      );
      return;
    }
    const parsedMax = clampMinutes(
      maxSessionMinutes,
      MIN_MAX_SESSION_MINUTES,
      MAX_MAX_SESSION_MINUTES,
      SESSION_SECURITY_DEFAULTS.maxSessionDurationMinutes,
    );
    const parsedIdle = clampMinutes(
      idleLogoutMinutesInput,
      MIN_IDLE_MINUTES,
      parsedMax,
      Math.min(SESSION_SECURITY_DEFAULTS.idleLogoutMinutes, parsedMax),
    );
    if (parsedIdle > parsedMax) {
      toast.error("Idle logout cannot exceed max session duration.");
      return;
    }
    if (!aiWritingAssistantSettingsValid) {
      toast.error("AI writing assistant settings are invalid.");
      return;
    }
    if (aiAssistantShownInEditors && enabledAiProviderIds.length === 0) {
      toast.error(
        "Enable at least one AI provider before showing the assistant.",
      );
      return;
    }
    const parsedAiProviders = Object.fromEntries(
      AI_PROVIDER_IDS.map((id) => {
        const provider = aiProviders[id];

        return [
          id,
          {
            enabled: provider.enabled,
            apiKey: provider.apiKey.trim() || undefined,
            clearApiKey: provider.clearApiKey,
            model: provider.model.trim() || AI_PROVIDER_DEFAULT_MODELS[id],
            maxOutputTokens: clampMinutes(
              provider.maxOutputTokens,
              MIN_AI_WRITING_ASSISTANT_MAX_OUTPUT_TOKENS,
              MAX_AI_WRITING_ASSISTANT_MAX_OUTPUT_TOKENS,
              48,
            ),
            instructions: provider.instructions.trim() || null,
          },
        ];
      }),
    ) as Record<
      AIProviderId,
      {
        enabled: boolean;
        apiKey?: string;
        clearApiKey: boolean;
        model: string;
        maxOutputTokens: number;
        instructions: string | null;
      }
    >;
    startTransition(async () => {
      const result = await updateGlobalSettings(
        {
          siteName,
          publicSiteUrl: publicSiteUrl.trim() || null,
          defaultLanguage,
          timezone,
          siteLogoFileId: logoFileId,
          headerContent: headerContent || null,
          footerContent: footerContent || null,
          headerSettings: currentHeaderSettings,
          footerSettings: currentFooterSettings,
          stickyHeaderHeight: currentStickyHeaderHeight,
          stickyFooterHeight: currentStickyFooterHeight,
          maxUploadSizeBytes: (parseInt(maxUploadMB, 10) || 50) * MB,
          maxBatchUploadSizeBytes: (parseInt(maxBatchUploadMB, 10) || 500) * MB,
          ...currentAppearanceSettings,
          appearanceRecipe: draftRecipe,
          aiWritingAssistantEnabled,
          aiPageBuilderAssistantEnabled,
          aiDefaultProvider: effectiveAiDefaultProvider,
          aiProviders: parsedAiProviders,
          maxSessionDurationMinutes: parsedMax,
          idleLogoutMinutes: parsedIdle,
        },
        lock.clientId,
      );

      if ("error" in result) {
        toast.error(result.error);
      } else {
        setAiProviders(
          (current) =>
            Object.fromEntries(
              AI_PROVIDER_IDS.map((id) => {
                const saved = parsedAiProviders[id];
                const keyIsConfigured = saved.clearApiKey
                  ? false
                  : Boolean(saved.apiKey) || current[id].apiKeyConfigured;

                return [
                  id,
                  {
                    ...current[id],
                    enabled: saved.enabled,
                    apiKey: "",
                    clearApiKey: false,
                    model: saved.model,
                    maxOutputTokens: String(saved.maxOutputTokens),
                    instructions: saved.instructions ?? "",
                    apiKeyConfigured: keyIsConfigured,
                  },
                ];
              }),
            ) as AiProviderFormStateById,
        );
        setAiDefaultProvider(effectiveAiDefaultProvider);
        toast.success("Settings saved.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div
        className={cn(
          "fixed right-4 bottom-[calc(var(--sticky-footer-h,0px)+1rem+env(safe-area-inset-bottom,0px))] z-[60] transition-all duration-200 sm:right-6 sm:bottom-[calc(var(--sticky-footer-h,0px)+1.5rem+env(safe-area-inset-bottom,0px))]",
          bottomSaveButtonVisible
            ? "pointer-events-none translate-y-3 opacity-0"
            : "translate-y-0 opacity-100",
        )}
        aria-hidden={bottomSaveButtonVisible}
      >
        <Button
          type="submit"
          size="lg"
          disabled={settingsSaveDisabled}
          className="h-11 rounded-full px-4 shadow-lg shadow-black/15"
          aria-label={isPending ? "Saving settings" : "Save settings"}
        >
          <Save aria-hidden className="h-4 w-4" />
          <span className="hidden sm:inline">
            {isPending ? "Saving…" : "Save changes"}
          </span>
          <span className="sm:hidden">{isPending ? "Saving…" : "Save"}</span>
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="layout-design">Layout &amp; Design</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {/* ── Site ── */}
          <Card>
            <CardHeader>
              <CardTitle>Site Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  maxLength={120}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="publicSiteUrl">Public site URL</Label>
                <Input
                  id="publicSiteUrl"
                  type="url"
                  value={publicSiteUrl}
                  onChange={(e) => setPublicSiteUrl(e.target.value)}
                  onBlur={(e) => setPublicSiteUrl(e.target.value.trim())}
                  placeholder="https://example.com"
                  maxLength={2048}
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Regional ── */}
          <Card>
            <CardHeader>
              <CardTitle>Regional Settings</CardTitle>
              <CardDescription>
                Single-site locale and timezone for language metadata and date
                display.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <SearchableSelect
                id="defaultLanguage"
                label="Default language"
                value={defaultLanguage}
                options={SUPPORTED_LOCALES.map((locale) => ({
                  value: locale.code,
                  label: locale.label,
                }))}
                placeholder="Select locale"
                searchPlaceholder="Search locales..."
                onChange={setDefaultLanguage}
              />
              <SearchableSelect
                id="timezone"
                label="Timezone"
                value={timezone}
                options={SUPPORTED_TIMEZONES.map((tz) => ({
                  value: tz,
                  label: tz,
                }))}
                placeholder="Select timezone"
                searchPlaceholder="Search timezones..."
                onChange={setTimezone}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="layout-design" className="space-y-4">
          <Tabs defaultValue="header" className="space-y-4">
            <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
              <TabsTrigger value="header">Header</TabsTrigger>
              <TabsTrigger value="footer">Footer</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
            </TabsList>

            <TabsContent value="header" className="space-y-6">
              {/* ── Header ── */}
              <Card>
                <CardHeader>
                  <CardTitle>Header Settings</CardTitle>
                  <CardDescription>
                    Choose a curated header layout and enable structured slots.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="headerVariant">Header Variant</Label>
                    <Select
                      value={headerVariant}
                      onValueChange={(v) =>
                        setHeaderVariant(v as HeaderVariant)
                      }
                    >
                      <SelectTrigger id="headerVariant">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HEADER_VARIANTS.map((variant) => (
                          <SelectItem key={variant} value={variant}>
                            {HEADER_VARIANT_LABELS[variant]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <HeaderVariantPreview variant={headerVariant} />
                  </div>
                  <div className="space-y-2">
                    <Label>Site Logo</Label>
                    <div className="flex items-center gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-md border bg-muted overflow-hidden shrink-0">
                        {logoFileId ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/files/${logoFileId}`}
                            alt={logoFilename ?? "Site logo"}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <ImageIcon
                            className="h-6 w-6 text-muted-foreground"
                            aria-hidden
                          />
                        )}
                      </div>
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPickerOpen(true)}
                          >
                            {logoFileId
                              ? "Change logo…"
                              : "Choose from File Manager…"}
                          </Button>
                          {logoFileId && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setLogoFileId(null);
                                setLogoFilename(null);
                                setHeaderShowLogo(false);
                              }}
                            >
                              <X className="mr-1 h-4 w-4" /> Remove
                            </Button>
                          )}
                        </div>
                        {logoFilename && (
                          <p className="text-xs text-muted-foreground truncate">
                            {logoFilename}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="headerShowLogo">Show Logo</Label>
                    <Switch
                      id="headerShowLogo"
                      checked={headerShowLogo}
                      onCheckedChange={setHeaderShowLogo}
                    />
                  </div>
                  <div className="space-y-3 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="logoBorderEnabled">
                        Enable logo border
                      </Label>
                      <Switch
                        id="logoBorderEnabled"
                        checked={logoBorderEnabled}
                        onCheckedChange={setLogoBorderEnabled}
                      />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="logoBorderShape">
                          Logo border shape
                        </Label>
                        <Select
                          value={logoBorderShape}
                          onValueChange={(v) =>
                            setLogoBorderShape(
                              v as (typeof LOGO_BORDER_SHAPES)[number],
                            )
                          }
                          disabled={!logoBorderEnabled}
                        >
                          <SelectTrigger id="logoBorderShape">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LOGO_BORDER_SHAPES.map((shape) => (
                              <SelectItem key={shape} value={shape}>
                                {LOGO_BORDER_SHAPE_LABELS[shape]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="logoBorderColorMode">
                          Logo border color
                        </Label>
                        <Select
                          value={logoBorderColorMode}
                          onValueChange={(v) => {
                            const mode =
                              v as (typeof LOGO_BORDER_COLOR_MODES)[number];
                            setLogoBorderColorMode(mode);
                            if (
                              mode === "custom" &&
                              !normalizeOptionalHexColor(logoBorderColor)
                            ) {
                              setLogoBorderColor("#ffffff");
                            }
                          }}
                          disabled={!logoBorderEnabled}
                        >
                          <SelectTrigger id="logoBorderColorMode">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LOGO_BORDER_COLOR_MODES.map((mode) => (
                              <SelectItem key={mode} value={mode}>
                                {LOGO_BORDER_COLOR_MODE_LABELS[mode]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {logoBorderColorMode === "custom" && (
                      <div className="space-y-1.5">
                        <Label htmlFor="logoBorderColor">
                          Custom logo border color
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="logoBorderColor"
                            type="color"
                            value={getColorPickerValue(logoBorderColor)}
                            onChange={(e) => setLogoBorderColor(e.target.value)}
                            disabled={!logoBorderEnabled}
                            className="h-9 w-14 p-1"
                          />
                          <Input
                            type="text"
                            value={logoBorderColor}
                            onChange={(e) => setLogoBorderColor(e.target.value)}
                            onBlur={(e) =>
                              setLogoBorderColor(e.target.value.trim())
                            }
                            disabled={!logoBorderEnabled}
                            placeholder="#ffffff"
                            maxLength={7}
                            aria-invalid={!logoBorderColorValid || undefined}
                          />
                        </div>
                        {!logoBorderColorValid && (
                          <p className="text-xs text-destructive">
                            Enter a valid hex color like #fff or #ffffff.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="headerShowSiteName">Show Site Name</Label>
                    <Switch
                      id="headerShowSiteName"
                      checked={headerShowSiteName}
                      onCheckedChange={setHeaderShowSiteName}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="headerSticky">Sticky Header</Label>
                    <Switch
                      id="headerSticky"
                      checked={headerSticky}
                      onCheckedChange={setHeaderSticky}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="stickyHeaderHeight">
                      Header Height (px)
                    </Label>
                    <Input
                      id="stickyHeaderHeight"
                      type="number"
                      min={0}
                      max={400}
                      value={stickyHeaderHeight}
                      onChange={(e) => setStickyHeaderHeight(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="headerBackground">
                      Background Color (hex, optional)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="headerBackground"
                        type="color"
                        value={getColorPickerValue(headerBackground)}
                        onChange={(e) => setHeaderBackground(e.target.value)}
                        className="h-9 w-14 p-1"
                      />
                      <Input
                        type="text"
                        value={headerBackground}
                        onChange={(e) => setHeaderBackground(e.target.value)}
                        onBlur={(e) =>
                          setHeaderBackground(e.target.value.trim())
                        }
                        placeholder="#ffffff"
                        maxLength={7}
                        aria-invalid={!headerBackgroundValid || undefined}
                      />
                    </div>
                    {!headerBackgroundValid && (
                      <p className="text-xs text-destructive">
                        Enter a valid hex color like #fff or #ffffff, or leave
                        it blank.
                      </p>
                    )}
                  </div>
                  <GlowFields
                    idPrefix="header"
                    value={headerGlow}
                    colorValid={headerGlowColorValid}
                    onChange={setHeaderGlow}
                  />
                  <div className="space-y-3 rounded-md border p-3">
                    <div>
                      <h3 className="text-sm font-medium">Header Slots</h3>
                      <p className="text-xs text-muted-foreground">
                        These controls enable curated, validated shell pieces.
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="siteMenuEnabled">Site Menu</Label>
                        <Switch
                          id="siteMenuEnabled"
                          checked={siteMenuEnabled}
                          onCheckedChange={setSiteMenuEnabled}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="adminMenuEnabled">Admin Menu</Label>
                        <Switch
                          id="adminMenuEnabled"
                          checked={adminMenuEnabled}
                          onCheckedChange={setAdminMenuEnabled}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="authControlsEnabled">
                          Auth Controls
                        </Label>
                        <Switch
                          id="authControlsEnabled"
                          checked={authControlsEnabled}
                          onCheckedChange={setAuthControlsEnabled}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="headerCustomHtmlEnabled">
                          CustomHtml Slot
                        </Label>
                        <Switch
                          id="headerCustomHtmlEnabled"
                          checked={headerCustomHtmlEnabled}
                          onCheckedChange={setHeaderCustomHtmlEnabled}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="searchEnabled">Search Slot</Label>
                        <Switch
                          id="searchEnabled"
                          checked={searchEnabled}
                          onCheckedChange={setSearchEnabled}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="headerCtaEnabled">CTA Slot</Label>
                        <Switch
                          id="headerCtaEnabled"
                          checked={headerCtaEnabled}
                          onCheckedChange={setHeaderCtaEnabled}
                        />
                      </div>
                    </div>
                    {searchEnabled && (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="searchPlaceholder">
                            Search Placeholder
                          </Label>
                          <Input
                            id="searchPlaceholder"
                            value={searchPlaceholder}
                            onChange={(e) =>
                              setSearchPlaceholder(e.target.value)
                            }
                            maxLength={80}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Search Content</Label>
                          <div className="flex flex-wrap gap-4 rounded-lg border border-border/70 px-3 py-2.5">
                            <label
                              htmlFor="searchBlogPosts"
                              className="flex cursor-pointer items-center gap-2 text-sm"
                            >
                              <Checkbox
                                id="searchBlogPosts"
                                checked={searchBlogPosts}
                                onCheckedChange={(checked) =>
                                  setSearchBlogPosts(checked === true)
                                }
                              />
                              <span>Search blog posts</span>
                            </label>
                            <label
                              htmlFor="searchPages"
                              className="flex cursor-pointer items-center gap-2 text-sm"
                            >
                              <Checkbox
                                id="searchPages"
                                checked={searchPages}
                                onCheckedChange={(checked) =>
                                  setSearchPages(checked === true)
                                }
                              />
                              <span>Search pages</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                    {headerCtaEnabled && (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="headerCtaLabel">
                            Header CTA Label
                          </Label>
                          <Input
                            id="headerCtaLabel"
                            value={headerCtaLabel}
                            onChange={(e) => setHeaderCtaLabel(e.target.value)}
                            maxLength={80}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="headerCtaHref">Header CTA URL</Label>
                          <Input
                            id="headerCtaHref"
                            value={headerCtaHref}
                            onChange={(e) => setHeaderCtaHref(e.target.value)}
                            maxLength={300}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Header CustomHtml (expert)</Label>
                    <FooterContentEditor
                      value={headerContent}
                      onChange={setHeaderContent}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="footer" className="space-y-6">
              {/* ── Footer ── */}
              <Card>
                <CardHeader>
                  <CardTitle>Footer Settings</CardTitle>
                  <CardDescription>
                    Select a curated footer layout and structured footer slots.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="footerVariant">Footer Variant</Label>
                    <Select
                      value={footerVariant}
                      onValueChange={(v) =>
                        setFooterVariant(v as FooterVariant)
                      }
                    >
                      <SelectTrigger id="footerVariant">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FOOTER_VARIANTS.map((variant) => (
                          <SelectItem key={variant} value={variant}>
                            {FOOTER_VARIANT_LABELS[variant]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FooterVariantPreview variant={footerVariant} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="footerShowLogo">Show Logo</Label>
                    <Switch
                      id="footerShowLogo"
                      checked={footerShowLogo}
                      onCheckedChange={setFooterShowLogo}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="footerSticky">Sticky Footer</Label>
                    <Switch
                      id="footerSticky"
                      checked={footerSticky}
                      onCheckedChange={setFooterSticky}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="stickyFooterHeight">
                      Footer Height (px)
                    </Label>
                    <Input
                      id="stickyFooterHeight"
                      type="number"
                      min={0}
                      max={400}
                      value={stickyFooterHeight}
                      onChange={(e) => setStickyFooterHeight(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="footerBackground">
                      Background Color (hex, optional)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="footerBackground"
                        type="color"
                        value={getColorPickerValue(footerBackground)}
                        onChange={(e) => setFooterBackground(e.target.value)}
                        className="h-9 w-14 p-1"
                      />
                      <Input
                        type="text"
                        value={footerBackground}
                        onChange={(e) => setFooterBackground(e.target.value)}
                        onBlur={(e) =>
                          setFooterBackground(e.target.value.trim())
                        }
                        placeholder="#ffffff"
                        maxLength={7}
                        aria-invalid={!footerBackgroundValid || undefined}
                      />
                    </div>
                    {!footerBackgroundValid && (
                      <p className="text-xs text-destructive">
                        Enter a valid hex color like #fff or #ffffff, or leave
                        it blank.
                      </p>
                    )}
                  </div>
                  <GlowFields
                    idPrefix="footer"
                    value={footerGlow}
                    colorValid={footerGlowColorValid}
                    onChange={setFooterGlow}
                  />
                  <div className="space-y-3 rounded-md border p-3">
                    <div>
                      <h3 className="text-sm font-medium">Footer Slots</h3>
                      <p className="text-xs text-muted-foreground">
                        Link slots use one item per line in the form: Label |
                        URL.
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="footerCustomHtmlEnabled">
                          CustomHtml Slot
                        </Label>
                        <Switch
                          id="footerCustomHtmlEnabled"
                          checked={footerCustomHtmlEnabled}
                          onCheckedChange={setFooterCustomHtmlEnabled}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="copyrightEnabled">Copyright Slot</Label>
                        <Switch
                          id="copyrightEnabled"
                          checked={copyrightEnabled}
                          onCheckedChange={setCopyrightEnabled}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="footerLinksEnabled">Footer Links</Label>
                        <Switch
                          id="footerLinksEnabled"
                          checked={footerLinksEnabled}
                          onCheckedChange={setFooterLinksEnabled}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="legalLinksEnabled">Legal Links</Label>
                        <Switch
                          id="legalLinksEnabled"
                          checked={legalLinksEnabled}
                          onCheckedChange={setLegalLinksEnabled}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="socialLinksEnabled">Social Links</Label>
                        <Switch
                          id="socialLinksEnabled"
                          checked={socialLinksEnabled}
                          onCheckedChange={setSocialLinksEnabled}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="footerCtaEnabled">CTA Slot</Label>
                        <Switch
                          id="footerCtaEnabled"
                          checked={footerCtaEnabled}
                          onCheckedChange={setFooterCtaEnabled}
                        />
                      </div>
                    </div>
                    {footerLinksEnabled && (
                      <div className="space-y-1.5">
                        <Label htmlFor="footerLinksText">Footer Links</Label>
                        <Textarea
                          id="footerLinksText"
                          rows={3}
                          value={footerLinksText}
                          onChange={(e) => setFooterLinksText(e.target.value)}
                          maxLength={2000}
                        />
                      </div>
                    )}
                    {legalLinksEnabled && (
                      <div className="space-y-1.5">
                        <Label htmlFor="legalLinksText">Legal Links</Label>
                        <Textarea
                          id="legalLinksText"
                          rows={3}
                          value={legalLinksText}
                          onChange={(e) => setLegalLinksText(e.target.value)}
                          maxLength={2000}
                        />
                      </div>
                    )}
                    {socialLinksEnabled && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between rounded-md border p-3">
                          <Label htmlFor="socialLinksGenerateSocialIcons">
                            Generate Social Link Icons
                          </Label>
                          <Switch
                            id="socialLinksGenerateSocialIcons"
                            checked={socialLinksGenerateSocialIcons}
                            onCheckedChange={setSocialLinksGenerateSocialIcons}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="socialLinksText">Social Links</Label>
                          <Textarea
                            id="socialLinksText"
                            rows={3}
                            value={socialLinksText}
                            onChange={(e) => setSocialLinksText(e.target.value)}
                            maxLength={2000}
                          />
                        </div>
                      </div>
                    )}
                    {footerCtaEnabled && (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="footerCtaLabel">
                            Footer CTA Label
                          </Label>
                          <Input
                            id="footerCtaLabel"
                            value={footerCtaLabel}
                            onChange={(e) => setFooterCtaLabel(e.target.value)}
                            maxLength={80}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="footerCtaHref">Footer CTA URL</Label>
                          <Input
                            id="footerCtaHref"
                            value={footerCtaHref}
                            onChange={(e) => setFooterCtaHref(e.target.value)}
                            maxLength={300}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="footerCopyright">
                      Copyright Text (optional)
                    </Label>
                    <Input
                      id="footerCopyright"
                      value={footerCopyright}
                      onChange={(e) => setFooterCopyright(e.target.value)}
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Footer CustomHtml (expert)</Label>
                    <FooterContentEditor
                      value={footerContent}
                      onChange={setFooterContent}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-6">
              {/* ── Appearance ── */}
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>
                    Build a draft shell with presets, slot controls, and
                    responsive preview before saving.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <Label>Shell Presets</Label>
                        <p className="text-xs text-muted-foreground">
                          Presets update the draft recipe while keeping
                          identity, menus, and content.
                        </p>
                        <div className="mt-3 flex gap-3 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
                          <Info
                            className="mt-0.5 h-4 w-4 shrink-0"
                            aria-hidden
                          />
                          <p>
                            Presets are starting points. Mix Theme, content
                            widths, font, radius, shadow, main surface, and
                            content templates to shape the public pages and blog
                            posts exactly how you want.
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={resetToDraftPreset}
                      >
                        <RotateCcw aria-hidden />
                        Reset to preset
                      </Button>
                    </div>
                    <PresetCards
                      selectedId={draftPresetId}
                      onApply={applyPresetDraft}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="appearance-theme">Theme</Label>
                      <Select
                        value={theme}
                        onValueChange={(v) => setTheme(v as Theme)}
                      >
                        <SelectTrigger id="appearance-theme">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {THEMES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="mainVariant">Main Surface Variant</Label>
                      <Select
                        value={mainVariant}
                        onValueChange={(v) =>
                          setMainVariant(v as MainSurfaceVariant)
                        }
                      >
                        <SelectTrigger id="mainVariant">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MAIN_SURFACE_VARIANTS.map((variant) => (
                            <SelectItem key={variant} value={variant}>
                              {MAIN_VARIANT_LABELS[variant]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <ContentWidthField
                      id="appearance-frontend-width"
                      label="Frontend Content Width"
                      value={frontendContentWidth}
                      onChange={setFrontendContentWidth}
                    />

                    <ContentWidthField
                      id="appearance-backend-width"
                      label="Backend Content Width"
                      value={backendContentWidth}
                      onChange={setBackendContentWidth}
                    />

                    <div className="space-y-1.5">
                      <Label htmlFor="appearance-font">Font Preset</Label>
                      <Select
                        value={fontPreset}
                        onValueChange={(v) => setFontPreset(v as FontPreset)}
                      >
                        <SelectTrigger id="appearance-font">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_PRESETS.map((f) => (
                            <SelectItem key={f} value={f}>
                              {f}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="appearance-radius">Border Radius</Label>
                      <Select
                        value={radiusPreset}
                        onValueChange={(v) =>
                          setRadiusPreset(v as RadiusPreset)
                        }
                      >
                        <SelectTrigger id="appearance-radius">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RADIUS_PRESETS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="appearance-shadow">Shadow Preset</Label>
                      <Select
                        value={shadowPreset}
                        onValueChange={(v) =>
                          setShadowPreset(v as ShadowPreset)
                        }
                      >
                        <SelectTrigger id="appearance-shadow">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SHADOW_PRESETS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-md border p-3">
                    <div>
                      <Label>Content Templates</Label>
                      <p className="text-xs text-muted-foreground">
                        Global template selections for public content surfaces.
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="pageTemplateVariant">
                          Page Template
                        </Label>
                        <Select
                          value={pageTemplateVariant}
                          onValueChange={(v) =>
                            setPageTemplateVariant(v as PageTemplateVariant)
                          }
                        >
                          <SelectTrigger id="pageTemplateVariant">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAGE_TEMPLATE_VARIANTS.map((variant) => (
                              <SelectItem key={variant} value={variant}>
                                {PAGE_TEMPLATE_LABELS[variant]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="blogCategoryTemplateVariant">
                          Blog Category Template
                        </Label>
                        <Select
                          value={blogCategoryTemplateVariant}
                          onValueChange={(v) =>
                            setBlogCategoryTemplateVariant(
                              v as BlogCategoryTemplateVariant,
                            )
                          }
                        >
                          <SelectTrigger id="blogCategoryTemplateVariant">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BLOG_CATEGORY_TEMPLATE_VARIANTS.map((variant) => (
                              <SelectItem key={variant} value={variant}>
                                {BLOG_CATEGORY_TEMPLATE_LABELS[variant]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="blogPostMetadataTreatment">
                          Blog Post Metadata
                        </Label>
                        <Select
                          value={blogPostMetadataTreatment}
                          onValueChange={(v) =>
                            setBlogPostMetadataTreatment(
                              v as BlogPostMetadataTreatment,
                            )
                          }
                        >
                          <SelectTrigger id="blogPostMetadataTreatment">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BLOG_POST_METADATA_TREATMENTS.map((treatment) => (
                              <SelectItem key={treatment} value={treatment}>
                                {BLOG_POST_METADATA_LABELS[treatment]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="blogPostCoverPlacement">
                          Blog Post Cover
                        </Label>
                        <Select
                          value={blogPostCoverPlacement}
                          onValueChange={(v) =>
                            setBlogPostCoverPlacement(
                              v as BlogPostCoverPlacement,
                            )
                          }
                        >
                          <SelectTrigger id="blogPostCoverPlacement">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BLOG_POST_COVER_PLACEMENTS.map((placement) => (
                              <SelectItem key={placement} value={placement}>
                                {BLOG_POST_COVER_LABELS[placement]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="blogPostExcerptTreatment">
                          Blog Post Excerpt
                        </Label>
                        <Select
                          value={blogPostExcerptTreatment}
                          onValueChange={(v) =>
                            setBlogPostExcerptTreatment(
                              v as BlogPostExcerptTreatment,
                            )
                          }
                        >
                          <SelectTrigger id="blogPostExcerptTreatment">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BLOG_POST_EXCERPT_TREATMENTS.map((treatment) => (
                              <SelectItem key={treatment} value={treatment}>
                                {BLOG_POST_EXCERPT_LABELS[treatment]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="blogPostCommentsPlacement">
                          Blog Post Comments
                        </Label>
                        <Select
                          value={blogPostCommentsPlacement}
                          onValueChange={(v) =>
                            setBlogPostCommentsPlacement(
                              v as BlogPostCommentsPlacement,
                            )
                          }
                        >
                          <SelectTrigger id="blogPostCommentsPlacement">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BLOG_POST_COMMENTS_PLACEMENTS.map((placement) => (
                              <SelectItem key={placement} value={placement}>
                                {BLOG_POST_COMMENTS_LABELS[placement]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="blogPostEditPlacement">
                          Blog Post Edit Link
                        </Label>
                        <Select
                          value={blogPostEditPlacement}
                          onValueChange={(v) =>
                            setBlogPostEditPlacement(
                              v as BlogPostEditAffordancePlacement,
                            )
                          }
                        >
                          <SelectTrigger id="blogPostEditPlacement">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BLOG_POST_EDIT_AFFORDANCE_PLACEMENTS.map(
                              (placement) => (
                                <SelectItem key={placement} value={placement}>
                                  {BLOG_POST_EDIT_LABELS[placement]}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-md border p-3">
                    <div>
                      <Label>Motion & Effects</Label>
                      <p className="text-xs text-muted-foreground">
                        Recipe-level motion policy for animation and background
                        effects.
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="motionPreference">
                          Motion Preference
                        </Label>
                        <Select
                          value={motionPreference}
                          onValueChange={(v) =>
                            setMotionPreference(v as AppearanceMotionPreference)
                          }
                        >
                          <SelectTrigger id="motionPreference">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {APPEARANCE_MOTION_PREFERENCES.map((preference) => (
                              <SelectItem key={preference} value={preference}>
                                {MOTION_PREFERENCE_LABELS[preference]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="backgroundEffects">
                          Background Effects
                        </Label>
                        <Select
                          value={backgroundEffects}
                          onValueChange={(v) =>
                            setBackgroundEffects(
                              v as AppearanceBackgroundEffects,
                            )
                          }
                        >
                          <SelectTrigger id="backgroundEffects">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {APPEARANCE_BACKGROUND_EFFECTS.map((effect) => (
                              <SelectItem key={effect} value={effect}>
                                {BACKGROUND_EFFECTS_LABELS[effect]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <Label>Quality Gates</Label>
                        <p className="text-xs text-muted-foreground">
                          Checks run across desktop, tablet, mobile, and auth
                          states.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant={
                            qualityErrorCount > 0 ? "destructive" : "secondary"
                          }
                        >
                          <ShieldCheck aria-hidden />
                          {qualityErrorCount} errors
                        </Badge>
                        <Badge variant="outline">
                          {qualityWarningCount} warnings
                        </Badge>
                      </div>
                    </div>
                    {qualityIssues.length > 0 ? (
                      <ul className="space-y-2 text-sm">
                        {qualityIssues.slice(0, 5).map((issue) => (
                          <li
                            key={`${issue.code}:${issue.scenario?.viewport ?? "global"}:${issue.scenario?.authState ?? "global"}`}
                            className="flex gap-2 text-muted-foreground"
                          >
                            <span
                              className={cn(
                                "mt-1 size-2 shrink-0 rounded-full",
                                issue.severity === "error"
                                  ? "bg-destructive"
                                  : "bg-muted-foreground",
                              )}
                              aria-hidden
                            />
                            <span>{issue.message}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No quality gate issues detected.
                      </p>
                    )}
                  </div>

                  <div className="space-y-4 rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <Label htmlFor="recipePortabilityText">
                          Appearance Recipe JSON
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Portable recipe data. Imported HTML slots are
                          disabled.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={exportDraftRecipe}
                        >
                          <Download aria-hidden />
                          Export
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={importDraftRecipe}
                          disabled={recipePortabilityText.trim().length === 0}
                        >
                          <Upload aria-hidden />
                          Import Draft
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      id="recipePortabilityText"
                      rows={8}
                      value={recipePortabilityText}
                      onChange={(e) => setRecipePortabilityText(e.target.value)}
                      spellCheck={false}
                      className="font-mono text-xs"
                    />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setRecipePortabilityText("");
                          toast.message("Appearance recipe JSON cleared.");
                        }}
                      >
                        <Clipboard aria-hidden />
                        Clear
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label>Shell Preview</Label>
                      <Badge variant="outline">
                        {previewAppearance.frontendContainerMaxWidth}
                      </Badge>
                    </div>
                    <ShellPreview
                      recipe={draftRecipe}
                      appearance={previewAppearance}
                      siteName={siteName}
                      logoFileId={logoFileId}
                      logoBorderEnabled={logoBorderEnabled}
                      logoBorderColorMode={logoBorderColorMode}
                      logoBorderColor={normalizeOptionalHexColor(
                        logoBorderColor,
                      )}
                      logoBorderShape={logoBorderShape}
                    />
                    <p className="text-xs text-muted-foreground">
                      Preview reflects current selections only. Save changes to
                      apply site-wide.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Bot aria-hidden className="h-5 w-5" />
                  AI Settings
                </CardTitle>
                <CardDescription>
                  Configure provider access for editor AI assistants.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="ai-writing-assistant-enabled">
                      Show in blog editor
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Controls the visibility of the AI Writing Assistant UI.
                    </p>
                  </div>
                  <Switch
                    id="ai-writing-assistant-enabled"
                    checked={aiWritingAssistantEnabled}
                    onCheckedChange={setAiWritingAssistantEnabled}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="ai-page-builder-assistant-enabled">
                      Show in page builder
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Controls the visibility of the page builder AI Assistant
                      UI.
                    </p>
                  </div>
                  <Switch
                    id="ai-page-builder-assistant-enabled"
                    checked={aiPageBuilderAssistantEnabled}
                    onCheckedChange={setAiPageBuilderAssistantEnabled}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label>Providers</Label>
                  <Badge variant="outline">
                    {enabledAiProviderIds.length} enabled
                  </Badge>
                </div>

                <Tabs defaultValue="openai" className="space-y-4">
                  <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
                    {AI_PROVIDER_IDS.map((providerId) => (
                      <TabsTrigger key={providerId} value={providerId}>
                        {AI_PROVIDER_LABELS[providerId]}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {AI_PROVIDER_IDS.map((providerId) => {
                    const provider = aiProviders[providerId];
                    const providerLabel = AI_PROVIDER_LABELS[providerId];
                    const maxOutputTokensNum = parseInt(
                      provider.maxOutputTokens,
                      10,
                    );
                    const modelOptions = getAiProviderModelOptions(
                      providerId,
                      provider.model,
                    );
                    const apiKeyConfigured =
                      provider.apiKeyConfigured && !provider.clearApiKey;

                    return (
                      <TabsContent
                        key={providerId}
                        value={providerId}
                        className="space-y-5 rounded-md border p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <Label htmlFor={`${providerId}-enabled`}>
                              Enabled
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Authors can use {providerLabel} when enabled.
                            </p>
                          </div>
                          <Switch
                            id={`${providerId}-enabled`}
                            checked={provider.enabled}
                            onCheckedChange={(enabled) =>
                              updateAiProvider(providerId, { enabled })
                            }
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor={`${providerId}-api-key`}>
                            API key
                          </Label>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Input
                              id={`${providerId}-api-key`}
                              type="password"
                              value={provider.apiKey}
                              onChange={(e) => {
                                updateAiProvider(providerId, {
                                  apiKey: e.target.value,
                                  clearApiKey: e.target.value.trim()
                                    ? false
                                    : provider.clearApiKey,
                                });
                              }}
                              placeholder={
                                apiKeyConfigured
                                  ? "Configured - leave blank to keep current key"
                                  : "Paste API key"
                              }
                              disabled={provider.clearApiKey}
                              aria-invalid={
                                provider.apiKey.trim().length > 0 &&
                                (provider.apiKey.trim().length < 20 ||
                                  provider.apiKey.trim().length > 512 ||
                                  undefined)
                              }
                            />
                            <Badge
                              variant={
                                apiKeyConfigured ? "secondary" : "outline"
                              }
                              className="h-10 justify-center gap-2 px-3"
                            >
                              <KeyRound aria-hidden className="h-4 w-4" />
                              {apiKeyConfigured
                                ? "Configured"
                                : "Not configured"}
                            </Badge>
                          </div>
                          {provider.apiKeyConfigured && (
                            <label className="flex items-center gap-2 pt-1 text-sm">
                              <Checkbox
                                checked={provider.clearApiKey}
                                onCheckedChange={(checked) =>
                                  updateAiProvider(providerId, {
                                    clearApiKey: Boolean(checked),
                                    apiKey: checked ? "" : provider.apiKey,
                                  })
                                }
                              />
                              <span>
                                Clear saved {providerLabel} API key on save
                              </span>
                            </label>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor={`${providerId}-model`}>Model</Label>
                          <Select
                            value={provider.model}
                            onValueChange={(model) =>
                              updateAiProvider(providerId, { model })
                            }
                          >
                            <SelectTrigger id={`${providerId}-model`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {modelOptions.map((model) => (
                                <SelectItem key={model.id} value={model.id}>
                                  {model.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label htmlFor={`${providerId}-max-tokens`}>
                              Max suggestion tokens
                            </Label>
                            <Input
                              id={`${providerId}-max-tokens`}
                              type="number"
                              min={MIN_AI_WRITING_ASSISTANT_MAX_OUTPUT_TOKENS}
                              max={MAX_AI_WRITING_ASSISTANT_MAX_OUTPUT_TOKENS}
                              value={provider.maxOutputTokens}
                              onChange={(e) =>
                                updateAiProvider(providerId, {
                                  maxOutputTokens: e.target.value,
                                })
                              }
                              aria-invalid={
                                !Number.isFinite(maxOutputTokensNum) ||
                                maxOutputTokensNum <
                                  MIN_AI_WRITING_ASSISTANT_MAX_OUTPUT_TOKENS ||
                                maxOutputTokensNum >
                                  MAX_AI_WRITING_ASSISTANT_MAX_OUTPUT_TOKENS ||
                                undefined
                              }
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor={`${providerId}-instructions`}>
                            Custom instructions
                          </Label>
                          <Textarea
                            id={`${providerId}-instructions`}
                            rows={5}
                            value={provider.instructions}
                            onChange={(e) =>
                              updateAiProvider(providerId, {
                                instructions: e.target.value,
                              })
                            }
                            placeholder="Optional tone, language, or editorial guidance for blog post suggestions."
                            aria-invalid={
                              provider.instructions.trim().length > 2_000 ||
                              undefined
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            {provider.instructions.trim().length}/2000
                            characters
                          </p>
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ai-default-provider">Default Provider</Label>
                <Select
                  value={effectiveAiDefaultProvider}
                  onValueChange={(value) =>
                    setAiDefaultProvider(value as AIProviderId)
                  }
                  disabled={enabledAiProviderIds.length === 0}
                >
                  <SelectTrigger id="ai-default-provider">
                    <SelectValue placeholder="Enable a provider first" />
                  </SelectTrigger>
                  <SelectContent>
                    {enabledAiProviderIds.map((providerId) => (
                      <SelectItem key={providerId} value={providerId}>
                        {AI_PROVIDER_LABELS[providerId]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {aiAssistantShownInEditors &&
                enabledAiProviderIds.length === 0 && (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
                    Enable at least one provider before showing the assistant in
                    editors.
                  </div>
                )}

              {aiAssistantShownInEditors &&
                enabledAiProviderIds.length > 0 &&
                (() => {
                  const providerId = effectiveAiDefaultProvider;
                  const provider = aiProviders[providerId];
                  const hasKey =
                    provider.apiKey.trim().length > 0 ||
                    (provider.apiKeyConfigured && !provider.clearApiKey);

                  return hasKey ? null : (
                    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
                      The assistant toggle will be visible after save, but
                      suggestions need a {AI_PROVIDER_LABELS[providerId]} API
                      key.
                    </div>
                  );
                })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          {/* ── Uploads ── */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="maxUploadMB">
                  Max Per-File Upload Size (MB)
                </Label>
                <Input
                  id="maxUploadMB"
                  type="number"
                  min={1}
                  value={maxUploadMB}
                  onChange={(e) => setMaxUploadMB(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {(parseInt(maxUploadMB, 10) || 0) * MB} bytes
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="maxBatchUploadMB">
                  Max Batch Upload Size (MB)
                </Label>
                <Input
                  id="maxBatchUploadMB"
                  type="number"
                  min={1}
                  value={maxBatchUploadMB}
                  onChange={(e) => setMaxBatchUploadMB(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {(parseInt(maxBatchUploadMB, 10) || 0) * MB} bytes
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ── Session Security ── */}
          <SessionSecurityCard
            maxSessionMinutes={maxSessionMinutes}
            setMaxSessionMinutes={setMaxSessionMinutes}
            idleLogoutMinutes={idleLogoutMinutesInput}
            setIdleLogoutMinutes={setIdleLogoutMinutesInput}
          />
        </TabsContent>
      </Tabs>

      <div ref={bottomSaveButtonRef}>
        <Button type="submit" disabled={settingsSaveDisabled}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <LogoPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selectedId={logoFileId}
        onSelect={(file) => {
          setLogoFileId(file.id);
          setLogoFilename(file.filename);
          setHeaderShowLogo(true);
        }}
      />
    </form>
  );
}
