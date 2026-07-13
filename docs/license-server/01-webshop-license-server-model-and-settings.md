# Phase 1 - Webshop License Server Model and Settings UI

## Goal

Introduce first-class Webshop license server records before changing product
fulfillment behavior. The Webshop must be able to store multiple external
license server configurations, show/hide each one from the product license
policy selector, and keep credential handling isolated from regular Webshop
settings JSON.

This phase intentionally does not issue licenses. It creates the stable data
model and admin management surface that later phases depend on.

## Design Decision

Do not turn every configured server into a new `licenseKeyPolicy` value.

Keep the product policy enum stable:

```ts
"none" | "manual" | "pool" | "license_server"
```

When `licenseKeyPolicy === "license_server"`, product digital fields will later
store:

```ts
licenseServerId: string | null
licenseServerProductTypeId: string | null
```

This avoids schema churn when a server is renamed, hidden, disabled, rotated, or
deleted.

## Database

Add `webshop_license_servers` to the public CMS schema because the private
webshop addon imports tables from `@/db/schema`.

Recommended columns:

- `id uuid primary key default gen_random_uuid()`
- `title text not null`
- `base_api_url text not null`
- `auth_type text not null default 'hmac_shared_secret'`
- `auth_client_id text`
- `auth_secret_encrypted text`
- `auth_secret_fingerprint text`
- `show_in_policy_menu boolean not null default true`
- `status text not null default 'active'`
- `last_health_check_at timestamp with time zone`
- `last_health_status text`
- `last_health_message text`
- `created_by text not null`
- `updated_by text not null`
- `created_at timestamp with time zone not null default now()`
- `updated_at timestamp with time zone not null default now()`

Constraints:

- `status in ('active','inactive','archived')`
- `auth_type in ('hmac_shared_secret')` for the first version
- unique title is useful, but not required. Prefer allowing duplicate titles
  only if the UI displays the URL/fingerprint clearly. The safer MVP is
  `unique(title)`.

Indexes:

- `(status, show_in_policy_menu, title)`
- `(created_at)`
- optional `auth_secret_fingerprint` index for audit/search

## Credential Storage

For the MVP, store the secret encrypted at rest with an application-level key:

- env var: `WEBSHOP_LICENSE_SERVER_SECRET_KEY`
- format: base64url 32-byte key
- algorithm: AES-256-GCM using Node `crypto`
- stored payload shape:

```json
{
  "v": 1,
  "alg": "aes-256-gcm",
  "iv": "...",
  "tag": "...",
  "ciphertext": "..."
}
```

If the env key is missing, admin can create a server without a secret only for
draft/testing, but cannot mark it `active` and visible in product policy menu.

Display only:

- auth type
- client id
- secret fingerprint, e.g. first 12 chars of SHA-256
- whether a secret is set

Never display or return the raw secret after save.

## Data Access Module

Create private addon data helpers:

`D:\nr_cms\.private\webshop\src\data\webshop-license-servers.ts`

Responsibilities:

- list servers with pagination/filtering
- list active visible server options for product forms
- create server
- update server
- archive server
- normalize URLs
- encrypt/fingerprint secrets
- redact secret fields in returned types

Page sizes: `10, 20, 30, 50, 100`.

Filters:

- search title/base URL/client id/fingerprint
- status
- visibility

## Admin Actions

Add settings actions in:

`D:\nr_cms\.private\webshop\src\admin\settings\actions.ts`

Actions must:

- use `"use server"`
- call `auth()` and require admin role
- require `webshop-settings` admin section lock
- require installed Webshop license mode `ready`
- validate input with Zod
- return `{ error: string }` instead of throwing
- revalidate `/dashboard/webshop/settings`

Actions:

- `createWebshopLicenseServerAction(input, clientId?)`
- `updateWebshopLicenseServerAction(input, clientId?)`
- `archiveWebshopLicenseServerAction(input, clientId?)`

## Settings UI

Extend:

`D:\nr_cms\.private\webshop\src\admin\settings\settings-dashboard.tsx`
`D:\nr_cms\.private\webshop\src\admin\settings\settings-form.tsx`

Add a new tab:

`License servers`

Expected UI:

- toolbar with search, status filter, visibility filter, page size
- table/list with title, URL, status, visibility, auth type, client id,
  fingerprint, last health status, updated date
- `+ Add License server` dialog
- edit dialog
- archive confirmation

Form fields:

- Title
- Base Night Raven License Server API URL
- Auth type (MVP only: HMAC shared secret)
- Client ID
- Shared secret
- Show in `License key policy` dropdown menu
- Status

UX rules:

- Secret input is blank on edit and means "leave unchanged".
- Provide a separate "Replace secret" field behavior.
- Disable active+visible save if secret key storage is unavailable.
- Keep table dense and operational, not a marketing layout.

## Acceptance Criteria

- Admin can create unlimited license server records.
- Admin can edit title, base URL, client ID, visibility, status.
- Admin can replace secret without ever seeing the old one.
- Admin can archive a server.
- Hidden/inactive/archived servers are not returned by product-option helpers.
- Existing Webshop settings continue to save normally.
- No existing product/order behavior changes in this phase.

## Tests

Add focused tests for pure data helpers where possible:

- URL normalization rejects non-http(s).
- Secret fingerprint is stable.
- Secret encryption/decryption round trips when env key is present.
- Returned server DTO never exposes raw/encrypted secret unless explicitly
  internal.
- Active visible query excludes hidden/inactive/archived rows.

Run:

```bash
npm run typecheck
npm run test
```

## Risks

- Secrets in database require a durable env encryption key. Losing the key means
  stored server secrets cannot be recovered.
- Existing settings form is large; keep the new license server UI isolated in a
  child component to avoid making it harder to maintain.

