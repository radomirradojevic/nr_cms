# Phase 09 - Private promotions, wishlist, and related products

## Prompt for this phase

Implement private coupons/discounts, wishlist, related products, and advanced
product relationships. Keep the discount engine server-side and make it
compatible with cart, checkout, and order snapshots.

## Goal

Add commerce features users expect:

- Coupons.
- Discounts.
- Wishlist.
- Related products.
- Cross-sells/up-sells.
- Product bundles groundwork.
- Better variant and option UX if not completed earlier.

## Private add-on boundary

Promotions, discount calculation, wishlists, related products, and bundle
groundwork are paid Webshop features and belong in `.private/webshop`.

The public CMS may contain only route shells, fallback screens, and bridge
contracts. It must not contain coupon validation, discount amounts, wishlist
storage, relationship rules, or bundle pricing logic. Without a ready license,
create/add and public redemption flows must fail closed. Expired licenses may
allow editing existing coupons, wishlists, and product relationships in
`edit_existing_only` mode.

## Existing files to inspect first

- cart/checkout/order modules from earlier phases
- product modules from Phase 04
- `.private/webshop/src/data/webshop-coupons.ts`
- `.private/webshop/src/data/webshop-wishlists.ts`
- `.private/webshop/src/data/webshop-related-products.ts`
- `lib/roles.ts`
- `lib/rate-limit.ts`
- dashboard UI table/dialog patterns

## Coupons and discounts

Add:

- `webshop_coupons`
  - `id`
  - `webshop_id`
  - `code`
  - `name`
  - `status`
  - `discount_type`: `percent`, `fixed_amount`, `free_shipping`
  - `discount_value`
  - `currency nullable`
  - `starts_at`
  - `ends_at`
  - `usage_limit`
  - `usage_limit_per_customer`
  - `minimum_subtotal_minor`
  - `applies_to jsonb`
  - timestamps

- `webshop_coupon_redemptions`
  - `coupon_id`
  - `order_id`
  - `customer_user_id nullable`
  - `customer_email`
  - `discount_minor`
  - timestamp

Discount rules:

- Validate on cart display and checkout.
- Revalidate at order creation.
- Store discount snapshot on order and order items.
- Support product/category inclusion and exclusion.
- Support one coupon per cart initially; later add stacking rules.
- Reject expired, inactive, over-limit, wrong currency, or ineligible coupons.

Do not let the client submit discount amount.

## Wishlist

Add:

- `webshop_wishlists`
  - `id`
  - `webshop_id`
  - `customer_user_id`
  - `name`
  - timestamps

- `webshop_wishlist_items`
  - `wishlist_id`
  - `product_id`
  - `variant_id nullable`
  - timestamps

Recommended first release:

- Authenticated users only.
- One default wishlist per user.
- Add/remove from product cards and product pages.

Anonymous wishlist can be added later with signed cookies, but it is lower
priority than cart.

## Related products

Add:

- `webshop_related_products`
  - `webshop_id`
  - `product_id`
  - `related_product_id`
  - `relationship_type`: `related`, `upsell`, `cross_sell`, `replacement`,
    `accessory`
  - `position`

Rules:

- Prevent product relating to itself.
- Prevent duplicate relation rows.
- Decide whether relationships are one-way or mirrored. Default one-way gives
  admins more control.

## Product bundles groundwork

Do not build full bundle checkout unless requested, but leave room for:

- bundle products
- component products
- fixed bundle price
- dynamic bundle price
- inventory impact on components

If bundles are implemented later, they must expand to order item snapshots.

## Dashboard pages

Add:

- `/dashboard/webshop/promotions`
- `/dashboard/webshop/wishlists` optional admin read-only overview
- related product picker inside product editor

These pages should be private add-on renderers mounted through public Webshop
dashboard route shells.

Coupon list should include:

- search
- status
- code
- type/value
- active dates
- usage count
- actions

## Acceptance criteria

- Admin can create active coupon.
- Cart accepts valid coupon and rejects invalid one.
- Checkout revalidates coupon.
- Order stores discount snapshot.
- Logged-in customer can add/remove wishlist item.
- Product page can render related products.
- Product editor can manage related products.
- Missing or invalid license blocks promotion/wishlist/relationship routes and
  direct actions.
- Expired license allows editing existing promotions/wishlists/relationships but
  disables create/add and new coupon redemption flows.
- Free CMS build/typecheck passes without private promotion modules.

## Tests to add or update

- Expired coupon rejected.
- Coupon usage limit enforced.
- Coupon category inclusion works.
- Client-submitted discount amount is ignored.
- Wishlist requires authenticated customer.
- Related product self-reference rejected.
- Coupon/wishlist/related-product create/add actions reject when add-on license
  state is not `ready`.
- Existing coupon/wishlist/related-product update actions are allowed in
  expired-license `edit_existing_only` mode.

## Edge cases

- Coupon valid in cart but expires before order placement.
- Product removed from coupon eligibility after cart applied it.
- Refund with coupon should calculate refundable amount from order snapshots.
- Wishlist item for archived product should remain but be hidden/marked
  unavailable.
- Related product that becomes hidden should not render publicly.
