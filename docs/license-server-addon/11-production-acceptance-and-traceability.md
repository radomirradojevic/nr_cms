# 11 — Produkcioni acceptance i sledljivost

Ovaj dokument je Definition of Done. Stavka je zelena samo uz automatizovan test
ili sačuvan operativni dokaz. „Ručno izgleda da radi” nije dovoljan dokaz za
kritične tokove.

## 1. Arhitektonske granice

| ID | Zahtev | Dokaz |
| --- | --- | --- |
| ARCH-01 | Master licencira add-on, ne customer proizvode. | Contract/architecture test i pregled dependency grafa. |
| ARCH-02 | License Server je zaseban add-on, ne deo Webshop paketa. | Package/registry/install test. |
| ARCH-03 | Local integracija koristi javni SDK capability. | Boundary test bez privatnih importa. |
| ARCH-04 | Remote integracija koristi HTTPS/HMAC V2. | Contract + security test. |
| ARCH-05 | Local i remote daju isti operation/receipt model. | Zajednički test vectors. |
| ARCH-06 | Customer runtime validacija ne zavisi od Master dostupnosti. | Outage E2E. |

## 2. Paket, lifecycle i schema

| ID | Zahtev | Dokaz |
| --- | --- | --- |
| PKG-01 | Potpisan paket ima manifest, provenance, SBOM i digest. | Artefakt iz release pipeline-a. |
| PKG-02 | Release entrypoint ima puni podržani admin UI/API/capability/jobs. | Packed-host parity E2E. |
| PKG-03 | Build-time registry je jedini production loader. | Boundary/static test. |
| PKG-04 | Fresh install iz tarball-a radi u Next.js 16.3 hostu. | Isolated install/build/start. |
| DATA-01 | Add-on schema migracije imaju vlasnika/checksum/lock. | Migration manifest i test. |
| DATA-02 | Empty DB i upgrade sa prethodne verzije prolaze. | DB pipeline. |
| DATA-03 | App rollback/forward-fix ne uništava nove podatke. | Compatibility test/runbook. |
| DATA-04 | Uninstall zadržava podatke po default-u. | Lifecycle test. |

## 3. Product, profile i claims

| ID | Zahtev | Dokaz |
| --- | --- | --- |
| PROF-01 | Product Type i Profile imaju stabilne ref-ove i revision. | DB/domain test. |
| PROF-02 | Objavljena Profile/Schema revision je immutable. | Permission/DB test. |
| PROF-03 | Postojeći SKU-ovi migriraju bez promene izdatih licenci. | Fixture migration test. |
| CLAIM-01 | Samo dozvoljeni JSON Schema subset prolazi. | Positive/negative/property test. |
| CLAIM-02 | Defaults/override/source pravila daju deterministične claims. | Canonical vectors. |
| CLAIM-03 | Unknown/oversized/deep/prototype payload se odbija. | Security tests. |
| CLAIM-04 | License čuva schema/policy/claim immutable snapshot/hash. | DB integration test. |
| CLAIM-05 | PII/secrets ne ulaze u assertion po default-u. | Snapshot/secret scan. |

## 4. Issue i lifecycle engine

| ID | Zahtev | Dokaz |
| --- | --- | --- |
| ISSUE-01 | Plaćena stavka izdaje tačno jednu licencu. | Concurrent/retry E2E. |
| ISSUE-02 | Isti key + isti hash vraća isti receipt. | Idempotency test. |
| ISSUE-03 | Isti key + drugi hash daje conflict. | Negative test. |
| ISSUE-04 | Crash/restart/lease expiry bezbedno nastavlja outbox. | Fault-injection test. |
| ISSUE-05 | Terminalne greške završavaju u preglednom dead-letter-u. | Worker/admin test. |
| ISSUE-06 | Receipt i reveal secret nisu u logu/plain metadata. | Log snapshot/DB test. |
| LIFE-01 | Renew/suspend/resume/revoke/refund/chargeback su idempotentni. | State-machine test. |
| LIFE-02 | Refund/chargeback se eventualno odražava na validaciju. | Webshop-to-runtime E2E. |

## 5. Webshop

| ID | Zahtev | Dokaz |
| --- | --- | --- |
| WEB-01 | Jedan `license_server` izbor podržava local/remote connection. | UI/model E2E. |
| WEB-02 | Remote secret je šifrovan i reveal-once. | DB/security test. |
| WEB-03 | IssuerRef je pin-ovan; neočekivana promena blokira konekciju. | Connector test. |
| WEB-04 | Catalog ETag/revision i archived profile ponašanje rade. | Sync test. |
| WEB-05 | Order item pin-uje profile/schema/mapping revision. | Checkout snapshot test. |
| WEB-06 | Pending issue preživljava browser/server restart. | E2E restart test. |
| WEB-07 | Delivery key je envelope-encrypted i auditovan. | Reveal/download test. |
| WEB-08 | Skriveni `customer_issuer` put je migriran/kompatibilan. | Migration test. |

## 6. Kriptografija i runtime

| ID | Zahtev | Dokaz |
| --- | --- | --- |
| CRYPTO-01 | Assertion striktno proverava alg/typ/v/iss/aud/kid/signature/time. | Language-neutral vectors. |
| CRYPTO-02 | Public keyset ima ETag/cache/rotation overlap. | Integration test. |
| CRYPTO-03 | Stara licenca radi posle normalne key rotacije. | Rotation E2E. |
| CRYPTO-04 | Backup/restore zadržava issuerRef i stare potpise. | Restore drill. |
| CRYPTO-05 | Privatni ključ je šifrovan i nikad nije u paketu/logu. | Secret scan/DB inspection. |
| RUN-01 | Aktivacioni concurrency ne probija limit. | Parallel DB test. |
| RUN-02 | Device/domain/server/seat policy radi. | Matrix test. |
| RUN-03 | Offline grace i assertion expiry daju tačnu odluku. | Clock vectors. |
| RUN-04 | Revoked/refunded/chargeback online odbijaju. | Lifecycle test. |

## 7. Security i operacije

| ID | Zahtev | Dokaz |
| --- | --- | --- |
| SEC-01 | Admin mutacije imaju auth + granular permission. | Authz matrix. |
| SEC-02 | HMAC timestamp/nonce/scope/timing-safe provere rade. | Security contract test. |
| SEC-03 | Persistent multi-process rate limits rade. | Integration/load test. |
| SEC-04 | Remote URL je zaštićen od SSRF/redirect/rebinding-a. | Security test. |
| SEC-05 | Error/log/e-mail nemaju secrets ili nepotreban PII. | Automated snapshots/scan. |
| OPS-01 | Scheduler, retry, dead-letter i manual replay su operativni. | Staging evidence. |
| OPS-02 | Metrike/alarme moguće je pratiti po correlation ID-u. | Dashboard/alert test. |
| OPS-03 | DB+key backup je stvarno obnovljen. | Datiran restore zapis. |
| OPS-04 | Master outage/degraded režim je testiran. | Fault E2E. |
| OPS-05 | Runbook pokriva lost/compromised key i connector secret. | Incident tabletop/drill. |

## 8. Dokumentacija i developer experience

| ID | Zahtev | Dokaz |
| --- | --- | --- |
| DX-01 | API schema i error codes su versioned i objavljeni. | Generisana/proverena dokumentacija. |
| DX-02 | TypeScript verifier i test vectors su deo release-a. | Clean consumer test. |
| DX-03 | Admin može preview/testirati custom claim/assertion. | Packed UI E2E. |
| DX-04 | Primer aplikacija ne sadrži HMAC/private secret. | Static/secret scan. |
| DX-05 | Upgrade/deprecation vodič postoji za V1 i capability V1. | Release notes review. |

## 9. Performance i pouzdanost

| ID | Zahtev | Dokaz |
| --- | --- | --- |
| PERF-01 | Validate i issue acceptance zadovoljavaju dogovoreni p95. | Reproducibilan load test. |
| PERF-02 | 100+ konkurentnih issue/activation zahteva čuva invariant. | Stress test. |
| PERF-03 | Queue backpressure ne ruši CMS niti gubi posao. | Soak/fault test. |
| PERF-04 | Keyset/catalog cache smanjuje nepotrebno DB/mrežno opterećenje. | Metrics test. |

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
