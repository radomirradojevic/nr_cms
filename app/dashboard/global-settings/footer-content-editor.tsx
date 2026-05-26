"use client";

import { Mark, mergeAttributes, Node } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
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
import { useTiptapToolbarState } from "@/app/dashboard/content/_editors/tiptap-toolbar-state";
import { sanitizeCmsHtml } from "@/lib/content-sanitizer";

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
          variant={active ? "default" : "ghost"}
          size="sm"
          className={cn("h-8 w-8 p-0")}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function Sep() {
  return <div className="mx-1 h-6 w-px bg-border" />;
}

function preservedHtmlAttributes(element: HTMLElement) {
  const attrs: Record<string, string> = {};

  for (const attr of Array.from(element.attributes)) {
    if (
      attr.name === "class" ||
      attr.name === "style" ||
      attr.name === "id" ||
      attr.name.startsWith("data-") ||
      attr.name.startsWith("aria-")
    ) {
      attrs[attr.name] = attr.value;
    }
  }

  return attrs;
}

function htmlFromElement(element: Element) {
  return element.outerHTML;
}

function elementFromHtml(html: string, fallbackTag: string) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  const element = template.content.firstElementChild;

  if (element instanceof HTMLElement || element instanceof SVGElement) {
    return element;
  }

  return document.createElement(fallbackTag);
}

function serializeFooterEditorDom(root: HTMLElement) {
  const clone = root.cloneNode(true) as HTMLElement;

  clone.querySelectorAll("[data-footer-icon-wrapper]").forEach((node) => {
    node.replaceWith(...Array.from(node.childNodes));
  });
  clone
    .querySelectorAll(".ProseMirror-trailingBreak")
    .forEach((node) => node.remove());
  clone.removeAttribute("contenteditable");
  clone.removeAttribute("translate");
  clone.removeAttribute("tabindex");
  clone.removeAttribute("role");
  clone.classList.remove("ProseMirror", "ProseMirror-focused");

  return sanitizeCmsHtml(clone.innerHTML);
}

const preservedAttrs = {
  htmlAttrs: {
    default: {},
    parseHTML: (element: HTMLElement) => preservedHtmlAttributes(element),
    renderHTML: (attrs: { htmlAttrs?: Record<string, string> }) =>
      attrs.htmlAttrs ?? {},
  },
};

const FooterHtmlBlock = Node.create({
  name: "footerHtmlBlock",
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      ...preservedAttrs,
      tagName: {
        default: "div",
        parseHTML: (element: HTMLElement) =>
          element.tagName.toLowerCase() || "div",
      },
    };
  },

  parseHTML() {
    return [
      { tag: "div", priority: 100 },
      { tag: "section", priority: 100 },
      { tag: "nav", priority: 100 },
      { tag: "footer", priority: 100 },
      { tag: "address", priority: 100 },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { tagName, htmlAttrs } = node.attrs as {
      tagName: string;
      htmlAttrs?: Record<string, string>;
    };

    return [
      tagName || "div",
      mergeAttributes(htmlAttrs ?? {}, HTMLAttributes),
      0,
    ];
  },
});

const FooterSpan = Mark.create({
  name: "footerSpan",

  addAttributes() {
    return preservedAttrs;
  },

  parseHTML() {
    return [{ tag: "span", priority: 100 }];
  },

  renderHTML({ mark, HTMLAttributes }) {
    const { htmlAttrs } = mark.attrs as {
      htmlAttrs?: Record<string, string>;
    };

    return ["span", mergeAttributes(htmlAttrs ?? {}, HTMLAttributes), 0];
  },
});

const FooterIcon = Node.create({
  name: "footerIcon",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      ...preservedAttrs,
      tagName: {
        default: "i",
        parseHTML: (element: HTMLElement) =>
          element.tagName.toLowerCase() || "i",
      },
      rawHtml: {
        default: null,
        parseHTML: (element: HTMLElement | SVGElement) =>
          htmlFromElement(element),
      },
    };
  },

  parseHTML() {
    return [
      { tag: "i", priority: 100 },
      { tag: "svg", priority: 100 },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { tagName, htmlAttrs, rawHtml } = node.attrs as {
      tagName: string;
      htmlAttrs?: Record<string, string>;
      rawHtml?: string | null;
    };

    if (rawHtml?.startsWith("<svg")) {
      return [
        "svg",
        mergeAttributes(htmlAttrs ?? {}, HTMLAttributes, {
          "data-footer-icon": "svg",
        }),
      ];
    }

    return [tagName || "i", mergeAttributes(htmlAttrs ?? {}, HTMLAttributes)];
  },

  addNodeView() {
    return ({ node }) => {
      const { tagName, rawHtml, htmlAttrs } = node.attrs as {
        tagName: string;
        rawHtml?: string | null;
        htmlAttrs?: Record<string, string>;
      };
      const icon = rawHtml
        ? elementFromHtml(rawHtml, tagName || "i")
        : document.createElement(tagName || "i");

      Object.entries(htmlAttrs ?? {}).forEach(([name, value]) => {
        icon.setAttribute(name, value);
      });
      icon.setAttribute("contenteditable", "false");

      if (icon instanceof HTMLElement) {
        return { dom: icon };
      }

      const dom = document.createElement("span");
      dom.dataset.footerIconWrapper = "true";
      dom.setAttribute("contenteditable", "false");
      dom.append(icon);

      return { dom };
    };
  },
});

const footerEditorExtensions = [
  StarterKit.configure({
    link: { openOnClick: false, autolink: true },
    underline: false,
  }),
  FooterHtmlBlock,
  FooterSpan,
  FooterIcon,
  Underline,
  TextAlign.configure({ types: ["heading", "paragraph", "footerHtmlBlock"] }),
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
  const onChangeRef = useRef(onChange);
  const pendingEditorHtmlRef = useRef<string | null>(null);
  const focusVisualEditorRef = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

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
          "cms-content min-w-0 max-w-full min-h-[160px] text-sm caret-foreground focus:outline-none focus-visible:outline-none [&_a]:underline [&_a]:hover:text-foreground",
      },
    },
    onUpdate: ({ editor }) => {
      const next = serializeFooterEditorDom(editor.view.dom);
      pendingEditorHtmlRef.current = next;
      onChangeRef.current(next);
    },
  });
  const toolbarState = useTiptapToolbarState(editor);

  // Keep TipTap hydrated from the stored HTML, but do not feed raw source-mode
  // edits through TipTap on every keystroke. TipTap can normalize unsupported
  // markup, and that normalization must not erase the saved source value.
  useEffect(() => {
    if (!editor) return;
    if (htmlMode) return;

    const current = serializeFooterEditorDom(editor.view.dom);
    if (pendingEditorHtmlRef.current) {
      if (pendingEditorHtmlRef.current === value) {
        pendingEditorHtmlRef.current = null;
        return;
      } else if (pendingEditorHtmlRef.current === current) {
        return;
      }
    }

    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, htmlMode, value]);

  useEffect(() => {
    if (!editor || htmlMode || !focusVisualEditorRef.current) return;

    focusVisualEditorRef.current = false;
    const frame = requestAnimationFrame(() => {
      editor.commands.focus("end");
    });

    return () => cancelAnimationFrame(frame);
  }, [editor, htmlMode]);

  if (!editor) return null;

  function toggleHtmlMode() {
    if (!htmlMode) {
      setHtmlSource(value || "");
    } else {
      const nextHtml = sanitizeCmsHtml(htmlSource || "");
      editor!.commands.setContent(nextHtml, { emitUpdate: false });
      pendingEditorHtmlRef.current = nextHtml;
      focusVisualEditorRef.current = true;
      onChangeRef.current(nextHtml);
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
                  tooltip="Underline"
                  active={toolbarState.underline}
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                >
                  <UnderlineIcon className="h-4 w-4" />
                </Btn>
                <Btn
                  tooltip="Strikethrough"
                  active={toolbarState.strike}
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                >
                  <Strikethrough className="h-4 w-4" />
                </Btn>
                <Sep />
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
                  tooltip="Bullet list"
                  active={toolbarState.bulletList}
                  onClick={() =>
                    editor.chain().focus().toggleBulletList().run()
                  }
                >
                  <List className="h-4 w-4" />
                </Btn>
                <Btn
                  tooltip="Ordered list"
                  active={toolbarState.orderedList}
                  onClick={() =>
                    editor.chain().focus().toggleOrderedList().run()
                  }
                >
                  <ListOrdered className="h-4 w-4" />
                </Btn>
                <Sep />
                <Btn
                  tooltip="Insert / edit link"
                  active={toolbarState.link}
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
            className="footer-editor-source w-full min-h-[160px] p-4 font-mono text-sm bg-background text-foreground focus:outline-none focus-visible:outline-none resize-y"
            spellCheck={false}
          />
        ) : (
          <div
            className="footer-editor-preview site-footer bg-background px-4 py-8 text-sm text-muted-foreground sm:px-6"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                editor.chain().focus("end").run();
              }
            }}
          >
            <div className="site-content-container mx-auto flex w-full min-w-0 flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-6">
              <div className="w-full min-w-0" data-footer-editor-content>
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
            <DialogDescription className="sr-only">
              Add, update, or remove the selected footer content link.
            </DialogDescription>
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
            {toolbarState.link && (
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
