# Prompt 16 — release candidate i kontrolisani rollout evidence

Datum pripreme: **20. avgust 2026.**  
Odluka: **NO-GO / PREPARED LOCALLY / NOT PUBLISHABLE**

Ovaj zapis primenjuje `09-release-runbook.md` na finalni Prompt 15 audit. Nije
izvršen package publish, Master import/publish, promena dostupnosti, instalacija,
redeploy niti production canary. Ranije opšte odobrenje za Git commit/push ne
smatra se odobrenjem ni za jednu od tih operacija.

## 1. Prompt 15 ulazni gate

Korišćen je finalni audit:

- putanja:
  `.tmp/night-raven-local-acceptance/local-20260820145739512-1bf3bba2bc/production-acceptance-audit.json`;
- SHA-256:
  `6b40ce15c9c672bbbd46ed20b7386520bbd4639aada82ada9e4c3af9b9bcd0aa`;
- rezultat: **34 PASS / 34 NO_GO** nad svih 68 `docs/11` zahteva;
- lokalna fault/concurrency dijagnostika: 39 PASS, ali
  `productionRuntime: false` i `gateEligible: false`.

Prema odeljku 7 Prompt 15 evidence-a, publish ili promocija je zabranjena dok ne
postoje stvarni staging topology, payment/managed-install, fault/load/soak,
upgrade/rollback, encrypted DB+key restore i operator/canary dokazi.

## 2. Predložena verzija i usklađenje

Predložena canonical stable verzija je **`0.2.0`**. Master i managed-deployment
ugovori namerno prihvataju samo `major.minor.patch`, pa se RC stanje predstavlja
draft/canary gate-om, a ne SemVer sufiksom `-rc.1`.

`0.2.0` je pre-1.0 minor promena zato što su od `0.1.0` znatno prošireni javni
runtime/API, issuer, admin, recovery i consumer SDK ugovori. DB promene ostaju
aditivne i expand-compatible.

Usklađeno je:

| Stavka | Vrednost |
| --- | --- |
| package/lock/runtime/health/manifest verzija | `0.2.0` |
| package | `@nr-cms/license-server` |
| licenca/registry | `UNLICENSED`, restricted GitHub Packages |
| add-on schema | `8` |
| CMS compatibility | `^0.1.0` |
| add-on migration compatibility | `>=0.1.0 <0.3.0` |
| changelog | `.private/license-server-addon/CHANGELOG.md` |
| source release timestamp | deterministički timestamp source commit-a |

Test `release-version.test.ts` fail-closed proverava package, lockfile, packed
runtime i potpisani manifest. Clean-checkout proba je otkrila i zatvorila build
order grešku: release snapshot/dist se sada generišu pre typecheck-a.

## 3. Tačan lokalni RC identitet

| Polje | Vrednost |
| --- | --- |
| verzija | `0.2.0` |
| License Server commit | `a08e04f1f23d2e899164b7e519f4e9460d22a014` |
| CMS baseline commit | `34c132ae36e51fd9450f4aa1edb17428c55d8deb` |
| source releasedAt | `2026-08-20T16:18:10.000Z` |
| manifest contract | legacy install manifest V1 |
| local signing kid | `local-acceptance:6f8437de1ee3a91b` |
| artifact inventory SHA-256 | `7f6129effb787f37cc82894a37ffd812f70a946cbd554aba390a14d5e65678cd` |
| tarball SHA-256 | `46edc3c12d2866fe0cc5b56a7ec67b59f4f5ba429cf3f52c3b0c7dce77c0b26e` |
| tarball SHA-512 SRI | `sha512-NmWyOKoovz2LOuwUYIbmnIIie3MBu6hfoKHLmnoh1USh87Q8kmE47+ibRRMyArLA91W6Tbr8FDEd2nZRaAbc3Q==` |
| manifest SHA-256 | `10f5bac71fa875fc2853467f5ca077d088c461fca5a818203c6ba46e5bf679dd` |
| provenance SHA-256 | `c731baa4d08e16144f254bb33c2d31b25afa828e8c3d2f7d952972693c6f6a16` |
| CycloneDX SBOM SHA-256 | `058dc5b04de03f88655123c1131bdb74cdc542672d3ec3a0fd515d4ce4273609` |
| migrations.json SHA-256 | `a9f584188771a2d29e9f1934e7ee0fdad8288ccb321b3db9153ab792d2183fb3` |
| canonical migration bundle hash | `7365e5d71292154376e5d99b5d619462a628cd7c127b9008b7b8b909d9594ec9` |

Sačuvani lokalni paket i metapodaci nalaze se u:

`D:/nr_cms/.tmp/license-server-rc-evidence/a08e04f/final/`

Privatni lokalni signing ključ bio je ephemeral i obrisan je po završetku
smoke-a. Zato je ovaj tarball dokaz reproducibilnosti i pakovanja, ali nije
production-authority artefakt i ne sme se uploadovati u registry ili Master.

## 4. Clean-checkout i packed-host dokaz

Detached clean checkout `a08e04f1f23d2e899164b7e519f4e9460d22a014` je
izvršio:

```text
npm ci                                      PASS (134 paketa)
npm run build:local                         PASS
npm run test:db:local                       PASS (111/111, 0 skip)
npm run pack:verify                         PASS (dva identična pack-a po build-u)
npm run install:verify:next                 PASS (Next 16.3.0)
npm run install:verify:next:db              PASS (Next 16.3.0 + PostgreSQL)
```

DB packed-host smoke je renderovao dashboard overview, API Clients, Product
Types, Profiles, Licenses, Activations, Operations, Events, Docs, Keys, Audit i
Verifier, kao i health/issuer/keyset/verification route-ove. Frozen install,
RSC import, route import i tarball self-reference su `true`.

## 5. Migration plan

Svih osam migracija su `destructive: false`, `requiresBackup: true` i
`rollbackPolicy: expand_compatible`. Izvršavaju se redom pod advisory lock-om;
checksum drift ili compatibility mismatch prekida instalaciju.

| Schema | Migration | SHA-256 |
| ---: | --- | --- |
| 1 | `0001_license_server_customer_issuer_baseline.sql` | `e9b092bb504e4a1a13696b9ebb02eb3e80e6b9aeb6ea083d2662aba8e3029eec` |
| 2 | `0002_customer_issuer_v2_models.sql` | `f019f1a2bb702b4de345440194e07800dbbd5f010189bbb9fdee8b944a2d8cb9` |
| 3 | `0003_product_profiles_and_claim_schemas.sql` | `b46f243b6de1eda45347866e89769bcd340baf836dee7261fe499cc5ddeda111` |
| 4 | `0004_durable_operation_engine.sql` | `4eae436b0a81d1bfb920c03f3f6b81b5f4bf75890959d1301d2a695b6b04745c` |
| 5 | `0005_http_api_v2_secret_overlap.sql` | `cf92be2451a4fef7c80ca1c075b6f5fda0e0be2a38bfec23a57edbca13b00770` |
| 6 | `0006_customer_issuer_scheduler_lease.sql` | `7fd3841b4f4728127884074962b4ce8e3583c5a1e4aab92e52f3c7ff45363ab3` |
| 7 | `0007_runtime_activation_privacy_and_limits.sql` | `7c2c7aee38a6409b387f4dbf6a166b9fd0892d45f6f9c78a8b6b119866c503dd` |
| 8 | `0008_production_admin_support.sql` | `e888cdfd20c27b0b88afad4c71ee1ade75d9a26e19e490f2e09a4140aae0ac3a` |

Pre svake target instalacije obavezan je šifrovan DB+key backup i zabeležen
restore drill. Ne postoji automatski destructive down migration.

## 6. Canary i rollback/forward-fix plan

Canary obuhvat je tačno jedan allowlisted interni customer/product/SKU/install,
nikad globalna dostupnost. Gate prati auth/error reason kodove, unknown `kid`,
issuerRef mismatch, duplicate issue/delivery, queue depth/oldest age/DLQ,
validate/issue latency, keyset/catalog refresh i lifecycle/revoke odluke.

Minimalne kapije:

- validate p95 `< 300 ms`; issue accept p95 `< 500 ms`;
- checkout/webhook `< 60 s`, paid-to-license `< 5 min`;
- duplicate entitlement/license/delivery `0`, activation limit breach `0`;
- DLQ `0`, paid-without-license stariji od 15 min `0`;
- valid signature/unknown kid/secret-or-PII sentinel/5xx za canary `0`;
- 2 h aktivnog scenarija, 24 h immediate soak i ukupno 72 h pre wider GO-a.

Na prvi gate failure: checkout i nova availability off, worker claim pause uz
očuvan queue/lease/idempotency istorijat, V2 client scope i activation/update
pause. Webhook intake i refund/revoke reconciliation ostaju uključeni. Aplikacija
se vraća samo na prethodni tačno pinovan schema-compatible paket; DB se ne vraća
automatskim down migration-om. Ako compatibility nije dokazana, sledi
forward-fix ili formalno odobren restore bez promene `issuerRef`/signing ključa.

## 7. Blokeri pre package/release publish odobrenja

Package publish odobrenje se u ovom koraku **ne traži**, jer preconditions nisu
ispunjeni:

1. Prompt 15 ima 34 obavezna `NO_GO` zahteva i nema staging/topology/load/soak
   dokaz podoban za gate.
2. Potpis je lokalni ephemeral, ne production release authority.
3. Nema registry publication attestation-a za tačne tarball bajtove.
4. Centralni Master importer trenutno poziva samo
   `verifyOfflineWebshopRelease`; ugovor je zaključan na `addonKey: "webshop"` i
   `@radomirradojevic/webshop`. License Server V1 paket zato ne može bezbedno da
   se importuje kao Master draft.
5. Nije pinovan prethodni produkcioni License Server package digest potreban za
   upgrade/rollback, niti postoji stvarni datirani encrypted DB+key restore dokaz
   koji validira istorijski assertion.

Ovo nisu waiver-i. Potreban je novi, production-authority V2 package tuple i
zelen Prompt 15 staging audit pre nego što operator dobije zahtev za prvo
odobrenje.

## 8. Approval ledger

| Gate | Status | Dozvoljeno ovim zapisom |
| --- | --- | --- |
| package/release publish | **BLOCKED / NOT REQUESTED** | ništa |
| Master draft import + staging entitlement | **NOT STARTED** | tek posle zasebnog package publish odobrenja |
| Master publish | **NOT REQUESTED** | zahteva drugo eksplicitno odobrenje |
| canary availability | **NOT REQUESTED** | tek posle Master publish-a |
| target install/redeploy | **NOT REQUESTED** | zasebno po installation ID-u |
| wider rollout | **NOT REQUESTED** | tek posle 72 h zelenog canary-ja i eksplicitnog GO-a |

Prompt 16 ostaje **NO-GO**. Lokalni RC je pripremljen i proverljiv, ali release
nije završen dok digest, production publish, Master, install, canary i evidence
gate-ovi nisu zasebno zatvoreni.
