"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Search, Film } from "lucide-react";

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
import {
  extractYouTubeId,
  youTubeEmbedUrl,
  type VideoProvider,
} from "./video-extension";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (args: {
    src: string;
    provider: VideoProvider;
    width?: string;
    height?: string;
  }) => void;
};

const PAGE_SIZE = 24;

const SIZE_PRESETS: { label: string; value: string }[] = [
  { label: "Small (320px)", value: "320px" },
  { label: "Medium (480px)", value: "480px" },
  { label: "Large (720px)", value: "720px" },
  { label: "Full width (100%)", value: "100%" },
  { label: "Custom\u2026", value: "custom" },
];

export function VideoInsertDialog({ open, onOpenChange, onInsert }: Props) {
  const [tab, setTab] = useState<"youtube" | "file">("youtube");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeError, setYoutubeError] = useState<string | null>(null);

  const [sizePreset, setSizePreset] = useState<string>("100%");
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");

  const [search, setSearch] = useState("");
  const [files, setFiles] = useState<FileRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setTab("youtube");
      setYoutubeUrl("");
      setYoutubeError(null);
      setSizePreset("100%");
      setCustomWidth("");
      setCustomHeight("");
      setSearch("");
      setSelectedId(null);
      runFetch(0, true, "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
        kind: "video",
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

  function resolvedSize(): { width?: string; height?: string } {
    if (sizePreset === "custom") {
      return {
        width: customWidth.trim() || undefined,
        height: customHeight.trim() || undefined,
      };
    }
    return { width: sizePreset };
  }

  function handleInsert() {
    const size = resolvedSize();
    if (tab === "youtube") {
      const id = extractYouTubeId(youtubeUrl);
      if (!id) {
        setYoutubeError("Enter a valid YouTube URL.");
        return;
      }
      onInsert({
        src: youTubeEmbedUrl(id),
        provider: "youtube",
        ...size,
      });
      onOpenChange(false);
      return;
    }
    if (!selectedId) return;
    const file = files.find((f) => f.id === selectedId);
    if (!file) return;
    onInsert({
      src: `/api/files/${file.id}`,
      provider: "file",
      ...size,
    });
    onOpenChange(false);
  }

  const hasMore = files.length < total;
  const canInsert =
    tab === "youtube" ? youtubeUrl.trim().length > 0 : Boolean(selectedId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Insert video</DialogTitle>
          <DialogDescription>
            Embed a YouTube video or pick an uploaded video from the File
            Manager.
          </DialogDescription>
        </DialogHeader>

        <div>
          <div className="inline-flex rounded-md border bg-muted p-1">
            <button
              type="button"
              onClick={() => setTab("youtube")}
              className={`px-3 py-1 text-sm rounded-sm ${
                tab === "youtube"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              YouTube
            </button>
            <button
              type="button"
              onClick={() => setTab("file")}
              className={`px-3 py-1 text-sm rounded-sm ${
                tab === "file"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              File Manager
            </button>
          </div>

          {tab === "youtube" && (
            <div className="space-y-2 pt-4">
              <Label htmlFor="yt-url">YouTube URL</Label>
              <Input
                id="yt-url"
                value={youtubeUrl}
                onChange={(e) => {
                  setYoutubeUrl(e.target.value);
                  setYoutubeError(null);
                }}
                placeholder="https://www.youtube.com/watch?v=…"
                autoFocus
              />
              {youtubeError && (
                <p className="text-xs text-destructive">{youtubeError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Supported formats: youtube.com/watch?v=…, youtu.be/…,
                youtube.com/shorts/…, youtube.com/embed/…
              </p>
            </div>
          )}

          {tab === "file" && (
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <Label>Pick a video</Label>
                <p className="text-xs text-muted-foreground">
                  Showing {files.length} of {total}
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search videos…"
                  className="pl-9"
                />
              </div>

              {pending && files.length === 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-video rounded-md" />
                  ))}
                </div>
              ) : files.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">
                  No videos found.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[320px] overflow-y-auto p-1">
                  {files.map((f) => {
                    const active = selectedId === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedId(active ? null : f.id)}
                        className={`group relative aspect-video rounded-md overflow-hidden border bg-muted flex items-center justify-center ${
                          active ? "ring-2 ring-primary" : ""
                        }`}
                        title={f.title ?? f.filename}
                      >
                        <Film className="h-8 w-8 text-muted-foreground" />
                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
                          {f.title ?? f.filename}
                        </span>
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
                    {pending ? "Loading…" : "Load more"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2 pt-4 border-t">
          <Label htmlFor="video-size">Size</Label>
          <Select value={sizePreset} onValueChange={setSizePreset}>
            <SelectTrigger id="video-size" className="w-full">
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {SIZE_PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {sizePreset === "custom" && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="space-y-1">
                <Label htmlFor="video-width" className="text-xs">
                  Width
                </Label>
                <Input
                  id="video-width"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(e.target.value)}
                  placeholder="e.g. 640px or 80%"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="video-height" className="text-xs">
                  Height
                </Label>
                <Input
                  id="video-height"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(e.target.value)}
                  placeholder="e.g. 360px (optional)"
                />
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Bare numbers are treated as pixels. Leave height empty to keep the
            video&apos;s aspect ratio.
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleInsert} disabled={!canInsert}>
            Insert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
