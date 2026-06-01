export const ROLES = ["viewer", "author", "publisher", "admin"] as const;
export type Role = (typeof ROLES)[number];
export const BACKEND_ACCESS_ROLES = ["admin", "publisher", "author"] as const;

export function hasRole(roles: unknown, role: Role): boolean {
  if (!Array.isArray(roles)) return false;
  return roles.includes(role);
}

export function getRoles(publicMetadata: unknown): Role[] {
  if (
    typeof publicMetadata !== "object" ||
    publicMetadata === null ||
    !Array.isArray((publicMetadata as Record<string, unknown>).roles)
  ) {
    return ["viewer"];
  }
  const raw = (publicMetadata as Record<string, unknown>).roles as unknown[];
  return raw.filter((r): r is Role => ROLES.includes(r as Role));
}

export function hasBackendAccess(publicMetadata: unknown): boolean {
  const roles = getRoles(publicMetadata);
  return roles.some((role) =>
    (BACKEND_ACCESS_ROLES as readonly Role[]).includes(role),
  );
}
