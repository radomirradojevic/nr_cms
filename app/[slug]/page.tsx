import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContentBySlug } from "@/data/content";
import { BuilderRender } from "@/app/dashboard/content/_builder/server-render-rsc";
import { renderTiptapHtml } from "@/app/dashboard/content/_editors/render-tiptap-html";
import { BlogContent } from "@/components/blog-content";
import { BlogComments } from "@/components/blog-comments";
import { BlogPostTemplate } from "@/components/blog-post-template";
import { ContentUnauthorized } from "@/components/content-unauthorized";
import { ContentUnpublished } from "@/components/content-unpublished";
import { PageTemplate } from "@/components/page-template";
import { getGlobalSettings } from "@/data/global-settings";
import { clerkClient } from "@clerk/nextjs/server";
import { resolveAppearanceContentTemplates } from "@/lib/appearance-recipe";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { canViewContent } from "@/lib/content-visibility";
import { getDateFormatter } from "@/lib/regional-settings";

type Props = { params: Promise<{ slug: string }> };
type PublicContentRow = NonNullable<
  Awaited<ReturnType<typeof getContentBySlug>>
>;
type OptionalUser = Awaited<ReturnType<typeof getOptionalCurrentUser>>;

async function canPreviewUnpublishedContent(
  row: PublicContentRow,
  user: OptionalUser,
) {
  if (!user) return false;

  const roles = getRoles(user.publicMetadata);
  if (hasRole(roles, "admin") || row.authorId === user.id) return true;
  if (!hasRole(roles, "publisher")) return false;

  try {
    const client = await clerkClient();
    const author = await client.users.getUser(row.authorId);
    const authorRoles = getRoles(author.publicMetadata);
    return (
      hasRole(authorRoles, "author") &&
      !hasRole(authorRoles, "publisher") &&
      !hasRole(authorRoles, "admin")
    );
  } catch {
    return false;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const row = await getContentBySlug(slug);
  if (!row) return {};
  if (row.status !== "published") {
    if (row.status !== "unpublished") return {};
    const me = await getOptionalCurrentUser(true);
    return (await canPreviewUnpublishedContent(row, me))
      ? { title: "Unpublished content" }
      : {};
  }
  // Do not leak title/description for restricted content. Generic title only.
  const me = await getOptionalCurrentUser(true);
  const viewerRoles = me ? getRoles(me.publicMetadata) : null;
  if (!canViewContent(row.visibility, viewerRoles)) {
    return { title: "Restricted" };
  }
  return {
    title: row.metaTitle ?? row.title,
    description: row.metaDescription ?? row.excerpt ?? undefined,
  };
}

export default async function PublicContentPage({ params }: Props) {
  const { slug } = await params;
  const row = await getContentBySlug(slug);
  if (!row) notFound();

  // Visibility check — admin always passes; public passes for anyone;
  // otherwise the viewer must have a matching role.
  const me = await getOptionalCurrentUser(true);
  const viewerRoles = me ? getRoles(me.publicMetadata) : null;
  if (row.status !== "published") {
    if (
      row.status === "unpublished" &&
      (await canPreviewUnpublishedContent(row, me))
    ) {
      return (
        <ContentUnpublished editHref={`/dashboard/content/${row.id}/edit`} />
      );
    }
    notFound();
  }

  if (!canViewContent(row.visibility, viewerRoles)) {
    return <ContentUnauthorized />;
  }

  // Determine if the current user can edit this content
  const userId = me?.id;
  let canEdit = false;
  if (userId && row.contentType === "blog_post") {
    const roles = viewerRoles ?? [];
    canEdit = hasRole(roles, "admin") || userId === row.authorId;
  }

  let authorName: string | null = null;
  if (row.contentType === "blog_post") {
    try {
      const client = await clerkClient();
      const author = await client.users.getUser(row.authorId);
      authorName =
        [author.firstName, author.lastName].filter(Boolean).join(" ") ||
        author.username ||
        null;
    } catch {
      authorName = null;
    }
  }

  const settings = await getGlobalSettings();
  const displayDate = row.updatedAt ?? row.createdAt;
  const formattedDate = displayDate
    ? getDateFormatter(settings.regional, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(displayDate))
    : null;
  const dateTime = displayDate ? new Date(displayDate).toISOString() : null;
  const contentTemplates = resolveAppearanceContentTemplates(
    settings.resolvedAppearanceRecipe?.contentTemplates,
  );

  if (row.contentType === "page") {
    return (
      <PageTemplate template={contentTemplates.page}>
        <BuilderRender data={row.contentJson} />
      </PageTemplate>
    );
  }

  return (
    <BlogPostTemplate
      template={contentTemplates.blogPost}
      title={row.title}
      coverImage={row.coverImage}
      excerpt={row.excerpt}
      authorName={authorName}
      formattedDate={formattedDate}
      dateTime={dateTime}
      canEdit={canEdit}
      editHref={`/dashboard/content/${row.id}/edit`}
      comments={
        row.enableComments ? (
          <BlogComments
            contentId={row.id}
            postSlug={row.slug}
            allowAnonymous={row.allowAnonymousComments}
          />
        ) : null
      }
    >
      <BlogContent
        className="cms-content max-w-none"
        html={renderTiptapHtml(row.contentJson) || row.content || ""}
      />
    </BlogPostTemplate>
  );
}
