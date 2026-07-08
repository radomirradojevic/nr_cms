"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Search } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchFiles } from "@/app/dashboard/filemanager/actions";
import type { FileRow } from "@/data/files";
import { useSourceTranslations } from "@/components/source-translations";

export type ImageAlignment = "left" | "center" | "right";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "insert" | "edit";
  initialValues?: {
    src?: string | null;
    alt?: string | null;
    width?: string | null;
    height?: string | null;
    alignment?: ImageAlignment | null;
  } | null;
  onInsert: (args: {
    src: string;
    alt: string;
    width: string;
    height: string;
    alignment: ImageAlignment;
  }) => void;
  onAlignmentChange?: (alignment: ImageAlignment) => void;
};

const PAGE_SIZE = 24;

function normalizeImageAlignment(value: unknown): ImageAlignment {
  return value === "left" || value === "right" || value === "center"
    ? value
    : "center";
}

function fileIdFromApiSrc(src: string | null | undefined): string | null {
  if (!src) return null;
  const match = src.trim().match(/^\/api\/files\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function ImageInsertDialog(props: Props) {
  const { open, mode = "insert", initialValues } = props;
  const instanceKey = open
    ? [
        mode,
        initialValues?.src ?? "",
        initialValues?.alt ?? "",
        initialValues?.width ?? "",
        initialValues?.height ?? "",
        initialValues?.alignment ?? "",
      ].join("|")
    : "closed";

  return <ImageInsertDialogInner key={instanceKey} {...props} />;
}

function ImageInsertDialogInner({
  open,
  onOpenChange,
  mode = "insert",
  initialValues,
  onInsert,
  onAlignmentChange,
}: Props) {
  const [url, setUrl] = useState(() => initialValues?.src ?? "");
  const [alt, setAlt] = useState(() => initialValues?.alt ?? "");
  const [width, setWidth] = useState(() => initialValues?.width ?? "");
  const [height, setHeight] = useState(() => initialValues?.height ?? "");
  const [alignment, setAlignment] = useState<ImageAlignment>(() =>
    normalizeImageAlignment(initialValues?.alignment),
  );
  const [search, setSearch] = useState("");
  const [files, setFiles] = useState<FileRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    fileIdFromApiSrc(initialValues?.src),
  );
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = useSourceTranslations();

  // Fetch the initial File Manager page whenever a fresh dialog instance opens.
  useEffect(() => {
    if (open) {
      runFetch(0, true, "");
    }
  }, [open]);

  // Debounced search.
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runFetch(0, true, search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function runFetch(nextOffset: number, replace: boolean, q: string) {
    startTransition(async () => {
      const res = await fetchFiles({
        kind: "image",
        search: q || undefined,
        limit: PAGE_SIZE,
        offset: nextOffset,
      });
      if ("error" in res) return;
      setTotal(res.total);
      setFiles((prev) => (replace ? res.rows : [...prev, ...res.rows]));
      setOffset(nextOffset + res.rows.length);
    });
  }

  function handleInsert() {
    let src = url.trim();
    let nextAlt = alt.trim();
    if (selectedId) {
      const file = files.find((f) => f.id === selectedId);
      if (file) {
        src = `/api/files/${file.id}`;
        if (!nextAlt) nextAlt = file.alt ?? file.title ?? file.filename;
      }
    }
    if (!src) return;
    onInsert({
      src,
      alt: nextAlt,
      width: width.trim(),
      height: height.trim(),
      alignment,
    });
    onOpenChange(false);
  }

  const hasMore = files.length < total;
  const canInsert = Boolean(selectedId) || url.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? t("Edit image") : t("Insert image")}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? t("Update the image URL, alt text, dimensions, or alignment.")
              : t(
                  "Paste a direct image URL or pick an image from the File Manager.",
                )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="image-url">{t("Image URL")}</Label>
            <Input
              id="image-url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (e.target.value) setSelectedId(null);
              }}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image-alt">{t("Alt text (optional)")}</Label>
            <Input
              id="image-alt"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder={t("Describe the image")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="image-width">{t("Width (optional)")}</Label>
              <Input
                id="image-width"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder={t("e.g. 600 or 50%")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image-height">{t("Height (optional)")}</Label>
              <Input
                id="image-height"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder={t("e.g. 400 or auto")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image-alignment">{t("Alignment")}</Label>
            <Select
              value={alignment}
              onValueChange={(value) => {
                const next = normalizeImageAlignment(value);
                setAlignment(next);
                if (mode === "edit") onAlignmentChange?.(next);
              }}
            >
              <SelectTrigger id="image-alignment" className="w-full">
                <SelectValue placeholder={t("Select alignment")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">{t("Left")}</SelectItem>
                <SelectItem value="center">{t("Center")}</SelectItem>
                <SelectItem value="right">{t("Right")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("Or pick from File Manager")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("Showing {count} of {total}", {
                  count: files.length,
                  total,
                })}
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Search images…")}
                className="pl-9"
              />
            </div>

            {pending && files.length === 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-md" />
                ))}
              </div>
            ) : files.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">
                {t("No images found.")}
              </p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[320px] overflow-y-auto p-1">
                {files.map((f) => {
                  const active = selectedId === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(active ? null : f.id);
                        if (!active) setUrl("");
                      }}
                      className={`group relative aspect-square rounded-md overflow-hidden border bg-muted ${
                        active ? "ring-2 ring-primary" : ""
                      }`}
                      title={f.title ?? f.filename}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/files/${f.id}`}
                        alt={f.alt ?? f.filename}
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {hasMore && (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => runFetch(offset, false, search)}
                  disabled={pending}
                >
                  {pending ? t("Loading...") : t("Load more")}
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("Cancel")}
          </Button>
          <Button type="button" onClick={handleInsert} disabled={!canInsert}>
            {mode === "edit" ? t("Save changes") : t("Insert")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
