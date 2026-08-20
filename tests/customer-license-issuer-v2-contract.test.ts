import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  isCustomerLicenseIssuerCapabilityV2,
  type CustomerLicenseIssuerCapabilityV2,
  type OperationResultV2,
} from "@nr-cms/addon-sdk/customer-license-issuer-v2";
import {
  isLicenseServerAddon,
  type LicenseServerAddon,
} from "@/lib/license-server-addon/contract";
import { loadCustomerLicenseIssuerCapabilityV2 } from "@/lib/license-server-addon/loader";
import { resolveCustomerLicenseIssuerCapabilityV2FromState } from "@/lib/license-server-addon/customer-issuer-capability";

const receipt = {
  assertion: "header.payload.signature",
  claimSchema: {
    hash: "sha256:fixture",
    id: "desktop-claims",
    version: "2.0.0",
  },
  expiresAt: null,
  id: "receipt-1",
  issuedAt: "2026-08-15T12:00:00.000Z",
  issuerRef: "cms-fixture",
  licenseKey: "NRLS-FIXTURE-REVEAL-ONCE",
  licenseKeyMasked: "NRLS-****-ONCE",
  licenseId: "license-1",
  profile: { revision: 7, sku: "desktop-pro" },
} as const;

const succeededOperation = {
  contractVersion: "2",
  operation: {
    id: "operation-1",
    receipt,
    status: "succeeded",
  },
} as const satisfies OperationResultV2;

const capability: CustomerLicenseIssuerCapabilityV2 = {
  contractVersion: "2",
  async catalog() {
    return {
      contractVersion: "2",
      etag: '"catalog-1"',
      revision: 1,
      status: "not_modified",
    };
  },
  async describe() {
    return {
      algorithms: ["EdDSA"],
      apiVersions: ["1", "2"],
      assertionTypes: ["NRC-CUSTOMER-LICENSE+JWT"],
      contractVersion: "2",
      environment: "test",
      issuer: "urn:nrc:customer:cms-fixture",
      issuerRef: "cms-fixture",
      keysetRevision: 1,
      keysetUrl: "/api/license-server/v2/keys",
      status: "active",
    };
  },
  async enqueueIssue() {
    return succeededOperation;
  },
  async enqueueLifecycle() {
    return succeededOperation;
  },
  async getOperation() {
    return succeededOperation;
  },
};

function addon(
  overrides: Partial<LicenseServerAddon> = {},
): LicenseServerAddon {
  return {
    version: "0.1.0",
    async renderDashboard() {
      return null;
    },
    async renderDashboardPath() {
      return null;
    },
    ...overrides,
  };
}

test("customer issuer V2 guard accepts only the complete versioned method shape", () => {
  assert.equal(isCustomerLicenseIssuerCapabilityV2(capability), true);
  assert.equal(isCustomerLicenseIssuerCapabilityV2(null), false);
  assert.equal(
    isCustomerLicenseIssuerCapabilityV2({
      ...capability,
      contractVersion: "1",
    }),
    false,
  );
  assert.equal(
    isCustomerLicenseIssuerCapabilityV2({
      ...capability,
      getOperation: undefined,
    }),
    false,
  );
  assert.equal(
    isCustomerLicenseIssuerCapabilityV2({
      ...capability,
      enqueueLifecycle: "not-a-function",
    }),
    false,
  );
});

test("License Server host contract rejects malformed scheduler job exports", () => {
  assert.equal(
    isLicenseServerAddon({
      ...addon(),
      jobs: { customerLicenseIssuerOperations: "not-a-function" },
    }),
    false,
  );
  assert.equal(
    isLicenseServerAddon({
      ...addon(),
      jobs: { customerLicenseIssuerOperations: async () => ({}) },
    }),
    true,
  );
});

test("loader reports exact V2 availability without a silent V1 fallback", async () => {
  assert.deepEqual(
    await loadCustomerLicenseIssuerCapabilityV2("license-server", () => null),
    {
      reason: "addon_not_installed",
      requestedContractVersion: "2",
      status: "unavailable",
    },
  );

  assert.deepEqual(
    await loadCustomerLicenseIssuerCapabilityV2(
      "license-server",
      () => async () =>
        addon({
          customerLicenseIssuer: {
            contractVersion: "1",
            async enqueueIssue() {
              return { accepted: true, operationId: "legacy-operation" };
            },
          },
        }),
    ),
    {
      availableContractVersions: ["1"],
      reason: "v2_not_exported",
      requestedContractVersion: "2",
      status: "unavailable",
    },
  );

  const available = await loadCustomerLicenseIssuerCapabilityV2(
    "license-server",
    () => async () => addon({ customerLicenseIssuerV2: capability }),
  );
  assert.equal(available.status, "available");
  if (available.status === "available") {
    assert.equal(available.capability, capability);
  }

  const malformed = await loadCustomerLicenseIssuerCapabilityV2(
    "license-server",
    () => async () => ({
      ...addon(),
      customerLicenseIssuerV2: {
        contractVersion: "2",
        describe: async () => ({}),
      },
    }),
  );
  assert.equal(malformed.status, "unavailable");
  if (malformed.status === "unavailable") {
    assert.equal(malformed.reason, "addon_invalid");
  }
});

test("local and remote adapters preserve the same operation and receipt model", async () => {
  const localResult = await capability.getOperation({
    contractVersion: "2",
    operationId: "operation-1",
  });
  const remoteResult = JSON.parse(
    JSON.stringify(succeededOperation),
  ) as OperationResultV2;

  assert.deepEqual(localResult, succeededOperation);
  assert.deepEqual(remoteResult, succeededOperation);
  assert.deepEqual(localResult, remoteResult);
});

test("entitlement-aware local bridge fails closed outside ready mode", () => {
  assert.deepEqual(
    resolveCustomerLicenseIssuerCapabilityV2FromState({
      addon: addon({ customerLicenseIssuerV2: capability }),
      expiresAt: "2026-08-16T00:00:00.000Z",
      mode: "edit_existing_only",
      status: "license_expired",
    }),
    {
      addonState: "edit_existing_only",
      reason: "addon_not_ready",
      requestedContractVersion: "2",
      status: "unavailable",
    },
  );
  assert.deepEqual(
    resolveCustomerLicenseIssuerCapabilityV2FromState({
      status: "install_pending",
    }),
    {
      addonState: "install_pending",
      reason: "addon_not_ready",
      requestedContractVersion: "2",
      status: "unavailable",
    },
  );
  assert.deepEqual(
    resolveCustomerLicenseIssuerCapabilityV2FromState({
      status: "not_installed",
    }),
    {
      reason: "addon_not_installed",
      requestedContractVersion: "2",
      status: "unavailable",
    },
  );
  const ready = resolveCustomerLicenseIssuerCapabilityV2FromState({
    addon: addon({ customerLicenseIssuerV2: capability }),
    status: "ready",
  });
  assert.equal(ready.status, "available");
});

test("V1 export remains frozen while V2 has its own package subpath", () => {
  const packageJson = JSON.parse(
    readFileSync(
      resolve(process.cwd(), "packages/addon-sdk/package.json"),
      "utf8",
    ),
  ) as { exports: Record<string, string> };

  assert.equal(
    packageJson.exports["./customer-license-issuer"],
    "./src/customer-license-issuer-v1.ts",
  );
  assert.equal(
    packageJson.exports["./customer-license-issuer-v2"],
    "./src/customer-license-issuer-v2.ts",
  );
});

test("public customer issuer boundary has no private, database, or Master coupling", () => {
  const files = [
    "packages/addon-sdk/src/customer-license-issuer-v2.ts",
    "lib/license-server-addon/contract.ts",
    "lib/license-server-addon/loader.ts",
    "lib/license-server-addon/customer-issuer-capability.ts",
  ];

  for (const file of files) {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");
    const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
      (match) => match[1] ?? "",
    );

    for (const importPath of imports) {
      assert.doesNotMatch(importPath, /(?:^|\/)\.private(?:\/|$)/, file);
      assert.doesNotMatch(
        importPath,
        /(?:^|\/)(?:db|database|drizzle-orm|pg|postgres)(?:\/|$)/,
        file,
      );
      assert.doesNotMatch(
        importPath,
        /(?:master-license|vendor-license-server|\.private\/license-server)/,
        file,
      );
    }
  }

  const sdkSource = readFileSync(
    resolve(
      process.cwd(),
      "packages/addon-sdk/src/customer-license-issuer-v2.ts",
    ),
    "utf8",
  );
  assert.doesNotMatch(sdkSource, /^import\s/m);
  assert.doesNotMatch(sdkSource, /CustomerLicenseIssuerCapabilityV1/);

  const runtimeBridgeSource = [
    "lib/license-server-addon/loader.ts",
    "lib/license-server-addon/customer-issuer-capability.ts",
  ]
    .map((file) => readFileSync(resolve(process.cwd(), file), "utf8"))
    .join("\n");
  assert.doesNotMatch(runtimeBridgeSource, /\bfetch\s*\(/);
});
