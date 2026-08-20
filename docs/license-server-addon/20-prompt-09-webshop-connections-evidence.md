# Prompt 09 — Webshop License Server konekcije i katalog: as-built evidence

Datum provere: 2026-08-16. Ovo je development/isolated-DB dokaz; nije production
deploy niti live customer traffic dokaz.

## Granica vlasništva

- `webshop.webshop_license_server_connections` i tri prateće tabele su
  package-owned customer License Server model.
- `local_addon` koristi samo javni `customerLicenseIssuer.v2` SDK capability;
  opcija se ne renderuje ako zasebni License Server add-on nije `ready` V2.
- `remote_nrls_v2` koristi HTTPS NRLS2, šifrovan secret, pinovani `issuerRef`,
  ETag/revision katalog i postojeći DNS-pinned outbound guard.
- postojeći `webshop.webshop_license_servers` nije preimenovan niti uklonjen:
  ostaje author-only Master connector za vendorsku prodaju add-on-a;
- istorijski remote zapisi se kopiraju kao `re_auth_required`, pa ne mogu tiho
  postati aktivni customer issuer-i. Skriveni `customer_issuer` proizvod prelazi
  na javni `license_server` + determinističku lokalnu konekciju. Order snapshot-i
  se ne menjaju.

## Implementirano

- aditivna migracija `0008_webshop_customer_license_server_connections.sql`,
  schema version 8, checksum u `migrations.json`, postcondition fingerprint
  `c47cdb23c85c4b186850ef70ae98303d46808a7d0367b61270f86409e7cf649a`;
- connection status/scopes/environment, pinovani issuer, remote credential
  rotation/re-auth, health/catalog sync, 304, immutable catalog evidence,
  background metrike i dvominutni crash-recoverable DB lease;
- remote Test connection sa HTTPS-only URL-om, bez redirect-a, bounded response,
  DNS/IP preflight-om i pinned dispatcher-om. UI/action/error odgovor ne vraća
  plaintext ni ciphertext secreta; čuva samo šifrat i SHA-256 fingerprint;
- jedan product policy `license_server`, izbor connection/Product Type/Profile i
  prikaz profile/schema/policy/claim-source zahteva;
- checkout blokira inactive, issuer-drifted ili catalog-revalidation binding i u
  novi order item kopira connection, transport, environment, issuer, catalog,
  Product Type i Profile/schema/policy/claim-requirements snapshot;
- package job `webshopLicenseServerCatalogSync` i CRON-secret zaštićen root
  safety-net `/api/cron/webshop-license-server-catalog`.

## Reproducibilne provere

| Komanda                                                                    | Rezultat                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm --prefix .private/webshop run typecheck`                              | PASS: release + host typecheck                                                                                                                                                                                                                                                        |
| `npm --prefix .private/webshop test`                                       | PASS: 184/184                                                                                                                                                                                                                                                                         |
| `node scripts/verify-webshop-schema-fixture.mjs --expect-hash=c47c...649a` | PASS: empty install + istorijski remote/customer_issuer upgrade, 63 tabela                                                                                                                                                                                                            |
| `npm --prefix .private/addon-deployment-worker test`                       | PASS: 78, SKIP: 5 DB-only worker slučajeva                                                                                                                                                                                                                                            |
| `npm run typecheck`                                                        | PASS                                                                                                                                                                                                                                                                                  |
| `npm test`                                                                 | prvi run: FAIL 3 zbog starih eksplicitnih 59-table/0001..0007 pinova; ugovori ažurirani; finalni run PASS 370, SKIP 10 DB/integration slučajeva                                                                                                                                       |
| `npm run test:db`                                                          | PASS: 380/380 protiv izolovane PostgreSQL baze, bez skipova                                                                                                                                                                                                                           |
| `npm --prefix .private/webshop run install:verify:next`                    | prvi run: spoljašnji timeout 124 s; drugi run: exit 1 tokom čišćenja stale child procesa bez diagnostic fajla; čist treći run PASS: Next 16.3 tarball host, 383 runtime modula                                                                                                        |
| `npm --prefix .private/webshop run pack:verify:local`                      | PASS: allowlist/package verify; artifact `33923e...bf13`, tarball `b2ecd2...dacb`                                                                                                                                                                                                     |
| `npm run build`                                                            | preflight je redom odbio nedostajućih 5 managed-redeploy varijabli, zatim nedostajući system CA i nevažeće `client/vendor + private_workspace` kombinacije; kanonski process-only `development + private_workspace`, oba install moda `disabled`, `NODE_USE_SYSTEM_CA=1` završio PASS |
| `npm run lint`                                                             | PASS: 0 errors; 12 postojećih warning-a van Prompt 09 fajlova                                                                                                                                                                                                                         |

Nijedan failure nije prećutan. Root DB/integration skipovi nisu računati kao
prolaz; schema i istorijski upgrade su zasebno izvršeni protiv izolovane lokalne
PostgreSQL baze, a završni `test:db` je izvršio i svih deset root integracija.
Worker-ovih pet mutating DB testova ostaju skip u običnom worker unit runner-u i
nisu Prompt 09 customer-connection testovi. Nijedna privremena build vrednost
nije upisana u korisnički `.env`.

## WEB mapa

| ID     | Status posle Prompt-a 09       | Dokaz / granica                                                                                                                                                                                                          |
| ------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| WEB-01 | zelen                          | Jedan `license_server` UI/model, local/remote je connection transport.                                                                                                                                                   |
| WEB-02 | zelen za credential storage/UI | AES-256-GCM šifrat + fingerprint; secret ulazi jednom i nikad se ne vraća u action/client payload.                                                                                                                       |
| WEB-03 | zelen                          | Prvi test pin-uje issuer; drift daje `issuer_changed`, deaktivira upotrebu i traži eksplicitan re-auth.                                                                                                                  |
| WEB-04 | zelen                          | ETag/304, revision evidence, deprecated profile projekcija i product revalidation.                                                                                                                                       |
| WEB-05 | delimično do Prompt-a 10       | Connection/issuer/catalog/Product Type/Profile/schema/policy i issuer-ovi mapping zahtevi su pinovani. Korisnički immutable mapping revision/hash ne postoji pre editora iz Prompt-a 10 i zato se ne proglašava zelenim. |
| WEB-08 | zelen za migracioni ugovor     | Izolovana DB fixture potvrđuje remote + hidden-local migraciju i očuvan Master zapis; istorijski order snapshot SQL nije dotaknut.                                                                                       |

Prompt 09 nije promenio paid fulfillment engine. Customer mapping revision,
paid-order issue/reconciliation, receipt i secure delivery ostaju Prompt 10.
