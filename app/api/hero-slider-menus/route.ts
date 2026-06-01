import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { getTopMenuTreeForViewer, type TopMenuTreeNode } from "@/data/top-menu";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles } from "@/lib/roles";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MENU_IDS = 20;

export async function GET(request: NextRequest) {
  await auth({ treatPendingAsSignedOut: false });

  const ids = menuIdsFromRequest(request);
  if (ids.length === 0) {
    return NextResponse.json({ menus: {} });
  }

  const user = await getOptionalCurrentUser(true);
  const viewerRoles = user ? getRoles(user.publicMetadata) : null;
  const entries = await Promise.all(
    ids.map(async (id) => {
      const tree = await getTopMenuTreeForViewer(id, viewerRoles);
      return [id, tree] as const;
    }),
  );

  return NextResponse.json({
    menus: Object.fromEntries(entries) as Record<string, TopMenuTreeNode[]>,
  });
}

function menuIdsFromRequest(request: NextRequest) {
  const raw = request.nextUrl.searchParams
    .getAll("id")
    .flatMap((value) => value.split(","));
  return Array.from(
    new Set(
      raw.map((value) => value.trim()).filter((value) => UUID_RE.test(value)),
    ),
  ).slice(0, MAX_MENU_IDS);
}
