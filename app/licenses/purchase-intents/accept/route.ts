import { delegateWebshopApiRoute, HostAddonRouteBindingsV1 } from "@/lib/webshop-addon/host-route-bindings";

/**
 * The path is owned by the CMS so it exists in an addon-free build. The
 * package receives the untouched Request only after the exact registry
 * binding and ready fence have been verified.
 */
export async function POST(request: Request) {
  return delegateWebshopApiRoute(
    {
      method: "POST",
      path: ["licenses", "purchase-intents", "accept"],
      request,
      userId: null,
    },
    HostAddonRouteBindingsV1.purchaseIntentAccept.id,
  );
}
