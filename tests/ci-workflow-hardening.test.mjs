import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const WORKFLOW_DIRECTORY = resolve(".github/workflows");
const PINNED_ACTIONS = {
  checkout: "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
  setupNode: "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020",
  uploadArtifact:
    "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a",
};

function readWorkflow(name) {
  return readFileSync(resolve(WORKFLOW_DIRECTORY, name), "utf8");
}

test("reviewed workflow gates are publishable while local GitHub agent files remain ignored", () => {
  const ignore = readFileSync(resolve(".gitignore"), "utf8");
  assert.match(ignore, /^\.github\/\*$/m);
  for (const name of [
    "ci.yml",
    "private-release.yml",
    "staging-acceptance.yml",
    "production-rollout.yml",
  ]) {
    assert.match(
      ignore,
      new RegExp(`^!\\.github/workflows/${name.replace(".", "\\.")}$`, "m"),
    );
  }
  assert.doesNotMatch(ignore, /^!\.github\/(?:prompts|hooks|instructions)\//m);
});

test("GitHub workflows are pinned, least-privilege, and never run untrusted PR code with secrets", () => {
  for (const name of [
    "ci.yml",
    "private-release.yml",
    "staging-acceptance.yml",
    "production-rollout.yml",
  ]) {
    const source = readWorkflow(name);
    assert.match(source, /permissions:\s*\n\s*contents:\s*read/);
    assert.doesNotMatch(source, /pull_request_target|write-all/i);
    assert.match(source, new RegExp(PINNED_ACTIONS.checkout));
    assert.match(source, new RegExp(PINNED_ACTIONS.setupNode));
  }

  const ci = readWorkflow("ci.yml");
  assert.match(ci, /NR_ADDON_SOURCE_MODE:\s*empty/);
  assert.match(ci, /npm run addons:registry/);
  assert.match(ci, /npm run supply-chain:audit:public/);
  assert.ok(
    ci.indexOf("npm run addons:registry") < ci.indexOf("npm run typecheck"),
    "clean public CI must generate the empty registry before typecheck",
  );
});

test("public supply-chain audit is explicit and never requires private checkouts", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      resolve("scripts/audit-npm-supply-chain.ts"),
      "--public-only",
    ],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /CMS:/);
  assert.doesNotMatch(result.stdout, /Webshop addon|License Server addon/);
});

test("Night Raven private, staging, and production gates use protected GitHub-hosted jobs", () => {
  for (const [name, environment] of [
    ["private-release.yml", "private-release"],
    ["staging-acceptance.yml", "staging-acceptance"],
    ["production-rollout.yml", "release-production"],
  ]) {
    const source = readWorkflow(name);
    assert.match(source, /workflow_dispatch:/);
    assert.match(source, new RegExp(`environment:\\s*${environment}`));
    assert.match(source, /runs-on:\s*ubuntu-24\.04/);
    assert.doesNotMatch(source, /self-hosted/);
    assert.match(source, /repository:\s*radomirradojevic\/webshop/);
    assert.match(
      source,
      /repository:\s*radomirradojevic\/license-server-addon/,
    );
    assert.match(source, /repository:\s*radomirradojevic\/license-server/);
    assert.match(
      source,
      /repository:\s*radomirradojevic\/addon-deployment-worker/,
    );
    for (const secret of [
      "NR_WEBSHOP_DEPLOY_KEY",
      "NR_LICENSE_SERVER_ADDON_DEPLOY_KEY",
      "NR_MASTER_DEPLOY_KEY",
      "NR_DEPLOYMENT_WORKER_DEPLOY_KEY",
    ]) {
      assert.match(
        source,
        new RegExp(`ssh-key:\\s*\\$\\{\\{ secrets\\.${secret} \\}\\}`),
      );
    }
    assert.match(source, /persist-credentials:\s*false/);
    assert.doesNotMatch(source, /token:\s*\$\{\{ secrets\./);
  }

  const staging = readWorkflow("staging-acceptance.yml");
  assert.match(staging, new RegExp(PINNED_ACTIONS.uploadArtifact));
  assert.match(
    staging,
    /NR_ACCEPTANCE_STAGING_IDENTITY:\s*\$\{\{ secrets\.NR_ACCEPTANCE_STAGING_IDENTITY \}\}/,
  );
  assert.match(
    staging,
    /NR_ACCEPTANCE_PROVIDER_IDENTITY:\s*\$\{\{ secrets\.NR_ACCEPTANCE_PROVIDER_IDENTITY \}\}/,
  );
  assert.match(staging, /NR_ACCEPTANCE_CONFIG_B64:\s*\$\{\{ secrets\./);
  assert.match(staging, /NR_ADDON_RELEASE_SIGNING_KEY_B64:\s*\$\{\{ secrets\./);
  assert.match(staging, /NR_ADDON_RELEASE_PUBLIC_KEYS_B64:\s*\$\{\{ secrets\./);
  assert.match(staging, /base64 --decode/);
  assert.match(staging, /\$RUNNER_TEMP\/night-raven-acceptance\.staging\.json/);
  assert.match(staging, /test -r "\$NR_ADDON_RELEASE_SIGNING_KEY_FILE"/);
  assert.match(staging, /npm run acceptance:preflight/);
  assert.ok(
    staging.indexOf("npm run acceptance:preflight") <
      staging.indexOf("npm run acceptance\n"),
    "staging preflight must run before the mutating acceptance matrix",
  );

  const privateRelease = readWorkflow("private-release.yml");
  assert.match(
    privateRelease,
    /NR_ADDON_SOURCE_MODE=empty npm run addons:registry/,
  );
  assert.ok(
    privateRelease.indexOf("npm run addons:registry") <
      privateRelease.indexOf("npm run acceptance:private-packages"),
    "private release must generate the fail-closed root registry before package verification",
  );

  const production = readWorkflow("production-rollout.yml");
  assert.doesNotMatch(production, /environment:\s*production(?:\s|$)/);
  assert.match(production, /db:migrate:production:dry-run/);
  assert.match(
    production,
    /production promotion is intentionally not automated/i,
  );
});
