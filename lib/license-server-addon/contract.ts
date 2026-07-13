import type { ReactNode } from "react";
import type { CustomerLicenseIssuerCapabilityV1 } from "@nr-cms/addon-sdk/customer-license-issuer";

import type { AddonI18nContext } from "@/lib/i18n/addon-contract";
import type { WebshopDeploymentPlatform } from "@/lib/webshop-addon/contract";

export type LicenseServerDeploymentPlatform = WebshopDeploymentPlatform;

export type LicenseServerLicenseMode = "ready" | "edit_existing_only";

export type LicenseServerDashboardInput = {
  i18n?: AddonI18nContext;
  licenseMode: LicenseServerLicenseMode;
  path: readonly string[];
  searchParams?: Record<string, string | string[] | undefined>;
  userId: string;
};

export type LicenseServerDashboardPathInput = LicenseServerDashboardInput;

export type LicenseServerApiRouteInput = {
  i18n?: AddonI18nContext;
  licenseMode: LicenseServerLicenseMode;
  method: string;
  path: readonly string[];
  request: Request;
  userId: string | null;
};

export type LicenseServerMigration = {
  id: string;
  name: string;
  sql: string;
};

export type LicenseServerAddon = {
  version: string;
  renderDashboard(input: LicenseServerDashboardInput): Promise<ReactNode>;
  renderDashboardPath(
    input: LicenseServerDashboardPathInput,
  ): Promise<ReactNode>;
  handleApiRoute?(input: LicenseServerApiRouteInput): Promise<Response>;
  customerLicenseIssuer?: CustomerLicenseIssuerCapabilityV1;
  jobs?: {
    customerLicenseIssuerOutbox?(input: { limit: number }): Promise<{ claimed: number; deadLettered: number; retried: number; succeeded: number }>;
  };
  listMigrations?(): Promise<LicenseServerMigration[]>;
};

export type LicenseServerAddonState =
  | { status: "disabled"; message: string }
  | { status: "install_disabled"; message: string }
  | { status: "not_installed" }
  | {
      status: "platform_not_supported";
      message: string;
      supportedProviders: readonly string[];
    }
  | { status: "install_pending" }
  | { status: "license_required" }
  | { status: "license_invalid"; reason: string }
  | {
      status: "license_expired";
      expiresAt: string;
      mode: "edit_existing_only";
      addon: LicenseServerAddon;
    }
  | { status: "ready"; addon: LicenseServerAddon };

export type LicenseServerAddonModule =
  | LicenseServerAddon
  | { default?: LicenseServerAddon }
  | { licenseServerAddon?: LicenseServerAddon }
  | {
      createLicenseServerAddon?: () =>
        | LicenseServerAddon
        | Promise<LicenseServerAddon>;
    };

export function isLicenseServerAddon(
  value: unknown,
): value is LicenseServerAddon {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LicenseServerAddon>;
  return (
    typeof candidate.version === "string" &&
    typeof candidate.renderDashboard === "function" &&
    typeof candidate.renderDashboardPath === "function"
  );
}
