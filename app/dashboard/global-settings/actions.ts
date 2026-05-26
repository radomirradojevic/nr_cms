"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath, updateTag } from "next/cache";

import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { getFileByIdUnchecked } from "@/data/files";
import {
  GLOBAL_SETTINGS_TAG,
  UpdateGlobalSettingsSchema,
  type UpdateGlobalSettingsInput,
} from "@/lib/global-settings";
import { updateGlobalSettings as updateGlobalSettingsRow } from "@/data/global-settings";
import { requireAdminSectionLock } from "@/lib/admin-section-locks-actions";

export type UpdateGlobalSettingsResult = { success: true } | { error: string };

export async function updateGlobalSettings(
  raw: unknown,
  clientId?: string,
): Promise<UpdateGlobalSettingsResult> {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized." };

  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!hasRole(roles, "admin")) return { error: "Forbidden." };

  const lockError = await requireAdminSectionLock("global-settings", clientId);
  if (lockError) return lockError;

  const parsed = UpdateGlobalSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed." };
  }

  const input: UpdateGlobalSettingsInput = parsed.data;

  if (input.siteLogoFileId) {
    const file = await getFileByIdUnchecked(input.siteLogoFileId);
    if (!file) return { error: "Selected logo file does not exist." };
    if (file.kind !== "image") {
      return { error: "Selected logo must be an image." };
    }
  }

  try {
    await updateGlobalSettingsRow(input, userId);
  } catch (err) {
    console.error("[updateGlobalSettings] failed:", err);
    return { error: "Failed to save settings." };
  }

  // updateTag (write-through) — see top-menu actions for rationale.
  updateTag(GLOBAL_SETTINGS_TAG);
  revalidatePath("/", "layout");

  return { success: true };
}
