import "server-only";

import { loadWebshopAddon } from "@/lib/webshop-addon/loader";

export async function runWebshopLicenseServerCatalogSync(limit: number) {
  const result = await loadWebshopAddon();
  if (result.status !== "loaded") {
    return {
      attempted: 0,
      failed: 0,
      succeeded: 0,
      unchanged: 0,
      unavailable: true,
    };
  }
  const job = result.addon.jobs?.webshopLicenseServerCatalogSync;
  if (!job) {
    return {
      attempted: 0,
      failed: 0,
      succeeded: 0,
      unchanged: 0,
      unavailable: true,
    };
  }
  return { ...(await job({ limit })), unavailable: false };
}
