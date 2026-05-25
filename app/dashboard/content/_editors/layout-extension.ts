import { Node, mergeAttributes } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import {
  getLayoutColumnCount,
  normalizeLayoutKind,
  type LayoutKind,
} from "./layout-presets";

export type { LayoutKind };

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    layoutSection: {
      insertLayoutSection: (options: { layout: LayoutKind }) => ReturnType;
    };
  }
}

export const LayoutSection = Node.create({
  name: "layoutSection",
  group: "block",
  content: "layoutColumn{1,4}",
  defining: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      layout: {
        default: "2-col",
        parseHTML: (el) => normalizeLayoutKind(el.getAttribute("data-layout")),
        renderHTML: (attributes) => ({
          "data-layout": normalizeLayoutKind(attributes.layout),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-layout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const layout = normalizeLayoutKind(HTMLAttributes["data-layout"]);
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-layout": layout,
        class: "cms-layout-section",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      insertLayoutSection:
        ({ layout }) =>
        ({ state, dispatch }) => {
          const normalizedLayout = normalizeLayoutKind(layout);
          const sectionType = state.schema.nodes.layoutSection;
          const columnType = state.schema.nodes.layoutColumn;
          const paragraphType = state.schema.nodes.paragraph;

          if (!sectionType || !columnType || !paragraphType) return false;

          const columnCount = getLayoutColumnCount(normalizedLayout);
          const columns = Array.from({ length: columnCount }, (_, index) =>
            columnType.create(
              { column: index + 1 },
              paragraphType.createAndFill(),
            ),
          );
          const section = sectionType.create(
            { layout: normalizedLayout },
            columns,
          );

          if (!section) return false;

          const insertedAt = state.selection.from;
          const tr = state.tr.replaceSelectionWith(section).scrollIntoView();
          const firstColumnTextPos = insertedAt + 3;

          if (
            firstColumnTextPos > 0 &&
            firstColumnTextPos <= tr.doc.content.size
          ) {
            tr.setSelection(TextSelection.create(tr.doc, firstColumnTextPos));
          }

          dispatch?.(tr);
          return true;
        },
    };
  },
});

export const LayoutColumn = Node.create({
  name: "layoutColumn",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      column: {
        default: 1,
        parseHTML: (el) => {
          const value = Number.parseInt(
            el.getAttribute("data-column") ?? "",
            10,
          );
          return Number.isFinite(value) && value > 0 ? value : 1;
        },
        renderHTML: (attributes) => ({
          "data-column": String(attributes.column || 1),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-column]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: "cms-layout-column",
      }),
      0,
    ];
  },
});
