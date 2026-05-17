"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ImageIcon, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateGlobalSettings } from "./actions";
import type { GlobalSettingsRow } from "@/data/global-settings";
import type { FileRow } from "@/data/files";
import {
  DEFAULT_FOOTER_SETTINGS,
  DEFAULT_HEADER_SETTINGS,
  FooterSettingsSchema,
  HeaderSettingsSchema,
  MB,
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
  cssVarsToInlineStyle,
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
import { LogoPickerDialog } from "./logo-picker-dialog";
import { FooterContentEditor } from "./footer-content-editor";

interface GlowFieldsProps {
  idPrefix: string;
  value: GlowEffect;
  onChange: (next: GlowEffect) => void;
}

function GlowFields({ idPrefix, value, onChange }: GlowFieldsProps) {
  const enabledId = `${idPrefix}-glow-enabled`;
  const colorId = `${idPrefix}-glow-color`;
  const intensityId = `${idPrefix}-glow-intensity`;
  const blurId = `${idPrefix}-glow-blur`;
  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <Label htmlFor={enabledId}>Glow Border</Label>
        <Switch
          id={enabledId}
          checked={value.enabled}
          onCheckedChange={(enabled) => onChange({ ...value, enabled })}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={colorId}>Glow Color</Label>
          <div className="flex items-center gap-2">
            <Input
              id={colorId}
              type="color"
              value={value.color}
              onChange={(e) => onChange({ ...value, color: e.target.value })}
              disabled={!value.enabled}
              className="h-9 w-14 p-1"
            />
            <Input
              type="text"
              value={value.color}
              onChange={(e) => onChange({ ...value, color: e.target.value })}
              disabled={!value.enabled}
              placeholder="#349aee"
              maxLength={7}
            />
          </div>
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
  settings: GlobalSettingsRow | null;
  initialLogoFile: FileRow | null;
}

const CUSTOM_WIDTH_OPTION = "__custom__";

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

export function SettingsForm({ settings, initialLogoFile }: SettingsFormProps) {
  const headerSettings =
    HeaderSettingsSchema.safeParse(settings?.headerSettings).data ??
    DEFAULT_HEADER_SETTINGS;

  const footerSettings =
    FooterSettingsSchema.safeParse(settings?.footerSettings).data ??
    DEFAULT_FOOTER_SETTINGS;

  const [siteName, setSiteName] = useState(
    settings?.siteName ?? "Night Raven CMS",
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
  const [maxUploadMB, setMaxUploadMB] = useState(
    String(Math.round(Number(settings?.maxUploadSizeBytes ?? 50 * MB) / MB)),
  );
  const [maxBatchUploadMB, setMaxBatchUploadMB] = useState(
    String(
      Math.round(Number(settings?.maxBatchUploadSizeBytes ?? 500 * MB) / MB),
    ),
  );

  // ─── Appearance ────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<Theme>(
    (settings?.theme as Theme | undefined) ?? DEFAULT_APPEARANCE.theme,
  );
  const [frontendContentWidth, setFrontendContentWidth] =
    useState<ContentWidth>(
      normalizeContentWidth(
        settings?.frontendContentWidth,
        DEFAULT_APPEARANCE.frontendContentWidth,
      ),
    );
  const [backendContentWidth, setBackendContentWidth] = useState<ContentWidth>(
    normalizeContentWidth(
      settings?.backendContentWidth,
      DEFAULT_APPEARANCE.backendContentWidth,
    ),
  );
  const [fontPreset, setFontPreset] = useState<FontPreset>(
    (settings?.fontPreset as FontPreset | undefined) ??
      DEFAULT_APPEARANCE.fontPreset,
  );
  const [radiusPreset, setRadiusPreset] = useState<RadiusPreset>(
    (settings?.radiusPreset as RadiusPreset | undefined) ??
      DEFAULT_APPEARANCE.radiusPreset,
  );
  const [shadowPreset, setShadowPreset] = useState<ShadowPreset>(
    (settings?.shadowPreset as ShadowPreset | undefined) ??
      DEFAULT_APPEARANCE.shadowPreset,
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

  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateGlobalSettings({
        siteName,
        siteLogoFileId: logoFileId,
        headerContent: headerContent || null,
        footerContent: footerContent || null,
        headerSettings: {
          showLogo: headerShowLogo,
          showSiteName: headerShowSiteName,
          sticky: headerSticky,
          background: headerBackground || undefined,
          glow: headerGlow,
        },
        footerSettings: {
          showLogo: footerShowLogo,
          copyright: footerCopyright || undefined,
          sticky: footerSticky,
          background: footerBackground || undefined,
          glow: footerGlow,
        },
        stickyHeaderHeight: Math.max(
          0,
          Math.min(400, parseInt(stickyHeaderHeight, 10) || 0),
        ),
        stickyFooterHeight: Math.max(
          0,
          Math.min(400, parseInt(stickyFooterHeight, 10) || 0),
        ),
        maxUploadSizeBytes: (parseInt(maxUploadMB, 10) || 50) * MB,
        maxBatchUploadSizeBytes: (parseInt(maxBatchUploadMB, 10) || 500) * MB,
        theme,
        frontendContentWidth,
        backendContentWidth,
        fontPreset,
        radiusPreset,
        shadowPreset,
      });

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Settings saved.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        </CardContent>
      </Card>

      {/* ── Header ── */}
      <Card>
        <CardHeader>
          <CardTitle>Header Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                    {logoFileId ? "Change logo…" : "Choose from File Manager…"}
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
            <Label htmlFor="stickyHeaderHeight">Header Height (px)</Label>
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
            <Input
              id="headerBackground"
              placeholder="#ffffff"
              value={headerBackground}
              onChange={(e) => setHeaderBackground(e.target.value)}
            />
          </div>
          <GlowFields
            idPrefix="header"
            value={headerGlow}
            onChange={setHeaderGlow}
          />
          <div className="space-y-1.5">
            <Label htmlFor="headerContent">Header Content (HTML)</Label>
            <Textarea
              id="headerContent"
              rows={6}
              value={headerContent}
              onChange={(e) => setHeaderContent(e.target.value)}
              maxLength={20000}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Footer ── */}
      <Card>
        <CardHeader>
          <CardTitle>Footer Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Label htmlFor="stickyFooterHeight">Footer Height (px)</Label>
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
            <Input
              id="footerBackground"
              placeholder="#ffffff"
              value={footerBackground}
              onChange={(e) => setFooterBackground(e.target.value)}
            />
          </div>
          <GlowFields
            idPrefix="footer"
            value={footerGlow}
            onChange={setFooterGlow}
          />
          <div className="space-y-1.5">
            <Label htmlFor="footerCopyright">Copyright Text (optional)</Label>
            <Input
              id="footerCopyright"
              value={footerCopyright}
              onChange={(e) => setFooterCopyright(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Footer Content (HTML)</Label>
            <FooterContentEditor
              value={footerContent}
              onChange={setFooterContent}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Uploads ── */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="maxUploadMB">Max Per-File Upload Size (MB)</Label>
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
            <Label htmlFor="maxBatchUploadMB">Max Batch Upload Size (MB)</Label>
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

      {/* ── Appearance ── */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="appearance-theme">Theme</Label>
              <Select value={theme} onValueChange={(v) => setTheme(v as Theme)}>
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
                onValueChange={(v) => setRadiusPreset(v as RadiusPreset)}
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
                onValueChange={(v) => setShadowPreset(v as ShadowPreset)}
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

          <div className="space-y-2">
            <Label>Live Preview</Label>
            <div
              className={previewAppearance.htmlClass}
              style={cssVarsToInlineStyle(previewAppearance.cssVars)}
            >
              <div
                className="rounded-lg border bg-background p-6 text-foreground"
                style={{ boxShadow: "var(--shadow-md)" }}
              >
                <h3
                  className="text-lg font-semibold"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Sample Heading
                </h3>
                <p
                  className="mt-1 text-sm text-muted-foreground"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Quick brown foxes jump over lazy dogs. This card uses the
                  active background, foreground, border, radius and shadow
                  tokens.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                    style={{ boxShadow: "var(--shadow-sm)" }}
                  >
                    Primary
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground"
                  >
                    Secondary
                  </button>
                  <span className="text-xs text-muted-foreground">
                    frontend: {previewAppearance.frontendContainerMaxWidth} /
                    backend: {previewAppearance.backendContainerMaxWidth}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Preview reflects current selections only. Save changes to apply
              site-wide.
            </p>
          </div>
        </CardContent>
      </Card>

      <div>
        <Button type="submit" disabled={isPending}>
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
