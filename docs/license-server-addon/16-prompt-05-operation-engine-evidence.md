# Prompt 05 — durable issue/lifecycle engine evidence

Datum baseline-a: 16. avgust 2026.

## 1. Isporučeni rezultat i granice

License Server add-on sada ima jedan package-owned application service za
customer issue i lifecycle komande:

- `src/lib/operation-domain.ts` validira strogi transport-neutralni payload,
  canonicalizuje ga i računa SHA-256 hash;
- `src/data/operations.ts` poseduje enqueue/get/process/replay/reveal tok i jedini
  je servis koji kreira novi `license_server_licenses` red;
- ownership/idempotency scope je
  `(issuer_id, source_client_ref, operation_key)`, uz dodatnu API-client i
  environment proveru;
- isti scoped key i hash vraćaju istu operaciju/receipt; različit hash vraća
  stabilan `idempotency_conflict` pre bilo kakvog novog izdavanja;
- issue transakcija ponovo validira pin-ovanu immutable Profile/Schema reviziju i
  effective claims, pa atomarno upisuje tačno jednu licencu, receipt, sanitizovan
  audit i terminalno operation stanje;
- issue i lifecycle dele status/attempt/lease/retry/dead-letter/correlation
  model. Worker uzima najviše 100 stavki, koristi 60-sekundni DB lease i
  `FOR UPDATE SKIP LOCKED`, najviše 12 pokušaja i bounded exponential jitter;
- admin može replay samo `dead_letter` operacije, uz granularnu
  `license-server.operations.replay` dozvolu i tačnu potvrdu `REPLAY`. Isti
  operation key/hash i istorija pokušaja ostaju sačuvani.

Ovaj prompt ne poziva centralni Master. Master i dalje samo licencira/instalira
sam add-on; customer licence nastaju isključivo lokalno u customer issuer-u.

## 2. Receipt, ključ i reveal politika

Trajni receipt sadrži javne operation/receipt/license reference, maskirani ključ,
issuer ref, Profile SKU/revision, Schema version/hash, issue/expiry vreme i
U trenutku Prompt-a 05 receipt je imao `assertion: null` slot. Prompt 06 je taj
slot popunio snapshot-proverenim V2 assertion-om u istoj issue transakciji; ovaj
dokument ostaje istorijski evidence za Prompt 05.

Plaintext customer ključ se deterministički izvodi samo unutar kontrolisane issue
transakcije. U bazi se za ponovni reveal čuva isključivo u postojećoj dedicated
`encrypted_license_key` koloni, envelope-encrypted add-on encryption ključem.
Receipt JSON, audit metadata, error i operation payload ne sadrže plaintext.
`consume_once` radi atomskim conditional update-om: test sa 20 konkurentnih
poziva dobija tačno jedan plaintext rezultat i svaki uspešan pristup audit zapis.
`legacy_repeat` je usko ograničena, auditovana compatibility politika potrebna da
postojeći sinhroni V1 HTTP/admin potpis ostane nepromenjen; novi V2 tok je
reveal-once.

## 3. Schema i compatibility

Package manifest je monotono proširen na schema version 4:

| Migracija | SHA-256 | Efekat |
| --- | --- | --- |
| `0004_durable_operation_engine.sql` | `ec3da34c49090bea12bef1f9723e3ab7ffe0cd9d32c44afd998889390903e2b8` | Aditivni public ref/API-client/environment/dead-letter/reveal atributi i ograničenja na postojećim operation/receipt tabelama. |

Nisu kreirane duplikat operation/receipt tabele, nema brisanja podataka niti
destruktivnog down-a. Root `db/schema.ts` je samo compatibility Drizzle ogledalo;
SQL vlasnik ostaje add-on manifest. Release artifact digest obuhvata sve četiri
migracije.

V1 SDK potpis nije promenjen. `customerLicenseIssuer.v1` enqueue i postojeći
admin/HTTP issue poziv sada su adapteri preko durable servisa. Legacy
`customer_issuer_issue_outbox` redovi se preuzimaju i usklađuju kroz isti engine;
to nije drugi issuer. Release namerno i dalje prijavljuje
`customerLicenseIssuer.v2: "v2_not_exported"`: HTTP/HMAC V2 je Prompt 07, a
local capability/scheduler adapter Prompt 08.

## 4. Automatizovani fault i concurrency dokaz

Izolovani PostgreSQL test primenjuje migracije 0001–0004 i proverava:

- 128 istovremenih identičnih enqueue komandi → jedna operation, jedna licenca i
  jedan receipt;
- ponovljeni isti zahtev vraća isti receipt čak i kada se current Profile kasnije
  deprecira;
- isti key sa drugim customer payload-om → `idempotency_conflict`;
- pogrešan API-client/environment owner sa pogođenim source ref-om ne može da
  preuzme operation niti da reveal-uje receipt;
- crash pre issue/receipt commit-a → nema licence ni receipt-a; po isteku lease-a
  retry uspeva;
- crash posle commit-a → retry čita terminalni rezultat bez duplikata;
- terminalna claim greška → pregledan `dead_letter`; admin replay ponovo otvara
  istu operation;
- 20 konkurentnih reveal pokušaja → tačno jedan plaintext;
- lifecycle `suspend` prolazi kroz istu tabelu/worker/receipt jezgru, a promenjen
  razlog sa istim ključem daje konflikt;
- DB receipt/audit/error secret scan potvrđuje odsustvo plaintext ključa.

## 5. Reproducibilne komande i finalni rezultati

| Repo / komanda | Rezultat |
| --- | --- |
| `.private/license-server-addon`: `npm run typecheck` | PASS; release i host TypeScript. |
| `.private/license-server-addon`: `npm run test:db:local` | PASS; 63/63, 0 fail, 0 skip, uključujući durable DB/fault/concurrency suite. |
| `.private/license-server-addon`: `npm run build:local` | PASS; 59 pass, 0 fail, 4 očekivana DB skip-a u non-DB build fazi; artifact SHA-256 `7a9f0ea245311a41e2499346db05bd657bfbf6f4ee1649d0d6f9da35de2b75ff`. |
| `.private/license-server-addon`: `npm run pack:verify` | PASS; allowlist/secret audit; provereni tarball SHA-256 `57e9444b02e56db2f8499bb9e0d48d5f6482aaa397d11c3924ea361dca7009ba`. |
| `.private/license-server-addon`: `npm run install:verify:next:db` | PASS; frozen tarball install, migracije, Next 16.3 build i render 11 dashboard/API putanja; isti artifact digest, probe tarball SHA-256 `950c850becbc8636c653e9385a4098a1c7e9a7bdfdc7e26be7d53e1fbba280d2`. |
| `.private/addon-deployment-worker`: `npm run typecheck` | PASS. |
| `.private/addon-deployment-worker`: `npm test` | PASS; 78 pass, 0 fail, 5 namenski preskočenih mutating DB testova. |
| root: `npm run typecheck` | PASS. |
| root: `npm run test` | PASS; 368 pass, 0 fail, 10 namenski preskočenih DB/staging testova. |
| root: transient development/empty env + `npm run build` | PASS; Next.js 16.3 production build, 25/25 static stranica. |
| `.private/webshop`: ciljani issuer/fulfillment/vendor-offer Node testovi | PASS; 14/14, 0 skip. |
| root, add-on i deployment-worker: `git diff --check` | PASS; bez whitespace greške, uz postojeća Git LF→CRLF upozorenja. |

Tačna root build komanda koristi samo dokumentovani development/empty profil:

```powershell
$env:NR_CMS_DEPLOYMENT_PROFILE='development'
$env:NR_LICENSE_ENVIRONMENT='development'
$env:NR_ADDON_SOURCE_MODE='empty'
$env:WEBSHOP_ENABLED='false'
$env:LICENSE_SERVER_ENABLED='false'
$env:NODE_USE_SYSTEM_CA='1'
npm run build
```

`empty` build dokazuje da root CMS nema build zavisnost od privatnog paketa;
`install:verify:next:db` zasebno dokazuje spakovani add-on sa njegovim stvarnim
migracijama i runtime entrypoint-om.

## 6. Neuspešni pokušaji koji nisu prećutani

| Pokušaj | Failure | Korekcija i ponovljeni dokaz |
| --- | --- | --- |
| Prvi novi DB suite | Test je direktno učitavao workspace source koji u izolovanom runner-u nije mogao da razreši host alias `@/db`. | Fixture sada učitava generated `runtime-snapshot/data/operations.js`, isti kod koji paket isporučuje; puni DB suite 63/63. |
| Prvi kasniji local boundary suite | Preširok static regex je pogrešno protumačio bezbedan audit `metadata` blok kao key polje. | Test izoluje stvarne metadata blokove; zatim isti boundary test i puni DB suite prolaze. |
| Više Windows sandbox pokušaja | `CreateProcessAsUserW ... 1920` pre starta testa. | Iste `npm` komande ponovljene su sa ograničenom process eskalacijom; product test rezultati iz tabela iznad su zeleni. |

Različiti `npm pack` probe SHA-evi nisu release drift: npm generiše novi tarball
za zasebne probe, dok oba testa verifikuju isti potpisani artifact SHA-256
`7a9f0ea2...2b75ff` i sadržaj allowlist-e.

## 7. Acceptance mapa i preostali gate-ovi

| ID | Status | Dokaz |
| --- | --- | --- |
| ISSUE-01 | zelen | 128-way enqueue + tačno jedan DB license insert/result. |
| ISSUE-02 | zelen | Repeat/restart vraća isti operation/receipt. |
| ISSUE-03 | zelen | Promenjen canonical payload stabilno vraća `idempotency_conflict`. |
| ISSUE-04 | zelen | Crash pre/posle commit-a i lease-expiry recovery. |
| ISSUE-05 | zelen za code/DB | Bounded claim/retry/dead-letter i permission-gated admin replay; staging scheduler ostaje release dokaz. |
| ISSUE-06 | zelen | Envelope-encrypted reveal secret, atomic reveal-once, audit i secret scan. |
| ARCH-01 | zelen za engine | Nema centralnog Master poziva/importa. |
| ARCH-03/05 | delimično | V1 koristi zajedničko jezgro; javni local/remote V2 adapteri ostaju Promptovi 07/08. |
| LIFE-01 | delimično | Zajednički durable lifecycle jezik postoji; puna state-machine/runtime matrica ostaje Prompt 11. |

Nisu izvršeni production publish/deploy, live payment, remote HTTP/HMAC V2,
signed-assertion E2E niti staging scheduler/alert. Prompt 05 zato ne proglašava
ceo V2 proizvod spremnim.
