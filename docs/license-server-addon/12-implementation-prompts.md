# 12 — Promptovi za implementaciju License Server add-on-a

Promptovi se izvršavaju redom, idealno jedan po radnoj sesiji/commitu. Svaki
sledeći prompt pretpostavlja da je acceptance prethodnog zelen. Ako se tokom rada
otkrije da je dokumentacija netačna, prvo zabeležiti dokaz i ažurirati relevantni
MD — ne skrivati razliku improvizovanom kompatibilnošću.

## Zajednički preambule za svaki prompt

Sledeći tekst dodati na početak svakog budućeg implementacionog zahteva:

```text
Radiš u D:\nr_cms na Next.js 16.3 projektu. Pre izmene pročitaj root AGENTS.md i
kompletan relevantan sadržaj docs/license-server-addon. Ovo nije standardni stari
Next.js: params/searchParams su Promise, koristi proxy.ts umesto middleware.ts,
Tailwind v4 i ESLint 9 flat config. Najpre pregledaj postojeći kod i testove;
ne pretpostavljaj da je dokumentovani cilj već implementiran.

Arhitektonska granica je obavezna: .private/license-server je autorov centralni
Master koji samo licencira plaćene NR add-on-e. .private/license-server-addon je
zaseban customer add-on koji izdaje licence za proizvode svog vlasnika. Webshop
je zaseban add-on i sa License Server-om komunicira javnim local capability ili
remote HTTPS ugovorom. Nikad ne šalji customer izdavanje kroz Master.

Čuvaj postojeće korisničke izmene. Koristi aditivne, kompatibilne migracije i
server-side auth/permission na svakoj mutaciji. Ne ispisuj secrets/PII. Pokreni
testove proporcionalne riziku i navedi tačne rezultate. Ne commituj, pushuj,
objavljuj paket/Master release niti redeployuj bez eksplicitnog odobrenja za taj
korak. Kada je acceptance gate crven, zaustavi se sa dokazom umesto da proglasiš
fazu gotovom.
```

---

## Prompt 00 — Reproducibilni baseline i gap mapa

```text
Cilj: napravi svež, dokaziv baseline pre implementacije License Server add-on V2.

1. Pročitaj docs/license-server-addon/01-current-state-and-gaps.md i proveri svaku
   POSTOJI/DELIMIČNO tvrdnju u stvarnom kodu.
2. Inventariši root CMS bridge/SDK/schema, .private/license-server-addon, Webshop
   connection/product/fulfillment kod, centralni .private/license-server samo
   radi potvrde granice i addon-deployment-worker samo radi install ugovora.
3. Snimi repo/branch/commit/remote/dirty stanje za svaki relevantan repo bez
   menjanja korisničkih fajlova.
4. Pokreni trenutne typecheck/build/unit/DB/isolated-host testove add-on-a i
   relevantne Webshop contract testove. Ne popravljaj još feature kod.
5. Napravi/azuriraj kratak as-built evidence dokument sa tačnim komandama,
   rezultatima, preskočenim testovima i mapom zahteva ARCH/PKG/DATA/ISSUE/WEB iz
   dokumenta 11.
6. Ako postojeća dokumentacija pogrešno opisuje kod, ispravi samo dokumentaciju i
   objasni dokaz.

Acceptance: baseline je reproducibilan; nijedan failure nije prećutan; jasno je
koji repo/tabela/ugovor poseduje svaki deo. Ne implementiraj V2 u ovom promptu.
```

## Prompt 01 — Javni ugovori i ADR granice

```text
Cilj: zaključaj javne tipove pre domenske implementacije.

1. Dodaj ADR koji formalizuje Master naspram customer issuer-a, zasebnu
   instalaciju License Server/Webshop add-on-a i local/remote transport.
2. U packages/addon-sdk uvedi minimalni customerLicenseIssuer.v2 ugovor prema
   docs/04: describe, catalog, enqueueIssue, getOperation i enqueueLifecycle.
3. Tipovi moraju biti transport-neutralni, versioned, JSON-serializable i bez
   importa iz .private direktorijuma ili Webshop privatnih tipova.
4. Zadrži V1 bez breaking izmene. Dokumentuj V1->V2 adapter/deprecation plan.
5. U root lib/license-server-addon/contract/loader uvedi opcionu V2 capability
   detekciju i tačno stanje kada V2 nije dostupna.
6. Dodaj compile-time fixtures, invalid-shape testove i package-boundary test koji
   zabranjuje privatne importe i direktan DB coupling.

Acceptance: root CMS se gradi bez privatnog paketa; V1 i V2 fixture testovi
prolaze; ne postoji izdavanje kroz Master; javni ugovor podržava isti operation i
receipt za local/remote adapter. Ažuriraj docs ako finalna imena odstupaju.
```

## Prompt 02 — Vlasništvo migracija i package install/upgrade

```text
Cilj: License Server package mora pouzdano posedovati i isporučiti svoju schema-u.

1. Popiši sve postojeće license_server_* i customer_issuer_* tabele/indekse/enum-e
   u root schema-i i migracijama. Ne kreiraj duplikate.
2. Dizajniraj tranziciju na add-on migration manifest: monotoni ID, checksum,
   compatibility range, advisory lock i applied-history evidencija.
3. Uvedi aditivne migracije za operation/profile/schema modele potrebne narednim
   fazama, ali još ne menjaj business tok. Postojeći podaci i FK ostaju važeći.
4. Paket mora sadržati stvarne migration fajlove/manifest i release digest mora
   obuhvatiti migracije.
5. Host install runner proverava potpis/digest, primenjuje svaku migraciju jednom i
   odbija checksum drift. Ne dozvoli arbitrary script izvršavanje iz manifesta.
6. Dodaj testove: empty DB, postojeći fixture upgrade, rerun no-op, concurrent
   installer lock, checksum mismatch, failed migration recovery i application
   rollback compatibility.

Acceptance: DATA-01..04 su zeleni; `migrations.json` nije lažno prazan kada paket
menja schema-u; root i add-on testovi prolaze; nema destruktivnog down migration-a.
```

## Prompt 03 — Release entrypoint i puni admin parity

```text
Cilj: spakovani @nr-cms/license-server mora izložiti isti podržani proizvod koji
se vidi u development source entrypoint-u.

1. Uporedi src/addon.tsx, src/release-addon.tsx, build-release skriptu, manifest i
   dist export. Napravi eksplicitnu feature/route/action parity mapu.
2. Refaktoriši zajednički production entrypoint tako da release koristi puni
   Product/Profile/License/Activation/API Client/Operation dashboard, bez
   workspace-only importa koji tarball ne sadrži.
3. Svi admin path-ovi moraju ponoviti auth/permission i add-on licenseMode gate.
4. Ne kopiraj dve implementacije UI-a; napravi jedan testirani izvor.
5. Proširi isolated Next 16.3 host test da instalira tarball i renderuje ključne
   dashboard putanje, API handler, V1/V2 capability i jobs.
6. Proveri `npm pack` allowlist i da paket nema env/ključeve/source artefakte koji
   nisu planirani.

Acceptance: PKG-01..04 i source-vs-packed parity su zeleni; release UI nije samo
metrics stub; build se izvršava iz čistog paketa.
```

## Prompt 04 — Product Type, License Profile revision i custom schema

```text
Cilj: implementiraj domenski model iz docs/03 i docs/10 bez još menjanja Webshop
fulfillment-a.

1. Uvedi Product Type stable ref/audience/status i License Profile(SKU) sa draft,
   immutable published revision i deprecation stanjem.
2. Uvedi verzionisani ograničeni JSON Schema model, field classification,
   defaults, override source allowlist i bezbedne veličinske granice.
3. Implementiraj deterministic normalization/canonicalization, schemaHash,
   policyHash i effective-claims resolver.
4. Migriraj postojeće SKU/policy podatke u početne revizije bez promene snapshot-a
   postojećih licenci.
5. Dodaj server actions/domain services sa granularnim permission-ima i auditom.
6. Dodaj admin wizard: draft edit, schema/profile preview, publish diff/confirm,
   deprecate i test effective claims. Ne koristi arbitrary eval/remote refs.
7. Dodaj unit/property/DB testove za immutable publish, override source, unknown,
   oversize/depth/prototype pollution, enum/limit i deterministic hash.

Acceptance: PROF-01..03 i CLAIM-01..05 su zeleni; objavljena revizija se ne može
editovati; postojeće licence ostaju semantički iste.
```

## Prompt 05 — Jedinstveni durable issue/lifecycle operation engine

```text
Cilj: jedan application service izdaje customer licence bez obzira na transport.

1. Implementiraj IssueOperation sa operationKey scope-om, canonical payload hash,
   status/attempt/lease/retry/dead-letter/correlation i trajnim receipt-om.
2. Implementiraj isti koncept za lifecycle operacije ili jasno zajedničko
   operation jezgro sa action-specific payload-om.
3. Izdavanje u jednoj kontrolisanoj transakciji pin-uje profile/schema/policy,
   validira effective claims, kreira tačno jednu licencu i audit/outbox rezultat.
4. Isti key+hash vraća isti operation/receipt; isti key+drugi hash daje stabilan
   idempotency_conflict. Nikad ne generiši novi ključ zbog timeout-a/retry-ja.
5. Standardizuj receipt sa license ref, masked key, kontrolisanim reveal secret-om,
   assertion slotom i schema/profile revision podacima.
6. Plaintext ključ envelope-encryptuj samo ako je potreban ponovni reveal; nema ga
   u metadata/log/error. Dodaj auditovan reveal policy.
7. Worker koristi bounded batch, DB lease, SKIP LOCKED ekvivalent, exponential
   jitter retry i admin dead-letter replay.
8. Dodaj fault-injection testove za crash pre/posle issue/receipt commit-a i 100+
   konkurentnih istih komandi.

Acceptance: ISSUE-01..06 su zeleni; postojeći capability V1 može koristiti adapter
bez menjanja V1 potpisa; nema poziva centralnom Master-u.
```

## Prompt 06 — Customer issuer assertion V2, keyset i verifier vectors

```text
Cilj: izdati kriptografski proverljive licence za korisnikove aplikacije.

1. Evoluiraj postojeći Ed25519 customer issuer bez promene issuerRef-a i bez
   mešanja sa Master keyset-om.
2. Implementiraj `NRC-CUSTOMER-LICENSE+JWT` payload v2 iz docs/10: strict alg/typ,
   iss/aud/jti/sub, license/profile/schema/policy snapshot hash, features/limits,
   custom claims, business validity i kratki assertion/lease expiry.
3. Assertion se pravi isključivo iz committed license snapshot-a i vezuje za
   receipt/activation kada je primenljivo.
4. Dodaj public `/v2/issuer` i `/v2/keys` JWK Set sa ETag/cache/revision i
   verification-only overlap pravilom. Ne prihvataj token-provided key.
5. Implementiraj normal rotation, encrypted backup/restore i jasno stanje kada
   aktivni private key nije dostupan. Ne generiši tiho novi issuer.
6. Definiši `.nrls.json` file envelope.
7. Napravi language-neutral JSON test vectors i TypeScript reference verifier za
   valid, tampered, expired, not-yet-valid, wrong issuer/audience/version/typ/alg,
   unknown kid, normal rotation i malformed token.

Acceptance: CRYPTO-01..05 su zeleni; stari V1 assertion je ili jasno versioned
kompatibilan ili migriran bez silent reinterpretacije; package/secret scan je čist.
```

## Prompt 07 — HTTP API V2

```text
Cilj: izloži udaljeni NRLS V2 adapter nad već testiranim operation engine-om.

1. Implementiraj rute iz docs/04: health, issuer, keys, catalog, issue operation,
   operation status, lifecycle, activate/validate/deactivate.
2. Zamrzni V1 ponašanje; ne menjaj V1 response pod istom verzijom. Dodaj V1/V2
   deprecation/compatibility headers samo dokumentovano.
3. Implementiraj NRLS2 HMAC canonical request, timestamp, persistent nonce,
   timing-safe verify, scope po action/product/environment i secret rotation.
4. Uvedi striktne body/query schema-e, size limit pre parse-a, stabilan error
   envelope/status kod i request/correlation ID.
5. Public endpoint-i imaju pre-auth rate limit i generičke anti-enumeration greške.
6. Catalog koristi revision/ETag/If-None-Match i ne izlaže internal-only claims.
7. Dodaj OpenAPI ili ekvivalentnu mašinski proverljivu schema-u generisanu iz
   istog tip izvora gde je praktično.
8. Contract/security testovi pokrivaju exact body byte potpis, query ordering,
   nonce replay, clock skew, scope, oversized/malformed payload i secret leak.

Acceptance: remote adapter vectors odgovaraju domain service rezultatu; API V1
testovi ostaju zeleni; HTTP greška nikad nije HTML/stack/redirect.
```

## Prompt 08 — Local capability V2 adapter i scheduler

```text
Cilj: Webshop u istom CMS-u dobija iste semantike bez HTTP-a i bez privatnog
coupling-a.

1. Implementiraj customerLicenseIssuer.v2 javni SDK adapter nad istim describe,
   catalog, issue/status i lifecycle application servisom kao HTTP V2.
2. Prosledi host source/auth/environment/correlation kontekst; ne prihvataj
   Webshop-simulirani admin identitet.
3. Capability ne prima HMAC secret i ne importuje Webshop tipove/kod.
4. Evoluiraj V1 adapter da enqueue postojeću V2 operaciju bez breaking izmene.
5. Job contract/scheduler mora pouzdano pokretati issue/lifecycle outbox, sa
   singleton/lease zaštitom kroz više CMS procesa.
6. Dodaj shared contract vectors koji isti command izvršavaju domain, local i HTTP
   putem i porede operation/receipt/error semantiku.
7. Testiraj addon unavailable/not ready/edit_existing_only, timeout/cancel,
   restart i capability version mismatch.

Acceptance: ARCH-03/05 i ISSUE invarianti su zeleni; lokalni Webshop put više nije
fire-and-forget bez proverljivog statusa; nema direktnog upisa u issuer tabele.
```

## Prompt 09 — Webshop License Server konekcije i katalog

```text
Cilj: jedan korisnički License Server model sa local i remote transportom.

1. Pregledaj postojeće Webshop license server postavke i skriveni
   `customer_issuer` tok. Napravi aditivnu migraciju na LicenseServerConnection.
2. Konekcija sadrži transport local_addon/remote_nrls_v2, pin-ovani issuerRef,
   environment/status/scopes/catalog revision; URL/client/šifrovani secret samo
   za remote.
3. Local opcija se prikazuje samo kada host detektuje zaseban ready V2 add-on.
4. Remote Test connection uvedi sa HTTPS, SSRF/redirect/DNS rebinding zaštitom,
   issuer pinning-om i sanitized greškama.
5. Implementiraj health/catalog sync, ETag/304, profile/schema revision read model,
   disable/re-auth/rotate credentials i background sync metrike.
6. U product UI-u ostaje jedan `license_server` source; korisnik bira konekciju,
   Product Type, Profile i vidi policy/claim zahteve.
7. Migriraj istorijske remote i customer_issuer zapise bez menjanja starih order
   snapshot-a. Centralni Master connector ostaje odvojen author-only sistem.
8. Dodaj permission, encryption, SSRF i local/remote UI/model testove.

Acceptance: WEB-01..05 su zeleni; neočekivani issuerRef blokira upotrebu; secret
se prikazuje samo jednom i nije u client bundle-u/logu.
```

## Prompt 10 — Webshop claim mapping, fulfillment, receipt i isporuka

```text
Cilj: zatvori paid order -> issuer -> receipt -> secure customer delivery tok.

1. Implementiraj bezbedan claim mapping editor samo za issuer-dozvoljene source-e
   iz docs/05, sa preview/validation i immutable mapping revision/hash-om.
2. Checkout/order item pin-uje connection/issuer/product/profile/schema/policy/
   mapping revision pre plaćanja. Draft/profile mismatch blokira checkout jasno.
3. Paid event pravi durable Webshop issue operation sa stabilnim namespaced key-em.
   Local/remote adapter vraća isti accepted/status/receipt model.
4. Timeout je unknown/poll, ne novi issue. Implementiraj reconciliation worker,
   retry/backoff/dead-letter i admin pregled/replay.
5. Receipt se čuva trajno; plaintext key je envelope-encrypted reveal-once/reveal
   policy podatak. Signed `.nrls.json` se isporučuje kontrolisanim download-om.
6. E-mail sadrži auth link, ne licencni ključ. Reveal/download ima permission,
   rate limit, audit i ne curi u cache/log/referrer.
7. `file_license` mora bezbedno spojiti postojeći file delivery sa issuer receipt-om
   bez dvostrukog fulfillment-a.
8. Dodaj E2E za unpaid, paid duplicate event, local, remote, timeout, restart,
   delivery failure/retry, reveal i dva order item-a sa različitim profilima.

Acceptance: WEB-06..08 i ISSUE-01/06 su zeleni; jedan order item dobija jednu
licencu; browser refresh/redeploy ne utiče na poslovni rezultat.
```

## Prompt 11 — Runtime aktivacije i kompletan lifecycle

```text
Cilj: dovrši enforcement od customer aplikacije do Webshop refund/renew događaja.

1. Uskladi V1 postojeće i V2 runtime activate/validate/deactivate sa snapshot
   policy-jem, audience-om, custom claims i signed kratkoživim lease-om.
2. Normalizuj/hashuj fingerprint/domain; activation token je random reveal-once i
   samo hashovan u bazi. Ne skladišti nepotreban hardware inventar.
3. Atomarno sprovedi device/server/domain/seat/floating limits pod konkurencijom.
4. Implementiraj idempotent renew/suspend/resume/revoke/refund/chargeback operation
   state machine sa audit razlogom i zabranjenim nelegalnim prelazima.
5. Webshop šalje lifecycle outbox tek iz autoritativnih payment/subscription
   događaja i pouzdano reconciliše status.
6. Definiši clock skew, assertion expiry, validation interval i offline grace
   odluke. Refund/revoke ne može magično poništiti dugovečni offline dokument;
   test i UI moraju prikazati taj tradeoff.
7. Dodaj full matrix i 100+ concurrent activation test, clock vectors, duplicate/
   out-of-order lifecycle, Master outage i issuer outage E2E.

Acceptance: LIFE-01/02 i RUN-01..04 su zeleni; nema probijenog limita ili silent
resume-a opozvane licence.
```

## Prompt 12 — Produkcioni admin, permission-i i support tokovi

```text
Cilj: add-on mora biti operativan proizvod, ne samo API.

1. Dovrši packed admin UI za Product Types, Profile/Schema revisions, Licenses,
   Activations, API Clients/Scopes, Operations/Dead letters, Keys/Backup i Audit.
2. Uvedi granularne permission-e iz docs/07 na svakoj server action/route; UI
   visibility je samo pomoć, ne kontrola.
3. Dodaj search/filter/pagination i bezbedne detalje bez plaintext tajni/PII.
4. Podrži audited manual issue, suspend/resume/revoke, activation reset, client
   rotate/revoke, dead-letter replay i assertion verifier playground.
5. `edit_existing_only` matrix eksplicitno testiraj: blokirano novo izdavanje i
   publish, dozvoljen backup/audit i dokumentovane bezbedne radnje nad postojećim.
6. Admin error-i imaju correlation ID i user-actionable code, bez stack/SQL-a.
7. Dodaj server-action authz testove i packed browser E2E ključnih tokova.

Acceptance: SEC-01, DX-03 i PKG-02 su zeleni; nijedna kritična mutacija nije
zaštićena samo prikazom/skrivanjem dugmeta.
```

## Prompt 13 — Security hardening, observability i recovery

```text
Cilj: zatvori production operativne rizike iz docs/07.

1. Uradi threat-model pregled implementacije: trust boundaries, assets, attacker,
   abuse cases i konkretne kontrole/testove.
2. Uskladi envelope encryption/version/rotation za signing private keys, HMAC
   secrets i reveal data. Nema development fallback secret-a u production.
3. Implementiraj persistent multi-process rate limit i anti-enumeration za public,
   HMAC, activation, reveal i admin tokove.
4. Proveri SSRF/TLS/proxy/header/redirect/DNS zaštitu remote konekcije.
5. Standardizuj sanitized structured log, correlation trace, metrike i alarme za
   queue/issue/validate/auth/key/catalog/lifecycle.
6. Dovrši šifrovan backup/export/restore sa manifest/checksum/verzijom wrapping
   ključa. Izvrši restore drill koji zadržava issuerRef i validira star assertion.
7. Napiši/testiraj incident runbook za Master outage, issuer outage, lost wrapping
   key, compromised signing key/HMAC i inconsistent receipt.
8. Pokreni dependency, supply-chain, secret i log/PII scan; popravi nalaze u opsegu.

Acceptance: SEC-02..05 i OPS-01..05 su zeleni; restore dokaz je datiran i
reproducibilan; nijedan critical/high nalaz nije prećutan.
```

## Prompt 14 — SDK, primer aplikacija i consumer dokumentacija

```text
Cilj: kupac add-on-a može bezbedno da proveri generisanu licencu u svojoj
aplikaciji bez čitanja internog koda.

1. Iz javne assertion V2 specifikacije napravi mali TypeScript verifier paket ili
   referentni modul bez CMS/Webshop dependency-ja.
2. API mora striktno proveravati alg/typ/v/iss/aud/kid/signature/time i vraćati
   stabilne decision/error kodove. Implementiraj keyset pin/cache/refresh.
3. Objavi language-neutral test vectors i minimalne primere za offline file,
   activation, online validate, feature flag, quota i organization binding.
4. Napravi clean consumer fixture/app koji koristi samo packed SDK i public
   issuer endpoint-e. Ne ugrađuj HMAC/private/Master secret.
5. Dokumentuj online-only, offline-periodic i offline-file tradeoff, clock skew,
   storage activation tokena i deny-by-default ponašanje.
6. Sinhronizuj docs/04, docs/08, docs/10 i generisanu API schema-u sa finalnim
   imenima/payload-ima.

Acceptance: DX-01/02/04/05 i CRYPTO vectors su zeleni u čistom consumer projektu;
primer se može kopirati bez privatnog monorepo importa.
```

## Prompt 15 — Potpuni E2E, fault/load i production acceptance audit

```text
Cilj: dokazati kompletan proizvod iz finalnih paketa, ne workspace prečica.

1. Podigni izolovan Master, vendor/customer CMS host, Webshop, License Server
   add-on i potrebni deployment worker/test DB koristeći production-like config i
   potpisane lokalne RC artefakte.
2. Izvrši fresh install/activate/revalidate, Product/Schema/Profile publish,
   Webshop local connection i paid order do secure delivery/app verification.
3. Ponovi isti scenario remote HTTPS/HMAC konekcijom.
4. Fault injection: duplicate paid event, timeout pre/posle issue commit-a,
   process/DB restart, worker lease expiry, catalog revision change, issuerRef
   mismatch, Master outage, issuer outage i delivery failure.
5. Lifecycle: renew, refund i chargeback do online app odluke; proveri offline
   grace očekivanje.
6. Load/stress: p95, 100+ concurrent duplicate issue i activation limit, queue
   backpressure/soak. Bez duplikata i probijenih limita.
7. Upgrade sa prethodnog paketa, application rollback compatibility i stvarni
   backup restore drill.
8. Popuni svaku stavku docs/11 dokazom ili NO-GO razlogom. Ne menjaj test da bi
   sakrio product bug.

Acceptance: svi obavezni ARCH/PKG/DATA/PROF/CLAIM/ISSUE/LIFE/WEB/CRYPTO/RUN/SEC/
OPS/DX/PERF zahtevi su zeleni ili release ostaje NO-GO.
```

## Prompt 16 — Release candidate, Master publish i kontrolisani rollout

```text
Cilj: pripremi release candidate i izvrši publish/deployment samo uz zasebna
eksplicitna ljudska odobrenja.

1. Pročitaj docs/09 i finalni acceptance evidence iz prompta 15.
2. Predloži semantic version prema breaking/migration promenama i uskladi package,
   manifest, schema, changelog i compatibility range.
3. Iz čistog checkout-a napravi potpisan tarball, provenance, SBOM, migration
   digest i SHA-256; ponovi isolated packed-host smoke.
4. Prikaži operatoru tačnu verziju, commit, digest, migration plan, test/restore
   dokaz, canary i rollback/forward-fix plan. Tu se zaustavi i traži eksplicitno
   odobrenje za package/release publish.
5. Posle odobrenja importuj draft u centralni Master i proveri ga na staging
   entitlement-u. Ponovo se zaustavi pre Master publish-a.
6. Posle posebnog publish odobrenja učini verziju dostupnom canary-ju. Za install/
   redeploy svake ciljne instalacije traži odobrenje ako već nije jasno dato.
7. Prati canary period: auth/errors, duplicates, queue age, validate latency,
   issuer/keyset i lifecycle. Na gate failure povuci novu dostupnost i primeni
   dokumentovan rollback/forward-fix.
8. Zapiši rollout evidence/odobrenja bez tajni/PII. Širi rollout tek posle
   eksplicitnog GO-a.

Acceptance: release nije „gotov” samo zato što je paket izgrađen. Gotov je kada
su digest/publish/install/canary/evidence gate-ovi zatvoreni i nema NO-GO uslova.
```

## Preporučeni način rada

- Posle svakog prompta ažurirati status stavki u dokumentu 11, ali ne označavati
  dokaz koji ne postoji.
- Ako prompt dodiruje više repozitorijuma, držati njihove commit-e atomarnim i
  u handoff-u navesti zavisni redosled; push nije implicitno odobren.
- Pre dugog browser testa prvo automatizovati API/DB dokaz, a browser koristiti za
  realan UX/redirect/cookie/CSP/redeploy tok.
- Ne koristiti centralni Master ili Stripe kao prečicu da bi customer issuer test
  „prošao”; to su različiti poslovni sistemi.
- Svaki pronađeni incident ili workaround pretvoriti u regression test pre
  proglašavanja faze zelenom.
