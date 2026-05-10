"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { GalleryLightbox, type LightboxImage } from "./gallery-lightbox";

export type GalleryGridImage = {
  id: string;
  src: string;
  alt: string;
};

type Props = {
  images: GalleryGridImage[];
  galleryName?: string;
  className?: string;
};

/**
 * Responsive thumbnail grid that opens a fullscreen lightbox when an
 * image is clicked. Used both inside the public-facing blog post renderer
 * and anywhere else a gallery preview is needed.
 */
export function GalleryGrid({ images, galleryName, className }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (images.length === 0) {
    return (
      <div className="my-4 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
        {galleryName
          ? `Gallery “${galleryName}” is empty.`
          : "Gallery is empty."}
      </div>
    );
  }

  const lightboxImages: LightboxImage[] = images.map((i) => ({
    src: i.src,
    alt: i.alt,
  }));

  return (
    <>
      <div
        className={cn(
          "not-prose my-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4",
          className,
        )}
        data-gallery-grid
      >
        {images.map((img, idx) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setActiveIndex(idx)}
            className={cn(
              "group relative aspect-square overflow-hidden rounded-md border bg-muted",
              "focus:outline-none focus:ring-2 focus:ring-primary",
            )}
            aria-label={img.alt || `Open image ${idx + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.src}
              alt={img.alt}
              loading="lazy"
              className={cn(
                "block m-0 h-full w-full object-cover transition-transform duration-300",
                "group-hover:scale-105",
              )}
            />
          </button>
        ))}
      </div>

      {activeIndex !== null && (
        <GalleryLightbox
          images={lightboxImages}
          currentIndex={activeIndex}
          onChangeIndex={setActiveIndex}
          onClose={() => setActiveIndex(null)}
        />
      )}
    </>
  );
}
