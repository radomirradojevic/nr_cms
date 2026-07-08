"use client";

import { useState } from "react";
import {
  FileText,
  Film,
  Image as ImageIcon,
  MoreHorizontal,
  Copy,
  Pencil,
  Trash2,
  UserRoundCog,
  FolderInput,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "@/components/i18n-provider";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FileRow } from "@/data/files";
import { formatBytes } from "@/lib/file-manager";
import { EditFileDialog } from "./edit-file-dialog";
import { DeleteFileDialog } from "./delete-file-dialog";
import { ReassignFileDialog } from "./reassign-file-dialog";

type Props = {
  file: FileRow;
  selected: boolean;
  onToggleSelected: (id: string, next: boolean) => void;
  onUpdated: (file: FileRow) => void;
  onDeleted: (ids: string[]) => void;
  uploaderName: string;
  isAdmin?: boolean;
  onMoveRequested?: (ids: string[]) => void;
  onReassigned?: (
    file: FileRow,
    newOwnerId: string,
    newOwnerName: string,
  ) => void;
};

export function FileCard({
  file,
  selected,
  onToggleSelected,
  onUpdated,
  onDeleted,
  uploaderName,
  isAdmin,
  onMoveRequested,
  onReassigned,
}: Props) {
  const t = useTranslations();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);

  const url = `/api/files/${file.id}`;

  function copyUrl() {
    navigator.clipboard
      .writeText(window.location.origin + url)
      .then(() => toast.success(t("dashboard.toasts.copiedUrl")))
      .catch(() => toast.error(t("dashboard.toasts.copyUrlFailed")));
  }

  return (
    <>
      <Card className="overflow-hidden p-0 group relative flex flex-col">
        <div className="absolute top-2 left-2 z-10">
          <Checkbox
            checked={selected}
            onCheckedChange={(v) => onToggleSelected(file.id, Boolean(v))}
            className="bg-background/80 backdrop-blur-sm"
          />
        </div>
        <div className="absolute top-2 right-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-background/80 backdrop-blur-sm"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                {t("dashboard.common.actions.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={copyUrl}>
                <Copy className="mr-2 h-4 w-4" />
                {t("dashboard.common.actions.copyUrl")}
              </DropdownMenuItem>
              {onMoveRequested && (
                <DropdownMenuItem onSelect={() => onMoveRequested([file.id])}>
                  <FolderInput className="mr-2 h-4 w-4" />
                  {t("dashboard.common.actions.move")}
                </DropdownMenuItem>
              )}
              {isAdmin && (
                <DropdownMenuItem onSelect={() => setReassignOpen(true)}>
                  <UserRoundCog className="mr-2 h-4 w-4" />
                  {t("dashboard.common.actions.reassignOwner")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onSelect={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("dashboard.common.actions.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
          {file.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={file.alt ?? file.filename}
              className="w-full h-full object-cover"
            />
          ) : file.kind === "video" ? (
            <Film className="h-12 w-12 text-muted-foreground" />
          ) : (
            <FileText className="h-12 w-12 text-muted-foreground" />
          )}
        </div>

        <div className="p-3 space-y-1 min-w-0">
          <p
            className="text-sm font-medium truncate"
            title={file.title ?? file.filename}
          >
            {file.title || file.filename}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {file.mimeType} · {formatBytes(file.sizeBytes)}
          </p>
          <p
            className="text-xs text-muted-foreground truncate"
            title={uploaderName}
          >
            ↑ {uploaderName}
          </p>
        </div>

        {/* unused import guard */}
        <span className="hidden">
          <ImageIcon />
        </span>
      </Card>

      <EditFileDialog
        file={file}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={onUpdated}
      />
      <DeleteFileDialog
        ids={[file.id]}
        label={file.filename}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={onDeleted}
      />
      {isAdmin && onReassigned && (
        <ReassignFileDialog
          file={file}
          ownerName={uploaderName}
          open={reassignOpen}
          onOpenChange={setReassignOpen}
          onReassigned={onReassigned}
        />
      )}
    </>
  );
}
