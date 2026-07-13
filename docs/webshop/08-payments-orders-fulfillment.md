# Phase 08 - Private payments, orders, and fulfillment

## Prompt for this phase

Implement private payment provider adapters, webhook handling, order creation,
order management, fulfillment, refunds, and digital entitlements. Support cash
on delivery first, then Stripe/PayPal/wallet/bank gateway adapters behind a
common interface.

## Goal

Add production-safe payment and order flow:

- Cash on delivery.
- Stripe.
- PayPal.
- Google Pay and Apple Pay through a supported provider path.
- Extension point for bank gateways such as Intesa.
- Signed/idempotent webhooks.
- Order snapshots.
- Physical fulfillment.
- Digital entitlement creation.
- Service fulfillment states.
- Refund/cancel flows.

## Private add-on boundary

Payments, orders, fulfillment, refunds, webhooks, provider adapters, provider
secrets, and digital entitlements are high-value/high-risk paid Webshop
functionality. They must live in `.private/webshop` and must not be implemented
in public CMS modules.

The public CMS may contain only:

- optional API route shells under `/api/webshop/...` that delegate to the
  private add-on;
- locked/fallback responses when the add-on is missing or unlicensed;
- generic admin menu/dashboard links;
- public-safe bridge contracts.

Payment provider secrets must never be exposed to client bundles and should not
be stored as plain database values. License checks must happen before payment
settings, order dashboards, refund actions, or webhook retry tooling are
available.

Expired license mode should not create new payment/order activity. It may allow
admins to view and edit existing orders, fulfillment notes/statuses, and safe
historical records in `edit_existing_only` mode. New checkout payment sessions,
new COD orders, payment provider setup changes, and new entitlement creation
require a ready license.

## Existing files to inspect first

- checkout files from Phase 07
- `lib/email.ts`
- `lib/rate-limit.ts`
- `lib/session-security.ts`
- `.private/webshop/src/data/webshop-products.ts`
- `.private/webshop/src/data/webshop-inventory.ts`
- `.private/webshop/src/data/webshop-orders.ts`
- `.private/webshop/src/lib/webshop-payments/*`
- `.private/webshop/src/server/webhooks/*`
- existing route handlers under `app/api/*`
- existing Server Action style in `app/dashboard/*/actions.ts`

## Payment provider architecture

Create in the private add-on:

- `.private/webshop/src/lib/webshop-payments/types.ts`
- `.private/webshop/src/lib/webshop-payments/providers/cod.ts`
- `.private/webshop/src/lib/webshop-payments/providers/stripe.ts`
- `.private/webshop/src/lib/webshop-payments/providers/paypal.ts`
- `.private/webshop/src/lib/webshop-payments/providers/bank-redirect.ts`

Suggested interface:

```ts
export type PaymentProviderKey =
  | "cash_on_delivery"
  | "stripe"
  | "paypal"
  | "bank_redirect";

export type CreatePaymentInput = {
  checkoutSessionId: string;
  orderId: string;
  amountMinor: number;
  currency: string;
  customerEmail: string;
  returnUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
};

export type CreatePaymentResult =
  | { type: "redirect"; redirectUrl: string; providerReference: string }
  | { type: "client_secret"; clientSecret: string; providerReference: string }
  | { type: "offline"; providerReference: string };

export type PaymentProvider = {
  key: PaymentProviderKey;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyWebhook?(request: Request): Promise<VerifiedPaymentEvent>;
  capture?(paymentId: string): Promise<void>;
  refund?(input: RefundInput): Promise<RefundResult>;
  cancel?(paymentId: string): Promise<void>;
};
```

Do not expose provider secrets to the browser.

## Provider configuration

Dashboard settings should store:

- enabled/disabled payment methods
- display labels
- COD instructions
- public keys/client ids if safe
- provider mode: test/live
- allowed countries/currencies

Secrets:

- Prefer environment variables.
- If database storage is unavoidable, add encryption before storing secrets.
- Do not follow the AI key pattern for payment secrets without encryption.

## Orders schema

Add:

- `webshop_orders`
  - `id`
  - `webshop_id`
  - `order_number`
  - `checkout_session_id`
  - `customer_user_id nullable`
  - `customer_email`
  - `status`: `pending_payment`, `confirmed`, `processing`, `fulfilled`,
    `completed`, `canceled`, `refunded`
  - `payment_status`: `unpaid`, `pending`, `authorized`, `paid`,
    `partially_refunded`, `refunded`, `failed`
  - `fulfillment_status`: `unfulfilled`, `partial`, `fulfilled`, `not_required`
  - totals in minor units
  - currency
  - timestamps

- `webshop_order_items`
  - product/variant ids nullable for historical integrity
  - title snapshot
  - sku snapshot
  - quantity
  - unit price snapshot
  - tax/discount snapshot
  - product type snapshot
  - fulfillment data snapshot

- `webshop_order_addresses`
  - billing/shipping snapshots

- `webshop_payments`
  - provider key
  - provider reference
  - amount/currency
  - status
  - raw safe metadata jsonb

- `webshop_payment_events`
  - provider key
  - provider event id
  - event type
  - signature verification status
  - processed_at
  - unique `(provider_key, provider_event_id)`

- `webshop_fulfillments`
- `webshop_refunds`

## Payment flow

1. Checkout review creates a pending order and payment record in a transaction.
2. Provider creates payment session/intent/order using server-calculated totals.
3. Customer pays or chooses COD.
4. Webhook or COD confirmation moves order state forward.
5. Inventory reservation becomes sold.
6. Digital entitlements are created only after paid status, except COD physical
   orders which do not grant digital downloads.
7. Confirmation page reads order by secure token or authenticated customer.

## Webhook rules

- Verify provider signature before parsing/trusting event.
- Store provider event id before processing or inside same transaction.
- Processing must be idempotent.
- Ignore duplicate events.
- Never trust amount/currency blindly. Match provider amount to local payment.
- Handle out-of-order events.
- Log failures and expose admin retry.

## Payment methods

### Cash on delivery

- No external provider.
- Allowed only for shippable physical products unless admin enables otherwise.
- Order becomes `confirmed` with payment status `pending`.
- Inventory is reserved/sold at confirmation depending policy.

### Stripe

- Prefer Checkout Sessions or PaymentIntents with Payment Element.
- Use webhooks for final confirmation.
- Use idempotency keys.
- Wallets like Apple Pay/Google Pay can be enabled through Stripe if account and
  domain requirements are met.

### PayPal

- Use Orders API.
- Capture on server.
- Verify webhooks.
- Map PayPal order/capture ids to local payment records.

### Google Pay and Apple Pay

- First production version should enable these through Stripe or another
  gateway that already supports wallet token handling.
- If implementing direct wallet flows later, keep tokenization and merchant
  validation in a dedicated adapter.

### Bank gateways

Bank redirect gateways usually need:

- merchant id
- amount/currency
- order reference
- success/fail URLs
- request signature
- response/webhook signature verification
- test/live endpoint switch

Build `bank_redirect` as a generic adapter with gateway-specific config modules.

## Order dashboard

Add `/dashboard/webshop/orders`:

- list with filters by status, payment status, fulfillment status, date, search
- order detail
- customer/contact info
- order item snapshots
- payment timeline
- fulfillment controls
- refund/cancel controls
- internal notes

The public route may be a shell, but the order list/detail components, actions,
and queries belong in the private add-on.

## Acceptance criteria

- COD order can be placed end to end.
- Stripe/PayPal adapter interfaces exist even if one provider is implemented
  first.
- Webhook route verifies signatures and stores event ids.
- Duplicate webhook event does not duplicate order transitions.
- Paid digital order creates download entitlement.
- Physical order can be marked fulfilled.
- Refund/cancel updates order/payment/inventory consistently.
- Expired license blocks new order/payment creation but keeps existing order
  history and safe edit/support workflows available.

## Tests to add or update

- COD order flow.
- Provider idempotency key creation.
- Webhook duplicate event handling.
- Webhook amount mismatch is rejected.
- Paid event creates digital entitlement once.
- Inventory reservation converts to sold once.
- Refund updates payment status.

## Edge cases

- Payment succeeds after local checkout expired.
- Customer closes browser after payment; webhook must still complete order.
- Webhook arrives before redirect return.
- Provider retries webhook many times.
- Partial refunds.
- Chargebacks/disputes.
- COD order canceled before shipment releases stock.
- Digital entitlement should be revoked after full refund if policy says so.
- Missing or invalid license must block order/payment dashboard access and
  direct action/API calls.
- Expired license must block new payment/order/entitlement creation while
  allowing safe edits to existing order records according to
  `edit_existing_only` policy.
- Free CMS build/typecheck must pass without private payment/order code.
