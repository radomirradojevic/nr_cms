"use client";

import { Monitor, Smartphone, Tablet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  APPEARANCE_SHELL_PRESETS,
  type AppearancePresetId,
  type AppearanceRecipe,
  type AppearanceShellPreset,
  type AppearanceSlotV1,
} from "@/lib/appearance-recipe";
import { cssVarsToInlineStyle, resolveAppearance } from "@/lib/appearance";
import { cn } from "@/lib/utils";
import { useSourceTranslations } from "@/components/source-translations";

function findRecipeSlot<T extends AppearanceSlotV1["type"]>(
  slots: AppearanceSlotV1[],
  type: T,
  id?: string,
): Extract<AppearanceSlotV1, { type: T }> | null {
  return (slots.find((slot) => slot.type === type && (!id || slot.id === id)) ??
    null) as Extract<AppearanceSlotV1, { type: T }> | null;
}

function getSlot<T extends AppearanceSlotV1["type"]>(
  recipe: AppearanceRecipe,
  region: "header" | "footer",
  type: T,
  id?: string,
): Extract<AppearanceSlotV1, { type: T }> | null {
  return findRecipeSlot(recipe.shell[region].slots, type, id);
}

type PresetHeaderVariant = AppearanceShellPreset["header"]["variant"];
type PresetMainVariant = AppearanceShellPreset["main"]["variant"];
type PresetFooterVariant = AppearanceShellPreset["footer"]["variant"];

const PRESET_HEADER_LABELS: Record<PresetHeaderVariant, string> = {
  classic: "Classic",
  centered: "Centered",
  split: "Split",
  "compact-app": "Compact App",
  "editorial-masthead": "Editorial",
  minimal: "Minimal",
};

const PRESET_MAIN_LABELS: Record<PresetMainVariant, string> = {
  normal: "Normal",
  framed: "Framed",
  "full-bleed-builder": "Full Bleed",
  "editorial-article": "Article",
  "category-grid": "Category Grid",
};

const PRESET_FOOTER_LABELS: Record<PresetFooterVariant, string> = {
  classic: "Classic",
  minimal: "Minimal",
  "multi-column": "Multi-column",
  centered: "Centered",
  CTA: "CTA",
  hidden: "Hidden",
};

function PresetPreviewBlock({
  className,
  label,
  tone = "muted",
}: {
  className?: string;
  label: string;
  tone?: "muted" | "primary" | "border" | "brand" | "surface";
}) {
  const st = useSourceTranslations();

  return (
    <span
      className={cn(
        "flex min-h-4 items-center justify-center truncate rounded-sm px-1 text-[0.58rem] leading-none",
        tone === "primary"
          ? "bg-primary text-primary-foreground"
          : tone === "border"
            ? "border border-muted-foreground/35 bg-background text-muted-foreground"
            : tone === "brand"
              ? "bg-foreground/85 text-background"
              : tone === "surface"
                ? "bg-muted text-muted-foreground"
                : "bg-muted-foreground/20 text-muted-foreground",
        className,
      )}
      title={st(label)}
    >
      {st(label)}
    </span>
  );
}

function PresetRegionLabel({
  region,
  variant,
}: {
  region: string;
  variant: string;
}) {
  const st = useSourceTranslations();

  return (
    <div className="flex items-center justify-between gap-2 text-[0.6rem] font-medium uppercase tracking-normal text-muted-foreground">
      <span>{st(region)}</span>
      <span className="truncate text-foreground/80">{st(variant)}</span>
    </div>
  );
}

function PresetHeaderDiagram({ preset }: { preset: AppearanceShellPreset }) {
  const searchBlock = preset.header.search.enabled ? (
    <PresetPreviewBlock className="h-4 w-12" label="Search" tone="border" />
  ) : null;
  const ctaBlock = preset.header.cta.enabled ? (
    <PresetPreviewBlock className="h-4 w-10" label="CTA" tone="primary" />
  ) : null;
  const authBlock = <PresetPreviewBlock className="h-4 w-10" label="Auth" />;

  if (preset.header.variant === "centered") {
    return (
      <div className="flex min-h-16 flex-col items-center justify-center gap-1 rounded border bg-background p-1.5">
        <PresetPreviewBlock className="h-4 w-20" label="Brand" tone="brand" />
        <div className="flex flex-wrap justify-center gap-1">
          <PresetPreviewBlock className="h-4 w-10" label="Menu" />
          {searchBlock}
          {ctaBlock}
          {authBlock}
        </div>
      </div>
    );
  }

  if (preset.header.variant === "split") {
    return (
      <div className="grid min-h-12 grid-cols-[1fr_auto_1fr] items-center gap-1 rounded border bg-background p-1.5">
        <PresetPreviewBlock className="h-4 w-16" label="Brand" tone="brand" />
        <PresetPreviewBlock className="h-4 w-12" label="Menu" />
        <div className="flex min-w-0 items-center justify-end gap-1">
          {searchBlock}
          {ctaBlock}
          {authBlock}
        </div>
      </div>
    );
  }

  if (preset.header.variant === "editorial-masthead") {
    return (
      <div className="flex min-h-20 flex-col gap-1 rounded border bg-background p-1.5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
          {searchBlock ?? <span />}
          <PresetPreviewBlock className="h-5 w-20" label="Brand" tone="brand" />
          <span className="ml-auto">{authBlock}</span>
        </div>
        <div className="flex justify-center gap-1 border-t border-muted-foreground/15 pt-1">
          <PresetPreviewBlock className="h-4 w-10" label="Menu" />
          {ctaBlock}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-12 items-center justify-between gap-1 rounded border bg-background p-1.5",
        preset.header.variant === "compact-app" && "min-h-10 border-b-2",
      )}
    >
      <PresetPreviewBlock className="h-4 w-16" label="Brand" tone="brand" />
      <div className="flex min-w-0 items-center justify-end gap-1">
        <PresetPreviewBlock className="h-4 w-10" label="Menu" />
        {searchBlock}
        {ctaBlock}
        {authBlock}
      </div>
    </div>
  );
}

function PresetMainDiagram({ variant }: { variant: PresetMainVariant }) {
  if (variant === "category-grid") {
    return (
      <div className="grid min-h-14 grid-cols-3 gap-1 rounded border bg-muted/20 p-1.5">
        <PresetPreviewBlock className="h-full" label="Card" tone="surface" />
        <PresetPreviewBlock className="h-full" label="Card" tone="surface" />
        <PresetPreviewBlock className="h-full" label="Card" tone="surface" />
      </div>
    );
  }

  if (variant === "full-bleed-builder") {
    return (
      <div className="-mx-2 flex min-h-14 items-center bg-muted/45 px-2">
        <PresetPreviewBlock
          className="h-9 w-full rounded-none"
          label="Full bleed builder"
          tone="surface"
        />
      </div>
    );
  }

  if (variant === "editorial-article") {
    return (
      <div className="flex min-h-14 justify-center rounded border bg-background p-1.5">
        <PresetPreviewBlock
          className="h-full w-2/3"
          label="Article"
          tone="surface"
        />
      </div>
    );
  }

  if (variant === "framed") {
    return (
      <div className="min-h-14 rounded border bg-muted/25 p-1.5">
        <PresetPreviewBlock
          className="h-10 w-full border shadow-sm"
          label="Framed content"
          tone="surface"
        />
      </div>
    );
  }

  return (
    <div className="grid min-h-14 grid-cols-[2fr_1fr] gap-1 rounded border bg-background p-1.5">
      <PresetPreviewBlock
        className="h-full"
        label="Page content"
        tone="surface"
      />
      <PresetPreviewBlock className="h-full opacity-80" label="Aside" />
    </div>
  );
}

function PresetFooterDiagram({ preset }: { preset: AppearanceShellPreset }) {
  const linksBlock =
    preset.footer.links.length > 0 ? (
      <PresetPreviewBlock className="h-4 w-14" label="Links" />
    ) : null;
  const legalBlock =
    preset.footer.legalLinks.length > 0 ? (
      <PresetPreviewBlock className="h-4 w-12" label="Legal" />
    ) : null;
  const socialBlock =
    preset.footer.socialLinks.length > 0 ? (
      <PresetPreviewBlock className="h-4 w-12" label="Social" />
    ) : null;
  const ctaBlock = preset.footer.cta.enabled ? (
    <PresetPreviewBlock className="h-4 w-10" label="CTA" tone="primary" />
  ) : null;

  if (preset.footer.variant === "hidden") {
    return (
      <div className="flex min-h-9 items-center justify-center rounded border border-dashed bg-background p-1.5">
        <PresetPreviewBlock
          className="h-4 w-20 border-dashed"
          label="Footer hidden"
          tone="border"
        />
      </div>
    );
  }

  if (preset.footer.variant === "multi-column") {
    return (
      <div className="grid min-h-12 grid-cols-[1.5fr_1fr_1fr] gap-1 rounded border bg-background p-1.5">
        <PresetPreviewBlock className="h-4 w-full" label="CustomHtml" />
        <div className="space-y-1">
          {linksBlock}
          {legalBlock}
        </div>
        <div className="space-y-1 justify-self-end">
          {ctaBlock}
          {socialBlock}
        </div>
      </div>
    );
  }

  if (preset.footer.variant === "centered") {
    return (
      <div className="flex min-h-12 flex-col items-center justify-center gap-1 rounded border bg-background p-1.5">
        <PresetPreviewBlock className="h-4 w-20" label="CustomHtml" />
        <div className="flex gap-1">
          {ctaBlock}
          {linksBlock}
          {socialBlock}
          {legalBlock}
        </div>
      </div>
    );
  }

  if (preset.footer.variant === "CTA") {
    return (
      <div className="flex min-h-12 items-center justify-between gap-1 rounded border bg-background p-1.5">
        <div className="space-y-1">
          <PresetPreviewBlock className="h-4 w-20" label="CustomHtml" />
          <div className="flex gap-1">
            {linksBlock}
            {legalBlock}
          </div>
        </div>
        <div className="space-y-1">
          {ctaBlock}
          {socialBlock}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-10 items-center justify-between gap-1 rounded border bg-background p-1.5">
      <PresetPreviewBlock className="h-4 w-20" label="CustomHtml" />
      <div className="flex min-w-0 items-center justify-end gap-1">
        {linksBlock}
        {legalBlock}
        {socialBlock}
        {ctaBlock}
      </div>
    </div>
  );
}

function PresetThumbnail({ preset }: { preset: AppearanceShellPreset }) {
  return (
    <div className="rounded-md border bg-background p-2 text-foreground">
      <div className="space-y-1.5">
        <PresetRegionLabel
          region="Header"
          variant={PRESET_HEADER_LABELS[preset.header.variant]}
        />
        <PresetHeaderDiagram preset={preset} />
        <PresetRegionLabel
          region="Main"
          variant={PRESET_MAIN_LABELS[preset.main.variant]}
        />
        <PresetMainDiagram variant={preset.main.variant} />
        <PresetRegionLabel
          region="Footer"
          variant={PRESET_FOOTER_LABELS[preset.footer.variant]}
        />
        <PresetFooterDiagram preset={preset} />
      </div>
    </div>
  );
}

export function PresetCards({
  selectedId,
  onApply,
}: {
  selectedId: AppearancePresetId | null;
  onApply: (preset: AppearanceShellPreset) => void;
}) {
  const st = useSourceTranslations();

  return (
    <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
      {APPEARANCE_SHELL_PRESETS.map((preset) => {
        const selected = selectedId === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            className={cn(
              "min-w-0 rounded-lg border bg-background p-3 text-left transition-colors hover:border-primary/60 hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              selected && "border-primary bg-primary/5",
            )}
            onClick={() => onApply(preset)}
          >
            <PresetThumbnail preset={preset} />
            <div className="mt-3 space-y-2">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <h3 className="truncate text-sm font-medium">
                  {st(preset.name)}
                </h3>
                {selected && <Badge variant="secondary">{st("Draft")}</Badge>}
              </div>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {st(preset.description)}
              </p>
              <div className="flex flex-wrap gap-1">
                {preset.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {st(tag)}
                  </Badge>
                ))}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

type PreviewViewport = "desktop" | "tablet" | "mobile";

const PREVIEW_VIEWPORTS: Array<{
  id: PreviewViewport;
  label: string;
  icon: typeof Monitor;
  frameClassName: string;
}> = [
  {
    id: "desktop",
    label: "Desktop",
    icon: Monitor,
    frameClassName: "max-w-full",
  },
  {
    id: "tablet",
    label: "Tablet",
    icon: Tablet,
    frameClassName: "max-w-[46rem]",
  },
  {
    id: "mobile",
    label: "Mobile",
    icon: Smartphone,
    frameClassName: "max-w-[22rem]",
  },
];

export function ShellPreview({
  recipe,
  appearance,
  siteName,
  logoFileId,
  logoBorderEnabled,
  logoBorderColorMode,
  logoBorderColor,
  logoBorderShape,
}: {
  recipe: AppearanceRecipe;
  appearance: ReturnType<typeof resolveAppearance>;
  siteName: string;
  logoFileId: string | null;
  logoBorderEnabled: boolean;
  logoBorderColorMode: "theme" | "custom";
  logoBorderColor: string | undefined;
  logoBorderShape: "circle" | "square";
}) {
  const st = useSourceTranslations();

  return (
    <Tabs defaultValue="desktop" className="gap-3">
      <TabsList>
        {PREVIEW_VIEWPORTS.map((viewport) => {
          const Icon = viewport.icon;
          return (
            <TabsTrigger key={viewport.id} value={viewport.id}>
              <Icon className="size-4" aria-hidden />
              {st(viewport.label)}
            </TabsTrigger>
          );
        })}
      </TabsList>
      {PREVIEW_VIEWPORTS.map((viewport) => (
        <TabsContent key={viewport.id} value={viewport.id}>
          <PreviewFrame
            viewport={viewport}
            recipe={recipe}
            appearance={appearance}
            siteName={siteName}
            logoFileId={logoFileId}
            logoBorderEnabled={logoBorderEnabled}
            logoBorderColorMode={logoBorderColorMode}
            logoBorderColor={logoBorderColor}
            logoBorderShape={logoBorderShape}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function PreviewChip({
  children,
  className,
  tone = "muted",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "muted" | "primary" | "secondary" | "border" | "brand";
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 max-w-full items-center justify-center truncate rounded px-2 py-1 text-xs leading-none",
        tone === "primary"
          ? "bg-primary text-primary-foreground"
          : tone === "secondary"
            ? "bg-secondary text-secondary-foreground"
            : tone === "border"
              ? "border text-muted-foreground"
              : tone === "brand"
                ? "font-medium text-foreground"
                : "bg-muted text-muted-foreground",
        className,
      )}
      title={typeof children === "string" ? children : undefined}
    >
      {children}
    </span>
  );
}

function PreviewBrand({
  brandSlot,
  siteName,
  logoFileId,
  logoBorderEnabled,
  logoBorderColor,
  logoBorderRadius,
  className,
  compact = false,
}: {
  brandSlot: Extract<AppearanceSlotV1, { type: "Brand" }> | null;
  siteName: string;
  logoFileId: string | null;
  logoBorderEnabled: boolean;
  logoBorderColor: string;
  logoBorderRadius: string;
  className?: string;
  compact?: boolean;
}) {
  if (!brandSlot?.enabled) return null;

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      {logoFileId && brandSlot.showLogo && (
        <span
          className={cn("overflow-hidden", compact ? "size-4" : "size-5")}
          style={{
            borderRadius: logoBorderRadius,
            border: logoBorderEnabled ? `1px solid ${logoBorderColor}` : "0",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/files/${logoFileId}`}
            alt=""
            className="h-full w-full object-contain"
            style={{ borderRadius: logoBorderRadius }}
          />
        </span>
      )}
      {brandSlot.showSiteName && (
        <span
          className={cn(
            "truncate font-medium text-foreground",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {siteName}
        </span>
      )}
    </div>
  );
}

function PreviewHeader({
  recipe,
  siteName,
  logoFileId,
  logoBorderEnabled,
  logoBorderColor,
  logoBorderRadius,
  showCompact,
}: {
  recipe: AppearanceRecipe;
  siteName: string;
  logoFileId: string | null;
  logoBorderEnabled: boolean;
  logoBorderColor: string;
  logoBorderRadius: string;
  showCompact: boolean;
}) {
  const st = useSourceTranslations();
  const header = recipe.shell.header;
  const brandSlot = getSlot(recipe, "header", "Brand", "brand");
  const customHtmlSlot = getSlot(
    recipe,
    "header",
    "CustomHtml",
    "header-custom-html",
  );
  const siteMenuSlot = getSlot(recipe, "header", "SiteMenu", "site-menu");
  const adminMenuSlot = getSlot(recipe, "header", "AdminMenu", "admin-menu");
  const searchSlot = getSlot(recipe, "header", "Search", "header-search");
  const ctaSlot = getSlot(recipe, "header", "CTA", "header-cta");
  const brand = (
    <PreviewBrand
      brandSlot={brandSlot}
      siteName={siteName}
      logoFileId={logoFileId}
      logoBorderEnabled={logoBorderEnabled}
      logoBorderColor={logoBorderColor}
      logoBorderRadius={logoBorderRadius}
      className={
        header.variant === "centered" || header.variant === "editorial-masthead"
          ? "justify-center"
          : undefined
      }
      compact={header.variant === "compact-app" || showCompact}
    />
  );
  const customHtml = customHtmlSlot?.enabled ? (
    <PreviewChip className="min-w-0 flex-1" tone="muted">
      {st("CustomHtml")}
    </PreviewChip>
  ) : null;
  const menu = siteMenuSlot?.enabled ? (
    <PreviewChip>{st("Menu")}</PreviewChip>
  ) : null;
  const admin =
    adminMenuSlot?.enabled && !showCompact ? (
      <PreviewChip>{st("Admin")}</PreviewChip>
    ) : null;
  const search =
    searchSlot?.enabled && !showCompact ? (
      <PreviewChip className="w-24" tone="border">
        {searchSlot.placeholder}
      </PreviewChip>
    ) : null;
  const cta =
    ctaSlot?.enabled && ctaSlot.label ? (
      <PreviewChip tone="primary">{ctaSlot.label}</PreviewChip>
    ) : null;
  const auth = !showCompact ? (
    <PreviewChip tone="secondary">{st("Auth")}</PreviewChip>
  ) : null;
  const mobileMenu = showCompact ? (
    <PreviewChip tone="border">{st("Menu")}</PreviewChip>
  ) : null;

  if (header.hidden) {
    return (
      <div className="flex min-h-12 items-center justify-end border-b px-3 py-2 text-xs">
        <PreviewChip className="h-7 w-14 rounded-full px-1" tone="border">
          {st("Menu")}
        </PreviewChip>
      </div>
    );
  }

  if (header.variant === "centered") {
    return (
      <div className="flex min-h-20 flex-col items-center justify-center gap-2 border-b px-3 py-3 text-center text-xs">
        {brand}
        {customHtml}
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-2">
          {showCompact ? mobileMenu : menu}
          {admin}
          {search}
          {cta}
          {auth}
        </div>
      </div>
    );
  }

  if (header.variant === "split") {
    return (
      <div className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b px-3 py-2 text-xs">
        <div className="min-w-0 justify-self-start">{brand}</div>
        <div className="flex min-w-0 items-center justify-center gap-2">
          {showCompact ? mobileMenu : menu}
          {admin}
        </div>
        <div className="flex min-w-0 items-center justify-end gap-2">
          {!showCompact && customHtml}
          {search}
          {cta}
          {auth}
        </div>
      </div>
    );
  }

  if (header.variant === "compact-app") {
    return (
      <div className="flex min-h-12 items-center justify-between gap-2 border-b px-3 py-2 text-xs">
        {brand}
        {!showCompact && customHtml}
        <div className="flex shrink-0 items-center gap-2">
          {showCompact ? mobileMenu : menu}
          {admin}
          {search}
          {cta}
          {auth}
        </div>
      </div>
    );
  }

  if (header.variant === "editorial-masthead") {
    return (
      <div className="flex min-h-28 flex-col justify-center gap-2 border-b px-3 py-3 text-xs">
        <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <div className="min-w-0 justify-self-start">{search}</div>
          {brand}
          <div className="justify-self-end">{auth}</div>
        </div>
        <div className="flex justify-center">{customHtml}</div>
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-2 border-t pt-2">
          {showCompact ? mobileMenu : menu}
          {admin}
          {showCompact && searchSlot?.enabled ? (
            <PreviewChip className="w-24" tone="border">
              {searchSlot.placeholder}
            </PreviewChip>
          ) : null}
          {cta}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-14 items-center justify-between gap-3 border-b px-3 py-2 text-xs">
      {brand}
      {!showCompact && customHtml}
      <div className="flex shrink-0 items-center gap-2">
        {showCompact ? mobileMenu : menu}
        {admin}
        {search}
        {cta}
        {auth}
      </div>
    </div>
  );
}

function PreviewFooter({
  recipe,
  showCompact,
}: {
  recipe: AppearanceRecipe;
  showCompact: boolean;
}) {
  const st = useSourceTranslations();
  const footer = recipe.shell.footer;
  const customHtmlSlot = getSlot(
    recipe,
    "footer",
    "CustomHtml",
    "footer-custom-html",
  );
  const copyrightSlot = getSlot(recipe, "footer", "Copyright", "copyright");
  const footerLinksSlot = getSlot(
    recipe,
    "footer",
    "FooterLinks",
    "footer-links",
  );
  const legalLinksSlot = getSlot(recipe, "footer", "LegalLinks", "legal-links");
  const socialLinksSlot = getSlot(
    recipe,
    "footer",
    "SocialLinks",
    "social-links",
  );
  const footerCtaSlot = getSlot(recipe, "footer", "CTA", "footer-cta");
  const customHtml = customHtmlSlot?.enabled ? (
    <PreviewChip>{st("CustomHtml")}</PreviewChip>
  ) : null;
  const copyright = copyrightSlot?.enabled ? (
    <PreviewChip>{st("Copyright")}</PreviewChip>
  ) : null;
  const footerLinks = footerLinksSlot?.enabled ? (
    <PreviewChip>{st("Footer links")}</PreviewChip>
  ) : null;
  const legalLinks = legalLinksSlot?.enabled ? (
    <PreviewChip>{st("Legal")}</PreviewChip>
  ) : null;
  const socialLinks = socialLinksSlot?.enabled ? (
    <PreviewChip>{st("Social")}</PreviewChip>
  ) : null;
  const cta =
    footerCtaSlot?.enabled && footerCtaSlot.label ? (
      <PreviewChip tone="primary">{footerCtaSlot.label}</PreviewChip>
    ) : null;

  if (footer.hidden || footer.variant === "hidden") return null;

  if (footer.variant === "centered") {
    return (
      <div className="border-t px-3 py-3 text-xs text-muted-foreground">
        <div className="mx-auto flex flex-col items-center gap-2 text-center">
          {customHtml}
          {cta}
          <div className="flex flex-wrap justify-center gap-2">
            {footerLinks}
            {socialLinks}
            {legalLinks}
          </div>
          {copyright}
        </div>
      </div>
    );
  }

  if (footer.variant === "multi-column") {
    return (
      <div className="border-t px-3 py-3 text-xs text-muted-foreground">
        <div
          className={cn(
            "mx-auto grid gap-3",
            !showCompact &&
              "grid-cols-[minmax(0,2fr)_minmax(8rem,1fr)_minmax(8rem,1fr)]",
          )}
        >
          <div className="space-y-2">
            {customHtml}
            {copyright}
          </div>
          <div className="space-y-2">
            {footerLinks}
            {legalLinks}
          </div>
          <div className={cn("space-y-2", !showCompact && "text-right")}>
            {cta}
            {socialLinks}
          </div>
        </div>
      </div>
    );
  }

  if (footer.variant === "CTA") {
    return (
      <div className="border-t px-3 py-3 text-xs text-muted-foreground">
        <div
          className={cn(
            "mx-auto flex gap-3",
            showCompact ? "flex-col" : "flex-row items-center justify-between",
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            {customHtml}
            {footerLinks}
            {legalLinks}
            {copyright}
          </div>
          <div
            className={cn(
              "flex shrink-0 flex-wrap items-center gap-2",
              !showCompact && "justify-end",
            )}
          >
            {cta}
            {socialLinks}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t px-3 py-3 text-xs text-muted-foreground">
      <div
        className={cn(
          "mx-auto flex gap-2",
          showCompact
            ? "flex-col"
            : "flex-row flex-wrap items-center justify-between",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          {customHtml}
          {copyright}
        </div>
        {footer.variant !== "classic" && (
          <div
            className={cn(
              "flex flex-wrap items-center gap-2",
              !showCompact && "justify-end",
            )}
          >
            {footerLinks}
            {legalLinks}
            {socialLinks}
            {cta}
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewFrame({
  viewport,
  recipe,
  appearance,
  siteName,
  logoFileId,
  logoBorderEnabled,
  logoBorderColorMode,
  logoBorderColor,
  logoBorderShape,
}: {
  viewport: (typeof PREVIEW_VIEWPORTS)[number];
  recipe: AppearanceRecipe;
  appearance: ReturnType<typeof resolveAppearance>;
  siteName: string;
  logoFileId: string | null;
  logoBorderEnabled: boolean;
  logoBorderColorMode: "theme" | "custom";
  logoBorderColor: string | undefined;
  logoBorderShape: "circle" | "square";
}) {
  const main = recipe.shell.main;
  const showCompact = viewport.id === "mobile";
  const logoBorderRadius = logoBorderShape === "square" ? "0" : "9999px";
  const resolvedLogoBorderColor =
    logoBorderColorMode === "custom" && logoBorderColor
      ? logoBorderColor
      : "var(--border)";

  return (
    <div
      className={cn(
        appearance.htmlClass,
        "mx-auto overflow-hidden rounded-lg border bg-background text-foreground shadow-sm",
        viewport.frameClassName,
      )}
      style={cssVarsToInlineStyle(appearance.cssVars)}
    >
      <PreviewHeader
        recipe={recipe}
        siteName={siteName}
        logoFileId={logoFileId}
        logoBorderEnabled={logoBorderEnabled}
        logoBorderColor={resolvedLogoBorderColor}
        logoBorderRadius={logoBorderRadius}
        showCompact={showCompact}
      />
      <div
        className={cn(
          "min-h-52 p-4",
          main.variant === "framed" && "bg-muted/30",
          main.variant === "full-bleed-builder" && "px-0",
          main.variant === "category-grid" && "bg-muted/20",
        )}
      >
        <div
          className={cn(
            "mx-auto grid gap-3",
            main.variant === "editorial-article"
              ? "max-w-[36rem]"
              : main.variant === "full-bleed-builder"
                ? "max-w-none"
                : "max-w-[var(--frontend-content-max-width)]",
            main.variant === "category-grid"
              ? showCompact
                ? "grid-cols-1"
                : "grid-cols-3"
              : "grid-cols-1",
          )}
        >
          <div
            className={cn(
              "min-h-28 rounded bg-card p-4 text-card-foreground",
              main.variant === "framed" && "border shadow-sm",
              main.variant === "full-bleed-builder" && "rounded-none",
            )}
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            <div className="mb-3 h-4 w-2/3 rounded bg-primary/80" />
            <div className="space-y-2">
              <div className="h-2 rounded bg-muted-foreground/25" />
              <div className="h-2 w-5/6 rounded bg-muted-foreground/20" />
              <div className="h-2 w-3/5 rounded bg-muted-foreground/15" />
            </div>
          </div>
          {main.variant === "category-grid" &&
            [0, 1].map((item) => (
              <div key={item} className="min-h-28 rounded border bg-card p-3">
                <div className="mb-3 h-10 rounded bg-muted" />
                <div className="h-2 w-2/3 rounded bg-muted-foreground/20" />
              </div>
            ))}
        </div>
      </div>
      <PreviewFooter recipe={recipe} showCompact={showCompact} />
    </div>
  );
}
