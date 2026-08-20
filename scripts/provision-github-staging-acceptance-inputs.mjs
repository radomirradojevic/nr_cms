import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { validateStagingConfig } from "./night-raven-acceptance-harness.mjs";

const CONTROL_REPOSITORY = "radomirradojevic/nr_cms";
const ENVIRONMENT = "staging-acceptance";
const PROJECT_SECRET_BYTE_LIMIT = 47 * 1024;
const INPUT_FLAGS = new Map([
  ["--config-file", "configFile"],
  ["--runner-file", "runnerFile"],
  ["--staging-identity-file", "stagingIdentityFile"],
  ["--provider-identity-file", "providerIdentityFile"],
]);
const TARGET_SECRET_NAMES = [
  "NR_ACCEPTANCE_CONFIG_B64",
  "NR_ACCEPTANCE_SCENARIO_RUNNER_B64",
  "NR_ACCEPTANCE_STAGING_IDENTITY",
  "NR_ACCEPTANCE_PROVIDER_IDENTITY",
];
const RUNNER_DIGEST_VARIABLE = "NR_ACCEPTANCE_SCENARIO_RUNNER_SHA256";
const REQUIRED_EXISTING_SECRETS = [
  "NR_ADDON_RELEASE_SIGNING_KEY_B64",
  "NR_ADDON_RELEASE_PUBLIC_KEYS_B64",
  "NR_WEBSHOP_DEPLOY_KEY",
  "NR_LICENSE_SERVER_ADDON_DEPLOY_KEY",
  "NR_MASTER_DEPLOY_KEY",
  "NR_DEPLOYMENT_WORKER_DEPLOY_KEY",
];
const REQUIRED_EXISTING_VARIABLE = "NR_ADDON_RELEASE_SIGNING_KID";

export function parseStagingProvisionArguments(args) {
  const values = new Map();
  let apply = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--apply") {
      if (apply) throw new Error("--apply may be specified only once.");
      apply = true;
      continue;
    }
    const property = INPUT_FLAGS.get(argument);
    if (!property) throw new Error(`Unknown option: ${argument}`);
    if (values.has(property))
      throw new Error(`${argument} may be specified only once.`);
    const value = args[index + 1];
    if (!value || value.startsWith("--"))
      throw new Error(`${argument} requires a file path.`);
    values.set(property, resolve(value));
    index += 1;
  }
  for (const [flag, property] of INPUT_FLAGS) {
    if (!values.has(property)) throw new Error(`${flag} is required.`);
  }
  return { apply, ...Object.fromEntries(values) };
}

export function assertOutsideWorkspacePath(
  candidate,
  label,
  cwd = process.cwd(),
) {
  const absolute = resolve(candidate);
  const workspace = resolve(cwd);
  const relation = relative(workspace, absolute);
  if (
    relation === "" ||
    (relation !== ".." &&
      !relation.startsWith(`..${sep}`) &&
      !isAbsolute(relation))
  ) {
    throw new Error(`${label} must be outside the workspace checkout.`);
  }
  return absolute;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeCredential(bytes, label) {
  const value = bytes.toString("utf8").trim();
  if (!value || value.includes("\0"))
    throw new Error(`${label} must contain a non-empty text credential.`);
  return value;
}

function assertProjectSecretSize(name, value) {
  if (Buffer.byteLength(value, "utf8") > PROJECT_SECRET_BYTE_LIMIT)
    throw new Error(`${name} exceeds the project GitHub secret size limit.`);
}

export function prepareStagingAcceptanceInputs({
  configBytes,
  runnerBytes,
  stagingIdentityBytes,
  providerIdentityBytes,
  runnerPath,
  cwd = process.cwd(),
}) {
  if (!Buffer.isBuffer(configBytes) || configBytes.length === 0)
    throw new Error("Acceptance configuration file is empty.");
  if (!Buffer.isBuffer(runnerBytes) || runnerBytes.length === 0)
    throw new Error("Scenario runner file is empty.");
  let config;
  try {
    config = JSON.parse(configBytes.toString("utf8"));
  } catch {
    throw new Error("Acceptance configuration must contain valid JSON.");
  }
  const stagingIdentity = normalizeCredential(
    stagingIdentityBytes,
    "Staging identity file",
  );
  const providerIdentity = normalizeCredential(
    providerIdentityBytes,
    "Provider identity file",
  );
  const absoluteRunnerPath = assertOutsideWorkspacePath(
    runnerPath,
    "Scenario runner file",
    cwd,
  );
  const runnerSha256 = sha256(runnerBytes);
  const preflightEvidenceDirectory = resolve(
    cwd,
    "..",
    "night-raven-staging-evidence-preflight",
  );
  const validated = validateStagingConfig(config, {
    cwd,
    env: {
      NR_ACCEPTANCE_PROVIDER_IDENTITY: providerIdentity,
      NR_ACCEPTANCE_SCENARIO_RUNNER_PATH: absoluteRunnerPath,
      NR_ACCEPTANCE_STAGING_IDENTITY: stagingIdentity,
      NR_STAGING_EVIDENCE_DIRECTORY: preflightEvidenceDirectory,
    },
    exists: (candidate) => resolve(candidate) === absoluteRunnerPath,
    readBinary: () => runnerBytes,
  });
  if (validated.commandSha256 !== runnerSha256)
    throw new Error("Validated runner digest does not match the input bytes.");

  const secretValues = {
    NR_ACCEPTANCE_CONFIG_B64: configBytes.toString("base64"),
    NR_ACCEPTANCE_SCENARIO_RUNNER_B64: runnerBytes.toString("base64"),
    NR_ACCEPTANCE_STAGING_IDENTITY: stagingIdentity,
    NR_ACCEPTANCE_PROVIDER_IDENTITY: providerIdentity,
  };
  for (const [name, value] of Object.entries(secretValues))
    assertProjectSecretSize(name, value);

  return {
    secretValues,
    runnerSha256,
    summary: {
      configSha256: sha256(configBytes),
      configVersion: config.version,
      runnerSha256,
      artifactSetId: validated.artifactSetId,
      target: validated.endpoints ? "staging" : "invalid",
    },
  };
}

function readExternalFile(candidate, label, cwd) {
  const requested = assertOutsideWorkspacePath(candidate, label, cwd);
  let canonical;
  try {
    canonical = realpathSync(requested);
  } catch {
    throw new Error(`${label} must be a readable file.`);
  }
  assertOutsideWorkspacePath(canonical, label, cwd);
  let bytes;
  try {
    bytes = readFileSync(canonical);
  } catch {
    throw new Error(`${label} must be a readable file.`);
  }
  if (bytes.length === 0) throw new Error(`${label} must not be empty.`);
  return { bytes, path: canonical };
}

function githubEnvironmentState() {
  const metadata = JSON.parse(
    run("gh", [
      "api",
      `repos/${CONTROL_REPOSITORY}/environments/${ENVIRONMENT}`,
    ]),
  );
  if (metadata.name !== ENVIRONMENT)
    throw new Error(`Missing protected environment: ${ENVIRONMENT}.`);
  const secrets = JSON.parse(
    run("gh", [
      "api",
      `repos/${CONTROL_REPOSITORY}/environments/${ENVIRONMENT}/secrets`,
    ]),
  );
  const variables = JSON.parse(
    run("gh", [
      "api",
      `repos/${CONTROL_REPOSITORY}/environments/${ENVIRONMENT}/variables`,
    ]),
  );
  return {
    secretNames: new Set(secrets.secrets.map((secret) => secret.name)),
    variables: new Map(
      variables.variables.map((variable) => [variable.name, variable.value]),
    ),
  };
}

function preflightGithubState() {
  const state = githubEnvironmentState();
  for (const name of REQUIRED_EXISTING_SECRETS) {
    if (!state.secretNames.has(name))
      throw new Error(`${ENVIRONMENT}/${name} prerequisite is missing.`);
  }
  if (!state.variables.get(REQUIRED_EXISTING_VARIABLE))
    throw new Error(
      `${ENVIRONMENT}/${REQUIRED_EXISTING_VARIABLE} prerequisite is missing.`,
    );
  for (const name of TARGET_SECRET_NAMES) {
    if (state.secretNames.has(name))
      throw new Error(
        `${ENVIRONMENT}/${name} already exists; refuse to overwrite it.`,
      );
  }
  if (state.variables.has(RUNNER_DIGEST_VARIABLE))
    throw new Error(
      `${ENVIRONMENT}/${RUNNER_DIGEST_VARIABLE} already exists; refuse to overwrite it.`,
    );
}

function verifyGithubState(expectedRunnerSha256) {
  const state = githubEnvironmentState();
  for (const name of TARGET_SECRET_NAMES) {
    if (!state.secretNames.has(name))
      throw new Error(`Verification failed for ${ENVIRONMENT}/${name}.`);
  }
  if (state.variables.get(RUNNER_DIGEST_VARIABLE) !== expectedRunnerSha256)
    throw new Error(
      `Verification failed for ${ENVIRONMENT}/${RUNNER_DIGEST_VARIABLE}.`,
    );
}

function run(command, args, input) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    input,
    shell: false,
    windowsHide: true,
  });
  if (result.status !== 0)
    throw new Error(
      `${command} ${args[0] ?? ""} failed: ${result.stderr || result.stdout}`,
    );
  return result.stdout;
}

function runBestEffort(command, args) {
  spawnSync(command, args, {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
}

async function main() {
  const options = parseStagingProvisionArguments(process.argv.slice(2));
  const cwd = process.cwd();
  const inputs = [
    readExternalFile(options.configFile, "Acceptance configuration file", cwd),
    readExternalFile(options.runnerFile, "Scenario runner file", cwd),
    readExternalFile(options.stagingIdentityFile, "Staging identity file", cwd),
    readExternalFile(
      options.providerIdentityFile,
      "Provider identity file",
      cwd,
    ),
  ];
  try {
    const prepared = prepareStagingAcceptanceInputs({
      configBytes: inputs[0].bytes,
      runnerBytes: inputs[1].bytes,
      stagingIdentityBytes: inputs[2].bytes,
      providerIdentityBytes: inputs[3].bytes,
      runnerPath: inputs[1].path,
      cwd,
    });
    run("gh", ["auth", "status"]);
    preflightGithubState();
    if (!options.apply) {
      process.stdout.write(
        `Dry run passed for staging config ${prepared.summary.configSha256} and runner ${prepared.runnerSha256}. Re-run with --apply.\n`,
      );
      return;
    }

    const created = [];
    try {
      for (const name of TARGET_SECRET_NAMES) {
        run(
          "gh",
          [
            "secret",
            "set",
            name,
            "--env",
            ENVIRONMENT,
            "--repo",
            CONTROL_REPOSITORY,
          ],
          prepared.secretValues[name],
        );
        created.push({ kind: "secret", name });
      }
      run("gh", [
        "variable",
        "set",
        RUNNER_DIGEST_VARIABLE,
        "--env",
        ENVIRONMENT,
        "--repo",
        CONTROL_REPOSITORY,
        "--body",
        prepared.runnerSha256,
      ]);
      created.push({ kind: "variable", name: RUNNER_DIGEST_VARIABLE });
      verifyGithubState(prepared.runnerSha256);
    } catch (error) {
      for (const item of created.reverse()) {
        if (item.kind === "secret")
          runBestEffort("gh", [
            "secret",
            "delete",
            item.name,
            "--env",
            ENVIRONMENT,
            "--repo",
            CONTROL_REPOSITORY,
          ]);
        else
          runBestEffort("gh", [
            "variable",
            "delete",
            item.name,
            "--env",
            ENVIRONMENT,
            "--repo",
            CONTROL_REPOSITORY,
          ]);
      }
      throw error;
    }
    process.stdout.write(
      `Provisioned staging acceptance references for config ${prepared.summary.configSha256} and runner ${prepared.runnerSha256}.\n`,
    );
  } finally {
    for (const input of inputs) input.bytes.fill(0);
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
  main().catch((error) => {
    console.error(`[staging-acceptance-provision] ${error.message}`);
    process.exitCode = 1;
  });
}
