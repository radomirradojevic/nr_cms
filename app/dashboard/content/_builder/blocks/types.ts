import type { JSONContent } from "@tiptap/react";

export type RootProps = Record<string, never>;
export type SectionProps = { padded?: boolean };
export type ColumnsProps = { gap?: "sm" | "md" | "lg" };
export type HeadingProps = { content: JSONContent; level: "1" | "2" | "3" };
export type TextProps = { content: JSONContent };
export type ImageProps = {
  src: string;
  alt: string;
  /**
   * Sizing mode for the image:
   * - "responsive": width/height interpreted as percentages (e.g. "50%").
   * - "fixed": width/height interpreted as pixels (e.g. "640").
   * When a dimension is empty, the natural aspect ratio is preserved.
   */
  sizing: "responsive" | "fixed";
  width: string;
  height: string;
};
export type ButtonProps = { label: string; href: string };
export type HeroProps = { title: JSONContent; subtitle: JSONContent };
export type RawHtmlProps = { html: string };
export type GalleryProps = { galleryId: string; galleryName: string };

export const blockNames = [
  "Section",
  "Columns",
  "Heading",
  "Text",
  "Image",
  "Button",
  "Hero",
  "RawHtml",
  "Gallery",
] as const;

export type BlockName = (typeof blockNames)[number];

export const emptyDoc: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export const defaults = {
  Section: { padded: true } satisfies SectionProps,
  Columns: { gap: "md" } satisfies ColumnsProps,
  Heading: {
    level: "2" as const,
    content: {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Heading" }] },
      ],
    },
  } satisfies HeadingProps,
  Text: {
    content: {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Some text" }] },
      ],
    },
  } satisfies TextProps,
  Image: {
    src: "",
    alt: "",
    sizing: "responsive",
    width: "",
    height: "",
  } satisfies ImageProps,
  Button: { label: "Click me", href: "#" } satisfies ButtonProps,
  Hero: {
    title: {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hero title" }] },
      ],
    },
    subtitle: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hero subtitle" }],
        },
      ],
    },
  } satisfies HeroProps,
  RawHtml: {
    html: "<p>Raw HTML block — edit in settings.</p>",
  } satisfies RawHtmlProps,
  Gallery: {
    galleryId: "",
    galleryName: "",
  } satisfies GalleryProps,
};
