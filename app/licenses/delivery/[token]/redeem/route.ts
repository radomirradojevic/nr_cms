import { delegateWebshopApiRoute, HostAddonRouteBindingsV1 } from "@/lib/webshop-addon/host-route-bindings";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  return delegateWebshopApiRoute(
    { method: "POST", path: ["licenses", "delivery", token], request, userId: null },
    HostAddonRouteBindingsV1.licenseDelivery.id,
  );
}
export const dynamic = "force-dynamic";
