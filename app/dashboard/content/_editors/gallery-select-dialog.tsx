"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ImageIcon, Search } from "lucide-react";

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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fetchGalleries } from "@/app/dashboard/gallerymanager/actions";
import type { GalleryListItem } from "@/data/galleries";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "insert" | "edit";
  initialValues?: GalleryDialogValues | null;
  onInsert: (gallery: { galleryId: string; galleryName: string }) => void;
};

const PAGE_SIZE = 12;

type GalleryDialogValues = {
  galleryId: string;
  galleryName?: string | null;
};

export function GallerySelectDialog({
  open,
  onOpenChange,
  mode = "insert",
  initialValues,
  onInsert,
}: Props) {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<GalleryListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialValues?.galleryId ?? null,
  );
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runFetch = useCallback(
    (nextOffset: number, replace: boolean, q: string) => {
      startTransition(async () => {
        const res = await fetchGalleries({
          search: q || undefined,
          limit: PAGE_SIZE,
          offset: nextOffset,
        });
        if ("error" in res) return;
        setTotal(res.total);
        setRows((prev) => (replace ? res.rows : [...prev, ...res.rows]));
        setOffset(nextOffset + res.rows.length);
      });
    },
    [],
  );

  useEffect(() => {
    if (open) {
      runFetch(0, true, "");
    }
  }, [open, runFetch]);

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

  function handleInsert() {
    if (!selectedId) return;
    const gallery = rows.find((r) => r.id === selectedId);
    const galleryName =
      gallery?.name ??
      (initialValues?.galleryId === selectedId
        ? (initialValues.galleryName ?? "")
        : "");
    onInsert({ galleryId: selectedId, galleryName });
    onOpenChange(false);
  }

  const hasMore = rows.length < total;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit gallery" : "Insert gallery"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Choose which gallery this embedded block should render."
              : "Pick an existing gallery from the Gallery Manager. Its images will render as a responsive thumbnail grid in the post."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Galleries</Label>
            <p className="text-xs text-muted-foreground">
              Showing {rows.length} of {total}
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search galleries…"
              className="pl-9"
            />
          </div>

          {pending && rows.length === 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-md" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No galleries found.
            </p>
          ) : (
            <div className="grid max-h-[360px] grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3 lg:grid-cols-4">
              {rows.map((g) => {
                const active = selectedId === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedId(active ? null : g.id)}
                    className={cn(
                      "group flex flex-col overflow-hidden rounded-md border bg-card text-left",
                      "transition-colors hover:border-primary/60",
                      active && "ring-2 ring-primary",
                    )}
                    title={g.name}
                  >
                    <div className="relative aspect-square w-full bg-muted">
                      {g.coverFileId ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/files/${g.coverFileId}`}
                          alt={g.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 p-2">
                      <span className="line-clamp-1 text-sm font-medium">
                        {g.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {g.imageCount}
                      </span>
                    </div>
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

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleInsert} disabled={!selectedId}>
            {mode === "edit" ? "Save changes" : "Insert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
