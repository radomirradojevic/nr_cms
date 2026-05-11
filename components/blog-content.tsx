import { Fragment } from "react";
import { getGalleryByIdPublic } from "@/data/galleries";
import { getPublishedFormById, type FormDetail } from "@/data/forms";
import { GalleryGrid, type GalleryGridImage } from "@/components/gallery-grid";
import { CmsFormRenderer } from "@/components/cms-form-renderer";

type Props = {
  html: string;
  className?: string;
};

const GALLERY_OPEN_RE =
  /<div\b[^>]*\bdata-gallery-id="([0-9a-fA-F-]{36})"[^>]*>/g;
const FORM_OPEN_RE =
  /<div\b[^>]*\bdata-cms-form-id="([0-9a-fA-F-]{36})"[^>]*>/g;
const DIV_TAG_RE = /<(\/?)div\b[^>]*>/g;

type EmbedMatch = {
  kind: "gallery" | "form";
  fullMatch: string;
  id: string;
  index: number;
};

function findEmbedBlocks(
  html: string,
  openRe: RegExp,
  kind: "gallery" | "form",
): EmbedMatch[] {
  const matches: EmbedMatch[] = [];
  openRe.lastIndex = 0;
  let open: RegExpExecArray | null;
  while ((open = openRe.exec(html))) {
    const start = open.index;
    const id = open[1];
    let depth = 1;
    DIV_TAG_RE.lastIndex = openRe.lastIndex;
    let tag: RegExpExecArray | null;
    while ((tag = DIV_TAG_RE.exec(html))) {
      if (tag[1] === "/") {
        depth--;
        if (depth === 0) {
          const end = tag.index + tag[0].length;
          matches.push({
            kind,
            fullMatch: html.slice(start, end),
            id,
            index: start,
          });
          openRe.lastIndex = end;
          break;
        }
      } else {
        depth++;
      }
    }
    if (depth !== 0) break;
  }
  return matches;
}

/**
 * Renders blog post HTML produced by the TipTap editor and hydrates
 * embedded `<div data-gallery-id="…">` and `<div data-cms-form-id="…">`
 * placeholders into real gallery grids and form renderers.
 */
export async function BlogContent({ html, className }: Props) {
  const safeHtml = html ?? "";

  const galleryMatches = findEmbedBlocks(safeHtml, GALLERY_OPEN_RE, "gallery");
  const formMatches = findEmbedBlocks(safeHtml, FORM_OPEN_RE, "form");
  const matches = [...galleryMatches, ...formMatches].sort(
    (a, b) => a.index - b.index,
  );

  if (matches.length === 0) {
    return (
      <article
        className={className}
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    );
  }

  const uniqueGalleryIds = Array.from(new Set(galleryMatches.map((x) => x.id)));
  const uniqueFormIds = Array.from(new Set(formMatches.map((x) => x.id)));

  const [galleryEntries, formEntries] = await Promise.all([
    Promise.all(
      uniqueGalleryIds.map(
        async (id) => [id, await getGalleryByIdPublic(id)] as const,
      ),
    ),
    Promise.all(
      uniqueFormIds.map(
        async (id) => [id, await getPublishedFormById(id)] as const,
      ),
    ),
  ]);
  const galleryById = new Map(galleryEntries);
  const formById = new Map<string, FormDetail | null>(formEntries);

  type Segment =
    | { type: "html"; value: string }
    | { type: "gallery"; id: string; key: string }
    | { type: "form"; id: string; key: string };
  const out: Segment[] = [];

  let cursor = 0;
  matches.forEach((match, idx) => {
    if (match.index > cursor) {
      out.push({ type: "html", value: safeHtml.slice(cursor, match.index) });
    }
    if (match.kind === "gallery") {
      out.push({
        type: "gallery",
        id: match.id,
        key: `gal-${idx}-${match.id}`,
      });
    } else {
      out.push({
        type: "form",
        id: match.id,
        key: `form-${idx}-${match.id}`,
      });
    }
    cursor = match.index + match.fullMatch.length;
  });
  if (cursor < safeHtml.length) {
    out.push({ type: "html", value: safeHtml.slice(cursor) });
  }

  return (
    <article className={className}>
      {out.map((seg, idx) => {
        if (seg.type === "html") {
          return (
            <div
              key={`h-${idx}`}
              dangerouslySetInnerHTML={{ __html: seg.value }}
            />
          );
        }
        if (seg.type === "gallery") {
          const gallery = galleryById.get(seg.id) ?? null;
          if (!gallery) {
            return (
              <div
                key={seg.key}
                className="my-4 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground"
              >
                Gallery is unavailable.
              </div>
            );
          }
          const images: GalleryGridImage[] = gallery.images.map((img) => ({
            id: img.fileId,
            src: `/api/files/${img.fileId}`,
            alt: img.file.alt ?? img.file.title ?? img.file.filename,
          }));
          return (
            <Fragment key={seg.key}>
              <GalleryGrid images={images} galleryName={gallery.name} />
            </Fragment>
          );
        }
        const detail = formById.get(seg.id) ?? null;
        if (!detail) {
          return (
            <div
              key={seg.key}
              className="my-4 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground"
            >
              Form is unavailable.
            </div>
          );
        }
        return (
          <Fragment key={seg.key}>
            <CmsFormRenderer form={detail} />
          </Fragment>
        );
      })}
    </article>
  );
}
