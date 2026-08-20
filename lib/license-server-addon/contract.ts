import type { ReactNode } from "react";
import type { CustomerLicenseIssuerCapabilityV1 } from "@nr-cms/addon-sdk/customer-license-issuer";
import {
  isCustomerLicenseIssuerCapabilityV2,
  type CustomerLicenseIssuerCapabilityV2,
} from "@nr-cms/addon-sdk/customer-license-issuer-v2";
import type {
  CustomerLicenseIssuerOperationsJobInputV1,
  CustomerLicenseIssuerOperationsJobResultV1,
} from "@nr-cms/addon-sdk/customer-license-issuer-jobs";

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
  customerLicenseIssuerV2?: CustomerLicenseIssuerCapabilityV2;
  jobs?: {
    customerLicenseIssuerOperations?(
      input: CustomerLicenseIssuerOperationsJobInputV1,
    ): Promise<CustomerLicenseIssuerOperationsJobResultV1>;
    /** @deprecated Prompt 08 scheduler callers use customerLicenseIssuerOperations. */
    customerLicenseIssuerOutbox?(input: { limit: number }): Promise<{
      claimed: number;
      deadLettered: number;
      retried: number;
      succeeded: number;
    }>;
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

export type CustomerLicenseIssuerCapabilityV2Resolution =
  | {
      status: "available";
      capability: CustomerLicenseIssuerCapabilityV2;
    }
  | {
      status: "unavailable";
      reason: "addon_not_installed";
      requestedContractVersion: "2";
    }
  | {
      status: "unavailable";
      reason: "addon_invalid";
      requestedContractVersion: "2";
      detail: string;
    }
  | {
      status: "unavailable";
      reason: "v2_not_exported";
      requestedContractVersion: "2";
      availableContractVersions: readonly ("1" | "2")[];
    }
  | {
      status: "unavailable";
      reason: "addon_not_ready";
      requestedContractVersion: "2";
      addonState:
        | "disabled"
        | "edit_existing_only"
        | "install_disabled"
        | "install_pending"
        | "license_required"
        | "not_installed"
        | "platform_not_supported";
    };

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
  const jobs = (candidate as { jobs?: unknown }).jobs;
  return (
    typeof candidate.version === "string" &&
    typeof candidate.renderDashboard === "function" &&
    typeof candidate.renderDashboardPath === "function" &&
    (candidate.customerLicenseIssuerV2 === undefined ||
      isCustomerLicenseIssuerCapabilityV2(candidate.customerLicenseIssuerV2)) &&
    isCustomerLicenseIssuerJobs(jobs)
  );
}

function isCustomerLicenseIssuerJobs(value: unknown) {
  if (value === undefined) return true;
  if (!value || typeof value !== "object") return false;
  const jobs = value as Record<string, unknown>;
  return (
    (jobs.customerLicenseIssuerOperations === undefined ||
      typeof jobs.customerLicenseIssuerOperations === "function") &&
    (jobs.customerLicenseIssuerOutbox === undefined ||
      typeof jobs.customerLicenseIssuerOutbox === "function")
  );
}
