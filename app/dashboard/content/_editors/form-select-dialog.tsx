"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { FormInput, Search } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fetchFormsForPicker } from "@/app/dashboard/form-builder/actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "insert" | "edit";
  initialValues?: FormDialogValues | null;
  onInsert: (form: { formId: string; formName: string }) => void;
};

type Row = { id: string; name: string; slug: string };

type FormDialogValues = {
  formId: string;
  formName?: string | null;
};

export function FormSelectDialog({
  open,
  onOpenChange,
  mode = "insert",
  initialValues,
  onInsert,
}: Props) {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialValues?.formId ?? null,
  );
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runFetch = useCallback((q: string) => {
    startTransition(async () => {
      const res = await fetchFormsForPicker({ search: q || undefined });
      if ("error" in res) return;
      setRows(res.rows);
    });
  }, []);

  useEffect(() => {
    if (open) {
      runFetch("");
    }
  }, [open, runFetch]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runFetch(search), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function handleInsert() {
    if (!selectedId) return;
    const f = rows.find((r) => r.id === selectedId);
    const formName =
      f?.name ??
      (initialValues?.formId === selectedId
        ? (initialValues.formName ?? "")
        : "");
    onInsert({ formId: selectedId, formName });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit form" : "Insert form"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Choose which published form this embedded block should render."
              : "Pick a published form. Only published forms appear here."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Forms</Label>
            <p className="text-xs text-muted-foreground">{rows.length} found</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search forms…"
              className="pl-9"
            />
          </div>

          {pending && rows.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No published forms found.
            </p>
          ) : (
            <div className="max-h-[360px] space-y-1 overflow-y-auto p-1">
              {rows.map((f) => {
                const active = selectedId === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedId(active ? null : f.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md border bg-card px-3 py-2 text-left",
                      "transition-colors hover:border-primary/60",
                      active && "ring-2 ring-primary",
                    )}
                  >
                    <FormInput className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{f.slug}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleInsert} disabled={!selectedId}>
            {mode === "edit" ? "Save changes" : "Insert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
