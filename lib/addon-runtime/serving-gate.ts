/** Pure P10 serving gate. A loaded package is never public merely because its
 * entitlement says ready: it must equal the fenced/promoted runtime tuple. */
export type WebshopServingGateInputV1 = {
  entitlementValid: boolean;
  activeServingFenceCount: number;
  runtime: { releaseId: string | null; buildId: string | null; artifactSha256: string | null };
  installation: { status: string; runtimeStatus: string; installedReleaseId: string | null; installedBuildId: string | null; installedArtifactSha256: string | null } | null;
  terminalReceipt: { kind: string; finalTuple: unknown } | null;
};

export function evaluateWebshopPublicServingGateV1(input: WebshopServingGateInputV1): { ok: true } | { ok: false; reason: string } {
  if (!input.entitlementValid) return { ok: false, reason: "entitlement_not_valid" };
  if (input.activeServingFenceCount !== 0) return { ok: false, reason: "serving_fence_active" };
  if (!input.installation || input.installation.status !== "ready" || input.installation.runtimeStatus !== "ready") return { ok: false, reason: "installation_not_ready" };
  const { runtime, installation } = input;
  if (!runtime.releaseId || !runtime.buildId || !runtime.artifactSha256 || runtime.releaseId !== installation.installedReleaseId || runtime.buildId !== installation.installedBuildId || runtime.artifactSha256 !== installation.installedArtifactSha256) return { ok: false, reason: "loaded_tuple_mismatch" };
  if (!input.terminalReceipt || !["reconciliation_receipt", "recovery_receipt"].includes(input.terminalReceipt.kind)) return { ok: false, reason: "terminal_receipt_missing" };
  const tuple = input.terminalReceipt.finalTuple;
  if (!tuple || typeof tuple !== "object" || Array.isArray(tuple)) return { ok: false, reason: "terminal_receipt_invalid" };
  const record = tuple as Record<string, unknown>;
  if (record.runtimeStatus !== "ready" || record.activeReleaseId !== runtime.releaseId || record.buildId !== runtime.buildId || record.artifactSha256 !== runtime.artifactSha256) return { ok: false, reason: "terminal_receipt_tuple_mismatch" };
  return { ok: true };
}
