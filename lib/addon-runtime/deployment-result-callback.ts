import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  cmsAddonDeploymentOutbox,
  cmsAddonDeploymentResults,
  cmsAddonDeploymentTerminalReceipts,
  cmsAddonInstallations,
  cmsAddonOperations,
} from "@/db/schema";
import { canonicalJson } from "@/lib/vendor-addon-entitlements/activation-v2-contract";
import { deploymentRequestV2Schema, deploymentResultV2Schema, type DeploymentResultV2 } from "@/lib/addon-runtime/deployment-contract-v2";
import { DeployHmacError, sha256Hex, signDeployResponse, verifyDeployRequest } from "@/lib/addon-runtime/deploy-hmac-v2";

type CallbackAck = "applied" | "duplicate" | "stale_installation_ignored" | "stale_epoch_ignored" | "stale_generation_ignored";

export async function receiveDeploymentResultV2(input: { body: Buffer; headers: Headers; method: string; pathname: string }) {
  const auth = verifyDeployRequest({ headers: input.headers, method: input.method, pathname: input.pathname, body: input.body, resolveSecret: resultSecretForKid });
  try {
    const result = deploymentResultV2Schema.parse(JSON.parse(input.body.toString("utf8")));
    const ack = await persistResult(result, `sha256:${sha256Hex(input.body)}`);
    return signedResponse(auth, 200, { version: 2, resultId: result.resultId, operationId: result.operationId, installationDeploymentEpoch: result.installationDeploymentEpoch, generation: result.generation, ack });
  } catch (error) {
    const code = error instanceof CallbackFailure ? error.code : "invalid_result_tuple";
    const status = error instanceof CallbackFailure ? error.status : 400;
    return signedResponse(auth, status, { version: 2, error: { code, message: "deployment result rejected", requestId: auth.requestId, retryable: false } });
  }
}

class CallbackFailure extends Error {
  constructor(readonly code: string, readonly status: 400 | 409 = 400) { super(code); }
}

async function persistResult(result: DeploymentResultV2, bodyHash: string): Promise<CallbackAck> {
  return db.transaction(async (tx) => {
    const existing = (await tx.select().from(cmsAddonDeploymentResults).where(and(eq(cmsAddonDeploymentResults.operationId, result.operationId), eq(cmsAddonDeploymentResults.workerJobId, result.workerJobId))).limit(1))[0];
    if (existing) {
      if (existing.resultId === result.resultId && existing.resultBodyHash === bodyHash && existing.resultStatus === result.status && existing.finalPhase === result.finalPhase && existing.terminalEvidenceHash === result.terminalEvidenceHash) return "duplicate";
      throw new CallbackFailure("result_binding_conflict", 409);
    }
    const sameResultId = (await tx.select().from(cmsAddonDeploymentResults).where(eq(cmsAddonDeploymentResults.resultId, result.resultId)).limit(1))[0];
    if (sameResultId) throw new CallbackFailure("result_binding_conflict", 409);
    const operation = (await tx.select().from(cmsAddonOperations).where(eq(cmsAddonOperations.id, result.operationId)).limit(1))[0];
    const outbox = (await tx.select().from(cmsAddonDeploymentOutbox).where(eq(cmsAddonDeploymentOutbox.operationId, result.operationId)).limit(1))[0];
    if (!operation || !outbox || !outbox.workerJobId) throw new CallbackFailure("historical_operation_not_found");
    if (outbox.workerJobId !== result.workerJobId) throw new CallbackFailure("invalid_result_tuple");
    const request = deploymentRequestV2Schema.safeParse(outbox.payload);
    if (!request.success) throw new CallbackFailure("historical_request_snapshot_invalid");
    assertHistoricalBinding(result, request.data, outbox);
    assertNoMutationEvidence(result, request.data);
    const ownProfile = requiredProfile();
    if (result.targetProfile !== ownProfile || result.environment !== outbox.licenseEnvironment || result.environment !== process.env.NR_LICENSE_ENVIRONMENT?.trim()) throw new CallbackFailure("invalid_result_tuple");
    const installation = (await tx.select().from(cmsAddonInstallations).where(eq(cmsAddonInstallations.addonKey, "webshop")).limit(1))[0];
    const ack = classifyAck(installation, result);
    await tx.insert(cmsAddonDeploymentResults).values({
      resultId: result.resultId, operationId: result.operationId, workerJobId: result.workerJobId, resultBodyHash: bodyHash,
      resultStatus: result.status, finalPhase: result.finalPhase, terminalEvidenceKind: result.terminalEvidenceKind,
      terminalEvidenceHash: result.terminalEvidenceHash, receivedPayload: result, initialAck: ack,
    });
    if (ack !== "applied") return ack;
    await tx.insert(cmsAddonDeploymentTerminalReceipts).values({
      operationId: result.operationId, workerJobId: result.workerJobId, kind: "no_mutation_receipt", evidenceHash: result.terminalEvidenceHash,
      finalTuple: { finalPhase: result.finalPhase, runtimeStatus: result.runtimeStatus, errorClass: result.errorClass, errorCode: result.errorCode },
    }).onConflictDoNothing();
    await tx.update(cmsAddonOperations).set({ status: "failed", errorCode: result.errorCode, completedAt: new Date(), result: { terminalEvidenceHash: result.terminalEvidenceHash, terminalEvidenceKind: result.terminalEvidenceKind, finalPhase: result.finalPhase } }).where(eq(cmsAddonOperations.id, result.operationId));
    await tx.update(cmsAddonDeploymentOutbox).set({ status: "failed", completedAt: new Date(), lastErrorCode: result.errorCode }).where(eq(cmsAddonDeploymentOutbox.operationId, result.operationId));
    await tx.update(cmsAddonInstallations).set({ status: "failed", lastErrorCode: result.errorCode, lastErrorMessage: "Deployment rejected before switch.", version: sql`${cmsAddonInstallations.version} + 1` }).where(and(eq(cmsAddonInstallations.addonKey, "webshop"), eq(cmsAddonInstallations.installationId, result.installationId), eq(cmsAddonInstallations.installationDeploymentEpoch, Number(result.installationDeploymentEpoch))));
    return ack;
  });
}

function assertHistoricalBinding(result: DeploymentResultV2, request: ReturnType<typeof deploymentRequestV2Schema.parse>, outbox: typeof cmsAddonDeploymentOutbox.$inferSelect) {
  const pairs: [unknown, unknown][] = [
    [result.operationId, request.operationId], [result.installationId, request.installationId], [result.installationDeploymentEpoch, request.installationDeploymentEpoch], [result.deploymentIntentKey, request.deploymentIntentKey], [result.generation, request.generation], [result.operationKey, request.operationKey], [result.environment, request.environment], [result.releaseId, request.releaseId], [result.packageName, request.packageName], [result.packageVersion, request.packageVersion],
    [result.artifactSha256, request.artifactSha256], [result.dependencyLockSha256, request.dependencyLockSha256], [result.npmTarballSha256, request.npmTarballSha256], [result.npmTarballIntegrity, request.npmTarballIntegrity], [result.embeddedManifestSha256, request.embeddedManifestSha256], [result.provenanceSha256, request.provenanceSha256], [result.sbomSha256, request.sbomSha256], [result.publicationAttestationHash, request.publicationAttestationHash], [result.registryPackageVersionId, request.registryPackageVersionId],
    [result.sourceReleasedAt, request.sourceReleasedAt], [result.publishedAt, request.publishedAt], [result.releaseSigningKid, request.releaseSigningKid], [result.runtimeContractVersion, request.runtimeContractVersion], [result.cmsVersionRange, request.cmsVersionRange], [result.nodeVersionRange, request.nodeVersionRange], [result.nextVersionRange, request.nextVersionRange], [result.minimumCoreSchemaVersion, request.minimumCoreSchemaVersion], [result.schemaVersion, request.schemaVersion],
    [result.supportedAddonSchemaVersionMin, request.supportedAddonSchemaVersionMin], [result.supportedAddonSchemaVersionMax, request.supportedAddonSchemaVersionMax], [result.migrationBundleHash, request.migrationBundleHash], [result.releaseChannel, request.releaseChannel], [result.entitlementSnapshotHash, request.entitlementSnapshotHash], [result.entitlementLifecycleVersion, request.entitlementLifecycleVersion], [result.entitlementEnvelopeExpiresAt, request.entitlementEnvelopeExpiresAt], [result.observedHostCapabilityDescriptorHash, request.hostCapabilityDescriptorHash],
  ];
  if (pairs.some(([left, right]) => left !== right)) throw new CallbackFailure("invalid_result_tuple");
  if (JSON.stringify(result.supportedLicenseEditions) !== JSON.stringify(request.supportedLicenseEditions) || outbox.installationId !== result.installationId || String(outbox.installationDeploymentEpoch) !== result.installationDeploymentEpoch || outbox.generation !== result.generation || outbox.operationKey !== result.operationKey || outbox.deploymentIntentKey !== result.deploymentIntentKey) throw new CallbackFailure("invalid_result_tuple");
}
function assertNoMutationEvidence(result: DeploymentResultV2, request: ReturnType<typeof deploymentRequestV2Schema.parse>) {
  if (result.status !== "failed" || result.finalPhase !== "rejected_before_switch" || result.runtimeStatus !== "not_installed" || result.terminalEvidenceKind !== "no_mutation_receipt" || result.migrationLedgerHash !== null || result.buildId !== null || result.activeReleaseId !== null || result.observedServicePointerReleaseId !== null) throw new CallbackFailure("invalid_result_tuple");
  if (`sha256:${sha256Hex(canonicalJson(result.noMutationEvidence))}` !== result.terminalEvidenceHash) throw new CallbackFailure("invalid_result_tuple");
  const evidence = result.noMutationEvidence;
  if (evidence.operationId !== request.operationId || evidence.workerJobId !== result.workerJobId || evidence.targetProfile !== result.targetProfile || evidence.installationId !== request.installationId || evidence.installationDeploymentEpoch !== request.installationDeploymentEpoch || evidence.generation !== request.generation || evidence.releaseId !== request.releaseId || evidence.preOperationServingStateHash !== request.preOperationServingStateHash || evidence.preOperationMigrationLedgerHash !== request.preOperationMigrationLedgerHash) throw new CallbackFailure("invalid_result_tuple");
}
function classifyAck(installation: typeof cmsAddonInstallations.$inferSelect | undefined, result: DeploymentResultV2): Exclude<CallbackAck, "duplicate"> {
  if (!installation || installation.installationId !== result.installationId) return "stale_installation_ignored";
  if (installation.installationDeploymentEpoch > Number(result.installationDeploymentEpoch)) return "stale_epoch_ignored";
  if (installation.installationDeploymentEpoch < Number(result.installationDeploymentEpoch)) throw new CallbackFailure("invalid_result_tuple");
  if (installation.deploymentJobId !== result.workerJobId) return "stale_generation_ignored";
  return "applied";
}
function resultSecretForKid(kid: string) {
  const activeKid = process.env.WEBSHOP_DEPLOYMENT_RESULT_AUTH_KID?.trim(); const activeSecret = process.env.WEBSHOP_DEPLOYMENT_RESULT_AUTH_SECRET?.trim();
  if (activeKid === kid && activeSecret) return activeSecret;
  const old = process.env.WEBSHOP_DEPLOYMENT_RESULT_AUTH_OLD_SECRETS_JSON?.trim() || "{}";
  try { const parsed: unknown = JSON.parse(old); if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) { const value = (parsed as Record<string, unknown>)[kid]; return typeof value === "string" && value.length >= 16 ? value : undefined; } } catch { return undefined; }
  return undefined;
}
function requiredProfile() { const value = process.env.NR_CMS_DEPLOYMENT_PROFILE?.trim(); if (value !== "vendor" && value !== "client") throw new CallbackFailure("invalid_result_tuple"); return value; }
function signedResponse(auth: { kid: string; requestId: string; secret: string }, status: number, value: unknown) {
  const body = Buffer.from(canonicalJson(value), "utf8");
  return { status, body, headers: { "Content-Type": "application/json", ...signDeployResponse({ secret: auth.secret, kid: auth.kid, requestId: auth.requestId, status, body }) } };
}

export function deploymentResultErrorResponse(error: unknown) {
  const code = error instanceof DeployHmacError ? error.code : "invalid_auth";
  return { status: error instanceof DeployHmacError ? error.status : 401, body: Buffer.from(canonicalJson({ version: 2, error: { code, message: "deployment result rejected", requestId: null, retryable: false } }), "utf8") };
}
