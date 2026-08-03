# Prompt 09 — immutable build-security operator gate

This runbook is deliberately an operator gate, not a release/deployment
command. Prompt 09 verifies source and package bytes and stops with
`failed/rejected_before_switch`; it does not acquire a target DB credential,
run a migration, change `current`, or control a CMS service.

## Inputs that must exist before a real hosted-registry job

1. Commit the intended CMS source and record the full immutable commit SHA.
   The static target policy must pin that SHA; a dirty checkout is never a
   trusted source export.
2. Create a bare, read-only mirror of that exact CMS commit under the static
   `trustedCmsMirrorPath`. The worker service can read it; registry/build/DB
   identities cannot modify it.
3. Import the exact published release in the master catalog and publish its
   immutable evidence. The worker fetches only
   `https://license.nr.test/.well-known/nr-addon-releases/<releaseId>/publication-attestation.json`.
4. Install an **independent, read-only** GitHub Packages credential as the
   target-specific DPAPI `LocalMachine` secret reference declared by
   `registryReadTokenSecretRef`. Do not place its plaintext in an `.env`,
   command line, registry file, worker log, or test fixture.
5. Install the production Webshop release public keyset and pin its SHA-256 in
   the static target file. Local test KIDs (`local-dev:*`,
   `local-build-fixture*`, `local-acceptance:*`) are invalid for production.
6. Create the vendor and client canonical `CmsPublicBuildEnvV1` files,
   pin their hashes, and verify that they contain only public values. Their
   `NEXT_PUBLIC_APP_URL` values must be `https://vendor.nr.test` and
   `https://client.nr.test` respectively.

## Windows identity boundary

The target file names the four required service identities:

| Identity | P09 access |
| --- | --- |
| `NT SERVICE\NRAddonDeploymentWorker` | Worker job DB, static policy and result/request HMAC references only. |
| `NT SERVICE\NRAddonRegistryCredentialBroker` | Target-specific GitHub Packages read-token reference only. |
| `NT SERVICE\NRAddonBuildSandbox` | Job staging/cache/quarantine and public build-env only. |
| `NT SERVICE\NRAddonDbCredentialBroker` | Reserved for Prompt 10; no P09 DB credential or target DB access. |

Before enabling a real job, provision these as Windows services and grant ACLs
so the build sandbox receives `ACCESS_DENIED` for every sealed worker,
registry, target-DB, CMS runtime, Clerk/payment/email and HMAC root. The build
sandbox must run in a Windows Job Object with `KILL_ON_JOB_CLOSE`,
breakaway disabled, and outbound networking blocked after the two registry
fetch children terminate. A real canary must demonstrate that it cannot read
sealed blobs or the broker pipe and cannot create a detached descendant.

These ACL/service provisions are intentionally not inferred from a developer
session: they require the final service wrapper paths and an Administrator
token. P10 must not start until the canary receipt is stored with the static
target-policy hash.

## P09 test boundary

`npm run deploy:verify:build` is public-only and DB-free. `npm run build`
delegates to it when `NR_CMS_ENV_PHASE=build`. Runtime builds retain the normal
prepare/validation path. For an actual P09 worker job, the worker must record
the source-export, release-verification, offline-install and CMS-build hashes,
then create the explicit `build_verified_test_mutation_gate` no-mutation
result. Any real migration, filesystem switch or service action belongs to
Prompt 10.
