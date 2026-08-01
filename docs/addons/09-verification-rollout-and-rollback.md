# Faza 09 — Verifikacija, rollout i rollback

> Finalna verifikacija 2026-07-12: **NEUSPEŠAN GATE**. Nijedan od 18 obaveznih scenarija nije izvršen kao staging/production-like end-to-end tok; migration failure/rollback i operator restore/rotation/recovery drill-ovi nisu dostupni. Presuda je **P0 nije završen**. Videti [11-final-verification-report.md](./11-final-verification-report.md).

> Dopuna migration safety 2026-07-12: production runneri sada imaju fail-closed checksum/target/expected-list kod i versioned matrix harness. `npm run db:migrate:matrix` je prvo pravilno odbio rad bez test URL-a, a zatim je `npm run db:migrate:matrix:local` provisionovao isključivo loopback `*_migration_test` baze. CMS matrica je prošla svih osam scenarija; centralni fresh apply, advisory-lock wrapper i read-only checksum dry-run su prošli.
> Dopuna 2026-07-13: matrix plan v1 sada obuhvata svih 12 acceptance slučajeva (fresh, oba upgrade-a, rerun, backfill, conflict, checksum, failure, expand/dual-write i oba rollback-a). Prethodni 8-scenario rezultat ostaje istorijski dokaz; kompletni plan mora se ponovo izvršiti komandom `npm run acceptance:migration` pre zatvaranja gate-a.

> Dopuna acceptance harness 2026-07-13: version `1` harness je dostupan kroz `npm run acceptance:*`. On ima odvojene public-copy, private-package, migration, invariant i redaction gate-ove, a staging E2E/drill prolaz prihvata isključivo preko versioniranog evidence fajla od operator-owned scenario runner-a. Bez staging endpointa, identiteta, provider sandbox identiteta i runner-a harness fail-uje; component/unit rezultat ne može postati E2E PASS.
> Staging acceptance preflight 2026-07-13T06:12:56Z: **HARD FAIL / NOT RUN**. U izvršnom okruženju nisu bili prisutni `NR_ACCEPTANCE_CONFIG_PATH`, staging identity/provider reference ni CMS/central staging DB reference. Zato nisu kontaktirani endpointi, provider, baze, queue, backup niti key store; nema scenario run ID-a, artifact hash-a ili resource ID-a koji bi smeo biti predstavljen kao dokaz. Production nije dodirnut.

## Versioned final acceptance harness (v1)

Pre staging komandi operator preko secret manager-a postavlja samo reference/credential env promenljive (njihove vrednosti se ne stavljaju u CLI, fixture ili output) i postavlja putanju do van-repozitorijumskog JSON-a po šablonu [`night-raven-acceptance.staging.example.json`](./night-raven-acceptance.staging.example.json):

```powershell
$env:NR_ACCEPTANCE_CONFIG_PATH = 'D:\operator-secrets\night-raven-acceptance.staging.json'
```

Za acceptance:invariants secret manager dodatno injektuje NR_ACCEPTANCE_CMS_DATABASE_URL i NR_ACCEPTANCE_CENTRAL_DATABASE_URL; harness potvrđuje samo da su ne-local PostgreSQL staging targeti i ne štampa URL-ove.

Tačne komande su:

```powershell
npm run acceptance:public-copy
npm run acceptance:private-packages
npm run acceptance:redaction
npm run acceptance:migration
npm run acceptance:invariants
npm run acceptance:e2e
npm run acceptance:drills
```

`npm run acceptance` izvršava celu matricu, ali prvo fail-closed validira staging konfiguraciju i zatim koristi samo lokalnu dedicated `*_migration_test` bazu za migracionu matricu. Ne postoji production opcija. `acceptance:e2e` obuhvata svih 18 numerisanih scenarija i dodatne refund/delayed-success, response-loss, parallel issue, stale-worker, chargeback, forged, rotation, outage/grace, clone, mismatch, install-ready, cross-client i customer-local tokove. `acceptance:drills` zahteva dokaz za backup/restore, cross-service reconciliation, key rotation i queue recovery.

## Cilj

Definisati dokaz koji mora postojati pre zatvaranja svake P0/P1 faze i kontrolisan redosled kojim se novi payment, entitlement, activation i addon-install tok puštaju u staging i production.

„Testovi prolaze“ nije dovoljno. Potrebni su contract, PostgreSQL concurrency, failure-recovery, security i production-like E2E dokazi.

## Test okruženja

### Unit/contract

- Bez stvarnih secrets.
- Deterministički clock/random helperi gde je potrebno.
- Redigovani provider fixture payload-i.
- Deljeni HMAC/signature/API schema test vectors u Webshop i centralnom repozitorijumu.

### Integration

- Poseban `TEST_DATABASE_URL` po projektu/test worker-u.
- Stvarna PostgreSQL baza, ne samo mock, za transaction/unique/lock/lease testove.
- Migracije se primenjuju od prazne baze i sa prethodne podržane verzije.
- Test cleanup ne sme pokazivati na development/production bazu.

### Staging E2E

- Odvojeni `nrcms` staging i centralni license-server staging.
- Payment provider sandbox/webhook secrets.
- Staging-only API client/product scopes.
- Staging signing/encryption/installation keys.
- Private package staging channel.
- Distributed limiter/queue iste klase kao production.
- Production-like timeout/serverless concurrency.

### Production canary

- Interni proizvod/kupac i mali allowlist.
- Nema automatskog uključivanja svih SKU-eva.
- Jasni kill switch-evi koji ne gube durable događaje.
- Dashboard i alerti provereni pre prvog canary paymenta.

## Test piramida

| Sloj | Obavezni fokus |
|---|---|
| Pure unit | Reduceri, transition matrix, canonical signature, claim validation, compatibility |
| DB integration | Unique, row lock, advisory lock, lease, concurrent refund/issue/activation |
| Contract | Webshop ↔ centralni API; CMS ↔ addon SDK; signed manifest/entitlement |
| Provider fixture | Stripe/Paddle/PayPal/Monri mapiranje i signature failure |
| E2E | Kupovina, issue, install, activation, renewal, refund, failure recovery |
| Security | IDOR, scopes, replay, forged signature, SSRF, brute-force, secret leakage |
| Migration | Fresh, upgrade, backfill conflict, rerun, failed migration, compatibility rollback |
| Operations | Queue alert, backup/restore, key rotation, central outage, region/timeout |

## Obavezni E2E scenariji

### 1. Uspešna kupovina `webshop` addona

**Setup:** Scoped staging API client; aktivan Webshop SKU; payment sandbox.

**Akcija:** Kupac završava checkout; provider šalje signed capture webhook.

**Očekivano:**

- jedan verified payment event;
- order `paid + processing`, ne odmah completed;
- jedan issue operation sa stabilnim idempotency key-em;
- centralno jedan VendorAddonEntitlement vezan za customer/order/item/payment;
- potpis validan;
- item fulfilled, order completed;
- tačno jedno delivery obaveštenje;
- centralni license ID sačuvan lokalno.

### 2. Uspešna kupovina `license-server-addon`

Kao scenario 1, uz dodatno:

- catalog/SKU addon key odgovara `license-server`;
- install grant koristi tačan package `@nr-cms/license-server` ili konačno dogovoreni jedini identitet;
- redeploy reconciliation završava `ready`;
- addon vendor revalidation prolazi.

### 3. Dupli webhook

Poslati isti signed provider event najmanje dva puta i paralelno. Očekivati jedan inbox red, jednu finansijsku tranziciju, jedan issue i jedno obaveštenje. Svi odgovori provideru su idempotentni.

### 4. Payment uspešan, centralni server nedostupan

Centralni endpoint vraća 503/timeout. Očekivati:

- payment ostaje paid;
- order `processing`, ne completed;
- issue retry sa backoff-om;
- kupac dobija receipt/pending status, ne lažni license delivery;
- recovery posle povratka centrale završava isti issue.

### 5. Licenca kreirana, odgovor izgubljen

Centralni servis commit-uje pa proxy prekida odgovor. Retry mora poslati isti key/hash i dobiti isti entitlement. Centralna tabela ima jedan resurs; Webshop završava fulfillment.

### 6. Ponovljeni idempotency key

- isti key + isti canonical request → isti resource/response;
- isti key + promenjen SKU/domain/order → 409;
- Webshop takav 409 šalje u DLQ/alert, ne generiše novi key.

### 7. Refund

Testirati partial i full:

- partial sa item allocation opoziva samo pogođeni item;
- full refund čuva finansijski ledger, order status i šalje tačno jednu revoke/refund komandu;
- centralni entitlement više nije validan;
- zakasneli success ne oživljava order/licencu.

### 8. Chargeback

- dispute open suspenduje prema politici;
- dispute lost opoziva;
- dispute won ne reaktivira entitlement koji ima drugi refund/revoke razlog;
- duplicate/out-of-order događaji su idempotentni.

### 9. Istek licence

Pomeriti business clock preko `validUntil`:

- nove prodaje/issue/activation/update operacije blokirane;
- existing policy radi kako je potpisano;
- javni CMS ne crash-uje;
- payment reconciliacija i već plaćeni fulfillment ostaju operativni.

### 10. Obnova licence

Successful renewal produžava isti entitlement ID, `validUntil/updatesUntil` i lifecycle version. Ne izdaje novi unrelated key/licencu.

### 11. Opoziv

Centralni admin/API revoke daje signed revoked stanje; sledeća revalidation ga sprovodi. Existing public behavior odgovara policy-ju; package/update/new activation su blokirani.

### 12. Promena domena

Bez transfera novi domen se odbija. Kontrolisani transfer dokazuje novu installation/domain vezu, deaktivira staru prema politici i ostavlja audit oba domena.

### 13. Previše aktivacija

Pokrenuti više paralelnih zahteva od limita. Tačno dozvoljeni broj activation redova postaje active; ostali dobijaju stabilan limit reason. Ponovljena ista instalacija je idempotentna.

### 14. Klonirana CMS instalacija

- DB clone bez installation private key-a se odbija;
- drugi domen sa kopiranim ID-em se odbija/alertuje;
- full DB+secret clone ograničenje je dokumentovano i testira se raspoloživa domain/platform/limit detekcija.

### 15. Centralni server nedostupan tokom grace perioda

Poslednji validan potpisani entitlement omogućava definisane existing funkcije unutar grace-a. Nove rizične operacije poštuju kraći stale limit. Posle grace-a sistem prelazi u dokumentovani degraded/fail-closed režim bez rušenja javnog sajta.

### 16. Nevalidan/falsifikovan odgovor

Izmeniti payload, signature, `kid`, issuer, audience, addon key, installation ID i domain pojedinačno. Svaka varijanta se odbija; lokalni cache se ne prepisuje; security metric/alert nastaje bez secret-a.

### 17. LSA korisnik izdaje licencu za svoj proizvod

Lokalni Webshop/ručni API izdaje CustomerProductLicense kroz lokalni Customer License Issuer. Potvrditi:

- lokalne customer tabele se menjaju;
- centralna Vendor DB se ne menja;
- issuer/prefix/key razlikuju se od Vendor entitlementa;
- activation/validation radi sa customer issuer public key-em.

### 18. Pokušaj pristupa drugom tenant-u/API client-u

- Centralni client A ne može issue/validate/read entitlement klijenta B.
- Lokalni Customer Issuer client bez product scope-a ne može izdavati/čitati drugi product.
- Odgovor ne curi license ID, domain, customer ili expiry metadata.

## Dodatni obavezni scenariji

### Payment i provider

- refund → delayed success;
- full refund → delayed authorization/capture/failure;
- dva partial refund-a istog iznosa;
- isti provider refund kroz više event tipova;
- Paddle pending/approved/rejected adjustment;
- Paddle `transaction_id` naspram adjustment ID-a;
- Stripe delayed payment i dispute open/won/lost;
- PayPal unknown event ignored;
- webhook pre lokalnog završetka payment attempt-a;
- expired Webshop license uz validan refund webhook.

### Worker/concurrency

- 10 paralelnih issue workera;
- process crash posle claim-a;
- process crash posle centralnog commit-a;
- stale worker update;
- lease expiry/recovery;
- 429 Retry-After;
- starvation/stariji failed redovi;
- DLQ/manual retry koristi isti key.

### Activation/signing

- parallel activation limit;
- installation key rotation;
- vendor signing key rotation overlap;
- unknown/revoked `kid`;
- clock skew na obe granice;
- explicit revoke tokom network outage-a;
- domain IDN/trailing dot/port/wildcard/staging/localhost policy.

### Addon/package

- public build bez `.private`;
- empty addon registry;
- package name/addon key mismatch;
- artifact checksum/signature mismatch;
- CMS/runtime/schema incompatibility;
- `install_pending -> deploy -> ready`;
- deployment callback duplikat/timeout;
- addon absent/disabled ne ruši CMS;
- update bez `updatesUntil` prava;
- rollback package koji ne podržava aktuelnu schema-u.

### Security/operations

- HMAC replay/clock skew/path/body/idempotency tampering;
- cross-client/product scope;
- distributed rate limit kroz dve instance;
- random client ID cardinality attack;
- oversized body;
- SSRF loopback/metadata/redirect/DNS scenario;
- sentinel secrets nisu u logu/URL/browser bundle-u;
- `mustChangePassword` direct-route bypass;
- backup/restore i cross-service reconciliation;
- key compromise/emergency rotation tabletop.

## Contract test vectors

Repository-neutral fixture treba da sadrži:

- canonical HMAC V2 input, hash i expected signature;
- catalog request/response;
- issue request/response;
- idempotency replay/conflict;
- lifecycle requeste;
- signed entitlement valid/expired/revoked/unknown-kid primere;
- signed release manifest;
- redigovane provider webhook fixture-e.

I Webshop i centralni CI učitavaju isti fixture package/artifact. Contract nije potvrđen ako oba projekta imaju odvojene testove koji slučajno kodifikuju različite pretpostavke.

## Migration test matrica

Za svaku bazu:

1. Fresh schema od nule.
2. Upgrade sa trenutno poslednje production verzije.
3. Upgrade sa minimum podržane verzije.
4. Migration rerun je no-op ili kontrolisano odbijanje.
5. Promenjen checksum ranije primenjene migracije se odbija.
6. Backfill restart posle pola batch-a.
7. Conflict preflight sprečava unique constraint deployment.
8. Simuliran failure ostavlja konzistentan ledger.
9. Stari code read tokom expand faze.
10. Novi code read tokom dual-write faze.
11. Package rollback preko kompatibilne schema verzije.
12. Nepodržani rollback se odbija pre deploymenta.

Production migration se prvo izvodi nad svežim restore-om production-like backup-a i meri lock/duration.

## SQL/data invariant provere

Finalni nazivi prilagoditi stvarnoj schema-i, ali CI/operativni runbook mora imati ekvivalentne upite koji vraćaju nula redova:

```sql
-- Completed order bez uspešnog obaveznog license fulfillmenta
SELECT orders.id
FROM webshop_orders orders
JOIN webshop_order_items items ON items.order_id = orders.id
WHERE orders.status = 'completed'
  AND items.fulfillment_status NOT IN ('fulfilled', 'not_required');

-- Full refund/chargeback sa željenim aktivnim entitlementom
SELECT issue.id
FROM webshop_license_server_issues issue
JOIN webshop_orders orders ON orders.id = issue.order_id
WHERE orders.payment_status IN ('refunded', 'chargeback')
  AND issue.desired_status = 'active';

-- Stale processing lease bez recovery obrade
SELECT id
FROM webshop_license_server_operations
WHERE status = 'processing'
  AND lease_expires_at < now();

-- Centralni duplicate business entitlement
SELECT api_client_id, order_item_ref, sku_id, count(*)
FROM licenses
WHERE order_item_ref IS NOT NULL
GROUP BY api_client_id, order_item_ref, sku_id
HAVING count(*) > 1;

-- Activation limit prekoračen
-- Implementirati query po stvarnom entitlement/policy modelu.
```

## Evidence paket po fazi

Svaki PR/release treba da sačuva:

- link na fazni dokument i checked checklist;
- listu promenjenih modula/migracija;
- preflight/backfill broj redova i konflikata;
- test komande i rezultat;
- contract fixture verziju;
- staging E2E run ID/screenshots/log correlation ID bez secrets;
- migration duration/lock rezultat;
- security scans/audit rezultat;
- feature flag state;
- dashboard/alert dokaz;
- rollback test i rezultat;
- poznata ograničenja.

## Rollout redosled

### Gate 0 — Zamrzavanje rizika

- Ne puštati stvarnu prodaju.
- Napraviti backup i restore test.
- Uvesti minimalne queue/payment metrike i redaction.
- Zabeležiti aktuelne schema/migration hash vrednosti.

### Gate 1 — Centralna additive osnova

- Deploy scopes, idempotency, lifecycle/event i activation tabele.
- Legacy API ostaje compatibility put.
- Staging contract testovi.

### Gate 2 — Webshop additive payment/fulfillment schema

- Deploy inbox/refund/dispute/operations/lease kolone i tabele.
- Backfill/dry-run reconciliation.
- Nema još novog side-effect workera.

### Gate 3 — Payment V2

- Shadow normalized reducer.
- Provider fixture/replay test.
- Uključiti `WEBSHOP_PAYMENT_STATE_V2` za staging/canary.
- Ne uključivati public checkout dok refund/out-of-order scenariji ne prođu.

### Gate 4 — Centralni API V2 i fulfillment worker

- Uključiti scoped catalog/issue/lifecycle.
- Prebaciti jedan interni SKU.
- Uključiti `WEBSHOP_LICENSE_OUTBOX_V2`.
- Test 503, response loss, refund u letu i DLQ.

### Gate 5 — Signing/activation/revalidation

- Objaviti verification key set.
- Dual-accept legacy/novi token.
- Migrirati activation JSON.
- Uključiti Webshop i LSA revalidation.
- Sačekati puni planirani grace/rotation prozor pre gašenja legacy-ja.

### Gate 6 — Package/install granica

- Public build bez `.private`.
- Objavljeni immutable private package-i.
- Reconciliation i package checksum.
- Interni managed install oba addona.

### Gate 7 — P0 production canary

- Jedan interni paid sandbox/low-risk real transaction prema poslovnoj odluci.
- 24–72 h posmatranje queue/event/security metrika.
- Ručni refund i revoke test sa kontrolisanim orderom.
- Tek zatim ograničen prvi kupac.

### Gate 8 — P1

- SDK/migrations.
- Distributed security/operations.
- Subscriptions/update rights/customer issuer.
- General availability tek posle njihovih acceptance kriterijuma.

## Kill switch i rollback matrica

| Problem | Bezbedna neposredna akcija | Ne raditi |
|---|---|---|
| Payment reducer pogrešan | Pauzirati novi checkout; nastaviti durable webhook inbox | Ne odbacivati provider webhook |
| Fulfillment worker pravi greške | Zaustaviti nove claim-ove; zadržati queue | Ne generisati nove idempotency key-eve |
| Centralni API V2 regresija | Prebaciti na kompatibilni read/adapter samo ako lifecycle ostaje očuvan | Ne brisati V2 evente/entitlemente |
| Signing greška | Pauzirati nove activation/update; koristiti poslednji validni cache unutar grace-a | Ne prihvatati nepotpisan odgovor |
| Compromised signing/secret key | Opozvati key, emergency rotate, pauzirati rizične operacije | Ne vraćati kompromitovan key |
| Addon package regresija | Rollback na prethodni immutable package samo ako schema kompatibilna | Ne raditi DB down rollback naslepo |
| Migracija neuspešna | Držati addon van `ready`, core dostupan; forward-fix/restore prema runbook-u | Ne označiti migration applied ručno bez dokaza |
| Rate-limit store outage | Endpoint-specific fallback politika | Ne blokirati validne payment webhook obaveze |

## Finalna production checklist-a

### P0

- [ ] Svi P0 gates iz `README.md` dokazani.
- [ ] 18 obaveznih E2E scenarija prolaze.
- [ ] Payment permutation/concurrency suite prolazi bez flake-a.
- [ ] Centralni issue/idempotency/scope suite prolazi.
- [ ] Activation/signing/grace suite prolazi.
- [ ] Public build bez `.private` prolazi.
- [ ] Managed install oba addona završava `ready`.
- [ ] Refund/chargeback centralno opoziva entitlement.
- [ ] Queue/DLQ/security alerti su aktivni.
- [ ] Backup restore i rollback su testirani.

### P1

- [ ] Oba addona koriste SDK V1 bez root `@/` aliasa.
- [ ] Addon migration ledger i compatibility checks rade.
- [ ] Distributed rate limit, nonce cleanup i key rotation rade.
- [ ] Secrets nisu u URL/log/browser artefaktima.
- [ ] Centralni admin hardening završen.
- [ ] Subscription/update entitlement reducer testiran ako se nude subscription SKU-evi.
- [ ] Customer Issuer ima zaseban key/issuer/scope i backup recovery.
- [ ] Dependency/supply-chain i operations runbookovi odobreni.

## Konačni release kriterijum

Prva stvarna prodaja je dozvoljena tek kada je P0 checklist-a kompletna i nema otvorenog Critical/High nalaza koji može:

- pogrešno prikazati finansijsko stanje;
- izdati duplu licencu;
- ostaviti refundovanu licencu aktivnom;
- isporučiti ključ posle refund-a/chargeback-a;
- dozvoliti cross-client issuance/validation;
- prihvatiti falsifikovan entitlement;
- trajno zaglaviti plaćeni order bez vidljivog recovery-ja;
- uključiti private source kao obavezni deo javnog CMS build-a.

## Migration Safety Record — 2026-07-12

CMS `scripts/run-drizzle-migrations.mjs` više ne toleriše checksum mismatch,
ne popravlja/adoptuje postojeći ledger i production režim zahteva
`--production`, `NR_MIGRATION_TARGET=production`, service/host/database/provider
resource ID guard i exact `NR_MIGRATION_EXPECTED_LIST`. `db:migrate:dry-run`
izvršava read-only preflight i kada je `DRIZZLE_AUTO_MIGRATE=false`.

Centralni `scripts/migration-runner.mjs` uvodi versioned offline checksum manifest,
read-only dry-run, checksum ledger, PostgreSQL advisory lock, expected-list
potvrdu i failure-recovery izlaz koji ne unapređuje lokalni ledger nakon greške.
Komande su `db:migrate:offline`, `db:migrate:dry-run`,
`db:migrate:production` i `db:migrate:production:dry-run` u odgovarajućem
projektu. `scripts/run-migration-matrix.mjs` nosi matricu fresh, upgrade,
rerun, interrupted backfill, checksum mismatch, atomic failure recovery i
compatible/incompatible package rollback; prihvata isključivo dedicated test
bazu sa standalone `test` markerom.

Stvarni rezultati: `npm run db:migrate:check` je PASS (89 CMS fajlova),
root migration safety/regression suite je 16/16 PASS, centralni migration
safety testovi i typecheck su PASS, a centralni offline manifest je generisan.
`npm run db:migrate:matrix:local` je PASS za CMS fresh/upgrade/rerun,
interrupted backfill, checksum mismatch, failed-migration atomic recovery i
kompatibilni/nekompatibilni package rollback. `npm run
db:migrate:matrix:local:central` je PASS za centralni fresh apply, advisory
lock, checksum ledger i read-only dry-run. Production/staging baza, secrets,
ključevi i deployment nisu menjani.
