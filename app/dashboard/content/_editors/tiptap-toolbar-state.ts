"use client";

import type { Editor } from "@tiptap/react";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { getCurrentIndentLevel } from "./indent-extension";

export type TiptapToolbarState = {
  heading1: boolean;
  heading2: boolean;
  heading3: boolean;
  bold: boolean;
  italic: boolean;
  strike: boolean;
  underline: boolean;
  bulletList: boolean;
  orderedList: boolean;
  blockquote: boolean;
  link: boolean;
  codeBlock: boolean;
  textColor: string | null;
  indentLevel: number;
  alignLeft: boolean;
  alignCenter: boolean;
  alignRight: boolean;
  alignJustify: boolean;
  table: boolean;
  tableCell: boolean;
  tableHeader: boolean;
  image: boolean;
  video: boolean;
  gallery: boolean;
  cmsForm: boolean;
  cmsFormSubmissions: boolean;
  layoutSection: boolean;
};

export const inactiveTiptapToolbarState: TiptapToolbarState = {
  heading1: false,
  heading2: false,
  heading3: false,
  bold: false,
  italic: false,
  strike: false,
  underline: false,
  bulletList: false,
  orderedList: false,
  blockquote: false,
  link: false,
  codeBlock: false,
  textColor: null,
  indentLevel: 0,
  alignLeft: false,
  alignCenter: false,
  alignRight: false,
  alignJustify: false,
  table: false,
  tableCell: false,
  tableHeader: false,
  image: false,
  video: false,
  gallery: false,
  cmsForm: false,
  cmsFormSubmissions: false,
  layoutSection: false,
};

function getTiptapToolbarState(editor: Editor): TiptapToolbarState {
  return {
    heading1: editor.isActive("heading", { level: 1 }),
    heading2: editor.isActive("heading", { level: 2 }),
    heading3: editor.isActive("heading", { level: 3 }),
    bold: editor.isActive("bold"),
    italic: editor.isActive("italic"),
    strike: editor.isActive("strike"),
    underline: editor.isActive("underline"),
    bulletList: editor.isActive("bulletList"),
    orderedList: editor.isActive("orderedList"),
    blockquote: editor.isActive("blockquote"),
    link: editor.isActive("link"),
    codeBlock: editor.isActive("codeBlock"),
    textColor:
      typeof editor.getAttributes("textStyle").color === "string"
        ? editor.getAttributes("textStyle").color
        : null,
    indentLevel: getCurrentIndentLevel(editor),
    alignLeft: editor.isActive({ textAlign: "left" }),
    alignCenter: editor.isActive({ textAlign: "center" }),
    alignRight: editor.isActive({ textAlign: "right" }),
    alignJustify: editor.isActive({ textAlign: "justify" }),
    table: editor.isActive("table"),
    tableCell: editor.isActive("tableCell"),
    tableHeader: editor.isActive("tableHeader"),
    image: editor.isActive("image"),
    video: editor.isActive("video"),
    gallery: editor.isActive("gallery"),
    cmsForm: editor.isActive("cmsForm"),
    cmsFormSubmissions: editor.isActive("cmsFormSubmissions"),
    layoutSection: editor.isActive("layoutSection"),
  };
}

export function useTiptapToolbarState(
  editor: Editor | null,
): TiptapToolbarState {
  const versionRef = useRef(0);
  const getSnapshot = useCallback(() => versionRef.current, []);

  const subscribe = useCallback(
    (notify: () => void) => {
      if (!editor) return () => {};

      let animationFrame: number | null = null;
      const syncToolbarState = () => {
        if (animationFrame !== null) return;

        animationFrame = window.requestAnimationFrame(() => {
          animationFrame = null;
          versionRef.current += 1;
          notify();
        });
      };

      editor.on("selectionUpdate", syncToolbarState);
      editor.on("transaction", syncToolbarState);
      editor.on("update", syncToolbarState);
      editor.on("focus", syncToolbarState);

      const dom = editor.view.dom;
      dom.addEventListener("mouseup", syncToolbarState);
      dom.addEventListener("keyup", syncToolbarState);

      return () => {
        editor.off("selectionUpdate", syncToolbarState);
        editor.off("transaction", syncToolbarState);
        editor.off("update", syncToolbarState);
        editor.off("focus", syncToolbarState);
        dom.removeEventListener("mouseup", syncToolbarState);
        dom.removeEventListener("keyup", syncToolbarState);
        if (animationFrame !== null) {
          window.cancelAnimationFrame(animationFrame);
        }
      };
    },
    [editor],
  );

  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (!editor) {
    return inactiveTiptapToolbarState;
  }

  return getTiptapToolbarState(editor);
}
