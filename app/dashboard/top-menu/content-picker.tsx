"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { FileText, GripVertical, Images, Newspaper, Store } from "lucide-react";
import { useTranslations } from "@/components/i18n-provider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { ContentPickerItem } from "@/data/top-menu";
import {
  getContentStatusLabelKey,
  isContentStatus,
} from "@/lib/content-status";
import { getContentScheduleState } from "@/lib/content-schedule";

type Props = {
  items: ContentPickerItem[];
};

export function ContentPicker({ items }: Props) {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const filtered = items.filter(
    (i) =>
      i.title.toLowerCase().includes(query.toLowerCase()) ||
      i.slug.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <Input
        placeholder={t("dashboard.menus.contentPicker.searchPlaceholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul className="space-y-1 max-h-[60vh] overflow-y-auto">
        {filtered.length === 0 && (
          <li className="text-sm text-muted-foreground py-2 text-center">
            {t("dashboard.menus.contentPicker.empty")}
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
  const t = useTranslations();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `picker-${item.id}`,
      data: { kind: "picker", contentId: item.id, title: item.title },
    });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };
  const scheduleState = getContentScheduleState(item);

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
      ) : item.contentType === "hero_slider" ? (
        <Images className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      ) : item.contentType === "webshop" ? (
        <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      ) : (
        <Newspaper className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      )}
      <span className="text-sm truncate flex-1">{item.title}</span>
      {item.status !== "published" && (
        <Badge variant="outline" className="text-[10px]">
          {isContentStatus(item.status)
            ? t(getContentStatusLabelKey(item.status))
            : item.status}
        </Badge>
      )}
      {scheduleState && (
        <Badge
          variant={scheduleState === "expired" ? "destructive" : "outline"}
          className="text-[10px]"
        >
          {scheduleState === "scheduled"
            ? t("dashboard.content.schedule.scheduled")
            : scheduleState === "live_until"
              ? t("dashboard.content.schedule.liveUntil")
              : t("dashboard.content.schedule.expired")}
        </Badge>
      )}
    </li>
  );
}
