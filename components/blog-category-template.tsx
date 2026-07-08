import Link from "next/link";

import type { BlogCategoryTemplateV1 } from "@/lib/appearance-recipe";
import { getTranslations } from "@/lib/i18n/server";
import type { TranslateFn } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import { sanitizeMediaSrc } from "@/lib/url-safety";

export type BlogCategoryTemplatePost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  authorName: string | null;
  formattedDate: string | null;
  dateTime: string | null;
};

type BlogCategoryTemplateProps = {
  template: BlogCategoryTemplateV1;
  categoryName: string;
  posts: BlogCategoryTemplatePost[];
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    previousHref: string | null;
    nextHref: string | null;
  };
};

function PostMeta({
  post,
  t,
}: {
  post: BlogCategoryTemplatePost;
  t: TranslateFn;
}) {
  return (
    <p className="text-sm text-muted-foreground">
      {post.authorName
        ? t("public.blog.category.createdBy", { name: post.authorName })
        : t("public.blog.category.created")}
      {post.formattedDate && (
        <>
          <span aria-hidden="true"> . </span>
          <time dateTime={post.dateTime ?? undefined}>
            {post.formattedDate}
          </time>
        </>
      )}
    </p>
  );
}

function PostCover({
  post,
  className,
}: {
  post: BlogCategoryTemplatePost;
  className?: string;
}) {
  const safeCoverImage = sanitizeMediaSrc(post.coverImage);
  if (!safeCoverImage) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={safeCoverImage}
      alt={post.title}
      referrerPolicy="no-referrer"
      className={cn(
        "aspect-video w-full rounded-lg border object-cover",
        className,
      )}
    />
  );
}

function ReadMore({ slug, t }: { slug: string; t: TranslateFn }) {
  return (
    <Link
      href={`/${slug}`}
      className="text-sm font-medium text-primary hover:underline"
    >
      {t("public.blog.category.readMore")}
    </Link>
  );
}

function ListPost({
  post,
  t,
}: {
  post: BlogCategoryTemplatePost;
  t: TranslateFn;
}) {
  return (
    <li className="space-y-3 py-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">
          <Link href={`/${post.slug}`} className="hover:underline">
            {post.title}
          </Link>
        </h2>
        <PostMeta post={post} t={t} />
      </div>
      <PostCover post={post} />
      {post.excerpt && (
        <p className="text-base text-foreground/90">{post.excerpt}</p>
      )}
      <div>
        <ReadMore slug={post.slug} t={t} />
      </div>
    </li>
  );
}

function CardPost({
  post,
  t,
  featured = false,
}: {
  post: BlogCategoryTemplatePost;
  t: TranslateFn;
  featured?: boolean;
}) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
      <PostCover post={post} className="rounded-none border-x-0 border-t-0" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <h2
            className={cn(
              "font-semibold tracking-tight",
              featured ? "text-3xl" : "text-xl",
            )}
          >
            <Link href={`/${post.slug}`} className="hover:underline">
              {post.title}
            </Link>
          </h2>
          <PostMeta post={post} t={t} />
        </div>
        {post.excerpt && (
          <p className="text-sm text-muted-foreground">{post.excerpt}</p>
        )}
        <div className="mt-auto pt-1">
          <ReadMore slug={post.slug} t={t} />
        </div>
      </div>
    </article>
  );
}

function CompactPost({ post }: { post: BlogCategoryTemplatePost }) {
  return (
    <li className="flex flex-col gap-2 py-4 sm:flex-row sm:items-baseline sm:justify-between">
      <div className="min-w-0">
        <h2 className="truncate text-lg font-semibold tracking-tight">
          <Link href={`/${post.slug}`} className="hover:underline">
            {post.title}
          </Link>
        </h2>
        {post.excerpt && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {post.excerpt}
          </p>
        )}
      </div>
      {post.formattedDate && (
        <time
          dateTime={post.dateTime ?? undefined}
          className="shrink-0 text-sm text-muted-foreground"
        >
          {post.formattedDate}
        </time>
      )}
    </li>
  );
}

function FeaturedFirstPosts({
  posts,
  t,
}: {
  posts: BlogCategoryTemplatePost[];
  t: TranslateFn;
}) {
  const [featuredPost, ...restPosts] = posts;
  if (!featuredPost) return null;

  return (
    <div className="space-y-6">
      <CardPost post={featuredPost} t={t} featured />
      {restPosts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {restPosts.map((post) => (
            <CardPost key={post.id} post={post} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

export async function BlogCategoryTemplate({
  template,
  categoryName,
  posts,
  pagination,
}: BlogCategoryTemplateProps) {
  const t = await getTranslations("frontend");
  const variant = template.variant;

  return (
    <section
      className="blog-category-template w-full py-12 sm:py-16"
      data-blog-category-template={variant}
    >
      <div className="space-y-8">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            {t("public.blog.category.eyebrow")}
          </p>
          <h1 className="text-4xl font-bold tracking-tight">{categoryName}</h1>
        </header>

        {posts.length === 0 ? (
          <p className="text-muted-foreground">
            {t("public.blog.category.empty")}
          </p>
        ) : variant === "list" ? (
          <ul className="space-y-6">
            {posts.map((post) => (
              <ListPost key={post.id} post={post} t={t} />
            ))}
          </ul>
        ) : variant === "compact-archive" ? (
          <ol className="divide-y">
            {posts.map((post) => (
              <CompactPost key={post.id} post={post} />
            ))}
          </ol>
        ) : variant === "featured-first" ? (
          <FeaturedFirstPosts posts={posts} t={t} />
        ) : (
          <div
            className={cn(
              "grid gap-4",
              variant === "magazine-grid"
                ? "md:grid-cols-2 xl:grid-cols-3"
                : "md:grid-cols-2 lg:grid-cols-3",
            )}
          >
            {posts.map((post, index) => (
              <div
                key={post.id}
                className={cn(
                  variant === "magazine-grid" && index === 0 && "md:col-span-2",
                )}
              >
                <CardPost
                  post={post}
                  t={t}
                  featured={variant === "magazine-grid" && index === 0}
                />
              </div>
            ))}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <nav
            aria-label={t("public.blog.category.pagination")}
            className="flex flex-col gap-3 border-t pt-6 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-muted-foreground">
              {t("public.blog.category.pageOfTotal", {
                page: pagination.page,
                totalPages: pagination.totalPages,
                total: pagination.total,
              })}
            </p>
            <div className="flex gap-2">
              {pagination.previousHref ? (
                <Link
                  href={pagination.previousHref}
                  className="rounded-md border px-3 py-2 hover:bg-muted"
                >
                  {t("public.blog.category.previous")}
                </Link>
              ) : (
                <span className="rounded-md border px-3 py-2 text-muted-foreground opacity-50">
                  {t("public.blog.category.previous")}
                </span>
              )}
              {pagination.nextHref ? (
                <Link
                  href={pagination.nextHref}
                  className="rounded-md border px-3 py-2 hover:bg-muted"
                >
                  {t("public.blog.category.next")}
                </Link>
              ) : (
                <span className="rounded-md border px-3 py-2 text-muted-foreground opacity-50">
                  {t("public.blog.category.next")}
                </span>
              )}
            </div>
          </nav>
        )}
      </div>
    </section>
  );
}
