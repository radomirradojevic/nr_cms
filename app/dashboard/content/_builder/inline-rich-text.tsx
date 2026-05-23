"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { useNode } from "@craftjs/core";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  /**
   * When present, paragraph alignment is controlled by the parent block style
   * instead of TipTap paragraph attrs. Used by Text blocks so the inline
   * toolbar and Properties panel share one source of truth.
   */
  blockTextAlign?: TextAlignValue;
  onBlockTextAlignChange?: (value: TextAlignValue) => void;
};

type TextAlignValue = "left" | "center" | "right" | "justify" | undefined;

function stripParagraphTextAlign(value: JSONContent): JSONContent {
  let changed = false;

  function visit(node: JSONContent): JSONContent {
    const next: JSONContent = { ...node };
    if (next.attrs && "textAlign" in next.attrs) {
      const attrs = { ...next.attrs };
      delete attrs.textAlign;
      next.attrs = Object.keys(attrs).length > 0 ? attrs : undefined;
      changed = true;
    }
    if (next.content) {
      const content = next.content.map(visit);
      if (content.some((child, index) => child !== next.content?.[index])) {
        next.content = content;
      }
    }
    return next;
  }

  const next = visit(value);
  return changed ? next : value;
}

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
  blockTextAlign,
  onBlockTextAlignChange,
}: Props) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [focused, setFocused] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Read selection state from the nearest Craft.js node so the toolbar can
  // stay visible whenever the surrounding block is selected (not only while
  // text is highlighted).
  const { selected } = useNode((n) => ({
    selected: n.events.selected,
  }));

  useEffect(() => {
    setMounted(true);
  }, []);

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
    const nextValue =
      value && onBlockTextAlignChange && blockTextAlign !== undefined
        ? stripParagraphTextAlign(value)
        : value;
    if (nextValue && JSON.stringify(current) !== JSON.stringify(nextValue)) {
      editor.commands.setContent(nextValue, { emitUpdate: false });
    }
    if (
      value &&
      nextValue &&
      nextValue !== value &&
      JSON.stringify(nextValue) !== JSON.stringify(value)
    ) {
      onChange(nextValue);
    }
  }, [value, editor, onChange, onBlockTextAlignChange, blockTextAlign]);

  function applyTextAlign(value: Exclude<TextAlignValue, undefined>) {
    if (onBlockTextAlignChange) {
      const current = editor!.getJSON();
      const next = stripParagraphTextAlign(current);
      if (next !== current) {
        editor!.commands.setContent(next, { emitUpdate: false });
        onChange(next);
      }
      onBlockTextAlignChange(value);
      editor!.commands.focus();
      return;
    }
    editor!.chain().focus().setTextAlign(value).run();
  }

  function alignActive(value: Exclude<TextAlignValue, undefined>) {
    return onBlockTextAlignChange
      ? blockTextAlign === value
      : editor!.isActive({ textAlign: value });
  }

  const toolbarVisible = !!editor && (selected || focused);

  // Track the content wrapper's viewport position so the portal-rendered
  // toolbar can sit above it. We use `position: fixed` coordinates so the
  // toolbar is fully isolated from any ancestor styling (color, opacity,
  // background, transforms) applied by NodeWrap or the Colors block panel.
  useLayoutEffect(() => {
    if (!toolbarVisible) {
      setToolbarPos(null);
      return;
    }
    const el = contentRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setToolbarPos({ top: rect.top, left: rect.left });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, [toolbarVisible]);

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
      <div ref={contentRef} className="block-content relative">
        <EditorContent editor={editor} />
      </div>
      {mounted &&
        toolbarVisible &&
        toolbarPos &&
        createPortal(
          <div
            // Fixed positioning + portal to body so this element is NOT a
            // descendant of any NodeWrap that sets color/opacity/background.
            // Explicit color + opacity reset prevents any leaked inheritance
            // from CSS rules higher up the tree.
            style={{
              position: "fixed",
              top: toolbarPos.top,
              left: toolbarPos.left,
              transform: "translateY(calc(-100% - 8px))",
              zIndex: 50,
              color: "var(--popover-foreground)",
              opacity: 1,
            }}
            className="block-toolbar flex items-center gap-1 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
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
              active={alignActive("left")}
              onClick={() => applyTextAlign("left")}
              title="Align left"
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </BtnInline>
            <BtnInline
              active={alignActive("center")}
              onClick={() => applyTextAlign("center")}
              title="Align center"
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </BtnInline>
            <BtnInline
              active={alignActive("right")}
              onClick={() => applyTextAlign("right")}
              title="Align right"
            >
              <AlignRight className="h-3.5 w-3.5" />
            </BtnInline>
            {!singleLine && (
              <BtnInline
                active={alignActive("justify")}
                onClick={() => applyTextAlign("justify")}
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
          </div>,
          document.body,
        )}
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
