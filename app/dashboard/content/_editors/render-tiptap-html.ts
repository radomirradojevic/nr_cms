import { generateHTML } from "@tiptap/html/server";
import type { JSONContent } from "@tiptap/react";
import { HighlightedCodeBlock } from "./highlighted-code-block";
import { sanitizeTiptapHtml } from "./sanitize-tiptap-html";
import { codeBlockOptions, tiptapExtensions } from "./tiptap-extensions";

const serverTiptapExtensions = tiptapExtensions.map((extension) =>
  extension.name === "codeBlock"
    ? HighlightedCodeBlock.configure(codeBlockOptions)
    : extension,
);

export function renderTiptapHtml(contentJson: unknown): string {
  if (!contentJson || typeof contentJson !== "object") return "";
  return sanitizeTiptapHtml(
    generateHTML(contentJson as JSONContent, serverTiptapExtensions),
  );
}
