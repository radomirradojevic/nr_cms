import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Lock,
  PowerOff,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getTranslations } from "@/lib/i18n/server";
import type { TranslateFn } from "@/lib/i18n/translate";
import type { LicenseServerAddonState } from "@/lib/license-server-addon/contract";

export async function LicenseServerAddonRequired({
  state,
}: {
  state: Exclude<
    LicenseServerAddonState,
    { status: "ready" } | { status: "license_expired" }
  >;
}) {
  const t = await getTranslations("backend");
  const content = getStateContent(state, t);
  const Icon = content.tone === "success" ? CheckCircle2 : content.icon;

  return (
    <div className="rounded-lg border bg-background p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border bg-muted/40">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{content.title}</h2>
              <Badge
                variant={content.tone === "warning" ? "outline" : "secondary"}
              >
                {content.badge}
              </Badge>
            </div>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {content.description}
            </p>
          </div>
          {state.status === "platform_not_supported" ? (
            <p className="text-sm text-muted-foreground">
              {t("addons.common.supportedInstallTargets", {
                providers: state.supportedProviders.join(", "),
              })}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function getStateContent(
  state: Exclude<
    LicenseServerAddonState,
    { status: "ready" } | { status: "license_expired" }
  >,
  t: TranslateFn,
) {
  switch (state.status) {
    case "disabled":
      return {
        badge: t("addons.common.disabled"),
        description: state.message,
        icon: PowerOff,
        title: t("addons.licenseServer.disabledTitle"),
        tone: "warning" as const,
      };
    case "platform_not_supported":
      return {
        badge: t("addons.common.installUnavailable"),
        description: state.message,
        icon: AlertTriangle,
        title: t("addons.licenseServer.cannotInstall"),
        tone: "warning" as const,
      };
    case "install_pending":
      return {
        badge: t("addons.common.installPending"),
        description: t("addons.licenseServer.installPendingDescription"),
        icon: KeyRound,
        title: t("addons.licenseServer.installPendingTitle"),
        tone: "success" as const,
      };
    case "install_disabled":
      return {
        badge: t("addons.common.installDisabled"),
        description: state.message,
        icon: Lock,
        title: t("addons.licenseServer.installLocked"),
        tone: "warning" as const,
      };
    case "license_invalid":
      return {
        badge: t("addons.common.licenseInvalid"),
        description: state.reason,
        icon: AlertTriangle,
        title: t("addons.common.licenseNeedsAttention"),
        tone: "warning" as const,
      };
    case "license_required":
      return {
        badge: t("addons.common.licenseRequired"),
        description: t("addons.licenseServer.licenseRequiredDescription"),
        icon: Lock,
        title: t("addons.licenseServer.activate"),
        tone: "default" as const,
      };
    case "not_installed":
      return {
        badge: t("addons.common.addOnRequired"),
        description: t("addons.licenseServer.notInstalledDescription"),
        icon: KeyRound,
        title: t("addons.licenseServer.notInstalledTitle"),
        tone: "default" as const,
      };
  }
}
