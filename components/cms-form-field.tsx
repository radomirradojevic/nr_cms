"use client";

import { useId, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FieldChoice, FormFieldRow } from "@/lib/form-types";
import { cn } from "@/lib/utils";

export type FieldValue =
  | string
  | number
  | boolean
  | string[]
  | { fileId: string; originalName: string; mime: string; size: number }
  | null;

type Props = {
  field: FormFieldRow;
  value: FieldValue;
  onChange: (v: FieldValue) => void;
  onFileSelect?: (file: File) => Promise<void> | void;
  error?: string;
  disabled?: boolean;
};

function choices(field: FormFieldRow): FieldChoice[] {
  const opts = (field.options ?? {}) as { choices?: FieldChoice[] };
  return Array.isArray(opts.choices) ? opts.choices : [];
}

function parseDateValue(value: FieldValue): Date | undefined {
  if (typeof value !== "string") return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return undefined;
  }

  return date;
}

export function CmsFormField({
  field,
  value,
  onChange,
  onFileSelect,
  error,
  disabled,
}: Props) {
  const id = useId();
  const labelId = `${id}-label`;
  const helpId = field.helpText ? `${id}-help` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [helpId, errId].filter(Boolean).join(" ") || undefined;

  const required = field.required;
  const v = field.validation as Record<string, unknown> | null;
  const [dateOpen, setDateOpen] = useState(false);

  function commonLabel(htmlFor?: string) {
    return (
      <Label htmlFor={htmlFor} id={labelId} className="text-sm font-medium">
        {field.label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
    );
  }

  function helpAndError() {
    return (
      <>
        {field.helpText && (
          <p id={helpId} className="text-xs text-muted-foreground">
            {field.helpText}
          </p>
        )}
        {error && (
          <p id={errId} className="text-xs text-destructive">
            {error}
          </p>
        )}
      </>
    );
  }

  switch (field.fieldType) {
    case "text":
    case "email":
    case "phone": {
      const t =
        field.fieldType === "email"
          ? "email"
          : field.fieldType === "phone"
            ? "tel"
            : "text";
      return (
        <div className="space-y-1.5">
          {commonLabel(id)}
          <Input
            id={id}
            type={t}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? ""}
            disabled={disabled}
            required={required}
            aria-describedby={describedBy}
            aria-invalid={!!error}
            maxLength={
              typeof v?.maxLength === "number" ? (v.maxLength as number) : 10000
            }
          />
          {helpAndError()}
        </div>
      );
    }

    case "textarea":
      return (
        <div className="space-y-1.5">
          {commonLabel(id)}
          <Textarea
            id={id}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? ""}
            disabled={disabled}
            required={required}
            aria-describedby={describedBy}
            aria-invalid={!!error}
            rows={5}
            maxLength={
              typeof v?.maxLength === "number" ? (v.maxLength as number) : 10000
            }
          />
          {helpAndError()}
        </div>
      );

    case "number":
      return (
        <div className="space-y-1.5">
          {commonLabel(id)}
          <Input
            id={id}
            type="number"
            value={
              value === null || value === undefined || value === ""
                ? ""
                : String(value)
            }
            onChange={(e) =>
              onChange(e.target.value === "" ? null : e.target.value)
            }
            placeholder={field.placeholder ?? ""}
            disabled={disabled}
            required={required}
            aria-describedby={describedBy}
            aria-invalid={!!error}
            min={typeof v?.min === "number" ? (v.min as number) : undefined}
            max={typeof v?.max === "number" ? (v.max as number) : undefined}
          />
          {helpAndError()}
        </div>
      );

    case "date":
      const selectedDate = parseDateValue(value);
      return (
        <div className="space-y-1.5">
          {commonLabel(id)}
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button
                id={id}
                type="button"
                variant="outline"
                disabled={disabled}
                aria-describedby={describedBy}
                aria-invalid={!!error}
                className={cn(
                  "h-9 w-full justify-start border-input bg-background px-3 text-left font-normal hover:bg-background",
                  !selectedDate && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                {selectedDate
                  ? format(selectedDate, "PPP")
                  : field.placeholder || "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (!date) return;
                  onChange(format(date, "yyyy-MM-dd"));
                  setDateOpen(false);
                }}
                captionLayout="dropdown"
                disabled={disabled}
              />
              {selectedDate && !required && (
                <div className="border-t p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => {
                      onChange("");
                      setDateOpen(false);
                    }}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
          {helpAndError()}
        </div>
      );

    case "select": {
      const cs = choices(field);
      return (
        <div className="space-y-1.5">
          {commonLabel(id)}
          <Select
            value={typeof value === "string" ? value : ""}
            onValueChange={(s) => onChange(s)}
            disabled={disabled}
          >
            <SelectTrigger id={id} aria-describedby={describedBy}>
              <SelectValue placeholder={field.placeholder ?? "Select…"} />
            </SelectTrigger>
            <SelectContent>
              {cs.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {helpAndError()}
        </div>
      );
    }

    case "radio": {
      const cs = choices(field);
      return (
        <fieldset
          className="space-y-1.5"
          aria-labelledby={labelId}
          aria-describedby={describedBy}
        >
          {commonLabel()}
          <div className="space-y-1">
            {cs.map((c) => {
              const rid = `${id}-${c.value}`;
              return (
                <div key={c.value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    id={rid}
                    name={id}
                    value={c.value}
                    checked={value === c.value}
                    onChange={() => onChange(c.value)}
                    disabled={disabled}
                    className="h-4 w-4 text-primary"
                  />
                  <Label htmlFor={rid} className="font-normal">
                    {c.label}
                  </Label>
                </div>
              );
            })}
          </div>
          {helpAndError()}
        </fieldset>
      );
    }

    case "checkbox": {
      const cs = choices(field);
      // Single boolean checkbox when no choices.
      if (cs.length === 0) {
        return (
          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <Checkbox
                id={id}
                checked={value === true}
                onCheckedChange={(c) => onChange(c === true)}
                disabled={disabled}
                required={required}
                aria-describedby={describedBy}
              />
              <Label htmlFor={id} className="text-sm font-normal">
                {field.label}
                {required && <span className="ml-0.5 text-destructive">*</span>}
              </Label>
            </div>
            {helpAndError()}
          </div>
        );
      }
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <fieldset
          className="space-y-1.5"
          aria-labelledby={labelId}
          aria-describedby={describedBy}
        >
          {commonLabel()}
          <div className="space-y-1">
            {cs.map((c) => {
              const cid = `${id}-${c.value}`;
              const checked = arr.includes(c.value);
              return (
                <div key={c.value} className="flex items-center gap-2">
                  <Checkbox
                    id={cid}
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={(state) => {
                      const next = new Set(arr);
                      if (state === true) next.add(c.value);
                      else next.delete(c.value);
                      onChange(Array.from(next));
                    }}
                  />
                  <Label htmlFor={cid} className="font-normal">
                    {c.label}
                  </Label>
                </div>
              );
            })}
          </div>
          {helpAndError()}
        </fieldset>
      );
    }

    case "file": {
      const fileVal =
        value && typeof value === "object" && "fileId" in value
          ? (value as { originalName: string })
          : null;
      const accept = Array.isArray(v?.accept)
        ? (v?.accept as string[]).join(",")
        : undefined;
      return (
        <div className="space-y-1.5">
          {commonLabel(id)}
          <Input
            id={id}
            type="file"
            accept={accept}
            disabled={disabled}
            required={required && !fileVal}
            aria-describedby={describedBy}
            aria-invalid={!!error}
            // The actual upload happens in the renderer; we surface the File via a CustomEvent.
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f && onFileSelect) {
                void onFileSelect(f);
              } else if (!f) {
                onChange(null);
              }
            }}
          />
          {fileVal && (
            <p className="text-xs text-muted-foreground">
              Uploaded: {fileVal.originalName}
            </p>
          )}
          {helpAndError()}
        </div>
      );
    }
  }
}
