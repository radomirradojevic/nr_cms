import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CMS_PACKAGE_VERSION,
  assertCmsVersionUpgrade,
} from "./cms-release-contract.mjs";

export function parseCmsReleasePreparationArguments(argv) {
  if (argv.length !== 1) {
    throw new Error(
      "CMS release preparation requires exactly one next version argument",
    );
  }
  return assertCmsVersionUpgrade(argv[0], CMS_PACKAGE_VERSION);
}

export async function prepareCmsRelease(argv = process.argv.slice(2)) {
  const nextVersion = parseCmsReleasePreparationArguments(argv);
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  await run(npmCommand, ["version", nextVersion, "--no-git-tag-version"]);
  return nextVersion;
}

function run(command, args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      shell: false,
      windowsHide: true,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) reject(new Error(`npm version ended from signal ${signal}`));
      else if (code !== 0)
        reject(new Error(`npm version failed with exit code ${code}`));
      else resolveRun();
    });
  });
}

async function main() {
  try {
    await prepareCmsRelease();
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "CMS release preparation failed",
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
