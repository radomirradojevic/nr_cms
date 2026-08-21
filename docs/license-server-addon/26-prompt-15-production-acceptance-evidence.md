# Prompt 15 — Potpuni E2E, fault/load i production acceptance audit

Datum poslednjeg evidence ažuriranja: **2026-08-21** (`Europe/Belgrade`)

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
  Webshop, customer License Server, deployment worker i zaseban acceptance
  control-plane;
- tačan signed-RC artifact-set ID i SHA-256 za Master, CMS host, Webshop,
  License Server add-on/service i worker;
- dokaz da runtime koristi samo potpisane RC artefakte, bez workspace importa;
- prethodni package digest za upgrade/rollback;
- eksplicitne p95 pragove i soak trajanje;
- redigovane, verzionisane scenario/drill JSON zapise sa istim artifact pin-om.
- odvojene customer, payment-sandbox i operator identitete; fault/restart/restore
  ovlašćenje nikada ne ulazi u browser ili payment credential.

Svaki od pet component gate-ova takođe se fizički čuva u `component/*.json`;
audit referencira SHA-256 stvarnog redigovanog zapisa, ne nesnimljeni in-memory
rezultat.

Primer v2 konfiguracije je u
`docs/addons/night-raven-acceptance.staging.example.json`.

Prenosivi Linux launcher je u
`scripts/night-raven-staging-scenario-runner.mjs`. On ne simulira scenario i ne
može sam da proglasi prolaz: startuje verzionisani scenario na zasebnom HTTPS
control-plane-u, zabranjuje redirect i cross-origin poll, a zatim prihvata samo
evidence vezan za isti run, RC artifact set i package digest-e. Staging E2E
zapis mora atestirati `playwright-chromium`; operator drill mora atestirati
`operator-control-v1`. Build komanda pravi create-only executable van checkout-a
i ispisuje njegov SHA-256:

```powershell
npm run acceptance:staging:runner:build -- --output D:\secure\night-raven-staging-scenario-runner
```

Credential-binding v2 runner je 21. avgusta 2026. create-only izgrađen van
checkout-a: 19.044 bajta, SHA-256
`67f605e2de83c9c466bed9a9b4fdad4c3b9b36d00f06cfb5b13d1b00cda9e2cd`.
On još nije provisionovan u protected GitHub environment i ne predstavlja
izvršen staging scenario.

Zaseban staging-only acceptance control proces sada je implementiran u
deployment worker commit-u `4d2274a4c0ddcdf8430991755882dd3d23bd5c4f`.
Ima odvojenu PostgreSQL schema-u/migracije, idempotentni request ID, durable
run, lease/fencing, retry/backoff, persistent auth rate-limit, digest-only
bearer verifikaciju, hash-pinned RC/endpoints/browser policy i Playwright
`1.62.0` Chromium origin/download granicu. Control contract v2 vezuje svaki
request za tačne identity/provider vrste i SHA-256 fingerprint-e normalizovanih
visoko-entropijskih credential-a. Browser policy contract v3 dodatno razdvaja
top-level navigation origin-e od tačno dozvoljenih HTTPS resource/subframe
origin-a; skupovi moraju biti disjunktni, a resource-only origin ne može postati
top-level redirect ili navigacija. Storage state ostaje ograničen samo na
navigation origin-e. Create-only policy builder iz istog zaštićenog CMS staging
config-a, browser storage-state-a i dva credential fajla van checkout-a
kanonizuje URL-ove, preuzima samo RC digest identitet i vrste, pin-uje
storage-state/fingerprint vrednosti, ali nikada ne kopira plaintext tajnu.
Runtime ponovo proverava spoljašnje fajlove prema policy fingerprint-u; handleru
ih daje samo kroz neserializujući in-memory vault. Glavni deployment listener ga
ne importuje. Scenario retry je fail-closed: samo eksplicitno
označen pre-mutation transient kvar sme da se ponovi; ne-retryable kvar se
terminalizuje prvim pokušajem da paid/mutating handler ne bi napravio drugu
kupovinu. Višeminutni browser/drill run ima PostgreSQL-fenced lease od 120 s
koji se obnavlja na 30 s; izgubljen heartbeat abortuje Chromium kroz handler
`AbortSignal`, a stari lease ne može sačuvati evidence.

Registry sada implementira prvi od 61 handlera,
`license_server_install_without_customer_webshop`. On fail-closed potvrđuje čist
customer Webshop state, kupuje zasebnu License Server ponudu kroz vendor Webshop
i Stripe sandbox, dozvoljava tačno jednu secure-delivery karticu, drži reveal-once
ključ samo u memoriji, aktivira License Server i dokazuje
`install_pending -> ready`, pa ponovo potvrđuje da customer Webshop nije
instaliran. Koristi samo stabilne `data-nr-*` selector ugovore i čuva isključivo
sanitizovane numeričke metrike. Preostalih 60 scenario/drill handlera i dalje
dobijaju `scenario_unavailable` i nikada `PASS`; zato `/health` namerno ostaje
`503`.

Lokalna DB matrica ima 107 testova: 106 PASS, jedan očekivani browser-gated skip
i 0 fail; zaseban stvarni Chromium test je 1/1 PASS, a lint, typecheck i build su
zeleni. GitHub Worker CI run
[`32464334948`](https://github.com/radomirradojevic/addon-deployment-worker/actions/runs/32464334948)
je **PASS** na Windows acceptance control boundary gate-u i Ubuntu/PostgreSQL,
pinovanom Chromium-u i runtime audit gate-u. To dokazuje implementaciju prvog
handlera i njegove granice, ali nije dokaz da je scenario izvršen na stvarnom
stagingu.

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
$env:NR_ACCEPTANCE_SCENARIO_RUNNER_PATH = "D:\secure\night-raven-staging-scenario-runner"
$env:NR_STAGING_EVIDENCE_DIRECTORY = "D:\secure\night-raven-staging-evidence"
npm run acceptance:preflight
npm run acceptance
```

Harness odbija production target, HTTP/localhost endpoint-e, inline ili
nepinovane ili placeholder artifact identitete, scenario runner iz workspace
checkout-a, runner bez tačno pinovanog SHA-256 ili runner čiji sadržaj ne odgovara
tom digestu, evidence direktorijum unutar workspace checkout-a, nedostajuću
prethodnu verziju, nepotpune metrike i svaki
scenario/drill bez redigovanog evidence zapisa. Preflight je read-only i ne
poziva endpoint-e ni scenario runner. Kada stvarni run počne, runner dobija samo
minimalne OS varijable, tri eksplicitno imenovane staging credential reference i
`NR_ACCEPTANCE_*` kontrolni skup; release/KMS i ostale ambient tajne se ne
nasleđuju.

Protected `staging-acceptance` GitHub environment mora imati sledeće reference,
bez secret vrednosti u repository-ju:

- environment vars: `NR_ADDON_RELEASE_SIGNING_KID` i
  `NR_ACCEPTANCE_SCENARIO_RUNNER_SHA256`;
- environment secrets: međusobno odvojeni `NR_ACCEPTANCE_STAGING_IDENTITY`,
  `NR_ACCEPTANCE_PROVIDER_IDENTITY` i `NR_ACCEPTANCE_OPERATOR_IDENTITY`,
  repo-specifični read-only
  `NR_WEBSHOP_DEPLOY_KEY`, `NR_LICENSE_SERVER_ADDON_DEPLOY_KEY`,
  `NR_MASTER_DEPLOY_KEY`, `NR_DEPLOYMENT_WORKER_DEPLOY_KEY`,
  `NR_ACCEPTANCE_CONFIG_B64`, `NR_ACCEPTANCE_SCENARIO_RUNNER_B64`,
  `NR_ADDON_RELEASE_SIGNING_KEY_B64` i
  `NR_ADDON_RELEASE_PUBLIC_KEYS_B64`.

Ovih pet preostalih acceptance vrednosti provisionuju se samo iz fajlova van
workspace checkout-a. Prva komanda je read-only dry run; druga je eksplicitna
GitHub environment mutacija i izvršava se tek kada su pregledani stvarni runner,
konfiguracija i staging credential fajlovi:

```powershell
npm run acceptance:staging:provision -- --config-file D:\secure\night-raven-acceptance.staging.json --runner-file D:\secure\night-raven-staging-scenario-runner --staging-identity-file D:\secure\staging.identity --provider-identity-file D:\secure\provider.identity --operator-identity-file D:\secure\operator.identity
npm run acceptance:staging:provision -- --config-file D:\secure\night-raven-acceptance.staging.json --runner-file D:\secure\night-raven-staging-scenario-runner --staging-identity-file D:\secure\staging.identity --provider-identity-file D:\secure\provider.identity --operator-identity-file D:\secure\operator.identity --apply
```

Provisioner odbija source/workspace putanje i symlink povratak u checkout,
nepoznate ili duplirane argumente, inline/placeholder konfiguraciju, config i
runner digest mismatch, prevelike secret payload-e, nedostajuće signing/deploy
preduslove i overwrite postojećih reference. Secret sadržaj šalje `gh secret
set` preko stdin-a; u izlazu ostaju samo config i runner SHA-256. Parcijalna
operacija radi best-effort rollback svih reference koje je upravo kreirala.
Implementacija na commit-u `824ff0b6a3498a234f382aa5908bf06ea43c2b6a`
prošla je GitHub Public CI run
[`32418106892`](https://github.com/radomirradojevic/nr_cms/actions/runs/32418106892) 20. avgusta 2026. u `21:14:11Z`: actionlint/hosted ShellCheck, frozen install,
391-test suite, DB migracija, isolated public-copy build/NFT i supply-chain audit
su **PASS**. Provisioner `--apply` nije izvršen.

GitHub-hosted `ubuntu-24.04` runner checkout-uje četiri privatna repozitorijuma
na tačno pinovane commit SHA vrednosti. Svaki checkout koristi zaseban read-only
SSH deploy ključ i `persist-credentials: false`; nema zajedničkog PAT-a. Ključevi
su provisionovani 20. avgusta 2026. operator skriptom koji privatni materijal
šalje direktno na GitHub secret stdin i briše lokalni privremeni direktorijum.
Staging-only release authority je takođe provisionovan: KID
`staging-release:1c78bf2cb70b0717`, javni ključ SHA-256
`1c78bf2cb70b07170c2f63cbc046b12f782679d0c7e229acbfd86f205dc26486`.
On nije production publish authority. Konfiguracija, scenario runner i key
fajlovi dekodiraju se sa `umask 077` u ephemeral `$RUNNER_TEMP`. Workflow pre
izvršavanja proverava runner prema protected environment SHA-256 varijabli, a
harness istu proveru nezavisno ponavlja prema digestu u acceptance konfiguraciji.
Runner postaje executable tek posle prve provere; njegove i ostale privremene
putanje prosleđuju se harness-u, a fajlovi se brišu u `always()` koraku. Identity
credential-i ostaju step-scoped i nisu dostupni checkout/setup/install
koracima.

Environment je kreiran 20. avgusta 2026. sa obaveznim ručnim reviewer gate-om
za `radomirradojevic` i deployment politikom ograničenom na `master`.
GitHub-hosted private release verification je izvršen na CMS commit-u
`9c1ed9042642e9c82cd57d26db4f481ac2c537c6`: run
[`32413928892`](https://github.com/radomirradojevic/nr_cms/actions/runs/32413928892)
je **PASS**. Prošao je sva četiri pinned checkout-a, staging signing,
Webshop/License Server build-test-pack i oba isolated packed-host smoke-a.
Webshop/License Server tarball SHA-256 vrednosti su redom
`fc71fff1b26a1123facfdc5b01b8938f7222c2487401091108a5971e1ea5a555` i
`e99bee337f972cc4f6701e45b6ccde707bb4490aa730f12715a6497941d1d308`.
Hosted staging workflow portability i integritet runnera zatim su provereni na
CMS commit-u `8046d94023347a9ed9e524d8d25a42e686d213f3`. GitHub Public CI run
[`32416627151`](https://github.com/radomirradojevic/nr_cms/actions/runs/32416627151)
je 20. avgusta 2026. završio statusom **PASS** u `20:58:08Z`. Njegov novi,
checksum-pinovan `actionlint 1.7.12` + hosted ShellCheck gate proverio je sva
četiri workflow-a; zatim su prošli frozen install, test DB migracija, static/unit,
isolated public-copy build/NFT i supply-chain audit. Na tom commit-u više nije
nastao implicitni invalid-workflow failure za manualni staging workflow.
Acceptance config/identity secrets, pregledani Linux scenario-runner artefakt sa
pinovanim digestom i dostupni HTTPS staging endpoint-i još nisu potvrđeni. Zato
puni staging workflow još nije pokrenut i ova stavka ostaje staging `NO_GO`.

Prenosivi launcher, odvojeni operator identitet i stroža Playwright/control-plane
evidence granica implementirani su na commit-u
`211112261076d438c4347ebbcf5ddbd545b22e4b`. GitHub Public CI run
[`32420508525`](https://github.com/radomirradojevic/nr_cms/actions/runs/32420508525)
je 20. avgusta 2026. od `21:39:40Z` do `21:41:59Z` završio statusom
**success**: workflow validation, frozen install, test DB migracija, 398-test
matrica, packed public-copy build/NFT boundary i supply-chain audit su zeleni.
To potvrđuje launcher i njegov GitHub-hosted ugovor. Staging-only control-plane
osnova i credential-binding v2 su naknadno implementirani i provereni worker
run-ovima `32454258083` i `32459813095`. Worker commit
`4d2274a4c0ddcdf8430991755882dd3d23bd5c4f` zatim je dodao browser policy v3 i
prvi konkretan handler, potvrđen run-om
[`32464334948`](https://github.com/radomirradojevic/addon-deployment-worker/actions/runs/32464334948).
Proces nije deploymentovan, preostalih 60 handlera nije implementirano i nijedan
staging scenario još nije izvršen.

Poslednji tačno pinovani verification-only build je Webshop run
[`32464653489`](https://github.com/radomirradojevic/webshop/actions/runs/32464653489)
nad Webshop commit-om `651396b53b70b5368654b5614d856ab93a3dc40d` i CMS
commit-om `6ef21edc6366330e2888501c579474828189bb9e`; oba job-a su **PASS**.
Candidate za `@radomirradojevic/webshop@0.6.35` beleži artifact-inventory
SHA-256 `a94ad3c73dc3107fef22ce092ab0960b5b476681b3442f0cb71c6d05b5c42829`,
migration-bundle SHA-256
`1f0122fc02752f9deba6e96bba53ac5a7884e249b2921a9c4e1c8ad7d32db7ef` i
dependency-lock SHA-256
`04f306a83957e921fbfcf3538bb33faa5b0443d73b9e48c1d3220be8a5bf88df`.
Secret-free candidate JSON ima SHA-256
`9e6a68dec4b66b4edddcb77eee25621b5027c0b6d03e3f3917b1ceb4e24c49f1`, dok
je GitHub artifact ZIP transportni SHA-256 zasebno
`8ea2fc92a997949214d8dcf5aa893a031f58a82007b750f2f98304b61d435a16`.
Povezani CMS Public CI run
[`32464598561`](https://github.com/radomirradojevic/nr_cms/actions/runs/32464598561)
je takođe **PASS**. Ovi run-ovi nisu imali publish/deployment dozvole i ne
menjaju 34/34 NO-GO odluku bez stvarnih staging scenario i operator drill
dokaza.
