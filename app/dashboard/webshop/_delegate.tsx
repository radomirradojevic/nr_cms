import type { ReactNode } from "react";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
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
    const content = await addonState.addon.renderDashboardPath({
      licenseMode: "ready",
      path,
      searchParams,
      userId: user!.id,
    });
    return withWebshopHomeLink(path, content);
  }

  if (addonState.status === "license_expired") {
    const content = await addonState.addon.renderDashboardPath({
      licenseMode: "edit_existing_only",
      path,
      searchParams,
      userId: user!.id,
    });
    return withWebshopHomeLink(path, content);
  }

  if (path.length === 0) notFound();

  return withWebshopHomeLink(
    path,
    <div className="mx-auto w-full max-w-[var(--backend-content-max-width)] p-6">
      <WebshopAddonRequired state={addonState} />
    </div>,
  );
}

function withWebshopHomeLink(path: readonly string[], content: ReactNode) {
  if (path.length === 0) return content;

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-[var(--backend-content-max-width)] px-6 pt-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard/webshop">
            <ArrowLeft className="h-4 w-4" />
            Back to Webshop
          </Link>
        </Button>
      </div>
      <div className="mt-3">{content}</div>
    </div>
  );
}
