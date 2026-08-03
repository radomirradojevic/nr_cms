import {
  createCipheriv, createDecipheriv, createHash, createPrivateKey,
  generateKeyPairSync, randomBytes, randomUUID, sign,
} from "node:crypto";

import { canonicalizeLicenseDomain } from "@/lib/license-domain";
import {
  ED25519_SPKI_FINGERPRINT_SCHEME,
  fingerprintEd25519SpkiDer,
} from "@/lib/vendor-addon-entitlements/activation-v2-contract";

type DeploymentMode = "vercel" | "self_hosted" | "other";

export async function getOrCreateVendorAddonInstallationIdentity(input: { canonicalDomain: string; deploymentMode: DeploymentMode }) {
  const [{ eq }, { db }, { vendorAddonInstallationIdentities }] = await Promise.all([
    import("drizzle-orm"), import("@/db"), import("@/db/schema"),
  ]);
  const domain = canonicalizeLicenseDomain(input.canonicalDomain);
  const existing = (await db.select().from(vendorAddonInstallationIdentities).where(eq(vendorAddonInstallationIdentities.id, 1)).limit(1))[0];
  if (existing) {
    if (existing.canonicalDomain !== domain || existing.deploymentMode !== input.deploymentMode) {
      throw new Error("Existing installation identity is bound to another canonical domain or deployment mode; recovery or signed transfer is required.");
    }
    if (existing.installationFingerprintScheme !== ED25519_SPKI_FINGERPRINT_SCHEME) {
      throw new Error("Legacy installation identity requires signed re-enrollment before managed activation.");
    }
    return existing;
  }
  const pair = generateKeyPairSync("ed25519");
  const installationId = randomUUID();
  const publicKey = pair.publicKey.export({ format: "pem", type: "spki" }).toString();
  const fingerprint = fingerprintEd25519SpkiDer(publicKey);
  const created = {
    canonicalDomain: domain, deploymentMode: input.deploymentMode, id: 1,
    installationId, installationKeyFingerprint: fingerprint,
    installationFingerprintScheme: ED25519_SPKI_FINGERPRINT_SCHEME,
    installationKeyId: `nri-${randomUUID()}`, keyVersion: 2,
    installationPrivateKeyEncrypted: encryptV2(pair.privateKey.export({ format: "pem", type: "pkcs8" }).toString(), {
      canonicalDomain: domain, deploymentMode: input.deploymentMode, fingerprint, installationId, keyVersion: 2,
    }),
    installationPublicKey: publicKey, privateKeyEnvelopeKid: currentEnvelopeKid(),
  };
  await db.insert(vendorAddonInstallationIdentities).values(created).onConflictDoNothing();
  const stored = (await db.select().from(vendorAddonInstallationIdentities).where(eq(vendorAddonInstallationIdentities.id, 1)).limit(1))[0]!;
  if (stored.canonicalDomain !== domain || stored.deploymentMode !== input.deploymentMode || stored.installationFingerprintScheme !== ED25519_SPKI_FINGERPRINT_SCHEME) {
    throw new Error("Installation identity concurrent creation did not satisfy the requested V2 binding.");
  }
  return stored;
}

export function signVendorAddonActivationPayload(identity: {
  canonicalDomain: string; deploymentMode: string; installationId: string;
  installationKeyFingerprint: string; installationPrivateKeyEncrypted: string; keyVersion: number;
}, payload: string) {
  return sign(null, Buffer.from(payload, "utf8"), createPrivateKey(decryptInstallationPrivateKey(identity))).toString("base64url");
}

/** A migration helper, not an activation shortcut: it decrypts and re-encrypts actual key bytes with V2 AAD. */
export function rewrapInstallationPrivateKeyV2(identity: {
  canonicalDomain: string; deploymentMode: string; installationId: string; installationKeyFingerprint: string;
  installationPrivateKeyEncrypted: string; keyVersion: number;
}) {
  const privateKey = decryptInstallationPrivateKey(identity);
  return encryptV2(privateKey, { canonicalDomain: identity.canonicalDomain, deploymentMode: identity.deploymentMode, fingerprint: identity.installationKeyFingerprint, installationId: identity.installationId, keyVersion: identity.keyVersion + 1 });
}

export function fingerprint(publicKey: string) { return fingerprintEd25519SpkiDer(publicKey); }

function encryptionKey() {
  const raw = process.env.NR_ADDON_INSTALLATION_ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error("NR_ADDON_INSTALLATION_ENCRYPTION_KEY is required for server-only installation identity storage.");
  const key = Buffer.from(raw, "base64url");
  if (key.length !== 32) throw new Error("NR_ADDON_INSTALLATION_ENCRYPTION_KEY must be a 32-byte base64url value.");
  return key;
}
function currentEnvelopeKid() {
  const configured = process.env.NR_ADDON_INSTALLATION_ENCRYPTION_KID?.trim();
  if (configured) return configured;
  if (process.env.NR_LICENSE_ENVIRONMENT === "development") return "development-local-v2";
  throw new Error("NR_ADDON_INSTALLATION_ENCRYPTION_KID is required outside development.");
}
function envelopeAad(input: { canonicalDomain: string; deploymentMode: string; fingerprint: string; installationId: string; keyVersion: number }) {
  return Buffer.from(`nr-addon-installation-key:v2:${input.installationId}:${input.canonicalDomain}:${input.deploymentMode}:${input.fingerprint}:${input.keyVersion}`, "utf8");
}
function encryptV2(value: string, input: { canonicalDomain: string; deploymentMode: string; fingerprint: string; installationId: string; keyVersion: number }) {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const aad = envelopeAad(input); cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return JSON.stringify({ v: 2, kid: currentEnvelopeKid(), aadSha256: createHash("sha256").update(aad).digest("hex"), ciphertext: ciphertext.toString("base64url"), iv: iv.toString("base64url"), tag: cipher.getAuthTag().toString("base64url") });
}
function decryptInstallationPrivateKey(identity: { canonicalDomain: string; deploymentMode: string; installationId: string; installationKeyFingerprint: string; installationPrivateKeyEncrypted: string; keyVersion: number }) {
  const parsed = JSON.parse(identity.installationPrivateKeyEncrypted) as { v: number; kid?: string; aadSha256?: string; ciphertext: string; iv: string; tag: string };
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(parsed.iv, "base64url"));
  if (parsed.v === 2) {
    if (parsed.kid !== currentEnvelopeKid()) throw new Error("Installation key envelope KID is not in the active keyring.");
    const aad = envelopeAad({ canonicalDomain: identity.canonicalDomain, deploymentMode: identity.deploymentMode, fingerprint: identity.installationKeyFingerprint, installationId: identity.installationId, keyVersion: identity.keyVersion });
    if (parsed.aadSha256 !== createHash("sha256").update(aad).digest("hex")) throw new Error("Installation key envelope AAD binding is invalid.");
    decipher.setAAD(aad);
  } else if (parsed.v !== 1) throw new Error("Unsupported installation key ciphertext.");
  decipher.setAuthTag(Buffer.from(parsed.tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(parsed.ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
