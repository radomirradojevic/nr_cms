"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor, JSONContent } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
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
  Pencil,
} from "lucide-react";
import { tiptapExtensions, emptyTiptapJson } from "./tiptap-extensions";
import { TableMenu } from "./table-menu";
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
import { useTiptapToolbarState } from "./tiptap-toolbar-state";
import type { VideoAlignment, VideoProvider } from "./video-extension";

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

type VideoDialogValues = {
  src: string;
  provider: VideoProvider;
  width?: string | null;
  height?: string | null;
  alignment?: VideoAlignment | null;
};

type EditingVideo = {
  pos: number;
  values: VideoDialogValues;
};

type GalleryDialogValues = {
  galleryId: string;
  galleryName?: string | null;
};

type FormDialogValues = {
  formId: string;
  formName?: string | null;
};

type FormSubmissionsDialogValues = {
  formId: string;
  formName?: string | null;
  displayMode: "table" | "card";
  pageSize: number;
  hideId: boolean;
};

type EditingNode<T> = {
  pos: number;
  values: T;
};

type EditableEmbedType = "video" | "gallery" | "cmsForm" | "cmsFormSubmissions";

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
  const [editingVideo, setEditingVideo] = useState<EditingVideo | null>(null);
  const [embedOverlay, setEmbedOverlay] = useState<{
    type: EditableEmbedType;
    top: number;
    left: number;
  } | null>(null);
  const [galleryDialogOpen, setGalleryDialogOpen] = useState(false);
  const [editingGallery, setEditingGallery] =
    useState<EditingNode<GalleryDialogValues> | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingForm, setEditingForm] =
    useState<EditingNode<FormDialogValues> | null>(null);
  const [formSubmissionsDialogOpen, setFormSubmissionsDialogOpen] =
    useState(false);
  const [editingFormSubmissions, setEditingFormSubmissions] =
    useState<EditingNode<FormSubmissionsDialogValues> | null>(null);
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
  const toolbarState = useTiptapToolbarState(editor);

  // Register the value getter exactly once — the parent reads from this
  // at submit time without subscribing to per-keystroke updates.
  useEffect(() => {
    if (!editor) return;
    registerGetValue?.(() => editor.getJSON());
  }, [editor, registerGetValue]);

  useEffect(() => {
    if (!editor) return;

    const syncEmbedOverlay = () => {
      const selected = getSelectedEditableEmbed(editor);
      if (!selected) {
        setEmbedOverlay(null);
        return;
      }

      const nodeElement = editor.view.nodeDOM(selected.pos);
      if (!(nodeElement instanceof HTMLElement)) {
        setEmbedOverlay(null);
        return;
      }

      const editorRect = editor.view.dom.getBoundingClientRect();
      const nodeRect = nodeElement.getBoundingClientRect();
      setEmbedOverlay({
        type: selected.type,
        top: nodeRect.top - editorRect.top + 8,
        left: nodeRect.right - editorRect.left - 40,
      });
    };

    editor.on("selectionUpdate", syncEmbedOverlay);
    editor.on("transaction", syncEmbedOverlay);
    window.addEventListener("resize", syncEmbedOverlay);
    syncEmbedOverlay();

    return () => {
      editor.off("selectionUpdate", syncEmbedOverlay);
      editor.off("transaction", syncEmbedOverlay);
      window.removeEventListener("resize", syncEmbedOverlay);
    };
  }, [editor]);

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

  function openVideoDialog() {
    const selected = getSelectedVideo(editor!);
    setEditingVideo(selected);
    setVideoDialogOpen(true);
  }

  function openGalleryDialog() {
    setEditingGallery(getSelectedGallery(editor!));
    setGalleryDialogOpen(true);
  }

  function openFormDialog() {
    setEditingForm(getSelectedForm(editor!));
    setFormDialogOpen(true);
  }

  function openFormSubmissionsDialog() {
    setEditingFormSubmissions(getSelectedFormSubmissions(editor!));
    setFormSubmissionsDialogOpen(true);
  }

  function openSelectedEmbedDialog(type: EditableEmbedType) {
    if (type === "video") {
      openVideoDialog();
    } else if (type === "gallery") {
      openGalleryDialog();
    } else if (type === "cmsForm") {
      openFormDialog();
    } else {
      openFormSubmissionsDialog();
    }
  }

  function saveVideo(values: VideoDialogValues) {
    if (editingVideo) {
      const updated = editor!.commands.command(({ state, tr, dispatch }) => {
        const node = state.doc.nodeAt(editingVideo.pos);
        if (!node || node.type.name !== "video") return false;

        tr.setNodeMarkup(editingVideo.pos, undefined, {
          src: values.src,
          provider: values.provider,
          width: values.width ?? null,
          height: values.height ?? null,
          alignment: values.alignment ?? "center",
        });
        tr.setSelection(NodeSelection.create(tr.doc, editingVideo.pos));
        dispatch?.(tr);
        return true;
      });

      if (updated) {
        editor!.commands.focus();
        setEditingVideo(null);
        return;
      }
    }

    editor!
      .chain()
      .focus()
      .setVideo({
        src: values.src,
        provider: values.provider,
        ...(values.width ? { width: values.width } : {}),
        ...(values.height ? { height: values.height } : {}),
        alignment: values.alignment ?? "center",
      })
      .run();
    setEditingVideo(null);
  }

  function updateEditingVideoAlignment(alignment: VideoAlignment) {
    if (!editingVideo) return;

    editor!.commands.command(({ state, tr, dispatch }) => {
      const node = state.doc.nodeAt(editingVideo.pos);
      if (!node || node.type.name !== "video") return false;

      tr.setNodeMarkup(editingVideo.pos, undefined, {
        ...node.attrs,
        alignment,
      });
      tr.setSelection(NodeSelection.create(tr.doc, editingVideo.pos));
      dispatch?.(tr);
      return true;
    });

    setEditingVideo((current) =>
      current
        ? {
            ...current,
            values: {
              ...current.values,
              alignment,
            },
          }
        : current,
    );
  }

  function updateSelectedNode(
    editing: EditingNode<Record<string, unknown>> | null,
    typeName: string,
    attrs: Record<string, unknown>,
  ) {
    if (!editing) return false;

    const updated = editor!.commands.command(({ state, tr, dispatch }) => {
      const node = state.doc.nodeAt(editing.pos);
      if (!node || node.type.name !== typeName) return false;

      tr.setNodeMarkup(editing.pos, undefined, attrs);
      tr.setSelection(NodeSelection.create(tr.doc, editing.pos));
      dispatch?.(tr);
      return true;
    });

    if (updated) editor!.commands.focus();
    return updated;
  }

  function saveGallery(values: GalleryDialogValues) {
    const attrs = {
      galleryId: values.galleryId,
      galleryName: values.galleryName ?? "",
    };

    if (
      updateSelectedNode(
        editingGallery as EditingNode<Record<string, unknown>> | null,
        "gallery",
        attrs,
      )
    ) {
      setEditingGallery(null);
      return;
    }

    editor!.chain().focus().setGallery(attrs).run();
    setEditingGallery(null);
  }

  function saveForm(values: FormDialogValues) {
    const attrs = {
      formId: values.formId,
      formName: values.formName ?? "",
    };

    if (
      updateSelectedNode(
        editingForm as EditingNode<Record<string, unknown>> | null,
        "cmsForm",
        attrs,
      )
    ) {
      setEditingForm(null);
      return;
    }

    editor!.chain().focus().setCmsForm(attrs).run();
    setEditingForm(null);
  }

  function saveFormSubmissions(values: FormSubmissionsDialogValues) {
    const attrs = {
      formId: values.formId,
      formName: values.formName ?? "",
      displayMode: values.displayMode,
      pageSize: values.pageSize,
      hideId: values.hideId,
    };

    if (
      updateSelectedNode(
        editingFormSubmissions as EditingNode<Record<string, unknown>> | null,
        "cmsFormSubmissions",
        attrs,
      )
    ) {
      setEditingFormSubmissions(null);
      return;
    }

    editor!.chain().focus().setCmsFormSubmissions(attrs).run();
    setEditingFormSubmissions(null);
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
              <TableMenu editor={editor} toolbarState={toolbarState} />
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
              tooltip={toolbarState.video ? "Edit video" : "Insert video"}
              active={toolbarState.video}
              onClick={openVideoDialog}
            >
              <VideoIcon className="h-4 w-4" />
            </Btn>
          )}
          {!htmlMode && (
            <Btn
              tooltip={toolbarState.gallery ? "Edit gallery" : "Insert gallery"}
              active={toolbarState.gallery}
              onClick={openGalleryDialog}
            >
              <LayoutGrid className="h-4 w-4" />
            </Btn>
          )}
          {!htmlMode && (
            <Btn
              tooltip={toolbarState.cmsForm ? "Edit form" : "Insert form"}
              active={toolbarState.cmsForm}
              onClick={openFormDialog}
            >
              <FormInput className="h-4 w-4" />
            </Btn>
          )}
          {!htmlMode && (
            <Btn
              tooltip={
                toolbarState.cmsFormSubmissions
                  ? "Edit form submissions"
                  : "Insert form submissions"
              }
              active={toolbarState.cmsFormSubmissions}
              onClick={openFormSubmissionsDialog}
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
        <div className="relative">
          <EditorContent editor={editor} />
          {embedOverlay && (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              aria-label="Edit embedded block"
              className="absolute z-10 h-8 w-8 border shadow-sm"
              style={{ top: embedOverlay.top, left: embedOverlay.left }}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => openSelectedEmbedDialog(embedOverlay.type)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
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
        key={
          videoDialogOpen
            ? `${editingVideo ? "edit" : "insert"}-${editingVideo?.pos ?? "new"}`
            : "video-closed"
        }
        open={videoDialogOpen}
        onOpenChange={(open) => {
          setVideoDialogOpen(open);
          if (!open) setEditingVideo(null);
        }}
        mode={editingVideo ? "edit" : "insert"}
        initialValues={editingVideo?.values ?? null}
        onInsert={saveVideo}
        onAlignmentChange={updateEditingVideoAlignment}
      />
      <GallerySelectDialog
        key={
          galleryDialogOpen
            ? `${editingGallery ? "edit" : "insert"}-${editingGallery?.pos ?? "new"}`
            : "gallery-closed"
        }
        open={galleryDialogOpen}
        onOpenChange={(open) => {
          setGalleryDialogOpen(open);
          if (!open) setEditingGallery(null);
        }}
        mode={editingGallery ? "edit" : "insert"}
        initialValues={editingGallery?.values ?? null}
        onInsert={saveGallery}
      />
      <FormSelectDialog
        key={
          formDialogOpen
            ? `${editingForm ? "edit" : "insert"}-${editingForm?.pos ?? "new"}`
            : "form-closed"
        }
        open={formDialogOpen}
        onOpenChange={(open) => {
          setFormDialogOpen(open);
          if (!open) setEditingForm(null);
        }}
        mode={editingForm ? "edit" : "insert"}
        initialValues={editingForm?.values ?? null}
        onInsert={saveForm}
      />
      <FormSubmissionsSelectDialog
        key={
          formSubmissionsDialogOpen
            ? `${editingFormSubmissions ? "edit" : "insert"}-${
                editingFormSubmissions?.pos ?? "new"
              }`
            : "form-submissions-closed"
        }
        open={formSubmissionsDialogOpen}
        onOpenChange={(open) => {
          setFormSubmissionsDialogOpen(open);
          if (!open) setEditingFormSubmissions(null);
        }}
        mode={editingFormSubmissions ? "edit" : "insert"}
        initialValues={editingFormSubmissions?.values ?? null}
        onInsert={saveFormSubmissions}
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

function getSelectedVideo(editor: Editor): EditingVideo | null {
  const { selection } = editor.state;
  if (!(selection instanceof NodeSelection)) return null;
  if (selection.node.type.name !== "video") return null;

  return {
    pos: selection.from,
    values: {
      src:
        typeof selection.node.attrs.src === "string"
          ? selection.node.attrs.src
          : "",
      provider:
        selection.node.attrs.provider === "youtube" ? "youtube" : "file",
      width:
        typeof selection.node.attrs.width === "string"
          ? selection.node.attrs.width
          : null,
      height:
        typeof selection.node.attrs.height === "string"
          ? selection.node.attrs.height
          : null,
      alignment:
        selection.node.attrs.alignment === "left" ||
        selection.node.attrs.alignment === "right" ||
        selection.node.attrs.alignment === "center"
          ? selection.node.attrs.alignment
          : "center",
    },
  } satisfies EditingVideo;
}

function getSelectedGallery(
  editor: Editor,
): EditingNode<GalleryDialogValues> | null {
  const selection = getSelectedNode(editor, "gallery");
  if (!selection) return null;

  return {
    pos: selection.pos,
    values: {
      galleryId:
        typeof selection.attrs.galleryId === "string"
          ? selection.attrs.galleryId
          : "",
      galleryName:
        typeof selection.attrs.galleryName === "string"
          ? selection.attrs.galleryName
          : "",
    },
  };
}

function getSelectedForm(editor: Editor): EditingNode<FormDialogValues> | null {
  const selection = getSelectedNode(editor, "cmsForm");
  if (!selection) return null;

  return {
    pos: selection.pos,
    values: {
      formId:
        typeof selection.attrs.formId === "string"
          ? selection.attrs.formId
          : "",
      formName:
        typeof selection.attrs.formName === "string"
          ? selection.attrs.formName
          : "",
    },
  };
}

function getSelectedFormSubmissions(
  editor: Editor,
): EditingNode<FormSubmissionsDialogValues> | null {
  const selection = getSelectedNode(editor, "cmsFormSubmissions");
  if (!selection) return null;

  return {
    pos: selection.pos,
    values: {
      formId:
        typeof selection.attrs.formId === "string"
          ? selection.attrs.formId
          : "",
      formName:
        typeof selection.attrs.formName === "string"
          ? selection.attrs.formName
          : "",
      displayMode: selection.attrs.displayMode === "card" ? "card" : "table",
      pageSize:
        typeof selection.attrs.pageSize === "number"
          ? selection.attrs.pageSize
          : 5,
      hideId: selection.attrs.hideId !== false,
    },
  };
}

function getSelectedNode(editor: Editor, typeName: string) {
  const { selection } = editor.state;
  if (!(selection instanceof NodeSelection)) return null;
  if (selection.node.type.name !== typeName) return null;

  return {
    pos: selection.from,
    attrs: selection.node.attrs,
  };
}

function getSelectedEditableEmbed(editor: Editor): {
  pos: number;
  type: EditableEmbedType;
} | null {
  const { selection } = editor.state;
  if (!(selection instanceof NodeSelection)) return null;

  const type = selection.node.type.name;
  if (
    type !== "video" &&
    type !== "gallery" &&
    type !== "cmsForm" &&
    type !== "cmsFormSubmissions"
  ) {
    return null;
  }

  return {
    pos: selection.from,
    type,
  };
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
