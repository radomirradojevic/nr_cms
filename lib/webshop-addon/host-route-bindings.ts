import { resolveWebshopAddonState } from "@/lib/webshop-addon/license";
import type { WebshopApiRouteInput } from "@/lib/webshop-addon/contract";
import {
  HostAddonRouteBindingsV1,
  type HostAddonRouteBindingId,
} from "@/lib/webshop-addon/host-route-contract";

export { HostAddonRouteBindingsV1 } from "@/lib/webshop-addon/host-route-contract";
export type { HostAddonRouteBindingId } from "@/lib/webshop-addon/host-route-contract";

export function addonNotInstalledResponse(): Response {
  return Response.json({ error: "addon_not_installed" }, { status: 404 });
}

export function addonNotReadyResponse(): Response {
  return Response.json(
    { error: "addon_not_ready" },
    { headers: { "Retry-After": "30" }, status: 503 },
  );
}

export async function delegateWebshopApiRoute(
  input: Omit<WebshopApiRouteInput, "licenseMode">,
  binding: HostAddonRouteBindingId,
): Promise<Response> {
  const addonState = await resolveWebshopAddonState();
  if (addonState.status === "not_installed") return addonNotInstalledResponse();
  if (addonState.status !== "ready" || !addonState.addon.handleApiRoute) {
    return addonNotReadyResponse();
  }
  if (!addonState.addon.hostRouteBindings.includes(binding)) {
    return addonNotReadyResponse();
  }
  return addonState.addon.handleApiRoute({ ...input, licenseMode: "ready" });
}

export async function authorizeWebshopFileAccess(input: {
  fileId: string;
  isAdmin: boolean;
  userId: string | null;
}): Promise<{ allowed: boolean; isProtected: boolean }> {
  const addonState = await resolveWebshopAddonState();
  if (addonState.status === "not_installed") return { allowed: true, isProtected: false };
  if (addonState.status !== "ready" || !addonState.addon.authorizeFileAccess) {
    // A package that is present but cannot prove authorization must not expose
    // a possibly paid asset through the generic host file endpoint.
    return { allowed: false, isProtected: true };
  }
  if (!addonState.addon.hostRouteBindings.includes(HostAddonRouteBindingsV1.fileAuthorization.id)) {
    return { allowed: false, isProtected: true };
  }
  return addonState.addon.authorizeFileAccess(input);
}
