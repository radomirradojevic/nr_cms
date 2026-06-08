import Link from "next/link";
import { ArrowRight, Lock, Store, Tags } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WebshopAddonRequired } from "@/components/webshop-addon-required";
import { resolveWebshopAddonState } from "@/lib/webshop-addon/license";

export async function WebshopCategoriesBridge({ userId }: { userId: string }) {
  const addonState = await resolveWebshopAddonState();

  if (
    addonState.status === "ready" &&
    addonState.addon.renderContentCategoriesBridge
  ) {
    return addonState.addon.renderContentCategoriesBridge({
      licenseMode: "ready",
      userId,
    });
  }

  if (
    addonState.status === "license_expired" &&
    addonState.addon.renderContentCategoriesBridge
  ) {
    return addonState.addon.renderContentCategoriesBridge({
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
                    Webshop categories
                  </h2>
                  <Badge variant="outline">Read-only bridge</Badge>
                </div>
                <p className="max-w-3xl text-sm text-muted-foreground">
                  Webshop category management lives in the paid Webshop
                  dashboard. This CMS tab becomes a read-only category tree when
                  the add-on is installed and licensed.
                </p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard/webshop">
                <Store className="h-4 w-4" />
                Webshop dashboard
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
              <h2 className="text-base font-semibold">Webshop categories</h2>
              <Badge variant="outline">
                {addonState.status === "license_expired"
                  ? "Edit existing only"
                  : "Bridge unavailable"}
              </Badge>
            </div>
            <p className="max-w-3xl text-sm text-muted-foreground">
              The installed Webshop add-on does not expose the read-only CMS
              bridge for categories. Manage categories from the Webshop
              dashboard.
            </p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/webshop/categories">
            <Store className="h-4 w-4" />
            Open management
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
