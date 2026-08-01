# Documented API Contract

## API Root

The API root is versioned.

Standalone master example:

`https://licenses.nrcms.com/api/v1`

Embedded client add-on example:

`https://client-site.com/api/license-server/v1`

All endpoint paths below are relative to that API root.

## Authentication Models

### Server-to-server HMAC

Used by:

- Webshop issuing licenses after paid orders;
- admin integrations;
- trusted backend services.

Headers:

- `Content-Type: application/json`
- `Idempotency-Key: <required for issue>`
- `X-NRLS-Client-Id: <client id>`
- `X-NRLS-Timestamp: <ISO timestamp>`
- `X-NRLS-Nonce: <random base64url nonce>`
- `X-NRLS-Signature: <base64url hmac sha256>`

Canonical string:

```text
<METHOD>
<ACTUAL_URL_PATHNAME>
<X-NRLS-Timestamp>
<X-NRLS-Nonce>
<sha256(raw request body)>
```

Example actual path for embedded add-on:

`/api/license-server/v1/licenses`

The server must reject:

- missing auth headers;
- timestamp outside 5 minutes;
- replayed nonce;
- bad signature;
- inactive/revoked API client;
- missing idempotency key on issue endpoint.

### Runtime activation token

Used by:

- desktop apps;
- WordPress/plugin style products;
- downloadable tools;
- domains that need runtime checks.

Do not put HMAC shared secrets in desktop apps.

Runtime flow:

1. App calls activation endpoint with license key and device/domain data.
2. Server creates or reuses an activation if policy allows it.
3. Server returns an activation token once.
4. App stores activation token locally.
5. Future validations use activation id and activation token.

The license key itself is the credential for first activation, so rate limiting
and abuse detection are required.

## Endpoint: Health

`GET /health`

Auth:

- none, or optional HMAC if deployment wants private health.

Response:

```json
{
  "ok": true,
  "name": "night-raven-client-license-server",
  "version": "1.0.0",
  "apiVersion": "v1"
}
```

## Endpoint: Catalog

`GET /catalog`

Auth:

- HMAC.

Purpose:

- Webshop can discover product types and SKUs instead of requiring manual UUID
  copy/paste.

Response:

```json
{
  "productTypes": [
    {
      "id": "uuid",
      "externalRef": "desktop-app-pro",
      "title": "Desktop App Pro",
      "status": "active",
      "skus": [
        {
          "id": "uuid",
          "sku": "PRO-1Y",
          "status": "active",
          "durationDays": 365,
          "licenseType": "subscription",
          "policyTemplate": "subscription_device",
          "maxDevices": 2,
          "maxDomains": null,
          "maxSeats": null,
          "features": ["pro"]
        }
      ]
    }
  ]
}
```

## Endpoint: Issue License

`POST /licenses`

Auth:

- HMAC.

Request:

```json
{
  "productTypeId": "uuid",
  "sku": "PRO-1Y",
  "domain": "example.com",
  "customerEmail": "buyer@example.com",
  "customerName": "Buyer Name",
  "orderRef": "order uuid",
  "orderItemRef": "order item uuid",
  "metadata": {
    "source": "webshop"
  }
}
```

Response:

```json
{
  "licenseId": "uuid",
  "licenseKey": "NRLS-XXXX-XXXX-XXXX-XXXX-XXXX",
  "issuedAt": "2026-07-06T12:00:00.000Z",
  "expiresAt": "2027-07-06T12:00:00.000Z",
  "status": "active",
  "domain": "example.com",
  "policy": {
    "template": "subscription_device",
    "licenseType": "subscription",
    "maxDevices": 2,
    "maxDomains": null,
    "maxSeats": null,
    "validationIntervalSeconds": 86400,
    "offlineGraceSeconds": 604800
  }
}
```

Idempotency:

- same API client + same idempotency key must return the same license;
- must not create duplicate licenses if payment webhook retries.

## Endpoint: Runtime Activate

`POST /licenses/activate`

Auth:

- license key;
- rate limit;
- optional product public id.

Request for desktop device:

```json
{
  "licenseKey": "NRLS-XXXX-XXXX-XXXX-XXXX-XXXX",
  "activationType": "device",
  "deviceFingerprint": "client-calculated-stable-fingerprint",
  "deviceLabel": "Rade Windows laptop",
  "appId": "com.example.desktop",
  "appVersion": "1.4.2",
  "platform": "windows"
}
```

Request for domain:

```json
{
  "licenseKey": "NRLS-XXXX-XXXX-XXXX-XXXX-XXXX",
  "activationType": "domain",
  "domain": "customer-site.com",
  "appId": "wordpress-plugin",
  "appVersion": "2.0.0"
}
```

Response:

```json
{
  "valid": true,
  "licenseId": "uuid",
  "activationId": "uuid",
  "activationToken": "nrls_act_...",
  "status": "active",
  "expiresAt": "2027-07-06T12:00:00.000Z",
  "validationIntervalSeconds": 86400,
  "offlineGraceSeconds": 604800,
  "features": ["pro"],
  "policy": {
    "template": "subscription_device",
    "maxDevices": 2,
    "maxDomains": null,
    "maxSeats": null
  },
  "reason": null
}
```

If activation limit is reached:

```json
{
  "valid": false,
  "reason": "activation_limit_reached",
  "status": "active"
}
```

Activation rules depend on the SKU policy snapshot stored on the license.

Examples:

- `perpetual_single_device`: second device returns
  `activation_limit_reached`.
- `domain_license`: different domain returns `domain_mismatch` or
  `activation_limit_reached`.
- `seat_based`: new seat above limit returns `seat_limit_reached`.
- `subscription_device`: expired license returns `expired`.

## Endpoint: Runtime Validate

`POST /licenses/validate`

Auth:

- runtime activation token for apps and plugins;
- HMAC allowed for server-to-server validation;
- license key only validation may be allowed for low-risk products but should
  be rate-limited.

Request:

```json
{
  "licenseKey": "NRLS-XXXX-XXXX-XXXX-XXXX-XXXX",
  "activationId": "uuid",
  "activationToken": "nrls_act_...",
  "deviceFingerprint": "same-fingerprint",
  "domain": null,
  "appVersion": "1.4.2"
}
```

Response:

```json
{
  "valid": true,
  "licenseId": "uuid",
  "activationId": "uuid",
  "status": "active",
  "expiresAt": "2027-07-06T12:00:00.000Z",
  "features": ["pro"],
  "nextValidationAfter": "2026-07-07T12:00:00.000Z",
  "offlineGraceEndsAt": "2026-07-13T12:00:00.000Z",
  "reason": null
}
```

Invalid response:

```json
{
  "valid": false,
  "licenseId": "uuid",
  "activationId": "uuid",
  "status": "suspended",
  "reason": "suspended"
}
```

## Endpoint: Deactivate

`POST /licenses/deactivate`

Auth:

- runtime activation token or HMAC.

Request:

```json
{
  "licenseKey": "NRLS-XXXX-XXXX-XXXX-XXXX-XXXX",
  "activationId": "uuid",
  "activationToken": "nrls_act_..."
}
```

Response:

```json
{
  "ok": true,
  "activationId": "uuid",
  "status": "deactivated"
}
```

## Endpoint: Admin License Status Update

`PATCH /licenses/{licenseId}`

Auth:

- HMAC or admin UI action.

Request:

```json
{
  "status": "suspended",
  "reason": "payment_failed"
}
```

Allowed transitions must be explicit.

Examples:

- `active -> suspended`
- `suspended -> active`
- `active -> revoked`
- `active -> refunded`
- `active -> chargeback`

Do not allow revoked licenses to silently become active without an audit event.

## Error Format

All API errors should use:

```json
{
  "error": "Human readable message.",
  "code": "machine_readable_code"
}
```

Common HTTP status:

- `400` invalid request;
- `401` missing/invalid API authentication;
- `403` license not allowed or activation policy blocked;
- `404` product/license not found;
- `409` state conflict;
- `429` rate limited;
- `503` add-on not licensed or temporarily unavailable.
