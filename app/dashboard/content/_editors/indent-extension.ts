import { Extension, type CommandProps } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    cmsIndent: {
      increaseIndent: () => ReturnType;
      decreaseIndent: () => ReturnType;
    };
  }
}

const INDENTABLE_TYPES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "listItem",
]);

const MAX_INDENT = 8;
const INDENT_REM = 2;

function clampIndent(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(MAX_INDENT, Math.round(numeric)));
}

export const CmsIndent = Extension.create({
  name: "cmsIndent",

  addGlobalAttributes() {
    return [
      {
        types: Array.from(INDENTABLE_TYPES),
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) =>
              clampIndent(
                element.getAttribute("data-indent") ??
                  element.style.marginLeft.replace("rem", ""),
              ),
            renderHTML: (attributes) => {
              const indent = clampIndent(attributes.indent);
              if (indent === 0) return {};

              return {
                "data-indent": String(indent),
                style: `margin-left: ${indent * INDENT_REM}rem;`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    const updateIndent =
      (direction: 1 | -1) =>
      ({ commands, state, tr, dispatch }: CommandProps) => {
        if (state.selection.empty) {
          const listCommand =
            direction > 0 ? commands.sinkListItem : commands.liftListItem;
          if (listCommand("listItem")) return true;
        }

        const { from, to } = state.selection;
        let changed = false;

        state.doc.nodesBetween(from, to, (node: ProseMirrorNode, pos) => {
          if (!INDENTABLE_TYPES.has(node.type.name)) return;

          const current = clampIndent(node.attrs.indent);
          const next = clampIndent(current + direction);
          if (next === current) return;

          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            indent: next,
          });
          changed = true;
        });

        if (!changed) {
          const listCommand =
            direction > 0 ? commands.sinkListItem : commands.liftListItem;
          return listCommand("listItem");
        }

        dispatch?.(tr.scrollIntoView());
        return true;
      };

    return {
      increaseIndent: () => updateIndent(1),
      decreaseIndent: () => updateIndent(-1),
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.increaseIndent(),
      "Shift-Tab": () => this.editor.commands.decreaseIndent(),
    };
  },
});

export function getCurrentIndentLevel(editor: {
  state: {
    selection: { from: number; to: number };
    doc: {
      nodesBetween: (
        from: number,
        to: number,
        callback: (node: {
          type: { name: string };
          attrs: { indent?: unknown };
        }) => void,
      ) => void;
    };
  };
}): number {
  let highestIndent = 0;
  const { from, to } = editor.state.selection;

  editor.state.doc.nodesBetween(from, to, (node) => {
    if (!INDENTABLE_TYPES.has(node.type.name)) return;
    highestIndent = Math.max(highestIndent, clampIndent(node.attrs.indent));
  });

  return highestIndent;
}
