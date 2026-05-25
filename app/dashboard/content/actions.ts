"use server";

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { content, topMenuItems } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

import {
  clearHomepageFlag,
  deleteContentById,
  existsSlug,
  getContentById,
  insertContent,
  setHomepageById,
  updateContentById,
  type ContentRow,
} from "@/data/content";
import { getCategoryById } from "@/data/content-categories";
import { getRoles, hasRole, type Role } from "@/lib/roles";
import {
  DEFAULT_VISIBILITY,
  sanitizeVisibilityInput,
  VISIBILITY_ROLES,
} from "@/lib/content-visibility";
import { slugify } from "@/lib/utils";
import { renderTiptapHtml } from "./_editors/render-tiptap-html";
import {
  isLockedBy,
  logLockEvent,
  updateContentWithVersion,
  getContentVersion,
} from "@/data/content-locks";

// ─── Auth helpers ─────────────────────────────────────────────────────────────

type Actor = { userId: string; roles: Role[] };

async function loadActor(): Promise<Actor | null> {
  const user = await currentUser();
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
  // Same author always allowed
  if (target.authorId === actor.userId) return true;
  // Publisher may edit author's content (not admin's, not other publisher's)
  if (hasRole(actor.roles, "publisher")) {
    const targetRoles = await getRolesForUserId(target.authorId);
    return highestRole(targetRoles) === "author";
  }
  return false;
}

async function canPublish(actor: Actor, target: ContentRow): Promise<boolean> {
  if (
    hasRole(actor.roles, "author") &&
    !hasRole(actor.roles, "publisher") &&
    !hasRole(actor.roles, "admin")
  ) {
    return false;
  }
  return canEdit(actor, target);
}

function canSetHomepage(actor: Actor): boolean {
  return hasRole(actor.roles, "admin");
}

// ─── HTML rendering ───────────────────────────────────────────────────────────

function renderHtml(
  contentType: "page" | "blog_post",
  contentJson: unknown,
): string {
  if (contentType === "page") {
    // Pages are rendered at request time using Puck's RSC <Render>.
    // Storing an empty string keeps the column non-null for blog posts.
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
  contentType: z.enum(["page", "blog_post"]),
  status: z.enum(["published", "unpublished", "archived"]).optional(),
  homepage: z.boolean().optional(),
  visibility: visibilitySchema,
  ...commentFlagFields,
  ...baseFields,
});

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["published", "unpublished", "archived"]).optional(),
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

  const category = await getCategoryById(data.categoryId);
  if (!category) return { error: "Selected category does not exist." };
  if (category.contentType !== data.contentType) {
    return {
      error: "Selected category does not match the chosen content type.",
    };
  }

  const slug = slugify(data.slug);
  if (!slug) return { error: "Invalid slug." };
  if (await existsSlug(slug)) {
    return { error: "Slug is already in use." };
  }

  const isAuthorOnly =
    hasRole(actor.roles, "author") &&
    !hasRole(actor.roles, "publisher") &&
    !hasRole(actor.roles, "admin");

  const status = isAuthorOnly ? "unpublished" : (data.status ?? "unpublished");
  const publishedAt = status === "published" ? new Date() : null;

  // Homepage handling — admin only, page only, must be published
  let homepage = false;
  if (data.homepage) {
    if (!canSetHomepage(actor)) {
      return { error: "Only admins can set the homepage." };
    }
    if (data.contentType !== "page") {
      return { error: "Only pages can be set as the homepage." };
    }
    if (status !== "published") {
      return { error: "Homepage must be published." };
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
    if (homepage) {
      await db
        .update(content)
        .set({ homepage: false })
        .where(eq(content.homepage, true));
    }
    const isBlogPost = data.contentType === "blog_post";
    const rows = await db
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
        authorId: actor.userId,
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
    const created = rows[0];

    revalidatePath("/dashboard/content");
    if (status === "published" || homepage) revalidatePath("/");
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
  if (category.contentType !== target.contentType) {
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

  // Status changes need publish permission
  let nextStatus = target.status as "published" | "unpublished" | "archived";
  let nextPublishedAt = target.publishedAt;
  if (data.status && data.status !== target.status) {
    if (!(await canPublish(actor, target))) {
      return { error: "You are not allowed to change the status." };
    }
    nextStatus = data.status;
    if (data.status === "published" && !target.publishedAt) {
      nextPublishedAt = new Date();
    }
  }

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
      if (nextStatus !== "published") {
        return { error: "Homepage must be published." };
      }
    }
    homepage = data.homepage!;
  }

  let html = "";
  try {
    html = renderHtml(
      target.contentType as "page" | "blog_post",
      data.contentJson,
    );
  } catch (err) {
    console.error("[updateContent] render error", err);
    return { error: "Failed to render content." };
  }

  try {
    if (wantsHomepageChange && homepage) {
      await db
        .update(content)
        .set({ homepage: false })
        .where(eq(content.homepage, true));
    }
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

    let newVersion: number;
    if (typeof data.expectedVersion === "number") {
      const result = await updateContentWithVersion(
        data.id,
        data.expectedVersion,
        updatePayload,
      );
      if (result === null) {
        const currentVersion = await getContentVersion(data.id);
        await logLockEvent({
          contentId: data.id,
          userId: actor.userId,
          event: "save_rejected_stale",
          metadata: {
            expectedVersion: data.expectedVersion,
            currentVersion,
          },
        });
        return {
          error:
            "This content was changed by someone else after you opened it. Reload to get the latest version.",
          code: "STALE_CONTENT" as const,
          currentVersion,
        };
      }
      newVersion = result;
    } else {
      await db
        .update(content)
        .set({ ...updatePayload, version: sql`${content.version} + 1` })
        .where(eq(content.id, data.id));
      const v = await getContentVersion(data.id);
      newVersion = v ?? 1;
    }

    revalidatePath("/dashboard/content");
    revalidatePath(`/dashboard/content/${data.id}/edit`);
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
    if (
      nextStatus === "published" ||
      target.status === "published" ||
      wantsHomepageChange
    ) {
      revalidatePath("/");
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
    return { success: true, version: newVersion };
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
  if (target.homepage) {
    return {
      error:
        "Cannot delete the homepage. Assign another page as homepage first.",
    };
  }

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

  await deleteContentById(target.id);
  revalidatePath("/dashboard/content");
  if (dependents.length > 0) {
    updateTag("top-menu");
    revalidatePath("/", "layout");
  }
  if (target.status === "published") {
    revalidatePath("/");
    revalidatePath(`/${target.slug}`);
  }
  return { success: true };
}

// ─── Status / Homepage ────────────────────────────────────────────────────────

const setStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["published", "unpublished", "archived"]),
});

export async function setStatus(input: z.infer<typeof setStatusSchema>) {
  const actor = await loadActor();
  if (!actor) return { error: "Forbidden." };

  const parsed = setStatusSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const target = await getContentById(parsed.data.id);
  if (!target) return { error: "Content not found." };
  if (!(await canPublish(actor, target))) return { error: "Forbidden." };

  const updates: Partial<typeof content.$inferInsert> = {
    status: parsed.data.status,
  };
  if (parsed.data.status === "published" && !target.publishedAt) {
    updates.publishedAt = new Date();
  }
  // If unpublishing the homepage, also clear homepage flag
  if (parsed.data.status !== "published" && target.homepage) {
    updates.homepage = false;
  }

  await updateContentById(target.id, updates);

  revalidatePath("/dashboard/content");
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
  if (target.status !== "published") {
    return { error: "Homepage must be published first." };
  }

  await db
    .update(content)
    .set({ homepage: false })
    .where(eq(content.homepage, true));
  await db
    .update(content)
    .set({ homepage: true })
    .where(eq(content.id, target.id));

  revalidatePath("/dashboard/content");
  revalidatePath("/");
  return { success: true };
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
  status: z.enum(["published", "unpublished", "archived"]),
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

export async function fetchClerkUsersForReassign(): Promise<
  { users: { id: string; name: string }[] } | { error: string }
> {
  const actor = await loadActor();
  if (!actor) return { error: "Forbidden." };
  if (!hasRole(actor.roles, "admin")) return { error: "Forbidden." };

  try {
    const client = await clerkClient();
    const { data: users } = await client.users.getUserList({ limit: 200 });
    return {
      users: users.map((u) => ({
        id: u.id,
        name:
          [u.firstName, u.lastName].filter(Boolean).join(" ") ||
          u.emailAddresses[0]?.emailAddress ||
          u.id,
      })),
    };
  } catch {
    return { error: "Failed to fetch users." };
  }
}

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

  // Verify target user exists in Clerk
  try {
    const client = await clerkClient();
    await client.users.getUser(parsed.data.newAuthorId);
  } catch {
    return { error: "Target user not found." };
  }

  try {
    await updateContentById(parsed.data.id, {
      authorId: parsed.data.newAuthorId,
    });
    revalidatePath("/dashboard/content");
    return { success: true };
  } catch {
    return { error: "Something went wrong." };
  }
}

// Suppress unused import warning
void auth;
