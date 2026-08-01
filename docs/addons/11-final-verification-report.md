# Night Raven P0/P1 — finalni remediation verifikacioni izveštaj

Datum verifikacije: 2026-07-13  
Obuhvat: CMS, Webshop addon, License Server addon i centralni Vendor License Service  
Production promene: **nisu izvršene**  
Konačna presuda: **P0/P1 završen, ali rollout nije odobren.**

## Dokazna granica

Ovaj izveštaj strogo odvaja dve vrste rezultata:

1. **LOCAL contract/drill evidence** — stvarni loopback HTTP tok kroz četiri odvojena procesa i dve izolovane PostgreSQL test baze. Svaki zapis je označen sa `productionRuntime=false` i `gateEligible=false`.
2. **STAGING acceptance evidence** — nije izvršen jer staging endpoint, identitet, provider sandbox reference, CMS/central staging DB resursi i operator-owned runner ne postoje.

`npm run acceptance:local` je završio sa exit kodom `0`. Potvrđeni lokalni run je `local-20260713102314784-348f52aa15`; evidence direktorijum je `.tmp/night-raven-local-acceptance/local-20260713102314784-348f52aa15`. Run je završio 32/32 scenario zapisa i 7/7 drill zapisa sa statusom `passed`. Svaki zapis sadrži UTC vreme, scenario/drill run ID, artifact SHA-256, loopback resource ID-jeve i redigovane metrike.

Ovi primeri ne predstavljaju zbirni release hash niti staging dokaz. Nema izmišljenih staging run ID-jeva, CI izvršenja, vault reference, provider rezultata ili production resource ID-jeva. Pinovane GitHub workflow definicije postoje, ali nijedna nije izvršena.

## Autoritativni rezultat

| Gate | Status | Stvarni dokaz / ograničenje |
|---|---|---|
| Četiri runtime projekta mapirana | **PASS** | CMS host/build-time registry; Webshop private runtime; customer-local LSA runtime; centralni Vendor License Service |
| Root test/typecheck/security | **PASS lokalno** | clean-ci full: 287 = 285 pass + 2 DB skip-a + 0 fail; typecheck PASS |
| Public-copy bez `.private`/`.env*` | **PASS lokalno** | `acceptance:public-copy` EXIT 0 sa lokalnim loopback test DSN-om bez lozinke; frozen ci, typecheck, 287 = 281 pass + 6 očekivanih private/DB skip-a + 0 fail; Next 16.2.6 build PASS bez NFT warning-a |
| Webshop install-ready package | **PASS lokalno** | 110/110, payment DB 2/2, clean Next host PASS, 344 modula; subject `1591c4b15484ba1c9c4cae58d86754bd1b72a57e8d5c9e11267bab1a633f8c6c` |
| LSA install-ready package | **PASS lokalno** | 32 ukupno = 31 pass + 1 DB skip; dedicated DB-local 32/32; host/release typecheck, build, health/router, issuer/outbox i isolated install; subject `36abde2ad97f3584b997fec5192ca7d1efdbd6aa7c32f871da6ada5c62efb41a` |
| Centralni servis | **PASS lokalno** | 24/24, typecheck i Next build PASS; security startup provera iza request boundary-ja |
| Migration matrica | **PASS lokalno** | 12 scenarija za CMS + istih 12 za centralni servis, ukupno 24 service-scenario rezultata |
| SQL/data invarianti | **PASS lokalno** | pet CMS + tri centralna upita, svih osam vraćaju `0` |
| Redaction/limiter/SSRF/body/locality | **PASS lokalno** | sentinel/security set 20/20, bundle scan, bounded stream, mapped IPv6, DNS pin, customer issuer locality i scope testovi |
| Public-copy/NFT harness | **PASS lokalno** | harness regresije 15/15; NFT manifesti obavezni; scan 0 `.private`, 0 `.env`, 0 `next.config.ts` |
| GitHub CI/rollout workflowi | **KONFIGURISANO, NOT RUN** | public CI je read-only; private/staging/production workflowi su manualni, protected-environment i self-hosted-only; regresija 2/2 |
| Supply chain / quality | **PASS lokalno** | supply-chain audit; sva 4 projekta `npm audit --omit=dev --audit-level=low` EXIT 0 / `found 0 vulnerabilities`; lint `--quiet` PASS; `git diff --check` PASS uz line-ending warning |
| 18 obaveznih + 14 dodatnih lokalnih contract scenarija | **PASS 32/32** | run `local-20260713102314784-348f52aa15`; `productionRuntime=false`, `gateEligible=false` |
| Sedam lokalnih drill-ova | **PASS 7/7** | isti run i ista non-production granica |
| Staging E2E/invarianti/drill | **NOT RUN** | nedostaju staging resursi; nijedan lokalni rezultat nije predstavljen kao staging E2E |
| Strict release/staging gate | **FAIL-CLOSED kada reference nedostaju** | nema fallback-a na efemerni ključ, lokalnu bazu ili component test |

## Konačna presuda

**P0/P1 završen, ali rollout nije odobren.**

P0/P1 programski i lokalni contract zahtevi su zatvoreni: runtime capability-ji više nisu placeholder-i, production signed-entitlement consumer je obavezan, manifest canonicalization i artifact inventory se kriptografski verifikuju, migration/checksum/rollback matrica je zelena, a lokalni acceptance/drill tokovi su prošli.

To nije canary dozvola. Staging je `NOT RUN`, trajna release authority nije provisionovana, a provider i deployment resursi nisu identifikovani. GitHub workflowi sada mogu sprovesti gate kada se provisionuju Environment approvals i runneri, ali production workflow namerno radi samo dry-run. Nijedan production pristup, deploy, migracija, secret/key rotacija, DNS ili provider promena nije izvršena.

## Stvarni runtime tok

| Projekat | As-built tok | Verifikacioni zaključak |
|---|---|---|
| CMS | Next route/action → CMS DB → server-only remediation config → generated addon registry → signed package loader/SDK host | javna kopija radi bez `.private`; neprazan registry zahteva pinovanu package verziju, subject, `kid`, potpis i svaki artifact hash |
| Webshop | provider webhook → V2 reducer/inbox → order/fulfillment/outbox → HMAC V2 centralni poziv → lokalna isporuka | 344-module package runtime i client boundary prolaze clean Next host; subject `1591c4b15484ba1c9c4cae58d86754bd1b72a57e8d5c9e11267bab1a633f8c6c` |
| License Server addon | package route → lokalni API auth/scope → customer-local product/license/activation/issuer DB → outbox/job | install-ready runtime isporučuje health/router i `customerLicenseIssuer.v1`; local subject je `36abde2ad97f3584b997fec5192ca7d1efdbd6aa7c32f871da6ada5c62efb41a` |
| Centralni Vendor License Service | HMAC V2 auth/scope/idempotency → subscription/entitlement/activation/signing → centralna PostgreSQL baza | cross-client scope, `subscription_created` lifecycle mapiranje i request-boundary build regresije su test-first zatvorene |

## Komande i njihove tačne semantike

```powershell
# Samostalni lokalni full matrix: public copy, efemerno potpisani private paketi,
# centralni servis, redaction, lokalne migracije/invarianti, 32 scenarija i 7 drill-ova.
npm run acceptance:local

# Samo lokalnih 32 contract scenarija + 7 drill-ova.
npm run acceptance:local:contracts

# Strogi private release gate. Zahteva unapred provisionovane reference:
# NR_ADDON_RELEASE_SIGNING_KEY_FILE, NR_ADDON_RELEASE_SIGNING_KID,
# NR_ADDON_RELEASE_PUBLIC_KEYS_FILE.
npm run acceptance:private-packages

# Strogi staging invariant gate; zahteva NR_ACCEPTANCE_CONFIG_PATH i obe staging DB reference.
npm run acceptance:invariants

# Strogi objedinjeni release/staging gate. Bez staging config-a hard-fail-uje pre izvršenja.
npm run acceptance
```

`npm run acceptance:local` koristi efemernu Ed25519 authority i dedicated test baze. `npm run acceptance:private-packages` ne generiše authority i ne prihvata inline secret. `npm run acceptance:invariants` ne pada nazad na lokalni DSN. Strogi `npm run acceptance` prvo validira operator-owned staging config i zato u ovom okruženju očekivano ne može biti PASS.

## Build/test snapshot

- Root clean-ci full: **287 ukupno = 285 pass + 2 DB skip-a + 0 fail**; typecheck PASS. Ponovljeni root Next build je EXIT 0 bez NFT warning-a; DB skip-ovi nisu preimenovani u PASS.
- Public-copy: `npm run acceptance:public-copy` EXIT 0 sa lokalnim loopback test DSN-om bez lozinke; frozen ci, typecheck, **287 ukupno = 281 pass + 6 očekivanih private/DB skip-a + 0 fail**; Next 16.2.6 build PASS. Ovo nije staging/production rezultat.
- NFT boundary: root scan vraća 0 `.private`, 0 `.env` i 0 `next.config.ts`; public-copy harness regresije prolaze 15/15 i fail-closed zahtevaju NFT manifeste posle builda.
- Webshop: **110/110**, payment DB **2/2**, clean Next host PASS i 344 modula. Subject `1591c4b15484ba1c9c4cae58d86754bd1b72a57e8d5c9e11267bab1a633f8c6c`; canonical local tgz `a2ef9f66d44034bf8f5aea9ed8fc6dc60a782fbed7496d041b1bca77e739ad92`; final aggregate-run ephemeral tgz `3e0d4ca14d8a838b785d24f46d1dd234a6b79fb5577d9b3d88ac2f25f5adc4fa`.
- LSA: **32 ukupno = 31 pass + 1 eksplicitni DB skip** bez dedicated DB-a; dedicated DB-local **32/32**; typecheck/build/install-ready provere zelene. Subject `36abde2ad97f3584b997fec5192ca7d1efdbd6aa7c32f871da6ada5c62efb41a`; aggregate ephemeral tgz `93a79591aaec397b22e82b2606debd433ce48fb398293ab818e5a4574c40cd4b`; `dist/server.js` SHA-256 `49fd10809056ba7b00146103a39830648484c7d03f94f7fbdc21258dca18a3b3`.
- Centralni servis: **24/24**, typecheck i Next build PASS.
- Sentinel/security: **20/20**.
- Supply-chain audit: **PASS**. CMS, Webshop, LSA i centralni servis `npm audit --omit=dev --audit-level=low` imaju EXIT 0 / `found 0 vulnerabilities`; eventualni dev-only advisory kontekst nije runtime dependency nalaz. `npm run lint -- --quiet` i `git diff --check` prolaze; poslednji prijavljuje samo line-ending warning.
- Migration: 12/12 CMS + 12/12 centralni service-scenario rezultata prolaze.
- Invarianti: 8/8 upita vraćaju nula.
- Local contract/drill: 32/32 + 7/7 prolazi u potvrđenom run-u; svi zapisi su `gateEligible=false`.

## Obaveznih 18 lokalnih contract scenarija

Svaki red je izvršen preko loopback HTTP servisa i test DB provere. Kolona STAGING ostaje `NOT RUN`.

| # | Scenario ID | LOCAL | STAGING |
|---:|---|---|---|
| 1 | `webshop_purchase` | PASS | NOT RUN |
| 2 | `license_server_addon_purchase` | PASS | NOT RUN |
| 3 | `duplicate_webhook` | PASS | NOT RUN |
| 4 | `central_outage_after_paid` | PASS | NOT RUN |
| 5 | `issue_response_loss` | PASS | NOT RUN |
| 6 | `idempotency_replay_conflict` | PASS | NOT RUN |
| 7 | `refund` | PASS | NOT RUN |
| 8 | `chargeback` | PASS | NOT RUN |
| 9 | `license_expiry` | PASS | NOT RUN |
| 10 | `renewal` | PASS | NOT RUN |
| 11 | `revocation` | PASS | NOT RUN |
| 12 | `domain_transfer` | PASS | NOT RUN |
| 13 | `activation_limit_parallel` | PASS | NOT RUN |
| 14 | `cloned_installation` | PASS | NOT RUN |
| 15 | `outage_grace` | PASS | NOT RUN |
| 16 | `forged_entitlement` | PASS | NOT RUN |
| 17 | `customer_local_issuer` | PASS | NOT RUN |
| 18 | `cross_tenant_access` | PASS | NOT RUN |

Zbir: **LOCAL 18/18 PASS, STAGING 0/18 PASS / 18 NOT RUN**.

## Dodatnih 14 lokalnih contract scenarija

| # | Scenario ID | LOCAL | STAGING |
|---:|---|---|---|
| 1 | `refund_delayed_success` | PASS | NOT RUN |
| 2 | `response_loss_after_commit` | PASS | NOT RUN |
| 3 | `parallel_issue` | PASS | NOT RUN |
| 4 | `stale_worker_recovery` | PASS | NOT RUN |
| 5 | `chargeback_out_of_order` | PASS | NOT RUN |
| 6 | `forged_signature_cache_protection` | PASS | NOT RUN |
| 7 | `installation_key_rotation` | PASS | NOT RUN |
| 8 | `vendor_signing_key_rotation` | PASS | NOT RUN |
| 9 | `outage_grace_fail_closed` | PASS | NOT RUN |
| 10 | `clone_identity` | PASS | NOT RUN |
| 11 | `package_manifest_mismatch` | PASS | NOT RUN |
| 12 | `install_pending_deploy_ready` | PASS | NOT RUN |
| 13 | `cross_client_product_scope` | PASS | NOT RUN |
| 14 | `customer_local_delivery` | PASS | NOT RUN |

Zbir: **LOCAL 14/14 PASS, STAGING 0/14 PASS / 14 NOT RUN**.

## Sedam lokalnih drill-ova

| Drill ID | LOCAL | STAGING |
|---|---|---|
| `backup_restore` | PASS — dve izolovane baze obnovljene; 8 redova i 0 invariant prekršaja | NOT RUN |
| `cross_service_reconciliation` | PASS | NOT RUN |
| `key_rotation` | PASS | NOT RUN |
| `queue_recovery` | PASS | NOT RUN |
| `alert_delivery` | PASS | NOT RUN |
| `vendor_signing_key_rotation_restore` | PASS | NOT RUN |
| `customer_issuer_key_rotation_restore` | PASS | NOT RUN |

Zbir: **LOCAL 7/7 PASS, STAGING 0/7 PASS / 7 NOT RUN**. Lokalni restore, alert i rotation simulator dokazuju kod/runbook contract; ne dokazuju provider backup politiku, stvarni alert transport ili eksterni key store.

## Migration matrica

Svaki scenario ispod je prošao za CMS i centralni servis:

| Versionirani scenario | CMS | Centralni servis |
|---|---|---|
| `fresh` | PASS | PASS |
| `upgrade_latest_production` | PASS | PASS |
| `upgrade_minimum_supported` | PASS | PASS |
| `rerun` | PASS | PASS |
| `interrupted_backfill` | PASS | PASS |
| `conflict_preflight` | PASS | PASS |
| `checksum_mismatch` | PASS — namerni mismatch hard-fail | PASS — namerni mismatch hard-fail |
| `failed_migration_atomic_recovery` | PASS | PASS |
| `old_code_read_expand` | PASS | PASS |
| `new_code_dual_write` | PASS | PASS |
| `compatible_package_rollback` | PASS | PASS |
| `incompatible_package_rollback` | PASS — odbijeno kako je očekivano | PASS — odbijeno kako je očekivano |

Ovo je lokalna matrica na dedicated test bazama, ne staging backup/restore ili production redeploy dokaz.

## SQL/data invarianti

Svaki upit je vratio `0`:

- `completed_order_without_required_fulfillment`;
- `refunded_or_chargeback_order_with_active_desired_entitlement`;
- `stale_processing_operation_lease`;
- `paid_license_issue_without_terminal_fulfillment`;
- `dead_letter_without_visible_issue_state`;
- `duplicate_vendor_business_entitlement`;
- `activation_limit_exceeded`;
- `addon_activation_limit_exceeded`.

Staging invariant komanda nije izvršena i bez staging config-a/DB referenci hard-fail-uje.

## Release signing, checksum i provenance

Manifest se potpisuje Ed25519 ključem iz fajl-reference; inline private key nije podržan. Verifier proverava:

- addon/package identitet, verziju, runtime contract i `signingKid`;
- kriptografski potpis kanonskog unsigned manifesta;
- svaki dozvoljeni artifact path, veličinu i SHA-256;
- aggregate subject i registry integrity;
- podudaranje release manifesta i provenance zapisa;
- da je server entrypoint obuhvaćen potpisanim inventory-jem.

Lokalna efemerna authority dokazuje da pipeline radi, ali njen `kid` namerno nije promotable. Finalni lokalni subject-i su Webshop `1591c4b15484ba1c9c4cae58d86754bd1b72a57e8d5c9e11267bab1a633f8c6c` i LSA `36abde2ad97f3584b997fec5192ca7d1efdbd6aa7c32f871da6ada5c62efb41a`. Webshop canonical local tarball je `a2ef9f66d44034bf8f5aea9ed8fc6dc60a782fbed7496d041b1bca77e739ad92`; aggregate run koristi efemerne potpise, pa su njegovi tarball hash-evi Webshop `3e0d4ca14d8a838b785d24f46d1dd234a6b79fb5577d9b3d88ac2f25f5adc4fa` i LSA `93a79591aaec397b22e82b2606debd433ce48fb398293ab818e5a4574c40cd4b`. Nijedan efemerni potpis nije production release authorization.

## Test-first ispravke pronađene u završnoj verifikaciji

1. **Central build request boundary:** production security validacija se izvršavala tokom build rendera. Padajući test je zahtevao `force-dynamic`, `await connection()` i tek zatim validaciju; build sada ne čita production-only sigurnosni state pre request granice.
2. **`subscription_created` mapper:** reducer je vraćao `active`, ali persistence mapper nije tretirao `active` kao aktivan entitlement. DB test je reprodukovao pogrešan lifecycle rezultat; mapper sada čuva `active`.
3. **IPv4-mapped IPv6:** SSRF klasifikator nije odbijao privatnu adresu predstavljenu kao `::ffff:127.0.0.1`/hex ekvivalent. Regresija je prvo dodata, zatim normalizacija/fail-closed provera.
4. **Chunked/raw-byte bound:** odgovor bez `Content-Length` mogao je preći limit. Test sada šalje stream bez tog header-a; reader prekida/cancel-uje čim zbir chunk-ova pređe `maxResponseBytes`.
5. **DNS pin:** test je dokazao da preflight rezolucija bez pinovanja konekcije ostavlja rebinding prozor. Pinovani dispatcher je dodat u root i Webshop runtime; regenerisani 344-module paket prolazi clean host test.
6. **Raw-fetch bypass:** fulfillment i catalog pozivi su direktnim `fetch` pozivom mogli zaobići zajednički outbound guard. Sentinel je prvo pao, zatim su oba toka prebačena na guarded, DNS-pinned i size-bounded fetch granicu.
7. **Next NFT wide-trace:** Next 16.2.6 build je reprodukovao `Encountered unexpected file in NFT list` za `lib/file-storage.ts`. Leaf filesystem pozivi su označeni `turbopackIgnore` markerima; ponovljeni root build je EXIT 0 bez warning-a. Harness sada zahteva NFT manifeste i odbija `.private`, `.env` ili `next.config.*` reference; regresija je 15/15, a public-copy rerun EXIT 0.

## Globalne invarijante

| Grupa | Lokalni status | Rollout ograničenje |
|---|---|---|
| Finansijske | PASS contract/DB | provider sandbox i live mode NOT RUN |
| Order/fulfillment | PASS contract/DB + 5 CMS invariant upita | eksterni scheduler/provider NOT RUN |
| Idempotency/concurrency | PASS payment, issue, subscription scope i stale-worker tokovi | multi-instance staging NOT RUN |
| Trust/kriptografija | PASS signed consumer, forged/rotation i manifest signature pipeline | persistent authority/KMS i staging rotation NOT RUN |
| Addon/build | Webshop i LSA finalni lokalni artifact/host testovi PASS | persistent authority i registry publish/install NOT RUN |
| Migracije | PASS 12x2 | staging duration/locks/restore NOT RUN |
| Observability/operations | PASS 7/7 lokalni drill contract | stvarni alert transport/backup/key store NOT RUN |

## Preostali rollout preduslovi — nisu P0/P1 code bugovi

1. provisionovati trajnu release signing authority i javni key-set bez secret vrednosti u CLI/output-u;
2. obezbediti stvarni staging endpoint, identity, provider sandbox i obe staging DB reference;
3. izvršiti 18+14 scenarija i sedam drill-ova kao staging evidence, ne kao lokalni contract;
4. pinovati provider backup/restore, deployment, monitoring i registry komande/resource ID-jeve;
5. tek zatim tražiti zasebnu dozvolu za A0; nijedna production akcija nije implicitno odobrena.

## Acceptance checklist

- [x] Mapirana sva četiri runtime projekta
- [x] Root clean-ci 287-test snapshot zelen: 285 pass + 2 eksplicitna DB skip-a
- [x] Public-copy frozen 287: 281 pass + 6 očekivanih skip-a + Next build PASS bez NFT warning-a
- [x] NFT manifest scan: 0 `.private`, 0 `.env`, 0 `next.config.ts`; harness regresije 15/15
- [x] Potpisani entitlement je obavezan/fail-closed u production consumer-u
- [x] LSA release isporučuje health/router/customer issuer/outbox runtime
- [x] Migration matrica 12x2 prolazi
- [x] Svih osam lokalnih invariant upita vraća nula
- [x] LOCAL 18/18 obaveznih i 14/14 dodatnih scenarija prolazi
- [x] LOCAL 7/7 drill contract prolazi
- [x] Webshop 110/110, payment DB 2/2, clean Next host i finalni lokalni subject/tarball hash upisani
- [ ] Oba private paketa potpisana trajnom release authority i promotable
- [ ] STAGING 18/18 + 14/14 + 7/7 evidence izvršen
- [ ] Provider/deploy/backup/monitoring/registry resursi pinovani
- [ ] A0 posebno odobren

**Presuda ostaje: P0/P1 završen, ali rollout nije odobren. Sistem nije spreman za production canary bez staging dokaza i posebne operator odluke.**
