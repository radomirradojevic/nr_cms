import type { JSONContent } from "@tiptap/react";
import type {
  VideoAlignment,
  VideoProvider,
} from "@/app/dashboard/content/_editors/video-shared";
import type {
  LayoutGap,
  LayoutKind,
} from "@/app/dashboard/content/_editors/layout-presets";
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
export type LayoutProps = StyledProps & {
  preset?: LayoutKind;
  gap?: LayoutGap;
};
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
   * - "responsive": legacy unitless width/height are percentages.
   * - "fixed": legacy unitless width/height are pixels.
   * Explicit CSS values such as "50%", "640px", or "auto" are preserved.
   * When a dimension is empty, the natural aspect ratio is preserved.
   */
  sizing: "responsive" | "fixed";
  width: string;
  height: string;
  alignment?: "left" | "center" | "right" | null;
};
export type ButtonProps = StyledProps & { label: string; href: string };
export type HeroProps = StyledProps & {
  title: JSONContent;
  subtitle: JSONContent;
};
export type HeroSliderBlockProps = StyledProps & {
  heroSliderId: string;
  heroSliderName: string;
};
export type RawHtmlProps = StyledProps & { html: string };
export type GalleryProps = StyledProps & {
  galleryId: string;
  galleryName: string;
};
export type VideoProps = StyledProps & {
  src: string;
  provider: VideoProvider;
  width?: string | null;
  height?: string | null;
  alignment?: VideoAlignment | null;
};
export type FormProps = StyledProps & { formId: string; formName: string };
export type FormSubmissionsProps = StyledProps & {
  formId: string;
  formName: string;
  displayMode: "table" | "card";
  pageSize?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  hideId?: boolean;
  hideSubmitted?: boolean;
};
export type TableProps = StyledProps & { content: JSONContent };

export const blockNames = [
  "Section",
  "Layout",
  "Columns",
  "Heading",
  "Text",
  "Image",
  "Button",
  "Hero",
  "HeroSlider",
  "RawHtml",
  "Gallery",
  "Video",
  "Form",
  "FormSubmissions",
  "Table",
] as const;

export type BlockName = (typeof blockNames)[number];

export const emptyDoc: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export const defaults = {
  Section: { padded: true } satisfies SectionProps,
  Layout: { preset: "2-col", gap: "md" } satisfies LayoutProps,
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
    alignment: "center",
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
  HeroSlider: {
    heroSliderId: "",
    heroSliderName: "",
  } satisfies HeroSliderBlockProps,
  RawHtml: {
    html: "<p>Raw HTML block — edit in settings.</p>",
  } satisfies RawHtmlProps,
  Gallery: {
    galleryId: "",
    galleryName: "",
  } satisfies GalleryProps,
  Video: {
    src: "",
    provider: "youtube",
    width: "100%",
    height: null,
    alignment: "center",
  } satisfies VideoProps,
  Form: {
    formId: "",
    formName: "",
  } satisfies FormProps,
  FormSubmissions: {
    formId: "",
    formName: "",
    displayMode: "table" as const,
    pageSize: 10,
    sortField: "created_at",
    sortOrder: "desc" as const,
    hideId: true,
    hideSubmitted: false,
  } satisfies FormSubmissionsProps,
  Table: {
    content: {
      type: "doc",
      content: [
        {
          type: "table",
          content: Array.from({ length: 3 }, () => ({
            type: "tableRow",
            content: Array.from({ length: 3 }, () => ({
              type: "tableCell",
              content: [{ type: "paragraph" }],
            })),
          })),
        },
      ],
    },
  } satisfies TableProps,
};
