import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContentBySlug } from "@/data/content";
import { BuilderRender } from "@/app/dashboard/content/_builder/server-render-rsc";
import { renderTiptapHtml } from "@/app/dashboard/content/_editors/render-tiptap-html";
import { BlogContent } from "@/components/blog-content";
import { BlogComments } from "@/components/blog-comments";
import { BlogPostTemplate } from "@/components/blog-post-template";
import { ContentUnauthorized } from "@/components/content-unauthorized";
import { PageTemplate } from "@/components/page-template";
import { getGlobalSettings } from "@/data/global-settings";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { resolveAppearanceContentTemplates } from "@/lib/appearance-recipe";
import { getRoles, hasRole } from "@/lib/roles";
import { canViewContent } from "@/lib/content-visibility";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const row = await getContentBySlug(slug);
  if (!row || row.status !== "published") return {};
  // Do not leak title/description for restricted content. Generic title only.
  const me = await currentUser();
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
  if (!row || row.status !== "published") notFound();

  // Visibility check — admin always passes; public passes for anyone;
  // otherwise the viewer must have a matching role.
  const me = await currentUser();
  const viewerRoles = me ? getRoles(me.publicMetadata) : null;
  if (!canViewContent(row.visibility, viewerRoles)) {
    return <ContentUnauthorized />;
  }

  // Determine if the current user can edit this content
  const { userId } = await auth();
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

  const displayDate = row.updatedAt ?? row.createdAt;
  const formattedDate = displayDate
    ? new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(displayDate))
    : null;
  const dateTime = displayDate ? new Date(displayDate).toISOString() : null;
  const settings = await getGlobalSettings();
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
