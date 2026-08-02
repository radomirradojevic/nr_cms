import { config as loadEnv } from "dotenv";

import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
loadEnv();
const profile = process.env.NR_CMS_DEPLOYMENT_PROFILE?.trim();
const sourceMode = process.env.NR_ADDON_SOURCE_MODE?.trim();

if (!profile || !sourceMode) {
  if (hasPrivateWorkspace()) {
    await run("node", ["scripts/setup-local-webshop-addon.mjs"]);
    // The initial dotenv load may contain now-replaced local bootstrap values.
    // Reload only in this development bootstrap branch before validation.
    loadEnv({ override: true });
    await run("node", ["scripts/validate-runtime-env.mjs"]);
    process.exit(0);
  }
  throw new Error(
    "NR_CMS_DEPLOYMENT_PROFILE and NR_ADDON_SOURCE_MODE are required before preparing a clean CMS runtime.",
  );
}

if (profile === "development" && sourceMode === "private_workspace") {
  if (!hasPrivateWorkspace()) {
    throw new Error(
      "private_workspace mode requires .private/webshop, .private/license-server-addon, and .private/license-server.",
    );
  }
  await run("node", ["scripts/setup-local-webshop-addon.mjs"]);
} else if (sourceMode === "registry" || sourceMode === "empty") {
  await run("node", ["scripts/generate-addon-registry.mjs"]);
} else {
  throw new Error(
    `Unsupported runtime preparation combination: ${profile}/${sourceMode}.`,
  );
}

await run("node", ["scripts/validate-runtime-env.mjs"]);

function hasPrivateWorkspace() {
  return ["webshop", "license-server-addon", "license-server"].every((name) =>
    existsSync(resolve(root, ".private", name)),
  );
}

function run(command, args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: process.env,
      shell: false,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) reject(new Error(`${command} ended from signal ${signal}.`));
      else if (code !== 0)
        reject(new Error(`${command} failed with exit code ${code}.`));
      else resolveRun();
    });
  });
}
