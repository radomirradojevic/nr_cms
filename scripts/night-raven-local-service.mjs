import {
  createHash,
  createHmac,
  randomUUID,
  sign,
  timingSafeEqual,
  verify,
} from "node:crypto";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import process from "node:process";

import pg from "pg";
import "tsx/cjs";

const requireTs = createRequire(import.meta.url);
const fulfillmentDomain = requireTs(
  "../.private/webshop/src/data/webshop-fulfillment-domain.ts",
);
const paymentFinancialState = requireTs(
  "../.private/webshop/src/lib/webshop-payments/financial-state.ts",
);
const vendorLicenseContract = requireTs(
  "../.private/license-server/src/lib/vendor-license-contract-v1.ts",
);
const revalidationPolicy = requireTs(
  "../lib/vendor-addon-entitlements/revalidation-policy.ts",
);

const { licenseOperationIdempotencyKey, retryDecisionForLicenseOperation } =
  fulfillmentDomain;
const { initialPaymentFinancialState, reduceNormalizedPaymentEvent } =
  paymentFinancialState;
const { canonicalRequestHash, canonicalizeHmacV2Request, hmacV2Signature } =
  vendorLicenseContract;
const { canPerformEntitlementOperation, resolveEntitlementRuntimeMode } =
  revalidationPolicy;

const { Pool } = pg;
const role = required("NR_LOCAL_ROLE");
const port = Number(required("NR_LOCAL_PORT"));
const controlToken = required("NR_LOCAL_CONTROL_TOKEN");
const cmsPool = process.env.NR_LOCAL_CMS_DATABASE_URL
  ? new Pool({ connectionString: process.env.NR_LOCAL_CMS_DATABASE_URL })
  : null;
const centralPool = process.env.NR_LOCAL_CENTRAL_DATABASE_URL
  ? new Pool({ connectionString: process.env.NR_LOCAL_CENTRAL_DATABASE_URL })
  : null;

let centralOutage = false;
let centralResponseLoss = false;
let activeVendorKid =
  process.env.NR_LOCAL_VENDOR_ACTIVE_KID ?? "vendor-local-a";
let activeCustomerKid =
  process.env.NR_LOCAL_CUSTOMER_ACTIVE_KID ?? "customer-local-a";
let cachedVendorEnvelope = null;
let cachedVendorKeys = new Map();
let installationThumbprint = "installation-local-a";
const alerts = [];

function required(name) {
  const value = process.env[name];
  if (!value)
    throw new Error(`[night-raven-local-service] ${name} is required.`);
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(secret, value) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stable(entry)]),
  );
}

function canonicalJson(value) {
  return JSON.stringify(stable(value));
}

function safeEqual(left, right) {
  const a = Buffer.from(left ?? "");
  const b = Buffer.from(right ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}

function send(response, status, value) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
  });
  response.end(body);
}

async function body(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64 * 1024)
      throw Object.assign(new Error("body too large"), { status: 413 });
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return { raw, value: raw ? JSON.parse(raw) : {} };
}

function isControl(request) {
  return safeEqual(request.headers["x-local-control"], controlToken);
}

function vendorKeys() {
  return JSON.parse(required("NR_LOCAL_VENDOR_KEYS"));
}

function customerKeys() {
  return JSON.parse(required("NR_LOCAL_CUSTOMER_KEYS"));
}

function signEnvelope(payload, keySet, kid) {
  const entry = keySet[kid];
  if (!entry?.privateKey)
    throw new Error("active local signing key is unavailable");
  const signature = sign(
    null,
    Buffer.from(canonicalJson(payload)),
    entry.privateKey,
  ).toString("base64url");
  return { payload, kid, alg: "Ed25519", signature };
}

function verifyEnvelope(envelope, keySet) {
  const publicEntry = keySet[envelope?.kid];
  if (!publicEntry) return false;
  if (envelope.alg !== "Ed25519" || !publicEntry.publicKey) return false;
  return verify(
    null,
    Buffer.from(canonicalJson(envelope.payload)),
    publicEntry.publicKey,
    Buffer.from(envelope.signature, "base64url"),
  );
}

function centralAuthHeaders(method, path, raw, clientId, idempotencyKey) {
  const timestamp = String(Date.now());
  const nonce = randomUUID();
  const canonical = canonicalizeHmacV2Request({
    method,
    pathAndQuery: path,
    timestamp,
    nonce,
    clientId,
    idempotencyKey,
    body: raw,
  });
  return {
    "content-type": "application/json",
    "x-nr-client": clientId,
    "x-nr-timestamp": timestamp,
    "x-nr-nonce": nonce,
    "x-nr-signature": hmacV2Signature(
      required("NR_LOCAL_CENTRAL_HMAC"),
      canonical,
    ),
    ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
  };
}

async function authenticateCentral(request, pathname, raw) {
  const clientId = String(request.headers["x-nr-client"] ?? "");
  const timestamp = String(request.headers["x-nr-timestamp"] ?? "");
  const nonce = String(request.headers["x-nr-nonce"] ?? "");
  const signature = String(request.headers["x-nr-signature"] ?? "");
  const idempotencyKey = String(request.headers["idempotency-key"] ?? "");
  if (!clientId || !timestamp || !nonce || !signature) return null;
  if (Math.abs(Date.now() - Number(timestamp)) > 300_000) return null;
  const canonical = canonicalizeHmacV2Request({
    method: request.method,
    pathAndQuery: pathname,
    timestamp,
    nonce,
    clientId,
    idempotencyKey,
    body: raw,
  });
  if (
    !safeEqual(
      signature,
      hmacV2Signature(required("NR_LOCAL_CENTRAL_HMAC"), canonical),
    )
  )
    return null;
  try {
    await centralPool.query(
      "INSERT INTO local_nonces (client_id, nonce) VALUES ($1, $2)",
      [clientId, nonce],
    );
  } catch (error) {
    if (error.code === "23505") return null;
    throw error;
  }
  return clientId;
}

async function centralFetch(
  path,
  value,
  { clientId = "client-a", idempotencyKey, responseLoss = false } = {},
) {
  const raw = JSON.stringify(value ?? {});
  return fetch(`${required("NR_LOCAL_CENTRAL_ENDPOINT")}${path}`, {
    method: "POST",
    headers: {
      ...centralAuthHeaders("POST", path, raw, clientId, idempotencyKey),
      ...(responseLoss ? { "x-local-response-loss": "1" } : {}),
    },
    body: raw,
  });
}

async function centralHandler(request, response, url, parsed) {
  if (!centralPool) throw new Error("central database is unavailable");
  if (url.pathname === "/health")
    return send(response, 200, { role: "central", ready: true });
  if (url.pathname === "/__control") {
    if (!isControl(request)) return send(response, 403, { error: "forbidden" });
    centralOutage = parsed.value.outage ?? centralOutage;
    centralResponseLoss = parsed.value.responseLoss ?? centralResponseLoss;
    activeVendorKid = parsed.value.activeVendorKid ?? activeVendorKid;
    if (parsed.value.reset) {
      centralOutage = false;
      centralResponseLoss = false;
      activeVendorKid =
        process.env.NR_LOCAL_VENDOR_ACTIVE_KID ?? "vendor-local-a";
    }
    return send(response, 200, { updated: true });
  }
  const clientId = await authenticateCentral(request, url.pathname, parsed.raw);
  if (!clientId) return send(response, 401, { error: "unauthorized" });
  if (centralOutage)
    return send(response, 503, { error: "temporarily_unavailable" });

  if (url.pathname === "/issue") {
    const input = parsed.value;
    if (
      input.clientId !== clientId ||
      !String(input.sku ?? "").startsWith(`${clientId}:`)
    )
      return send(response, 403, { error: "scope_denied" });
    const key = String(request.headers["idempotency-key"] ?? "");
    if (!key) return send(response, 400, { error: "idempotency_required" });
    const requestHash = canonicalRequestHash(input);
    const existing = await centralPool.query(
      "SELECT request_hash, response FROM local_idempotency WHERE client_id=$1 AND operation_key=$2",
      [clientId, key],
    );
    if (existing.rowCount) {
      if (existing.rows[0].request_hash !== requestHash)
        return send(response, 409, { error: "idempotency_conflict" });
      return send(response, 200, existing.rows[0].response);
    }
    const entitlementId = `ent_${randomUUID()}`;
    const payload = {
      issuer: "night-raven-vendor",
      audience: "nr-cms-addon",
      entitlementId,
      clientId,
      orderId: input.orderId,
      itemId: input.itemId,
      sku: input.sku,
      addon: input.addon,
      customerRef: input.customerRef,
      domain: input.domain,
      status: "active",
      validUntil: input.validUntil,
      updatesUntil: input.updatesUntil,
      lifecycleVersion: 1,
      maxActivations: input.maxActivations ?? 1,
    };
    const envelope = signEnvelope(payload, vendorKeys(), activeVendorKid);
    const result = { entitlementId, envelope };
    const client = await centralPool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO local_entitlements
          (id, client_id, order_id, item_id, sku, addon_key, customer_ref, domain_name,
           status, valid_until, updates_until, lifecycle_version, max_activations, envelope)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9,$10,1,$11,$12)`,
        [
          entitlementId,
          clientId,
          input.orderId,
          input.itemId,
          input.sku,
          input.addon,
          input.customerRef,
          input.domain,
          input.validUntil,
          input.updatesUntil,
          input.maxActivations ?? 1,
          envelope,
        ],
      );
      await client.query(
        "INSERT INTO local_idempotency (client_id, operation_key, request_hash, response) VALUES ($1,$2,$3,$4)",
        [clientId, key, requestHash, result],
      );
      await client.query(
        "INSERT INTO local_central_events (entitlement_id, event_type) VALUES ($1,'issued')",
        [entitlementId],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      if (error.code === "23505") {
        const replay = await centralPool.query(
          "SELECT request_hash, response FROM local_idempotency WHERE client_id=$1 AND operation_key=$2",
          [clientId, key],
        );
        if (replay.rowCount && replay.rows[0].request_hash === requestHash)
          return send(response, 200, replay.rows[0].response);
      }
      throw error;
    } finally {
      client.release();
    }
    if (
      centralResponseLoss ||
      request.headers["x-local-response-loss"] === "1"
    ) {
      centralResponseLoss = false;
      request.socket.destroy();
      return;
    }
    return send(response, 201, result);
  }

  if (url.pathname === "/lifecycle") {
    const { entitlementId, action } = parsed.value;
    const row = await centralPool.query(
      "SELECT * FROM local_entitlements WHERE id=$1 AND client_id=$2 FOR UPDATE",
      [entitlementId, clientId],
    );
    if (!row.rowCount) return send(response, 404, { error: "not_found" });
    const current = row.rows[0];
    let status = current.status;
    let validUntil = current.valid_until;
    if (["refund", "revoke", "chargeback_lost"].includes(action))
      status = "revoked";
    else if (action === "dispute_open") status = "suspended";
    else if (action === "dispute_won" && current.status !== "revoked")
      status = "active";
    else if (action === "renew") validUntil = parsed.value.validUntil;
    const nextVersion = Number(current.lifecycle_version) + 1;
    const payload = {
      ...current.envelope.payload,
      status,
      validUntil: new Date(validUntil).toISOString(),
      lifecycleVersion: nextVersion,
    };
    const envelope = signEnvelope(payload, vendorKeys(), activeVendorKid);
    await centralPool.query(
      "UPDATE local_entitlements SET status=$2, valid_until=$3, lifecycle_version=$4, envelope=$5 WHERE id=$1",
      [entitlementId, status, validUntil, nextVersion, envelope],
    );
    await centralPool.query(
      "INSERT INTO local_central_events (entitlement_id,event_type) VALUES ($1,$2)",
      [entitlementId, action],
    );
    return send(response, 200, { entitlementId, envelope });
  }

  if (url.pathname === "/activate") {
    const input = parsed.value;
    const client = await centralPool.connect();
    try {
      await client.query("BEGIN");
      const found = await client.query(
        "SELECT * FROM local_entitlements WHERE id=$1 AND client_id=$2 FOR UPDATE",
        [input.entitlementId, clientId],
      );
      if (!found.rowCount) {
        await client.query("ROLLBACK");
        return send(response, 404, { error: "not_found" });
      }
      const entitlement = found.rows[0];
      if (entitlement.status !== "active") {
        await client.query("ROLLBACK");
        return send(response, 403, { error: "not_active" });
      }
      const exact = await client.query(
        "SELECT * FROM local_activations WHERE entitlement_id=$1 AND installation_id=$2",
        [input.entitlementId, input.installationId],
      );
      if (exact.rowCount) {
        const activation = exact.rows[0];
        await client.query("COMMIT");
        if (
          activation.domain_name !== input.domain ||
          activation.key_thumbprint !== input.keyThumbprint
        )
          return send(response, 409, { error: "clone_detected" });
        return send(response, 200, {
          activationId: activation.id,
          replay: true,
        });
      }
      if (entitlement.domain_name !== input.domain && !input.transfer) {
        await client.query("ROLLBACK");
        return send(response, 403, { error: "domain_mismatch" });
      }
      if (input.transfer)
        await client.query(
          "UPDATE local_activations SET active=false WHERE entitlement_id=$1",
          [input.entitlementId],
        );
      const count = await client.query(
        "SELECT count(*)::int AS count FROM local_activations WHERE entitlement_id=$1 AND active=true",
        [input.entitlementId],
      );
      if (count.rows[0].count >= entitlement.max_activations) {
        await client.query("ROLLBACK");
        return send(response, 409, { error: "activation_limit" });
      }
      const activationId = `act_${randomUUID()}`;
      await client.query(
        `INSERT INTO local_activations
          (id, entitlement_id, installation_id, domain_name, key_thumbprint, active)
         VALUES ($1,$2,$3,$4,$5,true)`,
        [
          activationId,
          input.entitlementId,
          input.installationId,
          input.domain,
          input.keyThumbprint,
        ],
      );
      await client.query("COMMIT");
      return send(response, 201, { activationId, replay: false });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  if (url.pathname === "/validate") {
    const found = await centralPool.query(
      "SELECT envelope FROM local_entitlements WHERE id=$1 AND client_id=$2",
      [parsed.value.entitlementId, clientId],
    );
    if (!found.rowCount) return send(response, 404, { error: "not_found" });
    return send(response, 200, found.rows[0].envelope);
  }

  if (url.pathname === "/lookup") {
    const key = String(parsed.value.idempotencyKey ?? "");
    const found = await centralPool.query(
      "SELECT response FROM local_idempotency WHERE client_id=$1 AND operation_key=$2",
      [clientId, key],
    );
    return found.rowCount
      ? send(response, 200, found.rows[0].response)
      : send(response, 404, { error: "not_found" });
  }
  return send(response, 404, { error: "not_found" });
}

async function providerHandler(request, response, url, parsed) {
  if (url.pathname === "/health")
    return send(response, 200, { role: "provider", ready: true });
  if (url.pathname === "/__reset") {
    if (!isControl(request)) return send(response, 403, { error: "forbidden" });
    alerts.length = 0;
    return send(response, 200, { reset: true });
  }
  if (url.pathname === "/alerts") {
    const record = parsed.value;
    const encoded = JSON.stringify(record);
    if (/secret|licenseKey|privateKey|authorization/i.test(encoded))
      return send(response, 400, { error: "unsafe_alert" });
    alerts.push(record);
    return send(response, 202, { accepted: true });
  }
  if (url.pathname === "/alert-state") {
    if (!isControl(request)) return send(response, 403, { error: "forbidden" });
    return send(response, 200, { count: alerts.length, alerts });
  }
  if (url.pathname === "/emit") {
    if (!isControl(request)) return send(response, 403, { error: "forbidden" });
    const payload = parsed.value.event;
    const raw = JSON.stringify(payload);
    const headers = {
      "content-type": "application/json",
      "x-provider-signature": hmac(required("NR_LOCAL_PROVIDER_SECRET"), raw),
      ...(parsed.value.responseLoss ? { "x-local-response-loss": "1" } : {}),
    };
    const count = Math.max(1, Math.min(20, Number(parsed.value.count ?? 1)));
    const deliveries = await Promise.allSettled(
      Array.from({ length: count }, () =>
        fetch(`${required("NR_LOCAL_WEBSHOP_ENDPOINT")}/webhook`, {
          method: "POST",
          headers,
          body: raw,
        }),
      ),
    );
    return send(response, 200, {
      attempts: deliveries.length,
      acknowledged: deliveries.filter((entry) => entry.status === "fulfilled")
        .length,
    });
  }
  return send(response, 404, { error: "not_found" });
}

async function sendAlert(code, reference) {
  await fetch(`${required("NR_LOCAL_PROVIDER_ENDPOINT")}/alerts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      code,
      reference,
      fingerprint: sha256(`${code}:${reference}`).slice(0, 16),
    }),
  });
}

function normalizeLocalProviderEvent(event, currentState) {
  const type = {
    authorization: "payment_authorized",
    capture: "payment_captured",
    success: "payment_captured",
    refund: "refund_succeeded",
    dispute_open: "dispute_opened",
    dispute_won: "dispute_won",
    dispute_lost: "dispute_lost",
  }[event.type];
  if (!type) return null;
  return {
    type,
    amountMinor: Number(event.amount ?? currentState.totalAmountMinor),
    cumulativeCapturedMinor: ["capture", "success"].includes(event.type)
      ? currentState.totalAmountMinor
      : null,
    cumulativeRefundedMinor:
      event.type === "refund"
        ? currentState.refundedAmountMinor + Number(event.amount ?? 0)
        : null,
    adjustmentReference:
      event.type === "refund" ? (event.adjustmentRef ?? event.id) : null,
    providerEventCreatedAt: event.occurredAt ?? new Date().toISOString(),
  };
}

async function webshopHandler(request, response, url, parsed) {
  if (!cmsPool) throw new Error("CMS database is unavailable");
  if (url.pathname === "/health")
    return send(response, 200, { role: "webshop", ready: true });
  if (url.pathname === "/__reset") {
    if (!isControl(request)) return send(response, 403, { error: "forbidden" });
    return send(response, 200, { reset: true });
  }
  if (url.pathname === "/checkout") {
    if (!isControl(request)) return send(response, 403, { error: "forbidden" });
    const orderId = parsed.value.orderId ?? `ord_${randomUUID()}`;
    const itemId = parsed.value.itemId ?? `item_${randomUUID()}`;
    await cmsPool.query(
      `INSERT INTO local_orders
        (id, client_id, customer_ref, domain_name, payment_status, status,
         total_amount, refund_amount, financial_state)
       VALUES ($1,$2,$3,$4,'pending','pending',$5,0,$6)`,
      [
        orderId,
        parsed.value.clientId ?? "client-a",
        parsed.value.customerRef ?? "customer-local",
        parsed.value.domain ?? "shop.test",
        parsed.value.amount ?? 1000,
        initialPaymentFinancialState(parsed.value.amount ?? 1000),
      ],
    );
    await cmsPool.query(
      `INSERT INTO local_order_items (id, order_id, sku, addon_key, amount, fulfillment_status)
       VALUES ($1,$2,$3,$4,$5,'pending')`,
      [
        itemId,
        orderId,
        parsed.value.sku ?? "client-a:webshop",
        parsed.value.addon ?? "webshop",
        parsed.value.amount ?? 1000,
      ],
    );
    return send(response, 201, { orderId, itemId });
  }
  if (url.pathname === "/webhook") {
    const expected = hmac(required("NR_LOCAL_PROVIDER_SECRET"), parsed.raw);
    if (!safeEqual(request.headers["x-provider-signature"], expected)) {
      await sendAlert("provider_signature_invalid", "webhook");
      return send(response, 401, { error: "invalid_signature" });
    }
    const event = parsed.value;
    const client = await cmsPool.connect();
    let duplicate = false;
    try {
      await client.query("BEGIN");
      const inserted = await client.query(
        `INSERT INTO local_provider_events (id, order_id, event_type, payload_hash)
         VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING RETURNING id`,
        [event.id, event.orderId, event.type, sha256(parsed.raw)],
      );
      if (!inserted.rowCount) {
        duplicate = true;
        await client.query("COMMIT");
      } else {
        const order = await client.query(
          "SELECT * FROM local_orders WHERE id=$1 FOR UPDATE",
          [event.orderId],
        );
        if (!order.rowCount)
          throw Object.assign(new Error("unknown order"), { status: 404 });
        const item = await client.query(
          "SELECT * FROM local_order_items WHERE order_id=$1",
          [event.orderId],
        );
        const current = order.rows[0];
        const normalized = normalizeLocalProviderEvent(
          event,
          current.financial_state,
        );
        if (normalized) {
          const reduced = reduceNormalizedPaymentEvent(
            current.financial_state,
            normalized,
          );
          const paymentStatus = reduced.state.status;
          const orderStatus = ["refunded", "chargeback"].includes(paymentStatus)
            ? paymentStatus
            : current.status === "pending" &&
                ["paid", "partially_refunded"].includes(paymentStatus)
              ? "processing"
              : current.status;
          await client.query(
            `UPDATE local_orders
             SET refund_amount=$2,payment_status=$3,status=$4,financial_state=$5
             WHERE id=$1`,
            [
              event.orderId,
              reduced.state.refundedAmountMinor,
              paymentStatus,
              orderStatus,
              reduced.state,
            ],
          );
          if (
            reduced.transitionApplied &&
            ["capture", "success"].includes(event.type) &&
            ["paid", "partially_refunded"].includes(paymentStatus)
          )
            await client.query(
              `INSERT INTO local_operations (id, order_id, item_id, operation_key, operation_type, status, attempts)
               VALUES ($1,$2,$3,$4,'issue','pending',0)
               ON CONFLICT (item_id, operation_type) DO NOTHING`,
              [
                `op_${randomUUID()}`,
                event.orderId,
                item.rows[0].id,
                licenseOperationIdempotencyKey({
                  issueId: item.rows[0].id,
                  operation: "issue",
                  sourceId: event.orderId,
                  sourceType: "order",
                }),
              ],
            );
          if (
            reduced.transitionApplied &&
            ["refunded", "chargeback"].includes(paymentStatus)
          )
            await client.query(
              `INSERT INTO local_operations (id,order_id,item_id,operation_key,operation_type,status,attempts)
               VALUES ($1,$2,$3,$4,'revoke','pending',0)
               ON CONFLICT (item_id, operation_type) DO NOTHING`,
              [
                `op_${randomUUID()}`,
                event.orderId,
                item.rows[0].id,
                licenseOperationIdempotencyKey({
                  issueId: item.rows[0].id,
                  operation: "revoke",
                  sourceId: event.id,
                  sourceType: "provider_event",
                }),
              ],
            );
        }
        await client.query("COMMIT");
      }
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    if (request.headers["x-local-response-loss"] === "1") {
      request.socket.destroy();
      return;
    }
    return send(response, 200, { accepted: true, duplicate });
  }
  if (url.pathname === "/worker") {
    if (!isControl(request)) return send(response, 403, { error: "forbidden" });
    const limit = Math.max(1, Math.min(50, Number(parsed.value.limit ?? 10)));
    const processed = [];
    for (let index = 0; index < limit; index += 1) {
      const claimed = await cmsPool.query(
        `UPDATE local_operations SET status='processing', attempts=attempts+1,
           lease_owner=$1, lease_expires_at=now()+interval '30 seconds'
         WHERE id=(SELECT id FROM local_operations
           WHERE status IN ('pending','failed') OR (status='processing' AND lease_expires_at < now())
           ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
         RETURNING *`,
        [`worker-${process.pid}`],
      );
      if (!claimed.rowCount) break;
      const operation = claimed.rows[0];
      const order = (
        await cmsPool.query("SELECT * FROM local_orders WHERE id=$1", [
          operation.order_id,
        ])
      ).rows[0];
      const item = (
        await cmsPool.query("SELECT * FROM local_order_items WHERE id=$1", [
          operation.item_id,
        ])
      ).rows[0];
      try {
        if (operation.operation_type === "issue") {
          const issueInput = operation.request_payload ?? {
            clientId: order.client_id,
            orderId: order.id,
            itemId: item.id,
            sku: item.sku,
            addon: item.addon_key,
            customerRef: order.customer_ref,
            domain: order.domain_name,
            validUntil: new Date(Date.now() + 86_400_000).toISOString(),
            updatesUntil: new Date(Date.now() + 86_400_000).toISOString(),
            maxActivations: parsed.value.maxActivations ?? 1,
          };
          if (!operation.request_payload)
            await cmsPool.query(
              "UPDATE local_operations SET request_payload=$2 WHERE id=$1 AND request_payload IS NULL",
              [operation.id, issueInput],
            );
          const central = await centralFetch("/issue", issueInput, {
            clientId: order.client_id,
            idempotencyKey: operation.operation_key,
            responseLoss: parsed.value.responseLoss === true,
          });
          if (central.status === 409) {
            const decision = retryDecisionForLicenseOperation({
              kind: "http",
              httpStatus: central.status,
            });
            await cmsPool.query(
              "UPDATE local_operations SET status=$2,last_error=$3 WHERE id=$1",
              [
                operation.id,
                decision.status === "dead_letter" ? "dlq" : "failed",
                decision.code,
              ],
            );
            await sendAlert("fulfillment_idempotency_conflict", operation.id);
            processed.push({
              id: operation.id,
              status: decision.status === "dead_letter" ? "dlq" : "failed",
            });
            continue;
          }
          if (!central.ok) {
            const decision = retryDecisionForLicenseOperation({
              kind: "http",
              httpStatus: central.status,
            });
            if (decision.status === "dead_letter") {
              await cmsPool.query(
                "UPDATE local_operations SET status='dlq',last_error=$2 WHERE id=$1",
                [operation.id, decision.code],
              );
              processed.push({ id: operation.id, status: "dlq" });
              continue;
            }
            throw new Error(decision.code);
          }
          const result = await central.json();
          await cmsPool.query("BEGIN");
          try {
            await cmsPool.query(
              `INSERT INTO local_issues (item_id, entitlement_id, desired_status, envelope)
               VALUES ($1,$2,'active',$3)
               ON CONFLICT (item_id) DO UPDATE SET entitlement_id=excluded.entitlement_id,envelope=excluded.envelope`,
              [item.id, result.entitlementId, result.envelope],
            );
            await cmsPool.query(
              "UPDATE local_order_items SET fulfillment_status='fulfilled', entitlement_id=$2 WHERE id=$1",
              [item.id, result.entitlementId],
            );
            await cmsPool.query(
              "UPDATE local_operations SET status='succeeded', lease_owner=null,lease_expires_at=null WHERE id=$1",
              [operation.id],
            );
            await cmsPool.query(
              "INSERT INTO local_deliveries (operation_id) VALUES ($1) ON CONFLICT DO NOTHING",
              [operation.id],
            );
            await cmsPool.query(
              `UPDATE local_orders SET status='completed'
               WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM local_order_items WHERE order_id=$1 AND fulfillment_status <> 'fulfilled')`,
              [order.id],
            );
            await cmsPool.query("COMMIT");
          } catch (error) {
            await cmsPool.query("ROLLBACK");
            throw error;
          }
        } else {
          const issue = (
            await cmsPool.query("SELECT * FROM local_issues WHERE item_id=$1", [
              item.id,
            ])
          ).rows[0];
          if (issue) {
            const central = await centralFetch(
              "/lifecycle",
              { entitlementId: issue.entitlement_id, action: "refund" },
              { clientId: order.client_id },
            );
            if (!central.ok) throw new Error(`central_${central.status}`);
            const result = await central.json();
            await cmsPool.query(
              "UPDATE local_issues SET desired_status='revoked',envelope=$2 WHERE item_id=$1",
              [item.id, result.envelope],
            );
          }
          await cmsPool.query(
            "UPDATE local_operations SET status='succeeded',lease_owner=null,lease_expires_at=null WHERE id=$1",
            [operation.id],
          );
        }
        processed.push({ id: operation.id, status: "succeeded" });
      } catch (error) {
        const decision = retryDecisionForLicenseOperation({ kind: "network" });
        await cmsPool.query(
          "UPDATE local_operations SET status='failed',last_error=$2,lease_owner=null,lease_expires_at=null WHERE id=$1",
          [
            operation.id,
            `${decision.code}:${String(error.message).slice(0, 60)}`,
          ],
        );
        processed.push({ id: operation.id, status: "failed" });
      }
    }
    return send(response, 200, { processed });
  }
  if (url.pathname === "/reconcile") {
    if (!isControl(request)) return send(response, 403, { error: "forbidden" });
    const operations = await cmsPool.query(
      "SELECT * FROM local_operations WHERE status IN ('failed','processing') ORDER BY created_at",
    );
    for (const operation of operations.rows) {
      const order = (
        await cmsPool.query("SELECT client_id FROM local_orders WHERE id=$1", [
          operation.order_id,
        ])
      ).rows[0];
      const lookup = await centralFetch(
        "/lookup",
        { idempotencyKey: operation.operation_key },
        { clientId: order.client_id },
      );
      if (lookup.ok) {
        const result = await lookup.json();
        await cmsPool.query(
          "UPDATE local_order_items SET fulfillment_status='fulfilled',entitlement_id=$2 WHERE id=$1",
          [operation.item_id, result.entitlementId],
        );
        await cmsPool.query(
          "UPDATE local_operations SET status='succeeded',lease_owner=null,lease_expires_at=null WHERE id=$1",
          [operation.id],
        );
        await cmsPool.query(
          "INSERT INTO local_deliveries (operation_id) VALUES ($1) ON CONFLICT DO NOTHING",
          [operation.id],
        );
        await cmsPool.query(
          "INSERT INTO local_issues (item_id,entitlement_id,desired_status,envelope) VALUES ($1,$2,'active',$3) ON CONFLICT (item_id) DO UPDATE SET entitlement_id=excluded.entitlement_id,envelope=excluded.envelope",
          [operation.item_id, result.entitlementId, result.envelope],
        );
        await cmsPool.query(
          "UPDATE local_orders SET status='completed' WHERE id=$1",
          [operation.order_id],
        );
      } else if (operation.status === "processing") {
        await cmsPool.query(
          "UPDATE local_operations SET status='failed',lease_owner=null,lease_expires_at=null WHERE id=$1",
          [operation.id],
        );
      }
    }
    return send(response, 200, { checked: operations.rowCount });
  }
  if (url.pathname === "/requeue") {
    if (!isControl(request)) return send(response, 403, { error: "forbidden" });
    const updated = await cmsPool.query(
      `UPDATE local_operations
       SET status='pending', lease_owner=null, lease_expires_at=null, last_error=null
       WHERE id=$1 AND status='dlq' RETURNING operation_key`,
      [parsed.value.operationId],
    );
    return send(response, updated.rowCount ? 202 : 409, {
      requeued: updated.rowCount === 1,
      keyPreserved: updated.rowCount === 1,
    });
  }
  if (url.pathname === "/state") {
    if (!isControl(request)) return send(response, 403, { error: "forbidden" });
    const [orders, items, operations, issues, deliveries, events] =
      await Promise.all([
        cmsPool.query("SELECT * FROM local_orders ORDER BY id"),
        cmsPool.query("SELECT * FROM local_order_items ORDER BY id"),
        cmsPool.query("SELECT * FROM local_operations ORDER BY id"),
        cmsPool.query("SELECT * FROM local_issues ORDER BY item_id"),
        cmsPool.query("SELECT * FROM local_deliveries ORDER BY operation_id"),
        cmsPool.query("SELECT * FROM local_provider_events ORDER BY id"),
      ]);
    return send(response, 200, {
      orders: orders.rows,
      items: items.rows,
      operations: operations.rows,
      issues: issues.rows,
      deliveries: deliveries.rows,
      events: events.rows,
    });
  }
  return send(response, 404, { error: "not_found" });
}

async function cmsHandler(request, response, url, parsed) {
  if (!cmsPool) throw new Error("CMS database is unavailable");
  if (url.pathname === "/health")
    return send(response, 200, { role: "cms", ready: true });
  if (url.pathname === "/__reset") {
    if (!isControl(request)) return send(response, 403, { error: "forbidden" });
    cachedVendorEnvelope = null;
    cachedVendorKeys = new Map();
    installationThumbprint = "installation-local-a";
    activeCustomerKid =
      process.env.NR_LOCAL_CUSTOMER_ACTIVE_KID ?? "customer-local-a";
    return send(response, 200, { reset: true });
  }
  if (url.pathname === "/keys/vendor/refresh") {
    if (!isControl(request)) return send(response, 403, { error: "forbidden" });
    cachedVendorKeys = new Map(
      Object.entries(vendorKeys()).map(([kid, entry]) => [kid, entry]),
    );
    return send(response, 200, { keyCount: cachedVendorKeys.size });
  }
  if (url.pathname === "/vendor/verify") {
    if (!isControl(request)) return send(response, 403, { error: "forbidden" });
    const envelope = parsed.value.envelope;
    const keys = Object.fromEntries(cachedVendorKeys);
    const valid = verifyEnvelope(envelope, keys);
    const claims = envelope?.payload ?? {};
    const verificationTime = Number(parsed.value.now ?? Date.now());
    const matches =
      claims.issuer === "night-raven-vendor" &&
      claims.audience === "nr-cms-addon" &&
      claims.addon === parsed.value.addon &&
      claims.domain === parsed.value.domain &&
      claims.status === "active" &&
      Date.parse(claims.validUntil) > verificationTime;
    if (!valid || !matches) {
      await sendAlert(
        "vendor_entitlement_invalid",
        String(claims.entitlementId ?? "unknown"),
      );
      return send(response, 403, {
        valid: false,
        cachePreserved: cachedVendorEnvelope !== null,
      });
    }
    cachedVendorEnvelope = envelope;
    return send(response, 200, { valid: true, status: claims.status });
  }
  if (url.pathname === "/vendor/revalidate") {
    if (!isControl(request)) return send(response, 403, { error: "forbidden" });
    try {
      const central = await centralFetch(
        "/validate",
        { entitlementId: parsed.value.entitlementId },
        { clientId: parsed.value.clientId ?? "client-a" },
      );
      if (!central.ok) throw new Error(`central_${central.status}`);
      const envelope = await central.json();
      const keys = Object.fromEntries(cachedVendorKeys);
      if (!verifyEnvelope(envelope, keys))
        return send(response, 403, { valid: false, reason: "signature" });
      cachedVendorEnvelope = envelope;
      return send(response, 200, {
        valid: true,
        source: "online",
        status: envelope.payload.status,
      });
    } catch {
      if (!cachedVendorEnvelope)
        return send(response, 503, { valid: false, reason: "no_cache" });
      const ageMs = Number(parsed.value.cacheAgeMs ?? 0);
      const now = new Date();
      const mode = resolveEntitlementRuntimeMode({
        entitlement: cachedVendorEnvelope.payload,
        lastSuccessAt: new Date(now.getTime() - ageMs),
        now,
      });
      const operation =
        parsed.value.operation === "new_activation"
          ? "new_activation"
          : "existing_runtime";
      if (!canPerformEntitlementOperation(mode, operation))
        return send(response, 403, { valid: false, reason: mode });
      return send(response, 200, {
        valid: true,
        source: "grace",
        mode,
        status: cachedVendorEnvelope.payload.status,
      });
    }
  }
  if (url.pathname === "/installation/rotate") {
    if (!isControl(request)) return send(response, 403, { error: "forbidden" });
    const previous = installationThumbprint;
    installationThumbprint = `installation-${randomUUID()}`;
    return send(response, 200, {
      changed: previous !== installationThumbprint,
      thumbprint: sha256(installationThumbprint).slice(0, 16),
    });
  }
  if (url.pathname === "/customer/rotate") {
    if (!isControl(request)) return send(response, 403, { error: "forbidden" });
    activeCustomerKid = parsed.value.kid;
    if (!customerKeys()[activeCustomerKid])
      return send(response, 400, { error: "unknown_kid" });
    return send(response, 200, { activeKid: activeCustomerKid });
  }
  if (url.pathname === "/customer/issue") {
    if (!isControl(request)) return send(response, 403, { error: "forbidden" });
    const input = parsed.value;
    if (
      input.clientId !== input.authClientId ||
      !input.productScopes?.includes(input.productId)
    )
      return send(response, 403, { error: "product_scope_denied" });
    const licenseId = `customer_${randomUUID()}`;
    const payload = {
      issuer: `customer:${input.clientId}`,
      audience: "customer-product",
      licenseId,
      clientId: input.clientId,
      productId: input.productId,
      customerRef: input.customerRef,
      validUntil: input.validUntil,
      status: "active",
    };
    const envelope = signEnvelope(payload, customerKeys(), activeCustomerKid);
    await cmsPool.query(
      `INSERT INTO local_customer_licenses
        (id, client_id, product_id, customer_ref, issuer, status, envelope)
       VALUES ($1,$2,$3,$4,$5,'active',$6)`,
      [
        licenseId,
        input.clientId,
        input.productId,
        input.customerRef,
        payload.issuer,
        envelope,
      ],
    );
    await cmsPool.query(
      "INSERT INTO local_customer_outbox (license_id,status) VALUES ($1,'pending')",
      [licenseId],
    );
    return send(response, 201, { licenseId, envelope });
  }
  if (url.pathname === "/customer/deliver") {
    if (!isControl(request)) return send(response, 403, { error: "forbidden" });
    const rows = await cmsPool.query(
      "UPDATE local_customer_outbox SET status='delivered',attempts=attempts+1 WHERE status IN ('pending','failed') RETURNING license_id",
    );
    return send(response, 200, { delivered: rows.rowCount });
  }
  if (url.pathname === "/customer/verify") {
    if (!isControl(request)) return send(response, 403, { error: "forbidden" });
    const valid = verifyEnvelope(parsed.value.envelope, customerKeys());
    return send(response, valid ? 200 : 403, { valid });
  }
  if (url.pathname === "/install") {
    if (!isControl(request)) return send(response, 403, { error: "forbidden" });
    const input = parsed.value;
    const matching =
      input.packageAddonKey === input.expectedAddonKey &&
      input.checksum === input.expectedChecksum;
    const id = `install_${randomUUID()}`;
    await cmsPool.query(
      "INSERT INTO local_installations (id,addon_key,package_name,status,manifest_hash) VALUES ($1,$2,$3,$4,$5)",
      [
        id,
        input.expectedAddonKey,
        input.packageName,
        matching ? "install_pending" : "rejected",
        input.checksum,
      ],
    );
    return send(response, matching ? 202 : 409, {
      installationId: id,
      status: matching ? "install_pending" : "rejected",
    });
  }
  if (url.pathname === "/install/deploy") {
    if (!isControl(request)) return send(response, 403, { error: "forbidden" });
    const updated = await cmsPool.query(
      "UPDATE local_installations SET status='ready' WHERE id=$1 AND status='install_pending' RETURNING id",
      [parsed.value.installationId],
    );
    return send(response, updated.rowCount ? 200 : 409, {
      ready: updated.rowCount === 1,
    });
  }
  return send(response, 404, { error: "not_found" });
}

const handlers = {
  central: centralHandler,
  provider: providerHandler,
  webshop: webshopHandler,
  cms: cmsHandler,
};
if (!handlers[role]) throw new Error("NR_LOCAL_ROLE is invalid.");

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    const parsed =
      request.method === "GET" ? { raw: "", value: {} } : await body(request);
    await handlers[role](request, response, url, parsed);
  } catch (error) {
    if (!response.headersSent)
      send(response, error.status ?? 500, {
        error: error.status ? error.message : "internal_error",
      });
    else response.destroy();
  }
});

server.listen(port, "127.0.0.1", () => {
  process.send?.({ type: "ready", role, pid: process.pid });
});

async function shutdown() {
  server.close();
  await Promise.all([cmsPool?.end(), centralPool?.end()]);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
