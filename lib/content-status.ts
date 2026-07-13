import type { TranslationKey } from "@/lib/i18n/keys";
import type { Role } from "@/lib/roles";

export const CONTENT_STATUSES = [
  "draft",
  "in_review",
  "approved",
  "published",
  "archived",
] as const;

export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const CONTENT_CREATE_STATUSES = [
  "draft",
  "approved",
  "published",
] as const satisfies readonly ContentStatus[];

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  published: "Published",
  archived: "Archived",
};

const PUBLISHER_TRANSITIONS: Record<ContentStatus, readonly ContentStatus[]> = {
  draft: ["in_review", "approved", "published", "archived"],
  in_review: ["draft", "approved", "published", "archived"],
  approved: ["draft", "published", "archived"],
  published: ["draft", "archived"],
  archived: ["draft", "published"],
};

export function isContentStatus(value: unknown): value is ContentStatus {
  return (
    typeof value === "string" &&
    (CONTENT_STATUSES as readonly string[]).includes(value)
  );
}

export function getContentStatusLabel(status: string): string {
  return isContentStatus(status) ? CONTENT_STATUS_LABELS[status] : status;
}

export function getContentStatusLabelKey(
  status: ContentStatus,
): TranslationKey {
  return `dashboard.content.status.${status}` as TranslationKey;
}

export function hasElevatedContentWorkflowRole(
  roles: readonly Role[],
): boolean {
  return roles.includes("admin") || roles.includes("publisher");
}

export function isAuthorOnlyContentWorkflowRole(
  roles: readonly Role[],
): boolean {
  return (
    roles.includes("author") &&
    !roles.includes("publisher") &&
    !roles.includes("admin")
  );
}

export function canCreateContentWithStatus(
  roles: readonly Role[],
  status: ContentStatus,
): boolean {
  if (isAuthorOnlyContentWorkflowRole(roles)) return status === "draft";
  if (!hasElevatedContentWorkflowRole(roles)) return false;
  return (CONTENT_CREATE_STATUSES as readonly ContentStatus[]).includes(status);
}

export function resolveCreateContentStatus(
  roles: readonly Role[],
  requestedStatus: ContentStatus | undefined,
): ContentStatus | null {
  if (isAuthorOnlyContentWorkflowRole(roles)) return "draft";

  const status = requestedStatus ?? "draft";
  return canCreateContentWithStatus(roles, status) ? status : null;
}

export function canAuthorEditOwnContentStatus(
  roles: readonly Role[],
  status: ContentStatus,
): boolean {
  if (!isAuthorOnlyContentWorkflowRole(roles)) return false;
  return status === "draft" || status === "in_review";
}

export function canTransitionContentStatus(input: {
  actorRoles: readonly Role[];
  canEditTarget: boolean;
  fromStatus: ContentStatus;
  isOwner: boolean;
  toStatus: ContentStatus;
}): boolean {
  const { actorRoles, canEditTarget, fromStatus, isOwner, toStatus } = input;
  if (fromStatus === toStatus) return canEditTarget;
  if (!canEditTarget) return false;
  if (actorRoles.includes("admin")) return true;

  if (actorRoles.includes("publisher")) {
    return PUBLISHER_TRANSITIONS[fromStatus].includes(toStatus);
  }

  if (!isAuthorOnlyContentWorkflowRole(actorRoles) || !isOwner) return false;
  return (
    (fromStatus === "draft" && toStatus === "in_review") ||
    (fromStatus === "in_review" && toStatus === "draft")
  );
}
