import type { ReactNode, CSSProperties } from "react";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { renderInlineHtml } from "../render-inline";
import type {
  ButtonProps,
  ColumnsProps,
  HeadingProps,
  HeroProps,
  ImageProps,
  LayoutProps,
  RawHtmlProps,
  SectionProps,
  TableProps,
  TextProps,
  VideoProps,
} from "./types";
import {
  applyBlockStyle,
  buildResponsiveCss,
  styleHash,
} from "./style/serialize";
import type { BlockStyle } from "./style/types";
import { cn } from "@/lib/utils";
import { VideoEmbed } from "@/app/dashboard/content/_editors/video-embed";
import {
  getLayoutPreset,
  layoutGapOptions,
} from "@/app/dashboard/content/_editors/layout-presets";
import { sanitizeTiptapHtml } from "@/app/dashboard/content/_editors/sanitize-tiptap-html";
import { sanitizeCmsHtml } from "@/lib/content-sanitizer";
import { sanitizeHref, sanitizeMediaSrc } from "@/lib/url-safety";

/**
 * Pure JSX renderers for every block. These are imported by both the
 * RSC server renderer and the editor's static-preview overlay. They MUST NOT
 * import any client-only code (no Craft.js, no Tiptap React).
 *
 * Every renderer takes an optional `style: BlockStyle` envelope and applies
 * it to its root element via `applyBlockStyle()`. Responsive overrides are
 * emitted as a scoped `<style>` tag adjacent to the block.
 */

const gapClass: Record<NonNullable<ColumnsProps["gap"]>, string> = {
  sm: "gap-3",
  md: "gap-6",
  lg: "gap-10",
};

function tracksToGridTemplate(tracks: string) {
  return tracks
    .split(" ")
    .map((track) => `minmax(0, ${track})`)
    .join(" ");
}

const tableRenderExtensions = [
  StarterKit.configure({
    link: { openOnClick: false, autolink: true },
  }),
  TextStyle,
  Color,
  TableKit.configure({
    table: {
      resizable: true,
      renderWrapper: true,
      allowTableNodeSelection: true,
      HTMLAttributes: {
        class: "cms-rich-table",
      },
    },
  }),
  TextAlign.configure({
    types: ["heading", "paragraph", "tableCell", "tableHeader"],
  }),
];

function resolveShell(style: BlockStyle | undefined): {
  shellStyle: CSSProperties;
  shellClass: string;
  responsiveStyleEl: ReactNode;
} {
  const { style: cssStyle, className } = applyBlockStyle(style);
  const scope = `bb-${styleHash(style ?? null)}`;
  const css = buildResponsiveCss(style, scope);
  const responsiveStyleEl = css ? (
    <style dangerouslySetInnerHTML={{ __html: css }} />
  ) : null;
  return {
    shellStyle: cssStyle,
    shellClass: cn(className, css ? scope : null),
    responsiveStyleEl,
  };
}

export function RootStatic({ children }: { children?: ReactNode }) {
  return <div className="space-y-2">{children}</div>;
}

export function SectionStatic({
  padded,
  style,
  children,
}: SectionProps & { children?: ReactNode }) {
  const { shellStyle, shellClass, responsiveStyleEl } = resolveShell(style);
  return (
    <>
      {responsiveStyleEl}
      <section
        style={shellStyle}
        className={cn(
          padded ? "my-6 rounded-lg border bg-card p-6" : "my-4",
          shellClass,
        )}
      >
        <div className="space-y-2">{children}</div>
      </section>
    </>
  );
}

export function ColumnsStatic({
  gap,
  style,
  children,
}: ColumnsProps & { children?: ReactNode }) {
  const { shellStyle, shellClass, responsiveStyleEl } = resolveShell(style);
  return (
    <>
      {responsiveStyleEl}
      <div
        style={shellStyle}
        className={cn(
          "my-6 grid grid-cols-1 md:grid-cols-2",
          gapClass[gap ?? "md"],
          shellClass,
        )}
      >
        {children}
      </div>
    </>
  );
}

export function LayoutStatic({
  preset,
  gap,
  style,
  children,
}: LayoutProps & { children?: ReactNode }) {
  const { shellStyle, shellClass, responsiveStyleEl } = resolveShell(style);
  const layoutPreset = getLayoutPreset(preset);
  const scope = `layout-${styleHash({
    preset: layoutPreset.value,
    tracks: layoutPreset.tracks,
    style: style ?? null,
  })}`;
  const gapClass =
    layoutGapOptions.find((option) => option.value === (gap ?? "md"))
      ?.className ?? "gap-6";
  const layoutCss = `.${scope} { grid-template-columns: ${tracksToGridTemplate(layoutPreset.tracks)}; }
@media (max-width: 767px) { .${scope} { grid-template-columns: minmax(0, 1fr); } }`;
  return (
    <>
      {responsiveStyleEl}
      <style dangerouslySetInnerHTML={{ __html: layoutCss }} />
      <section
        style={shellStyle}
        className={cn(
          "cms-builder-layout my-6 grid",
          scope,
          gapClass,
          shellClass,
        )}
        data-layout-preset={layoutPreset.value}
      >
        {children}
      </section>
    </>
  );
}

export function HeadingStatic({ content, level, style }: HeadingProps) {
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4";
  const sizes = {
    "1": "text-4xl",
    "2": "text-3xl",
    "3": "text-2xl",
    "4": "text-xl",
  } as const;
  const { shellStyle, shellClass, responsiveStyleEl } = resolveShell(style);
  return (
    <>
      {responsiveStyleEl}
      <Tag
        style={shellStyle}
        className={cn(
          "font-semibold tracking-tight my-4",
          sizes[level],
          shellClass,
        )}
        dangerouslySetInnerHTML={{ __html: renderInlineHtml(content) }}
      />
    </>
  );
}

export function TextStatic({ content, style }: TextProps) {
  const { shellStyle, shellClass, responsiveStyleEl } = resolveShell(style);
  return (
    <>
      {responsiveStyleEl}
      <div
        style={shellStyle}
        className={cn(
          "my-3 leading-relaxed [&_p]:my-2 [&_li>p]:my-0 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
          shellClass,
        )}
        dangerouslySetInnerHTML={{
          __html: renderInlineHtml(content),
        }}
      />
    </>
  );
}

export function TableStatic({ content, style }: TableProps) {
  const { shellStyle, shellClass, responsiveStyleEl } = resolveShell(style);
  let html = "";
  try {
    html = sanitizeTiptapHtml(generateHTML(content, tableRenderExtensions));
  } catch {
    html = "";
  }

  return (
    <>
      {responsiveStyleEl}
      <div
        style={shellStyle}
        className={cn("cms-content my-4 max-w-none", shellClass)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}

export function ImageStatic({
  src,
  alt,
  sizing,
  width,
  height,
  alignment,
  style: blockStyle,
}: ImageProps) {
  const { shellStyle, shellClass, responsiveStyleEl } =
    resolveShell(blockStyle);
  const safeSrc = sanitizeMediaSrc(src, { allowDataImages: true });

  if (!safeSrc) {
    return (
      <>
        {responsiveStyleEl}
        <div
          style={shellStyle}
          className={cn(
            "my-4 p-8 border border-dashed text-center text-muted-foreground",
            shellClass,
          )}
        >
          Image placeholder — add a src
        </div>
      </>
    );
  }

  const w = (width ?? "").trim();
  const h = (height ?? "").trim();
  const mode = sizing ?? "responsive";
  const imageAlignment = normalizeImageBlockAlignment(alignment);
  const alignmentStyle = imageBlockAlignmentStyle(imageAlignment);

  // Legacy sizing controls remain authoritative when no explicit
  // `layout.width/maxWidth` is set via BlockStyle.
  const hasStyleSizing =
    !!blockStyle?.layout?.width ||
    !!blockStyle?.layout?.maxWidth ||
    !!shellStyle.width ||
    !!shellStyle.height ||
    !!shellStyle.maxWidth;

  const legacy: CSSProperties = {};
  let widthAttr: number | undefined;
  let heightAttr: number | undefined;

  if (!hasStyleSizing) {
    const cssWidth = resolveImageCssDimension(w, mode);
    const cssHeight = resolveImageCssDimension(h, mode);

    if (cssWidth) {
      legacy.width = cssWidth;
      widthAttr = imageNumericPixelAttr(cssWidth);
    }
    if (cssHeight) {
      legacy.height = cssHeight;
      heightAttr = imageNumericPixelAttr(cssHeight);
    }
    if (legacy.width && !legacy.height) legacy.height = "auto";
    if (legacy.height && !legacy.width) legacy.width = "auto";
    legacy.maxWidth = "100%";
  }

  const merged: CSSProperties = {
    ...legacy,
    ...shellStyle,
    ...alignmentStyle,
    display: shellStyle.display ?? alignmentStyle.display,
  };

  return (
    <>
      {responsiveStyleEl}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={safeSrc}
        alt={alt}
        width={widthAttr}
        height={heightAttr}
        style={merged}
        data-alignment={imageAlignment}
        className={cn(
          "my-4 rounded",
          `tiptap-image-align-${imageAlignment}`,
          shellClass,
        )}
      />
    </>
  );
}

function resolveImageCssDimension(
  value: string,
  mode: ImageProps["sizing"],
): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^auto$/i.test(trimmed)) return "auto";
  if (/[a-z%)]$/i.test(trimmed)) return trimmed;
  return mode === "fixed" ? `${trimmed}px` : `${trimmed}%`;
}

function imageNumericPixelAttr(value: string): number | undefined {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)px$/i);
  if (!match) return undefined;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : undefined;
}

function normalizeImageBlockAlignment(
  value: ImageProps["alignment"],
): NonNullable<ImageProps["alignment"]> {
  return value === "left" || value === "right" || value === "center"
    ? value
    : "center";
}

function imageBlockAlignmentStyle(
  alignment: NonNullable<ImageProps["alignment"]>,
): CSSProperties {
  if (alignment === "left") {
    return { display: "block", marginLeft: 0, marginRight: "auto" };
  }
  if (alignment === "right") {
    return { display: "block", marginLeft: "auto", marginRight: 0 };
  }
  return { display: "block", marginLeft: "auto", marginRight: "auto" };
}

export function ButtonStatic({ label, href, style }: ButtonProps) {
  const { shellStyle, shellClass, responsiveStyleEl } = resolveShell(style);
  const safeHref = sanitizeHref(href);
  return (
    <>
      {responsiveStyleEl}
      <a
        href={safeHref}
        style={shellStyle}
        className={cn(
          "inline-block my-3 rounded bg-primary px-4 py-2 text-primary-foreground",
          shellClass,
        )}
      >
        {label}
      </a>
    </>
  );
}

export function HeroStatic({ title, subtitle, style }: HeroProps) {
  const { shellStyle, shellClass, responsiveStyleEl } = resolveShell(style);
  return (
    <>
      {responsiveStyleEl}
      <section
        style={shellStyle}
        className={cn(
          "my-8 rounded-lg border bg-card p-12 text-center",
          shellClass,
        )}
      >
        <h1
          className="cms-builder-hero-title text-4xl font-bold tracking-tight"
          dangerouslySetInnerHTML={{ __html: renderInlineHtml(title) }}
        />
        <div
          className="cms-builder-hero-subtitle mt-4 text-lg [&_p]:my-1"
          dangerouslySetInnerHTML={{
            __html: renderInlineHtml(subtitle),
          }}
        />
      </section>
    </>
  );
}

export function RawHtmlStatic({ html, style }: RawHtmlProps) {
  const { shellStyle, shellClass, responsiveStyleEl } = resolveShell(style);
  const safeHtml = sanitizeCmsHtml(html ?? "");
  if (Object.keys(shellStyle).length === 0 && !shellClass) {
    return <div dangerouslySetInnerHTML={{ __html: safeHtml }} />;
  }
  return (
    <>
      {responsiveStyleEl}
      <div
        style={shellStyle}
        className={shellClass || undefined}
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    </>
  );
}

export function VideoStatic({
  src,
  provider,
  width,
  height,
  alignment,
  style,
}: VideoProps) {
  const { shellStyle, shellClass, responsiveStyleEl } = resolveShell(style);
  return (
    <>
      {responsiveStyleEl}
      <VideoEmbed
        src={src}
        provider={provider}
        width={width}
        height={height}
        alignment={alignment}
        style={shellStyle}
        className={cn("my-4", shellClass)}
      />
    </>
  );
}
