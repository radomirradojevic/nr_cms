# Phase 4 - Night Raven License Server MVP

## Goal

Create the standalone paid addon/service named `Night Raven License Server`.
It is a private codebase under:

`D:\nr_cms\.private\license-server`

The service has no public storefront, but it does need an admin backend for
operators. It exposes API endpoints used by the Webshop to issue and validate
license keys.

## Stack

Use the same general stack as Night Raven CMS:

- Next.js 16.x App Router
- React 19
- TypeScript
- Drizzle ORM
- Postgres
- Tailwind CSS v4 and shadcn-compatible UI

Do not use Clerk. Implement internal auth.

## Auth

Bootstrap:

- default username: `admin`
- on first setup/deploy, generate one-time random setup password/token
- hash it in DB
- log/display it once in deployment logs
- require password change on first login

Password requirements:

- minimum 12 characters
- lowercase, uppercase, number, special character
- store password hash using Argon2id

Sessions:

- httpOnly secure cookies
- server-side session table
- rolling expiration
- revoke on password reset

User management:

- logged-in admin can create admin accounts
- fields: username, first name, last name, email
- creation sends invite email with single-use token
- invite page asks for password and repeat password
- account activates only after password is set

Audit:

- login success/failure
- logout
- invite created/accepted/revoked
- user disabled/enabled
- password changed
- API client created/rotated/revoked
- license issued/validated/revoked

## Data Model

Core tables:

- `admin_users`
- `admin_sessions`
- `admin_invites`
- `api_clients`
- `product_types`
- `product_type_skus`
- `licenses`
- `license_validation_events`
- `audit_events`

`product_types`:

- id uuid
- title
- description
- status

`product_type_skus`:

- id uuid
- productTypeId
- sku
- durationDays integer not null default 0
- status
- keyNamespace text not null

Use `keyNamespace` instead of user-entered SALT as the main uniqueness guard.
Generate it server-side as random 128-bit+ value. An optional admin note can
exist, but do not let security depend on human-written salt.

`licenses`:

- id uuid
- productTypeId
- skuId
- skuSnapshot
- domain
- durationDays
- issuedAt
- expiresAt
- licenseKeyHash
- licensePayload jsonb
- status
- orderRef
- orderItemRef
- idempotencyKey

Unique:

- API client + idempotency key for issue requests
- license key hash

## License Key Format

Recommended MVP:

- opaque random key shown to customer, e.g. `NRLS-XXXX-XXXX-...`
- store only hash on the license server
- validation endpoint checks DB

Optional signed certificate:

- include a compact JWS in response for offline validation later
- sign with Ed25519/ES256
- publish public key endpoint

Do not implement custom encryption algorithms.

## API Clients

Admin can create API clients:

- title
- allowed origins/domains optional
- status
- client id
- generated shared secret shown once
- fingerprint stored

Request auth:

- HMAC SHA-256 signature
- timestamp max skew 5 minutes
- nonce replay protection
- idempotency key for issue endpoint
- rate limits per client

## API Endpoints

`POST /api/v1/licenses`

Issues or returns existing license for the same idempotency key.

Request:

```json
{
  "productTypeId": "uuid",
  "sku": "SKU",
  "domain": "example.com",
  "orderRef": "optional",
  "orderItemRef": "optional"
}
```

Response:

```json
{
  "licenseId": "uuid",
  "licenseKey": "NRLS-...",
  "issuedAt": "iso",
  "expiresAt": "iso-or-null",
  "domain": "example.com"
}
```

`POST /api/v1/licenses/validate`

Request:

```json
{
  "licenseKey": "NRLS-...",
  "domain": "example.com"
}
```

Response:

```json
{
  "valid": true,
  "licenseId": "uuid",
  "status": "active",
  "expiresAt": "iso-or-null",
  "domain": "example.com",
  "reason": null
}
```

`GET /api/v1/health`

Returns service health and version, no secrets.

## Admin UI

Views:

- Login
- Forced password change
- Users
- API clients
- Product types
- Product type detail
- SKUs inside product type
- Licenses inside SKU
- Audit log

Tables:

- filters on relevant columns
- pagination 10, 20, 30, 50, 100
- status badges
- detail links

## Acceptance Criteria

- Fresh deployment can bootstrap default admin.
- Admin can log in and change password.
- Admin can invite another admin.
- Admin can create product type and SKU with duration days.
- Admin can create API client and copy secret once.
- Authenticated API client can issue license.
- Same idempotency key returns same license.
- Validate endpoint returns active/expired/domain mismatch states.

## Tests

- password policy
- password hashing/verification
- invite token lifecycle
- HMAC signature verification
- replay rejection
- idempotent issue
- duration/expiresAt calculation
- validation outcomes

Run from license server package:

```bash
npm run typecheck
npm run test
```

## Risks

- This is a separate product-sized service. Keep MVP narrow.
- Do not expose admin UI publicly without HTTPS.
- Do not rely on domain binding alone for high-value licensing; combine with
  activation/site identity in Phase 5.

