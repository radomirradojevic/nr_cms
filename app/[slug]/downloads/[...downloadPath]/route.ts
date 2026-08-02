import { auth } from "@clerk/nextjs/server";

import {
  delegateWebshopApiRoute,
  HostAddonRouteBindingsV1,
} from "@/lib/webshop-addon/host-route-bindings";

type RouteContext = {
  params: Promise<{ downloadPath?: string[]; slug: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { userId } = await auth();
  const { downloadPath = [] } = await context.params;
  return delegateWebshopApiRoute(
    {
      method: request.method,
      path: ["downloads", ...downloadPath],
      request,
      userId,
    },
    HostAddonRouteBindingsV1.download.id,
  );
}
