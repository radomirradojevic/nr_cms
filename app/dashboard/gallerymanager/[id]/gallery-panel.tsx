"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ImageIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { GalleryImageView } from "./gallery-editor";

export const GALLERY_DROP_ID = "gallery-drop-zone";

type Props = {
  images: GalleryImageView[];
  sortableIds: string[];
  onRemove: (fileId: string) => void;
};

export function GalleryPanel({ images, sortableIds, onRemove }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: GALLERY_DROP_ID });

  return (
    <Card
      ref={setNodeRef}
      className={`p-4 space-y-3 border-dashed border-2 min-h-[400px] transition-colors ${
        isOver ? "border-primary bg-primary/5" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Gallery contents</h2>
        <span className="text-xs text-muted-foreground">
          {images.length} image{images.length === 1 ? "" : "s"}
        </span>
      </div>

      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <ImageIcon className="h-10 w-10" />
          <p className="text-sm text-center">
            Drag images here from the left, or check images and click{" "}
            <span className="font-medium">Add selected</span>.
          </p>
        </div>
      ) : (
        <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {images.map((img) => (
              <SortableTile
                key={img.fileId}
                fileId={img.fileId}
                file={img.file}
                onRemove={onRemove}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </Card>
  );
}

function SortableTile({
  fileId,
  file,
  onRemove,
}: {
  fileId: string;
  file: GalleryImageView["file"];
  onRemove: (fileId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `panel:${fileId}`,
    data: { kind: "panel", file },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative aspect-square rounded-md overflow-hidden border bg-muted ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 cursor-grab"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/files/${file.id}`}
          alt={file.alt ?? file.filename}
          className="w-full h-full object-cover pointer-events-none"
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-background z-10"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onRemove(fileId)}
        title="Remove from gallery"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
