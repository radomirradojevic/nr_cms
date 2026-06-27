import { auth } from "@clerk/nextjs/server";

import { resolveWebshopAddonState } from "@/lib/webshop-addon/license";

type RouteContext = {
  params: Promise<{ downloadPath?: string[]; slug: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { userId } = await auth();
  const { downloadPath = [] } = await context.params;
  const addonState = await resolveWebshopAddonState();

  if (
    (addonState.status === "ready" ||
      addonState.status === "license_expired") &&
    addonState.addon.handleApiRoute
  ) {
    return addonState.addon.handleApiRoute({
      licenseMode:
        addonState.status === "ready" ? "ready" : "edit_existing_only",
      method: request.method,
      path: ["downloads", ...downloadPath],
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
