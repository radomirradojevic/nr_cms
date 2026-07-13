"use client";

import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  ColorTokenPicker,
  Field,
  FontFamilyPicker,
  ImagePickerField,
  InheritedHint,
  NumberWithUnit,
  ResponsiveTabs,
  SidesInput,
  Switch,
} from "./controls";
import { useStyleProp } from "./useStyleProp";
import type {
  AnimationStyle,
  AnimationType,
  BackgroundStyle,
  BorderEffectsStyle,
  ColorStyle,
  FontWeight,
  LayoutStyle,
  Sides,
  SpacingStyle,
  TypographyStyle,
} from "../style/types";
import { useSourceTranslations } from "@/components/source-translations";

export type BlockName =
  | "Section"
  | "Layout"
  | "Columns"
  | "Heading"
  | "Text"
  | "Image"
  | "Button"
  | "Hero"
  | "HeroSlider"
  | "RawHtml"
  | "Gallery"
  | "Video"
  | "Form"
  | "FormSubmissions"
  | "Table";

type Capabilities = {
  typography: boolean;
  colors: boolean;
  spacing: boolean;
  layout: boolean;
  effects: boolean;
  background: boolean;
  responsive: boolean;
  animation: boolean;
  /** When true, Layout section exposes gap/flexDirection/justify/align controls. */
  flexContainer?: boolean;
};

function TranslatedSelectItem({
  children,
  ...props
}: React.ComponentProps<typeof SelectItem>) {
  const t = useSourceTranslations();

  return (
    <SelectItem {...props}>
      {typeof children === "string" ? t(children) : children}
    </SelectItem>
  );
}

export const blockStyleCapabilities: Record<BlockName, Capabilities> = {
  Section: {
    typography: true,
    colors: true,
    spacing: true,
    layout: true,
    effects: true,
    background: true,
    responsive: true,
    animation: true,
    flexContainer: true,
  },
  Layout: {
    typography: false,
    colors: true,
    spacing: true,
    layout: true,
    effects: true,
    background: true,
    responsive: true,
    animation: true,
    flexContainer: true,
  },
  Columns: {
    typography: false,
    colors: true,
    spacing: true,
    layout: true,
    effects: true,
    background: true,
    responsive: true,
    animation: true,
    flexContainer: true,
  },
  Hero: {
    typography: true,
    colors: true,
    spacing: true,
    layout: true,
    effects: true,
    background: true,
    responsive: true,
    animation: true,
    flexContainer: true,
  },
  HeroSlider: {
    typography: false,
    colors: false,
    spacing: true,
    layout: true,
    effects: true,
    background: false,
    responsive: true,
    animation: true,
  },
  Heading: {
    typography: true,
    colors: true,
    spacing: true,
    layout: true,
    effects: true,
    background: false,
    responsive: true,
    animation: true,
  },
  Text: {
    typography: true,
    colors: true,
    spacing: true,
    layout: true,
    effects: true,
    background: false,
    responsive: true,
    animation: true,
  },
  Image: {
    typography: false,
    colors: true,
    spacing: true,
    layout: true,
    effects: true,
    background: true,
    responsive: true,
    animation: true,
  },
  Button: {
    typography: true,
    colors: true,
    spacing: true,
    layout: true,
    effects: true,
    background: false,
    responsive: true,
    animation: true,
  },
  RawHtml: {
    typography: true,
    colors: true,
    spacing: true,
    layout: true,
    effects: true,
    background: true,
    responsive: true,
    animation: true,
  },
  Gallery: {
    typography: true,
    colors: true,
    spacing: true,
    layout: true,
    effects: true,
    background: true,
    responsive: true,
    animation: true,
  },
  Video: {
    typography: false,
    colors: true,
    spacing: true,
    layout: true,
    effects: true,
    background: true,
    responsive: true,
    animation: true,
  },
  Form: {
    typography: true,
    colors: true,
    spacing: true,
    layout: true,
    effects: true,
    background: true,
    responsive: true,
    animation: true,
  },
  FormSubmissions: {
    typography: false,
    colors: true,
    spacing: true,
    layout: true,
    effects: true,
    background: true,
    responsive: true,
    animation: true,
  },
  Table: {
    typography: true,
    colors: true,
    spacing: true,
    layout: true,
    effects: true,
    background: true,
    responsive: true,
    animation: true,
  },
};

/* ===================== Sections ===================== */

function TypographySection() {
  const sp = useStyleProp();
  const v = sp.get<TypographyStyle>(["typography"]) ?? {};
  const base = sp.getBase<TypographyStyle>(["typography"]) ?? {};
  const isOverride = sp.viewport !== "desktop";
  const inherited = (k: keyof TypographyStyle) =>
    isOverride && v[k] === undefined && base[k] !== undefined;
  const setKey = <K extends keyof TypographyStyle>(
    k: K,
    val: TypographyStyle[K] | undefined,
  ) => sp.set(["typography", k as string], val);
  return (
    <div className="space-y-2">
      <Field label="Font family">
        <FontFamilyPicker
          value={v.fontFamily}
          onChange={(x) => setKey("fontFamily", x)}
        />
        <InheritedHint show={inherited("fontFamily")} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Size">
          <NumberWithUnit
            value={v.fontSize}
            onChange={(x) => setKey("fontSize", x)}
          />
          <InheritedHint show={inherited("fontSize")} />
        </Field>
        <Field label="Weight">
          <Select
            value={v.fontWeight ?? "__unset"}
            onValueChange={(x) =>
              setKey(
                "fontWeight",
                x === "__unset" ? undefined : (x as FontWeight),
              )
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <TranslatedSelectItem value="__unset">
                Default
              </TranslatedSelectItem>
              {(
                [
                  "100",
                  "200",
                  "300",
                  "400",
                  "500",
                  "600",
                  "700",
                  "800",
                  "900",
                ] as FontWeight[]
              ).map((w) => (
                <SelectItem key={w} value={w}>
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <InheritedHint show={inherited("fontWeight")} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Line height">
          <NumberWithUnit
            value={v.lineHeight}
            onChange={(x) => setKey("lineHeight", x)}
          />
        </Field>
        <Field label="Letter spacing">
          <NumberWithUnit
            value={v.letterSpacing}
            onChange={(x) => setKey("letterSpacing", x)}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Align">
          <Select
            value={v.textAlign ?? "__unset"}
            onValueChange={(x) =>
              setKey(
                "textAlign",
                x === "__unset"
                  ? undefined
                  : (x as TypographyStyle["textAlign"]),
              )
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <TranslatedSelectItem value="__unset">
                Default
              </TranslatedSelectItem>
              <TranslatedSelectItem value="left">Left</TranslatedSelectItem>
              <TranslatedSelectItem value="center">Center</TranslatedSelectItem>
              <TranslatedSelectItem value="right">Right</TranslatedSelectItem>
              <TranslatedSelectItem value="justify">
                Justify
              </TranslatedSelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Transform">
          <Select
            value={v.textTransform ?? "__unset"}
            onValueChange={(x) =>
              setKey(
                "textTransform",
                x === "__unset"
                  ? undefined
                  : (x as TypographyStyle["textTransform"]),
              )
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <TranslatedSelectItem value="__unset">
                Default
              </TranslatedSelectItem>
              <TranslatedSelectItem value="none">None</TranslatedSelectItem>
              <TranslatedSelectItem value="uppercase">
                UPPER
              </TranslatedSelectItem>
              <TranslatedSelectItem value="lowercase">
                lower
              </TranslatedSelectItem>
              <TranslatedSelectItem value="capitalize">
                Capitalize
              </TranslatedSelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Style">
          <Select
            value={v.fontStyle ?? "__unset"}
            onValueChange={(x) =>
              setKey(
                "fontStyle",
                x === "__unset"
                  ? undefined
                  : (x as TypographyStyle["fontStyle"]),
              )
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <TranslatedSelectItem value="__unset">
                Default
              </TranslatedSelectItem>
              <TranslatedSelectItem value="normal">Normal</TranslatedSelectItem>
              <TranslatedSelectItem value="italic">Italic</TranslatedSelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Decoration">
          <Select
            value={v.textDecoration ?? "__unset"}
            onValueChange={(x) =>
              setKey(
                "textDecoration",
                x === "__unset"
                  ? undefined
                  : (x as TypographyStyle["textDecoration"]),
              )
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <TranslatedSelectItem value="__unset">
                Default
              </TranslatedSelectItem>
              <TranslatedSelectItem value="none">None</TranslatedSelectItem>
              <TranslatedSelectItem value="underline">
                Underline
              </TranslatedSelectItem>
              <TranslatedSelectItem value="line-through">
                Line-through
              </TranslatedSelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  );
}

function ColorsSection() {
  const sp = useStyleProp();
  const v = sp.get<ColorStyle>(["colors"]) ?? {};
  const set = <K extends keyof ColorStyle>(
    k: K,
    val: ColorStyle[K] | undefined,
  ) => sp.set(["colors", k as string], val);
  return (
    <div className="space-y-2">
      <Field label="Text color">
        <ColorTokenPicker value={v.text} onChange={(x) => set("text", x)} />
      </Field>
      <Field label="Background color">
        <ColorTokenPicker
          value={v.background}
          onChange={(x) => set("background", x)}
        />
      </Field>
      <Field
        label={`Opacity${typeof v.opacity === "number" ? ` — ${Math.round(v.opacity * 100)}%` : ""}`}
      >
        <Slider
          min={0}
          max={100}
          step={5}
          value={[
            typeof v.opacity === "number" ? Math.round(v.opacity * 100) : 100,
          ]}
          onValueChange={(arr) => {
            const n = arr[0] ?? 100;
            set("opacity", n === 100 ? undefined : n / 100);
          }}
        />
      </Field>
    </div>
  );
}

function SpacingSection({ flexContainer }: { flexContainer?: boolean }) {
  const sp = useStyleProp();
  const v = sp.get<SpacingStyle>(["spacing"]) ?? {};
  const set = <K extends keyof SpacingStyle>(
    k: K,
    val: SpacingStyle[K] | undefined,
  ) => sp.set(["spacing", k as string], val);
  return (
    <div className="space-y-2">
      <Field label="Margin">
        <SidesInput
          value={v.margin}
          onChange={(x) => set("margin", x as Sides<string> | undefined)}
        />
      </Field>
      <Field label="Padding">
        <SidesInput
          value={v.padding}
          onChange={(x) => set("padding", x as Sides<string> | undefined)}
        />
      </Field>
      {flexContainer ? (
        <Field label="Gap">
          <NumberWithUnit value={v.gap} onChange={(x) => set("gap", x)} />
        </Field>
      ) : null}
    </div>
  );
}

function LayoutSection({ flexContainer }: { flexContainer?: boolean }) {
  const t = useSourceTranslations();
  const sp = useStyleProp();
  const v = sp.get<LayoutStyle>(["layout"]) ?? {};
  const set = <K extends keyof LayoutStyle>(
    k: K,
    val: LayoutStyle[K] | undefined,
  ) => sp.set(["layout", k as string], val);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Width">
          <NumberWithUnit value={v.width} onChange={(x) => set("width", x)} />
        </Field>
        <Field label="Max width">
          <NumberWithUnit
            value={v.maxWidth}
            onChange={(x) => set("maxWidth", x)}
          />
        </Field>
      </div>
      <Field label="Min height">
        <NumberWithUnit
          value={v.minHeight}
          onChange={(x) => set("minHeight", x)}
        />
      </Field>
      <Field label="Display">
        <Select
          value={v.display ?? "__unset"}
          onValueChange={(x) =>
            set(
              "display",
              x === "__unset" ? undefined : (x as LayoutStyle["display"]),
            )
          }
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder={t("Default")} />
          </SelectTrigger>
          <SelectContent>
            <TranslatedSelectItem value="__unset">Default</TranslatedSelectItem>
            <TranslatedSelectItem value="block">Block</TranslatedSelectItem>
            <TranslatedSelectItem value="inline-block">
              Inline-block
            </TranslatedSelectItem>
            <TranslatedSelectItem value="flex">Flex</TranslatedSelectItem>
            <TranslatedSelectItem value="inline-flex">
              Inline-flex
            </TranslatedSelectItem>
            <TranslatedSelectItem value="grid">Grid</TranslatedSelectItem>
            <TranslatedSelectItem value="none">None</TranslatedSelectItem>
          </SelectContent>
        </Select>
      </Field>
      {flexContainer ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Direction">
              <Select
                value={v.flexDirection ?? "__unset"}
                onValueChange={(x) =>
                  set(
                    "flexDirection",
                    x === "__unset"
                      ? undefined
                      : (x as LayoutStyle["flexDirection"]),
                  )
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <TranslatedSelectItem value="__unset">
                    Default
                  </TranslatedSelectItem>
                  <TranslatedSelectItem value="row">Row</TranslatedSelectItem>
                  <TranslatedSelectItem value="row-reverse">
                    Row reverse
                  </TranslatedSelectItem>
                  <TranslatedSelectItem value="column">
                    Column
                  </TranslatedSelectItem>
                  <TranslatedSelectItem value="column-reverse">
                    Column reverse
                  </TranslatedSelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Align items">
              <Select
                value={v.alignItems ?? "__unset"}
                onValueChange={(x) =>
                  set(
                    "alignItems",
                    x === "__unset"
                      ? undefined
                      : (x as LayoutStyle["alignItems"]),
                  )
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <TranslatedSelectItem value="__unset">
                    Default
                  </TranslatedSelectItem>
                  <TranslatedSelectItem value="stretch">
                    Stretch
                  </TranslatedSelectItem>
                  <TranslatedSelectItem value="flex-start">
                    Start
                  </TranslatedSelectItem>
                  <TranslatedSelectItem value="center">
                    Center
                  </TranslatedSelectItem>
                  <TranslatedSelectItem value="flex-end">
                    End
                  </TranslatedSelectItem>
                  <TranslatedSelectItem value="baseline">
                    Baseline
                  </TranslatedSelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Justify">
            <Select
              value={v.justifyContent ?? "__unset"}
              onValueChange={(x) =>
                set(
                  "justifyContent",
                  x === "__unset"
                    ? undefined
                    : (x as LayoutStyle["justifyContent"]),
                )
              }
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <TranslatedSelectItem value="__unset">
                  Default
                </TranslatedSelectItem>
                <TranslatedSelectItem value="flex-start">
                  Start
                </TranslatedSelectItem>
                <TranslatedSelectItem value="center">
                  Center
                </TranslatedSelectItem>
                <TranslatedSelectItem value="flex-end">
                  End
                </TranslatedSelectItem>
                <TranslatedSelectItem value="space-between">
                  Space between
                </TranslatedSelectItem>
                <TranslatedSelectItem value="space-around">
                  Space around
                </TranslatedSelectItem>
                <TranslatedSelectItem value="space-evenly">
                  Space evenly
                </TranslatedSelectItem>
              </SelectContent>
            </Select>
          </Field>
        </>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Overflow">
          <Select
            value={v.overflow ?? "__unset"}
            onValueChange={(x) =>
              set(
                "overflow",
                x === "__unset" ? undefined : (x as LayoutStyle["overflow"]),
              )
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <TranslatedSelectItem value="__unset">
                Default
              </TranslatedSelectItem>
              <TranslatedSelectItem value="visible">
                Visible
              </TranslatedSelectItem>
              <TranslatedSelectItem value="hidden">Hidden</TranslatedSelectItem>
              <TranslatedSelectItem value="auto">Auto</TranslatedSelectItem>
              <TranslatedSelectItem value="scroll">Scroll</TranslatedSelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Z-index">
          <Input
            type="number"
            className="h-8"
            value={typeof v.zIndex === "number" ? String(v.zIndex) : ""}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") set("zIndex", undefined);
              else {
                const n = parseInt(raw, 10);
                set("zIndex", Number.isFinite(n) ? n : undefined);
              }
            }}
          />
        </Field>
      </div>
    </div>
  );
}

function EffectsSection() {
  const sp = useStyleProp();
  const v = sp.get<BorderEffectsStyle>(["borderEffects"]) ?? {};
  const set = <K extends keyof BorderEffectsStyle>(
    k: K,
    val: BorderEffectsStyle[K] | undefined,
  ) => sp.set(["borderEffects", k as string], val);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Border width">
          <NumberWithUnit
            value={v.borderWidth}
            onChange={(x) => set("borderWidth", x)}
          />
        </Field>
        <Field label="Border style">
          <Select
            value={v.borderStyle ?? "__unset"}
            onValueChange={(x) =>
              set(
                "borderStyle",
                x === "__unset"
                  ? undefined
                  : (x as BorderEffectsStyle["borderStyle"]),
              )
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <TranslatedSelectItem value="__unset">
                Default
              </TranslatedSelectItem>
              <TranslatedSelectItem value="solid">Solid</TranslatedSelectItem>
              <TranslatedSelectItem value="dashed">Dashed</TranslatedSelectItem>
              <TranslatedSelectItem value="dotted">Dotted</TranslatedSelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Border color">
        <ColorTokenPicker
          value={v.borderColor}
          onChange={(x) => set("borderColor", x)}
        />
      </Field>
      <Field label="Border radius">
        <NumberWithUnit
          value={v.borderRadius}
          onChange={(x) => set("borderRadius", x)}
        />
      </Field>
      <Field label="Shadow">
        <Select
          value={v.boxShadow ?? "__unset"}
          onValueChange={(x) =>
            set(
              "boxShadow",
              x === "__unset"
                ? undefined
                : (x as BorderEffectsStyle["boxShadow"]),
            )
          }
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <TranslatedSelectItem value="__unset">Default</TranslatedSelectItem>
            <TranslatedSelectItem value="none">None</TranslatedSelectItem>
            <TranslatedSelectItem value="xs">XS</TranslatedSelectItem>
            <TranslatedSelectItem value="sm">SM</TranslatedSelectItem>
            <TranslatedSelectItem value="md">MD</TranslatedSelectItem>
            <TranslatedSelectItem value="lg">LG</TranslatedSelectItem>
            <TranslatedSelectItem value="custom">Custom…</TranslatedSelectItem>
          </SelectContent>
        </Select>
        {v.boxShadow === "custom" ? (
          <Input
            className="mt-1 h-8 font-mono text-xs"
            value={v.boxShadowCustom ?? ""}
            onChange={(e) =>
              set(
                "boxShadowCustom",
                e.target.value.trim() === "" ? undefined : e.target.value,
              )
            }
            placeholder="0 4px 12px rgba(0,0,0,0.2)"
          />
        ) : null}
      </Field>
    </div>
  );
}

function BackgroundSection({ allowImage }: { allowImage: boolean }) {
  const sp = useStyleProp();
  const v = sp.get<BackgroundStyle>(["background"]) ?? {};
  const set = <K extends keyof BackgroundStyle>(
    k: K,
    val: BackgroundStyle[K] | undefined,
  ) => sp.set(["background", k as string], val);
  if (!allowImage) return null;
  return (
    <div className="space-y-2">
      <Field label="Background image">
        <ImagePickerField value={v.image} onChange={(x) => set("image", x)} />
      </Field>
      {v.image ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Size">
              <Select
                value={v.size ?? "__unset"}
                onValueChange={(x) =>
                  set(
                    "size",
                    x === "__unset"
                      ? undefined
                      : (x as BackgroundStyle["size"]),
                  )
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <TranslatedSelectItem value="__unset">
                    Default
                  </TranslatedSelectItem>
                  <TranslatedSelectItem value="auto">Auto</TranslatedSelectItem>
                  <TranslatedSelectItem value="cover">
                    Cover
                  </TranslatedSelectItem>
                  <TranslatedSelectItem value="contain">
                    Contain
                  </TranslatedSelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Repeat">
              <Select
                value={v.repeat ?? "__unset"}
                onValueChange={(x) =>
                  set(
                    "repeat",
                    x === "__unset"
                      ? undefined
                      : (x as BackgroundStyle["repeat"]),
                  )
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <TranslatedSelectItem value="__unset">
                    Default
                  </TranslatedSelectItem>
                  <TranslatedSelectItem value="no-repeat">
                    No repeat
                  </TranslatedSelectItem>
                  <TranslatedSelectItem value="repeat">
                    Repeat
                  </TranslatedSelectItem>
                  <TranslatedSelectItem value="repeat-x">
                    Repeat-X
                  </TranslatedSelectItem>
                  <TranslatedSelectItem value="repeat-y">
                    Repeat-Y
                  </TranslatedSelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Position">
            <Select
              value={v.position ?? "__unset"}
              onValueChange={(x) =>
                set(
                  "position",
                  x === "__unset"
                    ? undefined
                    : (x as BackgroundStyle["position"]),
                )
              }
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <TranslatedSelectItem value="__unset">
                  Default
                </TranslatedSelectItem>
                <TranslatedSelectItem value="center">
                  Center
                </TranslatedSelectItem>
                <TranslatedSelectItem value="top">Top</TranslatedSelectItem>
                <TranslatedSelectItem value="bottom">
                  Bottom
                </TranslatedSelectItem>
                <TranslatedSelectItem value="left">Left</TranslatedSelectItem>
                <TranslatedSelectItem value="right">Right</TranslatedSelectItem>
                <TranslatedSelectItem value="top left">
                  Top left
                </TranslatedSelectItem>
                <TranslatedSelectItem value="top right">
                  Top right
                </TranslatedSelectItem>
                <TranslatedSelectItem value="bottom left">
                  Bottom left
                </TranslatedSelectItem>
                <TranslatedSelectItem value="bottom right">
                  Bottom right
                </TranslatedSelectItem>
              </SelectContent>
            </Select>
          </Field>
        </>
      ) : null}
    </div>
  );
}

function ResponsiveSection() {
  const t = useSourceTranslations();
  const sp = useStyleProp();
  const hide = sp.style?.responsive?.hide ?? {};
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">
        {t(
          "Toggle visibility per viewport. Other responsive overrides are set by switching the tabs at the top of the Settings panel and editing sections — those edits apply only to the active viewport.",
        )}
      </p>
      <div className="flex items-center justify-between rounded border px-2 py-1.5">
        <span className="text-xs">{t("Hide on desktop")}</span>
        <Switch
          checked={!!hide.desktop}
          onCheckedChange={(v) => sp.setHide("desktop", v)}
        />
      </div>
      <div className="flex items-center justify-between rounded border px-2 py-1.5">
        <span className="text-xs">{t("Hide on tablet")}</span>
        <Switch
          checked={!!hide.tablet}
          onCheckedChange={(v) => sp.setHide("tablet", v)}
        />
      </div>
      <div className="flex items-center justify-between rounded border px-2 py-1.5">
        <span className="text-xs">{t("Hide on mobile")}</span>
        <Switch
          checked={!!hide.mobile}
          onCheckedChange={(v) => sp.setHide("mobile", v)}
        />
      </div>
    </div>
  );
}

function AnimationSection() {
  const t = useSourceTranslations();
  const sp = useStyleProp();
  const a = (sp.style?.animation ?? {}) as AnimationStyle;
  const setKey = <K extends keyof AnimationStyle>(
    k: K,
    val: AnimationStyle[K] | undefined,
  ) => {
    // animation lives at root, not under responsive
    sp.set(["animation", k as string], val);
  };
  // Animation is always written to BASE — override `set` path by adjusting
  // — but `useStyleProp.set` applies viewport offset. To force base, use
  // the underlying setProp via a dedicated call below.
  // Simpler: use a viewport-agnostic write by going through set with
  // the responsive offset bypass — animation rarely needs per-viewport
  // tweaks; we keep it global by writing to a stable shape: the panel
  // always shows animation under the Desktop tab.
  const isDesktop = sp.viewport === "desktop";
  if (!isDesktop) {
    return (
      <p className="text-xs text-muted-foreground">
        {t(
          "Animation is configured globally — switch to the Desktop tab to edit.",
        )}
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <Field label="Type">
        <Select
          value={a.type ?? "none"}
          onValueChange={(x) =>
            setKey("type", x === "none" ? undefined : (x as AnimationType))
          }
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <TranslatedSelectItem value="none">None</TranslatedSelectItem>
            <TranslatedSelectItem value="fade">Fade</TranslatedSelectItem>
            <TranslatedSelectItem value="slide-up">
              Slide up
            </TranslatedSelectItem>
            <TranslatedSelectItem value="slide-down">
              Slide down
            </TranslatedSelectItem>
            <TranslatedSelectItem value="slide-left">
              Slide left
            </TranslatedSelectItem>
            <TranslatedSelectItem value="slide-right">
              Slide right
            </TranslatedSelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field
        label={`Duration${typeof a.durationMs === "number" ? ` — ${a.durationMs}ms` : ""}`}
      >
        <Slider
          min={0}
          max={2000}
          step={50}
          value={[typeof a.durationMs === "number" ? a.durationMs : 600]}
          onValueChange={(arr) => setKey("durationMs", arr[0])}
        />
      </Field>
      <Field
        label={`Delay${typeof a.delayMs === "number" ? ` — ${a.delayMs}ms` : ""}`}
      >
        <Slider
          min={0}
          max={2000}
          step={50}
          value={[typeof a.delayMs === "number" ? a.delayMs : 0]}
          onValueChange={(arr) => setKey("delayMs", arr[0])}
        />
      </Field>
      <p className="text-[10px] text-muted-foreground">
        {t("Animations honor user reduced-motion preferences.")}
      </p>
    </div>
  );
}

/* ===================== Main panel ===================== */

export function BlockSettingsPanel({ blockName }: { blockName: BlockName }) {
  const t = useSourceTranslations();
  const caps = blockStyleCapabilities[blockName];
  return (
    <div className="space-y-2">
      {caps.responsive ? <ResponsiveTabs /> : null}
      <Accordion type="multiple" className="border-t">
        {caps.typography ? (
          <AccordionItem value="typography">
            <AccordionTrigger>{t("Typography")}</AccordionTrigger>
            <AccordionContent>
              <TypographySection />
            </AccordionContent>
          </AccordionItem>
        ) : null}
        {caps.colors ? (
          <AccordionItem value="colors">
            <AccordionTrigger>{t("Colors")}</AccordionTrigger>
            <AccordionContent>
              <ColorsSection />
            </AccordionContent>
          </AccordionItem>
        ) : null}
        {caps.spacing ? (
          <AccordionItem value="spacing">
            <AccordionTrigger>{t("Spacing")}</AccordionTrigger>
            <AccordionContent>
              <SpacingSection flexContainer={caps.flexContainer} />
            </AccordionContent>
          </AccordionItem>
        ) : null}
        {caps.layout ? (
          <AccordionItem value="layout">
            <AccordionTrigger>{t("Layout")}</AccordionTrigger>
            <AccordionContent>
              <LayoutSection flexContainer={caps.flexContainer} />
            </AccordionContent>
          </AccordionItem>
        ) : null}
        {caps.effects ? (
          <AccordionItem value="effects">
            <AccordionTrigger>{t("Borders & Effects")}</AccordionTrigger>
            <AccordionContent>
              <EffectsSection />
            </AccordionContent>
          </AccordionItem>
        ) : null}
        {caps.background ? (
          <AccordionItem value="background">
            <AccordionTrigger>{t("Background")}</AccordionTrigger>
            <AccordionContent>
              <BackgroundSection allowImage={caps.background} />
            </AccordionContent>
          </AccordionItem>
        ) : null}
        {caps.responsive ? (
          <AccordionItem value="responsive">
            <AccordionTrigger>{t("Responsive")}</AccordionTrigger>
            <AccordionContent>
              <ResponsiveSection />
            </AccordionContent>
          </AccordionItem>
        ) : null}
        {caps.animation ? (
          <AccordionItem value="animation">
            <AccordionTrigger>{t("Animation")}</AccordionTrigger>
            <AccordionContent>
              <AnimationSection />
            </AccordionContent>
          </AccordionItem>
        ) : null}
      </Accordion>
    </div>
  );
}
