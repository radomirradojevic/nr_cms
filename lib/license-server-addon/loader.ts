import { getAddonLoader } from "@/.generated/addon-registry";
import {
  isLicenseServerAddon,
  type CustomerLicenseIssuerCapabilityV2Resolution,
  type LicenseServerAddon,
  type LicenseServerAddonModule,
} from "@/lib/license-server-addon/contract";

export type LicenseServerAddonLoadResult =
  | { status: "loaded"; addon: LicenseServerAddon }
  | { status: "not_installed" }
  | { status: "invalid"; reason: string };

async function resolveAddon(
  moduleValue: LicenseServerAddonModule,
): Promise<LicenseServerAddon | null> {
  if (isLicenseServerAddon(moduleValue)) return moduleValue;
  if ("default" in moduleValue && isLicenseServerAddon(moduleValue.default))
    return moduleValue.default;
  if (
    "licenseServerAddon" in moduleValue &&
    isLicenseServerAddon(moduleValue.licenseServerAddon)
  )
    return moduleValue.licenseServerAddon;
  if (
    "createLicenseServerAddon" in moduleValue &&
    typeof moduleValue.createLicenseServerAddon === "function"
  ) {
    const addon = await moduleValue.createLicenseServerAddon();
    return isLicenseServerAddon(addon) ? addon : null;
  }
  return null;
}

/** Filesystem paths and env-provided modules are never executable runtime configuration. */
export async function loadLicenseServerAddon(
  addonKey = "license-server",
  registryLookup: typeof getAddonLoader = getAddonLoader,
): Promise<LicenseServerAddonLoadResult> {
  if (addonKey !== "license-server")
    return {
      status: "invalid",
      reason: "License Server addon key is not allowlisted.",
    };
  const loader = registryLookup("license-server");
  if (!loader) return { status: "not_installed" };
  try {
    const addon = await resolveAddon(
      (await loader()) as LicenseServerAddonModule,
    );
    return addon
      ? { status: "loaded", addon }
      : {
          status: "invalid",
          reason:
            "Installed License Server package does not export a valid host contract.",
        };
  } catch (error) {
    return {
      status: "invalid",
      reason:
        error instanceof Error
          ? error.message
          : "License Server package could not be loaded.",
    };
  }
}

/** Resolves V2 without a silent V1 downgrade or a private-package import. */
export async function loadCustomerLicenseIssuerCapabilityV2(
  addonKey = "license-server",
  registryLookup: typeof getAddonLoader = getAddonLoader,
): Promise<CustomerLicenseIssuerCapabilityV2Resolution> {
  const loaded = await loadLicenseServerAddon(addonKey, registryLookup);

  if (loaded.status === "not_installed") {
    return {
      status: "unavailable",
      reason: "addon_not_installed",
      requestedContractVersion: "2",
    };
  }

  if (loaded.status === "invalid") {
    return {
      status: "unavailable",
      reason: "addon_invalid",
      requestedContractVersion: "2",
      detail: loaded.reason,
    };
  }

  if (!loaded.addon.customerLicenseIssuerV2) {
    const availableContractVersions: Array<"1" | "2"> = [];
    if (loaded.addon.customerLicenseIssuer?.contractVersion === "1") {
      availableContractVersions.push("1");
    }

    return {
      status: "unavailable",
      reason: "v2_not_exported",
      requestedContractVersion: "2",
      availableContractVersions,
    };
  }

  return {
    status: "available",
    capability: loaded.addon.customerLicenseIssuerV2,
  };
}
