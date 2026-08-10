import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test, { after, beforeEach } from "node:test";

import { Client } from "pg";

import { canonicalJson } from "@/lib/vendor-addon-entitlements/activation-v2-contract";
import { deploymentRequestV2Schema, deploymentResultV2Schema } from "@/lib/addon-runtime/deployment-contract-v2";
import { signDeployRequest } from "@/lib/addon-runtime/deploy-hmac-v2";

const databaseUrl =
  process.env.NODE_ENV === "test" ? process.env.DATABASE_URL : null;
let client: Client | null = null;
let connected = false;

const claim = {
  contractVersion: 2 as const,
  tokenUse: "addon_entitlement" as const,
  iss: "https://license-server.nrcms.com" as const,
  aud: "nr-cms-addon-runtime" as const,
  jti: "11111111-1111-4111-8111-111111111111",
  iat: 1_785_456_000,
  nbf: 1_785_456_000,
  exp: 1_788_048_000,
  entitlementId: "22222222-2222-4222-8222-222222222222",
  activationId: "33333333-3333-4333-8333-333333333333",
  addonKey: "webshop" as const,
  environment: "development" as const,
  deploymentMode: "self_hosted" as const,
  canonicalDomain: "client.nr.test",
  installationId: "44444444-4444-4444-8444-444444444444",
  installationKeyFingerprint: `sha256:${"a".repeat(64)}`,
  licenseStatus: "active" as const,
  activationStatus: "active" as const,
  lifecycleVersion: 0,
  activationLimit: 1,
  edition: "standard" as const,
  features: [] as string[],
  existingLicensePolicy: "allow_existing" as const,
  licenseValidUntil: null,
  updatesUntil: null,
  nextRevalidationAt: "2026-08-03T00:00:00.000Z",
  graceEndsAt: null,
  domainVerificationMethod: "development_allowlist_exemption" as const,
  domainVerifiedAt: "2026-08-02T00:00:00.000Z",
  domainVerificationChallengeId: "55555555-5555-4555-8555-555555555555",
  hostCapabilityDescriptorHash: `sha256:${"b".repeat(64)}`,
  release: {
    releaseId: "66666666-6666-5666-8666-666666666666",
    addonKey: "webshop" as const,
    packageName: "@radomirradojevic/webshop" as const,
    packageVersion: "0.6.0",
    artifactSha256: "1".repeat(64),
    dependencyLockSha256: "2".repeat(64),
    npmTarballSha256: "3".repeat(64),
    npmTarballIntegrity: `sha512-${Buffer.alloc(64, 1).toString("base64")}`,
    embeddedManifestSha256: "4".repeat(64),
    provenanceSha256: "5".repeat(64),
    sbomSha256: "6".repeat(64),
    publicationAttestationHash: "7".repeat(64),
    registryPackageVersionId: "1090949848",
    sourceReleasedAt: "2026-08-02T00:00:00.000Z",
    publishedAt: "2026-08-02T00:00:00.000Z",
    releaseSigningKid: "release-kid",
    runtimeContractVersion: "1" as const,
    cmsVersionRange: "^0.1.0",
    nodeVersionRange: ">=24.15.0 <25.0.0",
    nextVersionRange: "16.3.0",
    minimumCoreSchemaVersion: 1,
    schemaVersion: 1,
    supportedAddonSchemaVersionMin: 1,
    supportedAddonSchemaVersionMax: 1,
    migrationBundleHash: "8".repeat(64),
    supportedLicenseEditions: ["standard"] as ["standard"],
    channel: "stable" as const,
  },
  signingKid: "entitlement-kid",
};

function controlledStubResult(
  payload: ReturnType<typeof deploymentRequestV2Schema.parse>,
  workerJobId: string,
  resultId: string,
  active: { releaseId: string; buildId: string; artifactSha256: string } | null = null,
) {
  const noMutationEvidence = {
    contractVersion: 1 as const, purpose: "addon_deployment_no_mutation" as const, operationId: payload.operationId, workerJobId,
    targetProfile: "client" as const, installationId: payload.installationId, installationDeploymentEpoch: payload.installationDeploymentEpoch,
    generation: payload.generation, releaseId: payload.releaseId, preOperationServingStateHash: payload.preOperationServingStateHash,
    preOperationMigrationLedgerHash: payload.preOperationMigrationLedgerHash, cmsControlPlanePhase: "install_pending" as const,
    addonSchemaMutationStarted: false as const, serviceMutationStarted: false as const, pointerMutationStarted: false as const,
    observedActiveReleaseId: active?.releaseId ?? null, observedServicePointerReleaseId: active?.releaseId ?? null, lastCompletedWorkerPhase: "accepted" as const,
  };
  return deploymentResultV2Schema.parse({
    version: 2, resultId, operationId: payload.operationId, installationId: payload.installationId,
    installationDeploymentEpoch: payload.installationDeploymentEpoch, deploymentIntentKey: payload.deploymentIntentKey, generation: payload.generation, operationKey: payload.operationKey,
    workerJobId, targetProfile: "client", environment: payload.environment, status: "failed", finalPhase: "rejected_before_switch", runtimeStatus: active ? "ready" : "not_installed",
    releaseId: payload.releaseId, packageName: payload.packageName, packageVersion: payload.packageVersion, npmTarballSha256: payload.npmTarballSha256, npmTarballIntegrity: payload.npmTarballIntegrity,
    artifactSha256: payload.artifactSha256, dependencyLockSha256: payload.dependencyLockSha256, embeddedManifestSha256: payload.embeddedManifestSha256, provenanceSha256: payload.provenanceSha256,
    sbomSha256: payload.sbomSha256, publicationAttestationHash: payload.publicationAttestationHash, registryPackageVersionId: payload.registryPackageVersionId,
    sourceReleasedAt: payload.sourceReleasedAt, publishedAt: payload.publishedAt, releaseSigningKid: payload.releaseSigningKid, runtimeContractVersion: payload.runtimeContractVersion,
    cmsVersionRange: payload.cmsVersionRange, nodeVersionRange: payload.nodeVersionRange, nextVersionRange: payload.nextVersionRange, minimumCoreSchemaVersion: payload.minimumCoreSchemaVersion,
    schemaVersion: payload.schemaVersion, supportedAddonSchemaVersionMin: payload.supportedAddonSchemaVersionMin, supportedAddonSchemaVersionMax: payload.supportedAddonSchemaVersionMax,
    migrationBundleHash: payload.migrationBundleHash, supportedLicenseEditions: payload.supportedLicenseEditions, releaseChannel: payload.releaseChannel,
    entitlementSnapshotHash: payload.entitlementSnapshotHash, entitlementLifecycleVersion: payload.entitlementLifecycleVersion, entitlementEnvelopeExpiresAt: payload.entitlementEnvelopeExpiresAt,
    activeReleaseId: active?.releaseId ?? null, activeArtifactSha256: active?.artifactSha256 ?? null, observedServicePointerReleaseId: active?.releaseId ?? null, cmsCommitSha: "a".repeat(40), observedHostCapabilityDescriptorHash: payload.hostCapabilityDescriptorHash,
    buildId: active?.buildId ?? null, migrationLedgerHash: null, terminalEvidenceKind: "no_mutation_receipt",
    terminalEvidenceHash: `sha256:${createHash("sha256").update(canonicalJson(noMutationEvidence), "utf8").digest("hex")}`,
    noMutationEvidence, errorClass: "retryable", errorCode: "controlled_test_stub_no_deployment", occurredAt: new Date().toISOString(),
  });
}

beforeEach(async () => {
  if (!databaseUrl) return;
  process.env.NR_CMS_DEPLOYMENT_PROFILE = "client";
  process.env.NR_LICENSE_ENVIRONMENT = "development";
  process.env.WEBSHOP_DEPLOYMENT_RESULT_AUTH_KID = "client-result-test-kid";
  process.env.WEBSHOP_DEPLOYMENT_RESULT_AUTH_SECRET = "client-result-test-secret-0123456789";
  client ??= new Client({ connectionString: databaseUrl });
  if (!connected) { await client.connect(); connected = true; }
  await client.query(
    "TRUNCATE cms_addon_lifecycle_receipts, cms_addon_lifecycle_operations, cms_addon_transfer_preparations, cms_addon_deployment_results, cms_addon_deployment_terminal_receipts, cms_addon_deployment_candidates, cms_addon_serving_fences, cms_addon_worker_callbacks, cms_addon_deployment_outbox, cms_addon_operations, cms_addon_installations, webshop_addon_entitlements CASCADE",
  );
});
after(async () => {
  if (client) {
    await client.query(
      "TRUNCATE cms_addon_lifecycle_receipts, cms_addon_lifecycle_operations, cms_addon_transfer_preparations, cms_addon_deployment_results, cms_addon_deployment_terminal_receipts, cms_addon_deployment_candidates, cms_addon_serving_fences, cms_addon_worker_callbacks, cms_addon_deployment_outbox, cms_addon_operations, cms_addon_installations, webshop_addon_entitlements CASCADE",
    );
  }
  await client?.end();
});

test("CMS lifecycle migration durably fences finalization and receipt evidence", { skip: !databaseUrl, concurrency: false }, async () => {
  const operationId = "11111111-1111-4111-8111-111111111111";
  const receiptJti = "22222222-2222-4222-8222-222222222222";
  await client!.query(
    `INSERT INTO cms_addon_lifecycle_operations (
      id, addon_key, lifecycle_action, receipt_role, activation_id,
      installation_id, canonical_domain, pre_lifecycle_version,
      final_request_body_hash, final_request_body, original_complete_accept_until
    ) VALUES ($1, 'webshop', 'deactivate', 'deactivation',
      '33333333-3333-4333-8333-333333333333',
      '44444444-4444-4444-8444-444444444444', 'client.nr.test', 1,
      $2, '{"action":"complete","contractVersion":1}'::jsonb, now() + interval '1 day')`,
    [operationId, `sha256:${"a".repeat(64)}`],
  );
  await client!.query(
    `INSERT INTO cms_addon_lifecycle_receipts (
      lifecycle_operation_id, receipt_role, jti, compact_hash, result_body_hash, expires_at
    ) VALUES ($1, 'deactivation', $2, $3, $4, now() + interval '1 hour')`,
    [operationId, receiptJti, `sha256:${"b".repeat(64)}`, `sha256:${"c".repeat(64)}`],
  );
  await client!.query(
    `INSERT INTO cms_addon_transfer_preparations (
      transfer_id, entitlement_id, source_activation_id, target_canonical_domain,
      target_installation_id, target_installation_key_fingerprint, target_challenge_id, expires_at
    ) VALUES (
      '55555555-5555-4555-8555-555555555555',
      '66666666-6666-4666-8666-666666666666',
      '77777777-7777-4777-8777-777777777777', 'new.nr.test',
      '88888888-8888-4888-8888-888888888888', $1,
      '99999999-9999-4999-8999-999999999999', now() + interval '1 hour'
    )`,
    [`sha256:${"d".repeat(64)}`],
  );
  const rows = await client!.query(
    "SELECT operation.state, receipt.receipt_role FROM cms_addon_lifecycle_operations operation JOIN cms_addon_lifecycle_receipts receipt ON receipt.lifecycle_operation_id = operation.id WHERE operation.id = $1",
    [operationId],
  );
  assert.deepEqual(rows.rows, [{ state: "lifecycle_finalization_pending", receipt_role: "deactivation" }]);
});

test("authenticated worker callback stores one immutable result and returns duplicate or stale ACK without serving-state writes", { skip: !databaseUrl, concurrency: false }, async () => {
  const { persistVerifiedWebshopActivation } = await import("@/data/webshop-addon-control-plane");
  const { receiveDeploymentResultV2 } = await import("@/lib/addon-runtime/deployment-result-callback");
  const accepted = await persistVerifiedWebshopActivation({ claim, signedEntitlement: "compact-jws-v2-callback-a", updatedBy: "test-admin" });
  const workerJobId = "77777777-7777-4777-8777-777777777777";
  await client!.query("UPDATE cms_addon_deployment_outbox SET worker_job_id = $1 WHERE operation_id = $2", [workerJobId, accepted.operationId]);
  await client!.query("UPDATE cms_addon_installations SET deployment_job_id = $1 WHERE addon_key = 'webshop'", [workerJobId]);
  const row = await client!.query("SELECT payload FROM cms_addon_deployment_outbox WHERE operation_id = $1", [accepted.operationId]);
  const payload = deploymentRequestV2Schema.parse(row.rows[0]?.payload);
  const noMutationEvidence = {
    contractVersion: 1 as const, purpose: "addon_deployment_no_mutation" as const, operationId: payload.operationId, workerJobId,
    targetProfile: "client" as const, installationId: payload.installationId, installationDeploymentEpoch: payload.installationDeploymentEpoch,
    generation: payload.generation, releaseId: payload.releaseId, preOperationServingStateHash: payload.preOperationServingStateHash,
    preOperationMigrationLedgerHash: payload.preOperationMigrationLedgerHash, cmsControlPlanePhase: "install_pending" as const,
    addonSchemaMutationStarted: false as const, serviceMutationStarted: false as const, pointerMutationStarted: false as const,
    observedActiveReleaseId: null, observedServicePointerReleaseId: null, lastCompletedWorkerPhase: "accepted" as const,
  };
  const result = {
    version: 2 as const, resultId: "88888888-8888-4888-8888-888888888888", operationId: payload.operationId, installationId: payload.installationId,
    installationDeploymentEpoch: payload.installationDeploymentEpoch, deploymentIntentKey: payload.deploymentIntentKey, generation: payload.generation, operationKey: payload.operationKey,
    workerJobId, targetProfile: "client" as const, environment: payload.environment, status: "failed" as const, finalPhase: "rejected_before_switch" as const, runtimeStatus: "not_installed" as const,
    releaseId: payload.releaseId, packageName: payload.packageName, packageVersion: payload.packageVersion, npmTarballSha256: payload.npmTarballSha256, npmTarballIntegrity: payload.npmTarballIntegrity,
    artifactSha256: payload.artifactSha256, dependencyLockSha256: payload.dependencyLockSha256, embeddedManifestSha256: payload.embeddedManifestSha256, provenanceSha256: payload.provenanceSha256,
    sbomSha256: payload.sbomSha256, publicationAttestationHash: payload.publicationAttestationHash, registryPackageVersionId: payload.registryPackageVersionId,
    sourceReleasedAt: payload.sourceReleasedAt, publishedAt: payload.publishedAt, releaseSigningKid: payload.releaseSigningKid, runtimeContractVersion: payload.runtimeContractVersion,
    cmsVersionRange: payload.cmsVersionRange, nodeVersionRange: payload.nodeVersionRange, nextVersionRange: payload.nextVersionRange, minimumCoreSchemaVersion: payload.minimumCoreSchemaVersion,
    schemaVersion: payload.schemaVersion, supportedAddonSchemaVersionMin: payload.supportedAddonSchemaVersionMin, supportedAddonSchemaVersionMax: payload.supportedAddonSchemaVersionMax,
    migrationBundleHash: payload.migrationBundleHash, supportedLicenseEditions: payload.supportedLicenseEditions, releaseChannel: payload.releaseChannel,
    entitlementSnapshotHash: payload.entitlementSnapshotHash, entitlementLifecycleVersion: payload.entitlementLifecycleVersion, entitlementEnvelopeExpiresAt: payload.entitlementEnvelopeExpiresAt,
    activeReleaseId: null, activeArtifactSha256: null, observedServicePointerReleaseId: null, cmsCommitSha: "a".repeat(40), observedHostCapabilityDescriptorHash: payload.hostCapabilityDescriptorHash,
    buildId: null, migrationLedgerHash: null, terminalEvidenceKind: "no_mutation_receipt" as const,
    terminalEvidenceHash: `sha256:${createHash("sha256").update(canonicalJson(noMutationEvidence), "utf8").digest("hex")}`,
    noMutationEvidence, errorClass: "retryable" as const, errorCode: "controlled_test_stub_no_deployment", occurredAt: new Date().toISOString(),
  };
  const body = Buffer.from(canonicalJson(result), "utf8");
  const requestId = "99999999-9999-4999-8999-999999999999";
  const headers = new Headers(signDeployRequest({ secret: process.env.WEBSHOP_DEPLOYMENT_RESULT_AUTH_SECRET!, kid: process.env.WEBSHOP_DEPLOYMENT_RESULT_AUTH_KID!, requestId, timestamp: String(Math.floor(Date.now() / 1000)), method: "POST", path: "/api/internal/addons/deployment-results", body }));
  const applied = await receiveDeploymentResultV2({ body, headers, method: "POST", pathname: "/api/internal/addons/deployment-results" });
  assert.equal(applied.status, 200); assert.match(applied.body.toString("utf8"), /"ack":"applied"/);
  const duplicate = await receiveDeploymentResultV2({ body, headers, method: "POST", pathname: "/api/internal/addons/deployment-results" });
  assert.match(duplicate.body.toString("utf8"), /"ack":"duplicate"/);
  const state = await client!.query("SELECT status, runtime_status FROM cms_addon_installations WHERE addon_key = 'webshop'");
  assert.deepEqual(state.rows[0], { status: "failed", runtime_status: "not_installed" });
  const ledgers = await client!.query("SELECT count(*)::int AS count FROM cms_addon_deployment_results");
  assert.equal(ledgers.rows[0]?.count, 1);
});

test("pre-mutation worker exhaustion preserves an exact previously ready runtime while terminalizing the new intent", { skip: !databaseUrl, concurrency: false }, async () => {
  const { persistVerifiedWebshopActivation } = await import("@/data/webshop-addon-control-plane");
  const { receiveDeploymentResultV2 } = await import("@/lib/addon-runtime/deployment-result-callback");
  const accepted = await persistVerifiedWebshopActivation({ claim, signedEntitlement: "compact-jws-v2-prior-ready", updatedBy: "test-admin" });
  const workerJobId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const active = {
    releaseId: "eeeeeeee-eeee-5eee-8eee-eeeeeeeeeeee",
    buildId: "f".repeat(64),
    artifactSha256: "e".repeat(64),
  };
  await client!.query("UPDATE cms_addon_deployment_outbox SET worker_job_id = $1 WHERE operation_id = $2", [workerJobId, accepted.operationId]);
  await client!.query(
    "UPDATE cms_addon_installations SET deployment_job_id=$1, runtime_status='ready', installed_release_id=$2, installed_build_id=$3, installed_artifact_sha256=$4 WHERE addon_key='webshop'",
    [workerJobId, active.releaseId, active.buildId, active.artifactSha256],
  );
  const row = await client!.query("SELECT payload FROM cms_addon_deployment_outbox WHERE operation_id = $1", [accepted.operationId]);
  const result = controlledStubResult(deploymentRequestV2Schema.parse(row.rows[0]?.payload), workerJobId, "ffffffff-ffff-4fff-8fff-ffffffffffff", active);
  const body = Buffer.from(canonicalJson(result), "utf8");
  const headers = new Headers(signDeployRequest({ secret: process.env.WEBSHOP_DEPLOYMENT_RESULT_AUTH_SECRET!, kid: process.env.WEBSHOP_DEPLOYMENT_RESULT_AUTH_KID!, requestId: "abababab-abab-4bab-8bab-abababababab", timestamp: String(Math.floor(Date.now() / 1000)), method: "POST", path: "/api/internal/addons/deployment-results", body }));
  const response = await receiveDeploymentResultV2({ body, headers, method: "POST", pathname: "/api/internal/addons/deployment-results" });
  assert.match(response.body.toString("utf8"), /"ack":"applied"/);
  const state = await client!.query("SELECT status, runtime_status, installed_release_id::text, installed_build_id, installed_artifact_sha256 FROM cms_addon_installations WHERE addon_key='webshop'");
  assert.deepEqual(state.rows[0], { status: "failed", runtime_status: "ready", installed_release_id: active.releaseId, installed_build_id: active.buildId, installed_artifact_sha256: active.artifactSha256 });
  const terminal = await client!.query("SELECT kind, final_tuple->>'activeReleaseId' AS active_release_id FROM cms_addon_deployment_terminal_receipts WHERE operation_id=$1", [accepted.operationId]);
  assert.deepEqual(terminal.rows, [{ kind: "no_mutation_receipt", active_release_id: active.releaseId }]);
});

test("late historical worker result receives stale_epoch_ignored without changing current desired state", { skip: !databaseUrl, concurrency: false }, async () => {
  const { persistVerifiedWebshopActivation } = await import("@/data/webshop-addon-control-plane");
  const { receiveDeploymentResultV2 } = await import("@/lib/addon-runtime/deployment-result-callback");
  const accepted = await persistVerifiedWebshopActivation({ claim, signedEntitlement: "compact-jws-v2-stale-a", updatedBy: "test-admin" });
  const workerJobId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  await client!.query("UPDATE cms_addon_deployment_outbox SET worker_job_id = $1 WHERE operation_id = $2", [workerJobId, accepted.operationId]);
  await client!.query("UPDATE cms_addon_installations SET deployment_job_id = $1, installation_deployment_epoch = 2 WHERE addon_key = 'webshop'", [workerJobId]);
  const row = await client!.query("SELECT payload FROM cms_addon_deployment_outbox WHERE operation_id = $1", [accepted.operationId]);
  const result = controlledStubResult(deploymentRequestV2Schema.parse(row.rows[0]?.payload), workerJobId, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  const body = Buffer.from(canonicalJson(result), "utf8");
  const headers = new Headers(signDeployRequest({ secret: process.env.WEBSHOP_DEPLOYMENT_RESULT_AUTH_SECRET!, kid: process.env.WEBSHOP_DEPLOYMENT_RESULT_AUTH_KID!, requestId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", timestamp: String(Math.floor(Date.now() / 1000)), method: "POST", path: "/api/internal/addons/deployment-results", body }));
  const response = await receiveDeploymentResultV2({ body, headers, method: "POST", pathname: "/api/internal/addons/deployment-results" });
  assert.match(response.body.toString("utf8"), /"ack":"stale_epoch_ignored"/);
  const current = await client!.query("SELECT status, runtime_status, installation_deployment_epoch::text AS epoch FROM cms_addon_installations WHERE addon_key = 'webshop'");
  assert.deepEqual(current.rows[0], { status: "install_pending", runtime_status: "not_installed", epoch: "2" });
});

test("verified activation commits entitlement, desired state, operation, and outbox before any dispatch", { skip: !databaseUrl, concurrency: false }, async () => {
  const { persistVerifiedWebshopActivation } = await import("@/data/webshop-addon-control-plane");
  const first = await persistVerifiedWebshopActivation({
    claim,
    signedEntitlement: "compact-jws-v2-fixture-a",
    updatedBy: "test-admin",
  });
  assert.equal(first.status, "install_pending");
  const retry = await persistVerifiedWebshopActivation({
    claim,
    signedEntitlement: "compact-jws-v2-fixture-a",
    updatedBy: "test-admin",
  });
  assert.equal(retry.reused, true);
  assert.equal(retry.operationId, first.operationId);
  const changed = await persistVerifiedWebshopActivation({
    claim,
    signedEntitlement: "compact-jws-v2-fixture-b",
    updatedBy: "test-admin",
  });
  assert.equal(changed.reused, false);
  const state = await client!.query(
    "select status, runtime_status, installation_deployment_epoch::text as epoch from cms_addon_installations where addon_key = 'webshop'",
  );
  assert.deepEqual(state.rows[0], {
    status: "install_pending",
    runtime_status: "not_installed",
    epoch: "2",
  });
  const operations = await client!.query(
    "select status from cms_addon_operations order by created_at",
  );
  assert.deepEqual(operations.rows.map((row) => row.status), [
    "superseded",
    "pending",
  ]);
  const outbox = await client!.query(
    "select payload::text as payload, status from cms_addon_deployment_outbox order by created_at",
  );
  assert.equal(outbox.rows.length, 2);
  assert.equal(outbox.rows[1]?.status, "pending");
  assert.equal(outbox.rows[1]?.payload.includes("compact-jws"), false);
});

test("legacy cutover terminal never retries its old intent; only fresh host capability opens epoch generation one", { skip: !databaseUrl, concurrency: false }, async () => {
  const { persistVerifiedWebshopActivation } = await import("@/data/webshop-addon-control-plane");
  const first = await persistVerifiedWebshopActivation({ claim, signedEntitlement: "compact-jws-v2-legacy-a", updatedBy: "test-admin" });
  await client!.query("UPDATE cms_addon_operations SET status = 'failed', error_code = 'operator_schema_cutover_required', completed_at = now() WHERE id = $1", [first.operationId]);
  const sameHost = await persistVerifiedWebshopActivation({ claim, signedEntitlement: "compact-jws-v2-legacy-new-token", updatedBy: "test-admin" });
  assert.equal(sameHost.operationId, first.operationId);
  assert.equal(sameHost.status, "operator_schema_cutover_required");
  const freshHostClaim = { ...claim, hostCapabilityDescriptorHash: `sha256:${"c".repeat(64)}` };
  const fresh = await persistVerifiedWebshopActivation({ claim: freshHostClaim, signedEntitlement: "compact-jws-v2-legacy-cutover-complete", updatedBy: "test-admin" });
  assert.equal(fresh.reused, false);
  const operations = await client!.query("SELECT installation_deployment_epoch::text AS epoch, generation, status FROM cms_addon_operations ORDER BY created_at");
  assert.deepEqual(operations.rows.map((row) => [row.epoch, row.generation, row.status]), [["1", 1, "failed"], ["2", 1, "pending"]]);
});
