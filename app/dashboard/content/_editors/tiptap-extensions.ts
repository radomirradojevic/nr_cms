import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";

export const tiptapExtensions = [
  StarterKit.configure({
    link: { openOnClick: false, autolink: true },
  }),
  Image,
  Typography,
  Placeholder.configure({ placeholder: "Write your blog post…" }),
];

export const emptyTiptapJson = {
  type: "doc",
  content: [{ type: "paragraph" }],
};
