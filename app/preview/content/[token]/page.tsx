import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ContentPublicRenderer } from "@/components/content-public-renderer";
import { getContentPreviewByToken } from "@/data/content-preview-tokens";
import { hasContentPreviewRole } from "@/lib/content-preview-auth";
import { canAccessContentPreviewTarget } from "@/lib/content-preview-auth-server";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles } from "@/lib/roles";

type Props = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Content preview",
  robots: {
    index: false,
    follow: false,
  },
};

const TOKEN_RE = /^[A-Za-z0-9_-]{32,128}$/;

export default async function ContentPreviewPage({ params }: Props) {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) notFound();

  const detail = await getContentPreviewByToken(token);
  if (!detail || detail.content.status === "archived") notFound();

  const user = await getOptionalCurrentUser();
  if (!user) redirect("/");

  const roles = getRoles(user.publicMetadata);
  if (!hasContentPreviewRole(roles)) redirect("/");

  const canPreview = await canAccessContentPreviewTarget({
    actorRoles: roles,
    actorUserId: user.id,
    target: detail.content,
  });
  if (!canPreview) redirect("/dashboard/content");

  return (
    <ContentPublicRenderer
      row={detail.content}
      preview
      viewerRoles={roles}
      previewBanner={{
        expiresAt: detail.token.expiresAt,
      }}
    />
  );
}
