import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  ADDITIONAL_E2E_SCENARIOS,
  assertPublicNextTraceFiles,
  assertPromotablePrivateRelease,
  buildLocalInvariantEnvironment,
  buildPublicCopyEnvironment,
  buildStagingPreflightSummary,
  buildStagingRunnerEnvironment,
  canonicalReleaseManifestPayload,
  containsBrowserBundleSecret,
  NIGHT_RAVEN_ACCEPTANCE_VERSION,
  OPERATOR_DRILLS,
  PRODUCTION_E2E_SCENARIOS,
  REQUIRED_E2E_SCENARIOS,
  resolveAcceptanceTarget,
  shouldIncludePublicCopyPath,
  validateLocalEvidence,
  validateEvidence,
  validateStagingConfig,
} from "../scripts/night-raven-acceptance-harness.mjs";
import { buildMigrationMatrixPlan } from "../scripts/migration-matrix-harness.mjs";
import {
  buildProductionAcceptanceAudit,
  DOCS_11_CRITERIA,
  DOCS_11_REQUIREMENTS,
  FINAL_PACKAGE_COMPONENT_GATES,
} from "../scripts/night-raven-production-audit.mjs";

function fixtureDigest(label) {
  return createHash("sha256").update(label).digest("hex");
}

const STAGING_RUNNER_PATH = resolve(
  "..",
  "night-raven-operator",
  "scenario-runner",
);
const STAGING_RUNNER_BYTES = Buffer.from("night-raven-staging-runner-fixture");
const STAGING_RUNNER_SHA256 = createHash("sha256")
  .update(STAGING_RUNNER_BYTES)
  .digest("hex");
const STAGING_EVIDENCE_DIRECTORY = resolve(
  "..",
  "night-raven-operator",
  "evidence",
);

function stagingValidationOptions(env) {
  return {
    env: {
      NR_ACCEPTANCE_SCENARIO_RUNNER_PATH: STAGING_RUNNER_PATH,
      NR_STAGING_EVIDENCE_DIRECTORY: STAGING_EVIDENCE_DIRECTORY,
      ...env,
    },
    exists: () => true,
    readBinary: () => STAGING_RUNNER_BYTES,
  };
}

function stagingConfigFixture() {
  return {
    version: NIGHT_RAVEN_ACCEPTANCE_VERSION,
    target: "staging",
    endpoints: {
      master: "https://master.staging.nightraven.example.com",
      vendorCms: "https://vendor-cms.staging.nightraven.example.com",
      customerCms: "https://customer-cms.staging.nightraven.example.com",
      vendorWebshop: "https://vendor-shop.staging.nightraven.example.com",
      customerWebshop: "https://customer-shop.staging.nightraven.example.com",
      customerLicenseServer:
        "https://customer-issuer.staging.nightraven.example.com",
      deploymentWorker: "https://worker.staging.nightraven.example.com",
      acceptanceControl:
        "https://acceptance-control.staging.nightraven.example.com",
    },
    identity: {
      kind: "oidc",
      credentialEnv: "NR_ACCEPTANCE_STAGING_IDENTITY",
    },
    provider: {
      kind: "stripe",
      mode: "sandbox",
      credentialEnv: "NR_ACCEPTANCE_PROVIDER_IDENTITY",
      webhookEndpoint:
        "https://customer-cms.staging.nightraven.example.com/api/webhooks/provider",
    },
    operator: {
      kind: "oauth2-bearer",
      credentialEnv: "NR_ACCEPTANCE_OPERATOR_IDENTITY",
    },
    scenarioRunner: {
      commandEnv: "NR_ACCEPTANCE_SCENARIO_RUNNER_PATH",
      sha256: STAGING_RUNNER_SHA256,
      pollIntervalMs: 250,
      timeoutSeconds: 1_000,
    },
    releaseCandidate: {
      sourceMode: "signed-rc-artifacts",
      artifactSetId: fixtureDigest("artifact-set"),
      previousPackageDigest: fixtureDigest("previous-package"),
      packageDigests: Object.fromEntries(
        [
          "master",
          "cmsHost",
          "webshop",
          "licenseServerAddon",
          "licenseServerService",
          "deploymentWorker",
        ].map((name) => [name, fixtureDigest(`package:${name}`)]),
      ),
    },
    performanceSlo: {
      issueP95Ms: 750,
      validateP95Ms: 250,
      soakSeconds: 900,
    },
    evidenceDirectoryEnv: "NR_STAGING_EVIDENCE_DIRECTORY",
  };
}

test("acceptance harness versions every mandatory staging scenario and operator drill", () => {
  assert.equal(NIGHT_RAVEN_ACCEPTANCE_VERSION, 2);
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
  for (const id of [
    "license_server_install_without_customer_webshop",
    "customer_webshop_local_paid_delivery",
    "customer_webshop_remote_hmac_paid_delivery",
    "timeout_before_issue_commit",
    "process_restart",
    "database_restart",
    "catalog_revision_change",
    "issuer_ref_mismatch",
    "master_outage",
    "issuer_outage",
    "delivery_failure_retry",
    "offline_grace_after_refund",
    "concurrent_duplicate_issue_100",
    "concurrent_activation_limit_100",
    "persistent_rate_limit_load",
    "issue_validate_p95",
    "queue_backpressure_soak",
    "keyset_catalog_cache_load",
  ]) {
    assert.ok(PRODUCTION_E2E_SCENARIOS.includes(id), id);
  }
  assert.deepEqual(OPERATOR_DRILLS, [
    "backup_restore",
    "cross_service_reconciliation",
    "key_rotation",
    "queue_recovery",
    "alert_delivery",
    "vendor_signing_key_rotation_restore",
    "customer_issuer_key_rotation_restore",
    "previous_package_upgrade",
    "application_rollback_compatibility",
    "encrypted_db_key_backup_restore",
    "incident_tabletop",
  ]);
});

test("production audit maps every docs/11 criterion to explicit proof or NO-GO", () => {
  assert.equal(DOCS_11_CRITERIA.length, 68);
  assert.deepEqual(Object.keys(DOCS_11_REQUIREMENTS), DOCS_11_CRITERIA);
  const allScenarios = new Set([
    ...REQUIRED_E2E_SCENARIOS,
    ...ADDITIONAL_E2E_SCENARIOS,
    ...PRODUCTION_E2E_SCENARIOS,
  ]);
  for (const requirement of Object.values(DOCS_11_REQUIREMENTS)) {
    for (const id of requirement.scenarios) assert.ok(allScenarios.has(id), id);
    for (const id of requirement.drills)
      assert.ok(OPERATOR_DRILLS.includes(id), id);
  }

  const componentGates = FINAL_PACKAGE_COMPONENT_GATES.map((id) => ({
    id,
    status: "passed",
  }));
  const local = buildProductionAcceptanceAudit({
    target: "local",
    componentGates,
  });
  assert.equal(local.decision, "NO_GO");
  assert.equal(
    local.criteria.find((entry) => entry.id === "ARCH-01").status,
    "PASS",
  );
  assert.equal(
    local.criteria.find((entry) => entry.id === "PKG-06").status,
    "NO_GO",
  );

  const staging = buildProductionAcceptanceAudit({
    target: "staging",
    componentGates,
    stagingScenarios: [...allScenarios].map((id) => ({ id, status: "passed" })),
    operatorDrills: OPERATOR_DRILLS.map((id) => ({ id, status: "passed" })),
  });
  assert.equal(staging.decision, "GO");
  assert.equal(staging.summary.passed, DOCS_11_CRITERIA.length);
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

  const env = {
    NR_ACCEPTANCE_STAGING_IDENTITY: "opaque-identity",
    NR_ACCEPTANCE_PROVIDER_IDENTITY: "opaque-provider",
    NR_ACCEPTANCE_OPERATOR_IDENTITY: "opaque-operator",
  };
  const validated = validateStagingConfig(
    stagingConfigFixture(),
    stagingValidationOptions(env),
  );
  const summary = buildStagingPreflightSummary(validated);
  assert.equal(summary.status, "CONFIG_READY");
  assert.equal(summary.mutationPerformed, false);
  assert.equal(summary.gateEligible, false);
  assert.equal(summary.endpointCount, 8);
  assert.equal(summary.scenarioCount, 50);
  assert.equal(summary.drillCount, 11);
  assert.equal(summary.runnerReference, "NR_ACCEPTANCE_SCENARIO_RUNNER_PATH");
  assert.equal(summary.runnerSha256, STAGING_RUNNER_SHA256);
  assert.equal(validated.endpoints.master.endsWith("/"), true);
  assert.equal(validated.endpoints.acceptanceControl.endsWith("/"), true);
  assert.doesNotMatch(JSON.stringify(summary), /night-raven-operator/i);
  assert.equal(validated.evidenceDirectory, STAGING_EVIDENCE_DIRECTORY);

  assert.throws(
    () =>
      validateStagingConfig(
        {
          ...stagingConfigFixture(),
          endpoints: {
            ...stagingConfigFixture().endpoints,
            master: "https://master.staging.example.invalid",
          },
        },
        stagingValidationOptions(env),
      ),
    /placeholder hostname/i,
  );
  assert.throws(
    () =>
      validateStagingConfig(
        {
          ...stagingConfigFixture(),
          releaseCandidate: {
            ...stagingConfigFixture().releaseCandidate,
            artifactSetId: "a".repeat(64),
          },
        },
        stagingValidationOptions(env),
      ),
    /placeholder digest/i,
  );
  assert.throws(
    () =>
      validateStagingConfig(
        {
          ...stagingConfigFixture(),
          identity: {
            kind: "oidc",
            credentialEnv: "NR_ADDON_RELEASE_SIGNING_KEY_FILE",
          },
        },
        stagingValidationOptions({
          ...env,
          NR_ADDON_RELEASE_SIGNING_KEY_FILE: "D:/kms/private.pem",
        }),
      ),
    /must be NR_ACCEPTANCE_STAGING_IDENTITY/i,
  );

  assert.throws(
    () =>
      validateStagingConfig(
        {
          ...stagingConfigFixture(),
          scenarioRunner: {
            ...stagingConfigFixture().scenarioRunner,
            command: STAGING_RUNNER_PATH,
          },
        },
        stagingValidationOptions(env),
      ),
    /exactly one of command or commandEnv/i,
  );
  assert.throws(
    () =>
      validateStagingConfig(
        {
          ...stagingConfigFixture(),
          scenarioRunner: {
            commandEnv: "PATH",
            sha256: STAGING_RUNNER_SHA256,
          },
        },
        stagingValidationOptions({ ...env, PATH: STAGING_RUNNER_PATH }),
      ),
    /must be NR_ACCEPTANCE_SCENARIO_RUNNER_PATH/i,
  );
  assert.throws(
    () =>
      validateStagingConfig(
        {
          ...stagingConfigFixture(),
          scenarioRunner: {
            ...stagingConfigFixture().scenarioRunner,
            sha256: fixtureDigest("tampered-runner"),
          },
        },
        stagingValidationOptions(env),
      ),
    /SHA-256 does not match/i,
  );
  assert.throws(
    () =>
      validateStagingConfig(
        {
          ...stagingConfigFixture(),
          evidenceDirectory: resolve(".tmp", "staging-evidence"),
        },
        stagingValidationOptions(env),
      ),
    /exactly one of evidenceDirectory or evidenceDirectoryEnv/i,
  );
  assert.throws(
    () =>
      validateStagingConfig(
        {
          ...stagingConfigFixture(),
          evidenceDirectoryEnv: "NR_ACCEPTANCE_CONFIG_PATH",
        },
        stagingValidationOptions({
          ...env,
          NR_ACCEPTANCE_CONFIG_PATH: resolve("..", "staging.json"),
        }),
      ),
    /evidenceDirectoryEnv must be NR_STAGING_EVIDENCE_DIRECTORY/i,
  );
  assert.throws(
    () =>
      validateStagingConfig(stagingConfigFixture(), {
        ...stagingValidationOptions(env),
        env: {
          ...stagingValidationOptions(env).env,
          NR_STAGING_EVIDENCE_DIRECTORY: resolve(".tmp", "staging-evidence"),
        },
      }),
    /evidence directory must be outside the workspace checkout/i,
  );
});

test("staging runner inherits only required credentials and non-secret runtime state", () => {
  const ambient = {
    PATH: "D:/operator/bin",
    TEMP: "D:/operator/tmp",
    NR_ACCEPTANCE_CONFIG_PATH: "D:/secure/staging.json",
    NR_ACCEPTANCE_STAGING_IDENTITY: "opaque-identity",
    NR_ACCEPTANCE_PROVIDER_IDENTITY: "opaque-provider",
    NR_ACCEPTANCE_OPERATOR_IDENTITY: "opaque-operator",
    NR_ADDON_RELEASE_SIGNING_KEY_FILE: "D:/kms/release-private.pem",
    NRLS_SECRET_ENCRYPTION_KEY: "must-not-reach-runner",
    DATABASE_URL: "postgresql://secret@production.example/db",
  };
  const config = validateStagingConfig(
    stagingConfigFixture(),
    stagingValidationOptions(ambient),
  );
  const runnerEnv = buildStagingRunnerEnvironment(config, ambient);
  assert.equal(
    runnerEnv.NR_ACCEPTANCE_STAGING_IDENTITY,
    ambient.NR_ACCEPTANCE_STAGING_IDENTITY,
  );
  assert.equal(
    runnerEnv.NR_ACCEPTANCE_PROVIDER_IDENTITY,
    ambient.NR_ACCEPTANCE_PROVIDER_IDENTITY,
  );
  assert.equal(
    runnerEnv.NR_ACCEPTANCE_OPERATOR_IDENTITY,
    ambient.NR_ACCEPTANCE_OPERATOR_IDENTITY,
  );
  assert.equal(
    runnerEnv.NR_ACCEPTANCE_CONFIG_PATH,
    ambient.NR_ACCEPTANCE_CONFIG_PATH,
  );
  assert.equal(runnerEnv.PATH, ambient.PATH);
  assert.equal(runnerEnv.NR_ADDON_RELEASE_SIGNING_KEY_FILE, undefined);
  assert.equal(runnerEnv.NRLS_SECRET_ENCRYPTION_KEY, undefined);
  assert.equal(runnerEnv.DATABASE_URL, undefined);
});

test("harness independently rejects staging evidence without the required driver", () => {
  const env = {
    NR_ACCEPTANCE_STAGING_IDENTITY: "opaque-identity",
    NR_ACCEPTANCE_PROVIDER_IDENTITY: "opaque-provider",
    NR_ACCEPTANCE_OPERATOR_IDENTITY: "opaque-operator",
  };
  const config = validateStagingConfig(
    stagingConfigFixture(),
    stagingValidationOptions(env),
  );
  const evidence = {
    version: NIGHT_RAVEN_ACCEPTANCE_VERSION,
    scenario: "webshop_purchase",
    kind: "staging-e2e",
    status: "passed",
    runId: "staging-run-12345678",
    completedAt: "2026-08-20T20:00:00.000Z",
    references: ["runs/staging-run-12345678/summary.json"],
    artifactSetId: config.artifactSetId,
    packageDigests: config.packageDigests,
    runtime: {
      sourceMode: "signed-rc-artifacts",
      workspaceImports: false,
      isolated: true,
      driver: "playwright-chromium",
      controlPlane: "night-raven-acceptance-control-v1",
      components: [
        "master",
        "vendor-cms",
        "customer-cms",
        "vendor-webshop",
        "customer-webshop",
        "license-server-addon",
        "deployment-worker",
        "test-databases",
      ],
    },
    metrics: { assertions: 8, invariantViolations: 0 },
  };
  assert.equal(
    validateEvidence(evidence, "webshop_purchase", "staging-e2e", config),
    evidence,
  );
  assert.throws(
    () =>
      validateEvidence(
        {
          ...evidence,
          runtime: { ...evidence.runtime, driver: "api-mock" },
        },
        "webshop_purchase",
        "staging-e2e",
        config,
      ),
    /topology/i,
  );
  assert.throws(
    () =>
      validateEvidence(
        {
          ...evidence,
          runtime: {
            ...evidence.runtime,
            diagnosticToken: "must-never-be-uploaded",
          },
        },
        "webshop_purchase",
        "staging-e2e",
        config,
      ),
    /unsupported or missing fields/i,
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
  assert.equal(shouldIncludePublicCopyPath(".env.example"), true);
  assert.equal(shouldIncludePublicCopyPath(".env.example.vendor"), false);
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

test("Master acceptance build can migrate only the guarded test database", () => {
  const source = readFileSync(
    resolve("scripts/night-raven-acceptance-harness.mjs"),
    "utf8",
  );
  const centralRuntime = source.match(
    /async function centralRuntime\(\) \{[\s\S]*?\n\}/,
  )?.[0];
  assert.ok(centralRuntime);
  assert.match(
    centralRuntime,
    /resolve\(cwd, "scripts\/run-test-command-with-test-db\.mjs"\)/,
  );
  assert.match(centralRuntime, /"npm",\s*"run",\s*"build"/);
  assert.doesNotMatch(centralRuntime, /\["run", \["build"\]\]/);
});

test("production audit persists every component proof referenced by its hash", () => {
  const source = readFileSync(
    resolve("scripts/night-raven-acceptance-harness.mjs"),
    "utf8",
  );
  assert.match(
    source,
    /writeComponentEvidence\(evidenceDirectory, componentGates\)/,
  );
  assert.match(source, /join\(directory, `\$\{gate\.id\}\.json`\)/);
  assert.match(source, /sha256\(serialized\) !== evidenceSha256/);
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

  const v2Header = {
    alg: "EdDSA",
    kid: "local-acceptance:0123456789abcdef",
    typ: "NRV-ADDON-RELEASE-MANIFEST-V2+JWS",
  };
  const v2Payload = {
    artifactInventory: {
      contractVersion: 1,
      digestPurpose: "addon_runtime_payload",
      entries: [{ path: "dist/server.js", sha256: "a".repeat(64), size: 7 }],
    },
    artifactSha256: "b".repeat(64),
    manifestVersion: 2,
    purpose: "addon_release_manifest",
    releaseId: "25ee1159-f641-536b-b565-35dd49b40f8b",
    releaseSigningKid: v2Header.kid,
    releasedAt: "2026-08-10T01:24:06.000Z",
  };
  const protectedValue = Buffer.from(JSON.stringify(v2Header)).toString(
    "base64url",
  );
  const payloadValue = Buffer.from(JSON.stringify(v2Payload)).toString(
    "base64url",
  );
  const v2Manifest = {
    payload: payloadValue,
    protected: protectedValue,
    signature: sign(
      null,
      Buffer.from(`${protectedValue}.${payloadValue}`, "ascii"),
      privateKey,
    ).toString("base64url"),
  };
  assert.equal(
    assertPromotablePrivateRelease(v2Manifest, ".private/webshop", localKeys, {
      allowEphemeral: true,
    }),
    v2Manifest,
  );
  assert.throws(
    () =>
      assertPromotablePrivateRelease(
        { ...v2Manifest, payload: `${v2Manifest.payload.slice(0, -1)}A` },
        ".private/webshop",
        localKeys,
        { allowEphemeral: true },
      ),
    /canonical|contract|signature/i,
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
  assert.match(source, /FROM webshop\.webshop_orders orders/);
  assert.doesNotMatch(source, /FROM webshop_orders orders/);
  const harnessSource = readFileSync(
    resolve("scripts/night-raven-acceptance-harness.mjs"),
    "utf8",
  );
  assert.match(harnessSource, /verify-webshop-schema-fixture\.mjs/);
  assert.match(harnessSource, /--run-remediation-invariants/);
  const schemaFixtureSource = readFileSync(
    resolve("scripts/verify-webshop-schema-fixture.mjs"),
    "utf8",
  );
  assert.match(schemaFixtureSource, /nr_webshop_p03_test_/);
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
