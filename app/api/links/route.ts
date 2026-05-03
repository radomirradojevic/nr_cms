import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getLinksByUserIdPaginated } from "@/data/links";

const ALLOWED_PAGE_SIZES = [10, 20, 30];

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const rawSize = parseInt(searchParams.get("pageSize") ?? "10", 10);
  const pageSize = ALLOWED_PAGE_SIZES.includes(rawSize) ? rawSize : 10;
  const search = searchParams.get("search")?.trim() || undefined;

  const { links, total } = await getLinksByUserIdPaginated(
    userId,
    page,
    pageSize,
    search,
  );

  return NextResponse.json({ links, total });
}
