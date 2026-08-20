import { z } from "zod";

import { requireManagedAddonDeploymentDescriptor } from "@/lib/addon-runtime/addon-descriptors";

const uuid = z.string().uuid().regex(/^[0-9a-f-]+$/);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const hashRef = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const epoch = z.string().regex(/^[1-9][0-9]{0,18}$/).refine((value) => BigInt(value) <= BigInt("9223372036854775807"), "installation_epoch_out_of_range");
const timestamp = z.string().datetime({ offset: true });
const semver = z.string().regex(/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/);
const entitlementLifecycleVersion = z.number().int().nonnegative();

export const deploymentRequestV2Schema = z.object({
  version: z.literal(2), operationId: uuid, installationDeploymentEpoch: epoch,
  deploymentIntentKey: z.string().min(1).max(500), generation: z.number().int().min(1).max(2_147_483_647), supersedesOperationId: uuid.nullable(), operationKey: z.string().min(1).max(500),
  addonKey: z.enum(["webshop", "license-server"]), environment: z.enum(["development", "staging", "production"]), installationId: uuid,
  releaseId: uuid, packageName: z.enum(["@radomirradojevic/webshop", "@nr-cms/license-server"]), packageVersion: semver,
  artifactSha256: hash, dependencyLockSha256: hash, npmTarballSha256: hash, npmTarballIntegrity: z.string().regex(/^sha512-[A-Za-z0-9+/]+={0,2}$/),
  embeddedManifestSha256: hash, provenanceSha256: hash, sbomSha256: hash, publicationAttestationHash: hash, registryPackageVersionId: z.string().regex(/^[1-9][0-9]*$/),
  sourceReleasedAt: timestamp, publishedAt: timestamp, releaseSigningKid: z.string().min(1), runtimeContractVersion: z.literal("1"),
  cmsVersionRange: z.string().min(1), nodeVersionRange: z.string().min(1), nextVersionRange: z.string().min(1), minimumCoreSchemaVersion: z.number().int().min(1), schemaVersion: z.number().int().min(1),
  supportedAddonSchemaVersionMin: z.number().int().min(1), supportedAddonSchemaVersionMax: z.number().int().min(1), migrationBundleHash: hash,
  supportedLicenseEditions: z.tuple([z.literal("standard")]), releaseChannel: z.literal("stable"), hostCapabilityDescriptorHash: hashRef,
  entitlementSnapshotHash: hashRef, entitlementLifecycleVersion, entitlementEnvelopeExpiresAt: timestamp,
  preOperationServingStateHash: hashRef, preOperationMigrationLedgerHash: hashRef,
}).strict().superRefine((value, ctx) => {
  if ((value.generation === 1) !== (value.supersedesOperationId === null)) ctx.addIssue({ code: "custom", message: "supersedes_operation_lineage_invalid", path: ["supersedesOperationId"] });
  try { requireManagedAddonDeploymentDescriptor(value.addonKey, value.packageName); }
  catch { ctx.addIssue({ code: "custom", message: "managed_addon_descriptor_mismatch", path: ["packageName"] }); }
});
export type DeploymentRequestV2 = z.infer<typeof deploymentRequestV2Schema>;

export const noMutationTerminalEvidenceV1Schema = z.object({
  contractVersion: z.literal(1), purpose: z.literal("addon_deployment_no_mutation"), operationId: uuid, workerJobId: uuid,
  targetProfile: z.enum(["vendor", "client", "paypal"]), installationId: uuid, installationDeploymentEpoch: epoch, generation: z.number().int().positive(), releaseId: uuid,
  preOperationServingStateHash: hashRef, preOperationMigrationLedgerHash: hashRef, cmsControlPlanePhase: z.enum(["install_pending", "installed", "migration_pending"]),
  addonSchemaMutationStarted: z.literal(false), serviceMutationStarted: z.literal(false), pointerMutationStarted: z.literal(false),
  observedActiveReleaseId: uuid.nullable(), observedServicePointerReleaseId: uuid.nullable(), lastCompletedWorkerPhase: z.enum(["accepted", "source_exported", "root_verified", "cache_verified", "offline_installed", "built", "db_preflight"]),
}).strict();

const deploymentResultBaseV2Schema = z.object({
  version: z.literal(2), resultId: uuid, operationId: uuid, installationId: uuid, installationDeploymentEpoch: epoch,
  deploymentIntentKey: z.string().min(1), generation: z.number().int().positive(), operationKey: z.string().min(1), workerJobId: uuid,
  targetProfile: z.enum(["vendor", "client", "paypal"]), environment: z.enum(["development", "staging", "production"]), status: z.literal("failed"), finalPhase: z.literal("rejected_before_switch"), runtimeStatus: z.literal("not_installed"),
  releaseId: uuid, packageName: z.enum(["@radomirradojevic/webshop", "@nr-cms/license-server"]), packageVersion: semver, npmTarballSha256: hash, npmTarballIntegrity: z.string().regex(/^sha512-[A-Za-z0-9+/]+={0,2}$/),
  artifactSha256: hash, dependencyLockSha256: hash, embeddedManifestSha256: hash, provenanceSha256: hash, sbomSha256: hash, publicationAttestationHash: hash,
  registryPackageVersionId: z.string().regex(/^[1-9][0-9]*$/), sourceReleasedAt: timestamp, publishedAt: timestamp, releaseSigningKid: z.string().min(1), runtimeContractVersion: z.literal("1"),
  cmsVersionRange: z.string().min(1), nodeVersionRange: z.string().min(1), nextVersionRange: z.string().min(1), minimumCoreSchemaVersion: z.number().int().min(1), schemaVersion: z.number().int().min(1),
  supportedAddonSchemaVersionMin: z.number().int().min(1), supportedAddonSchemaVersionMax: z.number().int().min(1), migrationBundleHash: hash, supportedLicenseEditions: z.tuple([z.literal("standard")]), releaseChannel: z.literal("stable"),
  entitlementSnapshotHash: hashRef, entitlementLifecycleVersion, entitlementEnvelopeExpiresAt: timestamp,
  activeReleaseId: uuid.nullable(), activeArtifactSha256: hash.nullable(), observedServicePointerReleaseId: uuid.nullable(), cmsCommitSha: z.string().regex(/^[a-f0-9]{40}$/), observedHostCapabilityDescriptorHash: hashRef,
  terminalEvidenceHash: hashRef, occurredAt: timestamp,
}).strict();

/** P10 terminal result contract. Mutation/recovery receipts are written by the
 * DB-phase owner. A strictly pre-mutation result may atomically create its
 * receipt in the authenticated callback after proving there is no fence or
 * candidate row for the operation. */
export const deploymentResultV2Schema = z.discriminatedUnion("terminalEvidenceKind", [
  deploymentResultBaseV2Schema.extend({
    status: z.literal("failed"), finalPhase: z.literal("rejected_before_switch"), runtimeStatus: z.enum(["ready", "not_installed"]),
    buildId: z.string().min(1).max(200).nullable(), migrationLedgerHash: z.null(), terminalEvidenceKind: z.literal("no_mutation_receipt"), noMutationEvidence: noMutationTerminalEvidenceV1Schema,
    errorClass: z.enum(["retryable", "permanent", "incident"]), errorCode: z.string().regex(/^[a-z0-9_]+$/), activeReleaseId: uuid.nullable(), activeArtifactSha256: hash.nullable(), observedServicePointerReleaseId: uuid.nullable(),
  }),
  deploymentResultBaseV2Schema.extend({
    status: z.literal("succeeded"), finalPhase: z.literal("ready"), runtimeStatus: z.literal("ready"),
    buildId: z.string().min(1).max(200), migrationLedgerHash: hashRef, terminalEvidenceKind: z.literal("reconciliation_receipt"), noMutationEvidence: z.null(),
    errorClass: z.null(), errorCode: z.null(), activeReleaseId: uuid, activeArtifactSha256: hash, observedServicePointerReleaseId: uuid,
  }),
  deploymentResultBaseV2Schema.extend({
    status: z.literal("failed"), finalPhase: z.enum(["rolled_back", "maintenance_required", "rollback_failed"]), runtimeStatus: z.enum(["ready", "maintenance", "unavailable"]),
    buildId: z.string().min(1).max(200).nullable(), migrationLedgerHash: hashRef, terminalEvidenceKind: z.literal("recovery_receipt"), noMutationEvidence: z.null(),
    errorClass: z.enum(["retryable", "permanent", "incident"]), errorCode: z.string().regex(/^[a-z0-9_]+$/), activeReleaseId: uuid.nullable(), activeArtifactSha256: hash.nullable(), observedServicePointerReleaseId: uuid.nullable(),
  }),
]).superRefine((value, context) => {
  try { requireManagedAddonDeploymentDescriptor(value.packageName === "@nr-cms/license-server" ? "license-server" : "webshop", value.packageName); }
  catch { context.addIssue({ code: "custom", message: "managed_addon_descriptor_mismatch", path: ["packageName"] }); }
  if (value.terminalEvidenceKind === "no_mutation_receipt") {
    const servingPrevious = value.runtimeStatus === "ready";
    if (servingPrevious !== (value.activeReleaseId !== null) || servingPrevious !== (value.activeArtifactSha256 !== null) || servingPrevious !== (value.buildId !== null) || value.observedServicePointerReleaseId !== value.activeReleaseId || value.noMutationEvidence.observedActiveReleaseId !== value.activeReleaseId || value.noMutationEvidence.observedServicePointerReleaseId !== value.observedServicePointerReleaseId) context.addIssue({ code: "custom", message: "no_mutation_result_tuple_invalid" });
  }
  if (value.terminalEvidenceKind === "reconciliation_receipt" && (value.activeArtifactSha256 !== value.artifactSha256 || value.activeReleaseId !== value.releaseId || value.observedServicePointerReleaseId !== value.releaseId)) context.addIssue({ code: "custom", message: "ready_result_tuple_invalid" });
  if (value.terminalEvidenceKind === "recovery_receipt") {
    const expectedRuntime = value.finalPhase === "rolled_back" ? "ready" : value.finalPhase === "maintenance_required" ? "maintenance" : "unavailable";
    if (value.runtimeStatus !== expectedRuntime) context.addIssue({ code: "custom", message: "recovery_runtime_status_invalid" });
    if (value.finalPhase === "rolled_back") {
      if (!value.activeReleaseId || !value.activeArtifactSha256 || value.observedServicePointerReleaseId !== value.activeReleaseId || !value.buildId) context.addIssue({ code: "custom", message: "rolled_back_result_tuple_invalid" });
    } else if (value.activeReleaseId !== null || value.activeArtifactSha256 !== null || value.errorClass !== "incident" || !value.buildId) context.addIssue({ code: "custom", message: "restricted_recovery_result_tuple_invalid" });
  }
});
export type DeploymentResultV2 = z.infer<typeof deploymentResultV2Schema>;
