import { createHash, randomUUID } from "node:crypto";

import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  cmsAddonDeploymentOutbox,
  cmsAddonInstallations,
  cmsAddonMigrations,
  cmsAddonOperations,
  webshopAddonEntitlements,
} from "@/db/schema";
import {
  canonicalJson,
  type AddonEntitlementClaimsV2,
} from "@/lib/vendor-addon-entitlements/activation-v2-contract";
import { deploymentRequestV2Schema } from "@/lib/addon-runtime/deployment-contract-v2";

const ADDON_KEY = "webshop";
const OPERATION_TYPE = "deployment_v3";

export async function persistVerifiedWebshopActivation(input: {
  claim: AddonEntitlementClaimsV2 & { signingKid: string };
  signedEntitlement: string;
  updatedBy: string;
}) {
  const snapshotHash = sha256(input.signedEntitlement);
  const targetProfile = requiredDeploymentProfile();
  const release = input.claim.release;
  const entitlementValues = (
    status: "install_pending" | "ready",
  ) => ({
    status,
    licenseKeyRef: input.claim.entitlementId.slice(0, 16),
    entitlementToken: input.signedEntitlement,
    signedEntitlement: input.signedEntitlement,
    signingKid: input.claim.signingKid,
    verifiedClaims: redactedClaims(input.claim),
    lastVerifiedAt: new Date(),
    lastRevalidationAttemptAt: new Date(),
    lastRevalidationSuccessAt: new Date(),
    nextRevalidationAt: new Date(input.claim.nextRevalidationAt),
    graceEndsAt: nullableDate(input.claim.graceEndsAt),
    lastCentralStatus: input.claim.licenseStatus,
    lastErrorCode: null,
    lifecycleVersion: input.claim.lifecycleVersion,
    releaseId: release.releaseId,
    licenseEnvironment: input.claim.environment,
    licenseValidUntil: nullableDate(input.claim.licenseValidUntil),
    entitlementEnvelopeExpiresAt: new Date(input.claim.exp * 1000),
    entitlementSnapshotHash: snapshotHash,
    installationId: input.claim.installationId,
    installationKeyFingerprint: input.claim.installationKeyFingerprint,
    packageName: release.packageName,
    packageVersion: release.packageVersion,
    packageInstalledAt: status === "ready" ? new Date() : null,
    features: input.claim.features,
    metadata: {},
    updatedBy: input.updatedBy,
  });
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`${ADDON_KEY}:${input.claim.installationId}`}))`,
    );
    const existing = (
      await tx
        .select()
        .from(cmsAddonInstallations)
        .where(eq(cmsAddonInstallations.addonKey, ADDON_KEY))
        .limit(1)
    )[0];
    if (
      existing &&
      existing.installationId !== input.claim.installationId
    ) {
      throw new Error(
        "A different installation identity already owns the Webshop control plane; audited transfer is required.",
      );
    }
    // An exact legacy-public schema result is a permanent terminal result for
    // its epoch.  A new JWS snapshot alone must not turn it into a retry (or a
    // generation+1): only a newly attested host-capability descriptor opens a
    // new intent after the separately authorized schema cutover.
    if (
      existing &&
      existing.desiredHostCapabilityDescriptorHash === input.claim.hostCapabilityDescriptorHash
    ) {
      const legacyTerminal = (
        await tx
          .select()
          .from(cmsAddonOperations)
          .where(
            and(
              eq(cmsAddonOperations.addonKey, ADDON_KEY),
              eq(cmsAddonOperations.installationId, input.claim.installationId),
              eq(cmsAddonOperations.installationDeploymentEpoch, existing.installationDeploymentEpoch),
              eq(cmsAddonOperations.generation, 1),
              eq(cmsAddonOperations.status, "failed"),
              eq(cmsAddonOperations.errorCode, "operator_schema_cutover_required"),
            ),
          )
          .limit(1)
      )[0];
      if (legacyTerminal) {
        return {
          operationId: legacyTerminal.id,
          operationKey: legacyTerminal.operationKey,
          status: "operator_schema_cutover_required" as const,
          reused: true as const,
          terminal: true as const,
        };
      }
    }
    const alreadyServingExactRelease = Boolean(
      existing &&
        existing.status === "ready" &&
        existing.runtimeStatus === "ready" &&
        existing.desiredReleaseId === release.releaseId &&
        existing.desiredArtifactSha256 === release.artifactSha256 &&
        existing.installedReleaseId === release.releaseId &&
        existing.installedArtifactSha256 === release.artifactSha256 &&
        existing.installedPackageName === release.packageName &&
        existing.installedPackageVersion === release.packageVersion &&
        existing.runtimeContractVersion === release.runtimeContractVersion &&
        existing.schemaVersion === release.schemaVersion &&
        existing.installedHostCapabilityDescriptorHash ===
          input.claim.hostCapabilityDescriptorHash &&
        existing.entitlementLifecycleVersion === input.claim.lifecycleVersion,
    );
    if (alreadyServingExactRelease) {
      const completedOperation = (
        await tx
          .select()
          .from(cmsAddonOperations)
          .where(
            and(
              eq(cmsAddonOperations.addonKey, ADDON_KEY),
              eq(
                cmsAddonOperations.installationId,
                input.claim.installationId,
              ),
              eq(
                cmsAddonOperations.installationDeploymentEpoch,
                existing!.installationDeploymentEpoch,
              ),
              eq(cmsAddonOperations.generation, 1),
              eq(cmsAddonOperations.status, "completed"),
            ),
          )
          .limit(1)
      )[0];
      if (!completedOperation) {
        throw new Error(
          "Ready Webshop installation is missing its completed deployment operation.",
        );
      }
      const refreshedEntitlement = entitlementValues("ready");
      await tx
        .insert(webshopAddonEntitlements)
        .values({ id: 1, ...refreshedEntitlement })
        .onConflictDoUpdate({
          target: webshopAddonEntitlements.id,
          set: refreshedEntitlement,
        });
      const refreshed = await tx
        .update(cmsAddonInstallations)
        .set({
          entitlementSnapshotHash: snapshotHash,
          entitlementLifecycleVersion: input.claim.lifecycleVersion,
          entitlementEnvelopeExpiresAt: new Date(input.claim.exp * 1000),
          version: existing!.version + 1,
        })
        .where(
          and(
            eq(cmsAddonInstallations.addonKey, ADDON_KEY),
            eq(
              cmsAddonInstallations.installationId,
              input.claim.installationId,
            ),
            eq(
              cmsAddonInstallations.installationDeploymentEpoch,
              existing!.installationDeploymentEpoch,
            ),
            eq(cmsAddonInstallations.status, "ready"),
            eq(cmsAddonInstallations.runtimeStatus, "ready"),
          ),
        )
        .returning({ addonKey: cmsAddonInstallations.addonKey });
      if (refreshed.length !== 1) {
        throw new Error("Ready Webshop entitlement refresh lost its CAS.");
      }
      return {
        operationId: completedOperation.id,
        operationKey: completedOperation.operationKey,
        status: "ready" as const,
        reused: true as const,
        terminal: true as const,
      };
    }
    const sameDesired = Boolean(
      existing &&
        existing.desiredReleaseId === input.claim.release.releaseId &&
        existing.entitlementSnapshotHash === snapshotHash &&
        existing.entitlementLifecycleVersion === input.claim.lifecycleVersion &&
        existing.desiredHostCapabilityDescriptorHash ===
          input.claim.hostCapabilityDescriptorHash,
    );
    const epoch = sameDesired
      ? existing!.installationDeploymentEpoch
      : (existing?.installationDeploymentEpoch ?? BigInt(0)) + BigInt(1);
    if (epoch < BigInt(1) || epoch > BigInt("9223372036854775807")) {
      throw new Error("Installation deployment epoch is invalid.");
    }
    const deploymentIntentKey = `addon-deploy-intent:v3:${input.claim.installationId}:${epoch}:${input.claim.release.releaseId}`;
    const operationKey = `addon-deploy:v3:${input.claim.installationId}:${epoch}:${input.claim.release.releaseId}:1`;
    const active =
      existing && sameDesired
        ? (
            await tx
              .select()
              .from(cmsAddonOperations)
              .where(
                and(
                  eq(cmsAddonOperations.addonKey, ADDON_KEY),
                  eq(cmsAddonOperations.operationKey, operationKey),
                ),
              )
              .limit(1)
          )[0]
        : null;
    if (active && ["pending", "running"].includes(active.status)) {
      return {
        operationId: active.id,
        operationKey,
        status: "install_pending" as const,
        reused: true as const,
      };
    }
    if (existing && !sameDesired) {
      await tx
        .update(cmsAddonOperations)
        .set({
          status: "superseded",
          completedAt: new Date(),
          errorCode: "superseded_by_new_desired_state",
        })
        .where(
          and(
            eq(cmsAddonOperations.addonKey, ADDON_KEY),
            inArray(cmsAddonOperations.status, ["pending", "running"]),
          ),
        );
      await tx
        .update(cmsAddonDeploymentOutbox)
        .set({
          status: "superseded",
          completedAt: new Date(),
          lastErrorCode: "superseded_by_new_desired_state",
        })
        .where(
          and(
            eq(cmsAddonDeploymentOutbox.addonKey, ADDON_KEY),
            inArray(cmsAddonDeploymentOutbox.status, [
              "pending",
              "sending",
              "retry",
              "accepted",
            ]),
          ),
        );
    }
    const operationId = randomUUID();
    const migrationLedger = await tx
      .select({
        checksum: cmsAddonMigrations.checksum,
        migrationId: cmsAddonMigrations.migrationId,
        releaseId: cmsAddonMigrations.releaseId,
        schemaVersion: cmsAddonMigrations.schemaVersion,
        status: cmsAddonMigrations.status,
      })
      .from(cmsAddonMigrations)
      .where(eq(cmsAddonMigrations.addonKey, ADDON_KEY));
    const preOperation = preOperationEvidence(
      existing,
      input.claim.installationId,
      migrationLedger,
    );
    const operationPayload = deploymentPayload(
      input.claim,
      snapshotHash,
      deploymentIntentKey,
      operationId,
      operationKey,
      epoch,
      preOperation,
    );
    const requestHash = sha256(canonicalJson(operationPayload));
    const pendingEntitlement = entitlementValues("install_pending");
    await tx
      .insert(webshopAddonEntitlements)
      .values({ id: 1, ...pendingEntitlement })
      .onConflictDoUpdate({
        target: webshopAddonEntitlements.id,
        set: pendingEntitlement,
      });
    const installationValues = {
      installationId: input.claim.installationId,
      desiredReleaseId: release.releaseId,
      desiredPackageName: release.packageName,
      desiredPackageVersion: release.packageVersion,
      desiredArtifactSha256: release.artifactSha256,
      desiredDependencyLockSha256: release.dependencyLockSha256,
      desiredNpmTarballSha256: release.npmTarballSha256,
      desiredNpmTarballIntegrity: release.npmTarballIntegrity,
      desiredEmbeddedManifestSha256: release.embeddedManifestSha256,
      desiredProvenanceSha256: release.provenanceSha256,
      desiredSbomSha256: release.sbomSha256,
      desiredPublicationAttestationHash: release.publicationAttestationHash,
      desiredRegistryPackageVersionId: release.registryPackageVersionId,
      desiredSourceReleasedAt: new Date(release.sourceReleasedAt),
      desiredPublishedAt: new Date(release.publishedAt),
      desiredReleaseSigningKid: release.releaseSigningKid,
      desiredRuntimeContractVersion: release.runtimeContractVersion,
      desiredCmsVersionRange: release.cmsVersionRange,
      desiredNodeVersionRange: release.nodeVersionRange,
      desiredNextVersionRange: release.nextVersionRange,
      desiredMinimumCoreSchemaVersion: release.minimumCoreSchemaVersion,
      desiredSchemaVersion: release.schemaVersion,
      desiredSupportedAddonSchemaVersionMin:
        release.supportedAddonSchemaVersionMin,
      desiredSupportedAddonSchemaVersionMax:
        release.supportedAddonSchemaVersionMax,
      desiredMigrationBundleHash: release.migrationBundleHash,
      desiredSupportedLicenseEditions: release.supportedLicenseEditions,
      desiredReleaseChannel: release.channel,
      desiredHostCapabilityDescriptorHash:
        input.claim.hostCapabilityDescriptorHash,
      installationDeploymentEpoch: epoch,
      entitlementSnapshotHash: snapshotHash,
      entitlementLifecycleVersion: input.claim.lifecycleVersion,
      entitlementEnvelopeExpiresAt: new Date(input.claim.exp * 1000),
      licenseEnvironment: input.claim.environment,
      runtimeContractVersion: release.runtimeContractVersion,
      schemaVersion: release.schemaVersion,
      status: "install_pending" as const,
      runtimeStatus: "not_installed" as const,
      deploymentJobId: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      requestedAt: new Date(),
      version: (existing?.version ?? 0) + 1,
    };
    await tx
      .insert(cmsAddonInstallations)
      .values({ addonKey: ADDON_KEY, ...installationValues })
      .onConflictDoUpdate({
        target: cmsAddonInstallations.addonKey,
        set: installationValues,
      });
    await tx.insert(cmsAddonOperations).values({
      id: operationId,
      addonKey: ADDON_KEY,
      installationId: input.claim.installationId,
      installationDeploymentEpoch: epoch,
      generation: 1,
      deploymentIntentKey,
      operationKey,
      operationType: OPERATION_TYPE,
      status: "pending",
      requestHash,
      result: {},
    });
    await tx.insert(cmsAddonDeploymentOutbox).values({
      id: randomUUID(),
      addonKey: ADDON_KEY,
      installationId: input.claim.installationId,
      operationId,
      installationDeploymentEpoch: epoch,
      deploymentIntentKey,
      generation: 1,
      operationKey,
      requestAuthKid:
        process.env.NR_ADDON_DEPLOYMENT_WORKER_AUTH_KID?.trim() || null,
      targetProfile,
      licenseEnvironment: input.claim.environment,
      payloadVersion: 2,
      payload: operationPayload,
      requestHash,
      status: "pending",
    });
    return {
      operationId,
      operationKey,
      status: "install_pending" as const,
      reused: false as const,
    };
  });
}

function deploymentPayload(
  claim: AddonEntitlementClaimsV2,
  entitlementSnapshotHash: string,
  deploymentIntentKey: string,
  operationId: string,
  operationKey: string,
  epoch: bigint,
  preOperation: {
    preOperationMigrationLedgerHash: string;
    preOperationServingStateHash: string;
  },
) {
  const release = claim.release;
  return deploymentRequestV2Schema.parse({
    version: 2,
    addonKey: ADDON_KEY,
    operationId,
    operationKey,
    deploymentIntentKey,
    installationId: claim.installationId,
    installationDeploymentEpoch: String(epoch),
    generation: 1,
    supersedesOperationId: null,
    environment: claim.environment,
    entitlementSnapshotHash,
    entitlementLifecycleVersion: claim.lifecycleVersion,
    entitlementEnvelopeExpiresAt: new Date(claim.exp * 1000).toISOString(),
    hostCapabilityDescriptorHash: claim.hostCapabilityDescriptorHash,
    ...preOperation,
    releaseId: release.releaseId,
    packageName: release.packageName,
    packageVersion: release.packageVersion,
    artifactSha256: release.artifactSha256,
    dependencyLockSha256: release.dependencyLockSha256,
    npmTarballSha256: release.npmTarballSha256,
    npmTarballIntegrity: release.npmTarballIntegrity,
    embeddedManifestSha256: release.embeddedManifestSha256,
    provenanceSha256: release.provenanceSha256,
    sbomSha256: release.sbomSha256,
    publicationAttestationHash: release.publicationAttestationHash,
    registryPackageVersionId: release.registryPackageVersionId,
    sourceReleasedAt: release.sourceReleasedAt,
    publishedAt: release.publishedAt,
    releaseSigningKid: release.releaseSigningKid,
    runtimeContractVersion: release.runtimeContractVersion,
    cmsVersionRange: release.cmsVersionRange,
    nodeVersionRange: release.nodeVersionRange,
    nextVersionRange: release.nextVersionRange,
    minimumCoreSchemaVersion: release.minimumCoreSchemaVersion,
    schemaVersion: release.schemaVersion,
    supportedAddonSchemaVersionMin: release.supportedAddonSchemaVersionMin,
    supportedAddonSchemaVersionMax: release.supportedAddonSchemaVersionMax,
    migrationBundleHash: release.migrationBundleHash,
    supportedLicenseEditions: release.supportedLicenseEditions,
    releaseChannel: release.channel,
  });
}
function preOperationEvidence(
  existing: typeof cmsAddonInstallations.$inferSelect | undefined,
  installationId: string,
  migrationLedger: readonly {
    checksum: string;
    migrationId: string;
    releaseId: string | null;
    schemaVersion: number;
    status: string;
  }[],
) {
  const installedEvidence = {
    installedReleaseId: existing?.installedReleaseId ?? null,
    installedPackageName: existing?.installedPackageName ?? null,
    installedPackageVersion: existing?.installedPackageVersion ?? null,
    installedArtifactSha256: existing?.installedArtifactSha256 ?? null,
    installedDependencyLockSha256: existing?.installedDependencyLockSha256 ?? null,
    installedNpmTarballSha256: existing?.installedNpmTarballSha256 ?? null,
    installedNpmTarballIntegrity: existing?.installedNpmTarballIntegrity ?? null,
    installedEmbeddedManifestSha256: existing?.installedEmbeddedManifestSha256 ?? null,
    installedProvenanceSha256: existing?.installedProvenanceSha256 ?? null,
    installedSbomSha256: existing?.installedSbomSha256 ?? null,
    installedPublicationAttestationHash:
      existing?.installedPublicationAttestationHash ?? null,
    installedRegistryPackageVersionId:
      existing?.installedRegistryPackageVersionId ?? null,
    installedSourceReleasedAt: existing?.installedSourceReleasedAt?.toISOString() ?? null,
    installedPublishedAt: existing?.installedPublishedAt?.toISOString() ?? null,
    installedReleaseSigningKid: existing?.installedReleaseSigningKid ?? null,
    installedRuntimeContractVersion:
      existing?.installedRuntimeContractVersion ?? null,
    installedCmsVersionRange: existing?.installedCmsVersionRange ?? null,
    installedNodeVersionRange: existing?.installedNodeVersionRange ?? null,
    installedNextVersionRange: existing?.installedNextVersionRange ?? null,
    installedMinimumCoreSchemaVersion:
      existing?.installedMinimumCoreSchemaVersion ?? null,
    installedSchemaVersion: existing?.installedSchemaVersion ?? null,
    installedSupportedAddonSchemaVersionMin:
      existing?.installedSupportedAddonSchemaVersionMin ?? null,
    installedSupportedAddonSchemaVersionMax:
      existing?.installedSupportedAddonSchemaVersionMax ?? null,
    installedMigrationBundleHash: existing?.installedMigrationBundleHash ?? null,
    installedMigrationLedgerHash: existing?.installedMigrationLedgerHash ?? null,
    installedSupportedLicenseEditions:
      existing?.installedSupportedLicenseEditions ?? null,
    installedReleaseChannel: existing?.installedReleaseChannel ?? null,
    installedHostCapabilityDescriptorHash:
      existing?.installedHostCapabilityDescriptorHash ?? null,
    installedBuildId: existing?.installedBuildId ?? null,
  };
  return {
    preOperationServingStateHash: sha256(
      canonicalJson({
        contractVersion: 1,
        purpose: "addon_pre_operation_serving_state",
        installationId,
        runtimeStatus: existing?.runtimeStatus ?? "not_installed",
        installedEvidence,
      }),
    ),
    preOperationMigrationLedgerHash: migrationLedgerHash(migrationLedger),
  };
}
function redactedClaims(claim: AddonEntitlementClaimsV2) {
  const { jti, ...safe } = claim;
  void jti;
  return safe;
}
function nullableDate(value: string | null) {
  return value ? new Date(value) : null;
}
function sha256(value: string) {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}
function migrationLedgerHash(migrationLedger: readonly {
  checksum: string;
  migrationId: string;
  releaseId: string | null;
  schemaVersion: number;
  status: string;
}[]) {
  const entries = migrationLedger.map((entry) => {
    if (!entry.releaseId) throw new Error("migration_ledger_release_evidence_missing");
    return {
      migrationId: entry.migrationId,
      releaseId: entry.releaseId,
      checksum: entry.checksum,
      schemaVersion: entry.schemaVersion,
      status: entry.status,
    };
  }).sort((left, right) => left.migrationId.localeCompare(right.migrationId));
  return sha256(canonicalJson({
    addonKey: ADDON_KEY,
    contractVersion: 1,
    entries,
    purpose: "addon_migration_ledger",
  }));
}
function requiredDeploymentProfile() {
  const value = process.env.NR_CMS_DEPLOYMENT_PROFILE?.trim();
  if (value !== "vendor" && value !== "client") {
    throw new Error(
      "NR_CMS_DEPLOYMENT_PROFILE is required for deployment control-plane state.",
    );
  }
  return value;
}
