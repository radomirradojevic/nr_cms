"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ImageIcon, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { LogoPickerDialog } from "./logo-picker-dialog";

interface SettingsFormProps {
  settings: GlobalSettingsRow | null;
  initialLogoFile: FileRow | null;
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
        },
        footerSettings: {
          showLogo: footerShowLogo,
          copyright: footerCopyright || undefined,
          sticky: footerSticky,
          background: footerBackground || undefined,
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
          {headerSticky && (
            <div className="space-y-1.5">
              <Label htmlFor="stickyHeaderHeight">
                Sticky Header Height (px)
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
          )}
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
          {footerSticky && (
            <div className="space-y-1.5">
              <Label htmlFor="stickyFooterHeight">
                Sticky Footer Height (px)
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
          )}
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
            <Label htmlFor="footerContent">Footer Content (HTML)</Label>
            <Textarea
              id="footerContent"
              rows={6}
              value={footerContent}
              onChange={(e) => setFooterContent(e.target.value)}
              maxLength={20000}
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
