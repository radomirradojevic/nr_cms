"use server";

import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { hasRole, ROLES } from "@/lib/roles";

const updateUserRolesSchema = z.object({
  userId: z.string().min(1),
  roles: z.array(z.enum(ROLES)).min(1),
});

type UpdateUserRolesInput = z.infer<typeof updateUserRolesSchema>;

export async function updateUserRoles(
  input: UpdateUserRolesInput,
): Promise<{ success?: boolean; error?: string }> {
  const { userId: callerId } = await auth();
  if (!callerId) return { error: "Unauthorized." };

  const caller = await currentUser();
  if (!hasRole(caller?.publicMetadata?.roles, "admin")) {
    return { error: "Forbidden." };
  }

  const parsed = updateUserRolesSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  // viewer is always present
  const roles = Array.from(new Set(["viewer", ...parsed.data.roles]));

  const client = await clerkClient();
  await client.users.updateUser(parsed.data.userId, {
    publicMetadata: { roles },
  });

  return { success: true };
}
