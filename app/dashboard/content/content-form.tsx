"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { slugify } from "@/lib/utils";
import { hasRole, type Role } from "@/lib/roles";
import dynamic from "next/dynamic";
import { BlogEditor } from "./_editors/blog-editor";
import { ImageInsertDialog } from "./_editors/image-insert-dialog";
import { emptyTiptapJson } from "./_editors/tiptap-extensions";
import { emptyBuilderData, type BuilderData } from "./_builder/types";
import { ImageIcon } from "lucide-react";

// PageEditor is heavy and uses Craft.js + CodeMirror — load client-only.
const PageEditor = dynamic(
  () => import("./_builder/page-editor").then((m) => m.PageEditor),
  {
    ssr: false,
    loading: () => <div className="h-[600px] rounded-md border bg-muted/20" />,
  },
);
import {
  createContent,
  updateContent,
  type CreateContentInput,
  type UpdateContentInput,
} from "./actions";

export type ContentFormCategory = { id: string; name: string };

type Props = {
  mode: "create" | "edit";
  contentType: "page" | "blog_post";
  categories: ContentFormCategory[];
  currentUserRoles: Role[];
  initial?: {
    id: string;
    title: string;
    slug: string;
    categoryId: string;
    metaTitle: string | null;
    metaDescription: string | null;
    excerpt: string | null;
    coverImage: string | null;
    status: "published" | "unpublished" | "archived";
    homepage: boolean;
    contentJson: unknown;
  };
};

export function ContentForm({
  mode,
  contentType,
  categories,
  currentUserRoles,
  initial,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isAdmin = hasRole(currentUserRoles, "admin");
  const isPublisher = hasRole(currentUserRoles, "publisher");
  const canChooseStatus = isAdmin || isPublisher;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? categories[0]?.id ?? "",
  );
  const [metaTitle, setMetaTitle] = useState(initial?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(
    initial?.metaDescription ?? "",
  );
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [coverImage, setCoverImage] = useState(initial?.coverImage ?? "");
  const [status, setStatus] = useState<
    "published" | "unpublished" | "archived"
  >(initial?.status ?? "unpublished");
  const [homepage, setHomepage] = useState(initial?.homepage ?? false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);

  // Deep-clone initial.contentJson so we don't keep a reference to the
  // RSC-provided value. Otherwise round-tripping the same object back to a
  // server action turns it into a "temporary client reference" and reading
  // properties like `attrs.level` throws on the server.
  const [contentJson, setContentJson] = useState<unknown>(() => {
    if (initial?.contentJson != null) {
      return JSON.parse(JSON.stringify(initial.contentJson));
    }
    return contentType === "page" ? emptyBuilderData : emptyTiptapJson;
  });

  function onTitleChange(v: string) {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  function submit(shouldClose = true) {
    setError(null);
    if (!title.trim()) return setError("Title is required.");
    if (!slug.trim()) return setError("Slug is required.");
    if (!categoryId) return setError("Category is required.");

    const base = {
      categoryId,
      title: title.trim(),
      slug: slugify(slug),
      metaTitle: metaTitle || null,
      metaDescription: metaDescription || null,
      excerpt: excerpt || null,
      coverImage: coverImage || null,
      // Always send a freshly-serialized plain object. Otherwise objects
      // that originated from a server component (or were produced by tiptap
      // paste handlers) can be tagged as "temporary client references" by
      // React Flight and crash with "Cannot access X on the server" when the
      // server action tries to read their attrs.
      contentJson: JSON.parse(JSON.stringify(contentJson ?? null)),
    };

    startTransition(async () => {
      if (mode === "create") {
        const input: CreateContentInput = {
          ...base,
          contentType,
          ...(canChooseStatus ? { status } : {}),
          ...(isAdmin && contentType === "page" ? { homepage } : {}),
        };
        const r = await createContent(input);
        if (r.error) setError(r.error);
        else if (shouldClose) router.push("/dashboard/content");
      } else {
        const input: UpdateContentInput = {
          ...base,
          id: initial!.id,
          ...(canChooseStatus ? { status } : {}),
          ...(isAdmin && contentType === "page" ? { homepage } : {}),
        };
        const r = await updateContent(input);
        if (r.error) setError(r.error);
        else if (shouldClose) router.push("/dashboard/content");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {mode === "create" ? "Create" : "Edit"}{" "}
            {contentType === "page" ? "Page" : "Blog Post"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {contentType === "page"
              ? "Visual page builder."
              : "Rich-text blog post editor."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mode === "create" ? (
            <Button onClick={() => submit(true)} disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          ) : (
            <>
              <Button onClick={() => submit(false)} disabled={pending}>
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
              <Button
                onClick={() => submit(true)}
                disabled={pending}
                variant="secondary"
              >
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save and close
              </Button>
            </>
          )}
          <Button variant="outline" asChild disabled={pending}>
            <Link href="/dashboard/content">Cancel</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Enter title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              onBlur={() => setSlug(slugify(slug))}
              placeholder="url-slug"
            />
            <p className="text-xs text-muted-foreground">
              Public URL: <code>/{slug || "your-slug"}</code>
            </p>
          </div>

          {contentType === "blog_post" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={3}
                  placeholder="Short summary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cover">Cover image URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="cover"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="https://…"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCoverPickerOpen(true)}
                  >
                    <ImageIcon className="h-4 w-4" />
                    Browse
                  </Button>
                </div>
                {coverImage && (
                  <div className="rounded-md border bg-muted/20 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverImage}
                      alt="Cover preview"
                      className="max-h-40 rounded object-contain"
                    />
                  </div>
                )}
                <ImageInsertDialog
                  open={coverPickerOpen}
                  onOpenChange={setCoverPickerOpen}
                  onInsert={({ src }) => setCoverImage(src)}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Content</Label>
            {contentType === "page" ? (
              <PageEditor
                value={contentJson}
                onChange={(d: BuilderData) => setContentJson(d)}
              />
            ) : (
              <BlogEditor
                value={contentJson as never}
                onChange={(j) => setContentJson(j)}
              />
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border p-4 space-y-4">
            <h3 className="text-sm font-semibold">Publishing</h3>
            {canChooseStatus ? (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as typeof status)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpublished">Unpublished</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Authors create unpublished content. Ask a publisher or admin to
                publish.
              </p>
            )}

            {isAdmin && contentType === "page" && (
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="homepage" className="text-sm">
                    Set as homepage
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Only one page can be the homepage. Must be published.
                  </p>
                </div>
                <Switch
                  id="homepage"
                  checked={homepage}
                  onCheckedChange={setHomepage}
                  disabled={status !== "published"}
                />
              </div>
            )}
          </div>

          <div className="rounded-lg border p-4 space-y-4">
            <h3 className="text-sm font-semibold">Category</h3>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categories.length === 0 && (
              <p className="text-xs text-destructive">
                No categories for this type. Create one in Content Categories
                first.
              </p>
            )}
          </div>

          <div className="rounded-lg border p-4 space-y-4">
            <h3 className="text-sm font-semibold">SEO</h3>
            <div className="space-y-2">
              <Label htmlFor="meta-title">Meta title</Label>
              <Input
                id="meta-title"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta-desc">Meta description</Label>
              <Textarea
                id="meta-desc"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
