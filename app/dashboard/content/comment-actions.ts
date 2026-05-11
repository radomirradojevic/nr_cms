"use server";

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { comments } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

import {
  deleteCommentById,
  getCommentById,
  insertComment,
  updateCommentById,
} from "@/data/comments";
import { getContentById } from "@/data/content";
import { getRoles, hasRole, type Role } from "@/lib/roles";
import { verifyTurnstile } from "@/lib/turnstile";
import { checkCommentRateLimit, getClientIp, hashIp } from "@/lib/rate-limit";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const submitSchema = z.object({
  contentId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  body: z.string().min(1).max(5000),
  guestName: z.string().min(1).max(120).optional(),
  guestEmail: z.string().email().max(254).optional().or(z.literal("")),
  turnstileToken: z.string().min(1).max(4096),
});

const idSchema = z.object({ id: z.string().uuid() });
const setStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "published"]),
});
const bulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(["publish", "unpublish", "delete"]),
});

export type SubmitCommentInput = z.infer<typeof submitSchema>;

// ─── Auth helpers ─────────────────────────────────────────────────────────────

type Actor = { userId: string; roles: Role[] };

async function loadActor(): Promise<Actor | null> {
  const user = await currentUser();
  if (!user) return null;
  const roles = getRoles(user.publicMetadata);
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

function highest(roles: Role[]): Role {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("publisher")) return "publisher";
  if (roles.includes("author")) return "author";
  return "viewer";
}

/**
 * Can `actor` moderate comments on `postAuthorId`'s post?
 *  - admin: always
 *  - post author: only their own post
 *  - publisher: any post not authored by an admin
 */
async function canModeratePost(
  actor: Actor,
  postAuthorId: string,
): Promise<boolean> {
  if (hasRole(actor.roles, "admin")) return true;
  if (postAuthorId === actor.userId) {
    if (hasRole(actor.roles, "author") || hasRole(actor.roles, "publisher")) {
      return true;
    }
  }
  if (hasRole(actor.roles, "publisher")) {
    const targetRoles = await getRolesForUserId(postAuthorId);
    return highest(targetRoles) !== "admin";
  }
  return false;
}

function logModeration(args: {
  userId: string;
  action: string;
  commentId: string;
  postId?: string;
}) {
  console.log(
    `[comment-moderation] user=${args.userId} action=${args.action} comment=${args.commentId}` +
      (args.postId ? ` post=${args.postId}` : ""),
  );
}

// ─── Public submission ────────────────────────────────────────────────────────

export async function submitComment(
  input: SubmitCommentInput,
): Promise<
  { success: true; status: "pending" | "published" } | { error: string }
> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;
  const body = data.body.trim();
  if (body.length < 1 || body.length > 5000) {
    return { error: "Comment must be between 1 and 5000 characters." };
  }

  // 1. Load post
  const post = await getContentById(data.contentId);
  if (!post) return { error: "Post not found." };
  if (post.contentType !== "blog_post") {
    return { error: "Comments are not allowed on this content." };
  }
  if (!post.enableComments) {
    return { error: "Comments are disabled for this post." };
  }
  if (post.status !== "published") {
    return { error: "Cannot comment on unpublished posts." };
  }

  // 2. Auth + identity snapshot
  const { userId } = await auth();
  let authorName: string;
  let authorEmail: string | null = null;
  if (userId) {
    const me = await currentUser();
    authorName =
      [me?.firstName, me?.lastName].filter(Boolean).join(" ") ||
      me?.username ||
      "User";
  } else {
    if (!post.allowAnonymousComments) {
      return { error: "You must be signed in to comment." };
    }
    const guest = data.guestName?.trim();
    if (!guest) return { error: "Name is required." };
    authorName = guest.slice(0, 120);
    authorEmail = (data.guestEmail || "").trim() || null;
  }

  // 3. Verify Turnstile
  const ip = await getClientIp();
  const ok = await verifyTurnstile(data.turnstileToken, ip);
  if (!ok) return { error: "Captcha verification failed." };

  // 4. Validate parent (no replies-to-replies)
  let parentId: string | null = null;
  if (data.parentId) {
    const parent = await getCommentById(data.parentId);
    if (!parent || parent.contentId !== data.contentId) {
      return { error: "Invalid reply target." };
    }
    if (parent.parentId !== null) {
      return { error: "Replies to replies are not allowed." };
    }
    if (parent.status !== "published") {
      return { error: "Cannot reply to an unpublished comment." };
    }
    parentId = parent.id;
  }

  // 5. Rate limit
  const ipHash = hashIp(ip);
  const rl = await checkCommentRateLimit({
    ipHash,
    authorId: userId ?? null,
    body,
  });
  if (!rl.allowed) return { error: rl.reason };

  // 6. Snapshot UA (truncated)
  let userAgent: string | null = null;
  try {
    const h = await headers();
    const ua = h.get("user-agent");
    if (ua) userAgent = ua.slice(0, 255);
  } catch {
    /* noop */
  }

  // 7. Insert
  const status: "pending" | "published" = post.autoPublishComments
    ? "published"
    : "pending";

  try {
    await insertComment({
      contentId: post.id,
      parentId,
      authorId: userId ?? null,
      authorName,
      authorEmail,
      body,
      status,
      ipHash,
      userAgent,
    });
  } catch (err) {
    console.error("[submitComment] db error", err);
    return { error: "Something went wrong." };
  }

  if (status === "published") {
    revalidatePath(`/${post.slug}`);
  }
  revalidatePath(`/dashboard/content/${post.id}/comments`);
  return { success: true, status };
}

// ─── Moderation ───────────────────────────────────────────────────────────────

export async function setCommentStatus(
  input: z.infer<typeof setStatusSchema>,
): Promise<{ success: true } | { error: string }> {
  const actor = await loadActor();
  if (!actor) return { error: "Forbidden." };
  const parsed = setStatusSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const c = await getCommentById(parsed.data.id);
  if (!c) return { error: "Comment not found." };
  const post = await getContentById(c.contentId);
  if (!post) return { error: "Post not found." };
  if (!(await canModeratePost(actor, post.authorId))) {
    return { error: "Forbidden." };
  }

  await updateCommentById(c.id, { status: parsed.data.status });
  logModeration({
    userId: actor.userId,
    action: `set-status:${parsed.data.status}`,
    commentId: c.id,
    postId: post.id,
  });
  revalidatePath(`/dashboard/content/${post.id}/comments`);
  revalidatePath(`/${post.slug}`);
  return { success: true };
}

export async function deleteComment(
  input: z.infer<typeof idSchema>,
): Promise<{ success: true } | { error: string }> {
  const actor = await loadActor();
  if (!actor) return { error: "Forbidden." };
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid id." };

  const c = await getCommentById(parsed.data.id);
  if (!c) return { error: "Comment not found." };
  const post = await getContentById(c.contentId);
  if (!post) return { error: "Post not found." };
  if (!(await canModeratePost(actor, post.authorId))) {
    return { error: "Forbidden." };
  }

  await deleteCommentById(c.id);
  logModeration({
    userId: actor.userId,
    action: "delete",
    commentId: c.id,
    postId: post.id,
  });
  revalidatePath(`/dashboard/content/${post.id}/comments`);
  revalidatePath(`/${post.slug}`);
  return { success: true };
}

export async function bulkModerate(
  input: z.infer<typeof bulkSchema>,
): Promise<
  | { success: true; results: { id: string; ok: boolean; error?: string }[] }
  | { error: string }
> {
  const actor = await loadActor();
  if (!actor) return { error: "Forbidden." };
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  // Pre-load all rows + posts so we can authorize per-row
  const rows = await db
    .select()
    .from(comments)
    .where(inArray(comments.id, parsed.data.ids));

  const results: { id: string; ok: boolean; error?: string }[] = [];
  const postCache = new Map<
    string,
    Awaited<ReturnType<typeof getContentById>>
  >();
  const postsToRevalidate = new Set<string>();

  for (const id of parsed.data.ids) {
    const row = rows.find((r) => r.id === id);
    if (!row) {
      results.push({ id, ok: false, error: "Not found" });
      continue;
    }
    let post = postCache.get(row.contentId);
    if (post === undefined) {
      post = await getContentById(row.contentId);
      postCache.set(row.contentId, post);
    }
    if (!post || !(await canModeratePost(actor, post.authorId))) {
      results.push({ id, ok: false, error: "Forbidden" });
      continue;
    }
    try {
      if (parsed.data.action === "delete") {
        await deleteCommentById(id);
      } else {
        const status =
          parsed.data.action === "publish" ? "published" : "pending";
        await updateCommentById(id, { status });
      }
      logModeration({
        userId: actor.userId,
        action: `bulk:${parsed.data.action}`,
        commentId: id,
        postId: post.id,
      });
      postsToRevalidate.add(`${post.id}|${post.slug}`);
      results.push({ id, ok: true });
    } catch (err) {
      console.error("[bulkModerate]", err);
      results.push({ id, ok: false, error: "DB error" });
    }
  }

  for (const key of postsToRevalidate) {
    const [pid, slug] = key.split("|");
    revalidatePath(`/dashboard/content/${pid}/comments`);
    revalidatePath(`/${slug}`);
  }
  return { success: true, results };
}

// Suppress unused-import warning if we ever drop the `and` import.
void and;
void eq;
