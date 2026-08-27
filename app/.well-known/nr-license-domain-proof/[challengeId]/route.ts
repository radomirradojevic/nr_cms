import { readAddonDomainProof } from "@/data/addon-domain-proofs";
import { canonicalJson } from "@/lib/vendor-addon-entitlements/activation-v2-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export async function GET(
  _request: Request,
  context: { params: Promise<{ challengeId: string }> },
) {
  const { challengeId } = await context.params;
  if (!UUID.test(challengeId)) return notFound();

  const proof = await readAddonDomainProof(challengeId);
  if (!proof) return notFound();

  return new Response(
    canonicalJson({
      canonicalDomain: proof.canonicalDomain,
      challengeId: proof.challengeId,
      contractVersion: 1,
      installationFingerprintScheme: proof.installationFingerprintScheme,
      installationId: proof.installationId,
      installationKeyFingerprint: proof.installationKeyFingerprint,
      proofPayload: proof.proofPayload,
      proofSignature: proof.proofSignature,
      purpose: proof.purpose,
    }),
    {
      headers: {
        "cache-control": "no-store, max-age=0",
        "content-type": "application/json; charset=utf-8",
        "x-content-type-options": "nosniff",
      },
      status: 200,
    },
  );
}

function notFound() {
  return new Response("Not found", {
    headers: {
      "cache-control": "no-store, max-age=0",
      "content-type": "text/plain; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
    status: 404,
  });
}
