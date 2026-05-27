import Link from "next/link";
import { Pencil } from "lucide-react";

import type { BlogPostTemplateV1 } from "@/lib/appearance-recipe";
import { cn } from "@/lib/utils";
import { sanitizeMediaSrc } from "@/lib/url-safety";

type BlogPostTemplateProps = {
  template: BlogPostTemplateV1;
  title: string;
  coverImage: string | null;
  excerpt: string | null;
  authorName: string | null;
  formattedDate: string | null;
  dateTime: string | null;
  canEdit: boolean;
  editHref: string;
  children?: React.ReactNode;
  comments?: React.ReactNode;
};

function EditPostLink({
  href,
  placement,
}: {
  href: string;
  placement: BlogPostTemplateV1["editAffordancePlacement"];
}) {
  if (placement === "title-inline") {
    return (
      <Link
        href={href}
        title="Edit post"
        className="ml-3 inline-flex align-middle rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Pencil className="h-5 w-5" />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      title="Edit post"
      className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Pencil className="h-4 w-4" />
      Edit post
    </Link>
  );
}

function MetadataLine({
  treatment,
  authorName,
  formattedDate,
  dateTime,
}: {
  treatment: BlogPostTemplateV1["metadataTreatment"];
  authorName: string | null;
  formattedDate: string | null;
  dateTime: string | null;
}) {
  if (!authorName && !formattedDate) return null;

  const date = formattedDate ? (
    <time dateTime={dateTime ?? undefined}>{formattedDate}</time>
  ) : null;

  if (treatment === "stacked") {
    return (
      <div className="space-y-1 text-sm text-muted-foreground">
        {authorName && <p>By {authorName}</p>}
        {date && <p>{date}</p>}
      </div>
    );
  }

  if (treatment === "eyebrow") {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {authorName && <span>By {authorName}</span>}
        {authorName && date && <span aria-hidden="true">/</span>}
        {date}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 text-muted-foreground",
        treatment === "compact" ? "text-xs" : "text-sm",
      )}
    >
      {authorName && <span>By {authorName}</span>}
      {authorName && date && <span aria-hidden="true">.</span>}
      {date}
    </div>
  );
}

function CoverImage({
  title,
  coverImage,
  placement,
}: {
  title: string;
  coverImage: string | null;
  placement: BlogPostTemplateV1["coverPlacement"];
}) {
  const safeCoverImage = sanitizeMediaSrc(coverImage);
  if (!safeCoverImage) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={safeCoverImage}
      alt={title}
      referrerPolicy="no-referrer"
      className={cn(
        "aspect-video w-full rounded-lg border object-cover",
        placement === "hero" &&
          "relative left-1/2 ml-[-50vw] mr-[-50vw] h-[min(52vw,30rem)] w-screen max-w-none rounded-none border-x-0",
        placement === "inline" && "max-w-3xl",
      )}
    />
  );
}

function Excerpt({
  excerpt,
  treatment,
}: {
  excerpt: string | null;
  treatment: BlogPostTemplateV1["excerptTreatment"];
}) {
  if (!excerpt) return null;

  if (treatment === "callout") {
    return (
      <p className="border-l-4 border-primary bg-muted/30 px-4 py-3 text-lg text-foreground">
        {excerpt}
      </p>
    );
  }

  return (
    <p
      className={cn(
        treatment === "lead" && "text-lg text-muted-foreground",
        treatment === "subtle" && "text-base text-muted-foreground",
        treatment === "compact" && "text-sm text-muted-foreground",
      )}
    >
      {excerpt}
    </p>
  );
}

export function BlogPostTemplate({
  template,
  title,
  coverImage,
  excerpt,
  authorName,
  formattedDate,
  dateTime,
  canEdit,
  editHref,
  children,
  comments,
}: BlogPostTemplateProps) {
  const editPlacement = template.editAffordancePlacement;
  const showHeaderEdit = canEdit && editPlacement === "header-actions";
  const showFooterEdit = canEdit && editPlacement === "footer-actions";
  const showTitleEdit = canEdit && editPlacement === "title-inline";
  const topCover =
    template.coverPlacement === "top" || template.coverPlacement === "hero";
  const afterTitleCover = template.coverPlacement === "after-title";
  const inlineCover = template.coverPlacement === "inline";

  const contentWithOptionalComments =
    template.commentsPlacement === "aside" && comments ? (
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="min-w-0">{children}</div>
        <aside className="min-w-0 lg:sticky lg:top-[calc(var(--sticky-header-h,0px)+1rem)] [&_#comments]:mt-0">
          {comments}
        </aside>
      </div>
    ) : (
      <>
        {template.commentsPlacement === "before-content" && comments}
        {children}
        {template.commentsPlacement === "after-content" && comments}
      </>
    );

  return (
    <article
      className="blog-post-template w-full py-12 sm:py-16"
      data-blog-post-metadata={template.metadataTreatment}
      data-blog-post-cover={template.coverPlacement}
      data-blog-post-excerpt={template.excerptTreatment}
      data-blog-post-comments={template.commentsPlacement}
      data-blog-post-edit={template.editAffordancePlacement}
    >
      <div className="space-y-8">
        {topCover && (
          <CoverImage
            title={title}
            coverImage={coverImage}
            placement={template.coverPlacement}
          />
        )}
        <header className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-4">
              {template.metadataTreatment === "eyebrow" && (
                <MetadataLine
                  treatment={template.metadataTreatment}
                  authorName={authorName}
                  formattedDate={formattedDate}
                  dateTime={dateTime}
                />
              )}
              <h1 className="text-4xl font-bold tracking-tight">
                {title}
                {showTitleEdit && (
                  <EditPostLink href={editHref} placement={editPlacement} />
                )}
              </h1>
              {template.metadataTreatment !== "eyebrow" && (
                <MetadataLine
                  treatment={template.metadataTreatment}
                  authorName={authorName}
                  formattedDate={formattedDate}
                  dateTime={dateTime}
                />
              )}
            </div>
            {showHeaderEdit && (
              <div className="shrink-0">
                <EditPostLink href={editHref} placement={editPlacement} />
              </div>
            )}
          </div>
          {afterTitleCover && (
            <CoverImage
              title={title}
              coverImage={coverImage}
              placement={template.coverPlacement}
            />
          )}
          <Excerpt excerpt={excerpt} treatment={template.excerptTreatment} />
          {inlineCover && (
            <CoverImage
              title={title}
              coverImage={coverImage}
              placement={template.coverPlacement}
            />
          )}
        </header>
        {contentWithOptionalComments}
        {showFooterEdit && (
          <div className="border-t pt-6">
            <EditPostLink href={editHref} placement={editPlacement} />
          </div>
        )}
      </div>
    </article>
  );
}
