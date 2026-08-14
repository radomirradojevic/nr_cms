# 01 — Postojeće stanje i stvarni jazovi

Datum audita: **2026-08-13**. Ovo je „as-built” snimak, ne lista zamišljenih
funkcija.

## 1. Ono što već postoji

### 1.1 Pakovanje i CMS lifecycle — POSTOJI

- privatni paket `@nr-cms/license-server`, trenutno verzije `0.1.0`;
- potpisan release manifest, provenance, SBOM i generisani server bundle;
- build-time add-on registry; nema proizvoljnog runtime importa putanje iz env-a;
- install/activate/revalidate stanje preko centralnog Master entitlement-a;
- stanja `disabled`, `install_disabled`, `not_installed`, `install_pending`,
  `license_required`, `license_invalid`, `license_expired`, `ready`;
- `license_expired` prelazi u `edit_existing_only` umesto da uništi podatke;
- deployment worker obavlja kontrolisanu instalaciju i redeploy hosta.

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

### 1.4 Lokalni issuer capability — POSTOJI, ALI JE UZAK

`customerLicenseIssuer.v1` prihvata operation key, customer reference,
productType ID, SKU, order reference i metadata, a zatim upisuje lokalni outbox.
Worker pouzdano preuzima posao i izdaje determinističan ključ. Integracioni DB
test dokazuje stvarno izdavanje.

Capability trenutno vraća samo prihvatanje i `operationId`; ne vraća standardni
receipt, delivery payload ili status polling rezultat. Zato Webshop ne može
kompletno da završi isti fulfillment tok kao za udaljeni server.

### 1.5 Customer issuer identitet — POSTOJI, ALI NIJE ZAOKRUŽEN

Postoje:

- single-tenant issuer reference;
- Ed25519 key pair, šifrovan privatni ključ i javni keyset;
- rotacija sa `verification_only` starim ključem;
- export/restore kontrolisanog backup-a;
- kratkotrajni potpisani JWT assertion.

Trenutni assertion je jednosatni token sa osnovnim poljima. Nema verzionisan
custom claim schema snapshot, policy/schema hash, offline sertifikat, javni
keyset endpoint niti kompletan verifier ugovor.

### 1.6 Testovi — POSTOJI DOBRA OSNOVA

U auditu su prošli:

- lokalni release build;
- svi obavezni unit/contract testovi (jedan namerno preskočen test);
- svih 33 DB/integration testova;
- izolirana instalacija u Next.js 16.3 hostu.

Pokriveni su HMAC, nonce, scope, kill switch, rate limit, policy, aktivacije,
release granica, local outbox i konkurentno izdavanje. Ovo ne zamenjuje
Webshop-to-app E2E i production-like install/upgrade/rollback test.

### 1.7 Webshop osnova — POSTOJI, ALI UGOVORI NISU UJEDNAČENI

Webshop već ima digital delivery tipove `license`/`file_license`, izvore
`manual`, `pool` i `license_server`, administraciju License Server konekcija,
šifrovan remote HMAC secret, health/catalog sync i izbor Product Type/SKU-a na
proizvodu.

Međutim, postojeći glavni remote `license_server` fulfillment koristi razvijen
V2 entitlement/operation/reconciliation model koji je nastao za autorov centralni
tok prodaje plaćenih add-on-a. Customer add-on trenutno izlaže drugačiji HTTP V1
ugovor. Paralelno postoji lokalni `customer_issuer` outbox put, ali ta vrednost
nije javni izbor u product policy enum-u i nema kompletan delivery receipt povrat.
Zbog toga pojedinačni delovi postoje, ali nisu jedan kompatibilan customer
License Server proizvod.

## 2. Kritični jazovi do cilja

### G1 — Release UI nije jednak razvojnom UI-u

`src/addon.tsx` koristi pun administrativni dashboard, ali se release bundle
gradi iz `src/release-addon.tsx`, koji prikazuje samo metrike. Objavljeni paket
zato ne garantuje puni product/SKU/license/client/activation UI.

**Gate:** spakovani paket mora izložiti isti podržani admin ugovor kao izvorni
add-on, a test mora to dokazati.

### G2 — Vlasništvo nad schema migracijama je nejasno

Tabele već postoje u CMS core schema, dok paket objavljuje prazan
`migrations.json`. To vezuje privatni proizvod za migracije javnog hosta i
otežava nezavisni upgrade.

**Gate:** odrediti kanonsko vlasništvo, dodati add-on migracije i proveru
forward/rollback kompatibilnosti. Host sme da pruža migration runner, ne da
skriveno poseduje privatnu domensku schemu.

### G3 — Webshop ima neusklađene Master, remote i local issuer puteve

Webshop danas ima `license_server` operation tok sa centralno-entitlement
nasleđem, model udaljene konekcije i skriveni `customer_issuer` lokalni outbox
put. Customer License Server add-on HTTP V1 ne govori isti ugovor. Njihovi
receipt, retry, reveal i lifecycle modeli nisu isti.

**Gate:** jedan korisnički koncept `license_server`, sa konekcijom čiji transport
može biti `local_addon` ili `remote_nrls`. Oba moraju završiti isti durable
operation/receipt/delivery state machine.

### G4 — Custom licencni profil još ne postoji

Postoje feature stringovi i numerički limiti, ali nema:

- verzionisanog claim schema ugovora;
- dozvoljenih izvora i transformacija vrednosti;
- default/override pravila po SKU-u;
- validacije i immutable claim snapshot-a;
- potpisanog offline dokumenta sa tim podacima;
- testnog playground-a i verifier primera.

### G5 — API V1 nije dovoljan za produkcioni fulfillment

Nedostaju standardizovani:

- issue operation status/polling;
- kompletan receipt sa `licenseId`, maskiranim/reveal podatkom i assertion-om;
- javni issuer/keyset endpoint;
- idempotent lifecycle komande za renew/suspend/revoke/refund/chargeback;
- katalog sa schema/policy revision i ETag ugovorom;
- error envelope i eksplicitna verziona kompatibilnost.

V1 se ne sme tiho menjati; uvodi se V2 uz kontrolisan period kompatibilnosti.

### G6 — Digitalna isporuka nije zatvorena end-to-end

Za lokalni issuer nije dokazan tok:

`paid order -> durable request -> issued receipt -> encrypted delivery secret ->
customer reveal/download -> refund/revoke reconciliation`.

License ključ ne sme završiti u logu, običnom metadata JSON-u ili e-mail tekstu.

### G7 — Operacije ključeva i recovery nisu kompletno izloženi

Core funkcije postoje, ali su potrebni:

- admin UI i eksplicitne privilegije;
- passphrase/envelope zaštita export-a;
- javni keyset sa cache/overlap pravilima;
- backup restore proba;
- lost-key i compromised-key runbook;
- rotacija bez prekida validacije ranije izdatih assertion-a.

### G8 — Nedostaje verifier distribucija

Korisnik add-on-a mora moći da licencira sopstvenu aplikaciju. Potrebni su:

- neutralna verifikaciona specifikacija;
- najmanje TypeScript referentni verifier;
- test vectors za validan, istekao, pogrešan audience, nepoznat `kid`, izmenjen
  payload i opozvanu online licencu;
- jasan offline/online threat model.

### G9 — Produkcioni raspored job-ova i observability nisu zatvoreni

Outbox processor postoji, ali release mora definisati scheduler, lease, retry,
dead-letter pregled, alarme, metrike i correlation ID od Webshop porudžbine do
izdate licence.

## 3. Šta namerno nije deo add-on-a

- Master baza, Master signing ključ i prodaja Night Raven add-on licenci;
- Stripe naplata za sam License Server add-on;
- Webshop cart, checkout, porez i refund poslovna pravila;
- proizvoljno izvršavanje korisničkog JavaScript-a u claim mapping-u;
- DRM koji obećava apsolutnu zaštitu od patchovanja offline aplikacije;
- generički secrets manager za aplikacione lozinke ili API ključeve.

## 4. Trenutna ocena

Add-on je funkcionalan tehnički prototip sa ozbiljnom bazom i dobrim testovima,
ali još nije gotov production proizvod za prodaju klijentima. Najvažniji
redosled je: release/schema paritet, objedinjena Webshop konekcija i receipt,
custom schema/signed claims, lifecycle i tek zatim kontrolisani release.
