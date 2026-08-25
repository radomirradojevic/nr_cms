import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const workflow = readFileSync(
  path.join(
    root,
    ".github",
    "workflows",
    "production-addon-package-release.yml",
  ),
  "utf8",
);
const provisioner = readFileSync(
  path.join(
    root,
    "scripts",
    "provision-github-production-release-authority.mjs",
  ),
  "utf8",
);

test("central package publisher is allowlisted and reviewer-environment protected", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /workflow_call:|pull_request:|push:/);
  assert.match(workflow, /environment: release-production/);
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
  assert.doesNotMatch(workflow, /contents: write|packages: write/);
  assert.match(workflow, /radomirradojevic\/license-server-addon/);
  assert.match(workflow, /radomirradojevic\/webshop/);
  assert.match(workflow, /19a5735208f0089b5485837932da532023d12963/);
  assert.match(workflow, /3ff8e9f9475f69cb7e7dbff34d01a94d378fe610/);
  assert.match(workflow, /72a0f106256d1b7616780ef034d226270a0344f8/);
  assert.match(workflow, /bee6ca64f247723cf2472def6408787b4d4f3dd5/);
  assert.match(workflow, /NR_ADDON_RELEASE_SIGNING_KEY_B64/);
  assert.match(workflow, /NR_ADDON_RELEASE_PUBLIC_KEYS_B64/);
  assert.match(workflow, /NR_PACKAGE_RELEASE_TOKEN/);
  assert.match(workflow, /test -n "\$\{PACKAGE_RELEASE_TOKEN:-\}"/);
  assert.match(workflow, /--repo "\$TARGET_REPOSITORY"/);
  assert.match(workflow, /production-release:\[0-9a-f\]\{16\}/);
  assert.match(workflow, /npm publish "\$TARBALL"/);
  assert.match(workflow, /pushd "\.private\/\$PACKAGE_PATH"/);
  assert.match(workflow, /npm pack --ignore-scripts --pack-destination/);
  assert.doesNotMatch(
    workflow,
    /npm --prefix "\.private\/\$PACKAGE_PATH" pack/,
  );
  assert.match(
    workflow,
    /inputs\.mode[\s\S]*reconcile|reconcile[\s\S]*inputs\.mode/,
  );
  assert.match(workflow, /inputs\.mode[\s\S]*verify|verify[\s\S]*inputs\.mode/);
  assert.match(workflow, /if: inputs\.mode != 'verify'/);
  assert.doesNotMatch(
    workflow,
    /staging-release:|PERSONAL_ACCESS_TOKEN|secrets\.GITHUB_TOKEN/,
  );
});

test("authority provisioner refuses an unprotected or existing production root", () => {
  assert.match(
    provisioner,
    /CREATE_GITHUB_ACTIONS_PRODUCTION_RELEASE_AUTHORITY/,
  );
  assert.match(provisioner, /required_reviewers/);
  assert.match(provisioner, /custom_branch_policies/);
  assert.match(provisioner, /already exists/);
  assert.match(provisioner, /rollback\(\)/);
  assert.match(provisioner, /privateKeyMaterial\.fill\(0\)/);
  assert.doesNotMatch(provisioner, /staging-release:/);
});
