import type { ReactNode } from "react";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WebshopAddonRequired } from "@/components/webshop-addon-required";
import { getLogicalBackIconName } from "@/lib/i18n/direction";
import { getAddonI18nContext } from "@/lib/i18n/addon-server";
import { getTranslations } from "@/lib/i18n/server";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { resolveWebshopAddonState } from "@/lib/webshop-addon/license";
import type { TextDirection } from "@/lib/i18n/types";

export async function renderWebshopDashboardPath(
  path: string[],
  searchParams?: Record<string, string | string[] | undefined>,
) {
  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!hasRole(roles, "admin")) redirect("/dashboard");

  const addonState = await resolveWebshopAddonState();
  const i18n = await getAddonI18nContext();
  const t = await getTranslations("backend");

  if (addonState.status === "ready") {
    const content = await addonState.addon.renderDashboardPath({
      i18n,
      licenseMode: "ready",
      path,
      searchParams,
      userId: user!.id,
    });
    return withWebshopHomeLink(
      path,
      content,
      t("addons.webshop.backToWebshop"),
      i18n.backendDirection,
    );
  }

  if (addonState.status === "license_expired") {
    const content = await addonState.addon.renderDashboardPath({
      i18n,
      licenseMode: "edit_existing_only",
      path,
      searchParams,
      userId: user!.id,
    });
    return withWebshopHomeLink(
      path,
      content,
      t("addons.webshop.backToWebshop"),
      i18n.backendDirection,
    );
  }

  if (path.length === 0) notFound();

  return withWebshopHomeLink(
    path,
    <div className="mx-auto w-full max-w-[var(--backend-content-max-width)] p-6">
      <WebshopAddonRequired state={addonState} />
    </div>,
    t("addons.webshop.backToWebshop"),
    i18n.backendDirection,
  );
}

function withWebshopHomeLink(
  path: readonly string[],
  content: ReactNode,
  backLabel: string,
  direction: TextDirection,
) {
  if (path.length === 0) return content;
  const BackIcon =
    getLogicalBackIconName(direction) === "ArrowRight" ? ArrowRight : ArrowLeft;

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-[var(--backend-content-max-width)] px-6 pt-6">
        <Button asChild variant="ghost" size="sm" className="-ms-2">
          <Link href="/dashboard/webshop">
            <BackIcon className="h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
      </div>
      <div className="mt-3">{content}</div>
    </div>
  );
}
