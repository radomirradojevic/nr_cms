import { auth } from "@clerk/nextjs/server";

import { getAddonI18nContext } from "@/lib/i18n/addon-server";
import {
  delegateWebshopApiRoute,
  HostAddonRouteBindingsV1,
} from "@/lib/webshop-addon/host-route-bindings";

type RouteContext = {
  params: Promise<{ webshopPath?: string[] }>;
};

async function handleWebshopApi(request: Request, context: RouteContext) {
  const { userId } = await auth();
  const { webshopPath = [] } = await context.params;
  const i18n = await getAddonI18nContext();
  return delegateWebshopApiRoute(
    { i18n, method: request.method, path: webshopPath, request, userId },
    HostAddonRouteBindingsV1.apiWebshop.id,
  );
}

export function GET(request: Request, context: RouteContext) {
  return handleWebshopApi(request, context);
}

export function POST(request: Request, context: RouteContext) {
  return handleWebshopApi(request, context);
}

export function PUT(request: Request, context: RouteContext) {
  return handleWebshopApi(request, context);
}

export function PATCH(request: Request, context: RouteContext) {
  return handleWebshopApi(request, context);
}

export function DELETE(request: Request, context: RouteContext) {
  return handleWebshopApi(request, context);
}
