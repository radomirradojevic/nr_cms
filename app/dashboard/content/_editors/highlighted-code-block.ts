import { mergeAttributes } from "@tiptap/core";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import type { DOMOutputSpec } from "@tiptap/pm/model";
import type { Element, RootContent } from "hast";
import {
  languageForTiptap,
  lowlight,
  normalizeCodeLanguage,
} from "./code-languages";

// ProseMirror DOM specs permit string leaf nodes. Keep that fact explicit so
// the host typecheck remains valid across the locked ProseMirror declaration
// graph used by a clean CMS install.
type HighlightOutputSpec = DOMOutputSpec | string;

function hastToSpec(node: RootContent): HighlightOutputSpec {
  if (node.type === "text") return node.value;
  if (node.type !== "element") return "";

  const element = node as Element;
  const className = element.properties.className;
  const attrs =
    Array.isArray(className) && className.length > 0
      ? { class: className.join(" ") }
      : {};

  return [
    element.tagName,
    attrs,
    ...element.children.map((child) => hastToSpec(child)),
  ];
}

function highlightCode(code: string, language: unknown): HighlightOutputSpec[] {
  const languageName = languageForTiptap(normalizeCodeLanguage(language)) ?? "";
  const languages = lowlight.listLanguages();
  const hasLanguage =
    languageName &&
    (languages.includes(languageName) || lowlight.registered(languageName));

  const tree = hasLanguage
    ? lowlight.highlight(languageName, code)
    : lowlight.highlightAuto(code);

  return tree.children.map((child) => hastToSpec(child));
}

export const HighlightedCodeBlock = CodeBlockLowlight.extend({
  renderHTML({ node, HTMLAttributes }) {
    const language = languageForTiptap(
      normalizeCodeLanguage(node.attrs.language),
    );

    return [
      "pre",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      [
        "code",
        {
          class: language
            ? `${this.options.languageClassPrefix}${language}`
            : null,
        },
        ...highlightCode(node.textContent, language),
      ],
    ];
  },
});
