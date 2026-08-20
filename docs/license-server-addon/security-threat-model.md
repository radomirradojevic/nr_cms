# License Server threat model

Datum pregleda: **2026-08-20**

Opseg: packed License Server add-on, CMS host granice, Webshop local/remote
connector, PostgreSQL state, runtime secret store i backup/restore tok.

## Bezbednosni cilj

Jedan plaćeni order item sme da proizvede najviše jednu licencu, samo ovlašćeni
issuer sme da je potpiše, a tajne i ograničeni customer podaci ne smeju preći
definisane trust granice. Restart, timeout, Master outage ili odgovor izgubljen u
transportu ne smeju promeniti poslovni rezultat.

## Trust granice

| Granica                          | Ulaz / izlaz                                          | Autoritet                                             | Fail-closed kontrola                                                                                                                         |
| -------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser → packed admin           | Clerk session, forma, reveal token                    | host admin + granularni `license_server.*` claim      | server-side authz, license-mode matrica, persistent user/operation limiter, correlation ID, reveal-once/no-store                             |
| Internet/proxy → public API      | URL, header-i, exact body, client IP                  | public ili NRLS2 HMAC client                          | bounded body, strict schema, trusted proxy hop contract, pre-auth/runtime DB limiter, anti-enumeration odgovor                               |
| Webshop → customer issuer        | local capability ili remote HTTPS                     | pinned source/client, scope, Product/Profile revision | immutable snapshots, HMAC nonce/timestamp/scope, idempotency key/hash, isti durable engine                                                   |
| Remote transport → mreža         | admin base URL, DNS, TLS, response                    | allowlisted self-hosted host                          | HTTPS, TLS ≥1.2, CA verification, DNS pinning, private/mapped-IP blokada, manual redirect, bounded body, forbidden forwarding/proxy header-i |
| Add-on → PostgreSQL              | operation, receipt, audit, limiter, encrypted secrets | package application service                           | transakcije, unique/CAS/lease, DB time, row locks, ciphertext-only persistence                                                               |
| Runtime → secret store           | KEK keyring, hash salts, worker credentials           | deployment operator                                   | eksplicitni env contract, versioned `kid`, bez development fallback-a, staged rewrap                                                         |
| Backup operator → restore        | encrypted backup JSON + odvojeni wrapping key         | `backup.export_restore` permission                    | v3 manifest/ciphertext checksum, A256GCM AAD/tag, issuer binding, identity conflict rejection, audit                                         |
| Master entitlement → add-on host | install/revalidate state                              | vendorski Master issuer                               | signed package/entitlement; customer issue/validate nema runtime Master dependency                                                           |

## Imovina i napadači

Kritična imovina su customer Ed25519 private key, HMAC client secrets, envelope i
backup wrapping ključevi, reveal plaintext, immutable Profile/Schema/Policy
snapshot, operation/receipt integritet, issuerRef/keyset kontinuitet i release
digest/migration istorija. Ograničena imovina su customer/order reference i
pseudonimizovani activation podaci.

Razmatrani napadači:

- anoniman internet klijent koji enumeriše licence ili iscrpljuje resurse;
- ukradeni ili preširoko scoped HMAC klijent;
- customer koji menja claim/domain/device ili replay-uje zahtev;
- admin bez potrebnog permission-a ili kompromitovana admin sesija;
- operator sa pogrešnim proxy/DNS/TLS ili key-rotation podešavanjem;
- kompromitovan dependency/release artefakt;
- napadač sa read-only DB snapshot-om ili log pristupom;
- kvar procesa, mreže, baze, Master-a, issuer-a ili delivery provider-a.

## Abuse-case matrica

| Abuse case                        | Posledica                                       | Kontrola                                                                                                                                                           | Automatizovani dokaz                                                          |
| --------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Guess/validate/reveal enumeracija | otkrivanje postojanja licence ili DoS           | generic errors; hashed bucket keys; odvojeni public/HMAC/license/activation/reveal/admin DB bucket-i                                                               | `security-hardening`, HTTP auth/operations i admin reveal integration testovi |
| Spoofovan `X-Forwarded-For`       | rate-limit bypass                               | header se ignoriše bez `LICENSE_SERVER_TRUSTED_PROXY_HOPS`; bira se right-most povereni hop                                                                        | `network-boundary.test.ts`                                                    |
| HMAC replay ili scope escalation  | neovlašćeno izdavanje                           | exact body/path canonical signature, 300 s skew, persistent unique nonce, timing-safe compare, action/product/profile/environment scope, 900 s dual-secret overlap | `http-api-v2-auth.integration.test.ts` i HMAC vectors                         |
| Dupli paid event/timeout/restart  | dve licence                                     | scoped idempotency key + payload hash, durable operation/receipt, unknown→poll, lease/retry/DLQ                                                                    | durable/Webshop fulfillment DB matrica                                        |
| Admin samo sakrije dugme          | horizontalna/vertikalna eskalacija              | svaka action/route ponavlja session, role, permission, mode i rate-limit proveru                                                                                   | `admin-authz.test.ts`, packed host render                                     |
| DB ili log snapshot               | plaintext signing/HMAC/license/reveal materijal | A256GCM v2 envelope sa KID/AAD, centralni audit/log sanitizer, actor-bound reveal-once                                                                             | envelope, audit, reveal i secret scan testovi                                 |
| KEK rotacija prekine stare redove | outage ili gubitak podataka                     | bounded keyring (aktivni + stari KID), v1 reader, audited `skip locked` batch rewrap sva četiri secret razreda                                                     | `envelope-encryption.test.ts`, `security-hardening.test.ts`                   |
| SSRF/DNS rebinding/redirect       | pristup internoj mreži/metadata                 | exact HTTPS host allowlist, private i mapped-IP blokada, DNS preflight+pin, direct Agent, redirect manual, header/body/deadline granice                            | Webshop `outbound-url.test.ts`                                                |
| Zlonameran/korumpiran backup      | identity swap ili tajni key import              | strict v3 envelope, manifest i ciphertext checksum, authenticated AAD/tag, keypair derivation, issuerRef conflict                                                  | datirani recovery drill                                                       |
| Master outage                     | customer runtime outage                         | cached entitlement grace za admin; customer issue engine/verifier nema Master import/poziv                                                                         | durable engine outage scenario i boundary test                                |
| Compromised signing/HMAC key      | lažne offline licence ili issue                 | emergency stop, revoke/rotate, bounded overlap samo za normalnu rotaciju, audit/reconciliation/reissue runbook                                                     | rotation/overlap tests + incident runbook contract test                       |
| Supply-chain zamena               | izvršavanje tuđeg koda                          | exact lockfile, SBOM/provenance, signed release manifest/digest, install verify, npm/supply-chain audit                                                            | build/pack/install i scan zapis                                               |

## Kriptografske odluke

- New writes koriste JSON envelope `v:2`, `alg:A256GCM`, eksplicitni `kid`, 96-bit
  IV i AAD vezan za format i KID. `LICENSE_SERVER_ENCRYPTION_KEYS_JSON` ima najviše
  16 protected key verzija; samo `LICENSE_SERVER_ACTIVE_ENCRYPTION_KEY_ID` piše.
- Eksplicitni legacy ključ ili prethodni keyring čita v1 ciphertext bez KID-a samo
  tokom migracije. Production validator ne generiše i ne prihvata fallback.
- Signing, HMAC i reveal plaintext nisu key-encryption ključevi. Runtime identifier
  hash koristi zaseban `LICENSE_SERVER_RUNTIME_HASH_SECRET`; IP hashing koristi
  `IP_HASH_SALT`; backup koristi operatorov odvojeni wrapping ključ/verziju.
- Normalna signing rotacija čuva verification-only overlap. Sumnja na
  kompromitaciju ne koristi overlap kao bezbednosnu meru već incident revoke/
  revalidation tok iz runbook-a.

## Rezidualni rizik i release odluka

Nema poznatog neadresiranog critical/high nalaza u ovom opsegu. Sledeće su
deployment obaveze, ne code fallback-i: secret store mora čuvati aktivni i stare
KID-eve do zero-count rewrap dokaza; reverse proxy mora sanitizovati forwarded
header-e; scheduler i alarm dashboard moraju biti spojeni na produkcioni on-call;
RPO/RTO moraju biti potvrđeni periodičnim restore drill-om. Pogrešna konfiguracija
ovih obaveza fail-uje zatvoreno ili podiže operational alarm.
