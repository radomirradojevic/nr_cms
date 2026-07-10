"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ExternalLink, FileText, FolderTree } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSourceTranslations } from "@/components/source-translations";
import type { FlatItem } from "./tree-utils";
import { EditItemDialog } from "./edit-item-dialog";
import { DeleteItemDialog } from "./delete-item-dialog";

type Props = {
  menuId: string;
  item: FlatItem;
  depth: number;
  indent: number;
  onMutated: () => void;
  disabled?: boolean;
  clientId?: string;
};

export function MenuTreeRow({
  menuId,
  item,
  depth,
  indent,
  onMutated,
  disabled,
  clientId,
}: Props) {
  const st = useSourceTranslations();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: { kind: "tree" },
    disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    paddingLeft: depth * indent + 8,
    opacity: isDragging ? 0.4 : 1,
  };

  const isContent = !!item.contentId;
  const isCategory = !!item.categoryId;
  const isExternal = /^https?:\/\//i.test(item.url);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 py-2 pr-3 bg-card hover:bg-accent/30"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={st("Drag handle")}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="font-medium truncate">{item.label}</span>
        {isContent ? (
          <Badge variant="secondary" className="gap-1">
            <FileText className="h-3 w-3" />
            {st("Content")}
          </Badge>
        ) : isCategory ? (
          <Badge variant="secondary" className="gap-1">
            <FolderTree className="h-3 w-3" />
            {st("Blog category")}
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <ExternalLink className="h-3 w-3" />
            {isExternal ? st("External") : st("Custom")}
          </Badge>
        )}
        {item.target === "_blank" && (
          <Badge variant="outline" className="text-[10px]">
            {st("new tab")}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground truncate">
          {item.url}
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <EditItemDialog
          menuId={menuId}
          item={{
            id: item.id,
            label: item.label,
            url: item.url,
            target: item.target,
            contentId: item.contentId,
            categoryId: item.categoryId,
          }}
          onSuccess={onMutated}
          disabled={disabled}
          clientId={clientId}
        />
        <DeleteItemDialog
          menuId={menuId}
          item={{ id: item.id, label: item.label }}
          onSuccess={onMutated}
          disabled={disabled}
          clientId={clientId}
        />
      </div>
    </li>
  );
}
