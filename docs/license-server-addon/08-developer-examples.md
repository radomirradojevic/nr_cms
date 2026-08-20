# 08 — Consumer SDK i primeri za licencirane aplikacije

Ovo uputstvo je za aplikaciju koju licencira kupac License Server add-on-a. To
nije verifier licence samog CMS add-on-a ili Webshop-a: customer issuer je
zaseban trust domen i koristi sopstveni `issuer`, `issuerRef` i Ed25519 keyset.

Release paket sadrži CMS-nezavisne export-e:

```text
@nr-cms/license-server/verifier
@nr-cms/license-server/examples/typescript-consumer
@nr-cms/license-server/test-vectors/customer-license-assertion-v2
@nr-cms/license-server/test-vectors/customer-license-consumer-v2
@nr-cms/license-server/openapi-v2
```

`./verifier` nema CMS, Webshop, React, Next, Drizzle ili server-only runtime
dependency. Primer u `./examples/typescript-consumer` može da se kopira u čist
projekat i koristi samo packed javne export-e i issuer endpoint-e.

## 1. Trust konfiguracija

Administrator aplikaciji dostavlja tri vrednosti drugim pouzdanim kanalom:

```ts
const trust = {
  apiBaseUrl: "https://licenses.example.com/api/license-server/v2",
  expectedAudience: "com.acme.studio",
  expectedIssuer: "urn:nrc:customer:cms-a1b2c3d4",
  pinnedIssuerRef: "cms-a1b2c3d4",
};
```

Ne izvoditi ove vrednosti iz same licence, e-mail linka ili `.nrls.json`
`keysetHint` polja. Promena pin-ovanog `issuerRef` zahteva eksplicitnu,
autentifikovanu administratorsku odluku.

## 2. As-built Assertion V2

Protected header ima tačno tri polja:

```json
{
  "alg": "EdDSA",
  "kid": "nrc-ed25519-...",
  "typ": "NRC-CUSTOMER-LICENSE+JWT"
}
```

Skraćeni payload koristi finalna imena:

```json
{
  "v": 2,
  "iss": "urn:nrc:customer:cms-a1b2c3d4",
  "aud": "com.acme.studio",
  "sub": "customer:c_Z8Q...",
  "jti": "assertion:...",
  "iat": 1786615200,
  "nbf": 1786615200,
  "exp": 1786618800,
  "license": {
    "id": "lic_...",
    "type": "subscription",
    "snapshotHash": "sha256:..."
  },
  "profile": {
    "sku": "studio-pro-annual",
    "revision": 7,
    "hash": "sha256:..."
  },
  "schema": {
    "id": "studio-claims",
    "version": "2.0.0",
    "hash": "sha256:..."
  },
  "policy": {
    "hash": "sha256:...",
    "features": ["export.pdf", "collaboration"],
    "limits": { "devices": 2, "domains": null, "seats": null },
    "validationIntervalSeconds": 86400,
    "offlineGraceSeconds": 604800
  },
  "claims": {
    "edition": "pro",
    "organizationId": "org_42",
    "maxProjects": 100
  },
  "business": {
    "status": "active",
    "notBefore": "2026-08-13T10:00:00.000Z",
    "licenseValidUntil": "2027-08-13T10:00:00.000Z",
    "maintenanceValidUntil": null,
    "graceEndsAt": null
  },
  "receipt": { "id": "rcpt_..." },
  "activation": { "id": "act_..." }
}
```

Verifier odvojeno proverava kratkoživi `exp` i business validity. Nepoznato ili
dodatno header/payload polje, pogrešan `alg`, `typ`, `v`, `iss`, `aud`, `kid`,
potpis ili vreme daju deny odluku.

## 3. Pinned online verifier

```ts
import { createCustomerLicenseVerifier } from "@nr-cms/license-server/verifier";

const verifier = createCustomerLicenseVerifier(trust);
const decision = await verifier.verifyAssertion(assertion);

if (!decision.allowed) {
  disableLicensedCapabilities(decision.code);
  return;
}

const payload = decision.verification.payload;
```

Klijent radi sledeće:

1. prihvata samo HTTPS `apiBaseUrl` bez credential/query/fragment dela;
2. čita tačan `/issuer` descriptor i poredi `issuer` i pin-ovani `issuerRef`;
3. zahteva aktivan issuer, EdDSA assertion type i očekivani `/keys` URL;
4. čita strogi verification-only JWK Set i poredi njegov revision sa descriptorom;
5. koristi bounded `Cache-Control` i obavezni `ETag`;
6. na nepoznat `kid` radi tačno jedan forced refresh, zatim odbija;
7. deduplikuje paralelne refresh pozive i nikad ne koristi token-provided key.

`refreshKeyset()`, `getKeysetSnapshot()` i `clearKeysetCache()` su dostupni kada
aplikacija želi eksplicitnu kontrolu cache-a. Default cache cap je 300 sekundi,
konfigurabilan najviše do 3.600 sekundi; request timeout je bounded na najviše
30 sekundi. Default clock skew je 60 sekundi i ne može preći 300.

Stabilni verifier kodovi su:

```text
algorithm_invalid, assertion_expired, assertion_not_yet_valid,
audience_mismatch, business_license_expired, business_license_not_yet_valid,
business_status_invalid, header_invalid, issuer_mismatch, keyset_invalid,
malformed_token, payload_invalid, signature_invalid, token_type_invalid,
unknown_kid, version_invalid
```

Pinned consumer dodatno vraća:

```text
issuer_descriptor_invalid, issuer_identity_mismatch,
issuer_recovery_required, issuer_unavailable, keyset_revision_mismatch,
keyset_unavailable, license_file_invalid
```

Dozvoljen rezultat je jedino `allowed: true, code: "license_valid"`. Svaki
exception, nepoznat kod ili nevalidan response oblik aplikacija tretira kao deny.

## 4. Offline `.nrls.json` file

```ts
import {
  parseCustomerLicenseFile,
  verifyCustomerLicenseAssertionV2,
} from "@nr-cms/license-server/verifier";

const file = parseCustomerLicenseFile(JSON.parse(downloadedText));
if (file.issuer !== trust.expectedIssuer) deny("issuer_mismatch");

const result = verifyCustomerLicenseAssertionV2(file.assertion, {
  expectedAudience: trust.expectedAudience,
  expectedIssuer: trust.expectedIssuer,
  keyset: administrativelyPinnedKeyset,
});
if (!result.valid) deny(result.code);
```

Za povremeno povezanu aplikaciju praktičnije je
`verifier.verifyLicenseFile(JSON.parse(downloadedText))`: keyset se osvežava samo
sa pin-ovanog issuer origin-a. `keysetHint` je discovery/display podatak, nikad
trust anchor.

## 5. Aktivacija

Public runtime poziv ne koristi HMAC:

```http
POST /api/license-server/v2/licenses/activate
Content-Type: application/json

{
  "activationType": "device",
  "appId": "com.acme.studio",
  "appVersion": "5.4.0",
  "audience": "com.acme.studio",
  "clientRequestId": "activation-request-01",
  "contractVersion": "2",
  "deviceFingerprint": "consumer-normalized-high-entropy-value",
  "deviceLabel": "Example workstation",
  "licenseKey": "NRLS-...",
  "platform": "linux"
}
```

Uspešan odgovor ima finalni oblik:

```json
{
  "activation": { "id": "act_...", "token": "reveal-once-token" },
  "assertion": "eyJ...",
  "assertionExpiresAt": "2026-08-13T11:00:00.000Z",
  "contractVersion": "2",
  "customClaims": { "organizationId": "org_42", "maxProjects": 100 },
  "expiresAt": "2027-08-13T10:00:00.000Z",
  "features": ["export.pdf", "collaboration"],
  "licenseId": "lic_...",
  "limits": { "devices": 2, "domains": null, "seats": null },
  "nextValidationAt": "2026-08-14T10:00:00.000Z",
  "offlineGraceEndsAt": "2026-08-20T10:00:00.000Z",
  "serverTime": "2026-08-13T10:00:00.000Z",
  "status": "active"
}
```

`activation.token` je reveal-once bearer credential. Čuva se u OS
keychain/credential vault-u ili ekvivalentnom šifrovanom secret store-u, sa
najmanjim potrebnim filesystem/account permission-om. Ne sme u source control,
telemetry, URL, crash report ili običan JSON config. Licencni ključ nije runtime
HMAC/private/Master secret, ali se posle aktivacije takođe uklanja iz nepotrebnog
lokalnog/log stanja.

## 6. Online validacija

```http
POST /api/license-server/v2/licenses/validate
Content-Type: application/json

{
  "activationId": "act_...",
  "activationToken": "reveal-once-token",
  "appVersion": "5.4.0",
  "audience": "com.acme.studio",
  "contractVersion": "2",
  "currentAssertionId": "assertion:...",
  "deviceFingerprint": "consumer-normalized-high-entropy-value"
}
```

Validan odgovor ima `valid: true`, `reason: null`, novi `assertion` i ista
effective policy polja kao activation. Negativan poslovni odgovor ima
`valid: false`, `reason: "license_not_valid"`, `assertion: null`, prazne
features/claims i null limite. HTTP error koristi stabilni `error.code`; poruka
nije control-flow ugovor.

Aplikacija mora proveriti potpis novog assertion-a pre primene prava. Eksplicitni
online reject pobeđuje prethodni cache. Timeout ili mrežna greška nije pozitivan
validate rezultat; eventualni nastavak određuje isključivo još validan potpisani
offline-periodic lease.

## 7. Feature, quota i organization odluke

```ts
function canUseFeature(payload, feature: string) {
  return payload.policy.features.includes(feature);
}

function projectQuota(payload) {
  const value = payload.claims.maxProjects;
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function organizationMatches(payload, expectedOrganizationId: string) {
  return (
    typeof payload.claims.organizationId === "string" &&
    payload.claims.organizationId === expectedOrganizationId
  );
}
```

Nepoznata feature je `false`; nevalidna ili nedostajuća quota je `0`; org
mismatch je deny. Custom claim nije izvršivi kod i ne interpolira se direktno u
SQL, shell, URL ili path.

## 8. Režimi rada i clock

| Režim              | Prednost                          | Cena/rizik                          | Preporučena odluka                                                |
| ------------------ | --------------------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| `online-only`      | najbrže vidi suspend/revoke       | zavisi od issuer dostupnosti        | deny kada validacija ne uspe                                      |
| `offline-periodic` | kratak kontrolisan rad bez mreže  | opoziv kasni do lease/grace granice | čuvaj poslednji verifikovan lease; nikad preko business expiry-ja |
| `offline-file`     | radi air-gapped bez redovne mreže | opoziv pre isteka nije pouzdan      | pinuj keyset i koristi jasno ograničen rok                        |

Sat aplikacije mora biti monotono i razumno sinhronizovan. Clock skew samo
tolerira malu razliku na `nbf`/`exp` granici; nije produženje licence. Vraćanje
sata unazad, istekao lease, nepoznat `kid`, nečitljiv cache ili issuer outage ne
postaju implicitno allow.

## 9. Language-neutral vectors i copyable fixture

Assertion vektor sadrži 13 slučajeva: valid, tampered, expired, not-yet-valid,
wrong issuer/audience/version/typ/alg, unknown kid, normal rotation old/new i
malformed token. Consumer vektor dodaje exact issuer/keyset/activation/validate,
offline file, feature, quota i organization binding podatke.

Referentna provera:

```text
npm run test:consumer
```

Komanda izgradi i pakuje release, u novom privremenom projektu instalira samo
packed `@nr-cms/license-server`, TypeScript-kompajlira kopirani primer i izvršava
sve navedene odluke samo kroz javne package export-e. Ne koristi privatni
monorepo import niti produkcioni issuer.

## 10. Šta consumer nikad ne sadrži

- Webshop/License Server HMAC issue secret;
- customer issuer privatni ili wrapping ključ;
- Master secret ili Master public key kao zamenu za customer issuer trust;
- development bypass/kill-switch credential;
- plaintext univerzalni admin/activation token;
- pravilo „ako mreža ne radi, licenca je zauvek validna”.

Tačni request/response modeli su u generisanom OpenAPI 3.1 export-u. Ako se
primer i schema razlikuju, build/test je greška i release se zaustavlja.
