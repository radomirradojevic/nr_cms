import type { CustomerLicenseIssuerCapabilityV1 } from "@nr-cms/addon-sdk/customer-license-issuer";

import { loadLicenseServerAddon } from "./loader";

/** Resolves a capability from the public add-on contract, never an add-on private module. */
export async function resolveCustomerLicenseIssuerCapability(): Promise<CustomerLicenseIssuerCapabilityV1 | null> {
  const loaded = await loadLicenseServerAddon();
  return loaded.status === "loaded" ? loaded.addon.customerLicenseIssuer ?? null : null;
}
