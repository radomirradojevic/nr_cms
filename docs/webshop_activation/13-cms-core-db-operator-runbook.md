# CMS core DB ownership: operator runbook

This runbook applies only to the two local target databases. It is deliberately
separate from CMS startup: the CMS runtime never provisions roles, unwraps the
migrator secret, or applies migrations.

## Fixed target contract

| Target | Database             | Owner                                  | Migrator                      | Runtime                 |
| ------ | -------------------- | -------------------------------------- | ----------------------------- | ----------------------- |
| vendor | `nr_cms_vendor_test` | `nr_cms_vendor_core_owner` (`NOLOGIN`) | `nr_cms_vendor_core_migrator` | `nr_cms_vendor_runtime` |
| client | `nr_cms_client_test` | `nr_cms_client_core_owner` (`NOLOGIN`) | `nr_cms_client_core_migrator` | `nr_cms_client_runtime` |

The checked-in source of truth is
`contracts/cms-core-privilege-manifest-v1.json`. Do not alter names, host,
port, database resource IDs, or the DPAPI reference from a shell argument.

## Before any mutation

1. Open an elevated Windows PowerShell as an Administrator.
2. Confirm `nr_cms_vendor_test` and `nr_cms_client_test` are the intended,
   empty target databases. Do not run these commands against a development,
   production, central-license-server, worker, or cloned target database.
3. Create three distinct one-line password files outside `D:\nr_cms`: an
   administrator PostgreSQL password, a target migrator password, and a target
   runtime password. Use a password manager to generate their contents.
4. Disable inheritance on each file and allow only the operator,
   `SYSTEM`, and `Administrators` to read it. The CLI rejects a symlink,
   reparse point, inherited ACL, an input inside the source checkout, or a
   multi-line input. Passwords must never be supplied as CLI arguments,
   environment variables, SQL literals, or pasted into logs.
5. Take a target-specific backup before migration. A vendor backup is never a
   client restore input and vice versa.

The following preflight performs only file/manifest checks; it does not connect
to PostgreSQL or mutate a role/database:

```powershell
npm run db:core:provision -- --target vendor --admin-password-file <ABSOLUTE_PROTECTED_FILE> --migrator-password-file <ABSOLUTE_PROTECTED_FILE> --runtime-password-file <ABSOLUTE_PROTECTED_FILE> --dry-run
```

Repeat it with `--target client`. The receipt may identify the target and
manifest hash, but it must never include a password, connection string with a
password, or protected-file path.

## Provision and migrate

Run these one target at a time, from the CMS source checkout and an elevated
administrator shell:

```powershell
npm run db:core:provision -- --target vendor --admin-password-file <ABSOLUTE_PROTECTED_FILE> --migrator-password-file <ABSOLUTE_PROTECTED_FILE> --runtime-password-file <ABSOLUTE_PROTECTED_FILE>
npm run db:core:migrate -- --target vendor
```

Then use the same sequence with `client`. Provisioning adopts only the exact
target database and exact roles; an existing role with an unknown password is
not reset. It seals only the migrator password to:

```text
D:\nr_runtime\operator-secrets\<target>-cms-core-migrator.v1.dpapi
```

The sealed file is DPAPI `LocalMachine`, inheritance-disabled, and readable
only by `SYSTEM` and `Administrators`. CMS, worker, build-sandbox, registry,
and broker service identities are intentionally absent. The canonical secret
reference is included in the manifest, not in a CMS `.env` file.

`db:core:migrate` performs a checksum dry-run, uses a target-specific advisory
lock, verifies `SET ROLE` to the target owner, applies the repository migration
set, reconciles public runtime grants/default grants, runs a final checksum
check, and writes a redacted receipt in `nr_control`.

## Runtime configuration and startup gate

The vendor CMS `DATABASE_URL` must log in as
`nr_cms_vendor_runtime`; the client must log in as
`nr_cms_client_runtime`. Neither may contain an owner or migrator credential.

For a target profile, `npm start` runs `db:core:runtime-check` before Next.js
listens. The check rejects a wrong target/runtime login, pending or drifted
`drizzle.__drizzle_migrations` ledger, missing runtime ledger read grant, or
any `nr_control` runtime usage. It does not query or use a migrator secret.

Required positive and negative evidence after each target is provisioned:

```sql
-- Execute as the operator. No plaintext secret is selected.
select n.nspname as schema_name, c.relname as object_name,
       c.relkind, pg_get_userbyid(c.relowner) as owner, c.relacl
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'drizzle', 'nr_control')
  and c.relkind in ('r', 'p', 'S')
order by n.nspname, c.relname;

select defaclrole::regrole as owner_role,
       coalesce(n.nspname, '<global>') as schema_name,
       defaclobjtype, defaclacl
from pg_default_acl d
left join pg_namespace n on n.oid = d.defaclnamespace
order by defaclrole::regrole::text, schema_name, defaclobjtype;
```

As the runtime login, normal CRUD on a manifest-allowlisted `public` CMS table
must work. `CREATE`, `ALTER`, `DROP`, `GRANT`, `SET ROLE` to the owner,
`pg_authid`, `nr_control`, and the other target database must fail. Do not use
an object required by CMS as a fake negative fixture.

## Temporary integration and restore gate

Run integration only against newly created, clearly named `*_test` databases
and disposable roles. Never point a test script at either real vendor/client
database. The required evidence is:

1. a completely empty database provision/migrate/retry;
2. an upgrade fixture migrated through the prior repository tag and then the
   current set;
3. a target-specific logical backup restored into an isolated target of the
   same target identity;
4. before/after comparison of owner, explicit/default ACL, manifest hash, and
   every ledger tag/hash/created-at value;
5. runtime positive CRUD and all negative capability probes.

`pg_restore` can omit redundant explicit owner ACL entries because the owner
already has equivalent implicit privileges. Therefore the restore procedure
must run the same target's idempotent core provision/reconciliation step after
the restore, followed by `db:core:migrate --dry-run`, `db:core:migrate`, and
the runtime startup gate. A clone target must override both its connection
database and its `databaseName` grant target; it must never reconcile grants
against the source database.

The test cleanup must first terminate only connections to the named temporary
database, then drop that exact database. If the test created three disposable
roles, it must then drop only those verified role names and verify all four
catalog entries are absent. A clone that intentionally reuses the existing
same-target role triplet must never drop those shared roles. It must not delete
the DPAPI operator root or any shared database. Keep the pre-migration backup
and the redacted receipt with the test evidence.

## Failure and rollback

There is no automatic down migration. If provisioning or migration fails:

1. stop the target before CMS startup;
2. retain the redacted receipt/error and backup reference;
3. do not issue ad-hoc destructive SQL or reset an existing password;
4. restore only the same target's tested backup after confirming matching
   target identity and secret-version availability;
5. rerun the preflight, migration dry-run, and runtime startup gate before
   returning the target to service.
