# Faza 04 — P0 activation, signing i revalidation

> Finalna verifikacija 2026-07-12: **delimično dokazano, acceptance nije zatvoren**. Centralni vendor activation concurrency i signing overlap testovi prolaze; stvarni OIDC/pinning/grace/clone E2E i operator key drill nisu izvršeni. Videti [11-final-verification-report.md](./11-final-verification-report.md).

## Cilj

Obezbediti da vendor addon aktivacija bude atomska, vezana za proverljiv installation identitet i domen, da addon prihvata samo kriptografski autentičan entitlement i da kratkotrajan pad centralnog servisa ne obara sajt kupca.

Ovaj dokument se odnosi na licencu samog `webshop` ili `license-server-addon` proizvoda. Customer-issued activations lokalnog License Issuer-a ostaju odvojene i obrađene su u fazi 08.

## Potvrđeni problemi koje faza rešava

- Vendor activations se čuvaju kao JSON unutar licence i imaju read-check-write race.
- `siteId`, domain i `deploymentPlatform` su samoprijavljeni.
- `licenses.domain` se ne poredi pri activation binding-u.
- Ne postoje deactivation, domain transfer i kontrolisan rebind.
- Centralni platform verify endpointi koje CMS očekuje ne postoje; kod može tiho pasti na `self_hosted`.
- Entitlement koristi HMAC secret sa production-nebezbednim literal fallback-om.
- Potpis nema `kid`, standardne issuer/audience/time claim-ove ni key rotation model.
- CMS oblik odgovora proverava Zod-om, ali ne proverava kriptografski potpis.
- Webshop nema periodičnu revalidation.
- LSA fail-open nema maksimalno stale vreme, a expired mode ne ograničava novu runtime aktivaciju customer licenci.

## Glavni moduli za izmenu

Centralni servis:

- `D:\nr_cms\.private\license-server\src\data\addon-activation.ts`
- `D:\nr_cms\.private\license-server\src\db\schema.ts`
- `D:\nr_cms\.private\license-server\app\api\addons\licenses\activate\route.ts`
- `D:\nr_cms\.private\license-server\app\api\addons\licenses\revalidate\route.ts`
- nove activation/deactivation/domain-transfer/key-discovery rute;
- centralni signing/key-management moduli i migracije.

CMS/addon client:

- `D:\nr_cms\lib\webshop-addon\license.ts`
- `D:\nr_cms\lib\webshop-addon\platform.ts`
- `D:\nr_cms\lib\webshop-addon\config.ts`
- `D:\nr_cms\lib\license-server-addon\license.ts`
- `D:\nr_cms\lib\license-server-addon\platform.ts`
- `D:\nr_cms\.private\license-server-addon\src\api\routes.ts`
- addon entitlement tabele u `D:\nr_cms\db\schema.ts`;
- cron/job registracija preko faze 05/06.

## Installation identity

### Minimalni model

Svaka CMS instalacija dobija:

- `installationId`: nasumični UUID, stabilan kroz redeploy;
- `installationKeyId`;
- Ed25519 installation keypair;
- `createdAt` i key version;
- eksplicitni `deploymentMode=vercel|self_hosted|other`;
- canonical production domain i opcionu staging/dev listu.

Privatni installation key mora biti server-only i enkriptovan/čuvan van javnog source-a. Idealno je da nije samo u kloniranoj application DB. Na managed platformi koristiti secret store/KMS; za self-hosted ponuditi export/backup proceduru.

Važno ograničenje: ako napadač kopira i DB i sve server secrets/private key-eve i kontroliše isti domen, softverski license sistem ne može savršeno razlikovati klon od originala. Cilj je sprečiti slučajan DB clone i neautorizovan drugi domen, ne tvrditi da postoji neprobojni DRM protiv vlasnika servera.

### Activation challenge

Preporučeni tok:

1. CMS šalje license key reference, `installationId`, installation public key, addon key, canonical domain i deployment mode.
2. Centralni servis validira entitlement/product/domain i vraća kratkotrajan activation challenge nonce.
3. CMS potpisuje canonical challenge installation private key-em.
4. Centralni servis verifikuje potpis.
5. Za Vercel deployment centralni servis verifikuje Vercel OIDC/attestation direktno ili preko tačno implementirane verify rute.
6. Za self-hosted mode koristi eksplicitnu politiku: domain proof, manual admin approval ili aktivacioni limit.
7. U jednoj transakciji centralni servis kreira/obnavlja activation red i izdaje potpisani entitlement.

Ne raditi silent fallback sa neuspešnog `vercel` dokaza na `self_hosted`. Ako je deployment deklarisan kao Vercel, neuspešna attestation je greška. Korisnik može eksplicitno promeniti mode kroz auditovani tok.

## Centralna activation tabela

Dodati `vendor_addon_activations`:

```text
id uuid primary key
entitlement_id uuid not null
installation_id uuid not null
installation_public_key text not null
installation_key_fingerprint text not null
addon_key text not null
canonical_domain text not null
deployment_mode text not null
platform_subject text null
status pending|active|deactivated|revoked
activated_at, last_revalidated_at, deactivated_at, revoked_at
last_seen_app_version text null
metadata jsonb redigovan
version integer not null default 0
UNIQUE(entitlement_id, installation_id)
UNIQUE(entitlement_id, canonical_domain) prema product policy-ju
```

Ako product dozvoljava više aktivacija, uniqueness ostaje po installation ID-u, dok se limit sprovodi atomskim count/slot modelom.

### Atomska limit provera

U transakciji:

1. Zaključati entitlement red (`FOR UPDATE`) ili koristiti advisory lock izveden iz entitlement ID-a.
2. Proveriti status, validity, product i domain policy.
3. Naći postojeću aktivaciju po installation ID/public key fingerprint-u.
4. Ako ne postoji, prebrojati active slotove pod istim lock-om.
5. Ako je limit dostignut, vratiti 409/403 sa stabilnim reason code-om.
6. Insertovati aktivaciju ili bezbedno rotirati challenge/token postojećoj.
7. Appendovati lifecycle/audit event.
8. Commit.

Dva paralelna zahteva za različite instalacije ne smeju oba preći limit 1.

## Domain policy

Razdvojiti:

- licensed primary domain;
- trenutno aktivacioni domain;
- eksplicitno dozvoljene staging/dev domene;
- localhost development pravo;
- wildcard policy;
- domain transfer status.

Activation mora proveriti entitlement domain policy. `domain=null` nije bypass kada je domain binding obavezan.

Domain transfer treba da bude zasebna komanda:

1. Autentifikovan vendor/customer admin pokreće transfer.
2. Stara aktivacija prelazi u `deactivated` ili `transfer_pending`.
3. Novi domen dokazuje kontrolu i installation key.
4. Centralni audit čuva oba domena i reason.
5. Definisati cooldown/support override politiku.

## Potpisani entitlement format

Koristiti standardni Ed25519 JWS/JOSE ili drugi pregledan, interoperabilan format. Ne praviti nestandardni HMAC token koji addon može i da potpisuje i da verifikuje istim secretom.

Header primer:

```json
{
  "alg": "EdDSA",
  "kid": "nrv-ed25519-2026-01",
  "typ": "NRV-ADDON-ENTITLEMENT+JWT"
}
```

Payload primer:

```json
{
  "v": 1,
  "iss": "https://license-server.nrcms.com",
  "aud": "nr-cms-addon-runtime",
  "jti": "entitlement-assertion-uuid",
  "entitlementId": "uuid",
  "activationId": "uuid",
  "addonKey": "webshop",
  "installationId": "uuid",
  "installationKeyFingerprint": "sha256:...",
  "canonicalDomain": "example.com",
  "status": "active",
  "features": ["webshop"],
  "edition": "standard",
  "activationLimit": 1,
  "validUntil": "2027-07-11T00:00:00Z",
  "updatesUntil": "2027-07-11T00:00:00Z",
  "existingLicensePolicy": "allow_existing",
  "iat": 1783728000,
  "exp": 1784332800,
  "lifecycleVersion": 7
}
```

Payload ne treba da sadrži customer email/name ili license key.

`exp` je rok konkretne offline assertion poruke i može biti kraći od poslovnog `validUntil`. Time se omogućava bounded revalidation bez rušenja perpetual business modela.

## Signing key management

Centralno dodati:

- env/config koji u production-u zahteva signing provider/key ID;
- aktivni i prethodni verification key;
- `kid`, `createdAt`, `notBefore`, `retireAt`, `revokedAt` metadata;
- JWKS-like public endpoint, npr. `/.well-known/nr-license-keys.json`;
- audit svake rotacije;
- emergency revoke proceduru.

Addon treba da ima pinovan root/početni vendor public key ili potpisani key set. Ne treba slepo da veruje bilo kom ključu preuzetom sa URL-a koji je samo konfigurisan lokalno.

Rotacija:

1. Objaviti novi public key pre upotrebe.
2. Addoni preuzmu/cache-uju novi key set uz proveru trust chain-a.
3. Početi potpisivanje novim `kid`-em.
4. Stari key ostaje verification-only duže od maksimalnog assertion/grace roka.
5. Tek potom ga povući.

Production startup mora pasti ako se koristi literal development secret ili nema signing private key-a. `.env.example` mora dokumentovati sva obavezna polja bez pravih vrednosti.

## Lokalni entitlement cache

Webshop i LSA entitlement tabele treba da čuvaju:

- `signedEntitlement`;
- `signingKid`;
- verifikovane claim snapshot-e;
- `lastVerifiedAt` — lokalna signature/claim provera;
- `lastRevalidationAttemptAt`;
- `lastRevalidationSuccessAt`;
- `nextRevalidationAt`;
- `graceEndsAt`;
- `lastCentralStatus`;
- `lastErrorCode`, bez sensitive odgovora;
- `lifecycleVersion`;
- installation ID/key fingerprint;
- package name/version/checksum iz potpisanog release manifesta.

Lokalni resolver nikad ne veruje neproverenim JSON claim-ovima. Redosled:

1. Parsirati token uz striktan size limit.
2. Naći dozvoljeni `kid`.
3. Verifikovati signature i `alg` allowlist.
4. Proveriti `iss`, `aud`, addon key, installation ID/key fingerprint i domain.
5. Proveriti `iat/exp`, uz mali clock skew.
6. Proveriti business `validUntil/updatesUntil`.
7. Tek zatim izvesti lokalni license mode.

## Revalidation politika

Preporučeni osnovni intervali, podesivi server-side policy-jem:

- redovna online revalidation: svakih 24 h;
- assertion `exp`: 7 dana;
- maksimalni outage grace za postojeće javne funkcije: 14 dana od poslednje uspešne provere;
- kraći stale limit za package download/update i novu activation, npr. 24–48 h.

Matrica:

| Događaj | Postojeći javni runtime | Admin/new sale/issue | Nova activation | Update/package |
|---|---|---|---|---|
| Kratak timeout/DNS/5xx unutar grace-a | Dozvoli poslednje dobro stanje | Ograniči prema riziku; nova prodaja tipično blokirana posle kratkog stale-a | Blokiraj ili vrlo kratko dozvoli prema policy-ju | Blokiraj bez svežeg prava |
| Grace istekao | Degraded/read-only, bez crash-a | Blokiraj | Blokiraj | Blokiraj |
| Eksplicitni revoked/invalid | Deaktiviraj privilegovane funkcije; javni CMS ne crash-uje | Blokiraj | Blokiraj | Blokiraj |
| Nevalidan potpis/issuer/audience | Odbaci odgovor; koristi samo poslednje dobro unutar grace-a | Blokiraj promenu | Blokiraj | Blokiraj |
| Business expiry | Prema `existingLicensePolicy` | Bez novih prodaja/issue-a | Bez novih aktivacija | Bez update-a van `updatesUntil` |

Finansijska reconciliacija i fulfillment već plaćenih Webshop obaveza ostaju dozvoljeni prema fazama 01–02.

## Webshop revalidation

Implementirati isti osnovni client kao za LSA, bez dupliranja semantike:

- zajednički verified-entitlement parser/helper;
- addon-specific policy adapter;
- scheduled revalidation job;
- request timeout i klasifikacija 4xx/5xx/network grešaka;
- bounded cache/grace;
- admin banner sa poslednjom uspešnom proverom;
- server-side API/Server Action gate koristi verifikovane claim-ove, ne samo UI stanje.

## LSA expired runtime politika

U `.private/license-server-addon/src/api/routes.ts` proslediti `licenseMode`/policy u sve runtime handlere.

Predloženo:

- `ready`: catalog, issue, new activate, validate, deactivate dozvoljeni.
- `expired + allow_existing`: catalog/issue/new activate blokirani; validate i deactivate samo za aktivacije/licence izdate pre expiry-ja.
- `revoked/disabled`: issue i new activate blokirani; validation vraća eksplicitni vendor-policy reason prema potpisanom contract-u; deactivate može ostati dozvoljen radi oslobađanja customer resursa.

Policy mora biti testirana na server-side route nivou, ne samo helper unit testom.

## Migracija postojećih aktivacija

1. Izvući postojeći `licensePayload.activations` u preflight tabelu/izveštaj.
2. Detektovati jednu licencu vezanu za više site/domain vrednosti i zaustaviti automatski backfill takvih konflikata.
3. Kreirati activation red sa `legacy_unverified` platform statusom.
4. Pri prvoj revalidation zahtevati installation key challenge i prebaciti u `active_verified`.
5. Tokom migration grace-a prihvatiti stari entitlement token samo za dobijanje novog challenge-a, ne za package/update operacije.
6. Posle migracije prestati pisati autoritativne activations u JSON.
7. JSON ukloniti tek u kasnijoj contract migraciji.

## Test-first redosled

1. Dve paralelne aktivacije sa limitom 1 → tačno jedna uspeva.
2. Reaktivacija iste installation/public key kombinacije je idempotentna.
3. Drugi domain bez transfera se odbija.
4. `licenses.domain`/domain policy se stvarno sprovodi.
5. Vercel attestation failure ne pada na self-hosted.
6. Klon samo DB-a bez installation private key-a se odbija.
7. Potpuni DB+secret klon je dokumentovano ograničenje i domain/limit alert ga detektuje koliko je moguće.
8. Falsifikovan JWS se odbija.
9. Pogrešan `iss`, `aud`, addon key, installation ID ili domain se odbija.
10. Unknown `kid` ne dovodi do prihvatanja neproverenog tokena.
11. Key rotation overlap validira stari i novi token prema rokovima.
12. Network timeout unutar grace-a ne obara javni CMS.
13. Isti timeout posle grace-a blokira nove privilegovane operacije.
14. Eksplicitni revoke propagira se pri sledećoj revalidation.
15. Webshop sada periodično revalidira.
16. LSA expired mode blokira novu customer activation, ali sprovodi `allow_existing` politiku.
17. Clock skew testovi oko `iat/exp/validUntil` granice.

## Acceptance kriterijumi

- Nema autoritativnog activation read-check-write JSON toka.
- Activation limit je dokazan concurrency testom.
- Webshop i LSA koriste isti signature verification contract/test vectors.
- Literal development signing fallback ne postoji u production putanji.
- Addon nikada ne prihvata samo shape-validan, nepotpisan entitlement.
- Centralni revoke se propagira u definisanom revalidation roku.
- Kratak centralni outage ne obara javni sajt kupca.
- Grace nije neograničen i ponašanje posle grace-a je eksplicitno testirano.
- Nova LSA customer activation nije moguća u expired režimu.

## Rollout i rollback

1. Generisati staging vendor signing key i objaviti public key set.
2. Deploy verification code koji još prihvata legacy i novi token, ali loguje razliku.
3. Migrirati activations u novu tabelu.
4. Uključiti centralno V1 signed assertions za staging.
5. Reissue-ovati postojeće interne entitlemente u novom formatu.
6. Uključiti `VENDOR_SIGNED_ENTITLEMENTS_V1` na `nrcms.com` i test instalaciji.
7. Tek posle punog grace perioda isključiti legacy activation token.

Rollback tokom dual-accept faze vraća izdavanje na stari token, ali ne briše activation tabelu. Nakon što legacy private/HMAC secret više nije pouzdan ili je povučen, rollback na prihvatanje nepotpisanog/legacy tokena nije dozvoljen; koristiti forward-fix.

## Implementation record — 2026-07-12

Implementirane su additive migracije CMS `0082_vendor_addon_activation_identity` i centralna `0003_vendor_addon_activation_signing`. Novi tok koristi `vendor_addon_activations`; ne čita niti piše autoritativni `licensePayload.activations` JSON. Challenge je jednokratan, vezan za entitlement, installation UUID, public-key fingerprint, addon i canonical domain. Completion koristi advisory lock nad entitlementom, proverava limit i upisuje activation/audit u jednoj transakciji.

Entitlement je compact Ed25519 JWS sa `kid`, `iss`, `aud`, lifecycle i installation/domain bindingom. Shared CMS verifier odbija unknown `kid`, shape-only JSON, pogrešan issuer/audience, nevažeći potpis i clock skew. Centralni `/.well-known/nr-license-keys.json` objavljuje aktivni i verification-only overlap key set. Literal development signing fallback ne postoji.

Webshop i LSA activation koriste isti server-only CMS installation identity; Vercel attestation failure je fail-closed, a self-hosted traži eksplicitni deployment mode. Webshop ima dnevni GET/POST cron revalidation sa petosekundnim timeoutom i 14-dnevnim bounded grace-om. LSA expired server-side gate blokira catalog/issue/new customer activation, a ostavlja existing validate/deactivate dostupnim prema potpisanoj policy.

`VENDOR_SIGNED_ENTITLEMENTS_V1` ostaje `false` dok staging key discovery/pinning, stvarni Vercel OIDC trust-chain verifier i operator KMS procedura ne budu odobreni.
