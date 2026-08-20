import "server-only";

import { randomUUID } from "node:crypto";
import { resolveLicenseServerAddonState } from "@/lib/license-server-addon/license";

export async function runLicenseServerOperationScheduler(
  input: {
    limit?: number;
    timeoutMs?: number;
    trigger?: "cron" | "manual" | "recovery" | "test";
  } = {},
) {
  const state = await resolveLicenseServerAddonState();
  if (state.status !== "ready" && state.status !== "license_expired") {
    return {
      reason: capabilityStateReason(state.status),
      unavailable: true as const,
    };
  }
  const job = state.addon.jobs?.customerLicenseIssuerOperations;
  if (typeof job !== "function") {
    return {
      reason: "scheduler_contract_unavailable",
      unavailable: true as const,
    };
  }
  const timeoutMs = Math.max(
    1_000,
    Math.min(input.timeoutMs ?? 50_000, 55_000),
  );
  const result = await job({
    contractVersion: "1",
    correlationId: `cron_${randomUUID().replaceAll("-", "")}`,
    deadlineAt: new Date(Date.now() + timeoutMs).toISOString(),
    limit: Math.max(1, Math.min(input.limit ?? 25, 100)),
    trigger: input.trigger ?? "cron",
  });
  return { ...result, unavailable: false as const };
}

function capabilityStateReason(status: string) {
  return status === "license_expired"
    ? "edit_existing_only"
    : `addon_${status}`;
}
