import { sql, type SQL } from "drizzle-orm";
import { content } from "@/db/schema";
import { ROLES, type Role } from "@/lib/roles";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Role keys that may appear in `ContentVisibility.roles`.
 * NOTE: `admin` is intentionally excluded — admins always have access
 * implicitly and the admin checkbox in the UI is informational only.
 */
export const VISIBILITY_ROLES = ["viewer", "author", "publisher"] as const;
export type VisibilityRole = (typeof VISIBILITY_ROLES)[number];

export type ContentVisibility = {
  public: boolean;
  roles: VisibilityRole[];
};

export const DEFAULT_VISIBILITY: ContentVisibility = {
  public: true,
  roles: [],
};

export const UNAUTHORIZED_MESSAGE =
  "You are not authorized to see this content - contact administrator for more info";

// ─── Parsing / sanitization ───────────────────────────────────────────────────

/**
 * Coerce an arbitrary stored value into a safe `ContentVisibility`.
 * Used when reading rows whose `visibility` column originated from the DB
 * (jsonb) or from form input.
 */
export function parseVisibility(value: unknown): ContentVisibility {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const v = value as { public?: unknown; roles?: unknown };
    const isPublic = v.public !== false; // default to public if missing
    const rawRoles = Array.isArray(v.roles) ? v.roles : [];
    const roles = rawRoles.filter((r): r is VisibilityRole =>
      (VISIBILITY_ROLES as readonly string[]).includes(r as string),
    );
    return { public: isPublic, roles: Array.from(new Set(roles)) };
  }
  return { ...DEFAULT_VISIBILITY };
}

/**
 * Normalize visibility input from the editor form before persisting:
 * - Strip the implicit `admin` role (never stored).
 * - When `public` is true, clear `roles` for a cleaner DB state.
 * - Deduplicate.
 */
export function sanitizeVisibilityInput(value: unknown): ContentVisibility {
  const parsed = parseVisibility(value);
  if (parsed.public) return { public: true, roles: [] };
  return { public: false, roles: parsed.roles };
}

// ─── Authorization check ─────────────────────────────────────────────────────

/**
 * Decide whether a viewer can see a specific content row.
 *
 * Rules:
 *  1. Admin bypass — `admin` role always has access.
 *  2. Public flag wins — if `visibility.public` is true, anyone (anonymous
 *     or any role) has access; `visibility.roles` is ignored.
 *  3. Otherwise, only signed-in users whose roles intersect
 *     `visibility.roles` (or who are admin) have access.
 *
 * `userRoles === null` represents an anonymous (signed-out) visitor.
 */
export function canViewContent(
  visibility: unknown,
  userRoles: Role[] | null,
): boolean {
  const v = parseVisibility(visibility);

  // Rule 1: admin bypass
  if (userRoles && userRoles.includes("admin")) return true;

  // Rule 2: public overrides everything
  if (v.public) return true;

  // Rule 3: anonymous denied when not public
  if (!userRoles || userRoles.length === 0) return false;

  return userRoles.some((r) =>
    (v.roles as readonly string[]).includes(r as string),
  );
}

// ─── SQL helpers ──────────────────────────────────────────────────────────────

/**
 * Build a Drizzle SQL `WHERE` fragment that matches rows visible to a
 * viewer with the given roles. Pass `null` for anonymous visitors.
 *
 * Returns a fragment intended to be combined with other conditions via
 * `and(...)`. The fragment evaluates to:
 *
 *   visibility->>'public' = 'true'
 *     OR <viewerIsAdmin>
 *     OR (visibility->'roles') ?| array[<viewerRoles>]
 *
 * If no role-array overlap is needed (anonymous), the array clause is
 * omitted. The fragment is always safe to use as part of a larger filter.
 */
export function buildVisibilityWhere(userRoles: Role[] | null): SQL {
  const isAdmin = !!userRoles && userRoles.includes("admin");
  if (isAdmin) {
    // Admin sees everything — match all rows.
    return sql`true`;
  }
  const valid = (userRoles ?? []).filter((r): r is VisibilityRole =>
    (VISIBILITY_ROLES as readonly string[]).includes(r as string),
  );
  if (valid.length === 0) {
    return sql`(${content.visibility}->>'public') = 'true'`;
  }
  // Postgres `?|` operator: jsonb array contains any of the strings on the right.
  return sql`(${content.visibility}->>'public') = 'true' OR (${content.visibility}->'roles') ?| ARRAY[${sql.join(
    valid.map((r) => sql`${r}`),
    sql`, `,
  )}]::text[]`;
}

/**
 * Convenience: defensively re-export the full role list so callers don't
 * have to import from both files.
 */
export const ALL_ROLES = ROLES;
