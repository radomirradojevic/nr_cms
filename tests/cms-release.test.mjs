import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  CMS_ADDON_RUNTIME_CONTRACT_VERSION,
  CMS_CORE_SCHEMA_VERSION,
  CMS_PACKAGE_VERSION,
  assertConfiguredCmsVersion,
  assertCmsVersionUpgrade,
  createCmsReleaseManifest,
} from "../scripts/cms-release-contract.mjs";
import { createNpmVersionCommand } from "../scripts/prepare-cms-release.mjs";
import { verifyCmsRelease } from "../scripts/verify-cms-release.mjs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

test("CMS package metadata is the canonical runtime version", () => {
  assert.equal(CMS_PACKAGE_VERSION, packageJson.version);
  assert.equal(assertConfiguredCmsVersion(undefined), packageJson.version);
  assert.equal(
    assertConfiguredCmsVersion(` ${packageJson.version} `),
    packageJson.version,
  );
  assert.throws(
    () => assertConfiguredCmsVersion("9.9.9"),
    /NR_CMS_VERSION must exactly match package\.json version/,
  );
});

test("CMS release preparation only moves version history forward", () => {
  assert.equal(assertCmsVersionUpgrade("0.2.0-rc.1", "0.1.0"), "0.2.0-rc.1");
  assert.equal(assertCmsVersionUpgrade("0.2.0", "0.2.0-rc.3"), "0.2.0");
  assert.equal(
    assertCmsVersionUpgrade("1.0.1-rc.2", "1.0.1-rc.1"),
    "1.0.1-rc.2",
  );
  assert.throws(
    () => assertCmsVersionUpgrade("0.1.0", "0.1.0"),
    /must be greater than current CMS version/,
  );
  assert.throws(
    () => assertCmsVersionUpgrade("0.1.9", "0.2.0"),
    /must be greater than current CMS version/,
  );
});

test("CMS release preparation invokes npm safely on Windows and POSIX", () => {
  assert.deepEqual(
    createNpmVersionCommand("0.1.1", {
      platform: "win32",
      comSpec: "C:\\Windows\\System32\\cmd.exe",
    }),
    {
      command: "C:\\Windows\\System32\\cmd.exe",
      args: [
        "/d",
        "/s",
        "/c",
        "npm",
        "version",
        "0.1.1",
        "--no-git-tag-version",
      ],
    },
  );
  assert.deepEqual(createNpmVersionCommand("0.1.1", { platform: "linux" }), {
    command: "npm",
    args: ["version", "0.1.1", "--no-git-tag-version"],
  });
});

test("stable CMS tags produce an immutable release manifest", () => {
  assert.deepEqual(
    createCmsReleaseManifest({
      commitSha: "a".repeat(40),
      packageVersion: "1.4.2",
      packageLockVersion: "1.4.2",
      tag: "v1.4.2",
    }),
    {
      addonRuntimeContractVersion: CMS_ADDON_RUNTIME_CONTRACT_VERSION,
      cmsVersion: "1.4.2",
      commitSha: "a".repeat(40),
      contractVersion: 1,
      coreSchemaVersion: CMS_CORE_SCHEMA_VERSION,
      product: "night-raven-cms",
      purpose: "cms_release",
      releaseChannel: "stable",
      tag: "v1.4.2",
    },
  );
});

test("release candidates are explicit and invalid release identities fail closed", () => {
  assert.equal(
    createCmsReleaseManifest({
      commitSha: "b".repeat(40),
      packageVersion: "0.2.0-rc.3",
      packageLockVersion: "0.2.0-rc.3",
      tag: "v0.2.0-rc.3",
    }).releaseChannel,
    "rc",
  );
  assert.throws(
    () =>
      createCmsReleaseManifest({
        commitSha: "b".repeat(40),
        packageVersion: "0.2.0",
        packageLockVersion: "0.2.0",
        tag: "v0.2.1",
      }),
    /tag must exactly match package version/,
  );
  assert.throws(
    () =>
      createCmsReleaseManifest({
        commitSha: "B".repeat(40),
        packageVersion: "0.2.0",
        packageLockVersion: "0.2.0",
        tag: "v0.2.0",
      }),
    /commit SHA must be 40 lowercase hexadecimal characters/,
  );
  assert.throws(
    () =>
      createCmsReleaseManifest({
        commitSha: "b".repeat(40),
        packageVersion: "0.2.0-beta.1",
        packageLockVersion: "0.2.0-beta.1",
        tag: "v0.2.0-beta.1",
      }),
    /stable SemVer or an rc prerelease/,
  );
  assert.throws(
    () =>
      createCmsReleaseManifest({
        commitSha: "b".repeat(40),
        packageVersion: "0.2.0",
        packageLockVersion: "0.1.0",
        tag: "v0.2.0",
      }),
    /package-lock\.json version must match package\.json version/,
  );
});

test("release verification writes a create-only canonical manifest", async () => {
  const directory = mkdtempSync(join(tmpdir(), "nr-cms-release-test-"));
  const output = join(directory, "cms-release-manifest.json");
  const argumentsList = [
    "--tag",
    `v${CMS_PACKAGE_VERSION}`,
    "--sha",
    "c".repeat(40),
    "--output",
    output,
  ];
  try {
    const manifest = await verifyCmsRelease(argumentsList);
    assert.deepEqual(JSON.parse(readFileSync(output, "utf8")), manifest);
    await assert.rejects(() => verifyCmsRelease(argumentsList), /EEXIST/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
