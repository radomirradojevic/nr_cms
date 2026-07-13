import "server-only";

import { resolveLicenseServerAddonState } from "@/lib/license-server-addon/license";

export async function resolveHasLicenseServerShellForMenu(
  isAdmin: boolean,
): Promise<boolean> {
  if (!isAdmin) return false;

  try {
    const state = await resolveLicenseServerAddonState();
    return state.status === "ready" || state.status === "license_expired";
  } catch (error) {
    console.error(
      "[license-server-addon] failed to resolve backend menu access",
      error,
    );
    return false;
  }
}
