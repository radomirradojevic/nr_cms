# Prompt 16 — release candidate i kontrolisani rollout evidence

Datum pripreme: **20. avgust 2026.**  
Poslednja tehnička dopuna: **21. avgust 2026.**
Odluka: **NO-GO / GITHUB-HOSTED RC VERIFICATION READY / NOT PUBLISHED**

Ovaj zapis primenjuje `09-release-runbook.md` na finalni Prompt 15 audit. U ovom
koraku nisu izvršeni package publish, stvarni Master draft import/publish,
promena dostupnosti, install/redeploy ciljne instalacije niti production canary.
Ranije odobrenje za source commit/push ne predstavlja odobrenje za bilo koju od
tih release operacija.

## 1. Prompt 15 ulazni gate

Korišćen je finalni audit:

- putanja:
  `.tmp/night-raven-local-acceptance/local-20260820145739512-1bf3bba2bc/production-acceptance-audit.json`;
- SHA-256:
  `6b40ce15c9c672bbbd46ed20b7386520bbd4639aada82ada9e4c3af9b9bcd0aa`;
- rezultat: **34 PASS / 34 NO_GO** nad svih 68 `docs/11` zahteva;
- lokalna fault/concurrency dijagnostika: 39 PASS, ali
  `productionRuntime: false` i `gateEligible: false`.

Zato je ovaj rezultat lokalna tehnička priprema, ne release GO. Stvarni staging
topology, payment/managed-install, fault/load/soak, upgrade/rollback, encrypted
DB+key restore i operator/canary dokazi ostaju obavezni.

## 2. Zatvorene lokalne Prompt 16 prepreke

Legacy V1 paket i Webshop-only Master/worker putanja su zamenjeni sledećim
fail-closed ugovorima:

1. `@nr-cms/license-server` proizvodi canonical flattened EdDSA JWS release
   manifest V2 i zaseban, create-only publication attestation.
2. Artifact inventory, Windows x64 production dependency graph, CycloneDX 1.6
   SBOM, provenance, osam SQL checksum-a i osam schema postcondition hash-eva su
   potpisno vezani.
3. Centralni Master importer je generički samo za dva eksplicitno allowlist-ovana
   identiteta: Webshop i License Server. Package/source field, capability set,
   release-ID namespace, migracije i SQL policy ostaju zasebni po add-on-u.
4. Master schema migracija `0018_addon_release_source_identity` trajno čuva
   generički `sourceGitSha`, uz kompatibilni legacy Webshop mirror.
5. CMS packed registry i migration runner prihvataju License Server V2 JWS,
   proveravaju embedded manifest hash, inventory, potpis i SQL checksum-eve.
6. Deployment worker koristi License Server namespace/source/binding ugovor,
   isti release authority keyset i najmanje-privilegovane DB manifeste za sva tri
   profila (`vendor`, `client`, `paypal`).
7. Worker proverava schema postcondition posle svake migracije, nastavlja tačno
   sa schema 4 posle restart-a, idempotentno završava schema 8 i detektuje kasniji
   drift. Stari per-migration `compatibility` format više nije install prečica.
8. Zaseban staging-only acceptance control proces ima durable run/lease/fencing,
   persistent auth rate-limit, tačan runner response/evidence ugovor i
   Playwright Chromium mrežnu granicu. Glavni deployment listener ga ne učitava;
   bez svih eksplicitnih handlera servis ostaje `503 unavailable` i ne može
   proizvesti lažni `PASS`.

## 3. Predložena verzija i source identitet

Predložena stable verzija je **`0.2.0`**. Master i managed-deployment ugovori
prihvataju canonical `major.minor.patch`; RC status se vodi kroz draft/canary
gate, ne SemVer sufiksom.

| Polje                   | Vrednost                                        |
| ----------------------- | ----------------------------------------------- |
| package                 | `@nr-cms/license-server@0.2.0`                  |
| License Server source   | `6bdb1c8c06a062bd98313af941d774fa535b1f99`      |
| CMS baseline            | `9c1ed9042642e9c82cd57d26db4f481ac2c537c6`      |
| centralni Master        | `8fa03719a6040613ab6c796a31b2b87ff5640dcf`      |
| deployment worker       | `752f47ffc4d8e74e145bdc903dda4d3c01b84a2b`      |
| manifest contract       | `NRV-ADDON-RELEASE-MANIFEST-V2+JWS`             |
| publication contract    | `NRV-ADDON-RELEASE-PUBLICATION-ATTESTATION+JWS` |
| release ID              | `4b7e7030-4b72-5399-a008-b84765213d4a`          |
| source `releasedAt`     | `2026-08-20T20:22:49.000Z`                      |
| add-on schema           | `8`, supported `1..8`                           |
| CMS / Next / Node range | `^0.1.0` / `16.3.0` / `>=20.9.0 <25.0.0`        |
| lokalni toolchain       | Node `24.15.0`, npm `11.12.1`, Next `16.3.0`    |

`0.2.0` je pre-1.0 minor promena: od `0.1.0` prošireni su javni issuer/API,
admin/recovery i consumer SDK ugovori, a release/install ugovor prelazi na V2.
SQL promene ostaju aditivne i `expand_compatible`; nema automatske destruktivne
down migracije.

## 4. Lokalni V2 artefakt dokaz

Committed, clean source stanje je pokrenulo `pack:verify` i puni round-trip:

```text
License Server V2 producer
  -> npm tarball + local detached publication attestation
  -> centralni Master offline verifier
  -> deployment worker quarantine verifier
  -> čist packed CMS host i generated registry
```

Tačan lokalni round-trip tuple:

| Polje                      | Vrednost                                                           |
| -------------------------- | ------------------------------------------------------------------ |
| artifact inventory SHA-256 | `db9288fba679b103f9227e2edfbca535683f6b79dbbff4777e770ca624cdea4a` |
| dependency graph SHA-256   | `565a26ad879bf685289d7ec086d9becd8f5de03ee93e15458ed2eaabc91e193c` |
| migration bundle SHA-256   | `e5b1e32557033ba532db00301725b9712c8a56cf190088d002912ace51503b44` |
| embedded manifest SHA-256  | `a81e0aef6bd7f160b0e0c21515b000181542aadb64038c658463eec3f51bb63c` |
| provenance SHA-256         | `330436f4d1f5b56cf9ecf9a976bf6511091602b405704f85878109a5b286df93` |
| CycloneDX SBOM SHA-256     | `12a11348f765e7ba60ac9b5cbe5608c2147f248f4e0fea7f46c32290ab1acaba` |
| round-trip tarball SHA-256 | `b97d6dc5ef9ddee2942c9c5d4ca2621aa9678a42acfb50364c3fe43c718a51b5` |
| local attestation SHA-256  | `b44903e41a718cea7f72ef69b1a3ac322b27046d17ca489bd2fd0c1a6a1d277f` |
| local signing kid          | `local-acceptance:5f4b04690e473b85`                                |

`pack:verify` je unutar jednog fiksnog potpisanog build-a napravio dva identična
pack-a; zabeleženi SHA-256 bio je
`c8395e599d6a802552bb1d654c33bf6fa414aa6bdb4267f6c805ec4fc3a88f92`.
Različiti lokalni pozivi namerno generišu novi ephemeral signing key, pa se
manifest/tarball hash između tih poziva menja. Production reproducibility mora
koristiti isti odobreni authority key i iste source/toolchain ulaze.

Lokalni attestation koristi test registry version ID `1` i ephemeral ključ koji
je obrisan. On dokazuje contract round-trip, ali nije registry publication
evidence i ne sme se importovati/publikovati kao produkcioni release.

## 5. Migration plan

Svih osam migracija imaju `destructive: false`, `requiresBackup: true` i
`rollbackPolicy: expand_compatible`. Checksum drift, SQL policy odstupanje ili
schema postcondition mismatch prekidaju install pre service switch-a.

| Schema | Migration                                          | SQL SHA-256                                                        | Postcondition SHA-256                                              |
| -----: | -------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
|      1 | `0001_license_server_customer_issuer_baseline.sql` | `6a9e302e4d21aad734e117107152727bea11a7d0197feee113cf624b614403d1` | `b105dce70853480b79abfd76297f6f3c4100cfc943c7fccb283e13171fa9127e` |
|      2 | `0002_customer_issuer_v2_models.sql`               | `be2d41bc5d01a9c9bc6a44d843973ce5bd7a3e04b10224e8ec1fa400d35fdf8c` | `372261a2a8d39de80a2496ce460b02be78675ca45271b8260f897dcbabaaa406` |
|      3 | `0003_product_profiles_and_claim_schemas.sql`      | `4e24beb14ed11a158217e73755f7f5976ebeb72aa527594143046a74a4220a7f` | `174bfb66aa6423f2e105192210d91e023acfae3a92cc5e83ebe7f1fbdd631dba` |
|      4 | `0004_durable_operation_engine.sql`                | `ec3da34c49090bea12bef1f9723e3ab7ffe0cd9d32c44afd998889390903e2b8` | `8e97b8de9c2786d6cc8dc2fcb48a18f3761894ea9dd2fe1f6a06e4ffae416910` |
|      5 | `0005_http_api_v2_secret_overlap.sql`              | `7721a5ec11dfc0f204d852484d285eb1dcf46242dc32c3c7382908c9ac86d62c` | `cd264b0d6bfb90902d58741d8b66ddb44e5b1f7af98416ae7f35d4c910633566` |
|      6 | `0006_customer_issuer_scheduler_lease.sql`         | `2effa96a614e694d63b141f839a4b354dd607258283b0eaab0b5defe07d4cd29` | `91a8ff301176f61ac96cf1890c81ccb13f4fad3ce122ac5141366f98c0e2ca44` |
|      7 | `0007_runtime_activation_privacy_and_limits.sql`   | `87804f142a333f1ec8d73cba8dffccdb2bc9cc9f138e1aa9b34a5280505e11d0` | `c04de85bc2efbf0183144bededc13870ca8771af4e56bd252090091822c6e064` |
|      8 | `0008_production_admin_support.sql`                | `18267e85c26fb98843425591d98f7b443ed20afe45572ff7bffededd74fb6fb8` | `ace5eb1b1748a2361effec15a53a57ef61ce7731fe71b0290a554dcf67d1d567` |

Pre svake target instalacije obavezan je šifrovan DB+key backup i datirani
restore dokaz. Aplikacioni rollback je dozvoljen samo na prethodni tačno pinovan
schema-compatible paket; inače se radi forward-fix ili formalno odobren restore.

## 6. Izvršene lokalne kapije

| Komponenta / komanda                                   | Rezultat                                                                                                                                        |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| License Server `npm run test:db:local`                 | **113/113 PASS**, 0 skip                                                                                                                        |
| License Server `npm run typecheck`                     | **PASS** release + host                                                                                                                         |
| License Server `npm run pack:verify`                   | **PASS**, dva byte-identical pack-a za isti build/key                                                                                           |
| `npm run test:release:master-roundtrip`                | **PASS**, producer/Master/worker/packed CMS                                                                                                     |
| centralni Master `npm run test:db`                     | **81/81 PASS**, 0 skip                                                                                                                          |
| centralni Master `npm run typecheck`                   | **PASS**                                                                                                                                        |
| deployment worker `npm run test:db`                    | **85/85 PASS**, 0 skip                                                                                                                          |
| deployment worker `npm run lint` / `typecheck`         | **PASS / PASS**                                                                                                                                 |
| root CMS `npm run test`                                | **381 PASS**, 0 fail, 10 environment-gated skip                                                                                                 |
| root CMS `npm run lint` / `typecheck`                  | **PASS sa 12 postojećih warning-a / PASS**                                                                                                      |
| GitHub Public CI, commit `9c1ed90`, run `32413917814`  | **PASS** — clean checkout/install, fail-closed registry, DB migracije, testovi, packed public-copy build/NFT boundary i public dependency audit |
| GitHub Private Release Verification, run `32413928892` | **PASS** — protected GitHub-hosted clean checkout, staging potpis, oba add-on build/test/pack ciklusa i isolated packed-host smoke              |
| GitHub Public CI, commit `8046d94`, run `32416627151`  | **PASS** — sva četiri workflow-a kroz checksum-pinovan actionlint/hosted ShellCheck, zatim kompletan frozen public verification                 |
| GitHub Public CI, commit `824ff0b`, run `32418106892`  | **PASS** — evidence-directory binding, fail-closed input provisioner, 391 test, packed build/NFT i supply-chain audit                           |
| GitHub Public CI, commit `2111122`, run `32420508525`  | **PASS** — prenosivi runner, odvojen operator identitet, exact Playwright/control-plane evidence, 398 testova i packed/NFT/supply-chain gate    |
| Worker CI, commit `752f47f`, run `32454258083`         | **PASS** — Windows contract/build i Ubuntu PostgreSQL, stvarni Playwright Chromium boundary i runtime dependency audit                        |
| GitHub Actions runtime pinovi                          | **PASS** — official `checkout@v7.0.1`, `setup-node@v7.0.0` i `upload-artifact@v7.0.1` razrešeni su na immutable commit SHA vrednosti            |

Master DB suite uključuje generički immutable draft/import/publish/select
catalog contract i poseban paid License Server staging-entitlement izbor.
Round-trip dodatno koristi stvarni License Server tarball u offline Master
verifieru. Nije izvršen stvarni import u staging Master bazu jer to pripada
sledećem approval gate-u posle production package publish-a.

Posle objave workflow-a, isti V2 round-trip je ponovljen nad čistim trenutnim
checkout-ima. Rezultat je ostao zelen: release ID
`48c2960b-b8d6-5576-8f50-e3ff9d79de47`, tarball SHA-256
`cc42cd1176a32b951791098b7c18e8ce6df273311a0f80b95787c9b98df7ba77` i
lokalni publication-attestation SHA-256
`a095bbedcfb523fe710342703e4ec7234f6220b5d0cbd34873f86d293957ed8f`.
Ovo je i dalje ephemeral lokalni authority dokaz, ne publish artefakt.

Zaštićeni GitHub-hosted verification zatim je izvršen na `ubuntu-24.04`, Node
`24.15.0`, nad CMS commit-om
`9c1ed9042642e9c82cd57d26db4f481ac2c537c6` i tačno pinovanim privatnim
source commit-ima iz odeljka 3. Run
[`32413928892`](https://github.com/radomirradojevic/nr_cms/actions/runs/32413928892)
završen je 20. avgusta 2026. u `20:29:13Z`, statusom **success**, posle 4m21s.
Ručni environment approval komentar bio je
`verification-only-no-publish-or-deployment`.

| Hosted verification izlaz         | SHA-256                                                            |
| --------------------------------- | ------------------------------------------------------------------ |
| Webshop artifact inventory        | `33456bd9e2a496c4ba2b4329eb85f18641d8264293c6daffd8f14a91c4a9e70c` |
| Webshop signed tarball            | `fc71fff1b26a1123facfdc5b01b8938f7222c2487401091108a5971e1ea5a555` |
| License Server artifact inventory | `db9288fba679b103f9227e2edfbca535683f6b79dbbff4777e770ca624cdea4a` |
| License Server signed tarball     | `e99bee337f972cc4f6701e45b6ccde707bb4490aa730f12715a6497941d1d308` |

Webshop isolated host je potvrdio frozen install, Next `16.3.0` build, RSC,
route i client import granice nad 384 runtime modula. License Server isolated
host je potvrdio frozen install, Next `16.3.0` build, RSC/route import i
`tarball-self-reference` granicu. Oba su potpisana staging-only KID-em
`staging-release:1c78bf2cb70b0717`; production registry publish authority nije
korišćen niti je kreiran publication attestation sa stvarnim registry version
ID-em.

Staging workflow je dodatno zatvoren za GitHub-hosted izvršavanje na CMS
commit-u `8046d94023347a9ed9e524d8d25a42e686d213f3`. Uklonjena je ranija
nevažeća job-level upotreba `runner.temp`; ephemeral putanje se sada objavljuju
iz runtime koraka preko `GITHUB_ENV`. Public CI run
[`32416627151`](https://github.com/radomirradojevic/nr_cms/actions/runs/32416627151)
je završio u `20:58:08Z` statusom **success** za 3m27s. Novi gate pre ostatka
build-a preuzima tačno pinovan `actionlint 1.7.12`, proverava njegov Linux
artefakt prema SHA-256
`8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8` i
validira sva četiri workflow-a uz hosted ShellCheck. Staging workflow je sada
validan manualni `workflow_dispatch`; nije pokrenut niti je preskočen njegov
environment approval.

Poslednji lokalni input gap je zatvoren fail-closed operator provisionerom
`acceptance:staging:provision`. On uzima config, Linux scenario runner i tri
credential-a isključivo iz fajlova van checkout-a, ponavlja punu staging config
i runner SHA proveru, koristi stdin za GitHub secret-e i zahteva zaseban
`--apply`. Refuse-overwrite, prerequisite provera, projektni secret-size limit,
post-write verifikacija i rollback parcijalno kreiranih reference su obavezni.
Sam provisioner ne proizvodi stvarni runner niti staging credential-e i nije
pokrenut sa `--apply` bez tih operator-kontrolisanih ulaza. Commit
`824ff0b6a3498a234f382aa5908bf06ea43c2b6a` potvrđen je GitHub Public CI run-om
[`32418106892`](https://github.com/radomirradojevic/nr_cms/actions/runs/32418106892),
završenim u `21:14:11Z` statusom **success** za 2m46s.

Runner source/build i stroži harness zatim su potvrđeni na commit-u
`211112261076d438c4347ebbcf5ddbd545b22e4b` kroz GitHub Public CI run
[`32420508525`](https://github.com/radomirradojevic/nr_cms/actions/runs/32420508525),
završen u `21:41:59Z` statusom **success** za 2m19s. Staging-only control-plane
osnova je zatim dodata u worker i potvrđena run-om `32454258083`. NO-GO ostaje:
proces nije deploymentovan, nedostaje svih 61 konkretan handler, a tri stvarna
credential-a i staging scenario rezultati još nisu provisionovani.

## 7. Canary i rollback/forward-fix plan

Canary obuhvat je tačno jedan allowlisted interni customer/product/SKU/install,
nikad globalna dostupnost. Gate prati auth/error reason kodove, unknown `kid`,
issuerRef mismatch, duplicate issue/delivery, queue depth/oldest age/DLQ,
validate/issue latency, keyset/catalog refresh i lifecycle/revoke odluke.

Minimalne kapije:

- validate p95 `< 300 ms`; issue accept p95 `< 500 ms`;
- checkout/webhook `< 60 s`, paid-to-license `< 5 min`;
- duplicate entitlement/license/delivery `0`, activation limit breach `0`;
- DLQ `0`, paid-without-license stariji od 15 min `0`;
- invalid signature/unknown kid/secret-or-PII sentinel/5xx za canary `0`;
- 2 h aktivnog scenarija, 24 h immediate soak i ukupno 72 h pre wider GO-a.

Na gate failure: nova availability i checkout off; worker claim pause uz očuvan
queue/lease/idempotency trag; webhook intake i refund/revoke reconciliation
ostaju uključeni. Povratak je samo na dokazano compatible prethodni digest. Ako
to nije dokazano, sledi forward-fix ili formalno odobren restore bez promene
`issuerRef`/signing ključa.

## 8. Preostali NO-GO uslovi

Package/release publish odobrenje se još ne traži:

1. Prompt 15 i dalje ima 34 obavezna `NO_GO` zahteva bez stvarnog
   production-like staging/load/soak/operator dokaza.
2. Potreban je production release authority/KMS; nema development fallback-a.
3. Potrebni su registry pristup i create-only publication attestation za tačne
   finalne tarball bajtove i stvarni immutable registry version ID.
4. Potrebni su staging Master i vendor/customer CMS/Webshop/worker pristupi za
   stvarni draft import, entitlement i managed-install lifecycle.
5. Nije pinovan prethodni production License Server digest za rollback niti je
   izvršen stvarni datirani encrypted DB+key restore koji validira istorijski
   assertion.
6. Acceptance control handler registry je namerno prazan dok konkretni UI,
   fault-control i operator drill ugovori ne budu implementirani i pregledani;
   zato readiness ostaje `503`, a staging workflow nije pokrenut.

GitHub bootstrap je izvršen 20. avgusta 2026: `private-release`,
`staging-acceptance` i `release-production` imaju obavezan ručni reviewer gate
za `radomirradojevic` i samo `master` deployment policy. Postojeći Vercel
`Production` environment ostao je odvojen i bez promene pravila. Actions policy
dozvoljava samo GitHub-owned actions i zahteva puni commit SHA. Workflow-i su
prebačeni na GitHub-hosted `ubuntu-24.04`; Webshop, License Server add-on,
centralni Master i deployment worker checkout-uju se iz privatnih remote-a na
tačno pinovane commit SHA vrednosti. Četiri različita read-only SSH deploy
ključa provisionovana su u sva tri environment-a bez zajedničkog PAT-a;
provisioner odbija overwrite i radi rollback parcijalne operacije. Preostali
staging-only Ed25519 authority ima KID `staging-release:1c78bf2cb70b0717` i
javni ključ SHA-256
`1c78bf2cb70b07170c2f63cbc046b12f782679d0c7e229acbfd86f205dc26486`;
to nije production publish authority. Hosted acceptance više ne zavisi od
Windows operator putanje: workflow materijalizuje Linux scenario runner u
`$RUNNER_TEMP`, proverava protected-environment SHA-256 pre `chmod 700`, a
harness ponavlja proveru prema digestu iz konfiguracije i odbija runner ili
evidence direktorijum iz workspace checkout-a. Pregledani runner se sada
create-only gradi komandom `acceptance:staging:runner:build`; njegov launcher
prihvata samo poznatu matricu, zaseban operator bearer i same-origin HTTPS
control-plane rezultat vezan za tačan RC artifact set. Staging E2E evidence mora
atestirati `playwright-chromium`, a drill `operator-control-v1`. Stvarni runner
artefakt i njegov digest,
acceptance config/identity secrets i dostupni HTTPS staging endpoint-i još nisu
provisionovani; vrednosti tajni se ne unose u source niti u ovaj evidence zapis.

GitHub REST API ostavlja `can_admins_bypass: true`; pre prvog release workflow
run-a vlasnik mora u UI-u da isključi **Allow administrators to bypass
configured protection rules** za sva tri release okruženja. Browser kontrola
nije bila dostupna iz ove sesije, pa taj UI-only korak nije predstavljen kao
završen.

Nijedna od ovih stavki nije waiver. Dok nisu zatvorene, odluka ostaje NO-GO.

## 9. Approval ledger

| Gate                                      | Status                      | Potrebna sledeća odluka                                                                     |
| ----------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------- |
| package/release publish                   | **BLOCKED / NOT REQUESTED** | zaseban eksplicitni publish GO tek posle production potpisivanja i zelenih preflight dokaza |
| Master draft import + staging entitlement | **NOT STARTED**             | izvršava se tek posle package publish-a; nije Master publish                                |
| Master publish                            | **NOT REQUESTED**           | drugo zasebno odobrenje posle staging provere                                               |
| canary availability                       | **NOT REQUESTED**           | zaseban GO posle Master publish-a                                                           |
| target install/redeploy                   | **NOT REQUESTED**           | odobrenje po installation ID-u                                                              |
| wider rollout                             | **NOT REQUESTED**           | eksplicitni GO posle zelenog 72 h canary-ja                                                 |

Prompt 16 nije „gotov” samo zato što je lokalni V2 pipeline izgrađen. Lokalno
rešive V1/Webshop-only prepreke su zatvorene; release ostaje **NO-GO** dok
production digest/publish/Master/install/canary/evidence gate-ovi nisu zasebno
odobreni i dokazani.
