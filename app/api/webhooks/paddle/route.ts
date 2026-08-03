import {
  delegateWebshopApiRoute,
  HostAddonRouteBindingsV1,
} from "@/lib/webshop-addon/host-route-bindings";

export async function POST(request: Request) {
  return delegateWebshopApiRoute(
    {
      method: "POST",
      path: ["payments", "webhooks", "paddle"],
      request,
      userId: null,
    },
    HostAddonRouteBindingsV1.paddleWebhook.id,
  );
}
export const dynamic = "force-dynamic";
