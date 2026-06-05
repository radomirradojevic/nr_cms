import Link from "next/link";
import { clerkClient } from "@clerk/nextjs/server";

import {
  BuilderLeadingHeroSlider,
  BuilderRender,
  builderHasBodyAfterLeadingHero,
  builderHasLeadingHeroSlider,
} from "@/app/dashboard/content/_builder/server-render-rsc";
import { renderTiptapHtml } from "@/app/dashboard/content/_editors/render-tiptap-html";
import type { ContentRow } from "@/data/content";
import { getGlobalSettings } from "@/data/global-settings";
import { BlogContent } from "@/components/blog-content";
import { BlogComments } from "@/components/blog-comments";
import { BlogPostTemplate } from "@/components/blog-post-template";
import { HeroSliderRendererWithMenus } from "@/components/hero-slider-renderer-with-menus";
import { PageTemplate } from "@/components/page-template";
import { resolveAppearanceContentTemplates } from "@/lib/appearance-recipe";
import { getDateFormatter } from "@/lib/regional-settings";
import { hasRole, type Role } from "@/lib/roles";

type PreviewBanner = {
  editHref?: string;
  expiresAt?: Date | string;
};

type ContentPublicRendererProps = {
  currentUserId?: string | null;
  preview?: boolean;
  previewBanner?: PreviewBanner;
  row: ContentRow;
  viewerRoles?: Role[] | null;
};

function PreviewNotice({ banner }: { banner?: PreviewBanner }) {
  const expiresAt = banner?.expiresAt
    ? new Date(banner.expiresAt).toLocaleString()
    : null;

  return (
    <div className="border-b bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3">
        <span className="font-medium">Preview - not public</span>
        {expiresAt ? (
          <span className="text-amber-900/80">Expires {expiresAt}</span>
        ) : null}
        {banner?.editHref ? (
          <Link
            href={banner.editHref}
            className="ml-auto font-medium underline underline-offset-4"
          >
            Edit content
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export async function ContentPublicRenderer({
  currentUserId,
  preview = false,
  previewBanner,
  row,
  viewerRoles = null,
}: ContentPublicRendererProps) {
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
  const pageTemplate = contentTemplates.page;
  const mainVariant = settings.resolvedAppearanceRecipe.shell.main.variant;

  const body = (() => {
    if (row.contentType === "page") {
      const shouldDetachLeadingHero =
        builderHasLeadingHeroSlider(row.contentJson) &&
        (pageTemplate.variant === "framed-builder" || mainVariant === "framed");

      return (
        <PageTemplate
          template={pageTemplate}
          mainVariant={mainVariant}
          leading={
            shouldDetachLeadingHero ? (
              <BuilderLeadingHeroSlider data={row.contentJson} />
            ) : undefined
          }
          hasBody={
            shouldDetachLeadingHero
              ? builderHasBodyAfterLeadingHero(row.contentJson)
              : undefined
          }
        >
          <BuilderRender
            data={row.contentJson}
            omitLeadingHero={shouldDetachLeadingHero}
          />
        </PageTemplate>
      );
    }

    if (row.contentType === "hero_slider") {
      const shouldDetachHero =
        pageTemplate.variant === "framed-builder" || mainVariant === "framed";
      const heroSlider = (
        <HeroSliderRendererWithMenus data={row.contentJson} label={row.title} />
      );

      return (
        <PageTemplate
          template={pageTemplate}
          mainVariant={mainVariant}
          leading={shouldDetachHero ? heroSlider : undefined}
          hasBody={shouldDetachHero ? false : undefined}
        >
          {shouldDetachHero ? null : heroSlider}
        </PageTemplate>
      );
    }

    const canEdit =
      !preview &&
      !!currentUserId &&
      row.contentType === "blog_post" &&
      (hasRole(viewerRoles ?? [], "admin") || currentUserId === row.authorId);

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
          !preview && row.enableComments ? (
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
  })();

  if (!preview) return body;

  return (
    <>
      <PreviewNotice banner={previewBanner} />
      {body}
    </>
  );
}
