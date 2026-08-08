import fs from "node:fs";
import path from "node:path";

import { parseStrictArguments } from "./core-db-contract.mjs";
import { loadWebshopSchemaManifest, resolveWebshopTarget } from "./webshop-schema-contract.mjs";

function fail(message) { throw new Error(`[addon-deployer-provision] ${message}`); }

/** Prints the immutable provisioning plan only.  Real role/ACL/DPAPI/WinSW
 * mutation is deliberately reserved for the approved elevated P17 runbook. */
export function addonDeployerProvisionPlan(argv = process.argv.slice(2)) {
  const parsed = parseStrictArguments(argv, ["--target", "--expected-manifest-sha256", "--password-file"], ["--apply"]);
  const targetName = parsed.values.get("--target");
  const expectedManifest = parsed.values.get("--expected-manifest-sha256");
  const passwordFile = parsed.values.get("--password-file");
  if (targetName !== "vendor" && targetName !== "client") fail("--target must be vendor or client.");
  if (!/^[a-f0-9]{64}$/.test(expectedManifest ?? "")) fail("--expected-manifest-sha256 must be a lowercase SHA-256.");
  if (!passwordFile || !path.isAbsolute(passwordFile)) fail("--password-file must be an absolute protected operator file.");
  if (path.resolve(passwordFile).startsWith(path.resolve(".") + path.sep)) fail("--password-file must be outside the source checkout.");
  if (!fs.existsSync(passwordFile)) fail("--password-file must exist; its contents are never read by this plan command.");
  const manifest = loadWebshopSchemaManifest();
  if (expectedManifest !== manifest.manifestHash) fail("--expected-manifest-sha256 does not match WebshopSchemaPrivilegeManifestV1.");
  if (parsed.flags.has("--apply")) fail("elevated_provisioning_execution_is_disabled_in_source_checkout; execute the P17 approved runbook after recording backup and service receipts.");
  const target = resolveWebshopTarget(targetName, manifest);
  return {
    contractVersion: 1,
    purpose: "webshop_addon_deployer_provision_plan",
    target: targetName,
    manifestSha256: manifest.manifestHash,
    ownedSchema: manifest.ownedSchema,
    deployerRole: target.deployerRole,
    runtimeRole: target.runtimeRole,
    secretRef: `dpapi-machine://nr-addon-worker/${targetName}/webshop-db-deployer/v1`,
    brokerServiceSid: "NT SERVICE\\NRAddonDbCredentialBroker",
    requiredReceipts: ["backup_receipt", "role_grant_receipt", "dpapi_acl_receipt", "winsw_service_dacl_receipt"],
  };
}

if (process.argv[1]?.endsWith("db-addon-deployer-provision.mjs")) {
  try { console.log(JSON.stringify(addonDeployerProvisionPlan())); }
  catch (error) { console.error(error instanceof Error ? error.message : "[addon-deployer-provision] failed."); process.exitCode = 1; }
}
