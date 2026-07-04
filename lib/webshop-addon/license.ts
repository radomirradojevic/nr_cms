import { z } from "zod";

import {
  WEBSHOP_SUPPORTED_PROVIDERS,
  type WebshopAddonState,
  type WebshopDeploymentPlatform,
} from "@/lib/webshop-addon/contract";
import {
  getWebshopDisabledMessage,
  getWebshopRuntimeConfig,
  type WebshopRuntimeConfig,
} from "@/lib/webshop-addon/config";
import {
  loadWebshopAddon,
  type WebshopAddonLoadResult,
} from "@/lib/webshop-addon/loader";
import { verifyWebshopDeploymentPlatform } from "@/lib/webshop-addon/platform";

const ActivationResponseSchema = z.object({
  entitlementToken: z.string().min(1),
  expiresAt: z.string().datetime(),
  features: z.array(z.string()).default([]),
  licenseKeyRef: z.string().min(1),
  packageName: z.string().optional(),
  packageVersion: z.string().optional(),
});

export type WebshopActivationResponse = z.infer<
  typeof ActivationResponseSchema
>;

export type WebshopEntitlementState = {
  expiresAt?: Date | null;
  status: string;
};

export type InstalledWebshopLicenseModeResult =
  | { status: "ready"; mode: "ready" }
  | { status: "license_expired"; mode: "edit_existing_only" }
  | { status: "forbidden"; reason: string };

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export function resolveWebshopAddonStateFromInputs({
  entitlement,
  loadResult,
  now = new Date(),
  platform,
  runtimeConfig = getWebshopRuntimeConfig(),
}: {
  entitlement: WebshopEntitlementState | null;
  loadResult: WebshopAddonLoadResult;
  now?: Date;
  platform?: WebshopDeploymentPlatform;
  runtimeConfig?: WebshopRuntimeConfig;
}): WebshopAddonState {
  const disabledMessage = getWebshopDisabledMessage(runtimeConfig);
  if (disabledMessage) {
    return { status: "disabled", message: disabledMessage };
  }

  if (loadResult.status === "invalid") {
    return { status: "license_invalid", reason: loadResult.reason };
  }

  if (loadResult.status === "not_installed") {
    if (entitlement?.status === "install_pending") {
      return { status: "install_pending" };
    }

    if (runtimeConfig.installMode === "disabled") {
      return {
        status: "install_disabled",
        message:
          "Webshop installation is disabled by WEBSHOP_INSTALL_MODE. Existing installed shops can keep running, but new activation is blocked.",
      };
    }

    if (platform?.status === "unsupported") {
      return {
        status: "platform_not_supported",
        message: platform.message,
        supportedProviders: WEBSHOP_SUPPORTED_PROVIDERS,
      };
    }

    return { status: "not_installed" };
  }

  if (!entitlement) return { status: "license_required" };

  if (entitlement.status === "install_pending") {
    return { status: "install_pending" };
  }

  if (entitlement.status === "invalid") {
    return {
      status: "license_invalid",
      reason: "Stored Webshop entitlement is marked invalid.",
    };
  }

  if (entitlement.status === "expired") {
    return {
      status: "license_expired",
      addon: loadResult.addon,
      expiresAt: entitlement.expiresAt?.toISOString() ?? "",
      mode: "edit_existing_only",
    };
  }

  if (
    entitlement.expiresAt &&
    entitlement.expiresAt.getTime() <= now.getTime()
  ) {
    return {
      status: "license_expired",
      addon: loadResult.addon,
      expiresAt: entitlement.expiresAt.toISOString(),
      mode: "edit_existing_only",
    };
  }

  if (entitlement.status !== "ready") return { status: "license_required" };
  return { status: "ready", addon: loadResult.addon };
}

export async function resolveWebshopAddonState(): Promise<WebshopAddonState> {
  const runtimeConfig = getWebshopRuntimeConfig();
  const disabledMessage = getWebshopDisabledMessage(runtimeConfig);
  if (disabledMessage) {
    return { status: "disabled", message: disabledMessage };
  }

  const { getWebshopAddonEntitlement } =
    await import("@/data/webshop-addon-entitlement");
  const loadResult = await loadWebshopAddon(runtimeConfig.addonModule);

  if (loadResult.status === "not_installed") {
    const entitlement = await getWebshopAddonEntitlement();
    const platform =
      entitlement?.status === "install_pending"
        ? undefined
        : await verifyWebshopDeploymentPlatform();
    return resolveWebshopAddonStateFromInputs({
      entitlement,
      loadResult,
      platform,
      runtimeConfig,
    });
  }

  const entitlement = await getWebshopAddonEntitlement();
  return resolveWebshopAddonStateFromInputs({
    entitlement,
    loadResult,
    runtimeConfig,
  });
}

export function resolveInstalledWebshopLicenseModeFromEntitlement(
  entitlement: WebshopEntitlementState | null,
  now = new Date(),
  runtimeConfig = getWebshopRuntimeConfig(),
): InstalledWebshopLicenseModeResult {
  const disabledMessage = getWebshopDisabledMessage(runtimeConfig);
  if (disabledMessage) {
    return { status: "forbidden", reason: disabledMessage };
  }

  if (!entitlement) {
    return { status: "forbidden", reason: "Webshop license is required." };
  }

  if (entitlement.status === "expired") {
    return { status: "license_expired", mode: "edit_existing_only" };
  }

  if (
    entitlement.expiresAt &&
    entitlement.expiresAt.getTime() <= now.getTime()
  ) {
    return { status: "license_expired", mode: "edit_existing_only" };
  }

  if (entitlement.status === "ready") {
    return { status: "ready", mode: "ready" };
  }

  return {
    status: "forbidden",
    reason: "Webshop add-on is not available for this license.",
  };
}

export async function resolveInstalledWebshopLicenseMode(): Promise<InstalledWebshopLicenseModeResult> {
  const { getWebshopAddonEntitlement } =
    await import("@/data/webshop-addon-entitlement");
  return resolveInstalledWebshopLicenseModeFromEntitlement(
    await getWebshopAddonEntitlement(),
  );
}

export async function requestWebshopLicenseActivation({
  deploymentPlatform,
  licenseKey,
  packageToken,
  siteDomain,
  siteId,
}: {
  deploymentPlatform: Extract<
    WebshopDeploymentPlatform,
    { status: "supported" }
  >;
  licenseKey: string;
  packageToken: string;
  siteDomain: string;
  siteId: string;
}): Promise<
  | { ok: true; entitlement: WebshopActivationResponse }
  | { ok: false; error: string }
> {
  const licenseServerUrl = getWebshopRuntimeConfig().licenseApiUrl;
  if (!licenseServerUrl) {
    return { ok: false, error: "Webshop license server is not configured." };
  }

  const response = await fetch(
    joinUrl(licenseServerUrl, "/api/webshop/licenses/activate"),
    {
      body: JSON.stringify({
        deploymentPlatform,
        licenseKey,
        packageToken,
        siteDomain,
        siteId,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  );

  if (!response.ok) {
    return {
      ok: false,
      error: "Webshop license activation was rejected by the license server.",
    };
  }

  const parsed = ActivationResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    return {
      ok: false,
      error: "Webshop license server returned an invalid activation response.",
    };
  }

  return { ok: true, entitlement: parsed.data };
}
