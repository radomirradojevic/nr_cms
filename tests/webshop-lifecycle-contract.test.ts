import assert from "node:assert/strict";
import test from "node:test";

import {
  lifecycleCoreHash,
  lifecycleStatusClaimsSchema,
} from "@/lib/webshop-addon/lifecycle-contract";
import { deploymentRequestV2Schema } from "@/lib/addon-runtime/deployment-contract-v2";

const HASH = (char: string) => `sha256:${char.repeat(64)}`;

test("deployment fencing accepts the initial lifecycle version and rejects negative versions", () => {
  const schema = deploymentRequestV2Schema.shape.entitlementLifecycleVersion;
  assert.equal(schema.safeParse(0).success, true);
  assert.equal(schema.safeParse(1).success, true);
  assert.equal(schema.safeParse(-1).success, false);
});

test("CMS verifier shares frozen lifecycle result-core hashes", () => {
  assert.equal(
    lifecycleCoreHash({
      contractVersion: 1,
      purpose: "addon_lifecycle_result_core",
      lifecycleAction: "deactivate",
      operationId: "11111111-1111-4111-8111-111111111111",
      activationId: "22222222-2222-4222-8222-222222222222",
      activationStatus: "deactivated",
      slotReleased: true,
      lifecycleVersion: 2,
      deactivatedAt: "2026-07-31T12:00:00.000Z",
    }),
    "sha256:02dd22e6f473a77a90640f74311ba1f4d2db4961624f00b68012dd2034a0097f",
  );
  assert.equal(
    lifecycleCoreHash({
      contractVersion: 1,
      purpose: "addon_lifecycle_result_core",
      lifecycleAction: "transfer_source_complete",
      operationId: "33333333-3333-4333-8333-333333333333",
      transferId: "44444444-4444-4444-8444-444444444444",
      status: "completed",
      sourceActivationId: "55555555-5555-4555-8555-555555555555",
      sourceActivationStatus: "transferred",
      targetActivationId: "66666666-6666-4666-8666-666666666666",
      targetActivationStatus: "active",
      oldCanonicalDomain: "old.example.com",
      newCanonicalDomain: "new.example.com",
      lifecycleVersion: 2,
      completedAt: "2026-07-31T12:05:00.000Z",
    }),
    "sha256:c9d1208383c306a9817055011748eec82c356c7b5bc2575bbb5e23bcd4caba02",
  );
});

test("CMS rejects an impossible signed lifecycle-status tuple before local state changes", () => {
  const value = {
    contractVersion: 1, tokenUse: "addon_lifecycle_status", purpose: "original_operation_recovery",
    iss: "https://license-server.nrcms.com", aud: "nr-cms-addon-runtime", jti: "77777777-7777-4777-8777-777777777777",
    iat: 1785499200, nbf: 1785499200, exp: 1785499500, lifecycleOperationId: "33333333-3333-4333-8333-333333333333",
    lifecycleAction: "transfer_source_complete", lifecycleRequestBodyHash: HASH("a"), operationOutcome: "not_committed", resultBodyHash: null,
    activationId: "55555555-5555-4555-8555-555555555555", entitlementId: "66666666-6666-4666-8666-666666666666", addonKey: "webshop",
    installationId: "11111111-1111-4111-8111-111111111111", sourceCanonicalDomain: "old.example.com", licenseCanonicalDomain: "old.example.com",
    preLifecycleVersion: 1, currentLifecycleVersion: 1, activationStatus: "active", licenseStatus: "active", transferId: "44444444-4444-4444-8444-444444444444",
    targetActivationId: null, targetInstallationId: "22222222-2222-4222-8222-222222222222", targetCanonicalDomain: "new.example.com", targetActivationStatus: null,
  } as const;
  assert.equal(lifecycleStatusClaimsSchema.safeParse(value).success, true);
  assert.equal(lifecycleStatusClaimsSchema.safeParse({ ...value, resultBodyHash: HASH("b") }).success, false);
  assert.equal(lifecycleStatusClaimsSchema.safeParse({ ...value, targetActivationStatus: "active" }).success, false);
  assert.equal(lifecycleStatusClaimsSchema.safeParse({ ...value, activationStatus: "transferred" }).success, false);
});
