import { spawnSync } from "node:child_process";
import { createHash, generateKeyPairSync } from "node:crypto";
import { chmodSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const OWNER = "radomirradojevic";
const CMS_REPOSITORY = `${OWNER}/nr_cms`;
const ENVIRONMENT = "release-production";
const APPROVAL = "CREATE_GITHUB_ACTIONS_PRODUCTION_RELEASE_AUTHORITY";
const TARGETS = [
  { branch: "master-ws", repository: `${OWNER}/webshop` },
  { branch: "master-lsa", repository: `${OWNER}/license-server-addon` },
];
const SECRET_NAMES = [
  "NR_ADDON_RELEASE_SIGNING_KEY_B64",
  "NR_ADDON_RELEASE_PUBLIC_KEYS_B64",
  "NR_CMS_DEPLOY_KEY",
];
const VARIABLE_NAME = "NR_ADDON_RELEASE_SIGNING_KID";
const KEY_TITLE_PREFIX = "nr-cms-production-package-release-readonly-20260821";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (!key || !value || args.has(key)) fail("Options must be exact and unique.");
  args.set(key, value);
}
const apply = args.get("--apply") === "true";
const approval = args.get("--approval");
if (
  args.size !== (apply ? 2 : 1) ||
  !args.has("--apply") ||
  !["true", "false"].includes(args.get("--apply")) ||
  (apply && approval !== APPROVAL)
) {
  fail(
    `Expected --apply false, or --apply true --approval ${APPROVAL}.`,
  );
}

run("gh", ["auth", "status"]);
const reviewer = JSON.parse(run("gh", ["api", `users/${OWNER}`]));
if (!Number.isSafeInteger(reviewer.id) || reviewer.login !== OWNER) {
  fail("Release reviewer identity is invalid.");
}
preflight();
if (!apply) {
  process.stdout.write(
    "Dry run passed. Two protected package release environments, one shared production signing authority, and two unique CMS read-only deploy keys are ready to be created.\n",
  );
  process.exit(0);
}

const scratch = mkdtempSync(path.join(tmpdir(), "nr-production-authority-"));
const created = [];
const privateBuffers = [];

try {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const signingPrivate = Buffer.from(
    privateKey.export({ format: "pem", type: "pkcs8" }),
  );
  privateBuffers.push(signingPrivate);
  const publicKeyPem = publicKey
    .export({ format: "pem", type: "spki" })
    .toString();
  const publicKeyHash = createHash("sha256")
    .update(publicKeyPem)
    .digest("hex");
  const kid = `production-release:${publicKeyHash.slice(0, 16)}`;
  const keyset = Buffer.from(
    JSON.stringify({
      contractVersion: 1,
      generatedAt: new Date().toISOString(),
      issuer: "https://github.com/radomirradojevic/webshop",
      keys: [
        {
          alg: "EdDSA",
          kid,
          notAfter: "2027-08-21T00:00:00.000Z",
          notBefore: "2026-08-21T00:00:00.000Z",
          publicKeyPem,
          status: "active",
        },
      ],
      previousKeysetSha256: null,
      purpose: "addon_release",
      sequence: 1,
    }),
  );

  for (const target of TARGETS) {
    createEnvironment(target, reviewer.id);
    created.push({ kind: "environment", repository: target.repository });

    const keyPath = path.join(
      scratch,
      target.repository.endsWith("/webshop") ? "webshop-cms" : "license-server-cms",
    );
    run("ssh-keygen", [
      "-q",
      "-t",
      "ed25519",
      "-N",
      "",
      "-C",
      `${KEY_TITLE_PREFIX}:${target.repository}`,
      "-f",
      keyPath,
    ]);
    chmodSync(keyPath, 0o600);
    const deployPrivate = Buffer.from(readFileSync(keyPath));
    privateBuffers.push(deployPrivate);
    const deployPublic = readFileSync(`${keyPath}.pub`, "utf8").trim();
    const deployKey = JSON.parse(
      run("gh", [
        "api",
        "--method",
        "POST",
        `repos/${CMS_REPOSITORY}/keys`,
        "-f",
        `title=${KEY_TITLE_PREFIX}:${target.repository}`,
        "-f",
        `key=${deployPublic}`,
        "-F",
        "read_only=true",
      ]),
    );
    if (!Number.isSafeInteger(deployKey.id) || deployKey.read_only !== true) {
      fail("GitHub returned an invalid CMS deploy-key receipt.");
    }
    created.push({ id: deployKey.id, kind: "deploy-key" });

    setSecret(
      target.repository,
      "NR_ADDON_RELEASE_SIGNING_KEY_B64",
      signingPrivate.toString("base64"),
    );
    setSecret(
      target.repository,
      "NR_ADDON_RELEASE_PUBLIC_KEYS_B64",
      keyset.toString("base64"),
    );
    setSecret(target.repository, "NR_CMS_DEPLOY_KEY", deployPrivate.toString());
    run("gh", [
      "variable",
      "set",
      VARIABLE_NAME,
      "--env",
      ENVIRONMENT,
      "--repo",
      target.repository,
      "--body",
      kid,
    ]);
  }

  verify(kid);
  process.stdout.write(
    `Production release authority provisioned: ${kid}; public-key SHA-256 ${publicKeyHash}.\n`,
  );
} catch (error) {
  rollback();
  throw error;
} finally {
  for (const buffer of privateBuffers) buffer.fill(0);
  rmSync(scratch, { force: true, recursive: true });
}

function preflight() {
  const keys = JSON.parse(run("gh", ["api", `repos/${CMS_REPOSITORY}/keys`]));
  for (const target of TARGETS) {
    const environment = runAllow404("gh", [
      "api",
      `repos/${target.repository}/environments/${ENVIRONMENT}`,
    ]);
    if (environment.status === 0) {
      fail(`${target.repository}/${ENVIRONMENT} already exists; refuse overwrite.`);
    }
    if (!/HTTP 404|Not Found/.test(environment.error)) {
      fail(`Cannot verify ${target.repository}/${ENVIRONMENT}: ${environment.error}`);
    }
    const title = `${KEY_TITLE_PREFIX}:${target.repository}`;
    if (keys.some((key) => key.title === title)) {
      fail(`CMS deploy key already exists: ${title}.`);
    }
  }
}

function createEnvironment(target, reviewerId) {
  const body = JSON.stringify({
    deployment_branch_policy: {
      custom_branch_policies: true,
      protected_branches: false,
    },
    prevent_self_review: false,
    reviewers: [{ id: reviewerId, type: "User" }],
    wait_timer: 0,
  });
  const environment = JSON.parse(
    run(
      "gh",
      [
        "api",
        "--method",
        "PUT",
        `repos/${target.repository}/environments/${ENVIRONMENT}`,
        "--input",
        "-",
      ],
      body,
    ),
  );
  if (environment.name !== ENVIRONMENT) fail("Environment creation failed.");
  run(
    "gh",
    [
      "api",
      "--method",
      "POST",
      `repos/${target.repository}/environments/${ENVIRONMENT}/deployment-branch-policies`,
      "--input",
      "-",
    ],
    JSON.stringify({ name: target.branch, type: "branch" }),
  );
}

function setSecret(repository, name, value) {
  run(
    "gh",
    ["secret", "set", name, "--env", ENVIRONMENT, "--repo", repository],
    value,
  );
}

function verify(expectedKid) {
  const keys = JSON.parse(run("gh", ["api", `repos/${CMS_REPOSITORY}/keys`]));
  for (const target of TARGETS) {
    const environment = JSON.parse(
      run("gh", [
        "api",
        `repos/${target.repository}/environments/${ENVIRONMENT}`,
      ]),
    );
    const reviewers = environment.protection_rules?.find(
      (rule) => rule.type === "required_reviewers",
    )?.reviewers;
    if (
      environment.deployment_branch_policy?.custom_branch_policies !== true ||
      !reviewers?.some((entry) => entry.reviewer?.login === OWNER)
    ) {
      fail(`Protected environment verification failed for ${target.repository}.`);
    }
    const secrets = JSON.parse(
      run("gh", [
        "api",
        `repos/${target.repository}/environments/${ENVIRONMENT}/secrets`,
      ]),
    );
    const names = new Set(secrets.secrets.map((secret) => secret.name));
    if (SECRET_NAMES.some((name) => !names.has(name))) {
      fail(`Secret reference verification failed for ${target.repository}.`);
    }
    const variables = JSON.parse(
      run("gh", [
        "api",
        `repos/${target.repository}/environments/${ENVIRONMENT}/variables`,
      ]),
    );
    if (
      variables.variables.find((variable) => variable.name === VARIABLE_NAME)
        ?.value !== expectedKid
    ) {
      fail(`Signing KID verification failed for ${target.repository}.`);
    }
    const title = `${KEY_TITLE_PREFIX}:${target.repository}`;
    if (!keys.some((key) => key.title === title && key.read_only === true)) {
      fail(`CMS deploy-key verification failed for ${target.repository}.`);
    }
  }
}

function rollback() {
  for (const item of created.reverse()) {
    if (item.kind === "deploy-key") {
      runBestEffort("gh", [
        "api",
        "--method",
        "DELETE",
        `repos/${CMS_REPOSITORY}/keys/${item.id}`,
      ]);
    } else {
      runBestEffort("gh", [
        "api",
        "--method",
        "DELETE",
        `repos/${item.repository}/environments/${ENVIRONMENT}`,
      ]);
    }
  }
}

function run(command, commandArgs, input) {
  const result = spawnSync(command, commandArgs, {
    encoding: "utf8",
    input,
    shell: false,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    fail(`${command} ${commandArgs[0] ?? ""} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function runAllow404(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  return {
    error: `${result.stderr || ""}${result.stdout || ""}`,
    status: result.status,
  };
}

function runBestEffort(command, commandArgs) {
  spawnSync(command, commandArgs, {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
}

function fail(message) {
  throw new Error(`[production-release-authority] ${message}`);
}
