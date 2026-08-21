# 04 — API i capability ugovor

## 1. Verzije i status

- **V1 / POSTOJI:** rute navedene u dokumentu 01. Održavaju se bez breaking
  izmene tokom migracije.
- **HTTP V2 / POSTOJI:** udaljeni ugovor ispod radi nad durable application
  servisom. Pokriva discovery, katalog, issue/status/lifecycle i runtime rute.
- **Local capability V1 / POSTOJI:** enqueue-only ugovor.
- **Local capability V2 / POSTOJI:** semantički isti rezultat kao HTTP V2, bez
  mrežne autentikacije ili HMAC secret-a u capability pozivu.

As-built od Promptova 07/08: zaseban V2 router izlaže javni discovery/runtime i
scope-ovani HTTP/HMAC katalog, issue/status/lifecycle adapter, a release izlaže i
`customerLicenseIssuer.v2` nad istim durable application servisom. V1 router,
response shape i capability potpis nisu promenjeni. V1 enqueue pravi istu V2
operaciju, koju kompatibilni Webshop dalje proverava kroz V2 status API; nema
tihog V1, Master ili mrežnog fallback-a.

V2 endpoint root za udaljenu instalaciju:

```text
https://licenses.example.com/api/license-server/v2
```

Centralni Master `/api/v1/entitlements` nije deo ovog ugovora.

## 2. Zajednička pravila

- `Content-Type: application/json`;
- UTF-8, UTC RFC 3339 datumi;
- request i response imaju `contractVersion: "2"` gde telo postoji;
- svaki odgovor nosi `X-NRLS-Request-Id`, validirani/novi
  `X-NRLS-Correlation-Id`, `X-NRLS-Contract-Version: 2` i
  `X-NRLS-Supported-Versions: 1, 2`;
- mutacije zahtevaju `Idempotency-Key`;
- tajne i puni licencni ključ se nikad ne pojavljuju u error-u ili logu;
- nepoznata polja se odbijaju za security-sensitive komande;
- endpoint vraća strukturisani error, ne HTML i ne redirect.

Error envelope:

```json
{
  "contractVersion": "2",
  "error": {
    "code": "profile_revision_mismatch",
    "message": "The selected license profile changed. Refresh the catalog.",
    "retryable": false,
    "requestId": "req_...",
    "details": {}
  }
}
```

`message` je bezbedan za administratora; aplikacija odlučuje na osnovu stabilnog
`code`, ne teksta.

## 3. Autentikacioni profili

### 3.1 Public

Bez HMAC-a:

- health sa minimalnim podacima;
- issuer identitet i javni keyset;
- runtime activation/validation uz licencni/activation credential.

Rate limit se primenjuje pre skupe kriptografije i DB rada.

### 3.2 Integrator HMAC

Webshop remote konekcija šalje:

```text
Authorization: NRLS-HMAC-SHA256 Credential=<clientId>,Signature=<base64url>
X-NRLS-Timestamp: <unix-seconds>
X-NRLS-Nonce: <random-128-bit-base64url>
Idempotency-Key: <namespaced-operation-key>   # za mutacije
```

V2 canonical string:

```text
NRLS2
<UPPERCASE_METHOD>
<normalized_path_and_sorted_query>
<timestamp>
<nonce>
<lowercase_sha256_hex_of_exact_body_bytes>
```

Server proverava:

- TLS i dozvoljeni host/proxy kontekst;
- timestamp u konfigurisanom kratkom prozoru;
- nonce uniqueness u persistent bazi;
- timing-safe potpis;
- client status, environment, action i product/profile scope;
- request size pre JSON parse-a.

Timestamp prozor je tačno 300 sekundi; nonce je kanonski 128-bit base64url i
upisuje se u persistent unique ledger tek posle ispravnog potpisa. Secret se
prikazuje samo jednom pri kreiranju/rotaciji. Prethodni secret ima tačno 900
sekundi verification overlap-a; rotacija je optimistic-lockovana i auditovana
bez tajnog materijala. Različit DB failure se ne predstavlja kao nonce replay.

### 3.3 Runtime aplikacija

Aplikacija šalje licencni ključ samo prilikom aktivacije ili kontrolisanog
recovery-ja. Posle toga koristi random activation token. Baza čuva hash tokena.
Public client nikad ne dobija HMAC issue secret.

## 4. Discovery i katalog

### `GET /health`

Public, bez business podataka:

```json
{
  "contractVersion": "2",
  "service": "nr-license-server",
  "status": "ok",
  "apiVersions": ["1", "2"]
}
```

Ne otkriva broj licenci, e-mailove, build secret ili stack trace.

### `GET /issuer`

Public:

```json
{
  "contractVersion": "2",
  "apiVersions": ["1", "2"],
  "issuerRef": "cms-a1b2c3d4",
  "issuer": "urn:nrc:customer:cms-a1b2c3d4",
  "environment": "production",
  "keysetUrl": "/api/license-server/v2/keys",
  "keysetRevision": 4,
  "assertionTypes": ["NRC-CUSTOMER-LICENSE+JWT"],
  "algorithms": ["EdDSA"],
  "status": "active"
}
```

Webshop pri povezivanju pin-uje potvrđeni `issuerRef`. Promena bez eksplicitne
administratorske potvrde je security greška.

### `GET /keys`

Public JWK Set sa `Cache-Control` i `ETag`. Sadrži samo aktivne i još važeće
verification-only javne ključeve. Privatni ili šifrovani materijal nikad ne
napušta issuer.

### `GET /catalog`

Zahteva `catalog.read`. Podržava `If-None-Match` i vraća:

- issuerRef, environment, catalog revision i ETag;
- aktivne Product Type-ove;
- objavljene Profile ID/SKU/revision;
- audience, trajanje, features/limits, delivery/assertion sposobnosti;
- claim schema ID/version/hash;
- dozvoljena Webshop mapiranja bez internih default tajni;
- compatibility/deprecation podatke.

Webshop ne sme koristiti draft/archived profil. Order item pin-uje izabranu
reviziju iz kataloga.

## 5. Issue operacije

### `POST /operations/issues`

Zahteva `license.issue` i `Idempotency-Key`.

```json
{
  "contractVersion": "2",
  "productTypeRef": "acme-desktop",
  "profile": { "sku": "desktop-pro", "revision": 7 },
  "customer": {
    "externalRef": "cus_9ca...",
    "displayName": "Example Company"
  },
  "source": {
    "system": "webshop",
    "orderRef": "WEB-1008",
    "orderItemRef": "item_..."
  },
  "claimInput": {
    "organizationId": "org_42",
    "edition": "pro",
    "maxProjects": 25
  }
}
```

E-mail je opcioni kontakt podatak i ne postaje assertion subject po default-u.
`claimInput` se prihvata samo prema objavljenoj schema-i i override pravilima.

Odgovor `202 Accepted`:

```json
{
  "contractVersion": "2",
  "operation": {
    "id": "op_...",
    "status": "pending",
    "pollAfterMs": 1000
  }
}
```

Putanja status endpoint-a je HTTP adapter detalj izveden iz `operation.id`; nije
deo kanonskog local/remote operation modela.

Ako je sinhrono završeno, server može vratiti `200` sa `status: "succeeded"` i
istim receipt formatom kao status endpoint. Retry istog ključa i istog payload
hash-a vraća istu operaciju. Drugi payload vraća `409 idempotency_conflict`.

### `GET /operations/{operationId}`

Zahteva `operation.read` i ownership/scope proveru.

Uspešan rezultat:

```json
{
  "contractVersion": "2",
  "operation": {
    "id": "op_...",
    "status": "succeeded",
    "receipt": {
      "id": "rcpt_...",
      "licenseId": "lic_...",
      "licenseKey": "NRLS-...",
      "licenseKeyMasked": "NRLS-****-7K2P",
      "assertion": "eyJ...",
      "issuerRef": "cms-a1b2c3d4",
      "profile": { "sku": "desktop-pro", "revision": 7 },
      "issuedAt": "2026-08-13T10:00:00Z",
      "expiresAt": null,
      "claimSchema": {
        "id": "studio-claims",
        "version": "2.0.0",
        "hash": "sha256:..."
      }
    }
  }
}
```

Plaintext `licenseKey` je reveal-once podatak. Server mora označiti/ograničiti
ponovni reveal ili koristiti envelope-encrypted receipt. Webshop ga odmah
prebacuje u secure digital delivery skladište.

Terminalne greške imaju `failed`; iscrpljeni privremeni pokušaji `dead_letter`.
Interni stack/SQL/provider odgovor nije deo javnog error-a.

## 6. Lifecycle operacije

### `POST /operations/lifecycle`

Zahteva `lifecycle.write` i idempotency key:

```json
{
  "contractVersion": "2",
  "licenseRef": { "sourceOrderItemRef": "item_..." },
  "action": "revoke",
  "reason": "refund",
  "effectiveAt": "2026-08-13T12:00:00Z",
  "newExpiresAt": null
}
```

Dozvoljene akcije po permission-u: `renew`, `suspend`, `resume`, `revoke`,
`refund`, `chargeback`. `resume` nakon revoked/refunded/chargeback nije obična
akcija; zahteva poseban privileged recovery tok.

Lifecycle koristi isti operation status ugovor i mora naći tačno jednu licencu
u scope-u pozivaoca.

As-built V2 nema recovery endpoint: terminalni `revoked`, `refunded` i
`chargeback` odbijaju renew/resume/suspend i prelazak u drugi terminalni status.
Ista terminalna akcija sa novim idempotency key-em je bezbedan no-op; isti ključ
sa drugačijim payload-om je idempotency conflict. `renew` mora povećati expiry i
ne resume-uje suspendovanu licencu.

## 7. Runtime endpoint-i

### `POST /licenses/activate`

Tačan ulaz ima `contractVersion`, `licenseKey`, `audience`, `activationType` i
`clientRequestId`, uz opcione `appId`, `appVersion`, `deviceFingerprint`,
`deviceLabel`, `domain`, `platform` i `seatId`. Ne postoji ugnježdeno
`activation` request polje. Izlaz:

- activation ID i reveal-once activation token;
- signed kratkoživi lease/assertion;
- `customClaims`, `features`, `limits`, `licenseId`, business `status` i expiry;
- `nextValidationAt` i `offlineGraceEndsAt`.

Tačan response envelope je:

```json
{
  "activation": { "id": "act_...", "token": "reveal-once-token" },
  "assertion": "eyJ...",
  "assertionExpiresAt": "2026-08-13T11:00:00.000Z",
  "contractVersion": "2",
  "customClaims": { "organizationId": "org_42" },
  "expiresAt": "2027-08-13T10:00:00.000Z",
  "features": ["reports"],
  "licenseId": "lic_...",
  "limits": { "devices": 2, "domains": null, "seats": null },
  "nextValidationAt": "2026-08-14T10:00:00.000Z",
  "offlineGraceEndsAt": "2026-08-20T10:00:00.000Z",
  "serverTime": "2026-08-13T10:00:00.000Z",
  "status": "active"
}
```

Generički javni error ne otkriva da li konkretan ključ postoji pre nego što se
primeni odgovarajući abuse control.

### `POST /licenses/validate`

Ulaz ima `contractVersion`, `activationId`, `activationToken` i `audience`, uz
opcione `currentAssertionId`, `appVersion`, `deviceFingerprint`, `domain` i
`seatId`. Izlaz:

- `valid: true/false`;
- `reason: null` kada je validno ili stabilni `license_not_valid` kada nije;
- status, server time, next validation/grace;
- novi signed lease kada je validno;
- effective features/limits/custom claims.

### `POST /licenses/deactivate`

Idempotentno deaktivira samo aktivaciju koju token autorizuje. Ne opoziva celu
licencu.

## 8. Local capability V2

Javni SDK izlaže sledeći ugovor bez privatnih tipova add-on-a:

```ts
type CustomerLicenseIssuerV2 = {
  contractVersion: "2";
  describe(): Promise<IssuerDescriptorV2>;
  catalog(input: CatalogRequestV2): Promise<CatalogResultV2>;
  enqueueIssue(input: IssueCommandV2): Promise<OperationResultV2>;
  getOperation(input: OperationQueryV2): Promise<OperationResultV2>;
  enqueueLifecycle(input: LifecycleCommandV2): Promise<OperationResultV2>;
};
```

Local poziv koristi host-autorizovan source identitet `addon:webshop`, runtime
license environment i prosleđeni order/correlation kontekst; ne prihvata
Webshop-simulirani admin identitet i ne prima HMAC secret. Business payload,
idempotency, validation, operation i receipt semantika isti su kao HTTP V2.
`idempotencyKey` je u kanonskoj SDK komandi; remote adapter ga mapira na
`Idempotency-Key` header. HMAC, HTTP status i endpoint URL nisu deo business
tipova. Adapter menja transport, ne rezultat.

Root add-on contract koristi opciono polje `customerLicenseIssuerV2`. Raw loader
vraća `available` ili `unavailable` sa razlogom `addon_not_installed`,
`addon_invalid` ili `v2_not_exported`. Entitlement-aware resolver vraća
`addon_not_ready` i tačan add-on state za disabled/install pending/license
required/platform stanje; istekla licenca je `edit_existing_only`. V2 poziv
nikada tiho ne pada nazad na V1.

### 8.1 Scheduler job ugovor

`@nr-cms/addon-sdk/customer-license-issuer-jobs` definiše versioned JSON job
`customerLicenseIssuerOperations` sa `correlationId`, opcionalnim `deadlineAt`,
bounded `limit` i trigger vrstom. Rezultat sadrži stabilni `runId`, batch brojače
i `leaseStatus: acquired | held | deadline_exceeded`. Paket poseduje DB singleton
lease, a svaki issue/lifecycle posao i dalje koristi sopstveni operation lease i
`SKIP LOCKED` batch. Deprecated `customerLicenseIssuerOutbox({ limit })` ostaje
privremeni V1 wrapper nad istim scheduler-om.

## 9. Status kodovi

- `200` čitanje ili završena idempotentna komanda;
- `202` operacija prihvaćena;
- `304` nepromenjen katalog/keyset;
- `400` schema/format;
- `401` nedostaje/nevažeća autentikacija;
- `403` validan identitet bez scope-a ili add-on nije u `ready` modu;
- `404` resurs nije vidljiv pozivaocu;
- `409` idempotency/revision/state konflikt;
- `413` payload prevelik;
- `422` poslovno nevažeći claim/policy/binding;
- `429` rate limit;
- `503` privremeno nedostupan issuer/job/dependency.

## 10. Mašinski proverljiv ugovor

OpenAPI 3.1 dokument se generiše iz istih strogih Zod request i response schema-a
za health, issuer, keyset, catalog, operation i runtime tokove. Dostupan je kao
`GET /api/license-server/v2/openapi.json`, ulazi u release artifact inventory i
paket ga izvozi kao `@radomirradojevic/license-server-addon/openapi-v2`. Javni error-i svuda
referenciraju isti `ErrorEnvelope`.

Language-neutral export-i su:

- `@radomirradojevic/license-server-addon/test-vectors/nrls2-hmac-v2` — integrator HMAC;
- `@radomirradojevic/license-server-addon/test-vectors/customer-license-assertion-v2` — strogi
  potpis/time/rotation vektori;
- `@radomirradojevic/license-server-addon/test-vectors/customer-license-consumer-v2` — issuer,
  keyset, activation, validate, file, feature, quota i organization primeri;
- `@radomirradojevic/license-server-addon/verifier` — dependency-free sync i pinned/cache klijent;
- `@radomirradojevic/license-server-addon/examples/typescript-consumer` — kopirljiv consumer
  modul koji koristi samo javne endpoint-e.

## 11. V1 → V2 upgrade i deprecation vodič

1. **Inventar:** postojeći integrator beleži da li koristi HTTP V1 ili local
   `customerLicenseIssuer.v1`; V1 ostaje zamrznut i ne dobija V2 claims,
   lifecycle ili receipt semantiku.
2. **Discovery/pin:** pre issue migracije čita V2 `/issuer`, administratorski
   potvrđuje `issuerRef`, čuva očekivani `issuer` i preuzima V2 katalog.
3. **Dual-read, single-write:** consumer aplikacije prvo uvode Assertion V2
   verifier i vektore. Novi issue se zatim prebacuje na V2; isti order item se ne
   šalje paralelno kroz V1 i V2.
4. **Operation model:** timeout postaje poll iste V2 operacije. Ne emulira se V1
   sinhroni rezultat, niti se generiše novi idempotency key.
5. **Runtime:** activation/validate koriste samo public runtime credential-e;
   HMAC ostaje isključivo server-to-server integrator tajna.
6. **Cutover dokaz:** local V2, HTTP V2, Webshop restart/duplicate i clean
   consumer test moraju biti zeleni pre gašenja V1 poziva.
7. **Deprecation:** `Deprecation`/`Sunset` header i datum nisu objavljeni dok
   vlasnik proizvoda ne odobri release notes, support period i rollback plan.
   Do tada capability V1 i postojeći SDK import ostaju kompatibilni.

V1 adapter mapira samo podatke koje V1 zaista poseduje; ne izmišlja profile
revision, custom claims, lifecycle rezultat ili receipt. Issuer descriptor
oglašava podržane API verzije. Breaking claim/profile promena zahteva novu
immutable profile revision. Security-critical nepoznati `alg`, `typ`, `v`,
issuer, audience ili action se uvek odbijaju.

Formalna odluka i deprecation uslovi su u
[`ADR-0001`](./adr/0001-customer-issuer-v2-boundary.md).
