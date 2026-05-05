import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContentBySlug } from "@/data/content";
import { PuckRender } from "@/app/dashboard/content/_puck/server-render";
import type { Data as PuckData } from "@measured/puck";

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
            <h1 className="text-4xl font-bold tracking-tight">{row.title}</h1>
            {row.excerpt && (
              <p className="text-lg text-muted-foreground">{row.excerpt}</p>
            )}
          </header>
        )}
        {row.contentType === "page" ? (
          <article className="max-w-none">
            <PuckRender data={row.contentJson as PuckData} />
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
