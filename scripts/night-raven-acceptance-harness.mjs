import { createHash, createPublicKey, verify } from "node:crypto";
import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertSafeTestDatabaseUrl } from "./database-test-safety.mjs";
import { withEphemeralAddonReleaseAuthority } from "./local-addon-release-authority.mjs";

/**
 * Night Raven final acceptance is intentionally an operator-provisioned staging
 * run. This harness never turns a unit/component result into an E2E result.
 * The explicit local target is a multi-process contract simulator only; its
 * evidence is permanently marked productionRuntime=false and gateEligible=false.
 */
export const NIGHT_RAVEN_ACCEPTANCE_VERSION = 1;

export const REQUIRED_E2E_SCENARIOS = [
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
];

export const ADDITIONAL_E2E_SCENARIOS = [
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
];

export const OPERATOR_DRILLS = [
  "backup_restore",
  "cross_service_reconciliation",
  "key_rotation",
  "queue_recovery",
  "alert_delivery",
  "vendor_signing_key_rotation_restore",
  "customer_issuer_key_rotation_restore",
];

const ALL_STAGING_SCENARIOS = [
  ...REQUIRED_E2E_SCENARIOS,
  ...ADDITIONAL_E2E_SCENARIOS,
];
const ACCEPTANCE_TARGETS = new Set(["staging", "local"]);
const ACCEPTANCE_NPM_CACHE = join(tmpdir(), "night-raven-acceptance-npm-cache");
const SENSITIVE_KEY =
  /(secret|token|password|private.?key|authorization|credential|cookie)/i;
const PUBLIC_COPY_EXCLUDED_ROOTS = new Set([
  ".private",
  ".git",
  "node_modules",
  ".next",
  ".tmp",
]);
const PRIVATE_KEY_PEM =
  /-----BEGIN(?: RSA| EC)? PRIVATE KEY-----[\s\S]{16,}?-----END(?: RSA| EC)? PRIVATE KEY-----/;
const ASSIGNED_SECRET =
  /(?:NRLS|WEBSHOP|LICENSE_SERVER)_[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PRIVATE_KEY)\s*[:=]\s*["'`][^"'`\r\n]{8,}["'`]/;

export function shouldIncludePublicCopyPath(relativePath) {
  const root = relativePath.split(/[\\/]/)[0];
  if (!root) return true;
  if (PUBLIC_COPY_EXCLUDED_ROOTS.has(root)) return false;
  return root !== ".env" && !root.startsWith(".env.");
}

export function assertPublicNextTraceFiles(files) {
  if (!Array.isArray(files) || files.some((file) => typeof file !== "string")) {
    fail("public-copy NFT manifest has an invalid files list.");
  }
  for (const file of files) {
    const normalized = file.replace(/\\/g, "/");
    if (
      /(?:^|\/)\.private(?:\/|$)/i.test(normalized) ||
      /(?:^|\/)\.env(?:\.[^/]*)?(?:\/|$)/i.test(normalized) ||
      /(?:^|\/)next\.config\.(?:cjs|js|mjs|ts)$/i.test(normalized)
    ) {
      fail("public-copy NFT manifest traced a forbidden file.");
    }
  }
}

export function buildPublicCopyEnvironment(env = process.env) {
  const testDatabaseUrl = assertSafeTestDatabaseUrl(
    env.TEST_DATABASE_URL,
    "TEST_DATABASE_URL",
  );
  const sanitized = Object.fromEntries(
    Object.entries(env).filter(
      ([name]) => !isSensitivePublicCopyEnvironmentName(name),
    ),
  );
  return {
    ...sanitized,
    DATABASE_URL: testDatabaseUrl,
    TEST_DATABASE_URL: testDatabaseUrl,
    DRIZZLE_AUTO_MIGRATE: "false",
  };
}

function isSensitivePublicCopyEnvironmentName(name) {
  return /(?:^|_)(?:API_KEY|AUTHORIZATION|COOKIE|CREDENTIAL|DATABASE_URL|DSN|ENCRYPTION_KEY|HMAC|PASSWORD|PRIVATE_KEY|SECRET|SIGNING_KEY(?:_FILE)?|TOKEN)(?:_|$)/i.test(
    name,
  );
}

export function buildLocalInvariantEnvironment(env = process.env) {
  const source = env.TEST_DATABASE_URL ?? env.DATABASE_URL;
  let url;
  try {
    url = new URL(source);
  } catch {
    fail("Local invariant source database must be a PostgreSQL URL.");
  }
  if (
    !/^postgres(?:ql)?:$/.test(url.protocol) ||
    !new Set(["localhost", "127.0.0.1", "::1", "[::1]"]).has(
      url.hostname.toLowerCase(),
    )
  )
    fail(
      "Local invariant source database must use a loopback PostgreSQL host.",
    );
  const databaseUrl = (name) => {
    const target = new URL(url);
    target.pathname = `/${name}`;
    target.hash = "";
    return assertSafeTestDatabaseUrl(target.toString(), name);
  };
  return {
    ...env,
    NR_ACCEPTANCE_CMS_TEST_DATABASE_URL: databaseUrl("nr_cms_migration_test"),
    NR_ACCEPTANCE_CENTRAL_TEST_DATABASE_URL: databaseUrl("nrls_migration_test"),
    NR_ACCEPTANCE_TARGET: "local",
  };
}

export function containsBrowserBundleSecret(contents) {
  return PRIVATE_KEY_PEM.test(contents) || ASSIGNED_SECRET.test(contents);
}

export function canonicalReleaseManifestPayload(manifest) {
  const unsigned = { ...(manifest ?? {}) };
  delete unsigned.signature;
  return JSON.stringify(sortCanonicalValue(unsigned));
}

export function assertPromotablePrivateRelease(
  manifest,
  directory,
  publicKeys = {},
  { allowEphemeral = false } = {},
) {
  const signingKid = manifest?.signingKid;
  const signature = manifest?.signature;
  if (
    signingKid === "local-build-fixture" ||
    typeof signingKid !== "string" ||
    signingKid.trim() === "" ||
    typeof signature !== "string" ||
    !/^[A-Za-z0-9_-]{86}$/.test(signature)
  ) {
    fail(
      `${directory} is not authority-signed; local integrity fixtures are not promotable.`,
    );
  }
  if (signingKid.startsWith("local-acceptance:") && !allowEphemeral)
    fail(
      `${directory} uses an ephemeral local authority and is not promotable.`,
    );
  const publicKeyPem = publicKeys[signingKid];
  if (typeof publicKeyPem !== "string")
    fail(`${directory} uses an unpinned signing key.`);
  if (
    publicKeyPem.includes("PRIVATE KEY") ||
    !publicKeyPem.includes("BEGIN PUBLIC KEY")
  )
    fail(`${directory} public key set must never contain a private key.`);
  let publicKey;
  try {
    publicKey = createPublicKey(publicKeyPem);
  } catch {
    fail(`${directory} release authority key is unreadable.`);
  }
  if (publicKey.asymmetricKeyType !== "ed25519")
    fail(`${directory} release authority key must be Ed25519.`);
  if (
    !verify(
      null,
      Buffer.from(canonicalReleaseManifestPayload(manifest), "utf8"),
      publicKey,
      Buffer.from(signature, "base64url"),
    )
  )
    fail(`${directory} release signature verification failed.`);
  return manifest;
}

function sortCanonicalValue(value) {
  if (Array.isArray(value)) return value.map(sortCanonicalValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortCanonicalValue(entry)]),
  );
}

export function resolveAcceptanceTarget(env = process.env) {
  const target = env.NR_ACCEPTANCE_TARGET?.trim().toLowerCase() || "staging";
  if (target === "production" || target === "prod")
    fail("production is never accepted as a Night Raven acceptance target.");
  if (!ACCEPTANCE_TARGETS.has(target))
    fail("NR_ACCEPTANCE_TARGET must be staging or local.");
  return target;
}

export function validateLocalEvidence(evidence, id, kind) {
  const allowedKeys = new Set([
    "version",
    "scenario",
    "kind",
    "status",
    "runId",
    "completedAt",
    "artifactSha256",
    "transport",
    "productionRuntime",
    "gateEligible",
    "resources",
    "metrics",
    "references",
  ]);
  if (
    !evidence ||
    typeof evidence !== "object" ||
    Object.keys(evidence).some((key) => !allowedKeys.has(key))
  )
    fail(`${id} local evidence has unsupported or unsafe fields.`);
  if (
    evidence.version !== NIGHT_RAVEN_ACCEPTANCE_VERSION ||
    evidence.scenario !== id ||
    evidence.kind !== kind ||
    evidence.status !== "passed"
  )
    fail(`${id} did not produce a versioned passed ${kind} evidence record.`);
  if (
    !new Set(["local-contract-e2e", "local-contract-drill"]).has(kind) ||
    evidence.productionRuntime !== false ||
    evidence.gateEligible !== false
  )
    fail(
      `${id} local contract evidence is not staging or production E2E and cannot close a rollout gate.`,
    );
  if (evidence.transport !== "loopback-http")
    fail(
      `${id} local evidence must come from loopback HTTP processes, not a component result.`,
    );
  if (!/^[A-Za-z0-9._:-]{8,240}$/.test(evidence.runId ?? ""))
    fail(`${id} local evidence runId is invalid.`);
  if (
    Number.isNaN(Date.parse(evidence.completedAt ?? "")) ||
    !/^[a-f0-9]{64}$/.test(evidence.artifactSha256 ?? "")
  )
    fail(
      `${id} local evidence requires UTC completion time and artifact hash.`,
    );
  const resources = evidence.resources;
  if (
    !resources ||
    !/(?:^|[._-])test(?:$|[._-])/i.test(resources.cmsDatabase ?? "") ||
    !/(?:^|[._-])test(?:$|[._-])/i.test(resources.centralDatabase ?? "") ||
    !Array.isArray(resources.processIds) ||
    new Set(resources.processIds).size < 4 ||
    !resources.processIds.every((pid) => Number.isInteger(pid) && pid > 0)
  )
    fail(
      `${id} local evidence requires two test databases and four distinct service processes.`,
    );
  const serviceRoles = ["provider", "central", "webshop", "cms"];
  const servicePorts = serviceRoles.map((role) => {
    const match = new RegExp(`^loopback:${role}:(\\d{2,5})$`).exec(
      resources.services?.[role] ?? "",
    );
    return match ? Number(match[1]) : null;
  });
  if (
    Object.keys(resources.services ?? {}).length !== serviceRoles.length ||
    servicePorts.some(
      (port) => !Number.isInteger(port) || port < 1024 || port > 65535,
    ) ||
    new Set(servicePorts).size !== serviceRoles.length
  )
    fail(
      `${id} local evidence requires four loopback service process attestations.`,
    );
  if (
    !evidence.metrics ||
    Object.values(evidence.metrics).some(
      (value) =>
        typeof value !== "number" || !Number.isFinite(value) || value < 0,
    )
  )
    fail(`${id} local evidence metrics must be finite redacted counts.`);
  if (
    evidence.metrics.httpRequests < 4 ||
    evidence.metrics.databaseAssertions < 1 ||
    evidence.metrics.invariantsChecked !== 5 ||
    evidence.metrics.invariantViolations !== 0
  )
    fail(
      `${id} local evidence requires HTTP, database and zero-violation invariant proof.`,
    );
  if (
    !Array.isArray(evidence.references) ||
    evidence.references.length === 0 ||
    !evidence.references.every(
      (reference) =>
        typeof reference === "string" &&
        /^[A-Za-z0-9._/-]{1,240}$/.test(reference),
    )
  )
    fail(`${id} local evidence requires redacted artifact references.`);
  assertNoSecretValues(evidence);
  return evidence;
}

function fail(message) {
  throw new Error(`[night-raven-acceptance] ${message}`);
}
function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
function safeJson(value) {
  return JSON.stringify(value);
}

function requireNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "")
    fail(`${label} is required.`);
  return value;
}

function assertHttpsStagingEndpoint(value, label) {
  const endpoint = new URL(requireNonEmptyString(value, label));
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash
  ) {
    fail(
      `${label} must be a credential-free HTTPS URL without query or fragment.`,
    );
  }
  if (/localhost|127\.0\.0\.1|\.local$/i.test(endpoint.hostname))
    fail(`${label} must not target a local endpoint.`);
  return endpoint.toString().replace(/\/$/, "");
}

function assertEnvReference(value, label) {
  if (!/^[A-Z][A-Z0-9_]*$/.test(requireNonEmptyString(value, label)))
    fail(`${label} must be an environment variable name.`);
  if (!process.env[value])
    fail(`${label} points to an absent environment variable.`);
  return value;
}

function assertNoSecretValues(value, path = "config") {
  if (Array.isArray(value))
    return value.forEach((entry, index) =>
      assertNoSecretValues(entry, `${path}[${index}]`),
    );
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(key) && key !== "credentialEnv")
      fail(
        `${path}.${key} must contain an environment-variable reference, never a secret value.`,
      );
    assertNoSecretValues(entry, `${path}.${key}`);
  }
}

export function validateStagingConfig(config) {
  if (!config || typeof config !== "object")
    fail("configuration must be a JSON object.");
  assertNoSecretValues(config);
  if (config.version !== NIGHT_RAVEN_ACCEPTANCE_VERSION)
    fail(`configuration version must be ${NIGHT_RAVEN_ACCEPTANCE_VERSION}.`);
  if (config.target !== "staging")
    fail(
      "only target=staging is accepted; production is never accepted by this harness.",
    );
  const cmsEndpoint = assertHttpsStagingEndpoint(
    config.endpoints?.cms,
    "endpoints.cms",
  );
  const centralEndpoint = assertHttpsStagingEndpoint(
    config.endpoints?.central,
    "endpoints.central",
  );
  const identityKind = requireNonEmptyString(
    config.identity?.kind,
    "identity.kind",
  );
  const identityCredentialEnv = assertEnvReference(
    config.identity?.credentialEnv,
    "identity.credentialEnv",
  );
  const providerKind = requireNonEmptyString(
    config.provider?.kind,
    "provider.kind",
  );
  if (config.provider?.mode !== "sandbox")
    fail("provider.mode must be sandbox for staging acceptance.");
  const providerCredentialEnv = assertEnvReference(
    config.provider?.credentialEnv,
    "provider.credentialEnv",
  );
  const providerWebhookEndpoint = assertHttpsStagingEndpoint(
    config.provider?.webhookEndpoint,
    "provider.webhookEndpoint",
  );
  const command = requireNonEmptyString(
    config.scenarioRunner?.command,
    "scenarioRunner.command",
  );
  if (!isAbsolute(command) || !existsSync(command))
    fail(
      "scenarioRunner.command must be an existing absolute path outside the public fixture set.",
    );
  return {
    cmsEndpoint,
    centralEndpoint,
    identityKind,
    identityCredentialEnv,
    providerKind,
    providerCredentialEnv,
    providerWebhookEndpoint,
    command,
    evidenceDirectory: resolve(
      config.evidenceDirectory ?? ".tmp/night-raven-acceptance",
    ),
  };
}

async function readStagingConfig() {
  const configPath = process.env.NR_ACCEPTANCE_CONFIG_PATH;
  if (!configPath)
    fail(
      "NR_ACCEPTANCE_CONFIG_PATH is required; no staging configuration was supplied.",
    );
  let config;
  try {
    config = JSON.parse(await readFile(resolve(configPath), "utf8"));
  } catch {
    fail(
      "NR_ACCEPTANCE_CONFIG_PATH must point to readable JSON configuration.",
    );
  }
  return validateStagingConfig(config);
}

function run(
  command,
  args,
  { cwd = process.cwd(), env = process.env, capture = false } = {},
) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd,
      env,
      shell: false,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let stdout = "";
    let stderr = "";
    if (capture) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
    }
    child.once("error", rejectRun);
    child.once("exit", (code) =>
      code === 0
        ? resolveRun({ stdout, stderr })
        : rejectRun(new Error(`${basename(command)} exited ${code ?? 1}`)),
    );
  });
}

function summarizeEvidence({ id, kind, evidence }) {
  // Keep CLI output non-sensitive: scenario id, runner id and evidence file hash only.
  return {
    id,
    kind,
    runId: evidence.runId,
    evidenceSha256: sha256(safeJson(evidence)),
  };
}

function validateEvidence(evidence, id, kind) {
  const allowedKeys = new Set([
    "version",
    "scenario",
    "kind",
    "status",
    "runId",
    "completedAt",
    "references",
  ]);
  if (
    !evidence ||
    typeof evidence !== "object" ||
    Object.keys(evidence).some((key) => !allowedKeys.has(key))
  )
    fail(`${id} evidence has unsupported or unsafe fields.`);
  if (
    evidence.version !== NIGHT_RAVEN_ACCEPTANCE_VERSION ||
    evidence.scenario !== id ||
    evidence.kind !== kind ||
    evidence.status !== "passed"
  ) {
    fail(`${id} did not produce a versioned passed ${kind} evidence record.`);
  }
  if (!/^[A-Za-z0-9._:-]{8,200}$/.test(evidence.runId ?? ""))
    fail(`${id} evidence runId is invalid.`);
  if (
    !Array.isArray(evidence.references) ||
    evidence.references.length === 0 ||
    !evidence.references.every(
      (ref) => typeof ref === "string" && /^[A-Za-z0-9._/-]{1,240}$/.test(ref),
    )
  ) {
    fail(`${id} evidence requires one or more redacted artifact references.`);
  }
  return evidence;
}

async function runStagingEvidence(config, id, kind) {
  const directory = join(config.evidenceDirectory, kind);
  const evidencePath = join(directory, `${id}.json`);
  await mkdir(directory, { recursive: true });
  await rm(evidencePath, { force: true });
  await run(
    config.command,
    ["--scenario", id, "--kind", kind, "--evidence", evidencePath],
    {
      env: {
        ...process.env,
        NR_ACCEPTANCE_TARGET: "staging",
        NR_ACCEPTANCE_VERSION: String(NIGHT_RAVEN_ACCEPTANCE_VERSION),
      },
      capture: true,
    },
  );
  let evidence;
  try {
    evidence = JSON.parse(await readFile(evidencePath, "utf8"));
  } catch {
    fail(`${id} runner completed without readable evidence.`);
  }
  return summarizeEvidence({
    id,
    kind,
    evidence: validateEvidence(evidence, id, kind),
  });
}

async function runLocalEvidenceMatrix({ scenarios = [], drills = [] } = {}) {
  const { runLocalAcceptance } =
    await import("./night-raven-local-acceptance.mjs");
  const runResult = await runLocalAcceptance({
    scenarioIds: scenarios,
    drillIds: drills,
  });
  const expected = new Map([
    ...scenarios.map((id) => [id, "local-contract-e2e"]),
    ...drills.map((id) => [id, "local-contract-drill"]),
  ]);
  if (runResult.results.length !== expected.size)
    fail(
      "local runner did not return every requested E2E/drill evidence record.",
    );
  const results = runResult.results.map((evidence) => {
    const kind = expected.get(evidence.scenario);
    if (!kind)
      fail(
        `local runner returned an unexpected scenario: ${evidence.scenario}`,
      );
    validateLocalEvidence(evidence, evidence.scenario, kind);
    return {
      id: evidence.scenario,
      kind,
      status: "LOCAL_CONTRACT_PASS",
      productionRuntime: false,
      gateEligible: false,
      runId: evidence.runId,
      completedAt: evidence.completedAt,
      artifactSha256: evidence.artifactSha256,
      resources: evidence.resources,
      metrics: evidence.metrics,
    };
  });
  console.log(
    safeJson({
      version: NIGHT_RAVEN_ACCEPTANCE_VERSION,
      target: "local",
      runId: runResult.runId,
      results,
    }),
  );
  return runResult;
}

async function publicCopy(env = process.env) {
  const copyRoot = await mkdtemp(join(tmpdir(), "night-raven-public-copy-"));
  const buildEnv = buildPublicCopyEnvironment(env);
  try {
    await cp(process.cwd(), copyRoot, {
      recursive: true,
      filter: (source) =>
        shouldIncludePublicCopyPath(relative(process.cwd(), source)),
    });
    if (existsSync(join(copyRoot, ".private")))
      fail("public copy contains .private.");
    await run(
      process.platform === "win32" ? "cmd.exe" : "npm",
      process.platform === "win32"
        ? ["/c", "npm", "ci", "--ignore-scripts", "--prefer-offline"]
        : ["ci", "--ignore-scripts", "--prefer-offline"],
      {
        cwd: copyRoot,
        env: { ...buildEnv, NPM_CONFIG_CACHE: ACCEPTANCE_NPM_CACHE },
      },
    );
    await run(
      process.platform === "win32" ? "cmd.exe" : "npm",
      process.platform === "win32"
        ? ["/c", "npm", "run", "typecheck"]
        : ["run", "typecheck"],
      { cwd: copyRoot, env: buildEnv },
    );
    await run(
      process.platform === "win32" ? "cmd.exe" : "npm",
      process.platform === "win32"
        ? ["/c", "npm", "test", "--", "--test-concurrency=1"]
        : ["test", "--", "--test-concurrency=1"],
      { cwd: copyRoot, env: buildEnv },
    );
    await run(
      process.platform === "win32" ? "cmd.exe" : "npm",
      process.platform === "win32"
        ? ["/c", "npm", "run", "build"]
        : ["run", "build"],
      { cwd: copyRoot, env: buildEnv },
    );
    await assertPublicNextTraceBuild(copyRoot);
  } finally {
    await rm(copyRoot, { force: true, recursive: true });
  }
}

async function assertPublicNextTraceBuild(copyRoot) {
  const traceRoot = join(copyRoot, ".next");
  let manifestCount = 0;

  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
      } else if (entry.isFile() && entry.name.endsWith(".nft.json")) {
        manifestCount += 1;
        let manifest;
        try {
          manifest = JSON.parse(await readFile(path, "utf8"));
        } catch {
          fail("public-copy build produced an unreadable NFT manifest.");
        }
        assertPublicNextTraceFiles(manifest.files);
      }
    }
  }

  await walk(traceRoot);
  if (manifestCount === 0) {
    fail("public-copy build did not produce NFT trace manifests.");
  }
}

async function readAddonReleasePublicKeys(path) {
  if (!path)
    fail(
      "NR_ADDON_RELEASE_PUBLIC_KEYS_FILE is required for private release verification.",
    );
  let parsed;
  try {
    parsed = JSON.parse(await readFile(resolve(path), "utf8"));
  } catch {
    fail("Addon release public key file is unreadable JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    fail("Addon release public key file must contain a key map.");
  return parsed;
}

async function privatePackages({
  authorityEnv = process.env,
  allowEphemeral = false,
  includeDatabase = false,
} = {}) {
  if (
    !authorityEnv.NR_ADDON_RELEASE_SIGNING_KEY_FILE ||
    !authorityEnv.NR_ADDON_RELEASE_SIGNING_KID
  )
    fail(
      "Private release build requires signing key-file and kid references; inline secrets are not accepted.",
    );
  const publicKeys = await readAddonReleasePublicKeys(
    authorityEnv.NR_ADDON_RELEASE_PUBLIC_KEYS_FILE,
  );
  for (const directory of [
    ".private/webshop",
    ".private/license-server-addon",
  ]) {
    const cwd = resolve(directory);
    for (const [script, args] of [
      ["ci", ["--ignore-scripts", "--prefer-offline"]],
      ["run", ["build"]],
      ["run", ["pack:verify"]],
    ]) {
      await run(
        process.platform === "win32" ? "cmd.exe" : "npm",
        process.platform === "win32"
          ? ["/c", "npm", script, ...args]
          : [script, ...args],
        {
          cwd,
          env: {
            ...process.env,
            ...authorityEnv,
            NPM_CONFIG_CACHE: ACCEPTANCE_NPM_CACHE,
          },
        },
      );
    }
    if (includeDatabase) {
      const databaseScript = directory.endsWith("webshop")
        ? "test:payment:db"
        : "install:verify:db";
      await run(
        process.platform === "win32" ? "cmd.exe" : "npm",
        process.platform === "win32"
          ? ["/c", "npm", "run", databaseScript]
          : ["run", databaseScript],
        {
          cwd,
          env: {
            ...process.env,
            ...authorityEnv,
            NPM_CONFIG_CACHE: ACCEPTANCE_NPM_CACHE,
          },
        },
      );
    }
    await run(process.execPath, ["scripts/verify-next-host.mjs"], {
      cwd,
      env: {
        ...process.env,
        ...authorityEnv,
        NPM_CONFIG_CACHE: ACCEPTANCE_NPM_CACHE,
      },
    });
    const manifest = JSON.parse(
      await readFile(join(cwd, "release-manifest.json"), "utf8"),
    );
    const provenance = JSON.parse(
      await readFile(join(cwd, "provenance.json"), "utf8"),
    );
    assertPromotablePrivateRelease(manifest, directory, publicKeys, {
      allowEphemeral,
    });
    if (
      !/^[a-f0-9]{64}$/.test(manifest.artifact?.sha256 ?? "") ||
      manifest.artifact.sha256 !== provenance.subject?.sha256
    )
      fail(`${directory} checksum/provenance mismatch.`);
    for (const file of manifest.artifact.files ?? []) {
      const contents = await readFile(join(cwd, file.path));
      if (sha256(contents) !== file.sha256 || contents.byteLength !== file.size)
        fail(`${directory} artifact checksum mismatch: ${file.path}`);
    }
  }
}

async function localPrivatePackages() {
  return withEphemeralAddonReleaseAuthority(({ env }) =>
    privatePackages({
      authorityEnv: { ...process.env, ...env },
      allowEphemeral: true,
      includeDatabase: true,
    }),
  );
}

async function localInvariants() {
  const localEnv = { ...process.env };
  if (!localEnv.TEST_DATABASE_URL && !localEnv.DATABASE_URL) {
    const { config } = await import("dotenv");
    config({ path: resolve(".env"), processEnv: localEnv, quiet: true });
  }
  const invariantEnv = buildLocalInvariantEnvironment(localEnv);
  await run(
    process.platform === "win32" ? "cmd.exe" : "npm",
    process.platform === "win32"
      ? ["/c", "npm", "run", "db:migrate:matrix:local"]
      : ["run", "db:migrate:matrix:local"],
    { env: invariantEnv },
  );
  await run(
    process.execPath,
    ["scripts/run-remediation-invariants.mjs", "--local"],
    { env: invariantEnv },
  );
}

async function centralRuntime() {
  const cwd = resolve(".private/license-server");
  for (const [script, args] of [
    ["ci", ["--ignore-scripts", "--prefer-offline"]],
    ["ls", ["--depth=0"]],
    ["run", ["typecheck"]],
    ["run", ["test:db"]],
    ["run", ["build"]],
  ]) {
    await run(
      process.platform === "win32" ? "cmd.exe" : "npm",
      process.platform === "win32"
        ? ["/c", "npm", script, ...args]
        : [script, ...args],
      {
        cwd,
        env: { ...process.env, NPM_CONFIG_CACHE: ACCEPTANCE_NPM_CACHE },
      },
    );
  }
}

async function localAll() {
  const localEnv = { ...process.env };
  if (!localEnv.TEST_DATABASE_URL && !localEnv.DATABASE_URL) {
    const { config } = await import("dotenv");
    config({ path: resolve(".env"), processEnv: localEnv, quiet: true });
  }
  await publicCopy(localEnv);
  await localPrivatePackages();
  await centralRuntime();
  await redactionAndBrowserBundleSentinel();
  await localInvariants();
  await runLocalEvidenceMatrix({
    scenarios: ALL_STAGING_SCENARIOS,
    drills: OPERATOR_DRILLS,
  });
}

async function redactionAndBrowserBundleSentinel() {
  await run(process.execPath, [
    "--import",
    "tsx",
    "--test",
    "tests/security-high-remediation.test.ts",
    "tests/security-operations.test.ts",
    "tests/addon-install-boundary.test.ts",
  ]);
  const nextStatic = resolve(".next/static");
  if (!existsSync(nextStatic)) return;
  const files = [];
  const walk = async (root) => {
    for (const entry of await (
      await import("node:fs/promises")
    ).readdir(root, { withFileTypes: true })) {
      const path = join(root, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (/\.(?:js|css|map)$/i.test(entry.name)) files.push(path);
    }
  };
  await walk(nextStatic);
  for (const file of files)
    if (containsBrowserBundleSecret(await readFile(file, "utf8")))
      fail(`browser bundle sentinel failed: ${relative(process.cwd(), file)}`);
}

async function main() {
  const command = process.argv[2] ?? "all";
  if (command === "public-copy") await publicCopy();
  else if (command === "private-packages") await privatePackages();
  else if (command === "private-packages-local") await localPrivatePackages();
  else if (command === "local-invariants") await localInvariants();
  else if (command === "local-all") await localAll();
  else if (command === "migration")
    await run(
      process.platform === "win32" ? "cmd.exe" : "npm",
      process.platform === "win32"
        ? ["/c", "npm", "run", "db:migrate:matrix:local"]
        : ["run", "db:migrate:matrix:local"],
    );
  else if (command === "invariants") {
    await readStagingConfig();
    await run(
      process.execPath,
      ["scripts/run-remediation-invariants.mjs", "--staging"],
      { env: { ...process.env, NR_ACCEPTANCE_TARGET: "staging" } },
    );
  } else if (command === "redaction") await redactionAndBrowserBundleSentinel();
  else if (
    command === "e2e" ||
    command === "drills" ||
    command === "local-e2e" ||
    command === "local-drills" ||
    command === "local"
  ) {
    const target = command.startsWith("local")
      ? "local"
      : resolveAcceptanceTarget();
    if (target === "local") {
      await runLocalEvidenceMatrix({
        scenarios:
          command === "drills" || command === "local-drills"
            ? []
            : ALL_STAGING_SCENARIOS,
        drills:
          command === "e2e" || command === "local-e2e" ? [] : OPERATOR_DRILLS,
      });
    } else {
      const config = await readStagingConfig();
      const kind = command === "e2e" ? "staging-e2e" : "operator-drill";
      const ids = command === "e2e" ? ALL_STAGING_SCENARIOS : OPERATOR_DRILLS;
      const results = [];
      for (const id of ids)
        results.push(await runStagingEvidence(config, id, kind));
      console.log(
        safeJson({
          version: NIGHT_RAVEN_ACCEPTANCE_VERSION,
          target: "staging",
          kind,
          results,
        }),
      );
    }
  } else if (command === "all") {
    const config = await readStagingConfig();
    await publicCopy();
    await privatePackages();
    await redactionAndBrowserBundleSentinel();
    await run(
      process.platform === "win32" ? "cmd.exe" : "npm",
      process.platform === "win32"
        ? ["/c", "npm", "run", "db:migrate:matrix:local"]
        : ["run", "db:migrate:matrix:local"],
    );
    await run(
      process.execPath,
      ["scripts/run-remediation-invariants.mjs", "--staging"],
      { env: { ...process.env, NR_ACCEPTANCE_TARGET: "staging" } },
    );
    for (const id of ALL_STAGING_SCENARIOS)
      await runStagingEvidence(config, id, "staging-e2e");
    for (const id of OPERATOR_DRILLS)
      await runStagingEvidence(config, id, "operator-drill");
  } else fail(`unknown command: ${command}`);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
  main().catch((error) => {
    console.error(`[night-raven-acceptance] ${error.message}`);
    process.exitCode = 1;
  });
}
