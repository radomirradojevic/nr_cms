import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { getContentBySlug } from "@/data/content";
import { BuilderRender } from "@/app/dashboard/content/_builder/server-render";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { getRoles, hasRole } from "@/lib/roles";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const row = await getContentBySlug(slug);
  if (!row || row.status !== "published") return {};
  return {
    title: row.metaTitle ?? row.title,
    description: row.metaDescription ?? row.excerpt ?? undefined,
  };
}

export default async function PublicContentPage({ params }: Props) {
  const { slug } = await params;
  const row = await getContentBySlug(slug);
  if (!row || row.status !== "published") notFound();

  // Determine if the current user can edit this content
  const { userId } = await auth();
  let canEdit = false;
  if (userId && row.contentType === "blog_post") {
    const me = await currentUser();
    const roles = getRoles(me?.publicMetadata);
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

  return (
    <div className="flex flex-1 justify-center px-6 py-16">
      <main className="w-full max-w-5xl space-y-8">
        {row.contentType === "blog_post" && (
          <header className="space-y-4">
            {row.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.coverImage}
                alt={row.title}
                referrerPolicy="no-referrer"
                className="aspect-video w-full rounded-lg object-cover"
              />
            )}
            <h1 className="text-4xl font-bold tracking-tight">
              {row.title}
              {canEdit && (
                <Link
                  href={`/dashboard/content/${row.id}/edit`}
                  title="Edit post"
                  className="ml-3 inline-flex align-middle rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Pencil className="h-5 w-5" />
                </Link>
              )}
            </h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {authorName && <span>By {authorName}</span>}
              {authorName && formattedDate && <span aria-hidden="true">·</span>}
              {formattedDate && (
                <time dateTime={new Date(displayDate!).toISOString()}>
                  {formattedDate}
                </time>
              )}
            </div>
            {row.excerpt && (
              <p className="text-lg text-muted-foreground">{row.excerpt}</p>
            )}
          </header>
        )}
        {row.contentType === "page" ? (
          <article className="max-w-none">
            <BuilderRender data={row.contentJson} />
          </article>
        ) : (
          <article
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: row.content ?? "" }}
          />
        )}
      </main>
    </div>
  );
}
