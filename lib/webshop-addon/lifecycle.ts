import "server-only";

import { createHash, createHmac, randomUUID } from "node:crypto";

import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  cmsAddonDeploymentOutbox,
  cmsAddonInstallations,
  cmsAddonLifecycleOperations,
  cmsAddonLifecycleReceipts,
  cmsAddonOperations,
  cmsAddonTransferPreparations,
  webshopAddonEntitlements,
} from "@/db/schema";
import { getMasterLicenseServerUrl } from "@/lib/master-license-server";
import { isExplicitlyAllowedLoopbackHttpUrl, safeFetch } from "@/lib/security/outbound-url";
import { getOrCreateVendorAddonInstallationIdentity, signVendorAddonActivationPayload } from "@/lib/vendor-addon-installation";
import { getVendorAddonEntitlementPublicKeys } from "@/lib/vendor-addon-entitlements/public-keys";
import {
  lifecycleCoreHash,
  lifecycleRequestHash,
  verifyLifecycleReceipt,
  verifyLifecycleStatus,
} from "@/lib/webshop-addon/lifecycle-contract";
import { parseStrictJson } from "@/lib/webshop-addon/lifecycle-strict-json";

const ADDON_KEY = "webshop";
const challengeSchema = z.object({ contractVersion: z.literal(1), action: z.literal("challenge"), operationId: z.string().uuid(), challengeId: z.string().uuid(), proofPayload: z.string().regex(/^[A-Za-z0-9_-]+$/), expiresAt: z.string().datetime() }).strict();
const deactivationResultSchema = z.object({ contractVersion: z.literal(1), action: z.literal("complete"), operationId: z.string().uuid(), activationId: z.string().uuid(), activationStatus: z.literal("deactivated"), slotReleased: z.literal(true), lifecycleVersion: z.number().int().positive(), deactivatedAt: z.string().datetime(), resultBodyHash: z.string().regex(/^sha256:[a-f0-9]{64}$/), signedLifecycleReceipt: z.string().min(1) }).strict();
const transferPrepareResponseSchema = z.object({ contractVersion: z.literal(1), action: z.literal("prepare"), transferId: z.string().uuid(), status: z.literal("requested"), targetChallenge: z.object({ challengeId: z.string().uuid(), proofPayload: z.string().regex(/^[A-Za-z0-9_-]+$/), expiresAt: z.string().datetime() }).strict(), transferExpiresAt: z.string().datetime() }).strict();
const transferTargetResultSchema = z.object({ contractVersion: z.literal(1), action: z.literal("target_complete"), transferId: z.string().uuid(), status: z.literal("target_proved"), sourceApprovalDerivationKid: z.string().regex(/^[A-Za-z0-9._-]{1,100}$/), sourceApprovalRequired: z.literal(true), sourceApprovalCodeExpiresAt: z.string().datetime(), transferExpiresAt: z.string().datetime() }).strict();
const transferSourceChallengeResponseSchema = z.object({ contractVersion: z.literal(1), action: z.literal("source_challenge"), transferId: z.string().uuid(), status: z.literal("target_proved"), sourceChallenge: z.object({ challengeId: z.string().uuid(), operationId: z.string().uuid(), proofPayload: z.string().regex(/^[A-Za-z0-9_-]+$/), expiresAt: z.string().datetime() }).strict() }).strict();
const transferResultSchema = z.object({ contractVersion: z.literal(1), action: z.literal("source_complete"), operationId: z.string().uuid(), transferId: z.string().uuid(), status: z.literal("completed"), sourceActivationId: z.string().uuid(), sourceActivationStatus: z.literal("transferred"), targetActivationId: z.string().uuid(), targetActivationStatus: z.literal("active"), oldCanonicalDomain: z.string().min(1), newCanonicalDomain: z.string().min(1), lifecycleVersion: z.number().int().positive(), completedAt: z.string().datetime(), resultBodyHash: z.string().regex(/^sha256:[a-f0-9]{64}$/), signedSourceLifecycleReceipt: z.string().min(1), signedTargetLifecycleReceipt: z.string().min(1) }).strict();
const statusChallengeSchema = z.object({ contractVersion: z.literal(1), action: z.literal("challenge"), requestId: z.string().uuid(), lifecycleOperationId: z.string().uuid(), statusChallengeId: z.string().uuid(), proofPayload: z.string().regex(/^[A-Za-z0-9_-]+$/), expiresAt: z.string().datetime() }).strict();
const statusResponseSchema = z.object({ contractVersion: z.literal(1), action: z.literal("complete"), requestId: z.string().uuid(), lifecycleOperationId: z.string().uuid(), signedLifecycleStatus: z.string().min(1) }).strict();

/**
 * The public challenge envelope is deliberately closed by the V1 contract.
 * Its opaque proof payload carries the persisted complete cutoff, so recovery
 * never guesses a local timeout after a response loss.
 */
function originalCompleteCutoff(proofPayload: string, challengeExpiresAt: string) {
  try {
    const value = parseStrictJson(Buffer.from(proofPayload, "base64url"), "Lifecycle challenge payload");
    const parsed = z.object({ originalCompleteAcceptUntil: z.string().datetime() }).passthrough().parse(value);
    const cutoff = new Date(parsed.originalCompleteAcceptUntil);
    const challengeExpiry = new Date(challengeExpiresAt);
    if (!Number.isFinite(cutoff.getTime()) || cutoff <= challengeExpiry) throw new Error("invalid cutoff");
    return cutoff;
  } catch {
    throw new Error("Master lifecycle challenge does not contain a valid original complete cutoff.");
  }
}

type LifecycleRow = typeof cmsAddonLifecycleOperations.$inferSelect;

/**
 * The local database is fenced before the master complete request.  A timeout
 * therefore keeps the add-on restricted and can only be resolved by the same
 * frozen request or the dedicated status protocol.
 */
export async function deactivateWebshopAddon(input: { reason: "customer_request" | "site_retired" }) {
  const context = await currentLifecycleContext();
  if (!context.ok) return context;
  const requestId = randomUUID();
  const challenge = await lifecycleFetch("/api/addons/licenses/deactivate", {
    contractVersion: 1, action: "challenge", requestId, activationId: context.activationId,
    installationId: context.identity.installationId, canonicalDomain: context.canonicalDomain, reason: input.reason,
  });
  if (!challenge.ok) return challenge;
  const parsedChallenge = challengeSchema.safeParse(challenge.value);
  if (!parsedChallenge.success) return localFailure("Master returned an invalid lifecycle challenge.");
  const completeBody = { contractVersion: 1 as const, action: "complete" as const, operationId: parsedChallenge.data.operationId, challengeId: parsedChallenge.data.challengeId, proofSignature: signVendorAddonActivationPayload(context.identity, Buffer.from(parsedChallenge.data.proofPayload, "base64url").toString("utf8")) };
  const persisted = await persistLifecycleFinalization({
    activationId: context.activationId, canonicalDomain: context.canonicalDomain, entitlementId: context.entitlementId,
    installationId: context.identity.installationId, lifecycleAction: "deactivate", receiptRole: "deactivation",
    masterChallengeId: parsedChallenge.data.challengeId, masterProofPayload: parsedChallenge.data.proofPayload,
    operationId: parsedChallenge.data.operationId, originalCompleteAcceptUntil: originalCompleteCutoff(parsedChallenge.data.proofPayload, parsedChallenge.data.expiresAt),
    preLifecycleVersion: context.preLifecycleVersion, finalRequestBody: completeBody,
  });
  if (!persisted.ok) return persisted;
  return attemptLocalLifecycleCompletion(parsedChallenge.data.operationId);
}

/** Target half: the derived approval code is returned only in memory for a no-store UI. */
export async function prepareWebshopDomainTransfer(input: {
  licenseKey: string;
  sourceActivationId: string;
  targetCanonicalDomain: string;
}) {
  const identity = await getOrCreateVendorAddonInstallationIdentity({ canonicalDomain: input.targetCanonicalDomain, deploymentMode: "self_hosted" });
  const requestId = randomUUID();
  const prepared = await lifecycleFetch("/api/addons/licenses/transfer", {
    contractVersion: 1, action: "prepare", requestId, licenseKey: input.licenseKey,
    sourceActivationId: input.sourceActivationId, targetCanonicalDomain: input.targetCanonicalDomain,
    targetInstallationId: identity.installationId, targetInstallationPublicKey: identity.installationPublicKey,
    targetInstallationKeyFingerprint: identity.installationKeyFingerprint,
  });
  if (!prepared.ok) return prepared;
  const response = transferPrepareResponseSchema.safeParse(prepared.value);
  if (!response.success) return localFailure("Master returned an invalid transfer preparation.");
  await db.insert(cmsAddonTransferPreparations).values({
    transferId: response.data.transferId, sourceActivationId: input.sourceActivationId,
    sourceCanonicalDomain: null, targetCanonicalDomain: input.targetCanonicalDomain,
    targetInstallationId: identity.installationId, targetInstallationKeyFingerprint: identity.installationKeyFingerprint,
    targetChallengeId: response.data.targetChallenge.challengeId, expiresAt: new Date(response.data.transferExpiresAt),
  }).onConflictDoNothing();
  const derivation = transferApprovalDerivation({ transferId: response.data.transferId, targetInstallationId: identity.installationId, targetCanonicalDomain: input.targetCanonicalDomain });
  const complete = await lifecycleFetch("/api/addons/licenses/transfer", {
    contractVersion: 1, action: "target_complete", requestId: randomUUID(), transferId: response.data.transferId,
    challengeId: response.data.targetChallenge.challengeId,
    proofSignature: signVendorAddonActivationPayload(identity, Buffer.from(response.data.targetChallenge.proofPayload, "base64url").toString("utf8")),
    sourceApprovalDerivationKid: derivation.kid,
    approvalBindingSignature: signVendorAddonActivationPayload(identity, `NRV-ADDON-TRANSFER-APPROVAL-BINDING-V1\n${response.data.transferId}\n${response.data.targetChallenge.challengeId}\n${derivation.kid}\n${derivation.hash}`),
    sourceApprovalCodeHash: derivation.hash,
  });
  if (!complete.ok) return complete;
  const targetResult = transferTargetResultSchema.safeParse(complete.value);
  if (!targetResult.success || targetResult.data.transferId !== response.data.transferId || targetResult.data.sourceApprovalDerivationKid !== derivation.kid) return localFailure("Master returned an invalid transfer target proof result.");
  await db.update(cmsAddonTransferPreparations).set({ status: "target_proved", sourceApprovalDerivationKid: derivation.kid, sourceApprovalCodeHash: derivation.hash, expiresAt: new Date(targetResult.data.transferExpiresAt) }).where(eq(cmsAddonTransferPreparations.transferId, response.data.transferId));
  return { ok: true as const, sourceApprovalCode: derivation.code, transferId: response.data.transferId, expiresAt: targetResult.data.sourceApprovalCodeExpiresAt };
}

/** Source half: code validation is exact; this function never trims or decodes it. */
export async function completeWebshopDomainTransferFromSource(input: { transferId: string; sourceApprovalCode: string }) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(input.sourceApprovalCode)) return localFailure("Source approval code must be exactly 43 base64url characters.");
  const context = await currentLifecycleContext();
  if (!context.ok) return context;
  const challenge = await lifecycleFetch("/api/addons/licenses/transfer", {
    contractVersion: 1, action: "source_challenge", requestId: randomUUID(), transferId: input.transferId,
    sourceApprovalCode: input.sourceApprovalCode, sourceInstallationId: context.identity.installationId,
  });
  if (!challenge.ok) return challenge;
  const response = transferSourceChallengeResponseSchema.safeParse(challenge.value);
  if (!response.success || response.data.transferId !== input.transferId) return localFailure("Master returned an invalid source transfer challenge.");
  const completeBody = {
    contractVersion: 1 as const, action: "source_complete" as const, requestId: randomUUID(),
    operationId: response.data.sourceChallenge.operationId, transferId: input.transferId,
    challengeId: response.data.sourceChallenge.challengeId,
    proofSignature: signVendorAddonActivationPayload(context.identity, Buffer.from(response.data.sourceChallenge.proofPayload, "base64url").toString("utf8")),
  };
  const persisted = await persistLifecycleFinalization({
    operationId: response.data.sourceChallenge.operationId, lifecycleAction: "transfer_source_complete", receiptRole: "transfer_source",
    activationId: context.activationId, entitlementId: context.entitlementId, installationId: context.identity.installationId,
    canonicalDomain: context.canonicalDomain, transferId: input.transferId, preLifecycleVersion: context.preLifecycleVersion,
    finalRequestBody: completeBody, masterChallengeId: response.data.sourceChallenge.challengeId,
    masterProofPayload: response.data.sourceChallenge.proofPayload, originalCompleteAcceptUntil: originalCompleteCutoff(response.data.sourceChallenge.proofPayload, response.data.sourceChallenge.expiresAt),
  });
  if (!persisted.ok) return persisted;
  return attemptLocalLifecycleCompletion(response.data.sourceChallenge.operationId);
}

export async function attemptLocalLifecycleCompletion(operationId: string) {
  const operation = await lifecycleOperation(operationId);
  if (!operation) return localFailure("Lifecycle operation was not found.");
  if (operation.state === "committed") return { ok: true as const, state: "committed" as const };
  const finalRequestBody = asRecord(operation.finalRequestBody);
  if (Object.keys(finalRequestBody).length === 0) return localFailure("Lifecycle operation is missing its frozen final request body.");
  const response = await lifecycleFetch(
    operation.lifecycleAction === "deactivate" ? "/api/addons/licenses/deactivate" : "/api/addons/licenses/transfer",
    finalRequestBody,
  );
  if (!response.ok) return response;
  if (operation.lifecycleAction === "deactivate") {
    const parsed = deactivationResultSchema.safeParse(response.value);
    if (!parsed.success) return localFailure("Master returned an invalid lifecycle result.");
    return applyDeactivationResult(operation, parsed.data);
  }
  const parsed = transferResultSchema.safeParse(response.value);
  if (!parsed.success) return localFailure("Master returned an invalid transfer lifecycle result.");
  return applyTransferResult(operation, parsed.data);
}

/** Only valid receipt loss/expiry recovery; never an ordinary revalidation fallback. */
export async function recoverLocalLifecycleOperation(operationId: string) {
  const operation = await lifecycleOperation(operationId);
  if (!operation || operation.state !== "lifecycle_finalization_pending") return localFailure("Lifecycle operation is not pending recovery.");
  const identity = await getOrCreateVendorAddonInstallationIdentity({ canonicalDomain: operation.canonicalDomain, deploymentMode: "self_hosted" });
  if (identity.installationId !== operation.installationId) return localFailure("Lifecycle recovery installation identity does not match the pending operation.");
  const requestId = randomUUID();
  const challengeBody = {
    contractVersion: 1, action: "challenge", requestId, lifecycleOperationId: operation.id,
    lifecycleAction: operation.lifecycleAction, activationId: operation.activationId, installationId: operation.installationId,
    lifecycleRequestBodyHash: operation.finalRequestBodyHash, preLifecycleVersion: operation.preLifecycleVersion,
    transferId: operation.transferId,
  };
  const challenge = await lifecycleFetch("/api/addons/licenses/lifecycle-status", challengeBody);
  if (!challenge.ok) return challenge;
  const parsedChallenge = statusChallengeSchema.safeParse(challenge.value);
  if (!parsedChallenge.success || parsedChallenge.data.lifecycleOperationId !== operation.id) return localFailure("Master returned an invalid lifecycle recovery challenge.");
  const completeBody = { contractVersion: 1, action: "complete", requestId, lifecycleOperationId: operation.id, statusChallengeId: parsedChallenge.data.statusChallengeId, proofSignature: signVendorAddonActivationPayload(identity, Buffer.from(parsedChallenge.data.proofPayload, "base64url").toString("utf8")) };
  const complete = await lifecycleFetch("/api/addons/licenses/lifecycle-status", completeBody);
  if (!complete.ok) return complete;
  const parsed = statusResponseSchema.safeParse(complete.value);
  if (!parsed.success || parsed.data.lifecycleOperationId !== operation.id) return localFailure("Master returned an invalid lifecycle recovery result.");
  try {
    const keys = await getVendorAddonEntitlementPublicKeys({ forceRefresh: true });
    const verified = verifyLifecycleStatus({ token: parsed.data.signedLifecycleStatus, publicKeysByKid: keys, expected: { activationId: operation.activationId, lifecycleAction: operation.lifecycleAction as "deactivate" | "transfer_source_complete", lifecycleOperationId: operation.id, lifecycleRequestBodyHash: operation.finalRequestBodyHash, installationId: operation.installationId, preLifecycleVersion: operation.preLifecycleVersion } });
    if (verified.claims.operationOutcome === "in_progress") return { ok: true as const, state: "restricted" as const };
    if (verified.claims.operationOutcome === "not_committed") {
      await restoreNotCommittedLifecycleOperation(operation);
      return { ok: true as const, state: "not_committed" as const };
    }
    await finalizeCommittedLifecycleStatus(operation, verified.claims);
    return { ok: true as const, state: "committed" as const };
  } catch {
    return localFailure("Lifecycle recovery signature or tuple verification failed.");
  }
}

async function currentLifecycleContext() {
  const [entitlement, installation] = await Promise.all([
    db.select().from(webshopAddonEntitlements).where(eq(webshopAddonEntitlements.id, 1)).limit(1),
    db.select().from(cmsAddonInstallations).where(eq(cmsAddonInstallations.addonKey, ADDON_KEY)).limit(1),
  ]);
  const row = entitlement[0]; const install = installation[0];
  if (!row?.installationId || !row.installationKeyFingerprint || !row.signedEntitlement || !install) return localFailure("A verified active Webshop entitlement is required for lifecycle finalization.");
  const claims = asRecord(row.verifiedClaims);
  const activationId = typeof claims.activationId === "string" ? claims.activationId : null;
  const entitlementId = typeof claims.entitlementId === "string" ? claims.entitlementId : null;
  const lifecycleVersion = typeof claims.lifecycleVersion === "number" && Number.isSafeInteger(claims.lifecycleVersion) ? claims.lifecycleVersion : null;
  if (!activationId || !entitlementId || lifecycleVersion === null || row.status !== "ready" || install.runtimeStatus !== "ready") return localFailure("Webshop is not in a lifecycle-eligible serving state.");
  const canonicalDomain = expectedDomain();
  const identity = await getOrCreateVendorAddonInstallationIdentity({ canonicalDomain, deploymentMode: "self_hosted" });
  if (identity.installationId !== row.installationId || identity.installationKeyFingerprint !== row.installationKeyFingerprint) return localFailure("Installation identity does not match the stored entitlement.");
  return { ok: true as const, activationId, canonicalDomain, entitlementId, identity, preLifecycleVersion: lifecycleVersion };
}

async function persistLifecycleFinalization(input: {
  operationId: string; lifecycleAction: "deactivate" | "transfer_source_complete"; receiptRole: "deactivation" | "transfer_source" | "transfer_target";
  activationId: string; entitlementId: string; installationId: string; canonicalDomain: string; transferId?: string | null;
  targetInstallationId?: string | null; targetCanonicalDomain?: string | null; preLifecycleVersion: number;
  finalRequestBody: Record<string, unknown>; masterChallengeId: string; masterProofPayload: string; originalCompleteAcceptUntil: Date;
}) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`${ADDON_KEY}:${input.installationId}:lifecycle`}))`);
    const existing = (await tx.select().from(cmsAddonLifecycleOperations).where(eq(cmsAddonLifecycleOperations.id, input.operationId)).limit(1))[0];
    const finalRequestBodyHash = lifecycleRequestHash(input.finalRequestBody);
    if (existing) {
      if (existing.finalRequestBodyHash !== finalRequestBodyHash) return localFailure("Master lifecycle operation ID conflicts with a different final request.");
      return { ok: true as const };
    }
    await tx.insert(cmsAddonLifecycleOperations).values({ id: input.operationId, addonKey: ADDON_KEY, lifecycleAction: input.lifecycleAction, receiptRole: input.receiptRole, activationId: input.activationId, entitlementId: input.entitlementId, installationId: input.installationId, canonicalDomain: input.canonicalDomain, transferId: input.transferId ?? null, targetInstallationId: input.targetInstallationId ?? null, targetCanonicalDomain: input.targetCanonicalDomain ?? null, preLifecycleVersion: input.preLifecycleVersion, finalRequestBodyHash, finalRequestBody: input.finalRequestBody, masterChallengeId: input.masterChallengeId, masterProofPayload: input.masterProofPayload, originalCompleteAcceptUntil: input.originalCompleteAcceptUntil });
    await tx.update(webshopAddonEntitlements).set({ status: "lifecycle_finalization_pending", lastErrorCode: "lifecycle_finalization_pending", updatedBy: "system:lifecycle" }).where(eq(webshopAddonEntitlements.id, 1));
    await tx.update(cmsAddonInstallations).set({ status: "disabled", runtimeStatus: "maintenance", lastErrorCode: "lifecycle_finalization_pending", lastErrorMessage: null }).where(eq(cmsAddonInstallations.addonKey, ADDON_KEY));
    await tx.update(cmsAddonOperations).set({ status: "superseded", completedAt: new Date(), errorCode: "superseded_by_lifecycle_finalization" }).where(and(eq(cmsAddonOperations.addonKey, ADDON_KEY), inArray(cmsAddonOperations.status, ["pending", "running"])));
    await tx.update(cmsAddonDeploymentOutbox).set({ status: "superseded", completedAt: new Date(), lastErrorCode: "superseded_by_lifecycle_finalization" }).where(and(eq(cmsAddonDeploymentOutbox.addonKey, ADDON_KEY), inArray(cmsAddonDeploymentOutbox.status, ["pending", "sending", "retry", "accepted"])));
    return { ok: true as const };
  });
}

async function applyDeactivationResult(operation: LifecycleRow, result: z.infer<typeof deactivationResultSchema>) {
  if (result.operationId !== operation.id || result.activationId !== operation.activationId || result.lifecycleVersion !== operation.preLifecycleVersion + 1) return localFailure("Master deactivation result does not match the frozen local operation.");
  const core = { contractVersion: 1, purpose: "addon_lifecycle_result_core", lifecycleAction: "deactivate", operationId: result.operationId, activationId: result.activationId, activationStatus: result.activationStatus, slotReleased: result.slotReleased, lifecycleVersion: result.lifecycleVersion, deactivatedAt: result.deactivatedAt };
  if (lifecycleCoreHash(core) !== result.resultBodyHash) return localFailure("Master deactivation result core hash is invalid.");
  try {
    const keys = await getVendorAddonEntitlementPublicKeys({ forceRefresh: true });
    const verified = verifyLifecycleReceipt({ token: result.signedLifecycleReceipt, publicKeysByKid: keys, expected: { canonicalDomain: operation.canonicalDomain, entitlementId: operation.entitlementId, installationId: operation.installationId, role: "deactivation", resultBodyHash: result.resultBodyHash } });
    const claims = verified.claims;
    if (claims.receiptRole !== "deactivation" || claims.operationId !== operation.id || claims.activationId !== result.activationId || claims.activationStatus !== result.activationStatus || claims.lifecycleVersion !== result.lifecycleVersion || claims.deactivatedAt !== result.deactivatedAt || claims.slotReleased !== true) return localFailure("Lifecycle receipt does not exactly project the deactivation result core.");
    await db.transaction(async (tx) => {
      await tx.update(cmsAddonLifecycleOperations).set({ state: "committed", resultBodyHash: result.resultBodyHash, receiptCompact: result.signedLifecycleReceipt, receiptJti: claims.jti, receiptExpiresAt: new Date(claims.exp * 1000), completedAt: new Date() }).where(and(eq(cmsAddonLifecycleOperations.id, operation.id), eq(cmsAddonLifecycleOperations.state, "lifecycle_finalization_pending")));
      await tx.insert(cmsAddonLifecycleReceipts).values({ lifecycleOperationId: operation.id, receiptRole: "deactivation", jti: claims.jti, compactHash: verified.compactHash, resultBodyHash: result.resultBodyHash, expiresAt: new Date(claims.exp * 1000) }).onConflictDoNothing();
      await tx.update(webshopAddonEntitlements).set({ status: "deactivated", lifecycleVersion: result.lifecycleVersion, lastCentralStatus: "deactivated", lastErrorCode: null, updatedBy: "system:lifecycle" }).where(eq(webshopAddonEntitlements.id, 1));
      await tx.update(cmsAddonInstallations).set({ status: "disabled", runtimeStatus: "maintenance", lastErrorCode: "deactivated", lastErrorMessage: null }).where(eq(cmsAddonInstallations.addonKey, ADDON_KEY));
    });
    return { ok: true as const, state: "committed" as const };
  } catch {
    return localFailure("Lifecycle receipt signature or identity verification failed.");
  }
}

async function applyTransferResult(operation: LifecycleRow, result: z.infer<typeof transferResultSchema>) {
  if (result.operationId !== operation.id || result.transferId !== operation.transferId || result.sourceActivationId !== operation.activationId || result.lifecycleVersion !== operation.preLifecycleVersion + 1 || result.sourceActivationStatus !== "transferred") return localFailure("Master transfer result does not match the frozen local operation.");
  const core = { contractVersion: 1, purpose: "addon_lifecycle_result_core", lifecycleAction: "transfer_source_complete", operationId: result.operationId, transferId: result.transferId, status: "completed", sourceActivationId: result.sourceActivationId, sourceActivationStatus: result.sourceActivationStatus, targetActivationId: result.targetActivationId, targetActivationStatus: result.targetActivationStatus, oldCanonicalDomain: result.oldCanonicalDomain, newCanonicalDomain: result.newCanonicalDomain, lifecycleVersion: result.lifecycleVersion, completedAt: result.completedAt };
  if (lifecycleCoreHash(core) !== result.resultBodyHash) return localFailure("Master transfer result core hash is invalid.");
  try {
    const keys = await getVendorAddonEntitlementPublicKeys({ forceRefresh: true });
    const source = verifyLifecycleReceipt({ token: result.signedSourceLifecycleReceipt, publicKeysByKid: keys, expected: { canonicalDomain: operation.canonicalDomain, entitlementId: operation.entitlementId, installationId: operation.installationId, role: "transfer_source", resultBodyHash: result.resultBodyHash } });
    if (source.claims.receiptRole !== "transfer_source") return localFailure("Source lifecycle receipt role is invalid.");
    const target = verifyLifecycleReceipt({ token: result.signedTargetLifecycleReceipt, publicKeysByKid: keys, expected: { entitlementId: operation.entitlementId, installationId: source.claims.targetInstallationId, role: "transfer_target", resultBodyHash: result.resultBodyHash } });
    // The source can validate all target business claims but must never apply a
    // target-role receipt to its own installation identity.
    if (target.claims.receiptRole !== "transfer_target" || source.claims.jti === target.claims.jti || source.claims.resultBodyHash !== target.claims.resultBodyHash || source.claims.operationId !== target.claims.operationId || source.claims.transferId !== target.claims.transferId) return localFailure("Transfer receipt pair is not a single immutable operation revision.");
    await db.transaction(async (tx) => {
      await tx.update(cmsAddonLifecycleOperations).set({ state: "committed", resultBodyHash: result.resultBodyHash, receiptCompact: result.signedSourceLifecycleReceipt, receiptJti: source.claims.jti, receiptExpiresAt: new Date(source.claims.exp * 1000), completedAt: new Date() }).where(and(eq(cmsAddonLifecycleOperations.id, operation.id), eq(cmsAddonLifecycleOperations.state, "lifecycle_finalization_pending")));
      await tx.insert(cmsAddonLifecycleReceipts).values({ lifecycleOperationId: operation.id, receiptRole: "transfer_source", jti: source.claims.jti, compactHash: source.compactHash, resultBodyHash: result.resultBodyHash, expiresAt: new Date(source.claims.exp * 1000) }).onConflictDoNothing();
      await tx.update(webshopAddonEntitlements).set({ status: "transferred", lifecycleVersion: result.lifecycleVersion, lastCentralStatus: "transferred", lastErrorCode: null, updatedBy: "system:lifecycle" }).where(eq(webshopAddonEntitlements.id, 1));
      await tx.update(cmsAddonInstallations).set({ status: "disabled", runtimeStatus: "maintenance", lastErrorCode: "transferred", lastErrorMessage: null }).where(eq(cmsAddonInstallations.addonKey, ADDON_KEY));
    });
    return { ok: true as const, state: "committed" as const };
  } catch {
    return localFailure("Transfer lifecycle receipt verification failed.");
  }
}

async function restoreNotCommittedLifecycleOperation(operation: LifecycleRow) {
  await db.transaction(async (tx) => {
    await tx.update(cmsAddonLifecycleOperations).set({ state: "not_committed", completedAt: new Date() }).where(eq(cmsAddonLifecycleOperations.id, operation.id));
    await tx.update(webshopAddonEntitlements).set({ status: "ready", lastErrorCode: null, updatedBy: "system:lifecycle_recovery" }).where(eq(webshopAddonEntitlements.id, 1));
    await tx.update(cmsAddonInstallations).set({ status: "ready", runtimeStatus: "ready", lastErrorCode: null, lastErrorMessage: null }).where(eq(cmsAddonInstallations.addonKey, ADDON_KEY));
  });
}
async function finalizeCommittedLifecycleStatus(operation: LifecycleRow, claims: ReturnType<typeof verifyLifecycleStatus>["claims"]) {
  const terminal = operation.lifecycleAction === "deactivate" ? "deactivated" : "transferred";
  if (claims.activationStatus !== terminal || claims.currentLifecycleVersion !== operation.preLifecycleVersion + 1 || !claims.resultBodyHash) throw new Error("Committed lifecycle status tuple is invalid.");
  await db.transaction(async (tx) => {
    await tx.update(cmsAddonLifecycleOperations).set({ state: "committed", resultBodyHash: claims.resultBodyHash, completedAt: new Date() }).where(eq(cmsAddonLifecycleOperations.id, operation.id));
    await tx.update(webshopAddonEntitlements).set({ status: terminal, lifecycleVersion: claims.currentLifecycleVersion, lastCentralStatus: terminal, lastErrorCode: null, updatedBy: "system:lifecycle_recovery" }).where(eq(webshopAddonEntitlements.id, 1));
    await tx.update(cmsAddonInstallations).set({ status: "disabled", runtimeStatus: "maintenance", lastErrorCode: terminal, lastErrorMessage: null }).where(eq(cmsAddonInstallations.addonKey, ADDON_KEY));
  });
}
async function lifecycleOperation(id: string) { return (await db.select().from(cmsAddonLifecycleOperations).where(eq(cmsAddonLifecycleOperations.id, id)).limit(1))[0] ?? null; }
async function lifecycleFetch(path: string, body: Record<string, unknown>): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  try {
    const base = getMasterLicenseServerUrl();
    const response = await safeFetch(`${base.replace(/\/+$/, "")}${path}`, { allowFirstParty: true, allowLocalHttp: isExplicitlyAllowedLoopbackHttpUrl(base), allowSelfHosted: true, body: JSON.stringify(body), headers: { "content-type": "application/json" }, method: "POST", purpose: "Webshop lifecycle operation", timeoutMs: 10_000 });
    if (!response.ok) return localFailure("Master lifecycle operation was rejected or is unavailable.");
    return { ok: true, value: JSON.parse(await response.text()) };
  } catch { return localFailure("Master lifecycle operation is temporarily unavailable."); }
}
function expectedDomain() { return process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? "unknown"; }
function transferApprovalDerivation(input: { transferId: string; targetInstallationId: string; targetCanonicalDomain: string }) {
  const secret = process.env.NR_ADDON_TRANSFER_APPROVAL_SECRET?.trim();
  const kid = process.env.NR_ADDON_TRANSFER_APPROVAL_KID?.trim();
  if (!secret || secret.length < 32 || !kid || !/^[A-Za-z0-9._-]{1,100}$/.test(kid)) throw new Error("Transfer approval derivation secret and KID are not configured.");
  const bytes = `NR-ADDON-TRANSFER-SOURCE-APPROVAL-V1\n${input.transferId}\n${input.targetInstallationId}\n${input.targetCanonicalDomain}`;
  const code = createHmac("sha256", secret).update(bytes, "utf8").digest("base64url");
  if (!/^[A-Za-z0-9_-]{43}$/.test(code)) throw new Error("Transfer approval derivation did not produce the required code format.");
  return { code, hash: `sha256:${createHash("sha256").update(code, "utf8").digest("hex")}`, kid };
}
function asRecord(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function localFailure(error: string) { return { ok: false as const, error }; }
