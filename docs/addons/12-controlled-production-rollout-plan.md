# Night Raven P0/P1 — kontrolisani production rollout plan

Datum pripreme / poslednja verifikacija: 2026-07-13  
Obuhvat: CMS, Webshop, License Server addon i centralni Vendor License Service  
Status: **PRIPREMLJENO, ALI NO-GO — production rollout nije odobren**
> `npm run acceptance:local` je završio sa exit kodom `0`. Potvrđeni LOCAL run `local-20260713102314784-348f52aa15` prolazi 32/32 contract scenarija i 7/7 drill-ova; evidence je u `.tmp/night-raven-local-acceptance/local-20260713102314784-348f52aa15`. Svaki zapis ima `productionRuntime=false` i `gateEligible=false`. Staging preflight ostaje fail-closed jer konfiguracija, identitet, provider i staging DB reference nisu provisionovani. Ovo nije production operacija niti dozvola za A0.

> `npm run acceptance:local` je samostalna lokalna verifikacija sa efemernim ključevima i test bazama; `npm run acceptance:local:contracts` pokreće samo 32+7 non-gate toka. Strogi `npm run acceptance:private-packages` zahteva provisionovane release-authority reference, dok `npm run acceptance:invariants` i strogi `npm run acceptance` zahtevaju operator-owned staging config. Secret vrednosti nisu CLI argumenti, fixture niti output. Nijedna od tih komandi ne pokreće production.

## Autoritativni R-1 re-verification zapis — 2026-07-13

| R-1 uslov | Rezultat |
|---|---|
| Root test/typecheck | **PASS lokalno**: clean-ci 287 = 285 pass + 2 DB skip-a + 0 fail; typecheck PASS; root Next build EXIT 0 bez NFT warning-a |
| Public-copy frozen release bez `.private`/`.env*` | **PASS lokalno**: `acceptance:public-copy` EXIT 0 sa lokalnim loopback test DSN-om bez lozinke; frozen ci, typecheck, 287 = 281 pass + 6 očekivanih private/DB skip-a + 0 fail; Next 16.2.6 build PASS |
| Webshop install-ready package | **PASS lokalno**: 110/110, payment DB 2/2, clean Next host, 344 modula; subject `1591c4b15484ba1c9c4cae58d86754bd1b72a57e8d5c9e11267bab1a633f8c6c` |
| LSA install-ready package | **PASS lokalno**: 32 ukupno = 31 pass + 1 DB skip; dedicated DB-local 32/32; subject `36abde2ad97f3584b997fec5192ca7d1efdbd6aa7c32f871da6ada5c62efb41a` |
| Centralni servis | **PASS lokalno**: 24/24, typecheck i Next build PASS; request-boundary regresija zatvorena |
| Sentinel/security | **PASS lokalno**: 20/20 |
| Public-copy/NFT harness | **PASS lokalno**: regresije 15/15; NFT manifesti obavezni; root scan 0 `.private`, 0 `.env`, 0 `next.config.ts` |
| Supply chain / quality | **PASS lokalno**: supply-chain audit; sva 4 projekta `npm audit --omit=dev --audit-level=low` EXIT 0 / `found 0 vulnerabilities`; lint `--quiet` PASS; `git diff --check` PASS uz line-ending warning |
| LOCAL 18 obaveznih + 14 dodatnih scenarija | **PASS 32/32**: run `local-20260713102314784-348f52aa15`; `productionRuntime=false`, `gateEligible=false` |
| STAGING 18 + 14 scenarija | **NOT RUN**: config/identity/provider/DB/runner nisu provisionovani |
| Migration/invarianti | **PASS lokalno**: 12 scenarija za svaki od dva servisa i svih 8 zero-violation upita; staging NOT RUN |
| LOCAL sedam drill-ova | **PASS 7/7** u istom non-gate run-u; staging 0/7, sve NOT RUN |
| Signed-entitlement enforcement | **PASS lokalno**: production consumer verifikuje potpis bez obzira na pokušaj flag bypass-a |
| Release authority | Efemerna Ed25519 authority dokazuje pipeline, ali je non-promotable; trajna operator-owned authority nije provisionovana |

**R-1: FAIL za rollout. A0 se ne traži. Nijedna production komanda nije izvršena niti odobrena.**

Ovaj dokument je operativni redosled za budući kontrolisani rollout. Ne predstavlja dozvolu za production pristup, migraciju, deploy, promenu secret-a, ključa, DNS-a, payment provider-a, registry-ja ili backup politike. Konačna verifikacija ima presudu **P0/P1 završen, ali rollout nije odobren**.

## 1. Trenutna odluka i prva approval tačka

Rollout se zaustavlja na **Gate R-1**. Lokalna remediation matrica je zelena, ali sledeći rollout preduslovi moraju biti zatvoreni pre bilo kakvog production pristupa:

1. finalni lokalni Webshop i LSA artifacti su zeleni; za promociju oba manifesta moraju biti potpisana verifikabilnom trajnom release authority, ne efemernim lokalnim ključem;
2. staging backfill/enforce/delivery, multi-instance limiter i stvarni alert/redaction dokaz moraju biti završeni; lokalnih 7/7 drill-ova nije zamena;
3. CMS migration runner hard-fail-uje checksum mismatch i zabranjuje repair/adopt u production-u; dedicated CMS test-DB matrica je prošla;
4. centralni migration runner ima offline/read-only/target/lock/recovery kod; dedicated central fresh/lock/checksum/dry-run dokaz je prošao;
5. signed-entitlement verification i customer-local issuer/outbox su lokalno dokazani; isti tok mora proći sa instaliranim staging release candidate-om;
6. STAGING 18/18, dodatnih 14/14, migration/invariant provere i svih sedam operator drill zapisa moraju proći;
7. frozen dependency/audit dokaz mora ostati zelen u odobrenom private CI-u;
8. production platform, DB resource ID-jevi, backup/PITR komande, deployment komande i registry moraju biti eksplicitno identifikovani;
9. rollout plan/runbookovi su sada podobni za version control, ali release tag/change record i immutable audit lokacija još moraju biti odobreni.

> **PRVA TAČKA KOJA ZAHTEVA EKSPLICITNU DOZVOLU: A0, na Gate 0 — otvaranje read-only production sesija, ulazak u change freeze i kreiranje immutable backup/snapshot-a obe baze sa izolovanim restore dokazom.**

A0 se ne traži niti daje dok Gate R-1 nije potpuno zelen. Nijedna komanda iz kasnijih gate-ova sada se ne izvršava.

## 2. Pravila izvršenja

- Svaki gate ima zaseban `go/no-go` zapis, operatora, UTC početak/kraj, change ID, artifact SHA-256 i backup ID.
- Samo jedan gate sme biti u promeni. Sledeći počinje tek kada prethodni završi observation window bez Critical/High signala.
- Production shell je čist i efemeran. Ne učitava `D:\nr_cms\.env`; taj fajl je potvrđeno development/test konfiguracija.
- Production buildovi se rade u čistom CI-u bez production DSN-a i secret-a. Next build sme dobiti samo izolovanu read-only build/test bazu ako page-data collection zahteva DB.
- CMS i centralni servis koriste isti naziv `DATABASE_URL`, pa se nikada ne drže oba production DSN-a u istoj aplikacionoj sesiji.
- Secret-i ne smeju biti argumenti komandne linije, URL query parametri, redirect parametri ili output. Koriste se secret-store injection i header/body transport.
- Checkout se pauzira pre rizične promene, ali webhook intake i već nastali finansijski/fulfillment događaji ostaju dostupni.
- Migracije su `expand` korak. Nema destruktivnog contract koraka, down migracije ili brisanja legacy podataka u ovom rollout-u.
- Svaki neočekivani `adopt`, checksum drift, scope/signature greška, terminal-state regresija, duplicate entitlement ili secret u logu znači trenutni `no-go`.
- Ako provider/platform komanda nije pinovana u ovom dokumentu, ona se ne izmišlja tokom change window-a; gate ostaje blokiran.

## 3. Komandna bezbednost i production target guard

### 3.1 Verifikovane osobine postojećih komandi

| Komanda | DB efekat | Rollout upotreba |
|---|---|---|
| root `npm ci`, `lint`, `typecheck`, `test` | bez DB mutacije | čisti CI |
| root `npm run db:migrate:check` | offline provera migration fajlova | ne proverava production ledger |
| root `npm run deploy:verify` | registry generation + offline migration check + typecheck | ne deployuje i ne proverava production DB |
| root `npm run build` | DB-neutralan za write; može čitati DB tokom page-data collection | samo izolovana build baza |
| root `npm run db:migrate:dry-run` | read-only preflight nad `DATABASE_URL` | ne skip-uje zbog `DRIZZLE_AUTO_MIGRATE=false`; checksum mismatch je hard failure |
| root `npm run db:migrate:production` | menja bazu iz `DATABASE_URL` | zahteva `--production` wrapper, production target guard i exact očekivanu pending listu |
| centralni `npm run build` | bez DB migracije | čisti CI sa efemernim test ključevima |
| centralni `npm run db:migrate:offline` | bez DB veze, version `1` checksum manifest | obavezni offline preflight |
| centralni `npm run db:migrate:production` | Drizzle apply pod wrapper advisory lock-om | zahteva target guard, read-only dry-run i exact očekivanu pending listu |
| Webshop/LSA `npm run build` | private release build; zahteva signing key-file i `kid` reference | oba lokalna build/install/host dokaza su zelena; promocija zahteva trajnu authority |

Repozitorijum nema pinovanu production deploy, registry publish, provider snapshot/PITR ili monitoring provision komandu. Njihovi tačni platform project/resource ID-jevi i komande moraju biti dopisani u odobren change record pre A0; generički `vercel`, provider dashboard klik ili `pg_dump` nije automatski ekvivalent postojeće backup politike.

### 3.1a Implementirani migration wrapperi

CMS production komanda je `npm run db:migrate:production`; centralna je ista
iz `.private/license-server`. Obe zahtevaju `NR_MIGRATION_TARGET=production`,
`NR_MIGRATION_SERVICE` (`cms` ili `central`), očekivani host/database/provider
resource ID i exact `NR_MIGRATION_EXPECTED_LIST`. Komande ne ispisuju DSN.
Pre apply-a obavezan je odgovarajući `db:migrate:production:dry-run`; centralni
servis dodatno ima `db:migrate:offline` checksum manifest. `db:migrate:matrix`
je dopušten isključivo sa dedicated test URL-om i nikada se ne izvršava u
production shell-u.

`/docs/` više nije isključen repo pravilom i ovi redigovani dokumenti mogu biti versionirani. To samo po sebi nije immutable release dokaz: odobren release tag/change record i audit lokacija i dalje su obavezni pre A0.

### 3.2 Obavezan target assertion

Sledeći guard je specifikacija obaveznog wrapper-a. Mora biti dodat kao testiran, versioned script pre Gate 0; ne oslanja se samo na ime baze. Operator dodatno potvrđuje provider project/resource ID iz platforme.

```powershell
$ErrorActionPreference = "Stop"

if ($env:NR_ROLLOUT_TARGET -ne "production") { throw "NR_ROLLOUT_TARGET must be production" }
if ($env:NODE_ENV -ne "production") { throw "NODE_ENV must be production" }
if ($env:TEST_DATABASE_URL -or $env:NRLS_TEST_DATABASE_URL) {
  throw "Test database variables must be absent from a production shell"
}

function Assert-ProductionDatabaseTarget {
  param(
    [Parameter(Mandatory=$true)][string]$ConnectionVariable,
    [Parameter(Mandatory=$true)][string]$ExpectedHost,
    [Parameter(Mandatory=$true)][string]$ExpectedDatabase,
    [Parameter(Mandatory=$true)][string]$ExpectedResourceId,
    [Parameter(Mandatory=$true)][string]$ObservedResourceId
  )

  $raw = [Environment]::GetEnvironmentVariable($ConnectionVariable, "Process")
  if ([string]::IsNullOrWhiteSpace($raw)) { throw "$ConnectionVariable is missing" }
  $uri = [Uri]$raw
  $database = [Uri]::UnescapeDataString($uri.AbsolutePath.TrimStart('/'))
  $forbidden = '(^|[._-])(dev|development|test|stage|staging|sandbox|local)($|[._-])'

  if ($uri.Scheme -notin @('postgres', 'postgresql')) { throw "PostgreSQL URL required" }
  if ($uri.DnsSafeHost -in @('localhost', '127.0.0.1', '::1')) { throw "Local database rejected" }
  if ($uri.DnsSafeHost -cne $ExpectedHost) { throw "Unexpected database host" }
  if ($database -cne $ExpectedDatabase) { throw "Unexpected database name" }
  if ($uri.DnsSafeHost -match $forbidden -or $database -match $forbidden) {
    throw "Non-production database marker detected"
  }
  if ([string]::IsNullOrWhiteSpace($ExpectedResourceId) -or
      $ObservedResourceId -cne $ExpectedResourceId) {
    throw "Provider resource identity mismatch"
  }

  [pscustomobject]@{
    target = "production"
    host = $uri.DnsSafeHost
    database = $database
    resourceIdVerified = $true
  }
}
```

Wrapper ne ispisuje DSN, user, password ili query. `ObservedResourceId` dolazi iz read-only output-a provider CLI/API-ja i poredi se sa pinovanim `ExpectedResourceId`, ne sa slobodnim unosom operatora.

### 3.3 Staging/production credential separation

Pre A0 mora postojati redigovan fingerprint izveštaj iz dve odvojene secret-store sesije:

- isti jednokratni audit HMAC ključ koristi se samo za fingerprinting u izolovanim jobovima;
- output sadrži `environment`, `purpose`, `secret version`, `kid` i skraćeni HMAC fingerprint, nikad vrednost;
- nema jednakog fingerprint-a između staging i production okruženja;
- nema jednakog fingerprint-a između encryption, signing, HMAC, payment API, webhook, cron, redeploy, hashing i download namena;
- centralni `api_clients.environment` mora biti `production`, a aktivne `api_client_secret_versions.secret_fingerprint` vrednosti jedinstvene po klijentu/nameni;
- PayPal, Paddle i Monri live/sandbox pripadnost mora potvrditi provider dashboard/API jer kod ne može potpuno da je dokaže.

Bez pristupa production secret store-u ova provera sada nije izvršena. To je A0 precondition, ne pretpostavka.

## 4. Gate pregled

| Redosled | Gate | Trenutni status | Approval |
|---:|---|---|---|
| R-1 | Remediation i staging dokaz | LOCAL remediation PASS; **rollout FAIL / hard stop** | nema production dozvole |
| 0 | Target identity, freeze, backup i restore tačka | blokiran R-1 | **A0 — prva dozvola** |
| 1 | Monitoring/alerting pre promene | nije pokrenuto | A1 |
| 2 | Centralna DB additive migracija | blokirano runner-om | A2 |
| 3 | Vendor License Service dark deploy pa V2 canary scope | blokirano | A3a/A3b |
| 4 | CMS/Webshop DB additive migracija i dark code deploy | blokirano runner-om | A4a/A4b |
| 5 | Payment webhook V2 | blokirano E2E/provider dokazom | A5 |
| 6 | Fulfillment worker | blokirano E2E/queue-recovery dokazom | A6 |
| 7 | Signing i public key set | blokirano trajnom key authority, staging rotation i operator dokazom | A7 |
| 8 | Private addon package/registry | blokirano trajnom signing authority i nepinovanim registry/deploy resursima | A8 |
| 9 | Activation/revalidation | blokirano package/signing dokazom | A9 |
| 10 | Jedan interni production canary | blokirano svim prethodnim gate-ovima | A10 |
| 11 | Širenje izvan canary-ja | van ovog plana | nova zasebna odluka |

## 5. Detaljni gate-ovi

### Gate R-1 — no-production readiness

**Preconditions:** nema; ovo je obavezni početni gate.

**Tačne komande:** lokalni dokaz se može izvršiti bez CI-ja, staginga ili vault-a; strict gate se izvršava tek sa provisionovanim referencama. Nijedna komanda ne dobija production DSN ili secret vrednost kroz CLI:

```powershell
Set-Location D:\nr_cms
# Potpuna LOCAL matrica; evidence je uvek productionRuntime=false/gateEligible=false.
npm run acceptance:local
# Samo LOCAL 32 contract scenarija + 7 drill-ova.
npm run acceptance:local:contracts

npm ci
npm run db:migrate:check
npm run db:migrate:test
npm run deploy:verify
npm run lint
npm run typecheck
npm run test -- --test-concurrency=1
npm run test:payment:integration
npm run test:fulfillment:integration
npm run supply-chain:audit
npm audit --omit=dev --audit-level=low
npm run build
npm run acceptance:public-copy
# Strogo: zahteva signing key-file/kid i public key-set fajl reference.
npm run acceptance:private-packages
npm run acceptance:redaction
npm run acceptance:migration
# Strogo: zahteva operator-owned staging config i obe staging DB reference.
npm run acceptance:invariants
npm run acceptance:e2e
npm run acceptance:drills
# Strogi objedinjeni release/staging gate; fail-closed bez staging config-a.
npm run acceptance

Push-Location .private\license-server
npm ci
npm run typecheck
npm run db:migrate:test
npm run test:db
npm run build
npm audit --omit=dev --audit-level=low
Pop-Location

Push-Location .private\webshop
npm ci
npm run typecheck
npm run test
npm run test:payment:db
npm run build
npm pack --dry-run
npm audit --omit=dev --audit-level=low
Pop-Location

Push-Location .private\license-server-addon
npm ci
npm run typecheck
npm run test
npm run build
npm pack --dry-run
npm audit --omit=dev --audit-level=low
Pop-Location
```

DB integration komande dobijaju isključivo dedicated `TEST_DATABASE_URL` odnosno `NRLS_TEST_DATABASE_URL`, sa safety wrapper-om. Build dobija samo izolovan build/test DB ako je potreban.

### GitHub Actions bootstrap — workflowi su dodati, ali nisu izvršeni

Repo sada ima četiri pinovana workflowa: `.github/workflows/ci.yml` (automatski javni CI), `private-release.yml` (manualni private package gate), `staging-acceptance.yml` (manualni staging evidence gate) i `production-rollout.yml` (manualni production preflight). Public CI koristi efemerni PostgreSQL servis i nema production/staging secret; private, staging i production poslovi imaju samo `contents: read`, zahtevaju GitHub Environment i izričito označen self-hosted runner.

Pre prvog izvršenja operator mora u GitHub-u kreirati Environment-e `private-release`, `staging-acceptance` i `production`, dodati required reviewers i branch/tag protection, pa provisionovati runnere sa labelama `night-raven-private`, `night-raven-staging` i `night-raven-production-release`. Runner varijable sadrže samo reference/putanje (`NR_*_WORKSPACE_ROOT`, config/evidence i key-file reference); ne stavljati key ili DSN vrednost u workflow YAML, CLI ili artifact. Staging runner mora imati stvarnu `.private` radnu kopiju i operator-owned `NR_ACCEPTANCE_CONFIG_PATH` iz `night-raven-acceptance.staging.example.json` obrasca.

`production-rollout.yml` trenutno namerno radi samo `deploy:verify` i `db:migrate:production:dry-run`, zatim se zaustavlja. Ne sme se proširiti na migration apply ili provider deploy dok Gate R-1 nije PASS, staging evidence nije arhiviran, B0 backup/restore nije dokazan i odgovorni operator nije uneo provider-specifičnu immutable deploy/rollback komandu.

Versioned harness komande postoje i gore su pinovane. `npm run acceptance:local` je EXIT 0; run `local-20260713102314784-348f52aa15` prolazi LOCAL 32/32 + 7/7, ali je eksplicitno non-gate. Naknadni `npm run acceptance:public-copy` je takođe EXIT 0 sa lokalnim loopback test DSN-om bez lozinke: 287 = 281 pass + 6 očekivanih skip-a, NFT scan je čist i rezultat nije staging/production. Finalni local subject-i su Webshop `1591c4b15484ba1c9c4cae58d86754bd1b72a57e8d5c9e11267bab1a633f8c6c` i LSA `36abde2ad97f3584b997fec5192ca7d1efdbd6aa7c32f871da6ada5c62efb41a`. `acceptance:private-packages` bez trajne authority reference, `:invariants` bez staging DB referenci i strogi `acceptance` bez staging konfiguracije namerno fail-closed. Lokalni/component dokaz nije zamena za staging E2E PASS.

Završna verifikacija je test-first zatvorila centralni build request-boundary problem, pogrešno `subscription_created -> active` mapiranje, IPv4-mapped IPv6 SSRF klasifikaciju, chunked/raw-byte response bound i DNS preflight-to-connection pin. Dodatni sentinel je reprodukovao da fulfillment/catalog raw `fetch` pozivi zaobilaze zajednički guard; oba toka sada koriste guarded, DNS-pinned i size-bounded fetch granicu. Next 16.2.6 build je zatim reprodukovao `Encountered unexpected file in NFT list` iz `lib/file-storage.ts`; leaf filesystem pozivi su označeni `turbopackIgnore` markerima, root build je ponovljen sa EXIT 0 bez warning-a, a harness sada fail-closed zahteva NFT manifeste i odbija `.private`, `.env` ili `next.config.*`. Harness regresije su 15/15. Regenerisani Webshop 344-module paket prolazi 110/110 i clean host proveru.

**Očekivani rezultat:** sve komande exit `0`; production dependency audit vraća `found 0 vulnerabilities`; oba addon builda proizvode `dist`, release manifest, package SHA-256 i provenance; 18/18 staging E2E i svih 14 dodatnih scenarija prolaze; fresh/upgrade/rerun/interrupted/checksum/failure/rollback matrica prolazi; svih sedam versioniranih drill-ova imaju run ID, alert dokaz, RPO/RTO i nula neobjašnjenih invariant rezultata.

**Metrike:** test pass/fail, dependency severity, artifact checksum/provenance, E2E pass count, migration matrix, RPO/RTO, queue/DLQ i reconciliation delta.

**Maksimalno vreme posmatranja:** nema time-based waiver-a. Ako gate nije zelen pre change freeze roka, rollout window se otkazuje.

**Backup/restore tačka:** nema production backup-a; koriste se isključivo staging/ephemeral baze.

**Rollback/kill-switch:** nema production promene. Popravka ili novi release candidate.

**Dozvola:** nije potrebna za lokalni dokaz; provisioning ili promena staging spoljnog sistema zahteva zasebnu staging autorizaciju. Current code/contract rezultat je lokalno PASS, ali je rollout R-1 FAIL jer `gateEligible=false`, staging nije izvršen i trajna release authority nije provisionovana.

### Gate 0 — production identity, freeze, immutable backup i restore dokaz

**Preconditions:** R-1 PASS; potpisan release candidate; pinovani centralni i CMS DB resource ID; pinovani deployment project/team; tačne provider snapshot/PITR i restore komande u change record-u; credential fingerprint matrica bez reuse-a; change freeze i imenovani incident commander.

**Tačne komande:** najpre izvršiti versioned target wrapper odvojeno za centralnu i CMS sesiju. Provider backup/restore komanda trenutno **ne postoji u repozitorijumu** i zato Gate 0 ostaje blokiran dok operator ne upiše i staging drill-om ne dokaže tačan oblik:

```text
CENTRAL_BACKUP_CREATE_COMMAND=<nije definisano; mora vratiti immutable backup ID>
CMS_BACKUP_CREATE_COMMAND=<nije definisano; mora vratiti immutable backup ID>
ISOLATED_RESTORE_COMMAND=<nije definisano; target ne sme biti production DB>
```

Generički `pg_dump` nije zamena za nepoznatu provider snapshot/PITR politiku. Secret nikada nije CLI argument.

**Očekivani rezultat:** dva immutable backup ID-ja, timestamp i checksum/metadata; zabeleženi centralni i CMS migration ledger watermarks; uspešan restore u novu izolovanu bazu; read-only smoke i cross-service reconciliation bez neobjašnjenog delta; potvrđeni RPO/RTO.

**Metrike:** backup duration/size, WAL/PITR lag, restore duration, DB pool/lock wait, reconciliation delta, migration ledger drift.

**Maksimalno vreme posmatranja:** 2 sata. Ako backup ili restore dokaz nije završen u okviru odobrenog window-a, nema nastavka.

**Backup/restore tačka:** `B0-CENTRAL` i `B0-CMS`; ovo su osnovne rollback tačke za sve sledeće gate-ove.

**Rollback/kill-switch:** nema aplikacione promene; zatvoriti production sesije i otkazati window. Backup-e zadržati po postojećoj politici, bez njene izmene.

**Dozvola:** **A0 — prva eksplicitna production dozvola**, za read-only pristup, freeze i kreiranje backup/snapshot/isolated restore resursa.

### Gate 1 — monitoring i alerting pre promene

**Preconditions:** Gate 0 PASS; svi dashboard-i i alerti postoje kao versioned konfiguracija; on-call i escalation put su potvrđeni; sintetički probe ne koristi secret u URL-u.

**Tačne komande:** repo nema monitoring-provider provision komandu; ona mora biti pinovana pre A1. Read-only health probe centralnog servisa je:

```powershell
$response = Invoke-WebRequest `
  -Uri "$env:NRLS_PRODUCTION_BASE_URL/api/v1/health" `
  -UseBasicParsing `
  -TimeoutSec 10
if ($response.StatusCode -ne 200) { throw "Vendor health probe failed" }
```

CMS origin probe koristi samo HTTPS origin i nema query secret. Authenticated probes koriste `Authorization` header iz secret store-a.

**Očekivani rezultat:** 24h čiste baseline telemetrije i test alert za svaku obaveznu klasu: webhook/payment lag, fulfillment queue/DLQ, paid-without-license, refund/chargeback-without-revoke, central scope/idempotency/signature, activation/replay/brute-force, signing-key expiry, DB pool/migration drift i nonce cleanup.

**Metrike/threshold:** health availability 100%; probe p95 < 1 s; DB pool < 70%; migration drift 0; DLQ 0; oldest ready job < 5 min; paid-without-license stariji od 15 min = 0; key expiry warning najmanje 30 dana unapred.

**Maksimalno vreme posmatranja:** 24 sata baseline-a; ne nastavljati uz slepi interval ili lažno pozitivan/negativan alert.

**Backup/restore tačka:** B0; monitoring promena ne menja poslovne podatke.

**Rollback/kill-switch:** vratiti prethodnu monitoring konfiguraciju; aplikacioni flagovi ostaju ugašeni.

**Dozvola:** A1 za promenu production monitoring/alerting konfiguracije i probe naloga.

### Gate 2 — centralna baza

**Preconditions:** Gate 1 PASS; centralni target guard, read-only DB state/checksum preflight, advisory locking i failure recovery su implementirani i prošli migration matricu; B0-CENTRAL je validan; aplikacioni V2/signing flagovi su efektivno ugašeni.

**Tačne komande:** budući tok, tek posle R-1/A0/A1 i pinovanog target guard-a:

```powershell
Push-Location D:\nr_cms\.private\license-server
$env:DATABASE_URL = $env:NRLS_PRODUCTION_DATABASE_URL
npm run db:migrate:offline
npm run db:migrate:production:dry-run
# [A2 — DB MUTATION]
npm run db:migrate:production
Pop-Location
```

Centralni `db:migrate:offline`, `db:migrate:dry-run`, `db:migrate:production:dry-run`, `db:migrate:production`, `db:migrate:test` i `test:db` sada postoje. To ne odobrava njihovu production upotrebu: production wrapper i dalje zahteva eksplicitni target/service/host/database/provider resource ID i exact pending listu; raw `npm run db:migrate` nije rollout komanda.

**Očekivani rezultat:** samo unapred odobrene additive migracije `0002_vendor_license_v2`–`0005_vendor_subscriptions_updates`; checksum-i tačno jednaki release manifestu; `adopted=0`; nema dugih lock-ova; stari kod i dalje radi.

**Metrike/threshold:** migration duration < 5 min, lock wait < 15 s, DB errors 0, pool < 70%, ledger drift 0, replication/PITR lag unutar postojećeg SLO-a.

**Maksimalno vreme posmatranja:** 30 min posle apply-a. Svaki nepoznat ledger red ili lock timeout zaustavlja rollout.

**Backup/restore tačka:** B0-CENTRAL plus migration-start timestamp/WAL watermark.

**Rollback/kill-switch:** ne pokretati down migraciju. V2 ostaje off; koristiti forward-fix ako je bezbedan, inače restore B0-CENTRAL po incident odluci i reconcile događaje od watermark-a.

**Dozvola:** A2 neposredno pre jedine DB-mutating komande.

### Gate 3 — Vendor License Service

**Preconditions:** Gate 2 PASS; immutable service artifact i SHA-256; production config startup guard prolazi; production HMAC klijenti imaju environment/product/action scope; centralni V2 i signing imaju stvarno testirane runtime gate-ove; V1 compatibility odluka dokumentovana.

**Tačne komande za artefakt:** izvršavaju se u CI-u, ne u production shell-u:

```powershell
Push-Location D:\nr_cms\.private\license-server
npm ci
npm run typecheck
npm run test:db
npm run build
npm audit --omit=dev --audit-level=low
Pop-Location
```

Production deploy komanda nije pinovana u repozitorijumu. Pre A3a change record mora sadržati tačan platform project/team/resource ID, immutable artifact SHA i tačan deploy/rollback command. Posle dark deploy-a:

```powershell
$response = Invoke-WebRequest `
  -Uri "$env:NRLS_PRODUCTION_BASE_URL/api/v1/health" `
  -UseBasicParsing `
  -TimeoutSec 10
if ($response.StatusCode -ne 200) { throw "Dark deploy health failed" }
```

Najpre deploy sa V2 i novim signing tokom efektivno ugašenim; zatim A3b uključuje V2 samo za jedan unapred provisionovan canary client/scope. Ne oslanjati se na flag koji nema runtime consumer.

**Očekivani rezultat:** health 200; stari contract bez regresije; neodobren V2 route/client dobija 404/401/403 po contract-u; canary client može samo odobren product/action/environment; isti idempotency key + isti payload vraća isti rezultat, različit payload 409.

**Metrike/threshold:** 5xx < 1%, p95 < 1 s, neočekivani 401/403 = 0, idempotency conflict za isti payload = 0, scope escape = 0, duplicate business entitlement = 0, DB pool < 70%.

**Maksimalno vreme posmatranja:** 60 min immediate dark/canary probe, zatim najviše 24 h do go/no-go odluke.

**Backup/restore tačka:** B0-CENTRAL; novi pre-deploy release ID i prethodni immutable service artifact.

**Rollback/kill-switch:** onemogućiti V2 route/client, pauzirati issue/activation/update, vratiti prethodni schema-compatible artifact; ne brisati durable idempotency/event podatke.

**Dozvola:** A3a za dark deploy/config; A3b za V2 route/client enable.

### Gate 4 — CMS/Webshop baza i dark code

**Preconditions:** Gate 3 PASS; CMS runner hard-fail-uje mismatch i zabranjuje production adopt/repair; dry-run pokazuje samo odobrene `0080`–`0088`; B0-CMS validan; webhook intake ostaje dostupan; checkout je pauziran.

**Tačne komande:** budući tok posle runner popravke:

```powershell
Set-Location D:\nr_cms
$env:DATABASE_URL = $env:CMS_PRODUCTION_DATABASE_URL
npm run db:migrate:production:dry-run
# [A4a — DB MUTATION]
npm run db:migrate:production
```

Očekivani dry-run sadrži isključivo `0080`–`0088`, bez `adopt` ili checksum mismatch. Dark artifact se gradi u CI-u:

```powershell
Set-Location D:\nr_cms
npm ci
npm run deploy:verify
npm run lint
npm run typecheck
npm run test -- --test-concurrency=1
npm run build
```

Production deploy komanda/project ID nisu pinovani i moraju biti dopisani pre A4b. Deploy ima checkout off, provider webhook intake on i sve remediation behavior flagove off.

**Očekivani rezultat:** `0080`–`0088` applied, `adopted=0`, stari tok kompatibilan, CMS health/render prolazi, webhook endpoint odgovara, nijedan worker ne claim-uje novi V2 posao.

**Metrike/threshold:** migration < 5 min, lock wait < 15 s, DB error 0, CMS 5xx < 1%, webhook 5xx = 0 za validne probe, pool < 70%, ledger drift 0.

**Maksimalno vreme posmatranja:** 30 min za migraciju i 60 min za dark deploy; najviše 24 h do narednog gate-a.

**Backup/restore tačka:** B0-CMS plus migration-start watermark; prethodni schema-compatible CMS artifact.

**Rollback/kill-switch:** checkout ostaje off; V2 flagovi off; vratiti prethodni schema-compatible artifact. Additive kolone/tabele ostaju. Restore B0-CMS samo po incident odluci, zatim cross-service reconciliation od watermark-a.

**Dozvola:** A4a za CMS DB mutation; A4b za CMS dark deploy/config.

### Gate 5 — payment webhook V2

**Preconditions:** Gate 4 PASS; provider sandbox E2E je prethodno prošao; live credential fingerprint-i nisu staging credential-i; live endpoint/account ručno potvrđeni; V2 shadow comparator ima 100% slaganje i ne menja business state; internal allowlist ili izolovan production canary projekat postoji. Trenutno nijedan spoljni provider/staging uslov nije dokazan.

**Tačne komande:** provider webhook/config i production env deploy komande nisu pinovane; gate je blokiran dok nisu zapisane. Promena mora postaviti `WEBSHOP_PAYMENT_STATE_V2=true` samo u canary obuhvatu. Real-money checkout ostaje off do A10.

Read-only probe ili provider resend koristi HTTPS endpoint, potpisani header/body i nikada secret/query token. Ne šalje se ručno falsifikovan production event.

**Očekivani rezultat:** signature verifikacija pre OAuth/network poziva; normalized event tačno jednom menja stanje; duplikat je no-op; refund/chargeback ostaje terminalan posle delayed success; amount/currency mismatch je odbijen i auditovan.

**Metrike/threshold:** valid webhook p95 lag < 60 s, signature failure za validan event = 0, provider OAuth/network call za nevalidan potpis = 0, duplicate business transition = 0, terminal regression = 0, amount mismatch = 0, webhook 5xx < 1%.

**Maksimalno vreme posmatranja:** 60 min aktivnog probe/resend testa i najviše 24 h soak-a.

**Backup/restore tačka:** B0-CMS/B0-CENTRAL i payment inbox/order/event watermarks neposredno pre enable-a.

**Rollback/kill-switch:** `WEBSHOP_CHECKOUT_ENABLED=false`; vratiti payment V2 behavior flag tek ako legacy compatibility test prolazi; webhook intake i durable inbox ostaju aktivni; ne brisati evente.

**Dozvola:** A5 za live provider/webhook config i V2 enable. Credential rotation nije uključena u A5.

### Gate 6 — fulfillment worker

**Preconditions:** Gate 5 PASS; centralni V2 issue contract aktivan samo za scoped canary client; dedicated `WEBSHOP_LICENSE_ISSUE_CRON_SECRET` bez `CRON_SECRET` fallback-a; durable outbox/lease/stale-worker/DLQ/response-loss i queue recovery E2E prolaze; worker scheduler identity je pinovan.

**Tačne komande:** scheduler u `vercel.json` poziva `/api/cron/webshop-license-issues` na pet minuta. Pre canary-ja queue mora biti prazna; jednokratni kontrolisani no-op claim koristi header, nikad URL:

```powershell
$headers = @{ Authorization = "Bearer $env:WEBSHOP_LICENSE_ISSUE_CRON_SECRET" }
Invoke-RestMethod `
  -Method Post `
  -Uri "$env:CMS_PRODUCTION_BASE_URL/api/cron/webshop-license-issues" `
  -Headers $headers `
  -TimeoutSec 30
```

Ova komanda je dozvoljena tek kada je `WEBSHOP_LICENSE_OUTBOX_V2=true` za canary obuhvat i očekivani queue depth je nula. Cron secret se ne loguje. Prvi stvarni production posao nastaje tek u Gate 10.

**Očekivani rezultat:** pre-canary poziv vraća `claimed=0` i ne menja poslovne podatke. LOCAL contract/drill dokaz potvrđuje da jedan posao dobija jedan lease, jedan centralni entitlement i jedan encrypted local result; response loss/retry vraća isti entitlement; stale worker ne može završiti tuđ lease; nema plaintext licence u koloni/snapshot/logu. Ovaj rezultat ima `gateEligible=false`; isti tok mora tek proći na stagingu.

**Metrike/threshold:** ready queue oldest < 5 min, processing preko lease TTL = 0, DLQ = 0, retry storm = 0, central 409 za isti payload = 0, paid-without-license stariji od 15 min = 0, duplicate entitlement/delivery = 0.

**Maksimalno vreme posmatranja:** 2 h kontrolisanog worker testa i najviše 24 h soak-a.

**Backup/restore tačka:** B0 plus outbox/operation/idempotency watermarks pre prvog claim-a.

**Rollback/kill-switch:** zaustaviti scheduler claim i postaviti checkout off; sačuvati queue, lease istoriju i idempotency keys; ne prebacivati u legacy plaintext fulfillment. Requeue samo `failed` ili dokazano stale poslove po runbook-u.

**Dozvola:** A6 za worker flag/scheduler enable i prvi production claim.

### Gate 7 — signing i public key set

**Preconditions:** Gate 6 PASS; production vendor key ima zaseban `kid`, purpose, created/active/verify-only/retired metadata i expiry alert; privatni ključ je u odobrenom KMS/secret store-u; novi public key je unapred pinovan u CMS i centralnom verification set-u; old/new overlap i compromise testovi prolaze. Customer issuer key ostaje lokalni i nikada se ne šalje centrali.

**Tačne komande:** key generation/provision komanda zavisi od odobrenog KMS-a i nije u repozitorijumu; mora biti pinovana pre A7. Nema `openssl` ad-hoc production privatnog ključa niti console output-a. Public set se proverava fingerprint-om i `kid`-om pre signer switch-a.

Redosled je: (1) kreirati novu verziju, (2) prepublish public key, (3) proveriti old+new verification, (4) prebaciti signer na novi `kid`, (5) držati stari ključ verify-only, (6) povlačenje starog ključa je zasebna kasnija dozvola.

**Očekivani rezultat:** novi tokeni nose novi `kid`; stari i novi validni tokeni prolaze tokom overlap-a; pogrešan issuer/audience/installation/signature se odbija; privatni ključ nije u CMS-u, addonu, browser bundle-u ili logu.

**Metrike/threshold:** unknown `kid` = 0, signature failure validnog tokena = 0, issuer/audience/install mismatch za validan tok = 0, key expiry > 30 dana, revalidation success > 99%, neočekivan offline grace = 0.

**Maksimalno vreme posmatranja:** 24 h posle signer switch-a za immediate go/no-go; verification overlap ostaje najmanje 22 dana (7 dana token TTL + 14 dana grace + 1 dan safety) ili duže ako konfigurisan policy ima veći prozor. Stari ključ se ne retire-uje u ovom rollout-u.

**Backup/restore tačka:** B0 plus encrypted key-version export/metadata backup i testiran restore fingerprint; nikada plaintext key dump.

**Rollback/kill-switch:** vratiti signer na prethodni još-aktivan `kid`; oba public key-a ostaju pinovana. Ako je kompromitacija, pauzirati issue/activation/update i slediti emergency compromise runbook — običan rollback nije dovoljan.

**Dozvola:** A7 za kreiranje/provision production key verzije, public-set promenu i signer switch. Old-key retirement nije odobren A7.

Napomena: production customer consumer kriptografski proverava entitlement bez obzira na vrednost `VENDOR_SIGNED_ENTITLEMENTS_V1`; flag nije dozvoljeni bypass niti license kill-switch. Centralni signer state i production key switch i dalje zahtevaju A7.

### Gate 8 — addon paketi i registry

**Preconditions:** Gate 7 PASS; private root coupling uklonjen; package/source verzija ima jedan source of truth; frozen build proizvodi immutable package, manifest, SBOM/checksum/provenance; public build bez `.private` prolazi; package compatibility/rollback matrica prolazi; registry/project ID pinovani.

**Tačne komande za release candidate:** u čistom private CI-u sa `NR_ADDON_RELEASE_SIGNING_KEY_FILE`, `NR_ADDON_RELEASE_SIGNING_KID` i `NR_ADDON_RELEASE_PUBLIC_KEYS_FILE` referencama, bez key vrednosti u CLI/output-u:

```powershell
Push-Location D:\nr_cms\.private\webshop
npm ci
npm run build
npm run pack:verify
Pop-Location

Push-Location D:\nr_cms\.private\license-server-addon
npm ci
npm run build
npm run pack:verify
Pop-Location
```

Privatni runtime capability-ji i kriptografska build/provenance granica su lokalno završeni. Webshop prolazi 110/110, payment DB 2/2 i clean Next host sa 344 modula; subject je `1591c4b15484ba1c9c4cae58d86754bd1b72a57e8d5c9e11267bab1a633f8c6c`, canonical local tgz `a2ef9f66d44034bf8f5aea9ed8fc6dc60a782fbed7496d041b1bca77e739ad92`, a aggregate ephemeral tgz `3e0d4ca14d8a838b785d24f46d1dd234a6b79fb5577d9b3d88ac2f25f5adc4fa`. LSA ima 31 pass + 1 DB skip, dedicated DB-local 32/32, subject `36abde2ad97f3584b997fec5192ca7d1efdbd6aa7c32f871da6ada5c62efb41a` i aggregate ephemeral tgz `93a79591aaec397b22e82b2606debd433ce48fb398293ab818e5a4574c40cd4b`. Efemerna lokalna authority dokazuje potpisni pipeline, ali nije promotable. Gate 8 zato ostaje rollout **FAIL** dok oba artefakta nisu potpisana trajnom authority i dok registry publish/install komanda nije pinovana sa namespace-om, digestom i authority-provenance verifikacijom. CMS loader koristi build-time `addons.registry.json`, ne env module path.

**Očekivani rezultat:** registry digest odgovara odobrenom SHA-256; CMS deploy nema private source; instalacija za jednu allowlisted internu instalaciju ide `install_pending -> ready`; package name/version/hash/contract/compatibility su tačni.

**Metrike/threshold:** checksum/provenance mismatch = 0, package load failure = 0, install pending > 15 min = 0, migration drift = 0, public-to-private import = 0, browser secret/license scan = 0.

**Maksimalno vreme posmatranja:** 2 h po paketu i najviše 24 h posle oba interna install-a.

**Backup/restore tačka:** B0-CMS, prethodni registry manifest/digest i prethodni schema-compatible package artefakt.

**Rollback/kill-switch:** `WEBSHOP_INSTALL_MODE=disabled` / `LICENSE_SERVER_INSTALL_MODE=disabled`, checkout off, vratiti prethodni immutable registry mapping i redeploy samo ako schema compatibility matrica dozvoljava. Ne koristiti env module path.

**Dozvola:** A8 za registry publish, registry mapping, install/redeploy i package promotion.

### Gate 9 — activation i revalidation

**Preconditions:** Gate 8 PASS; activation atomically enforce-uje limit/installation binding; clone/package mismatch/forged/offline grace E2E prolaze; HTTPS/SSRF/DNS-rebinding/timeout zaštita pokriva sve centralne pozive; dedicated entitlement cron secrets bez generic fallback-a.

**Tačne komande:** authenticated activation/revalidation smoke tool trenutno nije versioned u repozitorijumu i mora biti dodat pre A9. Pozivi šalju secret/token u header/body, nikad URL. Webshop entitlement scheduler je `/api/cron/webshop-entitlement`; License Server entitlement scheduler mora imati zaseban endpoint/secret i dokazanu konfiguraciju.

**Očekivani rezultat:** jedna installation identity; važeći potpisani entitlement validan; clone/forged/package mismatch odbijen; central outage ulazi samo u bounded grace; revoke postaje invalid na sledećoj kontrolisanoj revalidaciji.

**Metrike/threshold:** activation/revalidation p95 < 1 s bez centralnog network dela i unutar outbound timeout-a sa njim; replay = 0; valid signature failure = 0; brute-force alert radi; activation-limit race violation = 0; cache age nikada preko policy grace-a.

**Maksimalno vreme posmatranja:** 24 h aktivnog smoke-a plus kompletan konfigurisani offline-grace prozor za outage test pre šireg rollout-a.

**Backup/restore tačka:** B0-CENTRAL/B0-CMS plus entitlement/activation/installation watermarks i key-set fingerprint.

**Rollback/kill-switch:** pauzirati nove activation/update pozive, ostaviti poslednji kriptografski validan cache samo do bounded grace-a, vratiti prethodni schema-compatible package. Ne prihvatati unsigned fallback.

**Dozvola:** A9 za activation/revalidation enable i kontrolisani production probe.

### Gate 10 — prvi interni production canary

**Preconditions:** Gate 9 PASS; nema Critical/High blockera; jedan internal customer/product/SKU/installation je allowlisted ili izolovan; cena/valuta i refund fee su unapred odobreni; incident commander i provider operator su online; checkout nije globalno dostupan; svi watermarks/dashboards su otvoreni.

**Tačan scenario:** detaljan je u odeljku 7. Za izvršenje se koristi normalan browser/provider tok; secret/license se ne stavlja u URL ili ručni log.

**Očekivani rezultat:** tačno jedan order, payment transition, fulfillment operation, vendor entitlement i customer delivery; zatim validna revalidation, puni refund sa automatskim revoke-om, invalid revalidation, idempotentni eksplicitni revoke i delayed-success replay bez reaktivacije.

**Metrike/threshold:** checkout/webhook lag < 60 s; paid-to-license < 5 min; paid-without-license preko 15 min = 0; duplicate entitlement/delivery = 0; revoke-to-invalid revalidation < 5 min nakon forsiranog probe-a; refund/chargeback-without-revoke = 0; secret/PII sentinel hit = 0; 5xx = 0 za canary tok.

**Maksimalno vreme posmatranja:** 2 h aktivnog scenarija, 24 h immediate soak, ukupno 72 h pre bilo kakve odluke o širenju.

**Backup/restore tačka:** B0 baze i neposredni canary watermarks. Canary podaci se ne brišu; ostaju audit/reconciliation dokaz.

**Rollback/kill-switch:** odmah checkout off; worker claims pause uz očuvan queue; V2 client/scope off; activation/update pause; vraćanje prethodnih schema-compatible artefakata. Webhook intake i refund/revoke reconciliation ostaju aktivni.

**Dozvola:** A10 za real-money internal order, provider refund/resend, production revoke i production revalidation. Širenje van jednog canary-ja zahteva novu odluku A11 i nije deo ovog plana.

## 6. Redigovana environment checklist-a

Checklist beleži samo `present/absent`, secret version, `kid`, owner, expiry i fingerprint dokaz. Vrednosti se nikada ne kopiraju u tiket ili ovaj dokument.

### 6.1 Rollout shell — nije aplikacioni env

- [ ] `NR_ROLLOUT_TARGET=production`
- [ ] `NR_ROLLOUT_CHANGE_ID` postoji
- [ ] očekivani CMS DB host/name/resource ID potvrđeni
- [ ] očekivani centralni DB host/name/resource ID potvrđeni
- [ ] deployment project/team/resource ID potvrđeni za oba servisa
- [ ] release artifact SHA-256 i provenance potvrđeni
- [ ] `TEST_DATABASE_URL` odsutan
- [ ] `NRLS_TEST_DATABASE_URL` odsutan
- [ ] lokalni `.env` nije učitan

### 6.2 Centralni Vendor License Service

- [ ] `NODE_ENV=production`
- [ ] `NRLS_ENVIRONMENT=production`
- [ ] `DATABASE_URL` pokazuje samo centralni production resource
- [ ] `NRLS_SECRET_ENCRYPTION_KEY` / `NRLS_SECRET_ENCRYPTION_KID`
- [ ] `NRLS_VENDOR_SIGNING_PRIVATE_KEY` / `NRLS_VENDOR_SIGNING_KID`
- [ ] `NRLS_VENDOR_SIGNING_PUBLIC_KEYS_JSON`
- [ ] `NRLS_RATE_LIMIT_STORE` i dokaz da runtime zaista koristi distribuirani store
- [ ] `NRLS_NONCE_CLEANUP_CRON_SECRET`
- [ ] opciono `NRLS_SESSION_COOKIE`, sa production cookie policy
- [ ] `VENDOR_LICENSE_API_V2` i `VENDOR_SIGNED_ENTITLEMENTS_V1` eksplicitni i usklađeni sa gate-om
- [ ] production API client-i imaju tačan environment/product/action scope i versioned HMAC secret
- [ ] `NRLS_TEST_DATABASE_URL` i svi development placeholder-i odsutni

`NODE_ENV=production` bez `NRLS_ENVIRONMENT=production` nije dovoljno: scope logika inače može pasti na development. `NRLS_RATE_LIMIT_STORE` trenutno je startup marker dok je implementation PostgreSQL; to mora biti dokazano, ne samo postavljeno.

### 6.3 CMS host, registry i outbound

- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` pokazuje samo CMS/Webshop production resource
- [ ] `DATABASE_SSL`, `DATABASE_SSL_REJECT_UNAUTHORIZED`, connection/idle timeout i pool max eksplicitni
- [ ] `NR_ADDON_INSTALLATION_ENCRYPTION_KEY`
- [ ] `NR_VENDOR_ENTITLEMENT_PUBLIC_KEYS_JSON`
- [ ] `IP_HASH_SALT`
- [ ] `APP_URL` / `NEXT_PUBLIC_APP_URL` su jedan odobren HTTPS origin
- [ ] `NRLS_ALLOWED_OUTBOUND_HOSTS` sadrži samo odobrene production hostove
- [ ] `NRLS_ALLOW_SELF_HOSTED_OUTBOUND=false`, osim posebno odobrenog slučaja
- [ ] `WEBSHOP_LICENSE_API_URL` i `LICENSE_SERVER_LICENSE_API_URL` su HTTPS i production host
- [ ] `WEBSHOP_REDEPLOY_WEBHOOK_URL` i `LICENSE_SERVER_REDEPLOY_WEBHOOK_URL` su HTTPS, allowlisted i bez query secret-a
- [ ] `WEBSHOP_PLATFORM_ATTESTATION_TOKEN`/`WEBSHOP_VERCEL_OIDC_TOKEN` i `LICENSE_SERVER_PLATFORM_ATTESTATION_TOKEN`/`LICENSE_SERVER_VERCEL_OIDC_TOKEN` su production audience/resource
- [ ] redeploy callback ima zasebnu versioned autentikaciju; package install token nije redeploy secret
- [ ] `WEBSHOP_PACKAGE_TOKEN`/`LICENSE_SERVER_PACKAGE_TOKEN` imaju dokazani consumer ili su uklonjeni iz rollout contract-a
- [ ] build-time `addons.registry.json` digest odgovara odobrenom manifestu
- [ ] `WEBSHOP_ADDON_MODULE` i `LICENSE_SERVER_ADDON_MODULE` odsutni

### 6.4 Eksplicitni početni state i kill-switch-evi

- [ ] `WEBSHOP_CHECKOUT_ENABLED=false` pre A10
- [ ] `WEBSHOP_STOREFRONT_ENABLED`/canary vidljivost je eksplicitna, ne oslanja se na default
- [ ] `WEBSHOP_INSTALL_MODE=disabled` i `LICENSE_SERVER_INSTALL_MODE=disabled` pre A8
- [ ] `WEBSHOP_PAYMENT_STATE_V2=false` pre A5
- [ ] `WEBSHOP_LICENSE_OUTBOX_V2=false` pre A6
- [ ] `VENDOR_LICENSE_API_V2=false` pre A3b
- [ ] `VENDOR_SIGNED_ENTITLEMENTS_V1` centralni issuance state je eksplicitno dokumentovan; vrednost `false` ne isključuje customer-side signature verification
- [ ] `WEBSHOP_ENABLED` i `LICENSE_SERVER_ENABLED` state je eksplicitno dokumentovan
- [ ] `WEBSHOP_ALLOW_LOCAL_DEV_INSTALL=false` i `LICENSE_SERVER_ALLOW_LOCAL_DEV_INSTALL=false` ako ih release još parsira
- [ ] webhook intake ostaje aktivan za postojeće obaveze kada je checkout off

Webshop/LSA production `enabled`, checkout/storefront i install mode default-i su fail-closed. Vrednosti se ipak eksplicitno pin-uju radi auditabilnosti. `ADDON_INSTALL_RECONCILIATION_V1`, `ADDON_SDK_V1` i centralni issuance flag nisu zamena za kriptografsku verification granicu.

### 6.5 Webshop namenski secrets

- [ ] `WEBSHOP_LICENSE_SERVER_SECRET_KEY`
- [ ] `WEBSHOP_CART_TOKEN_SALT`
- [ ] `WEBSHOP_DOWNLOAD_TOKEN_SECRET`
- [ ] `WEBSHOP_DOWNLOAD_EVENT_HASH_SECRET`
- [ ] `WEBSHOP_LICENSE_ISSUE_CRON_SECRET`
- [ ] `WEBSHOP_ENTITLEMENT_CRON_SECRET`
- [ ] `WEBSHOP_BUY_LINK_SECRET`
- [ ] `WEBSHOP_BANK_REDIRECT_WEBHOOK_SECRET`
- [ ] svaki ima različit fingerprint, purpose, owner, version i expiry/rotation policy
- [ ] `CRON_SECRET` nije fallback ni za jedan addon cron
- [ ] `AUTH_SECRET`, `NEXTAUTH_SECRET` i `CLERK_SECRET_KEY` nisu fallback za cart, buy-link, runtime ili download

### 6.6 Payment provider — samo provider koji je u canary obuhvatu

- [ ] `WEBSHOP_PAYMENTS_MODE=live` tek uz A5/A10; nema sandbox credential-a u production-u
- [ ] `WEBSHOP_PUBLIC_BASE_URL` je konačni HTTPS origin
- [ ] Stripe: `WEBSHOP_STRIPE_SECRET_KEY`, `WEBSHOP_STRIPE_WEBHOOK_SECRET`, opciono `WEBSHOP_STRIPE_API_BASE_URL` samo na službeni live endpoint
- [ ] Paddle: `WEBSHOP_PADDLE_API_KEY`, `WEBSHOP_PADDLE_CLIENT_TOKEN`, `WEBSHOP_PADDLE_WEBHOOK_SECRET`, opciono `WEBSHOP_PADDLE_API_BASE_URL` samo na službeni live endpoint
- [ ] PayPal: `WEBSHOP_PAYPAL_CLIENT_ID`, `WEBSHOP_PAYPAL_CLIENT_SECRET`, `WEBSHOP_PAYPAL_WEBHOOK_ID`, opciono `WEBSHOP_PAYPAL_API_BASE_URL` samo na službeni live endpoint
- [ ] Monri: `WEBSHOP_MONRI_AUTHENTICITY_TOKEN`, `WEBSHOP_MONRI_KEY`, `WEBSHOP_MONRI_CALLBACK_URL`, opciono `WEBSHOP_MONRI_FORM_URL`, `WEBSHOP_MONRI_LANGUAGE`, `WEBSHOP_MONRI_TRANSACTION_TYPE`
- [ ] provider dashboard potvrđuje live account, webhook ID/endpoint i event subscription
- [ ] nijedan payment API secret nije jednak webhook, cron, encryption ili HMAC secret-u

Stripe server key i Paddle server key imaju delimičnu mode proveru; PayPal, Monri i deo Paddle credential-a zahtevaju provider-side dokaz.

### 6.7 Lokalni License Server addon / Customer Issuer

- [ ] `LICENSE_SERVER_SECRET_KEY` samo za deklarisanu encryption namenu
- [ ] `LICENSE_SERVER_RUNTIME_HASH_SECRET` zaseban
- [ ] `LICENSE_SERVER_ENTITLEMENT_CRON_SECRET` zaseban
- [ ] lokalni customer issuer keypair je encrypted, versioned, sa `kid` i public history
- [ ] customer issuer private key backup/export/restore fingerprint je proveren
- [ ] customer issuer private key i customer license podaci nisu poslati centrali
- [ ] LSA HMAC pre-auth limiter je distribuiran i bounded pre nego što se addon uključi

Lokalni secret-boundary test potvrđuje da runtime hash sada zahteva zaseban `LICENSE_SERVER_RUNTIME_HASH_SECRET` i ne pada nazad na `LICENSE_SERVER_SECRET_KEY`, `AUTH_SECRET` ili development literal. LOCAL `customer_issuer_key_rotation_restore` drill prolazi, ali ima `gateEligible=false`; staging provision/rotation dokaz i dalje nedostaje.

### 6.8 Zabranjeno

- [ ] nema development/staging/test DB URL-a, secret-a, signing ključa, HMAC klijenta ili provider credential-a
- [ ] nema `WEBSHOP_LICENSE_KEY`/`LICENSE_SERVER_LICENSE_KEY` u dugovečnom env-u posle encrypted import/activation toka
- [ ] nema secret/license vrednosti u URL-u, redirect-u, snapshot-u, browser bundle-u ili logu
- [ ] nema jednog secret-a za više namena
- [ ] nema plaintext customer/vendor private key export-a
- [ ] nema production komande koja učitava root `.env`

## 7. Prvi interni canary: order → revalidation → refund/revoke → delayed success

Koristi se jedan allowlisted interni nalog, jedan interni product/SKU, jedna installation identity i najniža unapred odobrena nenulta live cena. Cena, valuta, provider fee i odgovorna osoba ulaze u A10 zapis. Ako deterministički allowlist ili izolovan production canary projekat ne postoji, A10 je blokiran.

1. **Pre-snapshot:** zabeležiti samo ID-jeve/fingerprint-e i redacted watermarks: order/event/outbox/operation/entitlement/activation, centralni i CMS ledger, queue depth i current `kid`.
2. **Order:** privremeno omogućiti checkout samo canary identitetu; kupovinu izvršiti normalnim browser/provider tokom. Očekuje se jedan provider event, monotonic `paid`, jedan durable issue operation i jedan stable idempotency key.
3. **Fulfillment:** dozvoliti jedan worker claim. Očekuje se jedan centralni vendor entitlement vezan za postojeći stabilni entitlement/business key, jedan encrypted local secret i fingerprint, jedna customer delivery; order ne postaje completed pre obaveznog fulfillment-a.
4. **Prva revalidation:** aktivirati na odobrenoj installation identity i forsirati revalidation. Potpis, issuer, audience, product/package hash i installation binding moraju biti validni. Log prikazuje samo correlation ID, entitlement ID suffix/fingerprint i `kid`.
5. **Refund i automatski revoke:** kroz odobren live provider tok izvršiti full refund istog order-a. Webhook mora proizvesti tačno jednu refund/revoke lifecycle komandu; entitlement prelazi na revoked, a order na refunded bez ponovnog issue-a.
6. **Druga revalidation:** forsirana revalidation u roku od pet minuta mora vratiti invalid/revoked i lokalno onemogućiti zaštićenu capability.
7. **Eksplicitni revoke:** centralnim scoped admin/API tokom poslati revoke za isti već-revoked entitlement. Operacija mora biti idempotentni no-op, bez drugog lifecycle efekta.
8. **Delayed success/duplicate:** provider resend funkcijom ponoviti originalni success/capture event i refund event. Očekuje se no-op/idempotent obrada: refunded/revoked se ne vraća u paid/active, nema drugog entitlement-a, delivery-ja ili refund-a.
9. **Finalna reconciliation:** uporediti provider total, normalized payment events, local order/item, outbox/operation, central entitlement/event i activation/revalidation. Svaki delta mora biti nula ili dokumentovan bez promene invariant-a.
10. **Observation:** checkout odmah ponovo off. Pratiti 2 h aktivno, 24 h immediate soak i ukupno 72 h. Canary se ne širi automatski.

A10 eksplicitno pokriva real-money order, refund, provider resend, revoke i revalidation samo za navedeni canary. Ne pokriva DNS, secret rotation, globalni provider switch, nove SKU-ove ili opšti rollout.

## 8. Zajednički stop/rollback kriterijumi

Odmah zaustaviti trenutni gate ako se desi bilo šta od sledećeg:

- Critical/High security ili data-integrity nalaz;
- checksum/ledger drift, `adopt`, neodobrena migracija ili DB target mismatch;
- valid webhook/signature/revalidation failure bez objašnjenja;
- refund/chargeback terminal-state regresija ili revoke izostane;
- duplicate entitlement, activation, delivery ili refund;
- queue oldest age > 15 min, DLQ > 0 ili paid-without-license > 15 min;
- secret/license/PII sentinel detektuje vrednost u URL-u, logu, snapshot-u ili browser bundle-u;
- scope escape, cross-client/cross-product pristup ili nepoznat `kid`;
- 5xx ≥ 1% tokom observation prozora ili DB pool ≥ 80% pet minuta.

Rollback redosled: checkout off → stop novih worker claim-ova → onemogući canary API client/route → pauziraj activation/update → vrati prethodni schema-compatible app/package artifact → reconcile durable događaje. Restore baze je incident odluka poslednjeg reda i uvek koristi B0 + oba watermarks; baze se ne vraćaju nezavisno bez cross-service reconciliation plana.

## 9. Operator approval matrica

| Approval | Tačno odobrava | Ne odobrava |
|---|---|---|
| A0 | production read-only sesije, freeze, dva backup-a i izolovan restore | migraciju/deploy/secret rotation |
| A1 | monitoring/alerting/probe config | aplikacioni flag ili provider promenu |
| A2 | centralnu additive DB migraciju | centralni service deploy |
| A3a/A3b | centralni dark deploy, zatim scoped V2 enable | signing rotation ili opšti client pristup |
| A4a/A4b | CMS additive DB migraciju, zatim dark deploy | payment/worker enable |
| A5 | live provider/webhook V2 config za canary obuhvat | real-money order ili credential rotation |
| A6 | worker enable i prvi kontrolisani no-op claim; stvarni claim tek A10 | queue deletion/rewrite |
| A7 | production key version, public set i signer switch | old-key retirement ili emergency revoke |
| A8 | private package publish/registry/internal install | opšti package promotion |
| A9 | activation/revalidation production probe | grace policy proširenje |
| A10 | jedan interni order/refund/revoke/revalidation scenario | globalni checkout ili customer rollout |

## 10. Acceptance za izdavanje canary dozvole

- [ ] Gate R-1 je PASS, bez Critical/High blockera
- [x] LOCAL 18/18 + 14/14 + 7/7 evidence prolazi uz `productionRuntime=false`, `gateEligible=false`
- [ ] 18/18 staging E2E i dodatni scenariji imaju run ID i dokaz
- [x] LOCAL migration/rollback 12x2 i svih 8 invariant upita su zeleni
- [x] Root 287 = 285 pass + 2 DB skip-a; public-copy 287 = 281 pass + 6 očekivanih skip-a
- [x] NFT manifest scan 0 `.private` / 0 `.env` / 0 `next.config.ts`; harness regresije 15/15
- [x] LOCAL oba private build/host testa i public build bez `.private` prolaze
- [ ] oba private artefakta su potpisana trajnom authority i promotable
- [ ] target guard dokazuje service, DB host/name i provider resource ID
- [ ] production/staging/purpose fingerprint matrica nema reuse
- [ ] provider-specific backup/restore, deploy, monitoring i registry komande su pinovane
- [ ] plan i runbookovi imaju odobren release tag/change record i immutable audit lokaciju
- [ ] B0-CENTRAL/B0-CMS restore i reconciliation su dokazani
- [ ] payment/webhook, worker, signing, activation i package kill-switch-evi su stvarni runtime consumer-i i testirani
- [ ] environment checklist je popunjena bez secret vrednosti
- [ ] on-call, incident commander, RPO/RTO i rollback owner su imenovani
- [ ] A0 je posebno izdat; nijedno kasnije odobrenje nije implicitno

Dok ovaj checklist nije kompletan, jedina validna rollout odluka ostaje: **NO-GO; ne pristupati production-u.**
