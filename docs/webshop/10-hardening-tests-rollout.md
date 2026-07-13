# Phase 10 - Hardening, tests, rollout, and paid distribution

## Prompt for this phase

Harden the complete paid Webshop add-on implementation. Add tests,
observability, audit logs, rate limits, security checks, rollout controls,
documentation, migration safety, and private distribution preparation. Do not
add new major features in this phase.

## Goal

Prepare Webshop for production use.

Focus areas:

- RBAC and admin-only guarantees.
- License activation, renewal, expiry, and package install/update flow.
- Managed-platform attestation and self-hosted/local Webshop install blocking.
- Payment and webhook security.
- Inventory race conditions.
- Digital download privacy.
- Audit logs.
- Error handling.
- Tests and smoke checks.
- Migration safety.
- Operational documentation.
- Public/free CMS compatibility without the private add-on.
- Private repository/package readiness.

## Private add-on boundary

Hardening must cover both sides of the split:

- public CMS: optional loader, license prompt, locked states, bridge contracts,
  package install/update trigger, and compatibility tests when
  `.private/webshop` is absent;
- private add-on: commerce schema, admin modules, storefront, API handlers,
  payments, orders, digital downloads, tests, and packaging metadata.

The public CMS repository must not receive private commerce implementation
during hardening. Any required public changes should be generic bridge,
extension-point, or fallback behavior.

## Existing files to inspect first

- all webshop modules
- `tests/security.test.ts`
- `tests/migration-runner.test.mjs`
- `tests/content-status.test.ts`
- `tests/content-schedule.test.ts`
- `lib/rate-limit.ts`
- `lib/session-security.ts`
- `lib/admin-section-locks*`
- `proxy.ts`
- `.env.example`
- `README.md`
- `docs/webshop/*`
- `.gitignore`
- `.private/webshop/package.json`
- `.private/webshop/src/*`
- `.private/license-server/*`

## Security checklist

### Access control

- Every dashboard route checks auth and role.
- Every Server Action checks auth and role.
- Every Route Handler checks auth/role or has a deliberate public contract.
- Every paid Webshop route/action/API checks add-on license state before
  exposing private data or mutation.
- Webshop setup/install requires an allowlisted managed deployment attestation.
- Expired licenses enter `edit_existing_only` mode: existing data can be viewed
  and edited, but create/add/checkout/payment/new order actions are disabled.
- Admin-only features:
  - create/configure webshop
  - manage categories/attributes
  - manage products
  - manage payment settings
  - view/manage orders
  - refunds/cancellations

### Payments

- No raw card data touches CMS.
- Provider secrets are not exposed to client bundles.
- Provider secrets are not stored in plain DB fields.
- Webhook signatures are verified.
- Webhook event ids are unique and idempotent.
- Amount/currency are matched against local payment records.
- Client totals are ignored.

### Public/private split

- `.private/` is ignored by the public CMS repo.
- Public CMS has no hard dependency on the private package.
- Public CMS build/typecheck/test passes when `.private/webshop` is absent.
- Self-hosted/local/unknown deployments can use free CMS features but cannot
  install or run the paid Webshop add-on.
- Platform-looking environment variables are not trusted as proof of platform.
  Authoritative verification happens on `nr-cms-license-server`.
- Optional add-on loader handles missing module, invalid license, expired
  license, platform-not-supported, install-pending, and ready states.
- Direct navigation to paid Webshop paths fails closed when the add-on is not
  ready.
- Direct navigation to paid Webshop create/add paths fails closed when the
  license is expired, while edit routes for existing records remain available.
- Package install/update tokens are scoped and are not stored as long-lived
  plain-text secrets.
- Private add-on tests run in the private workspace.

### Digital downloads

- Digital files are private or served through signed expiring routes.
- Entitlements are required.
- Download limits and expiry are enforced.
- Refund/revocation policy is implemented.
- Public File Manager URLs cannot expose paid files.

### Cart and checkout

- Cart token is random and stored hashed in database.
- Server recalculates totals.
- Rate limits apply to cart mutation, checkout, coupon attempts, and download
  token attempts.
- Inventory reservation is transactional.

## Audit logs

Add append-only audit tables or reuse existing audit style for:

- payment setting changes
- product price changes
- inventory adjustments
- order status changes
- refund/cancel actions
- digital entitlement revocation
- webhook processing failures/retries

Audit entries should include actor id, timestamp, entity type/id, action, and
safe metadata.

## Admin-section locks

Apply existing admin-section lock pattern to singleton or high-risk pages:

- `/dashboard/webshop/settings`
- `/dashboard/webshop/storefront`
- payment settings

For row-scoped editors, add product/category/order edit locks only if concurrent
editing becomes a real risk. Start with optimistic version checks for products.

## Test plan

Run:

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run db:migrate:check`
- `npm run build`

Run private add-on checks from `.private/webshop` as well, using its own package
scripts once they exist.

Add focused tests:

- Public CMS optional loader and locked states.
- Public CMS free build path without `.private/webshop`.
- License state transitions: missing, invalid, expired edit-only,
  install-pending, ready.
- Platform state transitions: supported Vercel production OIDC,
  platform-not-supported, missing attestation, invalid attestation, local,
  self-hosted, unknown.
- Spoofed platform environment variables do not allow Webshop install.
- Setup flow accepts license key and package token.
- Setup flow blocks local/self-hosted/unknown deployments before requesting a
  package token.
- Valid license plus invalid package token produces an install retry state
  without partial commerce setup.
- Expired license allows editing existing entities and rejects create/add
  actions.
- RBAC for every webshop action/route.
- Category tree cycle prevention.
- Attribute inheritance.
- Product validation per type.
- Variant SKU uniqueness.
- Price/money validation.
- Cart server total recalculation.
- Inventory reservation concurrency.
- Coupon validation.
- Payment webhook idempotency.
- Digital entitlement download limits.
- Order state transitions.
- Public visibility for draft/hidden products.

## Manual QA checklist

Admin:

- Create webshop.
- Attempt Webshop setup on local/self-hosted deployment and confirm the
  managed-platform-required warning appears.
- Attempt Webshop setup with spoofed provider env variables and confirm license
  server rejects it.
- Verify Vercel production OIDC platform attestation succeeds for an
  allowlisted project.
- Activate Webshop with license key and package token.
- Install/update private add-on through the configured deployment path.
- Create nested categories.
- Add attributes and options.
- Create physical product with variants.
- Create digital product with private file.
- Create service product.
- Create product gallery.
- See gallery read-only in Gallery Manager.
- Configure storefront preset.
- Configure COD.
- Place COD order.
- Fulfill physical order.
- Confirm digital entitlement after paid order.
- Create coupon and apply it.
- Expire or simulate expired license.
- Confirm existing products/categories/settings can be edited.
- Confirm add/create buttons and direct create actions are disabled.
- Renew with a new license key and package token.

Non-admin backend user:

- Cannot create webshop.
- Cannot access `/dashboard/webshop`.
- Cannot call webshop actions directly.

Free CMS install:

- Remove or temporarily hide `.private/webshop`.
- Install/build the public CMS.
- Confirm `/dashboard/webshop` shows add-on/license fallback instead of
  crashing.
- Confirm setup shows a managed-platform-required warning on local/self-hosted
  installs and does not ask for a package token.
- Confirm page, blog post, and hero slider flows still work.

Public visitor:

- Browse shop root.
- Browse category.
- Filter products.
- View product.
- Add to cart.
- Checkout.
- See confirmation.

## Rollout controls

Add:

- `WEBSHOP_ENABLED` env flag or DB setting.
- `WEBSHOP_ADDON_MODULE` or equivalent optional private package/module setting
  for paid builds.
- `WEBSHOP_LICENSE_KEY`
- `WEBSHOP_LICENSE_API_URL`
- `WEBSHOP_LICENSE_PUBLIC_KEY` if signed entitlement tokens are verified
  locally.
- `WEBSHOP_PACKAGE_TOKEN` or an equivalent short-lived install token input for
  managed package install flows. Prefer not storing it after installation.
- `WEBSHOP_INSTALL_MODE`: for example `disabled` or `managed_redeploy`.
- `WEBSHOP_ALLOW_LOCAL_DEV_INSTALL`: optional internal development-only flag
  that must never enable customer self-hosted Webshop installs.
- `WEBSHOP_REDEPLOY_WEBHOOK_URL` for managed deployment install/update flows if
  used.
- `WEBSHOP_SUPPORTED_PLATFORMS`, defaulting to `vercel_production_oidc` for the
  license server allowlist.
- `WEBSHOP_VERCEL_ALLOWED_OWNER_IDS`
- `WEBSHOP_VERCEL_ALLOWED_PROJECT_IDS`
- `WEBSHOP_VERCEL_REQUIRED_ENVIRONMENT=production`
- Payment provider test/live mode.
- Ability to disable checkout while keeping catalog visible.
- Ability to hide all webshop public routes until launch.
- Admin banner when payments are in test mode.

Update `.env.example` with:

- Webshop add-on/license placeholders that do not require the private package
  for free installs.
- Supported platform placeholders and clear notes that env variables are not
  proof of platform.
- Package token/install mode placeholders with warnings against long-lived
  plain-text token storage.
- Stripe keys/webhook secret placeholders.
- PayPal client/secret placeholders.
- Bank gateway placeholders.
- Digital storage/private download settings.

## Operational docs

Add docs for:

- local private workspace setup at `D:\nr_cms\.private\webshop`
- local private license server workspace setup at
  `D:\nr_cms\.private\license-server`
- future private repo `nr-cms-webshop`
- future private repo `nr-cms-license-server`
- future private package publishing after the add-on is production-ready
- license activation and renewal
- supported managed platform policy
- Vercel production OIDC setup, verification, and allowed project/team mapping
- self-hosted/local behavior: free CMS works, Webshop install is blocked
- future platform review checklist for `netlify_managed`,
  `cloudflare_managed`, and `render_managed`
- package token scope, expiry, revocation, and install/update behavior
- Vercel/managed redeploy flow for installing private package updates
- expired license `edit_existing_only` behavior
- configuring payment providers
- webhook URLs
- test cards/provider sandbox notes
- COD workflow
- digital download storage requirements
- order status definitions
- refund policy behavior
- inventory adjustment policy
- backup/restore considerations

## Acceptance criteria

- All automated checks pass.
- Webshop can be disabled globally.
- Payment webhooks are idempotent.
- No raw payment secret or card data appears in client bundles.
- Digital assets are not public.
- Non-admin access tests pass.
- Migration checks pass from a clean database.
- README/env docs are updated.
- Public CMS can be released without private add-on source.
- Private add-on can be prepared for private repo/package distribution.
- Setup, install/update, expiry, edit-only mode, and renewal are documented and
  tested.
- Self-hosted/local installs cannot install Webshop and receive a clear managed
  platform migration message.
- Vercel production OIDC is verified by the license server before any package
  token is accepted.

## Edge cases

- Failed migration rollback plan.
- Provider outage.
- Webhook delivery delayed for hours.
- Payment marked paid but order creation failed locally.
- Order created but email failed.
- Inventory negative due to manual adjustment.
- Product deleted after order.
- Customer requests refund after digital downloads.
- Timezone issues for promotions and service bookings.
- A paying deployment has an expired license while checkout sessions are open.
- Public CMS upgrade happens while private add-on package is temporarily
  unavailable.
- License renewal succeeds but package update token fails.
- Package token is leaked or revoked during installation.
- A self-hosted user spoofs Vercel/Netlify/Render environment variables.
- Vercel OIDC is present but belongs to the wrong owner/project/environment.
