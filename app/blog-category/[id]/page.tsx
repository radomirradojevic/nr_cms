import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";

import {
  BlogCategoryTemplate,
  type BlogCategoryTemplatePost,
} from "@/components/blog-category-template";
import { getCategoryById } from "@/data/content-categories";
import { listContent } from "@/data/content";
import { getGlobalSettings } from "@/data/global-settings";
import { resolveAppearanceContentTemplates } from "@/lib/appearance-recipe";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles } from "@/lib/roles";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ page?: string | string[] }>;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 24;

function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = raw ? parseInt(raw, 10) : 1;
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!UUID_RE.test(id)) return {};
  const cat = await getCategoryById(id);
  if (!cat || cat.contentType !== "blog_post") return {};
  return {
    title: cat.name,
    description: `Posts in category “${cat.name}”.`,
  };
}

export default async function BlogCategoryPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const page = parsePageParam(query.page);
  if (!UUID_RE.test(id)) notFound();

  const category = await getCategoryById(id);
  if (!category || category.contentType !== "blog_post") notFound();

  const me = await getOptionalCurrentUser(true);
  const viewerRoles = me ? getRoles(me.publicMetadata) : null;

  const { rows: posts, total } = await listContent({
    page,
    pageSize: PAGE_SIZE,
    contentType: "blog_post",
    status: "published",
    categoryId: id,
    sort: "updated_desc",
    viewerRoles,
  });

  // Resolve author display names
  const authorIds = Array.from(new Set(posts.map((p) => p.authorId)));
  const authorNames = new Map<string, string>();
  if (authorIds.length > 0) {
    try {
      const client = await clerkClient();
      await Promise.all(
        authorIds.map(async (aid) => {
          try {
            const u = await client.users.getUser(aid);
            const name =
              [u.firstName, u.lastName].filter(Boolean).join(" ") ||
              u.username ||
              "";
            if (name) authorNames.set(aid, name);
          } catch {
            /* ignore */
          }
        }),
      );
    } catch {
      /* ignore */
    }
  }

  const settings = await getGlobalSettings();
  const contentTemplates = resolveAppearanceContentTemplates(
    settings.resolvedAppearanceRecipe?.contentTemplates,
  );
  const template = contentTemplates.blogCategory;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const templatePosts: BlogCategoryTemplatePost[] = posts.map((post) => {
    const dt = post.publishedAt ?? post.createdAt;
    const formattedDate = dt
      ? new Intl.DateTimeFormat("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }).format(new Date(dt))
      : null;

    return {
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      coverImage: post.coverImage,
      authorName: authorNames.get(post.authorId) ?? null,
      formattedDate,
      dateTime: dt ? new Date(dt).toISOString() : null,
    };
  });

  return (
    <BlogCategoryTemplate
      template={template}
      categoryName={category.name}
      posts={templatePosts}
      pagination={{
        page,
        totalPages,
        total,
        previousHref: page > 1 ? `/blog-category/${id}?page=${page - 1}` : null,
        nextHref:
          page < totalPages ? `/blog-category/${id}?page=${page + 1}` : null,
      }}
    />
  );
}
