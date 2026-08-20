import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const OWNER = "radomirradojevic";
const CONTROL_REPOSITORY = `${OWNER}/nr_cms`;
const ENVIRONMENTS = [
  "private-release",
  "staging-acceptance",
  "release-production",
];
const KEY_TITLE = "nr-cms-github-hosted-release-readonly-20260820";
const REPOSITORIES = [
  { name: "webshop", secret: "NR_WEBSHOP_DEPLOY_KEY" },
  {
    name: "license-server-addon",
    secret: "NR_LICENSE_SERVER_ADDON_DEPLOY_KEY",
  },
  { name: "license-server", secret: "NR_MASTER_DEPLOY_KEY" },
  {
    name: "addon-deployment-worker",
    secret: "NR_DEPLOYMENT_WORKER_DEPLOY_KEY",
  },
];

const apply = process.argv.slice(2).includes("--apply");
const unknownArguments = process.argv
  .slice(2)
  .filter((argument) => argument !== "--apply");
if (unknownArguments.length > 0) {
  throw new Error(`Unknown option: ${unknownArguments.join(", ")}`);
}

run("gh", ["auth", "status"]);
preflight();

if (!apply) {
  process.stdout.write(
    `Dry run passed. ${REPOSITORIES.length} unique read-only deploy keys will be provisioned across ${ENVIRONMENTS.length} protected environments. Re-run with --apply.\n`,
  );
  process.exit(0);
}

const scratch = mkdtempSync(
  path.join(tmpdir(), "nr-github-release-deploy-keys-"),
);
const createdKeys = [];
const createdSecrets = [];

try {
  for (const repository of REPOSITORIES) {
    const privateKeyPath = path.join(scratch, repository.name);
    run("ssh-keygen", [
      "-q",
      "-t",
      "ed25519",
      "-N",
      "",
      "-C",
      `${KEY_TITLE}:${repository.name}`,
      "-f",
      privateKeyPath,
    ]);
    chmodSync(privateKeyPath, 0o600);
    const publicKey = readFileSync(`${privateKeyPath}.pub`, "utf8").trim();
    const privateKey = readFileSync(privateKeyPath, "utf8");
    const created = JSON.parse(
      run("gh", [
        "api",
        "--method",
        "POST",
        `repos/${OWNER}/${repository.name}/keys`,
        "-f",
        `title=${KEY_TITLE}`,
        "-f",
        `key=${publicKey}`,
        "-F",
        "read_only=true",
      ]),
    );
    if (!Number.isSafeInteger(created.id) || created.read_only !== true) {
      throw new Error(
        `GitHub returned an invalid deploy-key receipt for ${repository.name}.`,
      );
    }
    createdKeys.push({ id: created.id, repository: repository.name });

    for (const environment of ENVIRONMENTS) {
      run(
        "gh",
        [
          "secret",
          "set",
          repository.secret,
          "--env",
          environment,
          "--repo",
          CONTROL_REPOSITORY,
        ],
        privateKey,
      );
      createdSecrets.push({ environment, name: repository.secret });
    }
    process.stdout.write(
      `Provisioned read-only deploy key for ${repository.name}.\n`,
    );
  }
  verify();
} catch (error) {
  rollback();
  throw error;
} finally {
  rmSync(scratch, { force: true, recursive: true });
}

process.stdout.write(
  "GitHub-hosted private checkout credentials are provisioned without a shared PAT.\n",
);

function preflight() {
  for (const environment of ENVIRONMENTS) {
    const metadata = JSON.parse(
      run("gh", [
        "api",
        `repos/${CONTROL_REPOSITORY}/environments/${environment}`,
      ]),
    );
    if (metadata.name !== environment) {
      throw new Error(`Missing protected environment: ${environment}.`);
    }
    const existing = JSON.parse(
      run("gh", [
        "api",
        `repos/${CONTROL_REPOSITORY}/environments/${environment}/secrets`,
      ]),
    );
    const names = new Set(existing.secrets.map((secret) => secret.name));
    for (const repository of REPOSITORIES) {
      if (names.has(repository.secret)) {
        throw new Error(
          `${environment}/${repository.secret} already exists; refuse to overwrite it.`,
        );
      }
    }
  }

  for (const repository of REPOSITORIES) {
    const keys = JSON.parse(
      run("gh", ["api", `repos/${OWNER}/${repository.name}/keys`]),
    );
    if (keys.some((key) => key.title === KEY_TITLE)) {
      throw new Error(
        `${repository.name} already has deploy key ${KEY_TITLE}; refuse duplicate provisioning.`,
      );
    }
  }
}

function verify() {
  for (const environment of ENVIRONMENTS) {
    const existing = JSON.parse(
      run("gh", [
        "api",
        `repos/${CONTROL_REPOSITORY}/environments/${environment}/secrets`,
      ]),
    );
    const names = new Set(existing.secrets.map((secret) => secret.name));
    for (const repository of REPOSITORIES) {
      if (!names.has(repository.secret)) {
        throw new Error(
          `Verification failed for ${environment}/${repository.secret}.`,
        );
      }
    }
  }

  for (const repository of REPOSITORIES) {
    const keys = JSON.parse(
      run("gh", ["api", `repos/${OWNER}/${repository.name}/keys`]),
    );
    const key = keys.find((candidate) => candidate.title === KEY_TITLE);
    if (!key || key.read_only !== true) {
      throw new Error(
        `Read-only deploy key verification failed for ${repository.name}.`,
      );
    }
  }
}

function rollback() {
  for (const secret of createdSecrets.reverse()) {
    runBestEffort("gh", [
      "secret",
      "delete",
      secret.name,
      "--env",
      secret.environment,
      "--repo",
      CONTROL_REPOSITORY,
    ]);
  }
  for (const key of createdKeys.reverse()) {
    runBestEffort("gh", [
      "api",
      "--method",
      "DELETE",
      `repos/${OWNER}/${key.repository}/keys/${key.id}`,
    ]);
  }
}

function run(command, args, input) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    input,
    shell: false,
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args[0] ?? ""} failed: ${result.stderr || result.stdout}`,
    );
  }
  return result.stdout;
}

function runBestEffort(command, args) {
  spawnSync(command, args, {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
}
