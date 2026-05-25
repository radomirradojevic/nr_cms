import DOMPurify from "isomorphic-dompurify";

const SAFE_URI_PATTERN =
  /^(?:(?:https?|mailto|tel):|\/(?!\/)|#|data:image\/(?:gif|png|jpeg|webp|svg\+xml);base64,)/i;

const ALLOWED_DATA_ATTRIBUTES = new Set([
  "data-alignment",
  "data-cms-form-id",
  "data-cms-form-name",
  "data-cms-form-submissions-display-mode",
  "data-cms-form-submissions-hide-id",
  "data-cms-form-submissions-hide-submitted",
  "data-cms-form-submissions-id",
  "data-cms-form-submissions-name",
  "data-cms-form-submissions-page-size",
  "data-gallery-id",
  "data-gallery-name",
  "data-indent",
  "data-layout",
  "data-video-provider",
  "data-width",
  "data-height",
]);

function isSafeYouTubeEmbed(value: string | null): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    return (
      url.protocol === "https:" &&
      (host === "youtube.com" || host === "youtube-nocookie.com") &&
      url.pathname.startsWith("/embed/")
    );
  } catch {
    return false;
  }
}

function hasUnsafeStyle(value: string | null): boolean {
  if (!value) return false;
  return /(?:expression\s*\(|javascript\s*:|behavior\s*:|-moz-binding|url\s*\()/i.test(
    value,
  );
}

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  const element = node as Element;
  if (typeof element.tagName !== "string") return;

  if (
    element.tagName === "IFRAME" &&
    !isSafeYouTubeEmbed(element.getAttribute("src"))
  ) {
    element.remove();
    return;
  }

  if (element.tagName === "IFRAME") {
    element.setAttribute("data-video-provider", "youtube");
    element.setAttribute("frameborder", "0");
    element.setAttribute(
      "allow",
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
    );
    element.setAttribute("allowfullscreen", "true");
  }

  if (
    element.tagName === "VIDEO" &&
    element.getAttribute("data-video-provider") === "file"
  ) {
    element.setAttribute("controls", "true");
  }

  if (hasUnsafeStyle(element.getAttribute("style"))) {
    element.removeAttribute("style");
  }

  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name.toLowerCase();
    if (name.startsWith("data-") && !ALLOWED_DATA_ATTRIBUTES.has(name)) {
      element.removeAttribute(attribute.name);
    }
  }

  if (element.tagName === "A") {
    element.setAttribute("rel", "noopener noreferrer");
  }
});

export function sanitizeTiptapHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "a",
      "blockquote",
      "br",
      "code",
      "col",
      "colgroup",
      "div",
      "em",
      "figcaption",
      "figure",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "hr",
      "iframe",
      "img",
      "li",
      "ol",
      "p",
      "pre",
      "s",
      "span",
      "strong",
      "table",
      "tbody",
      "td",
      "tfoot",
      "th",
      "thead",
      "tr",
      "u",
      "ul",
      "video",
    ],
    ALLOWED_ATTR: [
      "allow",
      "allowfullscreen",
      "alt",
      "class",
      "colspan",
      "controls",
      "data-alignment",
      "data-cms-form-id",
      "data-cms-form-name",
      "data-cms-form-submissions-display-mode",
      "data-cms-form-submissions-hide-id",
      "data-cms-form-submissions-hide-submitted",
      "data-cms-form-submissions-id",
      "data-cms-form-submissions-name",
      "data-cms-form-submissions-page-size",
      "data-gallery-id",
      "data-gallery-name",
      "data-indent",
      "data-layout",
      "data-video-provider",
      "data-width",
      "data-height",
      "frameborder",
      "height",
      "href",
      "loading",
      "rel",
      "rowspan",
      "src",
      "style",
      "target",
      "title",
      "width",
    ],
    ALLOW_DATA_ATTR: true,
    ALLOWED_URI_REGEXP: SAFE_URI_PATTERN,
    ADD_ATTR: [
      "allow",
      "allowfullscreen",
      "controls",
      "data-video-provider",
      "frameborder",
    ],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "srcdoc"],
    FORBID_TAGS: [
      "base",
      "button",
      "embed",
      "form",
      "input",
      "link",
      "meta",
      "object",
      "script",
      "style",
      "svg",
      "textarea",
    ],
  });
}
