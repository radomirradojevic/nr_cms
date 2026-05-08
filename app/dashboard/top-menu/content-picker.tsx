"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { FileText, GripVertical, Newspaper } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { ContentPickerItem } from "@/data/top-menu";

type Props = {
  items: ContentPickerItem[];
};

export function ContentPicker({ items }: Props) {
  const [query, setQuery] = useState("");
  const filtered = items.filter(
    (i) =>
      i.title.toLowerCase().includes(query.toLowerCase()) ||
      i.slug.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search content…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul className="space-y-1 max-h-[60vh] overflow-y-auto">
        {filtered.length === 0 && (
          <li className="text-sm text-muted-foreground py-2 text-center">
            No content items found.
          </li>
        )}
        {filtered.map((item) => (
          <PickerRow key={item.id} item={item} />
        ))}
      </ul>
    </div>
  );
}

function PickerRow({ item }: { item: ContentPickerItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `picker-${item.id}`,
      data: { kind: "picker", contentId: item.id, title: item.title },
    });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-2 px-2 py-1.5 rounded border bg-background cursor-grab active:cursor-grabbing hover:bg-accent/30"
    >
      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
      {item.contentType === "page" ? (
        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      ) : (
        <Newspaper className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      )}
      <span className="text-sm truncate flex-1">{item.title}</span>
      {item.status !== "published" && (
        <Badge variant="outline" className="text-[10px]">
          {item.status}
        </Badge>
      )}
    </li>
  );
}
