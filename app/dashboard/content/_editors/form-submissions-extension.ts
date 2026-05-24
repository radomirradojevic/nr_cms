import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    cmsFormSubmissions: {
      setCmsFormSubmissions: (options: {
        formId: string;
        formName?: string | null;
        displayMode?: "table" | "card";
        pageSize?: number;
        hideId?: boolean;
      }) => ReturnType;
    };
  }
}

function parseDisplayMode(value: unknown): "table" | "card" {
  return value === "card" ? "card" : "table";
}

function parsePageSize(value: unknown): number {
  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(100, Math.max(1, parsed));
}

function parseBoolean(value: unknown): boolean {
  if (value === false || value === "false") return false;
  return true;
}

/**
 * TipTap node representing an embedded Form Submissions block.
 *
 * Renders to stable `data-*` attributes so blog content can hydrate it with
 * the same renderer used by the Craft.js page-builder block.
 */
export const CmsFormSubmissionsNode = Node.create({
  name: "cmsFormSubmissions",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      formId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-cms-form-submissions-id"),
        renderHTML: (attributes) => {
          if (!attributes.formId) return {};
          return { "data-cms-form-submissions-id": attributes.formId };
        },
      },
      formName: {
        default: "",
        parseHTML: (el) =>
          el.getAttribute("data-cms-form-submissions-name") ?? "",
        renderHTML: (attributes) => {
          if (!attributes.formName) return {};
          return { "data-cms-form-submissions-name": attributes.formName };
        },
      },
      displayMode: {
        default: "table",
        parseHTML: (el) =>
          parseDisplayMode(
            el.getAttribute("data-cms-form-submissions-display-mode"),
          ),
        renderHTML: (attributes) => ({
          "data-cms-form-submissions-display-mode": parseDisplayMode(
            attributes.displayMode,
          ),
        }),
      },
      pageSize: {
        default: 5,
        parseHTML: (el) =>
          parsePageSize(el.getAttribute("data-cms-form-submissions-page-size")),
        renderHTML: (attributes) => ({
          "data-cms-form-submissions-page-size": String(
            parsePageSize(attributes.pageSize),
          ),
        }),
      },
      hideId: {
        default: true,
        parseHTML: (el) =>
          parseBoolean(el.getAttribute("data-cms-form-submissions-hide-id")),
        renderHTML: (attributes) => ({
          "data-cms-form-submissions-hide-id": String(
            parseBoolean(attributes.hideId),
          ),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-cms-form-submissions-id]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const name = (node.attrs.formName as string | null) ?? "";
    const mode = parseDisplayMode(node.attrs.displayMode);
    const pageSize = parsePageSize(node.attrs.pageSize);
    const hideId = parseBoolean(node.attrs.hideId);

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: "tiptap-cms-form-submissions",
      }),
      [
        "div",
        {
          class:
            "tiptap-cms-form-submissions-placeholder my-4 rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 p-4 text-center text-sm text-muted-foreground",
        },
        `Form Submissions: ${name || "(untitled)"} (${mode}, ${pageSize} per page${hideId ? ", ID hidden" : ""})`,
      ],
    ];
  },

  addCommands() {
    return {
      setCmsFormSubmissions:
        ({
          formId,
          formName,
          displayMode = "table",
          pageSize = 5,
          hideId = true,
        }) =>
        ({ commands }) => {
          if (!formId) return false;
          return commands.insertContent({
            type: this.name,
            attrs: {
              formId,
              formName: formName ?? "",
              displayMode: parseDisplayMode(displayMode),
              pageSize: parsePageSize(pageSize),
              hideId,
            },
          });
        },
    };
  },
});
