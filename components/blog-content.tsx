import { getGalleryByIdPublic } from "@/data/galleries";
import { getPublishedFormById } from "@/data/forms";
import { getFormForSubmissions } from "@/data/form-submissions";
import {
  BlogContentEmbeds,
  type BlogFormEmbed,
  type BlogFormSubmissionsEmbed,
  type BlogGalleryEmbed,
} from "@/components/blog-content-embeds";
import { BlogCodeCopyButtons } from "@/components/blog-code-copy-buttons";
import { sanitizeTiptapHtml } from "@/app/dashboard/content/_editors/sanitize-tiptap-html";

type Props = {
  html: string;
  className?: string;
};

function hashHtml(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return `blog-content-${hash.toString(36)}`;
}

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

/**
 * Renders blog post HTML produced by the TipTap editor and hydrates
 * embedded gallery, form, and form-submissions placeholders into real
 * React renderers.
 */
export async function BlogContent({ html, className }: Props) {
  const safeHtml = sanitizeTiptapHtml(html ?? "");
  const scopeId = hashHtml(safeHtml);

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
      <>
        <article
          data-blog-content-root={scopeId}
          className={className}
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
        <BlogCodeCopyButtons scopeId={scopeId} />
      </>
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
  const galleries: BlogGalleryEmbed[] = galleryEntries
    .filter(
      (entry): entry is readonly [string, NonNullable<(typeof entry)[1]>] =>
        Boolean(entry[1]),
    )
    .map(([id, gallery]) => ({
      id,
      name: gallery.name,
      images: gallery.images.map((img) => ({
        id: img.fileId,
        src: `/api/files/${img.fileId}`,
        alt: img.file.alt ?? img.file.title ?? img.file.filename,
      })),
    }));
  const forms: BlogFormEmbed[] = formEntries.map(([id, detail]) => ({
    id,
    detail,
  }));
  const formSubmissions: BlogFormSubmissionsEmbed[] = formSubmissionEntries.map(
    ([id, detail]) => ({
      id,
      fields: detail?.fields ?? null,
    }),
  );

  return (
    <>
      <article
        data-blog-content-root={scopeId}
        className={className}
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
      <BlogCodeCopyButtons scopeId={scopeId} />
      <BlogContentEmbeds
        scopeId={scopeId}
        galleries={galleries}
        forms={forms}
        formSubmissions={formSubmissions}
      />
    </>
  );
}
