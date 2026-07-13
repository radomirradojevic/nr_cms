import {
  Boxes,
  KeyRound,
  LockKeyhole,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import { redirect } from "next/navigation";

import { LicenseServerAddonRequired } from "@/components/license-server-addon-required";
import { WebshopLicenseActivation } from "@/components/webshop-license-activation";
import { getAddonI18nContext } from "@/lib/i18n/addon-server";
import { getTranslations } from "@/lib/i18n/server";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { buildLicenseServerLicenseBuyUrl } from "@/lib/license-server-addon/buy-link";
import { resolveLicenseServerAddonState } from "@/lib/license-server-addon/license";
import { activateLicenseServerAddonAction } from "./actions";

const PLACEHOLDER_SECTIONS = [
  {
    labelKey: "addons.licenseServer.placeholderSections.apiClients",
    icon: LockKeyhole,
  },
  {
    labelKey: "addons.licenseServer.placeholderSections.productTypes",
    icon: Boxes,
  },
  {
    labelKey: "addons.licenseServer.placeholderSections.skus",
    icon: PackageCheck,
  },
  {
    labelKey: "addons.licenseServer.placeholderSections.licenses",
    icon: KeyRound,
  },
  {
    labelKey: "addons.licenseServer.placeholderSections.validationEvents",
    icon: ShieldCheck,
  },
] as const;

export default async function LicenseServerDashboardPage() {
  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!hasRole(roles, "admin")) redirect("/dashboard");

  const addonState = await resolveLicenseServerAddonState();
  const buyUrl = await buildLicenseServerLicenseBuyUrl();
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

  return (
    <div className="mx-auto w-full max-w-[var(--backend-content-max-width)] space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t("addons.licenseServer.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("addons.licenseServer.description")}
        </p>
      </div>

      {addonState.status === "license_required" ||
      addonState.status === "not_installed" ||
      addonState.status === "license_invalid" ? (
        <WebshopLicenseActivation
          action={activateLicenseServerAddonAction}
          buyLabel={t("addons.licenseServer.buyLicenseKey")}
          buyUrl={buyUrl}
          description={t("addons.licenseServer.activationDescription")}
          inputId="license-server-license-key"
          submitLabel={t("addons.licenseServer.activate")}
          title={t("addons.licenseServer.activationTitle")}
        />
      ) : null}

      <LicenseServerAddonRequired state={addonState} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PLACEHOLDER_SECTIONS.map(({ labelKey, icon: Icon }) => (
          <div key={labelKey} className="rounded-lg border bg-background p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-medium">{t(labelKey)}</h2>
                <p className="text-xs text-muted-foreground">
                  {t("addons.common.availableAfterActivation")}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
