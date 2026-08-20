# 01 — Postojeće stanje i stvarni jazovi

Datum prvog audita: **2026-08-13**. Prompt 00 baseline je ponovljen
**2026-08-15** i zabeležen u
[`00-reproducible-baseline.md`](./00-reproducible-baseline.md). Ovo je
„as-built” snimak, ne lista zamišljenih funkcija. Statusi su poslednji put
usklađeni posle Prompt-a 06, **2026-08-16**.

## 1. Ono što već postoji

### 1.1 Pakovanje i CMS lifecycle — POSTOJI ZA PROMPT 02 CONTRACT TOK

- privatni paket `@nr-cms/license-server`, trenutno verzije `0.1.0`;
- potpisan release manifest, provenance, SBOM i generisani server bundle;
- build-time add-on registry; nema proizvoljnog runtime importa putanje iz env-a;
- install/activate/revalidate stanje preko centralnog Master entitlement-a;
- stanja `disabled`, `install_disabled`, `not_installed`, `install_pending`,
  `license_required`, `license_invalid`, `license_expired`, `ready`;
- `license_expired` prelazi u `edit_existing_only` umesto da uništi podatke;
- root aktivacija koristi verified entitlement i durable generički add-on
  deployment outbox pre prelaska u `install_pending`;
- `.private/addon-deployment-worker` ima dva exact, eksplicitno allowlist-ovana
  descriptora: Webshop i License Server. Package name, release/digest,
  credential, privilege manifest i runtime putanja ne mogu se zameniti
  proizvoljnom vrednošću;
- worker primenjuje package-owned SQL migracije, a tek potpisani callback za isti
  installation/epoch/generation/release sme da postavi `ready`.

Ciljni proizvod mora imati isti spoljašnji tok kao Webshop add-on: kupovina
zasebne License Server ponude u vendorskom Night Raven CMS Webshop-u, unos
dobijenog `NRLS-...` ključa u **Dashboard → License Server** na ciljnom CMS-u,
Master aktivacija i zatim kontrolisana instalacija/redeploy. Contract i DB testovi
dokazuju target-CMS ključ → `install_pending` → verifikovani install/redeploy →
`ready` bez customer Webshop paketa. Prompt 03 je dodao stabilan zasebno cenjen
vendorski offer i paid Master issue mapping; live payment/production rollout
ostaju release gate.

### 1.2 Domen licence — POSTOJI

Kod je razdvojen na `admin`, `api`, `data` i `lib` slojeve. Postoje:

- product types i SKU-ovi;
- policy šabloni: perpetual single/multi-device, domain, subscription
  device/domain, trial, seat, floating seat, file license i maintenance;
- licencni tipovi `perpetual`, `subscription`, `trial`, `maintenance`;
- ograničenja uređaja, domena i seat-ova;
- validation interval i offline grace;
- feature lista i nepromenljiv policy snapshot na izdatoj licenci;
- statusi aktivne, suspendovane, opozvane, refundirane, chargeback i istekle
  licence;
- aktivacije za device, server, domain i seat;
- validation i audit događaji;
- administrativno ručno izdavanje i promene statusa;
- API klijenti, scope-ovi, rotacija/revokacija secret-a i nonce zaštita.

### 1.3 Postojeći HTTP API — POSTOJI, V1

CMS bridge trenutno izlaže:

- `GET /api/license-server/v1/health`;
- `GET /api/license-server/v1/catalog`;
- `POST /api/license-server/v1/licenses`;
- `POST /api/license-server/v1/licenses/activate`;
- `POST /api/license-server/v1/licenses/validate`;
- `POST /api/license-server/v1/licenses/deactivate`.

Catalog i issue koriste HMAC klijenta. Runtime aktivacija/deaktivacija koristi
licencni ključ i activation token; validate prihvata runtime ili HMAC kontekst.
Request body ima ograničenje, nonce i persistent rate-limit mehanizme.

### 1.4 Lokalni issuer capability — V1 I V2 POSTOJE

`customerLicenseIssuer.v1` prihvata operation key, customer reference,
productType ID, SKU, order reference i metadata, a zatim upisuje lokalni outbox.
Worker pouzdano preuzima posao i izdaje determinističan ključ. Integracioni DB
test dokazuje stvarno izdavanje.

V1 potpis i enqueue odgovor ostali su neizmenjeni, ali adapter sada upisuje istu
durable V2 operaciju. Webshop trajno čuva `operationId` i preko V2 `getOperation`
nastavlja polling posle timeout-a, otkazanog poziva ili restarta, umesto da V1
enqueue tretira kao završen fire-and-forget posao.

Prompt 01 je dodao zaseban javni SDK export
`@nr-cms/addon-sdk/customer-license-issuer-v2`, transport-neutralne JSON tipove i
opcionu root detekciju `customerLicenseIssuerV2`. Od Prompt-a 08 privatni add-on
izlaže puni V2 `describe/catalog/enqueueIssue/getOperation/enqueueLifecycle`
adapter i canonical `customerLicenseIssuerOperations` job. Raw loader i dalje
tačno razlikuje `addon_not_installed`, `addon_invalid` i `v2_not_exported`, dok
entitlement-aware bridge dodatno odbija `install_pending`, not-ready i
`edit_existing_only` stanje. Nema tihog V1 ili Master fallback-a.

### 1.5 Customer issuer identitet i assertion — POSTOJI ZA PROMPT 06

Postoje:

- single-tenant issuer reference;
- Ed25519 key pair, šifrovan privatni ključ i javni keyset;
- rotacija sa `verification_only` starim ključem;
- A256GCM export/restore sa zasebnim backup ključem;
- strict `NRC-CUSTOMER-LICENSE+JWT` V2 iz committed profile/schema/policy/claim
  snapshot-a i activation/receipt binding;
- javni `/v2/issuer` i `/v2/keys` sa ETag/cache/revision/overlap pravilima;
- `.nrls.json`, CMS-nezavisni TypeScript verifier i language-neutral vektori;
- eksplicitni `recovery_required` bez tihog novog issuer-a.

Legacy V1 ostaje jasno versioned i V2 verifier ga ne reinterpretira. Public HTTP
V2 i local capability V2 koriste isti application servis i isti operation/
receipt/error model.

### 1.6 Testovi — POSTOJI DOBRA OSNOVA

U auditu su prošli:

- lokalni release build;
- svi obavezni unit/contract testovi (jedan namerno preskočen test);
- svih 33 DB/integration testova;
- izolirana instalacija u Next.js 16.3 hostu.

Pokriveni su HMAC, nonce, scope, kill switch, rate limit, policy, aktivacije,
release granica, local outbox i konkurentno izdavanje. Ovo ne zamenjuje
Webshop-to-app E2E i production-like install/upgrade/rollback test.

Prompt 02 je naknadno podigao package DB matricu na 39/39 i worker izolovanu DB
matricu na 83/83, uz packed install verifier i target activation 9/9. Tačne
komande, početni failure-i i preskočeni testovi su u
[`13-prompt-02-migration-evidence.md`](./13-prompt-02-migration-evidence.md).

Posle Prompt-a 06 add-on DB/release matrica je 71/71, root unit/contract matrica
368 pass uz 10 očekivanih DB skipova, Webshop 176/176, a isolated Next 16.3 host
renderuje i javne issuer/keyset/verification putanje. Tačan digest i failure log
su u [`17-prompt-06-assertion-evidence.md`](./17-prompt-06-assertion-evidence.md).

### 1.7 Webshop osnova — POSTOJI, ALI UGOVORI NISU UJEDNAČENI

Webshop već ima digital delivery tipove `license`/`file_license`, izvore
`manual`, `pool` i `license_server`, administraciju License Server konekcija,
šifrovan remote HMAC secret, katalog sync/ETag i izbor Product Type/SKU-a na
proizvodu. Postoje health URL helper i health status kolone, ali stvarni health
probe/update tok još nije implementiran.

Međutim, postojeći glavni remote `license_server` fulfillment koristi razvijen
V2 entitlement/operation/reconciliation model koji je nastao za autorov centralni
tok prodaje plaćenih add-on-a. Customer add-on trenutno izlaže drugačiji HTTP V1
ugovor. Paralelno postoji lokalni `customer_issuer` outbox put, ali ta vrednost
nije javni izbor u product policy enum-u i nema kompletan delivery receipt povrat.
Zbog toga pojedinačni delovi postoje, ali nisu jedan kompatibilan customer
License Server proizvod.

## 2. Kritični jazovi do cilja

### G1 — ZATVOREN U PROMPT-U 03: release/source UI parity

`src/addon.tsx` je jedini funkcionalni production izvor, a
`src/release-addon.tsx` samo compatibility re-export. Signed parity mapa i
isolated tarball host proveravaju puni dashboard/API/capability/jobs ugovor.

### G2 — Vlasništvo nad schema migracijama je zaključano za Prompt 02

Paket sada isporučuje neprazan `migrations.json`, baseline adoption migraciju i
aditivne V2 schema migracije. Root legacy deklaracije ostaju samo compatibility
ogledalo tokom tranzicije; add-on je kanonski vlasnik 18 domenskih tabela i šest
monotono potpisanih migracija, a host poseduje samo generički migration/
control-plane runner i ledger. Osamnaesta tabela je singleton scheduler lease.

**Dokaz:** [`13-prompt-02-migration-evidence.md`](./13-prompt-02-migration-evidence.md)
beleži sve tabele/indekse, checksume, empty/upgrade/rerun/lock/failure/rollback
testove i retain-by-default pravilo. Fizičko uklanjanje legacy ogledala iz root
schema-e nije bezbedno raditi pre završetka adapter tranzicije.

### G3 — DELIMIČNO POSLE PROMPT-A 09: jedinstvena konekcija postoji

Webshop sada ima jedan javni `license_server` source i package-owned connection
model čiji je transport `local_addon` ili `remote_nrls_v2`. Local opcija postoji
samo uz zaseban `ready` V2 add-on; remote tok pin-uje issuer i sinhronizuje
revision/ETag katalog. Legacy `customer_issuer` proizvod migrira se na lokalnu
konekciju, bez izmene order snapshot-a. Adapter nema mrežni fallback niti
direktan upis u `customer_issuer_*` tabele. Preostaju Prompt 10 immutable claim
mapping revision i puni paid-order receipt/delivery reducer.

**Dokaz:** [`20-prompt-09-webshop-connections-evidence.md`](./20-prompt-09-webshop-connections-evidence.md).

**Gate:** jedan korisnički koncept `license_server`, sa konekcijom čiji transport
može biti `local_addon` ili `remote_nrls`. Oba moraju završiti isti durable
operation/receipt/delivery state machine.

### G4 — ZATVOREN U PROMPTOVIMA 04/06: profile, claims i assertion

Postoje stable Product Type/Profile ref-ovi, immutable published revizije,
ograničeni schema model, source/default/override pravila, deterministični hash i
effective claims, admin preview/publish tok i signed committed snapshot. Potpuni
Webshop mapping na profile reviziju ostaje zaseban integration gate.

### G5 — ZATVOREN U PROMPTOVIMA 07/08: HTTP i local V2 adapteri

Durable issue/lifecycle operation, polling model, receipt/reveal/assertion,
HTTP/HMAC V2 i javni local V2 capability rade nad istim application servisom.
Shared DB vectors porede domain, local i HTTP operation/receipt/error semantiku.
Kompletna Webshop delivery i refund/reconciliation matrica ostaje G3/G6, ne
transport gap.

V1 se ne sme tiho menjati; uvodi se V2 uz kontrolisan period kompatibilnosti.

### G6 — Digitalna isporuka nije zatvorena end-to-end

Za lokalni issuer nije dokazan tok:

`paid order -> durable request -> issued receipt -> encrypted delivery secret ->
customer reveal/download -> refund/revoke reconciliation`.

License ključ ne sme završiti u logu, običnom metadata JSON-u ili e-mail tekstu.

### G7 — DELIMIČNO: crypto/recovery jezgro zatvoreno, admin UX ostaje

A256GCM export/restore, javni cached keyset, bounded overlap, recovery-required
stanje, restore DB drill i lost/compromised-key runbook postoje. Preostaje puni
permission-gated admin UI za rotation/export/restore i datirani production
restore evidence.

### G8 — ZATVOREN U PROMPT-U 06: verifier distribucija

Paket izvozi signing-free TypeScript/JavaScript reference verifier,
language-neutral JSON vektore i strict `.nrls.json` parser. Dokument 10 i security
dokument opisuju offline/online trust i freshness granice.

### G9 — DELIMIČNO: scheduler ugovor i lease postoje; live observability ostaje

Release izlaže versioned `customerLicenseIssuer.jobs.v1` ugovor, root cron ruta ga
poziva sa deadline/correlation kontekstom, a DB singleton lease sprečava paralelni
batch kroz više CMS procesa. Issue/lifecycle worker zadržava bounded batch,
operation lease, retry i dead-letter. Produkcioni raspored, alarmi, dashboard
metrike i datirani staging dokaz i dalje su OPS-01 release gate.

### G10 — ZELEN ZA CODE/DB TOK; LIVE RELEASE GATE OSTAJE

Ciljni License Server add-on mora biti zasebna plaćena ponuda pored Webshop
add-on-a u vendorskom Night Raven CMS Webshop-u. Plaćena porudžbina mora izdati
Master ključ za `addonKey: "license-server"`; kupac zatim taj ključ unosi u
**Dashboard → License Server**, a CMS koristi isti aktivacioni i managed-deploy
lifecycle kao kod Webshop add-on-a.

Master i root CMS poznaju `license-server` addon key, exact release/package par i
managed entitlement stanje. Deployment worker prihvata zasebne exact Webshop i
License Server descriptore; test dokazuje target lifecycle bez instaliranog
customer Webshop paketa. Stabilan vendorski offer/order mapping je implementiran
i testiran; live paid-order/redeploy E2E ostaje produkcioni release gate.

**Preostali gate:** vendor paid order → License Server add-on ključ treba spojiti
sa već zelenim target tokom: unos ključa → vezan entitlement → `install_pending`
→ verifikovani paket/migracije/redeploy → `ready`. Webshop add-on nije
instalaciona zavisnost na customer CMS-u.

## 3. Šta namerno nije deo add-on-a

- Master baza, Master signing ključ i prodaja Night Raven add-on licenci;
- Stripe naplata za sam License Server add-on;
- Webshop cart, checkout, porez i refund poslovna pravila;
- proizvoljno izvršavanje korisničkog JavaScript-a u claim mapping-u;
- DRM koji obećava apsolutnu zaštitu od patchovanja offline aplikacije;
- generički secrets manager za aplikacione lozinke ili API ključeve.

## 4. Trenutna ocena

Add-on sada ima dokazani release/schema paritet, profile/claims, durable
operation/receipt, kriptografski V2 assertion/verifier i semantički jednake HTTP/
local V2 adaptere sa trajnim scheduler lease-om. Još nije proglašen
production-ready: preostaju objedinjena Webshop konekcija/fulfillment/lifecycle,
live scheduler observability i kontrolisani staging/production release gate-ovi.
