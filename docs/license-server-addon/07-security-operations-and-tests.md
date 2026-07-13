# Security, Operations, And Tests

## Threat Model

Main risks:

- client bypasses add-on purchase;
- customer brute-forces license keys;
- desktop app leaks an embedded shared secret;
- replayed API requests issue duplicate licenses;
- payment webhook retries issue duplicate licenses;
- stolen license key activates too many devices/domains;
- revoked/refunded license keeps validating;
- secrets are logged or stored in plain text;
- in-memory rate limiting fails in multi-instance deployments.

## Required Controls

### Add-on entitlement

- master server activates the add-on;
- client add-on never self-authorizes;
- entitlement is periodically revalidated;
- new issue stops when entitlement is expired or revoked.

### API clients

- HMAC only for trusted backends;
- generated shared secret shown once;
- secret encrypted at rest;
- fingerprint stored for display/search;
- nonce replay protection;
- timestamp max skew;
- idempotency on issue.

### Runtime clients

- no HMAC shared secret in desktop apps;
- activation token stored after first activation;
- activation token stored hashed on server;
- device/domain fingerprint stored hashed;
- rate limits on activation and validation;
- validation reason codes are machine-readable.

### License keys

- high entropy;
- normalized before hashing;
- hash stored for lookup;
- encrypted copy only if needed for idempotent replay/admin display;
- never log raw key except intentionally in customer delivery context.

### Domain and device checks

- canonicalize domains;
- hash device fingerprints;
- enforce max devices/domains/seats;
- allow admin reset/revoke of individual activations;
- log all activation decisions.

### Webshop payment integration

- issue only after trusted paid transition;
- never issue inside an unbounded DB transaction;
- use idempotency key per order item;
- retry safely;
- refund/chargeback should update license server status.

## Rate Limiting

MVP in-memory rate limiting is acceptable only for local development.

Production should use one of:

- database-backed sliding/fixed window;
- Redis/Upstash;
- provider edge rate limiting;
- Postgres advisory/update based counters.

Recommended buckets:

- API client id;
- IP;
- license key hash;
- activation id;
- product id.

## Observability

Add structured logs for:

- issue requested;
- issue succeeded;
- issue failed;
- activation requested;
- activation limit reached;
- validation valid;
- validation invalid;
- API auth failed;
- rate limited;
- entitlement revalidation failed.

Do not log:

- raw shared secrets;
- activation tokens;
- full license keys outside deliberate customer delivery events.

## Admin Operations

Admin needs:

- rotate API client secret;
- revoke API client;
- suspend/reactivate license;
- revoke license;
- mark refund/chargeback;
- revoke one activation;
- reset activation limit for customer support;
- inspect validation failures;
- retry Webshop license issue.

Every operation writes audit event.

## Test Matrix

### Unit tests

- domain canonicalization;
- device fingerprint hashing;
- license key normalization;
- HMAC canonical string;
- timing-safe compare;
- activation policy decisions;
- license status transitions;
- validation reason mapping.

### Data tests

- idempotent issue returns same license;
- unique activation fingerprint per license;
- max devices blocks extra activation;
- revoked activation fails validation;
- suspended license fails validation;
- expired license fails validation;
- grace period behavior.

### API tests

- missing HMAC rejected;
- bad signature rejected;
- stale timestamp rejected;
- replay nonce rejected;
- issue requires idempotency key;
- runtime activate creates token;
- runtime validate accepts active activation;
- runtime validate rejects wrong device/domain.

### Webshop integration tests

- base API URL builder for master path;
- base API URL builder for embedded path;
- paid order creates one issue row;
- duplicate paid event does not duplicate issue row;
- successful issue updates fulfillment snapshot;
- failed issue stores safe error;
- refund triggers external revoke/status update.

### End-to-end manual test

1. Configure master license server as Webshop license server on `nrcms.com`.
2. Buy `License Server add-on`.
3. Activate add-on in a CMS install.
4. Configure embedded license server API client.
5. Configure Webshop product with `license_server` policy.
6. Complete paid order.
7. Confirm external issue row becomes `issued`.
8. Activate license from sample desktop script.
9. Validate license.
10. Revoke license in admin.
11. Validate again and confirm invalid reason.

## Release Requirements

Before product release:

- migrations applied and checked;
- backup plan documented;
- API docs visible to admin;
- sample integration code created;
- logs checked for secret leaks;
- rate limit backend production-ready;
- master entitlement revalidation implemented;
- Webshop issue path normalized;
- refund/revoke synchronization implemented.

