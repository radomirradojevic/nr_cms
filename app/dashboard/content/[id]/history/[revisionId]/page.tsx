import Link from "next/link";
import { clerkClient } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContentPublicRenderer } from "@/components/content-public-renderer";
import { getContentById, type ContentRow } from "@/data/content";
import { getContentRevision } from "@/data/content-revisions";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import {
  formatActorDisplayName,
  getUserDisplayNameMap,
} from "@/lib/backend-users";
import { getRoles, hasRole } from "@/lib/roles";
import {
  canAuthorEditOwnContentStatus,
  getContentStatusLabel,
  isAuthorOnlyContentWorkflowRole,
  type ContentStatus,
} from "@/lib/content-status";

type Props = {
  params: Promise<{ id: string; revisionId: string }>;
};

export default async function ContentRevisionPage({ params }: Props) {
  const { id, revisionId } = await params;
  const revisionNumericId = Number(revisionId);
  if (!Number.isInteger(revisionNumericId) || revisionNumericId <= 0) {
    notFound();
  }

  const user = await getOptionalCurrentUser();
  if (!user) redirect("/");
  const roles = getRoles(user.publicMetadata);
  const allowed =
    hasRole(roles, "admin") ||
    hasRole(roles, "publisher") ||
    hasRole(roles, "author");
  if (!allowed) redirect("/dashboard");

  const row = await getContentById(id);
  if (!row) notFound();

  const canView = await canViewHistory({
    currentUserId: user.id,
    roles,
    row,
  });
  if (!canView) redirect("/dashboard/content");

  const revision = await getContentRevision(id, revisionNumericId);
  if (!revision) notFound();
  const userNameMap = await getUserDisplayNameMap([
    revision.createdBy,
    revision.authorId,
  ]);
  const actorName =
    userNameMap.get(revision.createdBy) ??
    formatActorDisplayName(revision.createdBy);
  const authorName =
    userNameMap.get(revision.authorId) ??
    formatActorDisplayName(revision.authorId);

  const previewRow: ContentRow = {
    id: row.id,
    contentType: revision.contentType,
    categoryId: revision.categoryId ?? row.categoryId,
    title: revision.title,
    content: revision.content,
    contentJson: revision.contentJson,
    metaTitle: revision.metaTitle,
    metaDescription: revision.metaDescription,
    status: revision.status,
    publishedAt: revision.publishedAt,
    publishAt: revision.publishAt,
    unpublishAt: revision.unpublishAt,
    excerpt: revision.excerpt,
    coverImage: revision.coverImage,
    slug: revision.slug,
    authorId: revision.authorId,
    updatedBy: revision.updatedBy,
    homepage: revision.homepage,
    enableComments: revision.enableComments,
    autoPublishComments: revision.autoPublishComments,
    allowAnonymousComments: revision.allowAnonymousComments,
    visibility: revision.visibility,
    version: revision.contentVersion,
    createdAt: revision.createdAt,
    updatedAt: revision.createdAt,
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/content/${id}/edit`}>Back to editor</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">
              Revision #{revision.revisionNumber}
            </h1>
            <p className="text-sm text-muted-foreground">
              {revision.title} / {revision.slug}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{formatChangeType(revision.changeType)}</Badge>
          <Badge variant="outline">
            {getContentStatusLabel(revision.status)}
          </Badge>
          <Badge variant="outline">v{revision.contentVersion}</Badge>
        </div>
      </div>

      <div className="grid gap-3 rounded-md border bg-background p-4 text-sm md:grid-cols-2 lg:grid-cols-4">
        <Meta label="Actor" value={actorName} />
        <Meta label="Created" value={revision.createdAt.toLocaleString()} />
        <Meta label="Author" value={authorName} />
        <Meta label="Homepage" value={revision.homepage ? "Yes" : "No"} />
        <Meta
          label="Publish at"
          value={revision.publishAt?.toLocaleString() ?? "None"}
        />
        <Meta
          label="Unpublish at"
          value={revision.unpublishAt?.toLocaleString() ?? "None"}
        />
        <Meta label="Meta title" value={revision.metaTitle ?? "None"} />
        <Meta
          label="Meta description"
          value={revision.metaDescription ?? "None"}
        />
      </div>

      <div className="overflow-hidden rounded-md border bg-background">
        <ContentPublicRenderer row={previewRow} preview viewerRoles={roles} />
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </div>
      <div className="truncate">{value}</div>
    </div>
  );
}

function formatChangeType(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function canViewHistory(input: {
  currentUserId: string;
  roles: ReturnType<typeof getRoles>;
  row: ContentRow;
}): Promise<boolean> {
  if (hasRole(input.roles, "admin")) return true;

  const isOwn = input.row.authorId === input.currentUserId;
  if (isOwn) {
    return isAuthorOnlyContentWorkflowRole(input.roles)
      ? canAuthorEditOwnContentStatus(
          input.roles,
          input.row.status as ContentStatus,
        )
      : true;
  }

  if (!hasRole(input.roles, "publisher")) return false;
  const client = await clerkClient();
  try {
    const author = await client.users.getUser(input.row.authorId);
    const authorRoles = getRoles(author.publicMetadata);
    const authorTop = authorRoles.includes("admin")
      ? "admin"
      : authorRoles.includes("publisher")
        ? "publisher"
        : authorRoles.includes("author")
          ? "author"
          : "viewer";
    return authorTop === "author";
  } catch {
    return false;
  }
}
