# Implementacioni redosled i Definition of Done

Status: TARGET izvršni plan implementacije.

Ovaj dokument deli posao u male, proverljive faze. Vendor i client direktorijumi nisu razvojni source i u njima se ne rade ručne programske izmene. Promene nastaju u odgovarajućem source repozitorijumu, prolaze testove i commit, a zatim deployment proces pravi oba test deploymenta iz istog odobrenog CMS commita.

## 1. Repozitorijumi i vlasništvo

| Source | Odgovornost | Gde se implementira/testira |
|---|---|---|
| `D:\nr_cms` | CMS host, activation UI/state, addon loader/registry, host DB ledger, cron adapteri i dokumentacija | glavni CMS repo |
| `D:\nr_cms\.private\webshop` | privatni Webshop package, vendor storefront/checkout/payment/fulfillment/delivery | `radomirradojevic/webshop` private repo |
| `D:\nr_cms\.private\license-server` | centralni katalog, licence, HMAC V2, purchase/activation signing, lifecycle | `radomirradojevic/license-server` private repo |
| `D:\nr_cms\.private\license-server-addon` | budući customer-owned issuer addon | van prvog E2E scope-a |
| predlog: `D:\nr_cms\.private\addon-deployment-worker` | privatni install/build/migrate/deploy servis | novi zasebni private repo; nije CMS npm addon |

Test deployment direktorijumi:

    D:\nr_cms-vendor
    D:\nr_cms-client
    D:\nr_license-server

ne dobijaju ručne source patcheve. Deployment ih pravi/obnavlja iz commitova i target-specific konfiguracije. Master source promena ide iz `.private\license-server` u `D:\nr_license-server`; CMS promena ide iz `D:\nr_cms` u oba CMS deploymenta. Webshop source se ne kopira: objavljuje se package i worker ga instalira iz GitHub Packages.

## 2. Pravila za svaki change set

1. Svaki repozitorijum ima svoj commit i test rezultat; ne oslanjati se na nested-repo diff iz parent repoa.
2. Schema promena dobija novu migraciju. Ne menjati već primenjene migracije.
3. Contract promena prvo dobija parser/schema, version i fixture testove.
4. Feature je default-off dok svi njegovi producer/consumer delovi nisu deployovani.
5. Tajne i lokalne `.env` vrednosti se ne commit-uju.
6. Generated artefakti se commit-uju samo ako postojeći repo contract to zahteva.
7. Next.js 16.2.6 pravila važe u CMS-u i masteru:

   - koristiti `proxy.ts`, nikada `middleware.ts`;
   - `params` i `searchParams` su Promise i moraju se `await`-ovati;
   - Server Action i Route Handler proveravaju auth/role i validiraju input;
   - default su Server Components; client komponenta samo kada su hooks/interakcija potrebni;
   - imports koriste postojeći `@/` alias;
   - ESLint 9 flat config i Tailwind v4 postojeći model se ne zaobilaze.

8. Mrežni request se ne drži otvorenim dok traju npm install, build, migracija ili restart.
9. Nijedan acceptance test ne sme proći samo sa `.private` source injectionom ako test tvrdi da proverava hosted registry.
10. Logovi i test fixture-i moraju koristiti lažne/canary tajne i dokazati redakciju.

## 3. Zavisnosti faza

Obavezni redosled:

    Faza 0: zajednički contracti i env profili
      -> Faza 1: master bootstrap, product i HMAC V2 provisioning
      -> Faza 2: verifikovan package release i master release catalog
      -> Faza 3: durable activation/install state
      -> Faza 4: deployment worker
      -> Faza 5: vendor multi-SKU proizvod
      -> Faza 6: master-signed purchase intent
      -> Faza 7: payment i issuance ispravnost
      -> Faza 8: secure delivery
      -> Faza 9: lifecycle, revalidation, deactivation i transfer
      -> Faza 10: kompletan lokalni E2E i rollout

Paralelno se mogu razvijati delovi unutar jedne faze koji imaju stabilan contract, ali naredni feature flag se ne uključuje pre njenog acceptance gate-a.

## 4. Faza 0 — zajednički contracti i deployment profili

### 4.1 Cilj

Ukloniti razlike između CMS-a, Webshopa i mastera u canonical domain, outbound URL i environment ponašanju. Omogućiti clean vendor/client deployment bez `.private` direktorijuma.

### 4.2 CMS promene

Relevantni postojeći fajlovi:

    lib/webshop-addon/config.ts
    lib/webshop-addon/buy-link.ts
    lib/vendor-addon-installation.ts
    lib/vendor-addon-entitlements/verified-entitlement.ts
    lib/vendor-addon-entitlements/public-keys.ts
    lib/security/outbound-url.ts
    scripts/validate-runtime-env.mjs
    scripts/setup-local-webshop-addon.mjs
    scripts/run-drizzle-migrations.mjs
    scripts/db-core-provision.mjs
    scripts/db-core-migrate.mjs
    db/schema.ts
    package.json
    .env.example
    .env.example.vendor
    .env.example.client
    next.config.ts

Implementirati:

- jedan CMS canonical-domain modul, bez `URL.host`/port razlike između identity i JWS provere;
- activation, revalidation i public-key caller ne smeju vezati `allowSelfHosted` za loopback-HTTP odluku: `https://license.nr.test` prolazi samo uz exact host allowlist + `NRLS_ALLOW_SELF_HOSTED_OUTBOUND=true`, dok `NR_ALLOW_INSECURE_LOOPBACK_HTTP=false` ostaje;
- eksplicitni `NR_CMS_DEPLOYMENT_PROFILE=development|vendor|client`;
- obavezni `NR_LICENSE_ENVIRONMENT=development|staging|production` u vendor i client template-u/validatoru; ista vrednost se persistira i šalje kroz activation/revalidation, purchase/catalog/issue/validate/lifecycle i deployment request/result. Worker zahteva jednakost sa per-target `licenseEnvironment` i `NR_ADDON_DEPLOYMENT_WORKER_ENVIRONMENT`; ništa je ne izvodi iz `NODE_ENV`, profila, URL-a ili baze;
- eksplicitni `NR_ADDON_SOURCE_MODE=private_workspace|registry|empty`;
- novi `prepare-dev-runtime` ili ekvivalentni script koji:

  - u `private_workspace` modu sme da pozove lokalni addon setup;
  - u `registry` modu generiše registry samo iz instaliranog paketa i production keyset-a;
  - u `empty` modu gradi core CMS bez addona;

- ukloniti unconditional `predev = addons:local` ponašanje za clean deployment;
- validator bira odgovarajući env contract prema profilu, a ne uvek vendor template;
- vendor template/validator dobija odvojene `WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KEY`, `WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KID` i old-key keyring vrednosti; client profil ih ne zahteva;
- vendor/client template-i dobijaju `NR_ADDON_INSTALLATION_ENCRYPTION_KID` i old-key keyring; installation DB red dobija `private_key_kid`, versionirani envelope/AAD i batch rewrap bez menjanja Ed25519 identiteta;
- shared installation fingerprint helper parsira PEM kroz `createPublicKey`, zahteva `asymmetricKeyType=ed25519`, izvozi canonical SPKI DER (`format=der,type=spki`) i vraća tačno `sha256:` + lowercase SHA-256; CMS i master ne hashiraju raw PEM tekst;
- identity/activation schema dobija `installation_fingerprint_scheme=ed25519_spki_der_sha256_v1`; legacy raw-PEM UTF-8 fingerprint redovi ostaju eksplicitno `legacy_pem_utf8_sha256_v0` dok dedicated signed rebind/re-enroll ne dokaže staru i novu installation vezu. Metadata-only rewrite fingerprinta/scheme je zabranjen;
- vendor/client template-i dobijaju različite `NR_ADDON_TRANSFER_APPROVAL_SECRET`, `NR_ADDON_TRANSFER_APPROVAL_KID` i `NR_ADDON_TRANSFER_APPROVAL_OLD_SECRETS_JSON`; local pending-transfer red čuva derivation KID/binding/expiry, a compromise otkazuje sve otvorene transfere pogođenog KID-a umesto overlap-a;
- license-server settings dobijaju `WEBSHOP_LICENSE_SERVER_SECRET_KID`, old-key keyring i `auth_secret_kid`; legacy credential ciphertext prolazi explicit decrypt/rewrap, ne metadata-only backfill;
- vendor/client koriste durable `NR_ADDON_ENTITLEMENT_PUBLIC_KEYS_CACHE_FILE`; vendor dodatno koristi purchase-intent keyset URL/cache, a restart proverava poslednji validni cache hash/schema;
- vendor/client template-i dobijaju različite `WEBSHOP_DEPLOYMENT_RESULT_AUTH_KID/SECRET` vrednosti; worker static secret store referencira odgovarajući par, odvojen od CMS→worker redeploy HMAC-a;
- `allowedDevOrigins` ostaje ograničen na `vendor.nr.test` i `client.nr.test` u lokalnom dev setupu;
- `NR_ALLOW_INSECURE_LOOPBACK_HTTP` ostaje `false` u `.nr.test` E2E-u.
- implementirati per-target `nr_cms_*_core_owner` NOLOGIN, `nr_cms_*_core_migrator` i `nr_cms_*_runtime` role, canonical `CmsCorePrivilegeManifestV1`, operator-only `db:core:provision` i `db:core:migrate` CLI-jeve iz dokumenta 02. Runtime `DATABASE_URL` nikada nema DDL/SET ROLE/nr_control/drugi-target prava; migrator secret je DPAPI LocalMachine u Administrators/SYSTEM-only operator root-u, ne CMS/worker env-u;
- core migrator radi checksum dry-run/apply/final-check pod exact owner rolom, postavlja/auditira public-schema runtime default+explicit grantove i startup fail-uje na pending/drifted ledger. Potpuno prazna DB, upgrade i isolated restore fixture proveravaju owner/ACL/ledger, normalni runtime core CRUD i negativni DDL/GRANT/SET ROLE/`nr_control`/`pg_authid`/other-target tok;

### 4.3 Webshop promene

Relevantno:

    src/lib/outbound-url.ts
    src/data/webshop-license-server-api.ts
    tests/outbound-url.test.ts
    tests/fixtures/hmac-v2-canonical.json

- uskladiti canonical hostname i HTTPS pravila: invalidan origin userinfo/path/query/fragment se odbija, ne sanitizuje; produkcija odbija IP/localhost/`.nr.test`, a development prihvata samo eksplicitno allowlisted `.nr.test` hostove;
- self-hosted private/reserved adresu dozvoliti samo kada je host na eksplicitnoj allowlist-i i `NRLS_ALLOW_SELF_HOSTED_OUTBOUND=true`;
- ne uvoditi opšti „disable SSRF” flag;
- dodati fixtures za `vendor.nr.test`, `client.nr.test`, trailing dot, port, IDN i nevalidne ulaze; IPv4/IPv6 literal-i su eksplicitni reject vektori u svim profilima.

### 4.4 Master promene

Relevantno:

    src/lib/activation-domain.ts
    src/lib/request-security.ts
    scripts/validate-runtime-env.ts
    .env.example
    next.config.ts

- koristiti isti canonical contract/test vectors;
- zadržati `license.nr.test` kao dozvoljeni dev origin;
- validirati `NRLS_PUBLIC_URL=https://license.nr.test` i `NRLS_ENVIRONMENT=development` za lokalni E2E;
- zameniti plain entitlement KID→PEM mapu hash-pinovanim versioned `NRLS_ENTITLEMENT_PUBLIC_KEYSET_FILE/SHA256` contractom i exact `/.well-known/nr-license-keys.json` response-om;
- dodati `NRLS_SECRET_DECRYPTION_KEYS_JSON`, versionirani envelope KID i locked batch rewrap za stare master ciphertextove;
- `NR_MIGRATION_TARGET=development` koristi non-production lokalni migration tok;
- testirati da public origin nije pogrešno upotrebljen kao hostname sa portom.
- koristiti isti Ed25519 SPKI-DER fingerprint helper/scheme kao CMS; non-Ed25519, malformed key i claim mismatch padaju pre challenge/activation mutation-a.

### 4.5 Shared contract artefakti

Pošto su repozitorijumi odvojeni, ne importovati source kroz relativnu `.private` putanju. Napraviti verzionisane JSON fixture-e/schema dokumente koje svaki repo kopira ili dobija kroz mali, posebno verzionisan contracts paket tek ako se pokaže opravdanim. CI proverava isti contract version i iste test vektore u sva tri repoa. Fingerprint fixture sadrži isti Ed25519 key u više validnih PEM/newline formata i exact isti SPKI-DER hash, plus RSA/EC reject i legacy signed-rebind vektore.

### 4.6 Acceptance gate

- clean vendor/client checkout bez `.private` prolazi env validate i base build;
- `development/private_workspace` i dalje radi u `D:\nr_cms`;
- vendor i client daju različit canonical domain;
- CMS entitlement verifier i master potpisuju/porede identičnu vrednost;
- HTTP ka `.nr.test` se odbija, trusted HTTPS prolazi;
- HTTPS `license.nr.test` koji se razrešava na loopback prolazi samo sa oba eksplicitna self-hosted/host-allowlist uslova; isti poziv bez njih se odbija;
- HMR radi preko Caddy origin-a bez broad wildcard-a.
- server-side Node `fetch` prolazi trusted Caddy TLS sa `NODE_USE_SYSTEM_CA=1`/pinovanim CA putem, bez gašenja certificate verifikacije.
- master, vendor credential i installation envelope fixture-i prolaze active+old KID decrypt, legacy classification, rewrap, zero-count i restart/restore test; nijedna rotacija ne menja installation fingerprint ili HMAC client identitet.
- `db:core:provision` + `db:core:migrate` na obe prazne target baze daju redigovane receipts bez pending migracije; CMS service radi pod runtime rolom i normalni core CRUD prolazi, dok migration/owner/`nr_control` capability ostaje nedostupan.

## 5. Faza 1 — Master bootstrap, product i HMAC V2 provisioning

### 5.1 One-time bootstrap admin

Relevantno:

    .private/license-server/src/lib/bootstrap.ts
    .private/license-server/app/login/actions.ts
    .private/license-server/scripts/reset-local-admin.mjs
    .private/license-server/app/change-password/*

Dodati, na primer:

    scripts/bootstrap-admin.ts
    npm run admin:bootstrap -- --password-file <ACL_PROTECTED_INPUT_PATH>

Contract:

- radi samo ako baza ima nula admin korisnika;
- uzima DB advisory lock da dva procesa ne kreiraju dva admina;
- credential kriptografski generiše operator/password manager i daje ga kroz postojeći ACL-protected input fajl van repoa; CLI ga ne generiše posle DB mutacije;
- CLI pre mutacije proverava absolute path, regular-file/reparse status i najrestriktivniji praktični Windows ACL;
- admin je označen `mustChangePassword`;
- ponovno izvršenje deterministički odbija zahtev;
- package script izvršava baš TypeScript entrypoint kroz pinovani project `tsx` runner; ne održavati paralelni `.mjs` bootstrap koji može divergirati;
- login request više nema implicitnu mutation/bootstrap granu;
- audit beleži bootstrap bez passworda.
- fault-injection testovi pre/posle DB commita dokazuju da operator uvek zadržava poznat credential i da nema drugog admina; nema lažne DB/filesystem atomicnosti.

### 5.2 Product type i manual issuance

Relevantno:

    .private/license-server/src/db/schema.ts
    .private/license-server/app/admin/actions.ts
    .private/license-server/app/admin/product-types/new/page.tsx
    .private/license-server/app/admin/product-types/[id]/*
    .private/license-server/src/data/licenses.ts

Implementirati:

- `requiresDomain` kontrolu u create/edit UI/action i server-side validaciji;
- `addonKey=webshop` validaciju/mapping;
- manual license formu koja prihvata i canonicalizuje domen;
- zabranu issuance-a bez domena kada product type to zahteva;
- lifetime semantics `durationDays=0`;
- environment-bound mutable catalog head + immutable revision history sa punim RFC 8785/JCS poslovnim projection snapshotom i stabilnim `nrls-catalog-v1:<ENVIRONMENT>:<DECIMAL_REVISION>:sha256:<64_LOWERCASE_HEX>` contractom; revision se menja samo pri stvarnoj mutaciji, ne pri GET-u ili no-op save-u;
- offer/intent catalog FK i consume/issue lookup moraju koristiti istorijski SKU duration/activationLimit/edition/features snapshot, ne današnji mutable SKU red;
- catalog `ETag`/`If-None-Match`, drift proveru i offer revalidation stanje posle stvarne mutacije;
- audit za product/SKU i manual issue promene.
- eksplicitni `manualIssuerApiClientId` FK/config za administratorsko izdavanje; action ne sme birati najnoviji API client po `createdAt`.

### 5.3 V2 API client secrets i scopes

Relevantno:

    .private/license-server/src/lib/api-auth.ts
    .private/license-server/src/db/schema.ts
    .private/license-server/app/admin/actions.ts
    .private/license-server/app/admin/api-clients/*
    .private/license-server/app/api/v1/catalog/route.ts
    .private/webshop/src/data/webshop-license-server-api.ts
    .private/webshop/src/data/webshop-license-servers.ts
    .private/webshop/src/admin/settings/license-servers-manager.tsx
    .private/webshop/src/admin/settings/actions.ts

Master create/rotate transakcija mora:

1. kreirati/update-ovati `api_clients` metadata;
2. generisati eksplicitni secret KID;
3. upisati `api_client_secret_versions` red;
4. otkriti client ID, KID i secret samo jednom;
5. pri rotaciji ostaviti konfigurabilan overlap, zatim opozvati stari KID;
6. podržati admin UI/CLI za product type, SKU, action i environment scope;
7. zabraniti broad/global scope po defaultu.

Webshop mora:

- dodati `authKeyId` u license-server settings schema/action/UI;
- slati `X-NRLS-Auth-Version: 2` i `X-NRLS-Key-Id` kroz `buildWebshopLicenseServerCatalogRequest`, `buildWebshopVendorLicenseV2IssueRequest` i `buildWebshopVendorLicenseV2LifecycleRequest`;
- koristiti potpuno isti canonical HMAC builder;
- čuvati secret enkriptovan, a KID kao neosetljivu metadata vrednost;
- odbiti V1 fallback kada je V2 flag obavezan.

### 5.4 Migracije i testovi

- nova migracija samo ako finalni secret/scope/UI model zahteva nova polja/constraint-e;
- migration mora bezbedno klasifikovati postojeći `legacy-1`, ne generisati novi plaintext secret;
- master contract i PostgreSQL integration testovi za create, rotate, overlap, revoke, scope deny/allow, nonce replay i idempotency;
- Webshop stvarni catalog request builder se testira protiv master fixture/verifikatora, ne samo pure canonical helper;
- catalog revision/history je environment-bound i wire format je tačno `nrls-catalog-v1:<ENVIRONMENT>:<DECIMAL_REVISION>:sha256:<64_LOWERCASE_HEX>`; svaki offer/intent/issue red ima composite `(environment,catalogVersion)` FK;
- dva neizmenjena catalog GET-a u istom environmentu moraju vratiti identičan `catalogVersion`/ETag; no-op update ga ne menja, stvarna mutacija ga povećava, concurrent update/drift/cross-environment testovi prolaze, a stari consumed intent posle mutacije izdaje po starom immutable policy snapshotu.

### 5.5 Acceptance gate

- prazna master baza može se bootstrapovati i loginovati bez ručnog SQL-a;
- UI kreira domain-required Webshop product i četiri SKU-a;
- manual vendor lifetime ključ zahteva `vendor.nr.test`;
- novi vendor API client odmah radi sa svojim KID-em;
- catalog sync preko `https://license.nr.test/api/v1` vraća četiri SKU-a;
- ponovljeni neizmenjeni sync vraća isti durable catalog identitet;
- pogrešan KID, nonce replay i scope mismatch se odbijaju;
- credential nije prisutan u logu ili kasnijem UI prikazu.

## 6. Faza 2 — GitHub Packages release i master release catalog

### 6.1 Webshop package hardening

Relevantno:

    .private/webshop/package.json
    .private/webshop/migrations.json
    .private/webshop/src/db/migrations/0001_webshop_core.sql
    .private/webshop/src/db/schema.ts
    db/schema.ts
    scripts/run-drizzle-migrations.mjs
    scripts/db-webshop-schema-cutover.mjs
    lib/webshop-addon/host-route-bindings.ts
    .private/webshop/src/manifest.ts
    .private/webshop/scripts/build-release.mjs
    .private/webshop/scripts/verify-release-artifact.mjs
    .private/webshop/scripts/verify-publish-ready.mjs
    .private/webshop/scripts/verify-npm-pack.mjs
    .private/webshop/.github/workflows/publish-package.yml

Implementirati:

- package `files` uključuje potpisane `migrations/*.sql` payload-e;
- `migrations.json` referencira relativni fajl, ID, redosled i checksum;
- release inventory i aggregate hash pokrivaju migration fajlove;
- release workflow iz clean Webshop lockfile-a i pinovanih Node/npm verzija generiše strict JCS `release-dependency-lock.json`, uključuje ga u tarball/inventory i manifest potpisuje exact `dependencyLockSha256`;
- dependency contract pin-uje kompletan addon-reachable production graph: node `name/version/integrity/registry`, sortirane production/optional/peer edge-ove i target platformu; node ID i zbirni graph proveravaju se exact algoritmom iz dokumenta 03;
- autoritativni dependency-graph job radi na stvarnom Windows x64 runneru sa `core.autocrlf=false` i pinovanim Node/npm verzijama, zato `win32/x64` optional/platform rezoluciju ne izvodi običan Linux `npm ci`; postojeći Linux pack/sign/publish job prihvata samo hash-verifikovan graph output istog workflow run/attempt-a i nije graph authority;
- verifikator odbija sve `local-dev:*`, fixture i acceptance KID-eve u non-development modu;
- production verifikacija koristi eksplicitnu KID allowlist-u;
- manifest ima stabilan `releaseId`, `manifestVersion=2`, runtime contract, CMS/Node/Next range, minimum core/target/supported-addon-schema bounds, supported license editions, schema version i migration bundle hash;
- workflow posle pack/publish-a pravi detached signed publication attestation koji isti release ID veže za tarball SHA-256/SRI, embedded-manifest/provenance/SBOM hash, registry package-version ID i registry-attested `publishedAt` bez circular hash-a; source `releasedAt` ostaje zaseban `sourceReleasedAt`;
- tarball ostaje restricted `@radomirradojevic/webshop` na GitHub Packages;
- package boundary test potvrđuje da nema sourcea, `.env`, ključa ili CMS privatne putanje.
- zameniti nekompatibilni package 13-table schema/`0001` model canonical `pgSchema("webshop")` source-of-truth-om: 45 tačno allowlisted postojećih business tabela iz dokumenta 03 plus `webshops` anchor i `webshop_settings`. Svaki SQL identitet je schema-qualified; `webshop_addon_entitlements`, `cms_addon_*`, license-server/customer-issuer i generic rate-limit tabele ostaju `public` control-plane;
- novi signed migration descriptor uključuje `postconditionSchemaFingerprintSha256`; addon runner introspektuje `(schema,table)` i posle svakog koraka proverava structural fingerprint, dok zaseban privilege manifest vezuje owner/runtime grantove. Stari 0.5.0 `0001` se nikada ne primenjuje/seeduje;
- root `db/schema.ts` i core migracije prestaju da budu source of truth za Webshop business model; direktne root data/ruta reference sele se u package typed delegate. Finalna core-detach migracija na dokazano praznoj bazi uklanja samo exact prazne legacy public business tabele bez `CASCADE`; populated/drifted DB vraća operator cutover required, ne radi automatski destructive move;
- implementirati admin-authorized, backup-required `db:webshop-schema-cutover` za populated legacy DB: exact 45-table allowlist/fingerprint, transactional `SET SCHEMA`, owner handoff, `webshops`/settings/order-counter backfill, cross-schema FK/index/check i ACL reconciliation, row-count/aggregate receipt i idempotentan recovery. Tek exact postcondition dozvoljava `legacy_applied`; nema automatskog down-move-a;
- `webshop_addon_entitlements.metadata` više ne drži business settings/storefront presets/order allocator; versionirani backfill ih premešta u `webshop.webshop_settings` i ostavlja samo control-plane metadata;
- signed `capabilities`/`runtimeContractVersion="1"` zaključavaju `HostAddonRouteBindingsV1`: stvarne Next App Router wrapper rute ostaju u base CMS commitu, package exportuje typed route/render/job delegate. Clean build bez `.private` pada na missing/duplicate/unknown binding; package `app/**` nije routable dokaz.

Ne menjati već objavljenu `0.5.0` tarball verziju. Ako su payload/manifest promene potrebne, objaviti novu semver verziju i zadržati package immutability.

### 6.2 Master release catalog

Relevantno:

    .private/license-server/src/db/schema.ts
    .private/license-server/src/data/addon-activation.ts
    .private/license-server/src/lib/vendor-addon-signing.ts
    .private/license-server/app/api/v1/entitlements/[id]/authorize-update/route.ts

`vendor_release_manifests` proširiti/dovršiti tako da bude autoritativni immutable release registry. CI samo proizvodi/downloadable immutable evidence i nema master mutation endpoint/credential. Dodati operator CLI import:

```powershell
npm run release:import -- `
  --tarball <ABSOLUTE_TARBALL_PATH> `
  --attestation <ABSOLUTE_PUBLICATION_ATTESTATION_PATH> `
  --expected-tarball-sha256 <64_LOWERCASE_HEX> `
  --expected-attestation-sha256 <64_LOWERCASE_HEX> `
  --change-ref <AUDIT_TICKET_OR_LOCAL_E2E_RUN_ID>
```

CLI zahteva absolute regular-file path, odbija symlink/reparse ulaz i path unutar source/runtime release root-a, radi pod addon-scoped PostgreSQL advisory lock-om i:

- iz tarball-a čita exact embedded release manifest, provenance, SBOM i `release-dependency-lock.json`, a kao drugi input prihvata detached publication attestation;
- proverava oba release Ed25519 purpose potpisa protiv statičkog trusted release keyset fajla i njegovog pinovanog SHA-256; nikada ne uzima key iz import body-ja;
- proverava addon/package allowlist, schema, tar/inventory safety i kompletan signed dependency graph;
- čuva ceo exact immutable tuple: release/addon/package/manifest identity, artifact, `dependencyLockSha256` i tarball SHA/SRI, embedded-manifest/provenance/SBOM/publication-attestation hash, registry package-version ID, signing KID, runtime/CMS/Node/Next compatibility, minimum core/target/supported addon-schema bounds, migration bundle, editions/channel, `sourceReleasedAt` i attested `publishedAt`, plus exact manifest/attestation/dependency-lock bytes ili content-addressed reference;
- ima tačno `draft -> published -> withdrawn` state; status je master lifecycle metadata, ne polje koje mora biti jednako immutable package manifestu;
- ne dozvoljava overwrite istog release ID-a/hash konflikta;
- upisuje samo `draft`; exact retry je idempotentan, a isti release/package identity sa drugim evidence bytes/hashom je hard conflict;
- auditira import/activation/withdrawal.

Odvojeni operator korak:

```powershell
npm run release:publish -- `
  --release-id <UUID> `
  --expected-attestation-sha256 <64_LOWERCASE_HEX> `
  --change-ref <SAME_AUDIT_REFERENCE>
```

pod istim lockom i sa optimistic očekivanim hashom radi samo `draft -> published`, bez menjanja immutable polja, i auditira actor/reason. Ne uvoditi CI-callable HTTP mutation endpoint kao alternativu ovom prvom contractu.

Activation više ne bira package samo iz `PACKAGE_CONFIG`; product/addon policy bira `published` kompatibilni release zapis. Stable channel prihvata samo normalized exact `MAJOR.MINOR.PATCH` bez prerelease ili build metadata i ima unique `(addonKey,normalizedSemVer)`. Selector prvo filtrira sve eligibility/policy/schema/migration/edition/update uslove, zatim deterministički sortira: najviši SemVer precedence, `publishedAt` descending, pa `releaseId` lexical ascending. `updatesUntil` poredi isključivo sa attested `publishedAt`, nikada `sourceReleasedAt`; shared fixture sa backdated commitom objavljenim posle cutoff-a mora pasti.

Revalidation nikada implicitno ne bira nižu SemVer verziju od installed release-a. Downgrade/rollback je zasebna auditovana operacija sa explicit target `releaseId`, actor/reason, schema compatibility i signed rollback policy proverom. Concurrent import/publish/activation fixture sa više eligible release-a mora dati isti winner na svakoj instanci i dokazati unique normalized version.

Master env/template dobija trusted release keyset file/hash iz dokumenta 02. Worker statička target konfiguracija koristi isti odobreni keyset sadržaj/hash. Consumer čuva accepted sequence/hash i proverava `previousKeysetSha256`; niži sequence ili isti sequence/drugi hash je incident. Rotacija prvo distribuira overlap keyset masteru/workeru, tek zatim objavljuje release novim KID-em; stari verification-only KID ostaje kroz rollback prozor, a kompromitovan KID odmah postaje `revoked` i povlači pogođene release/jobove.

### 6.3 CMS registry input

Relevantno:

    addons.registry.json
    addon-release-public-keys.json
    scripts/generate-addon-registry.mjs
    lib/addon-runtime/release-manifest.ts
    tests/addon-release-signing.test.mjs
    tests/addon-install-boundary.test.ts

- formalizovati strict registry entry schema, uključujući `dependencyLockSha256` uz release/artifact identitet; pinovani CMS commit je autoritet za exact base `package.json`/`package-lock.json`, a worker beleži zasebne base/merged manifest+lock hash-eve, npm-compatible cacache/packument inventory i strict diff dokaz;
- production keyset i registry se generišu u release workspace-u, ne kroz `.tmp` local authority;
- generator proverava exact package, release ID/version/hash/KID i signed entrypoint inventory;
- npm tarball integrity se vodi odvojeno od release artifact SHA-a;
- unknown/development KID je hard failure.

### 6.4 Acceptance gate

```powershell
# Webshop source
npm run release:check:local
npm run install:verify:next
npm run pack:release:local -- <TEMP_DESTINATION>

# CMS source/clean fixture
npm run addons:registry
npm run deploy:verify
npm run acceptance:local:private-packages
```

Pored lokalnog potpisnog testa, GitHub Actions mora objaviti novu exact verziju iz pravog `radomirradojevic/webshop` repoa i clean worker fixture mora je instalirati GitHub Packages read credentialom. Autoritativni graph job je Windows x64. Fixture menja po jedan addon transitive node, edge, peer/optional resolution, registry i integrity i svaki slučaj mora pasti pre package koda/migracije/switch-a; neizmenjen finalni addon-reachable graph mora biti exact jednak signed `release-dependency-lock.json`. Drugi fixture pokušava da merge-om promeni postojeći CMS-core node/edge/integrity i mora pasti na base-lock/base-graph invariantu. Lokalni tarball nije konačni hosted-registry dokaz.

Schema/route acceptance dodatno zahteva: fresh DB posle core-detach nema 45 business tabela u `public`, signed addon baseline daje canonical 47-table `webshop` postcondition, a legacy backup prvo daje `operator_schema_cutover_required`, zatim exact admin cutover + `legacy_applied` uz iste row-count/FK/index/owner/ACL/fingerprint dokaze i restore. Root CMS bez `.private` ili registry entry-ja i dalje build-uje sve stvarne Next host wrappere i vraća 404/disabled delegate; clean registry install poredi package route/render/job binding capability sa `HostAddonRouteBindingsV1` i nijedna package `app/**` putanja nije jedini route dokaz.

## 7. Faza 3 — durable activation i install state

### 7.1 Master activation hardening

Relevantno:

    .private/license-server/app/api/addons/licenses/activate/route.ts
    .private/license-server/app/api/addons/licenses/revalidate/route.ts
    .private/license-server/src/data/addon-activation.ts
    .private/license-server/src/lib/vendor-addon-signing.ts
    .private/license-server/src/db/schema.ts

Implementirati:

- fingerprint se računa iz public key-a i mora odgovarati claimu;
- V2 activation challenge zahteva exact `hostCapabilities` descriptor (CMS/commit/Node/Next/runtime/core schema/installed addon schema), uključuje njegov JCS hash u installation proof bytes i upisuje descriptor/hash zajedno sa `platformSubject` i svim binding poljima;
- release selector pre activation commita bira samo `published` release koji je kompatibilan sa celim descriptorom i ima kompletan migration path; hardkodovani `PACKAGE_CONFIG` nije fallback;
- challenge cleanup job koristi dedicated auth;
- complete response V2 nosi immutable release objekat iz master kataloga;
- response razdvaja nullable `licenseValidUntil` od konačnog JWS envelope expiry-ja; lifetime više ne koristi 2099 sentinel;
- JWS claimovi uključuju release ID/hash, installation i lifecycle version;
- activation slot se zauzima atomski i replay je idempotentan;
- revalidation koristi PoP challenge/complete, prima nov signed capability descriptor, proverava license/activation status i ponovo bira compatible desired release;
- rate limit/audit ne loguju license key ili challenge signature payload.

### 7.2 CMS identity i entitlement data layer

Relevantno:

    app/dashboard/webshop/actions.ts
    lib/webshop-addon/license.ts
    lib/vendor-addon-installation.ts
    lib/vendor-addon-entitlements/verified-entitlement.ts
    lib/vendor-addon-entitlements/public-keys.ts
    data/webshop-addon-entitlement.ts
    db/schema.ts
    lib/addon-runtime/install-state.ts
    lib/addon-runtime/redeploy-callback.ts

Implementirati:

- postojeći installation identity se ne koristi ako canonical domain ili deployment mode ne odgovara; prikazati recovery/rotate odluku;
- `signedEntitlement` postaje autoritativno polje; compatibility alias se migrira/uklanja planirano;
- top-level signing/revalidation/lifecycle/install kolone se dosledno čitaju i pišu;
- nova migracija trajno čuva entitlement `releaseId`, snapshot hash/lifecycle/expiry i ceo desired/installed immutable release evidence tuple u `cms_addon_installations`: package/tarball/artifact/dependency-lock/embedded-manifest/provenance/SBOM/attestation/registry-version/time/signing/runtime/schema/migration polja, ne samo package version/hash;
- ista migracija čuva desired host-capability descriptor hash, monotoni `installation_deployment_epoch bigint` čiji je scope jedan installation ID i odvojeni `runtime_status=not_installed|ready|maintenance|unavailable`; deployment payload prenosi hash/epoch kao canonical decimal string, ne ovlašćuje request da izabere target commit;
- entitlement migracija razdvaja nullable `license_valid_until`, non-null `entitlement_envelope_expires_at`, `next_revalidation_at` i `grace_ends_at`; legacy `expires_at` dual-read/backfill verifikuje JWS/SKU i nikada ne pretvara 2099 sentinel u stvarni business rok;
- aktivacija posle JWS provere u jednoj DB transakciji upisuje entitlement, `cms_addon_installations`, `cms_addon_operations` i deployment outbox;
- mrežni callback se ne radi u transakciji i greška se ne guta; callback nikada nije drugi writer installed/current/`ready` tuple-a — uspešan fenced reconciliation je jedini writer, dok callback samo trajno vezuje autentifikovani terminalni result/ACK za operation i za failure grane ažurira operation/runtime failure metadata;
- logical desired ključ je `deploymentIntentKey=addon-deploy-intent:v3:<installationId>:<epoch>:<releaseId>`, a svaki worker run koristi `operationKey=addon-deploy:v3:<installationId>:<epoch>:<releaseId>:<generation>`; unique `(intent,generation)` i partial unique current operation sprečavaju duplikat bez zabrane auditovanog generation+1 requeue-a;
- promena desired release-a ili entitlement snapshot-a atomski povećava epoch i označava svaki stariji non-terminalni operation `superseded`; transport retry istog desired stanja zadržava epoch/generation/key;
- CMS durable operation state ima tok `license_accepted -> install_pending -> installed -> migration_pending -> ready` ili `failed`. Activation transakcija je jedini writer prva dva stanja; fenced worker na istoj target DB konekciji CAS-om postavlja `installed` tek posle offline install/build verifikacije i `migration_pending` neposredno pre migration runnera; candidate reconciliation upisuje samo non-serving evidence, a atomarni ready-finalizer jedini promoviše installed serving tuple/runtime i `ready` zajedno sa success receipt-om;
- UI dobija operation ID i realno `install_pending`, ne trenutni optimistic success;
- `packageInstalledAt`, installed evidence tuple, `readyAt` i immutable success receipt u jednoj fenced transakciji postavlja samo `finalizeAddonReadyReceiptOnConnectionV1`.

### 7.3 Deployment outbox publisher

Dodati dedicated background CLI/worker adapter, na primer:

    scripts/run-addon-deployment-outbox.mjs

ili integrisati u postojeći pouzdan worker framework. Contract mora imati:

- `FOR UPDATE SKIP LOCKED` lease;
- heartbeat/recovery;
- exponential backoff sa jitterom;
- max attempts i DLQ;
- HMAC callback V2;
- `202 jobId` persistence;
- epoch/intent/generation/supersedes payload i full release/entitlement evidence;
- closed `errorClass=retryable|permanent|incident|null` i exact result tuple/ACK contract;
- idempotentno procesiranje istog outbox reda.

### 7.4 Acceptance gate

- invalid license/key/domain ne kreira install state ni outbox;
- validan response prvo je durable, pa tek onda šalje job;
- callback outage ponavlja isti dispatch/result ID/body; ako je success reconciliation već commitovan, runtime ostaje `ready` a operation receipt ostaje pending, dok failure pre reconciliation-a ostaje durable `install_pending|failed` prema dokazanoj finalnoj fazi. Ne stvara se nova generation samo zbog nepoznatog callback ishoda;
- duplicate activation/retry daje isti epoch/intent/generation/operation key;
- authenticated dozvoljeni retryable `rejected_before_switch|rolled_back` može CAS-om napraviti generation+1 sa `supersedesOperationId`; permanent/incident/maintenance/rollback failure ne može;
- DB clone na drugi domen detektuje identity mismatch;
- lažni/zastareli capability descriptor ili target koji ne odgovara hash-u pada pre migracije i switch-a;
- UI ne prikazuje `ready` pre reconciliation-a.
- desired `status` i serving `runtime_status` ostaju odvojeni: rollback success je `failed+rolled_back+ready`, initial failure `failed+rejected_before_switch+not_installed`, incompatible schema `failed+maintenance_required+maintenance`, a rollback failure `failed+rollback_failed+unavailable`.

## 8. Faza 4 — privatni addon deployment worker

### 8.1 Repo i granica

Kreirati zaseban private repo, preporučena lokalna putanja:

    D:\nr_cms\.private\addon-deployment-worker

Ne objavljivati worker kao CMS package i ne uključivati ga u vendor/client checkout. Repo sadrži:

    src/http/receiver
    src/auth/redeploy-hmac-v2
    src/jobs/store-and-lease
    src/targets/static-config
    src/releases/workspace
    src/npm/registry-install
    src/releases/verify
    src/migrations/runner
    src/services/windows-adapter
    src/health/check
    src/callback/result
    src/db/schema
    src/db/migrations
    tests/

Tačna struktura prati izabrani runtime, ali trust granice moraju ostati iste. Prvi contract zaključava dedicated PostgreSQL bazu `nr_addon_deployment_worker_test` lokalno i `NR_ADDON_DEPLOYMENT_WORKER_DATABASE_URL` kao jedini connection env. SQLite/in-memory/file fallback nije dozvoljen.

Operator ručno kreira bazu i least-privilege worker DB user-a; repo automatizuje versionirane migracije, checksum ledger i `npm run db:migrate:check`, `npm run db:migrate`, završni check. `.env.example`, validator, startup redaction i health proveravaju prisustvo/target baze bez logovanja connection stringa. Minimalne normalizovane tabele su:

- `addon_deployment_target_states`: jedan red po `(target_profile,addon_key,installation_id)`, `highest_accepted_epoch bigint`, `highest_generation integer`, current operation i optimistic version;
- `addon_deployment_target_mutexes`: jedan red po target profilu sa owner jobom, monotonim fencing tokenom, lease/heartbeat i optimistic version poljima; dedicated job-store PostgreSQL session advisory lock je izvršni mutex kroz filesystem/service/DB mutation, reconciliation, final readiness i terminalni receipt između različitih installation identiteta;
- `addon_deployment_jobs`: target/installation, epoch, intent key, generation, operation ID/key, supersedes ID, request hash/body snapshot, release/evidence, lease/heartbeat, status/errorClass/result i audit vremena;
- `addon_deployment_request_replays`: KID/request ID/body hash/expiry sa unique replay zaštitom;
- `addon_deployment_result_outbox`: unique result ID i unique `(operation_id,worker_job_id)`, exact canonical body/hash/final tuple, lease/attempt/backoff/DLQ, authenticated ACK i vremena.

Constrainti uključuju unique operation key, unique `(deployment_intent_key,generation)`, monotonic CAS po `(target_profile,addon_key,installation_id)` i jedan autoritativni `(operation_id,worker_job_id) -> (result_id,body_hash,final_tuple)` binding. Exact isti terminalni result je replay; drugi result ID/body/status za isti par je incident conflict. Target mutex contract koristi dedicated job-store konekciju sa versionirano izvedenim session advisory lockom, CAS lease/owner redom i monotonim fencing tokenom; gubitak konekcije, lease-a ili ownershipa prekida dalju target mutaciju, a takeover prvo radi state/pointer/CMS-fence recovery. Pre rollouta uraditi backup i isolated restore fixture koji očuvava installation-scoped highest epoch, target mutex, queued/running job, replay i result-outbox state. Restore u current store ne sme spustiti epoch ispod odgovarajućeg CMS installation epoch-a niti target fencing token; mismatch je incident/manual reconciliation. Worker DB backup ID postaje deo deployment evidence-a.

CMS migracija u oba targeta mora eksplicitno dodati:

- `cms_addon_deployment_candidates`, unique po `(operation_id,worker_job_id,epoch,generation)`, sa non-serving release/package/artifact/build/ledger tuple-om i nullable `terminal_receipt_id`;
- `cms_addon_serving_fences`, sa partial unique jednim `state=active` redom po `(target_profile,addon_key)`, exact installation/operation/job/epoch/generation/pre-serving bindingom i terminalnim `resolved_success|resolved_recovery|resolved_no_mutation` stanjem;
- immutable `cms_addon_deployment_terminal_receipts` (ili tri strogo tipizirana ledger pogleda) sa unique `(operation_id,worker_job_id)`, closed kind `reconciliation_receipt|recovery_receipt|no_mutation_receipt`, canonical evidence hashom i tačno jednim final tuple-om;
- `installed_build_id` i sva ostala promoted serving-evidence polja na installation redu.

DB provisioning/migration change set dodatno uvodi dedicated `webshop` schema-u čiji je owner exact per-target `nr_cms_*_webshop_deployer`, dok CMS koristi zasebnu `nr_cms_*_runtime` login rolu. Versionirani privilege manifest i njegov hash vezuju schema/owner/runtime role, table `SELECT|INSERT|UPDATE|DELETE`, sequence `USAGE|SELECT`, object allowlist i zabranjene core schema-e. Provisioner postavlja `ALTER DEFAULT PRIVILEGES FOR ROLE <DEPLOYER> IN SCHEMA webshop`, backfilluje/auditira explicit grantove starih objekata, a fixed controller reconciler radi isto za novokreirane objekte. Addon migration SQL ne sme menjati schema/owner/role/grant; posle nove tabele/sekvence i posle isolated restore-a service-SID/runtime-role CRUD prolazi, dok core-table, DDL i deployer-access negativni smoke padaju.

DB CHECK/FK/unique pravila zahtevaju da candidate terminalReceiptId pokazuje receipt istog operation/job tuple-a; active serving fence nema receipt/resolved vreme, resolved fence ih ima; success receipt tuple se tačno poklapa promoted installed release/build/artifact/ledger vrednostima. Redovi se ne hard-delete-uju kroz normalan deploy tok.

### 8.2 Receiver i job state machine

Implementirati V2 contract iz [05 — Aktivacija i deployment worker](05-aktivacija-i-deployment-worker.md):

- target-specific route i KID;
- exact `NR-DEPLOY-HMAC-V2` request/response canonical byte contract, header names i shared fixture iz dokumenta 05;
- timestamp/body size/content-type/replay provere;
- exact static target mapping;
- allowlist samo `@radomirradojevic/webshop`;
- exact stable-channel SemVer, release ID i ceo immutable release/entitlement evidence iz requesta, uključujući signed `dependencyLockSha256`, dok CMS SHA dolazi samo iz statičke target konfiguracije;
- durable epoch/intent/generation/operation key/request hash; worker installation-scoped target-state CAS prihvatanjem višeg epoch-a supersede-uje niže queued poslove samo istog `(targetProfile,addonKey,installationId)` i nikada kasnije ne izvršava niži epoch. Zasebni target mutex serializuje mutation/switch, pa novi installation ID sa epochom 1 nije stale samo zato što je stari installation imao veći epoch;
- receiver zaključava target-state red i primenjuje exact pair-CAS: lower epoch odbija; higher epoch zahteva generation 1 i atomski resetuje highest generation na 1; isti epoch/same generation prolazi samo kao exact operation/body-hash replay; isti epoch/+1 prolazi samo uz exact dozvoljeni terminal retryable predecessor i `supersedesOperationId`; niža/gap/reset/binding mismatch generation pada. State update, job insert i unique operation/intent-generation constraint commit-uju se zajedno;
- brz `202`, zatim lease worker;
- callback-only completion contract: zasebni per-target result KID/secret, durable worker result outbox i exact `POST /api/internal/addons/deployment-results`; CMS prvo verifikuje result prema immutable historical operation/outbox snapshotu, current tuple koristi samo za `applied` naspram stale ACK-a, i nikada ne menja current stanje zbog late result-a. `ready`/recovery/no-mutation grane nose exact terminal-evidence kind/hash, ACK je `applied|duplicate|stale_installation_ignored|stale_epoch_ignored|stale_generation_ignored`; različit installation ID se klasifikuje pre i bez numeričkog epoch/generation poređenja, a polling nije paralelni core protokol.
- exact `WindowsScmCmsServiceAdapterV1` iz dokumenta 02: statički `NRVendorCms|NRClientCms`, service SID, WinSW/XML/launcher/Node putanje i hash-evi, current/env/port i 60/90 s rokovi. Adapter radi inspect + PID/start-time/current/hash/port proveru, SCM stop do potvrđenog `STOPPED`, pointer CAS, named-service start i loaded-release proveru; nema `taskkill`, PID-only fallback, request-provided command/path/service/port ni `npm run dev` target. Drift, PID reuse, auto-restart ili timeout ostavlja active fence i ulazi u incident recovery.

Pre WinSW installa implementirati operator-only `npm run target:bootstrap -- --target vendor|client --cms-sha <PINNED_SHA>`. CLI koristi isti target mutex/path containment i statički target config, trusted source export, base-lock hash/verified public offline install, prazan production addon registry, non-secret build-env/network-denied build i immutable `core-bootstrap-<BOOTSTRAP_ID>` receipt; nema entitlement, Webshop package ili addon migraciju. Exact input retry je idempotentan, drift/current conflict je incident. Crash pre/posle final rename-a i first-junction CAS-a i vendor/client isolation su obavezni fixture-i; ad-hoc kopiranje checkout `.next`/`node_modules` je zabranjeno.

### 8.3 Immutable build/deploy

Po targetu:

    D:\nr_deploy\vendor\releases\<job-id>
    D:\nr_deploy\client\releases\<job-id>

Algoritam:

1. export pinovanog CMS commita iz trusted mirror-a;
2. dokaz da `.private`, `.env`, `.next`, `node_modules` nisu preneti;
3. pre bilo kakvog installa worker iz pinovanog CMS commita čuva exact base `package.json`/`package-lock.json` bytes i računa `cmsBasePackageJsonSha256` i `cmsBasePackageLockSha256`;
4. worker pin-uje Node/npm/`pacote`/`cacache`, pravi nov job-local npm cacache (`NPM_CONFIG_CACHE`, nikad user/global cache). Credentialed fetch child A preuzima samo exact root packument/private tarball kroz one-shot token handle; zatim se child/config/token uklanjaju i secret-free verifier proverava SHA/SRI, safe extract, manifest, publication attestation, `release-dependency-lock.json`, potpise/hash-eve/putanje/platformu i pravi immutable transitive fetch plan;
5. zasebni credentialed fetch child B dobija samo exact verified addon plan i trusted base-lock fetch plan, bez install/lifecycle izvršenja, i kroz pinovani `pacote` puni potrebne npm packument + content/integrity cacache entry-je. Posle gašenja/credential-canary scan-a secret-free auditor za svaki root/addon/base node radi offline `pacote.manifest`/tarball read, proverava selected name/version/SRI/registry/edge skup i zamrzava cache inventory/hash; missing packument/content/offline entry ili extra node pada;
6. install koristi disposable kopiju verified npm cacache-a i token-free user config sa exact `registry=https://registry.npmjs.org/` + `@radomirradojevic:registry=https://npm.pkg.github.com` mapama, ali bez `_authToken`/auth headera/secret ref-a; iste mape čuvaju fetch/offline packument cache ključeve. `NPM_CONFIG_OFFLINE=true`, blokiran outbound i pinovani npm su obavezni. Offline lock merge (`npm install --package-lock-only --offline --ignore-scripts --save-prod --save-exact`) sme u base `package.json` dodati samo exact addon production dependency, a strict lock diff sme dodati samo signed addon-reachable node/edge skup; nijedan drugi manifest field niti postojeći CMS core node/edge/version/resolved/integrity/peer/root field ne sme se promeniti. Sledi `npm ci --offline --ignore-scripts`, installed-graph i cache-delta audit i dokaz da nijedna registry/worker/runtime tajna nije prešla u sledeću fazu;
7. worker meri actual CMS/commit/Node/Next/runtime/core/addon-schema descriptor, zahteva isti hash kao master/CMS job i statička target policy i završava sve time/key/schema/provenance provere, uključujući `provenance.materials.cmsGitSha == static target CMS SHA`; V1 pre DB lease-a odbija svaki migration descriptor osim `destructive=false,rollbackPolicy=expand_compatible`. Initial install bez prethodnog serving release-a sme primeniti verified non-empty bundle dok addon ostaje nedostupan; samo update sa postojećim serving release-om pre prvog migration write-a zahteva da njegov signed schema range uključuje finalnu novu verziju (`unsupported_online_migration` inače);
8. production addon registry generation;
9. typecheck/deploy verify/build u network-denied sandboxu sa eksplicitnom non-secret build allowlistom; build validator ne zahteva service-runtime tajne i ne učitava target `.env` u child process;
10. long-lived DB-phase controller pod zasebnim `NRAddonDbCredentialBroker` SID-em preko `os_secret_ref_local` lease-a radi identity/fence/schema-qualified classifier/dry-run/backup/apply/postcondition/ledger sa jednom dedicated konekcijom, bez registry/payment/email/HMAC/service tajni; parent komunicira samo authenticated closed-schema pipe komandama čiji ACL dozvoljava orchestrator+DB-broker i nikada ne dobija DB password/URL. Exact legacy 45-table `public` stanje završava `failed+rejected_before_switch+permanent/operator_schema_cutover_required` sa no-mutation receipt-om; posle operator cutover-a fresh host descriptor/revalidation pravi novi epoch/intent, a old 13-table `0001` ili drift je incident;
11. pod istim DB/target lockovima closed command `begin_serving_mutation_fence` durable commit-uje active per-target/addon fence pre prvog service stop/config/pointer write-a; public addon gate odmah postaje false, uključujući same-release redeploy;
12. kroz exact `WindowsScmCmsServiceAdapterV1` inspectuje target, potvrđuje PID/start-time/current/hash/port, SCM-stopuje literal named WinSW servis do `STOPPED` bez kill fallbacka, atomically menja current junction, SCM-startuje isti servis i potvrđuje novi PID/loaded release u 90 s; puni runtime env ostaje u service manager/target secret store-u i dobija ga samo CMS service proces, nikada worker build/migration child;
13. HTTPS liveness/build/addon-loaded health;
14. same-connection `reconcileAddonCandidateOnConnectionV1` upisuje samo non-serving candidate tuple/evidence;
15. dok target mutex, DB controller/session advisory lock i lease i dalje važe, bounded internal candidate readiness; zatim na istoj konekciji atomarni installed/current/`ready` promotion + immutable success receipt + `active -> resolved_success` fence, ili terminalni rollback/no-mutation/maintenance receipt + odgovarajući fence resolution, pa tek onda unlock i durable result callback/ACK.

Refaktorisati env validaciju na phase-specific contracte (`download`, `verify_build`, `migration`, `service_runtime`) umesto jednog validatora koji tera build da učita sve runtime secret-e. Canary addon/fixture pokušava da pročita registry/payment/email/HMAC env u verify/build fazi i napravi outbound exfiltration zahtev posle fetch-a; oba moraju fail-closed, bez canary vrednosti u logu/release-u.

Purpose-specific CMS DB credential broker je obavezni deo workera/target provisioninga. Prvi lokalni adapter je tačno `os_secret_ref_local`: dva različita long-lived target deployer credentiala žive kao DPAPI `LocalMachine` sealed, versionirani fajlovi u dedicated root-u čiji inheritance-disabled ACL dozvoljava samo SYSTEM/Administrators/exact `NRAddonDbCredentialBroker` SID; ne koriste interaktivni CurrentUser vault i nisu u `.env`, `targets.json`, worker DB-u ili job body-ju. Orchestrator (`NRAddonDeploymentWorker`) čita samo odvojeni worker-owned secret root sa sopstvenim job-DB credentialom i redeploy/result HMAC keyringom; njegovi handle-i nisu inheritable. Nema read nad registry/target-DB/CMS-runtime root-ovima. Fetch radi odvojeni `NRAddonRegistryCredentialBroker`, a verifier/install/build odvojeni `NRAddonBuildSandbox` SID/AppContainer u no-breakaway kill-on-close Job Object-u. Elevated CMS-owned provisioning CLI pravi/proverava target deployer rolu iz versioniranog grant manifesta, atomski provisionuje sealed entry/ACL i obavezno radi DB-broker allow-smoke plus orchestrator/build deny-smoke. Rola ima `CONNECT` samo na svoju bazu, najmanji schema/object DDL/DML i fence/reconciliation pristup, bez Clerk/payment/core-content čitanja i bez `CREATEROLE|CREATEDB|SUPERUSER|REPLICATION|BYPASSRLS`.

Broker tek posle secret-free fetch/verify/build gate-a pokreće job-private long-lived DB controller pod DB-broker SID-em, koji sam dekriptuje statički ref i drži jednu konekciju/advisory fence kroz phase write, migraciju, switch fence receipts, candidate reconciliation, bounded final readiness i terminalni receipt. Parent/controller koriste orchestrator+DB-broker ACL named pipe, broker-izdat non-inheritable one-time channel key, monotoni sequence/HMAC i closed commands; build/registry SID su odbijeni, a password/URL se ne serijalizuju niti vraćaju parentu. Lease je najviše 1800 sekundi sa kraćim mutation deadline-om. `finally` zatvara controller/konekciju/lease tek posle terminalne odluke; gubitak pipe/session/lease-a prekida novu mutaciju i recovery prvo radi fenced inspection. Lokalni password se rotira add-new sealed version -> DB-broker allow-smoke + orchestrator/build deny-smoke -> active-ref switch -> drain -> DB revoke/remove. Production adapter može izdavati stvarno kratkotrajan DB credential kroz isti interface. Worker job-store credential nema nikakva prava nad CMS bazama.

Nijedan path, command, registry URL, service name ili target iz HTTP body-ja ne postaje izvršna konfiguracija.

### 8.4 Reconciliation CLI/API

CMS dobija versionirani shared `reconcileAddonCandidateOnConnectionV1(connection,input)` data-access contract koji poredi:

- desired i installed release;
- package name/version/artifact SHA/dependency-lock SHA/signing KID;
- generated registry/build ID;
- migration ledger;
- verified entitlement i runtime capability.

DB controller ga poziva na istoj dedicated PostgreSQL konekciji phase-scoped broker lease-a koja drži exact installation session advisory fence od prvog `installed`/`migration_pending` phase write-a kroz readiness i terminalni receipt. Managed tok ne otvara drugi CLI/HTTP writer. Pre service mutation-a controller durable commit-uje active `cms_addon_serving_fences` red. Candidate helper CAS-proverava epoch/intent/generation/operation i full release/entitlement evidence, ali upisuje samo non-terminalni, non-serving candidate red. Orchestrator pod još aktivnim target mutexom radi bounded internal candidate readiness; isti controller zatim u jednoj transakciji ponavlja fence provere, kopira candidate u installed/current/`ready` polja, upisuje immutable success receipt i razrešava active fence, ili pod istim lockovima radi rollback/no-mutation/maintenance receipt i odgovarajući resolution. Public gate zahteva validan entitlement, exact loaded/promoted release/build/artifact, odgovarajući terminal receipt i nula active serving fence redova. Tek tada se oslobađaju lock/konekcija/lease/mutex. Crash između migration commitova, pre serving-fence reda, oporavlja se pod istim target/installation lockovima: zero schema/ledger write može dobiti no-mutation receipt bez fence CAS-a; svaki partial write mora nastaviti isti verified set ili završiti jednim recovery receipt-om sa non-null ledger hashom (`rolled_back` samo uz kompatibilan prethodni runtime, inače `maintenance_required`; initial partial install nema `rejected_before_switch`). Result callback samo istorijski veže canonical terminalni result/evidence za operation i ACK-uje ga.

`MigrationLedgerEvidenceV1` je exact RFC 8785/JCS objekat:

```json
{
  "contractVersion": 1,
  "purpose": "addon_migration_ledger",
  "addonKey": "webshop",
  "entries": [
    {
      "migrationId": "<STABLE_ID>",
      "releaseId": "<UUID>",
      "checksum": "<64_LOWERCASE_HEX>",
      "schemaVersion": 1,
      "status": "applied|legacy_applied"
    }
  ]
}
```

Strict schema nema timestamp, error/free-text ili unknown polja; `checksum` je raw 64-character lowercase SHA-256 hex exact migration bytes-a bez `sha256:` prefiksa, entries su sortirani po UTF-8 byte vrednosti `migrationId` i ID-evi su jedinstveni. Samo spoljašnji `migrationLedgerHash="sha256:" + lowercaseHex(SHA-256(JCS_BYTES))` ima prefiks. Empty-ledger canonical bytes su `{"addonKey":"webshop","contractVersion":1,"entries":[],"purpose":"addon_migration_ledger"}`, a fixture hash je `sha256:19447974f968c03a52d3d58bc3a7ee50bc30ef7c242a7fe61be0c0cd084b5f22`.

Worker računa evidence iz committed ledger redova pod fence lock-om; isti reconciliation helper ga nezavisno recompute-uje i zahteva jednakost pre success commita. Callback ponovo validira stored historical evidence/result binding, ali ne radi drugi installed write. Result `ready|rolled_back|maintenance_required|rollback_failed` nosi non-null current hash i reconciliation/recovery receipt hash. Strogo `rejected_before_switch` pre addon-schema/service/pointer mutacije ima null ledger hash i exact `NoMutationTerminalEvidenceV1` hash; callback pod CMS fence-om proverava nepromenjen pre-operation serving/ledger tuple i menja samo current operation failure metadata. Drugačija nullability/kind/hash, promenjen redosled/checksum/schema/status ili mismatch daje `invalid_result_tuple` bez installed/runtime mutacije.

### 8.5 Acceptance gate

- validan GitHub Packages release ide `accepted -> ready`;
- promenjen/dodat/izostavljen transitive node, edge, peer/optional resolution, registry ili integrity je permanentno odbijen pre migration/switch-a;
- promena exported CMS base manifest/lock hash-a, bilo kog drugog manifest polja ili postojećeg core-root node/edge/integrity zapisa tokom addon merge-a je permanentno odbijena;
- job-local npm cacache ima offline-čitljiv packument/content entry za svaki base/addon node pod pinovanim toolchainom; missing/tampered entry pada pre merge/installa, a token postoji samo u fetch child A/B i nema ga u parent/verifier/cache/release/logu pre offline faze;
- request/HMAC/replay/package/KID tamper je odbijen;
- registry token ne postoji u logu/release-u;
- phase-env canary ne vidi registry/payment/email/HMAC/service secrets u verify/build, outbound network je blokiran posle fetch-a, a migration vidi samo target DB operation credential/context;
- vendor job ne može dirati client target i obrnuto;
- paralelan isti target je serializovan;
- novi installation ID sa epochom 1 prolazi svoj installation-scoped CAS i čeka target mutex; ne poredi se sa highest epochom prethodnog installation identiteta;
- pair-CAS fixture potvrđuje higher-epoch/generation-1 reset, exact replay, dozvoljeni same-epoch +1 predecessor i odbija lower epoch, higher-epoch non-1 generation, same-epoch gap/reset i drugi body za isti pair;
- concurrency fixture A(epoch 10) spor, B(epoch 11) accepted/switch-ovan, pa late A dokazuje nula A mutation-a i stale ACK; late stara generation istog epoch-a takođe ne menja current state;
- crash se oporavlja posle lease expiry-ja bez duplog switch-a;
- crash posle switch-a/pre reconciliation-a, posle candidate reconciliation-a i tokom final readiness-a pod novim mutexom/advisory lockom poredi DB/pointer/ledger/candidate i donosi jednu idempotentnu success/rollback odluku; lock/lease se ne puštaju pre terminal receipt-a;
- build/migration/health failure čuva ili vraća prethodni kompatibilni release;
- empty i populated MigrationLedgerEvidenceV1 fixture, independent CMS recompute i callback nullability matrica prolaze;
- `os_secret_ref_local` DPAPI LocalMachine/service-SID ACL/provisioning-smoke, role/grant, authenticated controller-pipe, same-session phase-lease, rotation i crash-cleanup fixture prolazi, bez target DB credentiala u parentu ili worker job store-u;
- drugi terminalni result ID/body/status za isti `(operationId,workerJobId)` je incident conflict; prvi prihvaćeni callback trajno čuva `initial_ack=applied|stale_installation_ignored|stale_epoch_ignored|stale_generation_ignored`, dok exact replay istog result body-ja vraća HTTP `ack=duplicate` bez drugog state write-a;
- late callback se validira prema historical operation snapshotu pa tek onda dobija stale ACK bez current mutacije; `rejected_before_switch` bez validnog `NoMutationTerminalEvidenceV1` ne dobija `applied`;
- host capability mismatch pada pre migracije/switch-a i vraća sanitizovan dokazani error code;
- `@nr-cms/license-server` je odbijen;
- aktivni source nije patchovan in-place.

## 9. Faza 5 — vendor proizvod sa četiri licencna SKU-a

### 9.1 Schema/domain model

Relevantno:

    .private/webshop/src/db/schema.ts
    .private/webshop/src/data/webshop-product-domain.ts
    .private/webshop/src/data/webshop-products.ts
    .private/webshop/src/admin/products/types.ts
    .private/webshop/src/admin/products/serializers.ts
    .private/webshop/src/admin/products/actions.ts
    .private/webshop/src/admin/products/product-manager.tsx

Dodati variant-level immutable mapping:

    externalLicenseSku
    externalProductTypeId (ako nije striktno product-level)
    externalLicenseEnvironment
    externalLicenseCatalogVersion

Product zadržava license server ID i product type. Svaka aktivna licencna varijanta mora imati jedinstven, validan external SKU iz syncovanog kataloga. Storefront SKU može biti isti radi jasnoće, ali server ne izvodi autoritet samo iz slobodnog UI stringa.

Schema kolone mogu ostati nullable za legacy/backfill, ali novi domain-bound `license_server` proizvod ne može biti objavljen bez tačnih `externalLicenseEnvironment` i `externalLicenseCatalogVersion`. Variant mapping i catalog-cache/history koriste composite `(environment,catalogVersion)` FK/unique vezu; cross-environment revision je hard conflict. Vrednost je stabilni durable master revision iz Phase 1, nikada vreme catalog GET-a. `syncedAt` i `generatedAt` ostaju audit vreme i nisu alternativni binding identitet. Cart/order/master wire polja se zovu tačno `environment` i `catalogVersion`.

Migracija mora sačuvati postojeće product-level mape. Backfill je dozvoljen samo kada proizvod ima jednu nedvosmislenu varijantu; ostali postaju `configuration_required`, ne nasumično mapirani.

### 9.2 Catalog i publish validation

- catalog cache čuva environment, product type, SKU, duration, requiresDomain, status, durable verziju/ETag i odvojeno sync vreme;
- unchanged `304` sync zadržava isti mapping; nova durable revision stavlja pogođeni product/offer u revalidation pre nove kupovine;
- proizvod se ne aktivira ako bilo koja varijanta nije validna;
- removed/deactivated master SKU blokira novu kupovinu, ali ne menja istorijski order snapshot;
- order item snapshotuje tačan external SKU i catalog reference;
- digitalna količina ostaje 1.

### 9.3 Acceptance gate

- jedan `NR CMS Webshop license` product ima četiri varijante;
- svaka mapira na odgovarajući `webshop-30/183/365/1000000`;
- sve četiri mape referenciraju isti očekivani environment i validan composite `(environment,catalogVersion)` snapshot;
- edit/tamper client inputa ne menja server-side mapping;
- nevalidan ili inactive SKU sprečava publish/checkout;
- postojeći single-SKU product ima determinističku migration putanju.

## 10. Faza 6 — master-signed purchase intent i domain snapshot

### 10.1 Master

Dodati exact `POST /api/addons/purchase-intents` contract sa `contractVersion=1` i `action=challenge|complete`. Može ponovo koristiti installation identity proof primitive, ali koristi posebnu tabelu, `webshop_purchase_intent` challenge purpose i rate-limit bucket. Challenge vraća base64url exact canonical `proofPayload`; complete prima challenge ID, isti installation ID/fingerprint i Ed25519 potpis tih bytes, a vraća compact JWS. Ne uvoditi paralelni endpoint/query action niti ponovo primati trusted domain/product polja u complete zahtevu.

Potrebno:

- jedan exact wire contract: protected `alg=EdDSA`, allowlisted `kid`, `typ=NRV-WEBSHOP-PURCHASE-INTENT+JWT`; payload `contractVersion=1`, UUID `jti`, stabilni `iss`, vendor `aud`, numeric `iat/nbf/exp`, `tokenUse=purchase_intent`, addon, `offerKey`, server-resolved `productTypeId`, `vendorProductRef`, `environment`, environment-prefiksovan durable `catalogVersion`, allowed SKU listu, canonical domain, `installationId`, exact `installationKeyFingerprint` i `installationFingerprintScheme`, plus domain-verification method/time/challenge;
- `vendor_purchase_offers` mapping sa composite unique `(environment,offerKey,addonKey,vendorAudience)` i composite `(environment,catalogVersion)` FK koji javni logical offer server-side mapira na tačan same-environment vendor API client, master product type, vendor product ref i allowed SKU-eve; admin/seed validacija ne dozvoljava browser-supplied DB UUID;
- JWS claim ostaje standardni UUID `jti`; nakon verifikacije sva downstream polja i issue wire contract koriste tačno `masterPurchaseIntentJti`. Ne uvoditi alias polja `v`, `intentVersion`, `productRef`, `purchaseIntentJti` ili drugi master intent ID;
- durable ledger odvojen od activation challenge-a sa verified `signingKid`, installation ID/fingerprint/fingerprint-scheme tuple-om, `issued -> accepted -> reserved -> consumed`, `issued|accepted|reserved -> expired|canceled` i `reserved -> accepted` release granom, reservation lease-om, terminalnim consumed bindingom, security hold reason/times, domain-verification evidence i cleanup-om;
- HMAC V2 rute `/{jti}:accept`, `:reserve`, `:release`, `:consume`, `:status`, `:authorize-payment` i `:commit-payment-authorization`, svaka sa action scope-om, idempotency key/request hash contractom, vendor-client/audience/environment bindingom i row lock/optimistic version kontrolom. Mutacije freeze-uju business rezultat; svaki `:status` poll koristi novi observation key, exact transport retry istog observation-a vraća iste bytes, a vendor monotono primenjuje samo najveću intent/hold verziju;
- proširiti master Drizzle DB action check/enum, TypeScript action union/parser, enforcement i admin provisioning za svih sedam scope-ova: `purchase_intent.accept|reserve|release|consume|status|payment_authorize|payment_commit`; dodati migraciju i pojedinačni negative scope test pre kreiranja scope redova;
- `:consume` atomski čuva `orderRef`, `orderItemRef`, izabrani domain/product/SKU/catalog tuple i `purchaseIntentSnapshotHash`; response loss se oporavlja ponavljanjem identičnog zahteva;
- zaseban purchase-intent Ed25519 key pair/KID i hash-pinovani versioned keyset sa active/verification-only/revoked statusom iza exact `GET /.well-known/nr-purchase-intent-keys.json`, različit od entitlement i package-release ključeva; vendor ima durable validirani cache;
- production complete sam fetch-uje exact HTTPS well-known proof uz strict SSRF/DNS pinning i čuva evidence hash; samo development allowlisted `.nr.test` koristi eksplicitni `development_allowlist_exemption` koji je zabranjen u production startup-u;
- `:status` je authenticated reconciliation za current status i exact `securityHold={active,version,disposition,reversible_hold|hard_disable|null,reasonCode,changedAt}` conditional contract. Zaseban top-level `hardDisable={occurred,blockId,at,reasonCode,postIssueCompensation}` jedini je istorijski autoritet i postoji nezavisno od nullable authorization snapshota; clear ga ne briše. Jedan monotoni top-level `version` raste pri svakoj status-visible intent/hold/authorization/hard-disable/compensation promeni, dok `securityHold.version` raste samo za current hold/clear. Consumed/no-auth, `issued|used -> invalidated_for_security` i `paid + compensation required|completed` svi ostaju terminalno gate-ovani, a canceled/expired status ostaje HTTP 200 na ovoj read ruti;
- `vendor_purchase_security_block_reconciliations` ima jedan durable generation po hard-disable block-u, `pending|running|completed|failed`, affected cutoff/cursor/count/attempt/error i idempotentni `(blockId,intentId)` rad. `completed` se commit-uje tek posle praznog locked rescan-a; failed/DLQ ne otvara gate. Svaka payment/issue/delivery ruta proverava current block, applicable istorijski non-completed generation i intent marker. Dual-control clear za buduću prodaju pod lock-om zahteva completed/equal counts/nula failed redova/prazan rescan ili vraća `409 hard_disable_propagation_incomplete`; clear ne briše markere;
- `purchase_intent_payment_authorizations` ima unique authorization ID i unique JTI za prvi V1, same-environment/order/item/snapshot/provider binding i state `issued -> used -> paid`, `issued -> invalidated|expired|invalidated_for_security`, odnosno `used -> expired|invalidated_for_security`; hard-disable marker/block ID/reason je immutable i clear ga ne briše;
- `:authorize-payment` prima stable `paymentProvider` (`^[a-z0-9_]{1,50}$`) i vraća `issuedAcceptUntil` najviše 120 sekundi posle issue-a; `:commit-payment-authorization` mora stići pre tog cutoff-a i frozen intent `checkoutExpiresAt`, vezuje isti provider/opaque ref uz unique `(paymentProvider,providerCheckoutRef)` i durable postavlja `usedExpiresAt=min(providerSessionExpiresAt,checkoutExpiresAt)` pre browser redirecta. `checkoutExpiresAt` je jedini V1 master payment-policy deadline; nema drugog payment-completion polja. Posle commita `usedExpiresAt`, ne issued cutoff, gate-uje capture/novi issue; `:status` strict vraća oba polja, sa `usedExpiresAt=null` samo za `issued`;
- provider session kreacija koristi exact idempotency key `webshop-license-checkout:v1:<paymentAuthorizationId>`; response loss se oporavlja retrieve-by-idempotency-key/sačuvanim ref-om, nikada drugom session;
- `reversible_hold` ne menja stanje postojeće `issued|used` authorization, već je gate-uje; ista authorization nastavlja posle clearance-a samo pre svog status-dependent efektivnog roka. Commit na 121. sekundi pada; commit pre 120 sekundi pa capture posle 120 sekundi ali pre `usedExpiresAt` može issue; capture posle `usedExpiresAt` je finansijska činjenica/manual review bez auto-issue-a ili nove V1 authorization/JTI/order. Master-hold mirror ne menja `riskLifecycleVersion`;
- `hard_disable` terminalno menja `issued|used -> invalidated_for_security`, vodi captured order u refund/revoke review i nikada ne resume-uje posle clear-a; fixture pokriva disable pre/posle used, late capture i clear bez issue-a. Drugi fixture ubija propagation batch između dva consumed reda, dokazuje da clear vraća `409` i da neobrađeni red ne može issue, zatim resume/completed rescan i budući-only clear;
- rate limit i audit;
- nema license key-a niti registry detalja u intentu.

### 10.2 Client CMS

Relevantno:

    lib/webshop-addon/buy-link.ts
    app/dashboard/webshop/page.tsx
    components/webshop-license-activation.tsx

- zameniti distribuirani `WEBSHOP_BUY_LINK_SECRET` model master-signed intentom;
- `WEBSHOP_BUY_URL` postaje exact vendor acceptance endpoint/config, ne autoritet domena;
- vendor/client template dobija javni `WEBSHOP_BUY_OFFER_KEY=nr-cms-webshop-license`; client challenge šalje `offerKey`, nikada master `productTypeId` UUID ili vendor product URL;
- vendor template dobija exact `NR_PURCHASE_INTENT_PUBLIC_KEYS_URL=https://license.nr.test/.well-known/nr-purchase-intent-keys.json`; verifier ne čita key URL iz tokena;
- activation stranica server-side dobija intent za svoj verified canonical domain;
- browser koristi top-level cross-origin HTML `POST` formu sa JWS-om samo u request telu; token nikada ne ide u query/fragment, history, referrer ili analytics;
- startup strict parsira `WEBSHOP_BUY_URL` kao HTTPS URL bez userinfo/query/fragmenta i sa exact acceptance putanjom; `vendorAudience` se izvodi samo kao normalizovani `URL.origin`, vezuje u challenge/proof i nikada ne prima iz browsera ili headera. Fixture pokriva default `:443`, trailing slash/path, non-default port i audience/JWS/offer mismatch;
- greške expiry/network-a daju retry bez menjanja installation identity-ja.

### 10.3 Vendor Webshop

Relevantno:

    app/licenses/purchase-intents/accept/route.ts
    lib/webshop-addon/contract.ts
    .private/webshop/src/addon.tsx
    proxy.ts
    .private/webshop/src/storefront/storefront-renderer.tsx
    .private/webshop/src/storefront/product-purchase-form.tsx
    .private/webshop/src/storefront/cart-actions.ts
    .private/webshop/src/data/webshop-carts.ts
    .private/webshop/src/data/webshop-cart-domain.ts
    .private/webshop/src/data/webshop-orders.ts
    .private/webshop/src/db/schema.ts

Dodati:

- server-only verifier i purchase-intent DB/session tabelu;
- javni **core CMS** App Router Route Handler, ne package `app/**` fajl i ne Server Action, za exact `POST /licenses/purchase-intents/accept`. Wrapper je deo base CMS commita, dinamički resolve-uje registry addon i typed delegira `POST` plus `path=["licenses","purchase-intents","accept"]` u package `handleApiRoute`; registry-empty vraća stabilan 404, a installed-but-not-ready 503 bez body echo/set-cookie-a. Package grana primenjuje content-type/body limit i bez body logovanja poziva HMAC V2 master `:accept` pre lokalne mutacije. `proxy.ts` ima samo method/path-scoped prolaz pre Clerk redirecta, a globalni CSRF/Origin izuzetak ne važi ni za jednu drugu rutu/metodu;
- prisutan non-null Origin posle JWS provere mora odgovarati verified canonical-domain HTTPS originu; absent/literal `null` nije domain dokaz ali se oslanja na signed one-time JWS + master ledger umesto globalne customer allowlist-e. Real-browser fixture pokriva proizvoljan verified production client origin, local origin, null/absent i forged mismatch;
- token hash, verified `signingKid`, `masterPurchaseIntentJti`, `contractVersion`, status/lease/expiry/domain/product scope, bez čuvanja raw JWS-a;
- registry-only `runtimeContractVersion="1"` route inventory test pokriva postojeće storefront/dashboard, `/api/webshop/**`, Paddle alias, download, cron i novi acceptance wrapper; svaki package route/job capability ima tačno jedan typed host binding. `app/api/files/[id]` prelazi sa direktnog root Webshop-table importa na addon authorization hook/delegate. Package `app/**` iz `node_modules` se nikada ne smatra Next rutom;
- HttpOnly/Secure/SameSite session reference i `303` clean redirect posle validacije;
- immutable `masterPurchaseIntentJti`, `purchaseIntentContractVersion`, `environment`, `offerKey`, `canonicalDomain` i external product/SKU/catalog polja kroz cart, checkout i order item;
- `purchaseIntentSnapshotHash` se računa tek u order-creation transakciji, kada postoje order/item ID-evi, nad exact `PurchaseIntentOrderBindingV1` contractom; ne postoji lažan/privremeni cart hash;
- normalizovani nullable purchase-intent FK na cart/order itemu ima filtered unique constraint: jedan JTI može pripadati samo jednoj cart liniji i jednom order itemu;
- prvi contract uvodi `order_kind=webshop_license_single`: cart/checkout/order ima tačno jednu quantity-1 Webshop license liniju/JTI i odbija drugu licencu, običan proizvod ili mixed cart pre reservation/payment-a; unique partial order constraint i concurrent test zaključavaju cardinality;
- concurrent add ili isti JTI sa dve variante daje postojeću identičnu liniju ili `409`; explicit variant replace menja istu liniju pod lock-om samo pre reservation-a;
- merge key uključuje intent/domain/variant; različiti intenti se ne merge-uju, quantity je 1;
- checkout ponovo proverava intent stanje i product/SKU dozvolu i poziva master `:reserve`;
- durable order prvo ostaje `intent_confirmation_pending`; potvrđen master `:consume` za isti order/item/snapshot hash je nužan ali nije dovoljan gate — payment session se kreira tek posle svežeg status/hold check-a i `:authorize-payment`;
- confirmed consume postavlja `payment_authorization_pending`, ali ne kreira provider session;
- reconciliation worker poziva `:status` sa novim observation ID-em za svaki relevantan consumed order dok delivery/compensation nije terminalna, ignoriše stale nižu top-level verziju, zatvara canceled checkout i čuva zasebni `masterSecurityHoldActive/version/disposition/reason/changedAt` mirror plus immutable `masterHardDisableOccurred/blockId/at/reasonCode/postIssueCompensation` mirror. Reversible hold daje izvedeni `paused_security_review` bez vendor `riskStatus` write-a; top-level hard disable vodi u terminalni payment/refund/revoke/no-delivery tok i ostaje posle current clear-a. Zatim `:authorize-payment`, durable payment-session operation `creating|created|committed|failed`, provider create/retrieve i `:commit-payment-authorization` moraju proći pre redirecta;
- payment-session operation čuva authorization ID, stable `paymentProvider`, unique provider ref, provider request hash/idempotency key, `issuedAcceptUntil`, provider expiry i master `usedExpiresAt`; terminalni commit failure best-effort canceluje session;
- recovery worker ponavlja isti consume/authorization/commit idempotency key/body posle timeout-a; terminalni conflict otkazuje order pre payment-a ili ga šalje na manual review, a unknown provider outcome prvo radi retrieve/reconciliation.

### 10.4 Acceptance gate

- client Buy vodi na tačan vendor product i prikazuje `client.nr.test`;
- real browser cross-origin form POST prolazi kroz exact public Route Handler bez Server Action origin greške; null/absent Origin prolazi samo uz validan one-time JWS, a forged non-null mismatch pada pre `:accept`;
- tamper, expiry, audience mismatch i replay padaju;
- revoked purchase-intent KID odmah blokira acceptance; compromise fixture cancel-uje `issued|accepted|reserved`, dok `consumed` ostaje terminalan i dobija payment/issuance hold prema runbooku — JTI se nikada ne resetuje;
- token nije u URL-u; direct GET bez accepted sesije ne može dodati domain-bound proizvod;
- hidden input ne može promeniti domen/SKU;
- isti intent ne pravi dva order-a ni pri paralelnim sesijama ili consume response loss-u;
- isti JTI ne može imati dve SKU/cart/order linije, uključujući concurrent test;
- master consume, svež status/hold check, payment authorization, provider create-or-retrieve i authorization commit su potvrđeni pre browser payment redirecta;
- status fixture dokazuje fresh observation posle hold promene i da replay starog observation-a ne može prepisati veću verziju; reversible hold resume-uje samo neisteklu authorization, hard disable nikada. Offline-during-hard-disable + poll-after-clear pokriva consumed/no-auth, pre-commit `invalidated_for_security` i već-paid `postIssueCompensation=required|completed`; top-level marker u sva tri slučaja blokira redirect/issue/delivery;
- jedan V1 checkout/order ima tačno jednu license stavku/JTI i jednu provider session; drugi/mixed item daje `409`;
- cart/order nikada više ne daje `domain: null` za domain-required licencu;
- intent daje pravo kupovine, ali activation i dalje odbija drugi domen.

## 11. Faza 7 — payment i license issuance ispravnost

### 11.1 Payment reducer

Relevantno:

    .private/webshop/src/server/webhooks/payments.ts
    .private/webshop/src/data/webshop-payment-state-v2.ts
    .private/webshop/src/lib/webshop-payments/financial-state.ts
    .private/webshop/src/db/schema.ts

Implementirati/učvrstiti:

- expected order amount/currency snapshot;
- zbir validnih capture-a i pravila za partial/multiple capture;
- exact financial enum `pending|authorized|partially_captured|paid|partially_refunded|refunded|disputed|chargeback|failed|canceled`; `paid` samo pri punom capture-u;
- `security_review|paid_security_review` je odvojena vendor-local order/fulfillment risk osa, nikada payment enum vrednost; current master hold se čuva kao zaseban `masterSecurityHoldActive/version/disposition/reason/changedAt` mirror, a istorijski hard disable kao `masterHardDisableOccurred/blockId/at/reasonCode/postIssueCompensation`; nijedan ne menja lokalni risk lifecycle;
- nema implicitnog fallback-a `amount=null/cumulative=null -> order total`; cumulative total mora nastati iz eksplicitno verifikovanih provider podataka;
- cumulative-only adapter je dozvoljen samo kada provider za celu naplatu daje jedan stabilni financial-object `captureRef` i stabilne `transactionRef`/`capturedAt`; reducer održava tačno jedan monotonic-max evidence red, niži/jednak reordered snapshot ga ne menja, a viši ga menja samo pre freeze-a. Cumulative i delta redovi se ne mešaju niti se snapshotovi sabiraju; bez stabilnog identiteta događaj ostaje manual review bez issuance-a;
- original-body signature validation;
- unique provider event i transaction/reference ledger;
- canonical frozen payment aggregate sa stable `paymentProvider`, authorization/provider checkout bindingom i 1..1000 `captureEvidence[]` redova sortiranim po provider+captureRef; evidence nema `eventRef`, pa isti captureRef kroz dva provider eventa daje isti red i isti hash. Vendor i master nezavisno lossless/BigInt recompute-uju sumu, zahtevaju `capturedTotalMinor` jednak zbiru i odbijaju unsafe/overflow vrednosti iznad `9007199254740991`; master sam recompute-uje canonical hash. Svi eventRef-ovi ostaju u zasebnom inbox/audit mappingu van aggregate hash-a;
- out-of-order/duplicate deterministički reducer;
- atomski financial order transition, ali license fulfillment enqueue samo ako je authorization `used`, provider ref/provider ID odgovaraju istom JTI/order/item/snapshotu, vendor-local risk je `none|cleared`, fresh `masterSecurityHoldActive=false` i top-level `masterHardDisableOccurred=false`; late master-hold capture ostaje u `paused_security_review` bez promene `riskLifecycleVersion` i bez auto-issue-a.

### 11.2 Fulfillment outbox

Relevantno:

    .private/webshop/src/data/webshop-license-fulfillment-outbox.ts
    .private/webshop/src/data/webshop-license-server-api.ts
    .private/webshop/src/data/webshop-license-server-issues.ts
    app/api/cron/webshop-license-issues/route.ts

- issue body uzima immutable environment/domain/external SKU/catalog snapshot iz jedinog `webshop_license_single` order itema;
- issue body šalje `masterPurchaseIntentJti` i `purchaseIntentSnapshotHash` zajedno sa order/order-item referencama;
- `payment` objekat šalje aggregate ID/hash, stable `paymentProvider`, authorization ID, isti provider checkout ref, currency/order/captured totals i canonical `captureEvidence[]` sa stvarnim capture/transaction ref-ovima; provider `eventRef` se ne šalje i ne ulazi u aggregate hash;
- issue body nosi exact `issuanceFence={fulfillmentGeneration,paymentAggregateVersion,financialLifecycleVersion,riskLifecycleVersion}`; master hold/version namerno nije deo tog body-ja/fence-a. Pre svakog send-a worker pod row lock-om ponovo zahteva isti tuple, financial `paid`, vendor risk `none|cleared`, svež `masterSecurityHoldActive=false`, top-level `masterHardDisableOccurred=false` i frozen aggregate hash;
- refund/reversal pre send-a canceluje issue; dispute/hold ga postavlja `paused_security_review`, bez master poziva;
- stabilan idempotency key je vezan za order item/operation, ne attempt;
- encrypted response se durable čuva pre completion-a;
- response-loss retry vraća isti master rezultat;
- expand/backfill/contract migracija uvodi nullable DB kolonu sa CHECK/Drizzle/TypeScript `postIssueReconciliationStatus=resolved_active|review_pending|compensation_pending|resolved_revoked`, unique version-CAS audited decision/evidence red i `post_issue_license_observations` bez key-a. Null je dozvoljen samo pre durable committed entitlementa; prvi committed result atomski postavlja `review_pending`, a fresh validate/CAS tek `resolved_active`. Postojeći committed redovi backfill-uju se u `review_pending`; decrypt/validate mismatch ili unknown KID ostaje blocked/manual, a tek zero-null provera validira CHECK. Response obrada prvo CAS-proverava isti generation/version tuple i fresh master hold/hard-disable snapshot. Terminalni full refund/reversal/lost-dispute/`refund_required`/revoke/hard-disable daje `compensation_pending -> resolved_revoked` uz tačno jedan causal master revoke. Reverzibilni local risk review, reversible hold, dispute open ili partial refund daje `review_pending` bez delivery/revoke-a; dispute open enqueue-uje jedan suspend. Audited local/master clear, dispute won+reinstate ili partial-refund `retain_active` vraća isti entitlement u `resolved_active` bez drugog issue-a tek posle current causal CAS-a i fresh validate-active dokaza;
- worker ima dedicated secret/identity umesto opšteg `CRON_SECRET` ciljno;
- ako se uvodi `WEBSHOP_LICENSE_ISSUE_CRON_SECRET`, u istom change setu menjaju se vendor template, env validator, cleanup script, cron route/auth i negative test; do tada stvarna ruta koristi `CRON_SECRET`;
- attempt count raste ispravno, lease recovery i DLQ rade;
- external issued key fingerprint se računa pre enkripcije, zatim se ključ šifruje novim server-only envelope helperom sa `WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KEY`/KID i exact purpose/issue ID/order-item ID/fingerprint AAD-om; ne koristi API-credential `WEBSHOP_LICENSE_SERVER_SECRET_KEY`;
- decryptor podržava aktivni i eksplicitne stare KID-eve, dok novi write koristi samo aktivni KID;
- migracioni worker klasifikuje postojeće issue redove bez KID-a kao `legacy-license-server-secret-v1`, dekriptuje ih eksplicitnom legacy granom i batch rewrap-uje pod lock/version kontrolom; nikada ne radi metadata-only backfill;
- stari issued-key KID se povlači tek kada count redova padne na nulu, backup retention prođe i reveal/retry testovi prođu;
- `WEBSHOP_PAYMENT_STATE_V2` i `WEBSHOP_LICENSE_OUTBOX_V2` se uključuju tek posle migracije/backfilla.

### 11.3 Master issuance

- idempotency key + request hash conflict contract ostaje autoritativan;
- domain-required, SKU, scope, payment aggregate i environment proveravaju se pre issue-a;
- vendor-commerce Webshop issue zahteva consumed purchase intent bez hold-a vezan za isti API client, environment, order/order item, snapshot hash, domain, `offerKey`, `productTypeId`, `vendorProductRef`, SKU i catalog version;
- master strict parsira `issuanceFence` kao objekat sa tačno `fulfillmentGeneration`, `paymentAggregateVersion`, `financialLifecycleVersion` i `riskLifecycleVersion`; sve četiri vrednosti su non-negative JSON integeri, a missing/unknown/non-integer/negative polje je `400 invalid_schema`. Exact tuple i full request hash immutable se vezuju uz issue operation i encrypted replay rezultat; isti idempotency key sa promenjenim fence tuple-om daje `409 idempotency_conflict` pre issuer mutacije;
- vendor ne šalje niti bira `activationLimit`; master ga izvodi iz immutable `(environment,catalogVersion,productType,SKU)` snapshot politike i upisuje u licencu;
- master proverava authorization `used`, isti `paymentProvider/providerCheckoutRef`, canonical aggregate hash, valutu/full capture i da svaki evidence provider odgovara authorization provideru;
- `vendor_payment_capture_bindings` ili ekvivalent ima unique `(vendorApiClientId,paymentProvider,captureRef)` i immutable paymentAggregate/order/JTI binding: exact issue replay je dozvoljen, a drugi binding daje `409 payment_evidence_conflict`;
- nullable `licenses.purchase_intent_id` FK i filtered unique constraint garantuju najviše jednu licencu po intentu; issue kopira domain-verification evidence u immutable license audit polja, a manual/legacy action/scope jedini sme imati null;
- posle HMAC/schema/body-hash provere master prvo radi idempotency lookup: exact key/body za `committed` vraća frozen entitlement/key pre current precondition-a, pa response-loss replay prolazi iako je authorization atomarno već `paid`; samo novi/pending operation zahteva `used`, dok isti key/drugi body daje `409`;
- master issue operation koristi closed stanje `pending|blocked|committed|terminal_failed`, pa `intent_security_hold` daje `pending -> blocked`, a auditovani clearance daje `blocked -> pending` bez automatskog izdavanja. Vendor retry-uje pre-commit isti body/key samo ako je lokalni four-field fence i dalje identičan; master hold/clear ne povećava vendor `riskLifecycleVersion`. Lokalna promena fence-a sprečava replay. Ako je master ipak već committed, vendor koristi closed post-issue reducer: reverzibilni signal je `review_pending`, a samo terminalni signal ide u revoke compensation. `paused_security_review` ostaje isključivo vendor fulfillment-outbox prikaz;
- isti key/drugi body vraća conflict;
- audit ne sadrži plaintext key.

### 11.4 Acceptance gate

- partial capture ne izdaje licencu;
- full capture izdaje tačno jednu;
- isti captureRef kroz drugi event ne sabira se ponovo, a reuse istog vendor-client/provider/capture tuple-a za drugi aggregate/order/JTI pada kao double-spend conflict;
- provider ID/ref/capture-evidence mismatch ili ne-used authorization ostavlja security review bez issue-a;
- duplicate webhook 10 puta i response-loss posle master commita daju jednu licencu;
- crash pre send-a ponavlja isti generation/body; full refund/reversal/lost-dispute/revoke/hard-disable race pre send-a ne poziva master, a race tokom master commita daje bez delivery-ja tačno jednu compensation revoke operaciju. Local risk/reversible-hold/dispute-open/partial-refund race ostaje `review_pending`; clear odnosno won+reinstate/retain-active koristi isti fresh-validated entitlement, dok terminalna odluka pravi tačno jednu compensation;
- master outage ostavlja paid order u retryable stanju bez gubitka;
- wrong domain/SKU/scope je terminalno klasifikovan i vidljiv operatoru;
- provider reference u masteru odgovara realnom payment događaju.
- drugi JTI/snapshot/order/domain/SKU za već consumed intent daje terminalni conflict, dok isti response-loss retry vraća isti rezultat.

## 12. Faza 8 — secure delivery i notification pouzdanost

### 12.1 Order read model i reveal

Relevantno:

    .private/webshop/src/data/webshop-order-emails.ts
    .private/webshop/src/data/webshop-license-server-issues.ts
    .private/webshop/src/data/webshop-orders.ts
    .private/webshop/src/storefront/order-delivery-actions.ts
    .private/webshop/src/storefront/customer-delivery-confirmation-form.tsx
    .private/webshop/src/db/schema.ts

Implementirati:

- authorized order read model join issue reda po `orderItemId`;
- post-issue delivery gate ne zahteva da finansijski status zauvek ostane `paid`; zahteva durable committed issue, `postIssueReconciliationStatus=resolved_active`, vendor risk `none|cleared`, fresh hold=false/top-level hard-disable=false i server-only fresh master validation. Vendor pod issue lock-om pre svakog poziva alocira monotoni `validationObservationGeneration` vezan za issue/entitlement/domain/key fingerprint i current causal versions, dekriptuje key samo u memoriji i HMAC poziva strict `POST /api/v1/entitlements/validate` body `{contractVersion:1,licenseKey,domain}`. Prihvata samo current-generation CAS exact 200 `valid=true,status=active,reason=null,entitlementId=licenseId=<ISSUE_ID>` i neistekli nullable `validUntil`; lower/delayed response je evidence-only ignored, timeout ostavlja latest pending i gate closed. Observation čuva samo binding/JCS hash/entitlement/domain/time/status/versions, max age `WEBSHOP_POST_ISSUE_LICENSE_STATUS_MAX_AGE_SECONDS=60` (valid 15..300), a delivery zahteva latest-started=latest-applied, nula novijeg pending reda i fresh purchase-intent status istog prozora. Fixture kasni generation N active posle N+1 revoked/suspended i ne sme ponovo otvoriti delivery;
- server-only dekripciju tek posle ownership/token provere;
- guest delivery token je random 256-bit bearer vrednost; tabela čuva samo unkeyed SHA-256, expiry, order/item binding, status i attempt/reveal audit. Ne uvoditi delivery signing/HMAC/KEK secret;
- authenticated POST reveal/copy action;
- no-store/CSP/referrer zaštitu i bez third-party asseta;
- Caddy i Next/app logging moraju redigovati celu bearer-token path vrednost pre access/error/trace zapisa; log-canary test koristi prepoznatljiv lažni token i mora dokazati da se ne pojavljuje ni u jednom proxy/app/APM/analytics logu;
- `deliveredAt` posle uspešnog reveal-a;
- admin/support vidi status/fingerprint, ne plaintext po defaultu.

### 12.2 Notification outbox

- email payload sadrži delivery link, ne sirov ključ;
- email send greška propagira se outbox workeru;
- attempt counter, exponential backoff, max attempts i DLQ rade;
- outbox red ima monotonu `notificationGeneration` i deterministic `providerMessageKey=webshop-license-delivery:v1:<NOTIFICATION_UUID>:<GENERATION>`; email provider/adapter mora podržati idempotent send i autoritativni retrieve/reconciliation baš po tom ključu. Provider message ID može biti dodatni dokaz tek kada je durable sačuvan, ali nije zamena za key-based recovery posle commita pre lokalnog ACK-a;
- pre send-a, provider ACK/reconciliation-a, token exchange-a i reveal-a ponavlja se fresh post-issue delivery gate; timeout/crash prvo autoritativno reconcile-uje isti `providerMessageKey`. Unknown outcome ne šalje drugi email i ne rotira token; nova generation/token nastaje samo posle autoritativnog `not_found` ili `definitive_pre_accept_failure` i atomski revoke-uje prethodni aktivni token;
- auditovani resend koristi isti generation pravilo i atomski rotira guest token;
- license-only stavka se više ne preskače zato što nema download URL;
- notification completion ne menja issuance idempotency.

### 12.3 Acceptance gate

- kupac dobija link i vidi isti issued key;
- drugi kupac, pogrešan/istekao/potrošen token nema pristup;
- ključ nije u URL-u, email body-ju, client JS, logu ili order snapshotu;
- email outage ide retry/DLQ, a order strana ostaje dostupna autorizovanom kupcu;
- crash posle token-hash/outbox commita pre provider poziva prvo radi retrieve starog message key-a; autoritativni `not_found` opoziva izgubljeni N hash i pravi N+1/novi token, jer plaintext N nije durable. Crash posle provider commita pre local ACK-a dovršava isti accepted generation. Unknown ne rotira, a definitive pre-accept no-commit rotira jednom. Acceptance zahteva najviše jedan provider message i tačno jedan aktivni token, ali pre-provider-crash fixture legitimno ima revoked N + active N+1 hash reda;
- bearer-path canary nije prisutan u Caddy, Next/app, APM ili analytics logu, a provider koji nema retrieve po `providerMessageKey` nije eligible za ovaj tok;
- resend i reveal imaju audit i pravilno `deliveredAt`.

## 13. Faza 9 — lifecycle, revalidation, deactivation i transfer

### 13.1 License lifecycle

Relevantno:

    .private/webshop/src/data/webshop-payment-state-v2.ts
    .private/webshop/src/data/webshop-license-fulfillment-outbox.ts
    .private/license-server/src/lib/vendor-license-lifecycle-route.ts
    .private/license-server/app/api/v1/entitlements/[id]/*

Definisati i testirati state machine:

| Događaj | Ciljna akcija |
|---|---|
| full refund | revoke |
| partial refund | eksplicitna poslovna politika; default bez full revoke-a |
| dispute open | suspend |
| dispute won | reinstate samo iz dozvoljenog prethodnog stanja |
| dispute lost/chargeback | terminal revoke |
| expiry | expired bez payment mutation-a |

Dovršiti `reinstate` builder/worker i čuvati causal provider reference. Lifecycle retry koristi stabilan operation key.

### 13.2 Deactivation i domain transfer

Implementirati exact contract iz dokumenta 10, bez alternativnih ruta:

    POST /api/addons/licenses/deactivate
      contractVersion=1, action=challenge|complete

    POST /api/addons/licenses/transfer
      contractVersion=1, action=prepare|target_complete|source_challenge|source_complete

    POST /api/addons/licenses/lifecycle-status
      contractVersion=1, action=challenge|complete

- purpose-specific master `proofPayload` bytes se potpisuju installation Ed25519 key-em; request/body hash, challenge/result i response-loss replay su durable/idempotentni;
- master zamrzava strict RFC 8785/JCS `LifecycleOperationResultCoreV1`; deactivation fixture hash je `sha256:02dd22e6f473a77a90640f74311ba1f4d2db4961624f00b68012dd2034a0097f`, a transfer fixture hash `sha256:c9d1208383c306a9817055011748eec82c356c7b5bc2575bbb5e23bcd4caba02`;
- implementirati exact `LifecycleReceiptClaimsV1` strict union iz dokumenta 10 sa protected headerom `alg=EdDSA`, allowlisted `kid`, `typ=NRV-ADDON-LIFECYCLE-RECEIPT+JWT` i bez unknown polja. Role su samo `deactivation|transfer_source|transfer_target`; deactivation receipt vezuje exact activation/domain/installation/fingerprint/slotReleased core, a oba transfer receipt-a nose isti operation/transfer/source+target identity/core tuple i isti `resultBodyHash`, uz različit JTI/role. Cross-role/cross-token primena pada;
- pre HTTP slanja deactivation `complete` ili transfer `source_complete`, CMS lokalno durable postavlja `lifecycle_finalization_pending`, runtime `maintenance/restricted` i pod istim installation deployment fence-om supersede-uje svaki non-terminalni deploy job;
- deactivation pod license/activation/slot lock-om atomski menja `active -> deactivated`, oslobađa slot, povećava lifecycle version i vraća signed lifecycle receipt;
- revalidation poštuje activation status;
- lokalni addon prelazi u disabled/deactivated mod, bez brisanja podataka;
- transfer ledger ima tačno `requested -> target_proved -> completed` uz canceled/expired grane, hashovan one-time source approval code i dokaz oba installation identiteta; `source_proved_at` se upisuje u istoj finalnoj transakciji kao completed i nije zasebno stanje;
- source approval HMAC rezultat se prikazuje kao tačno 43 ASCII base64url-no-padding karaktera; `sourceApprovalCodeHash` je tačno `sha256:` + lowercase SHA-256 `UTF8(sourceApprovalCode)` bez trimovanja, normalizacije, newline-a ili base64 dekodovanja;
- `target_complete` šalje `sourceApprovalDerivationKid` i target-installation `approvalBindingSignature` nad exact transfer/challenge/KID/code-hash bytes-ima; master proverava potpis i immutable čuva KID+hash tako da rotacija/incident autoritativno nalazi sve pogođene otvorene transfere;
- production target proof uključuje HTTPS well-known domain-control dokaz; `.nr.test` koristi samo eksplicitni development izuzetak;
- completion u jednoj transakciji zaključava licencu/source activation/slot/transfer, menja source `active -> transferred`, menja license domain, kreira target activation i audit/receipts; bilo koji conflict ostavlja source netaknut;
- master DB CHECK/Drizzle/TypeScript activation-status migracija dodaje exact `transferred`, a revalidation/runtime policy ga odmah tretira kao disabled bez outage grace-a;
- deactivation challenge i transfer source-challenge unapred vraćaju master-assigned lifecycle `operationId`; finalni body i local pending red čuvaju isti ID i exact JCS request-body hash pre HTTP ishoda;
- response loss posle master commita ostavlja local source pending/restricted i retry-uje isti operation/request/body. Master postavlja `resultReplayUntil >= receipt.exp`, čuva exact `LifecycleOperationResultCoreV1` bytes/hash, full response i receipt-e najmanje do `resultReplayUntil`, a minimalni operation/action/nullable-final-request-hash/result-hash/activation/installation/pre+final-lifecycle/transfer tombstone dok entitlement/activation postoji ili recovery može biti potreban. Template/validator dodaje `NRLS_LIFECYCLE_RECEIPT_TTL_SECONDS=86400`, `NRLS_LIFECYCLE_RESULT_REPLAY_RETENTION_SECONDS=604800`, `NRLS_LIFECYCLE_ORIGINAL_COMPLETE_CUTOFF_SECONDS=86400` i `NRLS_LIFECYCLE_STATUS_JWS_TTL_SECONDS=300`, bounds/startup invariante iz 02/10 i boundary fixture-e;
- kada receipt nedostaje ili je istekao CMS koristi isključivo exact two-step installation-PoP `/api/addons/licenses/lifecycle-status` contract iz dokumenta 10. Challenge uvek vezuje originalni operation/action/non-null CMS-durable final-request hash/activation/installation/pre-lifecycle/transfer tuple; samo masterova persisted `final_request_body_hash` može inicijalno biti null pre original-complete/status-close CAS bindinga. Complete vraća short-lived `typ=NRV-ADDON-LIFECYCLE-STATUS+JWT`, `tokenUse=addon_lifecycle_status`, `purpose=original_operation_recovery`, sa `operationOutcome=committed|not_committed|in_progress`, nullable result hashom i current activation/license/lifecycle tuple-om. Dropped-before-master operation pre persisted cutoff-a može dati samo `in_progress`; posle cutoff-a status-close i late complete konkurišu pod istim row-lock/CAS-om, pa `not_committed` terminalno zabranjuje kasniji commit. Status idempotency je namespaced po `(operation,action,requestId)`, a concurrent fixture ima tačno jedan ishod;
- CMS ne ignoriše receipt/status `exp`. Samo `committed` sa istim originalnim operation/request/result hashom završava deactivation/transfer; samo `not_committed` sa source `active`, istim domain/installation identitetom, `currentLifecycleVersion=preLifecycleVersion` i aktivnom licencom vraća prethodni runtime. Network outage/unknown outcome nikada ne vraća runtime kroz grace;
- prvi transfer contract podržava samo domain-bound `activationLimit=1`; lost-source recovery je odvojeni dual-control admin tok;
- običan DB edit ili nova activation sa zaobiđenim limitom nije transfer.

### 13.3 Persistent revalidation policy

Relevantno:

    lib/vendor-addon-entitlements/revalidation-policy.ts
    lib/vendor-addon-entitlements/public-keys.ts
    lib/webshop-addon/license.ts
    data/webshop-addon-entitlement.ts
    app/api/cron/webshop-entitlement/route.ts
    .private/license-server/src/lib/vendor-addon-signing.ts
    .private/license-server/src/data/addon-activation.ts

Implementirati cilj iz [10 — Bezbednost i operations](10-security-operations-i-rollback.md):

- poslovni validity, revalidation deadline, grace deadline i envelope expiry su razdvojeni;
- master JWS envelope pokriva planirani grace, ali grace nikad ne ide preko license validity-ja;
- verified snapshot i trusted keyset su trajni preko restarta;
- samo network/5xx klasifikacija koristi grace;
- auth/not-found/signature/claim/domain/status greška se primenjuje odmah;
- key rotation čuva stare public ključeve dok su legitimni snapshotovi važeći;
- `deactivated|transferred|revoked` activation status primenjuje se odmah i nikada ne koristi network grace;
- dedicated scheduler/secret i metrics postoje.

### 13.4 Acceptance gate

- refund/dispute state machine daje tačan master i CMS runtime status;
- deactivation oslobađa slot i replay je idempotentan;
- deactivation/transfer commit-response-loss fixture ostavlja local fail-safe pending/restricted, supersede-uje deploy jobove i završava jednim receipt/status ishodom posle istog operation retry-a;
- fixture-i zaključavaju protected/payload/compact receipt bytes, sva tri strict claims union člana, oba navedena core hash-a, transfer source/target isti result hash i cross-role/unknown-field/time/hash negative slučajeve. Poseban clock test pomera vreme iza frozen receipt `exp`, potvrđuje da je stari receipt odbijen i da exact status challenge/PoP/JWS sa istim operation/request/result hashom finalizuje isti već commitovani operation bez druge lifecycle mutacije; odvojeno pokriva dropped-before-master, terminalni `not_committed` safe-restore, late-complete rejection i `in_progress` koji ostaje restricted;
- transfer ne može bez target installation + production domain dokaza, source approval koda i source installation potpisa;
- promena `sourceApprovalDerivationKid` ili code hash-a bez odgovarajućeg target potpisa pada, a compromise fixture po master-persistiranom KID-u zatvara sve i samo pogođene `requested|target_proved` transfere;
- transfer timeout/conflict ne menja stari domen/activation, a response-loss retry ne pravi drugi target slot;
- signed revoke/expiry odmah gasi pravo;
- master outage i CMS restart zadržavaju pravo samo do tačnog grace/license roka;
- povratak mastera radi automatsku reconciliation;
- 401/403/404 nikada nisu grace.

## 14. Faza 10 — E2E, rollout i uklanjanje compatibility puteva

### 14.1 Test redosled

Pratiti [09 — Kompletan lokalni E2E runbook](09-lokalni-e2e-runbook.md):

1. prazne četiri baze i clean deploymenti;
2. master bootstrap/product/SKU/API/release setup;
3. ručna vendor lifetime licenca;
4. vendor activation → worker → `ready`;
5. vendor product sa četiri varijante;
6. client Buy → purchase intent → `webshop-365` checkout;
7. full capture → master issue → secure delivery;
8. client activation → worker → `ready`;
9. duplicate/outage/response-loss/tamper testovi;
10. refund/dispute/revalidation/deactivation/transfer testovi;
11. odvojeni duration testovi za ostale SKU-e.

### 14.2 Feature flag rollout

Preporučen redosled uključivanja:

1. master V2 API provisioning i catalog;
2. release catalog/read-only verification;
3. durable activation outbox, worker još u dry-run modu;
4. worker vendor target, zatim client target;
5. purchase intent + immutable snapshot;
6. variant SKU mapping;
7. payment V2 i license outbox V2;
8. secure delivery;
9. lifecycle/revalidation/deactivation.

Svaki flag ima:

- default i ownera;
- prerequisites;
- metric/alert;
- rollback ponašanje;
- datum/commit uklanjanja nakon stabilizacije.

### 14.3 Compatibility cleanup

Tek posle uspešnog E2E-a i jednog punog rollback drill-a ukloniti/deprecated-ovati:

- distribuirani `WEBSHOP_BUY_LINK_SECRET` tok;
- legacy catalog HMAC/V1 fallback i implicitni `legacy-1` KID;
- best-effort redeploy callback V1;
- `entitlementToken` duplikat ako je `signedEntitlement` migriran;
- hardkodovani `PACKAGE_CONFIG` kao release autoritet;
- unconditional `addons:local` predev ponašanje;
- shared opšti cron secret za specijalizovane workere;
- dokumentaciju koja tvrdi da običan CMS build izvršava addon migracije.

Compatibility kod se ne uklanja u istom change setu u kojem se prvi put uvodi novi put. Prvo dual-read/single-write ili drugi eksplicitni migration plan, pa dokaz, pa cleanup.

## 15. Test komande po repozitorijumu

Komande se izvršavaju sa odgovarajućim test env-om i izolovanom DB. `build` može imati prehook side effect; proveriti script pre CI upotrebe.

### CMS

```powershell
Set-Location D:\nr_cms
npm run env:validate
npm run db:migrate:check
npm run typecheck
npm run lint
npm run test
npm run test:payment:integration
npm run test:fulfillment:integration
npm run acceptance:local:contracts
npm run acceptance:local:private-packages
npm run acceptance:local:e2e
npm run acceptance:local:drills
npm run build
```

Napomena: postojeći `acceptance:local:e2e` i `acceptance:local:drills` koriste contract simulator. Oni su preflight, ne zamena za tri stvarna procesa iz E2E runbooka.

### Webshop package

```powershell
Set-Location D:\nr_cms\.private\webshop
npm run typecheck
npm run test:local
npm run test:db
npm run test:payment:db
npm run release:check:local
npm run install:verify:next
```

Finalni release dodatno prolazi read-only GitHub Actions verification workflow,
lokalni solo-maintainer release-authority preflight/publish tok i clean
registry install prema dokumentu 15. GitHub Actions ne dobija production key
niti publish dozvolu.

### Master License Server

```powershell
Set-Location D:\nr_cms\.private\license-server
npm run env:validate
npm run db:migrate:dry-run
npm run db:migrate
npm run db:migrate:dry-run
npm run typecheck
npm run test:db
npm run build
```

Na praznoj lokalnoj bazi prvi dry-run prikazuje pending migracije, posle apply-a mora dati `pending: []` i `checksumsVerified: true`.

Važno: master `predev`, `prebuild` i `prestart` trenutno automatski pokreću migracije. `NR_MIGRATION_TARGET=development` koristi lokalni non-production tok. Ako je vrednost `production`, običan `db:migrate` namerno pada bez eksplicitnog production moda i dodatnih target identity provera. Zato se build ne koristi kao read-only DB provera.

### Deployment worker

U novom repo-u obavezno definisati standardne komande:

```powershell
npm run typecheck
npm run lint
npm run test
npm run test:integration
npm run db:migrate:check
npm run db:migrate
npm run db:migrate:check
npm run test:windows-service-adapter
npm run test:phase-env-boundaries
npm run test:postgres-restore
npm run acceptance:clean-github-package
npm run acceptance:rollback
```

Imena postaju autoritativna kada repo bude kreiran; CI i ovaj dokument tada se ažuriraju zajedno.

## 16. Obavezni contract i test fixture-i

Najmanji zajednički skup:

- canonical-domain-v1 valid/invalid vectors;
- per-target `CmsCorePrivilegeManifestV1` empty/upgrade/restore, normal runtime core CRUD i negative DDL/GRANT/SET ROLE/`nr_control`/other-target fixture;
- master HMAC V2 canonical request fixture;
- activation challenge/complete V2 fixture sa host-capability descriptor/hash i worker mismatch vektorom;
- Ed25519 SPKI-DER fingerprint fixture sa ekvivalentnim PEM/newline formatima, non-Ed25519 rejectom, exact `ed25519_spki_der_sha256_v1` i signed legacy `legacy_pem_utf8_sha256_v0` rebind/re-enroll putem;
- production HTTPS domain-control/SSRF fixture i `.nr.test` development-exemption fixture;
- entitlement JWS claims/schema i active/verification-only/revoked durable-keyset fixture bez privatnog ključa;
- purchase-intent exact JWS header/payload fixture i POST-transport redaction fixture;
- svih sedam purchase-intent action/scope HMAC/idempotency/error fixture-a, uključujući status/security hold i payment authorize/commit;
- purchase-intent one-JTI/one-item `webshop_license_single` concurrent/variant/mixed-cart reject fixture, provider-session create/retrieve response-loss i signing-KID compromise fixture;
- durable environment-bound catalog revision/ETag unchanged/no-op/mutation/concurrency/drift i variant composite `(environment,catalogVersion)` fixture;
- redeploy HMAC V2 + exact installation-scoped epoch/generation pair-CAS/reset/supersede, historical-stale/exact ACK i concurrency fixture, uključujući novi installation epoch 1, target mutex, `NoMutationTerminalEvidenceV1` i one-result-per-operation/job conflict;
- Windows-x64 release-manifest/publication-attestation/full signed dependency-graph evidence, CMS base-manifest/lock/core-graph invariant, pinovani Node/npm/pacote/cacache offline packument/content completeness i fetch-child token-boundary fixture, chained keyset, stable SemVer selector/concurrent winner/backdated-publishedAt/downgrade fixture;
- release operator import-draft/publish lock/idempotency/conflict fixture bez CI mutation credentiala;
- Webshop migration bundle good/checksum-conflict i exact MigrationLedgerEvidenceV1 empty/populated/hash/nullability fixture;
- canonical 47-table `webshop` empty baseline i legacy 45-table `public -> webshop` cutover fixture sa postcondition fingerprintom, row/FK/index/owner/default+explicit ACL dokazom, crash/retry/restore i old 13-table/blind-seed rejectom;
- `HostAddonRouteBindingsV1` clean core/registry-empty/package-installed binding fixture, uključujući public purchase acceptance wrapper, null/forged Origin i package `app/**` non-discovery;
- worker PostgreSQL migration/lease/replay/result-outbox/backup/restore/exact installation epoch+generation pair fixture, DPAPI LocalMachine service-SID `os_secret_ref_local` provisioning/grant/controller-pipe/same-session phase-lease/rotation/crash-cleanup fixture i phase-env/network-exfiltration canary;
- deterministic core-bootstrap i `WindowsScmCmsServiceAdapterV1` service-name/SID/hash/PID-start/current/port/timeout/no-taskkill/vendor-client-isolation fixture;
- payment exact enum/risk, duplicate/partial/full/out-of-order, authorization/provider binding i unique captureEvidence/double-spend fixture; drugi `eventRef` istog capture-a daje identičan aggregate hash jer eventRef nije u evidence-u. Cumulative-only fixture obrađuje isti skup snapshotova u oba redosleda, emituje jedan stabilni monotonic-max red bez sabiranja, a unstable financial ref i cumulative+delta mixing završavaju u manual review-u. Negativni fixture-i odbijaju total različit od recomputed sume, 1001 evidence red, unsafe integer i overflow pre issue-a;
- fulfillment pre-send lock, financial/risk generation CAS, refund/dispute in-flight race, response-loss/idempotency/compensation fixture; master issuance-fence fixture pokriva sva četiri exact polja, missing/extra/non-integer/negative vrednosti i isti idempotency key sa promenjenim tuple-om (`409`, bez druge licence);
- issued-license envelope KID/AAD/legacy-rewrap/rotation fixture;
- master-secret, vendor-credential i installation-envelope active/old/legacy/rewrap/zero-count/restore fixture;
- transfer-approval active/old/expiry/compromise-cancel/backup-restore fixture, sa exact target `approvalBindingSignature`, master-persistiranim derivation KID-em i incident query-jem po KID-u;
- hash-only delivery token expiry/replay/ownership, bearer-path log canary i notification provider key-based commit-response-loss/generation/reconciliation fixture;
- lifecycle refund/dispute fixture i exact deactivation/transfer proof/state/local-finalization-pending/commit-response-loss/expired-receipt fresh-status recovery/conflict fixture; strict receipt fixture ima sva tri action/role union člana, exact deactivation/transfer core hash-eve i cross-role/header/claim reject, a source approval hash koristi exact 43-character UTF-8 code, ne decoded HMAC bytes;
- revalidation active/deactivated/transferred/revoked/network/5xx/restart/grace-expired fixture.

Fixture-i ne sadrže realne production ključeve. Test keyset je jasno označen i production verifier ga odbija.

## 17. Manual koraci naspram automatizacije

### Operator radi jednom ili po release-u

- kreira/održava GitHub private repo i read-only release verification workflow;
- održava namenski solo-maintainer release-authority računar, njegove
  operator-protected secret-refove i production public keyset prema dokumentu 15;
- provisionuje najmanje privilegovan registry read credential u worker secret store;
- provisionuje po targetu core owner/migrator/runtime, Webshop deployer/broker i service-SID matricu kroz auditovane CLI-jeve; ne daje runtime-u DDL niti worker job-store roli target CMS DB prava;
- izvršava operator-only core migracije i, samo za dokazani populated legacy DB, backupovan `db:webshop-schema-cutover`; blind `legacy_applied` ili ručni `SET SCHEMA` nije dozvoljen;
- čuva Caddy local CA trust i hosts zapise;
- postavlja `NODE_USE_SYSTEM_CA=1` kao process/service environment (ili pinovan `NODE_EXTRA_CA_CERTS`) za Node procese i testira server-side TLS;
- pre worker E2E-a dodaje `deploy.nr.test -> 127.0.0.1`, Caddy reverse proxy ka portu 3003 i worker health proveru;
- kreira/backupuje četiri PostgreSQL test baze, uključujući dedicated `nr_addon_deployment_worker_test`, i radi isolated worker-store restore/installation-scoped highest-epoch proveru;
- kroz `target:bootstrap` pravi prvi immutable addon-free vendor/client core release/current junction, zatim hash-verifikuje i provisionuje `NRVendorCms`/`NRClientCms` WinSW/SCM service SID/DACL model;
- pokreće one-time master admin bootstrap i menja password;
- kreira product/SKU i API client/scope kroz UI/CLI dok nema deklarativnog seed-a;
- preuzima immutable release evidence i ručno pokreće auditovane `release:import` pa `release:publish`; CI nema master mutation credential;
- unosi payment/email sandbox credentiale;
- odobrava release, migraciju, backup i production rollout;
- izvršava incident/key rotation/restore postupak kada je potreban.

### Sistem mora automatizovati

- source export u clean release;
- deterministic target bootstrap build/receipt i idempotentan recovery; operator i dalje odobrava prvi execution/service install;
- exact package install iz hosted registryja;
- release verification, build i migration ledger;
- service switch, health, reconciliation i rollback;
- activation/purchase proof;
- payment inbox, issue/notification/lifecycle outbox i retries;
- idempotency, replay protection i DLQ;
- secure delivery authorization;
- metrics, alerts, cleanup i audit.

Ručno kopiranje izmena u `D:\nr_cms-vendor` i `D:\nr_cms-client` nije prihvatljiva automatizacija.

## 18. No-go kriterijumi

Ne započinjati kompletan E2E ili produkcijski rollout ako važi bilo šta od sledećeg:

- vendor/client deployment sadrži `.private` ili paket je `extraneous` lokalna kopija;
- root `predev` i dalje zahteva `.private` u registry profilu;
- master API client nema aktivni secret version ili potrebne scopes;
- catalog request i master verifier koriste različite HMAC verzije;
- `catalogVersion` zavisi od GET vremena ili se menja bez poslovne catalog mutacije;
- release import ne čuva full immutable publication evidence, CI poseduje master mutation credential/endpoint, ili publish nije odvojeni auditovani draft transition;
- stable selector prihvata prerelease/build metadata, nema normalized unique, nije deterministički ili revalidation implicitno downgrade-uje release;
- production dependency graph proizvodi Linux authority za Windows target, addon se instalira pre secret-free tarball/manifest/graph i npm-compatible offline cacache/packument completeness verifikacije, registry token prelazi iz fetch childa u verifier/build/install, ili merge može promeniti bilo šta osim exact addon dependency-ja i njegovog signed grafa u pinovanom CMS base manifestu/locku;
- product je domain-required, a order snapshot može imati `domain=null`;
- variant nema tačan external SKU ili composite `externalLicenseEnvironment/externalLicenseCatalogVersion` binding;
- purchase-intent token ide kroz URL ili master nema svih sedam scoped/idempotentnih transition/status/payment-authorization ruta;
- isti purchase-intent JTI može završiti u dve cart/SKU/order-item linije;
- production domain-bound tok nema HTTPS well-known proof ili prihvata development exemption;
- installation fingerprint hashira raw PEM, prihvata non-Ed25519 ili legacy scheme dobija metadata-only rewrite;
- payment session može nastati pre confirmed consume + fresh status/hold + authorization, bez stable provider ID/idempotent create-or-retrieve, ili browser redirect pre authorization commit-a;
- V1 checkout/order dozvoljava više od jedne license linije/JTI-ja ili mixed cart;
- partial capture može pokrenuti issue;
- risk/hold ili financial/risk lifecycle CAS mismatch može pokrenuti/deliverovati issue, ili isti provider capture može finansirati drugi aggregate/order/JTI;
- payment aggregate uključuje provider `eventRef`, pa isti capture može dati različit hash zavisno od redosleda eventa;
- cumulative snapshotovi se sabiraju kao delta redovi, menjaju rezultat po arrival orderu, nemaju jedan stabilni financial-object ref ili se cumulative i delta evidence mešaju;
- master ne strict-validira exact četvoropoljni non-negative-integer `issuanceFence`, ne čuva ga uz issue operation/result ili isti idempotency key sa drugim fence tuple-om ne daje conflict;
- issued key nema autorizovan delivery put;
- external issued key se šifruje istim KEK-om kao master API credential ili nema KID/rewrap plan;
- activation callback i dalje guta grešku bez durable outbox-a, može upisati drugi terminalni rezultat za isti operation/job ili ponavlja success installed/ready write posle reconciliation-a;
- deployment nema exact installation-scoped epoch/generation pair-CAS/reset pravila, odvojeni target mutex do terminal receipt-a, historical-operation callback validaciju, no-mutation receipt za `rejected_before_switch`, exact stale ACK ili same-session reconciliation/readiness/recovery;
- activation/revalidation nema signed host-capability input ili worker ne proverava observed descriptor hash;
- worker prihvata request path/command/range/unknown package;
- package nema stvarne potpisane migration payload-e, descriptor postcondition fingerprint ili canonical `webshop` schema source-of-truth;
- root i package imaju divergentne Webshop business schema definicije, bilo koja od 45 business tabela ostaje/duplira se u `public` posle fresh installa, ili legacy cutover/`legacy_applied` nema exact table/row/FK/owner/ACL/fingerprint/backup dokaz;
- Next route zavisi od package `app/**` discovery-ja umesto core typed wrappera, package route/job capability nema tačno jedan `HostAddonRouteBindingsV1` binding ili acceptance POST je Server Action/broad CSRF exception;
- callback/reconciliation ne koristi exact MigrationLedgerEvidenceV1 hash/nullability contract;
- production verifier prihvata `local-dev:*` KID;
- entitlement/purchase keyset nema status/validity metadata ili at-rest ciphertext nema KID/keyring/rewrap put;
- `ready` se postavlja pre deploy/migration/reconciliation uspeha ili postoji drugi success-state writer pored fenced reconciliation helpera;
- worker verify/build vidi runtime tajne ili outbound mrežu posle fetch-a, DB phase vidi više od phase-scoped target lease-a, ili `os_secret_ref_local` nema DPAPI LocalMachine service-SID ACL/provisioning smoke, authenticated long-lived controller pipe, same-session-through-terminal-receipt, least-privilege grant/rotation/crash-cleanup contract; takođe je no-go worker bez dedicated migrated/backed-up PostgreSQL store-a;
- managed activation target je `next dev`/ručni PID/ad-hoc checkout umesto hash-pinovanog WinSW/SCM servisa i deterministic core-bootstrap release-a, ili adapter ima taskkill/PID-only/arbitrary-command fallback;
- notification provider ne može autoritativno retrieve-ovati po stabilnom `providerMessageKey`, ili bearer token path može završiti u proxy/app/APM/analytics logu;
- expired frozen lifecycle receipt nema exact original-installation-PoP `/lifecycle-status` challenge/complete i short-lived signed committed/not_committed/in_progress JWS vezan za originalni operation/request/result/lifecycle tuple sa dovoljnim tombstone retentionom, ili transfer code hash nije definisan nad exact 43-character UTF-8 code-om;
- outage grace ne radi posle restarta ili može nadživeti licencu;
- nema backup/rollback dokaza;
- tajna ili ključ se pojavljuje u log/test outputu.

## 19. Definition of Done po glavnom korisničkom toku

### Vendor setup je done kada

- master je dostupan i administrabilan iz prazne baze bez SQL bootstrap-a;
- Webshop product type/SKU/release/svih sedam purchase-intent API scope-ova su validni, unchanged catalog GET ima stabilan environment-bound version/ETag, a operator import/publish i deterministic stable release selector imaju full evidence;
- lifetime ključ vezan za `vendor.nr.test` aktivira tačno jedan installation ID;
- dedicated PostgreSQL-backed durable worker sa exact installation epoch/generation pair-CAS-om, target mutexom do terminal receipt-a i service-SID/DPAPI/controller `os_secret_ref_local` lease-om pre installa kroz secret-free npm-compatible offline cacache verifikuje hosted tarball/signed addon graph i strict CMS base manifest/lock invariant, zatim verifikuje MigrationLedgerEvidenceV1 i vendor završava u `ready` kroz jedinog reconciliation writer-a;
- core owner/migrator/runtime i `webshop` owner/deployer/runtime grant matrice, canonical 47-table addon schema/postcondition i WinSW/SCM bootstrap receipts su dokazani na fresh/restore fixture-u; nema business duplikata u `public`;
- source `.private\webshop` nije potreban u vendor deploymentu.

### Prodaja je done kada

- client dobija master-signed intent za `client.nr.test`;
- intent ide POST telom bez URL curenja i unique FK/state machine ga terminalno vezuju za tačno jedan `webshop_license_single` order item/snapshot;
- vendor proizvod ima četiri varijante i četiri tačne external SKU mape sa istim validnim composite environment/catalog bindingom;
- domen i SKU su immutable od product stranice do order itema;
- consume/status/payment-authorization/provider create-or-retrieve/commit koriste isti provider/JTI/order/item binding pre redirecta;
- pun captured payment sa clear risk-om izdaje tačno jednu odgovarajuću licencu; delta ili jedan stabilni cumulative monotonic-max evidence model, exact four-field issuance fence i master idempotency binding sprečavaju double count/stale issue, dok hold/capture i refund/dispute race ne isporučuju stale success i po potrebi daju jednu compensation;
- licenca ima unique FK ka istom consumed intentu, a vendor ciphertext koristi namenski issued-license KID;
- duplicate, outage i response loss ne menjaju cardinality;
- kupac bezbedno dobija ključ, a hash-only token/provider notification recovery ne pravi drugi email/token pri unknown commitu i tajna nije procurila.

### Client aktivacija je done kada

- ključ se prihvata samo za `client.nr.test` i dokazani installation identitet;
- installation fingerprint je canonical Ed25519 SPKI-DER scheme; legacy raw-PEM identitet prolazi signed rebind/re-enroll, ne metadata rewrite;
- production policy zahteva HTTPS kontrolu hostname-a, dok lokalni `.nr.test` tok čuva explicit development izuzetak;
- entitlement pokazuje tačan immutable release;
- master bira release prema signed host capability descriptoru, a client-specific worker meri isti hash pre build/migration/switch-a, verifikuje exact signed addon-reachable transitive graph i deployuje exact package;
- reconciliation potvrđuje package/hash/schema i postavlja `ready`;
- vendor/client podaci, identiteti, baze i procesi ostaju izolovani.

### Operacije su done kada

- revalidation, expiry, suspend, revoke i deactivation rade deterministički; post-receipt-expiry recovery koristi exact PoP lifecycle-status JWS/tombstone contract i nikada generic cached-active fallback;
- refund/dispute tok prati definisanu lifecycle tabelu;
- deactivation i domain transfer koriste exact purpose-proof/idempotency/state contract; transfer atomski dokazuje target domain/installation i source installation i ne radi direktnim editom;
- entitlement/purchase-intent signing keyseti, sva četiri at-rest envelope keyringa (master, vendor credential, installation, issued-license) i transfer-approval derivation secret imaju testiranu rotaciju/compromise proceduru;
- outage grace, restart, rollback i restore drill prolaze;
- queue/DLQ/paid-but-unissued/key rotation alertovi rade;
- [09 — E2E pass lista](09-lokalni-e2e-runbook.md#18-završna-passfail-lista) je kompletna.

## 20. Završni artefakti implementacije

Na kraju mora postojati:

- odvojeni commitovi/PR-ovi za CMS, Webshop, master i worker;
- sve nove Drizzle/SQL migracije i checksum ledgeri;
- verzionisani contract schema/fixture-i;
- objavljen immutable GitHub Package;
- master release record vezan za njegov hash/KID;
- audit dokaz operator `release:import` draft + odvojeni `release:publish`, bez CI master mutation credentiala;
- target-specific worker konfiguracija bez tajni u Git-u;
- dedicated migrated `nr_addon_deployment_worker_test`/production worker PostgreSQL store sa backup/restore/highest-epoch dokazom;
- env template-i za development/vendor/client/master/worker;
- CI rezultati i redigovani E2E evidence zapis;
- backup/restore i rollback dokaz;
- ažurirana ova dokumentacija ako se finalni naziv polja, rute ili skripte razlikuje.

Tek kada su ovi artefakti i svi Definition of Done uslovi ispunjeni može se tvrditi da unos license key-a „aktivira Webshop”. Pre toga sistem samo validira pravo ili enqueue-uje deo procesa.
