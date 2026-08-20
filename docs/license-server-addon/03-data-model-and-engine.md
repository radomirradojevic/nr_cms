# 03 — Model podataka i issuer engine

## 1. Princip vlasništva

License Server add-on je kanonski vlasnik svojih domenskih podataka. CMS pruža
Drizzle/PostgreSQL migration runner i transakcioni host servis. Ciljno stanje je
da verzionisane migracije putuju u potpisanom add-on paketu.

Dok je tranzicija u toku, postojeće tabele u root CMS schema-i ostaju
kompatibilne; ne smeju se duplirati ili obrisati bez eksplicitne data migracije.

As-built od Prompt-a 02: package isporučuje
`0001_license_server_customer_issuer_baseline.sql` za empty-install ili exact
legacy adoption i `0002_customer_issuer_v2_models.sql` za pet novih aditivnih
modela. Manifest, checksumovi, svi objekti i ownership granica zabeleženi su u
[`13-prompt-02-migration-evidence.md`](./13-prompt-02-migration-evidence.md).
Root schema ostaje privremeno compatibility ogledalo, ali nove domenske migracije
pripadaju add-on paketu.

As-built do Prompt-a 05: manifest je monotono proširen na schema version 4.
`0003_product_profiles_and_claim_schemas.sql` poseduje Profile/Claim modele, a
`0004_durable_operation_engine.sql` aditivno proširuje postojeće operation i
receipt tabele javnim ref-ovima, source/API-client scope-om, environment-om,
dead-letter vremenom i reveal stanjem. Nema paralelne operation tabele niti
destruktivnog down-a. Dokazi su u
[`15-prompt-04-profile-claims-evidence.md`](./15-prompt-04-profile-claims-evidence.md)
i [`16-prompt-05-operation-engine-evidence.md`](./16-prompt-05-operation-engine-evidence.md).

Svaka promena schema-e mora imati:

- monotoni migration ID i checksum;
- minimalnu kompatibilnu CMS/add-on verziju;
- upgrade test nad praznom i realističnom prethodnom bazom;
- forward-fix strategiju; rollback aplikacije ne sme pretpostaviti da sme
  destruktivno vratiti bazu;
- backup/restore dokaz pre produkcije.

## 2. Postojeći entiteti — POSTOJI

Trenutni root schema već sadrži sledeće porodice tabela:

- `license_server_product_types`;
- `license_server_product_type_skus`;
- `license_server_licenses`;
- `license_server_license_activations`;
- `license_server_api_clients` i nonce zapise;
- customer issuer identity, keys i client scopes;
- customer issuer issue outbox;
- audit i validation events;
- persistent security rate-limit buckets.

Njih treba migrirati/evoluirati, ne paralelno iznova izmisliti.

## 3. Ciljni agregati

### 3.1 IssuerIdentity

Jedan aktivan customer issuer po single-tenant CMS instalaciji:

- `issuerRef` — stabilan javni identifikator, nikad installation secret;
- `activeSigningKid` i `keysetRevision`;
- `status` — active, recovery_required, signing_disabled;
- `createdAt`, `updatedAt`;
- javni keyset cache snapshot.

`issuerRef` se čuva pri restore-u. Novi issuer se ne generiše automatski preko
postojećeg različitog identiteta.

### 3.2 IssuerSigningKey

- `kid`, algoritam (`Ed25519`/`EdDSA`);
- šifrovan PKCS#8 privatni ključ;
- SPKI/JWK javni ključ;
- `active`, `verification_only`, `compromised`, `retired`;
- signing/verification početak i kraj;
- key wrapping/encryption key version.

Samo jedan ključ sme biti `active` za potpisivanje. Stari javni ključ ostaje u
keyset-u bar do isteka svih assertion-a koje je mogao da potpiše plus cache
overlap.

### 3.3 ProductType

Predstavlja porodicu aplikacije/proizvoda, npr. `acme-desktop`:

- stabilni ID i `externalRef`/slug;
- naziv, opis i status draft/active/archived;
- podrazumevani `audience`/application ID;
- metadata samo za issuer administraciju;
- latest published catalog revision.

Product Type nije Webshop proizvod. Više Webshop proizvoda/varijanti može
mapirati na različite profile istog Product Type-a.

### 3.4 LicenseProfile i ProfileRevision

Postojeći SKU se u UI-u predstavlja kao **License Profile**, a `sku` ostaje
stabilni integracioni identifikator. Objavljena revizija sadrži:

- license type i policy template;
- duration/expiry/maintenance pravila;
- max devices/domains/seats i reset pravila;
- validation interval i offline grace;
- features i strukturisane limits;
- audience i dozvoljene environment-e;
- key namespace;
- pin-ovan `claimSchemaVersionId`;
- default custom claims i override policy;
- `policyHash`, revision, publishedAt.

Objavljena revizija je immutable. Edit kreira draft nove revizije. Licenca čuva
snapshot, pa kasnija promena profila ne menja već prodata prava.

### 3.5 ClaimSchema i ClaimSchemaVersion

Detaljan ugovor je u dokumentu 10. Minimalna polja:

- schema ID, Product Type ID, semantic version i integer revision;
- status draft/published/deprecated;
- dozvoljeni JSON Schema subset;
- canonical schema JSON i SHA-256 hash;
- maksimalna veličina/depth/broj polja;
- classification po claim-u: public, customer_visible, internal_only;
- dozvoljeni override source-ovi;
- created/published by i timestamps.

Objavljena schema verzija je immutable i ne može se obrisati dok je referencira
profil ili licenca.

### 3.6 ApiClient i ApiClientScope

- javni client ID;
- samo hash/encrypted oblik secret-a;
- status, environment, allowed origins/IP policy po potrebi;
- scopes: catalog.read, license.issue, operation.read, lifecycle.write,
  license.validate;
- ograničenje na Product Type/Profile;
- rotation overlap i revokedAt;
- nonce/replay prozor i poslednja upotreba.

Browser/runtime aplikacija nikad ne dobija ovaj client secret.

### 3.7 IssueOperation

Jedinstvena durable komanda nezavisno od transporta:

- `operationId`, `operationKey`, source connection/ref;
- order/orderItem/external customer reference;
- Product Type, Profile i revision;
- canonical validated claim input i hash;
- status/attempt/lease/retry/dead-letter polja;
- rezultat `licenseId`, receipt ID i sanitizovan error code;
- correlation ID i timestamps.

Unique indeks je najmanje `(issuerRef, sourceClientRef, operationKey)`.
Payload sa istim ključem ali drugim hash-om mora vratiti
`idempotency_conflict`, ne stari rezultat i ne novu licencu.

**POSTOJI od Prompt-a 05:** `src/data/operations.ts` je jedini application
service koji upisuje novu customer licencu. Issue i lifecycle koriste isti
operation/receipt status jezik, canonical payload hash, source ownership,
bounded `FOR UPDATE SKIP LOCKED` claim, DB lease, retry/dead-letter i audit.
Issue transakcija pin-uje immutable Profile/Schema/Policy/Claim snapshot i od
Prompt-a 06 atomarno završava licencu, snapshot-proveren V2 assertion, receipt,
audit i operation. Aktivacija i refresh dobijaju kratkoživi assertion vezan za
stvarni activation ID. Postojeći V1 potpis ostaje eksplicitno versioned adapter
preko ovog jezgra; legacy outbox tabela ostaje samo kompatibilni ulaz. Javni
local/remote V2 issue adapteri još nisu izloženi u ovom koraku.

### 3.8 License

- stabilni UUID i bezbedan javni reference;
- key namespace, hash i opcioni šifrovani reveal secret;
- customer external ref; e-mail je opcioni PII i nije subject assertion-a;
- Product Type/Profile/revision;
- source order/order item/source system;
- issuedAt/notBefore/expiresAt/maintenanceExpiresAt/graceEndsAt;
- status i reason timestamps;
- immutable policy snapshot, custom claim snapshot, schema hash i policy hash;
- trenutno signing `kid` za izdati dokument, kada postoji;
- assertion/certificate digest, ne obavezno plaintext kopija.

Plaintext ključ sme postojati samo koliko je potrebno za kontrolisanu isporuku.
Ako je potreban ponovni reveal, čuva se envelope-encrypted, sa auditovanim
pristupom i rotacijom data-encryption ključa.

### 3.9 Activation

- license ID, type device/server/domain/seat;
- normalizovana javna oznaka i hashovan fingerprint;
- activation token hash;
- status active/deactivated/reset/revoked;
- first/last seen i validation interval;
- signed lease ID/expiry;
- metadata strogo ograničena, bez sirovog hardware inventara.

Limit se proverava atomarno zaključavanjem licence/agregata. Konkurentni zahtevi
ne smeju preći max limit.

### 3.10 AuditEvent i ValidationEvent

Audit beleži ko/šta/kada i sanitized metadata za:

- profile/schema publish;
- issue/lifecycle/reveal;
- activation reset;
- API client/key rotaciju;
- backup/export/restore;
- permission i security događaje.

Validation događaji su high-volume i imaju zaseban retention/aggregation režim.
Licencni ključ, secret, privatni ključ, puna adresa i nepotreban PII se ne loguju.

## 4. Webshop-side model konekcije — CILJ

Webshop poseduje `LicenseServerConnection`:

- `id`, display name;
- `transport`: `local_addon` ili `remote_nrls_v2`;
- `baseUrl` samo za remote;
- `clientId` i envelope-encrypted secret samo za remote;
- očekivani/pin-ovani `issuerRef`;
- environment, status i scopes;
- catalog ETag/revision/lastSyncAt;
- health/error kodovi bez secret-a.

Webshop product/variant snapshot čuva connection ID, issuerRef, Product Type,
Profile, profile revision, mapping revision i način delivery-ja. Promena aktivne
konekcije ne sme retroaktivno promeniti postojeće order item-e.

## 5. Transakcioni invarianti

1. Isti validan issue operation daje jednu licencu i isti receipt.
2. Isti operation key sa drugačijim payload hash-om je konflikt.
3. Objavljene profile/schema revizije i izdati snapshot-i su immutable.
4. Aktivacioni limit se ne može probiti konkurentnim zahtevima.
5. Status `revoked/refunded/chargeback` ne može biti slučajno vraćen u active;
   potrebna je eksplicitna, privilegovana komanda sa audit razlogom.
6. Webshop označava fulfillment uspešnim tek kada primi trajni receipt.
7. Outbox claim koristi lease + `SKIP LOCKED`/ekvivalent i bounded retry.
8. Dead-letter se ne briše automatski; administrator može retry nakon ispravke.
9. Signing i encryption key rotacija su odvojene operacije.
10. Master entitlement gubitak ne briše customer licence ili ključeve.

## 6. Veličine i validacija

Preporučene početne granice:

- request body 16 KiB za runtime, 64 KiB za admin schema/profile operacije;
- najviše 64 custom claim polja, dubina 5, canonical payload 16 KiB;
- string 1 KiB, array 100 elemenata, bez binary/base64 blob-ova;
- metadata/claims moraju proći allowlist i schema validaciju;
- svi datumi su UTC RFC 3339; svi finansijski podaci ostaju u Webshop-u;
- domeni su normalizovani IDNA/lowercase bez scheme/path dela;
- operation key je nepredvidiv ili namespaced i maksimalno 128 znakova.

Granice moraju biti konfigurabilne samo unutar sigurnog server-side maksimuma.

## 7. Retention i brisanje

- izdati license/policy/claim snapshot čuva se koliko zahtevaju ugovor i audit;
- validation events mogu se agregirati i skratiti pre business audit-a;
- customer PII se minimizuje i može pseudonimizovati bez uništenja licence;
- key history se čuva dok može validirati važeći dokument;
- uninstall je `retain_by_default`; destruktivni purge je posebna potvrđena radnja;
- backup mora obuhvatiti bazu, issuer identitet, šifrovane signing ključeve i
  verziju wrapping ključa.
