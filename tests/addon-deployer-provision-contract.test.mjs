import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  loadCmsCorePrivilegeManifest,
  resolveCmsCoreTarget,
} from "../scripts/core-db-contract.mjs";
import { __addonDeployerProvisionTesting } from "../scripts/db-addon-deployer-provision.mjs";
import { WEBSHOP_CURRENT_TABLES } from "../scripts/webshop-schema-contract.mjs";

const workerRoot = path.resolve(".private", "addon-deployment-worker");
const workerManifestPath = path.join(
  workerRoot,
  "config",
  "db-credential-broker.template.json",
);
const cases = [
  [
    "vendor",
    "a0c348794a8bd22503ba6e59d5befae23c4aebb0298016687859c675713c42cf",
  ],
  [
    "client",
    "5e5eae42597fd1288f4feeab81549146deda856734abb40df8da448f4ce639a6",
  ],
  [
    "paypal",
    "ea0bddeccef1647b9838c7b675c93dada8c361c2a9ae941949fbec5b0367f4a2",
  ],
];
const licenseServerCases = [
  [
    "vendor",
    "88022a00345498187042c33ca81af0ba4658794bed248993ceeccd350e2a506c",
  ],
  [
    "client",
    "5516d64de45747c130d7a999a6dc2b4e11cddb1248282cd872a1921438e2e45f",
  ],
  [
    "paypal",
    "5424de89bdd3edd574cb95332b7a527da98a7a3698c21ee2c27c04d631e1ffcc",
  ],
];

test(
  "addon deployer manifests cover the exact current signed Webshop table set",
  {
    skip: !fs.existsSync(workerManifestPath),
  },
  () => {
    const core = loadCmsCorePrivilegeManifest();
    const broker = JSON.parse(fs.readFileSync(workerManifestPath, "utf8"));
    assert.equal(WEBSHOP_CURRENT_TABLES.length, 64);
    for (const [target, expectedHash] of cases) {
      const file = path.join(
        workerRoot,
        "config",
        "migration-privileges",
        `${target}-webshop-v1.json`,
      );
      const loaded = __addonDeployerProvisionTesting.loadPrivilegeManifest(
        file,
        expectedHash,
        target,
        resolveCmsCoreTarget(target, core),
        "webshop",
      );
      assert.equal(loaded.value.tableNames.length, 64);
      assert.deepEqual(
        loaded.value.tableNames,
        [...WEBSHOP_CURRENT_TABLES].sort(),
      );
      assert.equal(
        broker.privilegeManifests[`${target}:webshop`].sha256,
        expectedHash,
      );
      assert.equal(
        broker.credentialRefs[`${target}:webshop`],
        `dpapi-machine://nr-addon-worker/${target}/webshop-db-deployer/v1`,
      );
    }
  },
);

test(
  "addon deployer manifests cover the exact package-owned License Server table set",
  { skip: !fs.existsSync(workerManifestPath) },
  () => {
    const core = loadCmsCorePrivilegeManifest();
    const broker = JSON.parse(fs.readFileSync(workerManifestPath, "utf8"));
    const descriptor =
      __addonDeployerProvisionTesting.MANAGED_ADDON_DEPLOYER_DESCRIPTORS[
        "license-server"
      ];
    assert.equal(broker.contractVersion, 2);
    assert.equal(descriptor.expectedTables.length, 18);
    assert.equal(descriptor.requiredExistingTables.length, 12);
    for (const [target, expectedHash] of licenseServerCases) {
      const file = path.join(
        workerRoot,
        "config",
        "migration-privileges",
        `${target}-license-server-v1.json`,
      );
      const loaded = __addonDeployerProvisionTesting.loadPrivilegeManifest(
        file,
        expectedHash,
        target,
        resolveCmsCoreTarget(target, core),
        "license-server",
      );
      assert.deepEqual(loaded.value.tableNames, descriptor.expectedTables);
      assert.deepEqual(loaded.value.extensionNames, ["pgcrypto"]);
      assert.equal(loaded.value.schema, "public");
      assert.equal(
        broker.privilegeManifests[`${target}:license-server`].sha256,
        expectedHash,
      );
      assert.equal(
        broker.credentialRefs[`${target}:license-server`],
        `dpapi-machine://nr-addon-worker/${target}/license-server-db-deployer/v1`,
      );
    }
  },
);

test("License Server provisioner preinstalls only the pinned pgcrypto extension in public", () => {
  const source = fs.readFileSync(
    path.resolve("scripts", "db-addon-deployer-provision.mjs"),
    "utf8",
  );
  assert.match(source, /CREATE EXTENSION pgcrypto WITH SCHEMA public/);
  assert.match(source, /pgcrypto extension schema mismatch/);
  assert.doesNotMatch(source, /CREATE EXTENSION \$\{/);
});

test("addon deployer public control grants are a closed minimal set", () => {
  assert.deepEqual(__addonDeployerProvisionTesting.CONTROL_TABLES, [
    "cms_addon_deployment_candidates",
    "cms_addon_deployment_outbox",
    "cms_addon_deployment_terminal_receipts",
    "cms_addon_installations",
    "cms_addon_migrations",
    "cms_addon_operations",
    "cms_addon_serving_fences",
  ]);
  assert.equal(
    __addonDeployerProvisionTesting.MANAGED_ADDON_DEPLOYER_DESCRIPTORS.webshop
      .entitlementTable,
    "webshop_addon_entitlements",
  );
  assert.equal(
    __addonDeployerProvisionTesting.MANAGED_ADDON_DEPLOYER_DESCRIPTORS[
      "license-server"
    ].entitlementTable,
    "license_server_addon_entitlements",
  );
  const source = fs.readFileSync(
    path.resolve("scripts", "db-addon-deployer-provision.mjs"),
    "utf8",
  );
  assert.match(
    source,
    /GRANT SELECT,UPDATE ON TABLE public\.\$\{quoteIdentifier\(descriptor\.entitlementTable\)\}/,
  );
  assert.match(source, /"--target", "--addon"/);
});

test("addon deployer provisioning revokes cross-database and ambient sequence privileges", () => {
  const source = fs.readFileSync(
    path.resolve("scripts", "db-addon-deployer-provision.mjs"),
    "utf8",
  );
  assert.match(
    source,
    /REVOKE ALL ON DATABASE \$\{quoteIdentifier\(row\.datname\)\} FROM PUBLIC/,
  );
  assert.match(
    source,
    /REVOKE ALL ON DATABASE \$\{quoteIdentifier\(row\.datname\)\} FROM \$\{quoteIdentifier\(deployerRole\)\}/,
  );
  assert.match(
    source,
    /REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM \$\{quoteIdentifier\(deployerRole\)\}/,
  );
  assert.match(source, /has_database_privilege\(\$1,datname,'CONNECT'\)/);
  assert.match(source, /has_schema_privilege\(\$1,'webshop','CREATE'\)/);
});

test("addon deployer sealing isolates Windows PowerShell from the parent module path", () => {
  const source = fs.readFileSync(
    path.resolve("scripts", "db-addon-deployer-provision.mjs"),
    "utf8",
  );
  assert.match(source, /windowsPowerShellChildEnvironment/);
  assert.match(
    source,
    /spawnSync\(powershell,[\s\S]*?env: windowsPowerShellChildEnvironment\(\)/,
  );
});

test("addon deployer DPAPI unseal is bound to the dedicated broker identity and exact ACL", () => {
  const source = fs.readFileSync(
    path.resolve("scripts", "windows-addon-deployer-dpapi.ps1"),
    "utf8",
  );
  assert.match(
    source,
    /addon_deployer_dpapi_unseal_requires_db_broker_identity/,
  );
  assert.match(source, /addon_deployer_dpapi_owner_invalid/);
  assert.match(source, /addon_deployer_dpapi_acl_rule_count_invalid/);
  assert.match(
    source,
    /if \(\$Mode -eq 'unseal'\) \{ Assert-DbBrokerIdentity \} else \{ Assert-Administrator \}/,
  );
});
