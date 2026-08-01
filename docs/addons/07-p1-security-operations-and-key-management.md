# Faza 07 — P1 security hardening, secrets, key management i operations

> Dopuna verifikacije 2026-07-12: secret-purpose fallback, addon `CRON_SECRET`, LSA runtime literal, legacy pool snapshot, invite URL i redeploy-token granica su lokalno popravljeni i pokriveni sentinel testovima. Faza ostaje nezatvorena dok staging backfill/reveal tok, distribuirani limiter i ostali operator dokazi ne postoje. Videti [11-final-verification-report.md](./11-final-verification-report.md).

## Cilj

Ukloniti poznate secret/key exposure putanje, uvesti jasnu kriptografsku hijerarhiju i rotaciju, zameniti process-local zaštite distribuiranim kontrolama i pripremiti `nrcms.com` i `license-server.nrcms.com` za merljiv, recoverable production rad.

Pojedini delovi ove faze — production signing key guard, redaction i bezbedno čuvanje novih ključeva — moraju se primeniti već tokom P0 implementacije. Ovaj dokument završava sistemsku i operativnu celinu.

## Glavni moduli za izmenu

Centralni servis:

- `src/lib/crypto.ts`
- `src/lib/api-auth.ts`
- `src/lib/rate-limit.ts`
- `src/lib/bootstrap.ts`
- `src/lib/sessions.ts`
- `src/lib/passwords.ts`
- `app/admin/actions.ts`
- `app/admin/api-clients/page.tsx`
- `app/login/actions.ts`
- `next.config.ts`
- `.env.example`, env validation i deployment konfiguracija;
- DB schema/migracije za key versions, rate/nonces/audit.

CMS/Webshop/LSA:

- `lib/webshop-addon/config.ts`, `license.ts`, `buy-link.ts`;
- `lib/license-server-addon/config.ts`, `license.ts`, `buy-link.ts`;
- Webshop license-server credential storage;
- Webshop issue/order/email storage;
- LSA admin secret/key reveal actions;
- provider webhook/API klijenti;
- root `next.config.ts`, `proxy.ts` i env schema;
- release/source-map/package konfiguracija privatnih projekata.

## Kriptografska hijerarhija

Ne koristiti jedan secret za više svrha. Minimalne klase:

| Ključ/secret | Vlasnik | Svrha | Rotacija |
|---|---|---|---|
| Vendor Ed25519 signing private key | Centralni servis/KMS | Potpis entitlementa/release manifesta | `kid`, overlap verification |
| Vendor signing public key set | CMS/addoni | Verification | Pinovan root/potpisani refresh |
| Service HMAC secret | Webshop + centralni servis | Request autentifikacija | Verzija/`kid`, kratki overlap |
| Secret-encryption KEK | Deployment KMS/secret store | Envelope encryption API/license secrets | Planirana re-enkripcija |
| Data encryption key | Generisan per secret/record | AES-GCM ciphertext | Wrapped KEK-om |
| Installation Ed25519 key | Jedna CMS instalacija | Activation challenge | Kontrolisana rotacija/rebind |
| Customer issuer signing key | Kupčeva instalacija | Customer-issued licence | Odvojeno od vendor ključa |
| Payment/webhook secrets | Provider + Webshop | Provider API/signature | Provider-specific rotation |
| Cron/redeploy secret | Jedna integracija | Scheduler/deployment auth | Ne deliti sa entitlement secretom |

Zabranjeno je fallback-ovati vendor signing na DB encryption key ili literal development string.

## Key metadata i rotacija

Dodati centralnu key metadata tabelu ili KMS-backed registry:

```text
key_id / kid
purpose
algorithm
status=prepublished|active|verification_only|retired|revoked
not_before
signing_stops_at
verification_stops_at
kms_reference
public_key
created_at, rotated_by
```

Privatni key materijal se ne čuva u običnom DB tekstu. Ako lokalni development koristi fajl/env, production env validator mora zahtevati KMS/secret-store referencu ili dovoljno bezbednu eksplicitnu konfiguraciju.

Rotacioni runbook:

1. Generisati novi ključ u KMS-u.
2. Objaviti public key/novi `kid`.
3. Dokazati da svi aktivni addon client-i mogu verifikovati novi key.
4. Početi signing novim key-em.
5. Stari ostaviti verification-only duže od maksimalnog token+grace roka.
6. Reissue-ovati dugovečne artefakte po potrebi.
7. Povući stari key i alertovati svaku njegovu kasniju upotrebu.

Emergency compromise put mora biti dokumentovan odvojeno; tada availability može biti podređen bezbednosti.

## Envelope encryption i license key storage

Za svaki plaintext secret/key koji mora biti povratljiv:

1. Generisati nasumični data encryption key.
2. Enkriptovati podatak AES-256-GCM sa jedinstvenim nonce-om.
3. AAD uključuje table/record/purpose/version identitet.
4. Data key wrap-ovati KMS/KEK ključem.
5. Čuvati ciphertext, nonce/tag, wrapped key i `kid`.
6. Za lookup čuvati odvojeni keyed hash/fingerprint.

License key:

- centralni lookup koristi hash/HMAC;
- Webshop čuva plaintext samo enkriptovan ako je potreban portal/retry delivery;
- `responseSnapshot`, `requestSnapshot`, order JSON i audit sadrže samo fingerprint/reference;
- customer portal radi server-side decryption uz auth, audit i rate limit;
- one-time reveal je poželjan, ali mora postojati support/recovery politika;
- email po defaultu šalje link ka autentifikovanom portalu, ne puni reusable key;
- ako proizvod zahteva email ključ, to je eksplicitna business/security odluka sa upozorenjem i bez dodatnih plaintext kopija.

Backfill:

1. Inventarisati sve plaintext key kolone/JSON/email template putanje.
2. Enkriptovati postojeće vrednosti batch procesom sa checkpoint-om.
3. Dual-read staro/novo, write samo novo.
4. Proveriti da fingerprint odgovara dekriptovanom ključu.
5. Posle stabilnog perioda null-ovati stare plaintext kolone i ukloniti JSON kopije.
6. Backup napravljen pre čišćenja tretirati kao sensitive i primeniti retention/rotation plan.

## API client secret lifecycle

Kreiranje/rotacija:

- secret se prikazuje jednom u server-renderovanom flash/session stanju;
- ne stavlja se u query string, redirect URL, log ili analytics;
- DB čuva encrypted secret i fingerprint/version;
- novi i stari secret mogu kratko koegzistirati tokom kontrolisane rotacije;
- svaki secret ima `notBefore`, `expiresAt/revokedAt`, last-used metadata;
- admin može opozvati samo kompromitovanu verziju;
- scope i environment su vezani za credential.

Audit prikazuje samo `clientId`, secret fingerprint prvih nekoliko znakova, `kid/version`, actor i vreme.

## Centralni admin hardening

1. Ukloniti bootstrap password i invite token iz logova i query stringova.
2. Bootstrap koristiti kroz one-time CLI/out-of-band secret ili deployment secret koji se odmah rotira.
3. `requireAdmin()` mora server-side proveriti `mustChangePassword` za sve admin stranice i mutacije, uz allowlist samo za change-password/logout.
4. Rotacija passworda opoziva druge session-e prema politici.
5. Admin mutacije moraju imati CSRF/Origin zaštitu koju zahteva stvarni route/action tip.
6. Session cookie ostaje host-only; ne postavljati `Domain=.nrcms.com`.
7. Dodati kratke session lifetime/idle timeout vrednosti i audit login/failed-login/privilege eventa.
8. Osetljive akcije kao key rotation, revoke i package publish mogu zahtevati re-auth/MFA kada auth sistem to podrži.

## Redacting logger

Uvesti zajednički structured logger sa recursive redaction allow/deny pravilima.

Obavezno redigovati polja koja odgovaraju:

```text
authorization
cookie
set-cookie
secret
token
licenseKey
privateKey
signature
webhook-signature
packageInstallToken
encrypted payload internals
customer PII osim minimalno potrebnog reference-a
```

Error helper mora ograničiti dužinu i ukloniti response body koji može sadržati ključ. Log injection sprečiti strukturiranim poljima i kontrolom newline/control karaktera.

Test mora ubaciti sentinel secret kroz svaki važan error path i dokazati da se sentinel ne pojavljuje u captured log output-u.

## Distributed rate limiting

Process-local `Map` ukloniti iz production putanje. Koristiti Redis/managed KV ili DB limiter sa atomskim increment+TTL.

Dvoslojni limiter:

1. Pre autentifikacije: IP/network bucket sa ograničenom cardinality i kratkim TTL-om.
2. Posle autentifikacije: verified API client/action bucket.

Activation/validation:

- IP + license key fingerprint + endpoint scope;
- progressive delay za ponovljene invalid attempts;
- različit limit za validaciju postojeće activation token veze i brute-force license key pokušaje;
- ne koristiti napadački proizvoljan raw client ID kao neograničen Map key.

Admin login:

- IP + normalized username/email fingerprint;
- success ne mora odmah obrisati security audit;
- alert na distributed pokušaje.

Limiter failure politika:

- za visoko-rizične public activation/login endpoint-e definisati bounded fail-closed ili veoma konzervativan local fallback;
- za payment webhook ne odbaciti validan provider događaj samo zbog limiter outage-a; signature verification i durable inbox imaju prednost.

## Nonce retention

DB nonce replay zaštitu zadržati, ali dodati:

- indeks/unique `(apiClientId, nonce)`;
- `expiresAt` ili timestamp indeks;
- cleanup job koji briše samo nonce-e starije od max clock skew + safety margin;
- metric cleanup lag-a i table size-a.

Cleanup job je idempotentan i registrovan preko addon/central scheduler-a.

## API i webhook resource limits

- Postaviti mali per-route body limit pre parsiranja, nezavisno od globalnog proxy maksimuma.
- JSON dubina/array length i string length moraju biti schema-limitirani.
- Svaki outbound provider/central/redeploy fetch koristi `AbortController` timeout.
- Response body čitati sa size limitom.
- PayPal proverava obavezne verification headere pre OAuth poziva.
- Unknown provider event je ignored/auditovan, ne favorable default.
- Financial i activation public endpointi dobijaju distributed limiter.

## SSRF i outbound URL politika

Webshop license-server base URL i redeploy callback su admin-controlled outbound destinacije i moraju imati eksplicitnu politiku:

- production first-party server zahteva `https://license-server.nrcms.com` ili strogu allowlist-u;
- customer-configurable external license server može dozvoliti širu listu, ali default blokira loopback, link-local, metadata IP i private range osim eksplicitnog self-hosted admin opt-in-a;
- validirati svaki redirect ili ga zabraniti;
- resolve/connect zaštita mora uzeti u obzir DNS rebinding;
- ne slati centralni credential drugom hostu posle redirecta;
- host i canonical path ulaze u HMAC potpis.

## Browser/CSP/source-map zaštita

CMS i centralni servis treba da imaju:

- CSP prilagođen stvarnim payment form/script/frame/connect domenima;
- `frame-ancestors`, `object-src`, `base-uri`, `form-action` i ostale potrebne direktive;
- HSTS samo u pravom production HTTPS okruženju;
- `X-Content-Type-Options`, odgovarajući Referrer-Policy i Permissions-Policy;
- production browser source maps isključene ili privatno uploadovane bez public serviranja;
- server source maps/build artefakti van Git-a i public output-a;
- test da secret env vrednost/sentinel nije u browser chunkovima.

Monri/Paddle/Stripe/PayPal CSP zahtevi moraju biti potvrđeni fixture/E2E testom, ne nasumičnim širokim `*` allowlistama.

## Database i serverless operations

- Definisati pool max/idle/connect timeout za serverless concurrency.
- Aplikacija i DB treba da budu u kompatibilnom regionu; konkretne production vrednosti dokumentovati.
- Cross-service timeout treba biti kraći od platform request timeout-a.
- Queue worker batch i lease moraju odgovarati serverless duration-u.
- DB statement/lock timeout koristiti za admin/migration operacije gde je primereno.
- Production migration koristi eksplicitnu komandu i advisory lock, ne implicitni build side effect.

## Monitoring i alerting

Minimalni dashboardi/alerti:

### Webshop

- webhook signature failure rate;
- inbox processing lag/dead letters;
- paid order bez fulfilled licence;
- refund/chargeback bez centralnog lifecycle success-a;
- fulfillment queue age;
- centralni 401/403/409/5xx;
- invalid signed entitlement.

### Centralni servis

- issue/renew/revoke latency i error rate;
- idempotency conflicts;
- scope denials i cross-client pokušaji;
- activation-limit denials;
- nonce replay;
- invalid license/activation brute-force;
- signing key expiry/rotation rok;
- DB pool saturation, migration drift i audit failure.

Alert payload ne sadrži puni ključ, secret ili nepotreban PII.

## Backup, restore i disaster recovery

Za obe baze dokumentovati i testirati:

- automatski backup/PITR interval i retention;
- encryption at rest i backup access role;
- restore u izolovano okruženje;
- RPO/RTO cilj;
- postupak usklađivanja Webshop outbox-a i centralnih entitlementa posle point-in-time restore-a;
- signing/encryption key backup/escrow i odvojen pristup;
- postupak gubitka customer issuer private key-a iz faze 08.

Restore drill mora uključiti reconciliation, jer dve baze ne mogu biti vraćene na savršeno isti trenutak. Idempotency/event logovi treba da omoguće ponovno približavanje stanja.

## Dependency i supply-chain kontrola

- Lockfile po privatnom projektu.
- Clean/frozen install u CI-ju.
- Dependency audit i policy za critical/high nalaze.
- Provenance/checksum potpis addon artefakta.
- SBOM za release po mogućnosti.
- Minimalne package permissions i pregled postinstall skripti.
- Generated `.next`, source maps i `tsconfig.tsbuildinfo` ukloniti iz centralnog Git-a.

## Test-first redosled

1. Production start bez signing/encryption secret-a pada sa redigovanom greškom.
2. Development fallback ne može biti aktivan u production-u.
3. API secret nikada nije u redirect URL-u/history/logu.
4. Bootstrap password/invite token nisu u logu.
5. `mustChangePassword` blokira svaku admin rutu/akciju osim dozvoljenih.
6. Secret rotation overlap i pojedinačni revoke.
7. Envelope encrypt/decrypt, AAD mismatch i key rotation.
8. Sentinel redaction kroz network/DB/provider errors.
9. Distributed limiter radi kroz dve application instance.
10. Neograničeni random client ID-evi ne proizvode memory growth.
11. Nonce cleanup ne briše još važeći replay prozor.
12. Oversized webhook/request se odbija pre skupog parsiranja/OAuth poziva.
13. SSRF loopback/metadata/DNS redirect scenariji.
14. Provider webhook se i dalje prihvata kada limiter store privremeno ne radi prema definisanoj politici.
15. Browser bundle/source map secret sentinel scan.
16. Backup restore + cross-service reconciliation drill.

## Acceptance kriterijumi

- Nijedan production code path nema literal signing/buy-link/activation secret fallback.
- Secrets/license keys se ne pojavljuju u URL-u ili strukturiranim log testovima.
- Vendor i customer issuer key hijerarhije su odvojene.
- Svi aktivni ključevi imaju `kid`, purpose i rotation metadata.
- Rate limit radi distribuirano i nema unbounded process Map.
- Nonce tabela ima cleanup i monitoring.
- Centralni admin obavezno sprovodi password change.
- Production headers/CSP prolaze browser E2E za sve podržane payment tokove.
- Backup/restore i key-rotation runbook su stvarno izvršeni na staging-u.
- Privatni repo buildovi su reproduktivni preko lockfile-a i bez tracked generated output-a.

## Rollout i rollback

Security migracije raditi redosledom:

1. Uvesti redacting logger i sentinel testove.
2. Dodati key metadata/envelope format sa dual-read podrškom.
3. Enkriptovati postojeće tajne/ključeve.
4. Uvesti secret version/overlap auth.
5. Prebaciti limiter na distributed store.
6. Uvesti production startup guards.
7. Rotirati sve postojeće secrets/key-eve koji su mogli biti u URL/logu.
8. Tek nakon potvrde null-ovati stare plaintext vrednosti.

Rollback ne vraća kompromitovan secret niti development fallback. Kod može privremeno dual-read-ovati stari enkriptovani format, ali key revocation i log cleanup se rešavaju forward putem.

## Implementacioni zapis — 2026-07-12

- Centralni `encryptSecret` sada upisuje envelope v2 (per-record DEK, AES-GCM AAD, KEK `kid`); v1 ostaje read-only za migraciju. Novi Webshop V1 issue tok zapisuje license key samo u `encrypted_license_key` uz fingerprint i uklanja ga iz response/fulfillment JSON snapshot-a.
- `rate_limit_buckets` (central) i `security_rate_limit_buckets` (CMS/Webshop) su additive tabele; auth/activation i Webshop request/action limiter koriste async atomsku upsert politiku i hashed bucket identitet. Nonce cleanup je idempotentna authenticated internal ruta sa metric logom.
- Centralni one-time reveal koristi kratkotrajni HttpOnly server-side cookie; API secret i invite token više nisu redirect query parametri ili console logovi.
- `lib/security/{logger,outbound-url}` pruža recursive redaction i HTTPS/no-private-network/no-redirect outbound policy. Testovi ubacuju sentinel secret i pokrivaju envelope AAD i SSRF osnovne slučajeve.
- Dopuna za mrežnu granicu: LSA HMAC pre-auth više ne koristi process-local map niti raw `clientId`; koristi CMS PostgreSQL `security_rate_limit_buckets` sa IP-only SHA-256 bucketom. LSA i centralne API rute koriste 16 KiB raw-byte reader pre JSON parse-a, sa schema string/key limitima. Activation, revalidation i redeploy koriste isti HTTPS/allowlist/DNS-resolve/no-redirect/timeout guard; PayPal proverava obavezne lokalne headere i cert URL pre OAuth-a.
- Staging-only procedure je u [07-staging-security-operations-runbook.md](./07-staging-security-operations-runbook.md). Product-specific payment CSP E2E, provider OAuth hardening, Redis/KV adapter i production backfill/rotation ostaju eksplicitni operator rollout koraci.
- Dopuna: svi obuhvaćeni HMAC/buy-link/cart/download/runtime/redeploy secret-i sada zahtevaju sopstveni named env input bez `AUTH_SECRET`, `CLERK_SECRET_KEY`, `NEXTAUTH_SECRET`, `CRON_SECRET` ili literal development fallback-a. Redeploy koristi `NR-REDEPLOY-V1`, zaseban `*_REDEPLOY_AUTH_SECRET` i `*_REDEPLOY_AUTH_KID`; package install token se ne šalje callback-u.
- `0087_webshop_license_key_encryption` je samo expand migracija: dodaje ciphertext i `kid`, legacy plaintext čini nullable i uvodi `NOT VALID` kompatibilni check. Backfill je checkpointed operator korak: encrypt -> verify fingerprint -> null legacy plaintext; enforce/validate i contract/drop su zasebne buduće, odobrene migracije. Nijedna migracija niti backfill nisu izvršeni.
- Pool write put enkriptuje ključ namenskim `WEBSHOP_LICENSE_KEY_ENCRYPTION_KEY`/`KID`; fulfillment snapshot i delivery email više ne nose pun key. Puni ključ ostaje samo kratko u server-side decrypt putu za kasniji eksplicitni one-time reveal/delivery endpoint, koji mora biti staging-verifikovan pre zatvaranja faze.
