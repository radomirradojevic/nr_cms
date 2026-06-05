import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentPublicRenderer } from "@/components/content-public-renderer";
import { getContentPreviewByToken } from "@/data/content-preview-tokens";

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

  return (
    <ContentPublicRenderer
      row={detail.content}
      preview
      previewBanner={{
        expiresAt: detail.token.expiresAt,
      }}
    />
  );
}
