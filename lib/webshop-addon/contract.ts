import type { ReactNode } from "react";
import type { Metadata } from "next";

export const WEBSHOP_SUPPORTED_PROVIDERS = ["vercel_production_oidc"] as const;

export type WebshopSupportedProvider =
  (typeof WEBSHOP_SUPPORTED_PROVIDERS)[number];

export type WebshopDeploymentPlatform =
  | {
      status: "supported";
      provider: "vercel";
      mode: "production_oidc";
      ownerId: string;
      projectId: string;
      deploymentEnvironment: "production";
    }
  | {
      status: "unsupported";
      reason:
        | "local"
        | "self_hosted"
        | "unknown"
        | "missing_attestation"
        | "invalid_attestation"
        | "unsupported_provider"
        | "env_only_claimed_vercel";
      message: string;
    };

export type WebshopLicenseMode = "ready" | "edit_existing_only";

export type WebshopDashboardInput = {
  licenseMode: WebshopLicenseMode;
  path: readonly string[];
  searchParams?: Record<string, string | string[] | undefined>;
  userId: string;
};

export type WebshopDashboardPathInput = WebshopDashboardInput;

export type WebshopStorefrontInput = {
  contentId: string;
  licenseMode: WebshopLicenseMode;
  path: readonly string[];
  searchParams?: Record<string, string | string[] | undefined>;
  slug: string;
};

export type WebshopStorefrontPathInput = WebshopStorefrontInput;

export type WebshopApiRouteInput = {
  licenseMode: WebshopLicenseMode;
  method: string;
  path: readonly string[];
  request: Request;
  userId: string | null;
};

export type WebshopContentCategoriesBridgeInput = {
  licenseMode: WebshopLicenseMode;
  userId: string;
};

export type WebshopMigration = {
  id: string;
  name: string;
  sql: string;
};

export type WebshopAddon = {
  version: string;
  renderDashboard(input: WebshopDashboardInput): Promise<ReactNode>;
  renderDashboardPath(input: WebshopDashboardPathInput): Promise<ReactNode>;
  renderStorefrontRoot(input: WebshopStorefrontInput): Promise<ReactNode>;
  renderStorefrontPath(input: WebshopStorefrontPathInput): Promise<ReactNode>;
  generateStorefrontMetadata?(
    input: WebshopStorefrontPathInput,
  ): Promise<Metadata>;
  handleApiRoute?(input: WebshopApiRouteInput): Promise<Response>;
  renderContentCategoriesBridge?(
    input: WebshopContentCategoriesBridgeInput,
  ): Promise<ReactNode>;
  listMigrations?(): Promise<WebshopMigration[]>;
};

export type WebshopAddonState =
  | { status: "disabled"; message: string }
  | { status: "install_disabled"; message: string }
  | { status: "not_installed" }
  | {
      status: "platform_not_supported";
      message: string;
      supportedProviders: readonly WebshopSupportedProvider[];
    }
  | { status: "install_pending" }
  | { status: "license_required" }
  | { status: "license_invalid"; reason: string }
  | {
      status: "license_expired";
      expiresAt: string;
      mode: "edit_existing_only";
      addon: WebshopAddon;
    }
  | { status: "ready"; addon: WebshopAddon };

export type WebshopAddonModule =
  | WebshopAddon
  | { default?: WebshopAddon }
  | { webshopAddon?: WebshopAddon }
  | { createWebshopAddon?: () => WebshopAddon | Promise<WebshopAddon> };

export function isWebshopAddon(value: unknown): value is WebshopAddon {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<WebshopAddon>;
  return (
    typeof candidate.version === "string" &&
    typeof candidate.renderDashboard === "function" &&
    typeof candidate.renderDashboardPath === "function" &&
    typeof candidate.renderStorefrontRoot === "function" &&
    typeof candidate.renderStorefrontPath === "function"
  );
}
