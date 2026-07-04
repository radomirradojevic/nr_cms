import type { ContentStatus } from "@/lib/content-status";
import { hasRole, type Role } from "@/lib/roles";

export function highestContentPreviewRole(roles: readonly Role[]): Role {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("publisher")) return "publisher";
  if (roles.includes("author")) return "author";
  return "viewer";
}

export function hasContentPreviewRole(roles: readonly Role[]): boolean {
  return (
    hasRole(roles, "admin") ||
    hasRole(roles, "publisher") ||
    hasRole(roles, "author")
  );
}

type ContentPreviewAccessInput = {
  actorRoles: readonly Role[];
  actorUserId: string;
  targetAuthorId: string;
  targetAuthorTopRole?: Role;
  targetStatus: ContentStatus;
  targetContentType?: string;
};

export function canAccessContentPreview(
  input: ContentPreviewAccessInput,
): boolean {
  const {
    actorRoles,
    actorUserId,
    targetAuthorId,
    targetAuthorTopRole,
    targetContentType,
    targetStatus,
  } = input;

  if (!hasContentPreviewRole(actorRoles)) return false;
  if (targetStatus === "archived") return false;
  if (hasRole(actorRoles, "admin")) return true;
  if (targetContentType === "webshop") return false;
  if (targetAuthorId === actorUserId) return true;
  if (!hasRole(actorRoles, "publisher")) return false;
  return targetAuthorTopRole === "author";
}

export function canCreateContentPreviewToken(
  input: ContentPreviewAccessInput,
): boolean {
  return canAccessContentPreview(input);
}
