import { Node, mergeAttributes } from "@tiptap/core";

export type VideoProvider = "youtube" | "file";
export type VideoAlignment = "left" | "center" | "right";

export interface VideoOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    video: {
      setVideo: (options: {
        src: string;
        provider: VideoProvider;
        width?: string | null;
        height?: string | null;
        alignment?: VideoAlignment | null;
      }) => ReturnType;
    };
  }
}

function normalizeSize(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const v = String(value).trim();
  if (!v) return null;
  // Allow bare numbers (interpreted as px) or any CSS length/percent.
  if (/^\d+(\.\d+)?$/.test(v)) return `${v}px`;
  return v;
}

function normalizeAlignment(value: unknown): VideoAlignment {
  return value === "left" || value === "right" || value === "center"
    ? value
    : "center";
}

export function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return id || null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "v") {
        return parts[1] ?? null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function youTubeEmbedUrl(id: string): string {
  return `https://www.youtube.com/embed/${id}`;
}

export const Video = Node.create<VideoOptions>({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: { default: null },
      provider: { default: "file" },
      width: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-width"),
        renderHTML: () => ({}),
      },
      height: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-height"),
        renderHTML: () => ({}),
      },
      alignment: {
        default: "center",
        parseHTML: (el) =>
          normalizeAlignment(el.getAttribute("data-alignment")),
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div.tiptap-video-youtube",
        getAttrs: (el) => {
          const node = el as HTMLElement;
          const iframe = node.querySelector("iframe");
          return {
            src: iframe?.getAttribute("src") ?? null,
            provider: "youtube",
            width: node.getAttribute("data-width"),
            height: node.getAttribute("data-height"),
            alignment: node.getAttribute("data-alignment"),
          };
        },
      },
      {
        tag: "div.tiptap-video-file",
        getAttrs: (el) => {
          const node = el as HTMLElement;
          const video = node.querySelector("video");
          return {
            src: video?.getAttribute("src") ?? null,
            provider: "file",
            width: node.getAttribute("data-width"),
            height: node.getAttribute("data-height"),
            alignment: node.getAttribute("data-alignment"),
          };
        },
      },
      {
        tag: "iframe[data-video-provider='youtube']",
        getAttrs: (el) => {
          const node = el as HTMLElement;
          return {
            src: node.getAttribute("src"),
            provider: "youtube",
            width: node.getAttribute("width"),
            height: node.getAttribute("height"),
            alignment: node.getAttribute("data-alignment"),
          };
        },
      },
      {
        tag: "video[data-video-provider='file']",
        getAttrs: (el) => {
          const node = el as HTMLElement;
          return {
            src: node.getAttribute("src"),
            provider: "file",
            width: node.getAttribute("width"),
            height: node.getAttribute("height"),
            alignment: node.getAttribute("data-alignment"),
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const provider =
      (node.attrs.provider as VideoProvider) ??
      (HTMLAttributes.provider as VideoProvider) ??
      "file";
    const src =
      (node.attrs.src as string) ?? (HTMLAttributes.src as string) ?? "";
    const width = normalizeSize(node.attrs.width ?? HTMLAttributes.width);
    const height = normalizeSize(node.attrs.height ?? HTMLAttributes.height);
    const alignment = normalizeAlignment(
      node.attrs.alignment ?? HTMLAttributes.alignment,
    );
    const alignmentClass: Record<VideoAlignment, string> = {
      left: "justify-start",
      center: "justify-center",
      right: "justify-end",
    };

    if (provider === "youtube") {
      const mediaStyle = [
        "position:relative",
        `width:${width ?? "100%"}`,
        height ? `height:${height}` : "aspect-ratio:16/9",
        "max-width:100%",
        "background:#000",
      ].join(";");
      return [
        "div",
        {
          class: `tiptap-video tiptap-video-youtube flex ${alignmentClass[alignment]}`,
          ...(width ? { "data-width": width } : {}),
          ...(height ? { "data-height": height } : {}),
          "data-alignment": alignment,
        },
        [
          "div",
          { class: "tiptap-video-frame", style: mediaStyle },
          [
            "iframe",
            mergeAttributes(this.options.HTMLAttributes, {
              src,
              "data-video-provider": "youtube",
              frameborder: "0",
              allow:
                "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
              allowfullscreen: "true",
              style:
                "position:absolute;inset:0;width:100%;height:100%;border:0;",
            }),
          ],
        ],
      ];
    }

    const mediaStyle = [`width:${width ?? "100%"}`, "max-width:100%"].join(";");
    const videoStyle = [
      "width:100%",
      height ? `height:${height}` : "height:auto",
      "display:block",
    ].join(";");
    return [
      "div",
      {
        class: `tiptap-video tiptap-video-file flex ${alignmentClass[alignment]}`,
        ...(width ? { "data-width": width } : {}),
        ...(height ? { "data-height": height } : {}),
        "data-alignment": alignment,
      },
      [
        "div",
        { class: "tiptap-video-frame", style: mediaStyle },
        [
          "video",
          mergeAttributes(this.options.HTMLAttributes, {
            src,
            "data-video-provider": "file",
            controls: "true",
            style: videoStyle,
          }),
        ],
      ],
    ];
  },

  addCommands() {
    return {
      setVideo:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
