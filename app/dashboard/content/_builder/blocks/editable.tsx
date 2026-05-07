"use client";

import type { ReactNode } from "react";
import { useNode, useEditor, Element } from "@craftjs/core";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export function Section({
  padded,
  children,
}: SectionProps & { children?: ReactNode }) {
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
      <div className="space-y-2">{children}</div>
    </section>
  );
}
Section.craft = {
  displayName: "Section",
  props: defaults.Section,
  rules: { canMoveIn: () => true },
  related: { settings: SectionSettings },
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

export function ImageBlock({ src, alt }: ImageProps) {
  return (
    <NodeWrap>
      <ImageStatic src={src} alt={alt} />
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
  } = useNode((n) => ({
    src: (n.data.props as ImageProps).src,
    alt: (n.data.props as ImageProps).alt,
  }));
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

/* ===================== Helpers ===================== */

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

/* ===================== Resolver ===================== */

export const resolver = {
  Root,
  Section,
  Columns,
  ColumnSlot,
  Heading,
  Text,
  Image: ImageBlock,
  Button: ButtonBlock,
  Hero,
  RawHtml,
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
