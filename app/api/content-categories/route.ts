import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getCategoriesPaginated } from "@/data/content-categories";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";

const ALLOWED_PAGE_SIZES = [10, 20, 30, 50, 100];
const ALLOWED_TYPES = ["page", "blog_post"] as const;

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!hasRole(roles, "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const rawType = searchParams.get("type");
  if (
    !rawType ||
    !ALLOWED_TYPES.includes(rawType as (typeof ALLOWED_TYPES)[number])
  ) {
    return NextResponse.json(
      { error: "Invalid type parameter" },
      { status: 400 },
    );
  }
  const type = rawType as "page" | "blog_post";

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const rawSize = parseInt(searchParams.get("pageSize") ?? "10", 10);
  const pageSize = ALLOWED_PAGE_SIZES.includes(rawSize) ? rawSize : 10;
  const search = searchParams.get("search")?.trim() || undefined;
  const author = searchParams.get("author")?.trim() || undefined;

  const { categories, total } = await getCategoriesPaginated(
    type,
    page,
    pageSize,
    search,
    author,
  );

  // Resolve Clerk user names for unique creator/updater IDs.
  const userIds = [
    ...new Set(
      categories
        .flatMap((c) => [c.createdBy, c.updatedBy])
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const nameMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const client = await clerkClient();
    await Promise.all(
      userIds.map(async (id) => {
        try {
          const u = await client.users.getUser(id);
          nameMap[id] =
            u.fullName ||
            u.username ||
            u.primaryEmailAddress?.emailAddress ||
            id;
        } catch {
          nameMap[id] = id;
        }
      }),
    );
  }

  const enriched = categories.map((c) => ({
    ...c,
    createdByName: c.createdBy ? (nameMap[c.createdBy] ?? c.createdBy) : null,
    updatedByName: c.updatedBy ? (nameMap[c.updatedBy] ?? c.updatedBy) : null,
  }));

  return NextResponse.json({ categories: enriched, total });
}
