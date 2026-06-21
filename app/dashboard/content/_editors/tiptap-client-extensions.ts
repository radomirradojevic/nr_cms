"use client";

import { ReactNodeViewRenderer } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";

import { SelectableCodeBlock, tiptapExtensions } from "./tiptap-extensions";
import { GalleryNode } from "./gallery-extension";
import { CmsFormNode } from "./form-extension";
import { CmsFormSubmissionsNode } from "./form-submissions-extension";
import {
  CmsFormPreviewNodeView,
  FormSubmissionsPreviewNodeView,
  GalleryPreviewNodeView,
} from "./embed-preview-components";

const GalleryPreviewNode = GalleryNode.extend({
  addNodeView() {
    return ReactNodeViewRenderer(GalleryPreviewNodeView);
  },
});

const CmsFormPreviewNode = CmsFormNode.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CmsFormPreviewNodeView);
  },
});

const CmsFormSubmissionsPreviewNode = CmsFormSubmissionsNode.extend({
  addNodeView() {
    return ReactNodeViewRenderer(FormSubmissionsPreviewNodeView);
  },
});

const EditableSelectableCodeBlock = SelectableCodeBlock.extend({
  addNodeView() {
    const extensionName = this.name;
    const { HTMLAttributes, languageClassPrefix } = this.options;

    return ({ editor, getPos, node }) => {
      const pre = document.createElement("pre");
      const code = document.createElement("code");

      Object.entries(HTMLAttributes ?? {}).forEach(([key, value]) => {
        if (value == null) return;
        pre.setAttribute(key, String(value));
      });
      code.setAttribute("spellcheck", "false");
      pre.append(code);

      const syncCodeClass = (language: unknown) => {
        const className =
          typeof language === "string" && language.length > 0
            ? `${languageClassPrefix}${language}`
            : "";

        code.className = className;
      };

      syncCodeClass(node.attrs.language);

      pre.addEventListener("mousedown", (event) => {
        if (event.target !== pre) return;
        if (typeof getPos !== "function") return;

        event.preventDefault();
        const pos = getPos();
        if (typeof pos !== "number") return;

        editor.view.dispatch(
          editor.state.tr.setSelection(
            NodeSelection.create(editor.state.doc, pos),
          ),
        );
        editor.view.focus();
      });

      return {
        dom: pre,
        contentDOM: code,
        update: (updatedNode) => {
          if (updatedNode.type.name !== extensionName) return false;
          syncCodeClass(updatedNode.attrs.language);
          return true;
        },
        selectNode: () => {
          pre.classList.add("ProseMirror-selectednode");
        },
        deselectNode: () => {
          pre.classList.remove("ProseMirror-selectednode");
        },
      };
    };
  },
});

export function createTiptapClientExtensions(
  placeholder = "Write your blog post…",
) {
  return tiptapExtensions.map((extension) => {
    if (extension.name === SelectableCodeBlock.name) {
      return EditableSelectableCodeBlock;
    }
    if (extension.name === GalleryNode.name) return GalleryPreviewNode;
    if (extension.name === CmsFormNode.name) return CmsFormPreviewNode;
    if (extension.name === CmsFormSubmissionsNode.name) {
      return CmsFormSubmissionsPreviewNode;
    }
    if (extension.name === "placeholder") {
      return extension.configure({ placeholder });
    }
    return extension;
  });
}

export const tiptapClientExtensions = createTiptapClientExtensions();
