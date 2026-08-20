# 07 — Bezbednost, operacije i test strategija

## 1. Zaštićena imovina

Najvažniji asset-i su:

- customer issuer privatni signing ključevi;
- HMAC issue client secrets;
- wrapping/data-encryption ključevi;
- plaintext licencni i activation tokeni;
- immutable policy/custom claim snapshot-i;
- operation idempotency i receipt integritet;
- customer/order reference i ograničeni PII;
- Master entitlement i kratkoživeći install token;
- add-on package digest, potpis i migration history.

Master signing ključ i customer issuer signing ključ moraju imati različite
trust root-ove, rotaciju, backup i `typ`/`iss` namespace.

## 2. Napadači i tipični rizici

- anoniman napadač pogađa/validira ključeve i iscrpljuje rate limit;
- kupac menja domain/device fingerprint ili signed claim payload;
- kompromitovan Webshop issue secret masovno izdaje licence;
- zlonamerni API klijent pokušava drugi Product Type/environment;
- replay validnog HMAC zahteva izdaje duplikat;
- administrator sa nedovoljnim permission-om izvozi ključ ili opoziva licencu;
- log/telemetry/e-mail otkriva plaintext ključ ili PII;
- supply-chain zamena privatnog add-on paketa;
- izgubljen encryption ključ čini signing backup neupotrebljivim;
- kompromitovan signing ključ lažno potpisuje offline licence;
- zastareli offline assertion ignoriše refund/revoke;
- race condition probija seat/device limit;
- SSRF preko administratorom unetog remote base URL-a.

## 3. Autorizacija i permission-i

Admin server action/route mora pozvati host `auth()`/permission servis. Minimalne
odvojene privilegije:

- `license_server.view`;
- `license_server.catalog.manage`;
- `license_server.license.issue`;
- `license_server.license.lifecycle`;
- `license_server.activation.reset`;
- `license_server.client.manage`;
- `license_server.keys.manage`;
- `license_server.backup.export_restore`;
- `license_server.audit.view`.

UI sakrivanje nije autorizacija. Svaka mutacija ponavlja server-side proveru i
piše actor ID u audit.

`edit_existing_only` je dodatni runtime gate: dozvoljeno je čitanje, backup i
bezbedne radnje nad postojećim licencama prema definisanom policy-ju; blokirani
su novi Product/Profile publish, novi API klijent i novo izdavanje.

## 4. Secret i key management

### Signing ključevi

- Ed25519 private key čuva se samo envelope-encrypted;
- aktivni `kid` je eksplicitan i javni keyset je verzionisan;
- normalna rotacija prebacuje stari ključ u `verification_only`;
- verification period pokriva najduži assertion + cache overlap;
- kompromitovan ključ koristi hitni keyset/denylist incident tok;
- signing private key se ne izvozi bez posebno autorizovanog šifrovanog backup-a.

### HMAC secrets

- 256-bit random minimum;
- prikaz samo jednom;
- hash/encrypted at rest po potrebi verifikacionog modela;
- rotacija sa kratkim dual-secret overlap-om;
- product/action/environment scope i opcioni IP allowlist;
- trenutna revokacija bez brisanja audit istorije.

### Encryption ključevi

- posebni od signing/HMAC ključeva;
- eksplicitna verzija u ciphertext envelope-u;
- rotacija podržava postepeni re-encrypt;
- nema plaintext default vrednosti u repo-u ili production env primeru;
- recovery dokumentuje šta se dešava ako je wrapping ključ izgubljen.

## 5. Transport i SSRF

- remote konekcija u produkciji zahteva HTTPS;
- blokirati loopback, link-local, metadata IP, private opseg po default-u, osim
  eksplicitno dozvoljenog administrativnog deployment profila;
- proveriti redirect svaki put, ne samo početni URL;
- hostname pinning i DNS rebinding zaštita;
- timeout, response size i content-type limit;
- proxy forwarded header-i se veruju samo poznatom proxy-ju;
- HMAC potpisuje normalizovanu stvarnu putanju i exact body bytes.

Local capability ne prolazi kroz URL i zato nema SSRF/HMAC, ali mora imati source
identity, permission, scope, timeout/cancellation i isti audit.

## 6. Input, claims i kriptografska provera

- Zod/ekvivalent za envelope i strogi JSON Schema subset za custom claims;
- zabrana `__proto__`, `prototype`, `constructor` i duplicate/collision polja;
- canonical JSON/hash se računa tek posle normalizacije i validacije;
- ograničenje depth/size/count pre skuplje validacije;
- nema eval-a, regex-a bez complexity limita ili korisničkog skripta;
- verifier proverava alg allowlist, `typ`, `v`, `iss`, `aud`, `kid`, potpis,
  `nbf/iat/exp`, schema/policy i lokalni clock skew;
- ne prihvatati `alg:none`, drugi key type ili ključ dostavljen unutar tokena;
- offline assertion ima ograničen status freshness period; potpis ne dokazuje da
  licenca nikada kasnije nije opozvana.

## 7. Abuse kontrola

Persistent rate-limit bucket-i, najmanje odvojeno za:

- public pre-auth IP;
- license key hash prefix/account;
- activation token/license ID;
- HMAC client ID + action;
- issuer admin mutacije;
- reveal/download;
- failed signature/nonce/auth događaje.

Limiter radi na deljenoj bazi/servisu, ne samo u memoriji procesa. Odgovori ne
smeju omogućiti enumeraciju validnih ključeva. Pragovi i lockout se mere i
alarmiraju; legitimni kupac ima audited support recovery.

## 8. Logovi, metrike i trag

Svaki tok nosi `requestId`, `correlationId`, `operationId`, `orderItemRef` i
`licenseId` gde je poznat. Loguje se hash/short ref, ne secret.

Minimalne metrike:

- issue accepted/succeeded/failed/dead-letter i latency;
- idempotent replay/conflict;
- activation/validation po reason code-u;
- HMAC/nonce/rate-limit odbijanja;
- queue depth, oldest age, retries i lease recovery;
- catalog sync/issuer mismatch;
- signing/encryption/HMAC rotacije;
- Master entitlement revalidation stanje;
- reveal/download neuspeh;
- lifecycle reconciliation lag.

Alarmi: dead-letter > 0, oldest pending iznad SLO-a, nagli auth failure, issuer
identity promena, signing key nedostupan, backup/restore failure i abnormalan
issue/validation volumen.

## 9. Backup i recovery

Backup set mora zajedno obuhvatiti:

- konzistentan DB snapshot;
- issuerRef i keyset;
- šifrovane private signing ključeve;
- wrapping key/version iz odobrenog secrets sistema;
- add-on/package/schema verziju;
- restore manifest i checksum.

Restore test:

1. obnoviti u izolovanoj instalaciji;
2. potvrditi isti issuerRef;
3. potvrditi da stari assertion test vector i dalje prolazi;
4. izdati novu licencu aktivnim ključem;
5. validirati aktivaciju i lifecycle;
6. dokazati da nema ukrštanja sa Master issuer-om.

Backup bez wrapping ključa nije obnovljiv backup. Recovery test se izvršava
periodično, ne samo pre prvog release-a.

## 10. Test piramida

### Unit/property testovi

- policy resolution i lifecycle;
- claim schema validation/canonicalization/hash;
- assertion encode/verify i test vectors;
- HMAC canonicalization/timing/replay;
- URL/SSRF normalizacija;
- idempotency payload hash;
- retry/backoff/dead-letter;
- permission/state matrix.

### DB/integration testovi

- migration empty/upgrade;
- concurrent issue tačno jednom;
- activation/seat/domain concurrency limit;
- outbox lease crash recovery;
- receipt/reveal encryption;
- key rotation i historical validation;
- catalog revision/schema immutability;
- lifecycle ordering i duplicate događaji;
- audit bez secret-a.

### Contract testovi

Isti vectors moraju proći kroz:

- domain application service;
- local capability V2 adapter;
- HTTP V2 adapter;
- Webshop connector klijent;
- TypeScript verifier.

### Packed/E2E testovi

- instalacija potpisanog tarball-a u čist Next.js 16.3 host;
- pun admin UI iz release entrypoint-a;
- Master activate/install/revalidate/degraded mode;
- Webshop local i remote order-to-delivery;
- browser refresh/redeploy tokom pending operacije;
- refund/chargeback i offline/online app odluka;
- upgrade, rollback aplikacije i restore baze.

### Security testovi

- dependency/supply-chain/secret scan;
- authz horizontal/vertical access;
- nonce replay, clock skew, oversized body i malformed JSON;
- SSRF/redirect/DNS rebinding;
- token tampering, alg confusion, wrong audience/issuer/kid;
- log/e-mail/error snapshot bez secret-a/PII;
- rate-limit iz više procesa.

## 11. Produkcioni SLO predlog

Početne mete koje se potvrđuju load testom:

- 99.9% dostupnost public validate API-ja mesečno;
- p95 online validate < 300 ms bez spoljnog Master poziva;
- p95 sinhrono prihvatanje issue operacije < 500 ms;
- 99% issue operacija završeno < 60 s u zdravom sistemu;
- nula duplih licenci za isti idempotency scope;
- RPO <= 24 h i RTO <= 4 h za početni plan, uz jasno ponuđen napredni plan.

Brojevi nisu marketing obećanje dok staging/load/restore test ne dokaže kapacitet.

## 12. Incident klase

- **Master nedostupan:** postojeći validni cached entitlement radi do definisanog
  grace-a; customer runtime validate ne zavisi od Master-a.
- **Customer issuer API nedostupan:** Webshop zadržava pending/retry, ne izdaje iz
  drugog izvora bez administrativne odluke.
- **Signing ključ kompromitovan:** zaustaviti signing, objaviti incident keyset,
  rotirati, identifikovati assertion-e i zahtevati online revalidation/reissue.
- **Wrapping ključ izgubljen:** zaustaviti signing/reveal, pokušati odobren backup;
  ne generisati tiho novi issuer preko postojećeg.
- **HMAC secret kompromitovan:** revoke/rotate client, zaustaviti scope, pregledati
  issue audit i opozvati neautorizovane licence kontrolisanim batch-em.
- **Duplikat/nekonzistentan receipt:** freeze affected connector/profile,
  reconcile po operation key/payload hash-u pre nastavka.

## 13. As-built HTTP V2 zaštita posle Prompt-a 07

- jedan V2 boundary pre bilo kog route rada primenjuje persistent distribuirani
  IP bucket; runtime rute zatim primenjuju credential/fingerprint bucket;
- JSON telo je ograničeno na 24 KiB po stvarnim UTF-8 bajtovima pre parsiranja,
  kompresovano telo se odbija, a security-sensitive Zod objekti su `strict`;
- NRLS2 potpis obuhvata tačne body bajtove, normalizovanu putanju, sortirani
  RFC3986 query, timestamp i canonical nonce; poređenje je timing-safe;
- validan nonce se trajno zauzima unique insert-om, clock skew je 300 sekundi, a
  prethodni rotirani secret važi najviše 900 sekundi;
- HMAC klijent se proverava po statusu, environment-u i
  action/product/profile scope-u; mutation idempotency je isti durable
  operation key/hash ugovor kao u domain servisu;
- public runtime greške su anti-enumeration odgovori; svaki failure izlazi kao
  stabilan JSON envelope sa request/correlation ID-em, bez stack-a, SQL-a,
  secret-a, HTML-a ili redirect-a;
- catalog izlaže samo published/deprecated javne podatke i dozvoljena Webshop
  mapiranja, sa revision/ETag/`If-None-Match`; `internal_only` claim detalji se ne
  projektuju.

## 14. As-built local V2 i scheduler zaštita posle Prompt-a 08

- local capability poseduje License Server paket i importuje samo javni SDK;
  nema Webshop tipove, Webshop kod, HMAC secret, HTTP fallback ni direktan
  customer issuer DB pristup iz Webshop-a;
- host bridge prvo proverava add-on entitlement stanje. Novi issue/lifecycle su
  dozvoljeni samo u `ready`; `edit_existing_only`, install pending i ostala
  not-ready stanja vraćaju eksplicitnu nedostupnost;
- local source je fiksiran na host-autorizovani `addon:webshop` identitet i
  runtime license environment. Input može nositi order/correlation reference,
  ali ne može glumiti admin identitet ili drugi source system;
- V1 potpis ostaje zamrznut i samo enqueue-uje isto durable operation jezgro.
  Webshop upisuje vraćeni operation ID i polling nastavlja kroz V2 posle timeout-a
  ili restarta; legacy V1 reveal zadržava repeat semantiku radi crash-safe
  kompatibilne predaje, dok native V2 ostaje reveal-once;
- versioned scheduler job ima bounded limit i deadline, a package-owned
  `customer_issuer_job_leases` tabela atomskim lease-om sprečava paralelni batch
  kroz više CMS procesa. Istekli lease je recoverable, a token-bound release ne
  može osloboditi lease drugog procesa;
- shared PostgreSQL vector izvršava isti command kroz domain, local i HTTP put i
  poredi operation/receipt semantiku; dodatno pokriva singleton concurrency,
  deadline, restart, version mismatch i neautorizovan local source.

Konkretne komande, contract/security/DB rezultati i paket digest nalaze se u
[Prompt 07 evidence dokumentu](./18-prompt-07-http-api-evidence.md). Full
multi-process/load dokaz za produkcioni rate-limit kapacitet ostaje release gate;
unit/DB granica i zajednički distributed bucket su dokazani ovim promptom.
