#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { link, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const RUNNER_CONTRACT_VERSION = 1;
export const ACCEPTANCE_EVIDENCE_VERSION = 2;

export const STAGING_E2E_SCENARIOS = new Set([
  "webshop_purchase",
  "license_server_addon_purchase",
  "duplicate_webhook",
  "central_outage_after_paid",
  "issue_response_loss",
  "idempotency_replay_conflict",
  "refund",
  "chargeback",
  "license_expiry",
  "renewal",
  "revocation",
  "domain_transfer",
  "activation_limit_parallel",
  "cloned_installation",
  "outage_grace",
  "forged_entitlement",
  "customer_local_issuer",
  "cross_tenant_access",
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
]);

export const OPERATOR_DRILLS = new Set([
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

const REQUIRED_PACKAGE_DIGESTS = [
  "master",
  "cmsHost",
  "webshop",
  "licenseServerAddon",
  "licenseServerService",
  "deploymentWorker",
];

const REQUIRED_COMPONENTS = [
  "master",
  "vendor-cms",
  "customer-cms",
  "vendor-webshop",
  "customer-webshop",
  "license-server-addon",
  "deployment-worker",
  "test-databases",
];

const SAFE_REFERENCE = /^[A-Za-z0-9._/-]{1,240}$/;
const SAFE_RUN_ID = /^[A-Za-z0-9._:-]{8,200}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const MAX_RESPONSE_BYTES = 1024 * 1024;

function fail(message) {
  throw new Error(message);
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(`${label} must be an object.`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted))
    fail(`${label} has an unsupported or missing field.`);
  return value;
}

function requiredText(value, label) {
  if (typeof value !== "string" || !value.trim())
    fail(`${label} must be non-empty text.`);
  return value.trim();
}

function assertSha256(value, label) {
  if (!SHA256.test(value ?? "")) fail(`${label} must be a SHA-256 digest.`);
  return value;
}

function assertHttpsUrl(value, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail(`${label} must be an HTTPS URL.`);
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.hash ||
    parsed.hostname === "localhost" ||
    parsed.hostname.endsWith(".localhost")
  )
    fail(`${label} must be a credential-free staging HTTPS URL.`);
  return parsed;
}

export function parseRunnerArguments(args) {
  const allowed = new Map([
    ["--scenario", "scenario"],
    ["--kind", "kind"],
    ["--evidence", "evidence"],
  ]);
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const property = allowed.get(name);
    const value = args[index + 1];
    if (!property || !value || value.startsWith("--"))
      fail("Runner requires exactly --scenario, --kind and --evidence.");
    if (values[property]) fail(`${name} may be specified only once.`);
    values[property] = value;
  }
  if (Object.keys(values).length !== 3)
    fail("Runner requires exactly --scenario, --kind and --evidence.");
  const expected =
    values.kind === "staging-e2e"
      ? STAGING_E2E_SCENARIOS
      : values.kind === "operator-drill"
        ? OPERATOR_DRILLS
        : null;
  if (!expected || !expected.has(values.scenario))
    fail("Unknown scenario/kind pair.");
  if (!isAbsolute(values.evidence)) fail("Evidence path must be absolute.");
  return values;
}

export function validateRunnerConfig(config, env = process.env) {
  exactKeys(
    config,
    [
      "version",
      "target",
      "endpoints",
      "identity",
      "provider",
      "operator",
      "scenarioRunner",
      "releaseCandidate",
      "performanceSlo",
      "evidenceDirectoryEnv",
    ],
    "configuration",
  );
  if (
    config.version !== ACCEPTANCE_EVIDENCE_VERSION ||
    config.target !== "staging"
  )
    fail("Runner accepts only staging configuration version 2.");
  const control = assertHttpsUrl(
    config.endpoints?.acceptanceControl,
    "endpoints.acceptanceControl",
  );
  if (control.pathname !== "/" || control.search)
    fail("endpoints.acceptanceControl must be an HTTPS origin without a path.");
  for (const [name, endpoint] of Object.entries(config.endpoints ?? {}))
    assertHttpsUrl(endpoint, `endpoints.${name}`);
  if (config.operator?.credentialEnv !== "NR_ACCEPTANCE_OPERATOR_IDENTITY")
    fail("operator credential reference is invalid.");
  if (config.operator?.kind !== "oauth2-bearer")
    fail("operator.kind must be oauth2-bearer.");
  if (config.identity?.credentialEnv !== "NR_ACCEPTANCE_STAGING_IDENTITY")
    fail("staging identity credential reference is invalid.");
  if (config.provider?.credentialEnv !== "NR_ACCEPTANCE_PROVIDER_IDENTITY")
    fail("provider credential reference is invalid.");
  const operatorCredential = requiredText(
    env.NR_ACCEPTANCE_OPERATOR_IDENTITY,
    "NR_ACCEPTANCE_OPERATOR_IDENTITY",
  );
  if (
    operatorCredential.length < 20 ||
    operatorCredential.length > 8192 ||
    /\s/.test(operatorCredential)
  )
    fail("Operator identity must be an opaque bearer credential.");
  requiredText(
    env.NR_ACCEPTANCE_STAGING_IDENTITY,
    "NR_ACCEPTANCE_STAGING_IDENTITY",
  );
  requiredText(
    env.NR_ACCEPTANCE_PROVIDER_IDENTITY,
    "NR_ACCEPTANCE_PROVIDER_IDENTITY",
  );
  const artifactSetId = assertSha256(
    config.releaseCandidate?.artifactSetId,
    "releaseCandidate.artifactSetId",
  );
  if (env.NR_ACCEPTANCE_ARTIFACT_SET_ID !== artifactSetId)
    fail(
      "Runner artifact-set environment binding does not match configuration.",
    );
  const packageDigests = exactKeys(
    config.releaseCandidate?.packageDigests,
    REQUIRED_PACKAGE_DIGESTS,
    "releaseCandidate.packageDigests",
  );
  for (const name of REQUIRED_PACKAGE_DIGESTS)
    assertSha256(
      packageDigests[name],
      `releaseCandidate.packageDigests.${name}`,
    );
  const pollIntervalMs = Number(config.scenarioRunner?.pollIntervalMs);
  const timeoutMs = Number(config.scenarioRunner?.timeoutSeconds) * 1000;
  if (
    !Number.isInteger(pollIntervalMs) ||
    pollIntervalMs < 250 ||
    pollIntervalMs > 10_000
  )
    fail("scenarioRunner.pollIntervalMs is invalid.");
  if (
    !Number.isInteger(timeoutMs) ||
    timeoutMs < 60_000 ||
    timeoutMs > 3_600_000
  )
    fail("scenarioRunner.timeoutSeconds is invalid.");
  const soakSeconds = Number(config.performanceSlo?.soakSeconds);
  if (!Number.isFinite(soakSeconds) || timeoutMs < (soakSeconds + 60) * 1000)
    fail("Runner timeout must include the configured soak plus 60 seconds.");
  return {
    control,
    operatorCredential,
    artifactSetId,
    packageDigests,
    pollIntervalMs,
    timeoutMs,
    identityKind: requiredText(config.identity?.kind, "identity.kind"),
    providerKind: requiredText(config.provider?.kind, "provider.kind"),
    operatorKind: requiredText(config.operator?.kind, "operator.kind"),
    endpoints: config.endpoints,
    performanceSlo: config.performanceSlo,
  };
}

export function buildScenarioRequest(config, scenario, kind, requestId) {
  return {
    contractVersion: RUNNER_CONTRACT_VERSION,
    purpose: "night_raven_staging_acceptance",
    requestId,
    scenario,
    kind,
    artifactSetId: config.artifactSetId,
    packageDigests: config.packageDigests,
    endpoints: config.endpoints,
    credentialKinds: {
      identity: config.identityKind,
      provider: config.providerKind,
      operator: config.operatorKind,
    },
    performanceSlo: config.performanceSlo,
  };
}

function assertControlStatusUrl(base, value, runId) {
  const parsed = new URL(requiredText(value, "statusUrl"), base);
  if (
    parsed.origin !== base.origin ||
    parsed.username ||
    parsed.password ||
    parsed.hash ||
    parsed.search ||
    parsed.pathname !== `/v1/scenario-runs/${encodeURIComponent(runId)}`
  )
    fail("Acceptance control returned an unsafe status URL.");
  return parsed;
}

async function readBoundedJson(response) {
  const type = response.headers.get("content-type") ?? "";
  if (!/^application\/json(?:;|$)/i.test(type))
    fail("Acceptance control response is not JSON.");
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES)
    fail("Acceptance control response is too large.");
  if (!response.body) fail("Acceptance control response body is missing.");
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      fail("Acceptance control response is too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    fail("Acceptance control returned invalid JSON.");
  }
}

async function requestJson(fetchImpl, url, options, timeoutMs) {
  const response = await fetchImpl(url, {
    ...options,
    redirect: "error",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await readBoundedJson(response);
  if (!response.ok)
    fail(`Acceptance control rejected the request (${response.status}).`);
  return { response, body };
}

function validateAccepted(body, input, control) {
  exactKeys(
    body,
    [
      "contractVersion",
      "purpose",
      "scenario",
      "kind",
      "artifactSetId",
      "runId",
      "status",
      "statusUrl",
    ],
    "accepted response",
  );
  if (
    body.contractVersion !== RUNNER_CONTRACT_VERSION ||
    body.purpose !== "night_raven_staging_acceptance" ||
    body.scenario !== input.scenario ||
    body.kind !== input.kind ||
    body.artifactSetId !== input.artifactSetId ||
    body.status !== "accepted" ||
    !SAFE_RUN_ID.test(body.runId ?? "")
  )
    fail("Acceptance control returned an invalid accepted response.");
  return {
    runId: body.runId,
    statusUrl: assertControlStatusUrl(control, body.statusUrl, body.runId),
  };
}

export function validateRunnerEvidence(evidence, input, runId) {
  exactKeys(
    evidence,
    [
      "version",
      "scenario",
      "kind",
      "status",
      "runId",
      "completedAt",
      "references",
      "artifactSetId",
      "packageDigests",
      "runtime",
      "metrics",
    ],
    "evidence",
  );
  if (
    evidence.version !== ACCEPTANCE_EVIDENCE_VERSION ||
    evidence.scenario !== input.scenario ||
    evidence.kind !== input.kind ||
    evidence.status !== "passed" ||
    evidence.runId !== runId ||
    evidence.artifactSetId !== input.artifactSetId
  )
    fail("Acceptance evidence is not bound to the requested run.");
  if (!Number.isFinite(Date.parse(evidence.completedAt)))
    fail("Acceptance evidence completedAt is invalid.");
  exactKeys(
    evidence.packageDigests,
    REQUIRED_PACKAGE_DIGESTS,
    "evidence.packageDigests",
  );
  for (const name of REQUIRED_PACKAGE_DIGESTS) {
    if (evidence.packageDigests[name] !== input.packageDigests[name])
      fail("Acceptance evidence package digest drifted from the RC set.");
  }
  exactKeys(
    evidence.runtime,
    [
      "sourceMode",
      "workspaceImports",
      "isolated",
      "driver",
      "controlPlane",
      "components",
    ],
    "evidence.runtime",
  );
  const expectedDriver =
    input.kind === "staging-e2e"
      ? "playwright-chromium"
      : "operator-control-v1";
  if (
    evidence.runtime?.sourceMode !== "signed-rc-artifacts" ||
    evidence.runtime?.workspaceImports !== false ||
    evidence.runtime?.isolated !== true ||
    evidence.runtime?.driver !== expectedDriver ||
    evidence.runtime?.controlPlane !== "night-raven-acceptance-control-v1" ||
    JSON.stringify([...(evidence.runtime?.components ?? [])].sort()) !==
      JSON.stringify([...REQUIRED_COMPONENTS].sort())
  )
    fail("Acceptance evidence runtime topology/driver attestation is invalid.");
  if (
    !evidence.metrics ||
    typeof evidence.metrics !== "object" ||
    Array.isArray(evidence.metrics) ||
    Object.keys(evidence.metrics).length === 0 ||
    Object.values(evidence.metrics).some(
      (value) =>
        typeof value !== "number" || !Number.isFinite(value) || value < 0,
    )
  )
    fail("Acceptance evidence metrics must be finite non-negative numbers.");
  if (
    !Array.isArray(evidence.references) ||
    evidence.references.length === 0 ||
    !evidence.references.every((reference) => SAFE_REFERENCE.test(reference))
  )
    fail("Acceptance evidence references are invalid.");
  return evidence;
}

export async function runScenario(input, dependencies = {}) {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const sleep =
    dependencies.sleep ?? ((ms) => new Promise((done) => setTimeout(done, ms)));
  const now = dependencies.now ?? Date.now;
  const requestId = dependencies.requestId ?? randomUUID();
  const startUrl = new URL("/v1/scenario-runs", input.config.control);
  const request = buildScenarioRequest(
    input.config,
    input.scenario,
    input.kind,
    requestId,
  );
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${input.config.operatorCredential}`,
    "Content-Type": "application/json",
    "Idempotency-Key": requestId,
    "X-NR-Acceptance-Request-Id": requestId,
  };
  const acceptedResult = await requestJson(
    fetchImpl,
    startUrl,
    { method: "POST", headers, body: JSON.stringify(request) },
    Math.min(input.config.timeoutMs, 30_000),
  );
  if (acceptedResult.response.status !== 202)
    fail("Acceptance control must acknowledge a scenario with HTTP 202.");
  const accepted = validateAccepted(
    acceptedResult.body,
    request,
    input.config.control,
  );
  const deadline = now() + input.config.timeoutMs;
  while (now() < deadline) {
    const result = await requestJson(
      fetchImpl,
      accepted.statusUrl,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: headers.Authorization,
          "X-NR-Acceptance-Request-Id": requestId,
        },
      },
      Math.min(Math.max(deadline - now(), 1), 30_000),
    );
    exactKeys(
      result.body,
      [
        "contractVersion",
        "purpose",
        "runId",
        "scenario",
        "kind",
        "status",
        ...(result.body?.status === "passed" ? ["evidence"] : []),
      ],
      "status response",
    );
    if (
      result.body.contractVersion !== RUNNER_CONTRACT_VERSION ||
      result.body.purpose !== "night_raven_staging_acceptance" ||
      result.body.runId !== accepted.runId ||
      result.body.scenario !== input.scenario ||
      result.body.kind !== input.kind
    )
      fail(
        "Acceptance control status response is not bound to the accepted run.",
      );
    if (result.body.status === "passed")
      return validateRunnerEvidence(
        result.body.evidence,
        request,
        accepted.runId,
      );
    if (result.body.status !== "accepted" && result.body.status !== "running")
      fail("Acceptance scenario ended without passed evidence.");
    await sleep(
      Math.min(input.config.pollIntervalMs, Math.max(deadline - now(), 0)),
    );
  }
  fail("Acceptance scenario timed out without evidence.");
}

async function writeEvidenceAtomic(path, evidence) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(evidence)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    await link(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

async function main() {
  const args = parseRunnerArguments(process.argv.slice(2));
  const configPath = requiredText(
    process.env.NR_ACCEPTANCE_CONFIG_PATH,
    "NR_ACCEPTANCE_CONFIG_PATH",
  );
  let raw;
  try {
    raw = JSON.parse(await readFile(resolve(configPath), "utf8"));
  } catch {
    fail("Acceptance configuration is unreadable or invalid.");
  }
  const config = validateRunnerConfig(raw);
  const evidence = await runScenario({
    scenario: args.scenario,
    kind: args.kind,
    config,
  });
  await writeEvidenceAtomic(args.evidence, evidence);
  process.stdout.write(
    `${JSON.stringify({ status: "passed", scenario: args.scenario, kind: args.kind, runId: evidence.runId })}\n`,
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
  main().catch((error) => {
    process.stderr.write(`[staging-scenario-runner] ${error.message}\n`);
    process.exitCode = 1;
  });
}
