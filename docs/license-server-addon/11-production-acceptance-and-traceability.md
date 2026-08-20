# 11 — Produkcioni acceptance i sledljivost

Ovaj dokument je Definition of Done. Stavka je zelena samo uz automatizovan test
ili sačuvan operativni dokaz. „Ručno izgleda da radi” nije dovoljan dokaz za
kritične tokove.

## 1. Arhitektonske granice

| ID      | Zahtev                                                       | Dokaz                                                  |
| ------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| ARCH-01 | Master licencira add-on, ne customer proizvode.              | Contract/architecture test i pregled dependency grafa. |
| ARCH-02 | License Server je zaseban add-on, ne deo Webshop paketa.     | Package/registry/install test.                         |
| ARCH-03 | Local integracija koristi javni SDK capability.              | Boundary test bez privatnih importa.                   |
| ARCH-04 | Remote integracija koristi HTTPS/HMAC V2.                    | Contract + security test.                              |
| ARCH-05 | Local i remote daju isti operation/receipt model.            | Zajednički test vectors.                               |
| ARCH-06 | Customer runtime validacija ne zavisi od Master dostupnosti. | Outage E2E.                                            |

## 2. Paket, lifecycle i schema

| ID      | Zahtev                                                                                                                                                                      | Dokaz                                                                 |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| PKG-01  | Potpisan paket ima manifest, provenance, SBOM i digest.                                                                                                                     | Artefakt iz release pipeline-a.                                       |
| PKG-02  | Release entrypoint ima puni podržani admin UI/API/capability/jobs.                                                                                                          | Packed-host parity E2E.                                               |
| PKG-03  | Build-time registry je jedini production loader.                                                                                                                            | Boundary/static test.                                                 |
| PKG-04  | Fresh install iz tarball-a radi u Next.js 16.3 hostu.                                                                                                                       | Isolated install/build/start.                                         |
| PKG-05  | Vendorski Night Raven CMS Webshop prodaje License Server kao zasebnu ponudu pored Webshop add-on-a; paid order izdaje Master ključ za `addonKey: "license-server"`.         | Vendor offer/purchase-intent/paid-fulfillment contract i E2E.         |
| PKG-06  | Unos kupljenog ključa u **Dashboard → License Server** koristi isti activation/managed-install lifecycle kao Webshop i završava u `ready`; customer Webshop nije preduslov. | Target-CMS activation + allowlisted deployment-worker + redeploy E2E. |
| DATA-01 | Add-on schema migracije imaju vlasnika/checksum/lock.                                                                                                                       | Migration manifest i test.                                            |
| DATA-02 | Empty DB i upgrade sa prethodne verzije prolaze.                                                                                                                            | DB pipeline.                                                          |
| DATA-03 | App rollback/forward-fix ne uništava nove podatke.                                                                                                                          | Compatibility test/runbook.                                           |
| DATA-04 | Uninstall zadržava podatke po default-u.                                                                                                                                    | Lifecycle test.                                                       |

## 3. Product, profile i claims

| ID       | Zahtev                                                        | Dokaz                            |
| -------- | ------------------------------------------------------------- | -------------------------------- |
| PROF-01  | Product Type i Profile imaju stabilne ref-ove i revision.     | DB/domain test.                  |
| PROF-02  | Objavljena Profile/Schema revision je immutable.              | Permission/DB test.              |
| PROF-03  | Postojeći SKU-ovi migriraju bez promene izdatih licenci.      | Fixture migration test.          |
| CLAIM-01 | Samo dozvoljeni JSON Schema subset prolazi.                   | Positive/negative/property test. |
| CLAIM-02 | Defaults/override/source pravila daju deterministične claims. | Canonical vectors.               |
| CLAIM-03 | Unknown/oversized/deep/prototype payload se odbija.           | Security tests.                  |
| CLAIM-04 | License čuva schema/policy/claim immutable snapshot/hash.     | DB integration test.             |
| CLAIM-05 | PII/secrets ne ulaze u assertion po default-u.                | Snapshot/secret scan.            |

## 4. Issue i lifecycle engine

| ID       | Zahtev                                                         | Dokaz                   |
| -------- | -------------------------------------------------------------- | ----------------------- |
| ISSUE-01 | Plaćena stavka izdaje tačno jednu licencu.                     | Concurrent/retry E2E.   |
| ISSUE-02 | Isti key + isti hash vraća isti receipt.                       | Idempotency test.       |
| ISSUE-03 | Isti key + drugi hash daje conflict.                           | Negative test.          |
| ISSUE-04 | Crash/restart/lease expiry bezbedno nastavlja outbox.          | Fault-injection test.   |
| ISSUE-05 | Terminalne greške završavaju u preglednom dead-letter-u.       | Worker/admin test.      |
| ISSUE-06 | Receipt i reveal secret nisu u logu/plain metadata.            | Log snapshot/DB test.   |
| LIFE-01  | Renew/suspend/resume/revoke/refund/chargeback su idempotentni. | State-machine test.     |
| LIFE-02  | Refund/chargeback se eventualno odražava na validaciju.        | Webshop-to-runtime E2E. |

## 5. Webshop

| ID     | Zahtev                                                         | Dokaz                   |
| ------ | -------------------------------------------------------------- | ----------------------- |
| WEB-01 | Jedan `license_server` izbor podržava local/remote connection. | UI/model E2E.           |
| WEB-02 | Remote secret je šifrovan i reveal-once.                       | DB/security test.       |
| WEB-03 | IssuerRef je pin-ovan; neočekivana promena blokira konekciju.  | Connector test.         |
| WEB-04 | Catalog ETag/revision i archived profile ponašanje rade.       | Sync test.              |
| WEB-05 | Order item pin-uje profile/schema/mapping revision.            | Checkout snapshot test. |
| WEB-06 | Pending issue preživljava browser/server restart.              | E2E restart test.       |
| WEB-07 | Delivery key je envelope-encrypted i auditovan.                | Reveal/download test.   |
| WEB-08 | Skriveni `customer_issuer` put je migriran/kompatibilan.       | Migration test.         |

## 6. Kriptografija i runtime

| ID        | Zahtev                                                             | Dokaz                      |
| --------- | ------------------------------------------------------------------ | -------------------------- |
| CRYPTO-01 | Assertion striktno proverava alg/typ/v/iss/aud/kid/signature/time. | Language-neutral vectors.  |
| CRYPTO-02 | Public keyset ima ETag/cache/rotation overlap.                     | Integration test.          |
| CRYPTO-03 | Stara licenca radi posle normalne key rotacije.                    | Rotation E2E.              |
| CRYPTO-04 | Backup/restore zadržava issuerRef i stare potpise.                 | Restore drill.             |
| CRYPTO-05 | Privatni ključ je šifrovan i nikad nije u paketu/logu.             | Secret scan/DB inspection. |
| RUN-01    | Aktivacioni concurrency ne probija limit.                          | Parallel DB test.          |
| RUN-02    | Device/domain/server/seat policy radi.                             | Matrix test.               |
| RUN-03    | Offline grace i assertion expiry daju tačnu odluku.                | Clock vectors.             |
| RUN-04    | Revoked/refunded/chargeback online odbijaju.                       | Lifecycle test.            |

## 7. Security i operacije

| ID     | Zahtev                                                       | Dokaz                     |
| ------ | ------------------------------------------------------------ | ------------------------- |
| SEC-01 | Admin mutacije imaju auth + granular permission.             | Authz matrix.             |
| SEC-02 | HMAC timestamp/nonce/scope/timing-safe provere rade.         | Security contract test.   |
| SEC-03 | Persistent multi-process rate limits rade.                   | Integration/load test.    |
| SEC-04 | Remote URL je zaštićen od SSRF/redirect/rebinding-a.         | Security test.            |
| SEC-05 | Error/log/e-mail nemaju secrets ili nepotreban PII.          | Automated snapshots/scan. |
| OPS-01 | Scheduler, retry, dead-letter i manual replay su operativni. | Staging evidence.         |
| OPS-02 | Metrike/alarme moguće je pratiti po correlation ID-u.        | Dashboard/alert test.     |
| OPS-03 | DB+key backup je stvarno obnovljen.                          | Datiran restore zapis.    |
| OPS-04 | Master outage/degraded režim je testiran.                    | Fault E2E.                |
| OPS-05 | Runbook pokriva lost/compromised key i connector secret.     | Incident tabletop/drill.  |

## 8. Dokumentacija i developer experience

| ID    | Zahtev                                                   | Dokaz                               |
| ----- | -------------------------------------------------------- | ----------------------------------- |
| DX-01 | API schema i error codes su versioned i objavljeni.      | Generisana/proverena dokumentacija. |
| DX-02 | TypeScript verifier i test vectors su deo release-a.     | Clean consumer test.                |
| DX-03 | Admin može preview/testirati custom claim/assertion.     | Packed UI E2E.                      |
| DX-04 | Primer aplikacija ne sadrži HMAC/private secret.         | Static/secret scan.                 |
| DX-05 | Upgrade/deprecation vodič postoji za V1 i capability V1. | Release notes review.               |

## 9. Performance i pouzdanost

| ID      | Zahtev                                                          | Dokaz                     |
| ------- | --------------------------------------------------------------- | ------------------------- |
| PERF-01 | Validate i issue acceptance zadovoljavaju dogovoreni p95.       | Reproducibilan load test. |
| PERF-02 | 100+ konkurentnih issue/activation zahteva čuva invariant.      | Stress test.              |
| PERF-03 | Queue backpressure ne ruši CMS niti gubi posao.                 | Soak/fault test.          |
| PERF-04 | Keyset/catalog cache smanjuje nepotrebno DB/mrežno opterećenje. | Metrics test.             |

## 10. Release odluka

### Automatski NO-GO

- bilo koji otvoren critical/high security nalaz bez formalno prihvaćenog rizika;
- duplikat licence ili probijen activation limit u testu;
- neobnovljiv signing backup;
- release/source UI ili API parity nije dokazan;
- migration nije proverena nad prethodnom verzijom;
- plaintext secret/ključ u logu, paketu ili običnom DB metadata polju;
- local/remote Webshop paid-order E2E nije zelen;
- issuerRef se može tiho promeniti;
- produkcioni add-on zahteva Master poziv za svaku customer validaciju.

### GO zapis

GO odluka navodi verziju, commit, package digest, Master release ID, schema
version, test evidence, restore datum, canary plan, rollback/forward-fix plan i
ime operatora koji je eksplicitno odobrio publish/deploy.

## 11. Evidence indeks po release-u

Preporučeni direktorijum van source paketa:

```text
release-evidence/license-server/<version>/
  build.json
  tests.json
  package-digest.txt
  migration-report.json
  sbom.json
  provenance.json
  security-scan.json
  restore-drill.md
  staging-e2e.md
  canary.md
  approval.md
```

Evidence ne sadrži production secrets, plaintext licence ili customer PII.

## 12. Status posle Prompt-a 02

Ovaj status ne proglašava ceo proizvod spremnim; beleži samo dokaz nastao
zaključavanjem javne granice.

| ID      | Status                               | Dokaz / preostali gate                                                                                                                                     |
| ------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARCH-01 | **zelen za javnu granicu**           | [ADR-0001](./adr/0001-customer-issuer-v2-boundary.md) i boundary test zabranjuju Master/private/DB coupling i mrežni fallback iz customer issuer bridge-a. |
| ARCH-02 | **zelen za package/install granicu** | Zaseban paket i exact License Server worker descriptor su testirani; customer Webshop nije zavisnost.                                                      |
| ARCH-03 | **delimično**                        | V2 javni SDK, root type i detekcija su zeleni; privatni add-on i Webshop još ne koriste V2.                                                                |
| ARCH-04 | **otvoreno**                         | HTTP/HMAC V2 adapter još nije implementiran.                                                                                                               |
| ARCH-05 | **delimično**                        | Jedinstveni JSON operation/receipt tipovi i local/remote serialization fixture su zeleni; stvarni adapter E2E još nedostaje.                               |
| ARCH-06 | **otvoreno**                         | Granica zabranjuje Master fallback, ali outage/runtime E2E još nije izvršen.                                                                               |
| DX-05   | **delimično**                        | ADR dokumentuje V1→V2 adapter i deprecation pravila; finalni release notes/evidence čekaju V2 E2E.                                                         |

Prompt 02 evidence: [13-prompt-02-migration-evidence.md](./13-prompt-02-migration-evidence.md).

| ID      | Status                       | Dokaz / preostali gate                                                                                                                                    |
| ------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DATA-01 | **zelen**                    | Package manifest/checksum/compatibility, per-addon advisory lock i `cms_addon_migrations` ledger.                                                         |
| DATA-02 | **zelen**                    | Empty DB, postojeći fixture/data upgrade, rerun i concurrent installer testovi.                                                                           |
| DATA-03 | **zelen**                    | Aditivna schema, stari write i application rollback compatibility; nema destruktivnog down-a.                                                             |
| DATA-04 | **zelen**                    | Retain-by-default package pravilo i test; nema executable purge/uninstall migracije.                                                                      |
| PKG-06  | **zelen za contract/DB tok** | License Server key → `install_pending` → exact worker install/redeploy → `ready` bez customer Webshop paketa. Live production deploy ostaje release gate. |

## 13. Status posle Prompt-a 03

Prompt 03 evidence:
[14-prompt-03-release-parity-evidence.md](./14-prompt-03-release-parity-evidence.md).

| ID     | Status                                | Dokaz / preostali gate                                                                                                                                              |
| ------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PKG-01 | **zelen za lokalni release artifact** | Potpisani manifest/provenance/SBOM/artifact inventory i finalni tarball allowlist/secret audit. Production authority/publish ostaje operator gate.                  |
| PKG-02 | **zelen**                             | `src/addon.tsx` je jedini UI/runtime izvor; packed Next host renderuje overview, API clients, products, profiles, licenses, activations, operations, events i docs. |
| PKG-03 | **zelen**                             | Allowlist-ovani build-time registry je jedini root loader; package nema runtime `.private` ili root alias coupling.                                                 |
| PKG-04 | **zelen**                             | Frozen tarball install/build/start i HTTP render prolaze u Next.js 16.3 hostu sa DB-om.                                                                             |
| PKG-05 | **zelen za code/DB tok**              | Zasebno cenjena vendorska ponuda, signed intent i paid Master issue daju `NRLS-...` ključ pinned na `license-server`; live payment ostaje release gate.             |
| PKG-06 | **zelen za code/DB tok**              | Dashboard purchase handoff i postojeći verified managed-install lifecycle rade bez customer Webshop paketa; live production redeploy ostaje release gate.           |

Customer issuer V2 business engine nije deo Prompt-a 03. Packed capability dokaz
zato namerno očekuje tačno `v2_not_exported`, bez tihog V1 fallback-a.

## 14. Status posle Prompt-a 04

Prompt 04 evidence:
[15-prompt-04-profile-claims-evidence.md](./15-prompt-04-profile-claims-evidence.md).

| ID       | Status                                  | Dokaz / preostali gate                                                                                                                                                                                                             |
| -------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PROF-01  | **zelen**                               | Product Type dobija stabilan normalizovan `externalRef` i `audience`; postojeći SKU ostaje stabilni Profile i dobija monotone revizije. Domain i DB fixture testovi su zeleni.                                                     |
| PROF-02  | **zelen**                               | Samo `draft` je update target; publish je checksum/hash-pinned i transakcion, objavljeni Profile/Schema sadržaj je immutable, a deprecate čuva istoriju. Granularne permission i confirmation provere su testirane.                |
| PROF-03  | **zelen**                               | Schema v3 pravi početnu published reviziju za legacy SKU, pin-uje current revision i test poredi svako prethodno polje postojeće licence; novi snapshot stubovi ostaju `NULL`.                                                     |
| CLAIM-01 | **zelen**                               | Closed, lokalni JSON Schema subset odbija `$ref`, otvorene objekte, unsafe pattern i nepoznate keyword-e; 64 potpuno ograničena polja prolaze.                                                                                     |
| CLAIM-02 | **zelen**                               | NFC/format normalizacija, canonical key order, schema/policy/revision/claim hash i exact override-source resolver imaju deterministične vektore.                                                                                   |
| CLAIM-03 | **zelen**                               | Unknown, payload/string/array/property/depth, enum/numeric i prototype-pollution slučajevi se odbijaju stabilnim kodovima.                                                                                                         |
| CLAIM-04 | **zelen za Prompt 04 issuance granicu** | Nova licenca pin-uje dostupne Profile/Schema reference, policy/default-claim snapshot i hash; postojeća licenca se migracijom ne prepisuje. Webshop claim mapping ostaje Prompt 10.                                                |
| CLAIM-05 | **zelen za claim projection granicu**   | `internal_only` ne ulazi u assertion/customer projection, `runtime_hidden_ui` ne ulazi u customer prikaz, a customer PII/metadata se ne kopira implicitno u custom claim snapshot. Potpisani assertion engine ostaje kasnija faza. |

Prompt 04 nije menjao Webshop fulfillment implementaciju. Relevantni privatni
Webshop customer-issuer, outbox i vendor-offer testovi ostaju zeleni; mapiranje
Webshop proizvoda na objavljenu Profile reviziju ostaje Prompt 10.

## 15. Status posle Prompt-a 05

Prompt 05 evidence:
[16-prompt-05-operation-engine-evidence.md](./16-prompt-05-operation-engine-evidence.md).

| ID       | Status                        | Dokaz / preostali gate                                                                                                                                                         |
| -------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ISSUE-01 | **zelen**                     | 128 konkurentnih identičnih komandi završava sa jednom operation/licencom/receipt-om; kontrolisana issue transakcija je jedini license insert owner.                           |
| ISSUE-02 | **zelen**                     | Isti source scope, operation key i canonical hash vraćaju isti operation i trajni receipt, uključujući retry posle promene current Profile stanja.                             |
| ISSUE-03 | **zelen**                     | Isti scoped key sa drugim canonical payload hash-om stabilno vraća `idempotency_conflict`.                                                                                     |
| ISSUE-04 | **zelen**                     | Fault injection pre commit-a rollback-uje rezultat; posle commit-a i nakon lease expiry retry ne pravi duplikat.                                                               |
| ISSUE-05 | **zelen za code/DB tok**      | Bounded lease worker, exponential jitter, terminalni `dead_letter`, admin prikaz i granularno potvrđen replay su testirani. Staging scheduler/alert dokaz ostaje OPS-01 gate.  |
| ISSUE-06 | **zelen**                     | Plaintext postoji samo u dedicated envelope-encrypted koloni i kontrolisanom reveal rezultatu; receipt/audit/error secret scan i 20-way concurrent reveal-once test su zeleni. |
| ARCH-01  | **zelen za Prompt 05 engine** | Operation engine nema import niti poziv centralnom Master/Vendor serveru.                                                                                                      |
| ARCH-03  | **delimično**                 | Neizmenjeni javni V1 capability koristi novi application service; public local V2 adapter ostaje Prompt 08.                                                                    |
| ARCH-04  | **otvoreno**                  | HTTP/HMAC V2 adapter ostaje Prompt 07.                                                                                                                                         |
| ARCH-05  | **delimično**                 | Jedno transport-neutralno application jezgro i receipt model postoje; local/remote adapter parity E2E čeka Promptove 07/08.                                                    |
| LIFE-01  | **delimično**                 | Lifecycle komande koriste isto durable jezgro, idempotency i scoped license lookup; kompletna state-machine matrica i runtime posledice ostaju Prompt 11.                      |
| OPS-01   | **delimično**                 | Worker claim/retry/dead-letter/replay su zeleni u code/DB testu; produkcioni scheduler i staging operativni dokaz nisu izvršeni.                                               |

Release capability parity namerno ostaje `customerLicenseIssuer.v2` =
`v2_not_exported`; Prompt 05 nije prerano otvorio transport. U tom koraku receipt
assertion je bio rezervisan `null` slot; Prompt 06 ga sada popunjava bez otvaranja
HTTP/local V2 issue transporta. Nisu izvršeni publish, deploy, live payment ili
staging scheduler.

## 16. Status posle Prompt-a 06

Prompt 06 evidence:
[17-prompt-06-assertion-evidence.md](./17-prompt-06-assertion-evidence.md).

| ID        | Status                                         | Dokaz / preostali gate                                                                                                                                                                         |
| --------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CRYPTO-01 | **zelen**                                      | Strogi EdDSA/typ/v/iss/aud/kid/signature/time/business verifier i svih 13 language-neutral pozitivnih/negativnih vektora prolaze; token-provided key polja su odbijena.                        |
| CRYPTO-02 | **zelen**                                      | Javni `/v2/issuer` i `/v2/keys` imaju ETag/cache/304/revision; DB test dokazuje verification-only overlap i uklanjanje starog `kid`-a posle roka.                                              |
| CRYPTO-03 | **zelen**                                      | Assertion potpisan starim ključem prolazi tokom normalnog overlap-a, novi assertion koristi novi `kid`, a `issuerRef` ostaje isti.                                                             |
| CRYPTO-04 | **zelen za code/DB restore drill**             | A256GCM backup sa zasebnim ključem, wrong-key rejection i restore vraćaju isti `issuerRef`, aktivni keypair i istorijski verification trust. Production datirani restore ostaje OPS-03 gate.   |
| CRYPTO-05 | **zelen**                                      | DB private key i reveal materijal ostaju envelope-encrypted; packed verifier/vector/manifest secret scan je čist. Nedostupan privatni ključ daje `recovery_required` bez tihog novog issuer-a. |
| CLAIM-04  | **zelen za signed snapshot**                   | Issue potpis nastaje isključivo iz committed license/profile/schema/policy/claim snapshot-a; hash mismatch rollback-uje transakciju.                                                           |
| CLAIM-05  | **zelen za assertion V2**                      | `internal_only` i implicitni customer PII ne ulaze u potpis; nedostajuća/unknown klasifikacija fail-uje zatvoreno.                                                                             |
| DX-02     | **zelen**                                      | Paket izvozi `./verifier` i `./test-vectors/customer-license-assertion-v2`; clean packed consumer verifikuje token bez CMS importa.                                                            |
| ARCH-06   | **zelen za crypto/runtime dependency granicu** | Assertion, activation lease i verifier ne pozivaju centralni Master; potpisi koriste samo customer issuer keyset. Potpun outage E2E ostaje OPS-04 gate.                                        |

Legacy V1 je eksplicitno `v: 1` / `NRC-CUSTOMER-LICENSE-V1+JWT`; V2 verifier ga
odbija, pa nema silent reinterpretacije. `customerLicenseIssuer.v2` capability
ispravno ostaje `v2_not_exported`: Prompt 06 dodaje verification javne rute, ne
HTTP/HMAC ili local V2 issue adaptere. Nisu izvršeni publish/deploy/live traffic.

## 17. Status posle Prompt-a 07

Prompt 07 evidence:
[18-prompt-07-http-api-evidence.md](./18-prompt-07-http-api-evidence.md).

| ID      | Status                              | Dokaz / preostali gate                                                                                                                                                                                                                                      |
| ------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARCH-04 | **zelen za code/DB/contract tok**   | Zaseban HTTPS-obavezan NRLS2 HMAC adapter pokriva catalog, issue, status i lifecycle; exact-body/query/nonce/skew/scope/rotation vektori i DB testovi prolaze. Live reverse-proxy/TLS probe ostaje release gate.                                            |
| ARCH-05 | **zelen za domain ↔ remote parity** | HTTP issue vraća isti durable operation/receipt kao direktni application servis, uključujući isti key+hash, konflikt i lifecycle rezultat. Puna local ↔ remote matrica čeka Prompt 08 local adapter.                                                        |
| ARCH-03 | **delimično, nepromenjeno**         | Javni SDK V2 ugovor i detekcija postoje, ali packed local capability namerno ostaje `v2_not_exported` do Prompt-a 08.                                                                                                                                       |
| SEC-02  | **zelen**                           | Timing-safe NRLS2 HMAC, 300 s clock skew, canonical 128-bit nonce, persistent replay ledger, environment/action/product/profile scope i 900 s prethodni-secret overlap su DB/contract testirani.                                                            |
| SEC-03  | **delimično**                       | Pre-auth koristi zajednički persistent distributed limiter i stabilan IP bucket, a runtime ima dodatni limiter; multi-process staging/load dokaz još nije izvršen.                                                                                          |
| SEC-05  | **zelen za HTTP boundary**          | Malformed, oversized, auth/scope, domain i neočekivane greške daju JSON envelope sa request/correlation ID-em; contract scan i E2E potvrđuju da nema HTML-a, redirect-a, stack-a, SQL-a ili secret-a. Širi production log/e-mail audit ostaje release gate. |
| WEB-04  | **zelen za server catalog ugovor**  | Published/deprecated catalog ima revision/ETag/304 i filtrira `internal_only`; Webshop sync/cache implementacija ostaje Prompt 09/10.                                                                                                                       |
| DX-01   | **zelen za HTTP V2**                | OpenAPI 3.1 se generiše iz runtime Zod request schema-a, služi preko `/v2/openapi.json` i ulazi u release paket uz language-neutral NRLS2 vektor.                                                                                                           |
| RUN-04  | **delimično**                       | Remote lifecycle `revoke` ide kroz isto durable jezgro i runtime validate zatim generički odbija opozvanu aktivaciju; puna refund/chargeback/offline matrica ostaje Prompt 11.                                                                              |

V1 router i response shape ostali su neizmenjeni. V2 dokumentovano šalje
`X-NRLS-Contract-Version` i `X-NRLS-Supported-Versions`; `Deprecation`/`Sunset`
nisu uvedeni bez odobrenog datuma. Nisu izvršeni publish, production deploy,
live traffic ni customer Webshop V2 prebacivanje.

## 18. Status posle Prompt-a 08

Prompt 08 evidence:
[19-prompt-08-local-capability-evidence.md](./19-prompt-08-local-capability-evidence.md).

| ID           | Status                                                   | Dokaz / preostali gate                                                                                                                                                                                                                    |
| ------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARCH-03      | **zelen**                                                | Packed License Server izlaže javni `customerLicenseIssuer.v2`; adapter importuje SDK, ne Webshop/private tipove, fiksira host-autorizovani Webshop source i nema HMAC, HTTP fallback ili direktan Webshop DB coupling.                    |
| ARCH-05      | **zelen za domain/local/HTTP contract i DB tok**         | Shared vector izvršava issue i status kroz sva tri puta i poredi operation/receipt/error semantiku; local lifecycle koristi isto jezgro.                                                                                                  |
| ISSUE-01..06 | **zeleni, nepromenjeni**                                 | V1 adapter i native V2 ulaze u isti durable engine; timeout/restart ne ponavlja enqueue, idempotency i reveal pravila ostaju ista, a scheduler obrađuje issue i lifecycle operacije.                                                      |
| OPS-01       | **zelen za package/root scheduler code i DB lease**      | Versioned job, root cron auth/deadline/correlation, singleton lease concurrency, expired-lease restart i canonical/legacy job wrapper su testirani. Produkcioni cron schedule, alerti i staging evidence ostaju otvoreni.                 |
| PKG-02       | **zelen za Prompt 08 parity**                            | Source, release facade, signed capability allowlist i isolated Next 16.3 tarball host izlažu V1, V2 i oba job imena.                                                                                                                      |
| WEB-03       | **zelen za legacy local operation/status compatibility** | Webshop više ne označava V1 enqueue kao završen: čuva operation ID, V2 polling nastavlja posle timeout/cancel/restart, a terminalni receipt se envelope-encryptuje pre Webshop persistence-a. Puni customer delivery UX ostaje Prompt 10. |
| LIFE-01      | **zelen za transport enqueue/status jezgro**             | Local V2 lifecycle i HTTP lifecycle daju isti operation model; puna refund/chargeback/offline poslovna matrica ostaje Prompt 11.                                                                                                          |

`edit_existing_only`, install pending, unavailable i contract-version mismatch
fail-uju eksplicitno; capability nema Master fallback. Nisu izvršeni publish,
production deploy, live cron/alerting, live paid order niti puna Webshop customer
delivery/reconciliation matrica.

## 19. Status posle Prompt-a 09

Prompt 09 evidence:
[20-prompt-09-webshop-connections-evidence.md](./20-prompt-09-webshop-connections-evidence.md).

| ID     | Status                       | Dokaz / preostali gate                                                                                                                                                                                    |
| ------ | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WEB-01 | **zelen**                    | Jedan `license_server` product source bira package-owned local/remote connection, Product Type i Profile.                                                                                                 |
| WEB-02 | **zelen za storage/UI**      | Remote secret je AES-256-GCM šifrovan, ne vraća se u action/client/log payload i prikazuje se samo kao fingerprint/credential version.                                                                    |
| WEB-03 | **zelen**                    | `issuerRef` se pin-uje pri testu; neočekivani issuer menja stanje u `issuer_changed` i blokira product/checkout do eksplicitnog re-auth-a.                                                                |
| WEB-04 | **zelen**                    | Catalog revision/ETag/304, immutable evidence, deprecated profile projekcija, background lease/metrics i product revalidation su implementirani.                                                          |
| WEB-05 | **delimično do Prompt-a 10** | Order pin-uje connection/issuer/catalog/Product Type/Profile/schema/policy i issuer mapping zahteve. Korisnički immutable mapping revision/hash pripada Prompt-u 10 i još nije lažno proglašen završenim. |
| WEB-08 | **zelen za upgrade ugovor**  | Izolovana PostgreSQL fixture migrira istorijski remote i hidden `customer_issuer`, čuva Master red i ne menja istorijske order snapshot-e.                                                                |
| SEC-04 | **zelen za code/contract**   | HTTPS, private/mapped-IP i DNS-rebinding zaštita, manual redirect rejection, pinned DNS dispatcher i bounded body testovi prolaze; live egress probe ostaje release gate.                                 |

Master connector i customer connection nisu spojeni: prvi ostaje author-only
vendorski paid-add-on sistem, drugi nikad ne izdaje Master ključ. Prompt 09 ne
pokreće customer paid fulfillment; Prompt 10 dodaje mapping revision, operation,
receipt i secure delivery.

## 20. Status posle Prompt-a 10

Prompt 10 evidence:
[21-prompt-10-webshop-fulfillment-evidence.md](./21-prompt-10-webshop-fulfillment-evidence.md).

| ID           | Status                                             | Dokaz / preostali gate                                                                                                                                                                                                                                                                   |
| ------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WEB-05       | **zelen**                                          | Product publish pravi immutable mapping revision/hash iz issuer allowliste; checkout pin-uje connection/issuer/Product Type/Profile/schema/policy/mapping ID/revision/hash/snapshot i odbija nevažeći ili drifted binding.                                                               |
| WEB-06       | **zelen za code/contract/isolated DB tok**         | Neplaćen order je no-op; 8-way duplicate paid enqueue za dve različite profile stavke daje po jednu licencu; accepted issuer operation ID se trajno čuva i posle timeout/restart-a samo poll-uje. Local i remote adapter imaju isti operation/receipt oblik.                             |
| WEB-07       | **zelen za code/isolated-DB/packed-host tok**      | Receipt je trajan, plaintext key ide samo u AAD-bound envelope, reveal-once je CAS + permission/package-local distributed rate-limit/audit, customer reveal završava item/order, e-mail sadrži samo auth link, a `.nrls.json` download ima stroge response header-e i ownership proveru. |
| WEB-08       | **zelen**                                          | Prompt 09 hidden `customer_issuer` upgrade ostaje kompatibilan; `0009` samo zahteva revalidaciju postojećih customer binding-a, ne menja istorijske order snapshot-e. `file_license` spaja asset i receipt obavezu bez druge issue operacije.                                            |
| ISSUE-01..06 | **zeleni, potvrđeni kroz Webshop adapter granicu** | License Server DB suite ostaje 80/80; Webshop koristi isti operation key/hash/receipt model, ne poziva Master, ne generiše novi ključ na retry-ju i ne čuva plaintext u receipt/log/error snapshot-u.                                                                                    |

Nisu izvršeni production publish/deploy, live payment-provider događaj ni slanje
stvarnog customer e-maila. To su release/staging gate-ovi, ne zamena za zeleni
izolovani DB, contract, package i Next 16.3 host dokaz iz evidence dokumenta.

## 21. Status posle Prompt-a 11

Prompt 11 evidence:
[22-prompt-11-runtime-lifecycle-evidence.md](./22-prompt-11-runtime-lifecycle-evidence.md).

| ID      | Status                            | Dokaz / preostali gate                                                                                                                                                                                                   |
| ------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| LIFE-01 | **zelen**                         | Issuer i Webshop imaju strogu idempotentnu renew/suspend/resume/revoke/refund/chargeback state mašinu; terminalna licenca nema običan resume, a reason code/hash je auditovan.                                           |
| LIFE-02 | **zelen za code/isolated DB tok** | Samo prihvaćen payment/subscription fact pravi outbox; customer local/remote lifecycle polluje durable issuer operation, a refund/chargeback opoziva activations i online validaciju. Live provider ostaje staging gate. |
| RUN-01  | **zelen**                         | Izolovani PostgreSQL test sa 128 paralelnih zahteva potvrđuje da device/server shared bucket nikad ne prelazi `maxDevices`.                                                                                              |
| RUN-02  | **zelen**                         | Device/server/domain/seat/floating matrica, kanonizacija/hash i hash-only activation token su pokriveni unit + DB testom.                                                                                                |
| RUN-03  | **zelen**                         | Assertion TTL ≤ 3600 s, 60 s default skew, online reject, issuer-outage grace i grace-expired clock vektori daju eksplicitnu odluku.                                                                                     |
| RUN-04  | **zelen**                         | Suspend/refund/revoke/chargeback odbijaju online validate; terminalna akcija opoziva aktivacije i kasni resume ostaje dead-letter bez promene statusa.                                                                   |

Admin UI eksplicitno upozorava da refund/revoke ne može retroaktivno poništiti
već izdat dugovečni offline dokument. Production outage drill, live subscription
provider i publish/deploy ostaju release gate-ovi.

## 22. Status posle Prompt-a 12

Prompt 12 evidence:
[23-prompt-12-production-admin-evidence.md](./23-prompt-12-production-admin-evidence.md).

| ID          | Status                                    | Dokaz / preostali gate                                                                                                                                                                                                           |
| ----------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01      | **zelen**                                 | Svih 24 server action tokova ponavlja host/admin, canonical granular permission i license-mode proveru. Admin reveal route je trusted-host-auth, permission i actor-bound; UI visibility nije jedina kontrola.                   |
| DX-03       | **zelen**                                 | Packed Profile/Schema wizard ima source-allowlisted effective-claims preview, a assertion verifier proverava audience i potpis. Rezultati su encrypted reveal-once download, ne query/log payload.                               |
| PKG-02      | **zelen za Prompt 12 parity**             | Packed Next 16.3 host renderuje overview, API clients/scopes, products, profiles/schemas, licenses, activations, operations/dead letters, events, docs, keys/backup, audit i verifier; API/capability/jobs parity ostaje zelena. |
| DATA-01..04 | **zeleni, potvrđeni schema 8 upgrade-om** | `0008_production_admin_support.sql` je aditivan, checksum/inventory-bound i retain-by-default; empty/upgrade/rerun/old-write PostgreSQL test prolazi.                                                                            |

Live Clerk permission provisioning, production publish/deploy, alerting i
periodični operator restore drill ostaju release gate-ovi. Lokalni CMS build je
zaustavljen pre Next faze jer lokalni `.env` nema managed deployment worker
credential-e; clean packed Next 16.3 production build i HTTP render su zeleni.

## 23. Status posle Prompt-a 13

Prompt 13 evidence:
[24-prompt-13-security-recovery-evidence.md](./24-prompt-13-security-recovery-evidence.md).
Threat model i operativne procedure su u
[security-threat-model.md](./security-threat-model.md) i
[incident-response-runbook.md](./incident-response-runbook.md).

| ID     | Status                                     | Dokaz / preostali gate                                                                                                                                                        |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-02 | **zelen**                                  | HMAC nonce/timestamp/scope/constant-time matrica ostaje zelena; current/previous secret sada dele versioned envelope i audited rewrap bez fallback-a.                         |
| SEC-03 | **zelen za code/DB multi-process granicu** | Public, HMAC, activation/runtime, reveal i admin koriste persistent DB limiter; dve nezavisne instance dele isti atomic budžet. Production capacity load ostaje rollout gate. |
| SEC-04 | **zelen za code/contract granicu**         | Remote connector zahteva TLS 1.2+/CA/direct pinned agent, blokira proxy/forward header-e, private/mapped IP, rebinding i redirect. Live egress probe ostaje rollout gate.     |
| SEC-05 | **zelen**                                  | Audit/log/error/reveal redaction i bounded serialization su centralizovani; secret/log/PII acceptance je 25/25.                                                               |
| OPS-01 | **zelen za deploy config/DB tok**          | Vercel minute cron, auth GET/POST, singleton lease, retry/backoff/dead-letter/replay i restart su testirani. Live scheduler observation ostaje rollout gate.                  |
| OPS-02 | **zelen za packed app signal/alert tok**   | Queue/issue/validate/auth/key/catalog/lifecycle snapshot, alarm code i correlation ID su testirani i renderovani; external pager wiring je deployment obaveza.                |
| OPS-03 | **zelen**                                  | V3 restore drill završen 2026-08-20T12:00:15.195Z čuva issuerRef i verifikuje assertion izdat pre backup-a.                                                                   |
| OPS-04 | **zelen za fault-E2E granicu**             | Master outage ne ulazi u customer issue/verify put; datirani drill i boundary test to potvrđuju.                                                                              |
| OPS-05 | **zelen**                                  | Versioned runbook pokriva Master/issuer outage, lost wrapping key, compromised signing/HMAC i inconsistent receipt, uz contract test.                                         |

Sva četiri `npm audit --audit-level=high` stabla imaju 0 vulnerabilities. Jedini
rezidualni supply-chain warning je šest optional Tailwind WASI lockfile zapisa
bez `resolved/integrity` metadata-e; nije critical/high i eksplicitno je opisan u
Prompt 13 evidence-u. Production publish/deploy i live traffic nisu izvršeni.

## 24. Status posle Prompt-a 14

Prompt 14 evidence:
[25-prompt-14-sdk-consumer-evidence.md](./25-prompt-14-sdk-consumer-evidence.md).

| ID            | Status                                  | Dokaz / preostali gate                                                                                                                                                                                  |
| ------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DX-01         | **zelen**                               | OpenAPI 3.1 sada generiše stroge request i response modele za public discovery/runtime, catalog i operation tokove; error envelope i finalna imena se proveravaju protiv consumer vektora.              |
| DX-02         | **zelen**                               | Release izvozi dependency-free verifier, pinned issuer/keyset cache klijent i dva language-neutral vector export-a; čist projekat instalira samo packed paket, TypeScript-kompajlira i izvršava primer. |
| DX-04         | **zelen**                               | Copyable fixture koristi samo public package export-e i public issuer/runtime endpoint-e; static/pack scan odbija privatne importe, HMAC, private/Master i server secret materijal.                     |
| DX-05         | **zelen**                               | Docs/04 ima eksplicitan V1 → V2 discovery, dual-read/single-write, operation, runtime, cutover i deprecation vodič bez izmišljenog Sunset datuma.                                                       |
| CRYPTO-01..03 | **zeleni, potvrđeni consumer matricom** | Strogi `alg/typ/v/iss/aud/kid/signature/time`, normalna old/new rotacija, ETag cache i tačno jedan unknown-kid refresh prolaze u source i packed clean-consumer testu.                                  |

`npm run test:consumer` ne koristi monorepo source import: pravi novi privremeni
projekat, instalira samo lokalni tarball, proverava lockfile dependency granicu,
kompajlira packed TypeScript primer i izvršava offline file, activation, online
validate, feature, quota i organization binding. Production publish/deploy i
live customer issuer nisu pozvani.
