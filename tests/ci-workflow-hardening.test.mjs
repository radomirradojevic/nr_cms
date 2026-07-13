import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const WORKFLOW_DIRECTORY = resolve(".github/workflows");
const PINNED_ACTIONS = {
  checkout: "actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5",
  setupNode: "actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020",
  uploadArtifact:
    "actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02",
};

function readWorkflow(name) {
  return readFileSync(resolve(WORKFLOW_DIRECTORY, name), "utf8");
}

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
});

test("Night Raven private, staging, and production gates require protected manual environments", () => {
  for (const [name, environment] of [
    ["private-release.yml", "private-release"],
    ["staging-acceptance.yml", "staging-acceptance"],
    ["production-rollout.yml", "production"],
  ]) {
    const source = readWorkflow(name);
    assert.match(source, /workflow_dispatch:/);
    assert.match(source, new RegExp(`environment:\\s*${environment}`));
    assert.match(source, /self-hosted/);
  }

  const staging = readWorkflow("staging-acceptance.yml");
  assert.match(staging, new RegExp(PINNED_ACTIONS.uploadArtifact));

  const production = readWorkflow("production-rollout.yml");
  assert.match(production, /db:migrate:production:dry-run/);
  assert.match(
    production,
    /production promotion is intentionally not automated/i,
  );
});
