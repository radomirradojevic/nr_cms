import { getAddonLoader } from "@/.generated/addon-registry";
import { isLicenseServerAddon, type LicenseServerAddon, type LicenseServerAddonModule } from "@/lib/license-server-addon/contract";

export type LicenseServerAddonLoadResult =
  | { status: "loaded"; addon: LicenseServerAddon }
  | { status: "not_installed" }
  | { status: "invalid"; reason: string };

async function resolveAddon(moduleValue: LicenseServerAddonModule): Promise<LicenseServerAddon | null> {
  if (isLicenseServerAddon(moduleValue)) return moduleValue;
  if ("default" in moduleValue && isLicenseServerAddon(moduleValue.default)) return moduleValue.default;
  if ("licenseServerAddon" in moduleValue && isLicenseServerAddon(moduleValue.licenseServerAddon)) return moduleValue.licenseServerAddon;
  if ("createLicenseServerAddon" in moduleValue && typeof moduleValue.createLicenseServerAddon === "function") {
    const addon = await moduleValue.createLicenseServerAddon();
    return isLicenseServerAddon(addon) ? addon : null;
  }
  return null;
}

/** Filesystem paths and env-provided modules are never executable production configuration. */
export async function loadLicenseServerAddon(addonKey = "license-server"): Promise<LicenseServerAddonLoadResult> {
  if (addonKey !== "license-server") return { status: "invalid", reason: "License Server addon key is not allowlisted." };
  const loader = getAddonLoader("license-server");
  if (!loader) return { status: "not_installed" };
  try {
    const addon = await resolveAddon(await loader() as LicenseServerAddonModule);
    return addon ? { status: "loaded", addon } : { status: "invalid", reason: "Installed License Server package does not export a valid host contract." };
  } catch (error) {
    return { status: "invalid", reason: error instanceof Error ? error.message : "License Server package could not be loaded." };
  }
}
