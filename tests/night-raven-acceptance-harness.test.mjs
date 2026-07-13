import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { generateKeyPairSync, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  ADDITIONAL_E2E_SCENARIOS,
  assertPublicNextTraceFiles,
  assertPromotablePrivateRelease,
  buildLocalInvariantEnvironment,
  buildPublicCopyEnvironment,
  canonicalReleaseManifestPayload,
  containsBrowserBundleSecret,
  NIGHT_RAVEN_ACCEPTANCE_VERSION,
  OPERATOR_DRILLS,
  REQUIRED_E2E_SCENARIOS,
  resolveAcceptanceTarget,
  shouldIncludePublicCopyPath,
  validateLocalEvidence,
  validateStagingConfig,
} from "../scripts/night-raven-acceptance-harness.mjs";
import { buildMigrationMatrixPlan } from "../scripts/migration-matrix-harness.mjs";

test("acceptance harness versions every mandatory staging scenario and operator drill", () => {
  assert.equal(NIGHT_RAVEN_ACCEPTANCE_VERSION, 1);
  assert.equal(REQUIRED_E2E_SCENARIOS.length, 18);
  for (const id of [
    "refund_delayed_success",
    "response_loss_after_commit",
    "parallel_issue",
    "stale_worker_recovery",
    "chargeback_out_of_order",
    "forged_signature_cache_protection",
    "installation_key_rotation",
    "vendor_signing_key_rotation",
    "outage_grace_fail_closed",
    "clone_identity",
    "package_manifest_mismatch",
    "install_pending_deploy_ready",
    "cross_client_product_scope",
    "customer_local_delivery",
  ]) {
    assert.ok(ADDITIONAL_E2E_SCENARIOS.includes(id), id);
  }
  assert.deepEqual(OPERATOR_DRILLS, [
    "backup_restore",
    "cross_service_reconciliation",
    "key_rotation",
    "queue_recovery",
    "alert_delivery",
    "vendor_signing_key_rotation_restore",
    "customer_issuer_key_rotation_restore",
  ]);
});

test("staging E2E configuration is fail-closed before any runner can be called", () => {
  assert.throws(
    () => validateStagingConfig(null),
    /configuration must be a JSON object/i,
  );
  assert.throws(
    () => validateStagingConfig({ version: 99 }),
    /configuration version/i,
  );
});

test("local acceptance is explicit and production is never a valid target", () => {
  assert.equal(
    resolveAcceptanceTarget({ NR_ACCEPTANCE_TARGET: "local" }),
    "local",
  );
  assert.equal(
    resolveAcceptanceTarget({ NR_ACCEPTANCE_TARGET: "staging" }),
    "staging",
  );
  assert.equal(resolveAcceptanceTarget({}), "staging");
  assert.throws(
    () => resolveAcceptanceTarget({ NR_ACCEPTANCE_TARGET: "production" }),
    /production.*never accepted/i,
  );
});

test("local contract E2E evidence cannot be a component or rollout result", () => {
  const evidence = {
    version: NIGHT_RAVEN_ACCEPTANCE_VERSION,
    scenario: "webshop_purchase",
    kind: "local-contract-e2e",
    status: "passed",
    runId: "local-run-12345678",
    completedAt: "2026-07-13T10:00:00.000Z",
    artifactSha256: "a".repeat(64),
    transport: "loopback-http",
    productionRuntime: false,
    gateEligible: false,
    resources: {
      cmsDatabase: "nr_accept_cms_test",
      centralDatabase: "nr_accept_central_test",
      processIds: [101, 102, 103, 104],
      services: {
        provider: "loopback:provider:31001",
        central: "loopback:central:31002",
        webshop: "loopback:webshop:31003",
        cms: "loopback:cms:31004",
      },
    },
    metrics: {
      httpRequests: 8,
      databaseAssertions: 5,
      invariantsChecked: 5,
      invariantViolations: 0,
    },
    references: ["local/e2e/webshop_purchase.json"],
  };
  assert.equal(
    validateLocalEvidence(evidence, "webshop_purchase", "local-contract-e2e"),
    evidence,
  );
  assert.throws(
    () =>
      validateLocalEvidence(
        { ...evidence, transport: "component" },
        "webshop_purchase",
        "local-contract-e2e",
      ),
    /loopback HTTP/i,
  );
  assert.throws(
    () =>
      validateLocalEvidence(
        { ...evidence, kind: "staging-e2e", gateEligible: true },
        "webshop_purchase",
        "staging-e2e",
      ),
    /not staging or production E2E/i,
  );
  assert.throws(
    () =>
      validateLocalEvidence(
        {
          ...evidence,
          resources: { ...evidence.resources, services: undefined },
        },
        "webshop_purchase",
        "local-contract-e2e",
      ),
    /service process attestations/i,
  );
});

test("public-copy acceptance never copies local environment files", () => {
  assert.equal(shouldIncludePublicCopyPath(""), true);
  assert.equal(shouldIncludePublicCopyPath("package.json"), true);
  assert.equal(
    shouldIncludePublicCopyPath(".private/webshop/package.json"),
    false,
  );
  assert.equal(shouldIncludePublicCopyPath(".env"), false);
  assert.equal(shouldIncludePublicCopyPath(".env.local"), false);
  assert.equal(shouldIncludePublicCopyPath(".env.staging"), false);
});

test("public-copy acceptance rejects server traces that include private or root config files", () => {
  assert.doesNotThrow(() =>
    assertPublicNextTraceFiles([
      "../../node_modules/next/dist/server/next-server.js",
      "../../lib/file-storage.ts",
    ]),
  );
  for (const tracedFile of [
    "../../.private/webshop/dist/index.js",
    "../../.env",
    "../../.env.production",
    "../../next.config.ts",
  ]) {
    assert.throws(
      () => assertPublicNextTraceFiles([tracedFile]),
      /forbidden file/i,
    );
  }
});

test("acceptance CLI executes its main entrypoint on Windows and rejects unknown commands", () => {
  const result = spawnSync(
    process.execPath,
    [resolve("scripts/night-raven-acceptance-harness.mjs"), "not-a-command"],
    { encoding: "utf8" },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown command: not-a-command/i);
});

test("public-copy build replaces any ambient DSN with a dedicated test database", () => {
  const env = buildPublicCopyEnvironment({
    DATABASE_URL: "postgresql://user:secret@production.example/prod",
    NR_ADDON_RELEASE_SIGNING_KEY_FILE: "D:/mounted/private.pem",
    NRLS_SECRET_ENCRYPTION_KEY: "must-not-reach-build",
    SENTRY_DSN: "https://credential@example.invalid/1",
    STRIPE_API_KEY: "must-not-reach-build",
    TEST_DATABASE_URL: "postgresql://user:secret@localhost/nr_cms_build_test",
  });
  assert.equal(env.DATABASE_URL, env.TEST_DATABASE_URL);
  assert.equal(env.DRIZZLE_AUTO_MIGRATE, "false");
  assert.equal(env.NR_ADDON_RELEASE_SIGNING_KEY_FILE, undefined);
  assert.equal(env.NRLS_SECRET_ENCRYPTION_KEY, undefined);
  assert.equal(env.SENTRY_DSN, undefined);
  assert.equal(env.STRIPE_API_KEY, undefined);
  assert.throws(
    () =>
      buildPublicCopyEnvironment({
        TEST_DATABASE_URL: "postgresql://user:secret@production.example/prod",
      }),
    /test.database/i,
  );
});

test("local invariants derive only dedicated loopback test databases", () => {
  const env = buildLocalInvariantEnvironment({
    DATABASE_URL: "postgresql://user:secret@127.0.0.1/nr_cms_dev",
  });
  assert.equal(
    new URL(env.NR_ACCEPTANCE_CMS_TEST_DATABASE_URL).pathname,
    "/nr_cms_migration_test",
  );
  assert.equal(
    new URL(env.NR_ACCEPTANCE_CENTRAL_TEST_DATABASE_URL).pathname,
    "/nrls_migration_test",
  );
  assert.equal(env.NR_ACCEPTANCE_TARGET, "local");
  assert.throws(
    () =>
      buildLocalInvariantEnvironment({
        DATABASE_URL: "postgresql://user:secret@db.example.com/prod",
      }),
    /loopback/i,
  );
});

test("private release acceptance rejects local integrity fixtures as authority signatures", () => {
  assert.throws(
    () =>
      assertPromotablePrivateRelease(
        { signingKid: "local-build-fixture", signature: "digest-only" },
        ".private/webshop",
      ),
    /not authority-signed/i,
  );
});

test("private package acceptance includes a clean Next host install/build gate", () => {
  const source = readFileSync(
    resolve("scripts/night-raven-acceptance-harness.mjs"),
    "utf8",
  );
  assert.match(source, /scripts\/verify-next-host\.mjs/);
});

test("private release acceptance cryptographically verifies the complete manifest", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const unsigned = {
    manifestVersion: 1,
    signingKid: "release-test-authority",
    artifact: {
      files: [{ path: "dist/server.js", sha256: "a".repeat(64), size: 7 }],
      sha256: "b".repeat(64),
      size: 123,
    },
  };
  const manifest = {
    ...unsigned,
    signature: sign(
      null,
      Buffer.from(canonicalReleaseManifestPayload(unsigned), "utf8"),
      privateKey,
    ).toString("base64url"),
  };
  const publicKeys = {
    "release-test-authority": publicKey
      .export({ format: "pem", type: "spki" })
      .toString(),
  };

  assert.equal(
    assertPromotablePrivateRelease(manifest, ".private/webshop", publicKeys),
    manifest,
  );
  assert.throws(
    () =>
      assertPromotablePrivateRelease(
        {
          ...manifest,
          artifact: { ...manifest.artifact, size: 124 },
        },
        ".private/webshop",
        publicKeys,
      ),
    /signature verification failed/i,
  );
  assert.throws(
    () => assertPromotablePrivateRelease(manifest, ".private/webshop", {}),
    /unpinned signing key/i,
  );
  assert.throws(
    () =>
      assertPromotablePrivateRelease(manifest, ".private/webshop", {
        "release-test-authority": privateKey
          .export({ format: "pem", type: "pkcs8" })
          .toString(),
      }),
    /public key set.*private/i,
  );
  const localUnsigned = {
    ...unsigned,
    signingKid: "local-acceptance:0123456789abcdef",
  };
  const localManifest = {
    ...localUnsigned,
    signature: sign(
      null,
      Buffer.from(canonicalReleaseManifestPayload(localUnsigned), "utf8"),
      privateKey,
    ).toString("base64url"),
  };
  const localKeys = {
    "local-acceptance:0123456789abcdef": publicKeys["release-test-authority"],
  };
  assert.throws(
    () =>
      assertPromotablePrivateRelease(
        localManifest,
        ".private/webshop",
        localKeys,
      ),
    /ephemeral.*not promotable/i,
  );
  assert.equal(
    assertPromotablePrivateRelease(
      localManifest,
      ".private/webshop",
      localKeys,
      { allowEphemeral: true },
    ),
    localManifest,
  );
});

test("browser bundle sentinel distinguishes crypto parser markers from private key material", () => {
  assert.equal(
    containsBrowserBundleSecret('value.indexOf("-----BEGIN PRIVATE KEY-----")'),
    false,
  );
  assert.equal(
    containsBrowserBundleSecret(
      "-----BEGIN PRIVATE KEY-----\nZmFrZS1rZXktbWF0ZXJpYWw=\n-----END PRIVATE KEY-----",
    ),
    true,
  );
});

test("staging invariant runner covers both legacy and addon activation limits", () => {
  const source = readFileSync(
    resolve("scripts/run-remediation-invariants.mjs"),
    "utf8",
  );
  assert.match(source, /id:\s*"activation_limit_exceeded"/);
  assert.match(source, /id:\s*"addon_activation_limit_exceeded"/);
  assert.match(source, /--local/);
  assert.match(source, /NR_ACCEPTANCE_CMS_TEST_DATABASE_URL/);
  assert.match(source, /NR_ACCEPTANCE_CENTRAL_TEST_DATABASE_URL/);
});

test("migration matrix is complete and versioned", () => {
  assert.deepEqual(
    buildMigrationMatrixPlan().map((scenario) => scenario.id),
    [
      "fresh",
      "upgrade_latest_production",
      "upgrade_minimum_supported",
      "rerun",
      "interrupted_backfill",
      "conflict_preflight",
      "checksum_mismatch",
      "failed_migration_atomic_recovery",
      "old_code_read_expand",
      "new_code_dual_write",
      "compatible_package_rollback",
      "incompatible_package_rollback",
    ],
  );
});
