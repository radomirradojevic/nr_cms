import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import test from "node:test";

import {
  assertOutsideWorkspacePath,
  parseStagingProvisionArguments,
  prepareStagingAcceptanceInputs,
} from "../scripts/provision-github-staging-acceptance-inputs.mjs";

function digest(label) {
  return createHash("sha256").update(label).digest("hex");
}

function fixture() {
  const runnerBytes = Buffer.from("#!/usr/bin/env node\n");
  const runnerSha256 = createHash("sha256").update(runnerBytes).digest("hex");
  const config = {
    version: 2,
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
      sha256: runnerSha256,
      pollIntervalMs: 250,
      timeoutSeconds: 1_000,
    },
    releaseCandidate: {
      sourceMode: "signed-rc-artifacts",
      artifactSetId: digest("artifact-set"),
      previousPackageDigest: digest("previous-package"),
      packageDigests: Object.fromEntries(
        [
          "master",
          "cmsHost",
          "webshop",
          "licenseServerAddon",
          "licenseServerService",
          "deploymentWorker",
        ].map((name) => [name, digest(`package:${name}`)]),
      ),
    },
    performanceSlo: {
      issueP95Ms: 750,
      validateP95Ms: 250,
      soakSeconds: 900,
    },
    evidenceDirectoryEnv: "NR_STAGING_EVIDENCE_DIRECTORY",
  };
  return {
    config,
    configBytes: Buffer.from(JSON.stringify(config)),
    runnerBytes,
    runnerSha256,
  };
}

test("staging input provisioner parses only explicit external-file arguments", () => {
  const parsed = parseStagingProvisionArguments([
    "--config-file",
    "../secure/config.json",
    "--runner-file",
    "../secure/runner",
    "--staging-identity-file",
    "../secure/staging.identity",
    "--provider-identity-file",
    "../secure/provider.identity",
    "--operator-identity-file",
    "../secure/operator.identity",
    "--apply",
  ]);
  assert.equal(parsed.apply, true);
  assert.ok(parsed.configFile.endsWith("config.json"));
  assert.throws(
    () => parseStagingProvisionArguments(["--unknown"]),
    /Unknown option/i,
  );
  assert.throws(
    () => parseStagingProvisionArguments(["--config-file"]),
    /requires a file path/i,
  );
});

test("staging input provisioner binds exact config, runner and opaque identities", () => {
  const { configBytes, runnerBytes, runnerSha256 } = fixture();
  const cwd = resolve("operator-fixture", "workspace");
  const runnerPath = resolve("operator-fixture", "runner");
  const prepared = prepareStagingAcceptanceInputs({
    configBytes,
    runnerBytes,
    stagingIdentityBytes: Buffer.from("opaque-staging-identity"),
    providerIdentityBytes: Buffer.from("opaque-provider-identity"),
    operatorIdentityBytes: Buffer.from("opaque-operator-identity"),
    runnerPath,
    cwd,
  });
  assert.equal(prepared.runnerSha256, runnerSha256);
  assert.deepEqual(
    Buffer.from(prepared.secretValues.NR_ACCEPTANCE_CONFIG_B64, "base64"),
    configBytes,
  );
  assert.deepEqual(
    Buffer.from(
      prepared.secretValues.NR_ACCEPTANCE_SCENARIO_RUNNER_B64,
      "base64",
    ),
    runnerBytes,
  );
  assert.equal(prepared.summary.target, "staging");
  assert.equal(
    prepared.secretValues.NR_ACCEPTANCE_OPERATOR_IDENTITY,
    "opaque-operator-identity",
  );
  assert.doesNotMatch(JSON.stringify(prepared.summary), /opaque/i);
});

test("staging input provisioner rejects workspace files and runner digest drift", () => {
  const cwd = resolve("operator-fixture", "workspace");
  assert.throws(
    () => assertOutsideWorkspacePath(resolve(cwd, "runner"), "runner", cwd),
    /outside the workspace/i,
  );
  assert.throws(
    () => assertOutsideWorkspacePath(resolve(cwd, "..runner"), "runner", cwd),
    /outside the workspace/i,
  );
  const { config, runnerBytes } = fixture();
  const tamperedConfig = {
    ...config,
    scenarioRunner: {
      ...config.scenarioRunner,
      sha256: digest("different-runner"),
    },
  };
  assert.throws(
    () =>
      prepareStagingAcceptanceInputs({
        configBytes: Buffer.from(JSON.stringify(tamperedConfig)),
        runnerBytes,
        stagingIdentityBytes: Buffer.from("opaque-staging-identity"),
        providerIdentityBytes: Buffer.from("opaque-provider-identity"),
        operatorIdentityBytes: Buffer.from("opaque-operator-identity"),
        runnerPath: resolve("operator-fixture", "runner"),
        cwd,
      }),
    /SHA-256 does not match/i,
  );
});
