# Phase 6 - Hardening, Observability, and Release

## Goal

Turn the integrated webshop/license-server system from an MVP into an
operationally reliable paid addon platform.

This phase focuses on security controls, monitoring, failure recovery,
documentation, and release readiness.

## Security Hardening

Required controls:

- HTTPS-only production deployment
- HSTS on license server
- rate limits on issue/validate/activate/login/invite endpoints
- request body size limits
- safe JSON parsing
- no raw secrets in logs
- no raw package token persistence
- API client secret rotation
- admin password reset/recovery flow
- account lockout or progressive delay for repeated login failures
- CSRF protection for admin mutations
- secure cookies
- session revocation
- audit log retention

JWT/JWS, if used:

- fixed allowlist of algorithms
- reject `none`
- validate issuer, audience, expiration, key id
- separate validation rules for different token types

## Observability

Webshop metrics/events:

- license server issue created
- issue success/failure
- issue retry count
- issue latency
- digital delivery email skipped because license pending
- activation success/failure

License server metrics/events:

- API issue request count
- API validate request count
- auth failure count
- replay rejection count
- rate limit count
- license issued count
- license validation valid/invalid/expired/domain mismatch
- admin login success/failure

Audit logs:

- who changed license server config in Webshop
- who retried issuance
- who created/rotated API clients
- who revoked licenses

## Background Jobs

Add jobs or cron endpoints for:

- retry pending/failed license issues
- mark expired licenses/addon entitlements
- cleanup expired nonces/idempotency records
- cleanup expired sessions/invites/password reset tokens
- health-check configured license servers

## UI Hardening

Webshop:

- License server settings show health and last error safely.
- Product edit warns when selected server is hidden/inactive.
- Order digital access clearly separates:
  - pending
  - issued
  - failed
  - revoked
  - expired

License server:

- tables have search/filter/pagination
- secret values are copy-once
- destructive actions require confirmation
- user management shows status and last login

## Documentation

Add docs for:

- installing Webshop addon
- activating Webshop license
- creating license server API client
- configuring Webshop license servers
- creating product types/SKUs on License Server
- handling failed issuance
- rotating secrets
- moving license to a new domain
- incident response for leaked API secret

## Release Checklist

Before release:

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- migration dry run/check
- test activation on local self-hosted
- test activation on production-like Vercel if supported
- test payment webhook duplicate delivery
- test failed license server response
- test retry
- test license expiry
- test domain mismatch

## Acceptance Criteria

- System fails closed for invalid activation/validation.
- Payment webhooks remain idempotent.
- License issuance failures are recoverable without manual DB edits.
- Admin can rotate Webshop-to-License-Server API secrets.
- Operators have enough audit trail to diagnose who did what and when.
- Docs cover normal install, renewal, failed issuance, and secret rotation.

## Risks

- Operational complexity increases once paid licenses control package access.
  Keep support tools simple and explicit.
- Background jobs must be idempotent because hosted cron systems may retry.
- Monitoring should not leak customer domains/license keys in third-party logs.

