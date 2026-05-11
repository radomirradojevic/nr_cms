import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { clerkClient, currentUser } from "@clerk/nextjs/server";

import { Button } from "@/components/ui/button";
import { getContentById } from "@/data/content";
import {
  countPendingForPost,
  getCommentsByIds,
  listCommentsForPost,
} from "@/data/comments";
import { getRoles, hasRole, type Role } from "@/lib/roles";
import { CommentsTable } from "./comments-table";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    status?: string;
    q?: string;
  }>;
};

const VALID_PAGE_SIZES = [10, 20, 30] as const;
const DEFAULT_PAGE_SIZE = 10;

async function highestRoleForUserId(userId: string): Promise<Role> {
  try {
    const c = await clerkClient();
    const u = await c.users.getUser(userId);
    const roles = getRoles(u.publicMetadata);
    if (roles.includes("admin")) return "admin";
    if (roles.includes("publisher")) return "publisher";
    if (roles.includes("author")) return "author";
    return "viewer";
  } catch {
    return "viewer";
  }
}

export default async function PostCommentsModerationPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const sp = await searchParams;

  const me = await currentUser();
  if (!me) redirect("/");
  const myRoles = getRoles(me.publicMetadata);
  const baseAllowed =
    hasRole(myRoles, "admin") ||
    hasRole(myRoles, "publisher") ||
    hasRole(myRoles, "author");
  if (!baseAllowed) redirect("/dashboard");

  const post = await getContentById(id);
  if (!post) notFound();
  if (post.contentType !== "blog_post") notFound();

  // Authorization (mirrors canModeratePost in comment-actions.ts)
  const isAdmin = hasRole(myRoles, "admin");
  const isPublisher = hasRole(myRoles, "publisher");
  const isOwn = post.authorId === me.id;
  let canModerate = isAdmin || isOwn;
  if (!canModerate && isPublisher) {
    const top = await highestRoleForUserId(post.authorId);
    canModerate = top !== "admin";
  }
  if (!canModerate) redirect("/dashboard/content");

  const page = Math.max(1, Number(sp.page) || 1);
  const rawPageSize = Number(sp.pageSize);
  const pageSize = (VALID_PAGE_SIZES as readonly number[]).includes(rawPageSize)
    ? rawPageSize
    : DEFAULT_PAGE_SIZE;
  const status =
    sp.status === "pending" || sp.status === "published"
      ? sp.status
      : ("all" as const);
  const search = (sp.q ?? "").trim();

  const [{ rows, total }, pendingCount] = await Promise.all([
    listCommentsForPost({
      contentId: post.id,
      page,
      pageSize,
      status: status === "all" ? undefined : status,
      search: search || undefined,
      sort: "created_desc",
    }),
    countPendingForPost(post.id),
  ]);

  // Resolve parent author names for "Reply to …" column
  const parentIds = Array.from(
    new Set(rows.map((r) => r.parentId).filter(Boolean) as string[]),
  );
  const parents = await getCommentsByIds(parentIds);
  const parentLookup: Record<string, string | null> = {};
  for (const p of parents) parentLookup[p.id] = p.authorName;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href={`/dashboard/content/${post.id}/edit`}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to post
            </Link>
          </Button>
          <h1 className="mt-2 text-2xl font-semibold">Comments</h1>
          <p className="text-sm text-muted-foreground">
            Moderating comments for{" "}
            <span className="font-medium">{post.title}</span>
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600">
                {pendingCount} pending
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
          <div>
            Comments enabled:{" "}
            <span className="font-medium">
              {post.enableComments ? "yes" : "no"}
            </span>
          </div>
          <div>
            Auto-publish:{" "}
            <span className="font-medium">
              {post.autoPublishComments ? "yes" : "no"}
            </span>
          </div>
          <div>
            Anonymous allowed:{" "}
            <span className="font-medium">
              {post.allowAnonymousComments ? "yes" : "no"}
            </span>
          </div>
        </div>
      </div>

      <CommentsTable
        postId={post.id}
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        status={status}
        search={search}
        parentLookup={parentLookup}
      />
    </div>
  );
}
