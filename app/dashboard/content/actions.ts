"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { content, topMenuItems } from "@/db/schema";
import { eq } from "drizzle-orm";

import {
  existsSlug,
  getContentById,
  type ContentType,
  type ContentRow,
} from "@/data/content";
import {
  clearOtherHomepageRowsWithSnapshots,
  createContentRevisionSnapshotForRow,
  getContentRevision,
  hardDeleteContentWithRevisions,
  listContentRevisions,
  restoreDeletedContentWithRevision,
  restoreContentRevision as restoreContentRevisionRow,
  softDeleteContentWithRevision,
  updateContentWithRevision,
} from "@/data/content-revisions";
import { getCategoryById } from "@/data/content-categories";
import { getGlobalSettings } from "@/data/global-settings";
import { getRoles, hasRole, type Role } from "@/lib/roles";
import {
  formatActorDisplayName,
  getBackendUserOptionById,
  getUserDisplayNameMap,
} from "@/lib/backend-users";
import {
  canAuthorEditOwnContentStatus,
  canTransitionContentStatus,
  CONTENT_STATUSES,
  hasElevatedContentWorkflowRole,
  isAuthorOnlyContentWorkflowRole,
  resolveCreateContentStatus,
  type ContentStatus,
} from "@/lib/content-status";
import {
  getStatusRevisionChangeType,
  resolveRestoredContentStatus,
  type ContentRevisionChangeType,
} from "@/lib/content-revision-policy";
import {
  isContentLive,
  normalizeContentScheduleForRestore,
  normalizeContentScheduleForWrite,
} from "@/lib/content-schedule";
import {
  DEFAULT_VISIBILITY,
  sanitizeVisibilityInput,
  VISIBILITY_ROLES,
} from "@/lib/content-visibility";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { slugify } from "@/lib/utils";
import { renderTiptapHtml } from "./_editors/render-tiptap-html";
import { getLock, isLockedBy, logLockEvent } from "@/data/content-locks";
import {
  CMS_CONTENT_TYPES,
  categoryTypeForContentType,
} from "@/lib/content-types";
import { canCreateContentType } from "@/lib/content-type-permissions";

// ─── Auth helpers ─────────────────────────────────────────────────────────────

type Actor = { userId: string; roles: Role[] };

async function loadActor(): Promise<Actor | null> {
  const user = await getOptionalCurrentUser();
  if (!user) return null;
  const roles = getRoles(user.publicMetadata);
  const allowed = ["admin", "publisher", "author"] as const;
  if (!roles.some((r) => (allowed as readonly string[]).includes(r))) {
    return null;
  }
  return { userId: user.id, roles };
}

async function getRolesForUserId(userId: string): Promise<Role[]> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return getRoles(user.publicMetadata);
  } catch {
    return [];
  }
}

function highestRole(roles: Role[]): Role {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("publisher")) return "publisher";
  if (roles.includes("author")) return "author";
  return "viewer";
}

async function canEdit(actor: Actor, target: ContentRow): Promise<boolean> {
  if (hasRole(actor.roles, "admin")) return true;
  if (target.contentType === "webshop") return false;
  // Author-only users can keep working on their own drafts/review submissions,
  // but published/approved/archived rows need a publisher/admin transition.
  if (target.authorId === actor.userId) {
    if (!isAuthorOnlyContentWorkflowRole(actor.roles)) return true;
    return canAuthorEditOwnContentStatus(
      actor.roles,
      target.status as ContentStatus,
    );
  }
  // Publisher may edit author's content (not admin's, not other publisher's)
  if (hasRole(actor.roles, "publisher")) {
    const targetRoles = await getRolesForUserId(target.authorId);
    return highestRole(targetRoles) === "author";
  }
  return false;
}

async function canTransitionStatus(
  actor: Actor,
  target: ContentRow,
  nextStatus: ContentStatus,
): Promise<boolean> {
  const canEditTarget = await canEdit(actor, target);
  return canTransitionContentStatus({
    actorRoles: actor.roles,
    canEditTarget,
    fromStatus: target.status as ContentStatus,
    isOwner: target.authorId === actor.userId,
    toStatus: nextStatus,
  });
}

function canSetHomepage(actor: Actor): boolean {
  return hasRole(actor.roles, "admin");
}

async function getListActionLockError(
  contentId: string,
): Promise<string | null> {
  const lock = await getLock(contentId);
  if (!lock) return null;
  return `This content is currently being edited by ${lock.userDisplayName}. Wait until the current editor closes the page.`;
}

// ─── HTML rendering ───────────────────────────────────────────────────────────

function renderHtml(contentType: ContentType, contentJson: unknown): string {
  if (
    contentType === "page" ||
    contentType === "hero_slider" ||
    contentType === "webshop"
  ) {
    // Pages are rendered at request time using Puck's RSC <Render>.
    // Hero sliders and webshops are rendered from their structured CMS shell
    // state, not pre-rendered rich text.
    return "";
  }
  return renderTiptapHtml(contentJson);
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const baseFields = {
  categoryId: z.string().uuid("Invalid category."),
  title: z.string().min(1, "Title is required.").max(300),
  slug: z
    .string()
    .min(1, "Slug is required.")
    .max(200)
    .regex(slugRegex, "Slug must be lowercase letters, numbers and dashes."),
  metaTitle: z.string().max(300).optional().nullable(),
  metaDescription: z.string().max(1000).optional().nullable(),
  excerpt: z.string().max(2000).optional().nullable(),
  coverImage: z.string().max(2000).optional().nullable(),
  contentJson: z.unknown(),
};

const scheduleDateSchema = z
  .union([z.string(), z.date()])
  .nullable()
  .optional();

const commentFlagFields = {
  enableComments: z.boolean().optional(),
  autoPublishComments: z.boolean().optional(),
  allowAnonymousComments: z.boolean().optional(),
};

const visibilitySchema = z
  .object({
    public: z.boolean(),
    roles: z.array(z.enum(VISIBILITY_ROLES)),
  })
  .optional();

const createSchema = z.object({
  contentType: z.enum(CMS_CONTENT_TYPES),
  status: z.enum(CONTENT_STATUSES).optional(),
  publishAt: scheduleDateSchema,
  unpublishAt: scheduleDateSchema,
  homepage: z.boolean().optional(),
  visibility: visibilitySchema,
  ...commentFlagFields,
  ...baseFields,
});

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(CONTENT_STATUSES).optional(),
  publishAt: scheduleDateSchema,
  unpublishAt: scheduleDateSchema,
  homepage: z.boolean().optional(),
  visibility: visibilitySchema,
  /** Optimistic concurrency version loaded by the editor. */
  expectedVersion: z.number().int().min(1).optional(),
  /** Lock ownership (per-tab client id) — when present, the server
   * enforces that the caller still holds the edit lock. */
  lockClientId: z.string().min(1).max(128).optional(),
  ...commentFlagFields,
  ...baseFields,
});

export type CreateContentInput = z.infer<typeof createSchema>;
export type UpdateContentInput = z.infer<typeof updateSchema>;

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createContent(input: CreateContentInput) {
  const actor = await loadActor();
  if (!actor) return { error: "Forbidden." };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;
  if (!canCreateContentType(actor.roles, data.contentType)) {
    return { error: "Forbidden." };
  }

  const category = await getCategoryById(data.categoryId);
  if (!category) return { error: "Selected category does not exist." };
  if (category.contentType !== categoryTypeForContentType(data.contentType)) {
    return {
      error: "Selected category does not match the chosen content type.",
    };
  }

  const slug = slugify(data.slug);
  if (!slug) return { error: "Invalid slug." };
  if (await existsSlug(slug)) {
    return { error: "Slug is already in use." };
  }

  const status = resolveCreateContentStatus(actor.roles, data.status);
  if (!status) {
    return { error: "Content cannot be created with that status." };
  }
  const settings = await getGlobalSettings();
  const now = new Date();
  const schedule = normalizeContentScheduleForWrite({
    actorRoles: actor.roles,
    status,
    publishAtInput: data.publishAt,
    unpublishAtInput: data.unpublishAt,
    timeZone: settings.regional.timezone,
    now,
  });
  if (!schedule.ok) return { error: schedule.error };
  const publishedAt = status === "published" ? now : null;
  const willBeLive = isContentLive(
    {
      status,
      publishAt: schedule.publishAt,
      unpublishAt: schedule.unpublishAt,
    },
    now,
  );

  // Homepage handling — admin only, page only, must be live now.
  let homepage = false;
  if (data.homepage) {
    if (!canSetHomepage(actor)) {
      return { error: "Only admins can set the homepage." };
    }
    if (data.contentType !== "page") {
      return { error: "Only pages can be set as the homepage." };
    }
    if (!willBeLive) {
      return { error: "Homepage must be live now." };
    }
    homepage = true;
  }

  let html = "";
  try {
    html = renderHtml(data.contentType, data.contentJson);
  } catch (err) {
    console.error("[createContent] render error", err);
    return {
      error: `Failed to render content: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  try {
    const isBlogPost = data.contentType === "blog_post";
    const created = await db.transaction(async (tx) => {
      if (homepage) {
        await clearOtherHomepageRowsWithSnapshots(
          tx,
          actor.userId,
          undefined,
          "saved",
          "Cleared homepage before creating homepage content.",
        );
      }
      const rows = await tx
        .insert(content)
        .values({
          contentType: data.contentType,
          categoryId: data.categoryId,
          title: data.title,
          slug,
          content: html,
          contentJson: data.contentJson as object,
          metaTitle: data.metaTitle ?? null,
          metaDescription: data.metaDescription ?? null,
          excerpt: data.excerpt ?? null,
          coverImage: data.coverImage ?? null,
          status,
          publishedAt,
          publishAt: schedule.publishAt,
          unpublishAt: schedule.unpublishAt,
          authorId: actor.userId,
          updatedBy: actor.userId,
          homepage,
          enableComments: isBlogPost ? !!data.enableComments : false,
          autoPublishComments: isBlogPost ? !!data.autoPublishComments : false,
          allowAnonymousComments: isBlogPost
            ? !!data.allowAnonymousComments
            : false,
          visibility: sanitizeVisibilityInput(
            data.visibility ?? DEFAULT_VISIBILITY,
          ),
        })
        .returning();
      const row = rows[0];
      await createContentRevisionSnapshotForRow(
        tx,
        row,
        actor.userId,
        "created",
      );
      return row;
    });

    revalidatePath("/dashboard/content");
    if (data.contentType === "webshop") revalidatePath("/dashboard/webshop");
    if (willBeLive || homepage) {
      updateTag("top-menu");
      revalidatePath("/");
      revalidatePath("/", "layout");
    }
    return { success: true, id: created.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return { error: "Slug is already in use." };
    }
    console.error("[createContent] db error", err);
    return { error: "Something went wrong." };
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateContent(input: UpdateContentInput) {
  const actor = await loadActor();
  if (!actor) return { error: "Forbidden." };

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const target = await getContentById(data.id);
  if (!target) return { error: "Content not found." };

  if (!(await canEdit(actor, target))) return { error: "Forbidden." };

  const category = await getCategoryById(data.categoryId);
  if (!category) return { error: "Selected category does not exist." };
  if (
    category.contentType !==
    categoryTypeForContentType(target.contentType as ContentType)
  ) {
    return {
      error: "Selected category does not match this content's type.",
    };
  }

  const slug = slugify(data.slug);
  if (!slug) return { error: "Invalid slug." };
  if (slug !== target.slug && (await existsSlug(slug, target.id))) {
    return { error: "Slug is already in use." };
  }

  // ─── Edit-lock ownership check ─────────────────────────────────────────
  // The save is rejected if the caller no longer owns the edit lock
  // (admin takeover, lease expired, etc). Skipped when no lockClientId
  // was provided (back-compat for callers that don't participate in the
  // locking system yet — those still get the version guard below).
  if (data.lockClientId) {
    const stillOwns = await isLockedBy({
      contentId: target.id,
      userId: actor.userId,
      sessionId: (await auth()).sessionId ?? "",
      clientId: data.lockClientId,
    });
    if (!stillOwns) {
      return {
        error:
          "Your editing session was ended (another editor took over or your lock expired).",
        code: "LOCK_LOST" as const,
      };
    }
  }

  const settings = await getGlobalSettings();

  // Status changes need publish permission
  const now = new Date();
  let nextStatus = target.status as ContentStatus;
  let nextPublishedAt = target.publishedAt;
  if (data.status && data.status !== target.status) {
    if (!(await canTransitionStatus(actor, target, data.status))) {
      return { error: "You are not allowed to change the status." };
    }
    nextStatus = data.status;
    if (data.status === "published" && !target.publishedAt) {
      nextPublishedAt = new Date();
    }
  }
  const schedule = normalizeContentScheduleForWrite({
    actorRoles: actor.roles,
    status: nextStatus,
    publishAtInput: data.publishAt,
    unpublishAtInput: data.unpublishAt,
    currentPublishAt: target.publishAt,
    currentUnpublishAt: target.unpublishAt,
    timeZone: settings.regional.timezone,
    now,
  });
  if (!schedule.ok) return { error: schedule.error };
  if (nextStatus === "published" && !target.publishedAt) {
    nextPublishedAt = now;
  }
  const willBeLive = isContentLive(
    {
      status: nextStatus,
      publishAt: schedule.publishAt,
      unpublishAt: schedule.unpublishAt,
    },
    now,
  );
  const wasLive = isContentLive(target, now);

  // Homepage logic
  let homepage = target.homepage;
  const wantsHomepageChange =
    typeof data.homepage === "boolean" && data.homepage !== target.homepage;
  if (wantsHomepageChange) {
    if (!canSetHomepage(actor)) {
      return { error: "Only admins can set the homepage." };
    }
    if (data.homepage) {
      if (target.contentType !== "page") {
        return { error: "Only pages can be set as the homepage." };
      }
      if (!willBeLive) {
        return { error: "Homepage must be live now." };
      }
    }
    homepage = data.homepage!;
  }
  if (homepage && !willBeLive) {
    homepage = false;
  }

  let html = "";
  try {
    html = renderHtml(target.contentType as ContentType, data.contentJson);
  } catch (err) {
    console.error("[updateContent] render error", err);
    return { error: "Failed to render content." };
  }

  const scheduleChanged =
    Number(target.publishAt ?? null) !== Number(schedule.publishAt ?? null) ||
    Number(target.unpublishAt ?? null) !== Number(schedule.unpublishAt ?? null);
  const revisionChangeType =
    nextStatus !== target.status
      ? getStatusRevisionChangeType({
          fromStatus: target.status as ContentStatus,
          toStatus: nextStatus,
        })
      : scheduleChanged
        ? "scheduled"
        : "saved";

  try {
    const isBlogPost = target.contentType === "blog_post";
    // ─── Version-guarded UPDATE ───────────────────────────────────────────
    // If the editor passed an expectedVersion, use the optimistic
    // concurrency helper. On a mismatch, log and return a structured
    // STALE_CONTENT error so the client can prompt the user.
    const updatePayload = {
      categoryId: data.categoryId,
      title: data.title,
      slug,
      content: html,
      contentJson: data.contentJson as object,
      metaTitle: data.metaTitle ?? null,
      metaDescription: data.metaDescription ?? null,
      excerpt: data.excerpt ?? null,
      coverImage: data.coverImage ?? null,
      status: nextStatus,
      publishedAt: nextPublishedAt,
      publishAt: schedule.publishAt,
      unpublishAt: schedule.unpublishAt,
      updatedBy: actor.userId,
      homepage,
      ...(isBlogPost
        ? {
            enableComments:
              typeof data.enableComments === "boolean"
                ? data.enableComments
                : target.enableComments,
            autoPublishComments:
              typeof data.autoPublishComments === "boolean"
                ? data.autoPublishComments
                : target.autoPublishComments,
            allowAnonymousComments:
              typeof data.allowAnonymousComments === "boolean"
                ? data.allowAnonymousComments
                : target.allowAnonymousComments,
          }
        : {}),
      ...(data.visibility
        ? { visibility: sanitizeVisibilityInput(data.visibility) }
        : {}),
    } as const;

    const result = await updateContentWithRevision({
      id: data.id,
      actorId: actor.userId,
      values: updatePayload,
      changeType: revisionChangeType,
      expectedVersion: data.expectedVersion,
      skipIfUnchanged: true,
      beforeUpdate:
        wantsHomepageChange && homepage
          ? async (tx) => {
              await clearOtherHomepageRowsWithSnapshots(
                tx,
                actor.userId,
                target.id,
                "saved",
                "Cleared homepage before saving homepage content.",
              );
            }
          : undefined,
    });
    if (!result.ok) {
      if (result.reason === "stale") {
        await logLockEvent({
          contentId: data.id,
          userId: actor.userId,
          event: "save_rejected_stale",
          metadata: {
            expectedVersion: data.expectedVersion,
            currentVersion: result.currentVersion,
          },
        });
        return {
          error:
            "This content was changed by someone else after you opened it. Reload to get the latest version.",
          code: "STALE_CONTENT" as const,
          currentVersion: result.currentVersion,
        };
      }
      return { error: "Content not found." };
    }
    const newVersion = result.row.version;
    if (!result.changed) {
      return { success: true, version: newVersion, unchanged: true as const };
    }

    revalidatePath("/dashboard/content");
    revalidatePath(`/dashboard/content/${data.id}/edit`);
    if (target.contentType === "webshop") revalidatePath("/dashboard/webshop");
    if (slug !== target.slug) {
      // Slug changed: refresh URLs of any menu items linked to this content
      await db
        .update(topMenuItems)
        .set({ url: "/" + slug })
        .where(eq(topMenuItems.contentId, target.id));
      // Write-through invalidation so the public top-menu reflects the
      // new slug on the very next request (revalidateTag with a profile
      // would only schedule a background SWR refresh).
      updateTag("top-menu");
      revalidatePath("/", "layout");
    }
    if (wasLive || willBeLive || wantsHomepageChange || scheduleChanged) {
      updateTag("top-menu");
      revalidatePath("/");
      revalidatePath("/", "layout");
      revalidatePath(`/${slug}`);
      if (slug !== target.slug) revalidatePath(`/${target.slug}`);
    }
    // ─── Lock is intentionally NOT released here ─────────────────────────
    // The editor must keep the edit lock while they remain on the edit
    // page, even after a successful Save. The lock is released only when
    // the editor explicitly exits the page (Save and close → client
    // navigates away → provider unmount → release; or Cancel → same).
    // Releasing on every Save would allow a waiting user to grab the lock
    // mid-edit and trigger a stale-takeover popup for the current editor.
    return { success: true, version: newVersion, unchanged: false as const };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return { error: "Slug is already in use." };
    }
    console.error("[updateContent] db error", err);
    return { error: "Something went wrong." };
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

const idSchema = z.object({ id: z.string().uuid() });

export async function deleteContent(input: { id: string }) {
  const actor = await loadActor();
  if (!actor) return { error: "Forbidden." };

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid id." };

  const target = await getContentById(parsed.data.id);
  if (!target) return { error: "Content not found." };
  if (!(await canEdit(actor, target))) return { error: "Forbidden." };
  const lockError = await getListActionLockError(target.id);
  if (lockError) return { error: lockError };
  if (target.homepage) {
    return {
      error:
        "Cannot delete the homepage. Assign another page as homepage first.",
    };
  }

  const wasLive = isContentLive(target);
  const result = await softDeleteContentWithRevision({
    row: target,
    actorId: actor.userId,
    changeNote: "Moved content to deleted items.",
  });
  if (!result.ok) {
    return {
      error:
        result.reason === "not_found"
          ? "Content not found."
          : "Content is already deleted.",
    };
  }

  revalidatePath("/dashboard/content");
  if (target.contentType === "webshop") revalidatePath("/dashboard/webshop");
  if (wasLive) {
    updateTag("top-menu");
    revalidatePath("/", "layout");
    revalidatePath("/");
    revalidatePath(`/${target.slug}`);
  }
  return { success: true };
}

export async function restoreDeletedContent(input: { id: string }) {
  const actor = await loadActor();
  if (!actor) return { error: "Forbidden." };

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid id." };

  const target = await getContentById(parsed.data.id, { includeDeleted: true });
  if (!target) return { error: "Content not found." };
  if (!target.deletedAt) return { error: "Content is not deleted." };
  if (!(await canEdit(actor, target))) return { error: "Forbidden." };

  const lockError = await getListActionLockError(target.id);
  if (lockError) return { error: lockError };

  const result = await restoreDeletedContentWithRevision({
    contentId: target.id,
    actorId: actor.userId,
    changeNote: "Restored deleted content.",
  });
  if (!result.ok) {
    return {
      error:
        result.reason === "not_found"
          ? "Content not found."
          : "Content is not deleted.",
    };
  }

  revalidatePath("/dashboard/content");
  if (result.row.contentType === "webshop")
    revalidatePath("/dashboard/webshop");
  if (isContentLive(result.row)) {
    updateTag("top-menu");
    revalidatePath("/", "layout");
    revalidatePath("/");
    revalidatePath(`/${result.row.slug}`);
  }
  return { success: true };
}

export async function permanentlyDeleteContent(input: { id: string }) {
  const actor = await loadActor();
  if (!actor) return { error: "Forbidden." };
  if (!hasRole(actor.roles, "admin")) return { error: "Forbidden." };

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid id." };

  const target = await getContentById(parsed.data.id, { includeDeleted: true });
  if (!target) return { error: "Content not found." };
  if (!target.deletedAt) {
    return { error: "Only deleted content can be permanently deleted." };
  }

  const lockError = await getListActionLockError(target.id);
  if (lockError) return { error: lockError };

  // Mark dependent menu items as broken before the FK nulls out content_id.
  const dependents = await db
    .select({ id: topMenuItems.id, label: topMenuItems.label })
    .from(topMenuItems)
    .where(eq(topMenuItems.contentId, target.id));
  if (dependents.length > 0) {
    await Promise.all(
      dependents.map((d) =>
        db
          .update(topMenuItems)
          .set({
            url: "#",
            label: d.label.endsWith(" (broken)")
              ? d.label
              : `${d.label} (broken)`,
          })
          .where(eq(topMenuItems.id, d.id)),
      ),
    );
  }

  const result = await hardDeleteContentWithRevisions({ contentId: target.id });
  if (!result.ok) return { error: "Content not found." };

  revalidatePath("/dashboard/content");
  if (target.contentType === "webshop") revalidatePath("/dashboard/webshop");
  if (dependents.length > 0) {
    updateTag("top-menu");
    revalidatePath("/", "layout");
  }
  if (isContentLive(target)) {
    updateTag("top-menu");
    revalidatePath("/", "layout");
    revalidatePath("/");
    revalidatePath(`/${target.slug}`);
  }
  return { success: true };
}

// ─── Status / Homepage ────────────────────────────────────────────────────────

const setStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(CONTENT_STATUSES),
});

export async function setStatus(input: z.infer<typeof setStatusSchema>) {
  const actor = await loadActor();
  if (!actor) return { error: "Forbidden." };

  const parsed = setStatusSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const target = await getContentById(parsed.data.id);
  if (!target) return { error: "Content not found." };
  if (!(await canTransitionStatus(actor, target, parsed.data.status))) {
    return { error: "Forbidden." };
  }
  const lockError = await getListActionLockError(target.id);
  if (lockError) return { error: lockError };

  const now = new Date();
  const updates: Partial<typeof content.$inferInsert> = {
    status: parsed.data.status,
    updatedBy: actor.userId,
  };
  if (parsed.data.status === "published" && !target.publishedAt) {
    updates.publishedAt = now;
  }
  if (parsed.data.status === "published") {
    updates.publishAt = null;
    if (target.unpublishAt && target.unpublishAt <= now) {
      updates.unpublishAt = null;
    }
  }
  if (
    parsed.data.status === "draft" ||
    parsed.data.status === "in_review" ||
    parsed.data.status === "archived"
  ) {
    updates.publishAt = null;
    updates.unpublishAt = null;
  }
  // If unpublishing the homepage, also clear homepage flag
  if (
    (parsed.data.status !== "published" ||
      !isContentLive({
        status: parsed.data.status,
        publishAt:
          "publishAt" in updates ? updates.publishAt : target.publishAt,
        unpublishAt:
          "unpublishAt" in updates ? updates.unpublishAt : target.unpublishAt,
      })) &&
    target.homepage
  ) {
    updates.homepage = false;
  }

  const result = await updateContentWithRevision({
    id: target.id,
    actorId: actor.userId,
    values: updates,
    expectedVersion: target.version,
    changeType: getStatusRevisionChangeType({
      fromStatus: target.status as ContentStatus,
      toStatus: parsed.data.status,
    }),
  });
  if (!result.ok) {
    return {
      error:
        result.reason === "stale"
          ? "This content changed before the status update completed. Reload and try again."
          : "Content not found.",
    };
  }

  revalidatePath("/dashboard/content");
  if (target.contentType === "webshop") revalidatePath("/dashboard/webshop");
  updateTag("top-menu");
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath(`/${target.slug}`);
  return { success: true };
}

export async function setHomepage(input: { id: string }) {
  const actor = await loadActor();
  if (!actor) return { error: "Forbidden." };
  if (!canSetHomepage(actor))
    return { error: "Only admins can set the homepage." };

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid id." };

  const target = await getContentById(parsed.data.id);
  if (!target) return { error: "Content not found." };
  if (target.contentType !== "page") {
    return { error: "Only pages can be set as the homepage." };
  }
  if (!isContentLive(target)) {
    return { error: "Homepage must be live now." };
  }
  const lockError = await getListActionLockError(target.id);
  if (lockError) return { error: lockError };

  const result = await updateContentWithRevision({
    id: target.id,
    actorId: actor.userId,
    values: { homepage: true, updatedBy: actor.userId },
    expectedVersion: target.version,
    changeType: "saved",
    changeNote: "Set as homepage.",
    beforeUpdate: async (tx) => {
      await clearOtherHomepageRowsWithSnapshots(
        tx,
        actor.userId,
        target.id,
        "saved",
        "Cleared homepage before setting homepage.",
      );
    },
  });
  if (!result.ok) {
    return {
      error:
        result.reason === "stale"
          ? "This content changed before the homepage update completed. Reload and try again."
          : "Content not found.",
    };
  }

  revalidatePath("/dashboard/content");
  revalidatePath("/");
  return { success: true };
}

const HISTORY_PAGE_SIZE = 3;

const contentHistoryFilterSchema = z.enum([
  "all",
  "saved",
  "workflow",
  "restored",
]);

type ContentHistoryFilter = z.infer<typeof contentHistoryFilterSchema>;

const historyFilterChangeTypes: Record<
  ContentHistoryFilter,
  readonly ContentRevisionChangeType[] | undefined
> = {
  all: undefined,
  saved: ["created", "saved"],
  workflow: [
    "submitted_for_review",
    "approved",
    "published",
    "unpublished",
    "archived",
    "scheduled",
  ],
  restored: ["restored"],
};

const listRevisionHistorySchema = z.object({
  contentId: z.string().uuid(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(25).optional(),
  filter: contentHistoryFilterSchema.optional(),
});

function serializeContentRevisionHistory(
  revisions: Awaited<ReturnType<typeof listContentRevisions>>["rows"],
  actorNameMap: Map<string, string>,
) {
  return revisions.map((revision) => ({
    id: revision.id,
    revisionNumber: revision.revisionNumber,
    contentVersion: revision.contentVersion,
    changeType: revision.changeType,
    createdBy: revision.createdBy,
    createdByName:
      actorNameMap.get(revision.createdBy) ??
      formatActorDisplayName(revision.createdBy),
    createdAt: revision.createdAt.toISOString(),
    status: revision.status as ContentStatus,
    title: revision.title,
    slug: revision.slug,
    homepage: revision.homepage,
    publishAt: revision.publishAt?.toISOString() ?? null,
    unpublishAt: revision.unpublishAt?.toISOString() ?? null,
  }));
}

export async function listContentRevisionHistory(
  input: z.infer<typeof listRevisionHistorySchema>,
) {
  const actor = await loadActor();
  if (!actor) return { error: "Forbidden." };

  const parsed = listRevisionHistorySchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };
  const data = parsed.data;

  const target = await getContentById(data.contentId);
  if (!target) return { error: "Content not found." };
  if (!(await canEdit(actor, target))) return { error: "Forbidden." };

  const filter = data.filter ?? "all";
  const page = data.page ?? 1;
  const pageSize = data.pageSize ?? HISTORY_PAGE_SIZE;
  const result = await listContentRevisions(target.id, {
    page,
    pageSize,
    changeTypes: historyFilterChangeTypes[filter],
  });
  const actorNameMap = await getUserDisplayNameMap(
    result.rows.map((revision) => revision.createdBy),
  );

  return {
    success: true,
    page,
    pageSize,
    total: result.total,
    revisions: serializeContentRevisionHistory(result.rows, actorNameMap),
  };
}

const restoreRevisionSchema = z.object({
  contentId: z.string().uuid(),
  revisionId: z.number().int().positive(),
  expectedVersion: z.number().int().min(1).optional(),
  lockClientId: z.string().min(1).max(128).optional(),
});

export async function restoreContentRevision(
  input: z.infer<typeof restoreRevisionSchema>,
) {
  const actor = await loadActor();
  if (!actor) return { error: "Forbidden." };

  const parsed = restoreRevisionSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };
  const data = parsed.data;

  const target = await getContentById(data.contentId);
  if (!target) return { error: "Content not found." };
  const canEditTarget = await canEdit(actor, target);
  if (!canEditTarget) return { error: "Forbidden." };

  if (data.lockClientId) {
    const stillOwns = await isLockedBy({
      contentId: target.id,
      userId: actor.userId,
      sessionId: (await auth()).sessionId ?? "",
      clientId: data.lockClientId,
    });
    if (!stillOwns) {
      return {
        error:
          "Your editing session was ended (another editor took over or your lock expired).",
        code: "LOCK_LOST" as const,
      };
    }
  } else {
    const lockError = await getListActionLockError(target.id);
    if (lockError) return { error: lockError };
  }

  const revision = await getContentRevision(data.contentId, data.revisionId);
  if (!revision) return { error: "Revision not found." };

  const revisionStatus = revision.status as ContentStatus;
  const restoredStatus = resolveRestoredContentStatus({
    actorRoles: actor.roles,
    canEditTarget,
    currentStatus: target.status as ContentStatus,
    isOwner: target.authorId === actor.userId,
    revisionStatus,
  });

  const schedule = normalizeContentScheduleForRestore({
    actorRoles: actor.roles,
    status: restoredStatus,
    publishAtInput: hasElevatedContentWorkflowRole(actor.roles)
      ? revision.publishAt
      : undefined,
    unpublishAtInput: hasElevatedContentWorkflowRole(actor.roles)
      ? revision.unpublishAt
      : undefined,
    now: new Date(),
  });
  if (!schedule.ok) return { error: schedule.error };

  const willBeLiveAfterRestore = isContentLive({
    status: restoredStatus,
    publishAt: schedule.publishAt,
    unpublishAt: schedule.unpublishAt,
  });
  const restoredHomepage =
    revision.homepage &&
    canSetHomepage(actor) &&
    target.contentType === "page" &&
    willBeLiveAfterRestore;
  const result = await restoreContentRevisionRow({
    contentId: data.contentId,
    revisionId: data.revisionId,
    actorId: actor.userId,
    status: restoredStatus,
    publishAt: schedule.publishAt,
    unpublishAt: schedule.unpublishAt,
    homepage: restoredHomepage,
    expectedVersion: data.expectedVersion,
    changeNote: `Restored revision #${revision.revisionNumber}.`,
  });

  if (!result.ok) {
    if (result.reason === "stale") {
      await logLockEvent({
        contentId: data.contentId,
        userId: actor.userId,
        event: "save_rejected_stale",
        metadata: {
          expectedVersion: data.expectedVersion,
          currentVersion: result.currentVersion,
          restoreRevisionId: data.revisionId,
        },
      });
      return {
        error:
          "This content was changed by someone else after you opened it. Reload to get the latest version.",
        code: "STALE_CONTENT" as const,
        currentVersion: result.currentVersion,
      };
    }
    if (result.reason === "slug_conflict") {
      return {
        error: "Revision slug is already in use by another content item.",
      };
    }
    if (result.reason === "homepage_not_live") {
      return {
        error: "Homepage can only be restored to a live published page.",
      };
    }
    return {
      error:
        result.reason === "revision_not_found"
          ? "Revision not found."
          : "Content not found.",
    };
  }

  if (result.previous.slug !== result.row.slug) {
    await db
      .update(topMenuItems)
      .set({ url: "/" + result.row.slug })
      .where(eq(topMenuItems.contentId, result.row.id));
  }

  const wasLive = isContentLive(result.previous);
  const isLive = isContentLive(result.row);
  const publicAffected =
    wasLive || isLive || result.previous.homepage || result.row.homepage;

  revalidatePath("/dashboard/content");
  revalidatePath(`/dashboard/content/${data.contentId}/edit`);
  if (result.row.contentType === "webshop")
    revalidatePath("/dashboard/webshop");
  if (publicAffected) {
    updateTag("top-menu");
    revalidatePath("/");
    revalidatePath("/", "layout");
    revalidatePath(`/${result.row.slug}`);
    if (result.previous.slug !== result.row.slug) {
      revalidatePath(`/${result.previous.slug}`);
    }
  }

  const warnings = [
    revisionStatus !== restoredStatus
      ? "Status was adjusted during restore."
      : null,
    revision.homepage && !restoredHomepage
      ? "Homepage flag was not restored."
      : null,
    schedule.sanitized
      ? "Past or invalid schedule dates from the revision were not restored. Set a new schedule if needed."
      : null,
  ].filter((warning): warning is string => Boolean(warning));

  return { success: true, version: result.row.version, warnings };
}

// ─── Batch ────────────────────────────────────────────────────────────────────

const batchIdsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

type BatchResult = {
  success: true;
  results: { id: string; ok: boolean; error?: string }[];
};

export async function batchDelete(input: {
  ids: string[];
}): Promise<BatchResult | { error: string }> {
  const actor = await loadActor();
  if (!actor) return { error: "Forbidden." };
  const parsed = batchIdsSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const results: BatchResult["results"] = [];
  for (const id of parsed.data.ids) {
    const r = await deleteContent({ id });
    results.push({
      id,
      ok: !!("success" in r ? r.success : false),
      error: "error" in r ? r.error : undefined,
    });
  }
  revalidatePath("/dashboard/content");
  return { success: true, results };
}

const batchStatusSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  status: z.enum(CONTENT_STATUSES),
});

export async function batchSetStatus(
  input: z.infer<typeof batchStatusSchema>,
): Promise<BatchResult | { error: string }> {
  const actor = await loadActor();
  if (!actor) return { error: "Forbidden." };
  const parsed = batchStatusSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const results: BatchResult["results"] = [];
  for (const id of parsed.data.ids) {
    const r = await setStatus({ id, status: parsed.data.status });
    results.push({
      id,
      ok: !!("success" in r ? r.success : false),
      error: "error" in r ? r.error : undefined,
    });
  }
  revalidatePath("/dashboard/content");
  return { success: true, results };
}

// ─── Slug uniqueness check (used by client form) ──────────────────────────────

export async function checkSlugAvailable(input: {
  slug: string;
  excludeId?: string;
}): Promise<{ available: boolean }> {
  const actor = await loadActor();
  if (!actor) return { available: false };
  const slug = slugify(input.slug);
  if (!slug) return { available: false };
  const exists = await existsSlug(slug, input.excludeId);
  return { available: !exists };
}

// ─── Reassign author (admin only) ─────────────────────────────────────────────

const reassignSchema = z.object({
  id: z.string().uuid(),
  newAuthorId: z.string().min(1).max(200),
});

export async function reassignContent(input: {
  id: string;
  newAuthorId: string;
}) {
  const actor = await loadActor();
  if (!actor) return { error: "Forbidden." };
  if (!hasRole(actor.roles, "admin")) return { error: "Forbidden." };

  const parsed = reassignSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const target = await getContentById(parsed.data.id);
  if (!target) return { error: "Content not found." };
  const lockError = await getListActionLockError(target.id);
  if (lockError) return { error: lockError };

  const author = await getBackendUserOptionById(parsed.data.newAuthorId);
  if (!author) return { error: "Target user must be a backend user." };

  try {
    const result = await updateContentWithRevision({
      id: parsed.data.id,
      actorId: actor.userId,
      values: {
        authorId: parsed.data.newAuthorId,
        updatedBy: actor.userId,
      },
      expectedVersion: target.version,
      changeType: "saved",
      changeNote: "Reassigned content author.",
    });
    if (!result.ok) {
      return {
        error:
          result.reason === "stale"
            ? "This content changed before reassignment completed. Reload and try again."
            : "Content not found.",
      };
    }
    revalidatePath("/dashboard/content");
    if (target.contentType === "webshop") revalidatePath("/dashboard/webshop");
    return { success: true };
  } catch {
    return { error: "Something went wrong." };
  }
}
