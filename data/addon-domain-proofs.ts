import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { webshopPurchaseIntentDomainProofs } from "@/db/schema";

export type AddonDomainProofPurpose =
  | "nr_license_domain_control"
  | "nr_addon_lifecycle_transfer_target";

export async function persistAddonDomainProof(input: {
  canonicalDomain: string;
  challengeId: string;
  expiresAt: Date;
  installationFingerprintScheme: string;
  installationId: string;
  installationKeyFingerprint: string;
  proofPayload: string;
  proofSignature: string;
  purpose: AddonDomainProofPurpose;
}) {
  if (input.installationFingerprintScheme !== "ed25519_spki_der_sha256_v1") {
    throw new Error("Domain proof requires the Ed25519 SPKI fingerprint scheme.");
  }
  await db
    .insert(webshopPurchaseIntentDomainProofs)
    .values(input)
    .onConflictDoUpdate({
      set: {
        canonicalDomain: input.canonicalDomain,
        completedAt: null,
        expiresAt: input.expiresAt,
        installationFingerprintScheme: input.installationFingerprintScheme,
        installationId: input.installationId,
        installationKeyFingerprint: input.installationKeyFingerprint,
        proofPayload: input.proofPayload,
        proofSignature: input.proofSignature,
        purpose: input.purpose,
      },
      target: webshopPurchaseIntentDomainProofs.challengeId,
    });
}

export async function completeAddonDomainProof(challengeId: string) {
  await db
    .update(webshopPurchaseIntentDomainProofs)
    .set({ completedAt: new Date() })
    .where(eq(webshopPurchaseIntentDomainProofs.challengeId, challengeId));
}

export async function readAddonDomainProof(challengeId: string) {
  const proof = (
    await db
      .select()
      .from(webshopPurchaseIntentDomainProofs)
      .where(eq(webshopPurchaseIntentDomainProofs.challengeId, challengeId))
      .limit(1)
  )[0];
  if (!proof || proof.expiresAt <= new Date()) return null;
  return proof;
}
