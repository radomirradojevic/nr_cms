"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor, JSONContent } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Code2,
  FileCode2,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  Palette,
  Quote,
  Strikethrough,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Video as VideoIcon,
  LayoutGrid,
  Columns3,
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
  Trash2,
} from "lucide-react";
import { emptyTiptapJson } from "./tiptap-extensions";
import { tiptapClientExtensions } from "./tiptap-client-extensions";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTiptapToolbarState } from "./tiptap-toolbar-state";
import type { VideoAlignment, VideoProvider } from "./video-extension";
import type { LayoutKind } from "./layout-extension";
import { layoutPresets } from "./layout-presets";
import {
  CODE_LANGUAGES,
  languageForTiptap,
  normalizeCodeLanguage,
  type CodeLanguage,
} from "./code-languages";
import { sanitizeTiptapHtml } from "./sanitize-tiptap-html";

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

type ImageDialogValues = {
  src: string;
  alt?: string | null;
  width?: string | null;
  height?: string | null;
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
  hideSubmitted: boolean;
};

type EditingNode<T> = {
  pos: number;
  values: T;
};

type EditableEmbedType =
  | "image"
  | "video"
  | "gallery"
  | "cmsForm"
  | "cmsFormSubmissions";

type SelectableEmbedType = EditableEmbedType | "codeBlock";

const selectableEmbedLabels: Record<SelectableEmbedType, string> = {
  image: "Image",
  video: "Video",
  gallery: "Gallery",
  cmsForm: "Form",
  cmsFormSubmissions: "Form Submission",
  codeBlock: "Code Block",
};

const TEXT_COLORS = [
  { value: "#f8fafc", label: "Snow" },
  { value: "#cbd5e1", label: "Mist" },
  { value: "#94a3b8", label: "Slate" },
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Gold" },
  { value: "#22c55e", label: "Green" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#38bdf8", label: "Sky" },
  { value: "#818cf8", label: "Indigo" },
  { value: "#c084fc", label: "Violet" },
  { value: "#f472b6", label: "Pink" },
] as const;

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
  const [editingImage, setEditingImage] =
    useState<EditingNode<ImageDialogValues> | null>(null);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<EditingVideo | null>(null);
  const [embedOverlay, setEmbedOverlay] = useState<{
    pos: number;
    type: SelectableEmbedType;
    top: number;
    left: number;
  } | null>(null);
  const [deletingEmbed, setDeletingEmbed] = useState<{
    pos: number;
    type: SelectableEmbedType;
  } | null>(null);
  const [layoutOverlay, setLayoutOverlay] = useState<{
    pos: number;
    top: number;
    left: number;
    visible: boolean;
  } | null>(null);
  const [deletingLayoutPos, setDeletingLayoutPos] = useState<number | null>(
    null,
  );
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
  const [layoutDialogOpen, setLayoutDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const onChangeRef = useRef(onChange);
  const layoutOverlayRef = useRef(layoutOverlay);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    layoutOverlayRef.current = layoutOverlay;
  }, [layoutOverlay]);

  const editor = useEditor({
    extensions: tiptapClientExtensions,
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
      const nextOverlay = {
        pos: selected.pos,
        type: selected.type,
        top: nodeRect.top - editorRect.top + 8,
        left:
          nodeRect.right -
          editorRect.left -
          (isEditableEmbedType(selected.type) ? 76 : 40),
      };

      setEmbedOverlay((current) =>
        current &&
        current.pos === nextOverlay.pos &&
        current.type === nextOverlay.type &&
        current.top === nextOverlay.top &&
        current.left === nextOverlay.left
          ? current
          : nextOverlay,
      );
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

  useEffect(() => {
    if (!editor) return;

    const showLayoutOverlay = (layout: { pos: number } | null) => {
      if (!layout) {
        setLayoutOverlay((current) =>
          current ? { ...current, visible: false } : null,
        );
        return;
      }

      const nodeElement = editor.view.nodeDOM(layout.pos);
      if (!(nodeElement instanceof HTMLElement)) {
        setLayoutOverlay((current) =>
          current ? { ...current, visible: false } : null,
        );
        return;
      }

      const editorRect = editor.view.dom.getBoundingClientRect();
      const nodeRect = nodeElement.getBoundingClientRect();
      setLayoutOverlay({
        pos: layout.pos,
        top: nodeRect.top - editorRect.top + 6,
        left: nodeRect.right - editorRect.left - 34,
        visible: true,
      });
    };

    const syncLayoutOverlay = () => {
      const selected = getSelectedLayout(editor);
      if (selected) {
        showLayoutOverlay(selected);
        return;
      }

      setLayoutOverlay((current) =>
        current ? { ...current, visible: false } : null,
      );
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (!(event.target instanceof HTMLElement)) return;
      if (event.target.closest("[data-layout-delete-button]")) return;
      if (!event.target.classList.contains("cms-layout-section")) return;

      const layout = getLayoutFromElement(editor, event.target);
      if (!layout) return;

      event.preventDefault();
      const tr = editor.state.tr.setSelection(
        NodeSelection.create(editor.state.doc, layout.pos),
      );
      editor.view.dispatch(tr);
    };

    const handleSelectionUpdate = () => syncLayoutOverlay();
    const handleTransaction = () => syncLayoutOverlay();
    const handleResize = () => syncLayoutOverlay();

    editor.view.dom.addEventListener("mousedown", handleMouseDown);
    editor.on("selectionUpdate", handleSelectionUpdate);
    editor.on("transaction", handleTransaction);
    window.addEventListener("resize", handleResize);
    syncLayoutOverlay();

    return () => {
      editor.view.dom.removeEventListener("mousedown", handleMouseDown);
      editor.off("selectionUpdate", handleSelectionUpdate);
      editor.off("transaction", handleTransaction);
      window.removeEventListener("resize", handleResize);
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

  function applyTextColor(color: string) {
    editor!.chain().focus().setColor(color).run();
  }

  function clearTextColor() {
    editor!.chain().focus().unsetColor().run();
  }

  function toggleCodeBlock() {
    const language = normalizeCodeLanguage(
      editor!.getAttributes("codeBlock").language,
    );

    editor!
      .chain()
      .focus()
      .toggleCodeBlock(
        languageForTiptap(language)
          ? { language: languageForTiptap(language)! }
          : undefined,
      )
      .run();
  }

  function setCodeLanguage(language: CodeLanguage) {
    const tiptapLanguage = languageForTiptap(language);

    editor!
      .chain()
      .focus()
      .setCodeBlock(tiptapLanguage ? { language: tiptapLanguage } : undefined)
      .run();
  }

  function toggleHtmlMode() {
    if (!htmlMode) {
      setHtmlSource(editor!.getHTML());
    } else {
      editor!.commands.setContent(sanitizeTiptapHtml(htmlSource));
    }
    setHtmlMode((prev) => !prev);
  }

  function openVideoDialog() {
    const selected = getSelectedVideo(editor!);
    setEditingVideo(selected);
    setVideoDialogOpen(true);
  }

  function openImageDialog() {
    setEditingImage(getSelectedImage(editor!));
    setImageDialogOpen(true);
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

  function insertLayout(layout: LayoutKind) {
    editor!.chain().focus().insertLayoutSection({ layout }).run();
    setLayoutDialogOpen(false);
  }

  function deleteLayout(pos: number) {
    const deleted = editor!.commands.command(({ state, tr, dispatch }) => {
      const node = state.doc.nodeAt(pos);
      if (!node || node.type.name !== "layoutSection") return false;

      tr.delete(pos, pos + node.nodeSize).scrollIntoView();
      dispatch?.(tr);
      return true;
    });

    if (deleted) {
      setLayoutOverlay(null);
      editor!.commands.focus();
    }
    setDeletingLayoutPos(null);
  }

  function requestEmbedDelete(embed: {
    pos: number;
    type: SelectableEmbedType;
  }) {
    setDeletingEmbed(embed);
  }

  function confirmEmbedDelete() {
    if (!deletingEmbed) return;

    const deleted = editor!.commands.command(({ state, tr, dispatch }) => {
      const node = state.doc.nodeAt(deletingEmbed.pos);
      if (!node || node.type.name !== deletingEmbed.type) return false;

      tr.delete(deletingEmbed.pos, deletingEmbed.pos + node.nodeSize);
      tr.scrollIntoView();
      dispatch?.(tr);
      return true;
    });

    if (deleted) {
      setEmbedOverlay(null);
      editor!.commands.focus();
    }
    setDeletingEmbed(null);
  }

  function showHoveredLayout(target: EventTarget | null) {
    if (!editor || !(target instanceof Element)) return;
    if (target.closest("[data-layout-delete-button]")) return;

    const layoutElement = target.closest(".cms-layout-section");
    const layout =
      layoutElement instanceof HTMLElement
        ? getLayoutFromElement(editor, layoutElement)
        : null;

    if (!layout) {
      if (!getSelectedLayout(editor)) {
        setLayoutOverlay((current) =>
          current ? { ...current, visible: false } : null,
        );
      }
      return;
    }

    const nodeElement = editor.view.nodeDOM(layout.pos);
    if (!(nodeElement instanceof HTMLElement)) return;

    const editorRect = editor.view.dom.getBoundingClientRect();
    const nodeRect = nodeElement.getBoundingClientRect();
    setLayoutOverlay({
      pos: layout.pos,
      top: nodeRect.top - editorRect.top + 6,
      left: nodeRect.right - editorRect.left - 34,
      visible: true,
    });
  }

  function hideHoveredLayout() {
    if (editor && getSelectedLayout(editor)) return;
    setLayoutOverlay((current) =>
      current ? { ...current, visible: false } : null,
    );
  }

  function openSelectedEmbedDialog(type: SelectableEmbedType) {
    if (type === "image") {
      openImageDialog();
    } else if (type === "video") {
      openVideoDialog();
    } else if (type === "gallery") {
      openGalleryDialog();
    } else if (type === "cmsForm") {
      openFormDialog();
    } else if (type === "cmsFormSubmissions") {
      openFormSubmissionsDialog();
    }
  }

  function saveImage(values: ImageDialogValues) {
    const attrs: Record<string, unknown> = {
      src: values.src,
      alt: values.alt || undefined,
      ...(values.width ? { width: values.width } : {}),
      ...(values.height ? { height: values.height } : {}),
    };

    if (
      updateSelectedNode(
        editingImage as EditingNode<Record<string, unknown>> | null,
        "image",
        attrs,
      )
    ) {
      setEditingImage(null);
      return;
    }

    editor!
      .chain()
      .focus()
      .setImage(attrs as unknown as { src: string })
      .run();
    setEditingImage(null);
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
      hideSubmitted: values.hideSubmitted,
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
              <Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant={toolbarState.textColor ? "default" : "ghost"}
                        size="sm"
                        className="relative h-8 w-8 p-0"
                        onMouseDown={(event) => event.preventDefault()}
                      >
                        <Palette className="h-4 w-4" />
                        <span
                          className="absolute bottom-1 h-1 w-4 rounded-full border border-background"
                          style={{
                            backgroundColor:
                              toolbarState.textColor ?? "currentColor",
                          }}
                        />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Text color</TooltipContent>
                </Tooltip>
                <PopoverContent align="start" className="w-56">
                  <div className="grid grid-cols-6 gap-1">
                    {TEXT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        aria-label={color.label}
                        title={color.label}
                        className="h-7 w-7 rounded-md border border-border ring-offset-background transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        style={{ backgroundColor: color.value }}
                        onClick={() => applyTextColor(color.value)}
                      />
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full justify-start"
                    onClick={clearTextColor}
                  >
                    Theme default
                  </Button>
                </PopoverContent>
              </Popover>
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
              <Btn
                tooltip="Decrease indent"
                active={false}
                onClick={() => editor.chain().focus().decreaseIndent().run()}
              >
                <IndentDecrease className="h-4 w-4" />
              </Btn>
              <Btn
                tooltip="Increase indent"
                active={toolbarState.indentLevel > 0}
                onClick={() => editor.chain().focus().increaseIndent().run()}
              >
                <IndentIncrease className="h-4 w-4" />
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
                tooltip="Code block"
                active={toolbarState.codeBlock}
                onClick={toggleCodeBlock}
              >
                <FileCode2 className="h-4 w-4" />
              </Btn>
              {toolbarState.codeBlock && (
                <Select
                  value={normalizeCodeLanguage(
                    editor.getAttributes("codeBlock").language,
                  )}
                  onValueChange={(value) =>
                    setCodeLanguage(normalizeCodeLanguage(value))
                  }
                >
                  <SelectTrigger
                    size="sm"
                    className="h-8 min-w-32 border-border bg-background"
                    aria-label="Code language"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CODE_LANGUAGES.map((language) => (
                      <SelectItem key={language.value} value={language.value}>
                        {language.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
              tooltip={toolbarState.image ? "Edit image" : "Insert image"}
              active={toolbarState.image}
              onClick={openImageDialog}
            >
              <ImageIcon className="h-4 w-4" />
            </Btn>
          )}
          {!htmlMode && (
            <Btn
              tooltip="Insert Layout"
              active={toolbarState.layoutSection}
              onClick={() => setLayoutDialogOpen(true)}
            >
              <Columns3 className="h-4 w-4" />
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
        <div
          className="relative"
          onMouseMove={(event) => showHoveredLayout(event.target)}
          onMouseLeave={hideHoveredLayout}
        >
          <EditorContent editor={editor} />
          {embedOverlay && (
            <TooltipProvider>
              <div
                className="absolute z-10 flex overflow-hidden rounded-lg border bg-background shadow-sm"
                style={{ top: embedOverlay.top, left: embedOverlay.left }}
              >
                {isEditableEmbedType(embedOverlay.type) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        aria-label={`Edit ${selectableEmbedLabels[embedOverlay.type]}`}
                        className="h-8 w-8 rounded-none border-0 shadow-none"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() =>
                          openSelectedEmbedDialog(embedOverlay.type)
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Edit {selectableEmbedLabels[embedOverlay.type]}
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      aria-label={`Delete ${selectableEmbedLabels[embedOverlay.type]}`}
                      className="h-8 w-8 rounded-none border-0 border-l border-border text-muted-foreground shadow-none hover:text-destructive"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => requestEmbedDelete(embedOverlay)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Delete {selectableEmbedLabels[embedOverlay.type]}
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  aria-label="Delete layout block"
                  data-layout-delete-button
                  className="pointer-events-auto absolute z-30 h-7 w-7 border bg-background/95 text-muted-foreground shadow-sm transition-opacity hover:text-destructive"
                  style={{
                    top: layoutOverlay?.top ?? 0,
                    left: layoutOverlay?.left ?? 0,
                    opacity: layoutOverlay?.visible ? 1 : 0,
                    visibility: layoutOverlay?.visible ? "visible" : "hidden",
                  }}
                  onMouseEnter={() => {
                    const current = layoutOverlayRef.current;
                    if (!current) return;
                    setLayoutOverlay({ ...current, visible: true });
                  }}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!layoutOverlayRef.current?.visible) return;
                    setDeletingLayoutPos(layoutOverlayRef.current.pos);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete layout</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      <ImageInsertDialog
        key={
          imageDialogOpen
            ? `${editingImage ? "edit" : "insert"}-${editingImage?.pos ?? "new"}`
            : "image-closed"
        }
        open={imageDialogOpen}
        onOpenChange={(open) => {
          setImageDialogOpen(open);
          if (!open) setEditingImage(null);
        }}
        mode={editingImage ? "edit" : "insert"}
        initialValues={editingImage?.values ?? null}
        onInsert={saveImage}
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
      <Dialog open={layoutDialogOpen} onOpenChange={setLayoutDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Insert Layout</DialogTitle>
            <DialogDescription>
              Choose a responsive column layout for this blog post.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {layoutPresets.map((option) => (
              <button
                key={option.value}
                type="button"
                className="rounded-md border bg-background p-3 text-left transition hover:border-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => insertLayout(option.value)}
              >
                <span className="text-sm font-medium">{option.label}</span>
                <span
                  aria-hidden="true"
                  className="mt-3 grid h-16 gap-2"
                  style={{ gridTemplateColumns: option.tracks }}
                >
                  {option.tracks.split(" ").map((_, index) => (
                    <span
                      key={index}
                      className="rounded-sm border border-dashed border-muted-foreground/40 bg-muted/60"
                    />
                  ))}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
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
      <AlertDialog
        open={deletingEmbed !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingEmbed(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete embedded block?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this{" "}
              {deletingEmbed
                ? selectableEmbedLabels[deletingEmbed.type]
                : "embedded block"}
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmEmbedDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={deletingLayoutPos !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingLayoutPos(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete layout?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this Layout?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deletingLayoutPos !== null) deleteLayout(deletingLayoutPos);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function getSelectedImage(
  editor: Editor,
): EditingNode<ImageDialogValues> | null {
  const selection = getSelectedNode(editor, "image");
  if (!selection) return null;

  return {
    pos: selection.pos,
    values: {
      src: typeof selection.attrs.src === "string" ? selection.attrs.src : "",
      alt: typeof selection.attrs.alt === "string" ? selection.attrs.alt : "",
      width:
        typeof selection.attrs.width === "string" ||
        typeof selection.attrs.width === "number"
          ? String(selection.attrs.width)
          : "",
      height:
        typeof selection.attrs.height === "string" ||
        typeof selection.attrs.height === "number"
          ? String(selection.attrs.height)
          : "",
    },
  };
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
      hideSubmitted: selection.attrs.hideSubmitted === true,
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

function getSelectedLayout(editor: Editor): { pos: number } | null {
  const selection = getSelectedNode(editor, "layoutSection");
  if (!selection) return null;

  return { pos: selection.pos };
}

function getLayoutFromElement(
  editor: Editor,
  element: HTMLElement,
): { pos: number } | null {
  let found: { pos: number } | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (found || node.type.name !== "layoutSection") return false;
    if (editor.view.nodeDOM(pos) === element) {
      found = { pos };
      return false;
    }
    return true;
  });

  return found;
}

function getSelectedEditableEmbed(editor: Editor): {
  pos: number;
  type: SelectableEmbedType;
} | null {
  const { selection } = editor.state;
  if (!(selection instanceof NodeSelection)) {
    const codeBlock = getActiveCodeBlock(editor);
    return codeBlock ? { pos: codeBlock.pos, type: "codeBlock" } : null;
  }

  const type = selection.node.type.name;
  if (
    type !== "image" &&
    type !== "video" &&
    type !== "gallery" &&
    type !== "cmsForm" &&
    type !== "cmsFormSubmissions" &&
    type !== "codeBlock"
  ) {
    return null;
  }

  return {
    pos: selection.from,
    type,
  };
}

function getActiveCodeBlock(editor: Editor): { pos: number } | null {
  const { $from, $to } = editor.state.selection;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name !== "codeBlock") continue;
    if ($to.depth < depth || $to.node(depth).type.name !== "codeBlock") {
      return null;
    }

    const pos = $from.before(depth);
    return $to.before(depth) === pos ? { pos } : null;
  }

  return null;
}

function isEditableEmbedType(
  type: SelectableEmbedType,
): type is EditableEmbedType {
  return type !== "codeBlock";
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
