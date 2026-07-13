# Release Runbook

> **ZASTAREO — NE IZVRŠAVATI KAO PRODUCTION RUNBOOK.** Ovaj dokument navodi legacy migration/secret/module ugovore. Autoritativni no-go status je u [finalnom izveštaju](../addons/11-final-verification-report.md), a budući gate-by-gate redosled u [kontrolisanom rollout planu](../addons/12-controlled-production-rollout-plan.md). Trenutni vendor signing koristi versioned Ed25519 `kid`/public-key set, a addon se bira build-time registry-jem.

This runbook is for releasing the embedded client License Server add-on as a
paid product.

## Required Environment

Root CMS:

- `LICENSE_SERVER_ENABLED=true`
- `LICENSE_SERVER_LICENSE_API_URL=https://licenses.nrcms.com`
- `LICENSE_SERVER_ADDON_MODULE=@nr-cms/license-server-addon`
- `LICENSE_SERVER_SECRET_KEY=<32-byte base64url/base64/hex key>`
- `LICENSE_SERVER_RUNTIME_HASH_SECRET=<stable secret>`
- `IP_HASH_SALT=<stable secret>`
- `LICENSE_SERVER_ENTITLEMENT_CRON_SECRET=<cron bearer token>`

Master license server:

- `NRLS_ENTITLEMENT_SIGNING_SECRET=<stable signing secret>`
- `NRLS_SECRET_ENCRYPTION_KEY=<stable encryption fallback>`

Keep `LICENSE_SERVER_SECRET_KEY`, `LICENSE_SERVER_RUNTIME_HASH_SECRET`, and
`NRLS_ENTITLEMENT_SIGNING_SECRET` outside source control. Losing
`LICENSE_SERVER_SECRET_KEY` prevents decrypting stored API client secrets.

## Migration Check

Before deploy:

```powershell
npm run db:migrate:check
npm run typecheck
npm run lint
npm run test
```

Production deploy must include these root CMS migrations:

- `0076_license_server_addon.sql`
- `0077_license_server_addon_phase3.sql`
- `0078_webshop_license_server_catalog.sql`

After deploy:

```powershell
npm run db:migrate
```

Confirm that these tables exist:

- `license_server_addon_entitlements`
- `license_server_api_clients`
- `license_server_api_client_nonces`
- `license_server_product_types`
- `license_server_product_type_skus`
- `license_server_licenses`
- `license_server_license_activations`
- `license_server_validation_events`
- `license_server_audit_events`
- `webshop_license_servers`
- `webshop_license_server_catalog_items`
- `webshop_license_server_issues`

## Backup Notes

Back up the CMS database before enabling the add-on in production.

The backup must include:

- all `license_server_*` tables;
- `license_server_addon_entitlements`;
- Webshop tables that reference license server delivery state;
- `webshop_license_servers`;
- `webshop_license_server_catalog_items`;
- `webshop_license_server_issues`;
- application environment secrets.

Do not export plaintext HMAC secrets as a routine report. API client secrets are
shown once during creation or rotation and are otherwise stored encrypted.

## Restore Notes

Restore order:

1. Restore environment secrets.
2. Restore database backup.
3. Run migrations.
4. Start CMS.
5. Open `/dashboard/license-server`.
6. Run entitlement revalidation through the cron endpoint or wait for the next
   admin-open stale check.
7. Validate one existing license from a sample runtime client.
8. Issue one manual test license from admin if entitlement is `ready`.

If `LICENSE_SERVER_SECRET_KEY` changes during restore, existing API client
secrets cannot be decrypted. Rotate affected API clients and update integrated
Webshops or backend services.

## Production Rollout Checklist

- Buy License Server add-on through the author's Webshop.
- Activate the add-on in the target CMS.
- Confirm `/dashboard/license-server` shows `Licensed`.
- Create one API client and store the secret in the Webshop or external backend.
- Create at least one product type and SKU.
- Sync Webshop catalog from the embedded License Server.
- Configure a Webshop digital product with the synced product type and SKU.
- Complete one paid order.
- Confirm the order receives exactly one license key.
- Activate the issued license from a runtime sample.
- Validate the activation.
- Revoke the license in admin.
- Validate again and confirm the runtime client receives an invalid reason.
- Rotate the API client secret and update the caller.
- Confirm old caller authentication fails and new caller authentication works.
- Confirm entitlement cron is scheduled daily.
- Confirm failed issue retry works from Webshop admin.
- Confirm logs do not contain raw HMAC secrets, activation tokens, or full
  license keys outside deliberate customer delivery events.

## Release Blockers

- Master entitlement revalidation endpoint unavailable.
- Root CMS migrations pending.
- API client secrets cannot be encrypted.
- Runtime validation succeeds for revoked/refunded/chargeback licenses.
- Expired add-on entitlement still allows new issue requests.
- Webshop issue retries can create duplicate licenses.
- Production rate limiting is not configured outside in-memory development mode.
