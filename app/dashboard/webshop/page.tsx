import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CreditCard,
  ExternalLink,
  Monitor,
  Package,
  Pencil,
  Plus,
  Settings,
  ShoppingCart,
  Store,
  Tags,
  TicketPercent,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { WebshopAddonRequired } from "@/components/webshop-addon-required";
import { WebshopLicenseActivation } from "@/components/webshop-license-activation";
import { listContent } from "@/data/content";
import { getAddonI18nContext } from "@/lib/i18n/addon-server";
import { getTranslations } from "@/lib/i18n/server";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { tryBuildWebshopLicenseBuyUrl } from "@/lib/webshop-addon/buy-link";
import { resolveWebshopAddonState } from "@/lib/webshop-addon/license";
import { activateWebshopAddonAction } from "./actions";

const PLACEHOLDER_SECTIONS = [
  { labelKey: "addons.webshop.placeholderSections.products", icon: Package },
  { labelKey: "addons.webshop.placeholderSections.categories", icon: Tags },
  {
    labelKey: "addons.webshop.placeholderSections.orders",
    icon: ShoppingCart,
  },
  {
    labelKey: "addons.webshop.placeholderSections.payments",
    icon: CreditCard,
  },
  { labelKey: "addons.webshop.placeholderSections.storefront", icon: Store },
  {
    labelKey: "addons.webshop.placeholderSections.coupons",
    icon: TicketPercent,
  },
  { labelKey: "addons.webshop.placeholderSections.settings", icon: Settings },
] as const;

export default async function WebshopDashboardPage() {
  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!hasRole(roles, "admin")) redirect("/dashboard");

  const addonState = await resolveWebshopAddonState();
  const needsLicenseActivation =
    addonState.status === "license_required" ||
    addonState.status === "not_installed" ||
    addonState.status === "license_invalid";
  const buyUrl = needsLicenseActivation
    ? await tryBuildWebshopLicenseBuyUrl()
    : null;
  const t = await getTranslations("backend");
  const i18n = await getAddonI18nContext();
  if (addonState.status === "ready") {
    return addonState.addon.renderDashboard({
      i18n,
      licenseMode: "ready",
      path: [],
      userId: user!.id,
    });
  }
  if (addonState.status === "license_expired") {
    return addonState.addon.renderDashboard({
      i18n,
      licenseMode: "edit_existing_only",
      path: [],
      userId: user!.id,
    });
  }

  const { rows } = await listContent({
    page: 1,
    pageSize: 1,
    contentType: "webshop",
    deleted: "exclude",
  });
  const webshop = rows[0];

  return (
    <div className="mx-auto w-full max-w-[var(--backend-content-max-width)] space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {t("addons.webshop.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("addons.webshop.description")}
          </p>
        </div>
        {webshop ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/dashboard/content/${webshop.id}/edit`}>
                <Pencil className="h-4 w-4" />
                {t("addons.webshop.editShell")}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link
                href={`/${webshop.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                {t("addons.webshop.viewStorefront")}
              </Link>
            </Button>
          </div>
        ) : (
          <Button asChild>
            <Link href="/dashboard/content/new/webshop">
              <Plus className="h-4 w-4" />
              {t("addons.webshop.setUp")}
            </Link>
          </Button>
        )}
      </div>

      {needsLicenseActivation ? (
        <WebshopLicenseActivation
          action={activateWebshopAddonAction}
          buyUrl={buyUrl}
        />
      ) : null}

      <WebshopAddonRequired state={addonState} />

      {!webshop ? (
        <div className="rounded-lg border border-dashed bg-background p-8">
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
      ) : (
        <>
          <div className="rounded-lg border bg-background p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Meta
                label={t("addons.webshop.meta.title")}
                value={webshop.title}
              />
              <Meta
                label={t("addons.webshop.meta.slug")}
                value={`/${webshop.slug}`}
              />
              <Meta
                label={t("addons.webshop.meta.status")}
                value={webshop.status}
              />
              <Meta
                label={t("addons.webshop.meta.category")}
                value={webshop.categoryName}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PLACEHOLDER_SECTIONS.map(({ labelKey, icon: Icon }) => (
              <div
                key={labelKey}
                className="rounded-lg border bg-background p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-medium">
                      {t(labelKey)}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {t("addons.common.availableAfterActivation")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <div className="rounded-lg border bg-background p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-medium">
                    {t("addons.webshop.publicPreview")}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {t("addons.webshop.usesCmsShellRenderer")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </div>
      <div className="truncate text-sm">{value}</div>
    </div>
  );
}
