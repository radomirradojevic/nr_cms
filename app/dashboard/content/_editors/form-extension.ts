import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    cmsForm: {
      setCmsForm: (options: {
        formId: string;
        formName?: string | null;
      }) => ReturnType;
    };
  }
}

/**
 * TipTap node representing an embedded CMS form.
 *
 * Renders to a stable placeholder `<div data-cms-form-id="…">` that the
 * public-facing blog post renderer (see `components/blog-content.tsx`)
 * hydrates with the real `<CmsFormRenderer>`.
 */
export const CmsFormNode = Node.create({
  name: "cmsForm",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      formId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-cms-form-id"),
        renderHTML: (attributes) => {
          if (!attributes.formId) return {};
          return { "data-cms-form-id": attributes.formId };
        },
      },
      formName: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-cms-form-name") ?? "",
        renderHTML: (attributes) => {
          if (!attributes.formName) return {};
          return { "data-cms-form-name": attributes.formName };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-cms-form-id]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const name = (node.attrs.formName as string | null) ?? "";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: "tiptap-cms-form",
      }),
      [
        "div",
        {
          class:
            "tiptap-cms-form-placeholder my-4 rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 p-4 text-center text-sm text-muted-foreground",
        },
        `Form: ${name || "(untitled)"}`,
      ],
    ];
  },

  addCommands() {
    return {
      setCmsForm:
        ({ formId, formName }) =>
        ({ commands }) => {
          if (!formId) return false;
          return commands.insertContent({
            type: this.name,
            attrs: {
              formId,
              formName: formName ?? "",
            },
          });
        },
    };
  },
});
