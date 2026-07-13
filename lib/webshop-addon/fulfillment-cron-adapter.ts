import "server-only";

import { loadWebshopAddon } from "@/lib/webshop-addon/loader";

export async function runWebshopFulfillmentSafetyNet(limit: number) {
  const result = await loadWebshopAddon();
  if (result.status !== "loaded") return { claimed: 0, deadLettered: 0, retried: 0, succeeded: 0, unavailable: true };
  const job = result.addon.jobs?.webshopLicenseFulfillment;
  if (!job) return { claimed: 0, deadLettered: 0, retried: 0, succeeded: 0, unavailable: true };
  return { ...(await job({ limit, policy: "settle_existing_obligations" })), unavailable: false };
}
