import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(".github/workflows/cms-release.yml", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

test("CMS release workflow verifies immutable tag, source, and package identity", () => {
  assert.equal(
    packageJson.scripts["release:prepare"],
    "node scripts/prepare-cms-release.mjs",
  );
  assert.equal(
    packageJson.scripts["release:verify"],
    "node scripts/verify-cms-release.mjs",
  );
  assert.match(workflow, /push:\s*\n\s*tags:/);
  assert.match(workflow, /- "v\*"/);
  assert.match(workflow, /environment: cms-release-production/);
  assert.match(workflow, /permissions:\s*\n\s*contents: write/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /npm ci --ignore-scripts/);
  assert.match(workflow, /npm run release:verify --/);
  assert.match(workflow, /--tag "\$GITHUB_REF_NAME"/);
  assert.match(workflow, /--sha "\$GITHUB_SHA"/);
  assert.match(
    workflow,
    /test "\$\(git cat-file -t "\$GITHUB_REF_NAME"\)" = "tag"/,
  );
  assert.match(
    workflow,
    /git merge-base --is-ancestor "\$GITHUB_SHA" origin\/master/,
  );
  assert.match(workflow, /npm run typecheck/);
  assert.match(workflow, /npm run lint/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /services:\s*\n\s*postgres:/);
  assert.match(workflow, /POSTGRES_DB: nr_cms_release_test/);
  assert.match(
    workflow,
    /TEST_DATABASE_URL: postgresql:\/\/postgres:postgres@127\.0\.0\.1:5432\/nr_cms_release_test/,
  );
  const migrationIndex = workflow.indexOf("npm run db:migrate:test");
  assert.ok(
    migrationIndex < workflow.indexOf("npm test") &&
      migrationIndex < workflow.indexOf("npm run acceptance:public-copy"),
    "release workflow must migrate its isolated test database before test and public-copy gates",
  );
  assert.match(workflow, /npm run acceptance:public-copy/);
  assert.match(workflow, /gh release create "\$GITHUB_REF_NAME"/);
  assert.match(workflow, /--verify-tag/);
  assert.match(workflow, /gh release download "\$GITHUB_REF_NAME"/);
  assert.match(workflow, /cmp --silent/);
  assert.doesNotMatch(
    workflow,
    /npm publish|deployment|NR_PACKAGE_RELEASE_TOKEN/,
  );
});
