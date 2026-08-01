# Client License Server Add-on - Implementation Plan

## Purpose

This folder is the technical implementation plan for turning
`D:\nr_cms\.private\license-server-addon` from the current MVP into a paid
client-facing License Server add-on.

The add-on is sold through the author's master system, then runs inside the
client CMS and licenses products sold by that client through the Webshop add-on.

## Product Boundary

There are two license server products in this architecture.

`D:\nr_cms\.private\license-server`

- Master license server owned by the author.
- Licenses paid CMS add-ons: `webshop`, `license-server`, and `webConference`.
- Runs as an independent service and must not depend on a client CMS database.
- Used by the author's own Webshop on `nrcms.com` to issue licenses for paid
  CMS add-ons.

`D:\nr_cms\.private\license-server-addon`

- Paid client License Server add-on.
- Runs embedded in a client CMS installation after activation by the master
  license server.
- Issues and validates licenses for digital products sold by that client's
  Webshop.
- Must not be its own activation authority.

## Current Code Map

Master license server:

- `.private/license-server/src/db/schema.ts`
- `.private/license-server/src/data/licenses.ts`
- `.private/license-server/src/data/addon-activation.ts`
- `.private/license-server/app/api/v1/entitlements/route.ts`
- `.private/license-server/app/api/v1/entitlements/validate/route.ts`
- `.private/license-server/app/api/addons/licenses/activate/route.ts`

CMS bridge for the client add-on:

- `lib/license-server-addon/*`
- `data/license-server-addon-entitlement.ts`
- `components/license-server-addon-required.tsx`
- `app/dashboard/license-server/*`
- `app/api/license-server/[...licenseServerPath]/route.ts`
- `db/schema.ts` tables prefixed with `license_server_`

Client License Server add-on MVP:

- `.private/license-server-addon/src/addon.tsx`

Webshop integration points:

- `.private/webshop/src/data/webshop-license-servers.ts`
- `.private/webshop/src/data/webshop-license-server-issues.ts`
- `.private/webshop/src/data/webshop-orders.ts`
- `.private/webshop/src/admin/settings/license-servers-manager.tsx`
- `.private/webshop/src/admin/products/product-manager.tsx`
- `app/api/cron/webshop-license-issues/route.ts`

## Key Decisions

1. The master server activates the client License Server add-on.
2. After activation, the client License Server add-on issues and validates the
   client's product licenses locally through its own API.
3. The client add-on should reuse the same engine concepts as the master server,
   but must not call the master server for every license issued to client
   customers.
4. The add-on must expose a documented API for server-to-server issuing and for
   runtime license activation/validation by software products.
5. Desktop applications must not embed HMAC shared secrets. They should use a
   runtime activation token flow instead.
6. Webshop must support both:
   - author's Webshop issuing CMS add-on licenses from the master server;
   - client Webshop issuing client product licenses from the embedded add-on.

## Phase Documents

1. [Current State And Gaps](./01-current-state-and-gaps.md)
2. [Target Architecture](./02-target-architecture.md)
3. [Data Model And Engine](./03-data-model-and-engine.md)
4. [Documented API Contract](./04-documented-api-contract.md)
5. [Webshop Integration](./05-webshop-integration.md)
6. [Implementation Phases](./06-implementation-phases.md)
7. [Security, Operations, And Tests](./07-security-operations-and-tests.md)
8. [Developer Examples](./08-developer-examples.md)
9. [Release Runbook](./09-release-runbook.md)
