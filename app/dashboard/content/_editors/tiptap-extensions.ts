import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import Typography from "@tiptap/extension-typography";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Video } from "./video-extension";
import { GalleryNode } from "./gallery-extension";
import { CmsFormNode } from "./form-extension";
import { CmsFormSubmissionsNode } from "./form-submissions-extension";
import { LayoutColumn, LayoutSection } from "./layout-extension";
import { lowlight } from "./code-languages";
import { CmsIndent } from "./indent-extension";

export const codeBlockOptions = {
  lowlight,
  defaultLanguage: null,
  enableTabIndentation: true,
  HTMLAttributes: {
    class: "cms-code-block",
  },
};

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
    codeBlock: false,
  }),
  TextStyle,
  Color,
  CodeBlockLowlight.configure(codeBlockOptions),
  CmsIndent,
  ImageWithSize,
  Video,
  GalleryNode,
  CmsFormNode,
  CmsFormSubmissionsNode,
  LayoutSection,
  LayoutColumn,
  TableKit.configure({
    table: {
      resizable: true,
      renderWrapper: true,
      allowTableNodeSelection: true,
      HTMLAttributes: {
        class: "cms-rich-table",
      },
    },
  }),
  Typography,
  TextAlign.configure({
    types: ["heading", "paragraph", "tableCell", "tableHeader"],
  }),
  Placeholder.configure({ placeholder: "Write your blog post…" }),
];

export const emptyTiptapJson = {
  type: "doc",
  content: [{ type: "paragraph" }],
};
