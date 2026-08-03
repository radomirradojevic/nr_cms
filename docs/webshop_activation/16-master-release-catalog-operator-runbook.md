# Master Webshop release catalog — operator runbook

Ovaj runbook je za immutable master release catalog iz Prompta 06. Ne pokreće
activation, worker deployment, payment ili izdavanje licence. CI nikada nema
master DB credential niti HTTP endpoint kojim bi mogao menjati catalog.

## 1. Preduslovi

Pre bilo kog importa mora postojati uspešno objavljen Webshop candidate iz
Prompta 05. Operator mora da pribavi i nezavisno zabeleži sledeće vrednosti za
jednu exact SemVer verziju:

- `@radomirradojevic/webshop@<VERSION>` gde je `<VERSION>` canonical
  `MAJOR.MINOR.PATCH`, nije `0.5.0`, nema prerelease/build metadata;
- stvarni registry `.tgz`, njegov lowercase `npmTarballSha256` i SHA-512 SRI;
- `release-publication-attestation.json` create-only GitHub Release asset i
  njegov SHA-256;
- GitHub Packages `registryPackageVersionId` i njegov immutable `publishedAt`;
- iz tarball-a: `release-manifest.json`, `release-dependency-lock.json`,
  `provenance.json`, `sbom.json`, `migrations.json` i svi
  `migrations/*.sql` payload-i;
- njihov signed manifest/artifact/dependency/migration hash tuple, CMS SHA i
  Webshop tag SHA; i
- GitHub tag `v<VERSION>` koji pokazuje na odobreni Webshop commit.

Za već objavljeni `0.6.0` postoji hosted package evidence, ali ovaj runbook se
ne sme pokrenuti za njega bez posebne potvrde operatora. Master catalog nije
autoritet dok ne prođu zasebni `release:import` i `release:publish` koraci.

## 2. Trusted keyset i operator profil

U protected master operator profilu provisionuj samo public trust materijal:

```dotenv
NRLS_ADDON_RELEASE_PUBLIC_KEYS_FILE=D:\nr_runtime\trust\webshop-release-public-keys.json
NRLS_ADDON_RELEASE_PUBLIC_KEYS_SHA256=<LOWERCASE_64_HEX_SHA256_OF_EXACT_FILE>
NRLS_ADDON_RELEASE_ALLOWED_KIDS=<COMMA_SEPARATED_NONREVOKED_PRODUCTION_KIDS>
NRLS_RELEASE_OPERATOR_DB_ROLE=<DEDICATED_POSTGRES_RELEASE_OPERATOR_ROLE>
NRLS_RELEASE_OPERATOR_DATABASE_URL_FILE=<ABSOLUTE_PROTECTED_OPERATOR_DATABASE_URL_FILE>
```

Keyset mora biti exact JCS UTF-8 `AddonReleaseKeysetV1`, sa
`purpose="addon_release"` i
`issuer="https://github.com/radomirradojevic/webshop"`. Njegov KID mora biti
na allowlisti i `active` ili `verification_only` unutar validity intervala.
`revoked` KID je fail-closed, uključujući prethodno imported draft. Produkcioni
operator profil ne sme imati praznu KID allowlistu.

`NRLS_RELEASE_OPERATOR_DB_ROLE` nije runtime/API credential. CLI proverava da
je PostgreSQL `current_user` potpuno isti kao ova vrednost. Provisionuj ga kao
posebnu najmanje-privilegovanu DB rolu; normalni Next runtime i CI credential
ne smeju moći da je koriste. Password/connection secret ostaje u postojećem
protected secret-ref/DB operator mehanizmu, nikad u command argumentu,
Markdown-u ili staging folderu.

### Lokalni development profil

Za lokalni `NRLS_ENVIRONMENT=development` postoji idempotentni provisioning
korak, koji se pokreće iz `.private/license-server` samo pod Windows
Administrator tokenom:

```powershell
npm run env:provision:local -- --apply
```

On ne migrira bazu i ne importuje/publishuje release. Iz postojećeg lokalnog
vendor signing ključa izvede entitlement public keyset, napravi development
purchase-intent Ed25519 ključ ako ga nema, i kreira izdvojenu
`nrls_release_operator` login rolu sa credential-om u ACL-zaštićenom fajlu
van repozitorijuma. CLI učitava samo taj protected URL kroz
`NRLS_RELEASE_OPERATOR_DATABASE_URL_FILE`; runtime `.env` ne sadrži password
te role. Posle primene katalog migracije ponovo pokreni istu idempotentnu
komandu: ona daje toj roli samo `SELECT, INSERT, UPDATE` nad
`addon_release_catalog` i samo `INSERT` nad `audit_events`, bez DDL/DELETE/
GRANT ovlašćenja.

Authority-provisioned `webshop-release-public-keys.json` ostaje netaknut.
Lokalni profil koristi byte-identičnu hash-pinned kopiju pod imenom
`local-dev-webshop-release-public-keys.json`, da lokalni Next runtime ima
read pristup bez menjanja ACL-a authority fajla. Ovo nije production trust
materijal i ne sme se kopirati u deployment profil.

Prvo usaglasi target `.env` sa `.env.example` i zameni zastareli
`NRLS_VENDOR_SIGNING_PUBLIC_KEYS_JSON` versioniranim entitlement/purchase
keyset ugovorom. Zatim mora proći:

```powershell
npm run env:validate
npm run db:migrate:production:dry-run
```

Ne menjati `.env` vrednosti nagađanjem. Ako keyset/secret-ref nije provisioned,
zaustaviti se pre database migration ili release CLI koraka.

## 3. Staging evidence-a

Preuzeti tarball i detached attestation u ACL-zaštićen staging folder van:

- `D:\nr_cms\.private\license-server` source checkout-a; i
- `D:\nr_runtime` runtime/deployment root-a.

Primer strukture (samo primer putanje):

```text
D:\nr_release_staging\webshop\<VERSION>\
  radomirradojevic-webshop-<VERSION>.tgz
  release-publication-attestation.json
```

Oba inputa moraju biti absolute regular non-reparse fajlovi. Import ograničava
tarball na 256 MiB i attestation na 1 MiB, proverava hash pre prvog DB write-a
i ne prima public key, URL, status ili proizvoljan JSON kroz CLI.

## 4. Offline import: create-only `draft`

Iz protected operator shell-a, nakon što si dobio exact SHA-256 vrednosti iz
Prompt 05 evidence-a:

```powershell
npm run release:import -- `
  --tarball D:\nr_release_staging\webshop\<VERSION>\radomirradojevic-webshop-<VERSION>.tgz `
  --attestation D:\nr_release_staging\webshop\<VERSION>\release-publication-attestation.json `
  --expected-tarball-sha256 <LOWERCASE_64_HEX> `
  --expected-attestation-sha256 <LOWERCASE_64_HEX> `
  --change-ref <AUDIT_TICKET_OR_LOCAL_E2E_RUN_ID>
```

Backtick mora biti poslednji znak PowerShell reda. Komanda ne pravi mrežni
poziv. Ona proverava Windows-safe tar inventory, package/addon allowlist,
embedded manifest i detached attestation Ed25519 potpise, artifact/SBOM/
provenance/dependency graph, GitHub registry identity, `publishedAt`, svaki
packaged SQL checksum i canonical `webshop` postcondition evidence.

Uspešan rezultat je redigovani receipt sa `releaseId`, statusom `draft` i
attestation hash-om. Tačan retry vraća isti draft. Isti `releaseId`, package
version ili artifact hash sa različitim bytes/hash-evi je security incident,
ne retry; ne brisati ili menjati postojeći evidence red.

## 5. Odvojeno publish: `draft → published`

Tek pošto je import receipt pregledan, izvrši odvojenu komandu sa istim audit
reference-om:

```powershell
npm run release:publish -- `
  --release-id <CANONICAL_RELEASE_UUID> `
  --expected-attestation-sha256 <SAME_LOWERCASE_64_HEX> `
  --change-ref <SAME_AUDIT_TICKET_OR_LOCAL_E2E_RUN_ID>
```

Publish ponovo proverava stored byte/hash tuple i trenutno pinovani keyset/KID
policy pod advisory lock-om. Ne generiše `publishedAt=now`; koristi samo
attested GitHub registry vreme. Menja isključivo lifecycle status/audit polja,
nikada immutable manifest/evidence tuple. Tačan retry je idempotentan.

Posle objave, read-only evidence endpoint je:

```text
GET /.well-known/nr-addon-releases/<RELEASE_UUID>/publication-attestation.json
```

Odgovor vraća exact stored bytes i strong ETag jednak
`publicationAttestationHash`. Evidence ostaje dostupan i kada je release
`withdrawn`; samo selector prestaje da ga bira za novi install/update.

## 6. Incident i rollback granice

Katalog nema delete ili overwrite tok. Za incident posle publish-a koristi se
samo auditovani transition:

```powershell
npm run release:withdraw -- `
  --release-id <CANONICAL_RELEASE_UUID> `
  --change-ref <INCIDENT_REFERENCE>
```

`withdrawn` blokira novu selekciju, ali ne briše historical evidence. Ako je
KID kompromitovan, prvo objavi chain-ovan keyset sa tim KID-om `revoked`,
reprovision/pinuj njegov hash na masteru i workerima, zatim review/povuci
pogođene release-e prema incident proceduri. Nikada ne pretvarati kompromitovan
KID u `verification_only` radi komfora.

Implicitni downgrade je zabranjen. Njega može rešiti samo buduća posebna,
auditovana rollback/maintenance operacija sa exact release ID-em i schema
compatibility dokazom; Prompt 06 je ne implementira.

## 7. Lokalna verifikacija bez hosted mutacije

Repository ima frozen fixture testove; oni ne koriste stvarni package niti
prave catalog release. Pokreni:

```powershell
npm run db:migrate:test
npm run test:db
$env:NRLS_RUN_ISOLATED_RESTORE='1'
npm run test:release-catalog:restore
```

Poslednja komanda sme koristiti samo dedicated `nrls_*test` target. Kreira
nasumičnu `nrls_release_restore_*` bazu, poredi migration ledger i immutable
catalog evidence, a zatim je terminira i briše u `finally` cleanup-u.
