import {
  getContentByIds,
  getHomepageContent,
  listContentTargetOptions,
} from "@/data/content";
import {
  getCategoriesByIds,
  getCategoriesByType,
} from "@/data/content-categories";
import type { FooterSettings, HeaderSettings } from "@/lib/global-settings";
import {
  ADMIN_PAGE_TARGET_IDS,
  SYSTEM_PAGE_TARGET_IDS,
  type AdminPageTargetId,
  type ShellRenderTarget,
  type ShellRouteIndex,
  type SystemPageTargetId,
  resolveShellRenderTargetForPathname,
} from "@/lib/shell-visibility-targets";

function contentTargetForRow(row: {
  id: string;
  contentType: string;
}): ShellRenderTarget {
  return {
    contentId: row.id,
    contentType: row.contentType as ShellRenderTarget["contentType"],
  };
}

export async function loadShellRouteIndex(): Promise<ShellRouteIndex> {
  const [homepage, contents, blogCategories] = await Promise.all([
    getHomepageContent(),
    listContentTargetOptions(),
    getCategoriesByType("blog_post"),
  ]);

  return {
    homepage: homepage ? contentTargetForRow(homepage) : null,
    contents: contents.map((item) => ({
      slug: item.slug,
      contentId: item.id,
      contentType: item.contentType,
    })),
    blogCategoryIds: blogCategories.map((category) => category.id),
  };
}

export async function resolveShellRenderTarget(
  pathname: string,
): Promise<ShellRenderTarget> {
  return resolveShellRenderTargetForPathname(
    pathname,
    await loadShellRouteIndex(),
  );
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function filterKnownAdminPageIds(values: string[]): AdminPageTargetId[] {
  const knownIds = new Set<string>(ADMIN_PAGE_TARGET_IDS);
  return unique(values).filter((id): id is AdminPageTargetId =>
    knownIds.has(id),
  );
}

function filterKnownSystemPageIds(values: string[]): SystemPageTargetId[] {
  const knownIds = new Set<string>(SYSTEM_PAGE_TARGET_IDS);
  return unique(values).filter((id): id is SystemPageTargetId =>
    knownIds.has(id),
  );
}

export async function pruneShellVisibilitySettingsForWrite<
  T extends HeaderSettings | FooterSettings,
>(settings: T): Promise<T> {
  if (settings.visibility.mode === "everywhere") return settings;

  const targets = settings.visibility.targets;
  const selectedContentIds = unique([
    ...targets.pageIds,
    ...targets.blogPostIds,
    ...targets.heroSliderIds,
    ...targets.webshopIds,
  ]);
  const [contentRows, blogCategories] = await Promise.all([
    getContentByIds(selectedContentIds),
    getCategoriesByIds(targets.blogCategoryIds),
  ]);
  const validPageIds = new Set(
    contentRows
      .filter((row) => row.contentType === "page")
      .map((row) => row.id),
  );
  const validBlogPostIds = new Set(
    contentRows
      .filter((row) => row.contentType === "blog_post")
      .map((row) => row.id),
  );
  const validHeroSliderIds = new Set(
    contentRows
      .filter((row) => row.contentType === "hero_slider")
      .map((row) => row.id),
  );
  const validWebshopIds = new Set(
    contentRows
      .filter((row) => row.contentType === "webshop")
      .map((row) => row.id),
  );
  const validBlogCategoryIds = new Set(
    blogCategories
      .filter((category) => category.contentType === "blog_post")
      .map((category) => category.id),
  );

  return {
    ...settings,
    visibility: {
      mode: "selected",
      targets: {
        systemPageIds: filterKnownSystemPageIds(targets.systemPageIds),
        pageIds: unique(targets.pageIds).filter((id) => validPageIds.has(id)),
        blogPostIds: unique(targets.blogPostIds).filter((id) =>
          validBlogPostIds.has(id),
        ),
        heroSliderIds: unique(targets.heroSliderIds).filter((id) =>
          validHeroSliderIds.has(id),
        ),
        webshopIds: unique(targets.webshopIds).filter((id) =>
          validWebshopIds.has(id),
        ),
        blogCategoryIds: unique(targets.blogCategoryIds).filter((id) =>
          validBlogCategoryIds.has(id),
        ),
        adminPageIds: filterKnownAdminPageIds(targets.adminPageIds),
      },
    },
  };
}
