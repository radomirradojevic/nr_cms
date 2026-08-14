import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { cmsAddonDeploymentCandidates, cmsAddonServingFences } from "@/db/schema";
import { canonicalJson } from "@/lib/vendor-addon-entitlements/activation-v2-contract";
import { DeployHmacError, signDeployResponse, verifyDeployRequest } from "@/lib/addon-runtime/deploy-hmac-v2";
import { resolveDeploymentResultSecret } from "@/lib/addon-runtime/deployment-result-callback";
import { loadWebshopAddon } from "@/lib/webshop-addon/loader";

const uuid = z.string().uuid().regex(/^[0-9a-f-]+$/);
const epoch = z.string().regex(/^[1-9][0-9]{0,18}$/).refine((value) => BigInt(value) <= BigInt("9223372036854775807"), "installation_epoch_out_of_range");
const requestSchema = z.object({
  version: z.literal(1), purpose: z.literal("addon_candidate_readiness_request"), operationId: uuid, workerJobId: uuid,
  installationId: uuid, installationDeploymentEpoch: epoch, generation: z.number().int().positive(),
  releaseId: uuid, buildId: z.string().regex(/^[a-f0-9]{64}$/), packageVersion: z.string().regex(/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/), artifactSha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

export async function receiveCandidateReadinessV1(input: { body: Buffer; headers: Headers; method: string; pathname: string }) {
  const auth = verifyDeployRequest({ headers: input.headers, method: input.method, pathname: input.pathname, body: input.body, resolveSecret: resolveDeploymentResultSecret });
  try {
    const request = requestSchema.parse(JSON.parse(input.body.toString("utf8")));
    const targetProfile = process.env.NR_CMS_DEPLOYMENT_PROFILE?.trim();
    if (targetProfile !== "vendor" && targetProfile !== "client" && targetProfile !== "paypal") throw new CandidateReadinessFailure();
    const deploymentEpoch = BigInt(request.installationDeploymentEpoch);
    const [candidate, fence, addon] = await Promise.all([
      db.select().from(cmsAddonDeploymentCandidates).where(and(eq(cmsAddonDeploymentCandidates.operationId, request.operationId), eq(cmsAddonDeploymentCandidates.workerJobId, request.workerJobId), eq(cmsAddonDeploymentCandidates.installationDeploymentEpoch, deploymentEpoch), eq(cmsAddonDeploymentCandidates.generation, request.generation))).limit(1).then((rows) => rows[0]),
      db.select().from(cmsAddonServingFences).where(and(eq(cmsAddonServingFences.targetProfile, targetProfile), eq(cmsAddonServingFences.addonKey, "webshop"), eq(cmsAddonServingFences.operationId, request.operationId), eq(cmsAddonServingFences.workerJobId, request.workerJobId), eq(cmsAddonServingFences.installationId, request.installationId), eq(cmsAddonServingFences.installationDeploymentEpoch, deploymentEpoch), eq(cmsAddonServingFences.generation, request.generation), eq(cmsAddonServingFences.state, "active"))).limit(1).then((rows) => rows[0]),
      loadWebshopAddon(),
    ]);
    const evidence = candidate?.evidence;
    if (!candidate || candidate.terminalReceiptId || !fence || !evidence || typeof evidence !== "object" || Array.isArray(evidence) || addon.status !== "loaded") throw new CandidateReadinessFailure();
    const record = evidence as Record<string, unknown>;
    const cmsCommitSha = process.env.NR_CMS_RELEASE_SHA?.trim();
    const runtimeReleaseId = process.env.WEBSHOP_RUNTIME_RELEASE_ID?.trim();
    const runtimeBuildId = process.env.WEBSHOP_RUNTIME_BUILD_ID?.trim();
    const runtimeArtifactSha256 = process.env.WEBSHOP_RUNTIME_ARTIFACT_SHA256?.trim();
    if (cmsCommitSha?.match(/^[a-f0-9]{40}$/)?.[0] !== cmsCommitSha || runtimeReleaseId !== request.releaseId || runtimeBuildId !== request.buildId || runtimeArtifactSha256 !== request.artifactSha256 || addon.addon.version !== request.packageVersion || record.targetProfile !== targetProfile || record.operationId !== request.operationId || record.workerJobId !== request.workerJobId || record.installationId !== request.installationId || record.installationDeploymentEpoch !== request.installationDeploymentEpoch || record.generation !== request.generation || record.releaseId !== request.releaseId || record.buildId !== request.buildId || record.packageVersion !== request.packageVersion || record.artifactSha256 !== request.artifactSha256) throw new CandidateReadinessFailure();
    return signed(auth, 200, { ok: true, buildId: request.buildId, cmsCommitSha, database: "reachable", addons: { webshop: { status: "candidate_ready", packageVersion: request.packageVersion, artifactSha256: request.artifactSha256 } } });
  } catch {
    return signed(auth, 409, { version: 1, error: { code: "candidate_not_ready", message: "candidate readiness unavailable", requestId: auth.requestId, retryable: true } });
  }
}

class CandidateReadinessFailure extends Error {}
function signed(auth: { kid: string; requestId: string; secret: string }, status: number, value: unknown) { const body = Buffer.from(canonicalJson(value), "utf8"); return { status, body, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...signDeployResponse({ secret: auth.secret, kid: auth.kid, requestId: auth.requestId, status, body }) } }; }
export function candidateReadinessAuthError(error: unknown) { const code = error instanceof DeployHmacError ? error.code : "invalid_auth"; return { status: error instanceof DeployHmacError ? error.status : 401, body: Buffer.from(canonicalJson({ version: 1, error: { code, message: "candidate readiness rejected", requestId: null, retryable: false } }), "utf8") }; }
