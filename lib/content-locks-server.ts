// Shared helpers for content-lock API routes. Not a route handler.
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";

import { getRoles, type Role } from "@/lib/roles";

export type Actor = {
  userId: string;
  roles: Role[];
  displayName: string;
  sessionId: string;
};

export async function getActor(): Promise<Actor | null> {
  const { userId, sessionId } = await auth();
  if (!userId || !sessionId) return null;
  const user = await currentUser();
  if (!user) return null;
  const roles = getRoles(user.publicMetadata);
  const allowed = ["admin", "publisher", "author"] as const;
  if (!roles.some((r) => (allowed as readonly string[]).includes(r))) {
    return null;
  }
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    user.emailAddresses?.[0]?.emailAddress ||
    user.id;
  return { userId, roles, displayName, sessionId };
}

export async function loadAuthorRolesIfNeeded(
  actorRoles: Role[],
  authorId: string,
): Promise<Role[] | undefined> {
  if (actorRoles.includes("admin")) return undefined;
  if (!actorRoles.includes("publisher")) return undefined;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(authorId);
    return getRoles(user.publicMetadata);
  } catch {
    return [];
  }
}
