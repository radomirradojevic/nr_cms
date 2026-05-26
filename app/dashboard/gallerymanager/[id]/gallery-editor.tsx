"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { toast } from "sonner";

import type { GalleryDetail, FileRow } from "@/data/galleries";
import { ImagePicker } from "./image-picker";
import { GalleryPanel, GALLERY_DROP_ID } from "./gallery-panel";
import {
  addImagesToGallery,
  removeImageFromGallery,
  reorderGalleryImages,
} from "../actions";

type Props = {
  gallery: GalleryDetail;
  initialPickerFiles: FileRow[];
  initialPickerTotal: number;
  pickerPageSize: number;
  isAdmin: boolean;
};

export type GalleryImageView = {
  fileId: string;
  file: FileRow;
};

export function GalleryEditor({
  gallery,
  initialPickerFiles,
  initialPickerTotal,
  pickerPageSize,
  isAdmin,
}: Props) {
  void isAdmin;

  const [images, setImages] = useState<GalleryImageView[]>(
    gallery.images.map((i) => ({ fileId: i.fileId, file: i.file })),
  );
  const [activeFile, setActiveFile] = useState<FileRow | null>(null);
  const [activeSource, setActiveSource] = useState<"picker" | "panel" | null>(
    null,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const sortableIds = useMemo(
    () => images.map((i) => `panel:${i.fileId}`),
    [images],
  );

  function handleDragStart(e: DragStartEvent) {
    const data = e.active.data.current as
      | { kind?: "picker" | "panel"; file?: FileRow }
      | undefined;
    if (data?.file) {
      setActiveFile(data.file);
      setActiveSource(data.kind ?? null);
    }
  }

  async function handleAddOne(file: FileRow) {
    // Optimistic insert
    const exists = images.some((i) => i.fileId === file.id);
    if (exists) {
      toast.error("This image is already in the gallery.");
      return;
    }
    setImages((prev) => [...prev, { fileId: file.id, file }]);
    const res = await addImagesToGallery({
      galleryId: gallery.id,
      fileIds: [file.id],
    });
    if ("error" in res && res.error) {
      // rollback
      setImages((prev) => prev.filter((i) => i.fileId !== file.id));
      toast.error(res.error);
      return;
    }
    const duplicates = "duplicates" in res ? (res.duplicates ?? []) : [];
    if (duplicates.length > 0) {
      // rollback the optimistic insert (server reports duplicate)
      setImages((prev) => prev.filter((i) => i.fileId !== file.id));
      toast.error("This image is already in the gallery.");
    }
  }

  async function handleAddMany(files: FileRow[]) {
    if (files.length === 0) return;
    const newOnes = files.filter((f) => !images.some((i) => i.fileId === f.id));
    if (newOnes.length === 0) {
      toast.error("All selected images are already in the gallery.");
      return;
    }
    setImages((prev) => [
      ...prev,
      ...newOnes.map((f) => ({ fileId: f.id, file: f })),
    ]);
    const res = await addImagesToGallery({
      galleryId: gallery.id,
      fileIds: newOnes.map((f) => f.id),
    });
    if ("error" in res && res.error) {
      setImages((prev) =>
        prev.filter((i) => !newOnes.some((f) => f.id === i.fileId)),
      );
      toast.error(res.error);
      return;
    }
    const duplicates = "duplicates" in res ? (res.duplicates ?? []) : [];
    if (duplicates.length > 0) {
      const dupSet = new Set(duplicates);
      setImages((prev) => prev.filter((i) => !dupSet.has(i.fileId)));
      toast.error(`${duplicates.length} image(s) are already in this gallery.`);
    }
    const added = "added" in res ? (res.added ?? []) : [];
    if (added.length > 0) {
      toast.success(`Added ${added.length} image(s).`);
    }
  }

  async function persistOrder(next: GalleryImageView[]) {
    const res = await reorderGalleryImages({
      galleryId: gallery.id,
      orderedFileIds: next.map((i) => i.fileId),
    });
    if ("error" in res && res.error) {
      toast.error(res.error);
    }
  }

  async function handleRemove(fileId: string) {
    const previous = images;
    setImages((prev) => prev.filter((i) => i.fileId !== fileId));
    const res = await removeImageFromGallery({
      galleryId: gallery.id,
      fileId,
    });
    if ("error" in res && res.error) {
      setImages(previous);
      toast.error(res.error);
      return;
    }
    toast.success("Image removed from gallery.");
  }

  async function handleDragEnd(e: DragEndEvent) {
    const sourceKind = activeSource;
    const dragged = activeFile;
    setActiveFile(null);
    setActiveSource(null);
    if (!dragged) return;

    const overId = e.over?.id ? String(e.over.id) : null;

    // Picker → panel
    if (sourceKind === "picker") {
      const isOverPanel =
        overId === GALLERY_DROP_ID || overId?.startsWith("panel:");
      if (isOverPanel) {
        await handleAddOne(dragged);
      }
      return;
    }

    // Panel reorder
    if (sourceKind === "panel" && overId && overId.startsWith("panel:")) {
      const activeId = `panel:${dragged.id}`;
      if (activeId === overId) return;
      const oldIndex = images.findIndex((i) => i.fileId === dragged.id);
      const overFileId = overId.slice("panel:".length);
      const newIndex = images.findIndex((i) => i.fileId === overFileId);
      if (oldIndex < 0 || newIndex < 0) return;
      const reordered = arrayMove(images, oldIndex, newIndex);
      setImages(reordered);
      await persistOrder(reordered);
    }
  }

  return (
    <DndContext
      id="gallery-dnd"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveFile(null);
        setActiveSource(null);
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ImagePicker
          initialFiles={initialPickerFiles}
          initialTotal={initialPickerTotal}
          pageSize={pickerPageSize}
          onAddSelected={handleAddMany}
        />

        <GalleryPanel
          images={images}
          sortableIds={sortableIds}
          onRemove={handleRemove}
        />
      </div>

      <DragOverlay>
        {activeFile ? (
          <div className="bg-popover shadow-lg rounded-md border overflow-hidden w-24 h-24">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/files/${activeFile.id}`}
              alt={activeFile.alt ?? activeFile.filename}
              className="w-full h-full object-cover"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
