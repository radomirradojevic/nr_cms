# 08 — Primeri za programere licencirane aplikacije

Ovi primeri su za aplikacije koje licencira kupac License Server add-on-a. Nisu
za proveru licence samog add-on-a, Webshop-a ili drugih Night Raven proizvoda;
njih potpisuje centralni Master u drugom trust domenu.

Primeri opisuju ciljni V2 ugovor. Putanje/tipovi koji još nisu implementirani
označeni su kao **CILJ**.

## 1. Primer Product Type-a i profila

```json
{
  "productType": {
    "externalRef": "acme-studio",
    "name": "Acme Studio",
    "audience": "com.acme.studio"
  },
  "profile": {
    "sku": "studio-pro-annual",
    "licenseType": "subscription",
    "durationDays": 365,
    "maxDevices": 2,
    "validationIntervalSeconds": 86400,
    "offlineGraceSeconds": 604800,
    "features": ["export.pdf", "collaboration", "ai.basic"],
    "limits": { "projects": 100, "teamMembers": 5 },
    "claimSchemaVersion": "2.0.0"
  }
}
```

Product Type je aplikacija, a profil je komercijalna varijanta. Webshop proizvod
može mapirati jednu varijantu na `studio-pro-annual`, a drugu na drugi profil.

## 2. Custom claim schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "required": ["edition", "organizationId", "releaseChannel"],
  "properties": {
    "edition": { "type": "string", "enum": ["standard", "pro"] },
    "organizationId": { "type": "string", "maxLength": 80 },
    "releaseChannel": {
      "type": "string",
      "enum": ["stable", "beta"]
    },
    "maxProjects": { "type": "integer", "minimum": 1, "maximum": 1000 },
    "modules": {
      "type": "array",
      "maxItems": 20,
      "uniqueItems": true,
      "items": { "type": "string", "maxLength": 64 }
    }
  }
}
```

Add-on čuva i dodatnu klasifikaciju/mapping policy uz schema-u. JSON Schema sama
ne daje Webshop-u pravo da proizvoljno upiše svako polje.

## 3. Webshop claim input

```json
{
  "edition": "pro",
  "organizationId": "org_42",
  "releaseChannel": "stable",
  "maxProjects": 100,
  "modules": ["designer", "exporter"]
}
```

License Server spaja dozvoljene override-e sa profile default-ima, validira
rezultat i potpisuje immutable effective snapshot. Aplikacija veruje potpisanom
snapshot-u, ne Webshop request-u.

## 4. Signed customer license assertion — CILJ

Protected header:

```json
{
  "alg": "EdDSA",
  "kid": "nrc-ed25519-...",
  "typ": "NRC-CUSTOMER-LICENSE+JWT"
}
```

Payload, skraćen:

```json
{
  "v": 2,
  "iss": "urn:nrc:customer:cms-a1b2c3d4",
  "aud": "com.acme.studio",
  "jti": "assert_...",
  "sub": "customer:c_Z8Q...",
  "licenseId": "lic_...",
  "productTypeRef": "acme-studio",
  "profile": { "sku": "studio-pro-annual", "revision": 7 },
  "iat": 1786615200,
  "nbf": 1786615200,
  "exp": 1786701600,
  "licenseValidUntil": "2027-08-13T10:00:00Z",
  "nextOnlineValidationAt": "2026-08-14T10:00:00Z",
  "offlineGraceEndsAt": "2026-08-20T10:00:00Z",
  "features": ["export.pdf", "collaboration", "ai.basic"],
  "limits": { "projects": 100, "teamMembers": 5 },
  "claims": {
    "edition": "pro",
    "organizationId": "org_42",
    "releaseChannel": "stable",
    "maxProjects": 100,
    "modules": ["designer", "exporter"]
  },
  "claimSchema": { "version": "2.0.0", "hash": "sha256:..." },
  "policyHash": "sha256:...",
  "activation": { "id": "act_...", "type": "device" }
}
```

Kratki `exp` je rok assertion/lease dokumenta, a `licenseValidUntil` poslovni rok
licence. Aplikacija mora proveriti oba i offline grace pravilo.

## 5. TypeScript verifikacija — referentni oblik

Produkcioni SDK treba da isporuči gotovu funkciju; sledeći primer pokazuje
obavezne korake, ne zamenu za kompletan SDK:

```ts
import { createPublicKey, verify } from "node:crypto";

type VerifyInput = {
  token: string;
  expectedAudience: string;
  expectedIssuer: string;
  publicKeyPemByKid: ReadonlyMap<string, string>;
  now?: Date;
};

export function verifyNrlsAssertion(input: VerifyInput) {
  const [encodedHeader, encodedPayload, encodedSignature] = input.token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error("invalid_compact_jws");
  }

  const header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString());
  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString());

  if (header.alg !== "EdDSA" || header.typ !== "NRC-CUSTOMER-LICENSE+JWT") {
    throw new Error("unsupported_assertion_header");
  }
  if (payload.v !== 2 || payload.iss !== input.expectedIssuer) {
    throw new Error("wrong_issuer_or_version");
  }
  if (payload.aud !== input.expectedAudience) throw new Error("wrong_audience");

  const publicKeyPem = input.publicKeyPemByKid.get(header.kid);
  if (!publicKeyPem) throw new Error("unknown_kid_refresh_keyset");

  const validSignature = verify(
    null,
    Buffer.from(`${encodedHeader}.${encodedPayload}`, "ascii"),
    createPublicKey(publicKeyPem),
    Buffer.from(encodedSignature, "base64url"),
  );
  if (!validSignature) throw new Error("invalid_signature");

  const now = Math.floor((input.now ?? new Date()).getTime() / 1000);
  if (typeof payload.nbf === "number" && now < payload.nbf) throw new Error("not_yet_valid");
  if (typeof payload.exp !== "number" || now >= payload.exp) throw new Error("assertion_expired");
  return payload;
}
```

Produkcioni verifier dodatno primenjuje clock skew limit, schema/policy proveru,
keyset cache/refresh pravila, activation binding i offline decision model.

## 6. Aktivacija — CILJ V2

```http
POST /api/license-server/v2/licenses/activate
Content-Type: application/json

{
  "contractVersion": "2",
  "licenseKey": "NRLS-...",
  "audience": "com.acme.studio",
  "activation": {
    "type": "device",
    "fingerprint": "app-normalized-high-entropy-value",
    "label": "Rade laptop"
  },
  "clientRequestId": "01J..."
}
```

Aplikacija čuva vraćeni activation token u OS keychain/credential vault-u, ne u
repo-u ili običnom config fajlu.

## 7. Online validacija — CILJ V2

```http
POST /api/license-server/v2/licenses/validate
Content-Type: application/json

{
  "contractVersion": "2",
  "activationId": "act_...",
  "activationToken": "secret-reveal-once-token",
  "audience": "com.acme.studio"
}
```

```json
{
  "contractVersion": "2",
  "valid": true,
  "reason": "active",
  "serverTime": "2026-08-13T10:00:00Z",
  "nextValidationAt": "2026-08-14T10:00:00Z",
  "offlineGraceEndsAt": "2026-08-20T10:00:00Z",
  "assertion": "eyJ..."
}
```

Ako je server privremeno nedostupan, aplikacija sme nastaviti samo do već
potpisanog `offlineGraceEndsAt`. Lokalni sat unazad, istekao assertion ili
nepoznat `kid` ne znače automatski „dozvoli”.

## 8. Feature i limit odluke

```ts
function canUseFeature(assertion: any, feature: string) {
  return Array.isArray(assertion.features) && assertion.features.includes(feature);
}

function projectLimit(assertion: any) {
  const value = assertion.limits?.projects ?? assertion.claims?.maxProjects;
  return Number.isInteger(value) && value >= 0 ? value : 0;
}
```

Aplikacija koristi deny-by-default za nepoznato/invalid polje. Custom claim nije
komanda za izvršavanje i ne interpolira se u SQL/shell/path bez sopstvene
validacije aplikacije.

## 9. Keyset cache

1. Preuzeti `/issuer`, pin-ovati očekivani issuer van napadačevog toka.
2. Preuzeti `/keys` uz TLS, `ETag` i razuman cache limit.
3. Ako token ima nepoznat `kid`, jednom osvežiti keyset.
4. Ako i dalje nema ključa, odbiti token; ne verovati ključu iz tokena.
5. Zadržati prethodne dozvoljene ključeve prema issuer cache policy-ju.
6. Kompromitovan-key signal ima prednost nad običnim cache trajanjem.

## 10. Šta se nikad ne ugrađuje u aplikaciju

- Webshop/License Server HMAC issue secret;
- customer issuer privatni ključ;
- Master public key kao zamena za customer issuer keyset;
- development bypass/kill-switch credential;
- plaintext univerzalni admin token;
- pravilo „ako mreža ne radi, licenca je zauvek validna”.
