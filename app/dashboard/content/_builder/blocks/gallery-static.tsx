import { getGalleryByIdPublic } from "@/data/galleries";
import { GalleryGrid, type GalleryGridImage } from "@/components/gallery-grid";
import type { GalleryProps } from "./types";
import {
  applyBlockStyle,
  buildResponsiveCss,
  styleHash,
} from "./style/serialize";
import { cn } from "@/lib/utils";

/**
 * Server-side renderer for the Gallery page-builder block. Fetches the
 * referenced gallery on demand and renders a responsive thumbnail grid
 * with lightbox (`<GalleryGrid>`).
 *
 * Lives in its own file so the async server component is never imported
 * by the editor's client-side bundle (`blocks/editable.tsx`).
 */
export async function GalleryStatic({
  galleryId,
  galleryName,
  style,
}: GalleryProps) {
  const { style: cssStyle, className } = applyBlockStyle(style);
  const scope = `bb-${styleHash(style ?? null)}`;
  const responsiveCss = buildResponsiveCss(style, scope);
  const wrapperClass = cn(className, responsiveCss ? scope : null);
  const hasStyle =
    Object.keys(cssStyle).length > 0 || !!wrapperClass || !!responsiveCss;

  const wrap = (node: React.ReactNode) =>
    hasStyle ? (
      <>
        {responsiveCss ? (
          <style dangerouslySetInnerHTML={{ __html: responsiveCss }} />
        ) : null}
        <div style={cssStyle} className={wrapperClass || undefined}>
          {node}
        </div>
      </>
    ) : (
      node
    );

  if (!galleryId) {
    return wrap(
      <div className="my-4 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
        Gallery placeholder — pick a gallery in the block settings.
      </div>,
    );
  }

  const gallery = await getGalleryByIdPublic(galleryId);
  if (!gallery) {
    return wrap(
      <div className="my-4 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
        Gallery not found{galleryName ? ` ("${galleryName}")` : ""}.
      </div>,
    );
  }

  const images: GalleryGridImage[] = gallery.images.map((img) => ({
    id: img.fileId,
    src: `/api/files/${img.fileId}`,
    alt: img.file.alt ?? img.file.title ?? img.file.filename ?? gallery.name,
  }));

  return wrap(<GalleryGrid images={images} galleryName={gallery.name} />);
}
