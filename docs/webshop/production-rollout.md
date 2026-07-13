# WebShop Production Rollout

> **ZASTAREO — NE IZVRŠAVATI KAO PRODUCTION RUNBOOK.** Ovaj dokument sadrži legacy module/env i launch korake koji ne odgovaraju as-built remediation toku. Autoritativni no-go status je u [finalnom izveštaju](../addons/11-final-verification-report.md), a budući gate-by-gate redosled u [kontrolisanom rollout planu](../addons/12-controlled-production-rollout-plan.md). Addon se bira isključivo build-time registry-jem, ne `WEBSHOP_ADDON_MODULE` promenljivom.

Use this checklist before enabling the paid WebShop add-on for a customer.

## Required Gates

- `WEBSHOP_ENABLED=true`
- `WEBSHOP_ADDON_MODULE=@nr-cms/webshop`
- `WEBSHOP_INSTALL_MODE=managed_redeploy`
- `WEBSHOP_LICENSE_API_URL` points to the managed license service
- `WEBSHOP_PACKAGE_TOKEN` is short-lived and rotated after install
- Deployment platform attestation verifies as Vercel production OIDC
- `WEBSHOP_STOREFRONT_ENABLED=false` until launch approval
- `WEBSHOP_CHECKOUT_ENABLED=false` until payment provider smoke tests pass
- `WEBSHOP_PAYMENTS_MODE=test` until webhooks, refunds, and fulfillment pass

Self-hosted and env-only Vercel claims must stay blocked for paid add-on
activation. Local development may load the private module directly, but local
activation must not mint production entitlements.

## Preflight Checks

Run from the root CMS:

```bash
npm run typecheck
npm run lint
npm run test
npm run db:migrate:check
npm run build
```

Run from `.private/webshop`:

```bash
npm run typecheck
npm run test
npm run build:check
```

## Security Smoke

- Open `/dashboard/webshop` as a non-admin and confirm redirect/forbidden.
- Open `/dashboard/webshop/settings`, `/dashboard/webshop/storefront`, and
  payment routes with section locks enabled.
- Confirm public CMS pages still render when `WEBSHOP_ADDON_MODULE` is unset.
- Confirm webshop public routes 404 when `WEBSHOP_STOREFRONT_ENABLED=false`.
- Confirm cart remains visible but checkout/coupon actions stop when
  `WEBSHOP_CHECKOUT_ENABLED=false`.
- Confirm coupon, cart, checkout, and download-token attempts hit rate limits.
- Confirm digital downloads return `Cache-Control: private, no-store` and never
  redirect to public object URLs.
- Confirm webhook failures create `webshop_audit_events` entries.
- Confirm order fulfillment, cancel, refund, product price, and inventory
  changes create audit entries.

## Launch

1. Switch payment provider credentials to live.
2. Set `WEBSHOP_PAYMENTS_MODE=live`.
3. Set `WEBSHOP_CHECKOUT_ENABLED=true`.
4. Set `WEBSHOP_STOREFRONT_ENABLED=true`.
5. Trigger a managed redeploy through `WEBSHOP_REDEPLOY_WEBHOOK_URL`.
6. Place a low-value live order, refund it, and verify inventory, entitlement,
   webhook, email, and audit records.
