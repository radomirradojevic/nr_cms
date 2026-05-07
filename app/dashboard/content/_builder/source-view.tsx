"use client";

import CodeMirror from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";

type Props = {
  value: string;
  onChange: (value: string) => void;
  height?: string;
};

/**
 * CodeMirror 6 HTML editor — used for the page-level "Source" view.
 * The Source view collapses the structured tree into a single RawHtml node
 * (lossy by design — the user is warned in `page-editor.tsx`).
 */
export function HtmlSourceEditor({ value, onChange, height = "500px" }: Props) {
  return (
    <CodeMirror
      value={value}
      height={height}
      extensions={[html()]}
      onChange={onChange}
      theme="dark"
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: true,
        bracketMatching: true,
      }}
    />
  );
}
