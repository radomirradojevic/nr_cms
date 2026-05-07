import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import type { JSONContent } from "@tiptap/react";

const renderExtensions = [
  StarterKit.configure({
    link: { openOnClick: false, autolink: true },
    heading: false,
    codeBlock: false,
    blockquote: false,
    horizontalRule: false,
  }),
  Underline,
];

/**
 * Render Tiptap JSON to a sanitized HTML string. Safe for both server
 * (RSC renderer) and client (preview). Returns "" for null/empty docs.
 */
export function renderInlineHtml(
  value: JSONContent | null | undefined,
): string {
  if (!value) return "";
  try {
    return generateHTML(value, renderExtensions);
  } catch {
    return "";
  }
}
