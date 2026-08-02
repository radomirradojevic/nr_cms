import "server-only";

import { loadWebshopAddon } from "@/lib/webshop-addon/loader";
import { HostAddonRouteBindingsV1 } from "@/lib/webshop-addon/host-route-contract";

export async function canViewWebshopFormSubmissions(formId: string) {
  const loaded = await loadWebshopAddon();
  if (
    loaded.status !== "loaded" ||
    !loaded.addon.canViewFormSubmissions ||
    !loaded.addon.hostRouteBindings.includes(
      HostAddonRouteBindingsV1.formSubmissionVisibility.id,
    )
  ) {
    return false;
  }
  return loaded.addon.canViewFormSubmissions({ formId });
}
