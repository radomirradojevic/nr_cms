# Phase 06 - Private storefront presets, browsing, and search

## Prompt for this phase

Build the private Webshop storefront renderer, category/product pages,
storefront display presets, filter generation from category attributes, and
product search. The public CMS should provide only route dispatch and fallback
UI. Do not build checkout/payment yet.

## Goal

Enable visitors to browse:

- Webshop root page.
- Category and subcategory pages.
- Product detail pages.
- Product search.
- Attribute filters generated from category definitions.
- Storefront layout presets managed from Webshop dashboard.

## Private add-on boundary

Storefront product browsing is paid Webshop functionality. Category pages,
product pages, product search, filter generation, and preset logic belong in
`.private/webshop`.

The public CMS may contain:

- route dispatch that recognizes a published `webshop` content row;
- a root placeholder when the add-on is not installed or not licensed;
- nested route shells that delegate to the private add-on only when ready;
- expired-license storefront behavior that can render existing catalog pages in
  read-only mode while disabling add-to-cart and checkout entry points;
- SEO/content shell integration based on the public `content` row.

The public CMS must not contain product search, product card, pricing, variant,
stock, or storefront preset business logic.

## Existing files to inspect first

- `app/[slug]/page.tsx`
- `components/content-public-renderer.tsx`
- `app/search/page.tsx`
- `app/api/search/route.ts`
- `components/page-template.tsx`
- `components/blog-category-template.tsx`
- `components/blog-post-template.tsx`
- `components/gallery-grid.tsx`
- `components/site-header.tsx`
- `components/site-footer.tsx`
- `lib/content-visibility.ts`
- `lib/content-schedule.ts`
- `lib/regional-settings.ts`

## Routing model

Use the Webshop content row slug as the shop root.

Example if the admin creates webshop with slug `shop`:

- `/shop`
- `/shop/c/phones`
- `/shop/c/phones/smartphones`
- `/shop/p/iphone-17-pro`
- `/shop/search`
- `/shop/cart`
- `/shop/checkout`
- `/shop/order/<order-number-or-token>`

Use reserved path segments:

- `c` for categories
- `p` for products
- `search`
- `cart`
- `checkout`
- `order`

This avoids collisions between product slugs and CMS page slugs.

Implementation model:

- Keep `app/[slug]/page.tsx` for root content pages and the webshop root
  content row.
- Add `app/[slug]/[...webshopPath]/page.tsx` only for nested shop paths and
  dispatch only when `[slug]` belongs to a live `webshop` content row.

Recommended paid add-on split:

- public `app/[slug]/page.tsx` renders the CMS `webshop` root shell and delegates
  to `renderStorefrontRoot` only when the add-on state is `ready`;
- public `app/[slug]/[...webshopPath]/page.tsx` delegates nested paths such as
  `/shop/c/...`, `/shop/p/...`, `/shop/search`, `/shop/cart`, and
  `/shop/checkout`;
- if the add-on is missing or invalid/unlicensed, root renders a public
  placeholder and nested paths return `notFound()` or a locked state, depending
  on product decision;
- if the add-on is installed but the license expired, existing catalog routes
  may render in read-only mode, while cart/checkout/order creation routes are
  disabled.

Remember Next.js 16 rule: `params` is a Promise and must be awaited.

## Storefront presets

Add dashboard pages:

- `/dashboard/webshop/storefront`
- `/dashboard/webshop/storefront/category-presets`
- `/dashboard/webshop/storefront/product-presets`

Preset fields:

- category grid/list layout
- category image style
- product card density
- filter position: left sidebar, top bar, drawer on mobile
- sorting options
- products per page
- show/hide compare-at price
- show/hide SKU
- show/hide stock message
- product media layout
- related products section
- digital/service-specific info blocks

Keep presets as controlled JSON validated by Zod. Do not allow arbitrary CSS or
unsafe HTML.

Preset storage and validation belong in the private add-on. Public CMS code only
delegates to the private storefront/settings renderer.

## Category pages

Category page should include:

- Breadcrumbs
- Category title
- Description
- Category image when present
- Child categories
- Product grid/list
- Filters generated from attributes assigned to that category and descendants
- Sort control
- Pagination

Filter generation:

- Select/multi-select/color: checkbox or swatch facets.
- Number/dimension/weight: range filters.
- Boolean: toggle/checkbox.
- Date: range only if it makes sense.
- Text: search only, not facet by default.

Facet counts should be generated server-side with current filters applied.

## Product pages

Product detail page should include:

- Product title
- Gallery
- Price
- Variant selector
- Stock or availability message
- Product type-specific details
- Description
- Attributes/specifications
- Related products placeholder
- Add to cart button disabled until cart phase is implemented, or use a
  non-functional placeholder only during this phase
- SEO metadata

Physical product details:

- shipping/returns summary
- weight/dimensions if enabled

Digital product details:

- file format
- license/delivery summary
- no public download links

Service details:

- duration
- delivery mode
- location or online info

## Search

Implement product search separately from existing content search, then optionally
merge results later.

Product search should include:

- title
- slug
- excerpt
- description plain text
- searchable attributes
- SKU
- category names

Consider database indexes:

- slug unique
- status/published/category
- product title search
- attribute values for filterable attributes

## Acceptance criteria

- Published webshop root renders publicly.
- Category pages render nested categories and product lists.
- Product pages render product details and SEO metadata.
- Filters are generated from category attributes.
- Storefront presets can be saved and validated.
- Search returns active products only.
- Non-live or hidden products are not exposed publicly.
- Missing or invalid add-on license does not expose product data.
- Expired add-on license may expose existing catalog data read-only, but does
  not allow add-to-cart, checkout, payment, or new order creation.
- Free CMS build/typecheck passes without private storefront code.

## Tests to add or update

- Public route dispatches only for live webshop content.
- Category breadcrumb works for nested categories.
- Product canonical URL uses primary category if configured.
- Filters return expected products for select and numeric attributes.
- Hidden/draft products do not appear in search or category pages.
- `params` promise usage is covered by typecheck.
- Missing add-on state does not crash the public root or nested shop routes.
- Expired license renders catalog read-only and blocks cart/checkout entry
  points.

## Edge cases

- Product assigned to multiple categories should have one canonical URL.
- Category slug changes need redirect support or old URL handling.
- Product slug conflicts are scoped under `/shop/p/`.
- Empty categories should be allowed if admin wants landing pages.
- Filters with too many options need search/collapsed UI.
- Product price may be unavailable if all variants are inactive.
