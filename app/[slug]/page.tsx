import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContentBySlug } from "@/data/content";
import { ContentPublicRenderer } from "@/components/content-public-renderer";
import { ContentUnauthorized } from "@/components/content-unauthorized";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles } from "@/lib/roles";
import { canViewContent } from "@/lib/content-visibility";
import { isContentLive } from "@/lib/content-schedule";
import { getAddonI18nContext } from "@/lib/i18n/addon-server";
import { getTranslations } from "@/lib/i18n/server";
import { getWebshopRuntimeConfig } from "@/lib/webshop-addon/config";
import { resolveWebshopAddonState } from "@/lib/webshop-addon/license";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const row = await getContentBySlug(slug);
  if (!row) return {};
  if (
    row.contentType === "webshop" &&
    !getWebshopRuntimeConfig().storefrontEnabled
  ) {
    return {};
  }
  if (!isContentLive(row)) return {};
  // Do not leak title/description for restricted content. Generic title only.
  const me = await getOptionalCurrentUser(true);
  const viewerRoles = me ? getRoles(me.publicMetadata) : null;
  if (!canViewContent(row.visibility, viewerRoles)) {
    const t = await getTranslations("frontend");
    return { title: t("public.errors.accessRestricted.metadataTitle") };
  }
  if (row.contentType === "webshop") {
    const addonState = await resolveWebshopAddonState();
    if (
      (addonState.status === "ready" ||
        addonState.status === "license_expired") &&
      addonState.addon.generateStorefrontMetadata
    ) {
      const i18n = await getAddonI18nContext();

      return addonState.addon.generateStorefrontMetadata({
        contentId: row.id,
        i18n,
        licenseMode:
          addonState.status === "ready" ? "ready" : "edit_existing_only",
        path: [],
        searchParams: query,
        slug: row.slug,
      });
    }
  }
  return {
    title: row.metaTitle ?? row.title,
    description: row.metaDescription ?? row.excerpt ?? undefined,
  };
}

export default async function PublicContentPage({
  params,
  searchParams,
}: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const row = await getContentBySlug(slug);
  if (!row) notFound();
  if (
    row.contentType === "webshop" &&
    !getWebshopRuntimeConfig().storefrontEnabled
  ) {
    notFound();
  }

  // Visibility check — admin always passes; public passes for anyone;
  // otherwise the viewer must have a matching role.
  const me = await getOptionalCurrentUser(true);
  const viewerRoles = me ? getRoles(me.publicMetadata) : null;
  if (!isContentLive(row)) {
    notFound();
  }

  if (!canViewContent(row.visibility, viewerRoles)) {
    return <ContentUnauthorized />;
  }

  return (
    <ContentPublicRenderer
      row={row}
      currentUserId={me?.id}
      searchParams={query}
      viewerRoles={viewerRoles}
    />
  );
}
