# Phase 02 - Private add-on bridge and commerce schema

## Prompt for this phase

Create the private Webshop add-on boundary, optional public CMS loader, license
activation flow, and core webshop database schema/data-access layer. Do not
build the full product UI yet. The goal is a robust paid add-on foundation that
can support physical products, digital products, services, categories,
attributes, variants, inventory, carts, payments, orders, and future payment
providers without breaking the free CMS when the add-on is absent.

## Goal

Add dedicated Drizzle tables for the webshop domain in the private add-on while
preserving existing public CMS behavior.

The schema should support:

- One active webshop per site for the first release.
- Future multi-store expansion.
- Unlimited category nesting.
- Category-level attribute definitions and inheritance.
- Products that can be physical, digital, service, or mixed bundles later.
- Product variants/SKUs.
- Inventory and stock reservations.
- Product galleries linked to existing files/galleries.
- Cart, checkout, payment, order, fulfillment, coupon, wishlist, and audit
  phases later.

The public CMS should support:

- a safe optional loader that returns "not installed" instead of throwing;
- a setup/activation screen under `/dashboard/webshop` that can collect a
  license key and private package download/install token;
- a managed-platform-only gate that blocks Webshop install on local,
  self-hosted, unknown, or unverified deployments;
- admin-only license management;
- admin-only add-on install/update trigger for environments that support it;
- bridge contracts for dashboard rendering, storefront rendering, API handling,
  and migrations;
- automated checks proving the free CMS still builds without `.private/webshop`.

## Repository and package model

Use this phase to prepare the split:

- public CMS root: `D:\nr_cms`;
- private local add-on root: `D:\nr_cms\.private\webshop`;
- private local license server root: `D:\nr_cms\.private\license-server`;
- future private GitHub repo name: `nr-cms-webshop`;
- future private license server repo name: `nr-cms-license-server`;
- future private package name: for example `@nr-cms/webshop` or
  `@your-scope/nr-cms-webshop`.

For now, do not publish a package. Treat `.private/webshop` as the private source
workspace. Later, this same source can be pushed to the private GitHub repo and
published as a private npm/GitHub package.

Add `.private/` to the public CMS `.gitignore` before adding private source
files.

When private package distribution is introduced, the CMS setup flow may request
two values:

- Webshop license key: proves entitlement and is validated by the license
  server;
- package download/install token: grants access to pull the private add-on
  package from the private package source.

Do not treat the package token as the license. It should be scoped, revocable,
and short-lived where possible. Do not store long-lived npm/GitHub tokens in
plain database fields.

Installing/updating the package should trigger a controlled redeploy or build
pipeline. Do not assume a running serverless deployment can safely mutate
`node_modules` in the background. Do not support Webshop package install on
self-hosted/local deployments.

## Managed platform attestation

The Webshop install decision must be made by `nr-cms-license-server`, not by
public CMS code. Public CMS environment variables can be used only for UX hints.
They are not proof because a self-hosted user can change them.

Initial supported platform:

- `vercel_production_oidc`
  - CMS obtains or forwards the Vercel OIDC token available to the current
    deployment/function.
  - License server verifies the token signature through Vercel OIDC discovery
    and JWKS.
  - License server checks claims for expected owner/team, project, deployment
    environment, and production status.
  - Only then can license activation and private package install continue.

Future allowlist candidates:

- `netlify_managed`
- `cloudflare_managed`
- `render_managed`

These should remain disabled until a reliable provider-specific attestation
mechanism or a deployment flow fully controlled by the Night Raven operator is
implemented.

Blocked targets:

- `local`
- `self_hosted`
- `unknown`
- `env_only_claimed_vercel`
- any provider that is detected only from user-controlled environment variables.

Suggested platform result shape:

```ts
export type WebshopDeploymentPlatform =
  | {
      status: "supported";
      provider: "vercel";
      mode: "production_oidc";
      ownerId: string;
      projectId: string;
      deploymentEnvironment: "production";
    }
  | {
      status: "unsupported";
      reason:
        | "local"
        | "self_hosted"
        | "unknown"
        | "missing_attestation"
        | "invalid_attestation"
        | "unsupported_provider";
      message: string;
    };
```

## Public CMS bridge requirements

Create a small public bridge/contract layer, but keep it generic. Suggested
public files:

- `lib/webshop-addon/contract.ts`
- `lib/webshop-addon/loader.ts`
- `lib/webshop-addon/license.ts`
- `components/webshop-addon-required.tsx`
- `components/webshop-license-activation.tsx`

The bridge must:

- avoid top-level static imports from `.private/webshop` or a future private
  package;
- catch missing add-on/module errors and return a typed `null`/`not_installed`
  result;
- distinguish `not_installed`, `license_required`, `license_invalid`,
  `license_expired`, `platform_not_supported`, `install_pending`, and `ready`
  states;
- expose only stable contracts needed by public routes;
- keep public CMS typecheck/build green when the add-on is absent.

Suggested contract shape:

```ts
export type WebshopAddonState =
  | { status: "not_installed" }
  | {
      status: "platform_not_supported";
      message: string;
      supportedProviders: readonly ["vercel_production_oidc"];
    }
  | { status: "install_pending" }
  | { status: "license_required" }
  | { status: "license_invalid"; reason: string }
  | {
      status: "license_expired";
      expiresAt: string;
      mode: "edit_existing_only";
      addon: WebshopAddon;
    }
  | { status: "ready"; addon: WebshopAddon };

export type WebshopAddon = {
  version: string;
  renderDashboard(input: WebshopDashboardInput): Promise<React.ReactNode>;
  renderDashboardPath(input: WebshopDashboardPathInput): Promise<React.ReactNode>;
  renderStorefrontRoot(input: WebshopStorefrontInput): Promise<React.ReactNode>;
  renderStorefrontPath(input: WebshopStorefrontPathInput): Promise<React.ReactNode>;
  handleApiRoute?(input: WebshopApiRouteInput): Promise<Response>;
  listMigrations?(): Promise<WebshopMigration[]>;
};
```

Public route shells may live in the CMS repo, but they should only delegate:

- `app/dashboard/webshop/page.tsx`;
- `app/dashboard/webshop/[...webshopPath]/page.tsx`;
- `app/api/webshop/[...webshopPath]/route.ts`;
- public storefront dispatch from the `webshop` content row/root and nested
  routes.

If the private add-on is missing or unlicensed, dashboard routes show the
appropriate locked/license screen and API routes return `404` or `403` without
throwing.

If the private add-on is installed but the license expired, dashboard routes
should still delegate to the private add-on in `edit_existing_only` mode so the
admin can view and edit existing data, export data, and renew the license.
Create/add actions and checkout/payment actions must be disabled.

## License model

This phase should introduce license activation UX and storage, but not pretend
that public source can provide unbreakable enforcement.

Recommended flow:

1. Admin opens `/dashboard/webshop`.
2. If no add-on is installed, CMS shows an add-on-required setup screen.
3. CMS requests platform verification from the license server, passing the
   provider attestation token when one exists.
4. If the license server returns `platform_not_supported`, CMS stops setup and
   displays a blocking message telling the admin to move to a supported managed
   platform, initially Vercel.
5. If the platform is supported, setup prompts for a Webshop license key and
   private package download/install token.
6. CMS sends the license key, site identifier, domain, and verified platform
   reference to the license server.
7. License server returns a signed entitlement token with product, features,
   expiry, domain/site binding, and platform binding.
8. If the entitlement is valid, CMS uses the package token to install/update the
   private add-on through a controlled managed deployment path.
9. The app restarts/rebuilds so the optional loader can resolve the private
   module.
10. CMS stores only the key reference, safe package metadata, and/or signed
    entitlement token, not a private signing secret or long-lived package token.
11. Private add-on verifies entitlement before rendering paid screens and before
    handling paid API/server actions.

Renewal flow:

1. Admin opens the license screen from `/dashboard/webshop`.
2. Admin enters a new license key and, if an add-on update is required, a new
   package token.
3. CMS validates the new license with the license server.
4. CMS updates the stored entitlement token and package metadata.
5. If the package changed, CMS runs the controlled install/update path and
   restarts/rebuilds.

Expired license behavior:

- state becomes `license_expired` with `mode: "edit_existing_only"`;
- admins can view and edit existing Webshop records;
- admins can renew the license;
- create/add actions are disabled;
- public checkout, payment, and new order creation are disabled;
- existing Webshop data remains available and is never deleted solely because
  the license expired.

Sensitive enforcement should live in the private add-on and/or license server.
The public CMS gate is a UX and distribution boundary, not strong DRM.

## Existing files to inspect first

- `db/schema.ts`
- latest `drizzle/*.sql`
- `drizzle/meta/_journal.json`
- `scripts/run-drizzle-migrations.mjs`
- `data/content.ts`
- `data/galleries.ts`
- `data/files.ts`
- `lib/file-storage.ts`
- `lib/roles.ts`
- `lib/content-types.ts`
- `lib/content-type-permissions.ts`
- `app/dashboard/webshop/page.tsx`
- `tests/migration-runner.test.mjs`

Private workspace files to create:

- `.private/webshop/package.json`
- `.private/webshop/src/index.ts`
- `.private/webshop/src/manifest.ts`
- `.private/webshop/src/db/schema.ts`
- `.private/webshop/src/db/migrations/*`
- `.private/webshop/src/data/*`
- `.private/webshop/src/lib/*`
- `.private/webshop/tests/*`

## Required schema groups

### Store shell

Add in the private add-on schema:

- `webshops`
  - `id uuid primary key`
  - `content_id uuid not null references content(id) on delete cascade`
  - `status text not null default 'draft'`
  - `name text not null`
  - `slug text not null`
  - `default_currency text not null default 'RSD'` or project-preferred default
  - `supported_currencies jsonb not null default '[]'`
  - `created_by`, `updated_by`
  - timestamps
  - checks for status and currency format
  - unique `content_id`
  - partial unique active shop index if only one active shop is allowed

- `webshop_settings`
  - `webshop_id primary key`
  - checkout flags
  - guest checkout flag
  - enabled payment methods jsonb
  - shipping/tax settings jsonb
  - order numbering settings jsonb
  - storefront preset settings jsonb
  - email notification settings jsonb

### Category tree

Add in the private add-on schema:

- `webshop_categories`
  - `id uuid primary key`
  - `webshop_id references webshops(id) on delete cascade`
  - `parent_id uuid references webshop_categories(id) on delete restrict`
  - `name`, `slug`, `description`
  - `image_file_id references files(id) on delete set null`
  - `meta_title`, `meta_description`
  - `status text` with `draft`, `active`, `hidden`, `archived`
  - `position integer`
  - timestamps and actor fields
  - unique `(webshop_id, parent_id, slug)` with nulls-not-distinct if possible

- `webshop_category_closure`
  - `webshop_id`
  - `ancestor_id`
  - `descendant_id`
  - `depth integer`
  - primary key `(ancestor_id, descendant_id)`

Use adjacency (`parent_id`) for simple editing and closure rows for fast
descendant queries, breadcrumbs, and inherited attribute resolution.

### Attribute definitions

Add in the private add-on schema:

- `webshop_attribute_definitions`
  - `id`, `webshop_id`
  - `name`
  - `key` stable slug key
  - `type`: `text`, `number`, `boolean`, `select`, `multi_select`, `date`,
    `dimension`, `weight`, `color`, `url`
  - `unit`
  - `is_filterable boolean`
  - `is_searchable boolean`
  - `is_required boolean`
  - `display_order integer`
  - `validation jsonb`
  - unique `(webshop_id, key)`

- `webshop_attribute_options`
  - for select/multi-select/color values
  - `id`, `attribute_id`
  - `label`, `value`, `position`
  - unique `(attribute_id, value)`

- `webshop_category_attributes`
  - `category_id`
  - `attribute_id`
  - `required_override`
  - `filterable_override`
  - `position`
  - `inheritance_mode`: `own`, `inherited`, `excluded`

Do not use a loose JSON-only product attribute model. JSON can store denormalized
snapshots, but filterable values need typed rows and indexes.

### Products and variants

Add in the private add-on schema:

- `webshop_products`
  - `id`, `webshop_id`
  - `product_type`: `physical`, `digital`, `service`
  - `title`, `slug`, `description`, `description_json`
  - `excerpt`, `meta_title`, `meta_description`
  - `status`: `draft`, `active`, `hidden`, `archived`
  - `primary_category_id`
  - `gallery_id`
  - `tax_category_id`
  - `requires_shipping boolean`
  - `is_inventory_tracked boolean`
  - `published_at`
  - actor and timestamps
  - unique `(webshop_id, slug)`

- `webshop_product_categories`
  - many-to-many product/category assignment
  - include `is_primary boolean`

- `webshop_product_variants`
  - `id`, `product_id`
  - `sku`
  - `title`
  - `status`
  - `price_minor bigint`
  - `compare_at_price_minor bigint`
  - `currency text`
  - `option_values jsonb`
  - `weight_grams`, `dimensions jsonb`
  - inventory fields or link to inventory table
  - unique SKU per webshop

- `webshop_product_attribute_values`
  - `product_id`
  - `variant_id nullable`
  - `attribute_id`
  - typed value columns: `value_text`, `value_number`, `value_boolean`,
    `value_date`, `option_id`
  - unique by product/variant/attribute/option as appropriate

Separate variant options from category attributes:

- Category attributes describe/filter products, for example vendor, screen size,
  file format, duration, language, delivery mode.
- Variant options create purchasable SKUs, for example size/color, license tier,
  package duration, seat count.

### Inventory and reservations

Add in the private add-on schema:

- `webshop_inventory_items`
  - one row per variant when stock is tracked
  - `stock_on_hand`
  - `stock_reserved`
  - `low_stock_threshold`
  - `allow_backorder`

- `webshop_inventory_movements`
  - append-only audit table
  - movement types: `initial`, `manual_adjustment`, `reserved`, `released`,
    `sold`, `returned`, `canceled`
  - actor/order references

Do not rely only on a mutable stock count. Keep movements for audit and edge
case recovery.

### Future tables to reserve names for

It is acceptable to create these in later phases, but plan the naming now:

- `webshop_carts`
- `webshop_cart_items`
- `webshop_checkout_sessions`
- `webshop_orders`
- `webshop_order_items`
- `webshop_order_addresses`
- `webshop_payments`
- `webshop_payment_events`
- `webshop_fulfillments`
- `webshop_refunds`
- `webshop_coupons`
- `webshop_coupon_redemptions`
- `webshop_wishlists`
- `webshop_related_products`
- `webshop_digital_assets`
- `webshop_download_entitlements`

## Data-access layer

Create focused modules under `.private/webshop/src/data/` and
`.private/webshop/src/lib/`:

- `.private/webshop/src/data/webshops.ts`
- `.private/webshop/src/data/webshop-categories.ts`
- `.private/webshop/src/data/webshop-attributes.ts`
- `.private/webshop/src/data/webshop-products.ts`
- `.private/webshop/src/data/webshop-inventory.ts`
- `.private/webshop/src/lib/webshop-types.ts`
- `.private/webshop/src/lib/webshop-money.ts`
- `.private/webshop/src/lib/webshop-permissions.ts`

Keep validation schemas close to Server Actions, but export stable domain types
from the private add-on `webshop-types.ts`. Export only public-safe bridge types
from the CMS repo.

## Acceptance criteria

- Drizzle schema compiles.
- Migration is generated and checked in.
- Public CMS builds and typechecks without `.private/webshop`.
- Public dashboard shows add-on-required or license-required state instead of
  crashing when the private add-on is missing or inactive.
- Public dashboard shows a managed-platform-required warning when the current
  deployment is local, self-hosted, unknown, or unverified.
- Setup screen accepts license key and package token and routes them to the
  correct validation/install steps.
- License activation flow stores a signed entitlement/token or a safe reference
  and never stores a private signing secret.
- License activation is blocked unless the license server verifies an
  allowlisted managed deployment platform.
- Expired license enters `edit_existing_only` mode instead of fully locking
  existing data.
- `npm run db:migrate:check`, `npm run typecheck`, and relevant tests pass.
- No existing CMS content/category/gallery behavior changes.
- New schema supports nested categories, typed filter attributes, product
  variants, and inventory reservation design.

## Tests to add or update

- Migration runner test includes new tables.
- Free CMS build/test path passes without private add-on installed.
- Optional add-on loader returns `not_installed` when no module is available.
- License state maps missing/invalid/expired/install-pending/ready cases
  correctly.
- Platform state maps supported Vercel production OIDC, local, self-hosted,
  unknown, missing attestation, and invalid attestation cases correctly.
- Expired license allows edit existing records and rejects create/add actions.
- Package token is not persisted as a long-lived plain-text secret.
- Category closure helper can insert root, child, grandchild.
- Cycle prevention rejects moving a category under its own descendant.
- Money helpers reject float prices and invalid currencies.
- Attribute type validation maps values to the correct typed columns.

## Edge cases

- Deleting a category with products should be restricted or require reassignment.
- Do not add a hard dependency from public `package.json` to
  `.private/webshop`; that would break free/public installs. Use optional
  loading for development and later private package installation.
- Do not assume live runtime package installation is possible on Vercel. Use a
  redeploy/build trigger for managed deployments.
- Do not trust `VERCEL`, `VERCEL_ENV`, `NETLIFY`, `RENDER`, or similar
  environment variables as proof of platform. Use them only to improve warning
  text before the license server performs authoritative verification.
- If the site is self-hosted or local, Webshop setup must stop before asking for
  a package token.
- If the package token is invalid but the license is valid, keep the setup in an
  install-failed state and allow retry without creating partial commerce state.
- Moving a category must rebuild closure rows in a transaction.
- Attribute deletion should be blocked if products still use it unless a
  migration path is provided.
- SKU uniqueness must be scoped to a webshop, not globally, if multi-store is
  added later.
- Products can belong to multiple categories, but one category should be primary
  for breadcrumbs and canonical URLs.
