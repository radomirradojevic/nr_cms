import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const runner = readFileSync("scripts/run-payment-integration-tests.mjs", "utf8");

test("payment integration delegates to the isolated package-owned schema fixture", () => {
  assert.equal(
    packageJson.scripts["test:payment:integration"],
    "node scripts/run-payment-integration-tests.mjs",
  );
  assert.match(runner, /verify-webshop-schema-fixture\.mjs/);
  assert.match(runner, /--run-payment-test/);
  assert.doesNotMatch(runner, /resolveTestDatabaseUrl|payment-state-v2\.integration/);
});
