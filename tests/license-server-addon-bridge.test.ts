import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";

import {
  buildAddonI18nContext,
  type AddonI18nContext,
} from "@/lib/i18n/addon-contract";
import type { LicenseServerAddon } from "@/lib/license-server-addon/contract";
import { getLicenseServerRuntimeConfig } from "@/lib/license-server-addon/config";
import {
  LICENSE_SERVER_ENTITLEMENT_REVALIDATION_INTERVAL_MS,
  mapLicenseServerRevalidationStatusToEntitlementStatus,
  resolveInstalledLicenseServerLicenseModeFromEntitlement,
  resolveLicenseServerAddonStateFromInputs,
  shouldRevalidateLicenseServerEntitlement,
  verifyLicenseServerSignedEntitlement,
} from "@/lib/license-server-addon/license";
import {
  canonicalJson,
  fingerprintEd25519SpkiDer,
} from "@/lib/vendor-addon-entitlements/activation-v2-contract";

const fakeAddon: LicenseServerAddon = {
  version: "0.0.1",
  async renderDashboard() {
    return null;
  },
  async renderDashboardPath() {
    return null;
  },
};

const enabledLicenseServerRuntimeConfig = getLicenseServerRuntimeConfig({
  LICENSE_SERVER_ENABLED: "true",
  LICENSE_SERVER_INSTALL_MODE: "managed_redeploy",
});

function createTestAddonI18nContext() {
  return buildAddonI18nContext({
    languages: {
      frontendLanguage: "sr-Latn",
      backendLanguage: "de",
    },
    regional: {
      timezone: "Europe/Belgrade",
    },
  });
}

test("license server add-on state maps loaded entitlement cases", () => {
  const now = new Date("2026-06-07T00:00:00.000Z");

  assert.equal(
    resolveLicenseServerAddonStateFromInputs({
      entitlement: null,
      loadResult: { status: "loaded", addon: fakeAddon },
      now,
      runtimeConfig: enabledLicenseServerRuntimeConfig,
    }).status,
    "license_required",
  );

  assert.deepEqual(
    resolveLicenseServerAddonStateFromInputs({
      entitlement: {
        metadata: {
          lastRevalidationMessage: "Add-on entitlement was revoked.",
        },
        status: "invalid",
      },
      loadResult: { status: "loaded", addon: fakeAddon },
      now,
      runtimeConfig: enabledLicenseServerRuntimeConfig,
      verifySignedEntitlement: false,
    }),
    {
      reason: "Add-on entitlement was revoked.",
      status: "license_invalid",
    },
  );

  assert.deepEqual(
    resolveLicenseServerAddonStateFromInputs({
      entitlement: {
        expiresAt: new Date("2026-06-06T23:59:59.000Z"),
        status: "ready",
      },
      loadResult: { status: "loaded", addon: fakeAddon },
      now,
      runtimeConfig: enabledLicenseServerRuntimeConfig,
      verifySignedEntitlement: false,
    }),
    {
      addon: fakeAddon,
      expiresAt: "2026-06-06T23:59:59.000Z",
      mode: "edit_existing_only",
      status: "license_expired",
    },
  );
});

test("License Server defaults fail closed identically in development and production", () => {
  const development = getLicenseServerRuntimeConfig({
    NODE_ENV: "development",
  });
  const production = getLicenseServerRuntimeConfig({ NODE_ENV: "production" });
  assert.deepEqual(development, production);
  assert.equal(production.enabled, false);
  assert.equal(production.installMode, "disabled");
});

test("every runtime mode rejects an unsigned License Server entitlement", () => {
  const state = resolveLicenseServerAddonStateFromInputs({
    entitlement: {
      status: "ready",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    },
    loadResult: { status: "loaded", addon: fakeAddon },
    runtimeConfig: getLicenseServerRuntimeConfig({
      NODE_ENV: "development",
      LICENSE_SERVER_ENABLED: "true",
      LICENSE_SERVER_INSTALL_MODE: "managed_redeploy",
    }),
  });
  assert.equal(state.status, "license_invalid");
});

test("License Server runtime verifies the persisted V2 host and environment binding", () => {
  const key = generateKeyPairSync("ed25519");
  const publicKey = key.publicKey
    .export({ format: "pem", type: "spki" })
    .toString();
  const installationKeyFingerprint = fingerprintEd25519SpkiDer(publicKey);
  const hostCapabilityDescriptorHash = `sha256:${"a".repeat(64)}`;
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    activationId: "33333333-3333-4333-8333-333333333333",
    activationLimit: 1,
    activationStatus: "active",
    addonKey: "license-server",
    aud: "nr-cms-addon-runtime",
    canonicalDomain: "client.example.com",
    contractVersion: 2,
    deploymentMode: "self_hosted",
    domainVerificationChallengeId: "55555555-5555-4555-8555-555555555555",
    domainVerificationMethod: "development_allowlist_exemption",
    domainVerifiedAt: new Date(now * 1000).toISOString(),
    edition: "standard",
    entitlementId: "22222222-2222-4222-8222-222222222222",
    environment: "development",
    existingLicensePolicy: "allow_existing",
    exp: now + 3600,
    features: ["customerLicenseIssuer.v2"],
    graceEndsAt: null,
    hostCapabilityDescriptorHash,
    iat: now,
    installationId: "44444444-4444-4444-8444-444444444444",
    installationKeyFingerprint,
    iss: "https://license-server.nrcms.com",
    jti: "11111111-1111-4111-8111-111111111111",
    licenseStatus: "active",
    licenseValidUntil: null,
    lifecycleVersion: 0,
    nbf: now,
    nextRevalidationAt: new Date((now + 1800) * 1000).toISOString(),
    release: {
      addonKey: "license-server",
      artifactSha256: "1".repeat(64),
      channel: "stable",
      cmsVersionRange: "^0.1.0",
      dependencyLockSha256: "2".repeat(64),
      embeddedManifestSha256: "3".repeat(64),
      migrationBundleHash: "4".repeat(64),
      minimumCoreSchemaVersion: 1,
      nextVersionRange: "16.3.0",
      nodeVersionRange: ">=24.15.0 <25.0.0",
      npmTarballIntegrity: "sha512-" + Buffer.alloc(64, 1).toString("base64"),
      npmTarballSha256: "5".repeat(64),
      packageName: "@radomirradojevic/license-server-addon",
      packageVersion: "0.2.0",
      provenanceSha256: "6".repeat(64),
      publicationAttestationHash: "7".repeat(64),
      publishedAt: new Date(now * 1000).toISOString(),
      registryPackageVersionId: "1090949848",
      releaseId: "66666666-6666-5666-8666-666666666666",
      releaseSigningKid: "test-kid",
      runtimeContractVersion: "1",
      sbomSha256: "8".repeat(64),
      schemaVersion: 8,
      sourceReleasedAt: new Date(now * 1000).toISOString(),
      supportedAddonSchemaVersionMax: 8,
      supportedAddonSchemaVersionMin: 1,
      supportedLicenseEditions: ["standard"],
    },
    tokenUse: "addon_entitlement",
    updatesUntil: null,
  } as const;
  const header = {
    alg: "EdDSA",
    kid: "test-kid",
    typ: "NRV-ADDON-ENTITLEMENT-V2+JWT",
  };
  const body = `${Buffer.from(canonicalJson(header)).toString("base64url")}.${Buffer.from(canonicalJson(claim)).toString("base64url")}`;
  const token = `${body}.${sign(null, Buffer.from(body, "ascii"), key.privateKey).toString("base64url")}`;
  const entitlement = {
    installationId: claim.installationId,
    installationKeyFingerprint,
    licenseEnvironment: "development",
    signedEntitlement: token,
    status: "ready",
    verifiedClaims: { hostCapabilityDescriptorHash },
  } as const;

  const verified = verifyLicenseServerSignedEntitlement(
    entitlement,
    "client.example.com",
    new Date(now * 1000),
    { "test-kid": publicKey },
  );
  assert.equal(verified.release.schemaVersion, 8);
  assert.throws(
    () =>
      verifyLicenseServerSignedEntitlement(
        { ...entitlement, licenseEnvironment: "production" },
        "client.example.com",
        new Date(now * 1000),
        { "test-kid": publicKey },
      ),
    /environment/,
  );
});

test("installed license server mode blocks new issue after expiry or revocation", () => {
  const now = new Date("2026-06-07T00:00:00.000Z");

  assert.deepEqual(
    resolveInstalledLicenseServerLicenseModeFromEntitlement(
      {
        expiresAt: new Date("2026-06-08T00:00:00.000Z"),
        status: "ready",
      },
      now,
      enabledLicenseServerRuntimeConfig,
    ),
    { status: "ready", mode: "ready" },
  );

  assert.deepEqual(
    resolveInstalledLicenseServerLicenseModeFromEntitlement(
      {
        expiresAt: new Date("2026-06-06T23:59:59.000Z"),
        status: "ready",
      },
      now,
      enabledLicenseServerRuntimeConfig,
    ),
    { status: "license_expired", mode: "edit_existing_only" },
  );

  assert.equal(
    resolveInstalledLicenseServerLicenseModeFromEntitlement(
      { status: "invalid" },
      now,
      enabledLicenseServerRuntimeConfig,
    ).status,
    "forbidden",
  );

  assert.equal(
    resolveInstalledLicenseServerLicenseModeFromEntitlement(
      {
        expiresAt: new Date("2026-06-08T00:00:00.000Z"),
        status: "ready",
      },
      now,
      getLicenseServerRuntimeConfig({ LICENSE_SERVER_ENABLED: "false" }),
    ).status,
    "forbidden",
  );
});

test("paid license server add-on contract can receive host i18n context", async () => {
  const i18n = createTestAddonI18nContext();
  const received: Array<AddonI18nContext | undefined> = [];
  const addon: LicenseServerAddon = {
    ...fakeAddon,
    async renderDashboard(input) {
      received.push(input.i18n);
      return null;
    },
    async renderDashboardPath(input) {
      received.push(input.i18n);
      return null;
    },
    async handleApiRoute(input) {
      received.push(input.i18n);
      return Response.json({ ok: true });
    },
  };

  await addon.renderDashboard({
    i18n,
    licenseMode: "ready",
    path: [],
    userId: "user_1",
  });
  await addon.renderDashboardPath({
    i18n,
    licenseMode: "edit_existing_only",
    path: ["licenses"],
    searchParams: { status: "active" },
    userId: "user_1",
  });
  const response = await addon.handleApiRoute?.({
    i18n,
    licenseMode: "ready",
    method: "GET",
    path: ["licenses"],
    request: new Request(
      "https://cms.example.test/api/license-server/licenses",
    ),
    userId: "user_1",
  });

  assert.equal(response?.status, 200);
  assert.equal(received[0], i18n);
  assert.equal(received[1], i18n);
  assert.equal(received[2], i18n);
  assert.equal(i18n.backendLanguage, "de");
  assert.equal(i18n.frontendLanguage, "sr-Latn");
});

test("license server entitlement revalidation uses a 24 hour stale window", () => {
  const now = new Date("2026-06-07T12:00:00.000Z");

  assert.equal(shouldRevalidateLicenseServerEntitlement(null, now), false);
  assert.equal(
    shouldRevalidateLicenseServerEntitlement(
      { entitlementToken: "token", status: "install_pending" },
      now,
    ),
    false,
  );
  assert.equal(
    shouldRevalidateLicenseServerEntitlement(
      { entitlementToken: "token", status: "invalid" },
      now,
    ),
    false,
  );
  assert.equal(
    shouldRevalidateLicenseServerEntitlement(
      { entitlementToken: "token", status: "ready" },
      now,
    ),
    true,
  );
  assert.equal(
    shouldRevalidateLicenseServerEntitlement(
      {
        entitlementToken: "token",
        metadata: { lastRevalidatedAt: "2026-06-07T11:00:00.000Z" },
        status: "ready",
      },
      now,
    ),
    false,
  );
  assert.equal(
    shouldRevalidateLicenseServerEntitlement(
      {
        entitlementToken: "token",
        metadata: {
          lastRevalidatedAt: new Date(
            now.getTime() -
              LICENSE_SERVER_ENTITLEMENT_REVALIDATION_INTERVAL_MS -
              1,
          ).toISOString(),
        },
        status: "ready",
      },
      now,
    ),
    true,
  );
  assert.equal(
    shouldRevalidateLicenseServerEntitlement(
      {
        nextRevalidationAt: new Date("2026-06-07T12:30:00.000Z"),
        signedEntitlement: "v2-token",
        status: "ready",
      },
      now,
    ),
    false,
  );
  assert.equal(
    shouldRevalidateLicenseServerEntitlement(
      {
        nextRevalidationAt: new Date("2026-06-07T11:59:59.000Z"),
        signedEntitlement: "v2-token",
        status: "ready",
      },
      now,
    ),
    true,
  );
});

test("master revalidation statuses map to local entitlement states", () => {
  assert.equal(
    mapLicenseServerRevalidationStatusToEntitlementStatus("active"),
    "ready",
  );
  assert.equal(
    mapLicenseServerRevalidationStatusToEntitlementStatus("expired"),
    "expired",
  );
  assert.equal(
    mapLicenseServerRevalidationStatusToEntitlementStatus("revoked"),
    "invalid",
  );
  assert.equal(
    mapLicenseServerRevalidationStatusToEntitlementStatus("suspended"),
    "invalid",
  );
});
