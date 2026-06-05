import type { Role } from "@/lib/roles";
import {
  canTransitionContentStatus,
  isAuthorOnlyContentWorkflowRole,
  type ContentStatus,
} from "@/lib/content-status";

export const CONTENT_REVISION_CHANGE_TYPES = [
  "created",
  "saved",
  "submitted_for_review",
  "approved",
  "published",
  "unpublished",
  "archived",
  "scheduled",
  "restored",
  "deleted_snapshot",
] as const;

export type ContentRevisionChangeType =
  (typeof CONTENT_REVISION_CHANGE_TYPES)[number];

export function getStatusRevisionChangeType(input: {
  fromStatus: ContentStatus;
  toStatus: ContentStatus;
}): ContentRevisionChangeType {
  const { fromStatus, toStatus } = input;

  if (toStatus === "in_review") return "submitted_for_review";
  if (toStatus === "approved") return "approved";
  if (toStatus === "published") return "published";
  if (toStatus === "archived") return "archived";
  if (fromStatus === "published") return "unpublished";

  return "saved";
}

export function resolveRestoredContentStatus(input: {
  actorRoles: readonly Role[];
  canEditTarget: boolean;
  currentStatus: ContentStatus;
  isOwner: boolean;
  revisionStatus: ContentStatus;
}): ContentStatus {
  if (isAuthorOnlyContentWorkflowRole(input.actorRoles)) return "draft";

  const canRestoreRevisionStatus = canTransitionContentStatus({
    actorRoles: input.actorRoles,
    canEditTarget: input.canEditTarget,
    fromStatus: input.currentStatus,
    isOwner: input.isOwner,
    toStatus: input.revisionStatus,
  });

  return canRestoreRevisionStatus ? input.revisionStatus : "draft";
}
