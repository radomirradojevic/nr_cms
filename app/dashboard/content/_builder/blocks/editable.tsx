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
  type GalleryProps,
  type HeadingProps,
  type HeroProps,
  type ImageProps,
  type RawHtmlProps,
  type SectionProps,
  type TextProps,
} from "./types";

/**
 * Wraps every editable block with the Craft.js drag/select connector
 * plus a hover/selection ring.
 */
function NodeWrap({
  children,
  inline,
}: {
  children: ReactNode;
  inline?: boolean;
}) {
  const {
    connectors: { connect, drag },
    selected,
    hovered,
  } = useNode((n) => ({
    selected: n.events.selected,
    hovered: n.events.hovered,
  }));
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
      className={`relative ${inline ? "inline-block" : "block"} rounded-sm transition-shadow ${ring}`}
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

export function Section({ padded }: SectionProps) {
  const {
    connectors: { connect, drag },
    selected,
    hovered,
  } = useNode((n) => ({
    selected: n.events.selected,
    hovered: n.events.hovered,
  }));
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
      className={`${padded ? "my-6 rounded-lg border bg-card p-6" : "my-4 rounded-md border border-dashed p-3"} ${ring}`}
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
  );
}

/* ===================== Columns ===================== */

export function Columns({ gap }: ColumnsProps) {
  const {
    connectors: { connect, drag },
    selected,
    hovered,
    id,
  } = useNode((n) => ({
    selected: n.events.selected,
    hovered: n.events.hovered,
  }));
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
      className={`my-6 grid grid-cols-1 md:grid-cols-2 ${gapClass} ${ring}`}
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
  );
}

/* ===================== Heading ===================== */

export function Heading({ content, level }: HeadingProps) {
  const {
    actions: { setProp },
  } = useNode();
  const Tag = `h${level}` as "h1" | "h2" | "h3";
  const sizes = { "1": "text-4xl", "2": "text-3xl", "3": "text-2xl" } as const;
  return (
    <NodeWrap>
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
  );
}

/* ===================== Text ===================== */

export function Text({ content }: TextProps) {
  const {
    actions: { setProp },
  } = useNode();
  return (
    <NodeWrap>
      <div className="my-3 leading-relaxed [&_p]:my-2 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6">
        <InlineRichText
          value={content ?? emptyInlineDoc}
          onChange={(v) =>
            setProp((p: TextProps) => {
              p.content = v;
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
  related: { settings: () => null },
};

/* ===================== Image ===================== */

export function ImageBlock({ src, alt, sizing, width, height }: ImageProps) {
  return (
    <NodeWrap>
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
    </>
  );
}

/* ===================== Button ===================== */

export function ButtonBlock({ label, href }: ButtonProps) {
  return (
    <NodeWrap inline>
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
    </>
  );
}

/* ===================== Hero ===================== */

export function Hero({ title, subtitle }: HeroProps) {
  const {
    actions: { setProp },
  } = useNode();
  return (
    <NodeWrap>
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
  related: { settings: () => null },
};

/* ===================== Raw HTML ===================== */

export function RawHtml({ html }: RawHtmlProps) {
  return (
    <NodeWrap>
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
  );
}

/* ===================== Gallery ===================== */

export function Gallery({ galleryId, galleryName }: GalleryProps) {
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
    <NodeWrap>
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

export function Form({ formId, formName }: FormProps) {
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
    <NodeWrap>
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
