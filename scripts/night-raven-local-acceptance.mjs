import assert from "node:assert/strict";
import {
  createHash,
  createHmac,
  generateKeyPairSync,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

import { config as loadEnv } from "dotenv";
import pg from "pg";

import { assertSafeTestDatabaseUrl } from "./database-test-safety.mjs";

// This runner exercises the Night Raven contracts over real loopback processes
// and PostgreSQL databases. It is deliberately not a deployable production
// runtime and its evidence can never satisfy the staging/production rollout gate.
const { Client, Pool } = pg;
const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1"]);
const DATABASE_PREFIX = "nr_accept_";
const SCHEMA_VERSION = 1;

function fail(message) {
  throw new Error(`[night-raven-local] ${message}`);
}

function safeFailureReason(error) {
  const value = String(error?.message ?? "local acceptance assertion failed")
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[redacted-database-url]")
    .replace(/-----BEGIN[\s\S]*?-----END[^-]+-----/g, "[redacted-key]")
    .replace(/[A-Za-z0-9_-]{40,}/g, "[redacted-value]")
    .slice(0, 240);
  return /(?:password|private.?key|authorization|credential|secret)\s*[:=]/i.test(
    value,
  )
    ? "redacted local acceptance failure"
    : value;
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

function withDatabase(url, database) {
  const next = new URL(url);
  next.pathname = `/${database}`;
  next.search = "";
  next.hash = "";
  return next.toString();
}

async function loadLocalDatabaseSource() {
  if (!process.env.TEST_DATABASE_URL && !process.env.DATABASE_URL)
    loadEnv({ path: resolve(".env"), quiet: true });
  const raw = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!raw)
    fail(
      "a loopback TEST_DATABASE_URL or local .env DATABASE_URL is required.",
    );
  let url;
  try {
    url = new URL(raw);
  } catch {
    fail("local database configuration is not a PostgreSQL URL.");
  }
  if (!LOOPBACK.has(url.hostname.toLowerCase()))
    fail("local acceptance only accepts a loopback PostgreSQL server.");
  if (!/^postgres(?:ql)?:$/.test(url.protocol))
    fail("local acceptance requires PostgreSQL.");
  return url;
}

async function adminQuery(source, text, values = []) {
  const client = new Client({
    connectionString: withDatabase(source, "postgres"),
  });
  await client.connect();
  try {
    return await client.query(text, values);
  } finally {
    await client.end();
  }
}

async function createDatabase(source, name) {
  if (!/^nr_accept_[a-z0-9_]+_test$/.test(name))
    fail("unsafe local database name.");
  await adminQuery(source, `CREATE DATABASE "${name}"`);
}

async function dropDatabase(source, name) {
  if (!/^nr_accept_[a-z0-9_]+_test$/.test(name))
    fail("unsafe local database name.");
  await adminQuery(
    source,
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid <> pg_backend_pid()",
    [name],
  );
  await adminQuery(source, `DROP DATABASE IF EXISTS "${name}"`);
}

const CMS_SCHEMA = `
CREATE TABLE local_orders (
  id text PRIMARY KEY, client_id text NOT NULL, customer_ref text NOT NULL,
  domain_name text NOT NULL, payment_status text NOT NULL, status text NOT NULL,
  total_amount integer NOT NULL, refund_amount integer NOT NULL DEFAULT 0,
  financial_state jsonb NOT NULL
);
CREATE TABLE local_order_items (
  id text PRIMARY KEY, order_id text NOT NULL REFERENCES local_orders(id), sku text NOT NULL,
  addon_key text NOT NULL, amount integer NOT NULL, fulfillment_status text NOT NULL,
  entitlement_id text
);
CREATE TABLE local_provider_events (
  id text PRIMARY KEY, order_id text NOT NULL, event_type text NOT NULL,
  payload_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE local_operations (
  id text PRIMARY KEY, order_id text NOT NULL REFERENCES local_orders(id),
  item_id text NOT NULL REFERENCES local_order_items(id), operation_key text NOT NULL UNIQUE,
  operation_type text NOT NULL, status text NOT NULL, attempts integer NOT NULL DEFAULT 0,
  lease_owner text, lease_expires_at timestamptz, last_error text, request_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(item_id, operation_type)
);
CREATE TABLE local_issues (
  item_id text PRIMARY KEY REFERENCES local_order_items(id), entitlement_id text NOT NULL,
  desired_status text NOT NULL, envelope jsonb NOT NULL
);
CREATE TABLE local_deliveries (
  operation_id text PRIMARY KEY REFERENCES local_operations(id), delivered_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE local_customer_licenses (
  id text PRIMARY KEY, client_id text NOT NULL, product_id text NOT NULL,
  customer_ref text NOT NULL, issuer text NOT NULL, status text NOT NULL, envelope jsonb NOT NULL
);
CREATE TABLE local_customer_outbox (
  license_id text PRIMARY KEY REFERENCES local_customer_licenses(id), status text NOT NULL,
  attempts integer NOT NULL DEFAULT 0
);
CREATE TABLE local_installations (
  id text PRIMARY KEY, addon_key text NOT NULL, package_name text NOT NULL,
  status text NOT NULL, manifest_hash text NOT NULL
);`;

const CENTRAL_SCHEMA = `
CREATE TABLE local_nonces (
  client_id text NOT NULL, nonce text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(client_id, nonce)
);
CREATE TABLE local_entitlements (
  id text PRIMARY KEY, client_id text NOT NULL, order_id text NOT NULL, item_id text NOT NULL,
  sku text NOT NULL, addon_key text NOT NULL, customer_ref text NOT NULL, domain_name text NOT NULL,
  status text NOT NULL, valid_until timestamptz NOT NULL, updates_until timestamptz NOT NULL,
  lifecycle_version integer NOT NULL, max_activations integer NOT NULL, envelope jsonb NOT NULL,
  UNIQUE(client_id, item_id, sku)
);
CREATE TABLE local_idempotency (
  client_id text NOT NULL, operation_key text NOT NULL, request_hash text NOT NULL,
  response jsonb NOT NULL, PRIMARY KEY(client_id, operation_key)
);
CREATE TABLE local_activations (
  id text PRIMARY KEY, entitlement_id text NOT NULL REFERENCES local_entitlements(id),
  installation_id text NOT NULL, domain_name text NOT NULL, key_thumbprint text NOT NULL,
  active boolean NOT NULL, UNIQUE(entitlement_id, installation_id)
);
CREATE TABLE local_central_events (
  sequence bigserial PRIMARY KEY, entitlement_id text NOT NULL,
  event_type text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);`;

async function initializeDatabase(url, schema) {
  const client = new Client({
    connectionString: assertSafeTestDatabaseUrl(url),
  });
  await client.connect();
  try {
    await client.query(schema);
  } finally {
    await client.end();
  }
}

async function freePort() {
  return await new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolvePort(address.port));
    });
  });
}

function keyPair() {
  const pair = generateKeyPairSync("ed25519");
  return {
    privateKey: pair.privateKey.export({ type: "pkcs8", format: "pem" }),
    publicKey: pair.publicKey.export({ type: "spki", format: "pem" }),
  };
}

function redactChildError(value) {
  return String(value)
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[redacted-database-url]")
    .replace(/-----BEGIN[\s\S]*?-----END[^-]+-----/g, "[redacted-key]")
    .slice(-1000);
}

async function startService(role, port, env) {
  const child = spawn(
    process.execPath,
    [resolve("scripts/night-raven-local-service.mjs")],
    {
      env: {
        ...process.env,
        ...env,
        NR_LOCAL_ROLE: role,
        NR_LOCAL_PORT: String(port),
      },
      stdio: ["ignore", "ignore", "pipe", "ipc"],
      shell: false,
    },
  );
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  try {
    await new Promise((resolveReady, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`${role} readiness timeout`)),
        15_000,
      );
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once("exit", (code) => {
        clearTimeout(timer);
        reject(
          new Error(`${role} exited ${code ?? 1}: ${redactChildError(stderr)}`),
        );
      });
      child.on("message", (message) => {
        if (message?.type === "ready" && message.role === role) {
          clearTimeout(timer);
          resolveReady();
        }
      });
    });
  } catch (error) {
    if (child.exitCode === null) child.kill("SIGTERM");
    throw error;
  }
  return child;
}

async function stopService(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolveExit) => child.once("exit", resolveExit)),
    new Promise((resolveTimeout) => setTimeout(resolveTimeout, 3_000)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

export async function runLocalAcceptance({
  scenarioIds,
  drillIds,
  evidenceDirectory,
} = {}) {
  const source = await loadLocalDatabaseSource();
  const runToken = randomBytes(5).toString("hex");
  const cmsDatabase = `${DATABASE_PREFIX}${runToken}_cms_test`;
  const centralDatabase = `${DATABASE_PREFIX}${runToken}_central_test`;
  const cmsUrl = withDatabase(source, cmsDatabase);
  const centralUrl = withDatabase(source, centralDatabase);
  const controlToken = randomBytes(32).toString("base64url");
  const providerSecret = randomBytes(32).toString("base64url");
  const centralHmac = randomBytes(32).toString("base64url");
  const vendorKeys = {
    "vendor-local-a": keyPair(),
    "vendor-local-b": keyPair(),
  };
  const customerKeys = {
    "customer-local-a": keyPair(),
    "customer-local-b": keyPair(),
  };
  const roles = ["provider", "central", "webshop", "cms"];
  const ports = Object.fromEntries(
    await Promise.all(roles.map(async (entry) => [entry, await freePort()])),
  );
  const endpoints = Object.fromEntries(
    roles.map((entry) => [entry, `http://127.0.0.1:${ports[entry]}`]),
  );
  const children = [];
  const restoreDatabases = [];
  let cmsPool;
  let centralPool;
  let httpRequests = 0;
  const rootRunId = `local-${new Date().toISOString().replace(/[-:.TZ]/g, "")}-${runToken}`;
  const outputRoot = resolve(
    evidenceDirectory ?? ".tmp/night-raven-local-acceptance",
    rootRunId,
  );

  const request = async (
    endpoint,
    path,
    value = {},
    { control = true, headers = {} } = {},
  ) => {
    httpRequests += 1;
    let response;
    try {
      response = await fetch(`${endpoints[endpoint]}${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(control ? { "x-local-control": controlToken } : {}),
          ...headers,
        },
        body: JSON.stringify(value),
      });
    } catch (error) {
      return { status: 599, ok: false, lost: true, error: error.name };
    }
    let result = {};
    try {
      result = await response.json();
    } catch {
      result = {};
    }
    return { ...result, status: response.status, ok: response.ok };
  };

  const centralRequest = async (
    path,
    value,
    { clientId = "client-a", idempotencyKey } = {},
  ) => {
    httpRequests += 1;
    const raw = JSON.stringify(value);
    const timestamp = String(Date.now());
    const nonce = randomUUID();
    const canonical = [
      "NRLS-HMAC-V2",
      "POST",
      path,
      timestamp,
      nonce,
      clientId,
      idempotencyKey ?? "",
      sha256(raw),
    ].join("\n");
    const response = await fetch(`${endpoints.central}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-nr-client": clientId,
        "x-nr-timestamp": timestamp,
        "x-nr-nonce": nonce,
        "x-nr-signature": hmac(centralHmac, canonical),
        ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
      },
      body: raw,
    });
    return {
      ...(await response.json()),
      status: response.status,
      ok: response.ok,
    };
  };

  const reset = async () => {
    await cmsPool.query(
      "TRUNCATE local_deliveries,local_issues,local_operations,local_provider_events,local_order_items,local_orders,local_customer_outbox,local_customer_licenses,local_installations RESTART IDENTITY CASCADE",
    );
    await centralPool.query(
      "TRUNCATE local_activations,local_central_events,local_idempotency,local_entitlements,local_nonces RESTART IDENTITY CASCADE",
    );
    await request("provider", "/__reset");
    await request("central", "/__control", { reset: true });
    await request("webshop", "/__reset");
    await request("cms", "/__reset");
  };

  const state = () => request("webshop", "/state");
  const providerEvent = (event, options = {}) =>
    request("provider", "/emit", { event, ...options });
  const worker = (options = {}) => request("webshop", "/worker", options);

  const purchase = async ({
    addon = "webshop",
    clientId = "client-a",
    amount = 1000,
    workerOptions = {},
  } = {}) => {
    const checkout = await request("webshop", "/checkout", {
      clientId,
      sku: `${clientId}:${addon}`,
      addon,
      amount,
      domain: "shop.test",
      customerRef: "customer-local",
    });
    assert.equal(checkout.status, 201);
    const emitted = await providerEvent({
      id: `evt_${randomUUID()}`,
      type: "capture",
      orderId: checkout.orderId,
      amount,
    });
    assert.equal(emitted.status, 200);
    const worked = await worker(workerOptions);
    return { checkout, emitted, worked, current: await state() };
  };

  const issueInput = (overrides = {}) => ({
    clientId: "client-a",
    orderId: `direct-order-${randomUUID()}`,
    itemId: `direct-item-${randomUUID()}`,
    sku: "client-a:webshop",
    addon: "webshop",
    customerRef: "customer-local",
    domain: "shop.test",
    validUntil: new Date(Date.now() + 86_400_000).toISOString(),
    updatesUntil: new Date(Date.now() + 86_400_000).toISOString(),
    maxActivations: 1,
    ...overrides,
  });

  const directIssue = async (
    input = issueInput(),
    key = `direct:${randomUUID()}`,
    clientId = input.clientId,
  ) => {
    const result = await centralRequest("/issue", input, {
      clientId,
      idempotencyKey: key,
    });
    return { input, key, result };
  };

  const assertPurchaseCompleted = (result, addon = "webshop") => {
    assert.equal(result.current.orders.length, 1);
    assert.equal(result.current.orders[0].payment_status, "paid");
    assert.equal(result.current.orders[0].status, "completed");
    assert.equal(result.current.items[0].addon_key, addon);
    assert.equal(result.current.items[0].fulfillment_status, "fulfilled");
    assert.equal(result.current.operations.length, 1);
    assert.equal(result.current.operations[0].status, "succeeded");
    assert.equal(result.current.issues.length, 1);
    assert.equal(result.current.deliveries.length, 1);
    assert.equal(result.current.events.length, 1);
  };

  const assertLocalInvariants = async () => {
    const checks = await Promise.all([
      cmsPool.query(
        `SELECT count(*)::int AS count
         FROM local_orders orders
         JOIN local_order_items items ON items.order_id=orders.id
         WHERE orders.status='completed' AND items.fulfillment_status <> 'fulfilled'`,
      ),
      cmsPool.query(
        `SELECT count(*)::int AS count
         FROM local_issues issues
         JOIN local_order_items items ON items.id=issues.item_id
         JOIN local_orders orders ON orders.id=items.order_id
         WHERE orders.payment_status IN ('refunded','chargeback')
           AND issues.desired_status='active'`,
      ),
      cmsPool.query(
        `SELECT count(*)::int AS count FROM local_operations
         WHERE status='processing' AND lease_expires_at < now()`,
      ),
      centralPool.query(
        `SELECT count(*)::int AS count FROM (
           SELECT client_id,item_id,sku,count(*) FROM local_entitlements
           GROUP BY client_id,item_id,sku HAVING count(*) > 1
         ) duplicates`,
      ),
      centralPool.query(
        `SELECT count(*)::int AS count FROM (
           SELECT entitlements.id
           FROM local_entitlements entitlements
           JOIN local_activations activations
             ON activations.entitlement_id=entitlements.id AND activations.active=true
           GROUP BY entitlements.id,entitlements.max_activations
           HAVING count(*) > entitlements.max_activations
         ) exceeded`,
      ),
    ]);
    const violations = checks.reduce(
      (total, result) => total + Number(result.rows[0].count),
      0,
    );
    assert.equal(violations, 0, "local SQL/data invariants");
    return {
      invariantsChecked: checks.length,
      invariantViolations: violations,
    };
  };

  const scenario = async (id) => {
    await reset();
    let assertions = 0;
    const check = (condition, message) => {
      assertions += 1;
      assert.ok(condition, message);
    };
    switch (id) {
      case "webshop_purchase": {
        const result = await purchase();
        assertPurchaseCompleted(result);
        const central = await centralPool.query(
          "SELECT count(*)::int AS count FROM local_entitlements",
        );
        check(central.rows[0].count === 1, "one central entitlement");
        break;
      }
      case "license_server_addon_purchase": {
        const result = await purchase({ addon: "license-server" });
        assertPurchaseCompleted(result, "license-server");
        const checksum = sha256("local-license-server-package");
        const install = await request("cms", "/install", {
          packageName: "@nr-cms/license-server",
          expectedAddonKey: "license-server",
          packageAddonKey: "license-server",
          checksum,
          expectedChecksum: checksum,
        });
        check(install.status === 202, "install pending");
        const deploy = await request("cms", "/install/deploy", {
          installationId: install.installationId,
        });
        check(deploy.ready === true, "deploy ready");
        await request("cms", "/keys/vendor/refresh");
        const revalidated = await request("cms", "/vendor/verify", {
          envelope: result.current.issues[0].envelope,
          addon: "license-server",
          domain: "shop.test",
        });
        check(revalidated.status === 200, "addon vendor revalidation");
        break;
      }
      case "duplicate_webhook": {
        const checkout = await request("webshop", "/checkout", {
          clientId: "client-a",
          sku: "client-a:webshop",
          addon: "webshop",
          amount: 1000,
        });
        const event = {
          id: `evt_${randomUUID()}`,
          type: "capture",
          orderId: checkout.orderId,
          amount: 1000,
        };
        await providerEvent(event, { count: 10 });
        await Promise.all(Array.from({ length: 5 }, () => worker()));
        const current = await state();
        check(current.events.length === 1, "one inbox event");
        check(current.operations.length === 1, "one operation");
        check(current.deliveries.length === 1, "one delivery");
        break;
      }
      case "central_outage_after_paid": {
        await request("central", "/__control", { outage: true });
        const first = await purchase();
        check(
          first.current.orders[0].payment_status === "paid",
          "payment durable",
        );
        check(
          first.current.orders[0].status === "processing",
          "not falsely complete",
        );
        check(
          first.current.operations[0].status === "failed",
          "retry retained",
        );
        await request("central", "/__control", { outage: false });
        await worker();
        const recovered = await state();
        check(recovered.orders[0].status === "completed", "recovered");
        break;
      }
      case "issue_response_loss":
      case "response_loss_after_commit": {
        const result = await purchase({
          workerOptions: { responseLoss: true, limit: 1 },
        });
        check(
          result.current.operations[0].status === "failed",
          `response loss retained; actual=${result.current.operations[0].status}`,
        );
        const central = await centralPool.query(
          "SELECT count(*)::int AS count FROM local_entitlements",
        );
        check(central.rows[0].count === 1, "central commit exists");
        await request("webshop", "/reconcile");
        const recovered = await state();
        check(
          recovered.orders[0].status === "completed",
          "reconciliation completes",
        );
        check(recovered.deliveries.length === 1, "one delivery");
        break;
      }
      case "idempotency_replay_conflict": {
        const input = issueInput();
        const key = `same:${randomUUID()}`;
        const first = await directIssue(input, key);
        const replay = await directIssue(input, key);
        const conflict = await directIssue(
          { ...input, sku: "client-a:license-server" },
          key,
        );
        check(first.result.status === 201, "created");
        check(
          replay.result.status === 200 &&
            replay.result.entitlementId === first.result.entitlementId,
          "same replay",
        );
        check(conflict.result.status === 409, "conflict");
        break;
      }
      case "refund":
      case "refund_delayed_success": {
        const result = await purchase();
        const orderId = result.checkout.orderId;
        await providerEvent({
          id: `evt_${randomUUID()}`,
          type: "refund",
          orderId,
          amount: 400,
        });
        let current = await state();
        check(
          current.orders[0].payment_status === "partially_refunded",
          "partial refund",
        );
        await providerEvent({
          id: `evt_${randomUUID()}`,
          type: "refund",
          orderId,
          amount: 600,
        });
        await worker();
        await providerEvent({
          id: `evt_${randomUUID()}`,
          type: "success",
          orderId,
          amount: 1000,
        });
        current = await state();
        check(
          current.orders[0].payment_status === "refunded",
          "delayed success ignored",
        );
        check(
          current.issues[0].desired_status === "revoked",
          "entitlement revoked",
        );
        break;
      }
      case "chargeback":
      case "chargeback_out_of_order": {
        const result = await purchase();
        const orderId = result.checkout.orderId;
        await providerEvent({
          id: `evt_${randomUUID()}`,
          type: "dispute_open",
          orderId,
        });
        await providerEvent({
          id: `evt_${randomUUID()}`,
          type: "dispute_won",
          orderId,
        });
        await providerEvent({
          id: `evt_${randomUUID()}`,
          type: "dispute_lost",
          orderId,
        });
        await worker();
        const current = await state();
        check(
          current.orders[0].payment_status === "chargeback",
          "lost dispute wins ordering",
        );
        check(
          current.issues[0].desired_status === "revoked",
          "chargeback revoked",
        );
        break;
      }
      case "license_expiry": {
        const issued = await directIssue(
          issueInput({
            validUntil: new Date(Date.now() + 30 * 86_400_000).toISOString(),
          }),
        );
        await request("cms", "/keys/vendor/refresh");
        const now = Date.parse(issued.result.envelope.payload.validUntil) + 1;
        const verification = await request("cms", "/vendor/verify", {
          envelope: issued.result.envelope,
          addon: "webshop",
          domain: "shop.test",
          now,
        });
        check(verification.status === 403, "expired claim rejected");
        const health = await fetch(`${endpoints.cms}/health`);
        check(health.ok, "public runtime remains healthy");
        break;
      }
      case "renewal": {
        const issued = await directIssue();
        const next = new Date(Date.now() + 172_800_000).toISOString();
        const renewed = await centralRequest("/lifecycle", {
          entitlementId: issued.result.entitlementId,
          action: "renew",
          validUntil: next,
        });
        check(
          renewed.entitlementId === issued.result.entitlementId,
          "same entitlement",
        );
        check(
          renewed.envelope.payload.lifecycleVersion === 2,
          "version advanced",
        );
        check(
          Date.parse(renewed.envelope.payload.validUntil) === Date.parse(next),
          "validity extended",
        );
        break;
      }
      case "revocation": {
        const issued = await directIssue();
        const revoked = await centralRequest("/lifecycle", {
          entitlementId: issued.result.entitlementId,
          action: "revoke",
        });
        check(
          revoked.envelope.payload.status === "revoked",
          "signed revoked state",
        );
        const activation = await centralRequest("/activate", {
          entitlementId: issued.result.entitlementId,
          installationId: "install-a",
          domain: "shop.test",
          keyThumbprint: "key-a",
        });
        check(activation.status === 403, "new activation blocked");
        break;
      }
      case "domain_transfer": {
        const issued = await directIssue();
        const denied = await centralRequest("/activate", {
          entitlementId: issued.result.entitlementId,
          installationId: "install-b",
          domain: "other.test",
          keyThumbprint: "key-b",
        });
        const first = await centralRequest("/activate", {
          entitlementId: issued.result.entitlementId,
          installationId: "install-a",
          domain: "shop.test",
          keyThumbprint: "key-a",
        });
        const transferred = await centralRequest("/activate", {
          entitlementId: issued.result.entitlementId,
          installationId: "install-b",
          domain: "other.test",
          keyThumbprint: "key-b",
          transfer: true,
        });
        check(denied.status === 403, "unapproved domain denied");
        check(
          first.status === 201 && transferred.status === 201,
          "controlled transfer works",
        );
        const active = await centralPool.query(
          "SELECT count(*)::int AS count FROM local_activations WHERE active=true",
        );
        check(active.rows[0].count === 1, "old activation disabled");
        break;
      }
      case "activation_limit_parallel": {
        const issued = await directIssue(issueInput({ maxActivations: 2 }));
        const attempts = await Promise.all(
          Array.from({ length: 10 }, (_, index) =>
            centralRequest("/activate", {
              entitlementId: issued.result.entitlementId,
              installationId: `install-${index}`,
              domain: "shop.test",
              keyThumbprint: `key-${index}`,
            }),
          ),
        );
        check(
          attempts.filter((entry) => entry.status === 201).length === 2,
          "exact activation limit",
        );
        check(
          attempts.filter((entry) => entry.status === 409).length === 8,
          "stable denials",
        );
        break;
      }
      case "cloned_installation":
      case "clone_identity": {
        const issued = await directIssue();
        const first = await centralRequest("/activate", {
          entitlementId: issued.result.entitlementId,
          installationId: "clone-id",
          domain: "shop.test",
          keyThumbprint: "key-original",
        });
        const clone = await centralRequest("/activate", {
          entitlementId: issued.result.entitlementId,
          installationId: "clone-id",
          domain: "shop.test",
          keyThumbprint: "key-clone",
        });
        check(first.status === 201, "original accepted");
        check(
          clone.status === 409 && clone.error === "clone_detected",
          "clone rejected",
        );
        break;
      }
      case "outage_grace":
      case "outage_grace_fail_closed": {
        const issued = await directIssue(
          issueInput({
            validUntil: new Date(Date.now() + 30 * 86_400_000).toISOString(),
          }),
        );
        await request("cms", "/keys/vendor/refresh");
        const cached = await request("cms", "/vendor/verify", {
          envelope: issued.result.envelope,
          addon: "webshop",
          domain: "shop.test",
        });
        check(cached.status === 200, "valid cache seeded");
        await request("central", "/__control", { outage: true });
        const grace = await request("cms", "/vendor/revalidate", {
          entitlementId: issued.result.entitlementId,
          cacheAgeMs: 3 * 86_400_000,
          operation: "existing",
        });
        const risky = await request("cms", "/vendor/revalidate", {
          entitlementId: issued.result.entitlementId,
          cacheAgeMs: 3 * 86_400_000,
          operation: "new_activation",
        });
        const expired = await request("cms", "/vendor/revalidate", {
          entitlementId: issued.result.entitlementId,
          cacheAgeMs: 15 * 86_400_000,
          operation: "existing",
        });
        check(
          grace.status === 200 && grace.source === "grace",
          "existing use in grace",
        );
        check(risky.status === 403, "risky operation fail closed");
        check(expired.status === 403, "after grace fail closed");
        break;
      }
      case "forged_entitlement":
      case "forged_signature_cache_protection": {
        const issued = await directIssue();
        await request("cms", "/keys/vendor/refresh");
        const valid = await request("cms", "/vendor/verify", {
          envelope: issued.result.envelope,
          addon: "webshop",
          domain: "shop.test",
        });
        check(valid.status === 200, "valid seed");
        const mutations = [
          {
            ...issued.result.envelope,
            signature: `${issued.result.envelope.signature[0] === "A" ? "B" : "A"}${issued.result.envelope.signature.slice(1)}`,
          },
          { ...issued.result.envelope, kid: "unknown-kid" },
          {
            ...issued.result.envelope,
            payload: { ...issued.result.envelope.payload, issuer: "forged" },
          },
          {
            ...issued.result.envelope,
            payload: { ...issued.result.envelope.payload, audience: "forged" },
          },
          {
            ...issued.result.envelope,
            payload: {
              ...issued.result.envelope.payload,
              addon: "license-server",
            },
          },
          {
            ...issued.result.envelope,
            payload: { ...issued.result.envelope.payload, domain: "evil.test" },
          },
        ];
        for (const [index, envelope] of mutations.entries()) {
          const rejected = await request("cms", "/vendor/verify", {
            envelope,
            addon: "webshop",
            domain: "shop.test",
          });
          check(
            rejected.status === 403 && rejected.cachePreserved === true,
            `forgery ${index} rejected without cache overwrite`,
          );
        }
        break;
      }
      case "customer_local_issuer":
      case "customer_local_delivery": {
        const before = await centralPool.query(
          "SELECT count(*)::int AS count FROM local_entitlements",
        );
        const issued = await request("cms", "/customer/issue", {
          clientId: "customer-client-a",
          authClientId: "customer-client-a",
          productId: "product-a",
          productScopes: ["product-a"],
          customerRef: "customer-local",
          validUntil: new Date(Date.now() + 86_400_000).toISOString(),
        });
        check(issued.status === 201, "customer-local issue");
        const verified = await request("cms", "/customer/verify", {
          envelope: issued.envelope,
        });
        check(verified.status === 200, "customer signature verifies");
        const after = await centralPool.query(
          "SELECT count(*)::int AS count FROM local_entitlements",
        );
        check(
          after.rows[0].count === before.rows[0].count,
          "vendor DB unchanged",
        );
        if (id === "customer_local_delivery") {
          const delivered = await request("cms", "/customer/deliver");
          check(delivered.delivered === 1, "local outbox delivered");
        }
        break;
      }
      case "cross_tenant_access":
      case "cross_client_product_scope": {
        const issued = await directIssue();
        const crossRead = await centralRequest(
          "/validate",
          { entitlementId: issued.result.entitlementId },
          { clientId: "client-b" },
        );
        const crossIssue = await directIssue(
          { ...issueInput(), clientId: "client-a", sku: "client-a:webshop" },
          `cross:${randomUUID()}`,
          "client-b",
        );
        const customer = await request("cms", "/customer/issue", {
          clientId: "customer-client-a",
          authClientId: "customer-client-a",
          productId: "product-b",
          productScopes: ["product-a"],
          customerRef: "customer-local",
          validUntil: new Date(Date.now() + 86_400_000).toISOString(),
        });
        check(crossRead.status === 404, "other tenant resource hidden");
        check(crossIssue.result.status === 403, "other client issue denied");
        check(
          customer.status === 403 && !customer.licenseId,
          "product scope denied without metadata",
        );
        break;
      }
      case "parallel_issue": {
        const input = issueInput();
        const key = `parallel:${randomUUID()}`;
        const results = await Promise.all(
          Array.from({ length: 10 }, () => directIssue(input, key)),
        );
        const ids = new Set(results.map((entry) => entry.result.entitlementId));
        const rows = await centralPool.query(
          "SELECT count(*)::int AS count FROM local_entitlements",
        );
        check(
          ids.size === 1 && rows.rows[0].count === 1,
          "one resource under parallel issue",
        );
        break;
      }
      case "stale_worker_recovery": {
        await request("central", "/__control", { outage: true });
        const result = await purchase();
        await cmsPool.query(
          "UPDATE local_operations SET status='processing',lease_owner='dead-worker',lease_expires_at=now()-interval '1 second'",
        );
        await request("central", "/__control", { outage: false });
        await worker();
        const recovered = await state();
        check(
          recovered.operations[0].status === "succeeded",
          "stale lease reclaimed",
        );
        check(recovered.operations[0].attempts >= 2, "retry counted");
        check(
          result.current.orders[0].status === "processing",
          "was pending before recovery",
        );
        break;
      }
      case "installation_key_rotation": {
        const first = await request("cms", "/installation/rotate");
        const second = await request("cms", "/installation/rotate");
        check(first.changed && second.changed, "installation key rotates");
        check(first.thumbprint !== second.thumbprint, "distinct fingerprints");
        break;
      }
      case "vendor_signing_key_rotation": {
        const oldIssue = await directIssue();
        await request("central", "/__control", {
          activeVendorKid: "vendor-local-b",
        });
        const newIssue = await directIssue();
        await request("cms", "/keys/vendor/refresh");
        const oldValid = await request("cms", "/vendor/verify", {
          envelope: oldIssue.result.envelope,
          addon: "webshop",
          domain: "shop.test",
        });
        const newValid = await request("cms", "/vendor/verify", {
          envelope: newIssue.result.envelope,
          addon: "webshop",
          domain: "shop.test",
        });
        check(
          oldIssue.result.envelope.kid !== newIssue.result.envelope.kid,
          "kid changed",
        );
        check(
          oldValid.status === 200 && newValid.status === 200,
          "overlap verifies",
        );
        break;
      }
      case "package_manifest_mismatch": {
        const mismatch = await request("cms", "/install", {
          packageName: "@nr-cms/webshop",
          expectedAddonKey: "webshop",
          packageAddonKey: "license-server",
          checksum: sha256("one"),
          expectedChecksum: sha256("two"),
        });
        check(
          mismatch.status === 409 && mismatch.status !== "ready",
          "manifest mismatch rejected",
        );
        break;
      }
      case "install_pending_deploy_ready": {
        const checksum = sha256("immutable-package");
        const install = await request("cms", "/install", {
          packageName: "@nr-cms/webshop",
          expectedAddonKey: "webshop",
          packageAddonKey: "webshop",
          checksum,
          expectedChecksum: checksum,
        });
        check(
          install.status === 202 && install.status !== "ready",
          "pending before deploy",
        );
        const deploy = await request("cms", "/install/deploy", {
          installationId: install.installationId,
        });
        check(deploy.ready, "ready after callback");
        const duplicate = await request("cms", "/install/deploy", {
          installationId: install.installationId,
        });
        check(duplicate.status === 409, "duplicate callback controlled");
        break;
      }
      default:
        fail(`local scenario is not implemented: ${id}`);
    }
    return { assertions };
  };

  const logicalRestore = async () => {
    const restoredCmsName = `${DATABASE_PREFIX}${runToken}_restore_cms_test`;
    const restoredCentralName = `${DATABASE_PREFIX}${runToken}_restore_central_test`;
    await createDatabase(source, restoredCmsName);
    restoreDatabases.push(restoredCmsName);
    await createDatabase(source, restoredCentralName);
    restoreDatabases.push(restoredCentralName);
    const restoredCmsUrl = withDatabase(source, restoredCmsName);
    const restoredCentralUrl = withDatabase(source, restoredCentralName);
    await initializeDatabase(restoredCmsUrl, CMS_SCHEMA);
    await initializeDatabase(restoredCentralUrl, CENTRAL_SCHEMA);
    const cmsSnapshot = {
      orders: (await cmsPool.query("SELECT * FROM local_orders ORDER BY id"))
        .rows,
      items: (
        await cmsPool.query("SELECT * FROM local_order_items ORDER BY id")
      ).rows,
      operations: (
        await cmsPool.query("SELECT * FROM local_operations ORDER BY id")
      ).rows,
      issues: (
        await cmsPool.query("SELECT * FROM local_issues ORDER BY item_id")
      ).rows,
      deliveries: (
        await cmsPool.query(
          "SELECT * FROM local_deliveries ORDER BY operation_id",
        )
      ).rows,
    };
    const centralSnapshot = {
      entitlements: (
        await centralPool.query("SELECT * FROM local_entitlements ORDER BY id")
      ).rows,
      idempotency: (
        await centralPool.query(
          "SELECT * FROM local_idempotency ORDER BY client_id,operation_key",
        )
      ).rows,
      activations: (
        await centralPool.query("SELECT * FROM local_activations ORDER BY id")
      ).rows,
      events: (
        await centralPool.query(
          "SELECT * FROM local_central_events ORDER BY sequence",
        )
      ).rows,
    };
    const restoredCms = new Pool({ connectionString: restoredCmsUrl });
    const restoredCentral = new Pool({ connectionString: restoredCentralUrl });
    try {
      for (const row of cmsSnapshot.orders)
        await restoredCms.query(
          "INSERT INTO local_orders VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
          [
            row.id,
            row.client_id,
            row.customer_ref,
            row.domain_name,
            row.payment_status,
            row.status,
            row.total_amount,
            row.refund_amount,
            row.financial_state,
          ],
        );
      for (const row of cmsSnapshot.items)
        await restoredCms.query(
          "INSERT INTO local_order_items VALUES ($1,$2,$3,$4,$5,$6,$7)",
          [
            row.id,
            row.order_id,
            row.sku,
            row.addon_key,
            row.amount,
            row.fulfillment_status,
            row.entitlement_id,
          ],
        );
      for (const row of cmsSnapshot.operations)
        await restoredCms.query(
          "INSERT INTO local_operations VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
          [
            row.id,
            row.order_id,
            row.item_id,
            row.operation_key,
            row.operation_type,
            row.status,
            row.attempts,
            row.lease_owner,
            row.lease_expires_at,
            row.last_error,
            row.request_payload,
            row.created_at,
          ],
        );
      for (const row of cmsSnapshot.issues)
        await restoredCms.query(
          "INSERT INTO local_issues VALUES ($1,$2,$3,$4)",
          [row.item_id, row.entitlement_id, row.desired_status, row.envelope],
        );
      for (const row of cmsSnapshot.deliveries)
        await restoredCms.query("INSERT INTO local_deliveries VALUES ($1,$2)", [
          row.operation_id,
          row.delivered_at,
        ]);
      for (const row of centralSnapshot.entitlements)
        await restoredCentral.query(
          "INSERT INTO local_entitlements VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",
          [
            row.id,
            row.client_id,
            row.order_id,
            row.item_id,
            row.sku,
            row.addon_key,
            row.customer_ref,
            row.domain_name,
            row.status,
            row.valid_until,
            row.updates_until,
            row.lifecycle_version,
            row.max_activations,
            row.envelope,
          ],
        );
      for (const row of centralSnapshot.idempotency)
        await restoredCentral.query(
          "INSERT INTO local_idempotency VALUES ($1,$2,$3,$4)",
          [row.client_id, row.operation_key, row.request_hash, row.response],
        );
      for (const row of centralSnapshot.activations)
        await restoredCentral.query(
          "INSERT INTO local_activations VALUES ($1,$2,$3,$4,$5,$6)",
          [
            row.id,
            row.entitlement_id,
            row.installation_id,
            row.domain_name,
            row.key_thumbprint,
            row.active,
          ],
        );
      for (const row of centralSnapshot.events)
        await restoredCentral.query(
          "INSERT INTO local_central_events VALUES ($1,$2,$3,$4)",
          [row.sequence, row.entitlement_id, row.event_type, row.created_at],
        );
      const cmsChecks = await restoredCms.query(
        `SELECT
          (SELECT count(*) FROM local_orders)::int AS orders,
          (SELECT count(*) FROM local_issues)::int AS issues,
          (SELECT count(*) FROM local_deliveries)::int AS deliveries`,
      );
      const centralChecks = await restoredCentral.query(
        `SELECT
          (SELECT count(*) FROM local_entitlements)::int AS entitlements,
          (SELECT count(*) FROM local_idempotency)::int AS idempotency,
          (SELECT count(*) FROM local_central_events)::int AS events`,
      );
      assert.equal(cmsChecks.rows[0].orders, cmsSnapshot.orders.length);
      assert.equal(cmsChecks.rows[0].issues, cmsSnapshot.issues.length);
      assert.equal(cmsChecks.rows[0].deliveries, cmsSnapshot.deliveries.length);
      assert.equal(
        centralChecks.rows[0].entitlements,
        centralSnapshot.entitlements.length,
      );
      assert.equal(
        centralChecks.rows[0].idempotency,
        centralSnapshot.idempotency.length,
      );
      assert.equal(centralChecks.rows[0].events, centralSnapshot.events.length);
      const allSnapshots = [
        ...Object.values(cmsSnapshot),
        ...Object.values(centralSnapshot),
      ];
      return {
        databasesRestored: 2,
        rowsRestored: allSnapshots.reduce((sum, rows) => sum + rows.length, 0),
        artifactInputSha256: sha256(
          canonicalJson({ cmsSnapshot, centralSnapshot }),
        ),
      };
    } finally {
      await Promise.all([restoredCms.end(), restoredCentral.end()]);
    }
  };

  const drill = async (id) => {
    await reset();
    switch (id) {
      case "backup_restore": {
        const purchased = await purchase();
        assertPurchaseCompleted(purchased);
        return await logicalRestore();
      }
      case "cross_service_reconciliation": {
        const purchased = await purchase({
          workerOptions: { responseLoss: true, limit: 1 },
        });
        assert.equal(purchased.current.operations[0].status, "failed");
        const result = await request("webshop", "/reconcile");
        const current = await state();
        assert.equal(current.orders[0].status, "completed");
        return { checked: result.checked, reconciliationDelta: 0 };
      }
      case "key_rotation": {
        const before = await directIssue();
        await request("central", "/__control", {
          activeVendorKid: "vendor-local-b",
        });
        const after = await directIssue();
        assert.notEqual(before.result.envelope.kid, after.result.envelope.kid);
        await request("cms", "/customer/rotate", { kid: "customer-local-b" });
        return { keyClassesRotated: 2 };
      }
      case "queue_recovery": {
        await request("central", "/__control", { outage: true });
        const failed = await purchase();
        assert.equal(failed.current.operations[0].status, "failed");
        await cmsPool.query(
          "UPDATE local_operations SET status='processing',lease_owner='dead',lease_expires_at=now()-interval '1 second'",
        );
        await request("central", "/__control", { outage: false });
        await worker();
        let recovered = await state();
        assert.equal(recovered.operations[0].status, "succeeded");

        const responseLost = await purchase({
          workerOptions: { responseLoss: true, limit: 1 },
        });
        const failedOperation = responseLost.current.operations.find(
          (entry) => entry.status === "failed",
        );
        assert.ok(failedOperation);
        const originalPayload = failedOperation.request_payload;
        await cmsPool.query(
          "UPDATE local_operations SET request_payload=jsonb_set(request_payload,'{sku}',to_jsonb('client-a:license-server'::text)) WHERE id=$1",
          [failedOperation.id],
        );
        await worker({ limit: 1 });
        let dlqState = await state();
        assert.equal(
          dlqState.operations.find((entry) => entry.id === failedOperation.id)
            .status,
          "dlq",
        );
        await cmsPool.query(
          "UPDATE local_operations SET request_payload=$2 WHERE id=$1",
          [failedOperation.id, originalPayload],
        );
        const requeued = await request("webshop", "/requeue", {
          operationId: failedOperation.id,
        });
        assert.equal(requeued.status, 202);
        assert.equal(requeued.keyPreserved, true);
        await worker({ limit: 1 });
        recovered = await state();
        assert.equal(
          recovered.operations.find((entry) => entry.id === failedOperation.id)
            .status,
          "succeeded",
        );
        return { recovered: 2, dlqObserved: 1, dlqRemaining: 0 };
      }
      case "alert_delivery": {
        httpRequests += 1;
        const bad = await fetch(`${endpoints.webshop}/webhook`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-provider-signature": "invalid",
          },
          body: JSON.stringify({
            id: "redacted-event",
            type: "capture",
            orderId: "redacted-order",
          }),
        });
        assert.equal(bad.status, 401);
        const delivered = await request("provider", "/alert-state");
        assert.equal(delivered.count, 1);
        assert.equal(JSON.stringify(delivered).includes("invalid"), true);
        assert.equal(
          /secret|privateKey|licenseKey/i.test(JSON.stringify(delivered)),
          false,
        );
        return { delivered: 1, redactionViolations: 0 };
      }
      case "vendor_signing_key_rotation_restore": {
        const oldIssue = await directIssue();
        await request("central", "/__control", {
          activeVendorKid: "vendor-local-b",
        });
        const newIssue = await directIssue();
        await request("cms", "/__reset");
        await request("cms", "/keys/vendor/refresh");
        const oldValid = await request("cms", "/vendor/verify", {
          envelope: oldIssue.result.envelope,
          addon: "webshop",
          domain: "shop.test",
        });
        const newValid = await request("cms", "/vendor/verify", {
          envelope: newIssue.result.envelope,
          addon: "webshop",
          domain: "shop.test",
        });
        assert.equal(oldValid.status, 200);
        assert.equal(newValid.status, 200);
        return { restoredVerificationKeys: 2 };
      }
      case "customer_issuer_key_rotation_restore": {
        const input = {
          clientId: "customer-client-a",
          authClientId: "customer-client-a",
          productId: "product-a",
          productScopes: ["product-a"],
          customerRef: "customer-local",
          validUntil: new Date(Date.now() + 86_400_000).toISOString(),
        };
        const oldIssue = await request("cms", "/customer/issue", input);
        await request("cms", "/customer/rotate", { kid: "customer-local-b" });
        const newIssue = await request("cms", "/customer/issue", input);
        await request("cms", "/__reset");
        const oldValid = await request("cms", "/customer/verify", {
          envelope: oldIssue.envelope,
        });
        const newValid = await request("cms", "/customer/verify", {
          envelope: newIssue.envelope,
        });
        assert.equal(oldValid.status, 200);
        assert.equal(newValid.status, 200);
        return { restoredVerificationKeys: 2 };
      }
      default:
        fail(`local drill is not implemented: ${id}`);
    }
  };

  const writeEvidence = async (id, kind, status, metrics, errorCode) => {
    const completedAt = new Date().toISOString();
    const reference = `local/${kind}/${id}.json`;
    const { artifactInputSha256, ...numericMetrics } = metrics;
    const safeMetrics = {
      ...numericMetrics,
      httpRequests: numericMetrics.httpRequests ?? httpRequests,
      databaseAssertions:
        numericMetrics.assertions ?? numericMetrics.rowsRestored ?? 1,
    };
    const artifactSha256 =
      artifactInputSha256 ??
      sha256(
        canonicalJson({
          id,
          kind,
          status,
          metrics: safeMetrics,
          schemaVersion: SCHEMA_VERSION,
        }),
      );
    const evidence = {
      version: SCHEMA_VERSION,
      scenario: id,
      kind,
      status,
      runId: `${rootRunId}:${kind}:${id}`,
      completedAt,
      artifactSha256,
      transport: "loopback-http",
      productionRuntime: false,
      gateEligible: false,
      resources: {
        cmsDatabase,
        centralDatabase,
        processIds: children.map((child) => child.pid),
        services: Object.fromEntries(
          roles.map((entry) => [entry, `loopback:${entry}:${ports[entry]}`]),
        ),
      },
      metrics: safeMetrics,
      references: [reference],
      ...(errorCode ? { errorCode } : {}),
    };
    const path = resolve(outputRoot, kind, `${id}.json`);
    await mkdir(resolve(outputRoot, kind), { recursive: true });
    await writeFile(path, `${JSON.stringify(evidence, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    return evidence;
  };

  try {
    await createDatabase(source, cmsDatabase);
    await createDatabase(source, centralDatabase);
    await initializeDatabase(cmsUrl, CMS_SCHEMA);
    await initializeDatabase(centralUrl, CENTRAL_SCHEMA);
    cmsPool = new Pool({ connectionString: cmsUrl });
    centralPool = new Pool({ connectionString: centralUrl });
    const sharedEnv = {
      NR_LOCAL_CONTROL_TOKEN: controlToken,
      NR_LOCAL_PROVIDER_SECRET: providerSecret,
      NR_LOCAL_CENTRAL_HMAC: centralHmac,
      NR_LOCAL_CMS_DATABASE_URL: cmsUrl,
      NR_LOCAL_CENTRAL_DATABASE_URL: centralUrl,
      NR_LOCAL_PROVIDER_ENDPOINT: endpoints.provider,
      NR_LOCAL_CENTRAL_ENDPOINT: endpoints.central,
      NR_LOCAL_WEBSHOP_ENDPOINT: endpoints.webshop,
      NR_LOCAL_CMS_ENDPOINT: endpoints.cms,
      NR_LOCAL_VENDOR_KEYS: JSON.stringify(vendorKeys),
      NR_LOCAL_CUSTOMER_KEYS: JSON.stringify(customerKeys),
      NR_LOCAL_VENDOR_ACTIVE_KID: "vendor-local-a",
      NR_LOCAL_CUSTOMER_ACTIVE_KID: "customer-local-a",
      NODE_ENV: "test",
    };
    for (const entry of roles)
      children.push(await startService(entry, ports[entry], sharedEnv));

    for (const entry of roles) {
      const health = await fetch(`${endpoints[entry]}/health`);
      if (!health.ok) fail(`${entry} loopback process is not healthy.`);
      httpRequests += 1;
    }

    const results = [];
    for (const id of scenarioIds ?? []) {
      try {
        const requestStart = httpRequests;
        const metrics = {
          ...(await scenario(id)),
          ...(await assertLocalInvariants()),
          httpRequests: httpRequests - requestStart,
        };
        results.push(
          await writeEvidence(id, "local-contract-e2e", "passed", metrics),
        );
      } catch (error) {
        await writeEvidence(
          id,
          "local-contract-e2e",
          "failed",
          { assertions: 0 },
          sha256(error.message).slice(0, 16),
        );
        throw new Error(
          `${id} failed: ${safeFailureReason(error)} (${sha256(error.message).slice(0, 16)}).`,
        );
      }
    }
    for (const id of drillIds ?? []) {
      try {
        const requestStart = httpRequests;
        const metrics = {
          ...(await drill(id)),
          ...(await assertLocalInvariants()),
          httpRequests: httpRequests - requestStart,
        };
        results.push(
          await writeEvidence(id, "local-contract-drill", "passed", metrics),
        );
      } catch (error) {
        await writeEvidence(
          id,
          "local-contract-drill",
          "failed",
          {},
          sha256(error.message).slice(0, 16),
        );
        throw new Error(
          `${id} failed: ${safeFailureReason(error)} (${sha256(error.message).slice(0, 16)}).`,
        );
      }
    }
    return {
      version: SCHEMA_VERSION,
      target: "local",
      runId: rootRunId,
      results,
      evidenceDirectory: outputRoot,
    };
  } finally {
    await Promise.all(children.map(stopService));
    await Promise.all([cmsPool?.end(), centralPool?.end()]);
    for (const name of restoreDatabases.reverse())
      await dropDatabase(source, name);
    await dropDatabase(source, centralDatabase);
    await dropDatabase(source, cmsDatabase);
  }
}
