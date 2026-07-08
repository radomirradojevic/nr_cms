import Link from "next/link";
import { ArrowRight, Lock, Store, Tags } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WebshopAddonRequired } from "@/components/webshop-addon-required";
import { getAddonI18nContext } from "@/lib/i18n/addon-server";
import { getTranslations } from "@/lib/i18n/server";
import { resolveWebshopAddonState } from "@/lib/webshop-addon/license";

export async function WebshopCategoriesBridge({ userId }: { userId: string }) {
  const addonState = await resolveWebshopAddonState();
  const i18n = await getAddonI18nContext();
  const t = await getTranslations("backend");

  if (
    addonState.status === "ready" &&
    addonState.addon.renderContentCategoriesBridge
  ) {
    return addonState.addon.renderContentCategoriesBridge({
      i18n,
      licenseMode: "ready",
      userId,
    });
  }

  if (
    addonState.status === "license_expired" &&
    addonState.addon.renderContentCategoriesBridge
  ) {
    return addonState.addon.renderContentCategoriesBridge({
      i18n,
      licenseMode: "edit_existing_only",
      userId,
    });
  }

  if (
    addonState.status !== "ready" &&
    addonState.status !== "license_expired"
  ) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-background p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                <Tags className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold">
                    {t("addons.webshop.categoryBridge.title")}
                  </h2>
                  <Badge variant="outline">
                    {t("addons.webshop.categoryBridge.readOnlyBadge")}
                  </Badge>
                </div>
                <p className="max-w-3xl text-sm text-muted-foreground">
                  {t("addons.webshop.categoryBridge.description")}
                </p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard/webshop">
                <Store className="h-4 w-4" />
                {t("addons.webshop.categoryBridge.dashboardLink")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
        <WebshopAddonRequired state={addonState} />
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-background p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted/40">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">
                {t("addons.webshop.categoryBridge.title")}
              </h2>
              <Badge variant="outline">
                {addonState.status === "license_expired"
                  ? t("addons.webshop.categoryBridge.editExistingOnlyBadge")
                  : t("addons.webshop.categoryBridge.unavailableBadge")}
              </Badge>
            </div>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {t("addons.webshop.categoryBridge.unavailableDescription")}
            </p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/webshop/categories">
            <Store className="h-4 w-4" />
            {t("addons.webshop.categoryBridge.openManagement")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
