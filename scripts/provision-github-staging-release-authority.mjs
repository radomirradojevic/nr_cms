import { createHash, generateKeyPairSync } from "node:crypto";
import { spawnSync } from "node:child_process";

const CONTROL_REPOSITORY = "radomirradojevic/nr_cms";
const ENVIRONMENTS = ["private-release", "staging-acceptance"];
const SECRET_NAMES = [
  "NR_ADDON_RELEASE_SIGNING_KEY_B64",
  "NR_ADDON_RELEASE_PUBLIC_KEYS_B64",
];
const VARIABLE_NAME = "NR_ADDON_RELEASE_SIGNING_KID";

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
    `Dry run passed. A staging-only Ed25519 authority will be provisioned in ${ENVIRONMENTS.length} protected environments. Re-run with --apply.\n`,
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
const publicKeyHash = createHash("sha256").update(publicKeyPem).digest("hex");
const kid = `staging-release:${publicKeyHash.slice(0, 16)}`;
const keyset = Buffer.from(
  JSON.stringify({
    contractVersion: 1,
    generatedAt: new Date().toISOString(),
    issuer: "https://github.com/radomirradojevic/webshop",
    keys: [
      {
        alg: "EdDSA",
        kid,
        notAfter: "2027-08-20T00:00:00.000Z",
        notBefore: "2026-08-20T00:00:00.000Z",
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
  for (const environment of ENVIRONMENTS) {
    setSecret(
      environment,
      "NR_ADDON_RELEASE_SIGNING_KEY_B64",
      privateKeyMaterial.toString("base64"),
    );
    created.push({ environment, kind: "secret", name: SECRET_NAMES[0] });
    setSecret(
      environment,
      "NR_ADDON_RELEASE_PUBLIC_KEYS_B64",
      keyset.toString("base64"),
    );
    created.push({ environment, kind: "secret", name: SECRET_NAMES[1] });
    run("gh", [
      "variable",
      "set",
      VARIABLE_NAME,
      "--env",
      environment,
      "--repo",
      CONTROL_REPOSITORY,
      "--body",
      kid,
    ]);
    created.push({ environment, kind: "variable", name: VARIABLE_NAME });
    process.stdout.write(
      `Provisioned staging release authority references in ${environment}.\n`,
    );
  }
  verify(kid);
} catch (error) {
  rollback();
  throw error;
} finally {
  privateKeyMaterial.fill(0);
  keyset.fill(0);
}

process.stdout.write(
  `Staging release authority provisioned: ${kid}; public-key SHA-256 ${publicKeyHash}.\n`,
);

function preflight() {
  for (const environment of ENVIRONMENTS) {
    const secrets = JSON.parse(
      run("gh", [
        "api",
        `repos/${CONTROL_REPOSITORY}/environments/${environment}/secrets`,
      ]),
    );
    const secretNames = new Set(secrets.secrets.map((secret) => secret.name));
    for (const name of SECRET_NAMES) {
      if (secretNames.has(name)) {
        throw new Error(`${environment}/${name} already exists.`);
      }
    }
    const variables = JSON.parse(
      run("gh", [
        "api",
        `repos/${CONTROL_REPOSITORY}/environments/${environment}/variables`,
      ]),
    );
    if (
      variables.variables.some((variable) => variable.name === VARIABLE_NAME)
    ) {
      throw new Error(`${environment}/${VARIABLE_NAME} already exists.`);
    }
  }
}

function setSecret(environment, name, value) {
  run(
    "gh",
    ["secret", "set", name, "--env", environment, "--repo", CONTROL_REPOSITORY],
    value,
  );
}

function verify(expectedKid) {
  for (const environment of ENVIRONMENTS) {
    const secrets = JSON.parse(
      run("gh", [
        "api",
        `repos/${CONTROL_REPOSITORY}/environments/${environment}/secrets`,
      ]),
    );
    const secretNames = new Set(secrets.secrets.map((secret) => secret.name));
    for (const name of SECRET_NAMES) {
      if (!secretNames.has(name)) {
        throw new Error(`Verification failed for ${environment}/${name}.`);
      }
    }
    const variables = JSON.parse(
      run("gh", [
        "api",
        `repos/${CONTROL_REPOSITORY}/environments/${environment}/variables`,
      ]),
    );
    const variable = variables.variables.find(
      (candidate) => candidate.name === VARIABLE_NAME,
    );
    if (variable?.value !== expectedKid) {
      throw new Error(
        `Verification failed for ${environment}/${VARIABLE_NAME}.`,
      );
    }
  }
}

function rollback() {
  for (const item of created.reverse()) {
    if (item.kind === "secret") {
      runBestEffort("gh", [
        "secret",
        "delete",
        item.name,
        "--env",
        item.environment,
        "--repo",
        CONTROL_REPOSITORY,
      ]);
    } else {
      runBestEffort("gh", [
        "variable",
        "delete",
        item.name,
        "--env",
        item.environment,
        "--repo",
        CONTROL_REPOSITORY,
      ]);
    }
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
