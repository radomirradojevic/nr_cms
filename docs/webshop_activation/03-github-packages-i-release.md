# 03 — GitHub Packages i Webshop release

## Cilj

Privatni Webshop source iz:

    D:\nr_cms\.private\webshop

objavljuje se kao immutable restricted npm package:

    @radomirradojevic/webshop@<EXACT_VERSION>

na:

    https://npm.pkg.github.com

Vendor i client deployment preuzimaju package iz registryja. Ne koriste development source.

## 1. Postojeći package ugovor

.private/webshop/package.json već definiše:

    name: @radomirradojevic/webshop
    version: 0.5.0
    access: restricted
    registry: https://npm.pkg.github.com
    package manager: npm 11.12.1

Package exports:

    @radomirradojevic/webshop
    @radomirradojevic/webshop/server
    @radomirradojevic/webshop/manifest

Runtime lokacija posle instalacije:

    node_modules\@radomirradojevic\webshop

## 2. GitHub repository i package pristup

Source repo:

    https://github.com/radomirradojevic/webshop

MANUAL:

1. Repo mora ostati private.
2. GitHub Environment private-release mora postojati.
3. Environment treba da zahteva ručno odobrenje publish joba.
4. Package access nakon prvog publish-a mora dozvoliti:
   - `webshop` repo workflowu write kroz `GITHUB_TOKEN`;
   - deployment machine nalogu read;
   - nijednom browser/client identitetu pristup.
5. Ako se koristi organizacija sa SSO, deployment credential mora biti eksplicitno autorizovan za SSO.

Prema aktuelnom GitHub Packages ugovoru, npm registry autentifikacija van GitHub Actions koristi **personal access token (classic)**; fine-grained PAT ili GitHub App installation token se ne pretpostavlja kao podržana npm autentifikacija. Za lokalni deployment worker zato koristiti namenski machine-user nalog sa:

- `read:packages` scope-om, bez `write:packages` i `delete:packages`;
- read pristupom konkretnom privatnom package-u odnosno source repo-u ako package nasleđuje repo permissions;
- eksplicitnim SSO odobrenjem ako ga organizacija zahteva.

Ako se worker jednog dana izvršava kao GitHub Actions job, može koristiti `GITHUB_TOKEN` samo kada je tom workflow repozitorijumu u package settings-u eksplicitno dodeljen read pristup. Npm registry podržava granular package permissions, pa package treba ostaviti private i dodeliti samo read ulogu deployment identitetu.

Autoritativne spoljne reference:

- [GitHub Packages permissions i PAT classic zahtev](https://docs.github.com/en/packages/learn-github-packages/about-permissions-for-github-packages)
- [GitHub npm registry autentifikacija](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)
- [Package access i GitHub Actions repository access](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility)

## 3. Project .npmrc i secret .npmrc

Commitovani root .npmrc sme sadržati samo javnu konfiguraciju:

    registry=https://registry.npmjs.org/
    @radomirradojevic:registry=https://npm.pkg.github.com
    save-exact=true
    save-prefix=

Ne commitovati:

    //npm.pkg.github.com/:_authToken=...

`NRAddonRegistryCredentialBroker` pravi privremeni npm user config van release artefakta samo za credentialed fetch child A/B:

    registry=https://registry.npmjs.org/
    @radomirradojevic:registry=https://npm.pkg.github.com
    //npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}

`${NODE_AUTH_TOKEN}` iznad je literalna npm env interpolacija; stvarna token vrednost se ne upisuje u fajl. Registry broker postavlja `NPM_CONFIG_USERCONFIG` i `NODE_AUTH_TOKEN` samo u one-shot fetch child A ili B koji kroz pinovani `pacote` puni quarantine/job cache. Orchestrator, secret-free verifier, offline lock-merge/`npm ci`, build i DB controller nikada ne dobijaju ovaj config ili token. Svaki fetch child radi pod zasebnim fetch identity-jem/no-breakaway Job Object-om; po završetku svakog childa:

1. briše privremeni config;
2. uklanja token iz child env-a;
3. skenira log/evidence za token fingerprint;
4. ne kopira npm cache koji može sadržati credential metadata u release artefakt;
5. tek posle credential-canary scan-a predaje provereni cache secret-free auditoru pod odvojenim build-sandbox SID-em.

## 4. Release signing authority

Webshop package release potpis i master entitlement potpis nisu isti key.

Release authority mora biti persistentan i kontrolisan:

    NR_ADDON_RELEASE_SIGNING_KEY_FILE=<RUNNER_SECRET_PATH>
    NR_ADDON_RELEASE_PUBLIC_KEYS_FILE=<RUNNER_PUBLIC_KEYSET_PATH>
    NR_ADDON_RELEASE_SIGNING_KID=webshop-release-2026-01

Private key:

- postoji samo na zaštićenom self-hosted release runneru ili KMS-u;
- nije u GitHub repo secret tekstu ako workflow očekuje file path;
- nije u D:\nr_cms;
- nije u npm package-u;
- ima backup i rotation proceduru.

Public keyset nije secret. Odobreni keyset se:

- koristi u publish verifikaciji;
- distribuira master release-import verifieru;
- distribuira deployment workeru;
- izlaže masteru i workeru iz statički konfigurisane read-only lokacije, uz pinovani SHA-256 istog keyset fajla;
- hash-uje i beleži u import/deployment evidence;
- može sadržati `active`, `verification_only` i `revoked` redove prema schema-i ispod.

Za lokalni E2E canonical trust artefakt je, na primer:

    D:\nr_runtime\trust\webshop-release-public-keys.json

Master i worker imaju read-only pristup istom sadržaju i svaki u svojoj konfiguraciji pinovan expected SHA-256. Publish runner ima sopstvenu kontrolisanu kopiju; jednakost se dokazuje hashom, ne deljenjem private key-a ili implicitnim current-working-directory fajlom.

Exact `AddonReleaseKeysetV1` schema je:

```json
{
  "contractVersion": 1,
  "issuer": "https://github.com/radomirradojevic/webshop",
  "purpose": "addon_release",
  "generatedAt": "<RFC3339_UTC_TIMESTAMP>",
  "sequence": 1,
  "previousKeysetSha256": null,
  "keys": [
    {
      "kid": "webshop-release-2026-01",
      "alg": "EdDSA",
      "publicKeyPem": "<ED25519_PUBLIC_PEM>",
      "notBefore": "<RFC3339_UTC_TIMESTAMP>",
      "notAfter": null,
      "status": "active|verification_only|revoked"
    }
  ]
}
```

Fajl je RFC 8785/JCS UTF-8 bez BOM-a i završnog newline-a. `contractVersion`/`sequence` su integeri; sva vremena su canonical UTC RFC 3339 sa `Z`, sekundama i opciono tačno tri decimalne cifre. Od sequence 2 nadalje `previousKeysetSha256` je lowercase 64-hex SHA-256 exact prethodnog keyset fajla. KID-evi su jedinstveni i postoji tačno jedan `active` key. Publish potpisuje samo vremenski važećim `active` key-em; master/worker verifikuju vremenski važeći `active` ili `verification_only`, dok `revoked` uvek fail-closed nadjačava vreme, pinovani cache i rollback potrebu.

Svaki consumer trajno čuva poslednji prihvaćen sequence/hash. Niži sequence je rollback; isti sequence sa istim hashom je idempotentan, a sa različitim hashom incident; viši sequence mora chain-ovati trenutno prihvaćen hash i imati non-decreasing `generatedAt`. Planirana rotacija je dvostepena: sequence N+1 prepublikuje novi key kao `verification_only` sa budućim `notBefore` i zadržava stari kao jedini `active`; posle potvrde mastera/workera sequence N+2, ne pre `notBefore`, menja novi u jedini `active`, stari u `verification_only`. Pipeline počinje da potpisuje novim KID-em tek po potvrdi N+2. Stari red se uklanja tek po isteku svih legitimnih release/rollback retention potreba.

Kompromitovan KID se odmah postavlja na `revoked`, nikada `verification_only`. Master povlači svaki pogođeni release i odbija novi import; worker odbija novi i već queued job pre package izvršavanja. Već aktivni runtime ne briše se naslepo: target se izoluje/reconcile-uje prema poslednjem dokazano dobrom release-u ili prelazi u maintenance prema incident runbooku. Trenutna plain KID→PEM konfiguracija migrira se u sequence-1 fixture, a master, worker i publish testovi moraju deliti valid/expired/future/revoked/rollback vektore.

### Obavezna hardening izmena

Trenutni verifier odbija neke fixture KID prefikse, ali mora eksplicitno odbiti svaki:

    local-dev:*
    local-build-fixture*
    local-acceptance:*

u hosted publish i vendor/client deployment modu.

Još bezbednije pravilo je allowlista production KID-ova, umesto liste zabranjenih prefiksa.

Dodati test koji pravi validno potpisan manifest sa local-dev KID-em i očekuje hard failure u non-development modu.

## 5. Postojeći publish workflow

Workflow:

    .private/webshop/.github/workflows/publish-package.yml

Već radi:

- manual workflow_dispatch;
- exact release tag input;
- repository identity gate;
- protected environment;
- pinned Node 24.15.0;
- npm 11.12.1 gate;
- clean source state;
- tag mora biti v<package.json version>;
- HEAD mora biti ancestor origin/master-ws;
- operator-provided CMS SHA mora postojati kao commit objekat u CMS repo kopiji na runneru;
- clean CMS i Webshop archive export;
- frozen dependency install bez lifecycle scripts;
- clean Next host verification;
- signed release build;
- publish-ready i pack verifikaciju;
- objavljivanje tačno prethodno verifikovanog tarballa;
- GITHUB_TOKEN samo u publish koraku.

Postojeći gate samo dokazuje da CMS commit objekat postoji; ne dokazuje sam da je commit odobren ili ancestor dozvoljene grane/taga. Pre produkcionog publish-a workflow treba hardenovati tako da `NR_CMS_RELEASE_SHA` mora biti dostižan iz eksplicitno dozvoljenog signed taga ili release grane, odnosno da protected Environment approval prikazuje i proverava taj ancestry dokaz.

GitHub Environment variables koje workflow čita:

    NR_CMS_RELEASE_SHA
    NR_PRIVATE_WORKSPACE_ROOT
    NR_ADDON_RELEASE_PUBLIC_KEYS_FILE
    NR_ADDON_RELEASE_SIGNING_KEY_FILE
    NR_ADDON_RELEASE_SIGNING_KID

Self-hosted runner mora imati labele:

    self-hosted
    Linux
    night-raven-private

Ako se release pokreće sa Windows runnera, ne menjati samo labelu. Workflow koristi bash, tar i Linux path semantiku; napraviti i testirati poseban Windows workflow ili zadržati Linux runner.

TARGET dependency-graph gate je zaseban job na stvarnom Windows x64 runneru sa labelama:

    self-hosted
    Windows
    X64
    night-raven-private

Postojeći Linux job može ostati build/pack/sign/publish autoritet, ali običan Linux `npm ci` ne sme generisati niti potvrditi `platform.os=win32` optional/peer graph. Windows job checkout-uje isti exact Webshop tag i CMS SHA, proverava Node `24.15.0`/npm `11.12.1`, radi clean `npm ci --omit=dev --ignore-scripts`, generiše canonical `release-dependency-lock.json` iz stvarnog Win32/x64 resolved tree-a i vraća fajl + SHA-256 + runner OS/CPU/npm evidence kroz hash-verifikovan workflow artifact handoff. Taj job nema release signing key, `packages:write` ili `contents:write`; Linux signing job prihvata output samo iz istog workflow run/attempt-a, ponovo proverava strict schema/hash i tek ga tada uključuje u tarball/manifest. `npm_config_platform` emulacija na Linuxu nije dovoljan production gate za prvi Windows-only contract. Ako se kasnije podrži drugi runtime OS/CPU, dobija zaseban platform graph/release contract umesto prepisivanja ovog fajla.

## 6. Release priprema

### 6.1 Pre-release lokalni gate

Iz D:\nr_cms\.private\webshop:

    npm ci --ignore-scripts
    npm run release:check:local
    npm run install:verify:next

Iz D:\nr_cms:

    npm ci --ignore-scripts
    npm run typecheck
    npm run test
    npm run acceptance:local:private-packages

Local release authority dokazuje pipeline, ali njegov artefakt nije promotable.

### 6.2 Verzija

Za svaku sadržajnu izmenu:

1. povećati package.json version prema SemVer odluci;
2. regenerisati package-lock;
3. izgraditi release artefakte;
4. proveriti da manifest packageVersion odgovara package.json;
5. commitovati Webshop izmene;
6. commitovati kompatibilne CMS host izmene;
7. zabeležiti operator-pinned CMS SHA u protected Environment varijablu i dokazati njegov dozvoljeni tag/branch ancestry.

Ne menjati postojeći objavljeni tarball pod istom verzijom.

### 6.3 Tag

Na čistom Webshop commitu:

    git tag -a v<PACKAGE_VERSION> -m "Webshop v<PACKAGE_VERSION>"
    git push origin <RELEASE_BRANCH>
    git push origin v<PACKAGE_VERSION>

Pre dispatch-a:

    git status --short
    git rev-parse HEAD
    git rev-parse v<PACKAGE_VERSION>^{commit}

Oba SHA-a moraju biti ista, a status prazan.

### 6.4 Workflow dispatch

Pokrenuti Publish Private Webshop Package i uneti:

    release_tag = v<PACKAGE_VERSION>

Odobriti private-release Environment tek nakon pregleda:

- CMS SHA;
- Webshop tag SHA;
- production signing KID;
- package version;
- test rezultate;
- absence of secrets;
- migration compatibility.

## 7. Package sadržaj

Package već isporučuje:

    dist
    release-manifest.json
    provenance.json
    sbom.json
    migrations.json

Release manifest pokriva:

- TARGET stabilni release ID (AS-BUILT manifest ga nema);
- package identity;
- runtime contract;
- CMS range;
- Node i Next.js range;
- minimalnu core schema verziju;
- schema version;
- capabilities;
- artifact inventory;
- file hash-eve i veličine;
- versionirani aggregate artifact SHA bez self-reference;
- release signing KID;
- Ed25519 potpis.

### 7.0 Exact release identitet, inventory i embedded potpis

TARGET `releaseId` je UUIDv5, sa zauvek zaključanim namespace-om:

    2d9df97a-b9f5-5a52-9f02-8e66df8f0b7c

UUID name bytes su UTF-8 bez BOM-a i završnog newline-a:

    ASCII("NRV-ADDON-RELEASE-ID-V1\n") || RFC8785_JCS({
      "addonKey": "webshop",
      "cmsGitSha": "<40_LOWERCASE_HEX>",
      "packageName": "@radomirradojevic/webshop",
      "packageVersion": "<NORMALIZED_EXACT_SEMVER>",
      "webshopTagGitSha": "<40_LOWERCASE_HEX>"
    })

`webshopTagGitSha` je commit na koji annotated/lightweight `v<PACKAGE_VERSION>` tag konačno pokazuje, a `cmsGitSha` je odobreni host commit. UUIDv5 ugrađeni SHA-1 služi samo stabilnom namespacingu; bezbednosni integritet daju SHA-256/Ed25519 ugovori ispod. Zajednički fixture mora uključiti sledeći vektor:

```text
addonKey=webshop
cmsGitSha=0000000000000000000000000000000000000000
packageName=@radomirradojevic/webshop
packageVersion=1.2.3
webshopTagGitSha=1111111111111111111111111111111111111111
releaseId=74427245-0c27-5400-9686-e6cc2d177db4
```

`ArtifactInventoryDigestV1` je strict JSON objekat:

```json
{
  "contractVersion": 1,
  "digestPurpose": "addon_runtime_payload",
  "entries": [
    {
      "path": "dist/index.js",
      "sha256": "<64_LOWERCASE_HEX>",
      "size": 123
    }
  ]
}
```

Inventory sadrži svaki regularni fajl koji `npm pack` stavlja pod `package/`, sa putanjom relativnom tom root-u, osim tačno `release-manifest.json`, `provenance.json` i `sbom.json`. To znači da obavezno pokriva `package.json`, `release-dependency-lock.json`, `dist/**`, `migrations.json`, `migrations/**` i svaki drugi runtime fajl. Putanja koristi `/`, Unicode NFC, nema leading slash, backslash, prazan segment, `.`/`..` ili duplikat; symlink/hardlink/device entry je zabranjen. Redovi su sortirani rastuće po UTF-8 byte vrednosti putanje, `size` je non-negative JSON integer i hashira exact file bytes. Worker odbija nedeklarisan runtime fajl i svaku razliku u listi/hash/size.

Pošto je target Windows, validator dodatno odbija case-insensitive ili NFC-equivalent duplikate, `:`/NTFS ADS, drive-letter, UNC i `\\?\`/`\\.\` prefikse, NUL/control karaktere, segment sa trailing space/dot i case-insensitive Windows device ime `CON|PRN|AUX|NUL|COM1..COM9|LPT1..LPT9` čak i sa ekstenzijom. Ekstrakcija prvo validira celu tar listu bez write-a, zatim za svaki entry računa canonical resolved destination i dokazuje da je child privremenog job root-a. Archive library radi sa zabranjenim linkovima i bez overwrite-a postojećeg entry-ja. Fixture-i obavezno pokrivaju `Foo`/`foo`, composed/decomposed Unicode, `file:stream`, `CON.txt`, `dir.`, traversal i link escape.

Exact vrednost je:

    artifactSha256 = lowercaseHex(SHA-256(RFC8785_JCS(ArtifactInventoryDigestV1)))

`artifactSha256` zato nije hash tarball-a i nikada ne uključuje manifest koji sadrži tu vrednost. Workflow radi two-pass pack: prvi tarball se raspakuje radi inventoryja, generišu se finalni manifest/provenance/SBOM, zatim se pravi finalni tarball, ponovo raspakuje i dokazuje da je inventory scope identičan. `npmTarballSha256` i SRI u publication attestation-u vezuju sve tarball bytes, uključujući tri izuzeta metadata fajla.

TARGET `release-manifest.json` je flattened JWS JSON envelope i nema dodatna polja:

```json
{
  "protected": "<BASE64URL_JCS_PROTECTED_HEADER>",
  "payload": "<BASE64URL_JCS_RELEASE_MANIFEST_PAYLOAD_V2>",
  "signature": "<BASE64URL_ED25519_SIGNATURE>"
}
```

Protected objekat je tačno `{"alg":"EdDSA","kid":"<RELEASE_KID>","typ":"NRV-ADDON-RELEASE-MANIFEST-V2+JWS"}`. Decoded `ReleaseManifestPayloadV2` je strict objekat bez dodatnih polja:

```json
{
  "manifestVersion": 2,
  "purpose": "addon_release_manifest",
  "releaseId": "<UUIDV5>",
  "addonKey": "webshop",
  "packageName": "@radomirradojevic/webshop",
  "packageVersion": "<EXACT_SEMVER>",
  "webshopTagGitSha": "<40_LOWERCASE_HEX>",
  "cmsGitSha": "<40_LOWERCASE_HEX>",
  "releasedAt": "<RFC3339_UTC_TAG_COMMIT_TIMESTAMP>",
  "runtimeContractVersion": "1",
  "cmsVersionRange": "<SEMVER_RANGE>",
  "nodeVersionRange": "<SEMVER_RANGE>",
  "nextVersionRange": "<SEMVER_RANGE>",
  "minimumCoreSchemaVersion": 1,
  "schemaVersion": 1,
  "supportedAddonSchemaVersionMin": 1,
  "supportedAddonSchemaVersionMax": 1,
  "supportedLicenseEditions": ["standard"],
  "channel": "stable",
  "entrypoints": {"server": "./dist/server.js"},
  "capabilities": ["<SORTED_UNIQUE_CAPABILITY>"],
  "artifactInventory": {"contractVersion": 1, "digestPurpose": "addon_runtime_payload", "entries": []},
  "artifactSha256": "<64_LOWERCASE_HEX>",
  "dependencyLockSha256": "<64_LOWERCASE_HEX>",
  "migrations": [],
  "migrationBundleHash": "<64_LOWERCASE_HEX>",
  "releaseSigningKid": "<SAME_AS_PROTECTED_KID>"
}
```

`releasedAt` se dobija deterministički u dva koraka: `source = git show -s --format=%cI <webshopTagGitSha>` se parse-uje kao instant sa njegovim originalnim offsetom, zatim se emituje canonical UTC RFC 3339 `YYYY-MM-DDTHH:mm:ss.sssZ` (u JavaScriptu validirani `new Date(source).toISOString()`, sa tačno tri decimalne cifre). Raw `%cI` nije nužno UTC/Z i ne ulazi direktno u manifest. Release fixture zaključava exact rezultat i sadrži commit vreme sa `+02:00` koje mora dati odgovarajući `Z` instant. Zato se vrednost ne menja pri retry-u. `capabilities` je leksikografski sortirana lista bez duplikata. `dependencyLockSha256` je hash exact `release-dependency-lock.json` bytes iz sledećeg odeljka. `migrations` je sortirana po `id` i koristi exact descriptor iz sledećeg odeljka; `migrationBundleHash=lowercaseHex(SHA-256(RFC8785_JCS(migrations)))`. `schemaVersion` je target posle migracija; supported min/max su pozitivni integeri sa `min <= schemaVersion <= max` i deklarativno određuju sa kojim već postojećim addon DB schema verzijama taj package može bezbedno raditi. `entrypoints` za V2 ima samo prikazani `server` ključ. Potpisani bytes su ASCII `protected + "." + payload`; sva base64url polja su bez paddinga. Envelope fajl je RFC 8785/JCS UTF-8 bez BOM-a/završnog newline-a, a `embeddedManifestSha256` je lowercase SHA-256 baš tih stored bytes. Strict parser odbija unknown/duplicate JSON polja, nekanonski base64url, drugi `alg/typ/purpose`, KID neslaganje, nepodržan range/schema ili vrednost koja se ne slaže sa `package.json`/artefaktom. `releaseId` ulazi u manifest, provenance, master zapis, entitlement i deployment evidence.

`runtimeContractVersion="1"` normativno znači registry-loader/typed host-delegate contract, ne Next route discovery iz package-a. `capabilities` za svaki izloženi route/job sadrži njegov verzionirani binding ID iz core `HostAddonRouteBindingsV1`; obavezni su najmanje purchase-intent acceptance, generic `/api/webshop/**`, storefront/dashboard, download, payment-webhook/return aliasi i fulfillment job binding. Base CMS commit poseduje stvarne `app/**/route.ts|page.tsx` wrapper fajlove, dok package server entrypoint poseduje `handleApiRoute`, render i `jobs` implementacije. Build iz clean checkouta bez `.private` importuje instalirani server entrypoint i poredi njegov declared binding skup sa core static manifestom: missing/duplicate/unknown binding ili package `app/**` kao jedini navodni route je compatibility failure pre migracije. Addon-free core bootstrap očekuje isti wrapper manifest, ali 404/disabled delegate dok registry nema package.

### 7.1 Potpisani produkcioni dependency graph

Top-level package version i tarball hash nisu dovoljni ako se transitive dependency range ponovo razrešava pri deploymentu. Zasebni native Windows x64 workflow job zato iz clean Webshop lockfile-a, pinned Node/npm verzije i `npm ci --omit=dev --ignore-scripts` generiše `release-dependency-lock.json`. Linux signing/publish job prihvata samo hash-verifikovan output istog workflow run-a, uključuje ga u npm tarball/artifact inventory i potpisuje njegov exact lowercase SHA-256 kao `dependencyLockSha256` u manifestu.

Strict JCS fajl bez unknown polja ima:

```json
{
  "contractVersion": 1,
  "purpose": "addon_production_dependency_graph",
  "packageManager": "npm",
  "packageManagerVersion": "<EXACT_NPM_SEMVER>",
  "platform": {"os": "win32", "cpu": "x64", "libc": null},
  "root": {
    "name": "@radomirradojevic/webshop",
    "version": "<EXACT_SEMVER>",
    "dependencies": [
      {"kind": "prod|optional|peer|peer_optional", "name": "<PACKAGE_NAME>", "targetNodeId": "sha256:<64_LOWERCASE_HEX>"}
    ]
  },
  "nodes": [
    {
      "nodeId": "sha256:<64_LOWERCASE_HEX>",
      "name": "<PACKAGE_NAME>",
      "version": "<EXACT_SEMVER>",
      "integrity": "sha512-<STANDARD_BASE64_WITH_PADDING>",
      "resolved": "<ALLOWLISTED_HTTPS_REGISTRY_TARBALL_URL>",
      "dependencies": []
    }
  ]
}
```

Za svaki node `nodeId = "sha256:" + lowercaseHex(SHA-256(RFC8785_JCS({name,version,integrity})))`. Node ID je unique; nodes su sortirani po UTF-8 `nodeId`, a svaka dependencies lista po UTF-8 tuple-u `(kind,name,targetNodeId)`. Svaka edge meta postoji u nodes, nema cikličnog parser recursion-a bez visited seta, dev dependency nije reachable, a optional/peer odluka je eksplicitna za pinovani `win32/x64` target. `resolved` mora biti HTTPS URL na allowlisted npm/GitHub registry hostu, bez userinfo/query/fragmenta; integrity je obavezan. Direct production dependency range u package.json mora biti exact, a graph root/package identitet mora odgovarati manifestu.

Worker pre izvršenja package koda prvo u quarantine direktorijum preuzima exact glavni tarball, proverava job/attestation SHA-256 i SRI, bezbedno čita potpisani manifest i `release-dependency-lock.json`, pa tek iz verifikovanog grafa preuzima svaki reachable tarball sa allowliste i zahteva signed integrity. Registry credential se uklanja pre package-lock merge-a ili installa; naredni npm koraci su offline. Posle merge-a sa pinovanim CMS lockfile-om i `npm ci --offline --ignore-scripts`, worker rekonstruiše logički reachable addon graph iz finalnog package-lock/installed metadata: svaki node/edge/integrity mora biti isti, nijedan dodatni addon-reachable production node nije dozvoljen, a host-provided peer mora rešiti baš potpisani target node. Fizičko npm dedupe mesto nije identitet.

Pinovani `cmsGitSha` je autoritet i za base `package.json`/`package-lock.json`. Pre merge-a worker čuva exact bytes i zasebne `cmsBasePackageJsonSha256`/`cmsBasePackageLockSha256`; posle `--package-lock-only --offline` strict manifest/lock diff mora dokazati da je jedina dozvoljena manifest promena jedan exact production dependency `@radomirradojevic/webshop=<EXACT_VERSION>` i da su jedine lock promene novi node/edge redovi reachable iz tog root-a i exact jednaki potpisanom addon graph-u. Scripts, package-manager metadata i sva druga manifest polja, kao i svaki postojeći core node, edge, version, resolved URL, integrity, peer context, lockfileVersion ili drugi root field, ne smeju biti promenjeni/uklonjeni. Finalni `cmsMergedPackageJsonSha256`, `cmsMergedPackageLockSha256`, base hash-evi i diff summary ulaze u worker phase evidence. Mismatch je permanent supply-chain failure pre migration/switch-a. Fixture-i menjaju manifest script/drugi dependency, jednu transitivnu verziju, integrity, edge, peer resolution, optional platform, postojeći core node i dodaju extra node; svaki mora pasti.

AS-BUILT flat manifest sa `manifestVersion=1` i top-level `signature` je zaseban legacy format. Compatibility reader sme da ga koristi samo za audit/migration fixture postojećih lokalnih artefakata; master hosted release import i worker vendor/client install ga nikada ne označavaju production-eligible. V1 parser ne pokušava JWS decode, a V2 parser ne prihvata flat signature. Cross-format confusion, V1 local KID i promenjen `manifestVersion/typ` su obavezni negativni fixture-i.

### GAP: migration payload

migrations.json trenutno sadrži samo ID i checksum. Stvarni SQL:

    .private/webshop/src/db/migrations/0001_webshop_core.sql

nije u package files listi.

### TARGET

Package mora uključiti:

    migrations/0001_webshop_core.sql

i svaki budući migration payload. Svaki strict descriptor nema dodatna polja i izgleda tačno:

```json
{
  "id": "0001_webshop_core.sql",
  "path": "migrations/0001_webshop_core.sql",
  "checksum": "<64_LOWERCASE_HEX>",
  "postconditionSchemaFingerprintSha256": "<64_LOWERCASE_HEX>",
  "schemaVersion": 1,
  "destructive": false,
  "requiresBackup": true,
  "rollbackPolicy": "expand_compatible"
}
```

`id` odgovara `^[0-9]{4}_[a-z0-9_]+\\.sql$`; `path` je tačno `"migrations/" + id` i prolazi sva inventory Windows/path pravila; `checksum` je SHA-256 exact SQL file bytes; `postconditionSchemaFingerprintSha256` je lowercase SHA-256 RFC 8785/JCS `WebshopSchemaFingerprintV1` projekcije očekivane šeme posle tog koraka; `schemaVersion` je pozitivan JSON integer. `destructive` i `requiresBackup` su JSON booleani, ne stringovi. Schema enum poznaje buduće `rollbackPolicy=expand_compatible|forward_only`, ali prvi managed activation/deployment contract prihvata isključivo `destructive=false` i `rollbackPolicy=expand_compatible`. Bilo koji `destructive=true` ili `forward_only` release publisher/master import/worker admission odbija kao `unsupported_migration_policy` pre CMS DB lease-a, phase write-a ili addon-schema mutacije. ID/path su unique, lista je rastuće sortirana po UTF-8 byte vrednosti ID-a, a `schemaVersion` strogo raste i, kada lista nije prazna, poslednja vrednost odgovara manifest `schemaVersion`. Descriptor, `migrations.json`, manifest lista, stvarni inventory SQL i postcondition fixture moraju biti byte/hash konzistentni. Empty bundle je `[]` i njegov zaključani `migrationBundleHash` fixture je `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`.

SQL fajl mora biti deo potpisanog artifact inventoryja.

#### Canonical `webshop` schema i legacy cutover

AS-BUILT root `db/schema.ts` ima 45 poslovnih `webshop_*` tabela u `public`, dok trenutni package `src/db/schema.ts`/`0001_webshop_core.sql` opisuje drugi, zastareli model od 13 tabela. Samo sedam imena se preklapa, bez jednake strukture, a package 0.5.0 ne pakuje SQL bytes. Zato se postojeći `0001` ne izvršava, ne seeduje i taj release nije production-eligible. Prvi eligible package mora zameniti ga kompletnim canonical baseline-om, stvarno uključiti SQL u tarball i koristiti `pgSchema("webshop").table(...)` plus schema-qualified SQL; globalni `search_path` nije autoritet.

Tačan relocation allowlist postojećih addon-owned tabela je:

```text
webshop_license_servers, webshop_license_server_catalog_items,
webshop_license_server_issues, webshop_license_server_operations,
webshop_outbox_events,
webshop_categories, webshop_category_closure, webshop_attributes,
webshop_category_attributes, webshop_category_attribute_exclusions,
webshop_products, webshop_product_categories, webshop_product_media,
webshop_product_variants, webshop_product_attribute_values,
webshop_product_variant_attribute_values,
webshop_digital_asset_files, webshop_digital_assets,
webshop_download_entitlements, webshop_download_events,
webshop_carts, webshop_cart_items, webshop_checkout_sessions,
webshop_checkout_reservations, webshop_orders, webshop_order_items,
webshop_license_keys, webshop_order_addresses, webshop_payments,
webshop_payment_provider_references, webshop_payment_attempts,
webshop_payment_events, webshop_fulfillments,
webshop_fulfillment_documents, webshop_order_delivery_confirmations,
webshop_refunds, webshop_refund_items, webshop_payment_disputes,
webshop_coupons, webshop_coupon_redemptions, webshop_wishlists,
webshop_wishlist_items, webshop_related_products,
webshop_product_reviews, webshop_audit_events
```

`public.webshop_addon_entitlements`, `license_server_addon_entitlements`, `vendor_addon_installation_identities`, svi `cms_addon_*` control-plane redovi i generic `security_rate_limit_buckets` ostaju u `public`. License-server/customer-issuer tabele nisu Webshop addon ownership. Business settings, storefront presets i order-number allocator moraju izaći iz `webshop_addon_entitlements.metadata` u novu `webshop.webshop_settings`; control-plane metadata posle backfilla sadrži samo license/release/lifecycle/activation podatke.

Canonical baseline pored 45 relokovanih tabela uvodi `webshop.webshops` anchor i `webshop.webshop_settings`. Da bi postojeće `webshop_id` vrednosti ostale stabilne, `webshops.id` je isti UUID kao odgovarajući `public.content.id`, uz FK ka `public.content`, DB-proveren `content_type=webshop`, soft-archive i single-active-webshop invariant. Business tabele referenciraju anchor, ne neposredno content; finansijska/order istorija koristi `RESTRICT`/soft archive, nikada cascade brisanje storefront contenta. Cross-schema FK-ovi ka `public.files` i `public.galleries` ostaju schema-qualified sa postojećim indeksima. Addon deployer ima samo `USAGE` na `public` i exact `REFERENCES` nad `content/files/galleries`, bez njihovog SELECT/DML/ownership prava. Trenutni canonical skup koristi UUID-e i nema addon sekvencu; buduća order sekvenca mora biti `webshop`-owned i manifestom grantovana runtime-u.

`WebshopSchemaFingerprintV1` strict sortira i hashira `(schema,table)`, kolone/type/default/nullability, PK/unique/check/FK target+delete rule, indekse i owner očekivanje; privilege ACL je zasebno vezan `migrationPrivilegeManifestSha256` ugovorom. Worker/addon runner introspektuje schema-qualified identitet, ne samo `public` table name. Root `scripts/run-drizzle-migrations.mjs` ostaje core runner i ne sme usput smatrati `webshop` objekte svojim; addon runner ima zaseban schema-aware ledger/postcondition verifier.

Prazna baza i legacy baza imaju različit, zatvoren ulaz, ali isti postcondition:

1. **Empty install:** core owner prethodno provisionuje praznu `webshop` schema-u u vlasništvu target addon-deployer role; signed addon baseline pod DB-broker lease-om kreira 47 canonical tabela, cross-schema FK-ove/grantove i mora proizvesti exact postcondition/privilege hash pre service switch-a.
2. **Legacy public install:** worker preflight samo klasifikuje exact 45-table structural fingerprint i vraća `operator_schema_cutover_required`; addon deployer ne pokušava da preuzme tuđe `public` objekte.
3. Operator pravi/validira backup, gasi managed target servis i kroz dedicated admin-authorized `npm run db:webshop-schema-cutover -- --target vendor|client --expected-manifest-sha256 <HASH>` uzima core/addon advisory lock. CLI odbija extra/missing/drifted tabelu, a zatim transakciono radi allowlisted `ALTER TABLE public.<name> SET SCHEMA webshop`, owner handoff, anchor/settings/backfill, FK/index/check/default/ACL reconciliation i business-metadata cleanup. Ne prima proizvoljan SQL/table/schema.
4. Posle cutover-a CLI i nezavisni worker preflight zahtevaju isti baseline `postconditionSchemaFingerprintSha256`, privilege-manifest hash, row counts i ključne aggregate hash-eve; tek tada worker upisuje exact novi baseline ID/checksum/release kao `legacy_applied`. Blind seed ili seed pre owner/ACL/FK/settings postconditiona je zabranjen.
5. Root `db/schema.ts`/core migracije uklanjaju 45 divergentnih business definicija i direktne Webshop data pristupe; source of truth postaje package schema. Core bez paketa zadržava samo control-plane tabele i typed host route/job/file-authorization delegate ugovore, pa addon-free bootstrap i dalje build-uje. Sve nove Webshop migracije dolaze isključivo iz verifikovanog package-a.
6. Promenjen checksum već primenjenog ID-a, drugi postcondition hash ili public/business duplikat je hard incident. Isolated restore mora ponovo dokazati schema/owner/ACL/ledger/postcondition i row-count hash pre starta.

Fixture matrica obavezno pokriva potpuno empty install, realni legacy `public -> webshop` upgrade, crash pre transakcije/tokom rollbacka/posle commit-a pre receipt-a, idempotentan exact retry, extra/drift table refusal, vendor/client isolation i isolated restore. Nema automatskog down-move-a u `public`; rollback koda je dozvoljen samo na release koji razume canonical `webshop` schema-u.

V1 migration admission pre prvog DB write-a zahteva da je svaki pending descriptor `expand_compatible`/non-destructive. Kada već postoji trenutno serving release, update dodatno zahteva da njegova potpisana deklaracija `supportedAddonSchemaVersionMin <= FINAL_PENDING_SCHEMA <= supportedAddonSchemaVersionMax` podržava konačnu novu šemu. Serving fence se aktivira tek posle migracija, pa je ovaj online-compatibility dokaz za update obavezan, a ne opcioni rollback check. Kod initial installa sa `runtimeStatus=not_installed`, bez prethodnog serving release-a, taj old-release uslov se ne primenjuje: verified non-destructive/`expand_compatible` pending migracije smeju se primeniti dok je addon i dalje nedostupan. Ako postojeći old release range ne uključuje final schema, worker daje permanent `unsupported_online_migration` pre primene i traži budući versionirani maintenance-before-migration protokol. Binary rollback posle dozvoljene update migracije koristi isti dokaz. `maintenance_required` ostaje recovery za neočekivani external drift/incident, ne način da se normalno prihvati destructive/nekompatibilan V1 paket. Shared fixture odbija destructive/forward-only descriptor, prihvata non-empty initial install, odbija update sa nekompatibilnim old range-om pre DB write-a i prihvata update čiji signed old-release future max uključuje finalnu schema verziju.

### 7.2 Detached publication attestation

Npm tarball integrity ne može biti polje embedded `release-manifest.json` koje se nalazi u tom istom tarballu, jer bi time hash zavisio od samog sebe. Posle publish-a workflow pravi detached `release-publication-attestation.json` kao flattened JWS envelope, bez dodatnih polja:

```json
{
  "protected": "<BASE64URL_JCS_PROTECTED_HEADER>",
  "payload": "<BASE64URL_JCS_PUBLICATION_ATTESTATION_PAYLOAD_V1>",
  "signature": "<BASE64URL_ED25519_SIGNATURE>"
}
```

Protected objekat je tačno:

```json
{"alg":"EdDSA","kid":"<RELEASE_KID>","typ":"NRV-ADDON-RELEASE-PUBLICATION-ATTESTATION+JWS"}
```

Decoded payload je strict objekat bez unknown polja:

```json
{
  "attestationVersion": 1,
  "purpose": "addon_release_publication",
  "releaseId": "<UUIDV5>",
  "addonKey": "webshop",
  "packageName": "@radomirradojevic/webshop",
  "packageVersion": "<EXACT_SEMVER>",
  "webshopTagGitSha": "<40_LOWERCASE_HEX>",
  "cmsGitSha": "<40_LOWERCASE_HEX>",
  "embeddedManifestSha256": "<64_LOWERCASE_HEX>",
  "artifactSha256": "<64_LOWERCASE_HEX>",
  "provenanceSha256": "<64_LOWERCASE_HEX>",
  "sbomSha256": "<64_LOWERCASE_HEX>",
  "npmTarballSha256": "<64_LOWERCASE_HEX>",
  "npmTarballIntegrity": "sha512-<STANDARD_BASE64_WITH_PADDING>",
  "registry": "https://npm.pkg.github.com",
  "registryPackageVersionId": "<DECIMAL_STRING>",
  "publishedAt": "<RFC3339_UTC_GITHUB_PACKAGE_CREATED_AT>",
  "releaseSigningKid": "<SAME_AS_PROTECTED_KID>"
}
```

`publishedAt` i `registryPackageVersionId` dolaze iz autoritativnog GitHub Packages version record-a posle publish-a; nisu lokalni `now()`. Workflow ih čuva kao release-job evidence i svaki retry ponovo čita isti immutable version record, pa isti tarball dobija iste payload bytes. `provenanceSha256`/`sbomSha256` hashiraju exact odgovarajuće tar entry bytes. Workflow pre potpisa preuzima/verifikuje objavljenu exact verziju, dokazuje isti `npmTarballSha256`, proverava da registry `dist.integrity` odgovara lokalnom SHA-512 SRI-u i ponovo proverava embedded manifest/artifact.

Signature input je ASCII `protected + "." + payload`, Ed25519 key je isti release authority, a `typ/purpose` su namerno različiti od embedded manifesta. Base64url je bez paddinga. Stored attestation je RFC 8785/JCS UTF-8 bez BOM-a i završnog newline-a. Exact `publicationAttestationHash` je `lowercaseHex(SHA-256(storedAttestationBytes))`. Strict verifier odbija unknown/duplicate polja, nekanonsko kodiranje, KID/identity/hash/time mismatch ili keyset status koji nije prihvatljiv.

Durable lokacija je create-only asset `release-publication-attestation.json` na GitHub Release-u vezanom za tag `v<PACKAGE_VERSION>`; overwrite/`--clobber` je zabranjen. Ako asset već postoji, retry ga preuzima i zahteva isti hash; drugačiji sadržaj je incident. Master import prima exact file bytes isključivo kroz offline/operator CLI iz dokumenta 04; nema CI mutation endpointa. CLI verifikuje JWS i sve povezane tarball/manifest vrednosti, zatim immutable čuva bytes i hash uz release red. GitHub asset je distribucioni dokaz, a master kopija je operativni autoritet posle importa.

Workflow permissions su deny-by-default na workflow/job nivou. Build/test/pack/verify job ima samo `contents: read` i nema publish/release token. Odobreni `private-release` environment publish job dobija `packages: write` samo za exact npm publish korak; finalni attestation-asset job/korak, tek posle ponovne verifikacije registry record-a, dobija `contents: write` samo radi kreiranja GitHub Release-a i create-only asset upload-a. Ako platforma ne može da izoluje step credentiale, to su dva odvojena joba sa artifact handoff-om i zasebnim minimalnim `permissions` blokovima. `GITHUB_TOKEN` se ne prosleđuje package skriptama, build child procesu ili output artefaktu. Retry prvo čita postojeći release/asset i verifikuje hash; ne koristi `--clobber`, delete-asset ili overwrite.

Ako publish uspe, a attestation ili master import ne uspe, release ostaje `draft` i nije dostupan activation-u. Retry ne radi drugi publish: prvo dokazuje da registry verzija/tarball/package-version ID odgovaraju planiranom release-u, zatim reprodukuje ili učitava isti attestation. Shared public fixture sadrži poznati Ed25519 test key, protected/payload base64url, signature, stored-file SHA i tamper vektore za svako hash/identity polje.

Master import verifikuje embedded manifest i detached publication attestation. Worker dobija očekivani `npmTarballIntegrity`, `npmTarballSha256`, manifest/artifact hash i release KID kroz potpisani master activation contract i proverava ih pre izvršavanja package koda.

## 8. Centralni release catalog

Master već ima tabelu vendor_release_manifests, ali je koristi samo update authorization ruta i nema provisioning tok.

Proširiti je ili dodati normalizovanu povezanu tabelu tako da immutable release zapis sadrži:

    releaseId
    addonKey
    packageName
    packageVersion
    manifestVersion
    artifactSha256
    dependencyLockSha256
    npmTarballSha256
    npmTarballIntegrity
    embeddedManifestSha256
    provenanceSha256
    sbomSha256
    publicationAttestationHash
    registryPackageVersionId
    releaseSigningKid
    runtimeContractVersion
    cmsVersionRange
    nodeVersionRange
    nextVersionRange
    minimumCoreSchemaVersion
    schemaVersion
    supportedAddonSchemaVersionMin
    supportedAddonSchemaVersionMax
    migrationBundleHash
    supportedLicenseEditions
    channel
    sourceReleasedAt
    publishedAt
    status

`sourceReleasedAt` je manifest `releasedAt`/commit metadata; `publishedAt` je attested GitHub package `created_at`. `supportedLicenseEditions` je sorted unique non-empty lista exact master SKU edition stringova i za prvi release je `['standard']`; ne koristiti dvosmisleno package `edition=all`. `manifestVersion=2`, svi hash/evidence/time fieldovi i supported schema bounds su immutable i moraju odgovarati decoded manifest/attestation payload-ima. Master dodatno čuva exact manifest/attestation bytes ili content-addressed immutable reference, ne samo izdvojene kolone.

Dozvoljeni catalog statusi su tačno:

    draft -> published -> withdrawn

`draft` nije moguće izabrati za activation, `published` jeste, a `withdrawn` blokira nove install/update izbore prema incident policy-ju. Ne koristiti paralelni naziv `active` za catalog status; „aktivni release” u runtime dokumentima znači trenutno deployovan release, ne vrednost ove kolone.

Jedinstveni ključevi:

    releaseId
    addonKey + packageVersion
    artifactSha256

Prvi selector podržava exact `channel=stable`; stable package verzija mora biti validan canonical SemVer bez prerelease i bez build metadata dela. Import čuva i normalized SemVer kolone i unique `(addon_key, channel, normalized_semver)`, pa dve build-metadata-equivalent ili tekstualno različite ekvivalentne verzije ne mogu postati published. Posle svih status, addon/package, edition, capability/schema/range i `updatesUntil` filtera, izbor je deterministički sortiran po: (1) SemVer precedence descending, (2) attested `publishedAt` descending, (3) canonical lowercase `releaseId` ascending. Prvi red je selected; bez reda activation fail-closed vraća `no_eligible_release`.

Revalidation nikada implicitno ne bira verziju nižu od trenutnog installed/desired SemVer-a. Withdraw/compatibility promena koja ostavi samo stariji release daje explicit reconcile/maintenance rezultat prema incident policy-ju. Downgrade/rollback postoji samo kao zasebna auditovana operator operacija sa exact `releaseId`, reason/change reference, installation fence-om i dokazom da signed schema range prethodnog release-a podržava current DB schema. Shared test u jednoj transakciji/concurrent publish scenariju ubacuje više eligible release-a drugim redosledom i uvek bira isti najviši release; takođe odbija stable prerelease/build-metadata duplikat i implicitni downgrade.

Posle uspešnog package publish-a operator preuzima immutable tarball/attestation evidence i koristi tačno `npm run release:import`, zatim odvojeni `npm run release:publish`, iz dokumenta 04. CI nema master mutation credential niti alternativni endpoint.

Master activation ne sme više koristiti hardkodovani PACKAGE_CONFIG kao jedini autoritet. Mora izabrati published release koji:

- odgovara addonKey-u;
- entitlement `edition` pripada signed `supportedLicenseEditions`, a attested `publishedAt` prolazi update policy;
- kompatibilan je sa CMS/runtime/schema verzijom;
- host descriptor zadovoljava Node/Next range, minimalnu core schema verziju i postoji potpun migration path od instalirane do ciljne addon schema verzije;
- nije withdrawn;
- attested `publishedAt` nije posle non-null `updatesUntil`; `sourceReleasedAt` se nikada ne koristi za ovaj gate.

Shared selector fixture obavezno ima backdated source commit čiji je package objavljen posle `updatesUntil` i mora biti odbijen.

## 9. Provera objavljenog package-a

Ovo je eksplicitni post-publication operator/CI smoke u disposable okruženju, a ne worker deployment algoritam i nije autoritativni supply-chain dokaz. Credential se posle testa uklanja, direktorijum se odbacuje, a nijedan njegov `node_modules` ili lockfile ne prelazi u vendor/client release. Worker uvek koristi stroži verify-before-install i offline tok iz sledećeg poglavlja.

Sa read-only worker credentialom:

    npm view @radomirradojevic/webshop@<VERSION> version --registry=https://npm.pkg.github.com
    npm view @radomirradojevic/webshop@<VERSION> dist.integrity --registry=https://npm.pkg.github.com

Zatim u potpuno čistom privremenom direktorijumu:

    npm init -y
    npm install --ignore-scripts --save-exact @radomirradojevic/webshop@<VERSION>

Proveriti:

- package je zaista preuzet sa GitHub Packages;
- nema .private source zavisnosti;
- exports rade;
- release manifest potpis prolazi sa production keysetom;
- `release-dependency-lock.json` bytes/hash/schema prolaze i finalni addon-reachable production graph je exact jednak njegovim sortiranim node/edge/integrity/registry vrednostima;
- npm dist.integrity odgovara lockfile registry integrity vrednosti.

Važno: publication-attested `npmTarballIntegrity` opisuje exact finalni `.tgz`, dok manifest `artifactSha256` opisuje JCS digest runtime inventoryja. To su različiti byte skupovi i vrednosti se ne porede međusobno; svaka se proverava prema svom exact contractu.

## 10. Instalacija u deployment release

Worker ne počinje sa `npm install` nad neproverenim privatnim package-om. Worker toolchain direktno pin-uje Node, npm CLI, `pacote` i `cacache` verzije; `NPM_CONFIG_CACHE` za svaki job pokazuje na nov, prazan job-local npm cacache, nikada na user/global cache. „Content-addressed cache” u ovoj specifikaciji zato znači npm-compatible cacache sa packument/index i content/integrity entry-jima koje ista pinovana `pacote`/npm verzija može pročitati offline, a ne proizvoljan direktorijum `.tgz` fajlova.

Exact redosled u novom izolovanom release direktorijumu je:

1. iz statički pinovanog CMS commita izvesti clean source, sačuvati exact base `package.json`/`package-lock.json` bytes i izračunati oba SHA-256;
2. fetch child A, prvi od samo dva strogo ograničena procesa koji ikada dobijaju privremeni GitHub Packages read credential, kroz pinovani `pacote` preuzima exact root packument i privatni `.tgz` u job-local cacache/quarantine; parent/verifier ne nasleđuje token. Child se gasi, njegov `.npmrc`/env/handle se uklanja i token-canary scan mora proći pre verifikacije;
3. secret-free verifier proverava root tarball SHA-256/SRI i safe tar listu, zatim embedded manifest/JWS, inventory, provenance, SBOM, migration bundle i `release-dependency-lock.json` hash/schema i iz njega pravi immutable exact fetch plan;
4. credentialed fetch child B dobija samo plan sa exact `name@version`, allowlisted registry/resolved URL i expected SRI za svaki addon-reachable node; zajedno sa fetch-only core-lock planom puni isti job-local npm cacache odgovarajućim packument i tarball entry-jima, bez installa/lifecycle-a. Child B se zatim gasi i sve auth vrednosti/user-config fajlovi se uklanjaju;
5. secret-free cache auditor za root, svaki signed addon node i svaki exact base-lock node radi `pacote.manifest`/tarball read sa `{offline:true,cache:<JOB_CACHE>}`, proverava selected name/version, registry namespace, expected SRI/content bytes i addon dependency/peer/optional edge-eve prema potpisanom grafu. Missing packument/content entry, cache miss koji bi tražio mrežu, dodatni addon node ili drugi selected manifest je permanent failure. Auditor zamrzava hash/inventory cache snapshot-a; disposable install cache je njegova kopija, ne user/global cache;
6. generisati token-free user config koji sadrži samo exact iste registry namespace mape korišćene pri fetch-u (`registry=https://registry.npmjs.org/` i `@radomirradojevic:registry=https://npm.pkg.github.com`) i non-secret hardening; nijedan `_authToken`, auth header ili credential ref nije dozvoljen. Postaviti isti pinovani npm CLI, `NPM_CONFIG_USERCONFIG=<TOKEN_FREE_FILE>`, `NPM_CONFIG_CACHE=<DISPOSABLE_VERIFIED_CACHE_COPY>`, `NPM_CONFIG_OFFLINE=true`, `NPM_CONFIG_IGNORE_SCRIPTS=true`, `NPM_CONFIG_AUDIT=false`, `NPM_CONFIG_FUND=false` i OS-level deny outbound. Pre nastavka token/credential fingerprint scan parent env-a, configa, cache-a, release-a i loga mora biti prazan;
7. dodati exact addon root dependency i napraviti lock merge bez mreže:

       npm install --package-lock-only --offline --ignore-scripts --save-prod --save-exact @radomirradojevic/webshop@<EXACT_VERSION>

8. pre installa dokazati base `package.json` i base-lock diff invariant i potpunu jednakost novog addon-reachable grafa;
9. tek tada instalirati:

       npm ci --offline --ignore-scripts

10. ponovo dokazati installed graph, package inventory/hash/potpis i odsustvo lifecycle outputa ili credentiala; zatim auditirati install-cache delta — svaki content blob mora imati expected base-lock ili signed-addon SRI, a svaki novi index/packument ključ mora pripadati exact planu.

Core dependency prefetch ne koristi mrežni `npm ci`; fetch-only child puni cacache iz exact trusted base locka preko pinovanog `pacote`, a prvi stvarni install je navedeni offline clean `npm ci` posle cache-completeness i lock-diff gate-a. Worker phase evidence čuva `cmsBasePackageJsonSha256`, `cmsBasePackageLockSha256`, merged hash-eve, pinovane tool verzije, root/transitive packument hash listu, cacache snapshot/delta, quarantine tarball hash listu i diff rezultat, nikada token ili user config.

Zabrane:

- latest;
- semver range;
- git URL;
- lokalni path;
- tarball URL koji nije prethodno pinovan;
- lifecycle scripts;
- promena D:\nr_cms;
- promena aktivnog release direktorijuma.

Nakon post-install ponovne verifikacije worker iz već verifikovanog package-a generiše registry input:

    {
      "addons": [
        {
          "addonKey": "webshop",
          "packageName": "@radomirradojevic/webshop",
          "packageVersion": "<EXACT_VERSION>",
          "artifactSha256": "<MANIFEST_ARTIFACT_SHA>",
          "dependencyLockSha256": "<MANIFEST_DEPENDENCY_LOCK_SHA>",
          "signingKid": "<PRODUCTION_RELEASE_KID>"
        }
      ]
    }

Tek tada:

    npm run addons:registry
    npm run deploy:verify:build
    npm run build

Ova build faza koristi hash-pinovani target-specific public build-env, `NODE_ENV=production` i nema target DB/runtime secret; postojeći DB-aware `deploy:verify` se ne poziva pre purpose-specific migration lease-a.

## 11. Release gate

Release je prihvatljiv za activation test samo ako:

- GitHub workflow je zelen;
- package je restricted;
- exact verzija se čita read-only credentialom;
- tag, Webshop SHA i CMS SHA su zabeleženi;
- signing KID nije local/fixture;
- public keyset hash je zabeležen;
- master release catalog ima isti artifact SHA;
- clean install bez .private prolazi;
- package migration strategija prolazi;
- nijedan secret nije u tarballu, SBOM-u, provenance-u ili logu;
- worker allowlista prihvata samo @radomirradojevic/webshop.
