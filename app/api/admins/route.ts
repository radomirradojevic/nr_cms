import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { hasRole, getRoles } from "@/lib/roles";

export type AdminUser = { id: string; name: string };

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use the central helper so Clerk API hiccups do not crash this route.
  const me = await getOptionalCurrentUser();
  const roles = getRoles(me?.publicMetadata);
  if (!hasRole(roles, "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const meEntry: AdminUser = {
    id: userId,
    name:
      me?.fullName ||
      me?.username ||
      me?.primaryEmailAddress?.emailAddress ||
      userId,
  };

  const client = await clerkClient();
  const { data: users } = await client.users.getUserList({ limit: 500 });

  const adminMap = new Map<string, AdminUser>();
  adminMap.set(meEntry.id, meEntry);

  for (const u of users) {
    if (hasRole(getRoles(u.publicMetadata), "admin")) {
      adminMap.set(u.id, {
        id: u.id,
        name:
          u.fullName ||
          u.username ||
          u.primaryEmailAddress?.emailAddress ||
          u.id,
      });
    }
  }

  return NextResponse.json({ admins: Array.from(adminMap.values()) });
}
