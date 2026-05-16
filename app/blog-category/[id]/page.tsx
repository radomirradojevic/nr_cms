import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clerkClient, currentUser } from "@clerk/nextjs/server";

import { getCategoryById } from "@/data/content-categories";
import { listContent } from "@/data/content";
import { getRoles } from "@/lib/roles";

type Props = { params: Promise<{ id: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export default async function BlogCategoryPage({ params }: Props) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const category = await getCategoryById(id);
  if (!category || category.contentType !== "blog_post") notFound();

  const me = await currentUser();
  const viewerRoles = me ? getRoles(me.publicMetadata) : null;

  const { rows: posts } = await listContent({
    page: 1,
    pageSize: 100,
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

  return (
    <div className="flex flex-1 justify-center px-6 py-16">
      <main className="w-full max-w-4xl space-y-8">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            Blog category
          </p>
          <h1 className="text-4xl font-bold tracking-tight">{category.name}</h1>
        </header>

        {posts.length === 0 ? (
          <p className="text-muted-foreground">
            No published posts in this category yet.
          </p>
        ) : (
          <ul className="space-y-6">
            {posts.map((post) => {
              const dt = post.publishedAt ?? post.createdAt;
              const formatted = dt
                ? new Intl.DateTimeFormat("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }).format(new Date(dt))
                : null;
              const author = authorNames.get(post.authorId);
              return (
                <li key={post.id} className="space-y-3 py-6">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight">
                      <Link href={`/${post.slug}`} className="hover:underline">
                        {post.title}
                      </Link>
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {author ? <>Created by {author}</> : <>Created</>}
                      {formatted && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <time dateTime={new Date(dt!).toISOString()}>
                            {formatted}
                          </time>
                        </>
                      )}
                    </p>
                  </div>
                  {post.coverImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      referrerPolicy="no-referrer"
                      className="aspect-video w-full rounded-lg object-cover border"
                    />
                  )}
                  {post.excerpt && (
                    <p className="text-base text-foreground/90">
                      {post.excerpt}
                    </p>
                  )}
                  <div>
                    <Link
                      href={`/${post.slug}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Read more →
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
