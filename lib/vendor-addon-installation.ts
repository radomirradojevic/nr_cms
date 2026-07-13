import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createPrivateKey,
  generateKeyPairSync,
  randomBytes,
  randomUUID,
  sign,
} from "node:crypto";
type DeploymentMode = "vercel" | "self_hosted" | "other";

export async function getOrCreateVendorAddonInstallationIdentity(input: {
  canonicalDomain: string;
  deploymentMode: DeploymentMode;
}) {
  const [{ eq }, { db }, { vendorAddonInstallationIdentities }] = await Promise.all([
    import("drizzle-orm"),
    import("@/db"),
    import("@/db/schema"),
  ]);
  const existing = (await db.select().from(vendorAddonInstallationIdentities).where(eq(vendorAddonInstallationIdentities.id, 1)).limit(1))[0];
  if (existing) return existing;
  const pair = generateKeyPairSync("ed25519");
  const privateKey = pair.privateKey.export({ format: "pem", type: "pkcs8" }).toString();
  const publicKey = pair.publicKey.export({ format: "pem", type: "spki" }).toString();
  const created = {
    canonicalDomain: canonicalDomain(input.canonicalDomain),
    deploymentMode: input.deploymentMode,
    id: 1,
    installationId: randomUUID(),
    installationKeyFingerprint: fingerprint(publicKey),
    installationKeyId: `nri-${randomUUID()}`,
    installationPrivateKeyEncrypted: encrypt(privateKey),
    installationPublicKey: publicKey,
  };
  await db.insert(vendorAddonInstallationIdentities).values(created).onConflictDoNothing();
  return (await db.select().from(vendorAddonInstallationIdentities).where(eq(vendorAddonInstallationIdentities.id, 1)).limit(1))[0]!;
}

export function signVendorAddonActivationPayload(identity: {
  installationPrivateKeyEncrypted: string;
}, payload: string) {
  return sign(null, Buffer.from(payload, "utf8"), createPrivateKey(decrypt(identity.installationPrivateKeyEncrypted))).toString("base64url");
}

export function fingerprint(publicKey: string) {
  return `sha256:${createHash("sha256").update(publicKey).digest("hex")}`;
}

function encryptionKey() {
  const raw = process.env.NR_ADDON_INSTALLATION_ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error("NR_ADDON_INSTALLATION_ENCRYPTION_KEY is required for server-only installation identity storage.");
  const key = Buffer.from(raw, "base64url");
  if (key.length !== 32) throw new Error("NR_ADDON_INSTALLATION_ENCRYPTION_KEY must be a 32-byte base64url value.");
  return key;
}
function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return JSON.stringify({ ciphertext: ciphertext.toString("base64url"), iv: iv.toString("base64url"), tag: cipher.getAuthTag().toString("base64url"), v: 1 });
}
function decrypt(value: string) {
  const parsed = JSON.parse(value) as { ciphertext: string; iv: string; tag: string; v: number };
  if (parsed.v !== 1) throw new Error("Unsupported installation key ciphertext.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(parsed.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(parsed.tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(parsed.ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
function canonicalDomain(value: string) { try { return new URL(value.includes("://") ? value : `https://${value}`).hostname.toLowerCase(); } catch { throw new Error("A canonical installation domain is required."); } }
