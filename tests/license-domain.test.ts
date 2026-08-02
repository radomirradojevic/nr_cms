import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  CANONICAL_DOMAIN_CONTRACT_VERSION,
  canonicalizeLicenseDomain,
} from "@/lib/license-domain";
import {
  INSTALLATION_FINGERPRINT_SCHEME,
  fingerprintEd25519SpkiDer,
} from "@/lib/vendor-addon-installation-fingerprint";

type CanonicalFixture = {
  contractVersion: number;
  developmentAllowedDomains: string[];
  vectors: Array<{
    input: string;
    environment: "development" | "staging" | "production";
    expected?: string;
    error?: string;
  }>;
};

const canonicalFixture = JSON.parse(
  readFileSync(resolve("tests/fixtures/canonical-domain-v1.json"), "utf8"),
) as CanonicalFixture;
const fingerprintFixture = JSON.parse(
  readFileSync(
    resolve("tests/fixtures/installation-fingerprint-v1.json"),
    "utf8",
  ),
) as {
  contractVersion: number;
  scheme: string;
  publicKeyPem: string;
  expectedFingerprint: string;
};

test("canonical domain fixture is shared and fails closed", () => {
  assert.equal(
    canonicalFixture.contractVersion,
    CANONICAL_DOMAIN_CONTRACT_VERSION,
  );
  for (const vector of canonicalFixture.vectors) {
    const run = () =>
      canonicalizeLicenseDomain(vector.input, {
        developmentAllowedDomains: canonicalFixture.developmentAllowedDomains,
        environment: vector.environment,
      });
    if (vector.expected) assert.equal(run(), vector.expected, vector.input);
    else assert.throws(run, new RegExp(vector.error!, "i"), vector.input);
  }
});

test("Ed25519 SPKI DER fingerprint fixture is PEM formatting invariant", () => {
  assert.equal(fingerprintFixture.scheme, INSTALLATION_FINGERPRINT_SCHEME);
  assert.equal(
    fingerprintEd25519SpkiDer(fingerprintFixture.publicKeyPem),
    fingerprintFixture.expectedFingerprint,
  );
  assert.equal(
    fingerprintEd25519SpkiDer(
      fingerprintFixture.publicKeyPem.replace(/\n/g, "\r\n"),
    ),
    fingerprintFixture.expectedFingerprint,
  );
});
