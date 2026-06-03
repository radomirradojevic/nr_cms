import "server-only";

import { auth } from "@clerk/nextjs/server";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles } from "@/lib/roles";

const ALLOWED_FILE_UPLOAD_ROLES = ["admin", "publisher", "author"] as const;

export type FileUploadAuthResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; error: string };

export async function requireFileUploadUser(): Promise<FileUploadAuthResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, status: 401, error: "Unauthorized." };
  }

  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  if (
    !roles.some((role) =>
      (ALLOWED_FILE_UPLOAD_ROLES as readonly string[]).includes(role),
    )
  ) {
    return { ok: false, status: 403, error: "Forbidden." };
  }

  return { ok: true, userId };
}
