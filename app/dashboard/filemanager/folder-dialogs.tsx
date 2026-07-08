"use client";

import { useEffect, useMemo, useState } from "react";
import { Folder, FolderInput, Loader2, Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FileFolderRow, FileRow } from "@/data/files";
import {
  createFileFolder,
  deleteFileFolder,
  fetchFolderOptions,
  moveSelectedFiles,
  renameFileFolder,
} from "./actions";

type CreateFolderDialogProps = {
  parentId: string | null;
  onCreated: (folder: FileFolderRow) => void;
};

export function CreateFolderDialog({
  parentId,
  onCreated,
}: CreateFolderDialogProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createFileFolder({ name, parentId });
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onCreated(result.folder);
    setName("");
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setName("");
          setError(null);
        }
      }}
    >
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        {t("dashboard.files.folder.new")}
      </Button>

      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("dashboard.files.folder.createTitle")}</DialogTitle>
            <DialogDescription>
              {t("dashboard.files.folder.createDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">
                {t("dashboard.files.folder.name")}
              </Label>
              <Input
                id="folder-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {t("dashboard.common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("dashboard.common.actions.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type RenameFolderDialogProps = {
  folder: FileFolderRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRenamed: (folder: FileFolderRow) => void;
};

export function RenameFolderDialog({
  folder,
  open,
  onOpenChange,
  onRenamed,
}: RenameFolderDialogProps) {
  const t = useTranslations();
  const [name, setName] = useState(folder?.name ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      setName(folder?.name ?? "");
      setError(null);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [folder, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!folder) return;
    setLoading(true);
    setError(null);
    const result = await renameFileFolder({ id: folder.id, name });
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onRenamed(result.folder);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("dashboard.files.folder.rename")}</DialogTitle>
            <DialogDescription>
              {t("dashboard.files.folder.renameDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-folder-name">
                {t("dashboard.files.folder.name")}
              </Label>
              <Input
                id="rename-folder-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t("dashboard.common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("dashboard.common.actions.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type DeleteFolderDialogProps = {
  folder: FileFolderRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (id: string) => void;
};

export function DeleteFolderDialog({
  folder,
  open,
  onOpenChange,
  onDeleted,
}: DeleteFolderDialogProps) {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!folder) return;
    setLoading(true);
    setError(null);
    const result = await deleteFileFolder({ id: folder.id });
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onDeleted(result.deleted);
    onOpenChange(false);
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setError(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("dashboard.files.folder.deleteTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("dashboard.files.folder.deleteDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {folder && (
          <p className="text-sm">
            {t("dashboard.files.folder.folderValue", { name: folder.name })}
          </p>
        )}
        {error && <p className="text-sm text-destructive px-1">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {t("dashboard.common.actions.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("dashboard.common.actions.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type MoveFilesDialogProps = {
  ids: string[];
  currentFolderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMoved: (files: FileRow[], folderId: string | null) => void;
};

type FolderOption = FileFolderRow & { depth: number };

function flattenFolders(folders: FileFolderRow[]): FolderOption[] {
  const byParent = new Map<string, FileFolderRow[]>();
  for (const folder of folders) {
    const key = folder.parentId ?? "root";
    byParent.set(key, [...(byParent.get(key) ?? []), folder]);
  }
  for (const rows of byParent.values()) {
    rows.sort((a, b) => a.name.localeCompare(b.name));
  }

  const out: FolderOption[] = [];
  const seen = new Set<string>();

  function visit(parentKey: string, depth: number) {
    for (const folder of byParent.get(parentKey) ?? []) {
      if (seen.has(folder.id)) continue;
      seen.add(folder.id);
      out.push({ ...folder, depth });
      visit(folder.id, depth + 1);
    }
  }

  visit("root", 0);

  for (const folder of folders) {
    if (!seen.has(folder.id)) out.push({ ...folder, depth: 0 });
  }

  return out;
}

function depthPaddingClass(depth: number): string {
  const clamped = Math.min(depth, 6);
  return ["pl-2", "pl-4", "pl-6", "pl-8", "pl-10", "pl-12", "pl-14"][clamped];
}

export function MoveFilesDialog({
  ids,
  currentFolderId,
  open,
  onOpenChange,
  onMoved,
}: MoveFilesDialogProps) {
  const t = useTranslations();
  const [folders, setFolders] = useState<FileFolderRow[]>([]);
  const [selected, setSelected] = useState<string>("root");
  const [loading, setLoading] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      setSelected(currentFolderId ?? "root");
      setError(null);
      setLoadingFolders(true);
      fetchFolderOptions()
        .then((result) => {
          if (cancelled) return;
          if ("error" in result) {
            setError(result.error);
            return;
          }
          setFolders(result.folders);
        })
        .finally(() => {
          if (!cancelled) setLoadingFolders(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [currentFolderId, open]);

  const options = useMemo(() => flattenFolders(folders), [folders]);
  const targetFolderId = selected === "root" ? null : selected;

  async function handleMove() {
    setLoading(true);
    setError(null);
    const result = await moveSelectedFiles({ ids, folderId: targetFolderId });
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onMoved(result.files, targetFolderId);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setError(null);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dashboard.files.move.title")}</DialogTitle>
          <DialogDescription>
            {ids.length === 1
              ? t("dashboard.files.move.descriptionSingle")
              : t("dashboard.files.move.descriptionMultiple")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="max-h-[320px] overflow-y-auto rounded-md border p-1">
            <button
              type="button"
              onClick={() => setSelected("root")}
              className={`flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm ${
                selected === "root" ? "bg-accent text-accent-foreground" : ""
              }`}
            >
              <Folder className="h-4 w-4" />
              {t("dashboard.files.move.root")}
            </button>

            {loadingFolders ? (
              <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("dashboard.files.move.loadingFolders")}
              </div>
            ) : (
              options.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setSelected(folder.id)}
                  className={`flex w-full items-center gap-2 rounded-sm py-2 pr-2 text-left text-sm ${depthPaddingClass(folder.depth)} ${
                    selected === folder.id
                      ? "bg-accent text-accent-foreground"
                      : ""
                  }`}
                >
                  <Folder className="h-4 w-4" />
                  <span className="truncate">{folder.name}</span>
                </button>
              ))
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t("dashboard.common.actions.cancel")}
          </Button>
          <Button type="button" onClick={handleMove} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FolderInput className="mr-2 h-4 w-4" />
            )}
            {t("dashboard.common.actions.move")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
