import { NextResponse } from "next/server";

import { readWebshopPurchaseIntentDomainProof } from "@/lib/webshop-addon/purchase-intent";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** The master constructs this path from its locked challenge; it accepts no query input. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ challengeId: string }> },
) {
  const { challengeId } = await context.params;
  if (!UUID.test(challengeId)) return new NextResponse(null, { status: 404 });
  const proof = await readWebshopPurchaseIntentDomainProof(challengeId);
  if (!proof) return new NextResponse(null, { status: 404 });
  return NextResponse.json(
    {
      canonicalDomain: proof.canonicalDomain,
      challengeId: proof.challengeId,
      contractVersion: 1,
      installationFingerprintScheme: proof.installationFingerprintScheme,
      installationId: proof.installationId,
      installationKeyFingerprint: proof.installationKeyFingerprint,
      proofPayload: proof.proofPayload,
      proofSignature: proof.proofSignature,
      purpose: "nr_license_domain_control",
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
      },
    },
  );
}
