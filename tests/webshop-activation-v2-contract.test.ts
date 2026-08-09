import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";

import {
  canonicalJson,
  canonicalHostCapabilitiesV1,
  fingerprintEd25519SpkiDer,
} from "@/lib/vendor-addon-entitlements/activation-v2-contract";
import {
  verifyWebshopAddonEntitlementV2,
} from "@/lib/vendor-addon-entitlements/verified-entitlement";

test("Webshop V2 entitlement is canonical, SPKI-bound, and host/environment fenced", () => {
  const key = generateKeyPairSync("ed25519");
  const publicKey = key.publicKey.export({ format: "pem", type: "spki" }).toString();
  const fingerprint = fingerprintEd25519SpkiDer(publicKey);
  const host = canonicalHostCapabilitiesV1({
    descriptorVersion: 1, cmsVersion: "0.1.0",
    cmsCommitSha: "a".repeat(40), nodeVersion: "24.15.0", nextVersion: "16.3.0",
    runtimeContractVersion: "1", coreSchemaVersion: 1, installedAddonSchemaVersion: 0,
  });
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    contractVersion: 2, tokenUse: "addon_entitlement",
    iss: "https://license-server.nrcms.com", aud: "nr-cms-addon-runtime",
    jti: "11111111-1111-4111-8111-111111111111", iat: now, nbf: now, exp: now + 3600,
    entitlementId: "22222222-2222-4222-8222-222222222222",
    activationId: "33333333-3333-4333-8333-333333333333",
    addonKey: "webshop", environment: "development", deploymentMode: "self_hosted",
    canonicalDomain: "client.nr.test", installationId: "44444444-4444-4444-8444-444444444444",
    installationKeyFingerprint: fingerprint, licenseStatus: "active", activationStatus: "active",
    lifecycleVersion: 1, activationLimit: 1, edition: "standard", features: ["alpha", "beta"],
    existingLicensePolicy: "allow_existing", licenseValidUntil: null, updatesUntil: null,
    nextRevalidationAt: new Date((now + 1800) * 1000).toISOString(), graceEndsAt: null,
    domainVerificationMethod: "development_allowlist_exemption",
    domainVerifiedAt: new Date(now * 1000).toISOString(),
    domainVerificationChallengeId: "55555555-5555-4555-8555-555555555555",
    hostCapabilityDescriptorHash: host.hash,
    release: {
      releaseId: "66666666-6666-5666-8666-666666666666", addonKey: "webshop",
      packageName: "@radomirradojevic/webshop", packageVersion: "0.6.0",
      artifactSha256: "1".repeat(64), dependencyLockSha256: "2".repeat(64),
      npmTarballSha256: "3".repeat(64), npmTarballIntegrity: "sha512-" + Buffer.alloc(64, 1).toString("base64"),
      embeddedManifestSha256: "4".repeat(64), provenanceSha256: "5".repeat(64),
      sbomSha256: "6".repeat(64), publicationAttestationHash: "7".repeat(64),
      registryPackageVersionId: "1090949848", sourceReleasedAt: new Date(now * 1000).toISOString(),
      publishedAt: new Date(now * 1000).toISOString(), releaseSigningKid: "test-kid",
      runtimeContractVersion: "1", cmsVersionRange: "^0.1.0", nodeVersionRange: ">=24.15.0 <25.0.0",
      nextVersionRange: "16.3.0", minimumCoreSchemaVersion: 1, schemaVersion: 1,
      supportedAddonSchemaVersionMin: 1, supportedAddonSchemaVersionMax: 1,
      migrationBundleHash: "8".repeat(64), supportedLicenseEditions: ["standard"], channel: "stable",
    },
  } as const;
  const header = { alg: "EdDSA", kid: "test-kid", typ: "NRV-ADDON-ENTITLEMENT-V2+JWT" };
  const body = `${Buffer.from(canonicalJson(header)).toString("base64url")}.${Buffer.from(canonicalJson(claim)).toString("base64url")}`;
  const token = `${body}.${sign(null, Buffer.from(body, "ascii"), key.privateKey).toString("base64url")}`;
  const context = {
    addonKey: "webshop" as const, canonicalDomain: "client.nr.test",
    environment: "development" as const, expectedHostCapabilityDescriptorHash: host.hash,
    installationId: claim.installationId, installationKeyFingerprint: fingerprint,
    publicKeysByKid: { "test-kid": publicKey },
  };
  const verified = verifyWebshopAddonEntitlementV2(token, context);
  assert.equal(verified.release.releaseId, claim.release.releaseId);
  assert.equal(verified.licenseValidUntil, null);
  assert.throws(
    () => verifyWebshopAddonEntitlementV2(token, { ...context, environment: "production" }),
  );
  assert.throws(
    () => verifyWebshopAddonEntitlementV2(token, { ...context, expectedHostCapabilityDescriptorHash: `sha256:${"f".repeat(64)}` }),
    /host descriptor/,
  );
});
