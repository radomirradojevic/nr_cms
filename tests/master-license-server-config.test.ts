import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";

import {
  DEFAULT_MASTER_LICENSE_SERVER_URL,
  getMasterLicenseServerUrl,
  masterLicenseServerUrl,
} from "@/lib/master-license-server";
import { parseVendorAddonEntitlementPublicKeys } from "@/lib/vendor-addon-entitlements/public-keys";

test("one master URL config serves every paid add-on", () => {
  assert.equal(getMasterLicenseServerUrl({}), DEFAULT_MASTER_LICENSE_SERVER_URL);
  assert.equal(
    getMasterLicenseServerUrl({
      NR_MASTER_LICENSE_URL: "http://localhost:3001/",
    }),
    "http://localhost:3001",
  );
  assert.equal(
    masterLicenseServerUrl("/api/addons/licenses/activate", {
      NR_MASTER_LICENSE_URL: "https://ls.example.test/",
    }),
    "https://ls.example.test/api/addons/licenses/activate",
  );
});

test("master public-key discovery accepts only unique Ed25519 signing keys", () => {
  const { publicKey } = generateKeyPairSync("ed25519");
  const pem = publicKey
    .export({ format: "pem", type: "spki" })
    .toString();
  const key = {
    alg: "EdDSA" as const,
    kid: "vendor-2026",
    notAfter: null,
    notBefore: "2020-01-01T00:00:00.000Z",
    publicKeyPem: pem,
    status: "active" as const,
  };
  const keyset = {
    contractVersion: 1 as const,
    generatedAt: "2026-08-03T00:00:00.000Z",
    issuer: "https://license-server.nrcms.com" as const,
    keys: [key],
    previousKeysetSha256: null,
    purpose: "addon_entitlement" as const,
    sequence: 1,
  };
  assert.deepEqual(
    parseVendorAddonEntitlementPublicKeys(keyset),
    { "vendor-2026": pem },
  );
  assert.throws(() =>
    parseVendorAddonEntitlementPublicKeys({
      ...keyset,
      keys: [key, key],
    }),
  );
});
