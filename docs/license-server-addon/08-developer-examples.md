# Developer Examples

These examples are for products licensed by the embedded client License Server
add-on.

Use the master license server only for paid CMS add-on entitlements such as
`webshop`, `license-server`, and future `webConference`. Customer product
licenses sold by a client's Webshop should use the embedded add-on API.

## API Roots

Master license server:

```text
https://licenses.nrcms.com/api/v1
```

Embedded client add-on:

```text
https://client-site.com/api/license-server/v1
```

All examples below use the embedded add-on root.

## Trusted Backend Issue Request

Use HMAC only from trusted backend code. Never bundle an HMAC client secret in a
desktop app, mobile app, plugin zip, or browser bundle.

```js
import { createHash, createHmac, randomBytes } from "node:crypto";

const apiRoot = "https://client-site.com/api/license-server/v1";
const clientId = process.env.NRLS_CLIENT_ID;
const secret = process.env.NRLS_CLIENT_SECRET;

const body = JSON.stringify({
  customerEmail: "buyer@example.com",
  customerName: "Buyer Name",
  domain: "customer-site.com",
  metadata: { source: "external-shop" },
  orderItemRef: "order-item-123",
  orderRef: "order-123",
  productTypeId: "00000000-0000-4000-8000-000000000000",
  sku: "PRO-1Y"
});

const timestamp = new Date().toISOString();
const nonce = randomBytes(18).toString("base64url");
const path = "/api/license-server/v1/licenses";
const bodyHash = createHash("sha256").update(body).digest("hex");
const canonical = ["POST", path, timestamp, nonce, bodyHash].join("\n");
const signature = createHmac("sha256", secret)
  .update(canonical)
  .digest("base64url");

const response = await fetch(`${apiRoot}/licenses`, {
  body,
  headers: {
    "content-type": "application/json",
    "idempotency-key": "order-item-123",
    "x-nrls-client-id": clientId,
    "x-nrls-nonce": nonce,
    "x-nrls-signature": signature,
    "x-nrls-timestamp": timestamp
  },
  method: "POST"
});

if (!response.ok) {
  throw new Error(`License issue failed: ${response.status}`);
}

const license = await response.json();
console.log(license.licenseKey);
```

## Catalog Sync

Use catalog sync when an external shop needs to discover product types and SKUs.

```js
const method = "GET";
const path = "/api/license-server/v1/catalog";
const body = "";
const timestamp = new Date().toISOString();
const nonce = randomBytes(18).toString("base64url");
const bodyHash = createHash("sha256").update(body).digest("hex");
const canonical = [method, path, timestamp, nonce, bodyHash].join("\n");
const signature = createHmac("sha256", secret)
  .update(canonical)
  .digest("base64url");

const catalog = await fetch(`${apiRoot}/catalog`, {
  headers: {
    "x-nrls-client-id": clientId,
    "x-nrls-nonce": nonce,
    "x-nrls-signature": signature,
    "x-nrls-timestamp": timestamp
  }
}).then((response) => response.json());
```

## Desktop Or Plugin Runtime Flow

Runtime products should use license key activation and store the returned
activation token locally.

```js
const apiRoot = "https://client-site.com/api/license-server/v1";

const activation = await fetch(`${apiRoot}/licenses/activate`, {
  body: JSON.stringify({
    activationType: "device",
    appId: "com.example.desktop",
    appVersion: "1.4.2",
    deviceFingerprint: "stable-client-device-id",
    deviceLabel: "Buyer workstation",
    licenseKey: "NRLS-XXXX-XXXX-XXXX-XXXX-XXXX",
    platform: "windows"
  }),
  headers: { "content-type": "application/json" },
  method: "POST"
}).then((response) => response.json());

if (!activation.valid) {
  throw new Error(activation.reason ?? "Activation failed");
}

storeSecurely({
  activationId: activation.activationId,
  activationToken: activation.activationToken
});
```

Validate with the activation id and token:

```js
const validation = await fetch(`${apiRoot}/licenses/validate`, {
  body: JSON.stringify({
    activationId: stored.activationId,
    activationToken: stored.activationToken,
    appVersion: "1.4.2",
    deviceFingerprint: "stable-client-device-id",
    licenseKey: "NRLS-XXXX-XXXX-XXXX-XXXX-XXXX"
  }),
  headers: { "content-type": "application/json" },
  method: "POST"
}).then((response) => response.json());

if (!validation.valid) {
  showRenewalOrSupportMessage(validation.reason);
}
```

## Operational Notes For Integrators

- Keep one idempotency key per paid order item.
- Persist issued license key delivery state in your order system.
- Treat `429` as retryable after `Retry-After`.
- Treat `403` policy failures as customer/support events, not retries.
- Do not log full license keys, activation tokens, or HMAC secrets.
