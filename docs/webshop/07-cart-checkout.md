# Phase 07 - Private cart and checkout

## Prompt for this phase

Implement private Add to Cart, Cart, Checkout, and Order Confirmation
scaffolding. Do not integrate real payment providers yet, except for
cash-on-delivery style placeholder flow if desired. All totals must be
calculated server-side.

## Goal

Build the shopping flow:

`Add to Cart -> Cart -> Checkout -> Payment step placeholder -> Order
Confirmation`

Support:

- Anonymous carts.
- Logged-in customer carts.
- Cart merge after sign-in.
- Physical, digital, and service products.
- Server-side totals.
- Coupon validation placeholder.
- Shipping/tax placeholders.
- Checkout session persistence.

## Private add-on boundary

Cart and checkout are paid Webshop functionality and must live in
`.private/webshop`. The public CMS may contain only storefront route shells that
delegate `/shop/cart`, `/shop/checkout`, and `/shop/order/...` to the private
add-on when installed and licensed.

Do not store cart tokens, checkout sessions, totals, shipping logic, tax logic,
inventory reservations, or order-confirmation logic in public CMS modules.
Without a ready add-on license, cart and checkout routes must return a locked
state or `404` without crashing.

When the license is expired, public cart mutation, checkout start, payment start,
and new order creation must be disabled. Existing cart/checkout/order records
may remain visible to admins through `edit_existing_only` dashboard views where
needed for support and renewal.

## Existing files to inspect first

- `app/[slug]/page.tsx`
- current public layout components
- `lib/session-security.ts`
- `lib/rate-limit.ts`
- `lib/turnstile.ts`
- `lib/regional-settings.ts`
- `lib/email.ts`
- `data/content.ts`
- `.private/webshop/src/data/webshop-products.ts` from earlier phase
- `.private/webshop/src/data/webshop-carts.ts`
- `.private/webshop/src/lib/webshop-license.ts`

## Cart model

Add or finalize:

- `webshop_carts`
  - `id`
  - `webshop_id`
  - `customer_user_id nullable`
  - `anonymous_token_hash nullable`
  - `currency`
  - `status`: `active`, `converted`, `abandoned`, `expired`
  - timestamps

- `webshop_cart_items`
  - `id`
  - `cart_id`
  - `product_id`
  - `variant_id`
  - `quantity`
  - `unit_price_minor_snapshot`
  - `currency_snapshot`
  - `metadata jsonb`
  - timestamps

Anonymous cart token:

- Store only a random token hash in database.
- Store token in an httpOnly, secure, sameSite cookie.
- Rotate or expire old carts.

## Cart rules

- Product and variant status must be active.
- Quantity must be positive and capped.
- Server recalculates price every time cart is displayed or checkout begins.
- If price changed, show a cart warning and update totals.
- If product became unavailable, keep line but mark unavailable and block
  checkout.
- For digital products, usually quantity should be 1 unless license quantity is
  modeled as a variant option.
- For services, quantity may be 1 or capacity-based depending on product
  settings.

## Checkout session

Add:

- `webshop_checkout_sessions`
  - `id`
  - `webshop_id`
  - `cart_id`
  - `customer_user_id nullable`
  - `email`
  - `billing_address jsonb`
  - `shipping_address jsonb`
  - `shipping_method_id nullable`
  - `coupon_ids jsonb`
  - `subtotal_minor`
  - `discount_minor`
  - `tax_minor`
  - `shipping_minor`
  - `total_minor`
  - `currency`
  - `status`: `open`, `pending_payment`, `completed`, `expired`, `canceled`
  - timestamps

Totals must be snapshots of a server-side calculation, not client input.

## Checkout UI

Pages under the webshop root:

- `/shop/cart`
- `/shop/checkout`
- `/shop/order/<confirmation-token>`

These pages should be rendered by the private storefront route handler through
the public add-on bridge. Public CMS route files should not contain checkout
business logic.

Checkout steps:

1. Contact
2. Delivery/fulfillment
3. Payment method
4. Review
5. Confirmation

Delivery logic:

- If cart has physical items, require shipping address and shipping method.
- If cart has only digital items, require email and billing country if needed.
- If cart has services, require service-specific fields.
- If cart mixes types, collect the union of required fields.

## Inventory reservation

At checkout start or payment start:

- Reserve stock for tracked variants in a transaction.
- Set reservation expiry.
- Release reservation when checkout expires or payment fails.
- Convert reservation to sold after successful order/payment.

For cash on delivery:

- Decide whether COD reserves stock immediately at order placement.
- Default recommendation: reserve/decrement stock on COD order confirmation,
  because the merchant must fulfill it.

## Acceptance criteria

- Visitor can add active product variant to cart.
- Cart persists for anonymous visitor.
- Cart merges after sign-in without duplicate incompatible lines.
- Cart blocks checkout if product/variant is unavailable.
- Checkout collects required fields based on product types.
- Checkout session stores server-calculated totals.
- Order confirmation placeholder can render after a successful non-payment or
  COD-style flow.
- Missing, invalid, or expired license blocks cart mutation, checkout, payment
  start, and new order creation.
- Free CMS build/typecheck passes without private cart/checkout code.

## Tests to add or update

- Add to cart rejects inactive product/variant.
- Cart token is hashed in database.
- Server recalculates changed price.
- Mixed cart requires shipping for physical item.
- Digital-only cart does not require shipping.
- Inventory reservation prevents oversell in concurrent checkout attempts.
- Cart and checkout routes do not crash when the add-on is absent.
- Expired license blocks new checkout while preserving existing records for
  admin support/edit-only workflows.

## Edge cases

- Same product variant added twice should merge quantities.
- Coupon entered in cart may become invalid before checkout.
- Customer changes country, tax/shipping recalculates.
- Anonymous cart token theft risk is reduced by httpOnly/sameSite cookie and
  short expiry.
- Checkout session expiry should release reservations.
- Do not create final order until payment/COD confirmation path is reached.
