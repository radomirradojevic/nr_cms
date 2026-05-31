// Shared helpers for admin-section-lock API routes. Not a route handler.
//
// Mirrors lib/content-locks-server.ts but restricted to admin users —
// admin sections (e.g. /dashboard/global-settings, /dashboard/menus) are
// admin-only by definition.

import { auth } from "@clerk/nextjs/server";

import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole, type Role } from "@/lib/roles";

export type AdminSectionActor = {
  userId: string;
  roles: Role[];
  displayName: string;
  sessionId: string;
};

export async function getAdminSectionActor(): Promise<AdminSectionActor | null> {
  const { userId, sessionId } = await auth();
  if (!userId || !sessionId) return null;
  const user = await getOptionalCurrentUser();
  if (!user) return null;
  const roles = getRoles(user.publicMetadata);
  if (!hasRole(roles, "admin")) return null;
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    user.emailAddresses?.[0]?.emailAddress ||
    user.id;
  return { userId, roles, displayName, sessionId };
}
