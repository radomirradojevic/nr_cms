import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    gallery: {
      setGallery: (options: {
        galleryId: string;
        galleryName?: string | null;
      }) => ReturnType;
    };
  }
}

/**
 * TipTap node representing an embedded gallery.
 *
 * The node renders to a stable placeholder element that the public-facing
 * blog post renderer (see `components/blog-content.tsx`) hydrates with a
 * real `<GalleryGrid>` (thumbnails + lightbox).
 *
 * Inside the editor itself, a React NodeView renders an editor-safe visual
 * preview. The saved HTML remains this stable placeholder for public hydration.
 */
export const GalleryNode = Node.create({
  name: "gallery",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      galleryId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-gallery-id"),
        renderHTML: (attributes) => {
          if (!attributes.galleryId) return {};
          return { "data-gallery-id": attributes.galleryId };
        },
      },
      galleryName: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-gallery-name") ?? "",
        renderHTML: (attributes) => {
          if (!attributes.galleryName) return {};
          return { "data-gallery-name": attributes.galleryName };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-gallery-id]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const name = (node.attrs.galleryName as string | null) ?? "";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: "tiptap-gallery",
      }),
      [
        "div",
        {
          class:
            "tiptap-gallery-placeholder my-4 rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 p-4 text-center text-sm text-muted-foreground",
        },
        `Gallery: ${name || "(untitled)"}`,
      ],
    ];
  },

  addCommands() {
    return {
      setGallery:
        ({ galleryId, galleryName }) =>
        ({ commands }) => {
          if (!galleryId) return false;
          return commands.insertContent({
            type: this.name,
            attrs: {
              galleryId,
              galleryName: galleryName ?? "",
            },
          });
        },
    };
  },
});
