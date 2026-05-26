const SAFE_DATA_IMAGE_RE =
  /^data:image\/(?:gif|png|jpeg|jpg|webp);base64,[a-z0-9+/=\s]+$/i;

function cleanUrlInput(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim()
    : "";
}

function hasUnsafeUrlChars(value: string): boolean {
  return /[\s<>"']/.test(value);
}

function isRelativePath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
}

function isFragment(value: string): boolean {
  return value.startsWith("#") && !hasUnsafeUrlChars(value);
}

function isSafeAbsoluteUrl(value: string, protocols: readonly string[]) {
  try {
    const url = new URL(value);
    return protocols.includes(url.protocol) && !hasUnsafeUrlChars(value);
  } catch {
    return false;
  }
}

export function sanitizeHref(value: unknown, fallback = "#"): string {
  const url = cleanUrlInput(value);
  if (!url) return fallback;
  if (isRelativePath(url) || isFragment(url)) return url;
  if (isSafeAbsoluteUrl(url, ["http:", "https:", "mailto:", "tel:"])) {
    return url;
  }
  return fallback;
}

export function sanitizeMediaSrc(
  value: unknown,
  options: { allowDataImages?: boolean } = {},
): string {
  const url = cleanUrlInput(value);
  if (!url) return "";
  if (isRelativePath(url)) return url;
  if (isSafeAbsoluteUrl(url, ["http:", "https:"])) return url;
  if (options.allowDataImages && SAFE_DATA_IMAGE_RE.test(url)) {
    return url.replace(/\s+/g, "");
  }
  return "";
}

export function sanitizeCssUrl(value: unknown): string | null {
  const url = sanitizeMediaSrc(value, { allowDataImages: true });
  if (!url) return null;
  return url
    .replace(/\\/g, "%5C")
    .replace(/"/g, "%22")
    .replace(/[\n\r\f]/g, "");
}

export function isSafeCssValue(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "string") return true;
  const normalized = value.trim();
  if (!normalized) return true;
  if (/^url\("[^"<>{};\\\n\r]*"\)$/i.test(normalized)) return true;
  if (/[<>{};]/.test(normalized)) return false;
  if (/\/\*|\*\/|@import|expression\s*\(|url\s*\(/i.test(normalized)) {
    return false;
  }
  if (/javascript:|vbscript:|data:text\/html/i.test(normalized)) return false;
  return true;
}
