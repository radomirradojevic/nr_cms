"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import {
  searchBackendUserOptions,
  type BackendUserOption,
} from "@/lib/backend-users";
import { getTranslations } from "@/lib/i18n/server";
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
  const t = await getTranslations("backend");
  const { userId } = await auth();
  if (!userId) return { error: t("dashboard.errors.forbidden") };

  const caller = await getOptionalCurrentUser();
  const roles = getRoles(caller?.publicMetadata);
  if (!hasRole(roles, "admin")) {
    return { error: t("dashboard.errors.forbidden") };
  }

  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) return { error: t("dashboard.errors.invalidInput") };

  try {
    const result = await searchBackendUserOptions(parsed.data);
    return { success: true, ...result };
  } catch (err) {
    console.error("[searchBackendUsers] Unexpected error:", err);
    return { error: t("dashboard.users.errors.loadUsersFailed") };
  }
}
