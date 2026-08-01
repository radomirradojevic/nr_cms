# Phase 2 - Product License Server Selection

## Goal

Replace the current hardcoded `license_server` dropdown item with dynamic
license server choices while preserving the stable internal policy value.

Admins creating or editing digital products with delivery type `license` or
`file + license` must be able to select one configured license server and enter
the external product type/category ID defined on that server.

## Current State

The private Webshop addon currently hardcodes:

```ts
WEBSHOP_DIGITAL_LICENSE_KEY_POLICIES = [
  "none",
  "manual",
  "pool",
  "license_server",
]
```

Product UI directly renders:

```tsx
<SelectItem value="license_server">license server</SelectItem>
```

Order snapshots already store `licenseKeyPolicy` and set a placeholder:

```ts
licenseServer: { status: "pending_external_issue" }
```

## Data Model

Extend `WebshopDigitalFields` with:

```ts
licenseServerId: string | null;
licenseServerProductTypeId: string | null;
```

Optional later field:

```ts
licenseServerSkuOverride: string | null;
```

For now, SKU should come from the selected product variant/order item snapshot.

Defaults:

```ts
licenseServerId: null
licenseServerProductTypeId: null
```

Normalization:

- If delivery type does not require license, force:
  - `licenseKeyPolicy = "none"`
  - `licenseServerId = null`
  - `licenseServerProductTypeId = null`
- If policy is not `license_server`, force:
  - `licenseServerId = null`
  - `licenseServerProductTypeId = null`
- If policy is `license_server`, preserve both fields.

## Validation

Active digital products requiring license server must have:

- `licenseServerId`
- `licenseServerProductTypeId`
- a selected server that exists and is not archived

Recommended rules:

- If server exists but is hidden from menu, existing products may keep saving.
- New selections only show active + visible servers.
- If selected server is inactive, block activation of new active products, but
  allow draft saves.

## Product Form UI

In product fulfillment controls:

- For manual and pool, keep existing options.
- For each active visible server, show a dropdown option with the server title.

Implementation pattern:

```tsx
value:
  "manual"
  "pool"
  `license_server:${server.id}`
```

On change:

- `manual` -> `{ licenseKeyPolicy: "manual", licenseServerId: null }`
- `pool` -> `{ licenseKeyPolicy: "pool", licenseServerId: null }`
- `license_server:<id>` ->
  `{ licenseKeyPolicy: "license_server", licenseServerId: id }`

When selected policy is `license_server`, render:

`Product type (category) ID defined on License server`

This field maps to `digitalFields.licenseServerProductTypeId`.

## Product Dashboard Data Loading

Product create/edit pages need license server options:

- `listVisibleWebshopLicenseServerOptions()`
- include `id`, `title`, `baseApiUrl`, `status`
- pass to `WebshopProductManager`

Existing product with hidden/inactive selected server:

- include the selected server as a disabled/current option if possible
- show a small status badge

## Order Snapshot

When creating order items, include license server metadata in
`fulfillmentDataSnapshot`:

```json
{
  "delivery": "license",
  "licenseKeyPolicy": "license_server",
  "licenseServer": {
    "status": "pending_external_issue",
    "licenseServerId": "...",
    "licenseServerTitle": "...",
    "productTypeId": "...",
    "sku": "SKU-SNAPSHOT"
  }
}
```

Do not call the external server in this phase.

## Acceptance Criteria

- The dropdown no longer shows a generic `license server` option when no active
  visible servers exist.
- Active visible license servers appear as individual dropdown choices.
- Selecting a server reveals the external product type/category field.
- Product save persists `licenseServerId` and `licenseServerProductTypeId`.
- Existing manual and pool products behave exactly as before.
- Order item snapshots include server metadata for license-server products.

## Tests

Add or update tests for:

- digital field defaults and normalization
- product payload validation for missing server/productTypeId
- product form serializer preserves new fields
- order snapshot contains license server metadata

Run:

```bash
npm run typecheck
npm run test
```

## Risks

- The product manager component is large; keep server option rendering in small
  helper functions.
- Existing products with `licenseKeyPolicy = "license_server"` but no server ID
  must not crash edit screens. Treat them as legacy incomplete configuration.

