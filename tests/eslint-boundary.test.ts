import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";

import { ESLint } from "eslint";

test("CMS lint ignores separately versioned private package checkouts", async () => {
  const eslint = new ESLint({ cwd: process.cwd() });

  assert.equal(
    await eslint.isPathIgnored(
      resolve(process.cwd(), ".private/webshop/tests/example.test.ts"),
    ),
    true,
  );
});
