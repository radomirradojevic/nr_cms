import { createHash, createPublicKey } from "node:crypto";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { cmsAddonEntitlementKeysets } from "@/db/schema";
import { getMasterLicenseServerUrl } from "@/lib/master-license-server";
import { canonicalJson } from "@/lib/vendor-addon-entitlements/activation-v2-contract";
import { isExplicitlyAllowedLoopbackHttpUrl, safeFetch } from "@/lib/security/outbound-url";

const PURPOSE = "addon_entitlement";
const CACHE_TTL_MS = 5 * 60 * 1000;
const STALE_FALLBACK_MS = 24 * 60 * 60 * 1000;
const keysetSchema = z.object({
  contractVersion: z.literal(1), generatedAt: z.string().datetime({ offset: true }),
  issuer: z.literal("https://license-server.nrcms.com"), purpose: z.literal(PURPOSE),
  sequence: z.number().int().positive(), previousKeysetSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  keys: z.array(z.object({
    alg: z.literal("EdDSA"), kid: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/),
    notBefore: z.string().datetime({ offset: true }), notAfter: z.string().datetime({ offset: true }).nullable(),
    publicKeyPem: z.string().min(32).max(8192), status: z.enum(["active", "verification_only", "revoked"]),
  }).strict()).min(1).max(32),
}).strict();
type Keyset = z.infer<typeof keysetSchema>;

export async function getVendorAddonEntitlementPublicKeys({ forceRefresh = false }: { forceRefresh?: boolean } = {}): Promise<Record<string, string>> {
  const cached = await readDurableKeyset();
  const now = Date.now();
  if (!forceRefresh && cached && cached.refreshedAt.getTime() + CACHE_TTL_MS > now) return verificationKeys(cached.keyset);
  const masterUrl = getMasterLicenseServerUrl();
  const localHttp = isExplicitlyAllowedLoopbackHttpUrl(masterUrl);
  try {
    const response = await safeFetch(`${masterUrl}/.well-known/nr-license-keys.json`, {
      allowFirstParty: true, allowLocalHttp: localHttp, allowSelfHosted: true, method: "GET",
      purpose: "Vendor entitlement public-key discovery", timeoutMs: 5_000,
    });
    if (!response.ok) throw new Error("Master license server rejected public-key discovery.");
    const raw = await response.text();
    const keyset = parseVendorAddonEntitlementPublicKeyset(raw);
    await acceptDurableKeyset(keyset, raw);
    return verificationKeys(keyset);
  } catch (error) {
    if (cached && cached.refreshedAt.getTime() + STALE_FALLBACK_MS > now) return verificationKeys(cached.keyset);
    throw error;
  }
}

export function parseVendorAddonEntitlementPublicKeys(value: unknown): Record<string, string> {
  const raw = typeof value === "string" ? value : canonicalJson(value);
  return verificationKeys(parseVendorAddonEntitlementPublicKeyset(raw));
}

function parseVendorAddonEntitlementPublicKeyset(raw: string): Keyset {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Vendor entitlement keyset is not JSON."); }
  if (canonicalJson(value) !== raw) throw new Error("Vendor entitlement keyset is not canonical JSON.");
  const keyset = keysetSchema.parse(value);
  if ((keyset.sequence === 1) !== (keyset.previousKeysetSha256 === null)) throw new Error("Vendor entitlement keyset anti-rollback chain is invalid.");
  if (new Set(keyset.keys.map((key) => key.kid)).size !== keyset.keys.length || keyset.keys.filter((key) => key.status === "active").length !== 1) throw new Error("Vendor entitlement keyset has invalid key status or duplicate KID.");
  for (const entry of keyset.keys) {
    const key = createPublicKey(entry.publicKeyPem);
    if (key.asymmetricKeyType !== "ed25519") throw new Error("Vendor entitlement keyset contains a non-Ed25519 key.");
    const before = Date.parse(entry.notBefore); const after = entry.notAfter ? Date.parse(entry.notAfter) : null;
    if (!Number.isFinite(before) || (after !== null && (!Number.isFinite(after) || after <= before))) throw new Error("Vendor entitlement keyset contains an invalid validity range.");
  }
  return keyset;
}

async function readDurableKeyset() {
  const row = (await db.select().from(cmsAddonEntitlementKeysets).where(eq(cmsAddonEntitlementKeysets.purpose, PURPOSE)).limit(1))[0];
  if (!row) return null;
  return { ...row, keyset: parseVendorAddonEntitlementPublicKeyset(row.keysetBytes) };
}

async function acceptDurableKeyset(keyset: Keyset, raw: string) {
  const contentSha256 = createHash("sha256").update(raw, "utf8").digest("hex");
  await db.transaction(async (tx) => {
    const prior = (await tx.select().from(cmsAddonEntitlementKeysets).where(eq(cmsAddonEntitlementKeysets.purpose, PURPOSE)).limit(1))[0];
    if (prior) {
      if (keyset.sequence < prior.sequence || (keyset.sequence === prior.sequence && contentSha256 !== prior.contentSha256)) throw new Error("Vendor entitlement keyset rollback or same-sequence fork detected.");
      if (keyset.sequence > prior.sequence && keyset.previousKeysetSha256 !== prior.contentSha256) throw new Error("Vendor entitlement keyset chain does not continue the accepted keyset.");
      if (keyset.sequence === prior.sequence) {
        await tx.update(cmsAddonEntitlementKeysets).set({ refreshedAt: new Date() }).where(eq(cmsAddonEntitlementKeysets.purpose, PURPOSE));
        return;
      }
    }
    await tx.insert(cmsAddonEntitlementKeysets).values({ purpose: PURPOSE, sequence: keyset.sequence, contentSha256, previousKeysetSha256: keyset.previousKeysetSha256, keysetBytes: raw }).onConflictDoUpdate({ target: cmsAddonEntitlementKeysets.purpose, set: { sequence: keyset.sequence, contentSha256, previousKeysetSha256: keyset.previousKeysetSha256, keysetBytes: raw, refreshedAt: new Date() } });
  });
}

function verificationKeys(keyset: Keyset): Record<string, string> {
  const now = Date.now();
  return Object.fromEntries(keyset.keys.filter((key) => key.status !== "revoked" && Date.parse(key.notBefore) <= now && (key.notAfter === null || Date.parse(key.notAfter) > now)).map((key) => [key.kid, key.publicKeyPem]));
}

export function clearVendorAddonEntitlementPublicKeyCacheForTests(): void {
  // The durable cache is deliberately shared across process restarts. Tests
  // reset their isolated database rather than clearing process-local state.
}
