"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CalendarIcon, Search, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import type { FileRow } from "@/data/files";
import type { UploaderInfo } from "./page";
import type { FileKind } from "@/lib/file-manager";
import { UploadDropzone } from "./upload-dropzone";
import { FileCard } from "./file-card";
import { useRegionalSettings } from "@/components/regional-settings-provider";
import { DeleteFileDialog } from "./delete-file-dialog";
import { fetchFiles } from "./actions";

type Props = {
  initialFiles: FileRow[];
  initialTotal: number;
  pageSize: number;
  isAdmin: boolean;
  uploaders: UploaderInfo[];
  maxFileSize: number;
  maxBatchSize: number;
};

type DateRange = { from?: Date; to?: Date };

function toDateInputValue(date: Date | undefined): string | undefined {
  if (!date) return undefined;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function FileManager({
  initialFiles,
  initialTotal,
  pageSize,
  isAdmin,
  uploaders,
  maxFileSize,
  maxBatchSize,
}: Props) {
  const { formatDate } = useRegionalSettings();
  const [files, setFiles] = useState<FileRow[]>(initialFiles);
  const [total, setTotal] = useState(initialTotal);
  const [offset, setOffset] = useState(initialFiles.length);

  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<FileKind | "all">("all");
  const [range, setRange] = useState<DateRange>({});
  const [uploadedBy, setUploadedBy] = useState<string>("all");

  const [uploaderMap, setUploaderMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(uploaders.map((u) => [u.id, u.name])),
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refetch list when filters change (debounced).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runFetch(0, true);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, kind, range.from, range.to, uploadedBy]);

  function runFetch(nextOffset: number, replace: boolean) {
    startTransition(async () => {
      const res = await fetchFiles({
        kind,
        search: search || undefined,
        from: toDateInputValue(range.from),
        to: toDateInputValue(range.to),
        uploadedBy: uploadedBy !== "all" ? uploadedBy : undefined,
        limit: pageSize,
        offset: nextOffset,
      });
      if ("error" in res) return;
      setTotal(res.total);
      setFiles((prev) => (replace ? res.rows : [...prev, ...res.rows]));
      setOffset(nextOffset + res.rows.length);
    });
  }

  function loadMore() {
    runFetch(offset, false);
  }

  function toggleSelected(id: string, next: boolean) {
    setSelected((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function handleUploaded(newFiles: FileRow[]) {
    setFiles((prev) => [...newFiles, ...prev]);
    setTotal((t) => t + newFiles.length);
    setOffset((o) => o + newFiles.length);
  }

  function handleUpdated(updated: FileRow) {
    setFiles((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  }

  function handleReassigned(
    file: FileRow,
    newOwnerId: string,
    newOwnerName: string,
  ) {
    setUploaderMap((prev) => ({ ...prev, [newOwnerId]: newOwnerName }));
    handleUpdated(file);
  }

  function handleDeleted(ids: string[]) {
    setFiles((prev) => prev.filter((f) => !ids.includes(f.id)));
    setTotal((t) => Math.max(0, t - ids.length));
    setOffset((o) => Math.max(0, o - ids.length));
    setSelected((prev) => {
      const copy = new Set(prev);
      for (const id of ids) copy.delete(id);
      return copy;
    });
  }

  const selectedIds = useMemo(() => Array.from(selected), [selected]);
  const hasSelection = selectedIds.length > 0;
  const hasMore = files.length < total;

  return (
    <div className="space-y-6">
      <UploadDropzone
        onUploaded={handleUploaded}
        maxFileSize={maxFileSize}
        maxBatchSize={maxBatchSize}
      />

      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search filenames, titles, or alt text…"
            className="pl-9"
          />
        </div>

        <Select
          value={kind}
          onValueChange={(v) => setKind(v as FileKind | "all")}
        >
          <SelectTrigger className="w-full md:w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
          </SelectContent>
        </Select>

        {isAdmin && uploaders.length > 0 && (
          <Select value={uploadedBy} onValueChange={setUploadedBy}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Uploaded by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {uploaders.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full md:w-[260px] justify-start font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {range.from
                ? range.to
                  ? `${formatDate(range.from)} - ${formatDate(range.to)}`
                  : formatDate(range.from)
                : "Date range"}
              {(range.from || range.to) && (
                <X
                  className="ml-auto h-4 w-4 opacity-60 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRange({});
                  }}
                />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={
                range.from ? { from: range.from, to: range.to } : undefined
              }
              onSelect={(r) => setRange({ from: r?.from, to: r?.to })}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {hasSelection && (
        <div className="sticky top-16 z-10 flex items-center justify-between rounded-md border bg-background/90 backdrop-blur p-3 shadow-sm">
          <p className="text-sm">
            {selectedIds.length} selected
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="ml-2"
            >
              Clear
            </Button>
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete selected
          </Button>
        </div>
      )}

      {pending && files.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-md" />
          ))}
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No files found.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              selected={selected.has(file.id)}
              onToggleSelected={toggleSelected}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
              uploaderName={uploaderMap[file.uploadedBy] ?? file.uploadedBy}
              isAdmin={isAdmin}
              onReassigned={handleReassigned}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {files.length} of {total}
        </p>
        {hasMore && (
          <Button variant="outline" onClick={loadMore} disabled={pending}>
            {pending ? "Loading…" : "Load more"}
          </Button>
        )}
      </div>

      <DeleteFileDialog
        ids={selectedIds}
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
