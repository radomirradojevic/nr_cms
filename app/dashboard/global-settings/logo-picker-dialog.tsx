"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchFiles } from "@/app/dashboard/filemanager/actions";
import type { FileRow } from "@/data/files";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (file: FileRow) => void;
  selectedId: string | null;
};

const PAGE_SIZE = 24;

export function LogoPickerDialog({
  open,
  onOpenChange,
  onSelect,
  selectedId,
}: Props) {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [pickedId, setPickedId] = useState<string | null>(selectedId);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset & load when dialog opens.
  useEffect(() => {
    if (!open) return;
    setPickedId(selectedId);
    setSearch("");
    runFetch(0, true, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function handleConfirm() {
    if (!pickedId) return;
    const file = files.find((f) => f.id === pickedId);
    if (!file) return;
    onSelect(file);
    onOpenChange(false);
  }

  const hasMore = files.length < total;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Choose Logo from File Manager</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search images…"
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
            No images found.
          </p>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[420px] overflow-y-auto">
            {files.map((f) => {
              const isPicked = pickedId === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPickedId(f.id)}
                  className={`group relative aspect-square rounded-md overflow-hidden border bg-muted transition ${
                    isPicked
                      ? "ring-2 ring-primary border-primary"
                      : "hover:border-foreground/30"
                  }`}
                  title={f.filename}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/files/${f.id}`}
                    alt={f.alt ?? f.filename}
                    className="w-full h-full object-contain"
                  />
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            Showing {files.length} of {total}
          </p>
          {hasMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => runFetch(offset, false, search)}
              disabled={pending}
            >
              {pending ? "Loading…" : "Load more"}
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!pickedId}>
            Use selected image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
