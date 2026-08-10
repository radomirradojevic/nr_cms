import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { loadCmsCorePrivilegeManifest, resolveCmsCoreTarget } from "../scripts/core-db-contract.mjs";
import { __addonDeployerProvisionTesting } from "../scripts/db-addon-deployer-provision.mjs";
import { WEBSHOP_CURRENT_TABLES } from "../scripts/webshop-schema-contract.mjs";

const workerRoot = path.resolve(".private", "addon-deployment-worker");
const workerManifestPath = path.join(
  workerRoot,
  "config",
  "db-credential-broker.template.json",
);
const cases = [
  ["vendor", "d89dbb3be2d0c2ea9568b0a9a92b990fbe9252df1d3ef96c0a417addef506bd3"],
  ["client", "a3ec57f8a506ef9ff0696f5496877c99356f884171adea1cb8497efe091abb77"],
];

test(
  "addon deployer manifests cover the exact current signed Webshop table set",
  {
    skip: !fs.existsSync(workerManifestPath),
  },
  () => {
    const core = loadCmsCorePrivilegeManifest();
    const broker = JSON.parse(fs.readFileSync(workerManifestPath, "utf8"));
    assert.equal(WEBSHOP_CURRENT_TABLES.length, 59);
    for (const [target, expectedHash] of cases) {
      const file = path.join(workerRoot, "config", "migration-privileges", `${target}-webshop-v1.json`);
      const loaded = __addonDeployerProvisionTesting.loadPrivilegeManifest(
        file,
        expectedHash,
        target,
        resolveCmsCoreTarget(target, core),
      );
      assert.equal(loaded.value.tableNames.length, 59);
      assert.deepEqual(loaded.value.tableNames, [...WEBSHOP_CURRENT_TABLES].sort());
      assert.equal(broker.privilegeManifests[target].sha256, expectedHash);
    }
  },
);

test("addon deployer public control grants are a closed minimal set", () => {
  assert.deepEqual(__addonDeployerProvisionTesting.CONTROL_TABLES, [
    "cms_addon_deployment_candidates",
    "cms_addon_deployment_terminal_receipts",
    "cms_addon_installations",
    "cms_addon_migrations",
    "cms_addon_operations",
    "cms_addon_serving_fences",
  ]);
});

test("addon deployer provisioning revokes cross-database and ambient sequence privileges", () => {
  const source = fs.readFileSync(path.resolve("scripts", "db-addon-deployer-provision.mjs"), "utf8");
  assert.match(source, /REVOKE ALL ON DATABASE \$\{quoteIdentifier\(row\.datname\)\} FROM PUBLIC/);
  assert.match(source, /REVOKE ALL ON DATABASE \$\{quoteIdentifier\(row\.datname\)\} FROM \$\{quoteIdentifier\(deployerRole\)\}/);
  assert.match(source, /REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM \$\{quoteIdentifier\(deployerRole\)\}/);
  assert.match(source, /has_database_privilege\(\$1,datname,'CONNECT'\)/);
  assert.match(source, /has_schema_privilege\(\$1,'webshop','CREATE'\)/);
});

test("addon deployer DPAPI unseal is bound to the dedicated broker identity and exact ACL", () => {
  const source = fs.readFileSync(path.resolve("scripts", "windows-addon-deployer-dpapi.ps1"), "utf8");
  assert.match(source, /addon_deployer_dpapi_unseal_requires_db_broker_identity/);
  assert.match(source, /addon_deployer_dpapi_owner_invalid/);
  assert.match(source, /addon_deployer_dpapi_acl_rule_count_invalid/);
  assert.match(source, /if \(\$Mode -eq 'unseal'\) \{ Assert-DbBrokerIdentity \} else \{ Assert-Administrator \}/);
});
