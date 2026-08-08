import assert from "node:assert/strict";
import test from "node:test";

import { evaluateWebshopPublicServingGateV1 } from "@/lib/addon-runtime/serving-gate";

const tuple = {
  entitlementValid: true,
  activeServingFenceCount: 0,
  runtime: { releaseId: "11111111-1111-4111-8111-111111111111", buildId: "build-1", artifactSha256: "a".repeat(64) },
  installation: { status: "ready", runtimeStatus: "ready", installedReleaseId: "11111111-1111-4111-8111-111111111111", installedBuildId: "build-1", installedArtifactSha256: "a".repeat(64) },
  terminalReceipt: { kind: "reconciliation_receipt", finalTuple: { runtimeStatus: "ready", activeReleaseId: "11111111-1111-4111-8111-111111111111", buildId: "build-1", artifactSha256: "a".repeat(64) } },
};

test("public runtime gate requires exact loaded/promoted tuple, terminal receipt, and zero active fences", () => {
  assert.deepEqual(evaluateWebshopPublicServingGateV1(tuple), { ok: true });
  assert.deepEqual(evaluateWebshopPublicServingGateV1({ ...tuple, activeServingFenceCount: 1 }), { ok: false, reason: "serving_fence_active" });
  assert.deepEqual(evaluateWebshopPublicServingGateV1({ ...tuple, runtime: { ...tuple.runtime, buildId: "other" } }), { ok: false, reason: "loaded_tuple_mismatch" });
  assert.deepEqual(evaluateWebshopPublicServingGateV1({ ...tuple, terminalReceipt: null }), { ok: false, reason: "terminal_receipt_missing" });
});
