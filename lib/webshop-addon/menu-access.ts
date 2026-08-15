import "server-only";

import { resolveWebshopAddonState } from "@/lib/webshop-addon/license";

export async function resolveHasWebshopAdminForMenu(
  isAdmin: boolean,
): Promise<boolean> {
  if (!isAdmin) return false;

  try {
    const state = await resolveWebshopAddonState();
    return state.status === "ready" || state.status === "license_expired";
  } catch (error) {
    console.error("[webshop-addon] failed to resolve backend menu access", error);
    return false;
  }
}
