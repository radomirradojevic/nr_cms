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
} from "lucide-react";
import { toast } from "sonner";
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

type Props = {
  file: FileRow;
  selected: boolean;
  onToggleSelected: (id: string, next: boolean) => void;
  onUpdated: (file: FileRow) => void;
  onDeleted: (ids: string[]) => void;
  uploaderName: string;
};

export function FileCard({
  file,
  selected,
  onToggleSelected,
  onUpdated,
  onDeleted,
  uploaderName,
}: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const url = `/api/files/${file.id}`;

  function copyUrl() {
    navigator.clipboard
      .writeText(window.location.origin + url)
      .then(() => toast.success("URL copied to clipboard."))
      .catch(() => toast.error("Could not copy URL."));
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
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={copyUrl}>
                <Copy className="mr-2 h-4 w-4" /> Copy URL
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
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
    </>
  );
}
