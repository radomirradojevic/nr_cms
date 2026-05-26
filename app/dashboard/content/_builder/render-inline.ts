import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import type { JSONContent } from "@tiptap/react";
import { sanitizeTiptapHtml } from "@/app/dashboard/content/_editors/sanitize-tiptap-html";

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

export function stripInlineTextAlign(
  value: JSONContent | null | undefined,
): JSONContent | null | undefined {
  if (!value) return value;
  let changed = false;

  function visit(node: JSONContent): JSONContent {
    const next: JSONContent = { ...node };
    if (next.attrs && "textAlign" in next.attrs) {
      const attrs = { ...next.attrs };
      delete attrs.textAlign;
      next.attrs = Object.keys(attrs).length > 0 ? attrs : undefined;
      changed = true;
    }
    if (next.content) {
      next.content = next.content.map(visit);
    }
    return next;
  }

  const next = visit(value);
  return changed ? next : value;
}

/**
 * Render Tiptap JSON to a sanitized HTML string. Safe for both server
 * (RSC renderer) and client (preview). Returns "" for null/empty docs.
 */
export function renderInlineHtml(
  value: JSONContent | null | undefined,
): string {
  if (!value) return "";
  try {
    return sanitizeTiptapHtml(generateHTML(value, renderExtensions));
  } catch {
    return "";
  }
}
