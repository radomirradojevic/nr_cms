"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import {
  searchBackendUserOptions,
  type BackendUserOption,
} from "@/lib/backend-users";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";

const searchSchema = z.object({
  query: z.string().trim().max(100).optional(),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
});

export type SearchBackendUsersInput = z.input<typeof searchSchema>;

export async function searchBackendUsers(
  input: SearchBackendUsersInput,
): Promise<
  | { error: string }
  | {
      success: true;
      users: BackendUserOption[];
      nextOffset: number;
      hasMore: boolean;
    }
> {
  const { userId } = await auth();
  if (!userId) return { error: "Forbidden." };

  const caller = await getOptionalCurrentUser();
  const roles = getRoles(caller?.publicMetadata);
  if (!hasRole(roles, "admin")) return { error: "Forbidden." };

  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const result = await searchBackendUserOptions(parsed.data);
    return { success: true, ...result };
  } catch (err) {
    console.error("[searchBackendUsers] Unexpected error:", err);
    return { error: "Failed to load users." };
  }
}
