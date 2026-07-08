import { auth } from "@clerk/nextjs/server";

import { getAddonI18nContext } from "@/lib/i18n/addon-server";
import { resolveWebshopAddonState } from "@/lib/webshop-addon/license";

type RouteContext = {
  params: Promise<{ webshopPath?: string[] }>;
};

async function handleWebshopApi(request: Request, context: RouteContext) {
  const { userId } = await auth();
  const { webshopPath = [] } = await context.params;
  const addonState = await resolveWebshopAddonState();

  if (
    (addonState.status === "ready" ||
      addonState.status === "license_expired") &&
    addonState.addon.handleApiRoute
  ) {
    const i18n = await getAddonI18nContext();

    return addonState.addon.handleApiRoute({
      i18n,
      licenseMode:
        addonState.status === "ready" ? "ready" : "edit_existing_only",
      method: request.method,
      path: webshopPath,
      request,
      userId,
    });
  }

  const status =
    addonState.status === "disabled" ||
    addonState.status === "install_disabled" ||
    addonState.status === "platform_not_supported" ||
    addonState.status === "license_invalid" ||
    addonState.status === "license_required"
      ? 403
      : 404;

  return Response.json(
    {
      error:
        status === 403
          ? "Webshop add-on is not available for this deployment or license."
          : "Webshop add-on is not installed.",
      status: addonState.status,
    },
    { status },
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
