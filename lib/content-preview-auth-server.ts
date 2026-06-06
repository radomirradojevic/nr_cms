import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import type { ContentRow } from "@/data/content";
import {
  canAccessContentPreview,
  highestContentPreviewRole,
} from "@/lib/content-preview-auth";
import type { ContentStatus } from "@/lib/content-status";
import { getRoles, hasRole, type Role } from "@/lib/roles";

async function getTargetAuthorTopRole(input: {
  actorRoles: readonly Role[];
  actorUserId: string;
  targetAuthorId: string;
}): Promise<Role | undefined> {
  const { actorRoles, actorUserId, targetAuthorId } = input;

  if (
    !hasRole(actorRoles, "publisher") ||
    targetAuthorId === actorUserId ||
    hasRole(actorRoles, "admin")
  ) {
    return undefined;
  }

  try {
    const client = await clerkClient();
    const author = await client.users.getUser(targetAuthorId);
    return highestContentPreviewRole(getRoles(author.publicMetadata));
  } catch {
    return "viewer";
  }
}

export async function canAccessContentPreviewTarget(input: {
  actorRoles: readonly Role[];
  actorUserId: string;
  target: Pick<ContentRow, "authorId" | "status">;
}): Promise<boolean> {
  const { actorRoles, actorUserId, target } = input;
  const targetAuthorTopRole = await getTargetAuthorTopRole({
    actorRoles,
    actorUserId,
    targetAuthorId: target.authorId,
  });

  return canAccessContentPreview({
    actorRoles,
    actorUserId,
    targetAuthorId: target.authorId,
    targetAuthorTopRole,
    targetStatus: target.status as ContentStatus,
  });
}
