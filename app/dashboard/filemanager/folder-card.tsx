"use client";

import { Folder, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "@/components/i18n-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FileFolderRow } from "@/data/files";

type Props = {
  folder: FileFolderRow;
  canManage: boolean;
  onOpen: (id: string) => void;
  onRename: (folder: FileFolderRow) => void;
  onDelete: (folder: FileFolderRow) => void;
};

export function FolderCard({
  folder,
  canManage,
  onOpen,
  onRename,
  onDelete,
}: Props) {
  const t = useTranslations();

  return (
    <Card className="overflow-hidden p-0 group relative flex flex-col">
      {canManage && (
        <div className="absolute top-2 right-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onRename(folder)}>
                <Pencil className="mr-2 h-4 w-4" />
                {t("dashboard.files.actions.rename")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onDelete(folder)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("dashboard.common.actions.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <button
        type="button"
        onClick={() => onOpen(folder.id)}
        className="flex min-h-full w-full flex-col text-left"
      >
        <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
          <Folder className="h-14 w-14 text-muted-foreground" />
        </div>
        <div className="p-3 space-y-1 min-w-0">
          <p className="text-sm font-medium truncate" title={folder.name}>
            {folder.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("dashboard.files.folder.folderLabel")}
          </p>
        </div>
      </button>
    </Card>
  );
}
