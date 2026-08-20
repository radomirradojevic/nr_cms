# Prompt 08 — local capability V2 i scheduler evidence

Datum provere: 16. avgust 2026.

## Ishod

License Server release sada izlaže `customerLicenseIssuer.v2` i versioned
`customerLicenseIssuer.jobs.v1`. Local adapter koristi isti katalog, issue,
status i lifecycle application servis kao HTTP V2. Webshop V1 kompatibilni tok
više nije fire-and-forget: V1 samo enqueue-uje durable operaciju, Webshop čuva
`operationId`, a V2 polling nastavlja isti posao posle timeout-a ili restarta.

Nema poziva centralnom Master-u, HMAC secret-a u local capability ugovoru,
Webshop importa u License Server adapteru niti direktnog Webshop upisa u
`customer_issuer_*` tabele.

## As-built granice

- Javni ugovor: `packages/addon-sdk/src/customer-license-issuer-v2.ts` i
  `customer-license-issuer-jobs-v1.ts`.
- Root bridge: `lib/license-server-addon/customer-issuer-capability.ts` prvo
  proverava entitlement stanje; samo `ready` daje V2 capability. Raw loader i
  dalje posebno prijavljuje `v2_not_exported` za stariji paket.
- Local adapter: package-owned
  `.private/license-server-addon/src/data/customer-issuer-capability-v2.ts`.
  Source je fiksiran na `addon:webshop`/`webshop`, environment dolazi iz host
  runtime konfiguracije, a order/correlation podaci dolaze iz SDK komande.
- V1 adapter: javni potpis je neizmenjen i enqueue-uje isto operation jezgro.
  Legacy polling koristi kontrolisani `legacy_repeat` reveal radi crash-safe
  kompatibilne predaje; native V2 ostaje `consume_once`.
- Scheduler: canonical job poziva isti bounded issue/lifecycle worker. Tabela
  `customer_issuer_job_leases` je package-owned V6 aditivna migracija; atomic
  acquire, token-bound release i expired-lease recovery rade kroz više procesa.
- Host scheduler: autentikovana
  `POST /api/cron/license-server-operations` ruta prosleđuje deadline i
  correlation ID. Istekla add-on licenca sme samo da završi već prihvaćene
  obaveze; novi capability issue ostaje blokiran kao `edit_existing_only`.
- Webshop: `webshop-customer-license-issuer.ts` zavisi samo od javnog SDK-a.
  Fulfillment outbox čuva operation ID, proverava terminalni V2 status i odmah
  envelope-encryptuje reveal secret pre Webshop persistence-a.

## Schema i release dokaz

- schema version: `6`;
- V6 migration checksum:
  `2effa96a614e694d63b141f839a4b354dd607258283b0eaab0b5defe07d4cd29`;
- migration bundle hash:
  `7a95455a35c1a4123b9087cf9f84003d80f9d651acc7231fe5319452828919a8`;
- završni root build je generisao lokalno potpisani release artifact
  `08c9f704a3c092f53c2bc0c6d7266ac4e687604aac08e7b1e4bdca4b25c16ea3`;
- poslednji `npm run pack:verify` nad tim stanjem dao je tarball SHA-256
  `81ffbd03c1b1c0c4ba119ce0d619c01fae42f907e2409999e90431d55a0f216b`;
- clean Next host komanda je u svom izolovanom local-authority run-u napravila
  artifact `c43f7531c778af716eeeebdb332f8e39b86cf92489baa8da29acb3981a23ccba`
  i provereni tarball
  `a59272f5e6d5db0187d98ac1a5f8326bf9dd96fdb48317e6e55b27e87eefea5a`.
  Local test authority je namerno per-run, pa se njeni potpisani package hash-evi
  navode uz konkretnu komandu; migration checksum/bundle hash ostaju isti.

## Reproducibilne komande i finalni rezultati

Komande su pokrenute iz navedenog direktorijuma:

| Direktorijum                       | Komanda                                                                            | Finalni rezultat                                                                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| root, add-on, Webshop, worker      | `npm run typecheck`                                                                | sva četiri prolaze bez greške                                                                                                          |
| `.private/license-server-addon`    | `npm run test:db:local`                                                            | 80 pass, 0 fail, 0 skip; uključuje domain/local/HTTP vector, singleton lease, deadline, restart i version/source mismatch              |
| `.private/webshop`                 | `npm run test:local`                                                               | 178 pass, 0 fail, 0 skip                                                                                                               |
| `.private/addon-deployment-worker` | `npm test`                                                                         | 78 pass, 0 fail, 5 eksplicitnih isolated-worker-DB skip-ova                                                                            |
| root                               | `npm test`                                                                         | 370 pass, 0 fail, 10 eksplicitnih DB/managed-lifecycle skip-ova                                                                        |
| root                               | `$env:WEBSHOP_INSTALL_MODE='disabled'; $env:NODE_USE_SYSTEM_CA='1'; npm run build` | Next 16.3 production build prolazi; route lista sadrži `/api/cron/license-server-operations`                                           |
| `.private/license-server-addon`    | `npm run pack:verify`                                                              | allowlist/secret scan prolazi; poslednji SHA-256 `81ff...216b`                                                                         |
| `.private/license-server-addon`    | `npm run install:verify`                                                           | isolated tarball import: dashboard, V1, V2, jobs i API health prolaze; DB deo namerno nije zatražen tom komandom                       |
| `.private/license-server-addon`    | `npm run install:verify:next:db`                                                   | čist Next 16.3 install/build/render i PostgreSQL provera prolaze za sve ključne dashboard putanje, V1/V2 API i capability/job evidence |
| root                               | `npm run lint`                                                                     | 0 errors, 12 upozorenja; nijedno nije prećutano niti automatski potisnuto                                                              |

Lint upozorenja su: jedan React hook dependency (`content-form.tsx`) i
unused import/parameter upozorenja u `data/files.ts`, `data/form-submissions.ts`,
`data/webshop-purge.ts`, `db/schema.ts`, `lib/addon-runtime/sdk-host.ts`,
`lib/webshop-addon/platform.ts` i `scripts/run-approved-dev-migrations.mjs`.

Worker `npm test` ne pokreće pet testova koji zahtevaju njegov zaseban mutating
DB harness. Root `npm test` analogno preskače deset testova koji zahtevaju
izolovani managed-lifecycle/DB setup. Prompt 08 DB ponašanje nije ostalo
preskočeno: License Server `test:db:local` je izvršio svih 80 testova, bez skip-a.

## Uočeni failure-i tokom implementacije

Nijedan failure nije sakriven:

1. Prvi Webshop run imao je dva test failure-a: fixture je override-ovao
   `getOperation` umesto `enqueueIssue`, a statički test je tražio polling u
   outbox fajlu iako je implementacija delegirana javnom adapteru. Fixture i
   boundary dokaz su ispravljeni; puni finalni run je 178/178.
2. Worker je prvobitno odbio V6 tabelu kao ne-allowlistovanu. Sva tri exact
   privilege manifesta, njihove pinovane SHA-256 vrednosti i očekivani set od 18
   tabela su ažurirani; finalni worker run nema failure.
3. Root test je zatim prijavio očekivani manifest hash drift. Root provision
   contract je vezan za nove exact checksum-e i finalni root run nema failure.
4. Prvi License Server DB run je otkrio da stari packed-release fixture primenjuje
   samo V1–V5. Fixture sada primenjuje i V6; finalni DB run je 80/80.
5. Jedan završni Webshop static assertion je bio preširok i hvatao stabilne
   `customer_issuer_*` error code stringove kao da su SQL tabele. Provera je
   sužena na stvarne SQL/import coupling obrasce; ponovljeni puni run je 178/178.

## Acceptance mapa

| Zahtev       | Status                               | Dokaz                                                                                                                                   |
| ------------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| ARCH-03      | zelen                                | Javni SDK-only local adapter, entitlement-aware root bridge i Webshop boundary scan bez privatnog/DB/HMAC coupling-a.                   |
| ARCH-05      | zelen za code/DB contract            | Jedan command kroz domain, local i HTTP daje isti operation/receipt/error model; local lifecycle koristi isto jezgro.                   |
| ISSUE-01..06 | zeleni                               | V1/V2 dele durable idempotency, operation, receipt, reveal, retry i dead-letter implementaciju; DB suite je 80/80.                      |
| PKG-02       | zelen                                | Source/release capability i jobs parity plus clean packed Next host.                                                                    |
| OPS-01       | zelen za scheduler code/DB           | Versioned job, root cron, singleton concurrency, deadline i expired-lease restart su zeleni; live cron/alert dokaz ostaje release gate. |
| WEB-03       | zelen za local durable status bridge | Enqueue ID se čuva, status se proverava, restart ne izdaje novu licencu i Webshop adapter nema issuer DB upis.                          |

## Namerno preostalo

Prompt 08 ne zatvara punu Webshop `license_server` connection/product mapping i
customer delivery UX (Promptovi 09/10), refund/chargeback/offline lifecycle
matricu (Prompt 11), niti live production scheduler, alarme, publish i deployment.
