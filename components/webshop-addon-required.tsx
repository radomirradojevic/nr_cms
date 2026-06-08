import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  PowerOff,
  Store,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { WebshopAddonState } from "@/lib/webshop-addon/contract";

export function WebshopAddonRequired({
  state,
}: {
  state: Exclude<
    WebshopAddonState,
    { status: "ready" } | { status: "license_expired" }
  >;
}) {
  const content = getStateContent(state);
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
              Supported install target:{" "}
              <span className="font-medium text-foreground">
                {state.supportedProviders.join(", ")}
              </span>
              .
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function getStateContent(
  state: Exclude<
    WebshopAddonState,
    { status: "ready" } | { status: "license_expired" }
  >,
) {
  switch (state.status) {
    case "disabled":
      return {
        badge: "Disabled",
        description: state.message,
        icon: PowerOff,
        title: "Webshop is disabled",
        tone: "warning" as const,
      };
    case "platform_not_supported":
      return {
        badge: "Managed platform required",
        description: state.message,
        icon: AlertTriangle,
        title: "Webshop cannot be installed here",
        tone: "warning" as const,
      };
    case "install_pending":
      return {
        badge: "Install pending",
        description:
          "The license was accepted. The private add-on becomes available after the managed deployment pipeline installs it and rebuilds the app.",
        icon: Store,
        title: "Waiting for managed deployment",
        tone: "success" as const,
      };
    case "install_disabled":
      return {
        badge: "Install disabled",
        description: state.message,
        icon: Lock,
        title: "Webshop install flow is locked",
        tone: "warning" as const,
      };
    case "license_invalid":
      return {
        badge: "License invalid",
        description: state.reason,
        icon: AlertTriangle,
        title: "License needs attention",
        tone: "warning" as const,
      };
    case "license_required":
      return {
        badge: "License required",
        description:
          "Enter a valid Webshop license and package token to activate this paid add-on on a supported managed deployment.",
        icon: Lock,
        title: "Activate Webshop",
        tone: "default" as const,
      };
    case "not_installed":
      return {
        badge: "Add-on required",
        description:
          "The public CMS shell is ready. The private Webshop add-on must be installed through a supported managed deployment before commerce features are available.",
        icon: Store,
        title: "Webshop add-on is not installed",
        tone: "default" as const,
      };
  }
}
