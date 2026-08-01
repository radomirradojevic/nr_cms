# 04 — Master License Server bootstrap, katalog i API klijent

## Cilj

Master na https://license.nr.test mora biti sposoban da:

- se bezbedno podigne nad praznom bazom;
- dozvoli admin login;
- definiše Webshop product type i četiri SKU-a;
- izda vendor lifetime licencu vezanu za vendor.nr.test;
- autentifikuje vendor Webshop HMAC V2 zahtev;
- vrati katalog;
- izda client licencu vezanu za client.nr.test;
- validira activation i revalidation;
- obezbedi immutable release metadata.

## 1. Migracije i start

Iz D:\nr_license-server:

    npm ci --ignore-scripts
    npm run env:validate
    npm run db:migrate:dry-run
    npm run db:migrate
    npm run dev -- --port 3001

Provera:

    Invoke-WebRequest -UseBasicParsing https://license.nr.test/api/v1/health
    Invoke-WebRequest -UseBasicParsing https://license.nr.test/.well-known/nr-license-keys.json

Addon-entitlement endpoint `GET /.well-known/nr-license-keys.json` čita samo hash-pinovani `NRLS_ENTITLEMENT_PUBLIC_KEYSET_FILE` i vraća exact keyset contract iz dokumenta 02 sa `purpose="addon_entitlement"`. Phase 6 uvodi odvojeni `GET /.well-known/nr-purchase-intent-keys.json` sa istim contractom i `purpose="purchase_intent"`. Response zato obavezno sadrži integer `sequence`, chained `previousKeysetSha256`, RFC 3339 UTC `generatedAt/notBefore/notAfter` i samo `active|verification_only|revoked` status; nije dozvoljena skraćena mapa. Endpoint vraća validirani fajl, `Cache-Control: public, max-age=300, must-revalidate` i strong ETag izveden iz content hash-a. Oba fajla moraju sadržati svoj odgovarajući jedini aktivni signing KID i koriste različite key pair-eve. Plain KID→PEM mapa se uklanja. Private key i proizvoljan token-provided key URL nikada se ne vraćaju/prate.

## 2. P0: bezbedan bootstrap admina

### Trenutni problem

src/lib/bootstrap.ts nad praznom bazom:

1. generiše random password;
2. upiše hash;
3. namerno ne vraća i ne loguje password.

Rezultat je admin korisnik kome operator ne zna credential. Otvaranje /login može trajno zatvoriti jedini bootstrap prozor.

### Ciljno rešenje

Implementirati jednokratni CLI:

    npm run admin:bootstrap -- --password-file <ABSOLUTE_SECURE_INPUT_FILE>

Predloženi fajlovi:

    scripts/bootstrap-admin.ts
    tests/bootstrap-admin.test.ts

CLI mora:

1. zahtevati eksplicitnu apsolutnu input putanju van repoa;
2. pre DB mutacije proveriti da je fajl regularan, nije symlink/reparse target, ima restriktivan ACL i sadrži tačno jednu password vrednost koja prolazi policy;
3. password generiše operator/password manager pre poziva, pa ostaje dostupan i ako proces padne posle DB commita;
4. otvoriti DB transakciju i PostgreSQL advisory lock;
5. proveriti da nema `admin_users` redova;
6. upisati username `admin`, password hash i `mustChangePassword=true`;
7. u istoj DB transakciji auditovati bootstrap bez passworda/patha/content hash-a;
8. commitovati, obrisati password iz aplikacionih promenljivih koliko runtime dozvoljava i ispisati samo admin ID/success;
9. nikada ne ispisati password u console, URL, error ili persistent log;
10. drugi poziv odbiti jer admin već postoji, ali ne menja/uklanja operatorov input fajl.

Ovo namerno izbegava nemoguću „atomsku DB + filesystem” transakciju. Crash pre commita ostavlja praznu bazu i isti input za retry. Crash posle commita ostavlja validnog admina i isti operator-known password za login. CLI nikada automatski ne briše input; operator ga uklanja tek posle uspešnog login/password-change dokaza.

Obavezni fault-injection testovi prekidaju proces: pre hasha, posle inserta ali pre commita, odmah posle commita i pre success outputa. Ni jedan prozor ne sme ostaviti admina sa operatoru nepoznatim credentialom niti drugi admin red.

Ukloniti implicitni ensureBootstrapAdmin poziv iz login page/action toka. Login ruta ne sme menjati bazu.

MANUAL nakon implementacije:

1. password managerom napraviti random policy-compliant one-time password;
2. sačuvati ga u ACL-protected `D:\nr_secrets\license-server-bootstrap-password.txt` van repoa;
3. pokrenuti:

       npm run admin:bootstrap -- --password-file D:\nr_secrets\license-server-bootstrap-password.txt

Zatim:

1. otvoriti https://license.nr.test/login;
2. prijaviti se;
3. odmah promeniti password;
4. potvrditi da mustChangePassword više nije aktivan;
5. bezbedno obrisati one-time fajl;
6. sačuvati audit event ID kao evidence.

Privremeni ručni SQL password upis nije prihvatljiv kao finalni tok.

## 3. P0: product type requiresDomain

### GAP

product_types.requires_domain postoji, ali productTypeSchema, admin forma i create action ga ne izlažu.

### TARGET

Izmeniti:

    .private/license-server/app/admin/actions.ts
    .private/license-server/app/admin/product-types/new/page.tsx
    .private/license-server/app/admin/product-types/[id]/page.tsx
    .private/license-server/src/db/schema.ts

ako je potreban edit action/migration.

Forma mora imati checkbox:

    Require canonical domain for every issued entitlement

Create/update action:

- parsira boolean;
- upisuje requiresDomain;
- audit metadata sadrži staru i novu vrednost;
- zabrani gašenje requiresDomain ako postoje aktivne domain-bound Webshop licence bez eksplicitne migration odluke.

Za Webshop product type:

    title = Webshop license key
    addonKey = webshop
    requiresDomain = true
    status = active

## 4. Četiri master SKU-a

Kreirati:

| SKU | durationDays | activationLimit | edition | licenseType | policyTemplate | status |
|---|---:|---:|---|---|---|---|
| webshop-30 | 30 | 1 | standard | perpetual | default | active |
| webshop-183 | 183 | 1 | standard | perpetual | default | active |
| webshop-365 | 365 | 1 | standard | perpetual | default | active |
| webshop-1000000 | 0 | 1 | standard | perpetual | default | active |

Napomena:

- durationDays=0 znači lifetime;
- activationLimit=1 znači jedan aktivni installation slot;
- period licence i subscription billing nisu isto;
- za jednokratno kupljenu vremensku licencu licenseType može ostati perpetual dok validUntil ograničava korišćenje;
- ako se kasnije uvede auto-renew, to je poseban subscription model.

### Lifetime activation contract GAP

Centralna licenca sa `validUntil=null` jeste lifetime, ali trenutni addon activation response tu vrednost pretvara u sentinel `2099-12-31T23:59:59.999Z`, a CMS response schema zahteva datum. V2 mora razdvojiti:

- `licenseValidUntil: string | null` — `null` je lifetime poslovno pravo;
- JWS `exp` — kratkotrajni kriptografski envelope/revalidation rok;
- `nextRevalidationAt` i `graceEndsAt` — runtime politika.

Ne koristiti 2099 sentinel kao lifetime contract niti ga prikazivati kupcu kao stvarni datum isteka.

### Purchase offer mapping (TARGET Phase 6)

Client ne sme da zna master `productTypeId` UUID. Dodati admin/seed model `vendor_purchase_offers` sa composite unique `(environment, offer_key, addon_key, vendor_audience)`, composite FK `(environment, catalog_version)` ka immutable catalog revisionu i poljima:

    environment=development
    offerKey=nr-cms-webshop-license
    addonKey=webshop
    vendorAudience=https://vendor.nr.test
    vendorApiClientId=<VENDOR_COMMERCE_API_CLIENT_UUID>
    productTypeId=<WEBSHOP_PRODUCT_TYPE_UUID>
    vendorProductRef=nr-cms-webshop-license
    catalogVersion=<CURRENT_VERSION>
    status=active

Aktiviranje mappinga server-side potvrđuje active vendor API client u exact istom environmentu, njegovu audience/environment vezu i potrebne purchase/issue scope-ove, kao i `requiresDomain=true`, addon key, product status i tačna četiri aktivna SKU-a. Purchase-intent challenge prima samo javni `offerKey`, ali server lookup je u konfigurisanoj environment particiji; master iz ovog reda snapshotuje environment, DB UUID, vendor client, vendor product ref, catalog version i allowed SKU-eve. `:accept` mora biti potpisan baš tim client ID-em i jednim njegovim validnim active/overlap KID-em; mapping ne snapshotuje jedan KID jer kontrolisana HMAC rotacija mora ostati moguća. Promena/disable mappinga je auditovana i ne menja već consumed order binding.

Nakon unosa proveriti GET catalog tek pošto V2 client/scope deo ispod bude završen.

## 5. P0: V2 API client secret versions

### Trenutni problem

Master authenticateApiRequest čita api_client_secret_versions, dok createApiClientAction i rotateApiClientSecretAction trenutno menjaju samo legacy kolone na api_clients.

Migracioni legacy-1 backfill pomaže samo klijentima koji su postojali kada je migracija primenjena. Ne pomaže novom klijentu u praznoj bazi.

### TARGET create

U jednoj DB transakciji:

1. kreirati api_clients red;
2. generisati clientId;
3. generisati secret;
4. generisati keyId, na primer vendor-local-<random>;
5. upisati encrypted/fingerprint legacy kolone samo dok compatibility zahteva;
6. upisati api_client_secret_versions:
   - apiClientId;
   - keyId;
   - secretEncrypted;
   - secretFingerprint;
   - activeFrom=now;
   - activeUntil=null;
   - revokedAt=null;
7. auditovati client ID, KID i fingerprint, nikada secret;
8. one-time reveal mora prikazati clientId, keyId i secret.

### TARGET rotation

Rotacija:

1. kreira nov KID i secret version;
2. starom aktivnom key-u postavlja vremenski ograničen overlap activeUntil;
3. vraća novi secret samo jednom;
4. vendor prvo upisuje novi clientId/KID/secret;
5. uspešan catalog sync i issue smoke potvrđuju novi key;
6. operator zatim opoziva stari key;
7. audit beleži ceo tok.

Ne menjati secret in-place bez version reda.

Ovo je rotacija vendor-master HMAC credentiala i odvojena je od master at-rest KEK rotacije. `NRLS_SECRET_ENCRYPTION_KID` označava aktivni envelope ključ, a `NRLS_SECRET_DECRYPTION_KEYS_JSON` samo stare KID/key parove. Novi write koristi active KID; idempotentni batch pod row lock/version kontrolom decrypt/validira/rewrap-uje postojeće API-secret i replay ciphertextove. Red bez KID-a koristi eksplicitnu `legacy-nrls-secret-v1` granu. Stari KEK se uklanja tek posle zero-count, restart i restore testa; ne menja API `keyId`, secret fingerprint ili plaintext HMAC vrednost.

## 6. P0: product scopes

Dodati admin stranicu:

    /admin/api-clients/[id]/scopes

i server actions za:

- grant;
- revoke;
- list active/revoked;
- validaciju environment-a;
- product-level ili SKU-level scope;
- audit.

Za vendor Webshop client preporučen je product-level scope za Webshop product type, jer obuhvata tačno četiri njegova SKU-a:

| Action | Obavezno za prvi E2E | Razlog |
|---|---|---|
| catalog | da | sync proizvoda/SKU-a |
| issue | da | izdavanje posle capture-a |
| validate | da | provera i update authorization |
| suspend | da | dispute open |
| revoke | da | full refund/dispute lost |
| refund | prema korišćenoj ruti | refund lifecycle |
| chargeback | prema korišćenoj ruti | chargeback lifecycle |
| reinstate | da pre dispute-won testa | vraćanje prava |
| purchase_intent.accept | da | vezivanje potpisanog intenta za vendor client |
| purchase_intent.reserve | da | checkout reservation lease |
| purchase_intent.release | da | oslobađanje napuštenog checkouta pre order veze |
| purchase_intent.consume | da | terminalno vezivanje za order/item/snapshot pre payment-a |
| purchase_intent.status | da | authenticated cancellation/hold reconciliation |
| purchase_intent.payment_authorize | da | svež fail-closed gate pre provider session-a |
| purchase_intent.payment_commit | da | vezivanje korišćene autorizacije za provider checkout |
| renew | kasnije | obnova vremenske licence |

Svaki scope:

    apiClientId = vendor Webshop API client
    productTypeId = Webshop license key ID
    skuId = null za product-level ili konkretan ID
    environment = development
    revokedAt = null

API client environment mora biti development, isto kao NRLS_ENVIRONMENT.

Vendor/client CMS requesti šalju exact `NR_LICENSE_ENVIRONMENT`; master zahteva njegovu jednakost sa API-client environmentom, `NRLS_ENVIRONMENT`, purchase/entitlement snapshotom i svim idempotency bindingom. Validate/catalog/issue/lifecycle builder ne izvodi environment iz URL-a, `NODE_ENV` ili CMS profila. Mismatch je authenticated `403 environment_mismatch` pre state mutation-a i deo je integration smoke-a.

Ne postavljati isGlobalService=true. Global client nepotrebno širi ovlašćenje.

allowedDomains za vendor commerce client treba ostaviti prazno ako vendor sme da izdaje licence za različite kupčeve domene. requiresDomain i purchase-intent snapshot zahtevaju da domain postoji; fixed allowedDomains lista bi pogrešno dozvolila samo unapred poznate kupce.

AS-BUILT schema check/TypeScript action allowlist još ne poznaju sedam `purchase_intent.*` action-a iz tabele. Phase 6 mora u istoj migraciji/change setu proširiti DB constraint/enum, shared action type/parser, authorization enforcement, admin scope provisioning i negative testove za svaki pojedinačni scope. Scope redovi se kreiraju tek posle te migracije; zaobilaženje constrainta ručnim SQL-om nije E2E.

## 7. P0: KID kroz vendor Webshop

Webshop `webshop_license_servers` trenutno čuva client ID i secret, ali ne čuva auth KID.

Dodati:

    auth_key_id text

u host schema/migraciju, safe model, create/update action i Settings UI.

Sva četiri V2 request buildera moraju slati KID:

    buildWebshopLicenseServerCatalogRequest
    buildWebshopVendorLicenseV2IssueRequest
    buildWebshopVendorLicenseV2LifecycleRequest
    buildWebshopVendorLicenseV2ValidateRequest

Zaglavlje je:

    X-NRLS-Key-Id: <CONFIGURED_KID>

Trenutno ga postojeća tri buildera ne šalju, a dedicated validate builder uopšte ne postoji; zato tokovi padaju na `legacy-1` fallback i rotacija ne radi. Dodati shared builder/contract test koji proverava KID za GET catalog i za svaku issue/lifecycle/validate mutaciju.

Validate builder je server-only i koristi isti exact HMAC V2 canonical contract za `POST /api/v1/entitlements/validate`. Strict request body je `{contractVersion:1,licenseKey,domain}`; parser prihvata samo strict response `{contractVersion:1,entitlementId,licenseId,reason,status,valid,validUntil,updatesUntil}` bez unknown polja. Issued key se dekriptuje samo u memoriji neposredno pre buildera, request/body/key se ne loguju, a durable observation čuva samo key fingerprint/binding i response JCS hash/status metadata. Builder zahteva konfigurisan auth KID/client/secret/environment i nikada ne koristi browser ili client-side fetch.

API shared secret se lokalno šifruje sa `WEBSHOP_LICENSE_SERVER_SECRET_KEY`. Ovaj encryption key nije sam HMAC API secret i koristi se samo za vendorov master API credential; licencni ključevi vraćeni iz issuance-a koriste odvojeni issued-license KEK/KID iz dokumenta 08.

## 8. P0: V2 catalog builder

### GAP

GET /api/v1/catalog na masteru zahteva HMAC V2. Trenutni Webshop buildWebshopLicenseServerCatalogRequest koristi legacy canonical format i ne šalje auth version/KID.

### TARGET

Catalog builder mora koristiti isti V2 canonical contract kao issue:

    method = GET
    pathAndQuery = /api/v1/catalog
    body = empty string
    idempotencyKey = empty
    timestamp
    nonce
    clientId
    SHA-256 praznog body-ja

Headers:

    X-NRLS-Auth-Version: 2
    X-NRLS-Client-Id
    X-NRLS-Key-Id
    X-NRLS-Timestamp
    X-NRLS-Nonce
    X-NRLS-Signature

Dodati integration test koji pokreće stvarni Webshop request builder protiv stvarnog master route handlera. Pure helper fixture nije dovoljan.

### Stabilni catalog revision contract

AS-BUILT catalog trenutno pravi `catalogVersion` iz `new Date().toISOString()` pri svakom GET-u. To nije verzija: dva čitanja bez mutacije vraćaju različite identitete i lažno obaraju offer, variant, intent i order binding.

Dodati mutable head i immutable history:

    vendor_catalog_heads
    environment text primary key
    revision bigint not null
    content_sha256 text not null
    changed_at timestamptz not null
    changed_by text not null

    vendor_catalog_revisions
    environment text not null
    revision bigint not null
    catalog_version text not null
    content_sha256 text not null
    projection_jsonb jsonb not null
    created_at timestamptz not null
    created_by text not null
    primary key (environment, revision)
    unique (environment, catalog_version)

Autoritativni catalog projection obuhvata samo sortirana poslovna polja product type-a i SKU-a koja consumer koristi: ID, addon key, type/status, `requiresDomain`, SKU ID/code/status, duration, activation limit/edition/features i druge eksplicitno versionirane issue vrednosti. Ne uključuje `generatedAt`, request vreme, sync vreme, audit ID ili redosled dobijen iz DB-a. Projection se serijalizuje RFC 8785/JCS pravilima i hashira SHA-256.

Svaka admin/seed/import mutacija koja bi promenila projection u istoj DB transakciji zaključava head red, menja katalog, računa novi hash, insertuje novi immutable history snapshot i povećava head `revision` tačno jednom. No-op update zadržava isti revision/hash i ne pravi history red. Direktni write mimo ovog service-a je zabranjen; drift health job ponovo računa hash i blokira catalog/offer activation ako se ne slaže.

`environment` je normalized lower-case enum `development|staging|production`, preuzet iz `NRLS_ENVIRONMENT`; ne dolazi iz requesta. Wire vrednost je tačno:

    catalogVersion=nrls-catalog-v1:<ENVIRONMENT>:<DECIMAL_REVISION>:sha256:<64_LOWERCASE_HEX>

GET `/api/v1/catalog` vraća `environment`, head `catalogVersion` i zaseban informativni `generatedAt`; `ETag` deterministički predstavlja istu environment/revision/hash vrednost, a validan `If-None-Match` dobija `304` bez body-ja. Svaki offer/intent/issue red nosi isto immutable `environment` polje i `(environment,catalog_version)` composite FK na history snapshot. Authenticated API client environment mora mu odgovarati. Tako identični prazni ili sadržajno jednaki katalozi u dva environmenta ne kolidiraju niti se mogu cross-environment referencirati. Posle stvarne catalog mutacije aktivni offer postaje `catalog_revalidation_required` dok operator ili automatizovani provisioner ne potvrdi nove SKU-eve i atomski upiše novu verziju; već izdati intent/order snapshot zadržava staru verziju.

Master `:consume` i issue ne čitaju današnji mutable product/SKU red kao istorijski autoritet. Po `environment + catalogVersion + productTypeId + sku` učitavaju immutable `projection_jsonb` snapshot i iz njega proveravaju tadašnji addon/domain requirement/status/duration/activationLimit/edition/features. Tako promena trajanja ili policy-ja posle consumed intenta ne menja već kupljeni proizvod. Catalog history se ne briše dok ga referencira offer, purchase intent, order/issue/license ili finansijski/licencni retention; eventualna arhiva zadržava canonical bytes/hash i proverljivu referencu.

Migracija pravi head i početni immutable revision iz postojećeg projectiona, uključujući prazan katalog. Obavezni testovi su: dva neizmenjena GET-a daju isti `catalogVersion`/ETag; promenjen `generatedAt` ne menja verziju; no-op admin save je ne menja; stvarna SKU/status/duration promena je povećava; concurrent mutacije ne gube revision; drift se fail-closed detektuje; consumed intent na staroj verziji i posle mutacije izdaje po starom duration/activationLimit snapshotu.

Vendor Webshop License Server base URL mora biti:

    https://license.nr.test/api/v1

Ako se unese samo https://license.nr.test, builder će napraviti pogrešnu /catalog ili /entitlements putanju.

## 9. Immutable release provisioning

vendor_release_manifests tabela već postoji, ali:

- nema admin/import tok;
- activation koristi hardkodovani PACKAGE_CONFIG;
- zapis nema sve potpisane release podatke.

Prvi contract bira isključivo offline/operator CLI u master repozitorijumu; nema release-import HTTP/CI mutation endpointa. CI samo proizvodi i objavljuje immutable tarball + detached attestation evidence koje operator preuzima u ACL-zaštićen staging direktorijum. Implementirati:

    scripts/import-addon-release.ts
    scripts/publish-addon-release.ts

sa npm komandama:

    npm run release:import -- `
      --tarball <ABSOLUTE_PACKAGE_TGZ> `
      --attestation <ABSOLUTE_PUBLICATION_ATTESTATION_JSON> `
      --expected-tarball-sha256 <64_LOWERCASE_HEX> `
      --expected-attestation-sha256 <64_LOWERCASE_HEX> `
      --change-ref <AUDIT_TICKET_OR_LOCAL_E2E_RUN_ID>

    npm run release:publish -- `
      --release-id <UUID> `
      --expected-attestation-sha256 <64_LOWERCASE_HEX> `
      --change-ref <SAME_AUDIT_REFERENCE>

Ovo su PowerShell komande: backtick mora biti poslednji karakter reda, bez trailing razmaka. Za drugi shell koristiti jednu liniju ili njegovu native continuation sintaksu; literalni Bash `\` nije validan PowerShell continuation.

Oba input path-a moraju biti apsolutna, regularna, non-symlink/reparse fajla van repo/source/runtime release root-a, sa size limitom. Import pre DB write-a proverava CLI expected hash, tar listu/path safety, exact embedded manifest/provenance/SBOM i `release-dependency-lock.json` bytes, artifact inventory, potpisani dependency-lock hash/graph, detached JWS i registry evidence. Zatim otvara DB transakciju i advisory lock izveden iz canonical release UUID-a, ponavlja unique/hash provere i create-only upisuje `draft` + exact manifest/attestation/dependency-lock bytes. Isti release/svi isti hash-evi je idempotentan success; bilo koji postojeći identity sa drugim bytes/hashom je incident/conflict. CLI ne prihvata public key, package URL, status ili proizvoljan decoded JSON.

Import dodatno strict proverava svaki migration descriptor iz dokumenta 03, uključujući `postconditionSchemaFingerprintSha256`, stvarni packaged SQL checksum, rastuću schema verziju i bundle hash; create-only čuva exact descriptor/JCS bytes i finalni očekivani schema fingerprint uz release. Package 0.5.0 čiji deklarisani `0001` SQL nije u tarballu, stari 13-table fingerprint, descriptor bez postconditiona ili migration koji pokušava non-`webshop` schema/owner/role/grant nije publishable. Master ne izvršava SQL, ali ne sme izdati entitlement za release čiji canonical migration evidence nije potpuno verifikovan.

Publish je odvojena auditovana `draft -> published` transakcija pod istim advisory lock-om. Ponovo proverava stored hashes, current non-revoked signing keyset/policy, GitHub package identity i da nije nastao drift, zatim beleži izvršni OS/service identitet i obavezni `change-ref`; ne prihvata `publishedAt=now`. U productionu se CLI izvršava samo kroz protected master operator environment sa namenskom najmanje-privilegovanom DB ulogom i dual approvalom. Lokalni E2E može koristiti local operator ulogu, ali iste komande/lock/idempotency ugovor. CI token nema master DB/network write pristup.

Verifier učitava release public keyset samo iz `NRLS_ADDON_RELEASE_PUBLIC_KEYS_FILE`, proverava pinovani `NRLS_ADDON_RELEASE_PUBLIC_KEYS_SHA256`, schema/purpose i production KID allowlist-u. Ne koristi public key dostavljen u import body-ju. Pored embedded manifesta verifikuje detached publication attestation koji vezuje tarball integrity za isti release ID/manifest/artifact. Keyset provisioning i rotacija su definisani u dokumentima 02/03.

Minimalni zapis:

    releaseId=<STABLE_UUID_FROM_SIGNED_MANIFEST>
    addonKey=webshop
    packageName=@radomirradojevic/webshop
    packageVersion=<VERSION>
    manifestVersion=2
    artifactSha256=<SHA>
    dependencyLockSha256=<SHA>
    npmTarballSha256=<SHA>
    npmTarballIntegrity=<SHA512_SRI>
    embeddedManifestSha256=<SHA>
    provenanceSha256=<SHA>
    sbomSha256=<SHA>
    publicationAttestationHash=<SHA>
    registryPackageVersionId=<DECIMAL_STRING>
    releaseSigningKid=<KID>
    cmsVersionRange=<RANGE>
    nodeVersionRange=<RANGE>
    nextVersionRange=<RANGE>
    minimumCoreSchemaVersion=<INTEGER>
    runtimeContractVersion="1"
    schemaVersion=<VERSION>
    supportedAddonSchemaVersionMin=<INTEGER>
    supportedAddonSchemaVersionMax=<INTEGER>
    migrationBundleHash=<SHA>
    supportedLicenseEditions=[standard]
    channel=stable
    sourceReleasedAt=<SIGNED_MANIFEST_TIMESTAMP>
    publishedAt=<ATTESTED_REGISTRY_TIMESTAMP>
    status=published

Package compatibility `supportedLicenseEditions=[standard]` nije sama kupljena edition vrednost: licenca/SKU nosi `edition=standard`, a selector zahteva membership. Activation i revalidation response moraju referencirati taj immutable release. `updatesUntil` poredi se isključivo sa attested `publishedAt`, ne sa source/commit `sourceReleasedAt`. Posle filtera primenjuje se exact stable selector iz dokumenta 03: highest canonical SemVer, zatim `publishedAt DESC`, zatim `releaseId ASC`; implicitni downgrade pri revalidation-u je zabranjen.

Dozvoljen state machine je `draft -> published -> withdrawn`; ne koristiti `active` kao alternativnu DB status vrednost. `release:import` prvo durable upisuje verifikovan `draft`, a tek uspešan odvojeni `release:publish` sa kompletnom registry/attestation proverom i auditom čini ga eligible za activation.

Master takođe izlaže public, immutable evidence read `GET /.well-known/nr-addon-releases/<RELEASE_UUID>/publication-attestation.json` definisan u dokumentu 05. Body je exact stored attestation bytes, a ETag/content hash moraju biti jednaki `publicationAttestationHash`. Endpoint nikada ne generiše novi timestamp/potpis, ne prihvata package/version/query URL i ne prati external storage redirect; private signing key nije na serveru. Draft nije activation-eligible, ali imported historical evidence ostaje čitljiv, uključujući withdrawn release, radi verifikacije postojećeg runtime-a i incidenta.

## 10. Ručna vendor lifetime licenca

### GAP

Current manual generation action upisuje domain=null iako proizvod treba requiresDomain=true.

### TARGET

Proširiti manualLicenseKeySchema, admin formu i action sa:

    canonicalDomain

Pravila:

- ako productType.requiresDomain=true, domen je obavezan;
- koristi isti normalizeActivationDomain contract;
- prihvata hostname/host:port ili validan apsolutni HTTP(S) origin; origin sa userinfo, non-root putanjom, query-jem ili fragmentom odbija umesto tihog sanitizovanja;
- u bazi čuva samo canonical DNS hostname bez scheme-a i porta; produkcijska policy odbija IP/localhost/development hostname-e, a lokalni development eksplicitno dozvoljava `vendor.nr.test`;
- confirmation stranica prikazuje canonical rezultat pre generisanja;
- audit beleži domen, product type i SKU, ali ne key;
- license row čuva domain=vendor.nr.test.

Za ručnu licencu potreban je apiClientId zbog trenutne schema veze. Napraviti dedicated internal client:

    title = Master manual admin issuer
    environment = development
    allowedDomains = vendor.nr.test
    isGlobalService = false

Ne dodeljivati mu HMAC product scopes ako se ne koristi spolja.

Trenutna manual action bira najnoviji aktivni API client u environmentu. To je nestabilno i može pogrešno pripisati licencu vendor-commerce klijentu. Dodati eksplicitnu, trajnu vezu, na primer `manualIssuerApiClientId` FK u server/product-type konfiguraciji, i zahtevati da manual action koristi baš taj aktivni internal issuer. Zabraniti fallback „najnoviji po createdAt”. Internal issuer nema nužno spolja upotrebljiv HMAC secret; on je audit principal za administratorsko izdavanje.

MANUAL:

1. otvoriti Webshop product type;
2. izabrati webshop-1000000;
3. uneti vendor.nr.test;
4. generisati key;
5. kopirati ga samo u password manager/privremeni secure clipboard;
6. potvrditi da DB čuva hash/encrypted vrednost, ne plaintext;
7. koristiti ga jednom na vendor CMS aktivaciji.

## 11. Installation proof hardening

Pre activation E2E dodati:

- proveru da installationPublicKey zaista daje poslati sha256 fingerprint;
- signed V2 host-capability descriptor/hash i release selection prema CMS/Node/Next/runtime/core/addon-schema compatibility matrici;
- obavezni production HTTPS well-known domain-control dokaz za purchase, initial activation i transfer, uz explicit `.nr.test` development exception zapis;
- upis platformSubject iz challenge requesta;
- zabranu tihog reuse-a postojećeg CMS installation identiteta za drugi canonical domain ili deployment mode;
- cleanup job za istekle/iskorišćene challenges;
- revalidation koja poštuje vendor_addon_activations.status;
- authenticated deactivation `challenge|complete` sa purpose bytes, idempotentnim receipt-om i atomskim slot release-om;
- odvojen transfer `prepare|target_complete|source_challenge|source_complete` sa target domain/installation proof-om, source approval/installation proof-om i atomskim rebindingom;
- purpose-specific post-receipt-expiry `lifecycle-status challenge|complete` iz dokumenta 10: original installation PoP, short-lived `NRV-ADDON-LIFECYCLE-STATUS+JWT`, exact operation/action/request/result/lifecycle tuple i durable minimalni tombstone; generic entitlement revalidation nije zamena za ovaj recovery contract.
- lifecycle timing je eksplicitan master runtime contract: `NRLS_LIFECYCLE_RECEIPT_TTL_SECONDS=86400`, `NRLS_LIFECYCLE_RESULT_REPLAY_RETENTION_SECONDS=604800`, `NRLS_LIFECYCLE_ORIGINAL_COMPLETE_CUTOFF_SECONDS=86400` i `NRLS_LIFECYCLE_STATUS_JWS_TTL_SECONDS=300`, sa bounds/startup invariantima iz dokumenata 02/10 i obaveznim konkretnim `result_replay_until >= receipt.exp`.

Deactivation oslobađa activation slot, ali ne briše package ni Webshop podatke.

## 12. Nonce cleanup

Postoji:

    POST /api/internal/nonce-cleanup

Zaštita koristi NRLS_NONCE_CLEANUP_CRON_SECRET.

Konfigurisati lokalni scheduler ili ručno pozvati samo kroz autorizovan test. Dodati monitoring za:

- broj obrisanih nonce redova;
- broj rate-limit bucket redova;
- poslednji uspešan run;
- failure.

## 13. Master provisioning gate

Gate prolazi kada:

- admin bootstrap nad potpuno praznom bazom radi jednom i samo jednom;
- requiresDomain=true je vidljiv i sačuvan;
- četiri SKU-a imaju tačne duration vrednosti;
- vendor API client ima aktivan KID/secret version;
- scope UI prikazuje tačna ovlašćenja i development environment;
- Webshop V2 catalog sync vraća četiri SKU-a;
- Webshop V2 validate smoke kroz namenski builder za izdati key/domain vraća isti entitlement i `valid=true,status=active`; revoked/suspended/expired key vraća valid=false i ne otvara delivery. Pogrešan/unknown KID, client bez `validate` scope-a ili drugi environment pada pre prihvatanja evidence-a, a logs/database nemaju plaintext key/request body;
- pogrešan KID, secret, nonce replay i environment daju 401/403;
- release catalog sadrži production-signed Webshop release;
- ručna lifetime licenca je vezana za vendor.nr.test;
- aktivacija sa client.nr.test tim vendor key-em biva odbijena;
- deactivation, transfer i revalidation poštuju activation status; lifecycle-status post-expiry fixture razlikuje committed/not_committed/in_progress bez druge lifecycle mutacije ili unsafe cached-active povratka.
