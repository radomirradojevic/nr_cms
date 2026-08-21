import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const workflow = readFileSync(
  path.join(root, ".github", "workflows", "production-addon-package-release.yml"),
  "utf8",
);
const provisioner = readFileSync(
  path.join(root, "scripts", "provision-github-production-release-authority.mjs"),
  "utf8",
);

test("reusable package publisher is allowlisted and reviewer-environment protected", () => {
  assert.match(workflow, /workflow_call:/);
  assert.doesNotMatch(workflow, /workflow_dispatch:|pull_request:|push:/);
  assert.match(workflow, /environment: release-production/);
  assert.match(workflow, /contents: write/);
  assert.match(workflow, /packages: write/);
  assert.match(workflow, /radomirradojevic\/license-server-addon/);
  assert.match(workflow, /radomirradojevic\/webshop/);
  assert.match(workflow, /c477d8cea06a3ae9cb638c6f341a3ab2ac8777e0/);
  assert.match(workflow, /3ff8e9f9475f69cb7e7dbff34d01a94d378fe610/);
  assert.match(workflow, /bee6ca64f247723cf2472def6408787b4d4f3dd5/);
  assert.match(workflow, /NR_ADDON_RELEASE_SIGNING_KEY_B64/);
  assert.match(workflow, /NR_ADDON_RELEASE_PUBLIC_KEYS_B64/);
  assert.match(workflow, /production-release:\[0-9a-f\]\{16\}/);
  assert.match(workflow, /npm publish "\$TARBALL"/);
  assert.match(
    workflow,
    /inputs\.mode[\s\S]*reconcile|reconcile[\s\S]*inputs\.mode/,
  );
  assert.doesNotMatch(workflow, /staging-release:|PERSONAL_ACCESS_TOKEN|\bPAT\b/);
});

test("authority provisioner refuses an unprotected or existing production root", () => {
  assert.match(provisioner, /CREATE_GITHUB_ACTIONS_PRODUCTION_RELEASE_AUTHORITY/);
  assert.match(provisioner, /required_reviewers/);
  assert.match(provisioner, /custom_branch_policies/);
  assert.match(provisioner, /already exists/);
  assert.match(provisioner, /rollback\(\)/);
  assert.match(provisioner, /privateKeyMaterial\.fill\(0\)/);
  assert.doesNotMatch(provisioner, /staging-release:/);
});
