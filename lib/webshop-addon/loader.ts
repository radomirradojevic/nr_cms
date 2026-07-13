import { getAddonLoader } from "@/.generated/addon-registry";
import { isWebshopAddon, type WebshopAddon, type WebshopAddonModule } from "@/lib/webshop-addon/contract";

export type WebshopAddonLoadResult =
  | { status: "loaded"; addon: WebshopAddon }
  | { status: "not_installed" }
  | { status: "invalid"; reason: string };

async function resolveAddon(moduleValue: WebshopAddonModule): Promise<WebshopAddon | null> {
  if (isWebshopAddon(moduleValue)) return moduleValue;
  if ("default" in moduleValue && isWebshopAddon(moduleValue.default)) return moduleValue.default;
  if ("webshopAddon" in moduleValue && isWebshopAddon(moduleValue.webshopAddon)) return moduleValue.webshopAddon;
  if ("createWebshopAddon" in moduleValue && typeof moduleValue.createWebshopAddon === "function") {
    const addon = await moduleValue.createWebshopAddon();
    return isWebshopAddon(addon) ? addon : null;
  }
  return null;
}

/** Only the build-time generated allowlist may select a production addon. */
export async function loadWebshopAddon(addonKey = "webshop"): Promise<WebshopAddonLoadResult> {
  if (addonKey !== "webshop") return { status: "invalid", reason: "Webshop addon key is not allowlisted." };
  const loader = getAddonLoader("webshop");
  if (!loader) return { status: "not_installed" };
  try {
    const addon = await resolveAddon(await loader() as WebshopAddonModule);
    return addon ? { status: "loaded", addon } : { status: "invalid", reason: "Installed Webshop package does not export a valid host contract." };
  } catch (error) {
    return { status: "invalid", reason: error instanceof Error ? error.message : "Webshop package could not be loaded." };
  }
}
