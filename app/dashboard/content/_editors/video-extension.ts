import { Node, mergeAttributes } from "@tiptap/core";
import {
  normalizeVideoAlignment,
  resolveVideoEmbed,
  type VideoAlignment,
  type VideoProvider,
} from "./video-shared";

export type { VideoAlignment, VideoProvider } from "./video-shared";

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
          normalizeVideoAlignment(el.getAttribute("data-alignment")),
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
    const embed = resolveVideoEmbed({
      provider:
        (node.attrs.provider as VideoProvider) ??
        (HTMLAttributes.provider as VideoProvider) ??
        "file",
      src: (node.attrs.src as string) ?? (HTMLAttributes.src as string) ?? "",
      width: node.attrs.width ?? (HTMLAttributes.width as string),
      height: node.attrs.height ?? (HTMLAttributes.height as string),
      alignment: node.attrs.alignment ?? (HTMLAttributes.alignment as string),
    });

    if (embed.provider === "youtube") {
      return [
        "div",
        {
          class: embed.wrapperClass,
          ...embed.wrapperData,
        },
        [
          "div",
          { class: "tiptap-video-frame", style: embed.frameStyle },
          [
            "iframe",
            mergeAttributes(this.options.HTMLAttributes, {
              src: embed.src,
              "data-video-provider": "youtube",
              frameborder: "0",
              allow:
                "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
              allowfullscreen: "true",
              style: embed.iframeStyle,
            }),
          ],
        ],
      ];
    }

    return [
      "div",
      {
        class: embed.wrapperClass,
        ...embed.wrapperData,
      },
      [
        "div",
        { class: "tiptap-video-frame", style: embed.frameStyle },
        [
          "video",
          mergeAttributes(this.options.HTMLAttributes, {
            src: embed.src,
            "data-video-provider": "file",
            controls: "true",
            style: embed.videoStyle,
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
