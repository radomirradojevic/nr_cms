import { createHash, randomUUID } from "node:crypto";

import { and, eq, lte, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { cmsAddonDeploymentOutbox, cmsAddonInstallations } from "@/db/schema";
import { canonicalJson } from "@/lib/vendor-addon-entitlements/activation-v2-contract";
import { safeFetch } from "@/lib/security/outbound-url";
import { signDeployRequest, verifyDeployResponse } from "@/lib/addon-runtime/deploy-hmac-v2";
import { deploymentRequestV2Schema } from "@/lib/addon-runtime/deployment-contract-v2";

const LEASE_MS = 30_000;
const epoch = z.string().regex(/^[1-9][0-9]{0,18}$/).refine((value) => BigInt(value) <= BigInt("9223372036854775807"), "installation_epoch_out_of_range");
const responseSchema = z.object({
  version: z.literal(2), jobId: z.string().min(1).max(300), status: z.literal("accepted"),
  operationId: z.string().uuid(), installationDeploymentEpoch: epoch,
  generation: z.number().int().positive(), operationKey: z.string().min(1).max(500),
}).strict();

export async function dispatchOneAddonDeploymentOutbox(now = new Date()) {
  const candidate = (await db.select().from(cmsAddonDeploymentOutbox).where(
    or(
      and(eq(cmsAddonDeploymentOutbox.status, "pending"), lte(cmsAddonDeploymentOutbox.nextAttemptAt, now)),
      and(eq(cmsAddonDeploymentOutbox.status, "retry"), lte(cmsAddonDeploymentOutbox.nextAttemptAt, now)),
      and(eq(cmsAddonDeploymentOutbox.status, "sending"), lte(cmsAddonDeploymentOutbox.leaseExpiresAt, now)),
    ),
  ).limit(1))[0];
  if (!candidate) return { outcome: "idle" as const };
  const leaseToken = randomUUID();
  const claimed = await db.update(cmsAddonDeploymentOutbox).set({
    status: "sending", leaseToken, leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
    attemptCount: candidate.attemptCount + 1,
  }).where(and(
    eq(cmsAddonDeploymentOutbox.id, candidate.id),
    eq(cmsAddonDeploymentOutbox.status, candidate.status),
  )).returning();
  const row = claimed[0];
  if (!row) return { outcome: "contended" as const };
  const config = deploymentWorkerConfig();
  const payload = deploymentRequestV2Schema.parse(row.payload);
  const body = Buffer.from(canonicalJson(payload), "utf8");
  if (sha256(body) !== row.requestHash) {
    await markTerminal(row.id, leaseToken, "failed", "outbox_payload_hash_mismatch", null);
    return { outcome: "failed" as const, code: "outbox_payload_hash_mismatch" };
  }
  try {
    const requestId = randomUUID();
    const headers = signDeployRequest({
      body, kid: config.kid, requestId, secret: config.secret, timestamp: String(Math.floor(Date.now() / 1000)), method: "POST", path: config.path,
    });
    const response = await safeFetch(new URL(config.path, config.url).toString(), {
      allowFirstParty: false, allowSelfHosted: true, body, headers, method: "POST",
      purpose: "Webshop deployment outbox dispatch", timeoutMs: 10_000, maxResponseBytes: 32 * 1024,
    });
    // A response is part of the authenticated protocol even when the worker
    // rejects the request.  Do not turn an unsigned 4xx/5xx into retry/DLQ
    // state: it could have been forged by a proxy between CMS and worker.
    const responseBody = Buffer.from(await response.arrayBuffer());
    verifyDeployResponse({ headers: response.headers, secret: config.secret, expectedKid: config.kid, requestId, status: response.status, body: responseBody });
    if (response.status === 202) {
      const accepted = responseSchema.parse(JSON.parse(responseBody.toString("utf8")));
      if (accepted.operationId !== row.operationId || accepted.operationKey !== row.operationKey || accepted.installationDeploymentEpoch !== String(row.installationDeploymentEpoch) || accepted.generation !== row.generation) {
        throw new Error("worker_acceptance_binding_mismatch");
      }
      await db.transaction(async (tx) => {
        const update = await tx.update(cmsAddonDeploymentOutbox).set({
          status: "accepted", workerJobId: accepted.jobId, acceptedAt: new Date(), leaseToken: null, leaseExpiresAt: null, lastHttpStatus: 202,
        }).where(and(eq(cmsAddonDeploymentOutbox.id, row.id), eq(cmsAddonDeploymentOutbox.leaseToken, leaseToken))).returning();
        if (!update[0]) return;
        await tx.update(cmsAddonInstallations).set({ deploymentJobId: accepted.jobId }).where(eq(cmsAddonInstallations.addonKey, row.addonKey));
      });
      return { outcome: "accepted" as const, operationId: row.operationId, workerJobId: accepted.jobId };
    }
    await retryOrDlq(row.id, leaseToken, row.attemptCount, `worker_http_${response.status}`, response.status, now);
    return { outcome: "retry" as const, status: response.status };
  } catch (error) {
    const code = error instanceof Error && /^[a-z0-9_]+$/.test(error.message) ? error.message : "worker_dispatch_failed";
    await retryOrDlq(row.id, leaseToken, row.attemptCount, code, null, now);
    return { outcome: "retry" as const, code };
  }
}

export async function heartbeatAddonDeploymentOutbox(id: string, leaseToken: string) {
  const rows = await db.update(cmsAddonDeploymentOutbox).set({
    leaseExpiresAt: new Date(Date.now() + LEASE_MS),
  }).where(and(eq(cmsAddonDeploymentOutbox.id, id), eq(cmsAddonDeploymentOutbox.status, "sending"), eq(cmsAddonDeploymentOutbox.leaseToken, leaseToken))).returning({ id: cmsAddonDeploymentOutbox.id });
  return rows.length === 1;
}

async function retryOrDlq(id: string, leaseToken: string, attemptCount: number, code: string, httpStatus: number | null, now: Date) {
  const terminal = attemptCount >= 20;
  await db.update(cmsAddonDeploymentOutbox).set({
    status: terminal ? "dead_letter" : "retry", leaseToken: null, leaseExpiresAt: null,
    nextAttemptAt: new Date(now.getTime() + Math.min(15 * 60_000, 1_000 * 2 ** Math.min(attemptCount, 10))),
    lastErrorCode: code, lastHttpStatus: httpStatus, completedAt: terminal ? new Date() : null,
  }).where(and(eq(cmsAddonDeploymentOutbox.id, id), eq(cmsAddonDeploymentOutbox.leaseToken, leaseToken)));
}
async function markTerminal(id: string, leaseToken: string, status: "failed", code: string, httpStatus: number | null) {
  await db.update(cmsAddonDeploymentOutbox).set({ status, leaseToken: null, leaseExpiresAt: null, lastErrorCode: code, lastHttpStatus: httpStatus, completedAt: new Date() }).where(and(eq(cmsAddonDeploymentOutbox.id, id), eq(cmsAddonDeploymentOutbox.leaseToken, leaseToken)));
}
function deploymentWorkerConfig() {
  const url = process.env.NR_ADDON_DEPLOYMENT_WORKER_URL?.trim();
  const kid = process.env.NR_ADDON_DEPLOYMENT_WORKER_AUTH_KID?.trim();
  const secret = process.env.NR_ADDON_DEPLOYMENT_WORKER_AUTH_SECRET?.trim();
  const profile = process.env.NR_CMS_DEPLOYMENT_PROFILE?.trim();
  if (!url || !kid || !secret || (profile !== "vendor" && profile !== "client")) throw new Error("worker_dispatch_configuration_missing");
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.username || parsed.password) throw new Error("worker_dispatch_url_invalid");
  return { url: parsed.toString(), kid, secret, path: `/v1/hooks/${profile}/webshop` };
}
function sha256(value: Buffer | string) { return `sha256:${createHash("sha256").update(value).digest("hex")}`; }
