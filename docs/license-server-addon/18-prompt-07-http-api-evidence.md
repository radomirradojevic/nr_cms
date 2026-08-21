# Prompt 07 — HTTP API V2 as-built evidence

Datum provere: 16. avgust 2026.

## Ishod i granice vlasništva

`@radomirradojevic/license-server-addon` sada poseduje zaseban HTTP V2 router i njegovu API
schema-u. Router ne izdaje licencu samostalno: HMAC adapter prevodi zahtev u
postojeći durable issue/lifecycle application servis, pa domain i remote poziv
dele operation, idempotency i receipt. Centralni Master nije importovan niti
pozvan. Root CMS poseduje samo route bridge, javni SDK/loader i zajedničku
distributed-rate-limit infrastrukturu; Webshop ostaje consumer ugovora.

Public rute su `health`, `issuer`, `keys`, `openapi.json` i runtime
`activate/validate/deactivate`. HMAC rute su `catalog`, `operations/issues`,
`operations/{id}` i `operations/lifecycle`. Local
`customerLicenseIssuer.v2` capability namerno ostaje `v2_not_exported` do
Prompt-a 08; to ne utiče na dostupnost remote HTTP V2 adaptera.

## Implementacioni dokaz

- `.private/license-server-addon/src/api/v2.ts` je jedini V2 router i jedini
  safe JSON error boundary; V1 kod u `src/api/routes.ts` samo delegira kada je
  path verzija `v2`.
- `src/lib/api-v2-hmac.ts` i `src/lib/api-v2-auth.ts` zaključavaju exact UTF-8
  body hash, RFC3986 query ordering, 300 s skew, canonical 128-bit nonce,
  timing-safe potpis, persistent replay ledger i current/previous secret proveru.
- `src/api/v2-contract.ts` je zajednički Zod/OpenAPI izvor; build isporučuje
  `dist/openapi-v2.json` i `dist/nrls2-hmac-v2-vectors.json`.
- `src/data/catalog.ts` izlaže samo objavljene/deprecated profile i javna
  Webshop mapiranja, uz revision/ETag; `internal_only` vrednosti nisu deo
  odgovora.
- `src/data/operations.ts` ostaje jedini issue/lifecycle owner. Remote adapter
  ne poziva Master i ne generiše novi ključ pri HTTP retry-ju.
- package migration `0005_http_api_v2_secret_overlap.sql` aditivno dodaje
  bounded prethodni HMAC secret i optimistic `secretVersion`; checksum u
  `migrations.json` je
  `7721a5ec11dfc0f204d852484d285eb1dcf46242dc32c3c7382908c9ac86d62c`.

Finalni signed artifact SHA-256 je
`280929cbe37be26c28ec163102dad5cc292cbafc1dd5e98091466dea3b8bab76`.
Reproducibilni allowlist/secret-scan pack SHA-256 je
`7a1c2913bce689cf1dc9efe8b11c57723508f7620c8a8beea8277d244912f007`.

## Komande i rezultati

Sve komande su pokrenute bez izmene korisničkih env fajlova; release authority i
DB wrapper koriste kratkoživeći process scope.

| Working directory | Komanda | Rezultat |
| --- | --- | --- |
| `.private/license-server-addon` | `npm run build:local` | PASS; release+host typecheck, 73/73 non-DB testova, 6 DB testova eksplicitno skipped; zatim je finalni DB build nakon security review-a dao artifact `280929…`. |
| `.private/license-server-addon` | `npm run typecheck` | PASS nad finalnim izvorom; release i host konfiguracije. |
| `.private/license-server-addon` | `npm run test:db:local` | PASS; 79/79, 0 fail, 0 skipped. Uključuje durable/domain↔HTTP parity, nonce replay, clock skew, secret overlap, migration i packed capability DB testove. |
| `.private/license-server-addon` | `npm run pack:verify` | PASS; poslednja provera posle root build-a pravi dva byte-identična pack-a, allowlist i secret/source/env scan su čisti; tarball `7a1c29…`. |
| `.private/license-server-addon` | `npm run install:verify:next:db` | PASS; artifact `280929…`, frozen tarball `3e0e6e…`, Next.js 16.3.0 build; renderovani puni dashboard, V1 health, V2 issuer/keys i verifier, sa DB migracijama. |
| `.private/webshop` | `npm run typecheck` | PASS. |
| `.private/webshop` | `npm run test` | PASS; 176/176, 0 skipped. Postojeći V1 request/path signing contract ostao zelen. |
| root | `npm run typecheck` | PASS. |
| root | `npm run test` | PASS; 368 passed, 10 eksplicitno skipped, 0 fail. |
| root | `$env:WEBSHOP_INSTALL_MODE='disabled'; $env:NODE_USE_SYSTEM_CA='1'; npm run build` | PASS; Next.js 16.3 production build i oba privatna add-on release build-a. |

Pre uspešnog root build-a zabeleženi su i neuspešni pokušaji:

1. `npm run build` je fail-ovao na očekivanoj runtime-env validaciji zato što je
   postojeći local env birao `managed_redeploy`, a nije imao pet obaveznih worker
   callback/auth vrednosti.
2. Dijagnostički rerun sa privremenim placeholder worker vrednostima prošao je
   taj gate, ali je fail-ovao na lokalnom CA trust-u.
3. Rerun sa uključenim system CA je otkrio deployment-profile neslaganje.
4. Gore navedena finalna komanda je eksplicitno izabrala podržani lokalni
   `disabled` install profil i prošla. Nijedan env fajl nije menjan.

Windows sandbox je za tri package komande vraćao OS process error 1920 pre nego
što je Node pokrenut; iste tačne komande su zatim odobreno izvršene izvan
sandboxa i prošle. Ovo nije test failure aplikacije, ali je zabeleženo radi
reproducibilnosti.

Isolated-host tarball SHA se razlikuje od `pack:verify` SHA zato što isolated
komanda pre pack-a pravi nov kratkoživeći lokalni signing authority i novi
potpis/provenance. `pack:verify` reproducibilnost poredi dva byte-identična
pakovanja istog već potpisanog release stanja.

## Pokrivena security/contract matrica

- exact body byte potpis i whitespace/tamper razlika;
- stabilno query sortiranje i odbijanje traversal/encoded path varijanti;
- malformed Authorization/nonce/JSON/query, clock skew i persistent replay;
- current/previous secret overlap i optimistic rotation;
- action/environment/product/profile scope i 409 idempotency konflikt;
- 24 KiB limit pre parse-a, content-encoding rejection i unknown-field schema;
- pre-auth distributed i runtime rate-limit granice;
- catalog ETag/304 i zabrana `internal_only` projekcije;
- issue/status/receipt i lifecycle parity sa domain servisom;
- activate → token-only validate/deactivate i generička anti-enumeration greška;
- JSON/no-stack/no-SQL/no-secret/no-HTML/no-redirect error ugovor;
- V1 regresija kroz root/add-on/Webshop matrice.

## Šta nije urađeno

Nisu menjani V1 response-i, nije izložen local V2 capability, nije prebačen
Webshop fulfillment na V2, niti su izvršeni publish, live TLS/reverse-proxy
probe, production deploy, staging load ili live traffic. To su naredni promptovi
i release gate-ovi, ne prikriveni Prompt 07 failure-i.
