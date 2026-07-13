# Faza 06 — P1 addon SDK, lifecycle i migracije

> Finalna verifikacija 2026-07-12: **NIJE ZATVORENA — High boundary blocker**. SDK V1 capability testovi prolaze, ali private paketi ostaju vezani za CMS root, lifecycle/worker wiring i rollback matrica nisu završeni. Videti [11-final-verification-report.md](./11-final-verification-report.md).

## Cilj

Zameniti dva bespoke bridge-a stabilnim, versioned addon contract-om koji omogućava registraciju ruta, admin navigacije, permissions, poslova, konfiguracije i migracija bez direktnog oslanjanja na CMS interne putanje.

Ovo nije zahtev za univerzalni third-party marketplace. P1 cilj je mali, kontrolisan SDK za dva first-party komercijalna addona, sa jasnom kompatibilnošću i lifecycle-om.

## Potvrđeni problemi koje faza rešava

- Webshop i LSA imaju zasebne, duplirane loader/contract implementacije.
- Rute, menu, content type i permission provere su hardkodovane u core-u.
- `listMigrations` postoji, ali se ne poziva.
- Addon manifesti nisu učitani niti validirani.
- Addoni direktno importuju veliki broj `@/` CMS internih modula.
- LSA contract zavisi od Webshop platform tipa/provider liste.
- Addon migracije su root migracije i primenjuju se čak i kada addon nije instaliran.
- Ne postoje update, deactivate, uninstall, cleanup/retain i compatibility procedure.

## Glavni moduli za izmenu

CMS:

- `lib/webshop-addon/*`
- `lib/license-server-addon/*`
- `lib/backend-menu.ts`
- `lib/content-types.ts`
- `lib/content-type-permissions.ts`
- `app/api/webshop/[...webshopPath]/route.ts`
- `app/api/license-server/[...licenseServerPath]/route.ts`
- dashboard delegate fajlovi;
- `db/schema.ts` i root migration runner;
- novi `packages/addon-sdk` ili zaseban objavljen SDK package.

Privatni addoni:

- manifest/runtime entrypoint;
- svi direktni host `@/` importi;
- addon-local migration paketi;
- package exports/peer dependencies;
- contract testovi.

## SDK verzionisanje

Početni package:

```text
@nr-cms/addon-sdk
  manifest
  runtime
  host-services
  permissions
  routing
  migrations
  testing
```

Verzije razdvojiti:

- `manifestVersion`: oblik statičkog manifesta;
- `runtimeContractVersion`: oblik runtime modula/host context-a;
- `packageVersion`: verzija konkretnog addona;
- `schemaVersion`: DB stanje addona;
- `cmsVersionRange`: podržane host verzije.

Major runtime contract promena zahteva novi export/adapter, ne tihu promenu TypeScript interfejsa.

## Manifest V1

```ts
export interface AddonManifestV1 {
  manifestVersion: 1;
  addonKey: string;
  displayName: string;
  packageName: string;
  packageVersion: string;
  runtimeContractVersion: "1";
  cmsVersionRange: string;
  schemaVersion: number;
  capabilities: {
    adminRoutes?: readonly AdminRouteDescriptor[];
    apiRoutes?: readonly ApiRouteDescriptor[];
    storefrontRoutes?: readonly StorefrontRouteDescriptor[];
    menuItems?: readonly MenuItemDescriptor[];
    permissions?: readonly PermissionDescriptor[];
    jobs?: readonly JobDescriptor[];
    settings?: readonly SettingDescriptor[];
    emailTemplates?: readonly EmailTemplateDescriptor[];
    contentTypes?: readonly ContentTypeDescriptor[];
  };
  migrations: readonly AddonMigrationDescriptor[];
  lifecycle: {
    supportsDeactivate: boolean;
    supportsUninstall: boolean;
    dataRetentionPolicy: "retain_by_default" | "purge_by_default";
  };
}
```

Manifest je data-only. Ne izvršavati proizvoljne callback funkcije tokom samog discovery parsing-a.

## Runtime module V1

```ts
export interface AddonRuntimeV1 {
  manifest: AddonManifestV1;
  register(context: AddonHostContextV1): Promise<RegisteredAddonV1>;
}

export interface RegisteredAddonV1 {
  adminRouter?: AddonAdminRouter;
  apiRouter?: AddonApiRouter;
  storefrontRouter?: AddonStorefrontRouter;
  jobs?: Readonly<Record<string, AddonJobHandler>>;
  lifecycle?: AddonLifecycleHooksV1;
}
```

Host loader proverava manifest pre `register()` poziva. Registration rezultat mora odgovarati deklarisanim capabilities; addon ne može runtime-om krišom registrovati rutu/job koji nije u potpisanom manifestu.

## Host services V1

SDK treba da izloži mali stabilan context, ne ceo CMS root:

```ts
export interface AddonHostContextV1 {
  auth: {
    requireUser(): Promise<HostUser>;
    requireAdmin(): Promise<HostUser>;
    requirePermission(permission: string): Promise<HostUser>;
  };
  database: AddonDatabaseAdapterV1;
  files: AddonFileServiceV1;
  jobs: AddonJobServiceV1;
  audit: AddonAuditServiceV1;
  mail: AddonMailServiceV1;
  settings: AddonSettingsServiceV1;
  urls: AddonUrlServiceV1;
  logger: RedactingLoggerV1;
  cms: {
    version: string;
    environment: "development" | "test" | "staging" | "production";
  };
}
```

### Database adapter odluka

Pošto oba addona koriste Drizzle i host PostgreSQL, nije praktično skrivati svaki query iza RPC-style API-ja. Minimalna stabilna granica:

- SDK pin/peer range za Drizzle major verziju;
- host daje connection/transaction adapter, ne import `@/db`;
- addon schema ostaje u addon package-u;
- addon data sloj importuje sopstvenu schema-u;
- cross-core FK koristiti samo preko eksplicitnih stabilnih host IDs/adaptera;
- migracije su u package-u i izvršava ih host runner;
- addon ne importuje root `db/schema.ts`.

Ako je potpuna migracija svih query-ja prevelika za jedan P1 PR, prvo uvesti `@nr-cms/addon-sdk/host-compat-v1` adapter koji re-exportuje samo odobrene stabilne funkcije. Novi direktni `@/` importi zabraniti lint pravilom.

## Route registracija i auth policy

Descriptor primer:

```ts
interface ApiRouteDescriptor {
  id: string;
  path: string;
  methods: readonly ("GET" | "POST" | "PUT" | "PATCH" | "DELETE")[];
  auth: "public" | "session" | "admin" | "hmac" | "cron";
  permission?: string;
  licensePolicy:
    | "ready_only"
    | "existing_operations"
    | "financial_reconciliation"
    | "public_runtime_validation";
  maxBodyBytes?: number;
}
```

Generic host catch-all:

1. Razrešava instalirani addon iz registry-ja.
2. Razrešava route descriptor, ne samo string path.
3. Sprovodi host auth, permission, body size i osnovni license policy.
4. Prosleđuje verifikovani context addon handleru.
5. Addon i dalje sprovodi object-level authorization/tenant policy.

Time novi endpoint ne može slučajno postati public samo zato što je developer zaboravio poziv helpera unutar handlera.

## Permissions

Zameniti isključivi globalni `admin` model deklarisanim permission-ima, npr.:

```text
webshop.catalog.read
webshop.catalog.write
webshop.orders.read
webshop.orders.refund
webshop.payments.reconcile
webshop.settings.manage
license_issuer.products.manage
license_issuer.licenses.issue
license_issuer.licenses.revoke
license_issuer.audit.read
```

P1 može mapirati sve permission-e na postojećeg admina kao compatibility default, ali route/action contract mora već koristiti specifičan permission string. Kasnije uvođenje fine-grained rola tada ne zahteva promenu addona.

## Menu, admin i storefront registracija

Menu descriptor sadrži stabilan route ID, label key, icon key iz allowlist-e, required permission i visibility policy. Ne prenosi proizvoljnu React komponentu kroz manifest.

Admin/storefront runtime render može koristiti package export komponentu, ali host route postoji kao generički dispatcher. Addon ne treba da zahteva ručno kreiranje desetina `app/dashboard/<addon>/...` fajlova u core-u.

Content type i global setting registracija moraju imati addon namespace i cleanup/retention politiku.

## Job registracija

Job descriptor:

```ts
interface JobDescriptor {
  id: string;
  schedule?: string;
  concurrency: number;
  timeoutSeconds: number;
  licensePolicy: "ready_only" | "settle_existing_obligations" | "always_cleanup";
}
```

Host scheduler poziva `registeredAddon.jobs[id]`. Public cron route ne importuje private package source direktno. Job ID i manifest checksum ulaze u audit.

## Lifecycle hooks

```ts
interface AddonLifecycleHooksV1 {
  postInstall?(ctx: LifecycleContext): Promise<LifecycleResult>;
  activate?(ctx: LifecycleContext): Promise<LifecycleResult>;
  deactivate?(ctx: LifecycleContext): Promise<LifecycleResult>;
  beforeUpgrade?(ctx: UpgradeContext): Promise<LifecycleResult>;
  afterUpgrade?(ctx: UpgradeContext): Promise<LifecycleResult>;
  beforeUninstall?(ctx: UninstallContext): Promise<LifecycleResult>;
  uninstall?(ctx: UninstallContext): Promise<LifecycleResult>;
}
```

Pravila:

- Hookovi su idempotentni i imaju operation ID.
- Ne drže DB transakciju tokom mrežnog poziva.
- Rezultat je durable u `cms_addon_operations` tabeli.
- `deactivate` zaustavlja nove funkcije/jobs, ali ne briše podatke.
- `uninstall retain` uklanja package/registration, zadržava namespaced podatke.
- `uninstall purge` zahteva posebnu potvrdu, backup i eksplicitno migraciono čišćenje.
- Istek licence nije isto što i uninstall.

## Addon migration ledger

Dodati host tabelu `cms_addon_migrations`:

```text
addon_key text
migration_id text
checksum text
package_version text
schema_version integer
status pending|applying|applied|failed
started_at, applied_at
duration_ms
error_code, error_message
PRIMARY KEY(addon_key, migration_id)
```

I `cms_addon_operations` za install/update/uninstall lifecycle.

Migration descriptor:

```ts
interface AddonMigrationDescriptor {
  id: string;
  checksum: string;
  schemaVersion: number;
  destructive: boolean;
  requiresBackup: boolean;
}
```

SQL/runtime migracija se učitava iz package export-a tek nakon verifikacije package manifesta/checksum-a.

## Migracioni runner

Za svaki addon:

1. Uzeti advisory lock po `addonKey`.
2. Proveriti package manifest signature, CMS range i current schema.
3. Uporediti applied migration ID/checksum sa manifestom.
4. Bilo koji promenjen checksum već primenjene migracije je hard failure.
5. Proveriti destructive/backup policy.
6. Primena jedne migracije i ledger update su transakcioni gde PostgreSQL DDL dozvoljava.
7. Failure ostavlja addon van `ready`, ali CMS core ostaje upotrebljiv.
8. Release advisory lock i emitovati audit/metric.

Down migracije ne treba automatski pokretati pri package rollback-u. Preferirati forward-compatible additive schema i forward-fix. Package manifest mora deklarisati podržani schema range, pa se prethodni package može vratiti samo ako podržava trenutno stanje baze.

## Migracija postojećih root addon tabela

Ne pokušavati fizički prebaciti sve tabele u drugi PostgreSQL schema namespace u jednom PR-u.

Postepeni plan:

1. Napraviti inventory svih Webshop/LSA tabela i root migracija.
2. Obeležiti ownership metapodatkom/dokumentacijom.
3. Za trenutno primenjene migracije seed-ovati `cms_addon_migrations` kao `legacy_applied` sa proverljivim checksum-ovima.
4. Sve nove addon migracije isporučivati iz privatnog package-a.
5. Premestiti TypeScript schema definicije u addon package uz compatibility re-export tokom tranzicije.
6. Promeniti addon data import sa `@/db/schema` na package-local schema.
7. Ukloniti core re-export tek kada public build i private packages prolaze nezavisno.
8. Fizički DB namespace je opciona kasnija optimizacija; ownership ledger je važniji.

## Plan smanjenja `@/` coupling-a

1. Generisati inventory direktnih importova i podeliti ih na auth, DB/schema, UI, editor, files, mail, settings, i18n, routing i utility.
2. Za svaki odobreni slučaj definisati SDK adapter ili peer dependency.
3. Dodati lint zabranu novih host internal importa u privatnim paketima.
4. Prvo migrirati server-only auth/settings/files/mail servise.
5. Zatim DB schema/transaction boundary.
6. UI primitives izložiti kao versioned public UI package; ne re-exportovati ceo `components/` folder.
7. Editor integracije držati kroz specifičan adapter contract.
8. Ukloniti Webshop tip import iz LSA contract-a.
9. Kada inventory dođe na nulu, ukloniti addon `tsconfig` alias koji mapira `@/*` na CMS root.

## Compatibility provera

Pre `ready`:

```text
manifestVersion podržan
runtimeContractVersion podržan
cmsVersion zadovoljava cmsVersionRange
installed packageVersion == desired packageVersion
artifact checksum odgovara potpisanom manifestu
current schemaVersion u package-supported range-u
sve obavezne capabilities registrovane
vendor update entitlement dozvoljava package verziju
```

Greška mora dati stabilan reason code i admin recovery poruku, ne generički module load failure.

## Test-first redosled

1. Manifest parser odbija unknown version/field/type gde je strogo potrebno.
2. Package/addon key mismatch.
3. CMS semver range mismatch.
4. Runtime contract mismatch.
5. Registered capability nije deklarisan u manifestu.
6. Route auth/permission policy se sprovodi u hostu.
7. Expired policy razlikuje new operation i existing obligation.
8. Migration advisory lock sprečava paralelnu primenu.
9. Applied checksum mismatch zaustavlja startup addona.
10. Failed addon migration ne ruši core CMS.
11. Upgrade hook retry je idempotentan.
12. Deactivate zaustavlja nove jobs/rute bez gubitka podataka.
13. Uninstall retain i purge imaju različito, testirano ponašanje.
14. Prethodni package se ne vraća preko nepodržane schema verzije.
15. Lint/CI odbija novi `@/` import u addon package-u.
16. Contract fixture addon prolazi nezavisno od Webshop/LSA source-a.

## Acceptance kriterijumi

- Webshop i LSA koriste isti SDK/manifest/loader contract.
- Host ima jedan registry/dispatcher, ne dva kopirana loader sistema.
- Route auth/license policy je deklarativan i server-side sproveden.
- Novi addon modeli/migracije više ne zahtevaju ručni core schema/migration patch.
- `listMigrations` je uklonjen ili zamenjen stvarnim izvršnim migration contract-om.
- Addon package ne mapira `@/*` na CMS root.
- Nema cross-addon Webshop → LSA contract zavisnosti.
- Install/update/deactivate/uninstall imaju durable, idempotentna stanja.
- CMS update unapred može da kaže da li je instalirani addon kompatibilan.

## Rollout i rollback

1. Objaviti SDK V1 i public fixture addon.
2. Uvesti host registry/dispatcher uz postojeće bridge-eve.
3. Migrirati Webshop na SDK iza `ADDON_SDK_V1` flaga.
4. Migrirati LSA.
5. Seed-ovati legacy migration ledger.
6. Prebaciti nove migracije u package-e.
7. Ukloniti hardkodovane bridge-eve tek kada oba addona prolaze contract/E2E testove.

Rollback zadržava SDK ledger i additive schema. Stari bridge može privremeno pozivati SDK compatibility adapter, ali ne vraćati direktne `.private` importe ili duplirane migracije.

## Implementation record — 2026-07-12

Dodat je lokalni versioned `packages/addon-sdk` V1 sa odvojenim manifest, runtime,
host-services, routing, migrations i testing entrypointima. Manifest razlikuje
`manifestVersion`, `runtimeContractVersion`, `packageVersion`, `schemaVersion` i
`cmsVersionRange`; host registracija odbija route/job koji nije deklarisan u manifestu.
Generic dispatcher sprovodi body-limit, admin/session/permission i `ready_only` license
policy pre handlera. Permission stringovi postoje u descriptoru, uz trenutni compatibility
adapter koji ih mapira na postojeći admin host service.

Migracija `0084_cms_addon_sdk_ledgers` uvodi `cms_addon_migrations` i
`cms_addon_operations`. To je additive priprema za advisory-lock/checksum runner i durable
lifecycle operacije; novi runner/lifecycle hookovi još nisu povezani sa stvarnim Webshop/LSA
package runtime-om. Preflight legacy seed i package-local nove migracije nisu dovršeni.

Coupling inventory pokazuje 310 preostalih `@/` referenci kroz privatne Webshop/LSA source
module. SDK je sada odobrena granica za nove integracije, ali uklanjanje postojećih importova,
uklanjanje privatnog `tsconfig` aliasa i odvajanje LSA contract-a od Webshop tipova ostaju
otvoreni P1 rad. Zato faza nije zatvorena.
