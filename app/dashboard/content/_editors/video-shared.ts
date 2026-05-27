import { sanitizeMediaSrc } from "@/lib/url-safety";

export type VideoProvider = "youtube" | "file";
export type VideoAlignment = "left" | "center" | "right";

export type VideoConfig = {
  src: string;
  provider: VideoProvider;
  width?: string | null;
  height?: string | null;
  alignment?: VideoAlignment | null;
};

export function normalizeVideoSize(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const v = String(value).trim();
  if (!v) return null;
  // Allow bare numbers (interpreted as px) or any CSS length/percent.
  if (/^\d+(\.\d+)?$/.test(v)) return `${v}px`;
  return v;
}

export function normalizeVideoAlignment(value: unknown): VideoAlignment {
  return value === "left" || value === "right" || value === "center"
    ? value
    : "center";
}

export function normalizeVideoProvider(value: unknown): VideoProvider {
  return value === "youtube" ? "youtube" : "file";
}

export function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return isSafeYouTubeId(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v") ?? "";
        return isSafeYouTubeId(id) ? id : null;
      }
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "v") {
        const id = parts[1] ?? "";
        return isSafeYouTubeId(id) ? id : null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function isSafeYouTubeId(value: string): boolean {
  return /^[a-zA-Z0-9_-]{6,64}$/.test(value);
}

export function youTubeEmbedUrl(id: string): string {
  return `https://www.youtube.com/embed/${id}`;
}

export function resolveVideoEmbed(config: VideoConfig) {
  const provider = normalizeVideoProvider(config.provider);
  const src = config.src ?? "";
  const width = normalizeVideoSize(config.width);
  const height = normalizeVideoSize(config.height);
  const alignment = normalizeVideoAlignment(config.alignment);
  const alignmentClass: Record<VideoAlignment, string> = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  };
  const wrapperClass = `tiptap-video tiptap-video-${provider} flex ${alignmentClass[alignment]}`;
  const wrapperData = {
    ...(width ? { "data-width": width } : {}),
    ...(height ? { "data-height": height } : {}),
    "data-alignment": alignment,
  };

  if (provider === "youtube") {
    const youtubeId = extractYouTubeId(src);
    const safeSrc = youtubeId ? youTubeEmbedUrl(youtubeId) : "";
    return {
      provider,
      src: safeSrc,
      width,
      height,
      alignment,
      wrapperClass,
      wrapperData,
      frameStyle: [
        "position:relative",
        `width:${width ?? "100%"}`,
        height ? `height:${height}` : "aspect-ratio:16/9",
        "max-width:100%",
        "background:#000",
      ].join(";"),
      iframeStyle: "position:absolute;inset:0;width:100%;height:100%;border:0;",
      videoStyle: null,
    };
  }

  const safeSrc = sanitizeMediaSrc(src);
  return {
    provider,
    src: safeSrc,
    width,
    height,
    alignment,
    wrapperClass,
    wrapperData,
    frameStyle: [`width:${width ?? "100%"}`, "max-width:100%"].join(";"),
    iframeStyle: null,
    videoStyle: [
      "width:100%",
      height ? `height:${height}` : "height:auto",
      "display:block",
    ].join(";"),
  };
}
