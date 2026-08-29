import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  cmsAddonRuntimeContractVersion,
  cmsCoreSchemaVersion,
  cmsReleaseChannel,
  cmsVersion,
  managedRuntimeBuildId,
} from "../.generated/addon-registry.ts";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

test("generated runtime identity binds the canonical CMS release fields", () => {
  assert.equal(cmsVersion, packageJson.version);
  assert.equal(cmsReleaseChannel, "stable");
  assert.equal(cmsCoreSchemaVersion, 1);
  assert.equal(cmsAddonRuntimeContractVersion, "1");
  assert.match(managedRuntimeBuildId, /^[a-f0-9]{64}$/);
});
