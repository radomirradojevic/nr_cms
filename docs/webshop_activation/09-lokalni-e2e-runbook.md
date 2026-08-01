# Kompletan lokalni E2E runbook

Status: TARGET operativni runbook. Koristi se tek kada su implementacioni gate-ovi iz [11 — Implementacioni roadmap](11-implementation-roadmap.md) završeni.

Ovaj dokument opisuje ponovljiv test celog toka na tri odvojene aplikacije, zasebnom deployment workeru i četiri odvojene PostgreSQL baze. Sam uspešan odgovor Master License Servera na aktivaciju nije dovoljan dokaz: test je uspešan tek kada su paket, build, migracije, runtime stanje, kupovina, fulfillment, isporuka i druga aktivacija potvrđeni.

## 1. Topologija testa

| Uloga | Source ili checkout/config root | Aktivni runtime | HTTPS origin | Interni port | Baza |
|---|---|---|---|---:|---|
| CMS razvojni source | `D:\nr_cms` | nije E2E target | — | — | razvojna baza |
| Vendor CMS target | `D:\nr_cms-vendor` | od prvog managed starta: verified addon-free `D:\nr_deploy\vendor\current`; zatim worker-managed release-i | `https://vendor.nr.test` | 3000 | `nr_cms_vendor_test` |
| Client CMS target | `D:\nr_cms-client` | od prvog managed starta: verified addon-free `D:\nr_deploy\client\current`; zatim worker-managed release-i | `https://client.nr.test` | 3002 | `nr_cms_client_test` |
| Master License Server | `D:\nr_license-server` | isti clean master deployment | `https://license.nr.test` | 3001 | `nr_license_server_test` |
| Addon deployment worker | zasebni private worker repo/proces | zaseban worker servis | `https://deploy.nr.test` | 3003 | `nr_addon_deployment_worker_test` |

Privatni source repozitorijumi ostaju samo u razvojnom stablu:

    D:\nr_cms\.private\webshop
    D:\nr_cms\.private\license-server
    D:\nr_cms\.private\license-server-addon

`license-server-addon` nije deo ovog prvog E2E prolaza. Vendor i client deployment moraju koristiti objavljeni `@radomirradojevic/webshop` paket iz GitHub Packages, a ne lokalni `.private\webshop` source.

`D:\nr_cms-vendor` i `D:\nr_cms-client` nisu mesta u koja se kopira addon. Oni su target-specific checkout/config koreni i početni activation shell. Worker pravi immutable release-e pod `D:\nr_deploy\<target>\releases`, instalira package u njihov `node_modules` i atomski prebacuje servisni `current` pointer; posle toga jedini aktivni runtime autoritet je odgovarajući `current`.

## 2. Pravila izvršavanja

1. Test se radi nad tačno zabeleženim commitovima i tačno zabeleženom verzijom paketa.
2. Vendor i client počinju od istog odobrenog CMS commita, ali nemaju zajedničku bazu, `.env`, storage, build cache ili release direktorijum.
3. Master počinje iz svog zabeleženog commita i prazne test baze.
4. Tajne se nikada ne kopiraju u test izveštaj, terminal transcript, screenshot ili Git.
5. Ne koristi se `npm link`, lokalni `file:` dependency, `addons:local` niti ručno kopiranje `.private\webshop` u deployment.
6. Ne koristi se ručni SQL da bi se preskočio neuspešan proizvodni tok. Read-only SQL je dozvoljen za dokaz i dijagnostiku.
7. Ne brišu se baze ili release direktorijumi automatski na kraju testa. Čuvaju se dok se ne završi analiza dokaza.
8. Svaki retry mora koristiti isti idempotency identitet kada ponavlja isti poslovni događaj.

## 3. Evidencioni zapis pre testa

Napraviti test zapis sa sledećim vrednostima, bez tajni:

| Polje | Vrednost |
|---|---|
| Datum/vreme početka u UTC | |
| Operator | |
| CMS commit SHA | |
| Webshop source commit SHA | |
| Master commit SHA | |
| Webshop package name/version | |
| Npm tarball integrity | |
| Release-manifest artifact SHA-256 | |
| Release dependency-lock SHA-256 | |
| Release signing KID | |
| Hash trusted public-key seta | |
| Vendor DB backup/snapshot ID | |
| Client DB backup/snapshot ID | |
| Master DB backup/snapshot ID | |
| Worker DB backup/snapshot ID | |
| Payment provider/test account | redigovana oznaka, bez credentiala |
| Email provider/test mailbox | bez API ključa |

Primer read-only komandi za source commitove:

```powershell
git -C D:\nr_cms rev-parse HEAD
git -C D:\nr_cms\.private\webshop rev-parse HEAD
git -C D:\nr_cms\.private\license-server rev-parse HEAD
git -C D:\nr_cms status --short
git -C D:\nr_cms\.private\webshop status --short
git -C D:\nr_cms\.private\license-server status --short
```

Ako je bilo koji source dirty, zapis mora navesti tačne diff hash-eve ili se test odlaže dok se stanje ne učini reproduktivnim. Test deploymenti mogu imati samo očekivane lokalne env/runtime fajlove; source diff u njima je neuspešan preflight.

## 4. Gate 0 — implementacija mora biti spremna

Pre podizanja aplikacija potvrditi sve sledeće:

- CMS bira eksplicitni deployment profil i registry source mode; clean vendor/client start ne pokušava `.private` setup.
- Master bootstrap admin CLI radi jednom i implicitni random admin više se ne kreira pri login requestu.
- Master V2 API client create/rotate održava `api_client_secret_versions` i postoji scope provisioning.
- Vendor catalog sync koristi HMAC V2, šalje key ID i prolazi protiv stvarne master rute.
- Master product type izlaže i primenjuje `requiresDomain=true`.
- Jedan vendor proizvod može mapirati četiri varijante na četiri različita master SKU-a.
- Master-signed purchase intent koristi exact contract iz dokumenta 07, POST body transport, environment-bound catalog snapshot, durable `issued -> accepted -> reserved -> consumed` state machine i `expired|canceled` terminalne grane.
- Provider payment session ne može nastati samo na osnovu lokalnog cache-a ili potvrđenog consume-a: neposredno pre session-a moraju proći authenticated `:status` i `:authorize-payment`, a browser se redirectuje tek posle durable provider-session recovery i uspešnog `:commit-payment-authorization` za isti JTI/order/item/snapshot.
- Prvi V1 commerce contract dozvoljava tačno jedan domain-bound Webshop license order item po checkoutu/orderu. Druga license stavka ili drugi purchase-intent JTI zahteva drugi checkout/order; tako je jedna provider session/autorizacija nedvosmisleno vezana za jedan JTI i order item.
- Payment reducer čeka pun captured iznos i čuva stvarne provider transaction/event reference.
- Finansijski `paid` je odvojen od vendor-local `security_review|paid_security_review` risk stanja i zasebnog master-hold mirrora; fulfillment se ne enqueue-uje bez used payment authorization-a, odgovarajućeg provider checkout reference-a, clear lokalnog risk-a i `masterSecurityHoldActive=false`.
- License issue outbox, notification outbox, retry i DLQ rade bez silent failure-a.
- Secure delivery stranica može server-side da pročita/dekriptuje izdat ključ posle autorizacije, koristeći namenski issued-license KEK/KID, ne master API-credential KEK.
- Aktivacija prvo durable čuva entitlement/install intent, zatim enqueue-uje idempotentan deployment job.
- Installation fingerprint je tačno `sha256:` + lowercase SHA-256 canonical Ed25519 SPKI DER bytes dobijenih kroz `createPublicKey(pem).export({format:'der',type:'spki'})`; parser zahteva `asymmetricKeyType=ed25519`. PEM newline/header format nije deo identiteta.
- Deployment worker instalira exact paket iz GitHub Packages, proverava release, izvršava migracije, build, health i reconciliation.
- Worker koristi phase-specific env/network granice: registry token i outbound mreža samo tokom fetch-a; verify/build samo non-secret allowlist uz blocked network; migration samo target DB operation credential/context; puni CMS runtime env dobija samo service manager.
- Revalidation koristi trajno pouzdan keyset i deklarisana outage grace politika radi i posle restarta.
- Deactivation i activation-status-aware revalidation postoje pre testa slot reuse-a.

Ako bilo koja stavka nije završena, dozvoljen je samo parcijalni razvojni test, koji se mora označiti kao takav. Ne sme se označiti kao kompletan E2E.

## 5. Gate 1 — infrastruktura i TLS

### 5.1 DNS/hosts i Caddy

Sa host računara proveriti:

```powershell
Resolve-DnsName vendor.nr.test
Resolve-DnsName license.nr.test
Resolve-DnsName client.nr.test
curl.exe -I https://vendor.nr.test
curl.exe -I https://license.nr.test
curl.exe -I https://client.nr.test
curl.exe -I https://deploy.nr.test/health
```

Očekivanje:

- sva četiri imena razrešavaju na loopback adresu;
- Caddy sertifikat je pouzdan bez `-k`/`--insecure`;
- Node procesi su pokrenuti sa `NODE_USE_SYSTEM_CA=1` ili proverljivim `NODE_EXTRA_CA_CERTS` i server-side `fetch` ka `license.nr.test`/`deploy.nr.test` prolazi;
- nema certificate name ili trust greške;
- svaki origin završava na svojoj aplikaciji/procesu;
- Next dev HMR ne prijavljuje blocked cross-origin zahtev za `vendor.nr.test` ili `client.nr.test`;
- master Next config prihvata `license.nr.test`.

Test sa `--insecure` nije dokaz ispravnog TLS setupa.

### 5.2 Procesna izolacija

Pre starta proveriti da portove ne koristi pogrešan proces:

```powershell
Get-NetTCPConnection -LocalPort 3000,3001,3002,3003 -State Listen |
  Select-Object LocalAddress,LocalPort,OwningProcess
```

Posle starta zabeležiti PID i komandnu liniju sva četiri procesa. Vendor i client ne smeju deliti `.next`, `node_modules`, privremeni direktorijum ili radni direktorijum. Worker sluša samo na loopback-u iza Caddyja i koristi statičke target rute.

Postoje dva eksplicitno odvojena moda. `npm run dev -- --port 3000|3002` služi samo pre-worker UI/HMR smoke-u i nikada nije dokaz activation deploymenta. Managed E2E zahteva provisionovane `NRVendorCms` i `NRClientCms` WinSW/SCM servise iz dokumenta 02, sa virtual service SID-evima i working/current putanjama `D:\nr_deploy\vendor|client\current`. Pre prvog service starta operator-only `target:bootstrap` CLI mora iz pinovanog CMS SHA-a napraviti immutable addon-free `core-bootstrap-<BOOTSTRAP_ID>` release i prvi current junction; zabranjeno je kopiranje checkout `.next` ili `node_modules` outputa.

Za managed gate sačuvati redigovani provisioning/bootstrap receipt i proveriti: WinSW/XML/launcher/Node hash, service name/SID/DACL, target-only current/env/port mapping, bootstrap base-lock/build-env/empty-registry/build ID, kao i da su oba servisa startovana kroz SCM. Bootstrap crash/retry fixture prekida vendor run posle staging builda, final rename-a i pre/posle first-junction CAS-a; exact retry vraća isti receipt, a promenjen input/current drift pada. Vendor bootstrap/service identity ne može čitati ili pisati client release/env/service i obrnuto.

### 5.3 Baze

Potvrditi da svaki `DATABASE_URL` pokazuje na odgovarajuću bazu. Password i puni connection string se ne prikazuju u logu. Bezbedan dokaz može prikazati samo:

```sql
select current_database(), current_user, inet_server_addr(), inet_server_port();
```

Očekivane baze:

    vendor CMS -> nr_cms_vendor_test
    client CMS -> nr_cms_client_test
    master     -> nr_license_server_test
    worker     -> nr_addon_deployment_worker_test

Worker koristi samo `NR_ADDON_DEPLOYMENT_WORKER_DATABASE_URL` iz svog secret/runtime store-a. Baza je PostgreSQL i sadrži job, target-epoch, request-replay i result-outbox ledger; SQLite/in-memory fallback nije deo prvog contracta. Operator ručno kreira bazu/least-privilege user-a, ali connection string ne kopira u dokument ili test izveštaj. Pre worker starta njegov repo mora izvršiti svoje autoritativne `npm run db:migrate:check`, `npm run db:migrate` i završni `npm run db:migrate:check` tako da nema pending migracija.

Pre prvog joba napraviti redigovano označen PostgreSQL backup `nr_addon_deployment_worker_test` i zabeležiti njegov ID. Backup mora obuhvatiti job, target-state/highest-epoch, request replay i result-outbox tabele; secret store/HMAC vrednosti se backupuju odvojenom tajnom procedurom, ne u SQL dumpu. Isolated restore drill koristi novu privremenu worker bazu i isti schema version, zatim read-only proverava cardinality/hash/epoch bez dispatchovanja callback-a. Restore produkcionog/current worker store-a preko novijeg epoch-a je zabranjen: prvo se za svaki target poredi CMS current epoch i worker highest accepted epoch, a neusklađenost ide u incident/manual reconciliation.

## 6. Gate 2 — clean package i release dokaz

Release prvo mora proći pipeline iz [03 — GitHub Packages i Webshop release](03-github-packages-i-release.md).

Production `release-dependency-lock.json` mora biti proizveden na pinovanom Windows x64 CI runneru, sa pinovanim Node/npm verzijama i `core.autocrlf=false`; običan Linux `npm ci` nije autoritet za deklarisanu `win32/x64` optional/platform rezoluciju. U clean, privremenom release workspace-u deployment worker treba redom da dokaže:

1. scope `@radomirradojevic` ide na `https://npm.pkg.github.com`;
2. exported CMS exact `package.json`/`package-lock.json` bytes odgovaraju odobrenom CMS commitu i izračunatim `cmsBasePackageJsonSha256`/`cmsBasePackageLockSha256`;
3. exact registry metadata/tarball je preuzet bez install/lifecycle izvršenja, pa su SHA/SRI, safe-extract putanje, manifest, attestation i signed dependency graph verifikovani pre `npm install`/`npm ci`;
4. posle verifikacije instalirana je exact verzija bez semver range-a i package se nalazi na `node_modules\@radomirradojevic\webshop`;
5. lock merge nije promenio nijedan postojeći CMS core-root node/edge/integrity, a addon-reachable graph je exact signed graph;
6. nema `.private` sourcea;
7. package name/version odgovaraju jobu i master release zapisu;
8. embedded manifest hash, manifest V2 potpis i release signing KID odgovaraju production keysetu;
9. svaki file hash i zbirni artifact SHA odgovaraju manifestu;
10. `release-dependency-lock.json` hash odgovara signed `dependencyLockSha256`;
11. provenance i SBOM hash, publication-attestation hash, registry package-version ID i attested `publishedAt` potpuno odgovaraju master release zapisu;
12. source `releasedAt`/`sourceReleasedAt` nije zamenjen za `publishedAt`; update policy koristi samo attested `publishedAt`;
13. CMS/Node/Next/runtime, minimum core schema, target schema, supported addon-schema min/max i migration contract su prihvatljivi;
14. `local-dev:*`, `local-build-fixture` i `local-acceptance:*` signing KID nisu prihvaćeni.

Obavezan selector fixture koristi backdated source commit čiji je package registry `publishedAt` posle non-null `updatesUntil`; release mora biti odbijen bez obzira na stariji `sourceReleasedAt`.

Na Webshop source repozitorijumu, pre objave, očekivane provere su:

```powershell
Set-Location D:\nr_cms\.private\webshop
npm ci
npm run release:check:local
npm run install:verify:next
```

Na CMS sourceu koristiti postojeće package boundary/registry provere, ali ne `addons:local` kao dokaz hosted-registry deploymenta:

```powershell
Set-Location D:\nr_cms
npm run addons:registry
npm run deploy:verify
npm run acceptance:local:private-packages
npm run acceptance:private-packages
```

Ako acceptance komanda zahteva posebne env vrednosti ili external fixture, zapisati ih kao redigovane reference, ne kao plaintext vrednosti.

## 7. Gate 3 — migracije i build pre starta

Za sve četiri baze najpre izvršiti migracioni preflight komandom definisanom u odgovarajućem repozitorijumu, zatim primeniti migracije. Ne pokretati improvizovan SQL bundle.

Pre starta potvrditi exact environment chain: vendor/client `NR_LICENSE_ENVIRONMENT=development`, master/API client/catalog/offer `NRLS_ENVIRONMENT=development`, worker `NR_ADDON_DEPLOYMENT_WORKER_ENVIRONMENT=development` i oba `targets.json.licenseEnvironment=development`. Activation/revalidation, purchase/catalog/issue/validate/lifecycle i deployment job/result fixture-i moraju nositi/persistirati baš tu vrednost. Svaki pojedinačni mismatch test pada pre business/schema/service mutacije; environment se ne izvodi iz `NODE_ENV`, profila, URL-a ili naziva baze.

Pre bilo kog CMS build/start/bootstrap koraka operator jednom provisionuje zasebne per-target `core_owner`/`core_migrator`/`runtime` role i `CmsCorePrivilegeManifestV1` iz dokumenta 02, koristeći ACL-zaštićene password fajlove i admin-authorized `db:core:provision`. Zatim elevated, operator-only core migratorom izvršava:

```powershell
npm run db:core:migrate -- --target vendor
npm run db:core:migrate -- --target client
```

Oba poziva moraju dati dry-run/checksum/apply/final-check receipt bez pending migracija. Target runtime `.env` sadrži samo `nr_cms_vendor_runtime|nr_cms_client_runtime` credential; core-migrator DPAPI ref je u operator secret root-u i nije čitljiv CMS/worker service SID-u. Prazna DB, postojeći upgrade i isolated restore fixture dokazuju owner/ledger/default-ACL/explicit-grant identitet. Kroz stvarni CMS service SID runtime mora moći normalan manifest-allowlisted core CRUD, ali `CREATE/ALTER/DROP`, `GRANT`, `SET ROLE`, `pg_authid`, `nr_control` i drugi target padaju. CMS startup sa pending/drifted core ledgerom pada pre listen-a; runtime `DATABASE_URL` nikada sam ne primenjuje migracije.

CMS provere iz odgovarajućeg deploymenta:

```powershell
npm run db:migrate:check # read-only ledger check pod runtime rolom
npm run typecheck
npm run lint
npm run test
npm run build
```

Master provere iz `D:\nr_license-server` moraju koristiti njegove stvarne scriptove iz `package.json`; minimalno su obavezni typecheck, testovi, env/migration check i production build. Ako skripta ne postoji, implementacioni roadmap prvo mora da je uvede — operator ne treba da izmišlja zamensku komandu u release proceduri.

Worker provere iz zasebnog repo-a uključuju najmanje:

```powershell
npm run typecheck
npm run lint
npm run test
npm run test:integration
npm run db:migrate:check
npm run db:migrate
npm run db:migrate:check
npm run test:phase-env-boundaries
npm run test:postgres-restore
npm run build
```

Worker ne sme da startuje sa in-memory/SQLite fallbackom niti da automatski kreira šemu pri prvom HTTP zahtevu.

Build oba CMS deploymenta mora pokazati da generated addon registry sadrži samo verifikovani Webshop release koji je namenjen tom release-u. Pre prve aktivacije dozvoljen je base CMS build bez Webshop entry-ja; posle activation joba novi immutable release mora sadržati Webshop entry.

Schema split ima dva odvojena testa. Fresh vendor/client baze posle core migracija nemaju nijednu od 45 business tabela iz dokumenta 03 u `public`; prva addon aktivacija kroz signed baseline pravi tačno canonical `webshop` skup (45 poslovnih tabela + `webshops` anchor + `webshop_settings`) i nijedan duplikat u `public`. Poseban legacy fixture nastaje iz backupovane pre-split baze: worker ga klasifikuje samo kao `operator_schema_cutover_required`, operator gasi target servis i pokreće exact admin-authorized `db:webshop-schema-cutover`, a zatim proverava table/row-count/aggregate, cross-schema FK/index, owner/default+explicit ACL, settings/order-counter backfill i `postconditionSchemaFingerprintSha256`. Tek naredni worker pass seeduje novi baseline `legacy_applied`. Crash/retry i isolated restore moraju biti idempotentni; stari package 13-table `0001`, blind ledger seed i automatski move-back u `public` moraju pasti.

## 8. Faza A — bootstrap Master License Servera

### 8.1 Start i one-time admin

1. Migrirati praznu `nr_license_server_test` bazu komandom `npm run db:migrate:dry-run`, zatim `npm run db:migrate`, pa završnim `npm run db:migrate:dry-run`; završni rezultat mora imati `pending: []` i `checksumsVerified: true`.
2. Pokrenuti ciljni one-time TypeScript bootstrap CLI `npm run admin:bootstrap -- --password-file <ACL_PROTECTED_INPUT_PATH>` koji izvršava `scripts/bootstrap-admin.ts` kroz pinovani `tsx`/project runner; `.mjs` alias nije paralelni autoritativni entrypoint.
3. CLI mora odbiti ponovno izvršenje kada administrator već postoji.
4. Bootstrap credential upisati u privremeni ACL-zaštićen fajl i promeniti password pri prvom loginu.
5. Obrisati privremeni bootstrap fajl po potvrdi novog credentiala.
6. Pokrenuti master na 3001 i proveriti `https://license.nr.test`.

Nikada ne koristiti današnji implicitni random bootstrap kao operativni postupak: password se ne vraća operatoru i prazna baza ostaje nepristupačna.

### 8.2 Signing i release katalog

Provisionovati:

- entitlement signing privatni ključ i KID;
- hash-pinovani versioned entitlement public keyset sa active/verification-only/revoked metadata;
- odvojeni purchase-intent signing key/KID i hash-pinovani versioned keyset;
- secret-at-rest encryption key/KID i prazan old-key keyring;
- nonce-cleanup cron secret;
- read-only trusted Webshop release public keyset na canonical putanji i pinovani SHA-256 u master/worker konfiguraciji;
- production-odobren Webshop release zapis importovan iz verifikovanog embedded manifesta, provenance-a i detached publication attestation-a.

CI/release workflow proizvodi i omogućava download immutable tarball/manifest/provenance/SBOM/publication-attestation evidence-a, ali nema credential niti HTTP mutation endpoint ka masteru. Operator preuzima exact artefakte u ACL-zaštićen staging direktorijum, proverava očekivane hash vrednosti iz release zapisa i iz `D:\nr_license-server` pokreće:

```powershell
npm run release:import -- `
  --tarball <ABSOLUTE_TARBALL_PATH> `
  --attestation <ABSOLUTE_PUBLICATION_ATTESTATION_PATH> `
  --expected-tarball-sha256 <64_LOWERCASE_HEX> `
  --expected-attestation-sha256 <64_LOWERCASE_HEX> `
  --change-ref <AUDIT_TICKET_OR_LOCAL_E2E_RUN_ID>
```

CLI pod addon-scoped PostgreSQL advisory lock-om strict verifikuje pinned chained release keyset, exact tarball/manifest/dependency-lock/provenance/SBOM/attestation/published identity i upisuje samo `status=draft`. Exact retry je idempotentan; isti release ID ili package version sa drugim evidence bytes/hashom je hard conflict. Zatim drugi, auditovani operator korak objavljuje samo već verifikovani draft:

```powershell
npm run release:publish -- `
  --release-id <UUID> `
  --expected-attestation-sha256 <64_LOWERCASE_HEX> `
  --change-ref <SAME_AUDIT_REFERENCE>
```

`release:publish` pod istim lockom radi samo `draft -> published`, beleži actor/reason/evidence hash i nikada ne menja immutable polja. CI ne poziva ove komande na master hostu niti poseduje master HMAC/admin secret.

Release zapis mora najmanje sadržati:

    addonKey
    releaseId
    packageName
    packageVersion
    manifestVersion=2
    npmTarballSha256/npmTarballIntegrity
    embeddedManifestSha256
    dependencyLockSha256
    provenanceSha256
    sbomSha256
    publicationAttestationHash
    artifactSha256
    registryPackageVersionId
    releaseSigningKid
    runtimeContractVersion
    CMS/Node/Next compatibility ranges
    minimumCoreSchemaVersion/schemaVersion
    supportedAddonSchemaVersionMin/supportedAddonSchemaVersionMax
    migrationBundleHash
    supportedLicenseEditions/channel
    sourceReleasedAt
    publishedAt
    status (draft/published/withdrawn)

Sva polja moraju odgovarati exact immutable contractu iz dokumenta 03 i decoded embedded-manifest/publication-attestation bytes-ima. Aktivacioni odgovor i potpisani entitlement moraju referencirati ovaj immutable release, a ne samo hardkodovani `PACKAGE_CONFIG`. `updatesUntil` se poredi isključivo sa attested `publishedAt`; source/commit `sourceReleasedAt` nije update-eligibility datum.

Stable-channel fixture odbija SemVer sa prerelease ili build metadata i zahteva unique `(addonKey,normalizedSemVer)`. Kada postoji više eligible release-a, selector prvo filtrira sve policy/compatibility/migration uslove, pa bira po exact redosledu: najviši SemVer precedence, `publishedAt` descending, `releaseId` lexical ascending. Concurrent import/publish/activation mora na svim instancama dati isti release. Revalidation ne radi implicitni downgrade; niži release se može izabrati samo kao explicit auditovani rollback `releaseId` uz schema/rollback-policy proveru.

### 8.3 Product type i SKU katalog

Kreirati jedan product type:

| Polje | Vrednost |
|---|---|
| Title | `Webshop license key` |
| Addon key | `webshop` |
| Requires domain | `true` |

Kreirati SKU redove:

| SKU | Duration days | Activation limit | Značenje |
|---|---:|---:|---|
| `webshop-30` | 30 | 1 | 30 dana |
| `webshop-183` | 183 | 1 | pola godine |
| `webshop-365` | 365 | 1 | godina |
| `webshop-1000000` | 0 | 1 | lifetime |

`webshop-1000000` je samo poslovni naziv SKU-a. Vrednost `durationDays=0` je autoritativno lifetime značenje; ne izdaje se licenca na milion dana.

Dva uzastopna authenticated `GET /api/v1/catalog` zahteva bez catalog mutacije moraju vratiti isti `catalogVersion=nrls-catalog-v1:<ENVIRONMENT>:<DECIMAL_REVISION>:sha256:<64_LOWERCASE_HEX>` i isti ETag. Za ovaj run vrednost počinje sa `nrls-catalog-v1:development:` i response `environment=development`. `generatedAt` sme da se razlikuje. No-op save ne menja verziju; kontrolisana stvarna SKU mutacija u posebnom fixture testu je povećava, posle čega se vrednost vrati kroz novu autoritativnu mutaciju — nikada direktnim SQL prepisivanjem revisiona. Poseban test troši intent na staroj reviziji, zatim menja duration/activationLimit i potvrđuje da issuance i dalje koristi stari immutable `(environment,catalogVersion)` snapshot. Cross-environment reference mora pasti pre business mutation-a.

### 8.4 API klijenti i scopes

Kreirati najmanje dva različita klijenta:

1. vendor-commerce klijent za Webshop catalog/purchase-intent/issue/lifecycle pozive;
2. interni/manual issuer klijent za kontrolisano izdavanje vendor test licence, ako CLI direktno ne koristi administratorski servisni identitet.

Manual issuance konfiguracija mora eksplicitno referencirati taj internal issuer ID/FK. Ne prihvatati današnje ponašanje koje bira najnoviji aktivni API client po vremenu kreiranja.

Vendor-commerce klijent:

- environment: `development`;
- nije globalan;
- nema domain allowlist koja bi ga ograničila na `vendor.nr.test`, jer prodaje licence za različite kupčeve domene;
- scope-ovan je samo na Webshop product type/SKU i potrebne akcije;
- koristi aktivni secret-version KID;
- client ID, KID i secret se prikazuju samo jednom i unose u vendor Webshop settings;
- secret se u vendor bazi čuva versioniranim envelope-om pomoću `WEBSHOP_LICENSE_SERVER_SECRET_KEY`, a `auth_secret_kid` odgovara aktivnom `WEBSHOP_LICENSE_SERVER_SECRET_KID`.

Početne akcije, uključujući Phase 6 purchase-intent scope ekstenziju:

    catalog, issue, validate, suspend, reinstate, revoke, refund, chargeback,
    purchase_intent.accept, purchase_intent.reserve,
    purchase_intent.release, purchase_intent.consume,
    purchase_intent.status, purchase_intent.payment_authorize,
    purchase_intent.payment_commit

Pre provisioninga potvrditi da su Drizzle schema/check constraint, TypeScript action union/parser, enforcement i admin scope UI zaista prošireni za svih sedam `purchase_intent.*` action-a. Današnji allowlist ih ne prihvata; samo ručni insert bez migracije nije validan setup. Negative test mora pojedinačno dokazati da klijent bez svakog od sedam scope-ova ne može izvršiti odgovarajuću rutu.

`renew` se dodaje tek kada je definisan poslovni renewal tok.

### 8.5 Purchase offer mapping

Posle kreiranja product type-a, SKU-a i vendor-commerce API client-a, kroz admin/CLI kreirati i aktivirati:

    offerKey=nr-cms-webshop-license
    addonKey=webshop
    environment=development
    vendorAudience=https://vendor.nr.test
    vendorApiClientId=<VENDOR_COMMERCE_CLIENT_UUID>
    productTypeId=<WEBSHOP_PRODUCT_TYPE_UUID>
    vendorProductRef=nr-cms-webshop-license
    catalogVersion=<CURRENT_VERSION>
    status=active

Activation validacija mappinga mora dokazati active client/environment, svih sedam `purchase_intent.*` i `issue` ovlašćenje, `requiresDomain=true`, composite `(environment,catalogVersion)` FK i tačna četiri SKU-a. Zabeležiti audit ID. Client CMS dobija samo javni `WEBSHOP_BUY_OFFER_KEY`; master UUID se ne kopira u client env ili browser.

### 8.6 Ručna vendor lifetime licenca

Kroz ciljni admin UI/CLI izdati:

    SKU: webshop-1000000
    canonical domain: vendor.nr.test
    activation limit: 1

Sačuvati ključ u password manager/test secret store, ne u dokumentaciju. Read-only proverom potvrditi status, SKU, domen i da još nema aktivacije.

## 9. Faza B — base vendor i client CMS

1. Pripremiti dva čista deploymenta istog CMS commita.
2. Potvrditi da ni jedan ne sadrži `.private`.
3. Postaviti profil i env prema [02 — Instance, env i lokalna infrastruktura](02-instance-env-i-lokalna-infrastruktura.md).
4. Migrirati obe prazne baze.
5. Napraviti base build bez aktivnog Webshop registry entry-ja.
6. Pre managed activation testa kroz operator-only worker `target:bootstrap` napraviti dva verified addon-free core release-a/current junctiona, zatim instalirati/startovati literal WinSW servise `NRVendorCms` i `NRClientCms`; proveriti da portovi 3000/3002 i HTTPS origin-i pripadaju baš njihovim PID/start-time fingerprintima i `D:\nr_deploy\<target>\current`. Checkout `npm run dev` je dozvoljen samo u ranijem UI/HMR smoke-u i mora biti ugašen pre ovog koraka.
7. U oba CMS-a postaviti `publicSiteUrl` na odgovarajući HTTPS origin.
8. Potvrditi da oba canonical license domena daju različite vrednosti:

    vendor.nr.test
    client.nr.test

Dozvoljeni origin/host:port, Unicode/punycode varijanta i trailing dot moraju dati rezultat definisan zajedničkim canonical-domain test vektorima. Userinfo, non-root putanja, query, fragment, IP literal i `localhost` moraju biti odbijeni; port se validira, ali se ne čuva.

## 10. Faza C — aktivacija vendor Webshopa

1. U vendor CMS-u otvoriti `Content -> New content -> Webshop` odnosno trenutnu activation stranicu.
2. Uneti prethodno izdati lifetime ključ.
3. CMS šalje V2 challenge request sa exact host capability descriptorom: CMS/commit/Node/Next/runtime/core schema/installed addon schema.
4. Master parsira javni ključ, zahteva Ed25519, iz canonical SPKI DER bytes-a računa exact `sha256:<64_lowercase_hex>` fingerprint, poredi ga sa claimom i čuva `installation_fingerprint_scheme=ed25519_spki_der_sha256_v1`; zatim vraća one-time challenge vezan za domen, installation ID, javni ključ/fingerprint i descriptor hash.
5. CMS potpisuje challenge svojim installation Ed25519 ključem.
6. Master proverava potpis i fingerprint/public-key vezu, troši challenge i zauzima jedan activation slot.
7. Master iz published kataloga bira release kompatibilan sa celim descriptorom, licencnom edition i attested `publishedAt` update policy-jem i vraća potpisani entitlement sa celim immutable release evidence tuple-om.
8. CMS verifikuje JWS/chained keyset i potpunu jednakost release evidence-a, zatim u jednoj transakciji čuva entitlement snapshot hash/lifecycle/expiry, desired installation state, povećan `installationDeploymentEpoch` i durable deployment operation. Epoch se u JSON-u prenosi kao canonical decimal string, nikada JavaScript number.
9. Outbox/dispatcher šalje workeru idempotentan install job sa `deploymentIntentKey=addon-deploy-intent:v3:<installationId>:<epoch>:<releaseId>`, `generation=1` i `operationKey=addon-deploy:v3:<installationId>:<epoch>:<releaseId>:<generation>`.
10. Worker vraća `202` i job ID; HTTP request ne čeka npm/build/migracije.
11. Worker durable target-state po `(targetProfile,addonKey,installationId)` row lock-om primenjuje exact `(epoch,generation)` CAS: viši epoch prima samo generation 1 i resetuje highest generation, isti epoch/same generation je samo exact replay, a +1 zahteva tačan dozvoljeni terminal retryable predecessor; lower/gap/binding mismatch pada. Supersede-uje starije queued run-ove samo istog installation identiteta; zasebni target mutex serializuje mutation između identiteta, pa novi installation epoch 1 nije stale zbog starog epoch 50.
12. Worker pravi immutable release iz statički pinovanog CMS commita i meri isti host descriptor. Čuva exact base manifest+lock bytes/hash-eve i koristi nov job-local npm cacache sa pinovanim Node/npm/pacote/cacache alatima. Credentialed child A fetchuje root, gasi se i secret-free verifier potvrđuje tarball/manifest/potpisani graph/provenance/SBOM/attestation; tek tada credentialed child B po exact planu puni packument+tarball cache za signed addon i trusted base graph. Posle gašenja childa/token canary-ja secret-free offline auditor potvrđuje svaki cache entry. Sa outboundom blokiranim radi offline manifest/lock merge i `npm ci`, pa strict dokazuje da je jedina base manifest promena exact addon dependency, nijedan CMS core lock zapis nije promenjen i addon graph/cache delta je exact očekivan.
13. Posle build gate-a worker preko local capability-authenticated brokera pokreće long-lived DB-phase controller pod exact `NRAddonDbCredentialBroker` SID-em. `os_secret_ref_local` razrešava per-target DPAPI `LocalMachine` sealed entry čiji inheritance-disabled ACL odbija orchestrator/build/registry SID; password nije u CurrentUser vault-u, parentu, env-u, configu, worker DB-u ili logu. Controller drži phase lease najviše 1800 sekundi i jednu dedicated DB session/advisory konekciju; parent sa njim komunicira samo kroz pipe čiji ACL dozvoljava orchestrator+DB-broker i HMAC/sequence zaštićene closed-schema komande. Pod installation fence-om ponovo proverava current tuple/evidence, radi migracije i ostaje živ kroz switch/reconciliation/final readiness/recovery.
14. Posle migracija, pod još aktivnim target mutexom i DB controller/session lockom, controller prvo durable commit-uje exact `active` `cms_addon_serving_fences` red kroz `begin_serving_mutation_fence`, pre prvog service-stop, config ili pointer write-a. Od tog commita javni addon gate zahteva nula active fence redova, uključujući same-release redeploy i crash pre stvarne service/pointer mutacije. `WindowsScmCmsServiceAdapterV1` zatim proverava literal service/SID, wrapper/XML/launcher/Node hash, PID+start vreme, current i loopback port; SCM stop čeka `STOPPED` do 60 s bez kill fallbacka, tek onda sledi pointer CAS, start istog servisa i novi PID/loaded-release dokaz do 90 s. Potom worker radi liveness/build/addon-loaded proveru i `reconcileAddonCandidateOnConnectionV1`, koji upisuje samo non-serving candidate evidence, pa bounded internal candidate-readiness. Tek `finalizeAddonReadyReceiptOnConnectionV1` u jednoj transakciji promoviše installed/current/`ready` tuple, upisuje immutable success receipt i razrešava fence; failure pod istim lockovima daje tačno jedan recovery/no-mutation receipt i odgovarajući atomic resolution. Zatim se zatvaraju lease/controller/mutex i enqueue-uje callback.
15. Worker kroz durable result outbox POST-uje exact V2 result na target CMS, koristeći zasebni per-target result KID/secret; body nosi originalni installation/epoch/intent/generation/operation, entitlement/release evidence i terminal-evidence kind/hash. Unique `(operationId,workerJobId)` sme imati samo jedan result. CMS prvo proverava immutable historical operation/outbox snapshot; current tuple koristi samo za početni `applied` ili stale ACK, pa late result nikada ne menja current state. `rejected_before_switch` zahteva exact no-mutation receipt, ostale grane success/recovery receipt. Simulirati gubitak prvog 200 odgovora: retry šalje isti result body, ali dobija `ack=duplicate`, dok immutable `initial_ack` ostaje originalni `applied|stale_*`; nema drugog completion writer-a. Polling nije alternativni core tok.
16. `cms_addon_installations.status` opisuje desired operaciju/reconciliation i prelazi kroz coarse state machine:

        license_accepted
          -> install_pending
          -> installed
          -> migration_pending
          -> ready
        aktivna faza -> failed

    Worker/job phase zasebno može prikazati `downloading -> verifying -> building -> migrating -> deploying -> reconciling`. Durable CMS `installed` znači samo staged + offline-verifikovan release i postavlja ga fenced worker CAS na istoj target DB konekciji; ne popunjava installed serving-evidence kolone. `migration_pending` isti writer postavlja neposredno pre migration runnera. Pre prve service/config/pointer mutacije controller commit-uje active serving fence; od tog trenutka public gate je false dok ga terminalni receipt atomski ne razreši. `reconcileAddonCandidateOnConnectionV1` popunjava samo non-serving candidate red; tek atomarni ready-finalizer zajedno upisuje installed serving tuple, `ready`, success receipt i fence resolution. Odvojeni `runtimeStatus=not_installed|ready|maintenance|unavailable` opisuje poslednje terminalno potvrđeno stanje, ali public gate dodatno zahteva nula active serving fence redova i exact loaded tuple/receipt aktuelnog pokušaja. Neuspeo update sa uspešnim rollbackom ima desired `status=failed`, `finalPhase=rolled_back`, `runtimeStatus=ready` i prethodni verified installed tuple; initial failure pre schema/service mutacije ostaje `not_installed`, partial initial migration koja se ne može nastaviti daje `maintenance_required`, a `rollback_failed` daje `unavailable`.

### Dokaz uspeha

- activation slot postoji samo jednom;
- isti complete/challenge ne može da se replay-uje;
- u vendor bazi postoje entitlement, install i operation zapisi sa istim installation/release/epoch/intent/generation identitetom;
- Webshop paket se nalazi samo u release `node_modules` putanji;
- worker zapis sadrži CMS SHA, base/merged package manifest+lock hash, pinovane Node/npm/pacote/cacache verzije, packument/cacache inventory+delta i strict diff summary, observed host-capability hash, entitlement snapshot/lifecycle/expiry, package version, tarball SHA/SRI, artifact/dependency-lock/embedded-manifest/provenance/SBOM/attestation hash, registry package-version ID, source/published vreme, signing KID, runtime/schema bounds, registry/build hash, migration rezultat i health rezultat;
- worker i CMS nezavisno daju isti `MigrationLedgerEvidenceV1` JCS hash; success/rollback/maintenance/rollback-failed callback ima non-null current hash, a strogo rejected-before-switch ima null;
- vendor proces stvarno servira novi build;
- dashboard prikazuje `ready`, ne samo `install_pending`;
- ponovljeni isti dispatch/job ne pravi drugi release/aktivaciju/migraciju; dozvoljeni retryable requeue pravi `generation+1` uz isti epoch/intent i `supersedesOperationId`, dok drugi desired release/snapshot dobija veći epoch;
- storefront je dostupan tek posle readiness-a.

Ako webhook/worker nije dostupan, aktivacija ostaje durable `install_pending` sa retryable operacijom; korisniku se ne prikazuje lažno `ready` stanje.

## 11. Faza D — konfiguracija vendor prodavnice

1. U Webshop License Server settings dodati master base URL:

       https://license.nr.test/api/v1

2. Uneti vendor-commerce client ID, auth KID i shared secret.
3. Pokrenuti catalog sync i potvrditi HMAC V2 poziv.
4. Kreirati jedan digitalni proizvod, na primer `NR CMS Webshop license`.
5. Kreirati četiri varijante i mapirati ih variant-level na četiri tačna external SKU-a; svaka nova aktivna mapa trajno čuva i `externalLicenseEnvironment=development` i isti durable `externalLicenseCatalogVersion`.
6. Potvrditi da je proizvod domain-required i da checkout čuva purchase intent/domen.
7. Postaviti cene i aktivirati proizvod/storefront.
8. Konfigurisati test payment provider i email provider.
9. Potvrditi da su payment V2 i license-outbox V2 feature flagovi uključeni tek posle svih prethodnih gate-ova.

Za svaku aktivnu varijantu vendor mora pre objave proveriti da external SKU postoji u poslednjem uspešno potpisanom/sinhronizovanom master katalogu i da kompozit `(externalLicenseEnvironment,externalLicenseCatalogVersion)` postoji u lokalnom immutable catalog history-ju. Revision iz drugog environmenta i slobodan string koji katalog ne poznaje moraju biti odbijeni.

## 12. Faza E — client Buy tok i purchase intent

1. U client CMS-u otvoriti Webshop activation stranicu bez licence.
2. Potvrditi postojanje dugmeta `Buy webshop license`.
3. Klik mora prvo dobiti master-signed kratkotrajni purchase intent za `client.nr.test` pomoću installation proof toka.
   Lokalni master mora u intent/auditu eksplicitno upisati `domainVerificationMethod=development_allowlist_exemption`; ovaj test ne tvrdi DNS ownership. Poseban production-policy test mora odbiti isti izuzetak.
4. Dugme submituje top-level cross-origin HTML `POST` na `https://vendor.nr.test/licenses/purchase-intents/accept`; compact JWS je samo u request telu, nikada u query-ju/fragmentu. Public App Router Route Handler, ne Server Action, prolazi kroz method/path-scoped `proxy.ts`/CSRF izuzetak bez globalne customer-origin allowlist-e.
5. Vendor na POST ulazu ograničava content type/body size, ne loguje telo i proverava exact header/payload contract: potpis, issuer/audience, `typ`, `tokenUse`, `contractVersion`, numeric vremena, UUID JTI, addon, `offerKey`, `productTypeId`, `vendorProductRef`, `environment`, environment-prefiksovan `catalogVersion`, allowed SKU listu, canonical domen, installation ID/fingerprint i exact `installationFingerprintScheme=ed25519_spki_der_sha256_v1`, kao i replay stanje. Prisutni non-null Origin mora odgovarati verified canonical-domain HTTPS originu; absent/literal `null` se ne tretira kao dokaz, ali validan signed one-time JWS + master ledger tok nastavlja. Forged non-null mismatch pada pre master `:accept`.
6. Vendor poziva master `:accept` koristeći HMAC V2 i stabilan idempotency key, čuva samo JTI/hash/claims, postavlja opaque HttpOnly session reference i vraća `303` na čist product URL.
7. Potvrditi da token nije u adresnoj liniji, history-ju, Caddy/app logu, referreru ili analyticsu. Stranica jasno prikazuje da će licenca biti vezana za `client.nr.test`; dodatni hidden/query domain ili SKU nije autoritet.
8. Izabrati varijantu `webshop-365`.
9. Dodati je u cart i proveriti da snapshot sadrži tačan `masterPurchaseIntentJti`, `purchaseIntentContractVersion=1`, `offerKey`, `environment=development`, domen, product type, vendor product reference, external SKU i catalog version.
10. Količina mora biti 1. Prvi V1 checkout/order sme imati tačno jednu domain-bound Webshop license liniju: pokušaj druge license linije ili drugog JTI-ja u istom checkoutu dobija `409 license_checkout_single_item_required` i kupac mora otvoriti drugi checkout. Dva concurrent Add zahteva ili dve SKU varijante sa istim JTI-em moraju završiti jednom identičnom linijom ili `409`; variant replace menja istu liniju samo pre reservation-a.
11. Pri checkoutu master `:reserve` mora vratiti potvrdu i reservation lease.
12. Vendor kreira durable order u `intent_confirmation_pending`, računa immutable snapshot hash i master `:consume` vezuje isti JTI za order/order item/hash.
13. Simulirati gubitak consume odgovora i potvrditi da recovery ponavlja isti idempotency key/body, dobija isti rezultat i ne pravi drugi order.
14. Recovery worker za svaki poll koristi novi status observation idempotency key, dok exact retry jednog observation-a ostaje byte-identical. Odgovore primenjuje samo monotono po top-level `version` i nikada ne briše već viđeni terminalni marker. `:status` potvrđuje current master stanje za sve non-terminalne lokalne intente i svaki consumed order sve dok delivery ili compensation nije terminalna: canceled zatvara checkout; `reversible_hold` postavlja `masterSecurityHoldActive/version/disposition/reason/changedAt` i izvedeni `paused_security_review` bez upisa vendor `riskStatus`. Jedini istorijski autoritet je top-level `hardDisable={occurred,blockId,at,reasonCode,postIssueCompensation}`, koji se lokalno mirroruje kao `masterHardDisableOccurred/masterHardDisableBlockId/masterHardDisableAt/masterHardDisableReasonCode/masterHardDisablePostIssueCompensation` i postoji nezavisno od nullable authorization-a. `occurred=true` bez authorization-a terminalno blokira payment; uz `issued|used` authorization očekuje se `invalidated_for_security`; uz već `paid` authorization finansijsko stanje ostaje `paid`, ali compensation ide `required -> completed` i delivery je zabranjen. Current hold clear nikada ne briše marker. Fixture prvo dobija no-hold snapshot, zatim aktivira reversible hold i dokazuje fresh veću verziju; zasebno drži vendor offline tokom hard disable-a i clear-a i pokriva no-auth, pre-commit i paid+compensation granu bez stale overwrite-a.
15. Neposredno pre provider poziva vendor šalje `:authorize-payment` sa istim environment/order/item/snapshot bindingom i exact stable adapter ID-em `paymentProvider` koji odgovara `^[a-z0-9_]{1,50}$`. Master vraća `paymentAuthorizationId` i `issuedAcceptUntil` najviše 120 sekundi u budućnosti; vendor ih durable čuva u payment-session operation redu sa unique authorization ID-em, istim provider ID-em i statusom `creating`.
16. Vendor kreira tačno jednu provider session sa idempotency key-em `webshop-license-checkout:v1:<paymentAuthorizationId>`. Timeout/restart radi provider retrieve-by-idempotency-key ili već sačuvanom provider referencom; nikada ne kreira drugu session.
17. Vendor durable čuva opaque `providerCheckoutRef`, poziva `:commit-payment-authorization` pre `issuedAcceptUntil` i frozen intent `checkoutExpiresAt` sa istim authorization/provider/ref bindingom i browser redirectuje tek kada master vrati `authorizationStatus=used` plus persisted `usedExpiresAt=min(providerSessionExpiresAt,checkoutExpiresAt)`. Master ima unique `(paymentProvider,providerCheckoutRef)`. Posle commita `usedExpiresAt`, ne kratki issued cutoff, jeste efektivni capture/issue rok. Terminalni commit failure best-effort otkazuje session i ne redirectuje.
18. Direktni GET proizvoda bez accepted intent sesije ne može dodati ovu licencu u cart. Payment UI/session ostaje nedostupan ako status, authorization, security-block ili commit gate ne prođu.

## 13. Faza F — checkout, payment i issuance

1. Završiti checkout test kupcem i potvrditi email adresu.
2. Payment provider mora poslati validno potpisan event sa stvarnim event i transaction ID-em.
3. Payment inbox mora deduplikovati event.
4. Payment financial enum mora biti tačno `pending|authorized|partially_captured|paid|partially_refunded|refunded|disputed|chargeback|failed|canceled`. Order prelazi u finansijski `paid` tek kada je zbir autoritativno unique captured sredstava najmanje očekivani total u istoj valuti. Overcapture emituje alert/manual-reconciliation signal, ali isti order item i dalje izdaje najviše jednu licencu.
5. Pre enqueue-a reducer zahteva da webhook `providerCheckoutRef` odgovara `used` authorization-u istog JTI/order/item/snapshot-a, vendor-local risk bude `none|cleared`, fresh `masterSecurityHoldActive=false` i top-level `masterHardDisableOccurred=false`. Kasni capture posle reversible master hold-a ostaje finansijski `paid`, ali menja samo master-hold mirror/izvedeni fulfillment prikaz `paused_security_review`, ne `riskLifecycleVersion`, i ne enqueue-uje auto-issuance. Hard disable ostavlja terminalni top-level marker i refund/revoke review čak i posle administrativnog clear-a, uključujući no-authorization i već-paid slučaj. Lokalni provider/fraud/dispute signal zasebno menja `riskStatus`. `security_review|paid_security_review` nisu payment enum vrednosti.
6. License issue outbox šalje masteru:

       environment: development
       product type / SKU: webshop-365
       offer key: nr-cms-webshop-license
       vendor product ref: nr-cms-webshop-license
       catalog version: <ISTI_DURABLE_VERSION_IZ_INTENTA>
       canonical domain: client.nr.test
       purchase intent JTI i immutable snapshot hash
       vendor order i order-item reference identične consume bindingu
       quantity: 1
       payment aggregate ID i canonical aggregate hash
       payment authorization ID i isti used provider checkout ref
       exact paymentProvider stable adapter ID
       issuanceFence: fulfillmentGeneration, paymentAggregateVersion,
         financialLifecycleVersion i riskLifecycleVersion
       currency, order total i captured total u minor units
       non-empty, canonical sortirani captureEvidence[] sa unique provider/captureRef,
          stvarnim transactionRef-om, canonical amount semantikom, valutom i capturedAt;
          webhook eventRef ostaje samo u lokalnom inbox/audit ledgeru
       stabilan idempotency key

`paymentAggregateHash` mora biti `sha256:` + lowercase SHA-256 RFC 8785/JCS bytes objekta `{contractVersion:1,paymentAggregateId,orderRef,paymentAuthorizationId,paymentProvider,providerCheckoutRef,currency,orderTotalMinor,capturedTotalMinor,captureEvidence}`. Evidence lista ima 1..1000 redova, sortirana je po UTF-8 `(provider + "\n" + captureRef)`, svi provider-i/currency vrednosti su isti, amounti su positive safe JSON integer minor units i `(provider,captureRef)` je lokalno unique. Vendor i master lossless/BigInt parserom nezavisno recompute-uju sumu, odbijaju pojedinačnu vrednost ili zbir iznad `9007199254740991` i zahtevaju `capturedTotalMinor == sum(captureEvidence[].amountMinor)` pre hash/full-capture provere. Master sam rekonstruiše validirani JCS objekat i hash; ne veruje prosleđenom totalu/hash-u. `eventRef` nije wire/hash polje: različiti event-i istog capture-a samo dobijaju lokalne audit veze i ne menjaju frozen bytes. Delta adapter koristi immutable provider capture redove; cumulative-only adapter mora koristiti jedan stabilni provider financial-object ref i jedan monotonic-max evidence red. Isti skup cumulative snapshotova obrađen u različitom redosledu mora dati identične frozen evidence bytes/hash ili ostaje manual review bez issuance-a.

7. Pre svakog master send-a worker pod row lock-om ponovo čita order/payment/risk/issue red i zahteva isti `fulfillmentGeneration`, `paymentAggregateVersion`, `financialLifecycleVersion`, `riskLifecycleVersion`, finansijski `paid`, vendor-local risk `none|cleared`, `masterSecurityHoldActive=false` i top-level `masterHardDisableOccurred=false` iz svežeg versioned observation-a, isti `paymentProvider` i isti frozen aggregate hash. Master hold version/disposition nije deo four-field fence-a i ne povećava `riskLifecycleVersion`. Svaki `captureEvidence[].provider` mora biti jednak authorization/session/aggregate `paymentProvider` vrednosti. Refund/reversal pre send-a canceluje issue; lokalni dispute ili reversible hold ga stavlja u vendor `paused_security_review`; hard disable ga vodi u terminalni refund/revoke review; master poziv se tada ne radi.
8. Master pod lock-om potvrđuje da je intent `consumed` od istog API client-a i da se puni tuple potpuno slaže: environment, JTI, snapshot hash, order/item, canonical domain, API client, `offerKey`, product type, vendor product ref, SKU, quantity=1 i durable `catalogVersion`. `issuanceFence` strict parser zahteva tačno četiri non-negative JSON integer polja bez unknown/missing vrednosti, a exact tuple immutable vezuje uz issue operation/full request hash; isti idempotency key sa promenjenim tuple-om je `409`. Master takođe proverava used payment authorization/provider ref bez hard-disable markera, 1..1000 canonical unique capture redova, provider/valutu/safe-integer granice, BigInt recomputed sumu jednaku `capturedTotalMinor`, sam recompute-uje aggregate hash i tek zatim zahteva full capture i odsustvo hold-a. `vendor_payment_capture_bindings` (ili ekvivalentna normalizovana tabela) ima unique `(vendorApiClientId,paymentProvider,captureRef)` i immutable vezu ka payment aggregate/order/JTI; exact isti issue replay je dozvoljen, ali isti capture sa drugim aggregate/order/JTI bindingom daje `409 payment_evidence_conflict`. Unique `(vendorApiClientId,orderItemRef)` i filtered unique `licenses.purchase_intent_id` garantuju najviše jednu licencu.
9. Master posle auth/schema/body-hash provere prvo radi idempotency lookup: exact već `committed` key/body vraća frozen rezultat čak i kada je authorization sada `paid`; samo novi/pending operation zahteva `used` i `now < usedExpiresAt`. Commit licence, evidence bindinga, result-a i `used -> paid` je atomaran. Reversible `intent_security_hold` ne završava idempotency operaciju: isti issue operation/key prelazi `pending -> blocked`; auditovani clearance radi `blocked -> pending`, ali ne izdaje dok vendor ponovo ne proveri nepromenjen lokalni four-field fence i pošalje byte-identičan body/key. Hold/clear ne menja vendor `riskLifecycleVersion`. Hard disable daje terminalni `security_disabled`/refund-revoke ishod i ne resume-uje se. Ako je lokalni fence promenjen dok je operation blocked, stari request se ne replay-uje. Ako je master ipak već commitovao pre kasnijeg događaja, vendor ga ne izdaje drugi put već koristi post-commit reducer iz sledećeg koraka. `paused_security_review` je samo vendor fulfillment-outbox stanje.
10. Vendor response transakcija prvo pokušava CAS nad istim generation/version tuple-om i fresh master statusom (`masterSecurityHoldActive=false`, `masterHardDisableOccurred=false`). Svaki prvi durable committed entitlement/key se atomski čuva sa `postIssueReconciliationStatus=review_pending`; tek sledeći fresh validate/CAS može dati `resolved_active`, pa crash između ta dva commita ne otvara delivery. Terminalni full refund/reversal, lost dispute, `refund_required`, revoke ili hard disable tokom master commita znači no-delivery: kasni success se čuva samo kao encrypted sensitive recovery evidence, stanje ide `compensation_pending -> resolved_revoked` kroz tačno jedan causal master revoke. Reverzibilni local `security_review|paid_security_review`, reversible hold, dispute open ili partial refund ostaje `review_pending`, bez delivery-ja i bez automatskog revoke-a; dispute open dodatno enqueue-uje tačno jedan suspend. Audited local clear/master-hold clear, dispute won uz potvrđen reinstate ili partial-refund `retain_active` mogu isti committed entitlement vratiti u `resolved_active` bez drugog issue-a samo posle current causal CAS-a i fresh HMAC `POST /api/v1/entitlements/validate` dokaza za isti domain/entitlement. Unknown/pending ishod ostaje `review_pending`.
11. Tek validan current CAS čuva entitlement ID i licencni ključ u versioniranom AES-GCM envelope-u sa `WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KEY` i aktivnim KID-em; plaintext se ne loguje i ne upisuje u order snapshot. `WEBSHOP_LICENSE_SERVER_SECRET_KEY` se za ovaj ciphertext ne koristi.
12. Fulfillment completion enqueue-uje customer notification samo kada je issue durable `committed` i exact `postIssueReconciliationStatus=resolved_active`: server-side worker dekriptuje key samo u memoriji, pod issue lock-om pre poziva alocira sledeći `validationObservationGeneration` vezan za issue/domain/key fingerprint i current causal versions, pa HMAC poziva strict `POST /api/v1/entitlements/validate` sa `{contractVersion:1,licenseKey,domain}`. Prihvata samo current-generation CAS za `valid=true,status=active,reason=null,entitlementId=licenseId=<ISTI_ISSUE_ID>` i neistekli nullable `validUntil`. Red čuva samo binding/response JCS hash/observation metadata, ne key; latest-started mora biti latest-applied, bez novijeg pending reda, a validation i fresh purchase-intent status moraju biti najviše `WEBSHOP_POST_ISSUE_LICENSE_STATUS_MAX_AGE_SECONDS=60` stari. Uz to nema suspend/revoke/compensation, vendor risk je `none|cleared`, `masterSecurityHoldActive=false` i `masterHardDisableOccurred=false`. Pre issue-a `paymentStatus=paid` ostaje obavezan; posle issue-a audited partial-refund `retain_active` može ostaviti isti entitlement isporučivim. Timeout/stale/mismatch fail-closed; delayed generation N active posle N+1 revoked/suspended je ignored.
13. Email outbox generiše random 256-bitni guest token, čuva samo njegov unkeyed SHA-256 i šalje kratkotrajan secure delivery link. Ne postoji delivery signing/HMAC/KEK secret.
14. Svaki notification outbox red ima monotonu `notificationGeneration` i deterministic `providerMessageKey=webshop-license-delivery:v1:<NOTIFICATION_UUID>:<GENERATION>`. Provider mora podržati idempotent send i autoritativni retrieve/reconciliation baš po tom ključu. Durable provider message ID je dodatni lookup tek kada je već lokalno sačuvan; nije zamena za key lookup posle crash-a između provider commita i lokalnog ACK-a.
15. Pre send-a, pri provider ACK-u i pri svakom reconciliation-u notification worker ponavlja fresh status i post-issue delivery gate iz koraka 12. Posle timeout-a/crash-a prvo reconcile-uje isti provider message key. Novi token/generation sme nastati samo posle autoritativnog provider ishoda `not_found` ili `definitive_pre_accept_failure`; u jednoj DB transakciji opoziva prethodni aktivni token i kreira novi. Unknown provider outcome ostaje retry/reconciliation, ne šalje drugi email/token.
16. Kupac otvara link, prolazi ownership/token proveru i eksplicitnim POST reveal zahtevom dobija ključ tek posle nove fresh status provere i istog post-issue delivery gate-a; stale status, hold, top-level hard disable, neaktivna/istekla licenca, pending compensation ili lifecycle review fail-closed odbijaju dekripciju.
17. Reveal odgovor ima `Cache-Control: no-store`, nema third-party resurse i emituje audit događaj.
18. `deliveredAt` se postavlja kada je ključ stvarno otkriven, a ne kada je email samo enqueue-ovan.

Pre slanja testa Caddy matcher za `/licenses/order-delivery/*` mora isključiti raw URI/path/query iz access loga ili ga zameniti stabilnim template-om `/licenses/order-delivery/:token`; Next route, tracing, metrics i error reporting takođe koriste samo template/request ID. E2E šalje poznat canary delivery token kroz stvarni Caddy origin, izvršava GET + POST exchange/reveal tok i zatim skenira edge/app/telemetry/error logove. Canary ne sme postojati ni u jednom logu; odgovor mora imati `Referrer-Policy: no-referrer` i no-store politiku.

### Dokaz idempotentnosti

Ponoviti isti provider webhook i simulirati gubitak HTTP odgovora između vendora i mastera. Očekivanje:

- jedan order payment transition;
- jedan business fulfillment operation;
- jedna master licenca;
- isti entitlement vraćen na retry;
- jedan payment authorization/provider session i jedan canonical capture-evidence aggregate;
- najviše jedan aktivni delivery token po definisanoj politici;
- nema duplog emaila osim eksplicitnog auditovanog resend-a.

## 14. Faza G — aktivacija client Webshopa

1. Kopirati otkriven ključ u client activation formu.
2. Ponoviti isti challenge/proof/entitlement/deployment tok kao za vendor, sada za `client.nr.test` i client worker target.
3. Worker mora koristiti client release root, client env i client bazu; nijedan vendor path ili credential nije dozvoljen.
4. Potvrditi exact package release i isti CMS commit kao vendor, osim ako test zapis eksplicitno testira compatibility matricu.
5. Sačekati reconciliation i `ready`.
6. Potvrditi da client Webshop radi na `https://client.nr.test`, dok vendor podaci i podešavanja nisu prisutni.
7. Potvrditi da master licenca ima tačno jednu aktivaciju vezanu za `client.nr.test` i client installation ID.

## 15. SKU matrica

Primarni browser E2E radi se sa `webshop-365`. Ostali SKU-ovi se ne testiraju prepisivanjem postojećeg licencnog reda. Koristiti nove disposable CMS baze/installation identitete ili odvojene test case-ove.

| SKU | Očekivani rezultat |
|---|---|
| `webshop-30` | `validUntil` odgovara 30-dnevnoj politici |
| `webshop-183` | `validUntil` odgovara 183-dnevnoj politici |
| `webshop-365` | kompletan browser/payment/activation E2E |
| `webshop-1000000` | `licenseValidUntil=null` perpetual/lifetime, bez miliona dana ili 2099 sentinela; JWS envelope ipak ima konačan expiry |

Za vremenski osetljive asercije koristiti UTC, kontrolisan clock u testovima i dokumentovanu toleranciju; ne porediti lokalne formatted datume.

## 16. Negativni i bezbednosni testovi

### Purchase intent

- izmenjen jedan bajt tokena/signature → odbijanje;
- istekao intent → odbijanje;
- pogrešan audience/vendor → odbijanje;
- drugi addon/product/SKU → odbijanje;
- replay potrošenog JTI-ja → odbijanje;
- pokušaj promene `client.nr.test` u `vendor.nr.test` → odbijanje;
- token dodat u query/fragment → endpoint ga ne prihvata; compact JWS postoji samo u bounded POST telu;
- real-browser top-level POST sa arbitrary verified production customer originom i lokalnim `client.nr.test` originom prolazi kroz exact public Route Handler; validan JWS sa absent/literal `null` Originom prolazi bez lažne allowlist tvrdnje, dok forged non-null Origin koji ne odgovara verified canonical-domain originu pada pre master `:accept`. Nijedan slučaj ne koristi Server Action niti loguje body;
- `WEBSHOP_BUY_URL` sa HTTP-om, userinfo-om, query/fragmentom, pogrešnom/trailing-slash putanjom ili neallowlistovanim portom pada na startupu; eksplicitni default `:443` daje isti derived `vendorAudience`, a JWS `aud`/offer mapping mismatch pada pre vendor ledger mutacije;
- nedostajući/promenjen `installationFingerprintScheme` ili scheme/fingerprint/public-key mismatch → odbijanje pre izdavanja intenta;
- direct GET bez accepted intent sesije → Add to cart odbijen;
- paralelni accept/reserve/consume sa istim key/body-jem → isti rezultat;
- isti idempotency key sa drugim body-jem → conflict;
- consume response loss → isti consumed order binding, bez drugog order-a;
- drugi license JTI/item ili običan proizvod u istom V1 checkout/orderu → `409`, bez reservation/payment session-a;
- payment pre potvrđenog consume-a ili bez svežeg `:status/:authorize-payment/:commit-payment-authorization` gate-a → odbijanje;
- provider session response loss → retrieve istog `webshop-license-checkout:v1:<authorizationId>` rezultata, bez druge session;
- drugi `paymentProvider`, reuse istog provider checkout ref-a pod drugim providerom/bindingom ili captureEvidence provider mismatch → conflict/security review bez issuance-a;
- reversible hold pre authorization ili commit-a → bez redirecta; ista neistekla authorization nastavlja posle clearance-a sa istim ID-em, a expiry tokom hold-a ne pravi novu V1 authorization/JTI/order. Kasni capture posle used authorization-a → finansijski `paid` + `masterSecurityHoldDisposition=reversible_hold`/izvedeni `paused_security_review`, bez promene lokalnog `riskLifecycleVersion` i bez issue-a;
- hard disable pre authorization-a → top-level `hardDisable.occurred=true` uz `paymentAuthorization=null`; hard disable uz `issued|used` → authorization terminalni `invalidated_for_security`; hard disable posle paid/issue commita → authorization ostaje `paid`, top-level compensation ide `required -> completed`, a delivery/reveal je zabranjen. Kasniji clear block-a nijednu granu ne resume-uje;
- vendor offline tokom hard disable-a i njegovog clear-a → prvi kasniji fresh `:status` u sve tri grane i dalje vraća top-level marker; nema redirecta, issue-a, delivery-ja ili brisanja lokalnog `masterHardDisable*` mirror-a;
- crash hard-disable propagation batch-a posle prvog od najmanje dva consumed intenta → generation ostaje non-completed, clear za buduću prodaju vraća `409 hard_disable_propagation_incomplete`, a još-neobrađeni red ipak pada na historical-generation route gate-u i ne može issue/delivery. Resume je idempotentan, završni locked rescan je prazan i tek tada clear prolazi; oba postojeća intenta zadržavaju marker;
- drugi order/item/snapshot hash pri issuance-u → odbijanje;
- `consumed` intent sa neuspelim paymentom → samo retry iste porudžbine; novi order zahteva novi intent.

### Master API

- pogrešan client ID, KID ili signature → 401;
- istekao timestamp → 401;
- ponovljen nonce → 401/409 prema contractu;
- nedostaje idempotency key na mutaciji → odbijanje;
- klijent bez product/SKU/action scope-a → 403;
- `requiresDomain` sa praznim domenom → 4xx;
- domain mismatch na activation → odbijanje;
- activation limit 1 sa drugim installation ID-em → odbijanje.
- isti Ed25519 ključ u semantički ekvivalentnom PEM/newline formatu → isti SPKI-DER fingerprint; RSA/EC/non-Ed25519 ili claim mismatch → odbijanje pre challenge mutation-a;
- `legacy_pem_utf8_sha256_v0` raw-PEM fingerprint red ne dobija novu scheme/fingerprint vrednost metadata-only update-om; dedicated signed rebind/re-enroll dokazuje stari i novi identitet ili ide u auditovani recovery.

### Paket i worker

- package range, `latest`, nepoznat package ili `@nr-cms/license-server` → odbijanje;
- pogrešan tarball SHA/SRI, artifact/file hash, embedded-manifest/provenance/SBOM/attestation hash, registry package-version ID, source/published vreme, signature/KID ili schema bound → odbijanje pre package koda/builda;
- install/lifecycle izvršen pre quarantine tarball/manifest/attestation/dependency-graph provere → test mora pasti;
- potpisan migration descriptor sa `destructive=true` ili `rollbackPolicy=forward_only` → publisher/master import/worker admission `unsupported_migration_policy` pre DB lease-a, CMS phase write-a ili schema mutacije;
- non-empty initial install bez prethodnog serving release-a → verified non-destructive `expand_compatible` bundle prolazi dok addon ostaje nedostupan; update čija finalna schema nije u signed supported range-u trenutno serving release-a daje `unsupported_online_migration` pre DB write-a, dok isti update prolazi kada old release future-max eksplicitno uključuje finalnu verziju;
- promenjen/dodat/izostavljen transitive dependency node, edge, peer/optional resolution, registry ili integrity u odnosu na signed `release-dependency-lock.json` → permanent odbijanje pre migracije/switch-a;
- pogrešan `cmsBasePackageJsonSha256`/`cmsBasePackageLockSha256`, missing offline packument/cacache entry ili merge koji promeni bilo koje drugo base manifest polje/postojeći CMS core-root node/edge/integrity → permanent odbijanje;
- backdated source release sa attested `publishedAt > updatesUntil` → selector ga odbija;
- stable release sa prerelease/build metadata, duplicate normalized version ili nondeterminističan concurrent winner → odbijanje/constraint failure; revalidation nikada implicitno ne downgrade-uje installed SemVer;
- production job sa `local-dev:*` KID-em → odbijanje;
- replay webhook request ID-a → bez drugog joba;
- body/path/timestamp HMAC tamper → odbijanje;
- paralelna dva joba za isti target → jedan target mutex; installation-scoped epoch CAS ostaje zaseban;
- re-enroll/transfer na novom installation ID-u sa epochom 1 posle starog installation epocha 10 → nije stale, ali čeka target mutex i pre switch-a mora proći current CMS fence;
- viši epoch sa generation različitom od 1, isti epoch sa generation gap-om ili +1 bez exact terminal retryable predecessor-a/`supersedesOperationId`-a → `invalid_generation_transition`; isti epoch/generation sa drugim body hashom → binding conflict, bez novog joba;
- spori A epoch 10, zatim prihvaćen/switch-ovan B epoch 11 i kasni A → A dobija stale/rejected rezultat i nikada ne mutira DB/pointer; stale callback dobija `stale_epoch_ignored` bez current-state mutation-a;
- late rezultat stare generation istog epoch-a → `stale_generation_ignored`; generation+1 nastaje samo posle dozvoljenog authenticated retryable failure-a i nosi `supersedesOperationId`;
- stari installation identitet sa epoch 50, zatim novi installation identitet sa epoch 1 na istom targetu i late callback starog → `stale_installation_ignored`; receiver ne poredi 50 sa 1 i ne menja current operation/runtime/installed tuple novog identiteta;
- worker crash posle switch-a/pre reconciliation-a → recovery na istoj advisory-locked DB konekciji donosi jednu idempotentnu reconcile/rollback odluku bez paralelnog writer-a;
- worker crash odmah posle `begin_serving_mutation_fence` commita sa empty i non-empty pending setom, uključujući same-release redeploy, kao i posle pointer switch-a, candidate reconciliation-a, internal readiness-a ili pre atomarnog promotion+receipt commita → public addon gate ostaje restricted; recovery pod novim lockovima daje tačno jedan success/recovery/no-mutation receipt i atomic fence resolution pre callbacka, bez candidate-serving prozora;
- worker crash između dva migration commita, pre nego što serving fence postoji → recovery pod target/installation lockovima rekonstruiše ledger; zero schema/ledger write sme dati no-mutation bez fence CAS-a, a svaki partial write mora ili nastaviti isti signed set ili dati tačno jedan recovery receipt sa non-null ledger hashom (`rolled_back` samo uz dokazano kompatibilan prethodni runtime, inače `maintenance_required`); initial partial install nikada nije lažno `rejected_before_switch`;
- npm registry outage → retry bez promene aktivnog release-a;
- root/transitive fetch child rade samo kroz `NRAddonRegistryCredentialBroker`, a secret-free verifier/install/build kroz odvojeni `NRAddonBuildSandbox` SID/AppContainer i no-breakaway kill-on-close Job Object. Build canary direktno pokušava read DPAPI blob-a, `CryptUnprotectData`, broker-pipe connect i detached descendant i svuda dobija deny; token/config nestaju pre offline cache audit/install. Missing/tampered packument, cacache content entry, dostupna secret putanja ili credential canary u parent/cache/release/logu → permanent/incident failure bez installa;
- build/migration/health failure → exact desired/runtime tuple: rollback success `failed+rolled_back+ready`, initial pre-switch failure `failed+rejected_before_switch+not_installed`, incompatible schema `failed+maintenance_required+maintenance`, neuspeo rollback `failed+rollback_failed+unavailable`;
- migration ledger entry order/checksum/release/schema/status ili callback hash/nullability tamper → `invalid_result_tuple`, bez installed/runtime mutation-a; empty-ledger fixture hash je `sha256:19447974f968c03a52d3d58bc3a7ee50bc30ef7c242a7fe61be0c0cd084b5f22`;
- `rejected_before_switch` bez exact `NoMutationTerminalEvidenceV1` ili sa schema/service/pointer mutation indikatorom → `invalid_result_tuple`; validna grana menja samo current operation failure metadata, ne serving tuple;
- drugi `resultId`/body/status za isti `(operationId,workerJobId)` → incident conflict; exact isti rezultat daje duplicate ACK;
- `os_secret_ref_local` broker sa CurrentUser-only/netačnim DB-broker SID ACL-om, build/orchestrator read pravom, pogrešnim targetom/resource ID-em/grant manifest hashom, lease-om dužim od 1800 sekundi, neautentifikovanim/out-of-order pipe frame-om ili secretom u parentu/worker DB/logu → odbijanje; controller drži istu konekciju do terminal receipt-a, crash cleanup je zatvara, a rotation radi add-new sealed version/DB-broker allow-smoke + build/orchestrator deny-smoke/switch/drain/DB revoke bez prekida;
- migration fixture pravi novu tabelu i sekvencu u dedicated `webshop` schema-i; stvarni vendor/client service SID preko svoje `nr_cms_*_runtime` DB role prolazi dozvoljeni Webshop CRUD/nextval i zaseban normalni core CRUD smoke. Runtime `DDL|GRANT|SET ROLE|nr_control|pg_authid|drugi target|deployer` operacije i addon-deployer Clerk/payment/email/core pristup padaju. `pg_default_acl` i explicit object ACL odgovaraju hash-pinovanom privilege manifestu i ostaju isti posle isolated restore-a; raw migration `GRANT`, owner/schema promena ili objekat van `webshop` pada pre service switch-a;
- managed service fixture menja WinSW/XML/launcher/Node hash, pokušava request-provided service/path/port, simulira PID reuse, unexpected auto-restart, stop/start timeout i vendor→client stop. Svaki slučaj pada bez `taskkill`/PID-only fallbacka i bez neograđenog pointer write-a; active serving fence ostaje do jednog recovery receipt-a. Ručni `next dev` proces ne može proći adapter inspect;
- registry token se ne pojavljuje u logu, procesu, `.env`, lockfile-u ili release artefaktu.
- canary addon u verify/build fazi ne može pročitati registry/payment/email/HMAC/service-runtime env niti napraviti outbound exfiltration zahtev; build env validator radi bez runtime secret-a.

### Payment i fulfillment

- partial capture → bez issuance-a;
- duplicate/reordered webhook → determinističko jedno stanje;
- isti provider captureRef kroz dva različita webhook eventRef-a i obrnut redosled događaja → amount se računa jednom, eventRef ostaje samo lokalni audit i canonical `captureEvidence` bytes/hash su identični;
- `capturedTotalMinor` različit od recomputed evidence sume, 1001 red, pojedinačni unsafe integer ili BigInt zbir iznad `9007199254740991` → strict rejection pre issuance-a;
- cumulative-only fixture sa istim snapshot skupom u oba redosleda → isti jedan stable-ref monotonic-max evidence red/hash; adapter bez stabilnog financial-object ref-a ostaje manual review bez issuance-a;
- isti `(vendorApiClientId,paymentProvider,captureRef)` ponovo vezan za drugi aggregate/order/JTI → master `409 payment_evidence_conflict`, bez druge licence; exact isti issue replay ostaje idempotentan;
- invalid provider signature → odbijanje pre inbox mutation-a;
- master timeout pre odgovora i posle commita → isti idempotentni rezultat;
- refund/reversal pre issue send-a → cancel bez master issue poziva; dispute/hold pre send-a → `paused_security_review`;
- full refund/reversal/lost dispute/`refund_required`/revoke/hard-disable tokom master commita → no-delivery i tačno jedan durable causal revoke; local risk review, reversible hold, dispute open ili partial refund → `review_pending` bez revoke-a, dispute open sa tačno jednim suspendom. Audited clear odnosno won+reinstate/retain-active + fresh exact validate istog entitlementa vraća `resolved_active`; terminalna odluka daje `compensation_pending -> resolved_revoked`;
- issuanceFence missing/extra/non-integer/negative polje → master `400 invalid_schema`; isti idempotency key sa bilo kojom promenjenom od četiri verzije → `409 idempotency_conflict`, bez drugog issuer write-a/licence;
- crash pre send-a i response loss posle mogućeg master commita → isti issue generation/idempotency body, zatim current CAS ili exact post-commit `review_pending|compensation_pending` reducer, nikada drugi entitlement;
- issued-key envelope KID mismatch ili nepoznat KID → reveal odbijen i audit/alert, bez plaintext fallback-a;
- legacy issued-key rewrap → isti ključ kroz autorizovani fixture, novi KID upisan i API-secret envelope se više ne koristi;
- email provider outage → retry/DLQ, licenca ostaje dostupna autorizovanom kupcu;
- crash posle token-hash/outbox commita pre provider poziva → worker prvo radi retrieve starog `providerMessageKey`; po autoritativnom `not_found` opoziva izgubljeni generation N token-hash i pravi tačno generation N+1/novi plaintext token/key pre prvog stvarnog send-a. Ne pokušava da rekonstruiše plaintext N niti da ga pošalje;
- crash/timeout posle provider commita pre local ACK-a → retrieve istog key-a potvrđuje accepted/sent/delivered i dovršava isti generation/token bez drugog emaila; unknown ostaje reconciliation, a definitivni pre-accept failure/no-commit koristi istu revoke+N+1 proceduru. Fixture očekuje najviše jedan provider message, može imati dva token-hash generation reda u pre-provider-crash slučaju, ali tačno jedan poslednji aktivan token;
- delivery token istekao/već potrošen/pogrešan order → odbijanje;
- poznat canary delivery token prolazi kroz Caddy GET/POST tok, ali se ne pojavljuje u edge/app/telemetry/error logovima, raw Referer dump-u ili analyticsu;
- order kupca A nije vidljiv kupcu B.

### Lifecycle

- full refund → revoke;
- dispute open → suspend;
- dispute won → reinstate samo ako prethodno stanje i policy to dozvoljavaju;
- dispute lost/chargeback → revoke;
- partial refund → eksplicitna poslovna politika; ne automatski full revoke bez pravila;
- pre slanja deactivation `complete` ili transfer `source_complete`, CMS u jednoj lokalnoj transakciji postavlja `lifecycle_finalization_pending`, prebacuje runtime u maintenance/restricted i pod deployment fence-om supersede-uje svaki non-terminalni deploy job za taj installation;
- deactivation challenge unapred vraća master-assigned lifecycle `operationId`, a `challenge|complete` potpisuje exact purpose bytes; CMS pre complete-a čuva isti operation ID/JCS request hash, master pod lock-om radi `active -> deactivated`, povećava lifecycle version, oslobađa slot i vraća signed receipt;
- simuliran gubitak odgovora posle master lifecycle commita ostavlja lokalni fail-safe pending/restricted bez outage grace-a; recovery retry-uje isti operation/request/body i dobija isti receipt, bez drugog lifecycle eventa;
- transfer `prepare -> target_complete -> source_challenge -> source_complete` zahteva target installation proof, lokalno evidentiran `.nr.test` development domain izuzetak, hashovan one-time source approval code i source installation proof. Exact hash je `"sha256:" + lowercaseHex(SHA-256(UTF8(sourceApprovalCode)))` nad tačno 43 ASCII base64url-no-padding karaktera, bez trimovanja, newline-a ili base64 dekodovanja. `target_complete` dodatno šalje `sourceApprovalDerivationKid` i target-installation `approvalBindingSignature` nad transfer/challenge/KID/code-hash tuple-om, a master ih immutable čuva;
- uspešan transfer atomski ostavlja source `transferred`, licencu na novom canonical domenu i tačno jednu aktivnu target activation; target regularna activation zatim vraća isti entitlement bez drugog slota;
- shared receipt fixture zaključava strict `typ=NRV-ADDON-LIFECYCLE-RECEIPT+JWT` header i sva tri zatvorena `LifecycleReceiptClaimsV1` union člana: `deactivation`, `transfer_source` i `transfer_target`. Deactivation receipt mora vezati deactivation core hash `sha256:02dd22e6f473a77a90640f74311ba1f4d2db4961624f00b68012dd2034a0097f`; oba transfer receipt-a imaju različit JTI/role, ali isti immutable transfer core hash `sha256:c9d1208383c306a9817055011748eec82c356c7b5bc2575bbb5e23bcd4caba02`. Cross-role primena, unknown/extra claim/header, drugi `typ`/token-use/audience, core/hash/identity mismatch i receipt na/posle `exp` padaju pre lokalne mutacije;
- master mora čuvati exact lifecycle result najmanje tako da konkretni `result_replay_until >= receipt.exp`; startup/fixture odbija obrnut ili kraći retention. Pre receipt isteka exact retry vraća iste receipt bytes. Posle isteka receipt-a ili kada originalni response nikada nije primljen test koristi exact `POST /api/addons/licenses/lifecycle-status` challenge/complete: request vezuje originalni operation/action/non-null CMS-durable JCS request hash/activation/installation/pre-lifecycle/transfer tuple, CMS potpisuje `NRV-ADDON-LIFECYCLE-STATUS-CHALLENGE-V1`, a master vraća najviše 300 sekundi važeći `typ=NRV-ADDON-LIFECYCLE-STATUS+JWT`. `committed` mora nositi isti non-null result hash i finalni conditional source/target/domain status bez druge lifecycle mutacije; terminalni `not_committed` ima null result/target activation i vraća runtime samo uz source `active`, `licenseCanonicalDomain=sourceCanonicalDomain`, isti installation i istu pre-operation lifecycle verziju; `in_progress`, expired/unknown-KID/mismatch ostaje pending/restricted. U dropped-before-master fixture-u samo je masterova persisted `final_request_body_hash` inicijalno null; challenge uvek šalje CMS-ov non-null originalni hash i privremeno ga vezuje, pre cutoff-a dobija `in_progress`, a posle cutoff-a status-close CAS dobija `not_committed` i onemogućava kasniji complete. Concurrent complete/status-close ima tačno jedan ishod. Retained core/result hash/tombstone omogućava recovery lifetime licence;
- istekao code, pogrešan source potpis, promenjen lifecycle version ili simulirani conflict ostavljaju source domain/activation potpuno nepromenjene;
- source approval code sa trim/newline varijantom, pogrešnom dužinom ili hashom nad decoded HMAC bytes umesto exact 43-character UTF-8 teksta → odbijanje bez transfer mutation-a;
- unit/integration SSRF fixture za production policy odbija redirect, private/mixed DNS, pogrešan challenge i nevažeći target potpis; `.nr.test` izuzetak je zabranjen u production konfiguraciji;
- domain transfer ne radi običnim editovanjem reda.

Master DB/Drizzle/TypeScript activation-status contract mora pre ovog testa uključiti tačno `transferred`; migracija i revalidation fixture dokazuju da source više nije active i da `transferred` odmah gasi runtime bez network grace-a.

### Revalidation i outage

- validan signed `active` odgovor sa active activation održava `ready`;
- signed `expired`, `suspended` ili `revoked` license odgovor, kao i `deactivated|transferred|revoked` activation status, menja runtime stanje odmah;
- 401/403/404 nije outage grace;
- network/5xx koristi grace samo do definisanog roka i nikad preko license `validUntil`;
- restart tokom master outage-a koristi trajno verifikovan keyset/snapshot i zadržava isto pravilno stanje;
- istekom grace perioda addon prelazi u definisani restricted/disabled mod;
- povratak mastera radi recovery bez ručnog editovanja baze.

### Keyset i envelope rotacija

- entitlement i purchase-intent verifier prihvataju aktivni i vremenski važeći verification-only KID, odbijaju unknown/revoked i preživljavaju restart sa validnim durable cache-om;
- master secret, vendor master-credential, vendor/client installation i issued-license envelope se rotiraju expand/rewrap/contract procedurom; svaki envelope/DB KID mismatch pada pre decrypt-a;
- transfer-approval secret/KID rotacija zadržava old secret samo do zatvaranja vezanih transfera; master bira pogođene redove po trajno i kriptografski vezanom `source_approval_derivation_kid`, a compromise otkazuje sve njihove `requested|target_proved` transfere umesto overlap-a;
- legacy red se prvo klasifikuje i stvarno decrypt/rewrap-uje; metadata-only KID update test mora pasti;
- zero-count query, restart i isolated restore prolaze pre uklanjanja starog keyring entry-ja;
- installation rewrap ostavlja isti installation UUID, public key i fingerprint, a credential rewrap isti HMAC client/KID.

## 17. Read-only SQL dokaz

Nazivi kolona moraju se proveriti prema finalnoj migraciji. Sledeći upiti predstavljaju vrstu dokaza; ne selektovati plaintext, hash licence, encrypted key, secret ciphertext ili nonce vrednosti.

### Master katalog i release

```sql
select id, title, addon_key, requires_domain, status
from product_types
where addon_key = 'webshop';

select id, product_type_id, sku, duration_days, activation_limit, status
from product_type_skus
where sku in ('webshop-30', 'webshop-183', 'webshop-365', 'webshop-1000000')
order by duration_days;

select release_id, addon_key, package_name, package_version,
       manifest_version, artifact_sha256, dependency_lock_sha256,
       npm_tarball_sha256, npm_tarball_integrity,
       embedded_manifest_sha256, provenance_sha256, sbom_sha256,
       publication_attestation_hash, registry_package_version_id,
       release_signing_kid, runtime_contract_version,
       cms_version_range, node_version_range, next_version_range,
       minimum_core_schema_version, schema_version,
       supported_addon_schema_version_min,
       supported_addon_schema_version_max,
       migration_bundle_hash, supported_license_editions, channel,
       source_released_at, published_at, status
from vendor_release_manifests
where addon_key = 'webshop';
```

Query je TARGET posle Faze 2 i mora odgovarati exact immutable contractu iz dokumenta 03. Dok migracija ne postoji, današnji `package_hash`/boolean compatibility red nije dovoljan activation release autoritet. Odvojeni read-only dokaz potvrđuje da master čuva exact manifest/attestation bytes ili content-addressed immutable reference i da je `published_at` registry-attested vreme, ne lokalni import `now()`.

### Master API klijent

```sql
select id, title, client_id, environment, is_global_service,
       status, rotated_at, revoked_at
from api_clients
where title = 'vendor-commerce-local';

select api_client_id, key_id, active_from, active_until,
       revoked_at, created_at
from api_client_secret_versions
where api_client_id = :vendor_client_id;

select api_client_id, product_type_id, sku_id, action,
       environment, revoked_at
from api_client_product_scopes
where api_client_id = :vendor_client_id
order by product_type_id, sku_id, action;

select id, environment, offer_key, addon_key, vendor_audience,
       vendor_api_client_id, product_type_id, vendor_product_ref,
       catalog_version, status, updated_at
from vendor_purchase_offers
where offer_key = 'nr-cms-webshop-license'
  and environment = 'development'
  and addon_key = 'webshop'
  and vendor_audience = 'https://vendor.nr.test';
```

Offer query je TARGET Phase 6 dokaz posle migracije. Mora vratiti tačno jedan active red vezan za isti `:vendor_client_id`; allowed SKU snapshot/relacija mora dokazati tačna četiri očekivana SKU-a bez raw secret-a.

### Master purchase-intent i payment-authorization ledger

```sql
select id, contract_version, environment, signing_kid,
       offer_key, product_type_id, vendor_product_ref, catalog_version,
       canonical_domain, installation_id, installation_key_fingerprint,
       installation_fingerprint_scheme, status,
       expected_vendor_client_id, accepted_vendor_client_id,
       checkout_expires_at, reservation_expires_at,
       order_ref, order_item_ref, purchase_intent_snapshot_hash,
       selected_sku, selected_quantity,
       hard_disabled_at, hard_disable_block_id,
       hard_disable_reason_code, hard_disable_post_issue_compensation,
       version
from vendor_purchase_intents
where id = :master_purchase_intent_jti;

select id, environment, catalog_version, product_type_id, sku,
       disposition, reason_code, effective_at, cleared_at, version
from vendor_purchase_security_blocks
where environment = 'development'
  and product_type_id = :product_type_id
  and sku = 'webshop-365'
order by effective_at;

select block_id, generation_id, status, affected_cutoff,
       affected_count, processed_count, attempt_count,
       last_error_code, started_at, completed_at
from vendor_purchase_security_block_reconciliations
where block_id = :security_block_id;

select id, purchase_intent_jti, environment,
       order_ref, order_item_ref, purchase_intent_snapshot_hash,
       payment_provider, status, provider_checkout_ref,
       provider_session_expires_at,
       issued_at, issued_accept_until,
       used_at, used_expires_at, paid_at, invalidated_at,
       hard_disabled_at, hard_disable_block_id, hard_disable_reason
from purchase_intent_payment_authorizations
where purchase_intent_jti = :master_purchase_intent_jti;

select vendor_api_client_id, payment_provider, capture_ref,
       payment_aggregate_id, order_ref, purchase_intent_jti,
       amount_minor, currency, created_at
from vendor_payment_capture_bindings
where purchase_intent_jti = :master_purchase_intent_jti
order by payment_provider, capture_ref;
```

Intent query mora dati isti `(environment,catalogVersion)` i order/item/snapshot tuple kao order. Current hold autoritet je `vendor_purchase_security_blocks`, dok istorijski consumed-order autoritet ostaje top-level `hard_disabled_*` marker na intentu; nema starih `security_hold_at/reason/cleared_at` kolona kao drugog izvora istine. Hard-disable clear je dozvoljen samo kada propagation red ima `status=completed`, jednak affected/processed count, nula failed/DLQ ostataka i auditovan prazan finalni rescan. Crash-mid-batch fixture mora pokazati `409 hard_disable_propagation_incomplete` za clear i odbijen issue još-neobrađenog consumed reda; posle resume-a svi pogođeni intenti imaju marker i clear utiče samo na buduću prodaju.

Authorization query mora dati tačno jedan V1 red i `status=paid` posle full capture-a; pre redirecta je morao proći `issued -> used`. `issued_accept_until-issued_at <= 120s` važi samo za commit binding, dok `used_expires_at=min(provider_session_expires_at,intent.checkout_expires_at)` postaje efektivni capture/issue rok; `checkout_expires_at` je jedini frozen V1 master payment-policy deadline. Fixture dokazuje: commit na 121. sekundi pada; commit pre cutoff-a pa capture posle 120 sekundi ali pre `used_expires_at` može issue; capture posle `used_expires_at` ostaje financial/manual-review bez auto-issue-a. Unique `purchase_intent_jti`, unique `(payment_provider,provider_checkout_ref)` i auditovana hold/hard-disable tranzicija dokazuju da nema druge provider session. Capture-binding query dokazuje globalnu master-side unique `(vendor_api_client_id,payment_provider,capture_ref)` zaštitu i isti immutable aggregate/order/JTI binding. Ne selektovati token hash, JWS, HMAC podatke ili source approval code.

Ne prikazivati `secret_hash`, encrypted secret ili full credential. Ako finalna šema koristi druga imena kolona, query se ažurira zajedno sa migracijom i dokumentacijom.

### Master licence i aktivacije

```sql
select id, product_type_id, sku_id, sku_snapshot, domain, status,
       purchase_intent_id, domain_verification_method,
       domain_verified_at, domain_verification_challenge_id,
       issued_at, valid_from, valid_until, activation_limit
from licenses
where domain in ('vendor.nr.test', 'client.nr.test')
order by issued_at;

select entitlement_id, installation_id, canonical_domain, status,
       activated_at, deactivated_at, last_revalidated_at
from vendor_addon_activations
where canonical_domain in ('vendor.nr.test', 'client.nr.test')
order by activated_at;

select id, license_id, source_activation_id,
       source_canonical_domain, target_canonical_domain,
       source_installation_id, target_installation_id,
       source_approval_derivation_kid,
       source_approval_code_hash, approval_binding_signature,
       status, target_proved_at, source_proved_at,
       completed_at, expires_at
from license_domain_transfers
order by created_at;
```

Transfer ledger sme imati samo `requested -> target_proved -> completed` i canceled/expired grane; `source_proved_at` se postavlja u istoj finalnoj transakciji kao `completed`, nije zasebno stanje. Posle success-a source activation query mora dati `status=transferred`, a target tačno jedan `active` red.

### CMS entitlement/install stanje

Na vendor i client bazi zasebno:

Pre business redova dokazati core/addon schema ownership bez secret-a:

```sql
select n.nspname as schema_name, c.relname as object_name,
       c.relkind, pg_get_userbyid(c.relowner) as owner, c.relacl
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'webshop', 'nr_control')
  and c.relkind in ('r', 'p', 'S')
order by n.nspname, c.relname;

select defaclrole::regrole as owner_role,
       coalesce(n.nspname, '<global>') as schema_name,
       defaclobjtype, defaclacl
from pg_default_acl d
left join pg_namespace n on n.oid = d.defaclnamespace
order by defaclrole::regrole::text, schema_name, defaclobjtype;
```

Rezultat se poredi sa `CmsCorePrivilegeManifestV1` i Webshop relocation/privilege manifestom, ne procenjuje ručno po prefiksu. Fresh DB mora imati tačno canonical 47 Webshop tabela u `webshop`, nijednu od 45 business tabela u `public` i nijednu Webshop sekvencu u prvom contractu. `webshop_addon_entitlements`/`cms_addon_*` ostaju `public`; `nr_control` nije dostupan runtime roli. Owner je exact target core owner ili Webshop deployer prema manifestu. Poseban FK/index query dokazuje schema-qualified `webshop -> public.content/files/galleries` reference i nema `ON DELETE CASCADE` koji briše finansijsku/order istoriju. Legacy fixture dodatno poredi pre/posle row count i aggregate hash receipt.

```sql
select id, license_environment, status, installation_id,
       package_name, package_version,
       license_valid_until, entitlement_envelope_expires_at,
       next_revalidation_at, grace_ends_at,
       signing_kid, lifecycle_version,
       package_installed_at, last_revalidation_success_at
from webshop_addon_entitlements;

select installation_id, canonical_domain, deployment_mode,
       installation_key_fingerprint, installation_fingerprint_scheme,
       private_key_kid, key_version
from vendor_addon_installation_identities;

select addon_key, installation_id, license_environment,
       desired_package_name, desired_package_version,
       desired_release_id, desired_artifact_sha256,
       desired_dependency_lock_sha256,
       desired_npm_tarball_sha256, desired_npm_tarball_integrity,
       desired_embedded_manifest_sha256, desired_provenance_sha256,
       desired_sbom_sha256, desired_publication_attestation_hash,
       desired_registry_package_version_id,
       desired_source_released_at, desired_published_at,
       desired_release_signing_kid, desired_runtime_contract_version,
       desired_supported_addon_schema_version_min,
       desired_supported_addon_schema_version_max,
       desired_host_capability_descriptor_hash,
       installation_deployment_epoch,
       entitlement_snapshot_hash, entitlement_lifecycle_version,
       entitlement_envelope_expires_at,
       installed_package_name, installed_package_version,
       installed_release_id, installed_artifact_sha256,
       installed_dependency_lock_sha256,
       installed_npm_tarball_sha256, installed_npm_tarball_integrity,
       installed_embedded_manifest_sha256, installed_provenance_sha256,
       installed_sbom_sha256, installed_publication_attestation_hash,
       installed_registry_package_version_id,
       installed_published_at, installed_release_signing_kid,
       installed_runtime_contract_version, installed_schema_version,
       installed_supported_addon_schema_version_min,
       installed_supported_addon_schema_version_max,
       installed_migration_bundle_hash, installed_migration_ledger_hash,
       installed_build_id,
       status, runtime_status, deployment_job_id, last_error_code,
       deployed_at, reconciled_at, ready_at
from cms_addon_installations;

select id, addon_key, operation_id, license_environment,
       installation_deployment_epoch, deployment_intent_key,
       generation, supersedes_operation_id, operation_key,
       operation_type, status, error_class, error_code,
       worker_job_id, created_at, completed_at
from cms_addon_operations
order by created_at;

select addon_key, migration_id, release_id, checksum, package_version,
       schema_version, status, applied_at, error_code
from cms_addon_migrations
order by applied_at;

select id, operation_id, worker_job_id,
       installation_deployment_epoch, generation,
       candidate_release_id, candidate_package_version,
       candidate_artifact_sha256, candidate_build_id,
       migration_ledger_hash, candidate_tuple_hash,
       candidate_status, candidate_committed_at, terminal_receipt_id
from cms_addon_deployment_candidates
order by candidate_committed_at;

select id, target_profile, addon_key, installation_id,
       operation_id, worker_job_id,
       installation_deployment_epoch, generation,
       pre_operation_serving_state_hash,
       pre_operation_terminal_receipt_id,
       state, started_at, terminal_receipt_id, resolved_at
from cms_addon_serving_fences
order by started_at;

select id, operation_id, worker_job_id, installation_id,
       installation_deployment_epoch, generation,
       kind, final_phase, runtime_status,
       release_id, build_id, migration_ledger_hash,
       evidence_hash, committed_at
from cms_addon_deployment_terminal_receipts
order by committed_at;

select result_id, operation_id, worker_job_id, license_environment,
       result_body_hash, result_status, final_phase,
       terminal_evidence_kind, terminal_evidence_hash,
       initial_ack, received_at
from cms_addon_deployment_results
order by received_at;
```

Za callback/reconciliation dokaz iz gornjih redova praviti exact `MigrationLedgerEvidenceV1` bez `applied_at`, `error_code` ili free texta: `{contractVersion:1,purpose:"addon_migration_ledger",addonKey:"webshop",entries:[{migrationId,releaseId,checksum,schemaVersion,status:"applied|legacy_applied"}]}`. Entries su UTF-8 byte sortirani po `migrationId`; hash je lowercase SHA-256 RFC 8785/JCS bytes sa `sha256:` prefiksom. Empty fixture koristi canonical bytes `{"addonKey":"webshop","contractVersion":1,"entries":[],"purpose":"addon_migration_ledger"}` i očekivani hash `sha256:19447974f968c03a52d3d58bc3a7ee50bc30ef7c242a7fe61be0c0cd084b5f22`.

Ovo je target query posle Phase 3 migracije. Svaki entitlement/installation/operation/result red mora imati isti `license_environment=development`; durable deployment outbox body snapshot takođe čuva isto non-null polje. Legacy `expires_at` proverava se samo u zasebnom migration fixture-u pre njenog uklanjanja i nikad nije finalni runtime autoritet. Durable deployment outbox se dokazuje zasebnim query-jem nad finalnim environment/epoch/intent/generation/supersedes/operation key, request hash, status, attempts, lease, worker job ID, `error_class`, result/ACK i timestamp kolonama; ne pretpostavljati da današnji `cms_addon_operations` već poseduje ta transport polja.

Cardinality dokaz zahteva jedan candidate po exact operation/job/epoch/generation tuple-u i tačno jedan terminal receipt po `(operation_id,worker_job_id)`. Success candidate `terminal_receipt_id` pokazuje `reconciliation_receipt`, a promoted `installed_release_id/installed_artifact_sha256/installed_build_id/installed_migration_ledger_hash` tačno odgovaraju tom receipt-u. Recovery/no-mutation red ima exact odgovarajući kind/evidence hash i nikada ne promoviše candidate. Pre public `ready` mora biti nula active serving fence redova; svaki pokušaj ima tačno jedan resolution i njegov `terminal_receipt_id` pokazuje receipt istog operation/job/epoch/generation tuple-a. Crash odmah posle begin-fence, uključujući same-release redeploy, mora ostaviti gate false do tog resolution-a. Callback red čuva originalni `initial_ack`; prvi replay istog body-ja vraća wire `ack=duplicate`, ali ne menja `initial_ack` niti pravi drugi result/receipt.

### Worker PostgreSQL job store

Na `nr_addon_deployment_worker_test`:

```sql
select target_profile, addon_key, installation_id, highest_accepted_epoch,
       highest_generation, current_operation_id, updated_at
from addon_deployment_target_states
order by target_profile, addon_key, installation_id;

select target_profile, owner_job_id, fencing_token,
       lease_expires_at, heartbeat_at, version
from addon_deployment_target_mutexes
order by target_profile;

select id, target_profile, installation_id, license_environment,
       installation_deployment_epoch, deployment_intent_key,
       generation, operation_id, operation_key,
       supersedes_operation_id, request_hash, status,
       error_class, release_id, result_id,
       created_at, completed_at
from addon_deployment_jobs
order by created_at;

select result_id, worker_job_id, operation_id, body_hash, status,
       attempt_count, next_attempt_at, last_ack,
       created_at, completed_at
from addon_deployment_result_outbox
order by created_at;
```

Za svaki `(target_profile,addon_key,installation_id)` `highest_accepted_epoch/highest_generation` mora biti najveći lexicographic prihvaćen pair po exact pravilima: generation se resetuje na 1 samo uz viši epoch, a isti pair ima jedan operation/body hash. Nema izvršenog nižeg pair-a istog identiteta posle njega. `addon_deployment_target_mutexes` i pripadajući job-store PostgreSQL session advisory-lock dokaz moraju pokazati da je od prve mutation kroz switch/reconciliation/final-readiness/terminal-receipt critical section bio najviše jedan job po targetu, da je `fencing_token` monoton i da job posle gubitka konekcije, lease-a ili vlasništva nije uradio novu mutaciju. Job/result cardinality dokazuje jedan canonical job po operation key/request hash-u i unique `(operation_id,worker_job_id)` autoritativni terminalni result tuple/evidence, isti result body na retry-u, početni CMS `initial_ack` i workerov završni wire `last_ack=duplicate` kada je prvi 200 izgubljen. Replay tabela se proverava agregatom/countom bez prikazivanja HMAC headera ili body-ja. Broker audit prikazuje samo secret reference fingerprint, operation binding, lease issued/expiry/released vreme i zero-active-lease/session count — nikada password ili connection URL.

### Vendor order/fulfillment stanje

Tačan finalni query zavisi od migracije uvedene implementacijom, ali mora dokazati najmanje:

- order i item ID;
- `order_kind=webshop_license_single` i DB dokaz da order ima tačno jedan quantity-1 license item/JTI, bez mixed stavke;
- immutable `masterPurchaseIntentJti`, contract version, environment, offer key, domain/product type/vendor product ref/external SKU/catalog version i snapshot hash;
- master/local intent transitions, reservation lease, consumed order/item binding, fresh monotoni status observation, current `masterSecurityHold*` mirror i immutable top-level `masterHardDisableOccurred/blockId/at/reasonCode/postIssueCompensation` mirror;
- payment authorization ID/status, exact `issuedAcceptUntil` i nullable `usedExpiresAt`, stable payment-provider ID, jedan provider checkout ref/session operation i provider idempotency/retrieve rezultat;
- exact payment enum, odvojeni risk status, `fulfillmentGeneration`, `paymentAggregateVersion`, `financialLifecycleVersion` i `riskLifecycleVersion`;
- payment aggregate/hash, captured/order amount i currency, plus unique/sortirani capture evidence bez payment credentiala;
- provider capture/transaction reference u canonical aggregate evidence-u i odvojeni event reference samo u redigovanom inbox/audit mappingu;
- fulfillment idempotency key/status/attempt count i exact `postIssueReconciliationStatus=resolved_active|review_pending|compensation_pending|resolved_revoked`, uz unique version-CAS decision/evidence gde je primenljivo;
- master entitlement ID;
- master `licenses.purchase_intent_id` FK i dokaz unique one-intent/one-license veze;
- issued-key envelope KID (ne ciphertext) i dokaz da odgovara aktivnoj/old-key policy;
- post-issue license observation sa monotonom `validationObservationGeneration`, issue/domain/key-fingerprint/causal-version bindingom, pending/applied/ignored ishodom, entitlement/status/validity, observed-at i JCS response hashom, bez license key-a; notification/token/reveal CAS zahteva latest-started=latest-applied, nula novijeg pending reda, HMAC `/api/v1/entitlements/validate` observation ne stariji od 60 sekundi i fresh purchase-intent status istog decision prozora;
- notification generation, deterministic provider message key, reconciliation rezultat, status/attempt count/DLQ status i tačno jedan aktivni hash-only delivery token;
- `deliveredAt` i audit događaj reveal-a;
- nikada plaintext ili encrypted license key u operativnom izveštaju.

Za deactivation/transfer test dodatni local read-only dokaz mora pokazati lifecycle operation ID/request hash, `lifecycle_finalization_pending` pre HTTP-a, maintenance/restricted runtime, superseded deployment operation ID-eve i završni signed receipt ili exact lifecycle-status JWS claimove. Za transfer se dodatno dokazuju target-local derivation KID/binding/expiry, masterov isti immutable `source_approval_derivation_kid`, validan `approvalBindingSignature` i incident query koji po tom KID-u nalazi sve otvorene transfere. Response-loss snimak ostaje pending/restricted sve dok isti operation retry ili original-installation-PoP `committed|not_committed` status sa istim request/result/lifecycle tuple-om ne razreši ishod; `in_progress` ga ne razrešava.

## 18. Završna pass/fail lista

Kompletan E2E je `PASS` samo kada je svaka stavka potvrđena:

- [ ] sva četiri HTTPS origin-a rade sa trusted sertifikatom;
- [ ] četiri procesa i četiri PostgreSQL baze (`vendor`, `client`, `master`, `worker`) sa zasebnim env setovima, backupima i release prostorima su izolovani;
- [ ] per-target core owner/migrator/runtime i Webshop deployer/runtime grant matrice, startup pending-ledger gate i empty/upgrade/restore fixture prolaze bez DDL/secret prava u runtime-u;
- [ ] fresh target ima canonical 47-table `webshop` schema/postcondition bez 45 public business duplikata; legacy fixture prolazi samo kroz backupovan operator cutover i exact row/FK/index/owner/ACL/`legacy_applied` dokaz;
- [ ] deterministic core-bootstrap release i hash-pinovani `NRVendorCms`/`NRClientCms` WinSW/SCM adapter receipts dokazuju service SID/PID-start/current/port izolaciju bez taskkill/PID fallbacka;
- [ ] deploymenti ne sadrže `.private`;
- [ ] Webshop paket je preuzet iz GitHub Packages kao exact verzija;
- [ ] Windows-x64 release authority, credentialed-child/secret-free verify granica, pinovani npm-compatible offline packument/cacache completeness, ceo release/tarball/manifest/signed dependency graph/provenance/SBOM/publication-attestation/publishedAt/schema evidence, chained keyset i nepromenjen pinovani CMS base manifest/lock/core graph su provereni;
- [ ] operator `release:import` je pod lockom napravio draft, odvojeni `release:publish` ga je auditovano objavio, a CI nema master mutation credential/endpoint;
- [ ] stable SemVer selector/concurrent winner/backdated-publishedAt/downgrade fixture daje determinističan rezultat;
- [ ] vendor lifetime licenca je vezana za `vendor.nr.test`;
- [ ] vendor aktivacija je `ready` posle worker/reconciliation toka;
- [ ] vendor katalog vidi sva četiri master SKU-a;
- [ ] dva unchanged catalog GET/sync-a daju isti durable catalog version/ETag;
- [ ] jedan proizvod ima četiri ispravne variant-level mape sa exact `(externalLicenseEnvironment,externalLicenseCatalogVersion)` history vezom;
- [ ] Buy tok nosi master-signed intent za `client.nr.test`;
- [ ] real browser koristi core App Router acceptance wrapper/typed package delegate; registry-empty/not-ready ponašanje, null/absent i forged Origin fixture i `HostAddonRouteBindingsV1` inventory prolaze bez Server Action/broad CSRF izuzetka;
- [ ] lokalni intent/licenca beleže development domain izuzetak, a production policy fixture zahteva HTTPS domain-control dokaz;
- [ ] intent je POST-ovan bez URL curenja i master ga je vezao `accepted -> reserved -> consumed` za tačno jedan `webshop_license_single` order/item/snapshot;
- [ ] domen/SKU ostaju immutable kroz cart, checkout i order;
- [ ] isti JTI ne može imati dve cart/SKU/order-item linije ni pod konkurencijom;
- [ ] svih sedam purchase-intent scope/ruta, status/hold reconciliation i `authorize -> provider create/retrieve -> commit` gate prolaze sa istim stable `paymentProvider` i unique provider checkout bindingom;
- [ ] pun captured payment uz used authorization bez hard-disable markera, vendor risk `none|cleared` i clear master hold kreira tačno jednu master licencu; late reversible master-hold/capture ostavlja finansijski `paid`, ne menja vendor `riskStatus/riskLifecycleVersion`, postavlja `masterSecurityHoldActive=true`/`masterSecurityHoldDisposition=reversible_hold` i izvedeni `paused_security_review`, bez auto-issue-a; `paid_security_review` ostaje rezervisan za vendor-local risk;
- [ ] exact four-field issuance-fence parser/binding/conflict i closed post-issue reducer sprečavaju delivery tokom svake race grane: reverzibilni local risk/hold/dispute-open/partial-refund ostaje `review_pending` i može koristiti samo isti fresh-validated entitlement posle audited razrešenja, dok terminalni događaj pravi tačno jednu compensation; cumulative-only adapter daje jedan order-independent monotonic-max red ili manual review;
- [ ] licenca referencira isti consumed intent, a vendor ciphertext koristi namenski issued-license KID;
- [ ] duplicate/outage/response-loss ne prave duplikat;
- [ ] kupac dobija secure delivery link i autorizovano otkriva ključ; notification crash/timeout recovery po obaveznom `providerMessageKey` lookup-u ne šalje drugi email/token bez provider no-commit dokaza, a delivery-token canary nije ni u jednom Caddy/app/telemetry logu;
- [ ] client aktivacija i deployment završavaju u `ready`;
- [ ] master/CMS/worker/vendor business redovi i svi deployment request/result snapshoti nose isto `environment=development`; svaki cross-environment fixture pada pre mutacije;
- [ ] master i worker potvrđuju isti host-capability descriptor hash pre migracije/switch-a; exact installation epoch/generation pair-CAS, target mutex do terminal receipt-a, historical stale callback/no-mutation evidence, one-result-per-operation/job i DPAPI service-SID/controller `os_secret_ref_local` fixture-i ne mogu vratiti runtime unazad niti napraviti drugi success writer;
- [ ] lifecycle i revalidation negativni testovi prolaze;
- [ ] deactivation/transfer commit-response-loss ostavlja local fail-safe pending/restricted, supersede-uje deploy jobove i razrešava se istim operation retry-em dok receipt važi ili exact original-installation-PoP lifecycle-status JWS-om/tombstone-om za isti operation/request/result/lifecycle tuple posle njegovog isteka;
- [ ] tajne i licencni ključevi nisu procureli u logove ili izveštaj;
- [ ] backup, rollback i incident procedure su dokazano primenljive.

Ako jedna stavka padne, rezultat je `FAIL` ili eksplicitno imenovan `PARTIAL`, uz ID problema i priložene redigovane dokaze. Ne koristiti formulaciju „radi osim...“ kao production-readiness odluku.

## 19. Završetak testa

1. Zabeležiti vreme završetka, rezultat i sve job/order/license/installation ID-eve.
2. Izvesti redigovane logove i query rezultate u test evidenciju.
3. Sačuvati backup/snapshot i aktivni/prethodni release dok se rezultat ne odobri.
4. Zaustaviti lokalne procese ako više nisu potrebni.
5. Rotirati credential koji je možda bio izložen tokom ručne dijagnostike.
6. Ne brisati baze, license redove ili GitHub package verziju kao deo automatskog cleanup-a.
7. Test podatke ukloniti tek kroz posebno odobren, target-proveren i recoverable postupak.

Bezbednosni i rollback detalji su u [10 — Bezbednost, operations i rollback](10-security-operations-i-rollback.md).
