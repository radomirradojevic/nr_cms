"use client";

import { Input } from "@/components/ui/input";
import { HelpInfo } from "@/components/ui/help-info";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Link2, Link2Off } from "lucide-react";
import * as React from "react";
import type { Sides, Viewport } from "../style/types";
import {
  COLOR_TOKEN_IDS,
  FONT_TOKENS,
  type ColorTokenId,
} from "../style/tokens";
import { ImagePickerDialog } from "../image-picker-dialog";
import { useViewport } from "./viewport-context";

/* ===================== Field wrapper ===================== */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Label className="text-xs">{label}</Label>
        {hint ? (
          <HelpInfo className="size-4" side="right" title={label}>
            {hint}
          </HelpInfo>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/* ===================== NumberWithUnit ===================== */

const UNITS = ["px", "rem", "em", "%", "vh", "vw"] as const;
type Unit = (typeof UNITS)[number];

const UNIT_RE = /^(-?\d*\.?\d+)(px|rem|em|%|vh|vw)?$/;

export function parseLength(v: string | undefined): {
  num: string;
  unit: Unit;
} {
  if (!v) return { num: "", unit: "px" };
  const m = UNIT_RE.exec(v.trim());
  if (!m) return { num: "", unit: "px" };
  return { num: m[1], unit: (m[2] as Unit) ?? "px" };
}

export function NumberWithUnit({
  value,
  onChange,
  units = UNITS as unknown as Unit[],
  placeholder,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  units?: Unit[];
  placeholder?: string;
}) {
  const { num, unit } = parseLength(value);
  return (
    <div className="flex gap-1">
      <Input
        value={num}
        placeholder={placeholder}
        inputMode="decimal"
        onChange={(e) => {
          const v = e.target.value.trim();
          if (v === "") onChange(undefined);
          else onChange(`${v}${unit}`);
        }}
        className="h-8 flex-1"
      />
      <Select
        value={unit}
        onValueChange={(u) => {
          if (!num) return;
          onChange(`${num}${u as Unit}`);
        }}
      >
        <SelectTrigger className="h-8 w-[68px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {units.map((u) => (
            <SelectItem key={u} value={u}>
              {u}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ===================== SidesInput ===================== */

export function SidesInput({
  value,
  onChange,
}: {
  value: Sides<string> | undefined;
  onChange: (v: Sides<string> | undefined) => void;
}) {
  const [linked, setLinked] = React.useState(false);
  const v = value ?? {};
  const update = (side: keyof Sides<string>, next: string | undefined) => {
    if (linked) {
      const merged: Sides<string> = {
        top: next,
        right: next,
        bottom: next,
        left: next,
      };
      const allEmpty = !next;
      onChange(allEmpty ? undefined : merged);
      return;
    }
    const merged: Sides<string> = { ...v, [side]: next };
    const allEmpty =
      !merged.top && !merged.right && !merged.bottom && !merged.left;
    onChange(allEmpty ? undefined : merged);
  };
  return (
    <div className="flex items-start gap-1">
      <div className="grid flex-1 grid-cols-2 gap-1">
        <NumberWithUnit
          value={v.top}
          placeholder="T"
          onChange={(n) => update("top", n)}
        />
        <NumberWithUnit
          value={v.right}
          placeholder="R"
          onChange={(n) => update("right", n)}
        />
        <NumberWithUnit
          value={v.bottom}
          placeholder="B"
          onChange={(n) => update("bottom", n)}
        />
        <NumberWithUnit
          value={v.left}
          placeholder="L"
          onChange={(n) => update("left", n)}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        title={linked ? "Unlink sides" : "Link all sides"}
        onClick={() => setLinked((s) => !s)}
      >
        {linked ? (
          <Link2 className="h-3.5 w-3.5" />
        ) : (
          <Link2Off className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}

/* ===================== ColorTokenPicker ===================== */

/**
 * Best-effort conversion of an arbitrary CSS color string to a
 * `#rrggbb` value suitable for the native `<input type="color">`
 * swatch. Returns `null` when the value cannot be represented as a
 * sRGB hex (e.g. `oklch(...)`, `var(--...)`, `currentColor`). The text
 * input remains the source of truth for those cases.
 */
function toHexSwatch(value: string | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  if (/^#[0-9a-f]{8}$/i.test(v)) return v.slice(0, 7).toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(v)) {
    const r = v[1];
    const g = v[2];
    const b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  const rgb = v.match(
    /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})(?:\s*[, /]\s*[\d.]+%?)?\s*\)$/i,
  );
  if (rgb) {
    const toHex = (n: number) =>
      Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
    return `#${toHex(Number(rgb[1]))}${toHex(Number(rgb[2]))}${toHex(Number(rgb[3]))}`;
  }
  return null;
}

export function ColorTokenPicker({
  value,
  onChange,
  allowCustom = true,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  allowCustom?: boolean;
}) {
  const isToken = value
    ? (COLOR_TOKEN_IDS as readonly string[]).includes(value)
    : false;
  const mode = !value ? "unset" : isToken ? "token" : "custom";
  const swatchHex = toHexSwatch(value) ?? "#000000";
  return (
    <div className="space-y-1">
      <Select
        value={
          mode === "unset"
            ? "__unset"
            : isToken
              ? (value as ColorTokenId)
              : "__custom"
        }
        onValueChange={(v) => {
          if (v === "__unset") onChange(undefined);
          else if (v === "__custom") {
            // Seed with a neutral hex so the custom picker has a valid
            // starting value the native color input can render.
            if (mode !== "custom") onChange("#888888");
          } else onChange(v);
        }}
      >
        <SelectTrigger className="h-8">
          <SelectValue placeholder="Choose color" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__unset">Unset</SelectItem>
          {COLOR_TOKEN_IDS.map((id) => (
            <SelectItem key={id} value={id}>
              {id}
            </SelectItem>
          ))}
          {allowCustom ? (
            <SelectItem value="__custom">Custom…</SelectItem>
          ) : null}
        </SelectContent>
      </Select>
      {mode === "custom" ? (
        <div className="flex items-center gap-2">
          {/* Native color picker: visual selection, emits #rrggbb. */}
          <label
            className="relative h-8 w-10 shrink-0 cursor-pointer overflow-hidden rounded border bg-background"
            title="Pick color"
            style={{ backgroundColor: value }}
          >
            <input
              type="color"
              value={swatchHex}
              onChange={(e) => onChange(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Pick custom color"
            />
          </label>
          {/* Free-form CSS color: hex / rgb / rgba / hsl / oklch / etc. */}
          <Input
            value={value ?? ""}
            onChange={(e) =>
              onChange(
                e.target.value.trim() === "" ? undefined : e.target.value,
              )
            }
            placeholder="#rrggbb, rgb(), oklch()…"
            className="h-8 font-mono text-xs"
          />
        </div>
      ) : null}
    </div>
  );
}

/* ===================== FontFamilyPicker ===================== */

export function FontFamilyPicker({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <Select
      value={value ?? "__unset"}
      onValueChange={(v) => onChange(v === "__unset" ? undefined : v)}
    >
      <SelectTrigger className="h-8">
        <SelectValue placeholder="Default" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__unset">Default</SelectItem>
        {Object.keys(FONT_TOKENS).map((id) => (
          <SelectItem key={id} value={id}>
            {id}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ===================== ResponsiveTabs ===================== */

export function ResponsiveTabs() {
  const { viewport, setViewport } = useViewport();
  return (
    <Tabs
      value={viewport}
      onValueChange={(v) => setViewport(v as Viewport)}
      className="mb-2"
    >
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="desktop">Desktop</TabsTrigger>
        <TabsTrigger value="tablet">Tablet</TabsTrigger>
        <TabsTrigger value="mobile">Mobile</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

/* ===================== ImagePickerField ===================== */

export function ImagePickerField({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="space-y-1">
      <Input
        value={value ?? ""}
        readOnly
        placeholder="No image"
        className="h-8 font-mono text-xs"
      />
      <div className="flex gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 flex-1 text-xs"
          onClick={() => setOpen(true)}
        >
          Choose image
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onChange(undefined)}
          >
            Clear
          </Button>
        ) : null}
      </div>
      <ImagePickerDialog
        open={open}
        onOpenChange={setOpen}
        onSelect={({ src }) => onChange(src)}
      />
    </div>
  );
}

/* ===================== InheritedHint ===================== */

export function InheritedHint({
  show,
  className,
}: {
  show: boolean;
  className?: string;
}) {
  if (!show) return null;
  return (
    <p className={cn("text-[10px] text-muted-foreground italic", className)}>
      Inherited from desktop
    </p>
  );
}

export { Switch, Slider };
