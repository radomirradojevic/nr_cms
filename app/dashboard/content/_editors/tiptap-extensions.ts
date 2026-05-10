import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import { Video } from "./video-extension";

const ImageWithSize = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("width"),
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute("height"),
        renderHTML: (attributes) => {
          if (!attributes.height) return {};
          return { height: attributes.height };
        },
      },
    };
  },
});

export const tiptapExtensions = [
  StarterKit.configure({
    link: { openOnClick: false, autolink: true },
  }),
  ImageWithSize,
  Video,
  Typography,
  Placeholder.configure({ placeholder: "Write your blog post…" }),
];

export const emptyTiptapJson = {
  type: "doc",
  content: [{ type: "paragraph" }],
};
