import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { listContent } from "@/data/content";
import { listActiveLocksForContentIds } from "@/data/content-locks";
import { isContentStatus } from "@/lib/content-status";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles } from "@/lib/roles";
import { CMS_CONTENT_TYPES, type ContentType } from "@/lib/content-types";

const ALLOWED_PAGE_SIZES = [10, 20, 30, 50, 100];
const ALLOWED_SORTS = [
  "updated_desc",
  "updated_asc",
  "title_asc",
  "title_desc",
] as const;

export async function GET(request: NextRequest) {
  const user = await getOptionalCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const roles = getRoles(user.publicMetadata);
  const allowed = ["admin", "publisher", "author"];
  if (!roles.some((r) => allowed.includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const rawSize = parseInt(searchParams.get("pageSize") ?? "10", 10);
  const pageSize = ALLOWED_PAGE_SIZES.includes(rawSize) ? rawSize : 10;
  const search = searchParams.get("search")?.trim() || undefined;

  const rawType = searchParams.get("type");
  const contentType =
    rawType && (CMS_CONTENT_TYPES as readonly string[]).includes(rawType)
      ? (rawType as ContentType)
      : undefined;

  const rawStatus = searchParams.get("status");
  const status =
    rawStatus && isContentStatus(rawStatus) ? rawStatus : undefined;
  const view = searchParams.get("view") === "deleted" ? "deleted" : "content";

  const categoryId = searchParams.get("category") || undefined;
  const authorId = searchParams.get("author") || undefined;

  const rawSort = searchParams.get("sort");
  const sort =
    rawSort && (ALLOWED_SORTS as readonly string[]).includes(rawSort)
      ? (rawSort as (typeof ALLOWED_SORTS)[number])
      : "updated_desc";

  const { rows, total } = await listContent({
    page,
    pageSize,
    search,
    contentType,
    status: view === "deleted" ? undefined : status,
    categoryId,
    authorId,
    sort,
    deleted: view === "deleted" ? "only" : "exclude",
  });
  const activeLocks = await listActiveLocksForContentIds(rows.map((r) => r.id));

  // Batch-fetch Clerk user names for all unique author/updater IDs.
  const userIds = [
    ...new Set(
      rows
        .flatMap((r) => [r.authorId, r.updatedBy])
        .concat(rows.map((r) => r.deletedBy))
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const userNameMap = new Map<string, string>();
  if (userIds.length > 0) {
    const client = await clerkClient();
    const { data: clerkUsers } = await client.users.getUserList({
      userId: userIds,
      limit: userIds.length,
    });
    for (const user of clerkUsers) {
      userNameMap.set(
        user.id,
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
          user.emailAddresses[0]?.emailAddress ||
          user.id,
      );
    }
  }

  return NextResponse.json({
    rows: rows.map((r) => ({
      id: r.id,
      contentType: r.contentType,
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      title: r.title,
      slug: r.slug,
      status: r.status,
      homepage: r.homepage,
      authorId: r.authorId,
      authorName: userNameMap.get(r.authorId) ?? r.authorId,
      createdAt: r.createdAt,
      updatedBy: r.updatedBy,
      updatedByName: r.updatedBy
        ? (userNameMap.get(r.updatedBy) ?? null)
        : null,
      updatedAt: r.updatedAt,
      publishedAt: r.publishedAt,
      publishAt: r.publishAt,
      unpublishAt: r.unpublishAt,
      deletedAt: r.deletedAt,
      deletedBy: r.deletedBy,
      deletedByName: r.deletedBy
        ? (userNameMap.get(r.deletedBy) ?? null)
        : null,
      editLock: activeLocks.get(r.id) ?? null,
    })),
    total,
  });
}
