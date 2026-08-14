# 12 — Redosled copy/paste promptova za implementaciju

## Kako se koriste

Promptove šalji redom, jedan po jedan, implementacionom agentu. Sledeći prompt šalji tek kada je prethodni acceptance gate zelen ili kada je agent jasno dokazao spoljašnji/manualni blocker. Ako otvoriš novu agent sesiju, prvo ponovo pošalji Prompt 00, pa nastavi odgovarajućim faznim promptom.

Ovi promptovi nisu zamena za tehničku specifikaciju. Njihov posao je da ograniče change set i usmere agenta na autoritativne dokumente. Agent ne sme da „pojednostavi” kriptografski, idempotency, DB ownership, deployment fence, payment ili lifecycle contract zato što je prevelik za jednu fazu.

Izmene se rade samo u source repozitorijumima pod `D:\nr_cms`:

- core CMS: `D:\nr_cms`;
- Webshop: `D:\nr_cms\.private\webshop`;
- master: `D:\nr_cms\.private\license-server`;
- License Server addon samo kada prompt to izričito kaže;
- novi worker: `D:\nr_cms\.private\addon-deployment-worker`.

`D:\nr_cms-vendor`, `D:\nr_cms-client` i `D:\nr_license-server` su deployment/config koreni. Ne editovati ih kao razvojni source i ne kopirati ručno source izmene u njih. Clean export, immutable release i deployment automatizacija moraju proizvesti test instance.

## Prompt 00 — ugovor sesije i početni preflight

```text
Radićemo višefaznu implementaciju Webshop license purchase/activation sistema u D:\nr_cms. Za sada uradi samo read-only preflight i uspostavi pravila rada; ne menjaj kod, baze, servise, GitHub, Caddy ili spoljne dashboarde.

Obavezno potpuno pročitaj:
- D:\nr_cms\AGENTS.md;
- docs/webshop_activation/README.md;
- docs/webshop_activation/00-as-built-audit.md;
- docs/webshop_activation/01-ciljna-arhitektura.md;
- docs/webshop_activation/11-implementation-roadmap.md;
- docs/webshop_activation/12-implementation-prompts.md.

Zatim pregledaj git status u svakom postojećem repozitorijumu pod D:\nr_cms i evidentiraj postojeće user izmene bez menjanja/stashovanja/resetovanja. Potvrdi stvarne package scriptove, migration alate, Next 16.3.0 lokalnu dokumentaciju i da li postoji novi worker repo. Ne pretpostavljaj da su TARGET stavke već implementirane samo zato što su dokumentovane.

Stalna pravila za sve naredne faze:
1. Specifikacija u docs/webshop_activation ima prednost nad starijim PASS/status dokumentima.
2. Za Next.js nedoumicu koristi node_modules/next/dist/docs; nikada ne pravi middleware.ts, već proxy.ts.
3. Menjaj samo source repo kome promena pripada. Ne edituj vendor/client deployment kao source i ne unosi .private u njih.
4. Čuvaj postojeći dirty worktree. Bez git reset --hard, checkout --, masovnog brisanja, commita, pusha, publish-a ili spoljne mutacije bez posebnog odobrenja.
5. Svaku DB promenu isporuči kroz versioniranu migraciju, checksum/ledger i rollback/restore plan. Nema ručnog SQL-a kao završene implementacije.
6. Secret se ne stavlja u kod, dokument, test output, CLI argument ili log. Koristi placeholder, protected file/handle ili definisani secret-ref contract.
7. Implementiraj samo scope aktuelnog faznog prompta. Ne preskači unapred u payment/lifecycle ili kompatibilnost cleanup.
8. Pre izmene napravi kratak plan; posle izmene pokreni proporcionalne lint/typecheck/unit/integration/build/migration provere iz stvarnih package.json scriptova.
9. Ako specifikacija ima stvarnu kontradikciju ili traži novu authority/spoljnu odluku, zaustavi taj deo i navedi tačne fajlove/linije i najmanju potrebnu odluku. Ne izmišljaj fallback.
10. Na kraju svake faze vrati: outcome, promenjene fajlove po repou, migracije i njihove hash/ID vrednosti, izvršene komande sa rezultatom, acceptance dokaze, poznate rizike i tačan manualni korak ako postoji. Ne tvrdi da je E2E završen pre runbooka 09.

Vrati sada samo: AS-BUILT sažetak po repou, dirty-worktree granice, dostupne test/migration komande, otkrivene hard blockere za Prompt 01 i potvrdu da nisi ništa menjao.
```

## Prompt 01 — shared canonical contracti, env profili i clean core build

```text
Implementiraj samo Fazu 0 za shared canonical-domain/outbound URL/env profile i clean addon-free CMS build. Pretpostavka je da je Prompt 00 završen i da su njegove worktree granice i dalje važeće.

Pre izmene potpuno pročitaj docs/webshop_activation/02-instance-env-i-lokalna-infrastruktura.md i relevantne delove 05, 07, 10 i Fazu 0 u 11. Pregledaj postojeće CMS, Webshop i master implementacije pre dizajna.

Scope:
- jedan versionirani canonical hostname/domain fixture i ekvivalentni helperi u CMS-u, Webshopu i masteru;
- razdvajanje hostname identiteta od origin/transport URL-a i porta;
- strict outbound HTTPS/self-hosted/SSRF pravila iz dokumentacije, uključujući .nr.test development allowlist bez opšteg disable flag-a;
- NR_CMS_DEPLOYMENT_PROFILE, NR_LICENSE_ENVIRONMENT i NR_ADDON_SOURCE_MODE template/validator contract;
- profile-aware prepare-dev-runtime: private_workspace sme koristiti .private, registry koristi samo instalirani package, empty pravi core bez addona;
- uklanjanje unconditional predev addons:local ponašanja;
- exact WEBSHOP_BUY_URL startup parser i derived vendorAudience=normalized URL.origin, bez zasebnog audience env-a;
- allowedDevOrigins samo vendor.nr.test i client.nr.test, uz license.nr.test gde master Next config to zahteva;
- server-side Node trust za lokalni Caddy CA bez --insecure i bez gašenja TLS verifikacije;
- početni shared test fixture-i za SPKI-DER Ed25519 fingerprint scheme, ali nemoj još menjati activation DB/state machine.

Ne implementiraj još master product, activation V2, worker, purchase intent, payment ili lifecycle. Ne menjaj deployment checkoutove ručno.

Acceptance:
- development/private_workspace radi u D:\nr_cms;
- clean temporary vendor i client source export bez .private prolaze env validation i base build u empty modu;
- vendor/client daju različit canonical domain, ali isto NR_LICENSE_ENVIRONMENT=development;
- localhost:3000/3002 se ne koriste kao dva license identiteta;
- HTTPS license.nr.test loopback prolazi samo uz oba eksplicitna self-hosted/host allowlist uslova, HTTP i neallowlistovani private host padaju;
- WEBSHOP_BUY_URL HTTP/userinfo/query/fragment/pogrešna ili trailing-slash putanja/neočekivani port padaju, a eksplicitni :443 daje isti audience;
- HMR preko vendor.nr.test i client.nr.test nema blocked cross-origin grešku;
- lint, typecheck, relevantni unit testovi i oba clean builda prolaze.

Na kraju ne pokreći sledeću fazu. Daj diff sažetak i matrice test vektora po sva tri repoa.
```

## Prompt 02 — core DB role, migrator i fresh/restore granica

```text
Implementiraj samo per-target CMS core database ownership/provisioning contract iz docs/webshop_activation/02-instance-env-i-lokalna-infrastruktura.md odeljka 8.1 i odgovarajuće Faze 0/operativne gate-ove iz 09, 10 i 11.

Obavezni target:
- vendor: nr_cms_vendor_core_owner NOLOGIN, nr_cms_vendor_core_migrator i nr_cms_vendor_runtime;
- client: nr_cms_client_core_owner NOLOGIN, nr_cms_client_core_migrator i nr_cms_client_runtime;
- versionirani CmsCorePrivilegeManifestV1;
- operator-only idempotentni db:core:provision i db:core:migrate CLI, sa protected password-file/no-symlink/no-log pravilima i DPAPI LocalMachine migrator secret-ref rootom koji ne čitaju CMS ili worker service SID-evi;
- migration session radi provereni SET ROLE exact target owneru, advisory lock, checksum dry-run/apply/final-check i redigovani receipt;
- public core schema default+explicit runtime grant reconciler, zasebni runtime-denied nr_control operator schema i startup pending/drift fail-before-listen;
- schema-aware migration introspection; ne pretpostavljaj da je svaki objekat u public ako contract navodi schema identitet.

Ne radi još Webshop business schema relocation/cutover; za to je Prompt 03. Ne pokreći admin/provisioning komande nad user bazama bez eksplicitnog odobrenja. Implementaciju i integration testove radi nad namenskim temporary PostgreSQL bazama/rolama sa verified cleanup procedurom, a za stvarne prazne baze isporuči tačne manual komande i preflight.

Acceptance mora dokazati:
- potpuno prazna temporary DB, upgrade fixture i isolated restore;
- owner/migrator/runtime/ACL/default privilege/ledger hash identitet pre i posle restore-a;
- runtime kroz stvarni ili veran service-identity adapter može normalan manifest-allowlisted CMS core CRUD;
- runtime ne može CREATE/ALTER/DROP, GRANT, SET ROLE, pg_authid, nr_control ili drugi target;
- migrator secret nije u runtime .env, procesu, logu, worker rootu ili release-u;
- db:core:migrate exact retry je idempotentan, drugi target/ref/manifest hash pada;
- postojeće migration provere, lint/typecheck/test/build prolaze.

Zaustavi se pre realnog role/password provisioning-a ako je potrebna administratorska dozvola i vrati operatoru precizan, redigovan runbook.
```

## Prompt 03 — canonical `webshop` schema, legacy cutover i host route binding

```text
Implementiraj canonical Webshop DB/schema ownership i registry-only host composition. Potpuno pročitaj docs/webshop_activation/03-github-packages-i-release.md, route deo 07, migration/service delove 05 i 10, kao i Fazu 2 u 11. Ovo je P0 pre package objave.

DB scope:
- zameni zastareli private-package 13-table model canonical pgSchema("webshop") source-of-truth-om;
- prenesi tačno 45 business tabela iz allowliste u dokumentu 03 i dodaj webshop.webshops anchor + webshop.webshop_settings;
- public zadržava webshop_addon_entitlements, license_server_addon_entitlements, vendor/cms_addon control-plane i generic rate-limit tabele;
- ukloni business settings/storefront presets/order allocator iz entitlement metadata kroz versionirani backfill;
- single-active-webshop i content_type invariant, schema-qualified cross-schema FK ka public.content/files/galleries i zaštita finansijske/order istorije od CASCADE brisanja;
- root db/schema.ts prestaje da duplira business source; core bez paketa mora i dalje da se build-uje;
- signed migration descriptor dobija postconditionSchemaFingerprintSha256, a runner koristi strict WebshopSchemaFingerprintV1 i privilege manifest;
- implementiraj empty baseline i admin-authorized, backup-required db:webshop-schema-cutover za exact legacy 45-table public stanje; blind legacy_applied, stari 0.5.0 0001 i arbitrary table/schema/SQL input su zabranjeni;
- core-detach putanja sme ukloniti samo dokazano prazne exact legacy tabele bez CASCADE; populated/drifted stanje daje operator_schema_cutover_required.

Host composition scope:
- definiši HostAddonRouteBindingsV1 u core-u i typed package route/render/job delegate contract;
- dodaj stvarni core App Router wrapper app/licenses/purchase-intents/accept/route.ts i typed delegate path ["licenses","purchase-intents","accept"];
- inventariši postojeće storefront/dashboard/api-webshop/Paddle/download/cron wrapper ulaze; package app/** iz node_modules nije Next route;
- app/api/files/[id] više ne sme direktno da zavisi od root Webshop business tabela; koristi typed addon authorization hook/delegate;
- registry empty/not-installed wrapper daje stabilan 404, installed ali fenced/not-ready 503, a samo exact ready poziva package;
- proxy.ts exception još samo pripremi method/path-scoped; purchase JWS/business handler dolazi kasnije.

Ne objavljuj npm package i ne pomeraj user podatke u stvarnim bazama. Testiraj empty i realističan legacy clone/fixture.

Acceptance:
- fresh core DB nema 45 business tabela u public; addon baseline daje tačno canonical 47-table webshop stanje;
- legacy fixture prvo daje operator_schema_cutover_required, zatim exact cutover, isti row counts/ključni aggregates, owner/FK/index/check/ACL/postcondition, idempotentan retry i isolated restore;
- vendor cutover ne može menjati client;
- clean core build bez .private/package-a otkriva host wrappers i vraća disabled/404;
- clean registry fixture povezuje svaki declared route/job tačno jednom; missing/duplicate/unknown binding pada;
- root i private schema/data import drift testovi prolaze, bez global search_path oslanjanja.

Stani pre bilo kakvog realnog operator cutover-a i vrati migration/cutover receipts iz fixture-a plus manualni preflight za stvarne baze.
```

## Prompt 04 — master bootstrap, product/SKU, keyset i HMAC V2 klijenti

```text
Implementiraj samo Master License Server bootstrap i administrativni foundation iz docs/webshop_activation/04-master-license-server.md i Faze 1 iz 11. Pročitaj i HMAC/key rotation delove 02 i 10. Radi u .private/license-server; CMS menjaj samo kada shared HMAC fixture ili operator adapter to nužno zahteva.

Scope:
- eksplicitni one-time admin bootstrap CLI sa protected password inputom; ukloni implicitni neupotrebljivi random credential tok;
- Product type "Webshop license key", requiresDomain=true, addonKey=webshop;
- exact SKU webshop-30/183/365/1000000, gde durationDays=0 znači lifetime i activationLimit dolazi samo iz immutable master policy;
- manual lifetime issuance za vendor.nr.test uz canonical-domain proveru i bez license key-a u auditu/logu;
- HMAC V2 API client/KID/secret provisioning, exact scopes, nonce/replay, idempotency i active+old rotation contract;
- versionirani entitlement/purchase/release keyset bootstrap/anti-rollback fajlovi i odvojeni private signing keys;
- master secret envelope KID/keyring/rewrap foundation;
- deterministic environment-bound catalogVersion/ETag i no-op stability;
- strict env validator i migracije za praznu nr_license_server_test bazu, ali ne pokreći ih nad user bazom bez odobrenja.

Ne implementiraj još release import, activation V2, purchase intent, payment authorization ili issuance.

Acceptance:
- fresh temporary master DB može se administrirati bez ručnog SQL-a, drugi bootstrap je odbijen;
- četiri SKU-a i lifetime semantika su exact, wrong/null domain za manual vendor key pada;
- dva ista catalog GET-a imaju isti version/ETag, stvarna mutacija monotono menja revision;
- HMAC golden fixture prolazi u masteru i consumer test adapteru; path/body/timestamp/KID/nonce/scope tamper pada;
- active+old rotation/replay retention i master envelope rewrap/restore fixture prolaze;
- key/secret/license plaintext nije u logu, DB audit prikazu ili test snapshotu;
- master lint/typecheck/test/migration-check/build prolaze.

Na kraju vrati tačne operator komande za budući bootstrap/product/API-client/manual-vendor-key korak, ali ih ne izvršavaj bez potvrde.
```

## Prompt 05 — production Webshop package i GitHub Packages pipeline

```text
Implementiraj production release pipeline za private repo radomirradojevic/webshop prema docs/webshop_activation/03-github-packages-i-release.md i Fazi 2 u 11. Pretpostavka: Prompt 03 je zaključao canonical schema i HostAddonRouteBindingsV1.

Scope u .private/webshop:
- package name @radomirradojevic/webshop, private GitHub Packages registry metadata i minimalni production files/exports;
- stvarni migrations/*.sql payloadi, migrations.json exact descriptori sa checksumom i postconditionSchemaFingerprintSha256;
- ReleaseManifestPayloadV2, Ed25519 purpose-specific signature, stable releaseId, artifact inventory/hash, dependencyLockSha256, schema/runtime/CMS/Node/Next/edition/channel contract;
- canonical Windows-safe tar inventory/path/link/ADS/device-name provere;
- Windows x64, pinned Node/npm, core.autocrlf=false authoritative release-dependency-lock graph job;
- provenance i SBOM bez tajni;
- local-dev/fixture KID striktno odvojeni od production allowlist-e;
- publish workflow sa minimalnim permissions, protected environment, immutable exact SemVer, npm provenance gde je podržano i bez lifecycle script execution;
- post-publish re-download/verify i detached release-publication-attestation.json sa GitHub package-version ID-em, SRI/hashom i attested publishedAt;
- create-only GitHub Release asset retry, bez overwrite/clobber-a;
- host route/job binding capabilities moraju exact odgovarati Promptu 03;
- package 0.5.0 ostaje immutable i production-ineligible; koristi novu SemVer verziju.

Ne publishuj package, ne kreiraj tag/release i ne koristi production signing key bez posebnog eksplicitnog odobrenja. Implementiraj pipeline i lokalne/repository-only test fixtures; ako network download test traži credential, koristi documented secret-ref i zaustavi se pre spoljne mutacije.

Acceptance:
- npm pack dry-run sadržaj nema source, .env, private key, CMS path ili neinventarisan fajl;
- SQL bytes, descriptor checksum/postcondition i migrationBundleHash se slažu;
- dva frozen builda daju isti manifest/artifact/dependency graph/release identity prema definisanom deterministic contractu;
- tampered file/tar path/manifest/KID/schema/route binding/transitive node-edge-integrity/peer/optional platform fixture pada;
- clean Next host verification koristi instalirani tarball, ne .private source;
- publish job jedini ima packages:write, attestation asset job najmanji contents:write, build/test job nema oba;
- lint/typecheck/unit/integration/release:check/verify-npm-pack/install:verify:next prolaze.

Vrati candidate version, tarball path+SHA/SRI, manifest/artifact/dependency/migration hash, expected GitHub workflow korake i eksplicitno označi da hosted publish još nije izvršen.
```

## Prompt 06 — master release import, publish i deterministic selector

```text
Implementiraj masterov immutable Webshop release catalog iz docs/webshop_activation/04-master-license-server.md odeljka o release katalogu, dokumenta 03 i Faze 2.2 u 11. Radi pre stvarnog hosted package publish-a koristeći frozen repository fixture, ali contract mora biti isti za pravi tarball.

Scope:
- target env/keyset validator za NRLS_ADDON_RELEASE_PUBLIC_KEYS_FILE/SHA256;
- schema/migracije za immutable vendor release zapis i exact stored manifest, dependency-lock, publication-attestation i migration descriptor/postcondition evidence;
- operator-only release:import CLI sa absolute regular non-reparse inputima, expected hashes, advisory lockom, create-only draft i audit change-ref-om;
- strict offline verifikacija tarball path safety, package/addon allowlist-e, oba JWS purpose potpisa, artifact/SBOM/provenance, Windows dependency graph, GitHub package identity, publishedAt i canonical schema postcondition;
- odvojeni release:publish draft->published operator korak; CI nema master mutation credential/endpoint;
- published/withdrawn lifecycle i evidence read /.well-known/nr-addon-releases/<UUID>/publication-attestation.json sa exact bytes/ETag;
- deterministic stable selector: eligibility filter, highest canonical SemVer, publishedAt DESC, releaseId ASC, no prerelease/build metadata i no implicit downgrade;
- updatesUntil koristi isključivo attested publishedAt;
- keyset overlap/revocation i concurrent import/publish/select idempotency.

Ne implementiraj activation u ovom promptu i ne importuj/publishuj stvarni hosted release bez user potvrde.

Acceptance:
- exact import retry vraća isti draft; isti identity sa promenjenim byte/hashom je incident conflict;
- missing packaged SQL, stari 13-table 0001, postcondition mismatch, local/unknown/revoked KID ili tampered attestation pada pre DB write-a;
- publish menja samo status/audit, ne immutable tuple;
- backdated source commit sa registry publishedAt posle updatesUntil nije eligible;
- concurrent selector na više instanci bira isti release, downgrade zahteva posebnu audit operaciju;
- withdrawn historical evidence ostaje čitljivo za postojeći runtime;
- master migration/typecheck/test/build i isolated restore prolaze.

Vrati operator runbook za pravi import/publish i precizno navedi koji outputi iz Prompta 05 moraju postojati pre njegove upotrebe.
```

## Prompt 07 — activation/revalidation V2, CMS durable state i deployment outbox

```text
Implementiraj end-to-end activation/revalidation control plane bez samog package deployment izvršenja. Autoritativni su docs/webshop_activation/05-aktivacija-i-deployment-worker.md odeljci 1-5, dokumenti 03/04/10 i Faza 3 u 11.

Master scope:
- activation challenge/complete V2 sa SPKI-DER Ed25519 installation proof, canonical domain, deploymentMode, NR_LICENSE_ENVIRONMENT i exact HostCapabilitiesV1 hashom;
- published release selector iz Prompta 06, bez PACKAGE_CONFIG fallback-a;
- signed EntitlementClaimsV2 sa nullable licenseValidUntil, konačnim envelope expiry-jem, lifecycle/version/release/edition/installation bindingom i strict protected headerom;
- atomic activation slot/idempotency i PoP revalidation challenge/complete sa fresh host descriptorom;
- public anti-rollback entitlement keyset read/cache contract.

CMS scope:
- installation key envelope KID/AAD/keyring/rewrap i fingerprint scheme migration bez metadata-only rewrite-a;
- strict entitlement verifier, durable keyset cache i environment/domain/release/host binding;
- migrations za entitlement, installation desired+installed evidence, monotonic installation-scoped epoch, generation/intent/operation, runtimeStatus, operations i deployment outbox;
- activation transakcija durable upisuje entitlement + license_accepted/install_pending + outbox; HTTP ne pokreće npm/build/migration/restart;
- outbox publisher lease/heartbeat/backoff/DLQ, exact HMAC V2 request, stable operation body/hash i 202 job binding;
- callback receiver schema/ledger skeleton može biti dodata, ali ready/installed serving tuple još ne sme biti postavljen bez worker reconciliation-a;
- activation UI prikazuje install_pending i realni operation ID.

Ne implementiraj worker internals niti optimistički ready. Ne koristi .private webshop source kao runtime dokaz.

Acceptance:
- invalid key/domain/environment/PoP/host descriptor/release ne kreira entitlement/install/outbox red;
- validan result je durable pre dispatch-a; network failure ponavlja isti body/key/epoch/generation;
- duplicate activation daje isti binding, changed desired entitlement/release pravi novi epoch, generation+1 samo po dokumentovanom terminal retryable predecessor-u;
- lifetime ima licenseValidUntil=null bez 2099 sentinela;
- legacy PEM fingerprint ne postaje SPKI scheme metadata-only;
- restart koristi durable keyset/entitlement state;
- UI nikad ne prikazuje ready pre fenced worker finalizer-a;
- CMS/master migrations, contract fixtures, lint/typecheck/tests/build prolaze.

Na kraju navedi tačan worker receiver contract koji Prompt 08 mora implementirati i nemoj ga sam unapred implementirati.
```

## Prompt 08 — deployment worker repo, PostgreSQL job store i HMAC receiver/result transport

```text
Kreiraj/implementiraj privatni worker source repo D:\nr_cms\.private\addon-deployment-worker prema docs/webshop_activation/02 i 05, Fazi 4.1-4.2 u 11 i security granicama iz 10. Ne instaliraj ga u CMS package i ne kopiraj ga u vendor/client checkout.

Scope:
- dedicated PostgreSQL-only job store i migrations: target states, installation-scoped highest epoch/generation, target mutex+fencing token, jobs, request replay, phase evidence i result outbox;
- env/template/validator za deploy.nr.test:3003 i nr_addon_deployment_worker_test, bez SQLite/in-memory fallback-a;
- target-specific POST receiver, exact NR-DEPLOY-HMAC-V2 canonical bytes/header/content-type/body/timestamp/replay contract i static target mapping;
- pair-CAS epoch/generation/operation/intent/supersedes state machine, exact 202 idempotency i binding conflict;
- durable lease/heartbeat/takeover i target-wide mutex odvojen od installation identity state-a;
- callback result outbox sa zasebnim per-target result HMAC KID-em, unique resultId i unique operation/job bindingom;
- CMS callback verifier iz Prompta 07 dovrši za immutable historical snapshot, initial_ack=applied|stale_* i duplicate replay ACK, bez drugog serving-state write-a;
- backup/isolated restore contract za worker DB;
- static licenseEnvironment equality i release/package/target allowlist.

U ovoj fazi job posle accept-a može završiti samo kontrolisanim test stub finalom pre filesystem/DB/service mutacije. Ne implementiraj još package download/build/migrations/switch. Stub nikada ne sme prijaviti ready/succeeded kao pravi deploy.

Acceptance:
- PostgreSQL migrations/restore očuvavaju epoch, target fencing token, queued job, replay i result outbox;
- lower/gap/reset/mismatched generation pada; viši epoch prima samo generation 1; novi installation epoch 1 nije stale zbog starog installation epoch 50;
- dva targeta mogu paralelno, dva joba istog targeta ne mogu;
- exact request/result replay je idempotentan, isti ID/drugi hash je incident;
- late installation/epoch/generation callback dobija tačan stale ACK bez current-state mutacije;
- restart/lease expiry/takeover ne izvršava job bez recovery inspection-a;
- HMAC secret/body nije u logu/DB error outputu;
- worker lint/typecheck/unit/integration/migration/restore/build prolaze.

Vrati schema diagram/state transition dokaze i listu statičkih target polja koja Promptovi 09/10 moraju koristiti.
```

## Prompt 09 — worker supply-chain fetch, offline install i secret-free build

```text
Implementiraj samo immutable source/package verification i build polovinu workera prema docs/webshop_activation/03, 05 odeljcima 6-7.8, 10 i Fazi 4.3 u 11. Pretpostavka: Prompt 08 worker store/receiver je zelen.

Scope:
- trusted mirror + statički pinovan CMS SHA export u contained immutable release staging root; request ne bira repo/commit/path;
- exact base package.json/package-lock bytes/hash i strict merge invariant;
- četiri Windows identiteta i ACL granice: orchestrator, registry credential broker, build sandbox, DB broker; u ovoj fazi koristi prva tri bez target DB credentiala;
- job-private npm-compatible cacache/quarantine, pinned Node/npm/pacote/cacache;
- credentialed child A fetch root packument/tarball, zatim secret-free safe tar/manifest/attestation/dependency/migration verification;
- credentialed child B puni samo verified addon+base-lock fetch plan; posle gašenja nema token/config/handle-a;
- offline cache audit, token-free config, network deny, strict package-lock-only merge i npm ci --offline --ignore-scripts;
- post-install graph/artifact verification;
- production addon registry/keyset generation iz instaliranog package-a;
- phase-specific CmsPublicBuildEnvV1, deploy:verify:build bez DB-a, production Next build bez runtime secret-a;
- HostAddonRouteBindingsV1 clean build proof i phase evidence hash-evi.

Ne acquire-uj target DB credential, ne primenjuj migraciju i ne stop/startuj servis. Job na uspešnom buildu u test modu staje pre mutation gate-a sa eksplicitnim non-success test rezultatom.

Acceptance:
- clean hosted-registry fixture za exact package radi bez .private;
- tar/path/link/manifest/KID/attestation/schema/dependency/lock/base-graph tamper pada pre package code/DB/service;
- registry token postoji samo u dva credentialed child procesa i ne postoji u parentu/build env/cache/release/logu;
- build sandbox ne može pročitati worker/DB/payment/email/Clerk/HMAC sealed canary, broker pipe ili napraviti breakaway descendant;
- outbound posle fetch-a pada; offline cache miss ne ide na mrežu;
- vendor/client public build env i release root ostaju izolovani;
- production build i relevantni security/supply-chain fixture-i prolaze.

Ako pravi GitHub Packages read dokaz zahteva credential, traži samo scoped secret-ref/odobrenje; nikada ne traži da se token zalepi u prompt ili .env.
```

## Prompt 10 — worker DB phase, WinSW/SCM bootstrap, switch i reconciliation

```text
Dovrši mutation/deployment polovinu workera prema docs/webshop_activation/02 odeljcima 9.1 i 12, dokumentu 05 od 7.9 nadalje, 09/10 i Fazi 4 u 11. Ne menjaj supply-chain contract iz Prompta 09 osim ako test otkrije konkretan bug.

Scope:
- per-target addon deployer role, dedicated webshop schema ownership/runtime grants/default privileges i canonical migrationPrivilegeManifestSha256;
- DPAPI LocalMachine os_secret_ref_local target DB credential, NRAddonDbCredentialBroker service SID, long-lived db-phase-controller, closed HMAC/sequence named-pipe commands i jedna dedicated DB session/advisory lock kroz terminal receipt;
- schema classifier: empty canonical baseline, valid ledger, exact legacy public stanje -> permanent rejected_before_switch/operator_schema_cutover_required no-mutation rezultat, drift -> incident;
- posle uspešnog operator cutover-a ne retry-uj niti pravi generation+1 starog permanentno odbijenog job-a: fresh host-capability descriptor revalidation mora otvoriti novi deployment epoch/intent sa generation=1; tek taj worker pass sme da dokaže postcondition, upiše canonical baseline kao legacy_applied i nastavi;
- signed non-destructive expand_compatible migration runner, descriptor checksum/postcondition, grant reconciler, MigrationLedgerEvidenceV1 i partial-migration recovery;
- durable cms_addon_serving_fences pre bilo kog service/config/pointer write-a;
- operator-only target:bootstrap za deterministic addon-free core-bootstrap release/current junction;
- exact WindowsScmCmsServiceAdapterV1 sa NRVendorCms/NRClientCms WinSW servisima, pinned wrapper/XML/launcher/Node hashom, PID+start-time/current/port inspect, stop do STOPPED 60 s, pointer CAS, start/loaded-release 90 s; bez taskkill/PID fallbacka;
- liveness/build/addon-loaded, non-serving candidate reconciliation, internal candidate readiness i jedan atomic serving promotion+success receipt+fence resolution;
- rollback/no-mutation/maintenance/rollback-failed receipts, active-fence crash recovery i result callback enqueue tek posle terminalnog receipt-a;
- public runtime gate zahteva exact loaded/promoted tuple, terminal receipt i nula active fence redova.

Ne izvršavaj WinSW install/service-DACL/real DB-role provisioning nad user sistemom bez eksplicitnog administratorskog odobrenja. Implementiraj provisioning CLI/config/template i test adaptere; kada stigne do manualne granice, vrati tačne elevated komande i čekaj receipts.

Acceptance:
- target bootstrap exact retry/crash recovery i vendor/client isolation; checkout .next/node_modules kopija nije prihvaćena;
- service/path/port/request injection, wrapper drift, PID reuse, auto-restart, stop/start timeout i vendor->client stop padaju bez kill fallbacka/pointer write-a;
- fresh baseline daje expected schema/postcondition/runtime CRUD; legacy classifier nema write; raw GRANT/owner/schema/non-webshop SQL pada;
- legacy fixture čuva stari rejected_before_switch job kao terminalan, operator cutover je idempotentan, a zatim samo novi epoch/intent generation=1 uspeva i upisuje legacy_applied;
- worker crash pre/posle migration commit, begin fence, pointer switch, candidate reconcile, readiness i promotion daje tačno jedan terminalni ishod i nikad candidate-serving prozor;
- same-release redeploy je fenced; partial migration ne dobija lažni no-mutation;
- first callback loss vraća duplicate ACK uz immutable original initial_ack;
- kompletni worker/CMS integration, migration, service-adapter, rollback, restore, lint/typecheck/build testovi prolaze.

Na kraju jasno razdvoji: šta je potpuno testirano u fixture-u, šta zahteva operator da stvarno provisionuje i koje receipts Prompt 17 mora da proveri.
```

## Prompt 11 — vendor Webshop licencni proizvod, četiri SKU varijante i katalog

```text
Implementiraj vendor commerce model za prodaju Webshop licence prema docs/webshop_activation/06-vendor-webshop-i-proizvod.md, relevantnim delovima 04/07 i Fazi 5 u 11. Pretpostavka: canonical Webshop schema/package radi i vendor može biti aktiviran, ali ne implementiraj purchase intent/payment unapred.

Scope:
- digital product "NR CMS webshop license" u vendor Webshopu;
- tačno četiri selectable varijante mapirane na external SKU webshop-30/183/365/1000000;
- per-variant external product type/catalog mapping, duration/activationLimit/edition snapshot iz master kataloga;
- lifetime prikaz je poslovni lifetime, ne milion dana/2099 datum;
- catalog sync V2 HMAC client, durable environment-bound catalogVersion/ETag i drift/revalidation-required state;
- publish validation: domain required, sve četiri aktivne tačne SKU varijante, quantity=1/license semantics i nema product-level jednog SKU fallback-a;
- product/storefront/cart UI još ne sme omogućiti domain-bound Add to cart bez accepted purchase-intent sesije; opšti GET može prikazati informacije/cene;
- admin audit i secret-free error handling.

Ne implementiraj master-signed intent, checkout payment ili issue u ovoj fazi. Ne hardkoduj vendor product UUID/URL u client CMS.

Acceptance:
- product sa četiri varijante i exact external SKU mapama prolazi publish; missing/duplicate/wrong SKU, domain=false, duration drift ili stale catalog pada;
- neizmenjeni sync ima isti version/ETag; stvarna master mutacija daje revalidation-required bez tihog menjanja već snapshotovanih order podataka;
- direktan storefront GET bez intent sesije nema Add to cart capability;
- lifetime UI/metadata koristi durationDays=0/null validUntil semantiku;
- vendor migrations, lint/typecheck/tests/build i clean installed-package fixture prolaze.

Vrati stabilni public offerKey/vendorProductRef koje Prompt 12 treba da provisionuje; ne izlaži master DB productTypeId client konfiguraciji.
```

## Prompt 12 — master purchase intent, offer mapping, domain proof i security status

```text
Implementiraj master polovinu purchase-intent sistema prema docs/webshop_activation/07-purchase-intent-i-domain-binding.md, hard-disable/status delovima 08/10 i Fazi 6.1 u 11. Client/vendor UI i cart dolaze u Promptu 13.

Scope:
- vendor_purchase_offers mapping za (environment, offerKey, addonKey, vendorAudience) ka productType/vendor client/vendorProductRef/catalog snapshotu;
- exact POST /api/addons/purchase-intents challenge|complete sa installation Ed25519 PoP, canonical domain, derived vendorAudience, offerKey i domain verification evidence;
- development_allowlist_exemption samo exact .nr.test u development; production exact HTTPS well-known proof sa SSRF/DNS pinning/no redirect/private/mixed-IP zaštitom;
- strict compact JWS protected header/claims, short TTL, KID/keyset/anti-rollback i durable one-time JTI ledger;
- authenticated vendor :accept/:reserve/:consume/:status sa exact HMAC V2, immutable snapshot, order/item/hash binding i idempotency;
- closed intent state/lease/expiry contract i first V1 single order/item semantics;
- fresh status observations sa monotonic top-level version;
- reversible security hold odvojen od immutable top-level hardDisable marker-a;
- durable hard-disable propagation generation/reconciliation/locked-rescan/clear barrier, uključujući consumed redove bez payment authorization-a;
- payment authorization endpoint schema može biti implementirana tek u Promptu 14; ovde status mora imati zatvoren nullable placeholder contract bez lažnog authorization-a.

Ne dozvoli browser-supplied domain, productTypeId, vendor client ili audience kao autoritet. Ne implementiraj vendor acceptance/cart/payment.

Acceptance:
- PoP/domain/audience/offer/KID/expiry/tamper/replay testovi;
- production SSRF redirect/private/mixed DNS i .nr.test exemption padaju; development exemption je trajno označen;
- accept/reserve/consume exact retry je idempotentan, isti key/drugi body conflict;
- jedan JTI ne može vezati dva vendor/order/item/snapshot tuple-a;
- fresh observation ne može biti overwritten starijim response-om;
- reversible hold clear nastavlja samo originalno neisteklo stanje; hard disable marker se ne briše clear-om;
- crash usred hard-disable propagation blokira clear i sve affected route-e dok completed rescan ne prođe;
- master migration/typecheck/contract/integration/build prolaze.

Vrati exact public-key discovery URL, offer provisioning CLI i route scopes koje Prompt 13 mora koristiti.
```

## Prompt 13 — Client Buy dugme, public acceptance wrapper, cart/reserve/consume

```text
Implementiraj CMS/client i vendor Webshop polovinu purchase intenta prema docs/webshop_activation/07, 06, relevantnim delovima 08 i Fazi 6.2-6.4 u 11. Koristi master contract iz Prompta 12 i HostAddonRouteBindingsV1 iz Prompta 03.

Client/CMS scope:
- Webshop activation ekran kada nema licence prikazuje Buy webshop license;
- server-side purchase challenge/complete koristi postojeći installation identity i derived vendorAudience iz strict WEBSHOP_BUY_URL;
- top-level HTML form POST sa jedinim hidden purchaseIntent compact JWS poljem; token nikada u query/fragment/history/analytics/localStorage;
- retry expiry/network bez menjanja installation identity-ja.

Vendor/package scope:
- exact core wrapper app/licenses/purchase-intents/accept/route.ts delegira u package handleApiRoute; nije Server Action i nije package app/** discovery;
- proxy.ts/CSRF exception samo exact POST path/method/content-type; nema globalne customer-origin allowlist-e;
- bounded form parser bez body logovanja, strict JWS/keyset/audience/claim verifier, present non-null Origin mora odgovarati verified canonical originu, absent/literal null se oslanja na JWS+master ledger, forged mismatch pada;
- HMAC :accept, local token-hash/JTI ledger, opaque Secure HttpOnly SameSite cookie i 303 na clean product URL;
- direct GET bez sesije nema Add to cart; UI prikazuje non-editable bound domain confirmation;
- cart/checkout/order/item schema nosi exact immutable intent/environment/offer/domain/product/SKU/catalog snapshot;
- unique JTI binding, one quantity-1 license line, no mixed cart, :reserve i :consume sa PurchaseIntentOrderBindingV1 hashom;
- checkout posle consume-a staje u payment_authorization_pending; još ne kreira provider session.

Acceptance:
- real browser preko Caddyja: client.nr.test -> public cross-origin POST -> vendor clean URL, token nije ni u jednom log/URL/referrer/analytics mestu;
- arbitrary verified production origin i local origin prolaze; null/absent prolazi samo uz validan JWS, forged non-null mismatch pada pre :accept;
- Server Action origin greška ne postoji; registry-empty 404, fenced/not-ready 503;
- tamper/expiry/audience/domain/hidden SKU/replay/direct GET pada;
- concurrent add/replace/merge, dva JTI-ja, mixed item i consume response loss daju tačno jednu pravilno vezanu order liniju;
- payment redirect/session još ne postoji;
- CMS/Webshop/master integration, lint/typecheck/tests/build prolaze.

Na kraju vrati frozen order/item/snapshot tuple koji Prompt 14 koristi za payment authorization.
```

## Prompt 14 — payment authorization, provider reducer i master issuance

```text
Implementiraj payment i pre/post-commit license issuance osnovu prema docs/webshop_activation/08-payment-fulfillment-i-isporuka.md, payment/security delovima 07/10 i Fazi 7 u 11. Pretpostavka: consumed single-license order iz Prompta 13 je autoritativan.

Master payment scope:
- :authorize-payment sa stable paymentProvider i issuedAcceptUntil najviše 120 s;
- :commit-payment-authorization pre issued cutoff-a, unique provider ref i durable usedExpiresAt=min(providerSessionExpiresAt,checkoutExpiresAt);
- strict :status oba roka; posle commita capture/issue gate koristi usedExpiresAt, ne issued cutoff;
- hard disable invalidated_for_security i reversible hold gate bez menjanja lokalnog risk lifecycle-a;
- issue endpoint strict HMAC/idempotency/request hash, consumed intent/order/item/snapshot/environment/domain/SKU/catalog/provider/authorization binding;
- activationLimit isključivo iz immutable master SKU policy;
- exact issuanceFence sa četiri version polja;
- canonical 1..1000 captureEvidence, lossless safe-integer/BigInt suma/hash i globalni capture double-spend binding;
- response-loss replay vraća isti committed entitlement/key pre current preconditiona.

Vendor scope:
- original-body provider signature inbox i deterministic financial reducer za pending/authorized/partially_captured/paid/...;
- expected currency/amount i stvarni capture/transaction refs; nema null->order-total fallback-a;
- payment session operation creating/created/committed/failed i create-or-retrieve idempotency key;
- browser redirect tek posle master commit authorization=used;
- local risk, master hold i hard-disable mirror ostaju odvojene ose;
- fulfillment outbox generation/lease/backoff/DLQ i pre-send row-lock CAS;
- issue response durable enkriptovan zasebnim issued-license KEK/KID/AAD-om, bez API credential KEK-a;
- prvi committed result postavlja postIssueReconciliationStatus=review_pending, ne šalje još delivery.

Ne dovršavaj email/reveal; to je Prompt 15. Koristi provider adapter fixture ako realan payment dashboard još nije provisionovan i jasno označi da to nije live-provider E2E.

Acceptance:
- commit na 121 s pada; commit pre 120 s pa capture posle 120 ali pre usedExpiresAt može issue; posle usedExpiresAt ide manual review bez auto-issue-a;
- partial/duplicate/reordered/cumulative/delta/unsafe/overflow/1001 evidence i capture reuse fixture-i daju exact očekivanja;
- full capture + clear risk/hold/hard-disable izdaje tačno jednu licencu; response loss daje istu;
- refund/reversal pre send-a canceluje, dispute/reversible hold pauzira, hard disable nikad ne resume-uje;
- changed issuanceFence sa istim idempotency key-em je 409 bez druge licence;
- key plaintext nije u logu/outbox/auditu i legacy issued-key rewrap fixture radi;
- master/vendor migration, lint/typecheck/unit/integration/build prolaze.

Vrati provider fixture granice i tačan committed issue/postIssue tuple za Prompt 15.
```

## Prompt 15 — post-issue validation, compensation, secure reveal i notification

```text
Dovrši post-issue reconciliation, customer delivery i notification pouzdanost prema docs/webshop_activation/08, relevantnim odeljcima 04/10 i Fazama 7.2, 8 u 11. Ne menjaj payment činjenice iz Prompta 14.

Master scope:
- exact HMAC `POST /api/v1/entitlements/validate` sa strict telom `{contractVersion:1,licenseKey,domain}` i strict response-om `{contractVersion:1,entitlementId,licenseId,reason,status,valid,validUntil,updatesUntil}`, bez unknown polja; server-only API-client environment mora biti jednak vendor `NR_LICENSE_ENVIRONMENT`, master `NRLS_ENVIRONMENT` i licenci, ali se environment ne dodaje u V1 body;
- prihvati samo `valid=true`, `reason=null`, `status="active"`, `entitlementId=licenseId=<ISSUE_ENTITLEMENT_ID>` i neistekli nullable `validUntil`; vendor čuva entitlement/issue/domain/key-fingerprint/causal vezu i response JCS hash u lokalnom observation redu, dok raw ključ/request body ne ulaze u durable storage, response ili log;
- suspend/reactivate/revoke idempotency i causal lifecycle audit potreban compensation reduceru.

Vendor scope:
- dedicated post_issue_license_observations sa monotonic observation generation; fresh validate request/response se primenjuje samo na current issue/domain/fence tuple, niži/delayed odgovor ne može prepisati noviji;
- closed postIssueReconciliationStatus: review_pending, resolved_active, compensation_pending, resolved_revoked; null samo pre committed entitlementa;
- uvedi expand/backfill/contract migraciju: svaki legacy committed entitlement sa null statusom prvo postaje review_pending, zatim prolazi fresh validate/reconcile; pre finalnog NOT NULL/conditional CHECK gate-a mora postojati zero-null dokaz za sve committed redove;
- reversible local risk/master hold/dispute-open/partial-refund -> review_pending/no delivery/no automatic revoke; audited clear/won+reinstate/retain-active + fresh validate vraća isti entitlement bez drugog issue-a;
- hard disable/full refund/reversal/lost dispute/refund_required/revoke mora durable proći `review_pending|resolved_active -> compensation_pending -> resolved_revoked`; jedna idempotentna causal compensation operacija i njen potvrđeni master rezultat su jedini izlaz iz compensation_pending;
- order read model i authorization koji nikad ne vraćaju encrypted/plain key neovlašćenom korisniku;
- dedicated issued-license decryptor keyring/AAD/fingerprint i reveal audit;
- hash-only single-use short-TTL delivery token, neutral browser URL, POST redeem i proxy/app/APM/analytics log redaction;
- notification outbox lease/retry/DLQ sa stable providerMessageKey i provider retrieve/reconciliation;
- crash pre provider accept: autoritativni not_found/definitive_pre_accept_failure opoziva izgubljeni token generation i pravi novi; unknown ostaje reconciliation;
- email šalje samo delivery link, ne raw key;
- dedicated cron/worker identity i auth, bez opšteg CRON_SECRET fallbacka posle rollout-a.

Acceptance:
- delayed active observation N posle revoked N+1 ne otvara delivery;
- delivery/reveal/notification zahteva latest-started=latest-applied, nula novijeg pending observation reda i validation max-age gate iz specifikacije;
- local/master clear i dispute-won fixture vraća isti fresh-validated entitlement, terminalni signal tačno jednom revoke-uje;
- legacy committed-null backfill, zero-null CHECK validation i crash/retry pre/posle compensation master commita daju jedan idempotentan terminalni ishod bez direktnog skoka u resolved_revoked;
- kupac A ne vidi order/key kupca B; expired/used/tampered token pada;
- poznat canary token/key/fingerprint nije u Caddy/app/APM/analytics/error logu;
- provider response-loss/retrieve šalje najviše jedan message; pre-provider crash može imati dve hash generation vrednosti, ali samo jedan aktivni token;
- email outage ostavlja key dostupnim autorizovanom kupcu i vidljiv DLQ;
- envelope active+old/legacy rewrap, restart i isolated restore prolaze;
- vendor/master migration, lint/typecheck/integration/build prolaze.

Ako realan email provider nije dostupan, završi deterministic provider adapter fixture i eksplicitno ostavi external sandbox E2E za Prompt 18; ne tvrdi da je email integracija produkciono dokazana.
```

## Prompt 16 — lifecycle, deactivation, transfer i persistent revalidation

```text
Implementiraj lifecycle/revalidation komplet prema docs/webshop_activation/10 odeljcima 8 i 11, lifecycle delovima 08 i Fazi 9 u 11. Potpuno sačuvaj strict receipt/status contract; ne svodi ga na običan signed boolean.

Scope:
- master license/activation lifecycle statusi active/suspended/revoked/deactivated/transferred i monotonic lifecycleVersion;
- refund/dispute policy poziva idempotent suspend/reactivate/revoke bez menjanja payment istorije;
- deactivation challenge/complete sa master-assigned operationId, source installation PoP, local lifecycle_finalization_pending/restricted fence pre complete-a, atomic slot release i exact frozen result;
- transfer prepare -> target_complete -> source_challenge -> source_complete sa target domain/installation proofom, exact 43-character source approval code UTF-8 hashom, derivation KID-em i approvalBindingSignature;
- strict LifecycleOperationResultCoreV1 JCS hash i LifecycleReceiptClaimsV1 union: deactivation, transfer_source, transfer_target; exact protected header, action/role/identity/core binding;
- resultReplayUntil >= receipt.exp, frozen exact replay bytes i configured TTL/retention/cutoff/status bounds;
- missing/expired receipt recovery samo preko two-step original-installation-PoP /api/addons/licenses/lifecycle-status; challenge uvek nosi non-null CMS-durable final request hash, dok samo master persisted final_request_body_hash može pre CAS-a biti null;
- committed/not_committed/in_progress short-lived status JWS i concurrent complete/status-close jedan ishod; `resultBodyHash` je non-null exact stored result-core hash samo za committed, a za not_committed/in_progress mora biti JSON null;
- strict status-JWS action/outcome matrica: deactivate committed daje deactivated, current=pre+1, source=license domain i sva transfer/target polja null; deactivate not_committed/in_progress daje active, current=pre, source=license domain i null result/transfer/target; transfer_source_complete committed daje transferred, current=pre+1, license=target i sva propisana target polja non-null; njegova not_committed/in_progress grana ostaje active/current=pre/license=source, ima transfer/target installation/domain, ali null target activation/status i result hash;
- CMS persistent trusted keyset/snapshot, classified outage grace preko restarta, nikad preko licenseValidUntil; signed invalid/deactivated/transferred/revoked nema grace;
- package uninstall/disable ostaje durable operation, ne brisanje u HTTP handleru.

Acceptance:
- frozen deactivation core hash je sha256:02dd22e6f473a77a90640f74311ba1f4d2db4961624f00b68012dd2034a0097f;
- oba transfer receipt-a imaju različit JTI/role ali isti core hash sha256:c9d1208383c306a9817055011748eec82c356c7b5bc2575bbb5e23bcd4caba02;
- unknown/extra header/claim, alg/typ/KID/time/audience/tokenUse/core/hash/identity/cross-role tamper pada pre mutation-a;
- svaka nemoguća action/outcome/resultBodyHash/source-target/final-tuple/nullability kombinacija pada i pre master potpisa i pri CMS verifikaciji;
- response loss pre/posle master commita, receipt expiry, dropped-before-master cutoff i concurrent status-close daju tačno dokumentovane ishode;
- transfer code trim/newline/base64-decode hash greška pada; source/target domain/slot ostaju atomarni;
- network/5xx grace radi posle restarta, 4xx/signature/domain/lifecycle invalid ne koristi grace;
- secret/KID rotation, compromise cancel, backup/restore i full integration testovi prolaze.

Na kraju vrati lifecycle state/evidence tabelu i jasno navedi da Prompt 18 još mora dokazati browser+worker posledice deactivation/transfera.
```

## Prompt 17 — kontrolisani hosted release i lokalno provisioning izvršenje

```text
Ovo je execution checkpoint sa spoljnim i administratorskim side-effectima. Ne radi ništa mutirajuće dok prvo ne završiš read-only preflight, izlistaš exact targete/hashes/komande i dobiješ eksplicitno odobrenje za svaku grupu: GitHub publish, PostgreSQL provisioning/migracije, WinSW/SCM/ACL i master bootstrap/import.

Autoritativni su docs/webshop_activation/02, 03, 04, 09 i 10. Potvrdi da su Promptovi 01-16 zeleni i da nema unresolved P0/P1 blockera.

Posle odobrenja, redom:
1. iz Prompta 05 objavi tačno prethodno verifikovanu novu immutable @radomirradojevic/webshop verziju u GitHub Packages i create-only attestation asset; nikad latest/range/overwrite;
2. re-downloaduj hosted tarball bez local cache authority-ja i potvrdi sve frozen SHA/SRI/manifest/dependency/migration/attestation/KID vrednosti;
3. provisionuj/validiraj četiri PostgreSQL baze/least-privilege role i backup receipts, uključujući worker DB, core owner/migrator/runtime i addon deployer role; izvrši samo versionirane migracije;
4. provisionuj DPAPI/ACL service identities i secret-ref-ove bez štampanja tajni;
5. kroz target:bootstrap napravi vendor/client addon-free immutable core release/current junction;
6. hash-verifikuj i instaliraj NRVendorCms/NRClientCms WinSW servise, service SID/DACL/current/env/port mapu i worker SCM prava; bez taskkill/change-config prava;
7. potvrdi deploy.nr.test Caddy -> 127.0.0.1:3003 i trusted TLS za sve Node procese;
8. pokreni one-time master admin bootstrap, product/SKU, vendor API client/offer/keyset provisioning po implementiranim CLI-jima;
9. importuj i odvojeno publishuj exact hosted release u master katalog;
10. generiši manual lifetime vendor.nr.test license key kroz master UI/CLI i predaj ga samo operatoru kroz bezbedan kanal; nikad ga ne ponavljaj u završnom izveštaju.

Ne pokreći još puni business E2E i ne improvizuj ručni SQL/config edit ako neki CLI/gate padne. Zaustavi se na prvom fail-closed gate-u.

Acceptance receipts:
- hosted registry package-version ID, tarball SHA/SRI, manifest/artifact/dependency/migration/postcondition/attestation hash i release KID;
- DB names/resource IDs/migration ledgers/backups bez connection string/passworda;
- core bootstrap release/build IDs i current containment;
- WinSW/XML/launcher/Node hash, service name/SID/DACL/PID/start/current/port smoke;
- TLS/server-side fetch i worker health;
- master product/SKU/API client/offer/catalog/release IDs bez secret/key plaintexta;
- rollback/restore tačke za svaku grupu.

Vrati redigovan provisioning manifest. Ne označavaj sistem E2E spremnim ako bilo koji receipt nedostaje.
```

## Prompt 18 — kompletan lokalni E2E, rollout i compatibility cleanup

```text
Izvrši i, gde test otkrije stvarni bug, dovrši kompletan lokalni E2E striktno po docs/webshop_activation/09-lokalni-e2e-runbook.md, security/rollback dokumentu 10 i Fazama 10/Definition of Done u 11. Prompt 17 provisioning manifest mora biti kompletan. Ne proširuj authority: ako Clerk/payment/email sandbox credential ili operator akcija nedostaje, zaustavi taj spoljašnji korak i ne tvrdi full PASS.

Redosled glavnog toka:
1. clean vendor/client/master/worker start iz immutable/provisioned targeta, ne source dev procesa;
2. manual vendor lifetime key aktivira vendor CMS;
3. activation durable enqueue -> worker hosted package verify/build/migrate/SCM switch/reconcile -> vendor ready;
4. vendor product ima četiri exact SKU varijante i active offer/catalog snapshot;
5. client bez licence klikne Buy, master PoP/domain intent, cross-origin POST, bound product/cart/order;
6. izaberi webshop-365, reserve/consume/status/payment authorization, stvarni sandbox provider create/commit/capture;
7. full paid reducer -> master issue exactly once -> fresh post-issue validate -> resolved_active;
8. notification šalje secure delivery link, autorizovani kupac reveal-uje ključ;
9. client tim ključem aktivira Webshop i isti hosted package deployment završava client ready;
10. proveri webshop-30/183/lifetime policy matrice bez ponovnog punog browser toka gde nije potrebno.

Obavezni fault/negative matrix iz runbooka uključuje purchase tamper/origin/replay, HMAC, payment duplicates/partial/expiry/hard-disable, issue/notification response loss, schema/service/worker crash recovery, stale epoch/generation/installation callback, key rotation, refund/dispute/compensation, deactivation/transfer i revalidation outage/restart. Izvedi backup/isolated restore i rollback drill bez menjanja current production/test baze dumpom preko novijeg epoch-a.

Feature flag rollout radi expand -> dual read/write/backfill -> shadow compare -> enable -> zero-count -> contract. Compatibility/local-dev reader, old enum/secret/KID/schema putanja ili broad CRON_SECRET uklanja se tek kada query/fixture dokaže nula zavisnosti i restore retention uslov.

Svaki bug popravi u odgovarajućem source repou, dodaj regression test, ponovo izgradi novi immutable release gde artifact bytes menjaju package/CMS i ponovi pogođeni gate; ne patchuj aktivni node_modules/current release. Novi package bytes uvek znače novu SemVer verziju i novi master release evidence.

Završni izveštaj mora sadržati:
- PASS/FAIL/SKIPPED za svaku stavku završne liste iz 09, sa razlogom i dokazom;
- source commit/package/release/build/DB migration/worker job/operation IDs i hash-eve bez tajni;
- vendor/client installation ID-eve, canonical domene i finalni desired/runtime status;
- payment sandbox reference i entitlement ID bez raw license key-a;
- fault-injection, DLQ, rollback i restore rezultate;
- sve preostale manualne/spoljne blockere;
- potvrdu da vendor/client deployment nema .private i da runtime package dolazi iz hosted node_modules artefakta;
- tačne compatibility puteve koji su uklonjeni ili namerno ostavljeni.

Full PASS smeš proglasiti samo ako oba CMS-a završe ready kroz pravi worker, licenca nastane iz autoritativnog captured paymenta, delivery je bezbedan i svi no-go kriterijumi iz 11 su zatvoreni.
```

## PayPal nastavak posle Prompta 18

Prompt 18 je završen sa Stripe test providerom. PayPal nije novi Prompt 18 niti
razlog da se menja njegov istorijski evidence. Zaseban, autoritativni copy/paste
prompt za PayPal V2 hardening i realan Sandbox E2E nalazi se u
[21 — Prompt 19](21-prompt19-paypal-sandbox-e2e.md), a njegova acceptance matrica
u [20 — PayPal Sandbox E2E runbook-u](20-paypal-sandbox-e2e-runbook.md).

## Pravilo između promptova

Ako faza završi sa blockerom, ne šalji sledeći prompt samo da bi se „nastavilo”. Najpre reši blocker ili napravi eksplicitnu novu odluku u autoritativnoj dokumentaciji. Posebno, Prompte 17 i 18 ne koristiti dok svi raniji contract i fixture gate-ovi nisu zeleni.
