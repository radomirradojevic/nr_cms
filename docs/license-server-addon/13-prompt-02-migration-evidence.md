# Prompt 02 — as-built migracije i managed install evidence

Datum provere: **2026-08-15**. Ovaj dokument zaključava rezultat Prompt-a 02.
Ne proglašava ceo License Server V2 proizvod završenim i nije dokaz da je paket
objavljen ili instaliran u produkciji.

## 1. Granica vlasništva

| Vlasnik | Poseduje | Ne poseduje |
| --- | --- | --- |
| Root CMS | Javni SDK/bridge, `license_server_addon_entitlements` i generičke `cms_addon_*` installation/operation/outbox/result/migration-ledger tabele. | Customer licence, profile, claim schema i issuer ključeve. |
| `@nr-cms/license-server` paket | Svih 17 `license_server_*`/`customer_issuer_*` domenskih tabela i njihove aditivne migracije. | Master entitlement/release katalog i Webshop tabele. |
| Add-on deployment worker | Provera potpisanog release-a, exact allowlist, backup evidence, primena SQL-a i upis istorije u hostov `cms_addon_migrations`. | Business podatke i proizvoljne package/runtime putanje. |
| Centralni Master License Server | Night Raven paid entitlement i tačno uparivanje `addonKey`/package release-a. | Izdavanje licenci za proizvode customer-a i customer issuer schema-u. |
| Webshop add-on | Sopstvenu prodaju/fulfillment i svoj zaseban managed install descriptor. | License Server schema-u; nije instalaciona zavisnost License Server add-on-a. |

Root `db/schema.ts` tokom tranzicije i dalje ogledala legacy domenske tabele da
stari CMS kod ostane kompatibilan. Kanonske package migracije ne kreiraju drugi
namespace niti duplikate: `0001` se na postojećih svih 12 tabela evidentira kao
`legacy_applied`, a na praznoj bazi kreira isti skup. Delimično postojeći legacy
skup se odbija kao drift.

## 2. Potpuna inventura

### 2.1 Host control-plane

- `license_server_addon_entitlements` — singleton host tabela, PK indeks
  `license_server_addon_entitlements_pkey`; nastala u root migraciji `0076`,
  activation identity je aditivno proširen u `0082`, a managed V2 envelope/release
  polja i `NOT VALID` compatibility constraint u `0096`.
- Generičke host tabele `cms_addon_installations`, `cms_addon_operations`,
  `cms_addon_deployment_outbox`, `cms_addon_deployment_results` i
  `cms_addon_migrations` pripadaju CMS control-plane-u i dele ih samo eksplicitno
  allowlist-ovani Webshop i License Server descriptori.

### 2.2 Package baseline — 12 postojećih tabela

`0001_license_server_customer_issuer_baseline.sql` sadrži:

1. `license_server_api_clients`
2. `license_server_product_types`
3. `license_server_product_type_skus`
4. `license_server_licenses`
5. `license_server_api_client_nonces`
6. `customer_issuer_identity`
7. `customer_issuer_keys`
8. `customer_issuer_api_client_scopes`
9. `customer_issuer_issue_outbox`
10. `license_server_license_activations`
11. `license_server_audit_events`
12. `license_server_validation_events`

Root poreklo tog skupa je u `0076`, `0077`, `0086` i `0088`. Root migracije
`0075`, `0078`, `0081` i `0090` pominju License Server samo kroz Webshop
integration/odvajanje i ne preuzimaju package ownership.

Svaka tabela ima standardni PostgreSQL `<table>_pkey` indeks. Dodatni
unique/eksplicitni indeksi baseline-a su:

- API klijenti/nonces: `license_server_api_clients_client_id_unique`,
  `license_server_api_clients_status_idx`,
  `license_server_api_clients_fingerprint_idx`,
  `license_server_api_client_nonces_client_nonce_unique`,
  `license_server_api_client_nonces_created_idx`;
- product/SKU: `license_server_product_types_external_ref_unique`,
  `license_server_product_types_status_idx`,
  `license_server_product_type_skus_type_sku_unique`,
  `license_server_product_type_skus_namespace_unique`,
  `license_server_product_type_skus_product_idx`;
- licence: `license_server_licenses_client_idempotency_unique`,
  `license_server_licenses_key_hash_unique`, `license_server_licenses_sku_idx`,
  `license_server_licenses_order_ref_idx`,
  `license_server_licenses_customer_email_idx`,
  `license_server_licenses_source_idx`;
- issuer: `customer_issuer_identity_singleton_unique`,
  `customer_issuer_identity_ref_unique`, `customer_issuer_keys_kid_unique`,
  `customer_issuer_keys_issuer_status_idx`,
  `customer_issuer_api_client_scopes_unique`,
  `customer_issuer_api_client_scopes_lookup_idx`,
  `customer_issuer_issue_outbox_operation_unique`,
  `customer_issuer_issue_outbox_status_idx`;
- aktivacije: `license_server_license_activations_license_fingerprint_unique`,
  `license_server_license_activations_license_status_idx`,
  `license_server_license_activations_token_idx`,
  `license_server_license_activations_domain_idx`,
  `license_server_license_activations_device_idx`,
  `license_server_license_activations_last_seen_idx`;
- audit/validation: `license_server_audit_events_license_idx`,
  `license_server_audit_events_activation_idx`,
  `license_server_audit_events_api_client_idx`,
  `license_server_audit_events_action_idx`,
  `license_server_validation_events_license_idx`,
  `license_server_validation_events_created_idx`,
  `license_server_validation_events_api_client_idx`.

### 2.3 Package V2 osnova — pet novih tabela

`0002_customer_issuer_v2_models.sql` aditivno dodaje:

1. `customer_issuer_claim_schemas`
2. `customer_issuer_claim_schema_versions`
3. `customer_issuer_profile_revisions`
4. `customer_issuer_operations`
5. `customer_issuer_operation_receipts`

Svaka ima `<table>_pkey`. Dodatni unique/eksplicitni indeksi su:

- `customer_issuer_claim_schemas_product_ref_unique` i
  `customer_issuer_claim_schemas_product_idx`;
- `customer_issuer_claim_schema_versions_revision_unique`,
  `customer_issuer_claim_schema_versions_semver_unique` i
  `customer_issuer_claim_schema_versions_status_idx`;
- `customer_issuer_profile_revisions_profile_revision_unique` i
  `customer_issuer_profile_revisions_status_idx`;
- `customer_issuer_operations_idempotency_unique`,
  `customer_issuer_operations_claim_idx` i
  `customer_issuer_operations_license_idx`;
- `customer_issuer_operation_receipts_operation_unique`;
- parcijalni `license_server_licenses_public_ref_unique` na postojećoj tabeli.

Migracija dodaje nullable snapshot/revision polja postojećim SKU/licence redovima.
Postojeći podaci, FK reference i stari application write ostaju važeći.

Nema PostgreSQL enum tipova u ovom skupu. Statusi i tipovi su `text` kolone sa
imenovanim `CHECK` ograničenjima, pa tranzicija ne uvodi skriveni enum ownership.

## 3. Migration i install ugovor

Stvarni package `migrations.json` je neprazan i monoton:

| Schema | Migration ID | SHA-256 | Compatibility |
| --- | --- | --- | --- |
| 1 | `0001_license_server_customer_issuer_baseline.sql` | `6a9e302e4d21aad734e117107152727bea11a7d0197feee113cf624b614403d1` | add-on `^0.1.0`, CMS `^0.1.0` |
| 2 | `0002_customer_issuer_v2_models.sql` | `be2d41bc5d01a9c9bc6a44d843973ce5bd7a3e04b10224e8ec1fa400d35fdf8c` | add-on `^0.1.0`, CMS `^0.1.0` |

Oba zapisa imaju `destructive: false`, `requiresBackup: true` i
`rollbackPolicy: "expand_compatible"`. Package release digest
`cce76dc6d8d98c5cb5390b5f0ae4d5cecdb611629ebb1c572868239bed9d69dc`
obuhvata `migrations.json` i oba SQL fajla.

SQL fajlovi su verzionisani package source. `migrations.json` je deterministički
generisan release fajl i zato je lokalno ignorisan kao build output; `build:local`,
`pack:verify` i artifact-inventory test dokazuju da se nalazi u stvarno
spakovanom tarball-u sa gornjim vrednostima. Clean build ga ponovo proizvodi iz
verzionisanih SQL fajlova, tako da package ne zavisi od lokalnog ostatka build-a.

Installer radi pod advisory lock ključem
`nr-addon-db-phase:<targetProfile>:<addonKey>`. `cms_addon_migrations` čuva
`addon_key`, monotoni ID, release, checksum, package/schema verziju, status i
vreme. Ponovni prolaz je no-op; promenjen checksum, nepoznat ledger red ili
nepotpun skup tabela je drift. SQL i ledger upis su jedna transakcija. Neuspeh
se rollback-uje, upisuje sanitizovan `failed` dokaz i isti checksum sme bezbedno
da se ponovi.

Worker prihvata samo dva exact descriptora:

- `webshop` → `@radomirradojevic/webshop`;
- `license-server` → `@nr-cms/license-server`.

Target/profile konfiguracija je zatvoreni skup vendor/client/paypal × ta dva
add-on-a. Credential record, privilege manifest, release manifest, artifact
digest, migration bundle hash, package name i add-on key moraju se poklapati.
Manifest može da navede samo SQL fajlove nad 17 package-owned tabela; shell/JS
skripte, DDL nad tuđim tabelama i destruktivni SQL se odbijaju.

`Dashboard → License Server` aktivacija koristi verified Master V2 entitlement.
Transakcija prvo čuva entitlement, installation, operation i durable outbox, pa
stanje ostaje `install_pending`. Tek potpisani worker rezultat za isti
installation/epoch/generation/release prelazi u `ready`. Test eksplicitno radi
bez instaliranog customer Webshop paketa.

## 4. Reproducibilne komande i rezultati

Sve komande su izvršene iz navedenog repozitorijuma 15. avgusta 2026.

| Repo | Komanda | Rezultat |
| --- | --- | --- |
| root | `npm run typecheck` | PASS |
| root | `npm run test -- --test-reporter=dot` | PASS, exit 0 |
| root | `npm run lint` | PASS, 0 errors i 12 ranije postojećih upozorenja |
| root | `npm run db:migrate:test` | PASS, `database is already up to date` |
| root | `node scripts/run-test-command-with-test-db.mjs npx tsx --test tests/webshop-activation-control-plane.integration.test.ts` | PASS 9/9, uključujući License Server bez Webshop paketa |
| root | `npx next build` | PASS posle eksplicitne root SDK runtime dependency popravke |
| add-on | `npm run build:local` | PASS; 39 testova, 36 pass, 3 očekivana DB skip-a; release digest iznad |
| add-on | `npm run test:db:local` | PASS 39/39, 0 skip |
| add-on | `npm run install:verify:db` | PASS; dashboard/issuer/outbox/health/DB i client-import boundary provereni |
| add-on | `npm run pack:verify` | PASS; tarball SHA-256 `59e74343f90b8c4da19a8097e04da0ac0b49d24df6c4f8cabb7f5679076862ff` |
| worker | `npm run typecheck` | PASS |
| worker | `npm run build` | PASS |
| worker | `npm run test` | PASS; 78 pass, 5 DB skip |
| worker | `npm run test:db` | PASS 83/83, 0 skip |
| Master | `npm run typecheck` | PASS |
| Master | `npm run test -- --test-reporter=dot` | PASS, exit 0 |
| Master | `npm run db:migrate:test` | PASS, `database is already up to date` |
| Master | `node scripts/run-test-command-with-test-db.mjs node --conditions=react-server --import tsx --test --test-concurrency=1 tests/addon-activation.integration.test.ts` | PASS 2/2, uključujući exact License Server release selection |

DB add-on suite dokazuje empty DB, postojeći fixture/data upgrade, stari write,
rerun no-op i PostgreSQL advisory lock. Root in-memory runner testovi dodatno
dokazuju signature/digest/path proveru, checksum mismatch/drift, rollback i
retry posle neuspešne migracije, compatibility odbijanje i legacy adoption.
Worker DB suite dokazuje fencing, callback idempotency i control-plane CAS.

### Neuspeh/preskakanje koji nisu prećutani

- Prvi `npm run build` se očekivano zaustavio na runtime-env gate-u jer lokalni
  `.env` nema pet production deployment transport vrednosti. Dva pokušaja sa
  jednokratnim vrednostima zatim su zaustavili CA/profile policy gate-ovi; ništa
  nije upisano u `.env`.
- Prvi direktni `npx next build` je otkrio realan
  `@nr-cms/addon-sdk/customer-license-issuer-v2` resolution propust iz spakovanog
  Webshop runtime-a. Root sada eksplicitno zavisi od
  `file:packages/addon-sdk`; ponovljeni Next build prolazi.
- Jedan završni root suite je otkrio da je lint refactor canonicalizacije prestao
  odbrambeno da uklanja suvišno `signature` polje. Refactor je ispravljen bez
  promene potpisnog formata; ciljani testovi su prošli 14/14, a ponovljeni puni
  root suite je prošao sa exit kodom 0.
- Obični add-on build namerno preskače tri DB testa; svi su zatim izvršeni kroz
  `test:db:local` i rezultat je 39/39.
- Obični worker suite namerno preskače pet mutirajućih DB testova; svi su zatim
  izvršeni kroz UUID-izolovani `test:db` i rezultat je 83/83.
- Root Drizzle generator nije mogao pouzdano da generiše novi snapshot zbog
  ranije postojećih praznih/malformed snapshot fajlova u 0077–0095 lancu.
  `0096` SQL, journal entry i konzistentni snapshot marker su zato provereni
  stvarnim test-DB migration runnerom i contract testom. Ovo nije korišćeno za
  package migration manifest.
- Tokom jednog DB testa `pg` je prijavio deprecation warning za paralelni
  `client.query`; test je prošao 9/9. Warning nije failure i ostaje vidljiv za
  kasnije tehničko čišćenje.
- Nije izvršen live vendor purchase, publish, produkcioni provisioning niti
  produkcioni redeploy. To zahteva kasniji release prompt i eksplicitno ljudsko
  odobrenje.

## 5. Acceptance mapa ovog prompta

| ID | Status | Dokaz |
| --- | --- | --- |
| DATA-01 | **zelen** | Neprazan monotoni manifest, checksum, compatibility, per-addon advisory lock i durable ledger. |
| DATA-02 | **zelen** | Empty DB, legacy fixture/data upgrade, rerun no-op i concurrent lock testovi. |
| DATA-03 | **zelen** | Samo aditivni SQL, old-write compatibility, application rollback/forward-fix test; nema down migracije. |
| DATA-04 | **zelen** | Package metadata/test potvrđuju retain-by-default; nema executable uninstall/down/purge putanje. |
| PKG-06 | **zelen za implementirani contract/DB tok** | Verified License Server key → `install_pending` → exact allowlisted worker/install/redeploy callback → `ready`, bez customer Webshop paketa. Live produkcioni E2E ostaje release gate. |

Prompt 02 ne uključuje V2 operation business engine, full release admin parity,
vendor offer UI ili package/Master production publish. Ti koraci ostaju u
narednim promptovima.
