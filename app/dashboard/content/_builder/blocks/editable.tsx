"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useNode, useEditor, Element } from "@craftjs/core";
import { Button } from "@/components/ui/button";
import { ImageIcon, Images, FormInput } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImagePickerDialog } from "./image-picker-dialog";
import { GallerySelectDialog } from "@/app/dashboard/content/_editors/gallery-select-dialog";
import { FormSelectDialog } from "@/app/dashboard/content/_editors/form-select-dialog";
import {
  fetchGalleryPreview,
  type GalleryPickerPreviewImage,
} from "@/app/dashboard/gallerymanager/actions";
import { fetchFormPreview } from "@/app/dashboard/form-builder/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { InlineRichText, emptyInlineDoc } from "../inline-rich-text";
import {
  ButtonStatic,
  ColumnsStatic,
  HeadingStatic,
  HeroStatic,
  ImageStatic,
  RawHtmlStatic,
  SectionStatic,
  TextStatic,
} from "./static";
import {
  defaults,
  type ButtonProps,
  type ColumnsProps,
  type FormProps,
  type FormSubmissionsProps,
  type GalleryProps,
  type HeadingProps,
  type HeroProps,
  type ImageProps,
  type RawHtmlProps,
  type SectionProps,
  type TextProps,
} from "./types";
import type { BlockStyle, TypographyStyle, Viewport } from "./style/types";
import { applyBlockStyle } from "./style/serialize";
import { useViewport } from "./panel/viewport-context";
import { BlockSettingsPanel } from "./panel/BlockSettingsPanel";
import { cn } from "@/lib/utils";

/**
 * Editor-side helper: read the current `style` envelope from a Craft.js
 * node and resolve it for the current viewport in the preview frame.
 * Returns `{styleObj, className}` suitable to spread on the block's root.
 */
function useBlockStyleShell(style: BlockStyle | undefined) {
  const { viewport } = useViewport();
  return applyBlockStyle(style, viewport);
}

/**
 * Wraps every editable block with the Craft.js drag/select connector
 * plus a hover/selection ring.
 */
function NodeWrap({
  children,
  inline,
  style,
  className: extraClass,
  styleObj,
}: {
  children: ReactNode;
  inline?: boolean;
  style?: BlockStyle;
  className?: string;
  styleObj?: React.CSSProperties;
}) {
  const {
    connectors: { connect, drag },
    selected,
    hovered,
  } = useNode((n) => ({
    selected: n.events.selected,
    hovered: n.events.hovered,
  }));
  const { viewport } = useViewport();
  const { style: resolved, className: bbClass } = applyBlockStyle(
    style,
    viewport,
  );
  const finalStyle: React.CSSProperties = { ...resolved, ...(styleObj ?? {}) };
  const ring = selected
    ? "ring-2 ring-primary"
    : hovered
      ? "ring-1 ring-primary/40"
      : "";
  return (
    <div
      ref={(el) => {
        if (el) connect(drag(el));
      }}
      style={finalStyle}
      className={cn(
        "relative rounded-sm transition-shadow",
        inline ? "inline-block" : "block",
        bbClass,
        extraClass,
        ring,
      )}
    >
      {children}
    </div>
  );
}

/* ===================== Root ===================== */

export function Root({ children }: { children?: ReactNode }) {
  const {
    connectors: { connect },
  } = useNode();
  return (
    <div
      ref={(el) => {
        if (el) connect(el);
      }}
      className="min-h-[400px] space-y-2 p-4"
    >
      {children}
    </div>
  );
}
Root.craft = {
  displayName: "Root",
  props: {},
  rules: { canDrag: () => false },
};

/* ===================== Section ===================== */

export function Section({ padded, style }: SectionProps) {
  const {
    connectors: { connect, drag },
    selected,
    hovered,
  } = useNode((n) => ({
    selected: n.events.selected,
    hovered: n.events.hovered,
  }));
  const { style: cssStyle, className: bbClass } = useBlockStyleShell(style);
  const ring = selected
    ? "ring-2 ring-primary"
    : hovered
      ? "ring-1 ring-primary/40"
      : "";
  return (
    <section
      ref={(el) => {
        if (el) connect(drag(el));
      }}
      style={cssStyle}
      className={cn(
        padded
          ? "my-6 rounded-lg border bg-card p-6"
          : "my-4 rounded-md border border-dashed p-3",
        bbClass,
        ring,
      )}
    >
      <Element id="content" is={SectionSlot} canvas />
    </section>
  );
}
Section.craft = {
  displayName: "Section",
  props: defaults.Section,
  related: { settings: SectionSettings },
};

/** Internal canvas slot for a Section — gives Craft.js a drop target so child blocks can be nested inside. */
function SectionSlot({ children }: { children?: ReactNode }) {
  const {
    connectors: { connect },
  } = useNode();
  return (
    <div
      ref={(el) => {
        if (el) connect(el);
      }}
      className="min-h-[60px] space-y-2 rounded border border-dashed border-muted-foreground/20 p-2"
    >
      {children}
    </div>
  );
}
SectionSlot.craft = {
  displayName: "Section content",
  rules: { canDrag: () => false },
};

function SectionSettings() {
  const {
    actions: { setProp },
    padded,
  } = useNode((n) => ({ padded: (n.data.props as SectionProps).padded }));
  return (
    <>
      <Field label="Padded">
        <Switch
          checked={!!padded}
          onCheckedChange={(v) =>
            setProp((p: SectionProps) => {
              p.padded = v;
            })
          }
        />
      </Field>
      <BlockSettingsPanel blockName="Section" />
    </>
  );
}

/* ===================== Columns ===================== */

export function Columns({ gap, style }: ColumnsProps) {
  const {
    connectors: { connect, drag },
    selected,
    hovered,
    id,
  } = useNode((n) => ({
    selected: n.events.selected,
    hovered: n.events.hovered,
  }));
  const { style: cssStyle, className: bbClass } = useBlockStyleShell(style);
  const ring = selected
    ? "ring-2 ring-primary"
    : hovered
      ? "ring-1 ring-primary/40"
      : "";
  const gapClass = { sm: "gap-3", md: "gap-6", lg: "gap-10" }[gap ?? "md"];
  return (
    <div
      ref={(el) => {
        if (el) connect(drag(el));
      }}
      style={cssStyle}
      className={cn(
        "my-6 grid grid-cols-1 md:grid-cols-2",
        gapClass,
        bbClass,
        ring,
      )}
      data-cols-id={id}
    >
      <Element id="left" is={ColumnSlot} canvas />
      <Element id="right" is={ColumnSlot} canvas />
    </div>
  );
}
Columns.craft = {
  displayName: "Columns",
  props: defaults.Columns,
  related: { settings: ColumnsSettings },
};

/** Internal canvas slot for each column — gives Craft.js a drop target. */
function ColumnSlot({ children }: { children?: ReactNode }) {
  const {
    connectors: { connect },
  } = useNode();
  return (
    <div
      ref={(el) => {
        if (el) connect(el);
      }}
      className="min-h-[60px] rounded border border-dashed border-muted-foreground/20 p-2"
    >
      {children}
    </div>
  );
}
ColumnSlot.craft = {
  displayName: "Column",
  rules: { canDrag: () => false },
};

function ColumnsSettings() {
  const {
    actions: { setProp },
    gap,
  } = useNode((n) => ({ gap: (n.data.props as ColumnsProps).gap }));
  return (
    <>
      <Field label="Gap">
        <Select
          value={gap ?? "md"}
          onValueChange={(v) =>
            setProp((p: ColumnsProps) => {
              p.gap = v as ColumnsProps["gap"];
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sm">Small</SelectItem>
            <SelectItem value="md">Medium</SelectItem>
            <SelectItem value="lg">Large</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <BlockSettingsPanel blockName="Columns" />
    </>
  );
}

/* ===================== Heading ===================== */

export function Heading({ content, level, style }: HeadingProps) {
  const {
    actions: { setProp },
  } = useNode();
  const Tag = `h${level}` as "h1" | "h2" | "h3";
  const sizes = { "1": "text-4xl", "2": "text-3xl", "3": "text-2xl" } as const;
  return (
    <NodeWrap style={style}>
      <Tag className={`font-semibold tracking-tight my-4 ${sizes[level]}`}>
        <InlineRichText
          singleLine
          value={content ?? emptyInlineDoc}
          onChange={(v) =>
            setProp((p: HeadingProps) => {
              p.content = v;
            })
          }
        />
      </Tag>
    </NodeWrap>
  );
}
Heading.craft = {
  displayName: "Heading",
  props: defaults.Heading,
  related: { settings: HeadingSettings },
};

function HeadingSettings() {
  const {
    actions: { setProp },
    level,
  } = useNode((n) => ({ level: (n.data.props as HeadingProps).level }));
  return (
    <>
      <Field label="Level">
        <Select
          value={level}
          onValueChange={(v) =>
            setProp((p: HeadingProps) => {
              p.level = v as HeadingProps["level"];
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">H1</SelectItem>
            <SelectItem value="2">H2</SelectItem>
            <SelectItem value="3">H3</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <BlockSettingsPanel blockName="Heading" />
    </>
  );
}

/* ===================== Text ===================== */

function cleanupEmptyBlockStyle(style: BlockStyle) {
  if (style.typography && Object.keys(style.typography).length === 0) {
    delete style.typography;
  }
  const responsive = style.responsive;
  if (!responsive) return;
  for (const viewport of ["tablet", "mobile"] as const) {
    const override = responsive[viewport];
    if (!override) continue;
    if (
      override.typography &&
      Object.keys(override.typography).length === 0
    ) {
      delete override.typography;
    }
    if (Object.keys(override).length === 0) {
      delete responsive[viewport];
    }
  }
  if (Object.keys(responsive).length === 0) {
    delete style.responsive;
  }
}

function setTextBlockAlign(
  props: TextProps,
  viewport: Viewport,
  value: TypographyStyle["textAlign"],
) {
  if (!props.style) props.style = {};

  if (viewport === "desktop") {
    if (!props.style.typography) props.style.typography = {};
    if (value) props.style.typography.textAlign = value;
    else delete props.style.typography.textAlign;
    cleanupEmptyBlockStyle(props.style);
    return;
  }

  if (!props.style.responsive) props.style.responsive = {};
  if (!props.style.responsive[viewport]) props.style.responsive[viewport] = {};
  const override = props.style.responsive[viewport];
  if (!override.typography) override.typography = {};
  if (value) override.typography.textAlign = value;
  else delete override.typography.textAlign;
  cleanupEmptyBlockStyle(props.style);
}

function resolvedTextAlign(
  style: BlockStyle | undefined,
  viewport: Viewport,
): TypographyStyle["textAlign"] {
  const textAlign = applyBlockStyle(style, viewport).style.textAlign;
  return textAlign === "left" ||
    textAlign === "center" ||
    textAlign === "right" ||
    textAlign === "justify"
    ? textAlign
    : undefined;
}

export function Text({ content, style }: TextProps) {
  const {
    actions: { setProp },
  } = useNode();
  const { viewport } = useViewport();
  const blockTextAlign = resolvedTextAlign(style, viewport);
  return (
    <NodeWrap style={style}>
      <div className="my-3 leading-relaxed [&_p]:my-2 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6">
        <InlineRichText
          value={content ?? emptyInlineDoc}
          onChange={(v) =>
            setProp((p: TextProps) => {
              p.content = v;
            })
          }
          blockTextAlign={blockTextAlign}
          onBlockTextAlignChange={(value) =>
            setProp((p: TextProps) => {
              setTextBlockAlign(p, viewport, value);
            })
          }
        />
      </div>
    </NodeWrap>
  );
}
Text.craft = {
  displayName: "Text",
  props: defaults.Text,
  related: { settings: TextSettings },
};

function TextSettings() {
  return <BlockSettingsPanel blockName="Text" />;
}

/* ===================== Image ===================== */

export function ImageBlock({
  src,
  alt,
  sizing,
  width,
  height,
  style,
}: ImageProps) {
  return (
    <NodeWrap style={style}>
      <ImageStatic
        src={src}
        alt={alt}
        sizing={sizing}
        width={width}
        height={height}
      />
    </NodeWrap>
  );
}
ImageBlock.craft = {
  displayName: "Image",
  props: defaults.Image,
  related: { settings: ImageSettings },
};

function ImageSettings() {
  const {
    actions: { setProp },
    src,
    alt,
    sizing,
    width,
    height,
  } = useNode((n) => ({
    src: (n.data.props as ImageProps).src,
    alt: (n.data.props as ImageProps).alt,
    sizing: (n.data.props as ImageProps).sizing ?? "responsive",
    width: (n.data.props as ImageProps).width ?? "",
    height: (n.data.props as ImageProps).height ?? "",
  }));
  const [pickerOpen, setPickerOpen] = useState(false);
  const isFixed = sizing === "fixed";
  return (
    <>
      <Field label="Image URL">
        <Input
          value={src}
          onChange={(e) =>
            setProp((p: ImageProps) => {
              p.src = e.target.value;
            })
          }
          placeholder="https://…"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 w-full"
          onClick={() => setPickerOpen(true)}
        >
          <ImageIcon className="h-4 w-4" />
          Choose from File Manager
        </Button>
      </Field>
      <Field label="Alt text">
        <Input
          value={alt}
          onChange={(e) =>
            setProp((p: ImageProps) => {
              p.alt = e.target.value;
            })
          }
        />
      </Field>
      <Field label="Sizing mode">
        <Select
          value={sizing}
          onValueChange={(v) =>
            setProp((p: ImageProps) => {
              p.sizing = v === "fixed" ? "fixed" : "responsive";
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="responsive">Responsive (%)</SelectItem>
            <SelectItem value="fixed">Fixed (px)</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={isFixed ? "Width (px)" : "Width (%)"}>
          <Input
            value={width}
            onChange={(e) =>
              setProp((p: ImageProps) => {
                p.width = e.target.value;
              })
            }
            placeholder={isFixed ? "e.g. 640" : "e.g. 50"}
            inputMode="numeric"
          />
        </Field>
        <Field label={isFixed ? "Height (px)" : "Height (%)"}>
          <Input
            value={height}
            onChange={(e) =>
              setProp((p: ImageProps) => {
                p.height = e.target.value;
              })
            }
            placeholder={isFixed ? "e.g. 240" : "auto"}
            inputMode="numeric"
          />
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">
        Leave one dimension empty to preserve the original aspect ratio.
      </p>
      <ImagePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={({ src: nextSrc, alt: nextAlt }) => {
          setProp((p: ImageProps) => {
            p.src = nextSrc;
            if (!p.alt && nextAlt) p.alt = nextAlt;
          });
        }}
      />
      <BlockSettingsPanel blockName="Image" />
    </>
  );
}

/* ===================== Button ===================== */

export function ButtonBlock({ label, href, style }: ButtonProps) {
  return (
    <NodeWrap inline style={style}>
      <ButtonStatic label={label} href={href} />
    </NodeWrap>
  );
}
ButtonBlock.craft = {
  displayName: "Button",
  props: defaults.Button,
  related: { settings: ButtonSettings },
};

function ButtonSettings() {
  const {
    actions: { setProp },
    label,
    href,
  } = useNode((n) => ({
    label: (n.data.props as ButtonProps).label,
    href: (n.data.props as ButtonProps).href,
  }));
  return (
    <>
      <Field label="Label">
        <Input
          value={label}
          onChange={(e) =>
            setProp((p: ButtonProps) => {
              p.label = e.target.value;
            })
          }
        />
      </Field>
      <Field label="Link">
        <Input
          value={href}
          onChange={(e) =>
            setProp((p: ButtonProps) => {
              p.href = e.target.value;
            })
          }
          placeholder="https://…"
        />
      </Field>
      <BlockSettingsPanel blockName="Button" />
    </>
  );
}

/* ===================== Hero ===================== */

export function Hero({ title, subtitle, style }: HeroProps) {
  const {
    actions: { setProp },
  } = useNode();
  return (
    <NodeWrap style={style}>
      <section className="my-8 rounded-lg border bg-card p-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          <InlineRichText
            singleLine
            value={title ?? emptyInlineDoc}
            onChange={(v) =>
              setProp((p: HeroProps) => {
                p.title = v;
              })
            }
          />
        </h1>
        <div className="mt-4 text-lg text-muted-foreground">
          <InlineRichText
            value={subtitle ?? emptyInlineDoc}
            onChange={(v) =>
              setProp((p: HeroProps) => {
                p.subtitle = v;
              })
            }
          />
        </div>
      </section>
    </NodeWrap>
  );
}
Hero.craft = {
  displayName: "Hero",
  props: defaults.Hero,
  related: { settings: HeroSettings },
};

function HeroSettings() {
  return <BlockSettingsPanel blockName="Hero" />;
}

/* ===================== Raw HTML ===================== */

export function RawHtml({ html, style }: RawHtmlProps) {
  return (
    <NodeWrap style={style}>
      <RawHtmlStatic html={html} />
    </NodeWrap>
  );
}
RawHtml.craft = {
  displayName: "RawHtml",
  props: defaults.RawHtml,
  related: { settings: RawHtmlSettings },
};

function RawHtmlSettings() {
  const {
    actions: { setProp },
    html,
  } = useNode((n) => ({ html: (n.data.props as RawHtmlProps).html }));
  return (
    <>
      <Field label="HTML source">
        <Textarea
          rows={10}
          value={html}
          onChange={(e) =>
            setProp((p: RawHtmlProps) => {
              p.html = e.target.value;
            })
          }
          className="font-mono text-xs"
        />
      </Field>
      <BlockSettingsPanel blockName="RawHtml" />
    </>
  );
}

/* ===================== Gallery ===================== */

export function Gallery({ galleryId, galleryName, style }: GalleryProps) {
  const [preview, setPreview] = useState<{
    name: string;
    images: GalleryPickerPreviewImage[];
  } | null>(null);
  const [, startPreview] = useTransition();

  useEffect(() => {
    if (!galleryId) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    startPreview(async () => {
      const res = await fetchGalleryPreview({ id: galleryId });
      if (cancelled) return;
      if ("error" in res) {
        setPreview(null);
      } else {
        setPreview({ name: res.name, images: res.images });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [galleryId]);

  return (
    <NodeWrap style={style}>
      {!galleryId ? (
        <div className="my-4 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          <Images className="mx-auto mb-2 h-6 w-6" />
          Gallery placeholder — pick a gallery in the block settings.
        </div>
      ) : preview ? (
        <div className="my-4 rounded-md border bg-card p-3">
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Images className="h-3.5 w-3.5" />
            <span className="font-medium">{preview.name}</span>
            <span>· {preview.images.length} images</span>
          </div>
          {preview.images.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Gallery is empty.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {preview.images.slice(0, 12).map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.fileId}
                  src={`/api/files/${img.fileId}`}
                  alt={img.alt}
                  className="aspect-square w-full rounded border bg-muted object-cover"
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="my-4 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          Loading gallery{galleryName ? ` "${galleryName}"` : ""}…
        </div>
      )}
    </NodeWrap>
  );
}
Gallery.craft = {
  displayName: "Gallery",
  props: defaults.Gallery,
  related: { settings: GallerySettings },
};

function GallerySettings() {
  const {
    actions: { setProp },
    galleryId,
    galleryName,
  } = useNode((n) => ({
    galleryId: (n.data.props as GalleryProps).galleryId,
    galleryName: (n.data.props as GalleryProps).galleryName,
  }));
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <>
      <Field label="Selected gallery">
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
          {galleryId ? (
            <>
              <p className="font-medium">{galleryName || "(untitled)"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {galleryId}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">No gallery selected.</p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 w-full"
          onClick={() => setPickerOpen(true)}
        >
          <Images className="h-4 w-4" />
          {galleryId ? "Change gallery" : "Choose gallery"}
        </Button>
        {galleryId ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 w-full"
            onClick={() =>
              setProp((p: GalleryProps) => {
                p.galleryId = "";
                p.galleryName = "";
              })
            }
          >
            Clear selection
          </Button>
        ) : null}
      </Field>
      <GallerySelectDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onInsert={({ galleryId: nextId, galleryName: nextName }) => {
          setProp((p: GalleryProps) => {
            p.galleryId = nextId;
            p.galleryName = nextName;
          });
        }}
      />
      <BlockSettingsPanel blockName="Gallery" />
    </>
  );
}

/* ===================== Helpers ===================== */

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

/* ===================== Form ===================== */

export function Form({ formId, formName, style }: FormProps) {
  const [preview, setPreview] = useState<{
    name: string;
    fieldCount: number;
    status: string;
  } | null>(null);
  const [, startPreview] = useTransition();

  useEffect(() => {
    if (!formId) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    startPreview(async () => {
      const res = await fetchFormPreview({ id: formId });
      if (cancelled) return;
      if ("error" in res) {
        setPreview(null);
      } else {
        setPreview({
          name: res.name,
          fieldCount: res.fieldCount,
          status: res.status,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [formId]);

  return (
    <NodeWrap style={style}>
      {!formId ? (
        <div className="my-4 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          <FormInput className="mx-auto mb-2 h-6 w-6" />
          <p>Form placeholder — pick a form in the block settings.</p>
          <p className="mt-1 text-xs">
            Only <strong>published</strong> forms appear in the picker.
          </p>
        </div>
      ) : preview ? (
        <div className="my-4 rounded-md border bg-card p-3 text-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FormInput className="h-3.5 w-3.5" />
            <span className="font-medium">{preview.name}</span>
            <span>
              · {preview.fieldCount} field{preview.fieldCount === 1 ? "" : "s"}
            </span>
            <span>· {preview.status}</span>
          </div>
        </div>
      ) : (
        <div className="my-4 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          Loading form{formName ? ` "${formName}"` : ""}…
        </div>
      )}
    </NodeWrap>
  );
}
Form.craft = {
  displayName: "Form",
  props: defaults.Form,
  related: { settings: FormSettings },
};

function FormSettings() {
  const {
    actions: { setProp },
    formId,
    formName,
  } = useNode((n) => ({
    formId: (n.data.props as FormProps).formId,
    formName: (n.data.props as FormProps).formName,
  }));
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <>
      <Field label="Selected form">
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
          {formId ? (
            <>
              <p className="font-medium">{formName || "(untitled)"}</p>
              <p className="truncate text-xs text-muted-foreground">{formId}</p>
            </>
          ) : (
            <p className="text-muted-foreground">No form selected.</p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 w-full"
          onClick={() => setPickerOpen(true)}
        >
          <FormInput className="h-4 w-4" />
          {formId ? "Change form" : "Choose form"}
        </Button>
        {formId ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 w-full"
            onClick={() =>
              setProp((p: FormProps) => {
                p.formId = "";
                p.formName = "";
              })
            }
          >
            Clear selection
          </Button>
        ) : null}
      </Field>
      <FormSelectDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onInsert={({ formId: nextId, formName: nextName }) => {
          setProp((p: FormProps) => {
            p.formId = nextId;
            p.formName = nextName;
          });
        }}
      />
      <BlockSettingsPanel blockName="Form" />
    </>
  );
}

/* ===================== Form Submissions ===================== */

export function FormSubmissions({
  formId,
  formName,
  displayMode = "table",
  style,
}: FormSubmissionsProps) {
  return (
    <NodeWrap style={style}>
      {!formId ? (
        <div className="my-4 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          <FormInput className="mx-auto mb-2 h-6 w-6" />
          Form Submissions placeholder — pick a form in the block settings.
        </div>
      ) : (
        <div className="my-4 rounded-md border bg-card p-3">
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <FormInput className="h-3.5 w-3.5" />
            <span className="font-medium">Form Submissions</span>
            {formName ? (
              <span className="min-w-0 truncate">· {formName}</span>
            ) : null}
            <span>· {displayMode} view</span>
          </div>
          <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 text-center">
            Submissions will be displayed here on the public page.
          </div>
        </div>
      )}
    </NodeWrap>
  );
}
FormSubmissions.craft = {
  displayName: "Form Submissions",
  props: defaults.FormSubmissions,
  related: { settings: FormSubmissionsSettings },
};

function FormSubmissionsSettings() {
  const {
    actions: { setProp },
    formId,
    formName,
    displayMode,
    pageSize,
    hideId,
  } = useNode((n) => ({
    formId: (n.data.props as FormSubmissionsProps).formId,
    formName: (n.data.props as FormSubmissionsProps).formName,
    displayMode: (n.data.props as FormSubmissionsProps).displayMode,
    pageSize: (n.data.props as FormSubmissionsProps).pageSize ?? 10,
    hideId: (n.data.props as FormSubmissionsProps).hideId ?? true,
  }));
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <Field label="Select Form">
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
          {formId ? (
            <>
              <p className="font-medium">{formName || "(untitled)"}</p>
              <p className="truncate text-xs text-muted-foreground">{formId}</p>
            </>
          ) : (
            <p className="text-muted-foreground">No form selected.</p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 w-full"
          onClick={() => setPickerOpen(true)}
        >
          <FormInput className="h-4 w-4" />
          {formId ? "Change form" : "Choose form"}
        </Button>
        {formId ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 w-full"
            onClick={() =>
              setProp((p: FormSubmissionsProps) => {
                p.formId = "";
                p.formName = "";
              })
            }
          >
            Clear selection
          </Button>
        ) : null}
      </Field>

      <Field label="Display Mode">
        <Select
          value={displayMode}
          onValueChange={(v) =>
            setProp((p: FormSubmissionsProps) => {
              p.displayMode = v as "table" | "card";
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="table">Table</SelectItem>
            <SelectItem value="card">Card</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field label="Page Size">
        <Input
          type="number"
          min={5}
          max={100}
          value={pageSize}
          onChange={(e) =>
            setProp((p: FormSubmissionsProps) => {
              p.pageSize = Math.min(
                Math.max(parseInt(e.target.value, 10) || 10, 5),
                100,
              );
            })
          }
        />
      </Field>

      <Field label="Hide ID">
        <Switch
          checked={!!hideId}
          onCheckedChange={(v) =>
            setProp((p: FormSubmissionsProps) => {
              p.hideId = v;
            })
          }
        />
      </Field>

      <FormSelectDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onInsert={({ formId: nextId, formName: nextName }) => {
          setProp((p: FormSubmissionsProps) => {
            p.formId = nextId;
            p.formName = nextName;
          });
        }}
      />

      <BlockSettingsPanel blockName="Form" />
    </>
  );
}

/* ===================== Resolver ===================== */

export const resolver = {
  Root,
  Section,
  SectionSlot,
  Columns,
  ColumnSlot,
  Heading,
  Text,
  Image: ImageBlock,
  Button: ButtonBlock,
  Hero,
  RawHtml,
  Gallery,
  Form,
  FormSubmissions,
};

/** Re-export for convenience in chrome / page-editor. */
export { useEditor };

// Suppress "ColumnsStatic / HeadingStatic / etc. unused" — they're imported
// by the static-only renderer; this barrel just re-exports the editable side.
void ColumnsStatic;
void HeadingStatic;
void HeroStatic;
void TextStatic;
void SectionStatic;
