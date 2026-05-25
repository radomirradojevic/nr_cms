import sanitizeHtml, { type IOptions } from "sanitize-html";

const SAFE_URI_PATTERN =
  /^(?:(?:https?|mailto|tel):|\/(?!\/)|#|data:image\/(?:gif|png|jpeg|webp|svg\+xml);base64,)/i;

const ALLOWED_DATA_ATTRIBUTES = [
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
];

function isSafeYouTubeEmbed(value: string | undefined): boolean {
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

const tiptapOptions: IOptions = {
  allowedTags: [
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
  allowedAttributes: {
    "*": [
      "class",
      "style",
      "title",
      "width",
      "height",
      ...ALLOWED_DATA_ATTRIBUTES,
    ],
    a: ["href", "target", "rel"],
    col: ["span", "width"],
    iframe: [
      "allow",
      "allowfullscreen",
      "frameborder",
      "height",
      "loading",
      "src",
      "title",
      "width",
      "data-video-provider",
    ],
    img: ["alt", "height", "loading", "src", "width"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
    video: ["controls", "height", "src", "width", "data-video-provider"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel", "data"],
  allowedSchemesByTag: {
    iframe: ["https"],
    img: ["http", "https", "data"],
    video: ["http", "https"],
  },
  allowProtocolRelative: false,
  allowedStyles: {
    "*": {
      "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgba?\([^)]+\)$/i],
      color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([^)]+\)$/i],
      height: [/^\d+(?:\.\d+)?(?:px|em|rem|%)$/i],
      "margin-left": [/^\d+(?:\.\d+)?(?:px|em|rem|%)$/i],
      "text-align": [/^(?:left|right|center|justify)$/i],
      width: [/^\d+(?:\.\d+)?(?:px|em|rem|%)$/i],
    },
  },
  transformTags: {
    a: (_tagName, attribs) => ({
      tagName: "a",
      attribs: {
        ...attribs,
        rel: "noopener noreferrer",
      },
    }),
    iframe: (_tagName, attribs) => ({
      tagName: "iframe",
      attribs: {
        ...attribs,
        "data-video-provider": "youtube",
        frameborder: "0",
        allow:
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
        allowfullscreen: "true",
      },
    }),
    video: (_tagName, attribs) => ({
      tagName: "video",
      attribs:
        attribs["data-video-provider"] === "file"
          ? { ...attribs, controls: "true" }
          : attribs,
    }),
  },
  exclusiveFilter(frame) {
    if (frame.tag === "iframe") {
      return !isSafeYouTubeEmbed(frame.attribs.src);
    }

    for (const value of Object.values(frame.attribs)) {
      if (typeof value === "string" && !SAFE_URI_PATTERN.test(value)) {
        continue;
      }
    }

    return false;
  },
};

const svgOptions: IOptions = {
  allowedTags: [
    "a",
    "circle",
    "clipPath",
    "defs",
    "desc",
    "ellipse",
    "feBlend",
    "feColorMatrix",
    "feComposite",
    "feDropShadow",
    "feFlood",
    "feGaussianBlur",
    "feMerge",
    "feMergeNode",
    "feOffset",
    "filter",
    "g",
    "line",
    "linearGradient",
    "marker",
    "mask",
    "metadata",
    "path",
    "pattern",
    "polygon",
    "polyline",
    "radialGradient",
    "rect",
    "stop",
    "svg",
    "symbol",
    "text",
    "title",
    "tspan",
    "use",
  ],
  allowedAttributes: {
    "*": [
      "aria-hidden",
      "class",
      "clip-path",
      "clip-rule",
      "cx",
      "cy",
      "d",
      "dx",
      "dy",
      "fill",
      "fill-opacity",
      "fill-rule",
      "filter",
      "font-family",
      "font-size",
      "fx",
      "fy",
      "gradientTransform",
      "gradientUnits",
      "height",
      "href",
      "id",
      "marker-end",
      "marker-mid",
      "marker-start",
      "mask",
      "offset",
      "opacity",
      "points",
      "preserveAspectRatio",
      "r",
      "rx",
      "ry",
      "spreadMethod",
      "stroke",
      "stroke-dasharray",
      "stroke-linecap",
      "stroke-linejoin",
      "stroke-miterlimit",
      "stroke-opacity",
      "stroke-width",
      "style",
      "text-anchor",
      "transform",
      "version",
      "viewBox",
      "width",
      "x",
      "x1",
      "x2",
      "xlink:href",
      "xmlns",
      "xmlns:xlink",
      "y",
      "y1",
      "y2",
    ],
  },
  allowedSchemes: ["http", "https", "data"],
  allowProtocolRelative: false,
  parser: {
    lowerCaseAttributeNames: false,
    lowerCaseTags: false,
  },
};

export function sanitizeTiptapHtml(html: string): string {
  return sanitizeHtml(html, tiptapOptions);
}

export function sanitizeSvgMarkup(svg: string): string {
  return sanitizeHtml(svg, svgOptions);
}
