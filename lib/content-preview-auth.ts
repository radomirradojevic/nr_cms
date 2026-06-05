import type { ContentStatus } from "@/lib/content-status";
import { hasRole, type Role } from "@/lib/roles";

export function highestContentPreviewRole(roles: readonly Role[]): Role {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("publisher")) return "publisher";
  if (roles.includes("author")) return "author";
  return "viewer";
}

export function canCreateContentPreviewToken(input: {
  actorRoles: readonly Role[];
  actorUserId: string;
  targetAuthorId: string;
  targetAuthorTopRole?: Role;
  targetStatus: ContentStatus;
}): boolean {
  const {
    actorRoles,
    actorUserId,
    targetAuthorId,
    targetAuthorTopRole,
    targetStatus,
  } = input;

  if (targetStatus === "archived") return false;
  if (hasRole(actorRoles, "admin")) return true;
  if (targetAuthorId === actorUserId) return true;
  if (!hasRole(actorRoles, "publisher")) return false;
  return targetAuthorTopRole === "author";
}
