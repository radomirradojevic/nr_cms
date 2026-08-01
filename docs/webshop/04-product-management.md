# Phase 04 - Private product management

## Prompt for this phase

Implement private Webshop product management for physical products, digital
products, and services. Reuse existing CMS editor patterns, AI SEO/description
generation, File Manager image selection, dashboard UI patterns, and role
checks through public bridge APIs. Do not build cart/checkout/payments yet.

## Goal

Build admin product CRUD under `/dashboard/webshop/products` with:

- Product list, filters, bulk actions, and status changes.
- Product creation/editing.
- Category drill-down selection.
- Category-derived attributes.
- Product description and SEO fields with AI assistance.
- Product images via the future webshop gallery flow.
- Product variants/SKUs, pricing, and inventory settings.
- Physical, digital, and service-specific fields.

## Private add-on boundary

Product management is core paid Webshop value and must live in
`.private/webshop`. Public CMS code may provide only:

- `/dashboard/webshop/products` route shells that delegate to the private
  add-on;
- add-on/license fallback screens;
- shared contracts for selecting files/galleries and using AI writing surfaces.

Do not put product CRUD, SKU, price, inventory, or product validation logic in
the public CMS repo. The free CMS must continue to build without the private
product modules.

## Existing files to inspect first

- `app/dashboard/content/content-form.tsx`
- `app/dashboard/content/_editors/blog-editor.tsx`
- `app/api/ai-writing-assistant/generate/route.ts`
- `app/api/ai-writing-assistant/suggest/route.ts`
- `app/dashboard/content/_editors/image-insert-dialog.tsx`
- `app/dashboard/filemanager/*`
- `app/dashboard/gallerymanager/*`
- `data/galleries.ts`
- `lib/content-status.ts`
- `lib/regional-settings.ts`
- `components/ui/*`

Private workspace files from earlier phases:

- `.private/webshop/src/data/webshop-products.ts`
- `.private/webshop/src/data/webshop-inventory.ts`
- `.private/webshop/src/admin/products/*`
- `.private/webshop/src/lib/webshop-money.ts`
- `.private/webshop/src/lib/webshop-permissions.ts`

## Product editor structure

Use a focused product form instead of forcing product data into `ContentForm`.
The product form should be exported by the private add-on and rendered through
the public Webshop dashboard bridge only when the add-on is installed and
licensed.

Recommended tabs or sections:

- Basics
  - title
  - slug
  - product type
  - status
  - excerpt
  - rich description
- Categories and attributes
  - primary category
  - additional categories
  - resolved inherited attributes
  - product attribute values
- Pricing
  - base price
  - compare-at price
  - currency
  - tax category
- Variants
  - variant option definitions
  - SKU table
  - per-variant price overrides
  - stock tracking
- Media
  - product gallery
  - cover image
  - alt text
- SEO
  - meta title
  - meta description
  - canonical URL override if needed
- Fulfillment
  - physical shipping fields
  - digital asset fields
  - service scheduling fields

## Product types

### Physical product

Fields:

- requires shipping
- weight
- dimensions
- shipping class
- inventory tracked
- stock policy
- low-stock threshold

Edge cases:

- out of stock
- backorder
- preorder
- multiple warehouses later
- COD eligibility

### Digital product

Fields:

- digital asset id
- download limit
- download expiry
- license key policy
- file version
- refund/download revocation policy

Edge cases:

- file must not be publicly downloadable
- entitlement only after paid order
- replacing a file should not break historical orders

### Service

Fields:

- duration
- delivery mode: online, phone, in person
- location or meeting instructions
- booking required flag
- capacity/slot policy
- cancellation policy

Edge cases:

- timezone
- rescheduling
- partial payment/deposit later
- sold-out service slots

## Category selection behavior

Implement a drill-down selector:

1. Show root categories.
2. Selecting a category loads child categories.
3. Continue until the admin chooses the intended category.
4. Allow selecting a parent category if it is valid for products.
5. Display breadcrumb path.
6. After category selection, resolve inherited attributes and render fields.

The product can have one primary category and optional additional categories.
The primary category drives canonical breadcrumbs and default filters.

## Attributes in product form

- Render typed controls based on attribute type.
- Required attributes must be validated server-side.
- Select options should store option ids, not labels.
- Numeric attributes should store numbers plus unit rules.
- Multi-select attributes should support multiple rows or option ids.
- Attribute values should be saved transactionally with the product.

Do not use attributes for purchasable SKU differences if they affect price or
inventory. Use variants for that.

## AI reuse

Extend AI writing assistant support with a new surface:

- `productEditor`

Allow generation for:

- product excerpt
- product meta title
- product meta description
- short product description if desired

Keep safeguards:

- same language as product title/content
- no invented claims like warranty, certification, shipping speed, or discount
  unless present in the input
- use configured provider/model settings from global settings
- run from private product actions/routes while using only public-safe AI bridge
  inputs from the CMS

## Product list

`/dashboard/webshop/products` should include:

- search
- status filter
- product type filter
- category filter
- stock filter
- updated sort
- price sort
- bulk archive
- quick status change
- product count by status

## Acceptance criteria

- Admin can create physical, digital, and service products.
- Category drill-down works for nested categories.
- Product form renders inherited category attributes.
- Required attributes validate server-side.
- Product variants can be created with SKU and price.
- Product list supports search, filters, pagination, and status badges.
- AI can generate SEO fields for products when enabled.
- Non-admin users are forbidden.
- Missing or invalid Webshop license blocks product actions and product routes.
- Expired Webshop license enters `edit_existing_only` mode: existing products,
  variants, prices, inventory settings, descriptions, and SEO fields can be
  edited, but new product/add variant/create SKU actions are disabled.
- Public CMS build/typecheck passes without private product management code.

## Tests to add or update

- Product create/update validation per product type.
- Required attribute validation.
- Variant SKU uniqueness.
- Price validation rejects floats and negative values.
- AI product generation route rejects non-backend users and disabled providers.
- Product list filters by category descendant.
- Product create/add actions reject when the add-on license state is not
  `ready`.
- Existing product update actions are allowed in expired-license
  `edit_existing_only` mode.

## Edge cases

- Changing category may remove attributes. Show a confirmation and preserve old
  values as orphaned until save, then remove or archive them intentionally.
- Variants with existing order items should not be hard deleted.
- Product slug changes need redirect planning in storefront phase.
- A product can be active only if required fields for its type are complete.
- Services may not need inventory but may need capacity. Keep capacity separate
  from physical stock.
