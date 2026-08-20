# Prompt 15 — Potpuni E2E, fault/load i production acceptance audit

Datum završnog pregleda: **2026-08-20** (`Europe/Belgrade`)

## 1. Release odluka

**NO-GO.** Finalni source, potpisani lokalni RC paketi, clean host build-ovi,
PostgreSQL migracije/invarianti, security redaction i 39 lokalnih višprocesnih
contract scenarija su zeleni. Ipak, ova mašina nema operator-provisioned
izolovani staging, sandbox payment identitet, deployment worker credential-e ni
prethodni potpisani paket. Lokalni simulator zato nije upotrebljen kao zamena za
staging dokaz.

Generisani audit je obradio svih **68** zahteva iz `docs/11`:

- **34 PASS** — dokazani finalnim package/component kapijama;
- **34 NO_GO** — zahtevaju stvarni staging E2E, load/soak ili operator drill;
- **39 local diagnostic PASS** — korisni fault/concurrency signali, ali trajno
  označeni sa `productionRuntime: false` i `gateEligible: false`.

Audit artifact:

```text
.tmp/night-raven-local-acceptance/local-20260820145739512-1bf3bba2bc/
  production-acceptance-audit.json
```

Njegov self-check SHA-256 je
`e0d6894ed11065124c9f2122f4d2ab3510d8b161d4d5eefc2d3a2e5bd8b6315d`.

## 2. Fail-closed acceptance infrastruktura

`scripts/night-raven-acceptance-harness.mjs` sada razdvaja tri klase dokaza:

1. final-package component gate-ove;
2. staging E2E/load scenarije nad izolovanom HTTPS topologijom;
3. operator drill-ove sa zasebnim dokazom.

`scripts/night-raven-production-audit.mjs` ima verzionisanu mapu svih 68
`ARCH/PKG/DATA/PROF/CLAIM/ISSUE/LIFE/WEB/CRYPTO/RUN/SEC/OPS/DX/PERF` stavki.
Stavka može biti `PASS` samo ako postoje sve njene obavezne kapije. Lokalni
rezultat nikada ne može da zatvori staging kapiju, a konačna odluka može biti
`GO` samo za `target: "staging"` kada je svih 68 stavki zeleno.

Staging ugovor sada zahteva:

- zasebne HTTPS endpoint-e za Master, vendor/customer CMS, vendor/customer
  Webshop, customer License Server i deployment worker;
- tačan signed-RC artifact-set ID i SHA-256 za Master, CMS host, Webshop,
  License Server add-on/service i worker;
- dokaz da runtime koristi samo potpisane RC artefakte, bez workspace importa;
- prethodni package digest za upgrade/rollback;
- eksplicitne p95 pragove i soak trajanje;
- redigovane, verzionisane scenario/drill JSON zapise sa istim artifact pin-om.

Svaki od pet component gate-ova takođe se fizički čuva u `component/*.json`;
audit referencira SHA-256 stvarnog redigovanog zapisa, ne nesnimljeni in-memory
rezultat.

Primer v2 konfiguracije je u
`docs/addons/night-raven-acceptance.staging.example.json`.

## 3. Finalni package i component dokaz

`npm run acceptance:rc` je izvršio puni lokalni RC pipeline, ne samo selektovane
unit testove:

| Gate                         | Rezultat                                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Clean public CMS copy        | typecheck, **365 pass / 0 fail / 19 namernih skip**, Next 16.3 production build i NFT private/env boundary PASS |
| Webshop final package        | **193/193** source/package testa, **3/3** PostgreSQL payment testa, reproducible pack i clean Next host PASS    |
| License Server final package | **103 pass / 0 fail / 7 DB-context skip**, packed PostgreSQL verifier i clean Next host PASS                    |
| Central Master               | **81/81**, typecheck i production build PASS                                                                    |
| Security/redaction           | **25/25**, browser bundle sentinel PASS                                                                         |
| Migracije/invarianti         | CMS i Master matrice PASS; nula prijavljenih invariant prekršaja                                                |

Lokalni ephemeral authority potpisao je artefakte samo za ovaj RC dokaz. Oni
nisu promotable production potpisi:

| Identitet                                        | SHA-256                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| RC artifact set                                  | `e654942fde3f7122deaf065ad0b19555e65c043d4b299ac0ce7d2766bcb0c754` |
| Webshop release artifact                         | `33456bd9e2a496c4ba2b4329eb85f18641d8264293c6daffd8f14a91c4a9e70c` |
| Webshop reproducible verification tarball        | `47f36818f1a4f659a3819b2015fea9cea9c549370369763cee80b6e0c1dba882` |
| License Server release artifact                  | `cfdf8fcf38e516584b182db99dda6d9bbfcc629f4d8d2113e15579c52ef2089c` |
| License Server reproducible verification tarball | `20e95b5b596b70f18ce29b101c6f4490a21549c6cd5d9c5fafba9b000aa1128c` |

## 4. Pronađen i ispravljen product/packaging problem

RC nije promenjen da bi prikrio grešku. Packed License Server DB verifier je
zaista padao posle zelenog package testa jer je pravio zastareli minimalni
Product/SKU fixture i proveravao legacy outbox umesto aktuelne durable issue
operacije.

Verifier sada u jedinstvenoj izolovanoj PostgreSQL schema-i:

- čita `migrations.json` iz raspakovanog tarball-a;
- proverava checksum i primenjuje svih osam packed migracija;
- pravi validan Product Type, SKU i immutable published Profile revision;
- izvršava packed runtime;
- proverava uspešnu `customer_issuer_operations` operaciju sa stabilnim
  `source_client_ref`-om;
- uklanja samo tačno imenovanu izolovanu schema-u.

`npm run install:verify:db` je posle popravke zelen i prijavljuje
`databaseExecuted`, `healthStatus: 200`, `issuer`, durable operation i
`databaseVerified`. Dodata je i package-boundary regresija koja zahteva packed
migration checksum/application i proveru durable operacije.

Paralelni local issue test je istovremeno otkrio hang pri 128 konkurentnih
poziva. Issue put sada uz transakcioni advisory lock ponovo proverava durable
business key pod lock-om; svih 128 poziva završava sa jednom licencom.

## 5. Lokalni fault i concurrency signal

Izolovani lokalni runner je podigao četiri loopback HTTP procesa i dve posebne
test baze. Svih 32 E2E contract scenarija i sedam lokalnih drill-ova je prošlo.
Obuhvaćeni su purchase/install, duplicate webhook, response loss pre/posle
commit-a, stale worker recovery, refund/chargeback/renew/revoke, outage grace,
key rotation, forged entitlement/signature, cross-tenant/scope, backup/restore,
queue recovery i alert delivery.

Najvažniji izmereni invarianti:

| Dijagnostika               | Rezultat                                                          |
| -------------------------- | ----------------------------------------------------------------- |
| Concurrent issue           | 128 pokušaja, **0 duplikata**, jedna trajna licenca               |
| Activation limit           | 128 pokušaja, 2 prihvaćena, 126 odbijeno, **0 probijenih limita** |
| Response loss after commit | retry/poll završava istu operaciju, 0 invariant prekršaja         |
| Local backup/restore       | dve baze i osam redova obnovljeni, 0 invariant prekršaja          |

Ovo dokazuje domain/DB contract i služi za rano otkrivanje regresija. Ne dokazuje
TLS, proxy/DNS, realni payment provider, managed redeploy, multi-node scheduler,
spoljni alarm, produkcioni storage niti dogovoreni p95.

## 6. Potpuna `docs/11` matrica

| Grupa      |   PASS |  NO_GO | Otvoreni ID-evi                        |
| ---------- | -----: | -----: | -------------------------------------- |
| ARCH       |      3 |      3 | ARCH-04..06                            |
| PKG        |      4 |      2 | PKG-05..06                             |
| DATA       |      2 |      2 | DATA-02..03                            |
| PROF       |      3 |      0 | —                                      |
| CLAIM      |      5 |      0 | —                                      |
| ISSUE      |      1 |      5 | ISSUE-01..05                           |
| LIFE       |      0 |      2 | LIFE-01..02                            |
| WEB        |      3 |      5 | WEB-01, WEB-03, WEB-04, WEB-06, WEB-07 |
| CRYPTO     |      3 |      2 | CRYPTO-03..04                          |
| RUN        |      1 |      3 | RUN-01, RUN-03..04                     |
| SEC        |      4 |      1 | SEC-03                                 |
| OPS        |      0 |      5 | OPS-01..05                             |
| DX         |      5 |      0 | —                                      |
| PERF       |      0 |      4 | PERF-01..04                            |
| **Ukupno** | **34** | **34** | release ostaje NO-GO                   |

`NO_GO` ovde ne poništava ranije zelene unit/contract dokaze. Znači da stroži
finalni acceptance za tu stavku zahteva dokaz iz stvarne release topologije.

## 7. Neizvršene obavezne release kapije

Za `GO` još moraju da se sačuvaju sledeći staging/operator dokazi:

- vendorska License Server kupovina, Master key fulfillment i customer
  `install_pending → verified redeploy → ready` bez customer Webshop paketa;
- customer Webshop publish/checkout/paid/secure delivery/application verify,
  prvo local, zatim remote HTTPS/HMAC;
- duplicate paid, timeout pre i posle issue commit-a, stvarni process/DB restart,
  lease expiry, catalog drift, issuerRef mismatch, Master/issuer outage i
  delivery retry;
- renew/refund/chargeback online odluka i merena offline grace odluka;
- 100+ concurrent issue/activation, persistent rate-limit load, dogovoreni
  issue/validate p95, queue soak/backpressure i keyset/catalog cache metrički
  dokaz;
- upgrade sa prethodnog potpisanog paketa, app rollback compatibility i stvarni
  šifrovani DB+key restore uz staru assertion verifikaciju;
- eksterni scheduler/alert pregled, incident tabletop, canary/rollback zapis i
  eksplicitno operator odobrenje.

Dok ove kapije ne prođu, Prompt 16 ne sme da publish-uje ili promoviše RC.

## 8. Reprodukcija

Lokalni, namerno ne-promotable RC audit:

```powershell
npm run acceptance:rc
```

Pravi staging acceptance koristi popunjenu kopiju v2 primera i operator runner:

```powershell
$env:NR_ACCEPTANCE_TARGET = "staging"
$env:NR_ACCEPTANCE_CONFIG_PATH = "D:\secure\night-raven-acceptance.staging.json"
npm run acceptance:preflight
npm run acceptance
```

Harness odbija production target, HTTP/localhost endpoint-e, inline ili
nepinovane ili placeholder artifact identitete, scenario runner iz workspace
checkout-a, nedostajuću prethodnu verziju, nepotpune metrike i svaki
scenario/drill bez redigovanog evidence zapisa. Preflight je read-only i ne
poziva endpoint-e ni scenario runner. Kada stvarni run počne, runner dobija samo
minimalne OS varijable, dve eksplicitno imenovane staging credential reference i
`NR_ACCEPTANCE_*` kontrolni skup; release/KMS i ostale ambient tajne se ne
nasleđuju.

Protected `staging-acceptance` GitHub environment mora imati sledeće reference,
bez secret vrednosti u repository-ju:

- environment vars: `NR_STAGING_WORKSPACE_ROOT`, `NR_ACCEPTANCE_CONFIG_PATH`,
  `NR_STAGING_EVIDENCE_DIRECTORY`, `NR_ADDON_RELEASE_SIGNING_KEY_FILE`,
  `NR_ADDON_RELEASE_SIGNING_KID`, `NR_ADDON_RELEASE_PUBLIC_KEYS_FILE`;
- environment secrets: `NR_ACCEPTANCE_STAGING_IDENTITY` i
  `NR_ACCEPTANCE_PROVIDER_IDENTITY`.

Signing key/public-key vrednosti nisu GitHub input: varijable su samo putanje ka
operator-provisioned, ACL-zaštićenim fajlovima na self-hosted runner-u. Workflow
prvo proverava reference i commit pin, instalira dependency-je bez tajni, zatim
pokreće read-only preflight i tek nakon njega puni acceptance. Credential secret-i
su step-scoped i nisu dostupni checkout/setup/install koracima.

Environment je kreiran 20. avgusta 2026. sa obaveznim ručnim reviewer gate-om
za `radomirradojevic` i deployment politikom ograničenom na `master`. Reference
još nisu unete, a repository nema registrovan self-hosted runner; zato workflow
još nije pokrenut i ova stavka ostaje staging `NO_GO`.
