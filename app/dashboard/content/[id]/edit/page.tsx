import { clerkClient } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { getContentById } from "@/data/content";
import { getCategoriesByType } from "@/data/content-categories";
import { listContentRevisions } from "@/data/content-revisions";
import { getGlobalSettings } from "@/data/global-settings";
import { getEnabledAiProviderOptions } from "@/lib/global-settings";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { ContentForm } from "../../content-form";
import { parseVisibility } from "@/lib/content-visibility";
import {
  formatActorDisplayName,
  getUserDisplayNameMap,
} from "@/lib/backend-users";
import { ContentEditLockProvider } from "@/components/content-edit-lock-provider";
import {
  canAuthorEditOwnContentStatus,
  isAuthorOnlyContentWorkflowRole,
  type ContentStatus,
} from "@/lib/content-status";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ inspector?: string | string[] }>;
};

export default async function EditContentPage({ params, searchParams }: Props) {
  const { id } = await params;
  const search = await searchParams;
  const initialInspectorTab = Array.isArray(search.inspector)
    ? search.inspector[0]
    : search.inspector;
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

  // Permission check (mirrors server actions canEdit)
  const isOwn = row.authorId === user.id;
  const isAdmin = hasRole(roles, "admin");
  const isPublisher = hasRole(roles, "publisher");
  let canEdit = isAdmin;
  if (!canEdit && isOwn) {
    canEdit = isAuthorOnlyContentWorkflowRole(roles)
      ? canAuthorEditOwnContentStatus(roles, row.status as ContentStatus)
      : true;
  }
  if (!canEdit && isPublisher) {
    const client = await clerkClient();
    try {
      const author = await client.users.getUser(row.authorId);
      const authorRoles = getRoles(author.publicMetadata);
      const authorTop = authorRoles.includes("admin")
        ? "admin"
        : authorRoles.includes("publisher")
          ? "publisher"
          : authorRoles.includes("author")
            ? "author"
            : "viewer";
      canEdit = authorTop === "author";
    } catch {
      canEdit = false;
    }
  }
  if (!canEdit) redirect("/dashboard/content");

  const [categories, settings, revisions] = await Promise.all([
    getCategoriesByType(row.contentType === "blog_post" ? "blog_post" : "page"),
    getGlobalSettings(),
    listContentRevisions(row.id, { pageSize: 3 }),
  ]);
  const revisionActorNameMap = await getUserDisplayNameMap(
    revisions.rows.map((revision) => revision.createdBy),
  );

  return (
    <div className="p-6">
      <ContentEditLockProvider
        contentId={row.id}
        initialVersion={row.version}
        currentUserId={user.id}
        currentUserRoles={roles}
      >
        <ContentForm
          key={`${row.id}:${row.version}`}
          mode="edit"
          contentType={row.contentType as "page" | "blog_post" | "hero_slider"}
          currentUserRoles={roles}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          appearance={settings.appearance}
          sessionSecurity={settings.sessionSecurity}
          aiWritingAssistantAvailable={
            row.contentType === "blog_post"
              ? settings.aiWritingAssistant.enabled
              : row.contentType === "page" &&
                settings.aiWritingAssistant.pageBuilderEnabled
          }
          aiWritingAssistantProviders={
            (row.contentType === "blog_post" &&
              settings.aiWritingAssistant.enabled) ||
            (row.contentType === "page" &&
              settings.aiWritingAssistant.pageBuilderEnabled)
              ? getEnabledAiProviderOptions(settings.aiWritingAssistant)
              : []
          }
          aiWritingAssistantDefaultProvider={
            settings.aiWritingAssistant.defaultProvider
          }
          initialInspectorTab={initialInspectorTab}
          history={{
            total: revisions.total,
            revisions: revisions.rows.map((revision) => ({
              id: revision.id,
              revisionNumber: revision.revisionNumber,
              contentVersion: revision.contentVersion,
              changeType: revision.changeType,
              createdBy: revision.createdBy,
              createdByName:
                revisionActorNameMap.get(revision.createdBy) ??
                formatActorDisplayName(revision.createdBy),
              createdAt: revision.createdAt.toISOString(),
              status: revision.status as ContentStatus,
              title: revision.title,
              slug: revision.slug,
              homepage: revision.homepage,
              publishAt: revision.publishAt?.toISOString() ?? null,
              unpublishAt: revision.unpublishAt?.toISOString() ?? null,
            })),
          }}
          initial={{
            id: row.id,
            title: row.title,
            slug: row.slug,
            categoryId: row.categoryId,
            metaTitle: row.metaTitle,
            metaDescription: row.metaDescription,
            excerpt: row.excerpt,
            coverImage: row.coverImage,
            status: row.status as ContentStatus,
            publishAt: row.publishAt,
            unpublishAt: row.unpublishAt,
            homepage: row.homepage,
            enableComments: row.enableComments,
            autoPublishComments: row.autoPublishComments,
            allowAnonymousComments: row.allowAnonymousComments,
            visibility: parseVisibility(row.visibility),
            contentJson: row.contentJson,
          }}
        />
      </ContentEditLockProvider>
    </div>
  );
}
