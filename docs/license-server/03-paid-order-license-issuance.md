# Phase 3 - Paid Order License Issuance Pipeline

> Historical implementation note: the legacy `/api/v1/licenses` API was removed. New integrations use the entitlement API.

## Goal

When an order becomes paid, issue license keys from the selected external
license server for every paid digital order item configured with
`licenseKeyPolicy = "license_server"`.

The flow must be idempotent, auditable, retryable, and must not issue duplicate
licenses if a webhook is retried or an admin marks payment paid twice.

## Key Rule

Do not make slow external API calls while holding long database transactions.

The existing code currently creates download entitlements and pool assignments
inside payment/order transactions. For external license servers, prefer this
two-step pattern:

1. In the paid-order transaction, create an issuance row with a unique
   idempotency key.
2. After the transaction commits, process pending issuance rows.

If the first implementation keeps the call inline, it must still:

- use a short timeout
- use idempotency key
- avoid retry loops inside the transaction
- record failure for manual retry

## Database

Add `webshop_license_server_issues`.

Recommended columns:

- `id uuid primary key default gen_random_uuid()`
- `license_server_id uuid not null references webshop_license_servers(id)`
- `order_id uuid not null references webshop_orders(id)`
- `order_item_id uuid not null references webshop_order_items(id)`
- `product_id uuid references webshop_products(id)`
- `variant_id uuid references webshop_product_variants(id)`
- `sku text not null`
- `external_product_type_id text not null`
- `domain text`
- `idempotency_key text not null`
- `status text not null default 'pending'`
- `license_key text`
- `license_key_fingerprint text`
- `expires_at timestamp with time zone`
- `issued_at timestamp with time zone`
- `attempt_count integer not null default 0`
- `last_attempt_at timestamp with time zone`
- `last_error text`
- `request_snapshot jsonb not null default '{}'::jsonb`
- `response_snapshot jsonb not null default '{}'::jsonb`
- `created_at timestamp with time zone not null default now()`
- `updated_at timestamp with time zone not null default now()`

Constraints:

- `status in ('pending','issuing','issued','failed','canceled','revoked')`
- unique `order_item_id`
- unique `idempotency_key`
- unique `license_key_fingerprint` where not null

## API Contract to License Server

Use POST:

`POST /api/v1/licenses`

Headers:

- `Content-Type: application/json`
- `Idempotency-Key: <orderItemId or issueId>`
- `X-NRLS-Client-Id: <clientId>`
- `X-NRLS-Timestamp: <unix seconds>`
- `X-NRLS-Nonce: <random base64url>`
- `X-NRLS-Signature: v1=<base64url hmac sha256>`

Body:

```json
{
  "productTypeId": "external-category-id",
  "sku": "SKU-SNAPSHOT",
  "domain": "example.com",
  "orderRef": "cms-order-id",
  "orderItemRef": "cms-order-item-id"
}
```

Signature canonical string:

```text
POST
/api/v1/licenses
<timestamp>
<nonce>
<sha256(body)>
```

Response:

```json
{
  "licenseId": "uuid-or-server-id",
  "licenseKey": "NRLS-...",
  "expiresAt": "2027-01-01T00:00:00.000Z",
  "issuedAt": "2026-07-05T12:00:00.000Z"
}
```

## Webshop Data Flow

When order payment becomes paid:

- create download entitlements as before
- assign pool keys as before
- for license server items:
  - create `webshop_license_server_issues` row if it does not exist
  - set fulfillment snapshot `licenseServer.status = "pending_external_issue"`

Processor:

- select pending/failed retryable issue
- load license server config
- sign request
- call license server
- on success:
  - save license key, fingerprint, issued/expires dates
  - update order item `fulfillmentDataSnapshot.licenseServer`
  - status `issued`
- on failure:
  - increment attempt count
  - save safe error message
  - status `failed` or keep `pending` depending on retry policy

## Email and Admin UI

Digital delivery email must include license server keys the same way it includes
pool keys.

Admin order `Digital access` tab must show:

- pending external issue
- issued key
- failure message
- retry action for admins

Manual retry action:

- admin only
- ready license mode only
- order lock recommended
- calls processor for one issue

## Retry Policy

MVP:

- automatic retry up to 3 attempts when processor is called by paid flow
- manual retry from admin after that

Later:

- cron/queue retries with exponential backoff

## Acceptance Criteria

- Paid order with pool product still receives pool key.
- Paid order with license-server product creates one issue row per order item.
- Duplicate webhook/admin paid calls do not create duplicate issue rows.
- Successful external response stores key and updates order snapshot.
- Digital delivery email includes external license key.
- Failed issue is visible in admin order digital access.
- Admin can retry failed issue.

## Tests

Add tests for:

- idempotency row creation
- duplicate paid transition
- success response mapping
- failed response mapping
- email extraction from `licenseServer`
- admin digital access display state if practical

Run:

```bash
npm run typecheck
npm run test
```

## Risks

- Webhook handlers may return non-2xx if issuance throws. Prefer recording
  failure and returning success for payment processing once payment state is
  safely stored.
- Never log raw shared secrets.
- Store license keys only where needed; use fingerprints for uniqueness/search.

