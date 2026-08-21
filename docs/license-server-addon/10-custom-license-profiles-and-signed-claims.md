# 10 — Custom license profili i potpisani claims

## 1. Cilj funkcije

License Server add-on ne treba da bude samo generator nasumičnih ključeva. On
treba korisniku da omogući da definiše prava za sopstvenu aplikaciju, izda ih kao
kriptografski potpisan dokument i da njegova aplikacija ta prava pouzdano
proveri.

Primeri:

- desktop program otključava module `designer` i `exporter`;
- SaaS instalacija prihvata najviše 25 projekata i 5 članova;
- enterprise licenca je vezana za `organizationId` i dozvoljava production;
- maintenance licenca dopušta update-e objavljene do određenog datuma;
- beta kupac dobija `releaseChannel: beta`;
- white-label build dobija dozvoljeni brand ID i temu;
- server proizvod radi na dva production noda uz sedmodnevni offline grace.

Custom podatak je **entitlement claim**, ne proizvoljni storage i ne izvršivi
kod.

## 2. Terminologija

- **Product Type** — porodica aplikacije, stabilan audience, npr. Acme Studio.
- **License Profile** — prodajni/licencni plan, tehnički SKU, npr. Pro Annual.
- **Profile Revision** — immutable objavljena verzija profila.
- **Claim Schema Version** — tipovi, granice, obaveznost i klasifikacija custom
  polja.
- **Claim Input** — dozvoljeni podaci koje integrator šalje pri izdavanju.
- **Effective Claims** — rezultat profile default-a + dozvoljenih override-a +
  issuer-generated polja, validiran i snapshot-ovan.
- **Policy** — trajanje, aktivacije, online/offline i lifecycle pravila.
- **Assertion** — potpisani dokument koji aplikacija može da verifikuje.
- **Lease** — kratkoživi assertion posle online validacije/aktivacije.

## 3. Podržani tipovi custom polja

Početni bezbedni subset:

- `string` sa min/max length i opcionim enum/pattern-om ograničene složenosti;
- `integer` sa min/max;
- `number` samo kada je zaista potreban, bez NaN/Infinity;
- `boolean`;
- `enum` kao ograničeni string/integer skup;
- array dozvoljenog primitivnog tipa, sa max items i unique opcijom;
- object ograničene dubine, samo eksplicitna properties polja;
- RFC 3339 date-time kao formatiran string;
- stabilni reference/slug/domain format kao deklarativni format.

Zabranjeno:

- arbitrary binary/base64 blob;
- secret/password/private key/API token;
- executable script, expression ili template evaluation;
- recursive schema, remote `$ref` i neograničen `additionalProperties`;
- kompletan Webshop order/customer/payment JSON;
- funkcija koja pri svakoj validaciji pravi proizvoljan outbound HTTP poziv.

## 4. Klasifikacija i vidljivost

Svaki claim ima jednu klasu:

| Klasa               | Potpisani assertion | Customer prikaz/download     | Admin/audit       |
| ------------------- | ------------------- | ---------------------------- | ----------------- |
| `public_runtime`    | Da                  | Da                           | Da                |
| `customer_visible`  | Da                  | Da                           | Da                |
| `runtime_hidden_ui` | Da                  | Ne prikazuje se običnom UI-u | Da, uz permission |
| `internal_only`     | Ne                  | Ne                           | Ograničeno        |

`runtime_hidden_ui` nije tajna: svako ko poseduje assertion može dekodirati
payload. Za pravu tajnu koristiti drugi namenski secrets/provisioning sistem.

E-mail, telefon, adresa i payment podaci su `internal_only` po default-u i ne
ulaze u assertion. Subject koristi stabilan pseudonimizovan customer ref.

## 5. Izvor vrednosti i override policy

Claim definition određuje dozvoljeni source:

- `issuer_constant` — vrednost profila koju Webshop ne menja;
- `issuer_generated` — issuerRef, license ID, timestamps, profile revision;
- `webshop_product_constant` — pin-ovana vrednost proizvoda/varijante;
- `webshop_customer_ref` — pseudonimizovan stabilan ref;
- `webshop_organization_ref` — tenant/org iz autentifikovanog naloga;
- `webshop_confirmed_domain` — normalizovan domen uz eksplicitnu potvrdu;
- `webshop_quantity` — quantity mapiran na limit sa min/max;
- `webshop_validated_field` — unapred deklarisano checkout polje;
- `admin_issue_input` — samo pri ručnom izdavanju sa permission-om.

Za svako polje profile revision definiše:

- default vrednost;
- da li je override dozvoljen;
- dozvoljene source-ove;
- dodatni min/max/enum uži od schema-e;
- da li je obavezno;
- vidljivost;
- opcioni display label/help tekst.

Integrator ne može proširiti schema-u ili popustiti ograničenje. Uži profil je
dozvoljen; širi zahteva novu schema/profile reviziju.

## 6. Algoritam effective claims

1. Učitati tačno pin-ovanu objavljenu Profile Revision.
2. Proveriti issuer/client/product/environment scope.
3. Učitati pin-ovanu Claim Schema Version.
4. Početi od profile default-a.
5. Dodati issuer-generated vrednosti.
6. Za svaki claim input proveriti da je polje override-abilno iz datog source-a.
7. Normalizovati string/domain/date/reference prema dokumentovanom pravilu.
8. Odbiti nepoznata polja i prototype-pollution imena.
9. Validirati tipove, formate, granice, size i ukupnu dubinu.
10. Canonicalizovati efektivni JSON deterministički i izračunati claim hash.
11. Snapshot-ovati schema ID/version/hash, mapping/profile revision i claims u
    istoj transakciji sa licencom.
12. Potpisati assertion isključivo iz sačuvanog snapshot-a.

Retry istog issue operation-a ne sme ponovo računati claims na osnovu sada
izmenjenog Webshop proizvoda. Vraća originalni rezultat/snapshot.

## 7. Zanimljivi standardni claim paketi

Add-on može ponuditi wizard/template pakete; korisnik ih zatim prilagođava.

### 7.1 Edition i moduli

```json
{
  "edition": "pro",
  "modules": ["designer", "exporter", "collaboration"]
}
```

Za desktop/SaaS feature gating. Standardizovana feature lista ostaje pogodna za
jednostavan check, a claims nose strukturisani kontekst.

### 7.2 Kapacitet i kvote

```json
{
  "maxProjects": 100,
  "maxTeamMembers": 5,
  "maxStorageGiB": 50,
  "monthlyExports": 1000
}
```

Assertion daje kupljeni limit. License Server V1/V2 nije usage metering/billing
engine: aplikacija sama meri potrošnju. Budući signed usage grants mogu biti
poseban modul.

### 7.3 Environment i deployment

```json
{
  "environments": ["development", "staging", "production"],
  "maxProductionNodes": 2,
  "deploymentModel": "self_hosted"
}
```

Korisno za server proizvode i CI. Ne stavljati cloud credential u claim.

### 7.4 Version i maintenance window

```json
{
  "majorVersions": [3, 4],
  "updatesPublishedBefore": "2027-08-13T00:00:00Z",
  "releaseChannel": "stable"
}
```

Aplikacija/build metadata mora imati verifikovan publishedAt/version. Lokalni sat
sam po sebi nije autoritet za opoziv.

### 7.5 Organization/tenant binding

```json
{
  "organizationId": "org_42",
  "organizationName": "Example Company",
  "tenantMode": "single_tenant"
}
```

`organizationId` je stabilan opaque ref. Display name je customer-visible, ali
aplikacija ne treba da ga koristi kao security identitet.

### 7.6 Domain/server binding

```json
{
  "allowedDomains": ["example.com", "app.example.com"],
  "maxServers": 2
}
```

Issuer normalizuje IDNA/case/trailing dot. Wildcard pravila moraju biti
eksplicitna; `*.example.com` ne podrazumeva apex. Runtime aktivacija i claim
binding treba da budu usklađeni.

### 7.7 OEM/white-label prava

```json
{
  "brandId": "partner_blue",
  "customBranding": true,
  "redistribution": "internal_only"
}
```

Claim daje pravo, ali ne prenosi slike/fajlove/tajne. Brand assets se isporučuju
drugim kontrolisanim kanalom.

### 7.8 Data/region capability

```json
{
  "allowedRegions": ["eu-central", "eu-west"],
  "dataResidencyTier": "eu_only"
}
```

Ovo je aplikaciono pravo/config hint, ne automatska pravna garancija usklađenosti.

### 7.9 Trial i conversion lineage

```json
{
  "trialCampaign": "launch-2026",
  "conversionEligible": true,
  "previousLicenseRef": "lic_public_..."
}
```

Reference ne izlaže licencni ključ. Server sprečava neograničenu zloupotrebu
trial-a sopstvenim customer/device pravilima.

### 7.10 Entitlement bundle

```json
{
  "bundle": "creative-suite",
  "apps": ["studio", "renderer", "asset-manager"]
}
```

Za više aplikacija je bezbednije izdati audience-scoped assertions ili jasno
definisani multi-audience format, ne prihvatiti jedan token svuda bez provere.

## 8. Policy naspram custom claim-a

Sistemski policy ostaje first-class, jer server mora da ga izvrši:

- status i expiry;
- device/domain/seat/server activation limit;
- validation interval/offline grace;
- suspend/revoke/refund/chargeback;
- signing/audience/environment.

Custom claim je podatak koji prvenstveno izvršava korisnikova aplikacija. Npr.
`maxProjects` ne treba staviti u `maxSeats`; različite semantike ostaju odvojene.

## 9. Signed assertion V2

As-built format je compact JWS/JWT kompatibilan. Header ima **tačno** tri polja:
`alg: "EdDSA"`, `kid` i `typ: "NRC-CUSTOMER-LICENSE+JWT"`. Dodatna header
polja, uključujući token-provided `jwk`, `jku` ili `x5u`, odbijaju se. Verifier
koristi isključivo keyset koji mu prosledi aplikacija uz eksplicitno očekivane
`iss` i `aud` vrednosti.

Payload V2 ima tačno sledeća polja:

- `v: 2`, `iss`, `aud`, pseudonimizovani `sub`, `jti`, `iat`, `nbf`, `exp`;
- `license: { id, type, snapshotHash }`;
- `profile: { sku, revision, hash }`;
- `schema: { id, version, hash } | null`;
- `policy: { hash, features, limits: { devices, domains, seats },
validationIntervalSeconds, offlineGraceSeconds }`;
- `claims`, iz kojih je `internal_only` fail-closed projekcijom isključen;
- `business: { status, notBefore, licenseValidUntil,
maintenanceValidUntil, graceEndsAt }`;
- `receipt: { id } | null` i `activation: { id } | null`.

Assertion se potpisuje Ed25519 customer issuer ključem isključivo iz DB reda
licence i njegovih immutable profile/schema/policy/claims snapshot-a. Hash-evi se
ponovo računaju pre potpisa; mismatch ili nedostajuća klasifikacija završavaju
kontrolisanom greškom, ne novim tumačenjem. Issue assertion i receipt nastaju u
istoj transakciji. Activation/validate lease je vezan za stvarni activation ID.
Maksimalni assertion TTL je 3.600 sekundi, podrazumevani clock skew 60 sekundi,
a business validity se proverava zasebno od kratkog `exp`.

Javni verification metadata endpoint-i su:

- `GET /api/license-server/v2/issuer` — descriptor sa nepromenljivim
  `issuerRef`, `issuer`, environment/API verzijama, statusom
  `active|recovery_required`, `keysetUrl` i `keysetRevision`; descriptor ne bira
  ključ iz assertion-a;
- `GET /api/license-server/v2/keys` — verification-only Ed25519 JWK Set (`OKP`,
  `Ed25519`, bez privatnog materijala).

Oba vraćaju `ETag`, public `Cache-Control`, `304` za odgovarajući
`If-None-Match` i `nosniff`. Normalna rotacija ne menja `issuerRef`: prethodni
ključ ostaje `verification_only` do isteka maksimalnog assertion TTL-a plus oba
clock-skew prozora, pa se više ne objavljuje. Ako aktivni privatni ključ ne može
da se dešifruje/proveri, issuer prelazi u `recovery_required`; sistem ne generiše
tiho novi issuer ili ključ.

Paket izvozi CMS-nezavisni TypeScript/JavaScript verifier preko
`@radomirradojevic/license-server-addon/verifier`. Pored sinhronog verifier-a sa eksplicitnim
keyset-om, export sadrži pinned issuer klijent sa bounded ETag/cache ponašanjem,
deduplikovanim refresh-om i tačno jednim refresh pokušajem za nepoznat `kid`.
Jezički neutralni assertion vektori su u
`@radomirradojevic/license-server-addon/test-vectors/customer-license-assertion-v2`, a javni
issuer/runtime/file/feature/quota/organization primeri u
`@radomirradojevic/license-server-addon/test-vectors/customer-license-consumer-v2`. Kopirljiv
modul je `@radomirradojevic/license-server-addon/examples/typescript-consumer`.

Vektori pokrivaju valid, tampered, expired, not-yet-valid, pogrešan issuer/
audience/version/typ/alg, nepoznat `kid`, normalnu rotaciju i malformed token.
Legacy V1 ostaje eksplicitno `v: 1` sa
`typ: NRC-CUSTOMER-LICENSE-V1+JWT`; V2 verifier ga odbija i nema silent
reinterpretacije.

Za download se koristi `.nrls.json` envelope:

```json
{
  "format": "nrls-license-file",
  "version": 1,
  "issuer": "urn:nrc:customer:cms-a1b2c3d4",
  "assertion": "eyJ...",
  "keysetHint": "https://licenses.example.com/api/license-server/v2/keys"
}
```

`keysetHint` nije trust anchor; aplikacija mora imati/pin-ovati očekivani issuer i
dozvoljeni HTTPS origin iz sopstvene konfiguracije. Envelope parser zahteva
tačno prikazana polja; envelope ne može da unese dodatni trusted key.

## 10. Offline, online i hibridni režim

### Online-only

Kratak validation interval i bez offline grace-a. Najbrže vidi revoke, ali zavisi
od dostupnosti mreže.

### Offline-periodic

Aplikacija dobija signed lease do `offlineGraceEndsAt`, periodično ga osvežava.
Najbolji opšti default za desktop/server proizvode.

As-built runtime odluka koristi maksimalni assertion TTL od 3600 sekundi i
default clock skew od 60 sekundi. Uspešan online validate daje novi lease.
Eksplicitni online reject uvek pobeđuje cache. Samo kada je issuer nedostupan,
već potpisani lease može nastaviti do policy `offlineGraceSeconds` granice,
nikad posle business expiry-ja; po isteku grace-a odluka je deny.

### Offline-file

Dugovečni assertion/file bez redovne mreže. Opoziv pre isteka nije pouzdano
moguć; UI mora jasno prikazati taj tradeoff. Za high-value licencu preporučiti
kraći lease ili ručni signed revocation/update paket.

### Air-gapped challenge/response — buduća opcija

Aplikacija izvozi challenge sa fingerprint/audience/nonce, administrator na
License Server-u generiše kratkoživi signed activation response, aplikacija ga
uvozi. Zahteva poseban replay i clock model; nije deo početnog V2 MVP-a.

## 11. Admin UX

Wizard treba da omogući:

1. izbor gotovog template-a ili prazne schema-e;
2. dodavanje polja sa tipom, klasom, default-om i override source-om;
3. live validaciju i prikaz maksimalne veličine;
4. profile policy + claim defaults;
5. preview effective claims za primer Webshop input-a;
6. preview dekodiranog assertion-a i copy/download test vector-a;
7. publish sa diff-om i potvrdom immutable revizije;
8. deprecate bez brisanja istorije;
9. „Test verifier” koji proverava potpis/audience/time i objašnjava reason code;
10. export/import template-a bez ključeva/tajni.

## 12. Buduće opcije posle V2

- signed delegated seat leases za povremeno povezane klijente;
- webhook lifecycle događaji sa potpisom i delivery logom;
- SDK/verifier paketi za .NET, Java/Kotlin, Swift i Rust;
- claim template marketplace/import uz strogu validaciju;
- licence bundle sa audience-scoped pod-assertion-ima;
- signed usage grants/counter leases, odvojeno od billing-a;
- air-gapped challenge/response;
- organization administrators sa ograničenim self-service seat/device resetom.

Ove funkcije se ne dodaju pre stabilnog V2 issue/receipt/assertion osnova.
