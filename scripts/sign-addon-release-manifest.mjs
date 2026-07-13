import { createPrivateKey, sign } from "node:crypto";
import { readFile } from "node:fs/promises";

const SIGNING_KID = /^[A-Za-z0-9._:-]{3,200}$/;

export function canonicalAddonReleaseManifestPayload(manifest) {
  const unsigned = { ...(manifest ?? {}) };
  delete unsigned.signature;
  return JSON.stringify(sortCanonicalValue(unsigned));
}

export async function signAddonReleaseManifest({
  unsignedManifest,
  privateKeyFile,
  signingKid,
}) {
  if (typeof signingKid !== "string" || !SIGNING_KID.test(signingKid))
    throw new Error("Addon release signing kid is invalid.");
  if (typeof privateKeyFile !== "string" || privateKeyFile.trim() === "")
    throw new Error("Addon release signing key file is required.");

  let keyMaterial;
  let privateKey;
  try {
    keyMaterial = await readFile(privateKeyFile);
    privateKey = createPrivateKey(keyMaterial);
  } catch {
    throw new Error("Addon release signing key file is unreadable.");
  } finally {
    keyMaterial?.fill(0);
  }
  if (privateKey.type !== "private" || privateKey.asymmetricKeyType !== "ed25519")
    throw new Error("Addon release authority must be an Ed25519 private key.");

  const input = { ...(unsignedManifest ?? {}) };
  delete input.signature;
  const payload = { ...input, signingKid };
  const signature = sign(
    null,
    Buffer.from(canonicalAddonReleaseManifestPayload(payload), "utf8"),
    privateKey,
  ).toString("base64url");
  if (!/^[A-Za-z0-9_-]{86}$/.test(signature))
    throw new Error("Addon release signing failed.");
  return { ...payload, signature };
}

function sortCanonicalValue(value) {
  if (Array.isArray(value)) return value.map(sortCanonicalValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortCanonicalValue(entry)]),
  );
}
