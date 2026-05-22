// Shared helpers for form-lock API routes and Form Builder server actions.

import { auth, currentUser } from "@clerk/nextjs/server";

import { getRoles, hasRole, type Role } from "@/lib/roles";

export type FormActor = {
  userId: string;
  roles: Role[];
  displayName: string;
  sessionId: string;
};

export async function getFormActor(): Promise<FormActor | null> {
  const { userId, sessionId } = await auth();
  if (!userId || !sessionId) return null;
  const user = await currentUser();
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
