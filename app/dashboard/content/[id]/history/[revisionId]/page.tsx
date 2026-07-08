import Link from "next/link";
import { clerkClient } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContentPublicRenderer } from "@/components/content-public-renderer";
import { getContentById, type ContentRow } from "@/data/content";
import {
  getContentRevision,
  getContentRevisionNavigation,
  type ContentRevisionNavigationItem,
} from "@/data/content-revisions";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import {
  formatActorDisplayName,
  getUserDisplayNameMap,
} from "@/lib/backend-users";
import { getRoles, hasRole } from "@/lib/roles";
import {
  canAuthorEditOwnContentStatus,
  getContentStatusLabelKey,
  isAuthorOnlyContentWorkflowRole,
  type ContentStatus,
} from "@/lib/content-status";
import { getTranslations } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/keys";
import type { TranslateFn } from "@/lib/i18n/translate";
import { RevisionPreviewRestoreButton } from "../../../revision-preview-restore-button";

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
  const [t, userNameMap, revisionNavigation] = await Promise.all([
    getTranslations("backend"),
    getUserDisplayNameMap([revision.createdBy, revision.authorId]),
    getContentRevisionNavigation(id, revision.revisionNumber),
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
    deletedAt: null,
    deletedBy: null,
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
            <Link href={`/dashboard/content/${id}/edit`}>
              {t("dashboard.content.history.backToEditor")}
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">
                {t("dashboard.content.history.revisionTitle", {
                  revision: revision.revisionNumber,
                })}
              </h1>
              <RevisionNavigation
                contentId={id}
                previous={revisionNavigation.previous}
                next={revisionNavigation.next}
                t={t}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {revision.title} / {revision.slug}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RevisionPreviewRestoreButton
            contentId={row.id}
            revisionId={revision.id}
            revisionNumber={revision.revisionNumber}
            expectedVersion={row.version}
          />
          <Badge variant="secondary">
            {formatChangeType(revision.changeType, t)}
          </Badge>
          <Badge variant="outline">
            {t(getContentStatusLabelKey(revision.status as ContentStatus))}
          </Badge>
          <Badge variant="outline">v{revision.contentVersion}</Badge>
        </div>
      </div>

      <div className="grid gap-3 rounded-md border bg-background p-4 text-sm md:grid-cols-2 lg:grid-cols-4">
        <Meta
          label={t("dashboard.content.history.meta.actor")}
          value={actorName}
        />
        <Meta
          label={t("dashboard.content.history.meta.created")}
          value={revision.createdAt.toLocaleString()}
        />
        <Meta
          label={t("dashboard.content.history.meta.author")}
          value={authorName}
        />
        <Meta
          label={t("dashboard.content.history.meta.homepage")}
          value={
            revision.homepage ? t("common.states.yes") : t("common.states.no")
          }
        />
        <Meta
          label={t("dashboard.content.history.meta.publishAt")}
          value={
            revision.publishAt?.toLocaleString() ?? t("common.states.none")
          }
        />
        <Meta
          label={t("dashboard.content.history.meta.unpublishAt")}
          value={
            revision.unpublishAt?.toLocaleString() ?? t("common.states.none")
          }
        />
        <Meta
          label={t("dashboard.content.history.meta.metaTitle")}
          value={revision.metaTitle ?? t("common.states.none")}
        />
        <Meta
          label={t("dashboard.content.history.meta.metaDescription")}
          value={revision.metaDescription ?? t("common.states.none")}
        />
      </div>

      <div className="overflow-hidden rounded-md border bg-background">
        <ContentPublicRenderer row={previewRow} preview viewerRoles={roles} />
      </div>
    </div>
  );
}

function RevisionNavigation({
  contentId,
  previous,
  next,
  t,
}: {
  contentId: string;
  previous: ContentRevisionNavigationItem | null;
  next: ContentRevisionNavigationItem | null;
  t: TranslateFn;
}) {
  return (
    <nav
      aria-label={t("dashboard.content.history.revisionNavigation")}
      className="inline-flex overflow-hidden rounded-md border bg-background shadow-sm"
    >
      {previous ? (
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-8 rounded-none border-r px-2.5"
        >
          <Link
            href={revisionPreviewHref(contentId, previous)}
            aria-label={t("dashboard.content.history.openPreviousRevision", {
              revision: previous.revisionNumber,
            })}
          >
            <ChevronLeft aria-hidden className="size-4" />
            <span>{t("dashboard.content.history.previous")}</span>
            <span className="text-muted-foreground">
              #{previous.revisionNumber}
            </span>
          </Link>
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 rounded-none border-r px-2.5"
          disabled
        >
          <ChevronLeft aria-hidden className="size-4" />
          <span>{t("dashboard.content.history.previous")}</span>
        </Button>
      )}
      {next ? (
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-8 rounded-none px-2.5"
        >
          <Link
            href={revisionPreviewHref(contentId, next)}
            aria-label={t("dashboard.content.history.openNextRevision", {
              revision: next.revisionNumber,
            })}
          >
            <span>{t("dashboard.content.history.next")}</span>
            <span className="text-muted-foreground">
              #{next.revisionNumber}
            </span>
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 rounded-none px-2.5"
          disabled
        >
          <span>{t("dashboard.content.history.next")}</span>
          <ChevronRight aria-hidden className="size-4" />
        </Button>
      )}
    </nav>
  );
}

function revisionPreviewHref(
  contentId: string,
  revision: ContentRevisionNavigationItem,
): string {
  return `/dashboard/content/${contentId}/history/${revision.id}`;
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

function formatChangeType(value: string, t: TranslateFn): string {
  const key = `dashboard.content.history.changeType.${value}` as TranslationKey;
  const translated = t(key);
  if (translated !== key) return translated;

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
  if (input.row.contentType === "webshop") return false;

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
