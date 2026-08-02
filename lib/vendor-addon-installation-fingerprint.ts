import { createHash, createPublicKey } from "node:crypto";

export const INSTALLATION_FINGERPRINT_SCHEME =
  "ed25519_spki_der_sha256_v1" as const;

/**
 * Phase 0 only introduces the immutable fingerprint algorithm and fixtures.
 * Existing persisted activation identities remain untouched until the
 * migration/re-enrollment phase.
 */
export function fingerprintEd25519SpkiDer(publicKeyPem: string) {
  const publicKey = createPublicKey(publicKeyPem);
  if (publicKey.asymmetricKeyType !== "ed25519") {
    throw new Error("Installation public key must be Ed25519.");
  }
  const der = publicKey.export({ format: "der", type: "spki" });
  return `sha256:${createHash("sha256").update(der).digest("hex")}`;
}
