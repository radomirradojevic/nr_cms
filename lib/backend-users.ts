import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import type { BackendUserOption } from "@/lib/backend-user-types";
import { hasBackendAccess } from "@/lib/roles";

export type { BackendUserOption };

type ClerkUserLike = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  username?: string | null;
  primaryEmailAddress?: { emailAddress?: string | null } | null;
  emailAddresses?: { emailAddress?: string | null }[];
  publicMetadata?: unknown;
};

function displayName(user: ClerkUserLike): string {
  return (
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    user.primaryEmailAddress?.emailAddress ||
    user.emailAddresses?.[0]?.emailAddress ||
    user.id
  );
}

function toBackendUserOption(user: ClerkUserLike): BackendUserOption | null {
  if (!hasBackendAccess(user.publicMetadata)) return null;
  return {
    id: user.id,
    name: displayName(user),
  };
}

export async function getBackendUserOptionById(
  userId: string,
): Promise<BackendUserOption | null> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return toBackendUserOption(user);
  } catch {
    return null;
  }
}

export async function searchBackendUserOptions(input: {
  query?: string;
  limit: number;
  offset: number;
}): Promise<{
  users: BackendUserOption[];
  nextOffset: number;
  hasMore: boolean;
}> {
  const client = await clerkClient();
  const query = input.query?.trim();
  const limit = Math.max(1, Math.min(input.limit, 50));
  const batchLimit = 100;
  let nextOffset = Math.max(0, input.offset);
  let totalCount = Number.POSITIVE_INFINITY;
  const users: BackendUserOption[] = [];

  while (users.length < limit && nextOffset < totalCount) {
    const res = await client.users.getUserList({
      limit: batchLimit,
      offset: nextOffset,
      ...(query ? { query } : {}),
    });

    totalCount = res.totalCount;
    if (res.data.length === 0) break;

    for (const user of res.data) {
      nextOffset += 1;
      const option = toBackendUserOption(user);
      if (!option) continue;

      users.push(option);
      if (users.length >= limit) break;
    }
  }

  return {
    users,
    nextOffset,
    hasMore: nextOffset < totalCount,
  };
}
