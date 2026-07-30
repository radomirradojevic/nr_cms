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
  assert.deepEqual(
    parseVendorAddonEntitlementPublicKeys({
      keys: [
        {
          alg: "EdDSA",
          kid: "vendor-2026",
          kty: "OKP",
          pem,
          use: "sig",
        },
      ],
    }),
    { "vendor-2026": pem },
  );
  assert.throws(() =>
    parseVendorAddonEntitlementPublicKeys({
      keys: [
        {
          alg: "EdDSA",
          kid: "vendor-2026",
          kty: "OKP",
          pem,
          use: "sig",
        },
        {
          alg: "EdDSA",
          kid: "vendor-2026",
          kty: "OKP",
          pem,
          use: "sig",
        },
      ],
    }),
  );
});
