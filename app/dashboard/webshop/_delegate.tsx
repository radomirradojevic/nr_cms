import { notFound, redirect } from "next/navigation";

import { WebshopAddonRequired } from "@/components/webshop-addon-required";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { resolveWebshopAddonState } from "@/lib/webshop-addon/license";

export async function renderWebshopDashboardPath(
  path: string[],
  searchParams?: Record<string, string | string[] | undefined>,
) {
  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!hasRole(roles, "admin")) redirect("/dashboard");

  const addonState = await resolveWebshopAddonState();

  if (addonState.status === "ready") {
    return addonState.addon.renderDashboardPath({
      licenseMode: "ready",
      path,
      searchParams,
      userId: user!.id,
    });
  }

  if (addonState.status === "license_expired") {
    return addonState.addon.renderDashboardPath({
      licenseMode: "edit_existing_only",
      path,
      searchParams,
      userId: user!.id,
    });
  }

  if (path.length === 0) notFound();

  return (
    <div className="mx-auto w-full max-w-[var(--backend-content-max-width)] p-6">
      <WebshopAddonRequired state={addonState} />
    </div>
  );
}
