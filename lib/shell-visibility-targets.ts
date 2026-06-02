export const ADMIN_PAGE_TARGETS = [
  { id: "dashboard", label: "Dashboard", path: "/dashboard", exact: true },
  {
    id: "global-settings",
    label: "Global Settings",
    path: "/dashboard/global-settings",
  },
  { id: "content", label: "Content", path: "/dashboard/content" },
  {
    id: "content-categories",
    label: "Content Categories",
    path: "/dashboard/content-categories",
  },
  { id: "filemanager", label: "File Manager", path: "/dashboard/filemanager" },
  {
    id: "gallerymanager",
    label: "Gallery Manager",
    path: "/dashboard/gallerymanager",
  },
  { id: "users", label: "Users", path: "/dashboard/users" },
  { id: "menus", label: "Menus", path: "/dashboard/menus" },
  {
    id: "form-builder",
    label: "Form Builder",
    path: "/dashboard/form-builder",
  },
] as const;

export const ADMIN_PAGE_TARGET_IDS = ADMIN_PAGE_TARGETS.map(
  (target) => target.id,
);

export const SYSTEM_PAGE_TARGETS = [
  { id: "search", label: "Search Results", path: "/search", exact: true },
] as const;

export const SYSTEM_PAGE_TARGET_IDS = SYSTEM_PAGE_TARGETS.map(
  (target) => target.id,
);

export type AdminPageTarget = (typeof ADMIN_PAGE_TARGETS)[number];
export type AdminPageTargetId = AdminPageTarget["id"];
export type SystemPageTarget = (typeof SYSTEM_PAGE_TARGETS)[number];
export type SystemPageTargetId = SystemPageTarget["id"];

export type ShellRenderTarget = {
  systemPageId?: SystemPageTargetId;
  contentId?: string;
  contentType?: "page" | "blog_post" | "hero_slider";
  blogCategoryId?: string;
  adminPageId?: AdminPageTargetId;
};

export type ShellRouteIndexContent = {
  slug: string;
  contentId: string;
  contentType: "page" | "blog_post" | "hero_slider";
};

export type ShellRouteIndex = {
  homepage: ShellRenderTarget | null;
  contents: ShellRouteIndexContent[];
  blogCategoryIds: string[];
};

function normalizePathname(pathname: string): string {
  const rawPath = pathname.split("?")[0]?.split("#")[0] ?? "/";
  const withLeadingSlash = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const withoutTrailingSlash =
    withLeadingSlash.length > 1
      ? withLeadingSlash.replace(/\/+$/, "")
      : withLeadingSlash;

  try {
    return decodeURI(withoutTrailingSlash);
  } catch {
    return withoutTrailingSlash;
  }
}

function matchesPathTarget(
  pathname: string,
  target: { path: string; exact?: boolean },
): boolean {
  if ("exact" in target && target.exact) return pathname === target.path;
  return pathname === target.path || pathname.startsWith(`${target.path}/`);
}

function adminPageIdForPath(pathname: string): AdminPageTargetId | undefined {
  return ADMIN_PAGE_TARGETS.find((target) => matchesPathTarget(pathname, target))
    ?.id;
}

function systemPageIdForPath(
  pathname: string,
): SystemPageTargetId | undefined {
  return SYSTEM_PAGE_TARGETS.find((target) =>
    matchesPathTarget(pathname, target),
  )
    ?.id;
}

export function resolveShellRenderTargetForPathname(
  pathname: string,
  routeIndex: ShellRouteIndex,
): ShellRenderTarget {
  const normalizedPathname = normalizePathname(pathname);
  const adminPageId = adminPageIdForPath(normalizedPathname);
  if (adminPageId) return { adminPageId };
  const systemPageId = systemPageIdForPath(normalizedPathname);
  if (systemPageId) return { systemPageId };

  if (normalizedPathname === "/") return routeIndex.homepage ?? {};

  const blogCategoryMatch = normalizedPathname.match(
    /^\/blog-category\/([^/]+)$/,
  );
  const blogCategoryId = blogCategoryMatch?.[1];
  if (blogCategoryId && routeIndex.blogCategoryIds.includes(blogCategoryId)) {
    return { blogCategoryId };
  }

  const slug = normalizedPathname.slice(1);
  if (!slug || slug.includes("/")) return {};

  const content = routeIndex.contents.find((item) => item.slug === slug);
  return content
    ? { contentId: content.contentId, contentType: content.contentType }
    : {};
}

export function shouldShowShellForTarget(
  visibility: {
    mode: "everywhere" | "selected";
    targets: {
      pageIds: string[];
      blogPostIds: string[];
      heroSliderIds: string[];
      blogCategoryIds: string[];
      adminPageIds: string[];
      systemPageIds: string[];
    };
  },
  target: ShellRenderTarget,
): boolean {
  if (visibility.mode === "everywhere") return true;

  const targets = visibility.targets;
  if (target.adminPageId && targets.adminPageIds.includes(target.adminPageId)) {
    return true;
  }
  if (
    target.systemPageId &&
    targets.systemPageIds.includes(target.systemPageId)
  ) {
    return true;
  }
  if (
    target.blogCategoryId &&
    targets.blogCategoryIds.includes(target.blogCategoryId)
  ) {
    return true;
  }
  if (!target.contentId || !target.contentType) return false;

  switch (target.contentType) {
    case "page":
      return targets.pageIds.includes(target.contentId);
    case "blog_post":
      return targets.blogPostIds.includes(target.contentId);
    case "hero_slider":
      return targets.heroSliderIds.includes(target.contentId);
  }
}
