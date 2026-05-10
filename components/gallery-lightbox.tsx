"use client";

import { useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type LightboxImage = { src: string; alt: string };

type Props = {
  images: LightboxImage[];
  currentIndex: number;
  onClose: () => void;
  onChangeIndex: (next: number) => void;
};

/**
 * Fullscreen lightbox overlay.
 *
 * - Dark backdrop, click outside the image closes.
 * - Prev/Next buttons (wrap-around).
 * - Keyboard: Escape, ArrowLeft, ArrowRight.
 * - Locks document body scroll while open.
 */
export function GalleryLightbox({
  images,
  currentIndex,
  onClose,
  onChangeIndex,
}: Props) {
  const total = images.length;
  const safeIndex = ((currentIndex % total) + total) % total;
  const current = images[safeIndex];

  const goPrev = useCallback(() => {
    onChangeIndex((safeIndex - 1 + total) % total);
  }, [onChangeIndex, safeIndex, total]);

  const goNext = useCallback(() => {
    onChangeIndex((safeIndex + 1) % total);
  }, [onChangeIndex, safeIndex, total]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!current) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm",
        "animate-in fade-in duration-200",
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className={cn(
          "absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white",
          "hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50",
        )}
      >
        <X className="h-5 w-5" />
      </button>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous image"
            className={cn(
              "absolute left-2 sm:left-4 z-10 rounded-full bg-white/10 p-2 text-white",
              "hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50",
            )}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next image"
            className={cn(
              "absolute right-2 sm:right-4 z-10 rounded-full bg-white/10 p-2 text-white",
              "hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50",
            )}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <figure
        key={safeIndex}
        className={cn(
          "flex flex-col items-center gap-3 px-4",
          "animate-in fade-in zoom-in-95 duration-200",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.src}
          alt={current.alt}
          className="max-h-[85vh] max-w-[92vw] object-contain rounded-md shadow-2xl"
        />
        {(current.alt || total > 1) && (
          <figcaption className="flex items-center gap-3 text-sm text-white/80">
            {current.alt && <span className="line-clamp-2">{current.alt}</span>}
            {total > 1 && (
              <span className="text-white/60">
                {safeIndex + 1} / {total}
              </span>
            )}
          </figcaption>
        )}
      </figure>
    </div>
  );
}
