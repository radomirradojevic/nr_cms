"use server";

import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasRole, ROLES } from "@/lib/roles";

async function requireAdmin() {
  const { userId: callerId } = await auth();
  if (!callerId) return { callerId: null, error: "Unauthorized." };

  const caller = await currentUser();
  if (!hasRole(caller?.publicMetadata?.roles, "admin")) {
    return { callerId: null, error: "Forbidden." };
  }

  return { callerId, error: null };
}

const updateUserRolesSchema = z.object({
  userId: z.string().min(1),
  roles: z.array(z.enum(ROLES)).min(1),
});

type UpdateUserRolesInput = z.infer<typeof updateUserRolesSchema>;

export async function updateUserRoles(
  input: UpdateUserRolesInput,
): Promise<{ success?: boolean; error?: string }> {
  const { callerId, error: authError } = await requireAdmin();
  if (authError || !callerId) return { error: authError ?? "Unauthorized." };

  const parsed = updateUserRolesSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  // Only one role may be assigned at a time; viewer is always implicitly present.
  // If the caller submitted any non-viewer role, keep only the first one.
  const nonViewer = parsed.data.roles.find((r) => r !== "viewer");
  const roles = nonViewer ? ["viewer", nonViewer] : ["viewer"];

  const client = await clerkClient();
  await client.users.updateUser(parsed.data.userId, {
    publicMetadata: { roles },
  });

  revalidatePath(`/dashboard/users/${parsed.data.userId}`);
  return { success: true };
}

export async function lockUser(
  userId: string,
): Promise<{ success?: boolean; error?: string }> {
  const { callerId, error: authError } = await requireAdmin();
  if (authError || !callerId) return { error: authError ?? "Unauthorized." };

  if (!userId || typeof userId !== "string")
    return { error: "Invalid user ID." };
  if (userId === callerId)
    return { error: "You cannot lock your own account." };

  const client = await clerkClient();
  await client.users.lockUser(userId);

  revalidatePath(`/dashboard/users/${userId}`);
  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function unlockUser(
  userId: string,
): Promise<{ success?: boolean; error?: string }> {
  const { callerId, error: authError } = await requireAdmin();
  if (authError || !callerId) return { error: authError ?? "Unauthorized." };

  if (!userId || typeof userId !== "string")
    return { error: "Invalid user ID." };

  const client = await clerkClient();
  await client.users.unlockUser(userId);

  revalidatePath(`/dashboard/users/${userId}`);
  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function forceSignOutUser(
  userId: string,
): Promise<{ success?: boolean; revoked?: number; error?: string }> {
  const { callerId, error: authError } = await requireAdmin();
  if (authError || !callerId) return { error: authError ?? "Unauthorized." };

  if (!userId || typeof userId !== "string")
    return { error: "Invalid user ID." };
  if (userId === callerId)
    return { error: "You cannot force sign out your own account." };

  const client = await clerkClient();

  // Fetch all active sessions for the user and revoke each.
  const { data: sessions } = await client.sessions.getSessionList({
    userId,
    status: "active",
    limit: 100,
  });

  const results = await Promise.allSettled(
    sessions.map((s) => client.sessions.revokeSession(s.id)),
  );
  const revoked = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - revoked;

  revalidatePath(`/dashboard/users/${userId}`);
  revalidatePath("/dashboard/users");

  if (failed > 0 && revoked === 0) {
    return { error: "Failed to revoke active sessions." };
  }

  return { success: true, revoked };
}

export async function deleteUser(
  userId: string,
): Promise<{ success?: boolean; error?: string }> {
  const { callerId, error: authError } = await requireAdmin();
  if (authError || !callerId) return { error: authError ?? "Unauthorized." };

  if (!userId || typeof userId !== "string")
    return { error: "Invalid user ID." };
  if (userId === callerId)
    return { error: "You cannot delete your own account." };

  const client = await clerkClient();
  await client.users.deleteUser(userId);

  revalidatePath("/dashboard/users");
  return { success: true };
}
