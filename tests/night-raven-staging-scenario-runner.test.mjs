import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  ADDITIONAL_E2E_SCENARIOS,
  OPERATOR_DRILLS as HARNESS_DRILLS,
  PRODUCTION_E2E_SCENARIOS,
  REQUIRED_E2E_SCENARIOS,
} from "../scripts/night-raven-acceptance-harness.mjs";
import {
  buildRunnerArtifact,
  parseBuildArguments,
} from "../scripts/build-night-raven-staging-runner.mjs";
import {
  OPERATOR_DRILLS,
  STAGING_E2E_SCENARIOS,
  buildScenarioRequest,
  parseRunnerArguments,
  runScenario,
  validateRunnerConfig,
  validateRunnerEvidence,
} from "../scripts/night-raven-staging-scenario-runner.mjs";

function digest(label) {
  return createHash("sha256").update(label).digest("hex");
}

function rawConfig() {
  return {
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
      sha256: digest("runner"),
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
}

function runnerEnv(config = rawConfig()) {
  return {
    NR_ACCEPTANCE_OPERATOR_IDENTITY: "operator-opaque-bearer-value-12345",
    NR_ACCEPTANCE_STAGING_IDENTITY: "staging-opaque-identity",
    NR_ACCEPTANCE_PROVIDER_IDENTITY: "provider-opaque-identity",
    NR_ACCEPTANCE_ARTIFACT_SET_ID: config.releaseCandidate.artifactSetId,
  };
}

function evidence(request, runId) {
  return {
    version: 2,
    scenario: request.scenario,
    kind: request.kind,
    status: "passed",
    runId,
    completedAt: "2026-08-20T20:00:00.000Z",
    references: [`runs/${runId}/summary.json`],
    artifactSetId: request.artifactSetId,
    packageDigests: request.packageDigests,
    runtime: {
      sourceMode: "signed-rc-artifacts",
      workspaceImports: false,
      isolated: true,
      driver:
        request.kind === "staging-e2e"
          ? "playwright-chromium"
          : "operator-control-v1",
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
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("portable runner scenario inventory is exactly the harness inventory", () => {
  assert.deepEqual(
    [...STAGING_E2E_SCENARIOS].sort(),
    [
      ...REQUIRED_E2E_SCENARIOS,
      ...ADDITIONAL_E2E_SCENARIOS,
      ...PRODUCTION_E2E_SCENARIOS,
    ].sort(),
  );
  assert.deepEqual([...OPERATOR_DRILLS].sort(), [...HARNESS_DRILLS].sort());
});

test("runner CLI accepts only a known scenario/kind and absolute evidence path", () => {
  const parsed = parseRunnerArguments([
    "--scenario",
    "webshop_purchase",
    "--kind",
    "staging-e2e",
    "--evidence",
    resolve("..", "evidence.json"),
  ]);
  assert.equal(parsed.scenario, "webshop_purchase");
  assert.throws(
    () =>
      parseRunnerArguments([
        "--scenario",
        "not_real",
        "--kind",
        "staging-e2e",
        "--evidence",
        resolve("..", "evidence.json"),
      ]),
    /Unknown scenario/i,
  );
});

test("runner config binds separate credentials, HTTPS control origin and artifact set", () => {
  const raw = rawConfig();
  const validated = validateRunnerConfig(raw, runnerEnv(raw));
  assert.equal(validated.control.origin, raw.endpoints.acceptanceControl);
  assert.equal(
    validated.endpoints.acceptanceControl,
    `${raw.endpoints.acceptanceControl}/`,
  );
  assert.equal(validated.endpoints.master, `${raw.endpoints.master}/`);
  assert.equal(
    validated.operatorCredential,
    runnerEnv(raw).NR_ACCEPTANCE_OPERATOR_IDENTITY,
  );
  assert.throws(
    () =>
      validateRunnerConfig(
        {
          ...raw,
          endpoints: {
            ...raw.endpoints,
            acceptanceControl: "https://other.example.com/operator",
          },
        },
        runnerEnv(raw),
      ),
    /without a path/i,
  );
  assert.throws(
    () =>
      validateRunnerConfig(raw, {
        ...runnerEnv(raw),
        NR_ACCEPTANCE_ARTIFACT_SET_ID: digest("drift"),
      }),
    /artifact-set environment binding/i,
  );
});

test("runner starts, polls and accepts only evidence pinned to the accepted run", async () => {
  const raw = rawConfig();
  const config = validateRunnerConfig(raw, runnerEnv(raw));
  const requestId = "e2e-request-12345678";
  const runId = "staging-run-12345678";
  const request = buildScenarioRequest(
    config,
    "webshop_purchase",
    "staging-e2e",
    requestId,
  );
  const calls = [];
  const responses = [
    jsonResponse(
      {
        contractVersion: 1,
        purpose: "night_raven_staging_acceptance",
        scenario: request.scenario,
        kind: request.kind,
        artifactSetId: request.artifactSetId,
        runId,
        status: "accepted",
        statusUrl: `/v1/scenario-runs/${runId}`,
      },
      202,
    ),
    jsonResponse({
      contractVersion: 1,
      purpose: "night_raven_staging_acceptance",
      runId,
      scenario: request.scenario,
      kind: request.kind,
      status: "running",
    }),
    jsonResponse({
      contractVersion: 1,
      purpose: "night_raven_staging_acceptance",
      runId,
      scenario: request.scenario,
      kind: request.kind,
      status: "passed",
      evidence: evidence(request, runId),
    }),
  ];
  const result = await runScenario(
    { scenario: request.scenario, kind: request.kind, config },
    {
      requestId,
      now: () => 1_000,
      sleep: async () => {},
      fetchImpl: async (url, options) => {
        calls.push({ url: String(url), options });
        return responses.shift();
      },
    },
  );
  assert.equal(result.runId, runId);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].options.redirect, "error");
  assert.equal(
    calls[0].options.headers.Authorization.startsWith("Bearer "),
    true,
  );
  assert.doesNotMatch(JSON.stringify(request), /opaque-bearer|opaque-identity/);
});

test("runner rejects cross-origin polling and forged runtime driver evidence", async () => {
  const raw = rawConfig();
  const config = validateRunnerConfig(raw, runnerEnv(raw));
  const request = buildScenarioRequest(
    config,
    "webshop_purchase",
    "staging-e2e",
    "request-12345678",
  );
  assert.throws(
    () =>
      validateRunnerEvidence(
        {
          ...evidence(request, "staging-run-12345678"),
          runtime: {
            ...evidence(request, "staging-run-12345678").runtime,
            driver: "api-mock",
          },
        },
        request,
        "staging-run-12345678",
      ),
    /driver attestation/i,
  );
  assert.throws(
    () =>
      validateRunnerEvidence(
        {
          ...evidence(request, "staging-run-12345678"),
          runtime: {
            ...evidence(request, "staging-run-12345678").runtime,
            diagnosticToken: "must-never-be-written",
          },
        },
        request,
        "staging-run-12345678",
      ),
    /unsupported or missing field/i,
  );
  await assert.rejects(
    runScenario(
      { scenario: request.scenario, kind: request.kind, config },
      {
        requestId: "request-12345678",
        fetchImpl: async () =>
          jsonResponse(
            {
              contractVersion: 1,
              purpose: "night_raven_staging_acceptance",
              scenario: request.scenario,
              kind: request.kind,
              artifactSetId: request.artifactSetId,
              runId: "staging-run-12345678",
              status: "accepted",
              statusUrl:
                "https://attacker.example/v1/scenario-runs/staging-run-12345678",
            },
            202,
          ),
      },
    ),
    /unsafe status URL/i,
  );
});

test("runner build creates one immutable external executable-sized artifact", async () => {
  assert.throws(
    () => parseBuildArguments(["--output", "relative-runner"]),
    /absolute/i,
  );
  const directory = await mkdtemp(join(tmpdir(), "nr-staging-runner-test-"));
  const output = join(directory, "night-raven-staging-scenario-runner");
  try {
    const result = await buildRunnerArtifact({ output });
    const bytes = await readFile(output);
    assert.equal(result.bytes, bytes.length);
    assert.ok(result.bytes < 47 * 1024);
    assert.equal(
      result.sha256,
      createHash("sha256").update(bytes).digest("hex"),
    );
    await assert.rejects(buildRunnerArtifact({ output }), /EEXIST|exist/i);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
