# Data Model And Engine

## Current Tables

The CMS already has these client add-on tables:

- `license_server_addon_entitlements`
- `license_server_api_clients`
- `license_server_api_client_nonces`
- `license_server_product_types`
- `license_server_product_type_skus`
- `license_server_licenses`
- `license_server_validation_events`

These are enough for an MVP but not enough for a production licensing product.

## Required New Tables

### `license_server_license_activations`

Tracks domain/device/app activations for each license.

Recommended columns:

- `id uuid primary key`
- `license_id uuid not null`
- `api_client_id uuid`
- `activation_type text not null`
- `activation_fingerprint_hash text not null`
- `activation_label text`
- `domain text`
- `device_id_hash text`
- `machine_fingerprint_hash text`
- `app_id text`
- `app_version text`
- `platform text`
- `activation_token_hash text not null`
- `status text not null default 'active'`
- `first_seen_at timestamp with time zone not null`
- `last_seen_at timestamp with time zone not null`
- `expires_at timestamp with time zone`
- `deactivated_at timestamp with time zone`
- `revoked_at timestamp with time zone`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamp with time zone not null default now()`
- `updated_at timestamp with time zone not null default now()`

Statuses:

- `active`
- `deactivated`
- `revoked`
- `expired`

Activation types:

- `domain`
- `device`
- `server`
- `seat`

Unique:

- `license_id + activation_fingerprint_hash`

Indexes:

- `license_id, status`
- `activation_token_hash`
- `domain`
- `device_id_hash`
- `last_seen_at`

### `license_server_audit_events`

Tracks admin and API state changes.

Recommended columns:

- `id uuid primary key`
- `actor_user_id text`
- `api_client_id uuid`
- `license_id uuid`
- `activation_id uuid`
- `action text not null`
- `entity_type text not null`
- `entity_id text`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamp with time zone not null default now()`

Examples:

- `license.issued`
- `license.activated`
- `license.validated`
- `license.suspended`
- `license.revoked`
- `license.reactivated`
- `activation.revoked`
- `api_client.created`
- `api_client.rotated`

### `license_server_rate_limit_events`

Optional but recommended for production if in-memory rate limits are not enough.

Recommended columns:

- `id uuid primary key`
- `scope text not null`
- `key_hash text not null`
- `window_start timestamp with time zone not null`
- `count integer not null`
- `created_at timestamp with time zone not null default now()`
- `updated_at timestamp with time zone not null default now()`

Unique:

- `scope + key_hash + window_start`

## Required Table Extensions

### `license_server_product_types`

Add:

- `public_key text`
- `metadata jsonb not null default '{}'::jsonb`

`public_key` is optional for signed runtime responses and offline verification.

### `license_server_product_type_skus`

Add a policy object or explicit columns.

Recommended explicit columns:

- `license_type text not null default 'perpetual'`
- `policy_template text not null default 'perpetual_single_device'`
- `max_devices integer`
- `max_domains integer`
- `max_seats integer`
- `activation_reset_limit integer`
- `activation_reset_window_days integer`
- `validation_interval_seconds integer`
- `offline_grace_seconds integer`
- `features jsonb not null default '[]'::jsonb`
- `policy jsonb not null default '{}'::jsonb`

License types:

- `perpetual`
- `subscription`
- `trial`
- `maintenance`

Policy templates:

- `perpetual_single_device`
- `perpetual_multi_device`
- `domain_license`
- `subscription_device`
- `subscription_domain`
- `trial`
- `seat_based`
- `floating_seat`
- `file_license`
- `maintenance`

The template sets defaults only. The SKU row remains the source of truth after
the admin customizes limits.

### `license_server_licenses`

Add:

- `customer_email text`
- `customer_name text`
- `source text`
- `source_order_ref text`
- `source_order_item_ref text`
- `license_type text not null default 'perpetual'`
- `max_devices integer`
- `max_domains integer`
- `max_seats integer`
- `features jsonb not null default '[]'::jsonb`
- `suspended_at timestamp with time zone`
- `suspended_reason text`
- `revoked_reason text`
- `grace_ends_at timestamp with time zone`
- `last_validated_at timestamp with time zone`
- `encrypted_license_key text`

Statuses:

- `active`
- `suspended`
- `revoked`
- `expired`
- `refunded`
- `chargeback`

## License Key Generation

The current MVP derives license keys from:

- API client id;
- idempotency key;
- SKU namespace.

This works for MVP idempotency, but production should use one of these safer
patterns.

Preferred:

1. Generate random license key using CSPRNG.
2. Store `license_key_hash` for lookup.
3. Store `encrypted_license_key` only if idempotent replay or admin re-display
   is required.
4. Encrypt with `LICENSE_SERVER_SECRET_KEY`.

Alternative:

1. Derive deterministic keys with an HMAC.
2. Include a server-only secret not stored in the same row as public policy.
3. Keep per-SKU namespace as an additional input.

Do not rely on human-entered salts.

## Activation Fingerprint Rules

For domains:

- canonicalize to hostname;
- lowercase;
- strip protocol, path, port unless policy requires port;
- optionally support wildcard policy explicitly.

For devices:

- client sends a stable device fingerprint;
- server stores only a hash;
- hash should include a server-side salt or secret;
- do not store raw hardware identifiers if avoidable.

For seats:

- use user email or account id hash;
- keep seat label separately for admin readability.

## Standard License Generation Modes

The client License Server add-on should generate a license from a SKU policy
snapshot, not from one hard-coded behavior.

### Device-bound license

Use for desktop apps.

- license can activate on up to `max_devices`;
- each activation stores hashed device fingerprint;
- validation requires matching activation token and fingerprint;
- admin can revoke or reset one device activation.

### Domain-bound license

Use for websites, plugins, and self-hosted software.

- license can bind to up to `max_domains`;
- canonical domain is stored;
- validation checks current domain;
- wildcard domains must be explicit and admin-controlled.

### Seat-based license

Use for business software or team products.

- license can activate up to `max_seats`;
- seat identity is email/account hash;
- admin can remove or reassign seats;
- optional seat labels help customer support.

### Subscription license

Use for renewable software access.

- `expires_at` controls validity;
- renewal extends expiry;
- validation returns next validation interval and expiry;
- expired license returns `expired` unless grace is configured.

### Trial license

Use for limited evaluation.

- short duration;
- usually lower activation limits;
- optional conversion metadata links trial to paid license.

### File plus license

Use for Webshop products that deliver a file and a license key.

- Webshop creates download entitlement;
- License Server add-on issues key;
- customer gets both download access and runtime license key;
- refund revokes both download entitlement and license.

### Maintenance license

Use when software use is perpetual but updates/support expire.

- validation may return `valid: true`;
- response includes `maintenanceExpiresAt`;
- protected app decides whether updates are allowed.

## Validation Rules

A validation is valid only when:

- license exists;
- license status is `active`;
- current time is before `expires_at`, unless in configured grace period;
- activation exists or can be created within policy;
- activation status is `active`;
- domain/device/seat matches policy;
- product/SKU is still valid according to policy;
- API client or runtime channel is allowed for the product.

Validation should return a machine-readable reason when invalid.

Recommended reasons:

- `not_found`
- `expired`
- `suspended`
- `revoked`
- `refunded`
- `chargeback`
- `domain_mismatch`
- `device_mismatch`
- `activation_limit_reached`
- `seat_limit_reached`
- `activation_revoked`
- `product_inactive`
- `sku_inactive`
- `rate_limited`
