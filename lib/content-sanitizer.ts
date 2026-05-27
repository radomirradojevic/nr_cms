import sanitizeHtml, { type IOptions } from "sanitize-html";

const SAFE_URI_PATTERN = /^(?:(?:https?|mailto|tel):|\/(?!\/)|#)/i;

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

const CMS_ALLOWED_TAGS = [
  ...new Set([
    ...[
      "a",
      "abbr",
      "address",
      "article",
      "aside",
      "b",
      "blockquote",
      "br",
      "button",
      "caption",
      "cite",
      "code",
      "col",
      "colgroup",
      "dd",
      "details",
      "div",
      "dl",
      "dt",
      "em",
      "figcaption",
      "figure",
      "footer",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "header",
      "hr",
      "i",
      "iframe",
      "img",
      "li",
      "main",
      "nav",
      "ol",
      "p",
      "pre",
      "s",
      "section",
      "small",
      "span",
      "strong",
      "sub",
      "summary",
      "sup",
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
    ...[
      "circle",
      "clipPath",
      "defs",
      "desc",
      "ellipse",
      "g",
      "line",
      "linearGradient",
      "path",
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
  ]),
];

const CMS_ALLOWED_ATTRIBUTES: Record<string, sanitizeHtml.AllowedAttribute[]> =
  {
    "*": [
      "aria-hidden",
      "aria-label",
      "aria-labelledby",
      "class",
      "id",
      "style",
      "title",
      ...ALLOWED_DATA_ATTRIBUTES,
    ],
    a: ["href", "target", "rel", "title"],
    button: ["disabled", { name: "type", values: ["button"] }],
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
    svg: [
      "aria-hidden",
      "class",
      "fill",
      "height",
      "role",
      "stroke",
      "stroke-width",
      "viewBox",
      "width",
      "xmlns",
    ],
    use: ["href", "xlink:href"],
    path: [
      "d",
      "fill",
      "fill-opacity",
      "fill-rule",
      "stroke",
      "stroke-linecap",
      "stroke-linejoin",
      "stroke-width",
    ],
    circle: ["cx", "cy", "fill", "r", "stroke", "stroke-width"],
    ellipse: ["cx", "cy", "fill", "rx", "ry", "stroke", "stroke-width"],
    line: ["stroke", "stroke-linecap", "stroke-width", "x1", "x2", "y1", "y2"],
    polygon: ["fill", "points", "stroke", "stroke-width"],
    polyline: [
      "fill",
      "points",
      "stroke",
      "stroke-linecap",
      "stroke-linejoin",
      "stroke-width",
    ],
    rect: [
      "fill",
      "height",
      "rx",
      "ry",
      "stroke",
      "stroke-width",
      "width",
      "x",
      "y",
    ],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
    video: ["controls", "height", "src", "width", "data-video-provider"],
  };

const EDITOR_ARTIFACT_CLASSES = new Set([
  "ProseMirror",
  "ProseMirror-focused",
  "ProseMirror-separator",
  "ProseMirror-trailingBreak",
]);

function hasClass(className: string | undefined, target: string): boolean {
  return (className ?? "").split(/\s+/).filter(Boolean).includes(target);
}

function hasEditorArtifactClass(className: string | undefined): boolean {
  return (className ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .some((item) => EDITOR_ARTIFACT_CLASSES.has(item));
}

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

function hasUnsafeUrlAttribute(attribs: Record<string, string>): boolean {
  for (const [name, value] of Object.entries(attribs)) {
    if (!["href", "src", "xlink:href", "action"].includes(name)) continue;
    if (value && !SAFE_URI_PATTERN.test(value)) return true;
  }
  return false;
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
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: {
    iframe: ["https"],
    img: ["http", "https"],
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

    if (hasUnsafeUrlAttribute(frame.attribs)) return true;

    return false;
  },
};

const cmsHtmlOptions: IOptions = {
  ...tiptapOptions,
  allowedTags: CMS_ALLOWED_TAGS,
  allowedAttributes: CMS_ALLOWED_ATTRIBUTES,
  transformTags: {
    ...tiptapOptions.transformTags,
    button: (_tagName, attribs) => ({
      tagName: "button",
      attribs: { ...attribs, type: "button" },
    }),
  },
  exclusiveFilter(frame) {
    if (frame.tag === "iframe") {
      return !isSafeYouTubeEmbed(frame.attribs.src);
    }

    if (hasUnsafeUrlAttribute(frame.attribs)) return true;

    if (
      hasClass(frame.attribs.class, "ProseMirror-separator") ||
      hasClass(frame.attribs.class, "ProseMirror-trailingBreak")
    ) {
      return true;
    }

    if (
      hasClass(frame.attribs.class, "ProseMirror") ||
      hasClass(frame.attribs.class, "ProseMirror-focused") ||
      "data-footer-icon-wrapper" in frame.attribs
    ) {
      return "excludeTag";
    }

    if (
      frame.tag === "p" &&
      "data-placeholder" in frame.attribs &&
      hasClass(frame.attribs.class, "is-empty") &&
      frame.text.trim().length === 0
    ) {
      return true;
    }

    if (hasEditorArtifactClass(frame.attribs.class)) {
      return "excludeTag";
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
  allowedSchemes: ["http", "https"],
  allowProtocolRelative: false,
  parser: {
    lowerCaseAttributeNames: false,
    lowerCaseTags: false,
  },
};

export function sanitizeTiptapHtml(html: string): string {
  return sanitizeHtml(html, tiptapOptions);
}

export function sanitizeCmsHtml(html: string): string {
  return sanitizeHtml(html, cmsHtmlOptions);
}

export function sanitizeSvgMarkup(svg: string): string {
  return sanitizeHtml(svg, svgOptions);
}
