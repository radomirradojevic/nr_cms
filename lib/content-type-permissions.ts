import type { ContentType } from "@/lib/content-types";
import { hasRole, type Role } from "@/lib/roles";

export function canManageWebshopContent(roles: readonly Role[]): boolean {
  return hasRole(roles, "admin");
}

export function canCreateContentType(
  roles: readonly Role[],
  contentType: ContentType,
): boolean {
  if (contentType === "webshop") return canManageWebshopContent(roles);
  return (
    hasRole(roles, "admin") ||
    hasRole(roles, "publisher") ||
    hasRole(roles, "author")
  );
}
