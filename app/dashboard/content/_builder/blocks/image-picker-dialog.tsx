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
import { Skeleton } from "@/components/ui/skeleton";
import { fetchFiles } from "@/app/dashboard/filemanager/actions";
import type { FileRow } from "@/data/files";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (args: { src: string; alt: string }) => void;
};

const PAGE_SIZE = 24;

/**
 * Image picker dialog scoped to uploaded images in the CMS File Manager.
 * Returns the public file URL (and best-effort alt text) of the selected
 * image to the caller via `onSelect`.
 */
export function ImagePickerDialog({ open, onOpenChange, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [files, setFiles] = useState<FileRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state whenever the dialog is (re)opened.
  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      setSearch("");
      setSelectedId(null);
      setFiles([]);
      setOffset(0);
      runFetch(0, true, "");
    }, 0);
    return () => window.clearTimeout(timeout);
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

  const selected = selectedId
    ? (files.find((f) => f.id === selectedId) ?? null)
    : null;
  const hasMore = files.length < total;

  function handleSelect() {
    if (!selected) return;
    onSelect({
      src: `/api/files/${selected.id}`,
      alt: selected.alt ?? selected.title ?? selected.filename ?? "",
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Choose image from File Manager</DialogTitle>
          <DialogDescription>
            Pick an uploaded image to use for this block.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search images…"
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground whitespace-nowrap">
              Showing {files.length} of {total}
            </p>
          </div>

          {pending && files.length === 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-md" />
              ))}
            </div>
          ) : files.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">
              No images found.
            </p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[320px] overflow-y-auto p-1">
              {files.map((f) => {
                const active = selectedId === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedId(active ? null : f.id)}
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
                {pending ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}

          {selected ? (
            <div className="rounded-md border p-3 space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Preview
              </Label>
              <div className="flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/files/${selected.id}`}
                  alt={selected.alt ?? selected.filename}
                  className="h-24 w-24 object-cover rounded border bg-muted"
                />
                <div className="min-w-0 text-sm">
                  <p className="truncate font-medium">
                    {selected.title ?? selected.filename}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {selected.filename}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    /api/files/{selected.id}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSelect} disabled={!selected}>
            Use selected image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
