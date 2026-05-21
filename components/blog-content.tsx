import { Fragment } from "react";
import { getGalleryByIdPublic } from "@/data/galleries";
import { getPublishedFormById, type FormDetail } from "@/data/forms";
import { getFormForSubmissions } from "@/data/form-submissions";
import { GalleryGrid, type GalleryGridImage } from "@/components/gallery-grid";
import { CmsFormRenderer } from "@/components/cms-form-renderer";
import { FormSubmissionsRenderer } from "@/app/dashboard/content/_builder/blocks/form-submissions/renderer";

type Props = {
  html: string;
  className?: string;
};

const GALLERY_OPEN_RE =
  /<div\b[^>]*\bdata-gallery-id="([0-9a-fA-F-]{36})"[^>]*>/g;
const FORM_OPEN_RE =
  /<div\b[^>]*\bdata-cms-form-id="([0-9a-fA-F-]{36})"[^>]*>/g;
const FORM_SUBMISSIONS_OPEN_RE =
  /<div\b[^>]*\bdata-cms-form-submissions-id="([0-9a-fA-F-]{36})"[^>]*>/g;
const DIV_TAG_RE = /<(\/?)div\b[^>]*>/g;

type EmbedMatch = {
  kind: "gallery" | "form" | "formSubmissions";
  fullMatch: string;
  openingTag: string;
  id: string;
  index: number;
};

function findEmbedBlocks(
  html: string,
  openRe: RegExp,
  kind: EmbedMatch["kind"],
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
            openingTag: open[0],
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

function attrValue(tag: string, name: string): string | null {
  const pattern = new RegExp(`\\b${name}="([^"]*)"`);
  return pattern.exec(tag)?.[1] ?? null;
}

function parseDisplayMode(value: string | null): "table" | "card" {
  return value === "card" ? "card" : "table";
}

function parsePageSize(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(100, Math.max(5, parsed));
}

function parseBoolean(value: string | null): boolean {
  return value !== "false";
}

/**
 * Renders blog post HTML produced by the TipTap editor and hydrates
 * embedded gallery, form, and form-submissions placeholders into real
 * React renderers.
 */
export async function BlogContent({ html, className }: Props) {
  const safeHtml = html ?? "";

  const galleryMatches = findEmbedBlocks(safeHtml, GALLERY_OPEN_RE, "gallery");
  const formMatches = findEmbedBlocks(safeHtml, FORM_OPEN_RE, "form");
  const formSubmissionMatches = findEmbedBlocks(
    safeHtml,
    FORM_SUBMISSIONS_OPEN_RE,
    "formSubmissions",
  );
  const matches = [
    ...galleryMatches,
    ...formMatches,
    ...formSubmissionMatches,
  ].sort((a, b) => a.index - b.index);

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
  const uniqueFormSubmissionIds = Array.from(
    new Set(formSubmissionMatches.map((x) => x.id)),
  );

  const [galleryEntries, formEntries, formSubmissionEntries] =
    await Promise.all([
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
      Promise.all(
        uniqueFormSubmissionIds.map(
          async (id) => [id, await getFormForSubmissions(id)] as const,
        ),
      ),
    ]);
  const galleryById = new Map(galleryEntries);
  const formById = new Map<string, FormDetail | null>(formEntries);
  const formSubmissionById = new Map(formSubmissionEntries);

  type Segment =
    | { type: "html"; value: string }
    | { type: "gallery"; id: string; key: string }
    | { type: "form"; id: string; key: string }
    | {
        type: "formSubmissions";
        id: string;
        key: string;
        displayMode: "table" | "card";
        pageSize: number;
        hideId: boolean;
      };
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
    } else if (match.kind === "form") {
      out.push({
        type: "form",
        id: match.id,
        key: `form-${idx}-${match.id}`,
      });
    } else {
      out.push({
        type: "formSubmissions",
        id: match.id,
        key: `form-submissions-${idx}-${match.id}`,
        displayMode: parseDisplayMode(
          attrValue(match.openingTag, "data-cms-form-submissions-display-mode"),
        ),
        pageSize: parsePageSize(
          attrValue(match.openingTag, "data-cms-form-submissions-page-size"),
        ),
        hideId: parseBoolean(
          attrValue(match.openingTag, "data-cms-form-submissions-hide-id"),
        ),
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
        if (seg.type === "formSubmissions") {
          const formData = formSubmissionById.get(seg.id) ?? null;
          if (!formData) {
            return (
              <div
                key={seg.key}
                className="my-4 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground"
              >
                Form submissions are unavailable.
              </div>
            );
          }
          return (
            <Fragment key={seg.key}>
              <div className="cms-embedded-form-submissions">
                <FormSubmissionsRenderer
                  formId={seg.id}
                  displayMode={seg.displayMode}
                  pageSize={seg.pageSize}
                  sortField="created_at"
                  sortOrder="desc"
                  hideId={seg.hideId}
                  fields={formData.fields}
                />
              </div>
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
