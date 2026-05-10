import type { ReactNode } from "react";
import { renderInlineHtml } from "../render-inline";
import type {
  ButtonProps,
  ColumnsProps,
  HeadingProps,
  HeroProps,
  ImageProps,
  RawHtmlProps,
  SectionProps,
  TextProps,
} from "./types";

/**
 * Pure JSX renderers for every block. These are imported by both the
 * RSC server renderer and the editor's static-preview overlay. They MUST NOT
 * import any client-only code (no Craft.js, no Tiptap React).
 */

const gapClass: Record<NonNullable<ColumnsProps["gap"]>, string> = {
  sm: "gap-3",
  md: "gap-6",
  lg: "gap-10",
};

export function RootStatic({ children }: { children?: ReactNode }) {
  return <div className="space-y-2">{children}</div>;
}

export function SectionStatic({
  padded,
  children,
}: SectionProps & { children?: ReactNode }) {
  return (
    <section className={padded ? "my-6 rounded-lg border bg-card p-6" : "my-4"}>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function ColumnsStatic({
  gap,
  children,
}: ColumnsProps & { children?: ReactNode }) {
  return (
    <div
      className={`my-6 grid grid-cols-1 md:grid-cols-2 ${gapClass[gap ?? "md"]}`}
    >
      {children}
    </div>
  );
}

export function HeadingStatic({ content, level }: HeadingProps) {
  const Tag = `h${level}` as "h1" | "h2" | "h3";
  const sizes = { "1": "text-4xl", "2": "text-3xl", "3": "text-2xl" } as const;
  return (
    <Tag
      className={`font-semibold tracking-tight my-4 ${sizes[level]}`}
      dangerouslySetInnerHTML={{ __html: renderInlineHtml(content) }}
    />
  );
}

export function TextStatic({ content }: TextProps) {
  return (
    <div
      className="my-3 leading-relaxed [&_p]:my-2 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
      dangerouslySetInnerHTML={{ __html: renderInlineHtml(content) }}
    />
  );
}

export function ImageStatic({ src, alt, sizing, width, height }: ImageProps) {
  if (!src) {
    return (
      <div className="my-4 p-8 border border-dashed text-center text-muted-foreground">
        Image placeholder — add a src
      </div>
    );
  }

  const w = (width ?? "").trim();
  const h = (height ?? "").trim();
  const mode = sizing ?? "responsive";

  // Build CSS styles + intrinsic width/height attributes so the browser
  // preserves the natural aspect ratio when only one dimension is given.
  const style: React.CSSProperties = {};
  let widthAttr: number | undefined;
  let heightAttr: number | undefined;

  if (mode === "fixed") {
    const wNum = parseInt(w.replace(/px$/i, ""), 10);
    const hNum = parseInt(h.replace(/px$/i, ""), 10);
    if (Number.isFinite(wNum) && wNum > 0) {
      style.width = `${wNum}px`;
      widthAttr = wNum;
    }
    if (Number.isFinite(hNum) && hNum > 0) {
      style.height = `${hNum}px`;
      heightAttr = hNum;
    }
    // If only one side was provided, let the other side stay auto so
    // the browser preserves the natural aspect ratio.
    if (style.width && !style.height) style.height = "auto";
    if (style.height && !style.width) style.width = "auto";
    style.maxWidth = "100%";
  } else {
    // responsive: percentage values
    const wPct = w.endsWith("%") ? w : w ? `${w}%` : "";
    const hPct = h.endsWith("%") ? h : h ? `${h}%` : "";
    if (wPct) style.width = wPct;
    if (hPct) style.height = hPct;
    if (style.width && !style.height) style.height = "auto";
    if (style.height && !style.width) style.width = "auto";
    if (!style.width && !style.height) style.maxWidth = "100%";
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      width={widthAttr}
      height={heightAttr}
      style={style}
      className="my-4 rounded"
    />
  );
}

export function ButtonStatic({ label, href }: ButtonProps) {
  return (
    <a
      href={href || "#"}
      className="inline-block my-3 rounded bg-primary px-4 py-2 text-primary-foreground"
    >
      {label}
    </a>
  );
}

export function HeroStatic({ title, subtitle }: HeroProps) {
  return (
    <section className="my-8 rounded-lg border bg-card p-12 text-center">
      <h1
        className="text-4xl font-bold tracking-tight"
        dangerouslySetInnerHTML={{ __html: renderInlineHtml(title) }}
      />
      <div
        className="mt-4 text-lg text-muted-foreground [&_p]:my-1"
        dangerouslySetInnerHTML={{ __html: renderInlineHtml(subtitle) }}
      />
    </section>
  );
}

export function RawHtmlStatic({ html }: RawHtmlProps) {
  return <div dangerouslySetInnerHTML={{ __html: html ?? "" }} />;
}
