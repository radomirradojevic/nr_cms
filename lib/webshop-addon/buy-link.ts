import { canonicalizeLicenseDomain } from "@/lib/license-domain";

export function canonicalWebshopActivationDomain(value: string) {
  try {
    return canonicalizeLicenseDomain(value);
  } catch {
    return "unknown";
  }
}
