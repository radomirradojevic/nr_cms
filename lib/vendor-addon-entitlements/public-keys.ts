import { createPublicKey } from "node:crypto";

import { z } from "zod";

import { getMasterLicenseServerUrl } from "@/lib/master-license-server";
import {
  isExplicitlyAllowedLoopbackHttpUrl,
  safeFetch,
} from "@/lib/security/outbound-url";

const keySetSchema = z.object({
  keys: z
    .array(
      z.object({
        alg: z.literal("EdDSA"),
        kid: z.string().min(3).max(200),
        kty: z.literal("OKP"),
        pem: z.string().min(32).max(4096),
        use: z.literal("sig"),
      }),
    )
    .min(1)
    .max(20),
});

const CACHE_TTL_MS = 5 * 60 * 1000;
const STALE_FALLBACK_MS = 24 * 60 * 60 * 1000;

let cache:
  | {
      expiresAt: number;
      keys: Record<string, string>;
      staleUntil: number;
      url: string;
    }
  | undefined;

export async function getVendorAddonEntitlementPublicKeys({
  forceRefresh = false,
}: {
  forceRefresh?: boolean;
} = {}): Promise<Record<string, string>> {
  const masterUrl = getMasterLicenseServerUrl();
  const now = Date.now();
  if (
    !forceRefresh &&
    cache?.url === masterUrl &&
    cache.expiresAt > now
  ) {
    return cache.keys;
  }

  const localHttp = isExplicitlyAllowedLoopbackHttpUrl(masterUrl);
  try {
    const response = await safeFetch(
      `${masterUrl}/.well-known/nr-license-keys.json`,
      {
        allowFirstParty: true,
        allowLocalHttp: localHttp,
        allowSelfHosted: localHttp,
        method: "GET",
        purpose: "Vendor entitlement public-key discovery",
        timeoutMs: 5000,
      },
    );
    if (!response.ok) {
      throw new Error("Master license server rejected public-key discovery.");
    }
    const keys = parseVendorAddonEntitlementPublicKeys(await response.json());
    cache = {
      expiresAt: now + CACHE_TTL_MS,
      keys,
      staleUntil: now + STALE_FALLBACK_MS,
      url: masterUrl,
    };
    return keys;
  } catch (error) {
    if (cache?.url === masterUrl && cache.staleUntil > now) {
      return cache.keys;
    }
    throw error;
  }
}

export function parseVendorAddonEntitlementPublicKeys(
  value: unknown,
): Record<string, string> {
  const parsed = keySetSchema.parse(value);
  const entries = parsed.keys.map(({ kid, pem }) => {
    const key = createPublicKey(pem);
    if (key.asymmetricKeyType !== "ed25519") {
      throw new Error("Vendor entitlement keys must be Ed25519 public keys.");
    }
    return [kid, pem] as const;
  });
  if (new Set(entries.map(([kid]) => kid)).size !== entries.length) {
    throw new Error("Vendor entitlement key set contains duplicate kids.");
  }
  return Object.fromEntries(entries);
}

export function clearVendorAddonEntitlementPublicKeyCacheForTests(): void {
  cache = undefined;
}
