export const MAX_FILE_SIZE = 300 * 1024 * 1024; // 300 MB

export const ALLOWED_MIME = {
  image: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ],
  video: ["video/mp4", "video/webm", "video/quicktime"],
  document: [
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
} as const;

export type FileKind = "image" | "video" | "document";

export const ALL_ALLOWED_MIMES: string[] = [
  ...ALLOWED_MIME.image,
  ...ALLOWED_MIME.video,
  ...ALLOWED_MIME.document,
];

export function kindFromMime(mime: string): FileKind | null {
  if ((ALLOWED_MIME.image as readonly string[]).includes(mime)) return "image";
  if ((ALLOWED_MIME.video as readonly string[]).includes(mime)) return "video";
  if ((ALLOWED_MIME.document as readonly string[]).includes(mime))
    return "document";
  return null;
}

export function isMimeAllowed(mime: string): boolean {
  return ALL_ALLOWED_MIMES.includes(mime);
}

export function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "application/pdf": "pdf",
    "text/plain": "txt",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  };
  return map[mime] ?? "bin";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function sanitizeFilename(name: string): string {
  // strip path components
  const base = name.replace(/^.*[\\/]/, "");
  // replace unsafe characters
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_");
  return cleaned.slice(0, 200) || "file";
}
