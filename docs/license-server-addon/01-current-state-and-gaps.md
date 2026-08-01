# Current State And Gaps

> Historical implementation note: references to `/api/v1/licenses` are superseded. The legacy routes were removed; current integrations use `/api/v1/entitlements`.

## Current Master License Server

The standalone master license server already has the correct foundation for
licensing paid CMS add-ons:

- internal admin auth and sessions;
- API clients with HMAC authentication;
- product types and SKUs;
- license issuing endpoint;
- license validation endpoint;
- add-on activation endpoint;
- add-on keys for `webshop`, `license-server`, and `webConference`;
- activation payload that binds a license to a CMS installation.

Important current endpoints:

- `POST /api/v1/licenses`
- `POST /api/v1/licenses/validate`
- `POST /api/webshop/licenses/activate`
- `POST /api/addons/licenses/activate`

The master server is the authority for whether a CMS installation may run a paid
add-on.

## Current Client License Server Add-on

The embedded add-on currently implements the MVP in one file:

- `.private/license-server-addon/src/addon.tsx`

It currently has:

- dashboard shell;
- API clients;
- product types;
- SKUs;
- license issue endpoint;
- license validate endpoint;
- HMAC authentication;
- nonce replay protection;
- basic rate limiting;
- validation events;
- license mode guard so new issue requests require active add-on license.

Current embedded API paths exposed through the CMS bridge:

- `GET /api/license-server/v1/health`
- `POST /api/license-server/v1/licenses`
- `POST /api/license-server/v1/licenses/validate`

## Current Webshop Integration

The Webshop already has a usable first integration layer:

- license server connection manager in settings;
- encrypted shared secret storage;
- digital product license key policy `license_server`;
- order paid flow creates `webshop_license_server_issues`;
- issue processor signs requests with HMAC;
- successful issue result is stored in order item fulfillment snapshot;
- cron endpoint can retry pending or failed issue rows.

Important current files:

- `.private/webshop/src/data/webshop-license-servers.ts`
- `.private/webshop/src/data/webshop-license-server-issues.ts`
- `.private/webshop/src/data/webshop-orders.ts`
- `.private/webshop/src/admin/settings/license-servers-manager.tsx`
- `.private/webshop/src/admin/products/product-manager.tsx`

## Main Gaps

### 1. API path mismatch

Webshop currently signs and calls:

`/api/v1/licenses`

The embedded client add-on currently exposes:

`/api/license-server/v1/licenses`

This must be normalized before relying on Webshop to issue from the embedded
add-on.

Recommended target: store a versioned API base URL.

Examples:

- master standalone server: `https://licenses.nrcms.com/api/v1`
- embedded client add-on: `https://client-site.com/api/license-server/v1`

Then Webshop appends endpoint paths like:

- `/licenses`
- `/licenses/validate`
- `/health`

The HMAC canonical path must be the actual URL pathname.

### 2. Client add-on is not yet production-grade

Missing or incomplete:

- license activation records for device/domain instances;
- max devices, max domains, seats, and activation reset policies;
- suspend, revoke, expire, refund, chargeback states;
- admin UI for revocation, suspension, activation management, and search;
- public runtime activation API for desktop apps and plugins;
- formal API documentation;
- catalog discovery/sync API for Webshop;
- email delivery of license details through Webshop;
- refund/revoke synchronization from Webshop back to the license server;
- structured audit events separate from validation events;
- persistent rate limiting suitable for serverless/multi-instance deployments;
- periodic revalidation of the add-on entitlement against the master server.

### 3. Runtime validation for desktop apps needs a different auth model

Desktop apps cannot safely store an HMAC shared secret. Any secret bundled in a
desktop app should be treated as public.

Therefore the add-on needs two API surfaces:

- server-to-server API secured with HMAC shared secrets;
- runtime activation/validation API secured with license key, activation token,
  device/domain binding, rate limits, and optional signed responses.

### 4. Engine should be modularized

The client add-on currently keeps dashboard, actions, auth, issue, validation,
crypto, and UI in one file.

Target structure should be closer to the master server:

- `src/db` or root CMS schema bridge;
- `src/data` for product, license, activation, and audit services;
- `src/api` or route handlers for API contracts;
- `src/admin` for UI;
- `src/lib` for crypto, auth, rate limit, and license key helpers.

### 5. Master and client engines should share concepts

The client add-on should not import the running master server. It should either:

- extract common licensing primitives into a private shared package; or
- intentionally duplicate a small, well-tested engine with the same semantics.

The data stores and business authority remain separate.

