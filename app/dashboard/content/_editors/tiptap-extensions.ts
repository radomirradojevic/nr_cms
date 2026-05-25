import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import Typography from "@tiptap/extension-typography";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { CodeBlock } from "@tiptap/extension-code-block";
import {
  type EditorState,
  NodeSelection,
  Plugin,
  PluginKey,
} from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
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

export const SelectableCodeBlock = CodeBlock.extend({
  selectable: true,

  addProseMirrorPlugins() {
    const activeCodeBlockPlugin: Plugin<DecorationSet> =
      new Plugin<DecorationSet>({
        key: new PluginKey("activeCodeBlock"),
        state: {
          init: (_, state) => getActiveCodeBlockDecorations(state, this.name),
          apply: (_tr, _decorations, _oldState, newState) =>
            getActiveCodeBlockDecorations(newState, this.name),
        },
        props: {
          decorations(state): DecorationSet {
            return activeCodeBlockPlugin.getState(state) ?? DecorationSet.empty;
          },
        },
      });

    return [...(this.parent?.() ?? []), activeCodeBlockPlugin];
  },
});

function getActiveCodeBlockDecorations(state: EditorState, typeName: string) {
  const range = getActiveCodeBlockRange(state, typeName);
  if (!range) return DecorationSet.empty;

  return DecorationSet.create(state.doc, [
    Decoration.node(range.from, range.to, {
      class: "cms-code-block-active",
    }),
  ]);
}

function getActiveCodeBlockRange(
  state: EditorState,
  typeName: string,
): { from: number; to: number } | null {
  const { selection } = state;

  if (selection instanceof NodeSelection) {
    return selection.node.type.name === typeName
      ? { from: selection.from, to: selection.to }
      : null;
  }

  const { $from, $to } = selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name !== typeName) continue;
    if ($to.depth < depth || $to.node(depth).type.name !== typeName) {
      return null;
    }

    const from = $from.before(depth);
    return $to.before(depth) === from
      ? { from, to: from + $from.node(depth).nodeSize }
      : null;
  }

  return null;
}

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
  SelectableCodeBlock.configure(codeBlockOptions),
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
