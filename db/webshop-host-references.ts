/**
 * Stable public-schema reference surface exposed to installed add-ons. This
 * module intentionally contains only host-owned relations, never Webshop
 * business tables.
 */
export {
  content,
  files,
  galleries,
  galleryImages,
  webshopAddonEntitlements,
} from "@/db/schema";
