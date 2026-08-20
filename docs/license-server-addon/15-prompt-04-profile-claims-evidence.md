# Prompt 04 — Product/Profile i custom claims as-built evidence

Datum provere: 2026-08-16 (Europe/Belgrade).

## 1. Granica i vlasništvo

- `.private/license-server-addon` poseduje Product/Profile/Claim Schema domen,
  business servise, admin wizard i package migraciju.
- Root `db/schema.ts` je samo kompatibilni Drizzle mirror za packaged runtime;
  root nema duplikat add-on migracije.
- `.private/addon-deployment-worker` poseduje izvršnu install allowlist granicu.
  Prompt 04 dozvoljava DML samo potpisanoj/checksum-pinned migraciji
  `0003_product_profiles_and_claim_schemas.sql` i samo nad 17 eksplicitno
  posedovanih License Server tabela.
- Root provisioner unapred instalira/proverava jedinu dozvoljenu ekstenziju,
  `pgcrypto` u `public`; package migracija idempotentno ponavlja isti zahtev pod
  advisory lock-om. Arbitrary extension, package, script, DML i neposedovani
  objekti ostaju odbijeni.
- `.private/webshop` fulfillment nije menjan u Prompt-u 04. Webshop još ne mapira
  prodajnu stavku na novi Profile/Claim input; to je namerno izvan ovog prompta.
- Centralni Master i dalje samo prodaje/aktivira add-on i izdaje `NRLS-...`
  add-on ključ. Customer licence i profile nikad ne izdaje Master.

## 2. Implementirani model

### Product Type i License Profile

- Novi Product Type dobija normalizovan, stabilan `externalRef` i stabilni
  `audience`; postojeći status ugovor ostaje kompatibilan.
- Postojeći SKU je jedan stabilni License Profile. Kreiranje pravi neaktivan
  Profile i revision 1 `draft`; tek potvrđeni publish sinhronizuje legacy SKU
  projection i čini profil aktivnim.
- Svaki Profile revision pin-uje policy snapshot, environment-e, audience,
  schema version, default claims, override restrictions, `policyHash` i
  `revisionHash`.
- Published revision nije edit target. Edit pravi/menja jedini draft; publish je
  transakcioni conditional update nad očekivanim revision hash-em; deprecate ne
  briše istoriju.

### Restricted custom schema i claims

- Dozvoljen je samo closed JSON Schema object subset za string/integer/number,
  boolean, bounded primitive array i bounded closed object.
- Nema `$ref`, remote reference, `eval`, executable izraza, otvorenog
  `additionalProperties`, composite array rekurzije ili nepoznatih keyword-a.
- Granice su: 64 claim properties, depth 5, payload 16 KiB, string 1 KiB i 100
  array elemenata. Rule/schema dokumenti imaju zaseban bounded parser kako
  keyword metadata ne bi lažno potrošila limit od 64 claim polja.
- Klasifikacije su `public_runtime`, `customer_visible`, `runtime_hidden_ui` i
  `internal_only`. Override je dozvoljen samo iz tačno dokumentovanih izvora;
  Profile restriction sme samo da suzi schema pravila.
- NFC i format normalizacija, sortirani object ključevi i canonical JSON daju
  deterministične `schemaHash`, `policyHash`, `revisionHash` i `claimHash`.
  Domain, slug/reference, RFC3339 time, enum/limit i unique-array pravila se
  proveravaju bez izvršavanja korisničkog koda.

### Admin i audit

- Jedan production dashboard izvor sada ima Profile revision wizard: draft edit,
  current/draft JSON diff, eksplicitni `PUBLISH IMMUTABLE`, deprecate, schema
  draft/publish/deprecate i effective-claims preview.
- Schema publish traži `PUBLISH SCHEMA`; oba deprecate toka traže `DEPRECATE`.
- Mutacije koriste granularne `license-server.*` permission-e. Legacy admin bez
  eksplicitnog niza zadržava kompatibilnost; kada niz postoji, provera je
  fail-closed.
- Product create, Profile/Schema save/publish/deprecate i license issue imaju
  audit događaje sa ID/revision/hash metadata-om, bez schema/claim secret dump-a.

## 3. Migracija i snapshot kompatibilnost

Release schema version je 3. Novi descriptor je:

```text
0003_product_profiles_and_claim_schemas.sql
sha256 4e24beb14ed11a158217e73755f7f5976ebeb72aa527594143046a74a4220a7f
rollbackPolicy expand_compatible
destructive false
```

Migracija:

1. dodaje Product audience i Profile/Schema revision metadata;
2. backfill-uje stabilni ref/audience samo gde nedostaju;
3. za legacy SKU bez revizije pravi published revision 1 iz postojećeg policy-ja;
4. pin-uje `current_profile_revision_id` i pravi one-draft unique indeks;
5. ne sadrži `UPDATE license_server_licenses`, delete, drop ili down putanju.

DB fixture pre 0003 kreira realan Product/SKU/API client i izdatu licencu. Posle
upgrade-a poredi svako pređašnje license polje i potvrđuje da su novi
Profile/Schema/policy/claim snapshot stubovi ostali `NULL`. Novi release issuance
test zatim potvrđuje da nova licenca koristi dostupne immutable snapshot kolone.

## 4. Reproducibilne komande i rezultati

| Repo / komanda | Rezultat |
| --- | --- |
| `.private/license-server-addon`: `npm run typecheck` | PASS; release i host TypeScript. |
| `.private/license-server-addon`: `npm run test:local` | PASS; 51 pass, 0 fail, 3 DB testa eksplicitno skip bez DB env-a. |
| `.private/license-server-addon`: `npm run test:db:local` | PASS; 54/54, 0 skip. |
| `.private/license-server-addon`: `npm run build:local` | PASS; artifact `e219388976d5bf42cefe6fd9b4e000643804f77c560eb37926c176ff2177532b`; build unit faza 51 pass/3 očekivana DB skip-a. |
| `.private/license-server-addon`: `npm run pack:verify` | PASS; allowlist/secret audit; tarball SHA-256 `654dd4b91a122b5c76127108be566ae597478c60bcda0b326f33c29cb891469f`. |
| `.private/license-server-addon`: `npm run install:verify:next:db` | PASS; frozen tarball install, Next 16.3 build/start, 11 dashboard/API/capability putanja; artifact isti, probe tarball `51b59a651ab3d3dfe3c44e226d902e8de9a85d4422a6f4cc33a62833c082c893`. |
| `.private/addon-deployment-worker`: `npm run typecheck` | PASS. |
| `.private/addon-deployment-worker`: `npm test` | PASS; 78 pass, 0 fail, 5 namenski preskočenih mutating DB testova. |
| root: `npm run typecheck` | PASS. |
| root: `npm test` | PASS; 368 pass, 0 fail, 10 namenski preskočenih DB/staging testova. |
| root: transient development/empty env + `npm run build` | PASS; Next.js 16.3 production build i 25/25 static page generation. |
| `.private/webshop`: `npm run typecheck` | PASS. |
| `.private/webshop`: `node --import tsx --import ./tests/register-server-only-loader.mjs --test tests/customer-license-issuer-integration.test.ts tests/fulfillment-outbox-v2.test.ts tests/vendor-webshop-license-offer.test.ts` | PASS; 14/14, bez fulfillment regresije. |
| sva tri worktree-a: `git diff --check` | PASS; samo postojeća Git LF/CRLF upozorenja, bez whitespace greške. |

Tačna uspešna root build komanda nije koristila produkcione tajne:

```powershell
$env:NR_CMS_DEPLOYMENT_PROFILE='development'
$env:NR_LICENSE_ENVIRONMENT='development'
$env:NR_ADDON_SOURCE_MODE='empty'
$env:WEBSHOP_ENABLED='false'
$env:LICENSE_SERVER_ENABLED='false'
$env:NODE_USE_SYSTEM_CA='1'
npm run build
```

`empty` build dokazuje root core kompilaciju bez privatnog paketa; packed add-on
kompilaciju i stvarni runtime render sa package migracijama dokazuje zasebni
`install:verify:next:db` test.

## 5. Neuspešni pokušaji koji nisu prećutani

| Pokušaj | Failure | Dokazana korekcija |
| --- | --- | --- |
| Prvi DB suite | `digest(bytea, unknown) does not exist` na čistoj bazi. | `pgcrypto` je postao eksplicitna manifest/provision/migration allowlist stavka; pravi SHA-256 je zadržan. |
| Paralelni DB fixture-i | concurrent `CREATE EXTENSION` unique conflict. | Package migracija serijalizuje tačno pgcrypto install advisory xact lock-om i instalira ga u `public`. |
| Prvi isolated Next DB render | HTTP failure na `/dashboard/license-server/product-types`. | Host verifier sada instalira tarball `migrations.json` u svežu izolovanu schema-u pre rendera; ponovljeno 11/11. |
| Prvi root `npm run build` | fail-closed: nedostajalo pet managed-worker HMAC/URL promenljivih. | Nisu izmišljene produkcione tajne; build je ponovljen zvaničnim `development/empty` profilom. |
| Prvi `development/empty` build | local Caddy trust gate je tražio `NODE_USE_SYSTEM_CA=1`. | Dodat je samo tranzijentni, dokumentovani Node system-CA flag; build zatim prolazi. |
| Prvi root test posle manifest izmene | stari privilege-manifest SHA pin i nepoznato `extensionNames` polje. | Root provisioner/parser i tri SHA pina su usklađeni; fokusirani test 7/7 i puni root 368/0. |

## 6. Acceptance mapa

| ID | Status | Konkretan dokaz |
| --- | --- | --- |
| PROF-01 | zelen | `profile-domain.ts`, Product create/backfill, revision DB/domain test. |
| PROF-02 | zelen | Conditional draft-only services, hash-pinned publish, confirmation/permission test i DB published-update no-op. |
| PROF-03 | zelen | 0003 legacy fixture upgrade i field-by-field postojeći license snapshot poređenje. |
| CLAIM-01 | zelen | Positive/negative subset test, uključujući tačno 64 potpuno ograničena polja. |
| CLAIM-02 | zelen | Canonical order/hash vectors, source narrowing i effective projection test. |
| CLAIM-03 | zelen | Unknown/oversize/depth/prototype/enum/limit negative vektori. |
| CLAIM-04 | zelen za Prompt 04 | `licenses.ts` snapshot pinning, package boundary test i DB release issuance; Webshop override mapping ostaje Prompt 10. |
| CLAIM-05 | zelen za Prompt 04 | `internal_only`/customer/runtime projection test i zabrana implicitnog metadata/PII kopiranja u custom snapshot. |

Nisu izvršeni production publish, live payment, live managed redeploy niti staging
signed-assertion E2E. Ti gate-ovi nisu deo Prompt-a 04 i ne proglašavaju ceo V2
proizvod spremnim.
