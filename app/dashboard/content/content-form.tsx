"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Eye,
  FolderTree,
  ImageIcon,
  Loader2,
  MessageSquare,
  Rocket,
  Search,
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { slugify } from "@/lib/utils";
import { hasRole, type Role } from "@/lib/roles";
import {
  DEFAULT_VISIBILITY,
  VISIBILITY_ROLES,
  type ContentVisibility,
  type VisibilityRole,
} from "@/lib/content-visibility";
import dynamic from "next/dynamic";
import { BlogEditor } from "./_editors/blog-editor";
import { ImageInsertDialog } from "./_editors/image-insert-dialog";
import { emptyTiptapJson } from "./_editors/tiptap-extensions";
import { emptyBuilderData, type BuilderData } from "./_builder/types";
import type { PageEditorSettingsPanels } from "./_builder/page-editor";

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
import type { AppearanceSettings } from "@/lib/appearance";
import { useContentEditLockOptional } from "@/components/content-edit-lock-provider";

export type ContentFormCategory = { id: string; name: string };

type Props = {
  mode: "create" | "edit";
  contentType: "page" | "blog_post";
  categories: ContentFormCategory[];
  currentUserRoles: Role[];
  /** Appearance settings used by the page-builder preview. Defaults if omitted. */
  appearance?: AppearanceSettings;
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
    enableComments: boolean;
    autoPublishComments: boolean;
    allowAnonymousComments: boolean;
    visibility: ContentVisibility;
    contentJson: unknown;
  };
};

export function ContentForm({
  mode,
  contentType,
  categories,
  currentUserRoles,
  appearance,
  initial,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [staleVersion, setStaleVersion] = useState<number | null>(null);
  const lock = useContentEditLockOptional();
  const lockBlocksSave = mode === "edit" && lock !== null && !lock.isEditor;

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
  const [enableComments, setEnableComments] = useState(
    initial?.enableComments ?? false,
  );
  const [autoPublishComments, setAutoPublishComments] = useState(
    initial?.autoPublishComments ?? false,
  );
  const [allowAnonymousComments, setAllowAnonymousComments] = useState(
    initial?.allowAnonymousComments ?? false,
  );
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);

  const [visibilityPublic, setVisibilityPublic] = useState(
    initial?.visibility?.public ?? DEFAULT_VISIBILITY.public,
  );
  const [visibilityRoles, setVisibilityRoles] = useState<VisibilityRole[]>(
    initial?.visibility?.roles ?? [...DEFAULT_VISIBILITY.roles],
  );
  function toggleVisibilityRole(role: VisibilityRole, checked: boolean) {
    setVisibilityRoles((prev) =>
      checked
        ? Array.from(new Set([...prev, role]))
        : prev.filter((r) => r !== role),
    );
  }

  // Deep-clone initial.contentJson so we don't keep a reference to the
  // RSC-provided value. Otherwise round-tripping the same object back to a
  // server action turns it into a "temporary client reference" and reading
  // properties like `attrs.level` throws on the server.
  //
  // Held in a ref (not state) so that drag/drop and keystrokes inside the
  // editor never re-render this entire form. The PageEditor / BlogEditor
  // are uncontrolled and push their latest value via `registerGetValue`.
  const [editorDefaultValue] = useState<unknown>(() =>
    initial?.contentJson != null
      ? JSON.parse(JSON.stringify(initial.contentJson))
      : contentType === "page"
        ? emptyBuilderData
        : emptyTiptapJson,
  );
  const contentJsonRef = useRef<unknown>(editorDefaultValue);
  const getEditorValueRef = useRef<(() => unknown) | null>(null);

  function onTitleChange(v: string) {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  const savedToastMessage =
    contentType === "page"
      ? "Page saved successfully"
      : "Blog post saved successfully";

  function failSave(message: string, showToast: boolean) {
    setError(message);
    if (showToast) toast.error(message);
  }

  function submit(shouldClose = true, showToast = false) {
    setError(null);
    if (!title.trim()) return failSave("Title is required.", showToast);
    if (!slug.trim()) return failSave("Slug is required.", showToast);
    if (!categoryId) return failSave("Category is required.", showToast);

    // Pull the freshest value directly from the editor (uncontrolled).
    // Falls back to the ref if the editor hasn't registered yet.
    const latestContent = getEditorValueRef.current
      ? getEditorValueRef.current()
      : contentJsonRef.current;

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
      contentJson: JSON.parse(JSON.stringify(latestContent ?? null)),
    };

    startTransition(async () => {
      try {
        if (mode === "create") {
          const input: CreateContentInput = {
            ...base,
            contentType,
            ...(canChooseStatus ? { status } : {}),
            ...(isAdmin && contentType === "page" ? { homepage } : {}),
            visibility: { public: visibilityPublic, roles: visibilityRoles },
            ...(contentType === "blog_post"
              ? {
                  enableComments,
                  autoPublishComments,
                  allowAnonymousComments,
                }
              : {}),
          };
          const r = await createContent(input);
          if (r.error) failSave(r.error, showToast);
          else {
            if (showToast) toast.success(savedToastMessage);
            if (shouldClose) router.push("/dashboard/content");
          }
        } else {
          const input: UpdateContentInput = {
            ...base,
            id: initial!.id,
            ...(canChooseStatus ? { status } : {}),
            ...(isAdmin && contentType === "page" ? { homepage } : {}),
            visibility: { public: visibilityPublic, roles: visibilityRoles },
            ...(contentType === "blog_post"
              ? {
                  enableComments,
                  autoPublishComments,
                  allowAnonymousComments,
                }
              : {}),
            ...(lock
              ? {
                  lockClientId: lock.clientId,
                  expectedVersion: lock.contentVersion,
                }
              : {}),
          };
          const r = await updateContent(input);
          if (r.error) {
            failSave(r.error, showToast);
            if ("code" in r && r.code === "STALE_CONTENT") {
              setStaleVersion(
                "currentVersion" in r && typeof r.currentVersion === "number"
                  ? r.currentVersion
                  : null,
              );
            }
          } else {
            // Sync the bumped version back into the lock provider so the
            // NEXT save from this same session sends the up-to-date
            // expectedVersion and isn't rejected as stale.
            if (lock && typeof r.version === "number") {
              lock.syncVersionAfterSave(r.version);
            }
            setError(null);
            setStaleVersion(null);
            if (showToast) toast.success(savedToastMessage);
            if (shouldClose) router.push("/dashboard/content");
          }
        }
      } catch {
        failSave("Save failed. Please try again.", showToast);
      }
    });
  }

  const publishingSettings = (
    <div className="space-y-4">
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
        <div className="flex items-center justify-between gap-3">
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
  );

  const visibilitySettings = (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Choose who can view this content on the public site.
      </p>
      <div className="space-y-3">
        <label className="flex items-start gap-3">
          <Checkbox
            id="visibility-public"
            checked={visibilityPublic}
            onCheckedChange={(v) => setVisibilityPublic(!!v)}
            className="mt-0.5"
          />
          <div className="space-y-0.5">
            <span className="text-sm font-medium">Public</span>
            <p className="text-xs text-muted-foreground">
              Visible to everyone, including anonymous visitors. Role selections
              below are ignored while this is on.
            </p>
          </div>
        </label>
        {VISIBILITY_ROLES.map((role) => (
          <label key={role} className="flex items-center gap-3 pl-1">
            <Checkbox
              id={`visibility-${role}`}
              checked={visibilityRoles.includes(role)}
              onCheckedChange={(v) => toggleVisibilityRole(role, !!v)}
            />
            <span className="text-sm capitalize">{role}</span>
          </label>
        ))}
        <label className="flex items-center gap-3 pl-1">
          <Checkbox id="visibility-admin" checked disabled />
          <span className="text-sm capitalize text-muted-foreground">
            admin
            <span className="ml-2 text-xs">(admins always have access)</span>
          </span>
        </label>
      </div>
    </div>
  );

  const categorySettings = (
    <div className="space-y-4">
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
          No categories for this type. Create one in Content Categories first.
        </p>
      )}
    </div>
  );

  const seoSettings = (
    <div className="space-y-4">
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
  );

  const commentsSettings = (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label htmlFor="enable-comments" className="text-sm">
            Enable comments
          </Label>
          <p className="text-xs text-muted-foreground">
            Master switch for the comment form and list.
          </p>
        </div>
        <Switch
          id="enable-comments"
          checked={enableComments}
          onCheckedChange={setEnableComments}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label htmlFor="auto-publish-comments" className="text-sm">
            Auto-publish comments
          </Label>
          <p className="text-xs text-muted-foreground">
            Skip moderation queue for new comments.
          </p>
        </div>
        <Switch
          id="auto-publish-comments"
          checked={autoPublishComments}
          onCheckedChange={setAutoPublishComments}
          disabled={!enableComments}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label htmlFor="allow-anon-comments" className="text-sm">
            Allow anonymous
          </Label>
          <p className="text-xs text-muted-foreground">
            Guests can comment with name + optional email.
          </p>
        </div>
        <Switch
          id="allow-anon-comments"
          checked={allowAnonymousComments}
          onCheckedChange={setAllowAnonymousComments}
          disabled={!enableComments}
        />
      </div>
      {mode === "edit" && initial?.id && (
        <div className="pt-2 border-t">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href={`/dashboard/content/${initial.id}/comments`}>
              Manage comments
            </Link>
          </Button>
        </div>
      )}
    </div>
  );

  const pageEditorSettingsPanels: PageEditorSettingsPanels = {
    publishing: <div className="p-3">{publishingSettings}</div>,
    visibility: <div className="p-3">{visibilitySettings}</div>,
    category: <div className="p-3">{categorySettings}</div>,
    seo: <div className="p-3">{seoSettings}</div>,
  };

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
              <Button
                onClick={() => submit(false, true)}
                disabled={pending || lockBlocksSave}
                title={
                  lockBlocksSave
                    ? "Saving is disabled while another editor holds the edit lock."
                    : undefined
                }
              >
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
              <Button
                onClick={() => submit(true)}
                disabled={pending || lockBlocksSave}
                variant="secondary"
                title={
                  lockBlocksSave
                    ? "Saving is disabled while another editor holds the edit lock."
                    : undefined
                }
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
          {staleVersion !== null && (
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.refresh()}
              >
                Reload latest version
              </Button>
            </div>
          )}
        </div>
      )}

      <fieldset
        disabled={lockBlocksSave}
        className={
          lockBlocksSave
            ? contentType === "page"
              ? "grid grid-cols-1 gap-6 opacity-70 pointer-events-none"
              : "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24%)] gap-6 opacity-70 pointer-events-none"
            : contentType === "page"
              ? "grid grid-cols-1 gap-6"
              : "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24%)] gap-6"
        }
      >
        <div className="min-w-0 space-y-4">
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
                defaultValue={editorDefaultValue}
                appearance={appearance}
                settingsPanels={pageEditorSettingsPanels}
                registerGetValue={(getValue) => {
                  getEditorValueRef.current = getValue;
                }}
                onChange={(d: BuilderData) => {
                  contentJsonRef.current = d;
                }}
              />
            ) : (
              <BlogEditor
                defaultValue={editorDefaultValue as never}
                registerGetValue={(getValue) => {
                  getEditorValueRef.current = getValue;
                }}
                onChange={(j) => {
                  contentJsonRef.current = j;
                }}
              />
            )}
          </div>
        </div>

        {contentType === "blog_post" && (
          <aside className="min-w-0 space-y-4 lg:sticky lg:top-[var(--sticky-header-h,0px)] lg:self-start">
            <Tabs
              defaultValue="publishing"
              className="gap-0 rounded-lg border bg-background"
            >
              <TabsList className="m-2 grid h-auto w-auto grid-cols-3 gap-1 p-1">
                <TabsTrigger
                  value="publishing"
                  className="min-w-0 px-2 text-xs"
                >
                  <Rocket className="h-4 w-4" />
                  <span className="truncate">Publishing</span>
                </TabsTrigger>
                <TabsTrigger
                  value="visibility"
                  className="min-w-0 px-2 text-xs"
                >
                  <Eye className="h-4 w-4" />
                  <span className="truncate">Visibility</span>
                </TabsTrigger>
                <TabsTrigger value="category" className="min-w-0 px-2 text-xs">
                  <FolderTree className="h-4 w-4" />
                  <span className="truncate">Category</span>
                </TabsTrigger>
                <TabsTrigger value="seo" className="min-w-0 px-2 text-xs">
                  <Search className="h-4 w-4" />
                  <span className="truncate">SEO</span>
                </TabsTrigger>
                <TabsTrigger value="comments" className="min-w-0 px-2 text-xs">
                  <MessageSquare className="h-4 w-4" />
                  <span className="truncate">Comments</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="publishing" className="m-0 p-4 pt-2">
                {publishingSettings}
              </TabsContent>
              <TabsContent value="visibility" className="m-0 p-4 pt-2">
                {visibilitySettings}
              </TabsContent>
              <TabsContent value="category" className="m-0 p-4 pt-2">
                {categorySettings}
              </TabsContent>
              <TabsContent value="seo" className="m-0 p-4 pt-2">
                {seoSettings}
              </TabsContent>
              <TabsContent value="comments" className="m-0 p-4 pt-2">
                {commentsSettings}
              </TabsContent>
            </Tabs>
          </aside>
        )}
      </fieldset>
    </div>
  );
}
