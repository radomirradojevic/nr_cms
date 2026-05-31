import "server-only";

// Server-side helper to validate that an admin section action carries a
// valid edit-lock owned by the calling user. Use this in EVERY mutating
// server action for /dashboard/global-settings and /dashboard/menus.
//
// Returns null on success, or a typed error suitable for returning from
// the action ({ error: string }).

import { auth } from "@clerk/nextjs/server";

import { isLockedBy } from "@/data/admin-section-locks";
import {
  isAdminSectionKey,
  type AdminSectionKey,
} from "@/lib/admin-section-locks";

export async function requireAdminSectionLock(
  sectionKey: AdminSectionKey,
  clientId: string | undefined | null,
): Promise<{ error: string } | null> {
  if (!isAdminSectionKey(sectionKey)) {
    return { error: "Unknown section." };
  }
  if (!clientId || typeof clientId !== "string") {
    return {
      error:
        "Edit lock missing. Reload the page to acquire the editor lock and try again.",
    };
  }
  const { userId, sessionId } = await auth();
  if (!userId || !sessionId) {
    return { error: "Unauthorized." };
  }
  const owns = await isLockedBy({
    sectionKey,
    userId,
    sessionId,
    clientId,
  });
  if (!owns) {
    return {
      error:
        "Your edit lock is no longer valid. Another admin is editing this section, or your session has timed out. Reload to continue.",
    };
  }
  return null;
}
