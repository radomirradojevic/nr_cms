# Webshop Integration

> Historical implementation note: this document describes a removed legacy `/api/v1/licenses` flow. Current Webshop activation uses the add-on entitlement API.

## Existing Integration

The private Webshop already supports digital license delivery policies:

- `none`
- `manual`
- `pool`
- `license_server`

For `license_server`, Webshop already stores:

- selected license server id;
- external product type id;
- SKU snapshot;
- order and order item refs;
- issue status;
- issued license key;
- issue failure message.

The paid order flow already creates `webshop_license_server_issues`, then a
processor calls the selected license server.

This should be kept and hardened.

## Required API Base URL Change

Current issue processor uses a fixed path:

`/api/v1/licenses`

Target behavior:

1. Store `baseApiUrl` as the versioned API root.
2. Build final URLs by appending endpoint name.
3. Sign the actual URL pathname.

Examples:

Master:

- `baseApiUrl = https://licenses.nrcms.com/api/v1`
- issue URL: `https://licenses.nrcms.com/api/v1/licenses`
- canonical path: `/api/v1/licenses`

Embedded client add-on:

- `baseApiUrl = https://client-site.com/api/license-server/v1`
- issue URL: `https://client-site.com/api/license-server/v1/licenses`
- canonical path: `/api/license-server/v1/licenses`

This lets the same Webshop code work with both master and client add-on.

## Webshop Connection Manager

Enhance `.private/webshop/src/admin/settings/license-servers-manager.tsx`.

Add:

- health check button;
- detected API version;
- detected server kind: `master` or `client_addon`;
- catalog sync button;
- last health result;
- last catalog sync timestamp;
- warnings for path mismatch and bad credentials.

Connection fields:

- title;
- versioned API base URL;
- auth type;
- client id;
- shared secret;
- status;
- show in product policy menu.

## Product Manager Integration

Current product UI requires manual external product type ID.

Target:

- list product types and SKUs from `GET /catalog`;
- allow selecting product type and SKU mapping;
- keep manual entry fallback for external/custom servers;
- validate selected SKU exists before product can become active;
- show policy summary:
  - duration;
  - max devices;
  - max domains;
  - features;
  - validation interval.

Recommended storage in digital fields:

```json
{
  "licenseKeyPolicy": "license_server",
  "licenseServerId": "uuid",
  "licenseServerProductTypeId": "uuid",
  "licenseServerSku": "PRO-1Y",
  "licenseServerPolicySnapshot": {
    "durationDays": 365,
    "maxDevices": 2,
    "maxDomains": null,
    "features": ["pro"]
  }
}
```

## Paid Order Flow

When an order becomes paid:

1. Create download entitlements for file delivery.
2. Assign a key from local pool if policy is `pool`.
3. Create issue row if policy is `license_server`.
4. Commit transaction.
5. Process pending license server issues after commit.

Issue request body:

```json
{
  "productTypeId": "license-server-product-type-id",
  "sku": "SKU-SNAPSHOT",
  "domain": "optional-domain",
  "customerEmail": "buyer@example.com",
  "customerName": "Buyer Name",
  "orderRef": "webshop-order-id",
  "orderItemRef": "webshop-order-item-id",
  "metadata": {
    "webshopId": "webshop-content-id",
    "productId": "webshop-product-id",
    "variantId": "webshop-variant-id"
  }
}
```

Idempotency key:

`webshop-order-item:<orderItemId>:license-server`

## Email Delivery

Digital delivery email must include:

- license key;
- expiration date if any;
- product name;
- activation/validation API URL if useful for developer products;
- customer portal/order link.

If issue is pending:

- email should either wait until issue finishes or send a clear "license is
  being prepared" message and follow-up email after issue succeeds.

MVP recommendation:

- process issue immediately after payment;
- if success, include license in placement email;
- if failure, send placement email without key and flag admin retry.

Production recommendation:

- queue issue;
- send license delivery email after issue succeeds;
- show pending state in customer order page.

## Refunds, Revokes, And Chargebacks

When Webshop refund fully succeeds:

- revoke download entitlements;
- revoke local pool keys;
- call client license server status endpoint for external licenses;
- set external license status to `refunded` or `revoked`;
- update `webshop_license_server_issues.status`.

When payment provider reports chargeback:

- call status endpoint with `chargeback`;
- block future validations.

## Author Webshop On nrcms.com

The author's own Webshop should use the same Webshop license server integration.

Configure master license server:

- `baseApiUrl = https://licenses.nrcms.com/api/v1`
- product type: `webshop`
- product type: `license-server`
- product type: `webConference`

When a customer buys `License Server add-on` from nrcms.com:

1. Webshop asks master server to issue a license.
2. Customer receives that license key.
3. Customer CMS activates `/dashboard/license-server` with that key.
4. Master checks `addonKey = license-server`.
5. CMS loads the private client add-on package if installed.

For author CMS add-on sales, the master license server should validate the CMS
deployment domain/site binding. It does not need the full device/domain/seat
policy matrix used by the client product licensing engine.

## Client Webshop With Embedded License Server Add-on

The client configures its own embedded add-on as a Webshop license server:

`baseApiUrl = https://client-site.com/api/license-server/v1`

Then client products can issue keys from the embedded add-on.

This is independent from the master server except for the add-on entitlement
check.

For client product sales, Webshop should expose the License Server add-on's SKU
policy summary while configuring a digital product. The product editor should
make clear whether the selected license is device-bound, domain-bound,
seat-based, subscription, trial, maintenance, or file-plus-license.

## Required Webshop Tests

Add tests for:

- API base URL path building for master and embedded add-on;
- HMAC canonical path uses actual URL pathname;
- paid order creates one issue row per item;
- duplicate payment webhook does not duplicate issue;
- successful issue stores license key in fulfillment snapshot;
- failed issue stores safe error;
- customer order page renders pending, failed, and issued states;
- refund calls external revoke/status update endpoint;
- product manager catalog sync maps product type and SKU.
