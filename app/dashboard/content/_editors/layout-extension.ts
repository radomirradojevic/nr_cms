import { Node, mergeAttributes } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

export type LayoutKind =
  | "2-col"
  | "3-col"
  | "4-col"
  | "70-30"
  | "30-70"
  | "60-40"
  | "40-60";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    layoutSection: {
      insertLayoutSection: (options: { layout: LayoutKind }) => ReturnType;
    };
  }
}

const layoutColumnCounts: Record<LayoutKind, number> = {
  "2-col": 2,
  "3-col": 3,
  "4-col": 4,
  "70-30": 2,
  "30-70": 2,
  "60-40": 2,
  "40-60": 2,
};

function normalizeLayout(value: unknown): LayoutKind {
  return value === "3-col" ||
    value === "4-col" ||
    value === "70-30" ||
    value === "30-70" ||
    value === "60-40" ||
    value === "40-60"
    ? value
    : "2-col";
}

export const LayoutSection = Node.create({
  name: "layoutSection",
  group: "block",
  content: "layoutColumn{2,4}",
  defining: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      layout: {
        default: "2-col",
        parseHTML: (el) => normalizeLayout(el.getAttribute("data-layout")),
        renderHTML: (attributes) => ({
          "data-layout": normalizeLayout(attributes.layout),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-layout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const layout = normalizeLayout(HTMLAttributes["data-layout"]);
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
          const normalizedLayout = normalizeLayout(layout);
          const sectionType = state.schema.nodes.layoutSection;
          const columnType = state.schema.nodes.layoutColumn;
          const paragraphType = state.schema.nodes.paragraph;

          if (!sectionType || !columnType || !paragraphType) return false;

          const columnCount = layoutColumnCounts[normalizedLayout];
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
