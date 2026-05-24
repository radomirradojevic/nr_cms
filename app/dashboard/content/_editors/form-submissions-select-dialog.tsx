"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ClipboardList, FormInput, Search } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fetchFormsForPicker } from "@/app/dashboard/form-builder/actions";

type DisplayMode = "table" | "card";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "insert" | "edit";
  initialValues?: FormSubmissionsDialogValues | null;
  onInsert: (form: {
    formId: string;
    formName: string;
    displayMode: DisplayMode;
    pageSize: number;
    hideId: boolean;
  }) => void;
};

type Row = { id: string; name: string; slug: string };

type FormSubmissionsDialogValues = {
  formId: string;
  formName?: string | null;
  displayMode?: DisplayMode;
  pageSize?: number;
  hideId?: boolean;
};

export function FormSubmissionsSelectDialog({
  open,
  onOpenChange,
  mode = "insert",
  initialValues,
  onInsert,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <FormSubmissionsSelectDialogContent
          mode={mode}
          initialValues={initialValues}
          onOpenChange={onOpenChange}
          onInsert={onInsert}
        />
      ) : null}
    </Dialog>
  );
}

function FormSubmissionsSelectDialogContent({
  mode,
  initialValues,
  onOpenChange,
  onInsert,
}: Pick<Props, "mode" | "initialValues" | "onOpenChange" | "onInsert">) {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialValues?.formId ?? null,
  );
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    initialValues?.displayMode ?? "table",
  );
  const [pageSize, setPageSize] = useState(
    String(initialValues?.pageSize ?? 5),
  );
  const [hideId, setHideId] = useState(initialValues?.hideId ?? true);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const res = await fetchFormsForPicker({ search: search || undefined });
        if ("error" in res) return;
        setRows(res.rows);
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  function normalizedPageSize() {
    const parsed = Number.parseInt(pageSize, 10);
    if (!Number.isFinite(parsed)) return 5;
    return Math.min(100, Math.max(5, parsed));
  }

  function handleInsert() {
    if (!selectedId) return;
    const form = rows.find((r) => r.id === selectedId);
    const formName =
      form?.name ??
      (initialValues?.formId === selectedId
        ? (initialValues.formName ?? "")
        : "");
    onInsert({
      formId: selectedId,
      formName,
      displayMode,
      pageSize: normalizedPageSize(),
      hideId,
    });
    onOpenChange(false);
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>
          {mode === "edit"
            ? "Edit form submissions"
            : "Insert form submissions"}
        </DialogTitle>
        <DialogDescription>
          {mode === "edit"
            ? "Update the source form and how its submissions should render."
            : "Pick a published form and choose how its submissions should render."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Forms</Label>
            <p className="text-xs text-muted-foreground">{rows.length} found</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search forms..."
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
            <div className="max-h-[280px] space-y-1 overflow-y-auto p-1">
              {rows.map((form) => {
                const active = selectedId === form.id;
                return (
                  <button
                    key={form.id}
                    type="button"
                    onClick={() => setSelectedId(active ? null : form.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md border bg-card px-3 py-2 text-left",
                      "transition-colors hover:border-primary/60",
                      active && "ring-2 ring-primary",
                    )}
                  >
                    <FormInput className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{form.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {form.slug}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid gap-4 rounded-md border p-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Display mode</Label>
            <Select
              value={displayMode}
              onValueChange={(value) => setDisplayMode(value as DisplayMode)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="table">Table</SelectItem>
                <SelectItem value="card">Card</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="form-submissions-page-size">Page size</Label>
            <Input
              id="form-submissions-page-size"
              type="number"
              min={5}
              max={100}
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 self-end rounded-md border px-3 py-2 text-sm">
            <Checkbox
              checked={hideId}
              onCheckedChange={(checked) => setHideId(checked === true)}
            />
            <span>Hide ID</span>
          </label>
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
        <Button type="button" onClick={handleInsert} disabled={!selectedId}>
          <ClipboardList className="h-4 w-4" />
          {mode === "edit" ? "Save changes" : "Insert"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
