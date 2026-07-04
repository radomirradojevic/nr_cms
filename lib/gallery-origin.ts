export type GalleryOrigin = "manual" | "webshop";

export type GalleryOriginMetadata = {
  locked?: boolean;
  origin?: string | null;
  originId?: string | null;
  originType?: string | null;
};

export function isWebshopGalleryOrigin(
  gallery: GalleryOriginMetadata,
): boolean {
  return gallery.origin === "webshop";
}

export function isLockedGallery(gallery: GalleryOriginMetadata): boolean {
  return Boolean(gallery.locked) || isWebshopGalleryOrigin(gallery);
}

export function canMutateGalleryFromManager(
  gallery: GalleryOriginMetadata,
): boolean {
  return !isLockedGallery(gallery);
}

export function getWebshopGalleryProductHref(
  gallery: GalleryOriginMetadata,
): string | null {
  if (
    gallery.origin !== "webshop" ||
    gallery.originType !== "product" ||
    !gallery.originId
  ) {
    return null;
  }
  return `/dashboard/webshop/products/${gallery.originId}?tab=media`;
}

export function getGalleryManagerHref(
  gallery: GalleryOriginMetadata & { id: string },
): string {
  return (
    getWebshopGalleryProductHref(gallery) ??
    `/dashboard/gallerymanager/${gallery.id}`
  );
}
