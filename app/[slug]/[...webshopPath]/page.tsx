import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentPublicRenderer } from "@/components/content-public-renderer";
import { ContentUnauthorized } from "@/components/content-unauthorized";
import { getContentBySlug } from "@/data/content";
import { canViewContent } from "@/lib/content-visibility";
import { isContentLive } from "@/lib/content-schedule";
import { getAddonI18nContext } from "@/lib/i18n/addon-server";
import { getTranslations } from "@/lib/i18n/server";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles } from "@/lib/roles";
import { getWebshopRuntimeConfig } from "@/lib/webshop-addon/config";
import { resolveWebshopAddonState } from "@/lib/webshop-addon/license";

type Props = {
  params: Promise<{ slug: string; webshopPath?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function getVisibleWebshop(slug: string) {
  if (!getWebshopRuntimeConfig().storefrontEnabled) return null;

  const row = await getContentBySlug(slug);
  if (!row || row.contentType !== "webshop" || !isContentLive(row)) {
    return null;
  }

  const me = await getOptionalCurrentUser(true);
  const viewerRoles = me ? getRoles(me.publicMetadata) : null;

  return { me, row, viewerRoles };
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const [{ slug, webshopPath = [] }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const result = await getVisibleWebshop(slug);
  if (!result) return {};

  if (!canViewContent(result.row.visibility, result.viewerRoles)) {
    const t = await getTranslations("frontend");
    return { title: t("public.errors.accessRestricted.metadataTitle") };
  }

  const addonState = await resolveWebshopAddonState();
  if (
    (addonState.status === "ready" ||
      addonState.status === "license_expired") &&
    addonState.addon.generateStorefrontMetadata
  ) {
    const i18n = await getAddonI18nContext();

    return addonState.addon.generateStorefrontMetadata({
      contentId: result.row.id,
      i18n,
      licenseMode:
        addonState.status === "ready" ? "ready" : "edit_existing_only",
      path: webshopPath,
      searchParams: query,
      slug: result.row.slug,
    });
  }

  return {
    title: result.row.metaTitle ?? result.row.title,
    description: result.row.metaDescription ?? result.row.excerpt ?? undefined,
  };
}

export default async function PublicWebshopPathPage({
  params,
  searchParams,
}: Props) {
  const [{ slug, webshopPath = [] }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const result = await getVisibleWebshop(slug);
  if (!result) notFound();

  const { me, row, viewerRoles } = result;
  if (!canViewContent(row.visibility, viewerRoles)) {
    return <ContentUnauthorized />;
  }

  return (
    <ContentPublicRenderer
      currentUserId={me?.id}
      row={row}
      viewerRoles={viewerRoles}
      webshopPath={webshopPath}
      searchParams={query}
    />
  );
}
