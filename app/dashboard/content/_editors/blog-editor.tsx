"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Code2,
  Italic,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Link as LinkIcon,
  Undo,
  Redo,
} from "lucide-react";
import { tiptapExtensions, emptyTiptapJson } from "./tiptap-extensions";
import { ImageInsertDialog } from "./image-insert-dialog";

type Props = {
  value: JSONContent | null | undefined;
  onChange: (value: JSONContent) => void;
};

export function BlogEditor({ value, onChange }: Props) {
  const [htmlMode, setHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState("");
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  const editor = useEditor({
    extensions: tiptapExtensions,
    content: value ?? emptyTiptapJson,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none min-h-[400px] focus:outline-none p-4",
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

  function toggleHtmlMode() {
    if (!htmlMode) {
      setHtmlSource(editor!.getHTML());
    } else {
      editor!.commands.setContent(htmlSource);
    }
    setHtmlMode((prev) => !prev);
  }

  return (
    <div className="rounded-md border">
      <div className="flex flex-wrap items-center gap-1 border-b p-2">
        {!htmlMode && (
          <>
            <Btn
              active={editor.isActive("heading", { level: 1 })}
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
            >
              <Heading1 className="h-4 w-4" />
            </Btn>
            <Btn
              active={editor.isActive("heading", { level: 2 })}
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
            >
              <Heading2 className="h-4 w-4" />
            </Btn>
            <Btn
              active={editor.isActive("heading", { level: 3 })}
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
            >
              <Heading3 className="h-4 w-4" />
            </Btn>
            <Sep />
            <Btn
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="h-4 w-4" />
            </Btn>
            <Btn
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-4 w-4" />
            </Btn>
            <Btn
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <Strikethrough className="h-4 w-4" />
            </Btn>
            <Sep />
            <Btn
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List className="h-4 w-4" />
            </Btn>
            <Btn
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="h-4 w-4" />
            </Btn>
            <Btn
              active={editor.isActive("blockquote")}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
              <Quote className="h-4 w-4" />
            </Btn>
            <Sep />
            <Btn active={editor.isActive("link")} onClick={setLink}>
              <LinkIcon className="h-4 w-4" />
            </Btn>
            <Sep />
            <Btn
              active={false}
              onClick={() => editor.chain().focus().undo().run()}
            >
              <Undo className="h-4 w-4" />
            </Btn>
            <Btn
              active={false}
              onClick={() => editor.chain().focus().redo().run()}
            >
              <Redo className="h-4 w-4" />
            </Btn>
            <Sep />
          </>
        )}
        <Btn active={htmlMode} onClick={toggleHtmlMode}>
          <Code2 className="h-4 w-4" />
        </Btn>
        {!htmlMode && (
          <Btn active={false} onClick={() => setImageDialogOpen(true)}>
            <ImageIcon className="h-4 w-4" />
          </Btn>
        )}
      </div>
      {htmlMode ? (
        <textarea
          value={htmlSource}
          onChange={(e) => setHtmlSource(e.target.value)}
          className="w-full min-h-[400px] p-4 font-mono text-sm bg-background text-foreground focus:outline-none resize-y"
          spellCheck={false}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
      <ImageInsertDialog
        open={imageDialogOpen}
        onOpenChange={setImageDialogOpen}
        onInsert={({ src, alt }) => {
          editor!
            .chain()
            .focus()
            .setImage({ src, alt: alt || undefined })
            .run();
        }}
      />
    </div>
  );
}

function Btn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "ghost"}
      size="sm"
      onClick={onClick}
      className="h-8 w-8 p-0"
    >
      {children}
    </Button>
  );
}

function Sep() {
  return <div className="mx-1 h-6 w-px bg-border" />;
}
