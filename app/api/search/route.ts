import { NextResponse, type NextRequest } from "next/server";

import {
  searchPublishedContent,
  type ContentType,
} from "@/data/content";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles } from "@/lib/roles";

const VALID_TYPES: ContentType[] = ["blog_post", "page"];

function parseTypes(value: string | null): ContentType[] {
  if (!value) return VALID_TYPES;
  const requested = value
    .split(",")
    .map((type) => type.trim())
    .filter((type): type is ContentType =>
      VALID_TYPES.includes(type as ContentType),
    );
  return Array.from(new Set(requested));
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = (params.get("q") ?? "").trim();
  const limit = Number.parseInt(params.get("limit") ?? "10", 10);
  const contentTypes = parseTypes(params.get("types"));

  if (query.length < 2 || contentTypes.length === 0) {
    return NextResponse.json({ results: [], total: 0 });
  }

  const me = await getOptionalCurrentUser(true);
  const viewerRoles = me ? getRoles(me.publicMetadata) : null;
  const { rows, total } = await searchPublishedContent({
    query,
    contentTypes,
    limit: Number.isFinite(limit) ? Math.min(limit, 10) : 10,
    viewerRoles,
  });

  return NextResponse.json({ results: rows, total });
}
