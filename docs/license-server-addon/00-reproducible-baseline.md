# 00 — Reproducibilni as-built baseline

Datum i vreme snimka: **2026-08-15T12:50:56+02:00**
Prompt: **00 — Reproducibilni baseline i gap mapa**
Opseg: root CMS, `@nr-cms/addon-sdk`, customer License Server add-on,
Webshop add-on, centralni Master License Server i add-on deployment worker.

Ovaj zapis je dokaz postojećeg stanja pre V2 implementacije. Ne predstavlja
production GO odluku i ne menja feature kod.

## 1. Toolchain i source provenance

- Node.js: `v24.15.0`
- npm: `11.12.1`
- Next.js u root CMS-u i isolated host testu: `16.3.0`
- OS/shell: Windows / PowerShell

| Celina | Repo root | Branch | Commit | Remote | Početno stanje |
| --- | --- | --- | --- | --- | --- |
| Root CMS + javni SDK/schema | `D:\nr_cms` | `master` | `d977baa72c009bbd4bb635d5e4875924883ee0fa` | `origin` → `https://github.com/radomirradojevic/nr_cms.git` | clean |
| Customer License Server add-on | `.private/license-server-addon` | `master-lsa` | `b710a7ec00812f6e324873f5feab4e394ce3b979` | `origin` → `https://github.com/radomirradojevic/license-server-addon.git` | clean; branch je 1 commit ispred `origin/master-lsa` |
| Webshop add-on | `.private/webshop` | `master-ws` | `6c3fb866872ef931cfe7b4170974e474091ff250` | `origin` → `https://github.com/radomirradojevic/webshop.git` | clean |
| Centralni Master | `.private/license-server` | `master-ls` | `b51d72eaeb89809799473d5eb4d4cdbadbde5e9f` | `origin` → `https://github.com/radomirradojevic/license-server.git` | clean |
| Deployment worker | `.private/addon-deployment-worker` | `master` | `a81e7d339d4e13831eb8dd8a4dfdc239a93aa7b3` | nema konfigurisan remote | clean |

Posle svih build/test gate-ova svih pet repozitorijuma je i dalje bilo clean.
Dokumentacione izmene iz ovog prompta nastale su tek posle te provere.

## 2. Vlasništvo i granice

| Celina | Trenutni vlasnik | Dokaz i ograničenje |
| --- | --- | --- |
| Host bridge/loader | Root CMS | `lib/license-server-addon/contract.ts`, `loader.ts`, `license.ts` i catch-all `app/api/license-server/[...licenseServerPath]/route.ts`; loader koristi samo generisani build-time registry. |
| Javni local capability | Root `packages/addon-sdk` | `customer-license-issuer-v1.ts` definiše enqueue-only `customerLicenseIssuer.v1`; Webshop dobija capability preko root bridge-a, bez privatnog add-on importa. |
| Master entitlement add-on-a | Root CMS + centralni Master | Root čuva `license_server_addon_entitlements`; centralni Master aktivira/revalidira pravo na `addonKey: "license-server"`. To nije customer license engine. |
| Customer issuer domen | Customer add-on kod, ali trenutno root-owned schema | `.private/license-server-addon/src/{admin,api,data,lib}` implementira domen. Tabele i migracije su trenutno u `db/schema.ts` i root migracijama `0076`, `0077`, `0086`, `0088`; paket nosi prazan `migrations.json`. |
| Customer issuer tabele | Root CMS schema | `license_server_api_clients`, `license_server_api_client_nonces`, `customer_issuer_identity`, `customer_issuer_keys`, `customer_issuer_api_client_scopes`, `customer_issuer_issue_outbox`, `license_server_product_types`, `license_server_product_type_skus`, `license_server_licenses`, `license_server_license_activations`, `license_server_audit_events`, `license_server_validation_events`. |
| Webshop commerce i delivery | Webshop add-on | Sopstvene migracije/schema i tabele za konekcije, katalog, issues, operations, encrypted delivery i reconciliation. Ne poseduje customer issuer tabele. |
| Centralni Master domen | `.private/license-server` | Vendor katalog, purchase/entitlement, release i add-on activation API. Customer add-on source nema Master import niti customer issue fallback. |
| Deployment worker | `.private/addon-deployment-worker` | Trenutni `deployment-contract.ts`, static target policy, release verifier i DB broker prihvataju samo `addonKey: "webshop"` i paket `@radomirradojevic/webshop`. License Server aktivacija trenutno koristi odvojeni legacy `NR-REDEPLOY-V1` callback i `install_pending`; worker još nema License Server install ugovor. |

## 3. Provera tvrdnji iz dokumenta 01

Legenda: **potvrđeno** znači da postoji konkretan kod i/ili zeleni test;
**delimično** znači da osnova postoji, ali tvrdnja zahteva ograničenje.

| Sekcija | Rezultat | As-built dokaz |
| --- | --- | --- |
| 1.1 Paket i lifecycle | **Delimično potvrđeno** | Paket je `@radomirradojevic/license-server-addon@0.1.0`; manifest je potpisan lokalnim release autoritetom i pokriva bundle, provenance, SBOM i prazan migration manifest. Build-time registry, navedena entitlement stanja i `edit_existing_only` postoje. Aktuelni deployment worker, međutim, podržava samo Webshop; License Server install/redeploy nije zatvoren kroz njega. |
| 1.2 Domen licence | **Potvrđeno** | Postoje admin/api/data/lib slojevi, Product Type/SKU, svih deset navedenih policy template-a, četiri license type-a, device/domain/seat limiti, interval/grace, feature i policy snapshot, lifecycle statusi, aktivacije, validation/audit, manual issue/status i API client/nonce/scope tokovi. Schema je još root-owned. |
| 1.3 HTTP API V1 | **Potvrđeno** | `src/api/routes.ts` izlaže samo V1 health/catalog/issue/activate/validate/deactivate. Catalog/issue su HMAC; validate bira runtime ili HMAC prema header-ima; body limit, persistent nonce i distributed rate limit postoje. |
| 1.4 Local issuer V1 | **Potvrđeno kao uzak ugovor** | SDK vraća samo `{accepted, operationId}`. Capability upisuje `customer_issuer_issue_outbox`; worker koristi lease/retry i DB test završava stvarno izdavanje. Nema status query-ja, standardnog receipt-a ili delivery payload-a. |
| 1.5 Issuer identitet | **Potvrđeno kao nedovršeno** | Postoje single-tenant `issuerRef`, Ed25519 PKCS#8 ključ šifrovan u bazi, public key snapshot, `verification_only` rotacija, backup/restore i jednosatni JWT v1. Nema public issuer/keyset rute, schema/policy hash-a, V2 claims ili distribuiranog verifier ugovora. |
| 1.6 Test osnova | **Ponovo potvrđeno** | Unit/contract: 32 pass + 1 očekivani DB skip; DB: 33/33 pass; isolated Next 16.3 tarball host pass. Ovo i dalje nije Webshop-to-customer-app production E2E. |
| 1.7 Webshop osnova | **Delimično potvrđeno** | `file`/`license`/`file_license` i `manual`/`pool`/`license_server` postoje; remote konekcija ima šifrovan HMAC secret i catalog sync/ETag; Product Type/SKU izbor postoji. Health URL i status kolone postoje, ali nema stvarnog health probe toka. Remote V2 govori Master `entitlements` ugovor, a skriveni `customer_issuer` put samo enqueue-uje V1 i nema receipt/delivery završetak. |

## 4. Potvrđena gap mapa

| Gap | Baseline zaključak |
| --- | --- |
| G1 | **Potvrđen:** `src/addon.tsx` koristi puni dashboard, dok release build ulazi kroz `src/release-addon.tsx`, metrics-only prikaz. |
| G2 | **Potvrđen:** customer domenske tabele su u root schema-i; spakovani add-on ima `migrations.json = []`. |
| G3 | **Potvrđen:** remote `license_server` koristi Master-derived entitlement/operation model; lokalni `customer_issuer` je skriven i enqueue-only. |
| G4 | **Potvrđen:** nema ClaimSchema/ProfileRevision modela, schema publish-a, canonical claim hash-a ni immutable custom claim snapshot-a. |
| G5 | **Potvrđen:** add-on router prihvata samo `v1`; nema V2 operation status/receipt/lifecycle/issuer/keyset/ETag ugovora. |
| G6 | **Potvrđen:** lokalni Webshop događaj se označava završenim nakon prihvaćenog enqueue-a, bez issuer receipt-a i secure customer delivery-ja. |
| G7 | **Potvrđen:** core issuer key/backup funkcije postoje, ali bez kompletnog admin permission/UI, public keyset i production recovery ugovora. |
| G8 | **Potvrđen:** nema zasebnog TypeScript verifier paketa ni language-neutral V2 vectors. |
| G9 | **Potvrđen:** add-on izlaže outbox job funkciju, ali root nema production scheduler poziv, operativni dead-letter UI/alarme ni puni cross-system correlation. |

## 5. Izvršene komande i rezultati

| CWD | Komanda | Rezultat |
| --- | --- | --- |
| `.private/license-server-addon` | `npm run typecheck` | PASS; release i host TypeScript provera. |
| `D:\nr_cms` | `npx tsx --test tests/license-server-addon-bridge.test.ts tests/license-server-addon-release.test.ts tests/addon-install-boundary.test.ts tests/addon-sdk-v1.test.ts` | PASS; 16/16, 0 skip. |
| `D:\nr_cms` | `npm --prefix .private/license-server-addon run test:local` | PASS; 32 pass, 1 skip. Skip je DB integration test koji ovaj režim namerno ne pokreće. |
| `D:\nr_cms` | `npm --prefix .private/license-server-addon run build:local` | PASS; typecheck + isti unit suite + release build. Artifact SHA-256: `d4455042db93bdbdf5ff5771f5892d5f50099e895534860623294b37be510306`. |
| `D:\nr_cms` | `npm --prefix .private/license-server-addon run test:db:local` | PASS; 33/33, 0 skip. Real DB outbox izdavanje je prošlo. |
| `D:\nr_cms` | `npm --prefix .private/license-server-addon run install:verify:next` | PASS; frozen tarball install, RSC import, route import i Next build na 16.3.0. Tarball SHA-256: `89422d9041902c5d40dd3d79d33bd0d3f73a730e62442b1e96fac7f1343a7430`. |
| `D:\nr_cms` | `npm --prefix .private/webshop test` | PASS; kompletan relevantni superset, 175/175, 0 skip. Uključuje customer issuer boundary, HMAC V2, fulfillment, encrypted key/reveal, catalog i package-boundary testove. |

### Infrastrukturna napomena

Prvi sandbox pokušaji da pokrenu Webshop i kasnije add-on npm procese nisu
startovali PowerShell/Node proces (`CreateProcessAsUserW`, Windows error 1920).
To nije bio test assertion failure. Iste komande su ponovljene kroz odobreni
unsandboxed npm prefix i gore navedeni suite-ovi su završili sa exit kodom 0.

## 6. Docs/11 traceability baseline

Oznake ispod nisu production acceptance GO; pokazuju šta trenutni dokaz pokriva
pre V2 implementacije.

| ID | Stanje | Baseline dokaz / razlog |
| --- | --- | --- |
| ARCH-01 | delimično | Trust domeni i absence central fallback-a su vidljivi u kodu/testovima; nema još formalnog ADR/dependency-graph gate-a. |
| ARCH-02 | delimično | Zaseban repo/paket/registry postoje; worker install ugovor za License Server ne postoji. |
| ARCH-03 | delimično | Public capability boundary je zelen za V1, ne još za V2. |
| ARCH-04 | gap | Customer remote HTTPS/HMAC V2 ne postoji; postojeći Webshop V2 je Master entitlement ugovor. |
| ARCH-05 | gap | Local enqueue i remote receipt semantika nisu iste. |
| ARCH-06 | delimično | Runtime koristi cached entitlement i nema Master poziv unutar issuer engine-a; outage E2E nije izvršen. |
| PKG-01 | delimično | Lokalno potpisan V1 manifest, SBOM, provenance i digest postoje; nije production release evidence. |
| PKG-02 | gap | Release UI je metrics stub. |
| PKG-03 | potvrđeno | Registry/boundary test je zelen; runtime env putanja se ne izvršava. |
| PKG-04 | potvrđeno | Isolated Next 16.3 tarball install/build/import je zelen. |
| PKG-05 | gap | Nije dokazan zaseban License Server offer i paid-order → Master ključ mapping u vendorskom Night Raven CMS Webshop-u. |
| PKG-06 | gap | Root ima deo activation stanja, ali Webshop-only deployment worker ne može završiti License Server `install_pending` → `ready` tok. |
| DATA-01..04 | gap | Package migracije su prazne; empty/upgrade/rollback/uninstall add-on migration gate-ovi ne postoje. |
| ISSUE-01 | delimično | Lokalni DB outbox izdaje jednu licencu u fixture-u, ali nema paid-order-to-receipt E2E. |
| ISSUE-02..03 | gap | V1 nema payload hash conflict ni trajni receipt. |
| ISSUE-04 | delimično | Lease/retry i `SKIP LOCKED` postoje; nema kompletne crash-boundary fault injection matrice. |
| ISSUE-05 | delimično | Dead-letter stanje postoji u outbox-u; nema production admin/ops dokaza. |
| ISSUE-06 | gap | Customer issuer nema receipt/reveal model; Webshop encryption dokaz važi samo za postojeći remote Master tok. |
| WEB-01 | gap | Javni izbor nije jedinstven local/remote connection model. |
| WEB-02 | delimično | Postojeći remote secret je envelope-encrypted i UI vraća samo `hasAuthSecret`; ciljni connector test nije kompletan. |
| WEB-03 | gap | Konekcija nema pin-ovani customer `issuerRef`. |
| WEB-04 | delimično | ETag/catalog revision postoje za trenutni Master katalog, ne za customer NRLS V2. |
| WEB-05 | delimično | Postoje remote product/catalog snapshot-i, ali nema target profile/schema/mapping revision snapshot-a. |
| WEB-06 | delimično | Durable operation/outbox postoji za remote i enqueue događaj za local; target restart E2E nije dokazivan. |
| WEB-07 | delimično | Remote issued key je šifrovan i reveal audit testiran; local receipt delivery ne postoji. |
| WEB-08 | gap | Skriveni `customer_issuer` put nije migriran. |

## 7. Baseline odluka

Baseline je reproducibilan i postojeći testovi su zeleni. Production acceptance
ostaje **NO-GO**, očekivano pre Promptova 01–16, zbog crvenih package/schema,
V2 operation/receipt, jedinstvene Webshop konekcije i deployment-worker granica.
