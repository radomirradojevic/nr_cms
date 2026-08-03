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

## Implementation receipt status (2026-08-03)

The private worker now contains the build-only pipeline, exact V2 verifier,
combined signed-addon/base-lock Child B plan, offline pacote/cache audit, strict
manifest/lock merge, post-install reachable graph and inventory verification,
public build-env contract and CMS build evidence hashes. The real 310-node
Webshop graph reconstructs from an npm v11 lock fixture with hash
`33594afe89ee5cf8ab2ddf8e22c4d5edc9399d55773f2e7af2e08952077dc179`.
The target policy pins all four Windows
service names **and deterministic service SIDs**. Operator helpers exist for
target-specific DPAPI registry-token provisioning and for the build-sandbox
sealed-file/broker-pipe/no-breakaway canary.

During the real-input preflight, the Webshop dependency-graph producer exposed
26 malformed nested package names containing physical `node_modules` paths.
The producer and both release/worker validators were corrected; the local
0.6.0 fixture was rebuilt and its 127 tests passed. Any package bytes published
before this correction must not be grandfathered: reconcile the hosted package
first and either prove byte identity with the corrected candidate or publish a
new immutable version through the release authority.

The authority export on 2026-08-03 confirms that the already hosted
`@radomirradojevic/webshop@0.6.0` is the earlier immutable release
`098565ff-6537-5442-ace6-f687922b8ed6` (tarball SHA-256
`3fd4ff3c347d140483ee6220726d0bc3e2ffc64334fcae3cd6b0dcd91fffa2bd`). Its
production JWS verifies through `webshop-release-2026-01`, but the signed
dependency graph fails the corrected strict validator with `Release dependency
graph node name/version/integrity is invalid`. Therefore it is rejected before
package code, DB, service, or mutation and cannot be used for the P09 hosted
fixture. A new immutable version and matching authority/master evidence are
required; overwriting `0.6.0` is forbidden.

The CMS base lock also contained 847 npm v11 entries with exact versions but
without stored registry URL/SRI metadata. The P09 worker now rejects that state
with `base_fetch_plan_integrity_missing`. The operator enrichment tool resolved
only those exact `name@version` tuples, validated allowlisted registry URLs and
SHA-512 SRI, and added the missing evidence without changing versions or graph
edges. Post-enrichment hash: `ba7c60bdeb337ac9005a4f75be341404161812ce3701acc30ef3a8325437d633`;
the real-input plan contains 310 signed addon nodes plus 774 base-only fetch
entries and zero entries without pinned integrity. The root supply-chain audit
now treats missing CMS base-lock URL/SRI evidence as a hard failure rather than
a warning.

The orchestrator passes only the statically pinned
`dpapi-machine://nr-addon-worker/<target>/github-packages-read/vN` reference;
it does not stat or receive the protected file path. Only the registry broker
maps that reference to the ACL-protected file. Service identity checks require
the deterministic service SID in the Windows token groups (the virtual service
SID is not the token's primary user SID). The pipe canary requires a broker
`ready` receipt and accepts either `ACCESS_DENIED` or a bounded timeout against
that already-open pipe; a missing-pipe timeout is rejected.

The four P09 Windows service wrappers are now installed with deterministic
service SIDs and `LocalService` identities. The build sandbox service is bound
to a `KILL_ON_JOB_CLOSE` Job Object and the scoped outbound rule `NR P09 Build
Sandbox outbound deny`. The final non-secret canary receipt proves all six
sealed canary reads are denied, the service token contains the pinned sandbox
SID, breakaway returns `ERROR_ACCESS_DENIED`, and the sandbox cannot connect to
a broker pipe that has reported `ready`. The static target-policy hash is
`38827d3adb06d4ee498aa35bfaad2f9269af172643fda225e0f463873496d606`.

This does not itself create a real hosted-registry deployment receipt. Each
target still needs its own independently sealed GitHub Packages read reference;
a generated PAT is sealed only from an elevated interactive PowerShell and is
never pasted into a prompt or `.env`:

```powershell
cd D:\nr_cms\.private\addon-deployment-worker
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\provision-registry-read-token.ps1 -TargetProfile vendor -Version 1
```

## 0.6.1 execution receipt (2026-08-03)

The corrected immutable source pair is pushed and was verified by the
verification-only GitHub Actions run
[`30811445073`](https://github.com/radomirradojevic/webshop/actions/runs/30811445073):

- CMS commit: `370106624a2208cc7f122439a15794976c767585`
- Webshop commit: `00c82981d27d4d5fcfc6721610068bd9b4111577`
- package: `@radomirradojevic/webshop@0.6.1`
- deterministic release ID: `0f905012-c22d-5dbc-b317-7c0366ef3259`
- downloaded secret-free candidate evidence SHA-256:
  `4703afbfc9ce0eca314492559f2437ec77f57447e2d67507bdd629b3115911a8`.

Both the Windows x64 dependency-graph job and the independent clean-host build
job passed. The operator release authority then completed production preflight
and publish for the exact 0.6.1 evidence, and the Master release catalog row is
published. The worker remains denied access to the authority root.

The final P09 Windows evidence export records these SHA-256 values:

- service host: `301b2dd7284e1bca4bc0b7ba3b5f401f4bf08098be343e5779463deaff58c932`;
- immutable registry/build dispatch: `d061e3f992a5d8512254d546c22d0c2ab114d606a015525747d5715c84b6bd4a`;
- sandbox canary: `c49cd16983db1cf8b8db4e1e3afa1ab60a43854e3d06e9758dbbc2223ff99975`;
- successful sandbox boundary receipt: `36148fe943445d6c6570afab857cf7c937fb0dc6e25b0565f6a6f3e081e835b9`.

Both the vendor and client registry secret references v1 audit as sealed and
ACL-valid, with separate target-specific DPAPI `LocalMachine` files. No P09
step acquired a target DB credential, applied a target migration, changed
`current`, or started/stopped a CMS service.
