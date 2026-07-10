"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "@/lib/i18n/server";
import type { TranslateFn } from "@/lib/i18n/translate";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { hasRole, ROLES } from "@/lib/roles";

async function requireAdmin(t: TranslateFn) {
  const { userId: callerId } = await auth();
  if (!callerId) {
    return { callerId: null, error: t("common.states.unauthorized") };
  }

  const caller = await getOptionalCurrentUser();
  if (!hasRole(caller?.publicMetadata?.roles, "admin")) {
    return { callerId: null, error: t("dashboard.errors.forbidden") };
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
  const t = await getTranslations("backend");
  const { callerId, error: authError } = await requireAdmin(t);
  if (authError || !callerId) {
    return { error: authError ?? t("common.states.unauthorized") };
  }

  const parsed = updateUserRolesSchema.safeParse(input);
  if (!parsed.success) return { error: t("dashboard.errors.invalidInput") };

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
  const t = await getTranslations("backend");
  const { callerId, error: authError } = await requireAdmin(t);
  if (authError || !callerId) {
    return { error: authError ?? t("common.states.unauthorized") };
  }

  if (!userId || typeof userId !== "string")
    return { error: t("dashboard.users.errors.invalidUserId") };
  if (userId === callerId)
    return { error: t("dashboard.users.errors.cannotLockSelf") };

  const client = await clerkClient();
  await client.users.lockUser(userId);

  revalidatePath(`/dashboard/users/${userId}`);
  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function unlockUser(
  userId: string,
): Promise<{ success?: boolean; error?: string }> {
  const t = await getTranslations("backend");
  const { callerId, error: authError } = await requireAdmin(t);
  if (authError || !callerId) {
    return { error: authError ?? t("common.states.unauthorized") };
  }

  if (!userId || typeof userId !== "string")
    return { error: t("dashboard.users.errors.invalidUserId") };

  const client = await clerkClient();
  await client.users.unlockUser(userId);

  revalidatePath(`/dashboard/users/${userId}`);
  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function forceSignOutUser(
  userId: string,
): Promise<{ success?: boolean; revoked?: number; error?: string }> {
  const t = await getTranslations("backend");
  const { callerId, error: authError } = await requireAdmin(t);
  if (authError || !callerId) {
    return { error: authError ?? t("common.states.unauthorized") };
  }

  if (!userId || typeof userId !== "string")
    return { error: t("dashboard.users.errors.invalidUserId") };
  if (userId === callerId)
    return { error: t("dashboard.users.errors.cannotForceSignOutSelf") };

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
    return { error: t("dashboard.users.errors.revokeSessionsFailed") };
  }

  return { success: true, revoked };
}

export async function deleteUser(
  userId: string,
): Promise<{ success?: boolean; error?: string }> {
  const t = await getTranslations("backend");
  const { callerId, error: authError } = await requireAdmin(t);
  if (authError || !callerId) {
    return { error: authError ?? t("common.states.unauthorized") };
  }

  if (!userId || typeof userId !== "string")
    return { error: t("dashboard.users.errors.invalidUserId") };
  if (userId === callerId)
    return { error: t("dashboard.users.errors.cannotDeleteSelf") };

  const client = await clerkClient();
  await client.users.deleteUser(userId);

  revalidatePath("/dashboard/users");
  return { success: true };
}
