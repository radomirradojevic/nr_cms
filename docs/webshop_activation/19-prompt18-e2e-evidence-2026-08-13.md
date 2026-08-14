# Prompt 18 — završni lokalni E2E dokaz

Datum završetka: 2026-08-13 (Europe/Belgrade)

## Odluka

- **Lokalni Prompt 18 E2E: PASS.** Vendor i client su kroz pravi hosted-package worker završili u `status=ready` i `runtime_status=ready`; Stripe test porudžbina je autoritativno `paid/completed/fulfilled`, izdala je tačno jedan entitlement, a client je tim entitlementom aktiviran.
- **Produkcijski rollout: BLOCKED / NOT AUTHORIZED.** Ovaj dokaz koristi `.nr.test`, lokalni Caddy CA, development licence i Stripe test mode. Contract-fixture artefakti eksplicitno imaju `productionRuntime=false` i `gateEligible=false`.
- Sirov licencni ključ nije zabeležen u ovom dokumentu, komandnim izlazima ili Git istoriji.

## Izvori i immutable release

| Komponenta | Dokaz |
|---|---|
| CMS core | commit `3d275cd0f2beda6b79daac95a9e8f6890e115497` |
| Webshop source | commit `df5a69388382bb030013634b929cc036205df544`, tag `v0.6.24`, paket `@radomirradojevic/webshop@0.6.24` |
| Master License Server | commit `0ab6874cdec57b5dbbeb33aec3a06ecd748cdb34` |
| Deployment worker | commit `f4bd0199c738bb1b4e86cb7463c5069b688e0fd2` |
| Master release | `c7b9b631-3235-53ec-a2fa-fd312c7dff77`, stanje `published` |
| Addon artifact | `31d4b674369ee74c1e24fca906567a31720f27f7a8cc21a8595873020f800df4` |
| Registry tarball | `2636dcf5be734438053484dabf82a3376b5b572eca24368eda3acb6b1bb9472a` |
| Publication attestation | `154f455f6fd8afafe44c7929831c056b1fd2a07b520862bc175b639625b1abd2` |
| Dependency lock | `5edc5c9fe82bfa6600bfea480ff3b6e7552bbc59572f0d027754fef837a292ac` |
| Migration bundle | `2c3237a859c4679f7d41a17cb7b30cb2846bb07fd6d5f744f952be65c190f2a2` |
| GitHub Packages row | version ID `1129805038`, published `2026-08-13T15:41:02Z` |

Release-authority preflight i publish su završili uspešno. GitHub Release je namerno draft evidence carrier po authority workflow-u; njegov `release-publication-attestation.json` asset ima isti SHA-256 kao lokalna attestation datoteka. Npm package i Master release su objavljeni.

## Konačni deployment tupleovi

| Target | Canonical domain | Installation ID | Activation ID | Epoch | Operation ID | Worker job ID | Immutable runtime target | Rezultat |
|---|---|---|---|---:|---|---|---|---|
| vendor | `vendor.nr.test` | `9f3080da-5322-4666-a268-325b6ecbaa62` | `2270133d-d4ab-4f4d-aa2d-0dc2d2f056b4` | 28 | `1bc16aa8-3eef-450b-be63-7c742201c44e` | `4bc8544d-0c4c-49b3-8ea7-632ae78b0cb0` | `core-bootstrap-0aee433443646a79843e6532a9030f6d8626e40d0b732682a879a6ce9bedd42d` | `succeeded / ready`, callback 200 |
| client | `client.nr.test` | `ccf85491-eb0f-4f0c-931c-55afd414fec8` | `6e56996b-dc93-4eb4-a50a-92814fa8e203` | 5 | `3e5079d1-5aac-446f-86dd-2b0e04054197` | `e1cba21f-45c5-4461-96b6-5a8f3c293cf8` | `core-bootstrap-dc1320487f9421595293726cade0d54e017d35793668ac0defe92a1ccf3a9806` | `succeeded / ready`, callback 200 |

Za oba targeta važi:

- desired i installed release ID su `c7b9b631-3235-53ec-a2fa-fd312c7dff77`;
- desired i installed verzija su `0.6.24`;
- desired i installed artifact hash su `31d4b674369ee74c1e24fca906567a31720f27f7a8cc21a8595873020f800df4`;
- host-capability descriptor desired/installed hash je identičan;
- svih sedam migracija u ledgeru ima originalni LF checksum, schema version 1–7 i `status=applied`;
- runtime package je `node_modules/@radomirradojevic/webshop`, a `.private` ne postoji u deployment release-u.

Worker fazni dokazi za oba posla sadrže `accepted`, `source_exported`, `release_verified`, `offline_installed`, `cms_built`, `db_lease_acquired`, `schema_classified` i `terminal_receipt_committed`. Po završetku je broj aktivnih DB lease-ova 0, a broj zauzetih target mutexa 0.

## Payment, issuance i delivery

- Test order: `WEB-1008`.
- Stripe mode: test/sandbox.
- Provider reference: `stripe:74afe855-2e95-4724-a4e7-e49a98d37a75`.
- Stripe Checkout Session: `cs_test_a1aeMiJLMDrDvDzsmA1VXyZd3obO4KsuJOLe6RKrKrKeemZgvt7DXvrN87`.
- Poslednji provider event: `evt_1U3qkhHl6ew10wi5JpVhgLnM`.
- Finalno stanje: order `completed`, payment `paid`, fulfillment `fulfilled`.
- Master entitlement ID: `bb8cd25d-77ed-4ebb-a200-642c62e48e12`.
- Entitlement je vezan za `client.nr.test`, bez raw ključa u ovom dokazu.
- Prethodni plaćeni pokušaji `WEB-1006` i `WEB-1007` su refundovani i reconciled; nisu ostavili drugi entitlement.

## Backup, restore, rollback i incident evidence

- Vendor pre-migration backup: `D:\nr_backups\p18-worker\vendor\1bc16aa8-3eef-450b-be63-7c742201c44e.pre-migration.dump`, SHA-256 `212b045811565c33149f573898e251bd30e01d233ffd76e546cef2655b98c8cf`.
- Client pre-migration backup: `D:\nr_backups\p18-worker\client\3e5079d1-5aac-446f-86dd-2b0e04054197.pre-migration.dump`, SHA-256 `3f70c25f1f5767580b5793e035cd69453f29614c5750ddbbf0c82069d931e794`.
- Oba DB-broker lease-a su `released`; nema aktivnog lease-a ni mutex vlasnika.
- Isolated backup/restore drill `local-20260813141216495-06dfd68a6b:local-contract-drill:backup_restore` je `passed`: dve baze, osam redova, pet invarianti, nula povreda.
- Queue recovery/DLQ drill istog runa je `passed`: dva recovery-ja, jedan opažen DLQ, nula preostalih DLQ redova.
- Cross-service reconciliation je `passed` sa `reconciliationDelta=0`.
- Rollback/recovery fixture-i čuvaju prethodni immutable runtime, koriste fencing/epoch proveru i ne restore-uju current bazu preko novijeg epocha.

### Incident 0.6.23

Release `1e23d5bf-d2a3-5630-8004-2fafdee6dcb6` (`0.6.23`) je auditovano povučen iz novog izbora. Clean Windows authority checkout je zbog `core.autocrlf=true` proizveo CRLF raw migration checksumove, dok postojeći ledger sadrži kanonske LF bytes. SQL semantika nije bila promenjena i baza nije ručno menjana.

Trajna korekcija u `0.6.24`:

- `.gitattributes` zaključava `migrations/*.sql text eol=lf`;
- regression test `tests/migration-line-endings.test.ts` proverava raw LF bytes i descriptor checksum;
- authority checkout koristi `core.autocrlf=false`;
- svih sedam 0.6.24 checksumova tačno odgovara postojećem ledgeru;
- stari 0.6.23 vendor/client poslovi su završili kao `superseded`, bez success writer-a.

## Test i build matrica

| Gate | Rezultat |
|---|---|
| CMS testovi | 352/352 PASS |
| CMS typecheck | PASS |
| CMS lint | PASS, 13 postojećih upozorenja, 0 grešaka |
| Webshop 0.6.24 | 158/158 PASS, uključujući LF regression |
| Master DB testovi | 78/78 PASS |
| Worker DB testovi | 78/78 PASS |
| Worker lint/typecheck | PASS |
| CMS migracije | 96 PASS |
| Payment integration | 2/2 PASS |
| Fulfillment integration | 1/1 PASS |
| Završni CMS production build | PASS, Next.js 16.3.0, 25/25 static pages |

Acceptance evidence runovi:

- `local-20260813140529599-a6ea4eda99` — kombinovani contract E2E/drill;
- `local-20260813141204710-ac512c480b` — contract E2E, uključujući duplicate, replay, refund/dispute, stale worker, lifecycle i transfer grane;
- `local-20260813141216495-06dfd68a6b` — backup/restore, queue/DLQ, reconciliation, alert i key-rotation drillovi.

Ovi fixture runovi dopunjuju stvarni `.nr.test` worker/Stripe tok, ali sami nisu production gate dokaz (`productionRuntime=false`, `gateEligible=false`).

## Završna lista iz runbook-a 09

| # | Stavka | Status | Sažeti dokaz |
|---:|---|---|---|
| 1 | Četiri trusted HTTPS origin-a | PASS | vendor 200, client 200, license 307, worker health 200; TLS verifikacija uključena |
| 2 | Četiri procesa/baze/env/release prostora | PASS | odvojeni vendor/client/master/worker servisi i PostgreSQL baze |
| 3 | Least-privilege grant matrice i DB fixture-i | PASS | DB/migration/restore testovi zeleni; runtime nema owner/migrator prava |
| 4 | Canonical webshop schema i legacy cutover | PASS | schema 7 ledger i cutover/restore fixture-i bez public business duplikata |
| 5 | Deterministic core-bootstrap + SCM receipts | PASS | dva hash-pinned `core-bootstrap-*` targeta, WinSW/SCM servisi Running |
| 6 | Deployment bez `.private` | PASS | `privatePresent=false` na oba current targeta |
| 7 | Exact GitHub Packages verzija | PASS | hosted `0.6.24`, registry row `1129805038` |
| 8 | Windows authority, offline graph i provenance | PASS | authority preflight/publish, tarball read-back, SBOM/provenance/attestation i worker release verify |
| 9 | Odvojeni Master import/publish | PASS | draft import pa auditovani `release:publish`; release je `published` |
| 10 | Stable selector/downgrade/concurrency fixture | PASS | release selector test matrica zelena; povučeni 0.6.23 se ne bira |
| 11 | Vendor lifetime licenca/domain binding | PASS | activation `2270133d-...`, `vendor.nr.test` |
| 12 | Vendor ready kroz worker | PASS | operation/job iz tabele iznad, terminal callback 200 |
| 13 | Četiri master SKU-a | PASS | webshop-30/183/365/lifetime catalog matrica proverena |
| 14 | Stabilan catalog version/ETag | PASS | unchanged GET/sync fixture bez revision promene |
| 15 | Četiri exact variant mape/history | PASS | variant-level catalog binding testovi zeleni |
| 16 | Buy intent za client domen | PASS | browser tok nosio master-signed intent za `client.nr.test` |
| 17 | Core App Router acceptance i origin granice | PASS | browser wrapper radio; forged/null origin i route inventory fixture-i zeleni |
| 18 | Dev domain exemption / production policy | PASS | `.nr.test` evidentiran kao development; production fixture zahteva well-known proof |
| 19 | POST intent i accepted/reserved/consumed veza | PASS | bez tokena u URL-u; WEB-1008 exact order/item snapshot |
| 20 | Immutable domen/SKU kroz commerce tok | PASS | WEB-1008 zadržao `client.nr.test` i `webshop-365` |
| 21 | Jedan JTI — jedna linija | PASS | duplicate/concurrency fixture-i zeleni |
| 22 | Sedam intent ruta i payment authorization gate | PASS | scoped/HMAC/replay matrica i stvarni Stripe create/commit/capture tok |
| 23 | Captured payment izdaje jednu licencu | PASS | WEB-1008 paid; jedan entitlement `bb8cd25d-...`; risk/hold fixture-i zeleni |
| 24 | Issuance fence i post-issue reducer | PASS | partial/duplicate/out-of-order/refund/dispute/hold contract fixture-i zeleni |
| 25 | Intent binding i namenski KID | PASS | entitlement potiče iz consumed WEB-1008 intenta; issued-key encryption testovi zeleni |
| 26 | Duplicate/outage/response-loss bez duplikata | PASS | response-loss, idempotency i parallel-issue fixture-i zeleni |
| 27 | Secure delivery | PASS | autorizovani delivery/reveal tok iskorišćen za client aktivaciju; raw ključ nije u URL/log/reportu |
| 28 | Client activation i deployment ready | PASS | installation `ccf85491-...`, terminal callback 200 |
| 29 | Jednako `environment=development` | PASS | Master/CMS/worker request/result tupleovi usklađeni; cross-env fixture fail-closed |
| 30 | Descriptor, epoch/generation, mutex i fencing | PASS | desired/installed descriptor hash isti; one-result; 0 aktivnih lease/mutex redova |
| 31 | Lifecycle/revalidation negativni testovi | PASS | acceptance lifecycle/revalidation matrica zelena |
| 32 | Deactivation/transfer response-loss | PASS | `domain_transfer`, lifecycle status/tombstone i response-loss fixture-i zeleni |
| 33 | Nema curenja tajni/licence | PASS | redigovani outputi; nema raw ključa u evidence-u ili Git-u |
| 34 | Backup/rollback/incident procedure | PASS | dva proverena dumpa, isolated restore, queue/DLQ recovery i 0.6.23 withdrawal |

## Compatibility cleanup

Uklonjeno:

- završeni runtime flagovi `WEBSHOP_PAYMENT_STATE_V2`, `WEBSHOP_LICENSE_OUTBOX_V2` i `VENDOR_LICENSE_API_V2`;
- legacy payment/outbox grane i mrtvi parser fajlovi;
- zastarele env putanje; ESLint sada zatvara `.private/**` source granicu.

Namerno zadržano:

- `entitlementToken` dual read/write samo radi postojećih rollback/backup snapshotova i retention kompatibilnosti; nema fallback selektora niti legacy runtime flag puta.

## Preostali produkcijski blockeri

Detaljan redosled implementacije, provisioninga, staging/canary provera i
završna GO/NO-GO matrica nalaze se u
[production tehničkom runbook-u](production/README.md).

Pre produkcije operator mora zasebno dokazati i odobriti:

1. stvarne javne domene sa HTTPS well-known domain-control i SSRF/DNS pinningom, bez `.nr.test` izuzetka;
2. najmanje jedan zasebno prihvaćen live payment provider: Stripe sa produkcijskim nalogom/ključevima ili PayPal tek posle [realnog Sandbox E2E-a](20-paypal-sandbox-e2e-runbook.md), verifikovanog Business naloga i potpisanog javnog Live webhook-a;
3. production-only signing/HMAC/encryption KID allowliste, vlasnike i izvedenu rotaciju bez development KID-eva;
4. cloud/service threat-model review, production worker credential adapter, backup/restore i alert runbook na stvarnoj infrastrukturi;
5. produkcijski email provider retrieval/idempotency i log/APM canary dokaz;
6. završni production smoke/E2E sa stvarnim domenima i credentialima.

Dok se ove stavke ne zatvore, ovaj dokument nije dozvola za production payment capture ili production rollout.
