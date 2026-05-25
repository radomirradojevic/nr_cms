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
  const gapClass =
    layoutGapOptions.find((option) => option.value === (gap ?? "md"))
      ?.className ?? "gap-6";
  return (
    <>
      {responsiveStyleEl}
      <section
        style={shellStyle}
        className={cn("cms-builder-layout my-6 grid", gapClass, shellClass)}
        data-layout-preset={layoutPreset.value}
      >
        {children}
      </section>
    </>
  );
}

export function HeadingStatic({ content, level, style }: HeadingProps) {
  const Tag = `h${level}` as "h1" | "h2" | "h3";
  const sizes = { "1": "text-4xl", "2": "text-3xl", "3": "text-2xl" } as const;
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
  style: blockStyle,
}: ImageProps) {
  const { shellStyle, shellClass, responsiveStyleEl } =
    resolveShell(blockStyle);

  if (!src) {
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
    if (mode === "fixed") {
      const wNum = parseInt(w.replace(/px$/i, ""), 10);
      const hNum = parseInt(h.replace(/px$/i, ""), 10);
      if (Number.isFinite(wNum) && wNum > 0) {
        legacy.width = `${wNum}px`;
        widthAttr = wNum;
      }
      if (Number.isFinite(hNum) && hNum > 0) {
        legacy.height = `${hNum}px`;
        heightAttr = hNum;
      }
      if (legacy.width && !legacy.height) legacy.height = "auto";
      if (legacy.height && !legacy.width) legacy.width = "auto";
      legacy.maxWidth = "100%";
    } else {
      const wPct = w.endsWith("%") ? w : w ? `${w}%` : "";
      const hPct = h.endsWith("%") ? h : h ? `${h}%` : "";
      if (wPct) legacy.width = wPct;
      if (hPct) legacy.height = hPct;
      if (legacy.width && !legacy.height) legacy.height = "auto";
      if (legacy.height && !legacy.width) legacy.width = "auto";
      if (!legacy.width && !legacy.height) legacy.maxWidth = "100%";
    }
  }

  const merged: CSSProperties = { ...legacy, ...shellStyle };

  return (
    <>
      {responsiveStyleEl}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={widthAttr}
        height={heightAttr}
        style={merged}
        className={cn("my-4 rounded", shellClass)}
      />
    </>
  );
}

export function ButtonStatic({ label, href, style }: ButtonProps) {
  const { shellStyle, shellClass, responsiveStyleEl } = resolveShell(style);
  return (
    <>
      {responsiveStyleEl}
      <a
        href={href || "#"}
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
          className="text-4xl font-bold tracking-tight"
          dangerouslySetInnerHTML={{ __html: renderInlineHtml(title) }}
        />
        <div
          className="mt-4 text-lg text-muted-foreground [&_p]:my-1"
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
  if (Object.keys(shellStyle).length === 0 && !shellClass) {
    return <div dangerouslySetInnerHTML={{ __html: html ?? "" }} />;
  }
  return (
    <>
      {responsiveStyleEl}
      <div
        style={shellStyle}
        className={shellClass || undefined}
        dangerouslySetInnerHTML={{ __html: html ?? "" }}
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
