import { spawnSync } from "node:child_process";
import { createHash, generateKeyPairSync } from "node:crypto";

const REPOSITORY = "radomirradojevic/nr_cms";
const ENVIRONMENT = "release-production";
const APPROVAL = "CREATE_GITHUB_ACTIONS_PRODUCTION_RELEASE_AUTHORITY";
const SECRET_NAMES = [
  "NR_ADDON_RELEASE_SIGNING_KEY_B64",
  "NR_ADDON_RELEASE_PUBLIC_KEYS_B64",
];
const VARIABLE_NAME = "NR_ADDON_RELEASE_SIGNING_KID";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (!key || !value || args.has(key)) fail("Options must be exact and unique.");
  args.set(key, value);
}
const apply = args.get("--apply") === "true";
if (
  args.size !== (apply ? 2 : 1) ||
  !args.has("--apply") ||
  !["true", "false"].includes(args.get("--apply")) ||
  (apply && args.get("--approval") !== APPROVAL)
) {
  fail(`Expected --apply false, or --apply true --approval ${APPROVAL}.`);
}

run("gh", ["auth", "status"]);
preflight();
if (!apply) {
  process.stdout.write(
    "Dry run passed. The shared production Ed25519 authority can be provisioned in the existing protected nr_cms/release-production environment.\n",
  );
  process.exit(0);
}

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const privateKeyMaterial = Buffer.from(
  privateKey.export({ format: "pem", type: "pkcs8" }),
);
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
const created = [];

try {
  setSecret(
    "NR_ADDON_RELEASE_SIGNING_KEY_B64",
    privateKeyMaterial.toString("base64"),
  );
  created.push({ kind: "secret", name: SECRET_NAMES[0] });
  setSecret(
    "NR_ADDON_RELEASE_PUBLIC_KEYS_B64",
    keyset.toString("base64"),
  );
  created.push({ kind: "secret", name: SECRET_NAMES[1] });
  run("gh", [
    "variable",
    "set",
    VARIABLE_NAME,
    "--env",
    ENVIRONMENT,
    "--repo",
    REPOSITORY,
    "--body",
    kid,
  ]);
  created.push({ kind: "variable", name: VARIABLE_NAME });
  verify(kid);
} catch (error) {
  rollback();
  throw error;
} finally {
  privateKeyMaterial.fill(0);
  keyset.fill(0);
}

process.stdout.write(
  `Production release authority provisioned: ${kid}; public-key SHA-256 ${publicKeyHash}.\n`,
);

function preflight() {
  const environment = JSON.parse(
    run("gh", ["api", `repos/${REPOSITORY}/environments/${ENVIRONMENT}`]),
  );
  const reviewers = environment.protection_rules?.find(
    (rule) => rule.type === "required_reviewers",
  )?.reviewers;
  if (
    environment.deployment_branch_policy?.custom_branch_policies !== true ||
    !reviewers?.some(
      (entry) => entry.type === "User" && entry.reviewer?.login === "radomirradojevic",
    )
  ) {
    fail("The central production environment is not reviewer/branch protected.");
  }
  const secrets = JSON.parse(
    run("gh", [
      "api",
      `repos/${REPOSITORY}/environments/${ENVIRONMENT}/secrets`,
    ]),
  );
  const names = new Set(secrets.secrets.map((secret) => secret.name));
  for (const name of SECRET_NAMES) {
    if (names.has(name)) fail(`${ENVIRONMENT}/${name} already exists.`);
  }
  const variables = JSON.parse(
    run("gh", [
      "api",
      `repos/${REPOSITORY}/environments/${ENVIRONMENT}/variables`,
    ]),
  );
  if (variables.variables.some((variable) => variable.name === VARIABLE_NAME)) {
    fail(`${ENVIRONMENT}/${VARIABLE_NAME} already exists.`);
  }
}

function setSecret(name, value) {
  run(
    "gh",
    ["secret", "set", name, "--env", ENVIRONMENT, "--repo", REPOSITORY],
    value,
  );
}

function verify(expectedKid) {
  const secrets = JSON.parse(
    run("gh", [
      "api",
      `repos/${REPOSITORY}/environments/${ENVIRONMENT}/secrets`,
    ]),
  );
  const names = new Set(secrets.secrets.map((secret) => secret.name));
  for (const name of SECRET_NAMES) {
    if (!names.has(name)) fail(`Verification failed for ${ENVIRONMENT}/${name}.`);
  }
  const variables = JSON.parse(
    run("gh", [
      "api",
      `repos/${REPOSITORY}/environments/${ENVIRONMENT}/variables`,
    ]),
  );
  const actualKid = variables.variables.find(
    (variable) => variable.name === VARIABLE_NAME,
  )?.value;
  if (actualKid !== expectedKid) fail("Production signing KID verification failed.");
}

function rollback() {
  for (const item of created.reverse()) {
    if (item.kind === "secret") {
      runBestEffort("gh", [
        "secret",
        "delete",
        item.name,
        "--env",
        ENVIRONMENT,
        "--repo",
        REPOSITORY,
      ]);
    } else {
      runBestEffort("gh", [
        "variable",
        "delete",
        item.name,
        "--env",
        ENVIRONMENT,
        "--repo",
        REPOSITORY,
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
