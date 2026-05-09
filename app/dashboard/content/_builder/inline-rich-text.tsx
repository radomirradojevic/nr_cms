"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import type { JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { useEffect, useState } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        underline: false,
        link: false,
      }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
    ],
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

  function openLinkDialog() {
    const previousUrl = editor!.getAttributes("link").href as string | null;
    setLinkUrl(previousUrl ?? "");
    setLinkDialogOpen(true);
  }

  function applyLink() {
    if (linkUrl === "") {
      editor!.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor!
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl })
        .run();
    }
    setLinkDialogOpen(false);
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
        <BtnInline active={editor.isActive("link")} onClick={openLinkDialog}>
          <LinkIcon className="h-3.5 w-3.5" />
        </BtnInline>
      </BubbleMenu>
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Insert link</DialogTitle>
          </DialogHeader>
          <Input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyLink}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
