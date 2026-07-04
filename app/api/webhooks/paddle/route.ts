import { resolveWebshopAddonState } from "@/lib/webshop-addon/license";

export async function POST(request: Request) {
  const addonState = await resolveWebshopAddonState();

  if (
    (addonState.status === "ready" ||
      addonState.status === "license_expired") &&
    addonState.addon.handleApiRoute
  ) {
    return addonState.addon.handleApiRoute({
      licenseMode:
        addonState.status === "ready" ? "ready" : "edit_existing_only",
      method: "POST",
      path: ["payments", "webhooks", "paddle"],
      request,
      userId: null,
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
