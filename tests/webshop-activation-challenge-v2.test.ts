import assert from "node:assert/strict";
import test from "node:test";

import { parseActivationChallengeV2Response } from "@/lib/vendor-addon-entitlements/activation-challenge-v2";

const challengeId = "55555555-5555-4555-8555-555555555555";
const base = {
  challengeId,
  contractVersion: 2 as const,
  expiresAt: "2026-08-10T12:00:00.000Z",
  hostCapabilityDescriptorHash: `sha256:${"a".repeat(64)}`,
  ok: true as const,
  signaturePayload: "canonical-proof-payload",
};

test("activation V2 accepts the exact local domain-verification challenge", () => {
  const parsed = parseActivationChallengeV2Response({
    ...base,
    domainVerification: {
      method: "development_allowlist_exemption",
      path: null,
      required: false,
    },
  });
  assert.equal(parsed.challengeId, challengeId);
  assert.equal(parsed.domainVerification.method, "development_allowlist_exemption");
});

test("activation V2 rejects internal fields and an unbound HTTPS proof path", () => {
  assert.throws(() =>
    parseActivationChallengeV2Response({
      ...base,
      domainVerification: {
        challengeId,
        method: "development_allowlist_exemption",
        ok: true,
        path: null,
        required: false,
      },
    }),
  );
  assert.throws(() =>
    parseActivationChallengeV2Response({
      ...base,
      domainVerification: {
        method: "https_well_known",
        path: "/.well-known/nr-license-domain-proof/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        required: true,
      },
    }),
  );
});
