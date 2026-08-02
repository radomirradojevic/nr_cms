import process from "node:process";

import {
  loadCmsCorePrivilegeManifest,
  parseStrictArguments,
  resolveCmsCoreTarget,
} from "./core-db-contract.mjs";
import {
  assertProtectedOperatorPasswordFile,
  assertWindowsAdministrator,
  provisionCmsCoreDatabase,
  readProtectedOperatorPasswordFile,
  redactedProvisionReceipt,
} from "./core-db-provisioning.mjs";

function fail(message) {
  throw new Error(`[cms-core-db] ${message}`);
}

function readArguments(argv) {
  const parsed = parseStrictArguments(
    argv,
    [
      "--target",
      "--admin-password-file",
      "--migrator-password-file",
      "--runtime-password-file",
    ],
    ["--dry-run"],
  );
  const required = [
    "--target",
    "--admin-password-file",
    "--migrator-password-file",
    "--runtime-password-file",
  ];
  for (const key of required) {
    if (!parsed.values.has(key)) fail(`${key} is required.`);
  }
  return parsed;
}

export async function runCoreProvision(argv = process.argv.slice(2)) {
  const parsed = readArguments(argv);
  const target = resolveCmsCoreTarget(
    parsed.values.get("--target"),
    loadCmsCorePrivilegeManifest(),
  );
  const files = {
    admin: assertProtectedOperatorPasswordFile(
      parsed.values.get("--admin-password-file"),
    ),
    migrator: assertProtectedOperatorPasswordFile(
      parsed.values.get("--migrator-password-file"),
    ),
    runtime: assertProtectedOperatorPasswordFile(
      parsed.values.get("--runtime-password-file"),
    ),
  };

  if (parsed.flags.has("--dry-run")) {
    return redactedProvisionReceipt(target, "preflight", {
      protectedPasswordInputsVerified: Object.keys(files).sort(),
    });
  }

  assertWindowsAdministrator();
  const admin = readProtectedOperatorPasswordFile(files.admin);
  const migrator = readProtectedOperatorPasswordFile(files.migrator);
  const runtime = readProtectedOperatorPasswordFile(files.runtime);
  return provisionCmsCoreDatabase({
    target,
    adminPassword: admin.password,
    migratorPassword: migrator.password,
    runtimePassword: runtime.password,
    migratorPasswordFile: migrator.protectedPath,
  });
}

if (process.argv[1]?.endsWith("db-core-provision.mjs")) {
  runCoreProvision()
    .then((receipt) => console.log(JSON.stringify(receipt)))
    .catch((error) => {
      console.error(
        error instanceof Error
          ? error.message
          : "[cms-core-db] provisioning failed.",
      );
      process.exitCode = 1;
    });
}
