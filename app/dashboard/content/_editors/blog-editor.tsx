"use client";

import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import type { JSONContent } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Code2,
  Italic,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Video as VideoIcon,
  LayoutGrid,
  FormInput,
  ClipboardList,
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
import { GallerySelectDialog } from "./gallery-select-dialog";
import { FormSelectDialog } from "./form-select-dialog";
import { FormSubmissionsSelectDialog } from "./form-submissions-select-dialog";
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
  /**
   * Initial editor content. Read **once** on mount — subsequent prop changes
   * are intentionally ignored. The editor is uncontrolled so that typing
   * does not trigger parent re-renders.
   */
  defaultValue: JSONContent | null | undefined;
  /**
   * Called once on mount with a getter that returns the latest tiptap JSON.
   * The parent should hold this in a ref and call it at submit time.
   */
  registerGetValue?: (getValue: () => JSONContent) => void;
  /** Optional notifier; do NOT use to drive parent state on every keystroke. */
  onChange?: (value: JSONContent) => void;
};

const inactiveToolbarState = {
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
  alignLeft: false,
  alignCenter: false,
  alignRight: false,
  alignJustify: false,
};

export function BlogEditor({
  defaultValue,
  registerGetValue,
  onChange,
}: Props) {
  const [initialContent] = useState<JSONContent>(
    () => defaultValue ?? emptyTiptapJson,
  );
  const [htmlMode, setHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState("");
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [galleryDialogOpen, setGalleryDialogOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [formSubmissionsDialogOpen, setFormSubmissionsDialogOpen] =
    useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions: tiptapExtensions,
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        // NOTE: Do NOT add Tailwind's `prose` / `prose-invert` classes here.
        // Editor typography (headings, lists, blockquote, code, links, etc.)
        // is fully styled by the `.ProseMirror` rules in `app/globals.css`,
        // which derive colors from the active appearance theme's CSS
        // variables (`--foreground`, `--muted-foreground`, `--primary`, …).
        // `prose-invert` would force light-on-light text under light themes
        // (`default`, `minimal`, `corporate`, `elegant`).
        class: "max-w-none min-h-[400px] focus:outline-none p-4",
      },
    },
    onUpdate: ({ editor }) => {
      // Notify optionally; do not assume the parent setState's on this.
      onChangeRef.current?.(editor.getJSON());
    },
  });
  const toolbarState = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor) {
        return inactiveToolbarState;
      }

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
        alignLeft: editor.isActive({ textAlign: "left" }),
        alignCenter: editor.isActive({ textAlign: "center" }),
        alignRight: editor.isActive({ textAlign: "right" }),
        alignJustify: editor.isActive({ textAlign: "justify" }),
      };
    },
  }) ?? inactiveToolbarState;

  // Register the value getter exactly once — the parent reads from this
  // at submit time without subscribing to per-keystroke updates.
  useEffect(() => {
    if (!editor) return;
    registerGetValue?.(() => editor.getJSON());
  }, [editor, registerGetValue]);

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
                active={toolbarState.heading1}
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 1 }).run()
                }
              >
                <Heading1 className="h-4 w-4" />
              </Btn>
              <Btn
                tooltip="Heading 2"
                active={toolbarState.heading2}
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 2 }).run()
                }
              >
                <Heading2 className="h-4 w-4" />
              </Btn>
              <Btn
                tooltip="Heading 3"
                active={toolbarState.heading3}
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 3 }).run()
                }
              >
                <Heading3 className="h-4 w-4" />
              </Btn>
              <Sep />
              <Btn
                tooltip="Bold"
                active={toolbarState.bold}
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                <Bold className="h-4 w-4" />
              </Btn>
              <Btn
                tooltip="Italic"
                active={toolbarState.italic}
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                <Italic className="h-4 w-4" />
              </Btn>
              <Btn
                tooltip="Strikethrough"
                active={toolbarState.strike}
                onClick={() => editor.chain().focus().toggleStrike().run()}
              >
                <Strikethrough className="h-4 w-4" />
              </Btn>
              <Btn
                tooltip="Underline"
                active={toolbarState.underline}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
              >
                <Underline className="h-4 w-4" />
              </Btn>
              <Sep />
              <Btn
                tooltip="Bullet list"
                active={toolbarState.bulletList}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              >
                <List className="h-4 w-4" />
              </Btn>
              <Btn
                tooltip="Ordered list"
                active={toolbarState.orderedList}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
              >
                <ListOrdered className="h-4 w-4" />
              </Btn>
              <Btn
                tooltip="Blockquote"
                active={toolbarState.blockquote}
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
              >
                <Quote className="h-4 w-4" />
              </Btn>
              <Sep />
              <Btn
                tooltip="Insert / edit link"
                active={toolbarState.link}
                onClick={setLink}
              >
                <LinkIcon className="h-4 w-4" />
              </Btn>
              <Sep />
              <Btn
                tooltip="Align left"
                active={toolbarState.alignLeft}
                onClick={() =>
                  editor.chain().focus().setTextAlign("left").run()
                }
              >
                <AlignLeft className="h-4 w-4" />
              </Btn>
              <Btn
                tooltip="Align center"
                active={toolbarState.alignCenter}
                onClick={() =>
                  editor.chain().focus().setTextAlign("center").run()
                }
              >
                <AlignCenter className="h-4 w-4" />
              </Btn>
              <Btn
                tooltip="Align right"
                active={toolbarState.alignRight}
                onClick={() =>
                  editor.chain().focus().setTextAlign("right").run()
                }
              >
                <AlignRight className="h-4 w-4" />
              </Btn>
              <Btn
                tooltip="Justify"
                active={toolbarState.alignJustify}
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
          <Btn
            tooltip="Toggle HTML source"
            active={htmlMode}
            onClick={toggleHtmlMode}
          >
            <Code2 className="h-4 w-4" />
          </Btn>
          {!htmlMode && (
            <Btn
              tooltip="Insert image"
              active={false}
              onClick={() => setImageDialogOpen(true)}
            >
              <ImageIcon className="h-4 w-4" />
            </Btn>
          )}
          {!htmlMode && (
            <Btn
              tooltip="Insert video"
              active={false}
              onClick={() => setVideoDialogOpen(true)}
            >
              <VideoIcon className="h-4 w-4" />
            </Btn>
          )}
          {!htmlMode && (
            <Btn
              tooltip="Insert gallery"
              active={false}
              onClick={() => setGalleryDialogOpen(true)}
            >
              <LayoutGrid className="h-4 w-4" />
            </Btn>
          )}
          {!htmlMode && (
            <Btn
              tooltip="Insert form"
              active={false}
              onClick={() => setFormDialogOpen(true)}
            >
              <FormInput className="h-4 w-4" />
            </Btn>
          )}
          {!htmlMode && (
            <Btn
              tooltip="Insert form submissions"
              active={false}
              onClick={() => setFormSubmissionsDialogOpen(true)}
            >
              <ClipboardList className="h-4 w-4" />
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
          const imageAttrs: Record<string, unknown> = {
            src,
            alt: alt || undefined,
            ...(width ? { width } : {}),
            ...(height ? { height } : {}),
          };
          editor!
            .chain()
            .focus()
            .setImage(imageAttrs as unknown as { src: string })
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
      <GallerySelectDialog
        open={galleryDialogOpen}
        onOpenChange={setGalleryDialogOpen}
        onInsert={({ galleryId, galleryName }) => {
          editor!.chain().focus().setGallery({ galleryId, galleryName }).run();
        }}
      />
      <FormSelectDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        onInsert={({ formId, formName }) => {
          editor!.chain().focus().setCmsForm({ formId, formName }).run();
        }}
      />
      <FormSubmissionsSelectDialog
        open={formSubmissionsDialogOpen}
        onOpenChange={setFormSubmissionsDialogOpen}
        onInsert={({ formId, formName, displayMode, pageSize, hideId }) => {
          editor!
            .chain()
            .focus()
            .setCmsFormSubmissions({
              formId,
              formName,
              displayMode,
              pageSize,
              hideId,
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
            {toolbarState.link && (
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
      onMouseDown={(event) => event.preventDefault()}
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
