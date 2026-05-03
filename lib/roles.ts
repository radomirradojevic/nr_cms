export const ROLES = ["viewer", "author", "publisher", "admin"] as const;
export type Role = (typeof ROLES)[number];

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
