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

function PresetThumbnail({ preset }: { preset: AppearanceShellPreset }) {
  const mainColumns =
    preset.main.variant === "category-grid"
      ? "grid-cols-3"
      : preset.main.variant === "full-bleed-builder"
        ? "grid-cols-1"
        : "grid-cols-[2fr_1fr]";

  return (
    <div className="h-28 rounded-md border bg-background p-2 text-foreground">
      <div
        className={cn(
          "mb-1 flex h-6 items-center gap-1 rounded border px-1.5",
          preset.header.variant === "centered" ||
            preset.header.variant === "editorial-masthead"
            ? "justify-center"
            : preset.header.variant === "split"
              ? "justify-between"
              : "justify-start",
        )}
      >
        <span className="h-2.5 w-8 rounded bg-primary/80" />
        {preset.header.search.enabled && (
          <span className="hidden h-2 w-10 rounded bg-muted-foreground/30 sm:block" />
        )}
        {preset.header.cta.enabled && (
          <span className="ml-auto h-3 w-8 rounded bg-primary" />
        )}
      </div>
      <div
        className={cn(
          "grid h-12 gap-1",
          mainColumns,
          preset.main.variant === "framed" && "rounded border p-1",
          preset.main.variant === "full-bleed-builder" && "-mx-2 bg-muted/50",
        )}
      >
        <span className="rounded bg-muted" />
        {preset.main.variant !== "full-bleed-builder" && (
          <span className="rounded bg-muted/60" />
        )}
        {preset.main.variant === "category-grid" && (
          <span className="rounded bg-muted/70" />
        )}
      </div>
      {preset.footer.variant !== "hidden" && (
        <div
          className={cn(
            "mt-1 grid h-4 gap-1 rounded border p-1",
            preset.footer.variant === "multi-column"
              ? "grid-cols-3"
              : "grid-cols-2",
          )}
        >
          <span className="rounded bg-muted-foreground/25" />
          <span className="rounded bg-muted-foreground/20" />
          {preset.footer.variant === "multi-column" && (
            <span className="rounded bg-muted-foreground/15" />
          )}
        </div>
      )}
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
                <h3 className="truncate text-sm font-medium">{preset.name}</h3>
                {selected && <Badge variant="secondary">Draft</Badge>}
              </div>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {preset.description}
              </p>
              <div className="flex flex-wrap gap-1">
                {preset.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
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
  return (
    <Tabs defaultValue="desktop" className="gap-3">
      <TabsList>
        {PREVIEW_VIEWPORTS.map((viewport) => {
          const Icon = viewport.icon;
          return (
            <TabsTrigger key={viewport.id} value={viewport.id}>
              <Icon className="size-4" aria-hidden />
              {viewport.label}
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
  const header = recipe.shell.header;
  const footer = recipe.shell.footer;
  const main = recipe.shell.main;
  const brandSlot = getSlot(recipe, "header", "Brand", "brand");
  const siteMenuSlot = getSlot(recipe, "header", "SiteMenu", "site-menu");
  const authSlot = getSlot(recipe, "header", "AuthControls", "auth-controls");
  const searchSlot = getSlot(recipe, "header", "Search", "header-search");
  const headerCtaSlot = getSlot(recipe, "header", "CTA", "header-cta");
  const footerLinksSlot = getSlot(
    recipe,
    "footer",
    "FooterLinks",
    "footer-links",
  );
  const footerCtaSlot = getSlot(recipe, "footer", "CTA", "footer-cta");
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
      <div
        className={cn(
          "flex min-h-12 items-center gap-2 border-b px-3 py-2 text-xs",
          header.variant === "centered" ||
            header.variant === "editorial-masthead"
            ? "flex-col justify-center text-center"
            : header.variant === "split"
              ? "justify-between"
              : "justify-start",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {logoFileId && brandSlot?.showLogo && (
            <span
              className="size-5 overflow-hidden"
              style={{
                borderRadius: logoBorderRadius,
                border: logoBorderEnabled
                  ? `1px solid ${resolvedLogoBorderColor}`
                  : "0",
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
          {brandSlot?.showSiteName && (
            <span className="truncate font-medium">{siteName}</span>
          )}
        </div>
        <div
          className={cn(
            "flex min-w-0 items-center gap-2",
            showCompact && "ml-auto",
          )}
        >
          {siteMenuSlot?.enabled && !showCompact && (
            <span className="rounded bg-muted px-2 py-1">Menu</span>
          )}
          {searchSlot?.enabled && !showCompact && (
            <span className="w-20 rounded border px-2 py-1 text-muted-foreground">
              {searchSlot.placeholder}
            </span>
          )}
          {headerCtaSlot?.enabled && headerCtaSlot.label && (
            <span className="rounded bg-primary px-2 py-1 text-primary-foreground">
              {headerCtaSlot.label}
            </span>
          )}
          {authSlot?.enabled && !showCompact && (
            <span className="rounded bg-secondary px-2 py-1">Auth</span>
          )}
          {showCompact && (
            <span className="rounded border px-2 py-1">Menu</span>
          )}
        </div>
      </div>
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
      {footer.variant !== "hidden" && (
        <div
          className={cn(
            "border-t px-3 py-3 text-xs text-muted-foreground",
            footer.variant === "centered" && "text-center",
          )}
        >
          <div
            className={cn(
              "mx-auto flex gap-2",
              footer.variant === "multi-column"
                ? "grid grid-cols-3"
                : "flex-wrap items-center justify-between",
            )}
          >
            <span className="h-2 w-24 rounded bg-muted-foreground/30" />
            {footerLinksSlot?.enabled && (
              <span className="h-2 w-20 rounded bg-muted-foreground/20" />
            )}
            {footerCtaSlot?.enabled && footerCtaSlot.label && (
              <span className="rounded bg-primary px-2 py-1 text-primary-foreground">
                {footerCtaSlot.label}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
