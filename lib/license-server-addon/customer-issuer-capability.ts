import type { CustomerLicenseIssuerCapabilityV1 } from "@nr-cms/addon-sdk/customer-license-issuer";
import type {
  CustomerLicenseIssuerCapabilityV2Resolution,
  LicenseServerAddonState,
} from "@/lib/license-server-addon/contract";

import { loadLicenseServerAddon } from "./loader";
import { resolveLicenseServerAddonState } from "./license";

/** Resolves a capability from the public add-on contract, never an add-on private module. */
export async function resolveCustomerLicenseIssuerCapability(): Promise<CustomerLicenseIssuerCapabilityV1 | null> {
  const loaded = await loadLicenseServerAddon();
  return loaded.status === "loaded"
    ? (loaded.addon.customerLicenseIssuer ?? null)
    : null;
}

/** V2 callers receive an explicit unavailable reason and never silently use V1. */
export async function resolveCustomerLicenseIssuerCapabilityV2(): Promise<CustomerLicenseIssuerCapabilityV2Resolution> {
  return resolveCustomerLicenseIssuerCapabilityV2FromState(
    await resolveLicenseServerAddonState(),
  );
}

/** Entitlement-aware bridge used by same-CMS consumers. Raw loader detection
 * remains separately testable and never grants runtime use by itself. */
export function resolveCustomerLicenseIssuerCapabilityV2FromState(
  state: LicenseServerAddonState,
): CustomerLicenseIssuerCapabilityV2Resolution {
  if (state.status === "ready") {
    const capability = state.addon.customerLicenseIssuerV2;
    if (capability) return { capability, status: "available" };
    return {
      availableContractVersions:
        state.addon.customerLicenseIssuer?.contractVersion === "1" ? ["1"] : [],
      reason: "v2_not_exported",
      requestedContractVersion: "2",
      status: "unavailable",
    };
  }
  if (state.status === "license_invalid") {
    return {
      detail: state.reason,
      reason: "addon_invalid",
      requestedContractVersion: "2",
      status: "unavailable",
    };
  }
  if (state.status === "not_installed") {
    return {
      reason: "addon_not_installed",
      requestedContractVersion: "2",
      status: "unavailable",
    };
  }
  if (state.status === "license_expired") {
    return {
      addonState: "edit_existing_only",
      reason: "addon_not_ready",
      requestedContractVersion: "2",
      status: "unavailable",
    };
  }
  return {
    addonState: state.status,
    reason: "addon_not_ready",
    requestedContractVersion: "2",
    status: "unavailable",
  };
}
