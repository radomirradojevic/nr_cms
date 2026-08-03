# Prompt 08 — worker DB isolation receipt

Date: 2026-08-03  
Scope: local test PostgreSQL only; no CMS, worker, package or service data was changed.

## Observed preflight

The dedicated role `nr_addon_deployment_worker_test` could connect to its own
`nr_addon_deployment_worker_test` database and could not connect to
`nr_cms_vendor_test` or `nr_cms_client_test`. It could connect to
`nr_license_server_test` only because PostgreSQL's default `PUBLIC CONNECT`
grant was still present there.

The configured license-server database principal is `postgres`, which is also
the database owner and therefore retains `CONNECT` independently of `PUBLIC`.

## Applied least-privilege correction

Executed by the authorized local operator with the PostgreSQL administrator:

```sql
REVOKE CONNECT ON DATABASE nr_license_server_test FROM PUBLIC;
```

Postcondition (boolean privilege checks):

| Principal | `nr_addon_deployment_worker_test` | `nr_license_server_test` |
|---|---:|---:|
| `nr_addon_deployment_worker_test` | `CONNECT=true` | `CONNECT=false` |
| `postgres` owner | n/a | `CONNECT=true` |

This is an operator ACL correction, not an application-schema migration. It
must be included in the local database-provisioning ledger before a clean-room
rebuild. It does not give the worker role rights to any CMS or master data.

## Rollback

Only if a separately authorized non-owner master service principal has not been
given an explicit `CONNECT` grant and must temporarily rely on PostgreSQL's
default behavior:

```sql
GRANT CONNECT ON DATABASE nr_license_server_test TO PUBLIC;
```

Prefer the narrower alternative instead: grant `CONNECT` only to the verified
master runtime/migrator role, then keep `PUBLIC` revoked.
