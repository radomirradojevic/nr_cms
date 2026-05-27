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
const YOUTUBE_VIDEO_BLOCK_RE =
  /(<div\b(?=[^>]*\bclass="[^"]*\btiptap-video-youtube\b[^"]*")[^>]*>\s*)(<div\b(?=[^>]*\bclass="[^"]*\btiptap-video-frame\b[^"]*")[^>]*>)([\s\S]*?<iframe\b(?=[^>]*\bdata-video-provider="youtube")[^>]*><\/iframe>[\s\S]*?)(<\/div>\s*<\/div>)/gi;
const YOUTUBE_IFRAME_OPEN_RE =
  /<iframe\b(?=[^>]*\bdata-video-provider="youtube")[^>]*>/i;
const SAFE_VIDEO_SIZE_RE = /^\d+(?:\.\d+)?(?:px|em|rem|%)$/i;
const FRONTEND_YOUTUBE_IFRAME_STYLE = [
  "position:absolute",
  "inset:0",
  "display:block",
  "width:100%",
  "height:100%",
  "border:0",
].join(";");

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

function readHtmlAttribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
  return match?.[1] ?? null;
}

function readSafeStyleValue(tag: string, property: string): string | null {
  const style = readHtmlAttribute(tag, "style");
  if (!style) return null;

  for (const declaration of style.split(";")) {
    const [rawName, ...rawValue] = declaration.split(":");
    if (!rawName || rawValue.length === 0) continue;
    if (rawName.trim().toLowerCase() !== property) continue;

    const value = rawValue.join(":").trim();
    return SAFE_VIDEO_SIZE_RE.test(value) ? value : null;
  }

  return null;
}

function withStyleAttribute(openingTag: string, style: string): string {
  if (/\sstyle="[^"]*"/i.test(openingTag)) {
    return openingTag.replace(/\sstyle="[^"]*"/i, ` style="${style}"`);
  }

  return openingTag.replace(/>$/, ` style="${style}">`);
}

function frontendYouTubeFrameStyle(width: string): string {
  return [
    "position:relative",
    "display:block",
    `width:${width}`,
    "max-width:100%",
    "height:auto",
    "aspect-ratio:16/9",
    "overflow:hidden",
    "background:#000",
  ].join(";");
}

function normalizeFrontendYouTubeEmbeds(html: string): string {
  return html.replace(
    YOUTUBE_VIDEO_BLOCK_RE,
    (
      _match: string,
      wrapperOpen: string,
      frameOpen: string,
      iframeHtml: string,
      closingTags: string,
    ) => {
      const width =
        readSafeStyleValue(frameOpen, "width") ??
        (SAFE_VIDEO_SIZE_RE.test(
          readHtmlAttribute(wrapperOpen, "data-width") ?? "",
        )
          ? readHtmlAttribute(wrapperOpen, "data-width")
          : null) ??
        "100%";
      const nextFrameOpen = withStyleAttribute(
        frameOpen,
        frontendYouTubeFrameStyle(width),
      );
      const nextIframeHtml = iframeHtml.replace(
        YOUTUBE_IFRAME_OPEN_RE,
        (tag: string) => withStyleAttribute(tag, FRONTEND_YOUTUBE_IFRAME_STYLE),
      );

      return `${wrapperOpen}${nextFrameOpen}${nextIframeHtml}${closingTags}`;
    },
  );
}

/**
 * Renders blog post HTML produced by the TipTap editor and hydrates
 * embedded gallery, form, and form-submissions placeholders into real
 * React renderers.
 */
export async function BlogContent({ html, className }: Props) {
  const safeHtml = normalizeFrontendYouTubeEmbeds(
    sanitizeTiptapHtml(html ?? ""),
  );
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
