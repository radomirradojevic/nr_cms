"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  fetchHeroSliderPickerItems,
  type HeroSliderPickerItem,
} from "@/app/dashboard/content/_builder/hero-slider-actions";
import { getContentStatusLabel } from "@/lib/content-status";
import { getContentScheduleState } from "@/lib/content-schedule";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: HeroSliderPickerItem) => void;
};

export function HeroSliderSelectDialog({
  open,
  onOpenChange,
  onSelect,
}: Props) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<HeroSliderPickerItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runFetch = useCallback(
    (search: string) => {
      setError(null);
      startTransition(async () => {
        const result = await fetchHeroSliderPickerItems({
          search: search.trim() || undefined,
        });
        if ("error" in result) {
          setError(result.error);
          setRows([]);
          return;
        }
        setRows(result.rows);
      });
    },
    [startTransition],
  );

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      setQuery("");
      setSelectedId(null);
      runFetch("");
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [open, runFetch]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runFetch(query), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, runFetch]);

  const selected = selectedId
    ? rows.find((row) => row.id === selectedId)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Hero Slider</DialogTitle>
          <DialogDescription>
            Choose an existing hero slider to render in this page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search hero sliders..."
              className="pl-9"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {pending && rows.length === 0 ? (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Loading hero sliders...
              </p>
            ) : rows.length === 0 ? (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No hero sliders found.
              </p>
            ) : (
              rows.map((row) => {
                const active = selectedId === row.id;
                const scheduleState = getContentScheduleState(row);
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelectedId(active ? null : row.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md border p-3 text-left transition hover:bg-accent",
                      active && "border-primary bg-accent",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{row.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        /{row.slug}
                      </p>
                    </div>
                    <Badge
                      variant={
                        row.status === "published" ? "default" : "outline"
                      }
                    >
                      {getContentStatusLabel(row.status)}
                    </Badge>
                    {scheduleState && (
                      <Badge
                        variant={
                          scheduleState === "expired"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {scheduleState === "scheduled"
                          ? "Scheduled"
                          : scheduleState === "live_until"
                            ? "Live until"
                            : "Expired"}
                      </Badge>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              onSelect(selected);
              onOpenChange(false);
            }}
          >
            Use Hero Slider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
