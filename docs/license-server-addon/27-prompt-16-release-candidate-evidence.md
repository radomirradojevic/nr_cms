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

1. `@radomirradojevic/license-server-addon` proizvodi canonical flattened EdDSA JWS release
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
| package                 | `@radomirradojevic/license-server-addon@0.2.0`  |
| License Server source   | `9f07ebdcf08f322a55899e7d94b7ec34c7408546`      |
| Webshop baseline        | `b81ae1d744b5c0634e358b60c4994455587d3f23`      |
| CMS baseline            | `cd262ca34aff8823b04753454f9ef50ca774cf06`      |
| centralni Master        | `8fa03719a6040613ab6c796a31b2b87ff5640dcf`      |
| deployment worker       | `e9e2428b689b88b873c0f16d897314d19fdd5e31`      |
| manifest contract       | `NRV-ADDON-RELEASE-MANIFEST-V2+JWS`             |
| publication contract    | `NRV-ADDON-RELEASE-PUBLICATION-ATTESTATION+JWS` |
| release ID              | `223e29c0-aa45-5e04-9e5d-a42fb6a3fe68`          |
| source `releasedAt`     | `2026-08-21T09:58:52.000Z`                      |
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

Tačan lokalni round-trip tuple ispod napravljen je na prethodnom source commit-u
`6bdb1c8c06a062bd98313af941d774fa535b1f99`. Selector-only commit
`05bab07bd6f2935dd786e8abc244196faef4882e` ponovo je prošao svih 113 lokalnih
testova, release/host typecheck i verification-only `pack:verify`; dva pack-a su
bila byte-identical, a tarball SHA-256 je
`c66236e33ad891b38bc42c01f1bae55ed57d068c74302970a759247e81028e93`.
Aktuelni packed acceptance-selector commit
`9f07ebdcf08f322a55899e7d94b7ec34c7408546` zatim je prošao lokalnu matricu sa
106 PASS, sedam eksplicitnih DB-context skipova i 0 fail, kao i release/host
typecheck. On dodaje semantičke kontrole za reveal-once API client i
product-scoped grant bez slabljenja server-side permission provere. Za isti
tačno pinovani multi-repo tuple pokrenut je zaseban GitHub-hosted private
package/clean-host gate; njegov rezultat se beleži ispod.
Production kandidat ipak mora ponovo vezati ceo multi-repo tuple za isti
odobreni authority ključ; stari lokalni ephemeral digest se ne promoviše.

Prethodni potpuni lokalni round-trip tuple:

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

| Komponenta / komanda                                      | Rezultat                                                                                                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| License Server `npm run test:db:local`                    | **113/113 PASS**, 0 skip                                                                                                                          |
| License Server `npm run test:local` (`68a0038`)           | **106 PASS**, 7 DB-context skip, 0 fail                                                                                                           |
| License Server `npm run typecheck`                        | **PASS** release + host                                                                                                                           |
| License Server `npm run pack:verify`                      | **PASS**, dva byte-identical pack-a za isti build/key                                                                                             |
| `npm run test:release:master-roundtrip`                   | **PASS**, producer/Master/worker/packed CMS                                                                                                       |
| centralni Master `npm run test:db`                        | **81/81 PASS**, 0 skip                                                                                                                            |
| centralni Master `npm run typecheck`                      | **PASS**                                                                                                                                          |
| Webshop `npm run test:local` (`b81ae1d`)                  | **197/197 PASS**, 0 skip                                                                                                                          |
| Webshop `npm run typecheck`                               | **PASS** release + host                                                                                                                           |
| deployment worker `npm run test:db` (`e9e2428`)           | **109 PASS**, 1 browser-gated skip, 0 fail                                                                                                        |
| deployment worker `npm run lint` / `typecheck`            | **PASS / PASS**                                                                                                                                   |
| root CMS `npm run test`                                   | **381 PASS**, 0 fail, 10 environment-gated skip                                                                                                   |
| root CMS `npm run lint` / `typecheck`                     | **PASS sa 12 postojećih warning-a / PASS**                                                                                                        |
| GitHub Public CI, commit `9c1ed90`, run `32413917814`     | **PASS** — clean checkout/install, fail-closed registry, DB migracije, testovi, packed public-copy build/NFT boundary i public dependency audit   |
| GitHub Private Release Verification, run `32413928892`    | **PASS** — protected GitHub-hosted clean checkout, staging potpis, oba add-on build/test/pack ciklusa i isolated packed-host smoke                |
| GitHub Public CI, commit `8046d94`, run `32416627151`     | **PASS** — sva četiri workflow-a kroz checksum-pinovan actionlint/hosted ShellCheck, zatim kompletan frozen public verification                   |
| GitHub Public CI, commit `824ff0b`, run `32418106892`     | **PASS** — evidence-directory binding, fail-closed input provisioner, 391 test, packed build/NFT i supply-chain audit                             |
| GitHub Public CI, commit `2111122`, run `32420508525`     | **PASS** — prenosivi runner, odvojen operator identitet, exact Playwright/control-plane evidence, 398 testova i packed/NFT/supply-chain gate      |
| Worker CI, commit `752f47f`, run `32454258083`            | **PASS** — Windows contract/build i Ubuntu PostgreSQL, stvarni Playwright Chromium boundary i runtime dependency audit                            |
| Webshop verification, commit `1cc0737`, run `32458131335` | **PASS** — Windows dependency graph i clean Linux build/package/packed-host candidate evidence; verification-only, bez publish-a                  |
| Worker CI, commit `ecdc5a8`, run `32458375988`            | **PASS** — non-retryable mutating acceptance greška terminalizira se posle prvog pokušaja; Windows i Ubuntu/PostgreSQL/Chromium su zeleni         |
| Worker CI, commit `5be7c13`, run `32459813095`            | **PASS** — control contract v2, external credential fingerprint/vault binding, Windows i Ubuntu/PostgreSQL/stvarni Chromium/runtime audit         |
| Worker CI, commit `3482134`, run `32462354808`            | **PASS** — 120 s fenced lease sa 30 s heartbeat-om, abort-on-lost Chromium signal i long-running PostgreSQL handler test na Windows/Linux gate-u  |
| GitHub Public CI, commit `72b6329`, run `32458450130`     | **PASS** — workflow validation, frozen install, DB migracija, 393-test matrica, public-copy build/NFT i supply-chain audit                        |
| GitHub Public CI, commit `584c429`, run `32461610074`     | **PASS** — License Server packed-ready selector, activation-field selector i novi immutable add-on pinovi kroz kompletan frozen public gate       |
| GitHub Public CI, commit `237a023`, run `32460575248`     | **PASS** — sva tri protected workflow-a pinovana na worker `5be7c13` i Webshop `03e3861`; frozen public verification i packed/NFT boundary zeleni |
| Webshop verification, commit `03e3861`, run `32460668265` | **PASS** — Windows dependency graph i clean Linux build/package/packed-host nad CMS `237a023`; verification-only, bez publish-a                   |
| Worker CI, commit `4d2274a`, run `32464334948`            | **PASS** — browser policy v3, prvi standalone License Server handler, Windows boundary i Ubuntu/PostgreSQL/pinovani Chromium/runtime audit        |
| GitHub Public CI, commit `6ef21ed`, run `32464598561`     | **PASS** — stabilni packed selector-i i sva tri protected workflow-a pinovana na tačne Webshop/worker commit-e kroz puni public gate              |
| Webshop verification, commit `651396b`, run `32464653489` | **PASS** — Windows dependency graph i clean Linux build/package/packed-host nad CMS `6ef21ed`; verification-only, bez publish-a                   |
| Worker CI, commit `a9129f6`, run `32468148995`            | **PASS** — drugi local paid-delivery handler, Ed25519 app verifier, Windows boundary i Ubuntu/PostgreSQL/pinovani Chromium/runtime audit          |
| GitHub Public CI, commit `342ed36`, run `32468351803`     | **PASS** — sva tri protected workflow-a pinovana na novi License Server/Webshop/worker tuple kroz kompletan frozen public gate                    |
| Webshop verification, commit `b81ae1d`, run `32468401421` | **PASS** — Windows dependency graph i clean Linux build/package/packed-host nad CMS `342ed36`; verification-only, bez publish-a                   |
| Private Release Verification, run `32469036621`           | **PASS** — sva četiri private source pina, staging-potpisana oba add-on paketa i oba clean Next 16.3 host smoke-a; bez publish/deployment koraka  |
| Worker CI, commit `e9e2428`, run `32470596142`            | **PASS** — treći remote HTTPS/HMAC paid-delivery handler, reveal-once credential granica i Windows/Ubuntu/PostgreSQL/Chromium/runtime audit       |
| GitHub Public CI, commit `cd262ca`, run `32470722553`     | **PASS** — novi License Server/worker SHA pinovi, workflow validation i kompletan frozen public/package/NFT/supply-chain gate                     |
| Private Release Verification, run `32470808819`           | **PASS** — aktuelni 3-handler tuple, staging-potpisana oba add-on paketa i oba clean Next 16.3 host smoke-a; bez publish/deployment koraka        |
| GitHub Actions runtime pinovi                             | **PASS** — official `checkout@v7.0.1`, `setup-node@v7.0.0` i `upload-artifact@v7.0.1` razrešeni su na immutable commit SHA vrednosti              |

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
proces nije deploymentovan, 60 od 61 konkretnog handlera i dalje nedostaje, a
tri stvarna credential-a i staging scenario rezultati još nisu provisionovani.

Poslednja verification-only Webshop provera izvršena je kroz GitHub Actions run
[`32458131335`](https://github.com/radomirradojevic/webshop/actions/runs/32458131335)
nad Webshop commit-om `1cc07377e35650f6b981b2a2e70181df43692d79` i CMS
commit-om `620b9c2a79f7a79933482d05223210f0cac2dbd6`. Candidate evidence za
`@radomirradojevic/webshop@0.6.35` beleži artifact-inventory SHA-256
`f0fdab3766957b427579c0e22ee2b1f3041ff9abfc878f2fa92b708342bb763e`,
migration-bundle SHA-256
`1f0122fc02752f9deba6e96bba53ac5a7884e249b2921a9c4e1c8ad7d32db7ef`
i dependency-lock SHA-256
`04f306a83957e921fbfcf3538bb33faa5b0443d73b9e48c1d3220be8a5bf88df`.
GitHubov digest uploadovanog evidence ZIP artefakta je zaseban transportni hash
`529abd0dd71ad3705e2113e2e48d2ba4a099d43be4084ff8985431ae8c977542`
i ne poredi se sa runtime inventory digestom. Run nije koristio production
signing authority i nije publish-ovao paket.

Ovaj Webshop candidate tuple je istorijski verifikacioni dokaz, ne trenutni
finalni RC: posle njega je CMS pomeren na
`72b6329bb6cdf6351a42b3eda7d0a91ce43f030c`, a worker na
`5be7c13a8eb83569f75288a3782b624659e6cd9a`. Oba nova head-a su potvrđena
zelenim run-ovima
[`32458450130`](https://github.com/radomirradojevic/nr_cms/actions/runs/32458450130)
i
[`32459813095`](https://github.com/radomirradojevic/addon-deployment-worker/actions/runs/32459813095).
Zato se finalni multi-repo RC mora ponovo izgraditi iz zamrznutog tuple-a tek
posle zatvaranja staging gate-ova; nijedan raniji digest se ne promoviše kao
release digest.

Follow-up verification-only run
[`32460668265`](https://github.com/radomirradojevic/webshop/actions/runs/32460668265)
zatim je 21. avgusta 2026. završio statusom **success** nad tačno pinovanim
Webshop commit-om `03e3861b296a0ea4b4f993830a1deee6c7b82909` i CMS
commit-om `237a0231bd7ec42521235e1bda53f2bbdac5633c`. Candidate evidence za
`@radomirradojevic/webshop@0.6.35` beleži artifact-inventory SHA-256
`48eb054f418caa342e210ab7c339c6222c1994f506fe58c599444feec90c1c08`,
migration-bundle SHA-256
`1f0122fc02752f9deba6e96bba53ac5a7884e249b2921a9c4e1c8ad7d32db7ef`
i dependency-lock SHA-256
`04f306a83957e921fbfcf3538bb33faa5b0443d73b9e48c1d3220be8a5bf88df`.
Zaseban GitHub transportni digest secret-free evidence ZIP-a je
`e2a885b5b5b79ff92bc9428a5bda02902bd53f6bb048f8b90077813144dd9213`.
Run je imao prazan permissions ugovor, nije koristio production signing
authority i nije izvršio package publish, Master import/publish, availability
ili deployment. CMS Public CI za isti source tuple, run
[`32460575248`](https://github.com/radomirradojevic/nr_cms/actions/runs/32460575248),
takođe je **success**. Ovaj tuple je provereni build ulaz, ali nije finalni RC:
naknadni evidence i acceptance-selector commit-i menjaju source head, a 34
staging `NO_GO` kapije ostaju otvorene.

Trenutni verification-only tuple zatim je potvrđen Webshop run-om
[`32464653489`](https://github.com/radomirradojevic/webshop/actions/runs/32464653489)
nad Webshop commit-om `651396b53b70b5368654b5614d856ab93a3dc40d` i CMS
commit-om `6ef21edc6366330e2888501c579474828189bb9e`. Candidate za
`@radomirradojevic/webshop@0.6.35` beleži artifact-inventory SHA-256
`a94ad3c73dc3107fef22ce092ab0960b5b476681b3442f0cb71c6d05b5c42829`,
migration-bundle SHA-256
`1f0122fc02752f9deba6e96bba53ac5a7884e249b2921a9c4e1c8ad7d32db7ef` i
dependency-lock SHA-256
`04f306a83957e921fbfcf3538bb33faa5b0443d73b9e48c1d3220be8a5bf88df`.
Secret-free candidate JSON ima SHA-256
`9e6a68dec4b66b4edddcb77eee25621b5027c0b6d03e3f3917b1ceb4e24c49f1`, dok
je GitHub artifact ZIP transportni SHA-256 zasebno
`8ea2fc92a997949214d8dcf5aa893a031f58a82007b750f2f98304b61d435a16`.
CMS Public CI za isti tuple, run
[`32464598561`](https://github.com/radomirradojevic/nr_cms/actions/runs/32464598561),
takođe je **success**. Worker source
`4d2274a4c0ddcdf8430991755882dd3d23bd5c4f`, koji ovaj CMS tačno pin-uje,
potvrđen je run-om
[`32464334948`](https://github.com/radomirradojevic/addon-deployment-worker/actions/runs/32464334948).
Sva tri run-a su verification-only: bez package/release publish-a, Master
import/publish-a, availability promene ili deployment-a. Zbog 34 staging
`NO_GO` kapije ni ovaj tuple još nije finalni RC za promociju.

Novi acceptance-selector tuple zatim je tačno pinovan na License Server
`68a00383af93bbe11f5bcd09da7c885158d4d342`, Webshop
`b81ae1d744b5c0634e358b60c4994455587d3f23`, worker
`a9129f616bae258fa21016448510a2c8385b3f7b` i CMS
`342ed36fa8733c916092ce6b8c23341ea812bce3`. Worker CI
[`32468148995`](https://github.com/radomirradojevic/addon-deployment-worker/actions/runs/32468148995),
CMS Public CI
[`32468351803`](https://github.com/radomirradojevic/nr_cms/actions/runs/32468351803)
i Webshop verification-only packed-host run
[`32468401421`](https://github.com/radomirradojevic/webshop/actions/runs/32468401421)
su **PASS**. Protected Private Release Verification run
[`32469036621`](https://github.com/radomirradojevic/nr_cms/actions/runs/32469036621)
je potom proverio sva četiri private checkout pina, oba staging-potpisana
add-on build/test/pack ciklusa i oba clean Next 16.3 host smoke-a. Webshop
artifact/tarball SHA-256 su
`318192fa9636b721ba80ad1b35a9a942fffb8cb1a128e76d2b7285916557cc29` /
`872b5cb0992b1335325afc478e7f65d7a718470f8eecc21b0f21a02a4aa73ea6`, a
License Server artifact/tarball SHA-256 su
`2930bc05de1e879c8fdedd8dbd2e1444c008a8219b064351ee2dff65f61fb099` /
`53c791405a243d79dd8076be90de60b5abab09110b367cc46ebc6afb2426abba`.
Environment review komentar je bio
`verification-only-no-publish-or-deployment`. Drugi handler ipak nije izvršen
nad protected staging endpoint-ima, pa se nijedna od 34 staging `NO_GO` kapije
ne zatvara.

Aktuelni remote-handler tuple zatim je pinovan na License Server
`9f07ebdcf08f322a55899e7d94b7ec34c7408546`, isti Webshop
`b81ae1d744b5c0634e358b60c4994455587d3f23`, worker
`e9e2428b689b88b873c0f16d897314d19fdd5e31` i CMS
`cd262ca34aff8823b04753454f9ef50ca774cf06`. Worker CI
[`32470596142`](https://github.com/radomirradojevic/addon-deployment-worker/actions/runs/32470596142),
CMS Public CI
[`32470722553`](https://github.com/radomirradojevic/nr_cms/actions/runs/32470722553)
i protected Private Release Verification
[`32470808819`](https://github.com/radomirradojevic/nr_cms/actions/runs/32470808819)
su **PASS**. Poslednji gate je ponovio oba staging-potpisana add-on build/test/
pack ciklusa i oba clean Next 16.3 host smoke-a. Webshop artifact/tarball
SHA-256 su
`318192fa9636b721ba80ad1b35a9a942fffb8cb1a128e76d2b7285916557cc29` /
`4de3d9b50d11d45ca2f9e2c120c457d7bf45b56a30c4f5e1b52a4f23e4cb6bf1`, a
License Server artifact/tarball SHA-256 su
`87c59900c73460bff52c496f6972be3bd1da75f8094e1d39646bf8baf0c7de1c` /
`373aef105c1ecda37827c10fb2cc2083fc7abbd6ffe52c06cf0d281f088cdb09`.
Webshop runtime artifact je ostao byte-identičan prethodnom tuple-u; tarball se
očekivano promenio jer signed manifest/provenance vezuje novi CMS material SHA,
dok su dva pack-a unutar novog run-a byte-identična. Review je ponovo imao
komentar `verification-only-no-publish-or-deployment`; nije izvršen publish,
Master import/publish, availability ili target deployment. Nijedan od tri
handlera još nije izvršen nad protected staging endpoint-ima, pa 34/34 NO-GO
odluka ostaje nepromenjena.

Dana 21. avgusta 2026. dodatno je zatvoren lokalni RC harness propust: centralni
Master build više ne može da nasledi development bazu tokom acceptance-a.
Production `prebuild` i njegove migracije se ne preskaču, već se izvršavaju kroz
Master-ov sopstveni fail-closed wrapper koji prihvata samo `nrls_*_test` cilj i
odbija CMS test bazu. Regression test harnessa je `20/20` **PASS**, a izolovani
Master build je zatim završio **PASS** sa `database is already up to date` i
punim Next 16.3 route build-om.

Završna lokalna matrica potvrđuje CMS `403/403`, Master `81/81`, Webshop
`197/197`, License Server `113/113`, worker DB `109` prolaza plus zaseban pravi
Playwright Chromium `1/1`. Local multi-service run
`local-20260821111917540-812d6ca284`, obe migracione matrice i svih osam
remediation invarianta su zeleni. Potpisani package/Master roundtrip je vezao
release `16ae4d96-9eae-56bb-9116-41d718cb4a2b`, artifact SHA-256
`87c59900c73460bff52c496f6972be3bd1da75f8094e1d39646bf8baf0c7de1c` i
publication-attestation SHA-256
`4217525258c5a19a5b77d154ae8d6b2ea694c753d7e15550652464cf748f9948`.
Sve je lokalno/verification-only: nije urađen registry publish, Master import ili
publish, availability, target install/redeploy ili canary.

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
6. Acceptance control registry sada sadrži 3/61 handlera:
   `license_server_install_without_customer_webshop` i
   `customer_webshop_local_paid_delivery` i
   `customer_webshop_remote_hmac_paid_delivery`. Browser policy contract v3 odvaja
   top-level navigation origin-e od resource/subframe origin-a; handleri čuvaju
   reveal podatke samo u memoriji i vraćaju sanitizovan evidence. Drugi handler
   dodatno proverava issuer environment/ref, secure `.nrls.json` headers,
   envelope binding i Ed25519 potpis javnim keyset-om. Treći kreira
   product/environment-scoped HMAC client preko reveal-once download-a, proverava
   da replay vraća `404`, zatim isti tok ponavlja preko stvarnog HTTPS NRLS V2
   `catalog`/`issue`/poll adaptera uz pinovani `issuerRef`. Preostalih 58
   UI/fault/operator handlera nije implementirano; zato readiness ostaje `503`,
   a staging workflow nije pokrenut; stvarnih scenario izvršenja ostaje 0/3.
   Novi portable control-contract-v2
   runner SHA-256
   `67f605e2de83c9c466bed9a9b4fdad4c3b9b36d00f06cfb5b13d1b00cda9e2cd`
   još mora kroz pregledani external-file provisioner da zameni stari protected
   runner artefakt/hash zajedno sa stvarnim staging config/credential ulazima.

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
atestirati `playwright-chromium`, a drill `operator-control-v1`. Novi v2 runner
artefakt i digest jesu lokalno izgrađeni van checkout-a, ali nisu
provisionovani; acceptance config/identity secrets i dostupni HTTPS staging
endpoint-i još nisu potvrđeni. Vrednosti tajni se ne unose u source niti u ovaj
evidence zapis.

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

## 10. Aktuelni verification-only candidate

Poslednji zamrznuti source tuple je CMS
`702e31c3d2c318b43bb3e827667f3b44597e9471`, Master
`6cb7df171007706661f5a89c128a1d527fb4f145`, Webshop
`b81ae1d744b5c0634e358b60c4994455587d3f23`, License Server add-on
`9f07ebdcf08f322a55899e7d94b7ec34c7408546` i worker
`e9e2428b689b88b873c0f16d897314d19fdd5e31`. Public CI run
[`32477240450`](https://github.com/radomirradojevic/nr_cms/actions/runs/32477240450)
i protected Private Release Verification run
[`32477294686`](https://github.com/radomirradojevic/nr_cms/actions/runs/32477294686)
su **PASS**. Protected review je eksplicitno bio
`verification-only-no-publish-or-deployment`.

| Paket          | Verzija  | Release ID                             | Artifact SHA-256                                                   | Reproducible tarball SHA-256                                       |
| -------------- | -------- | -------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Webshop        | `0.6.35` | `00fa9a70-576e-5593-9536-89a51f5863d7` | `318192fa9636b721ba80ad1b35a9a942fffb8cb1a128e76d2b7285916557cc29` | `b1140ce953c9f74664af642be5637c587bea51839c5215053dcc7dd8c6bbf244` |
| License Server | `0.2.0`  | `4f4e83e5-0880-5876-be48-636110ceaa3c` | `87c59900c73460bff52c496f6972be3bd1da75f8094e1d39646bf8baf0c7de1c` | `2173ff8bbf269a451e7010c334a2a5c60ffa9791fff66ec94936ca920e06bedd` |

Oba paketa su prošla build/test/pack i clean Next `16.3.0` host smoke na
GitHub-hosted Ubuntu/Node `24.15.0`. Ovo je staging-potpisan verifikacioni
candidate, ne production release: nema registry publish-a, Master draft/publish
write-a, availability promene, target install/redeploy-a ni canary-ja. Zbog
otvorenih Prompt 15 staging kapija approval ledger iz odeljka 9 ostaje važeći.

## 11. Finalni owner-scoped candidate i lokalna osnova

Aktuelni verification-only workflow commit je
`19561f0c5bfab6b07c03d49758adc656da13352d`. On zamrzava runtime CMS
`bee6ca64f247723cf2472def6408787b4d4f3dd5`, Webshop
`3ff8e9f9475f69cb7e7dbff34d01a94d378fe610`, License Server add-on
`c477d8cea06a3ae9cb638c6f341a3ab2ac8777e0`, centralni Master
`76612151f53e57256304501be37cf0e663d8ad26` i deployment worker
`ada6beb36cc5965be5321fefc91bb0cfe4d36c9d`.

License Server package identity je sada konačno
`@radomirradojevic/license-server-addon@0.2.0`; Master-ova kompatibilna
migracija čuva istorijski legacy zapis, ali release selector bira samo novi
owner-scoped identitet. Finalni worker i Master DB regresioni testovi dokazuju
da lažni noviji legacy paket ne može biti izabran.

Lokalna production-like osnova je 21. avgusta 2026. uspešno podignuta na tom
runtime tuple-u. Vendor/customer/PayPal CMS koriste create-only service
resources v8, worker koristi finalni immutable release/policy, a sledeći URL-ovi
su vratili HTTP `200`: `vendor.nr.test`, `client.nr.test`, `paypal.nr.test`,
`license.nr.test` i `deploy.nr.test/health`. Lokalni `acceptance:local` run
`local-20260821181354183-1c497cbe46` zatim je završio kodom `0`; packed License
Server tarball SHA-256 je
`3111dbb4c85f336cdc51b4491a62d1b1915355e9cacc0596ae7a0320e199c7f8`, a
Webshop tarball SHA-256 je
`a53490f71f673578a065a841ba00c708d2f3ec4111f22afaf873306c7848f895`.
To su lokalno potpisani reproducibility dokazi, ne registry publication
digest-i.

Finalni Public CI run
[`32510466440`](https://github.com/radomirradojevic/nr_cms/actions/runs/32510466440)
je **PASS**. Finalni protected Private Release Verification run
[`32510497771`](https://github.com/radomirradojevic/nr_cms/actions/runs/32510497771)
čeka reviewer odobrenje za `private-release` environment. Taj run je strogo
verification-only: njegovo odobrenje nije package publish, Master publish,
availability ili deployment odobrenje. Posle prolaza tek njegov artifact daje
autoritative hosted tarball/provenance/SBOM SHA-256 vrednosti za operator gate.

Stvarni authenticated staging UI tok još ne može biti izvršen bez zaštićenog
Playwright storage-state/test identiteta ili povezane browser sesije. Auth nije
zaobiđen, tajne nisu ispisane i nijedna poslovna tabela nije ručno mutirana.
Approval ledger iz odeljka 9 zato ostaje važeći; posebno, package/release
publish nije odobren niti izvršen.
