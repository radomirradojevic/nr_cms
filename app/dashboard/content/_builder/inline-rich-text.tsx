"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { useNode } from "@craftjs/core";
import { useEffect, useState } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
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
  const [focused, setFocused] = useState(false);

  // Read selection state from the nearest Craft.js node so the toolbar can
  // stay visible whenever the surrounding block is selected (not only while
  // text is highlighted).
  const { selected } = useNode((n) => ({
    selected: n.events.selected,
  }));

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
      TextAlign.configure({ types: ["paragraph"] }),
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
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
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
      <div className="relative">
        {(selected || focused) && (
          <div
            className="absolute -top-10 left-0 z-30 flex items-center gap-1 rounded-md border bg-popover p-1 shadow-md"
            // Prevent clicks inside the toolbar from blurring the editor or
            // triggering Craft.js drag/select handlers on the parent block.
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => e.stopPropagation()}
          >
            <BtnInline
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="Bold"
            >
              <Bold className="h-3.5 w-3.5" />
            </BtnInline>
            <BtnInline
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="Italic"
            >
              <Italic className="h-3.5 w-3.5" />
            </BtnInline>
            <BtnInline
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              title="Underline"
            >
              <UnderlineIcon className="h-3.5 w-3.5" />
            </BtnInline>
            <span className="mx-1 h-4 w-px bg-border" />
            <BtnInline
              active={editor.isActive({ textAlign: "left" })}
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              title="Align left"
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </BtnInline>
            <BtnInline
              active={editor.isActive({ textAlign: "center" })}
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
              title="Align center"
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </BtnInline>
            <BtnInline
              active={editor.isActive({ textAlign: "right" })}
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              title="Align right"
            >
              <AlignRight className="h-3.5 w-3.5" />
            </BtnInline>
            {!singleLine && (
              <BtnInline
                active={editor.isActive({ textAlign: "justify" })}
                onClick={() =>
                  editor.chain().focus().setTextAlign("justify").run()
                }
                title="Justify"
              >
                <AlignJustify className="h-3.5 w-3.5" />
              </BtnInline>
            )}
            {!singleLine && (
              <>
                <span className="mx-1 h-4 w-px bg-border" />
                <BtnInline
                  active={editor.isActive("bulletList")}
                  onClick={() =>
                    editor.chain().focus().toggleBulletList().run()
                  }
                  title="Bulleted list"
                >
                  <List className="h-3.5 w-3.5" />
                </BtnInline>
                <BtnInline
                  active={editor.isActive("orderedList")}
                  onClick={() =>
                    editor.chain().focus().toggleOrderedList().run()
                  }
                  title="Numbered list"
                >
                  <ListOrdered className="h-3.5 w-3.5" />
                </BtnInline>
              </>
            )}
            <span className="mx-1 h-4 w-px bg-border" />
            <BtnInline
              active={editor.isActive("link")}
              onClick={openLinkDialog}
              title="Link"
            >
              <LinkIcon className="h-3.5 w-3.5" />
            </BtnInline>
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
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
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
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
