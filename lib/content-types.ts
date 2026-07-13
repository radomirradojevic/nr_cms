import type { TranslationKey } from "@/lib/i18n/keys";

export const CMS_CONTENT_TYPES = [
  "page",
  "blog_post",
  "hero_slider",
  "webshop",
] as const;

export type ContentType = (typeof CMS_CONTENT_TYPES)[number];

export const CONTENT_CATEGORY_TYPES = ["page", "blog_post", "webshop"] as const;

export type ContentCategoryType = (typeof CONTENT_CATEGORY_TYPES)[number];

export const WEBSHOP_SYSTEM_CATEGORY_NAME = "Webshop";

export function isContentType(value: unknown): value is ContentType {
  return (
    typeof value === "string" &&
    (CMS_CONTENT_TYPES as readonly string[]).includes(value)
  );
}

export function categoryTypeForContentType(
  contentType: ContentType,
): ContentCategoryType {
  if (contentType === "blog_post") return "blog_post";
  if (contentType === "webshop") return "webshop";
  return "page";
}

export function getContentTypeLabel(contentType: ContentType): string {
  switch (contentType) {
    case "page":
      return "Page";
    case "blog_post":
      return "Blog post";
    case "hero_slider":
      return "Hero Slider";
    case "webshop":
      return "Webshop";
  }
}

export function getContentTypeLabelKey(
  contentType: ContentType,
): TranslationKey {
  return `dashboard.content.type.${contentType}` as TranslationKey;
}

export function getContentTypeDescriptionKey(
  contentType: ContentType,
): TranslationKey {
  return `dashboard.content.typeDescription.${contentType}` as TranslationKey;
}
