import { Fragment } from "react";
import { getGalleryByIdPublic } from "@/data/galleries";
import { GalleryGrid, type GalleryGridImage } from "@/components/gallery-grid";

type Props = {
  html: string;
  className?: string;
};

const GALLERY_OPEN_RE =
  /<div\b[^>]*\bdata-gallery-id="([0-9a-fA-F-]{36})"[^>]*>/g;
const DIV_TAG_RE = /<(\/?)div\b[^>]*>/g;

/**
 * Scan `html` for outer `<div data-gallery-id="…">…</div>` blocks, correctly
 * balancing nested `<div>` tags so the matcher consumes the full block (not
 * just the first inner `</div>`, which would leak a stray `</div>` into the
 * next HTML chunk and break hydration).
 */
function findGalleryBlocks(
  html: string,
): { fullMatch: string; galleryId: string; index: number }[] {
  const matches: { fullMatch: string; galleryId: string; index: number }[] = [];
  GALLERY_OPEN_RE.lastIndex = 0;
  let open: RegExpExecArray | null;
  while ((open = GALLERY_OPEN_RE.exec(html))) {
    const start = open.index;
    const galleryId = open[1];
    let depth = 1;
    DIV_TAG_RE.lastIndex = GALLERY_OPEN_RE.lastIndex;
    let tag: RegExpExecArray | null;
    while ((tag = DIV_TAG_RE.exec(html))) {
      if (tag[1] === "/") {
        depth--;
        if (depth === 0) {
          const end = tag.index + tag[0].length;
          matches.push({
            fullMatch: html.slice(start, end),
            galleryId,
            index: start,
          });
          GALLERY_OPEN_RE.lastIndex = end;
          break;
        }
      } else {
        depth++;
      }
    }
    if (depth !== 0) {
      // Unbalanced — bail to avoid an infinite loop.
      break;
    }
  }
  return matches;
}

/**
 * Renders blog post HTML produced by the TipTap editor and hydrates
 * embedded `<div data-gallery-id="...">` placeholders into real gallery
 * grids (with thumbnails + lightbox).
 *
 * Server component — fetches gallery data on the server during render.
 */
export async function BlogContent({ html, className }: Props) {
  const safeHtml = html ?? "";

  // Collect placeholders + their gallery ids (balanced-div matcher).
  const matches = findGalleryBlocks(safeHtml);

  // No galleries → render plain HTML.
  if (matches.length === 0) {
    return (
      <article
        className={className}
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    );
  }

  // Fetch gallery data in parallel; dedupe by id.
  const uniqueIds = Array.from(new Set(matches.map((x) => x.galleryId)));
  const fetched = await Promise.all(
    uniqueIds.map(async (id) => [id, await getGalleryByIdPublic(id)] as const),
  );
  const galleryById = new Map(fetched);

  // Walk segments: HTML chunk → GalleryGrid → HTML chunk → ...
  type Segment =
    | { type: "html"; value: string }
    | { type: "gallery"; id: string; key: string };
  const out: Segment[] = [];

  let cursor = 0;
  matches.forEach((match, idx) => {
    if (match.index > cursor) {
      out.push({ type: "html", value: safeHtml.slice(cursor, match.index) });
    }
    out.push({
      type: "gallery",
      id: match.galleryId,
      key: `gal-${idx}-${match.galleryId}`,
    });
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
      })}
    </article>
  );
}
