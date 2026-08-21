import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WebshopAddonRequired } from "@/components/webshop-addon-required";
import { WebshopLicenseActivation } from "@/components/webshop-license-activation";
import { listContent } from "@/data/content";
import { getAddonI18nContext } from "@/lib/i18n/addon-server";
import { getTranslations } from "@/lib/i18n/server";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { createWebshopPurchaseIntentHandoff } from "@/lib/webshop-addon/purchase-intent";
import { resolveWebshopAddonState } from "@/lib/webshop-addon/license";
import { activateWebshopAddonAction } from "./actions";

export default async function WebshopDashboardPage() {
  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!hasRole(roles, "admin")) redirect("/dashboard");

  const addonState = await resolveWebshopAddonState();
  const needsLicenseActivation =
    addonState.status === "license_required" ||
    addonState.status === "not_installed" ||
    addonState.status === "license_invalid";
  let purchaseIntentHandoff: Awaited<
    ReturnType<typeof createWebshopPurchaseIntentHandoff>
  > | null = null;
  if (needsLicenseActivation) {
    try {
      purchaseIntentHandoff = await createWebshopPurchaseIntentHandoff();
    } catch {
      // The screen remains useful for an existing license key. A reload safely
      // retries the master challenge with the same durable installation key.
      purchaseIntentHandoff = null;
    }
  }
  const t = await getTranslations("backend");
  if (addonState.status === "ready") {
    const [{ rows }, i18n] = await Promise.all([
      listContent({
        page: 1,
        pageSize: 1,
        contentType: "webshop",
        deleted: "exclude",
      }),
      getAddonI18nContext(),
    ]);
    if (!rows[0]) {
      return (
        <div
          className="mx-auto w-full max-w-[var(--backend-content-max-width)] space-y-6 p-6"
          data-nr-addon-key="webshop"
          data-nr-addon-state="ready"
        >
          <div>
            <h1 className="text-2xl font-semibold">
              {t("addons.webshop.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("addons.webshop.description")}
            </p>
          </div>

          <div className="rounded-lg border bg-background p-8">
            <div className="flex max-w-2xl gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                <Store className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    {t("addons.webshop.noShellTitle")}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("addons.webshop.noShellDescription")}
                  </p>
                </div>
                <Button asChild>
                  <Link href="/dashboard/content/new/webshop">
                    <Plus className="h-4 w-4" />
                    {t("addons.webshop.createCmsShell")}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return addonState.addon.renderDashboard({
      i18n,
      licenseMode: "ready",
      path: [],
      userId: user!.id,
    });
  }
  if (addonState.status === "license_expired") {
    const i18n = await getAddonI18nContext();
    return addonState.addon.renderDashboard({
      i18n,
      licenseMode: "edit_existing_only",
      path: [],
      userId: user!.id,
    });
  }

  return (
    <div className="mx-auto w-full max-w-[var(--backend-content-max-width)] space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("addons.webshop.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("addons.webshop.description")}
        </p>
      </div>

      {needsLicenseActivation ? (
        <WebshopLicenseActivation
          action={activateWebshopAddonAction}
          purchaseIntentHandoff={purchaseIntentHandoff}
        />
      ) : null}

      <WebshopAddonRequired state={addonState} />
    </div>
  );
}
