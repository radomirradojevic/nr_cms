"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import type { JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { useEffect } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
} from "lucide-react";

const inlineExtensions = [
  StarterKit.configure({
    link: { openOnClick: false, autolink: true },
    heading: false,
    codeBlock: false,
    blockquote: false,
    horizontalRule: false,
  }),
  Underline,
];

export const emptyInlineDoc: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

type Props = {
  value: JSONContent | null | undefined;
  onChange: (value: JSONContent) => void;
  className?: string;
  /** Render as a single line (suppresses paragraph margins, used for headings/buttons). */
  singleLine?: boolean;
  placeholder?: string;
};

/**
 * Tiptap-backed inline rich-text editor used inside builder blocks.
 * Stores its content as Tiptap JSON in the parent block's props.
 */
export function InlineRichText({
  value,
  onChange,
  className,
  singleLine,
  placeholder,
}: Props) {
  const editor = useEditor({
    extensions: inlineExtensions,
    content: value ?? emptyInlineDoc,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `focus:outline-none ${singleLine ? "[&_p]:m-0" : ""} ${className ?? ""}`,
        "data-placeholder": placeholder ?? "",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getJSON();
    if (value && JSON.stringify(current) !== JSON.stringify(value)) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  function setLink() {
    const previousUrl = editor!.getAttributes("link").href as string | null;
    const url = window.prompt("URL", previousUrl ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor!.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor!
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }

  return (
    <>
      <EditorContent editor={editor} />
      <BubbleMenu
        editor={editor}
        className="flex items-center gap-1 rounded-md border bg-popover p-1 shadow-md"
      >
        <BtnInline
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" />
        </BtnInline>
        <BtnInline
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" />
        </BtnInline>
        <BtnInline
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </BtnInline>
        {!singleLine && (
          <>
            <BtnInline
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List className="h-3.5 w-3.5" />
            </BtnInline>
            <BtnInline
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </BtnInline>
          </>
        )}
        <BtnInline active={editor.isActive("link")} onClick={setLink}>
          <LinkIcon className="h-3.5 w-3.5" />
        </BtnInline>
      </BubbleMenu>
    </>
  );
}

function BtnInline({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`rounded px-1.5 py-1 text-xs ${active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"}`}
    >
      {children}
    </button>
  );
}
