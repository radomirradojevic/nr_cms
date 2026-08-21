# Prompt 14 — SDK, primer aplikacija i consumer dokumentacija evidence

Datum završnog pregleda: **2026-08-20**

## 1. Ishod

DX-01, DX-02, DX-04, DX-05 i CRYPTO consumer vektori su zeleni. Kupac može da
preuzme packed `@radomirradojevic/license-server-addon`, koristi samo javni verifier i public
issuer/runtime endpoint-e i sprovede offline file, activation, online validate,
feature, quota i organization odluke bez čitanja CMS/Webshop internog koda.

Nisu izvršeni npm registry publish, production deploy niti poziv stvarnom
customer issuer-u. Clean fixture koristi sintetičke javne licence/token vrednosti
i lokalni deterministic fetch adapter.

## 2. Javni verifier ugovor

`@radomirradojevic/license-server-addon/verifier` izvozi:

- `verifyCustomerLicenseAssertionV2` za eksplicitno pin-ovan offline keyset;
- `createCustomerLicenseVerifier` za HTTPS issuer discovery i JWK fetch;
- strogi `.nrls.json` create/parse;
- javne assertion/file/JWK/decision/cache TypeScript tipove;
- stabilne verification i consumer error code union-e.

Strogi assertion parser prihvata samo Ed25519/EdDSA,
`NRC-CUSTOMER-LICENSE+JWT`, V2, očekivani issuer/audience, poznati `kid`, validan
potpis i bounded time/business interval. Token-provided `jwk`, `jku`, `x5u`,
dodatna polja i nekanonski key materijal se odbijaju.

Pinned klijent zahteva trusted `apiBaseUrl`, `expectedIssuer`,
`expectedAudience` i `pinnedIssuerRef`. Prihvata samo HTTPS bez URL credential-a,
query-ja ili fragmenta; issuer descriptor i JWK Set imaju exact field shape,
bounded JSON veličinu, isti issuer/revision i očekivani same-origin `/keys` URL.
`ETag` je obavezan, `Cache-Control` je bounded, paralelni refresh je deduplikovan,
a nepoznat `kid` pravi tačno jedan forced refresh. `.nrls.json keysetHint` nikad
ne menja pin-ovani trust origin.

## 3. Packed consumer sadržaj

Paket izlaže:

```text
./verifier
./examples/typescript-consumer
./openapi-v2
./test-vectors/customer-license-assertion-v2
./test-vectors/customer-license-consumer-v2
./test-vectors/nrls2-hmac-v2
```

Consumer primer ima TypeScript i JavaScript modul, executable demo i README.
Primer poziva samo `@radomirradojevic/license-server-addon/verifier` i javne
`/issuer`, `/keys`, `/licenses/activate` i `/licenses/validate` endpoint-e. Ne
sadrži HMAC, customer signing/wrapping ključ, Master secret, CMS alias ili
`.private` import.

Release builder uključuje verifier, oba consumer vektora, generisani OpenAPI i
ceo example folder u potpisani artifact inventory. Reproducibilni pack verifier
dozvoljava jedino planski `examples/typescript-consumer/index.ts` TypeScript
source uz javne declaration fajlove; drugi source/env fajlovi ostaju zabranjeni.

## 4. Language-neutral vectors i clean fixture

Assertion JSON ima 13 stabilnih slučajeva: valid, tampered, expired,
not-yet-valid, wrong issuer/audience/version/typ/alg, unknown kid, normal
rotation old/new i malformed. Consumer JSON dodaje exact initial/rotated issuer
descriptor/JWKS revision, offline `.nrls.json`, activation request/response,
validate request/response i deny-by-default feature/quota/organization odluke.

`npm run test:consumer` radi sledeće:

1. pravi lokalno potpisan release i `npm pack --ignore-scripts`;
2. proverava da tarball sadrži verifier declarations/runtime, vektore, OpenAPI i
   consumer primer;
3. u novom OS privremenom direktorijumu instalira samo taj tarball uz
   `--legacy-peer-deps --offline`;
4. proverava da lockfile ima samo `@radomirradojevic/license-server-addon`;
5. kopira primer iz instaliranog paketa i kompajlira ga sa strict TypeScript;
6. izvršava initial cache, unknown-kid rotation refresh, offline file,
   activation, validation, feature, quota i organization scenario;
7. statički odbija privatne importe i secret-like materijal.

Primer čuva activation token samo kao sintetički fixture podatak. Consumer docs
zahtevaju OS credential vault, deny-by-default, bounded clock skew i eksplicitne
online-only/offline-periodic/offline-file tradeoff-e.

## 5. API i dokumentaciona sinhronizacija

`src/api/v2-contract.ts` sada generiše request i response schema-e za:

- health, issuer i JWK Set;
- scoped catalog;
- issue/lifecycle/status operation i reveal-once receipt;
- activation, validation i deactivation;
- zajednički safe error envelope.

Consumer vektor se runtime-parse-uje kroz iste issuer/keyset/activation/validate
Zod schema-e. Docs/04 opisuje finalna request/response imena i V1 → V2 cutover/
deprecation tok. Docs/08 je copyable consumer vodič bez zastarelih `CILJ` payload-a.
Docs/10 opisuje finalni assertion, keyset descriptor i packed verifier/cache
export-e.

## 6. Reproducibilne provere

| Komanda / gate                                                 | Rezultat                                                                   |
| -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| License Server `npm run typecheck`                             | PASS                                                                       |
| License Server `npm run test:db:local`                         | **109/109**, 0 fail, 0 skip                                                |
| License Server `npm run test:consumer`                         | PASS; jedna instalirana package dependency i svih 7 consumer odluka `true` |
| License Server `npm run pack:verify`                           | PASS; dva uzastopna tarball-a imaju isti digest                            |
| Packed Next 16.3 + PostgreSQL `npm run install:verify:next:db` | PASS; frozen install, build, RSC/route import i svih 16 render putanja     |
| CMS `npm run typecheck`                                        | PASS                                                                       |
| CMS `npm test`                                                 | **372 pass**, 10 eksplicitnih DB/staging skip, 0 fail                      |

Finalni as-built identitet pre root integracionog commita:

- release artifact SHA-256:
  `cfdf8fcf38e516584b182db99dda6d9bbfcc629f4d8d2113e15579c52ef2089c`;
- packed Next verifikacioni tarball SHA-256:
  `52d97117a8f0d893ba9b1e8f7657185679eb54a5347d0bafe589f0f61c347f68`;
- Next.js: `16.3.0`, package boundary: `tarball-self-reference`.

## 7. Acceptance mapa

| ID             | Status     | Dokaz                                                                                                                      |
| -------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| DX-01          | **zelen**  | Versioned OpenAPI request/response/error schema je packed, javno routirana i testirana protiv finalnih consumer payload-a. |
| DX-02          | **zelen**  | Packed verifier, declarations i oba vektora rade u čistom projektu bez CMS dependency-ja/importa.                          |
| DX-04          | **zelen**  | Copyable fixture i static/pack scan potvrđuju da nema HMAC/private/Master/server secret materijala.                        |
| DX-05          | **zelen**  | Eksplicitan V1/capability V1 → V2 cutover/deprecation vodič je u docs/04; Sunset nije izmišljen.                           |
| CRYPTO vectors | **zeleni** | Svih 13 assertion i initial/cache/rotation/unknown-kid/file consumer scenarija prolaze source i packed verifier.           |
