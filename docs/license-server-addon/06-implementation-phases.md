# Implementation Phases

## Phase 0 - Stabilize Current State

Goal:

- preserve current working master/Webshop activation behavior;
- avoid breaking paid Webshop add-on activation.

Tasks:

- run typecheck and tests before changes;
- document current routes and environment variables;
- add tests around current `license-server-addon` bridge state resolution;
- verify migrations are applied for root CMS tables.

Acceptance:

- existing Webshop activation against master still passes;
- `/dashboard/license-server` still shows activation/install states;
- no change to master activation API behavior.

## Phase 1 - Normalize Webshop License Server API Base URL

Goal:

- make Webshop work with both standalone master and embedded client add-on.

Tasks:

- change Webshop issue processor to treat `baseApiUrl` as versioned API root;
- build endpoint URL by appending `/licenses`;
- sign actual URL pathname;
- update request snapshot path;
- add health check URL `${baseApiUrl}/health`;
- update settings UI placeholder to versioned API root.

Acceptance:

- master URL `https://licenses.nrcms.com/api/v1` calls `/api/v1/licenses`;
- embedded URL `https://client.com/api/license-server/v1` calls
  `/api/license-server/v1/licenses`;
- HMAC signature verifies in both cases.

## Phase 2 - Split Client Add-on Engine Into Modules

Goal:

- turn `.private/license-server-addon/src/addon.tsx` from a monolith into a
  maintainable product.

Target structure:

- `src/addon.tsx`
- `src/admin/*`
- `src/api/*`
- `src/data/api-clients.ts`
- `src/data/products.ts`
- `src/data/licenses.ts`
- `src/data/activations.ts`
- `src/data/audit.ts`
- `src/lib/api-auth.ts`
- `src/lib/license-keys.ts`
- `src/lib/runtime-auth.ts`
- `src/lib/rate-limit.ts`

Acceptance:

- no behavior loss;
- typecheck passes;
- tests cover moved issue/validate behavior.

## Phase 3 - Add Production Licensing Schema

Goal:

- support real device/domain/seat licensing.

Tasks:

- add `license_server_license_activations`;
- add `license_server_audit_events`;
- extend product SKU policy;
- extend license rows with customer, features, limits, status reasons;
- add migration and schema tests.
- add standard policy templates:
  - `perpetual_single_device`
  - `perpetual_multi_device`
  - `domain_license`
  - `subscription_device`
  - `subscription_domain`
  - `trial`
  - `seat_based`
  - `floating_seat`
  - `file_license`
  - `maintenance`

Acceptance:

- issue endpoint stores policy snapshot on license;
- activation endpoint can create domain/device activation;
- validation endpoint can check activation token and limits.
- policy tests cover device limit, domain limit, seat limit, subscription
  expiry, trial expiry, and maintenance expiry.

## Phase 4 - Implement Runtime API

Goal:

- expose a documented API usable by desktop apps, plugins, and services.

Tasks:

- `POST /licenses/activate`;
- `POST /licenses/validate` with activation token support;
- `POST /licenses/deactivate`;
- signed validation response optional but designed;
- strict error codes and reason codes;
- rate limit by IP, license hash, and activation id.

Acceptance:

- desktop-like test can activate once and validate repeatedly;
- second device is blocked when `maxDevices = 1`;
- domain mismatch is rejected;
- revoked activation is rejected;
- no HMAC secret is required in desktop test.

## Phase 5 - Implement Admin Product UI

Goal:

- make the client add-on usable as a product, not just an API.

Tasks:

- product type list/detail with search and pagination;
- SKU policy editor;
- license list/detail;
- activation list/detail;
- revoke/suspend/reactivate actions;
- API client secret rotation and revoke;
- validation event filters;
- audit event filters.

Acceptance:

- admin can issue manual test license;
- admin can revoke license;
- admin can reset/revoke one activation;
- admin can see why validation failed.

## Phase 6 - Webshop Catalog Sync And Fulfillment

Goal:

- remove manual copy/paste for product type IDs and make fulfillment reliable.

Tasks:

- implement `GET /catalog`;
- add Webshop catalog sync button;
- let product manager select product type and SKU from synced catalog;
- include customer email/name in issue request;
- update email/order rendering for pending, issued, failed;
- add manual retry action for failed external issue.

Acceptance:

- Webshop product can select a client License Server product/SKU;
- paid order issues a license from embedded add-on;
- license key appears in customer order page;
- failed issue can be retried by admin.

## Phase 7 - Master Entitlement Revalidation

Goal:

- keep the paid add-on entitlement honest without making master server handle
  every client customer validation.

Tasks:

- add master revalidation endpoint if missing;
- add CMS scheduled check for License Server add-on entitlement;
- store last checked timestamp and result in entitlement metadata;
- block new issue if entitlement is expired/revoked;
- define policy for validating existing licenses when entitlement expires.

Acceptance:

- expired add-on license blocks new issue;
- existing validation can continue in `edit_existing_only` unless revoked;
- admin sees clear renewal state.

## Phase 8 - Hardening And Release

Goal:

- release as a paid product.

Tasks:

- API docs page inside admin;
- external developer examples;
- migration check;
- abuse/rate limit tests;
- secret rotation tests;
- backup/restore notes;
- production rollout checklist.

Acceptance:

- full `npm run typecheck`;
- full `npm run lint`;
- full `npm run test`;
- manual end-to-end:
  - buy License Server add-on from author Webshop;
  - activate in CMS;
  - configure Webshop product;
  - buy client product;
  - issue license;
  - activate license from sample desktop script;
  - validate license;
  - revoke license;
  - validation fails with correct reason.
