# Target Architecture

## Actors

Author:

- owns `nrcms.com`;
- owns the master license server;
- sells paid CMS add-ons through the author's Webshop.

Client:

- installs the free CMS;
- buys Webshop add-on if commerce is needed;
- buys License Server add-on if the client wants to sell licensed products;
- uses the embedded License Server add-on to license the client's own products.

Client customer:

- buys a digital product from the client's Webshop;
- receives a license key;
- activates or validates the key through the client's License Server add-on API.

## Author Selling CMS Add-ons

Flow:

1. Author creates product types on master license server:
   - `webshop`
   - `license-server`
   - `webConference`
2. Author Webshop on `nrcms.com` sells these products.
3. When a paid order is completed, Webshop issues a license through the master
   license server.
4. Customer receives a license key.
5. Customer CMS activates the paid add-on against the master license server.

Important rule:

The author's Webshop should configure the master license server as an external
license server connection.

## Client Selling Licensed Products

Flow:

1. Client buys and activates Webshop add-on through the master server.
2. Client buys and activates License Server add-on through the master server.
3. Client configures digital products in Webshop.
4. Product delivery type is `license` or `file_license`.
5. Product license key policy is `license_server`.
6. Webshop issues the product license from the embedded License Server add-on
   after payment.
7. Client customer's app/plugin/domain validates against the client's API.

Important rule:

The client License Server add-on validates the client's customer licenses
without asking the author's master server on every validation.

## Master Entitlement Revalidation

The client add-on must periodically re-check its own entitlement with the master
server.

Recommended behavior:

- on activation: master returns signed entitlement and package metadata;
- on normal operation: CMS stores entitlement snapshot;
- on scheduled revalidation: CMS asks master whether the add-on entitlement is
  still active;
- if active: issue and validate continue;
- if expired: new issue requests stop, admin enters `edit_existing_only`;
- validation of already issued client licenses may continue in read-only mode;
- if revoked/fraudulent: both issue and runtime validation may be disabled by
  policy.

Recommended minimum interval:

- check on admin open;
- check on issue requests if last check is older than 24 hours;
- cron daily for production.

## Master Add-on Domain Validation

The master license server validates paid CMS add-on licenses for the CMS
installation that runs the add-on.

For `webshop`, `license-server`, and `webConference`, master licensing should
care about:

- add-on key;
- canonical CMS domain;
- stable site/deployment id;
- provider/project id when a managed platform is used;
- deployment environment;
- license status;
- expiration;
- revocation, refund, and chargeback state.

The master server should keep this policy intentionally narrow. Its job is to
answer: "May this CMS installation run this paid CMS add-on?"

Recommended behavior:

- first activation binds license to `addonKey + siteId + canonicalDomain`;
- the same license cannot activate another add-on key;
- the same license cannot silently move to another domain or site id;
- domain/site transfer requires an admin reset or a controlled transfer flow;
- expired licenses enter `edit_existing_only` if the add-on supports it;
- revoked, refunded, and chargeback licenses fail closed.

## Shared Engine Concepts

Both master and client servers should support:

- API clients;
- products/product types;
- SKUs/plans;
- license key issue;
- idempotency;
- validation;
- status transitions;
- validation events;
- audit events;
- rate limits;
- admin search and management.

Differences:

Master server:

- licenses CMS add-ons;
- owns add-on activation endpoint;
- binds add-on license to CMS site/domain/deployment;
- returns package install token and entitlement token.

Client add-on:

- licenses client products;
- exposes runtime API for apps, plugins, domains, and services;
- stores activations/devices/domains;
- manages limits and customer-facing validation.

## Client Product Licensing Policies

The client License Server add-on should be a flexible product licensing engine.
It should support the common licensing models clients expect when selling
software, plugins, files, and service-backed digital products.

Recommended policy templates:

- `perpetual_single_device`: one device, no expiry unless revoked.
- `perpetual_multi_device`: fixed maximum device count.
- `domain_license`: one or more allowed domains.
- `subscription_device`: device-limited license with expiry/renewal.
- `subscription_domain`: domain-limited license with expiry/renewal.
- `trial`: short duration with optional device/domain binding.
- `seat_based`: maximum named users/seats.
- `floating_seat`: maximum concurrent seats, later/advanced.
- `file_license`: file delivery plus runtime license validation.
- `maintenance`: perpetual use with separate updates/support expiry.

Each SKU should be able to define:

- license type;
- duration;
- maximum devices;
- maximum domains;
- maximum seats;
- activation reset policy;
- validation interval;
- offline grace period;
- feature list;
- metadata for the protected product.

This is the main product value of the add-on: the same engine can license a
desktop app, WordPress plugin, SaaS connector, downloadable file, or
file-plus-license product sold through Webshop.

## Deployment Modes

Master server:

- separate app;
- separate database;
- independent deployment;
- should not be embedded in CMS.

Client add-on:

- embedded in CMS;
- uses CMS database tables prefixed with `license_server_`;
- loaded through `lib/license-server-addon/loader.ts`;
- gated by `license_server_addon_entitlements`.

## API Base URL Standard

Use a versioned API base URL.

Master standalone:

`https://licenses.nrcms.com/api/v1`

Embedded client add-on:

`https://client-site.com/api/license-server/v1`

Endpoint examples:

- `${apiBaseUrl}/health`
- `${apiBaseUrl}/catalog`
- `${apiBaseUrl}/licenses`
- `${apiBaseUrl}/licenses/validate`
- `${apiBaseUrl}/licenses/activate`

HMAC canonical path is always the actual pathname of the final URL.

Example:

`/api/license-server/v1/licenses`
