"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  CalendarIcon,
  ChevronRight,
  FolderInput,
  Home,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import type { FileFolderRow, FileRow } from "@/data/files";
import type { UploaderInfo } from "./page";
import type { FileKind } from "@/lib/file-manager";
import { UploadDropzone } from "./upload-dropzone";
import { FileCard } from "./file-card";
import { FolderCard } from "./folder-card";
import { useRegionalSettings } from "@/components/regional-settings-provider";
import { DeleteFileDialog } from "./delete-file-dialog";
import { fetchFileManagerView } from "./actions";
import {
  CreateFolderDialog,
  DeleteFolderDialog,
  MoveFilesDialog,
  RenameFolderDialog,
} from "./folder-dialogs";

type Props = {
  initialFiles: FileRow[];
  initialFolders: FileFolderRow[];
  initialBreadcrumb: FileFolderRow[];
  initialTotal: number;
  pageSize: number;
  isAdmin: boolean;
  currentUserId: string;
  uploaders: UploaderInfo[];
  maxFileSize: number;
  maxBatchSize: number;
  storageProvider: "local" | "vercel-blob";
};

type DateRange = { from?: Date; to?: Date };

function toDateInputValue(date: Date | undefined): string | undefined {
  if (!date) return undefined;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sameFolder(a: string | null | undefined, b: string | null): boolean {
  return (a ?? null) === b;
}

function sortFolders(folders: FileFolderRow[]): FileFolderRow[] {
  return [...folders].sort((a, b) => a.name.localeCompare(b.name));
}

export function FileManager({
  initialFiles,
  initialFolders,
  initialBreadcrumb,
  initialTotal,
  pageSize,
  isAdmin,
  currentUserId,
  uploaders,
  maxFileSize,
  maxBatchSize,
  storageProvider,
}: Props) {
  const t = useTranslations();
  const { formatDate } = useRegionalSettings();
  const [files, setFiles] = useState<FileRow[]>(initialFiles);
  const [folders, setFolders] = useState<FileFolderRow[]>(
    sortFolders(initialFolders),
  );
  const [breadcrumb, setBreadcrumb] =
    useState<FileFolderRow[]>(initialBreadcrumb);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(
    initialBreadcrumb[initialBreadcrumb.length - 1]?.id ?? null,
  );
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
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveIds, setMoveIds] = useState<string[]>([]);
  const [renameFolder, setRenameFolder] = useState<FileFolderRow | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<FileFolderRow | null>(null);
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
  }, [search, kind, range.from, range.to, uploadedBy, currentFolderId]);

  function runFetch(nextOffset: number, replace: boolean) {
    startTransition(async () => {
      const res = await fetchFileManagerView({
        kind,
        search: search || undefined,
        from: toDateInputValue(range.from),
        to: toDateInputValue(range.to),
        uploadedBy: uploadedBy !== "all" ? uploadedBy : undefined,
        folderId: currentFolderId,
        limit: pageSize,
        offset: nextOffset,
      });
      if ("error" in res) return;
      setTotal(res.total);
      setFiles((prev) => (replace ? res.rows : [...prev, ...res.rows]));
      setOffset(nextOffset + res.rows.length);
      if (replace) {
        setFolders(sortFolders(res.folders));
        setBreadcrumb(res.breadcrumb);
      }
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

  function navigateToFolder(folderId: string | null) {
    clearSelection();
    if (sameFolder(folderId, currentFolderId)) {
      runFetch(0, true);
      return;
    }
    setCurrentFolderId(folderId);
    setFiles([]);
    setFolders([]);
    setTotal(0);
    setOffset(0);
  }

  function fileMatchesCurrentView(file: FileRow): boolean {
    if (!sameFolder(file.folderId, currentFolderId)) return false;
    if (kind !== "all" && file.kind !== kind) return false;
    if (isAdmin && uploadedBy !== "all" && file.uploadedBy !== uploadedBy) {
      return false;
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const haystack = [file.filename, file.title ?? "", file.alt ?? ""]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (range.from || range.to) {
      const created = new Date(file.created);
      if (range.from && created < range.from) return false;
      if (range.to) {
        const toEnd = new Date(range.to);
        toEnd.setHours(23, 59, 59, 999);
        if (created > toEnd) return false;
      }
    }
    return true;
  }

  function handleUploaded(newFiles: FileRow[]) {
    const visible = newFiles.filter(fileMatchesCurrentView);
    if (visible.length === 0) return;
    setFiles((prev) => [...visible, ...prev]);
    setTotal((t) => t + visible.length);
    setOffset((o) => o + visible.length);
  }

  function handleUpdated(updated: FileRow) {
    const exists = files.some((f) => f.id === updated.id);
    const visible = fileMatchesCurrentView(updated);
    if (exists && !visible) {
      setFiles((prev) => prev.filter((f) => f.id !== updated.id));
      setTotal((t) => Math.max(0, t - 1));
      setOffset((o) => Math.max(0, o - 1));
      return;
    }
    if (!exists && visible) {
      setFiles((prev) => [updated, ...prev]);
      setTotal((t) => t + 1);
      setOffset((o) => o + 1);
      return;
    }
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

  function handleFolderCreated(folder: FileFolderRow) {
    if (!sameFolder(folder.parentId, currentFolderId)) return;
    setFolders((prev) => sortFolders([...prev, folder]));
  }

  function handleFolderRenamed(folder: FileFolderRow) {
    setFolders((prev) =>
      sortFolders(prev.map((f) => (f.id === folder.id ? folder : f))),
    );
    setBreadcrumb((prev) => prev.map((f) => (f.id === folder.id ? folder : f)));
  }

  function handleFolderDeleted(id: string) {
    setFolders((prev) => prev.filter((f) => f.id !== id));
  }

  function requestMove(ids: string[]) {
    setMoveIds(ids);
    setMoveOpen(true);
  }

  function handleMoved(movedFiles: FileRow[], targetFolderId: string | null) {
    const movedIds = movedFiles.map((f) => f.id);
    if (sameFolder(targetFolderId, currentFolderId)) {
      setFiles((prev) =>
        prev.map((file) => {
          const moved = movedFiles.find((f) => f.id === file.id);
          return moved ?? file;
        }),
      );
    } else {
      setFiles((prev) => prev.filter((f) => !movedIds.includes(f.id)));
      setTotal((t) => Math.max(0, t - movedIds.length));
      setOffset((o) => Math.max(0, o - movedIds.length));
    }
    setSelected((prev) => {
      const copy = new Set(prev);
      for (const id of movedIds) copy.delete(id);
      return copy;
    });
  }

  function canManageFolder(folder: FileFolderRow): boolean {
    return isAdmin || folder.createdBy === currentUserId;
  }

  const selectedIds = useMemo(() => Array.from(selected), [selected]);
  const hasSelection = selectedIds.length > 0;
  const hasMore = files.length < total;
  const currentFolderName =
    breadcrumb[breadcrumb.length - 1]?.name ?? t("dashboard.files.title");

  return (
    <div className="space-y-6">
      <UploadDropzone
        onUploaded={handleUploaded}
        maxFileSize={maxFileSize}
        maxBatchSize={maxBatchSize}
        storageProvider={storageProvider}
        currentFolderId={currentFolderId}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <nav
          className="flex min-w-0 flex-wrap items-center gap-1 text-sm"
          aria-label={t("dashboard.files.foldersAria")}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigateToFolder(null)}
            className="px-2"
          >
            <Home className="mr-1 h-4 w-4" />
            {t("dashboard.files.root")}
          </Button>
          {breadcrumb.map((folder) => (
            <span key={folder.id} className="flex min-w-0 items-center gap-1">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigateToFolder(folder.id)}
                className="max-w-[180px] px-2"
                title={folder.name}
              >
                <span className="truncate">{folder.name}</span>
              </Button>
            </span>
          ))}
        </nav>

        <CreateFolderDialog
          parentId={currentFolderId}
          onCreated={handleFolderCreated}
        />
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("dashboard.files.searchPlaceholder")}
            className="pl-9"
          />
        </div>

        <Select
          value={kind}
          onValueChange={(v) => setKind(v as FileKind | "all")}
        >
          <SelectTrigger className="w-full md:w-[160px]">
            <SelectValue placeholder={t("dashboard.filters.type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("dashboard.filters.allTypes")}
            </SelectItem>
            <SelectItem value="image">
              {t("dashboard.files.fileKinds.images")}
            </SelectItem>
            <SelectItem value="video">
              {t("dashboard.files.fileKinds.video")}
            </SelectItem>
            <SelectItem value="document">
              {t("dashboard.files.fileKinds.documents")}
            </SelectItem>
          </SelectContent>
        </Select>

        {isAdmin && uploaders.length > 0 && (
          <Select value={uploadedBy} onValueChange={setUploadedBy}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder={t("dashboard.filters.uploadedBy")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("dashboard.filters.allUsers")}
              </SelectItem>
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
                : t("dashboard.files.dateRange")}
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
            {t("dashboard.common.selection.selectedCount", {
              count: selectedIds.length,
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="ml-2"
            >
              {t("dashboard.common.actions.clear")}
            </Button>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => requestMove(selectedIds)}
            >
              <FolderInput className="mr-2 h-4 w-4" />
              {t("dashboard.common.actions.moveSelected")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("dashboard.common.actions.deleteSelected")}
            </Button>
          </div>
        </div>
      )}

      {pending && files.length === 0 && folders.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-md" />
          ))}
        </div>
      ) : files.length === 0 && folders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {t("dashboard.files.noFilesInFolder", { folder: currentFolderName })}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {folders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              canManage={canManageFolder(folder)}
              onOpen={navigateToFolder}
              onRename={setRenameFolder}
              onDelete={setDeleteFolder}
            />
          ))}
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
              onMoveRequested={requestMove}
              onReassigned={handleReassigned}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("dashboard.files.showingSummary", {
            count: files.length,
            total,
          })}
          {folders.length > 0 &&
            ` - ${t.plural("dashboard.files.folderCount", folders.length)}`}
        </p>
        {hasMore && (
          <Button variant="outline" onClick={loadMore} disabled={pending}>
            {pending
              ? t("dashboard.common.actions.loading")
              : t("dashboard.common.actions.loadMore")}
          </Button>
        )}
      </div>

      <DeleteFileDialog
        ids={selectedIds}
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onDeleted={handleDeleted}
      />
      <MoveFilesDialog
        ids={moveIds}
        currentFolderId={currentFolderId}
        open={moveOpen}
        onOpenChange={(next) => {
          setMoveOpen(next);
          if (!next) setMoveIds([]);
        }}
        onMoved={handleMoved}
      />
      <RenameFolderDialog
        folder={renameFolder}
        open={Boolean(renameFolder)}
        onOpenChange={(open) => {
          if (!open) setRenameFolder(null);
        }}
        onRenamed={handleFolderRenamed}
      />
      <DeleteFolderDialog
        folder={deleteFolder}
        open={Boolean(deleteFolder)}
        onOpenChange={(open) => {
          if (!open) setDeleteFolder(null);
        }}
        onDeleted={handleFolderDeleted}
      />
    </div>
  );
}
