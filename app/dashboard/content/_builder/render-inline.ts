import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import type { JSONContent } from "@tiptap/react";

const renderExtensions = [
  StarterKit.configure({
    link: { openOnClick: false, autolink: true },
    heading: false,
    codeBlock: false,
    blockquote: false,
    horizontalRule: false,
    underline: false,
  }),
  Underline,
  TextAlign.configure({ types: ["paragraph"] }),
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
