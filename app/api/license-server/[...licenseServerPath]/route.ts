import { auth } from "@clerk/nextjs/server";

import { getAddonI18nContext } from "@/lib/i18n/addon-server";
import { readLicenseServerPermissionClaimsFromMetadata } from "@/lib/license-server-addon/contract";
import { resolveLicenseServerAddonState } from "@/lib/license-server-addon/license";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";

type RouteContext = {
  params: Promise<{ licenseServerPath?: string[] }>;
};

async function handleLicenseServerApi(request: Request, context: RouteContext) {
  const { userId } = await auth();
  const { licenseServerPath = [] } = await context.params;
  const isAdminRoute = licenseServerPath[0] === "admin";
  const user = isAdminRoute ? await getOptionalCurrentUser() : null;
  const isAdmin = Boolean(
    userId &&
    user?.id === userId &&
    hasRole(getRoles(user.publicMetadata), "admin"),
  );
  const permissionClaims = isAdminRoute
    ? readLicenseServerPermissionClaimsFromMetadata(user?.publicMetadata)
    : [];
  const addonState = await resolveLicenseServerAddonState();

  if (
    (addonState.status === "ready" ||
      addonState.status === "license_expired") &&
    addonState.addon.handleApiRoute
  ) {
    const i18n = await getAddonI18nContext();

    return addonState.addon.handleApiRoute({
      i18n,
      isAdmin,
      licenseMode:
        addonState.status === "ready" ? "ready" : "edit_existing_only",
      method: request.method,
      path: licenseServerPath,
      permissionClaims,
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
          ? "License Server add-on is not available for this deployment or license."
          : "License Server add-on is not installed.",
      status: addonState.status,
    },
    { status },
  );
}

export function GET(request: Request, context: RouteContext) {
  return handleLicenseServerApi(request, context);
}

export function POST(request: Request, context: RouteContext) {
  return handleLicenseServerApi(request, context);
}

export function PUT(request: Request, context: RouteContext) {
  return handleLicenseServerApi(request, context);
}

export function PATCH(request: Request, context: RouteContext) {
  return handleLicenseServerApi(request, context);
}

export function DELETE(request: Request, context: RouteContext) {
  return handleLicenseServerApi(request, context);
}
export const dynamic = "force-dynamic";
