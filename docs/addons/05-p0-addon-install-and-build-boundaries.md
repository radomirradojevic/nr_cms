# Faza 05 — P0 addon install i public/private build granice

> Finalna verifikacija 2026-07-12: **NIJE ZATVORENA — High blocker**. Čista javna kopija bez `.private` sada prolazi frozen install, typecheck, test i build, ali oba private addon builda padaju posle sopstvenog `npm ci`, imaju 318 root alias referenci i nemaju release builder/dist/manifest artefakte. Videti [11-final-verification-report.md](./11-final-verification-report.md).

## Cilj

Omogućiti da javni Night Raven CMS bude potpuno buildabilan i testabilan bez privatnog source stabla, dok se kupljeni addon instalira kao verzionisan privatni paket i pouzdano prelazi kroz `license_accepted -> install_pending -> ready` lifecycle.

## Potvrđeni problemi koje faza rešava

- Public cron ruta statički importuje `@/.private/webshop/...`.
- Root test bezuslovno importuje private LSA source.
- `globals.css` skenira `.private` source putanje.
- Addon source koristi veliki broj host `@/` internih importa.
- Managed activation proverava stari deployment, pokreće redeploy i ostavlja stanje u `install_pending`.
- Posle novog deploymenta nema reconciliation-a koji proverava stvarno instaliran paket.
- Centralni servis vraća `@nr-cms/license-server-addon`, dok je stvarni package `@nr-cms/license-server`.
- Webshop package/manifest/runtime verzije nisu usklađene.
- Nema install callback-a, package checksum provere ili package-token redemption toka.
- Privatni projekti nemaju lockfile/reproducibilan release pipeline.

## Glavni moduli za izmenu

CMS:

- `D:\nr_cms\app\api\cron\webshop-license-issues\route.ts`
- `D:\nr_cms\tests\license-server-addon-release.test.ts`
- `D:\nr_cms\app\globals.css`
- `D:\nr_cms\lib\webshop-addon\loader.ts`
- `D:\nr_cms\lib\license-server-addon\loader.ts`
- `D:\nr_cms\lib\webshop-addon\contract.ts`
- `D:\nr_cms\lib\license-server-addon\contract.ts`
- `D:\nr_cms\app\dashboard\webshop\actions.ts`
- `D:\nr_cms\app\dashboard\license-server\actions.ts`
- lokalne addon entitlement/install tabele u `D:\nr_cms\db\schema.ts`;
- build/prebuild scripts i package manifest.

Privatni paketi:

- `.private/webshop/package.json`, manifest i runtime export;
- `.private/license-server-addon/package.json`, manifest i runtime export;
- njihovi `tsconfig`, build, exports i release fajlovi;
- centralni package metadata u `.private/license-server/src/data/addon-activation.ts`, koji treba ukloniti kao duplirani source of truth.

## Ciljna distribuciona granica

### Javni CMS repo

Sadrži:

- addon SDK interfejse;
- generički registry/dispatcher;
- install-state tabele i host UI;
- javne route shells samo ako su generičke i ne importuju private source;
- generator build-time registry-ja;
- test fixture addon koji nije komercijalni kod.

Ne sadrži:

- Webshop/LSA source;
- hardkodovan private worker import;
- test koji zavisi od `.private` putanje;
- CSS source scan privatnog lokalnog stabla;
- package install secret ili vendor private signing key.

### Privatni addon package

Svaki addon je zaseban buildabilan package sa:

- sopstvenim `package.json` i lockfile-om;
- `dist/` izlazom;
- versioned manifestom;
- conditional exports za server/client delove;
- namespaced migrations;
- checksum-ovanim release artefaktom;
- contract testovima prema `@nr-cms/addon-sdk`;
- bez relativnih importova u CMS source.

Frontend deo privatnog addona koji se izvršava u browseru ne može biti tretiran kao tajna; browser bundle se može analizirati. Secrets i licencna enforcement logika moraju ostati server-side.

## Build-time addon registry

Next/Turbopack mora unapred znati moguće literal module specifier-e. Zato koristiti generisani allowlisted registry, ne nekontrolisan runtime import korisničkog stringa.

Primer konfiguracije koja nije secret:

```json
{
  "addons": [
    {
      "addonKey": "webshop",
      "packageName": "@nr-cms/webshop"
    }
  ]
}
```

Prebuild generator proverava installed package manifest i generiše npr. `.generated/addon-registry.ts`:

```ts
export const addonLoaders = {
  webshop: () => import("@nr-cms/webshop/server"),
} as const;
```

Za javni CMS bez komercijalnih paketa generiše se prazan registry. Generated fajl ne treba ručno editovati, ali mora postojati deterministička test/build putanja.

Security pravila:

- package name mora biti na admin/vendor allowlist-i;
- manifest `addonKey` mora odgovarati registry ključu;
- nije dozvoljen proizvoljan filesystem path iz env-a u production-u;
- local `.private` alias ostaje samo eksplicitna development pogodnost, nikada production fallback;
- package exports moraju razdvojiti `server-only` kod od client entrypoint-a.

## Jedan potpisani release manifest

Manifest je jedini source of truth za package identitet:

```ts
interface SignedAddonReleaseManifestV1 {
  manifestVersion: 1;
  addonKey: "webshop" | "license-server";
  packageName: "@nr-cms/webshop" | "@nr-cms/license-server";
  packageVersion: string;
  runtimeContractVersion: "1";
  cmsVersionRange: string;
  schemaVersion: number;
  entrypoints: {
    server: string;
    client?: string;
    styles?: string;
  };
  capabilities: string[];
  migrations: { id: string; checksum: string }[];
  artifact: {
    sha256: string;
    size: number;
    registryIntegrity?: string;
  };
  releasedAt: string;
  signingKid: string;
  signature: string;
}
```

Package `package.json`, runtime export i centralni catalog/release API moraju se generisati/proveravati prema ovom manifestu. Ne održavati tri ručno upisane verzije.

Odmah ispraviti LSA identitet na stvarni dogovoreni package. Ako se zadržava `@nr-cms/license-server`, centralni servis, manifest, installer i registry moraju koristiti to ime. Rename package-a je zasebna migracija i ne sme se rešiti aliasima koji kriju mismatch.

## Package install grant

License activation ne treba direktno da vraća dugovečni registry credential. Centralni servis izdaje kratkotrajan, single-use install grant:

```json
{
  "grantId": "uuid",
  "addonKey": "license-server",
  "packageName": "@nr-cms/license-server",
  "packageVersion": "1.0.0",
  "artifactSha256": "...",
  "installationId": "uuid",
  "expiresAt": "...",
  "aud": "nr-addon-installer"
}
```

Grant mora biti potpisan ili server-side redeemable, vezan za installation ID, package/version i veoma kratak rok. Njegov hash/status se čuva centralno. Installer koristi grant da dobije tačno jedan artefakt/deployment job, a ne opšti package registry token.

Ako se koristi privatni npm registry, dugovečni read token ostaje samo u Vercel/deployment secret store-u; kupcu se ne vraća kroz browser ili activation response.

## Install state machine

Lokalna tabela treba jasno da razdvoji entitlement i package installation. Može se proširiti postojeća addon entitlement tabela ili dodati `cms_addon_installations`:

```text
addon_key
installation_id
desired_package_name
desired_package_version
desired_artifact_sha256
installed_package_name
installed_package_version
installed_artifact_sha256
runtime_contract_version
schema_version
status
deployment_job_id
install_attempt_count
last_error_code
last_error_message
requested_at
deployed_at
reconciled_at
ready_at
version
```

Status tranzicije:

```text
not_installed
  -> license_accepted
  -> install_pending
  -> installed
  -> migration_pending
  -> ready

bilo koja aktivna faza -> failed
ready -> disabled
ready -> update_pending -> installed -> migration_pending -> ready
```

`ready` je dozvoljen samo ako:

1. Vendor entitlement je lokalno kriptografski validan.
2. Installed manifest addon/package identity odgovara desired vrednosti.
3. Artifact checksum/signature je verifikovan.
4. Runtime contract i CMS semver su kompatibilni.
5. Sve deklarisane migracije su primenjene sa očekivanim checksum-om.
6. Potrebne server capabilities su uspešno registrovane.

## Activation/redeploy/reconciliation tok

1. Admin unosi license key na server-side action-u.
2. Centralni activation tok iz faze 04 vraća potpisani entitlement i install grant metadata.
3. CMS transakciono snima `license_accepted/install_pending` i desired manifest podatke.
4. Pokreće deployment/install job sa stabilnim `deploymentJobId` i idempotency key-em.
5. Greška/redeploy odgovor se ne ignoriše; čuva se klasifikovan rezultat i retry schedule.
6. Novi deployment pre pokretanja addon ruta učitava registry i manifest.
7. Startup/post-deploy reconciliation poredi desired i installed podatke.
8. Pokreće/verifikuje migracije prema fazi 06.
9. Transakciono postavlja `ready`, `packageInstalledAt`, `readyAt`.
10. Opcioni autentifikovani callback označava centralni install grant iskorišćenim.

Reconciliation mora biti idempotentan i pokretljiv:

- pri startup-u;
- kroz admin `reconcile` akciju;
- kroz bounded background job;
- posle deployment callback-a.

Stanje ne sme ostati `install_pending` samo zato što je stari deployment proverio da package još nije učitan.

## Rute i jobs

P0 opcije, po prioritetu:

1. Generički host dispatcher poziva capability registrovanu u addon manifestu.
2. Ako hardkodovani `/api/webshop` shell privremeno ostane, on dinamički traži `webshop` capability iz registry-ja i vraća kontrolisani 404/503 kada package nije instaliran.

Cron/job ruta:

- ne importuje `.private` worker;
- traži `jobs.webshopLicenseFulfillment` capability;
- sprovodi auth i explicit `settle_existing_obligations` policy;
- radi kada je package stvarno installed/compatible, čak i ako entitlement dozvoljava samo završavanje starih obaveza.

## CSS/Tailwind granica

Ukloniti statički `@source` prema `.private` folderima iz javnog `globals.css`.

Preferirano:

- addon package isporučuje sopstveni buildovani CSS entrypoint;
- registry generator dodaje import samo kada je package instaliran;
- package build obuhvata sve Tailwind v4 klase koje koristi addon;
- javni CMS bez addona nema reference na nepostojeći private path.

Ako se koristi host Tailwind scan `node_modules` package-a, putanja mora biti generisana iz verifikovanog manifesta i testirana i u empty-registry buildu. Buildovani addon CSS je stabilnija package granica.

## Public i private test granica

Javni root testovi treba da testiraju:

- SDK/manifest parser;
- empty registry;
- fixture public addon;
- missing/incompatible addon ponašanje;
- public build bez `.private`.

Privatni package testovi testiraju stvarni Webshop/LSA implementation. Root test ne sme direktno importovati `.private/license-server-addon/src/...`.

Dodati CI job koji pravi privremenu kopiju/checkout javnog repozitorijuma bez `.private`, instalira samo javne dependencies i pokreće typecheck/test/build u bezbednoj bazi ili sa migration-disabled build režimom.

## Build i migracije

Istorijski build je bio spojen sa root DB migracijama. As-built verifikacija 2026-07-12 potvrđuje da su komande sada razdvojene:

```text
npm run build              # ne menja DB
npm run db:migrate         # eksplicitna deployment faza
npm run deploy:verify      # provera migration state-a i addon compatibility-ja
```

Ako deployment platforma zahteva orkestraciju, ona eksplicitno poziva migraciju pre/posle build-a prema runbook-u. Build failure ne sme nastati nakon što je isti build korak već nepovratno izmenio production bazu.

## Release pipeline privatnih paketa

Za svaki addon:

1. Clean install preko lockfile-a.
2. Typecheck/lint/test.
3. Build `dist` server/client/styles.
4. Provera da browser bundle nema server env imena/secret module.
5. Generisanje SBOM/provenance po mogućnosti.
6. `npm pack`/private registry artefakt.
7. SHA-256/integrity izračun.
8. Potpis release manifesta.
9. Publish immutable verzije; ne prepisivati postojeći tag/artifact.
10. Centralni release catalog registruje manifest, ne ručne konstante.

## Test-first redosled

1. Public typecheck/test/build bez `.private` prolazi.
2. Empty registry CMS startuje i addon rute kontrolisano vraćaju unavailable/not installed.
3. Instalirani fixture addon se učitava samo preko package specifier-a.
4. Proizvoljan env filesystem path se odbija u production-u.
5. Package/addon key mismatch se odbija.
6. CMS semver, runtime contract, schema version i checksum mismatch se odbijaju pre `ready`.
7. `license_accepted -> redeploy -> reconciliation -> ready` E2E.
8. Redeploy timeout ostavlja retryable `install_pending`, ne lažni success.
9. Ponovljen deployment callback/reconciliation je idempotentan.
10. Pogrešan LSA package name test pada dok mismatch nije ispravljen.
11. CSS/styling radi sa instaliranim addonom, a empty build nema private source reference.
12. Browser bundle ne sadrži poznata server secret env imena/vrednosti.
13. License validan, package missing → nije `ready`.
14. Package instaliran, entitlement revoked → nije funkcionalno `ready`.

## Acceptance kriterijumi

- `rg` kroz tracked public fajlove ne nalazi `.private` import/reference osim eksplicitne dokumentacije/dev tooling allowlist-e.
- Public CMS CI prolazi bez privatnih repozitorijuma.
- Stvarni Webshop i LSA se instaliraju kao buildovani private package-i.
- Package name/version/runtime manifest su jedan source of truth.
- LSA managed install koristi stvarni package identitet.
- Happy path automatski završava u `ready` posle deploymenta.
- Svaki `ready` red ima package installed timestamp, manifest/checksum i migration state dokaz.
- Addon removal/absence ne ruši CMS startup.

## Rollout i rollback

1. Prvo uvesti registry generator i empty-registry test bez uklanjanja starih loadera.
2. Napraviti private package artefakte i contract testove.
3. U staging-u učitati addon preko generated registry-ja.
4. Prebaciti cron i rute na capability lookup.
5. Ukloniti public `.private` importe i CSS scan.
6. Uključiti install reconciliation za internu instalaciju.
7. Tek tada koristiti managed install za spoljnog test kupca.

Rollback može vratiti registry mapping na prethodnu immutable package verziju ako schema compatibility to dozvoljava. Ne vraćati source import kao rollback. Ako je nova migracija već primenjena, koristiti prethodni package samo ako manifest izričito podržava novu schema verziju; u suprotnom forward-fix.

## Implementation record — 2026-07-12

Javni CMS sada koristi `addons.registry.json` i generisani `.generated/addon-registry.ts`.
Prazan registry je podrazumevan i loaderi ne koriste environment module string niti filesystem
putanju; nepoznat ključ se kontrolisano odbija. `npm run build` pokreće samo generator i
`next build`; migracija ostaje eksplicitna `npm run db:migrate` faza. Uklonjeni su Tailwind
`@source` privatnog stabla, public loader private import grane, root private testovi i public
cron private adapter. Fulfillment cron sada traži `jobs.webshopLicenseFulfillment` capability
na registrovanom addonu i vraća controlled unavailable rezultat ako paketa nema.

Dodati su shared release-manifest parser i lokalna `cms_addon_installations` state tabela
(`0083_cms_addon_installations`). Pure reconciliation proverava entitlement, runtime load,
manifest identity/version/checksum, runtime contract, migracije i capabilities pre `ready`.
Centralni LSA package identitet je `@nr-cms/license-server`, ali finalna verifikacija je našla
da package i source manifest verzije nisu usklađene ni za LSA ni za Webshop. To ostaje
single-source identity blocker.

Ovaj record ne zatvara fazu: physical public-copy frozen install/typecheck/test/build bez
`.private` sada prolazi, ali zasebno buildovani immutable `dist` tarballovi, build-release
skripta, stvarno potpisani release manifest/grant redemption i startup DB reconciliation nisu
implementirani. Zato package exports nisu uključeni u registry dok se ti artefakti ne dovrše.
