import "server-only";

import { loadWebshopAddon } from "@/lib/webshop-addon/loader";

export async function runWebshopPostIssueDeliverySafetyNet(limit: number) {
  const result = await loadWebshopAddon();
  if (result.status !== "loaded") return { unavailable: true };
  const job = result.addon.jobs?.webshopPostIssueDelivery;
  if (!job) return { unavailable: true };
  return { ...(await job({ limit, policy: "settle_existing_obligations" })), unavailable: false };
}
