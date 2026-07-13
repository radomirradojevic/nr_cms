# Night Raven CMS Webshop integration plan

This folder contains the phased implementation instructions for adding
`webshop` as a paid add-on content type in Night Raven CMS.

The requested direction is sound, but the safest architecture is a split
public/private hybrid:

- Keep `page`, `blog_post`, and `hero_slider` as free public CMS content types.
- Add `webshop` to the public CMS content workflow only as a locked/optional
  add-on shell so the shop can have a normal CMS entry, slug, SEO, publication
  status, preview/visibility behavior, and dashboard entry point.
- Keep the real commerce implementation in a private add-on workspace at
  `D:\nr_cms\.private\webshop`. That folder is the source that will later be
  pushed to the private `nr-cms-webshop` repository.
- Later, after the add-on is production-ready, the same private repository can
  publish a private package such as `@nr-cms/webshop` or
  `@your-scope/nr-cms-webshop`.
- Keep commerce data in dedicated private add-on tables. Products, variants,
  inventory, carts, checkout sessions, payments, orders, refunds, coupons,
  fulfillment, and digital download entitlements should not live inside the
  existing public `content.content_json`.
- Reuse the existing file manager, gallery manager, AI writing assistant,
  Clerk roles, Drizzle migrations, shadcn UI components, regional settings, and
  admin-section lock patterns through stable public bridge APIs wherever they
  fit.

## Repository split

Public CMS repo (`D:\nr_cms`) may contain:

- the `webshop` content type foundation;
- admin-only Webshop menu links and placeholder routes;
- the license prompt and "add-on not installed" screens;
- managed-platform-only setup warnings for unsupported deployments;
- optional add-on loader/registry code that safely returns `null` when the
  private add-on is missing;
- TypeScript contracts shared with private add-ons;
- generic extension points in existing CMS surfaces, for example read-only
  gallery badges or content-category tabs.

Public CMS repo must not contain:

- product, variant, cart, checkout, payment, order, coupon, inventory, wishlist,
  or digital entitlement business logic;
- payment provider adapters or secrets;
- private storage/download implementation;
- paid Webshop UI that represents commercial value.

Private add-on workspace (`D:\nr_cms\.private\webshop`) should contain:

- real Webshop dashboard modules;
- Webshop Drizzle schema and migrations;
- product/category/attribute/cart/order/payment data access;
- storefront renderer;
- payment/order/fulfillment services;
- tests for commerce behavior.

Private license server workspace (`D:\nr_cms\.private\license-server`) should
later contain the source for the future private `nr-cms-license-server` repo.
That service validates license keys, issues signed entitlement tokens, handles
expiry/renewal/revocation, and can mint or validate scoped package install
tokens.

Add `.private/` to the public repo `.gitignore` before placing private code
there. Do not commit `.private/webshop` or `.private/license-server` to the
public CMS repository.

## Optional add-on rule

The free CMS installation must build and run when the private add-on is absent.
Public code must not use top-level static imports from `.private/webshop` or a
future private package. Add-on loading must be optional and defensive:

- if the add-on is not installed, show a locked/add-on-required screen;
- if the add-on is not installed and the admin chooses setup, prompt for a
  Webshop license key and a private package download/install token;
- if the add-on is installed but no valid license is present, show the license
  activation screen;
- if the add-on is installed and the license is valid, delegate rendering,
  actions, and API handling to the private add-on.

License checks in public source are only a product gate, not strong protection.
The valuable code stays private, and any critical entitlement decision should be
validated by the private add-on and/or a separate license server.

## Managed platform policy

The paid Webshop add-on should be installable only on supported managed
deployment platforms. The free CMS remains usable on local and self-hosted
deployments, but Webshop setup must stop before package installation when the
deployment cannot be verified.

Initial allowlist:

- `vercel_production_oidc`: supported first. The license server verifies a
  Vercel-issued OIDC token and checks production deployment claims such as
  project, owner/team, and environment.

Future candidates:

- `netlify_managed`
- `cloudflare_managed`
- `render_managed`

These future platforms should be enabled only after a reliable attestation or
provider-managed deployment process exists. Do not trust provider-looking
environment variables alone.

Blocked targets:

- `local`
- `self_hosted`
- `unknown`
- any platform that can only be detected through user-controlled environment
  variables.

The authoritative platform decision belongs on `nr-cms-license-server`, not in
the public CMS. The CMS can display a helpful warning, but the license server
must return `platform_not_supported` unless the deployment proves it is on an
allowlisted managed platform.

## Add-on install and renewal flow

The intended paid setup flow is:

1. Admin clicks the `Webshop` setup card in the free CMS.
2. CMS asks the license server whether the current deployment is on a supported
   managed platform.
3. If the platform is unsupported, CMS shows a blocking message such as
   `Webshop add-on is available only on supported managed deployments. Move this
   site to Vercel to continue.`
4. If the platform is supported, CMS prompts for a Webshop license key and a
   private package download/install token.
5. CMS validates the license key with the license server.
6. If the license is valid, CMS uses the package token to install or update the
   private Webshop add-on from the private package source through the managed
   deployment flow.
7. After install/update, the deployment restarts or rebuilds so the private
   module is available to the optional loader.
8. CMS stores only safe license/package metadata and the signed entitlement
   token. Do not store long-lived package tokens in plain database fields.

For Vercel/managed deployments, installation should trigger a controlled
redeploy or build pipeline, not mutate a running serverless filesystem.
Self-hosted deployments should not be allowed to install or run the paid Webshop
add-on.

License key and package token are related but separate:

- the license key proves entitlement and carries product, expiry, domain/site,
  and feature information through a signed token returned by the license server;
- the package token grants temporary access to download the private add-on
  package and should be scoped, revocable, and preferably short-lived.

When a license expires, the add-on should enter `edit_existing_only` mode:

- admins can view and edit existing Webshop data;
- admins can renew by entering a new license key and package token if an update
  is required;
- create/add actions are disabled for products, categories, attributes,
  variants, coupons, and other new commerce entities;
- public checkout/payment/new order creation is disabled;
- existing data is never deleted or hidden solely because the license expired.

## Critical project rules

- This repo uses Next.js 16.x. Follow the local `AGENTS.md` rules:
  use `proxy.ts`, never `middleware.ts`; await `params` and `searchParams`;
  keep Tailwind v4 configuration in `app/globals.css`; use ESLint flat config.
- Use `@/*` imports.
- Default to Server Components. Add `"use client"` only for interactivity.
- Every Server Action and Route Handler must check Clerk auth and role access.
- Only admins may create or configure the `webshop` content type. Authors and
  publishers must not see or reach the create route.
- Public Webshop routes must fail closed without crashing when the private
  add-on is not installed.
- Server Actions should return error objects instead of throwing for user-facing
  validation failures.
- Do not store raw card data. Payment totals must be computed server-side.

## Best-practice baseline used in this plan

Primary references checked while designing this plan:

- Stripe PaymentIntents and webhooks:
  https://docs.stripe.com/payments/payment-intents and
  https://docs.stripe.com/webhooks
- Stripe Checkout Sessions:
  https://docs.stripe.com/payments/quickstart-checkout-sessions
- PayPal Orders/Webhooks APIs:
  https://developer.paypal.com/docs/api/orders/v2/ and
  https://developer.paypal.com/docs/api/webhooks/v1/
- Google Pay API web request objects:
  https://developers.google.com/pay/api/web/reference/request-objects
- OWASP third-party payment gateway integration cheat sheet:
  https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Payment_Gateway_Integration_Cheat_Sheet.html
- PCI Security Standards Council SAQ guidance:
  https://www.pcisecuritystandards.org/

The resulting implementation principles:

- Hosted/redirect or provider-hosted payment collection is preferred for the
  first production version.
- Verify all provider webhooks, store processed event ids, and make order
  transitions idempotent.
- Never trust client totals, SKU ids, coupon values, shipping prices, or tax
  amounts.
- Never treat a local public-repo license check as unbypassable security.
- Keep order item snapshots immutable after order placement.
- Reserve or decrement stock inside transactions, not in client state.
- Treat digital files as private commerce assets, even if the current File
  Manager can serve regular uploads publicly.

## Phase order

Run these phases chronologically. Each file is written so the user can paste
that phase as a separate implementation prompt.

1. [Phase 01 - Public foundation content type](./01-foundation-content-type.md)
2. [Phase 02 - Private add-on bridge and commerce schema](./02-commerce-schema.md)
3. [Phase 03 - Private categories and attributes](./03-categories-attributes.md)
4. [Phase 04 - Private product management](./04-product-management.md)
5. [Phase 05 - Private product galleries and digital assets](./05-galleries-digital-assets.md)
6. [Phase 06 - Private storefront presets, browsing, and search](./06-storefront-presets-search.md)
7. [Phase 07 - Private cart and checkout](./07-cart-checkout.md)
8. [Phase 08 - Private payments, orders, and fulfillment](./08-payments-orders-fulfillment.md)
9. [Phase 09 - Private promotions, wishlist, and related products](./09-promotions-wishlist-related.md)
10. [Phase 10 - Hardening, tests, rollout, and paid distribution](./10-hardening-tests-rollout.md)
11. [Production rollout checklist](./production-rollout.md)

## Recommended scope decisions

For the first production-quality version:

- Support one active webshop per site, but model it with a `webshops` table so
  multi-store support can be added later.
- Let only admins create and configure the shop. Product/catalog editing can
  remain admin-only at first; later phases may add granular permissions.
- Use dedicated `webshop_categories`, not `content_categories`, for product
  categories. The `/dashboard/content-categories` third tab should display
  webshop categories read-only and link into `/dashboard/webshop/categories`.
- Use category attributes for filtering/specifications and product variant
  options for purchasable SKU differences. Do not merge those concepts.
- Store prices as integer minor units plus ISO currency code.
- Keep payment provider secrets out of plain database fields. Use environment
  variables or an encrypted secret store.
- Make digital download support conditional on a private/signed storage path.
  The current Vercel Blob provider writes public objects, so paid digital assets
  need a separate private download layer before launch.
