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
  Video as VideoIcon,
  Link as LinkIcon,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react";
import { tiptapExtensions, emptyTiptapJson } from "./tiptap-extensions";
import { ImageInsertDialog } from "./image-insert-dialog";
import { VideoInsertDialog } from "./video-insert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  value: JSONContent | null | undefined;
  onChange: (value: JSONContent) => void;
};

export function BlogEditor({ value, onChange }: Props) {
  const [htmlMode, setHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState("");
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

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
    setLinkUrl(previousUrl ?? "https://");
    setLinkDialogOpen(true);
  }

  function applyLink() {
    const url = linkUrl.trim();
    if (url === "") {
      editor!.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor!
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
    setLinkDialogOpen(false);
  }

  function removeLink() {
    editor!.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkDialogOpen(false);
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
        <TooltipProvider delayDuration={500}>
        {!htmlMode && (
          <>
            <Btn
              tooltip="Heading 1"
              active={editor.isActive("heading", { level: 1 })}
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
            >
              <Heading1 className="h-4 w-4" />
            </Btn>
            <Btn
              tooltip="Heading 2"
              active={editor.isActive("heading", { level: 2 })}
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
            >
              <Heading2 className="h-4 w-4" />
            </Btn>
            <Btn
              tooltip="Heading 3"
              active={editor.isActive("heading", { level: 3 })}
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
            >
              <Heading3 className="h-4 w-4" />
            </Btn>
            <Sep />
            <Btn
              tooltip="Bold"
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="h-4 w-4" />
            </Btn>
            <Btn
              tooltip="Italic"
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-4 w-4" />
            </Btn>
            <Btn
              tooltip="Strikethrough"
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <Strikethrough className="h-4 w-4" />
            </Btn>
            <Sep />
            <Btn
              tooltip="Bullet list"
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List className="h-4 w-4" />
            </Btn>
            <Btn
              tooltip="Ordered list"
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="h-4 w-4" />
            </Btn>
            <Btn
              tooltip="Blockquote"
              active={editor.isActive("blockquote")}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
              <Quote className="h-4 w-4" />
            </Btn>
            <Sep />
            <Btn tooltip="Insert / edit link" active={editor.isActive("link")} onClick={setLink}>
              <LinkIcon className="h-4 w-4" />
            </Btn>
            <Sep />
            <Btn
              tooltip="Align left"
              active={editor.isActive({ textAlign: "left" })}
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
            >
              <AlignLeft className="h-4 w-4" />
            </Btn>
            <Btn
              tooltip="Align center"
              active={editor.isActive({ textAlign: "center" })}
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
            >
              <AlignCenter className="h-4 w-4" />
            </Btn>
            <Btn
              tooltip="Align right"
              active={editor.isActive({ textAlign: "right" })}
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
            >
              <AlignRight className="h-4 w-4" />
            </Btn>
            <Btn
              tooltip="Justify"
              active={editor.isActive({ textAlign: "justify" })}
              onClick={() =>
                editor.chain().focus().setTextAlign("justify").run()
              }
            >
              <AlignJustify className="h-4 w-4" />
            </Btn>
            <Sep />
            <Btn
              tooltip="Undo"
              active={false}
              onClick={() => editor.chain().focus().undo().run()}
            >
              <Undo className="h-4 w-4" />
            </Btn>
            <Btn
              tooltip="Redo"
              active={false}
              onClick={() => editor.chain().focus().redo().run()}
            >
              <Redo className="h-4 w-4" />
            </Btn>
            <Sep />
          </>
        )}
        <Btn tooltip="Toggle HTML source" active={htmlMode} onClick={toggleHtmlMode}>
          <Code2 className="h-4 w-4" />
        </Btn>
        {!htmlMode && (
          <Btn tooltip="Insert image" active={false} onClick={() => setImageDialogOpen(true)}>
            <ImageIcon className="h-4 w-4" />
          </Btn>
        )}
        {!htmlMode && (
          <Btn tooltip="Insert video" active={false} onClick={() => setVideoDialogOpen(true)}>
            <VideoIcon className="h-4 w-4" />
          </Btn>
        )}
        </TooltipProvider>
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
        onInsert={({ src, alt, width, height }) => {
          editor!
            .chain()
            .focus()
            .setImage({
              src,
              alt: alt || undefined,
              ...(width ? { width } : {}),
              ...(height ? { height } : {}),
            } as { src: string; alt?: string; width?: string; height?: string })
            .run();
        }}
      />
      <VideoInsertDialog
        open={videoDialogOpen}
        onOpenChange={setVideoDialogOpen}
        onInsert={({ src, provider, width, height }) => {
          editor!
            .chain()
            .focus()
            .setVideo({
              src,
              provider,
              ...(width ? { width } : {}),
              ...(height ? { height } : {}),
            })
            .run();
        }}
      />
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert link</DialogTitle>
            <DialogDescription>
              Enter a URL to link the selected text. Leave empty to remove the
              link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="link-url">URL</Label>
            <Input
              id="link-url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                }
              }}
            />
          </div>
          <DialogFooter>
            {editor.isActive("link") && (
              <Button type="button" variant="outline" onClick={removeLink}>
                Remove link
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setLinkDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={applyLink}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Btn({
  active,
  onClick,
  children,
  tooltip,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tooltip?: string;
}) {
  const button = (
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

  if (!tooltip) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function Sep() {
  return <div className="mx-1 h-6 w-px bg-border" />;
}
