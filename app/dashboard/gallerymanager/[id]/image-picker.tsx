"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Plus, Search } from "lucide-react";

import { useTranslations } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchFiles } from "@/app/dashboard/filemanager/actions";
import type { FileRow } from "@/data/galleries";

type Props = {
  initialFiles: FileRow[];
  initialTotal: number;
  pageSize: number;
  onAddSelected: (files: FileRow[]) => void;
};

type SortMode = "newest" | "oldest";

export function ImagePicker({
  initialFiles,
  initialTotal,
  pageSize,
  onAddSelected,
}: Props) {
  const t = useTranslations();
  const [files, setFiles] = useState<FileRow[]>(initialFiles);
  const [total, setTotal] = useState(initialTotal);
  const [offset, setOffset] = useState(initialFiles.length);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runFetch(0, true);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function runFetch(nextOffset: number, replace: boolean) {
    startTransition(async () => {
      const res = await fetchFiles({
        kind: "image",
        search: search || undefined,
        limit: pageSize,
        offset: nextOffset,
      });
      if ("error" in res) return;
      setTotal(res.total);
      setFiles((prev) => (replace ? res.rows : [...prev, ...res.rows]));
      setOffset(nextOffset + res.rows.length);
    });
  }

  const sorted = useMemo(() => {
    const copy = [...files];
    copy.sort((a, b) => {
      const at = new Date(a.created).getTime();
      const bt = new Date(b.created).getTime();
      return sortMode === "newest" ? bt - at : at - bt;
    });
    return copy;
  }, [files, sortMode]);

  function toggle(id: string, next: boolean) {
    setSelected((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  }

  function handleAdd() {
    const chosen = files.filter((f) => selected.has(f.id));
    if (chosen.length === 0) return;
    onAddSelected(chosen);
    setSelected(new Set());
  }

  const hasMore = files.length < total;
  const selectedCount = selected.size;

  return (
    <Card className="p-4 space-y-3 h-fit">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {t("dashboard.galleries.detail.fileManagerImages")}
        </h2>
        <Button size="sm" onClick={handleAdd} disabled={selectedCount === 0}>
          <Plus className="mr-2 h-4 w-4" />
          {t("dashboard.galleries.detail.addSelected")}
          {selectedCount > 0 && ` (${selectedCount})`}
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("dashboard.galleries.detail.searchImages")}
            className="pl-9"
          />
        </div>
        <Select
          value={sortMode}
          onValueChange={(v) => setSortMode(v as SortMode)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">
              {t("dashboard.galleries.detail.newestFirst")}
            </SelectItem>
            <SelectItem value="oldest">
              {t("dashboard.galleries.detail.oldestFirst")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {pending && files.length === 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-md" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-center py-8 text-sm text-muted-foreground">
          {t("dashboard.galleries.detail.noImages")}
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[600px] overflow-y-auto">
          {sorted.map((f) => (
            <PickerThumb
              key={f.id}
              file={f}
              selected={selected.has(f.id)}
              onToggle={toggle}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-muted-foreground">
          {t("dashboard.pagination.showingOfTotal", {
            count: files.length,
            total,
          })}
        </p>
        {hasMore && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => runFetch(offset, false)}
            disabled={pending}
          >
            {pending
              ? t("dashboard.common.actions.loading")
              : t("dashboard.common.actions.loadMore")}
          </Button>
        )}
      </div>
    </Card>
  );
}

function PickerThumb({
  file,
  selected,
  onToggle,
}: {
  file: FileRow;
  selected: boolean;
  onToggle: (id: string, next: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `picker:${file.id}`,
    data: { kind: "picker", file },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`group relative aspect-square rounded-md overflow-hidden border bg-muted cursor-grab ${
        isDragging ? "opacity-50" : ""
      } ${selected ? "ring-2 ring-primary" : ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/files/${file.id}`}
        alt={file.alt ?? file.filename}
        className="w-full h-full object-cover pointer-events-none"
      />
      <div
        className="absolute top-1 left-1 z-10"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onToggle(file.id, Boolean(v))}
          className="bg-background/80 backdrop-blur-sm"
        />
      </div>
    </div>
  );
}
