"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useState } from "react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Link as LinkIcon,
  Undo,
  Redo,
  Code2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FooterContentEditorProps {
  value: string;
  onChange: (html: string) => void;
}

function Btn({
  tooltip,
  active,
  onClick,
  children,
}: {
  tooltip: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={active ? "secondary" : "ghost"}
          size="icon"
          className={cn(
            "h-7 w-7",
            active && "bg-accent text-accent-foreground",
          )}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function Sep() {
  return <div className="mx-0.5 h-5 w-px bg-border" />;
}

const footerEditorExtensions = [
  StarterKit.configure({
    link: { openOnClick: false, autolink: true },
    underline: false,
  }),
  Underline,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Placeholder.configure({ placeholder: "Enter footer content…" }),
];

export function FooterContentEditor({
  value,
  onChange,
}: FooterContentEditorProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [htmlMode, setHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState("");

  const editor = useEditor({
    extensions: footerEditorExtensions,
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        // Typography colors come from the active appearance theme via the
        // `.ProseMirror` rules in `app/globals.css`. Do not add Tailwind's
        // `prose` / `prose-invert` classes — they hard-code light text that
        // becomes invisible on light themes (default, minimal, corporate,
        // elegant).
        class:
          "max-w-none min-h-[160px] focus:outline-none p-4 text-sm",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Sync external value changes (e.g. on initial load)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // Only sync when value prop changes externally, not on editor updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  function toggleHtmlMode() {
    if (!htmlMode) {
      setHtmlSource(editor!.getHTML());
    } else {
      editor!.commands.setContent(htmlSource);
      onChange(htmlSource);
    }
    setHtmlMode((prev) => !prev);
  }

  function openLinkDialog() {
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

  return (
    <>
      <div className="rounded-md border">
        <div className="flex flex-wrap items-center gap-1 border-b p-2">
          <TooltipProvider delayDuration={500}>
            <Btn
              tooltip="Toggle HTML source"
              active={htmlMode}
              onClick={toggleHtmlMode}
            >
              <Code2 className="h-4 w-4" />
            </Btn>
            {!htmlMode && (
              <>
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
                  tooltip="Underline"
                  active={editor.isActive("underline")}
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                >
                  <UnderlineIcon className="h-4 w-4" />
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
                  tooltip="Align left"
                  active={editor.isActive({ textAlign: "left" })}
                  onClick={() =>
                    editor.chain().focus().setTextAlign("left").run()
                  }
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
                  onClick={() =>
                    editor.chain().focus().setTextAlign("right").run()
                  }
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
                  tooltip="Bullet list"
                  active={editor.isActive("bulletList")}
                  onClick={() =>
                    editor.chain().focus().toggleBulletList().run()
                  }
                >
                  <List className="h-4 w-4" />
                </Btn>
                <Btn
                  tooltip="Ordered list"
                  active={editor.isActive("orderedList")}
                  onClick={() =>
                    editor.chain().focus().toggleOrderedList().run()
                  }
                >
                  <ListOrdered className="h-4 w-4" />
                </Btn>
                <Sep />
                <Btn
                  tooltip="Insert / edit link"
                  active={editor.isActive("link")}
                  onClick={openLinkDialog}
                >
                  <LinkIcon className="h-4 w-4" />
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
              </>
            )}
          </TooltipProvider>
        </div>

        {htmlMode ? (
          <textarea
            value={htmlSource}
            onChange={(e) => {
              setHtmlSource(e.target.value);
              onChange(e.target.value);
            }}
            className="w-full min-h-[160px] p-4 font-mono text-sm bg-background text-foreground focus:outline-none resize-y"
            spellCheck={false}
          />
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="footer-link-url">URL</Label>
            <Input
              id="footer-link-url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://"
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
              <Button type="button" variant="ghost" onClick={removeLink}>
                Remove link
              </Button>
            )}
            <Button type="button" onClick={applyLink}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
