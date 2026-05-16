import type { JSONContent } from "@tiptap/react";
import type { BlockStyle } from "./style/types";

/**
 * Every block carries an optional unified `style` envelope. See
 * `./style/types.ts` and
 * `.github/instructions/cms-page-builder-block-properties.instructions.md`.
 */
export type StyledProps = { style?: BlockStyle };

export type RootProps = Record<string, never>;
export type SectionProps = StyledProps & { padded?: boolean };
export type ColumnsProps = StyledProps & { gap?: "sm" | "md" | "lg" };
export type HeadingProps = StyledProps & {
  content: JSONContent;
  level: "1" | "2" | "3";
};
export type TextProps = StyledProps & { content: JSONContent };
export type ImageProps = StyledProps & {
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
export type ButtonProps = StyledProps & { label: string; href: string };
export type HeroProps = StyledProps & {
  title: JSONContent;
  subtitle: JSONContent;
};
export type RawHtmlProps = StyledProps & { html: string };
export type GalleryProps = StyledProps & {
  galleryId: string;
  galleryName: string;
};
export type FormProps = StyledProps & { formId: string; formName: string };

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
  "Form",
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
  Form: {
    formId: "",
    formName: "",
  } satisfies FormProps,
};
