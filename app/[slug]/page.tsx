import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContentBySlug } from "@/data/content";
import { ContentPublicRenderer } from "@/components/content-public-renderer";
import { ContentUnauthorized } from "@/components/content-unauthorized";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles } from "@/lib/roles";
import { canViewContent } from "@/lib/content-visibility";
import { isContentLive } from "@/lib/content-schedule";
import { getWebshopRuntimeConfig } from "@/lib/webshop-addon/config";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
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
    return { title: "Restricted" };
  }
  return {
    title: row.metaTitle ?? row.title,
    description: row.metaDescription ?? row.excerpt ?? undefined,
  };
}

export default async function PublicContentPage({ params }: Props) {
  const { slug } = await params;
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
      viewerRoles={viewerRoles}
    />
  );
}
