# Prompt 10 — Webshop claim mapping, fulfillment, receipt i isporuka: as-built evidence

Datum poslednje ponovljene provere: 2026-08-20. Ovo je development, isolated-DB i clean-package dokaz;
nije production publish/deploy niti live payment/e-mail saobraćaj.

## Granica vlasništva

- Webshop poseduje product claim mapping, checkout/order snapshot, paid-event
  operation, reconciliation, customer delivery i audit.
- License Server add-on poseduje Product/Profile/schema/policy revizije, customer
  licence, assertion i durable issuer operation/receipt. Webshop u te tabele ne
  upisuje direktno.
- Local transport koristi javni `customerLicenseIssuer.v2` capability. Remote
  transport koristi tačno isti command/result model preko HTTPS NRLS2 HMAC-a.
- Centralni Master poseduje samo kupovinu/aktivaciju add-on-a. Customer
  fulfillment nema Master fallback i ne može izdati `NRLS-...` add-on ključ.
- Deployment worker poseduje samo provereni install/migration privilege ugovor;
  Prompt 10 mu dodaje jednu eksplicitno allowlist-ovanu Webshop tabelu, ne novu
  runtime putanju niti arbitrary package/script mogućnost.

## Implementirano

- Ograničeni editor i domen za šest eksplicitnih Webshop source kategorija,
  Product/order/variant selektore, preview, required/unknown/source proveru,
  32 KiB mapping/input granicu, 4 KiB konstantu, depth/array/object limite i
  prototype-pollution zaštitu. Nema eval-a, template-a, SQL-a ni JSONPath-a.
- `webshop_license_claim_mapping_revisions` sa monotonim product revision-om,
  canonical SHA-256 hash-om i immutable snapshot/profile evidence-om. Migracija
  `0009_webshop_customer_license_fulfillment.sql` je aditivna; postojeći binding
  postaje `configuration_required`, a istorijski order snapshot nije prepisan.
- Checkout pin-uje connection/transport/environment/issuer, Product Type,
  Profile/schema/policy i mapping ID/revision/hash/snapshot pre plaćanja.
- Plaćena stavka kreira jednu Webshop operation sa ključem
  `webshop:<webshopId>:<orderItemId>:issue:v2`. Unpaid ulaz je server-side no-op;
  unique order-item i operation idempotency sprečavaju duplicate paid event.
- Accepted local/remote issuer operation ID se čuva pre sledećeg pokušaja.
  Timeout bez ID-a ponavlja isti idempotency key; sa ID-em se samo poll-uje.
  Worker ima bounded lease/retry/dead-letter i admin replay postojeće operacije.
- Terminalni receipt čuva public/masked podatke i assertion. Plaintext key se,
  kada postoji, odmah AAD-bound envelope-encryptuje i izostavlja iz request,
  receipt, log i error snapshot-a.
- Customer reveal/download ponavlja ownership/permission i delivery gate, koristi
  package-local distributed rate limit, audit i compare-and-set reveal-once.
  Customer account reveal u istoj transakciji označava receipt kao isporučen,
  završava stavku i ponovo računa order lifecycle. Admin reveal je zasebno
  auditovan i ne menja customer delivery stanje.
- E-mail provider dobija samo kontrolisani link. `.nrls.json` je strict v1
  envelope (`format`, `version`, `issuer`, `assertion`, `keysetHint`) i šalje se
  kao attachment uz `no-store`, `no-referrer`, `nosniff` i `noindex`.
- `file_license` zadržava postojeći file entitlement i dodaje isti issuer receipt
  na istu order stavku; issue unique constraint i idempotent order recalculation
  sprečavaju dvostruku licencu ili dvostruki fulfillment rezultat.

## Reproducibilne provere

| Komanda                                                                                                                                                                                                                                                          | Rezultat                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm --prefix .private/webshop run typecheck`                                                                                                                                                                                                                    | PASS: release + host typecheck                                                                                                                                                                                        |
| `npm --prefix .private/webshop run test`                                                                                                                                                                                                                         | PASS: 190/190; uključuje Prompt 10 mapping, remote issue/poll/timeout, local V2/restart i delivery ugovore                                                                                                            |
| `npm --prefix .private/webshop run test:fulfillment:db`                                                                                                                                                                                                          | PASS: 1/1 pravi disposable-PostgreSQL E2E; unpaid, 8-way duplicate paid event, dva profila, remote timeout/restart/poll, delivery retry, link/session, distributed rate-limit, reveal-once, download i `file_license` |
| `node scripts/verify-webshop-schema-fixture.mjs --expect-hash=2962412913957e92153c421892661eb067ad81e9332ac154356effdd3a04e74f`                                                                                                                                  | PASS: 64 package-owned Webshop tabele, empty/upgrade/rerun/cleanup fixture                                                                                                                                            |
| `npm --prefix .private/license-server-addon run typecheck`                                                                                                                                                                                                       | PASS: release + host                                                                                                                                                                                                  |
| `npm --prefix .private/license-server-addon run test:db:local`                                                                                                                                                                                                   | PASS: 80/80, bez skipova; durable issue, local/HTTP parity, exact-once/crash/restart i receipt testovi                                                                                                                |
| `npm --prefix .private/addon-deployment-worker run typecheck`                                                                                                                                                                                                    | PASS                                                                                                                                                                                                                  |
| `npm --prefix .private/addon-deployment-worker run test:unit`                                                                                                                                                                                                    | PASS: 78, SKIP: 5 mutating worker DB slučajeva koji nisu Prompt 10 fulfillment testovi                                                                                                                                |
| `npx tsx --test tests/customer-license-issuer-v2-contract.test.ts tests/addon-deployer-provision-contract.test.mjs tests/webshop-schema-contract.test.mjs tests/license-server-addon-release.test.ts tests/webshop-activation-control-plane.integration.test.ts` | PASS: 19, SKIP: 9 DB-only activation slučajeva                                                                                                                                                                        |
| `node scripts/run-test-command-with-test-db.mjs npx tsx --test tests/webshop-activation-control-plane.integration.test.ts`                                                                                                                                       | PASS: 9/9, bez skipova; zasebna License Server activation → `install_pending` → managed result granica ostaje zelena                                                                                                  |
| `npm --prefix .private/webshop run install:verify:next`                                                                                                                                                                                                          | PASS: čist signed tarball host, Next 16.3.0, frozen install, 384 runtime modula, route/RSC/client import; artifact `9723d8...4dd8`, tarball `5da75c...23a6`                                                           |
| `npm --prefix .private/webshop run pack:verify:local`                                                                                                                                                                                                            | PASS: build/typecheck/190 testova i npm allowlist; artifact `9723d8...4dd8`, final tarball `36fe0f...2631`                                                                                                            |
| `npm run typecheck`                                                                                                                                                                                                                                              | PASS                                                                                                                                                                                                                  |

## Uočeni i otklonjeni failure-i

- Prvi Webshop typecheck posle dodavanja polja prijavio je pet lokalnih shape/import
  grešaka; sva mesta su dopunjena, a dva završna typecheck run-a su prošla.
- Novi remote test je otkrio singularnu `operations/issue` putanju; ispravljena je
  na zaključani `/operations/issues` ugovor i exact-path test sada prolazi.
- Fulfillment pregled je pokazao da je paid uslov postojao u caller toku, ali ne i
  kao guard same enqueue funkcije; dodat je fail-safe unpaid no-op pre inserta.
- Direktni `npm ...license-server-addon test` je očekivano odbijen jer production
  build ne prihvata inline/nedostajući release signing key. Kanonski
  `test:local`, a zatim `test:db:local`, prošli su sa lokalnom test authority.
- Prvi root manifest test je odbio stare fingerprint pinove; sledeći je ispravno
  odbio Prettier-formatted necannonical JSON. Manifesti su vraćeni u canonical
  byte format, sva tri SHA-256 pina su obnovljena i finalni test je 7/7.
- Dva rana nova contract assertion-a bila su stroža od stvarnog bezbednog koda
  (drugačiji poziv envelope helper-a i ekvivalentan `no-store, private` header);
  testovi su usklađeni sa stvarnim invariantom, bez slabljenja produkcionog koda.
- Ponovljeni audit posle workstation restarta otkrio je da je stari
  `test:db` samo izvršavao unit/contract suite sa izolovanim URL-om, ali nije
  prolazio paid fulfillment kroz PostgreSQL. Dodat je zaseban
  `test:fulfillment:db` i disposable runner; evidence više ne predstavlja
  unit suite kao fulfillment DB E2E.
- Isti audit je našao da account-page reveal poziva domain funkciju mimo API
  download rate-limit-a i da uspešan account reveal nije završavao item/order.
  Reveal sada ima sopstveni distributed bucket na domain i e-mail session
  granici, a customer CAS transakcija auditira i završava lifecycle.
- Prvi novi DB fixture run razotkrio je nepotpun paid fixture (nedostajući
  payment join) i UUID/text parametar; fixture je dopunjen i finalni run je
  prošao. Test takođe eksplicitno proverava persisted accepted operation pre
  nastavka, tako da restart nije samo source-level assertion.
- Prvi ponovljeni clean Next host run odbio je Drizzle optional SQLite peer u
  npm resolveru pre build-a. Clean host sada koristi svoj jednokratni cache i
  `--omit=optional` za neupotrebljene DB drivere; PostgreSQL/Next peer granica,
  frozen install i finalni Next build su zatim prošli.

Nijedan failure nije prećutan. Worker-ovih pet mutating DB skipova i dev root
komande sa devet skipova nisu računati kao prolaz; relevantni License Server DB
suite i root activation DB suite izvršeni su zasebno bez skipova. Nisu menjani
korisnički `.env` fajlovi niti izvršen production publish/deploy.

## Acceptance mapa

| ID           | Status                             | Dokaz                                                                                                                                                                                                    |
| ------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WEB-05       | zelen                              | Immutable mapping revision/hash i kompletan checkout/order pin; invalid/draft/drift blokada.                                                                                                             |
| WEB-06       | zelen za code/contract/isolated DB | Disposable PostgreSQL potvrđuje unpaid no-op, 8-way duplicate-safe insert, persisted accepted operation, timeout/restart poll i dva različita profile snapshot-a; local/remote adapter imaju isti model. |
| WEB-07       | zelen za code/DB/packed host       | Durable public receipt, envelope key, DB-enforced reveal bucket, CAS reveal-once, permission/audit, link-only e-mail, customer lifecycle completion i kontrolisani `.nrls.json`.                         |
| WEB-08       | zelen                              | Hidden-local upgrade ostaje kompatibilan; `0009` ne prepisuje order snapshot; `file_license` ne kreira drugi issue.                                                                                      |
| ISSUE-01..06 | zeleni                             | License Server 80/80 DB suite plus Webshop stable key/hash, poll i secret-minimal receipt granica.                                                                                                       |

Live provider payment, pravi customer mailbox i production browser session ostaju
staging/release dokazi. Oni nisu izvršeni niti predstavljeni kao da jesu.
