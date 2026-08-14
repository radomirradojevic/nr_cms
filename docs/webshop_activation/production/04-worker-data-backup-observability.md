# 04 — Deployment worker, baze, backup i observability

## 1. Production cilj worker-a

Worker je privilegovani control-plane servis. Prima samo autentifikovanu,
release-bound operaciju; preuzima/verifikuje tačan hosted paket; izvršava build i
migraciju kroz izolovane identitete; atomarno menja target runtime; proverava
health; šalje fenced terminal receipt i bezbedno se oporavlja posle restarta.

Worker ne sme da bude:

- javni arbitrary deployment API;
- remote shell;
- izvor license/payment/customer podataka;
- vlasnik CMS/Master baze;
- mesto gde se čuvaju plaintext registry, DB ili target HMAC tajne u SQL/job-u;
- build proces sa pristupom production runtime tajnama ili mreži posle fetch-a.

## 2. Obavezna implementacija pre produkcije

### 2.1 Ukloniti test hardkodovanja

Refaktorisati `src/config.ts` i `src/targets/static-config.ts` tako da:

- public worker origin dolazi iz potpisane/odobrene production konfiguracije,
  ali ostaje exact HTTPS origin;
- DB identity nije hardkodovan na `nr_addon_deployment_worker_test`;
- target policy nije obavezno tačno `[vendor, client]` niti koristi globalne
  profile nazive kao customer identitet;
- target ima stabilan installation/target ID, environment i canonical adapter
  ID;
- DB/service/release root/port/provider identiteti pripadaju adapter-specific
  schema-i;
- request path ne bira proizvoljan filesystem/command/DB; mapira se na unapred
  provisionovan target ID/policy;
- production zabranjuje `_test`, `.nr.test`, local/acceptance KID i test secret
  map;
- target policy ostaje strict, verzionisan, hash-pinovan i bez tajni;
- compatibility sa postojećim local Prompt 18 profilom ostaje samo kroz
  eksplicitni `development` schema/fixture, ne fallback.

Dodati regression testove koji production config odbijaju za svaki test marker.

### 2.2 Adapter contract

Uvesti zatvoren interfejs, konceptualno:

```text
inspect(target) -> observed immutable state
prepare(release) -> isolated prepared deployment
preflightDatabase(migrations) -> no mutation evidence
backup(target, operation) -> immutable backup reference/hash
migrate(target, release, lease) -> migration ledger evidence
switch(target, prepared) -> provider-specific atomic promotion
health(target, expected tuple) -> exact readiness evidence
rollback(target, previous compatible release) -> rollback evidence
reconcile(target, operation) -> terminal/unknown state
```

Svaki adapter je allowlistovan literalom, nema arbitrary module/path/command
load-a. Sve metode primaju immutable target/release/epoch/generation tuple i
vraćaju strict contract objekte.

### 2.3 Prvi podržani target

Ako je prvi production target Windows self-hosted:

- generalizovati WinSW service/resource imena kroz provisioned policy uz strict
  regex i service-SID proveru;
- ne pretpostavljati port 3000/3002 ili `D:\nr_deploy\vendor|client`;
- proveriti DACL/reparse/symlink/containment za svaki path;
- pin-ovati Node/npm/pacote/cacache alatke i helper hash;
- target-specific DB broker izdaje samo jednokratni migration lease;
- registry broker izdaje samo read credential fetch child-u;
- build sandbox nema runtime env i outbound mrežu;
- service switch i health proveravaju exact release/build/CMS/package/hash;
- više instalacija dobija zaseban mutex/fence namespace.

Ako je prvi target Vercel, implementirati poseban adapter iz dokumenta 01; ne
simulirati Vercel lokalnim WinSW workerom.

## 3. Production worker env

Postojeći ugovor treba evoluirati bez tajni u target fajlu:

```text
NR_ADDON_DEPLOYMENT_WORKER_ENVIRONMENT=production
NR_ADDON_DEPLOYMENT_WORKER_DATABASE_URL=<worker runtime DB secret>
NR_ADDON_DEPLOYMENT_WORKER_PUBLIC_URL=https://<worker-origin>
NR_ADDON_DEPLOYMENT_WORKER_PORT=<internal/listen port>
NR_ADDON_DEPLOYMENT_WORKER_TARGETS_FILE=<absolute protected policy path>
NR_ADDON_DEPLOYMENT_WORKER_TARGETS_SHA256=<64 lowercase hex>
NR_ADDON_DEPLOYMENT_WORKER_SECRET_RESOLVER=<approved production resolver literal>
NR_ADDON_DEPLOYMENT_WORKER_SECRET_ROOT=<absolute protected path, if OS resolver>
NR_ADDON_DEPLOYMENT_WORKER_DPAPI_HELPER_PATH=<absolute helper path, if Windows>
NR_ADDON_DEPLOYMENT_WORKER_DPAPI_HELPER_SHA256=<64 lowercase hex>
```

`NR_ADDON_DEPLOYMENT_WORKER_TEST_SECRET_MAP_JSON` nikad nije prisutan. Env
validator mora odbiti neusklađen environment/target, HTTP, credentials u URL-u,
test DB/profile i nehashovan/symlink policy/helper.

## 4. Baze i least privilege

### 4.1 Odvojene baze

Najmanje četiri trust zone:

- vendor/customer CMS DB po instalaciji;
- Master License Server DB;
- deployment worker job/fence DB;
- eventualni observability sistem, koji nema write pristup poslovnim bazama.

Production DB imena ne smeju imati `_test`. Tačna imena su operator policy, ali
su identity-pinned u validatoru/provisioning manifestu.

### 4.2 Role matrica

Po CMS targetu:

- core owner — one-time schema ownership, no web login;
- core migrator — operator-only core migrations;
- core runtime — DML samo nad dozvoljenim core objektima;
- Webshop schema owner/deployer — phase-scoped add-on migration;
- Webshop runtime — DML/sequence/function prava potrebna add-on-u, bez DDL;
- backup role — read/backup po definisanom mehanizmu;
- worker DB broker — nema trajni target DB password u worker procesu.

Master:

- schema owner/migrator;
- web runtime;
- release operator CLI role;
- backup/monitor role.

Worker DB:

- migration owner;
- worker runtime nad jobs/leases/replay/result/evidence;
- backup/monitor role;
- nema grant ka target/Master DB-u.

Testirati `current_user`, owner, schema/table/default privileges i zabranjene
DDL/cross-schema operacije. Manual grant drift je NO-GO.

## 5. Production deployment state machine

Obavezni redosled:

1. autentifikovati request HMAC, nonce/request ID, target i environment;
2. upisati/vratiti idempotent job za operation/epoch/generation;
3. uzeti target mutex i installation-scoped fence;
4. preuzeti release evidence i paket samo fetch childom;
5. verifikovati Master release, publication attestation, JWS/KID, digest, SBOM,
   provenance, dependency graph, tarball i migration bundle;
6. exportovati/porediti pinovani CMS base commit/lock/manifest;
7. napraviti offline dependency cache i prekinuti outbound build mrežu;
8. buildovati u novom immutable release direktorijumu bez runtime tajni;
9. izvršiti DB preflight; pre mutacije imati no-mutation evidence;
10. napraviti target backup i upisati hash/ref u job;
11. dobiti phase-scoped DB lease i primeniti tačne migracije pod lock-om;
12. atomarno promovisati release/provider deployment;
13. pokrenuti target i proveriti exact live tuple;
14. reconcile-ovati schema/descriptor/release i commitovati jedan terminal receipt;
15. poslati potpisani callback, uz durable result outbox/retry;
16. osloboditi DB lease/mutex i retention-ovati previous/failed release.

Response loss mora vratiti isti job/result; novi request ne sme promeniti epoch ili
napraviti drugi success writer.

## 6. Backup skupovi

### CMS/Webshop target

- konzistentan PostgreSQL dump/snapshot;
- Webshop schema migration ledger/checksum;
- upload/blob verzionisana referenca;
- installation identity ciphertext i odgovarajuće active/old KEK verzije;
- issued-license envelope ciphertext i active/old KEK verzije;
- transfer approval active/old verzije za pending transfere;
- current/previous release tuple i pointer/provider deployment ID;
- env/config version reference bez plaintext vrednosti.

### Master

- license/activation/purchase intent/payment authorization/idempotency/nonce/audit;
- release catalog i publication evidence;
- API client secret envelopes i active/old Master KEK;
- entitlement i purchase public/private key recovery set po policy-ju;
- migration ledger i operator audit.

### Worker

- jobs, attempts, leases, request replay/idempotency;
- per-installation highest epoch/generation/fence;
- phase evidence, backup refs i result outbox;
- target policy file/hash i adapter version reference;
- odvojeno: secret-store active/old refs, ne plaintext u SQL dump-u.

## 7. Restore drill

Izvršiti u izolovanom network/DB namespace-u:

1. proveriti backup checksum i manifest;
2. provisionovati tačno pripadajuće secret key verzije;
3. obnoviti baze bez povezivanja worker dispatch-a;
4. porediti target installation ID/fingerprint/domain/release/schema;
5. porediti worker restored highest epoch sa autoritativnim CMS epoch-om;
6. konflikt/stariji fence ide u manual reconciliation, nikad automatski switch;
7. validirati stari signed entitlement/purchase/release evidence;
8. autorizovano dekriptovati testni envelope/reveal u izolaciji;
9. pokrenuti health i jednu novu test operaciju;
10. dokumentovati RPO/RTO, red count/invariante i uništiti izolovane plaintext
    artefakte prema procedure.

Restore vendor baze na drugi client target bez signed transfer/re-enrollment-a je
zabranjen.

## 8. Observability arhitektura

Potrebni su:

- centralni structured log collector sa redaction/drop pravilima;
- metrics backend i dashboard;
- alert manager/on-call kanal;
- tracing/correlation bez high-cardinality customer/license/token vrednosti;
- audit DB ostaje autoritet za poslovne/security mutacije;
- health probes za vendor, Master, worker i svaki managed target.

Postojeći `console.*` JSON logger je input za collector, ne kompletan production
observability sistem. Pre slanja proveriti redaction i isključiti request/response
body, Authorization/Cookie/Stripe-Signature/PayPal transmission headere,
PayPal buyer PII/approval token, delivery token i raw license key.

### Obavezne metrike

- payment webhook accepted/invalid/duplicate/lag;
- paid-but-unissued count i oldest age;
- issue/reconciliation/notification/lifecycle queue depth, retries, DLQ, latency;
- delivery retrieve `accepted/not_found/unknown`;
- secure reveal success/reject/expired;
- activation/revalidation success/outage/grace/expired/revoked;
- worker job duration po fazi, rollback, active mutex/lease i callback backlog;
- migration/backup/restore rezultat;
- Master HMAC auth/replay/rate limit;
- purchase challenge/proof success/reject;
- keyset age, unknown/revoked KID i ciphertext count po KID-u;
- active desired/installed release drift;
- Stripe/PayPal/e-mail outbound latency/error bez customer ili buyer labela;
- PayPal OAuth/create/capture/refund/verification failure, webhook lag,
  account-limitation i completed-capture-without-evidence signal.

### Minimalni alarmi

- paid order bez licence iznad dogovorenog SLO-a;
- bilo koji production DLQ > 0;
- worker oldest pending/result callback iznad praga;
- active DB lease/mutex stariji od maksimalne faze;
- invalid Stripe/PayPal signature ili HMAC/replay skok;
- PayPal completed capture bez lokalnog paid/issuance napretka, dispute bez
  lifecycle promene ili account limitation/payout problem;
- Master/CMS u grace/maintenance/unavailable;
- signing key/keyset/cert blizu isteka;
- domain proof failure skok;
- e-mail `unknown`/delivery backlog i tokeni blizu isteka;
- backup failure ili restore drill zastareo;
- desired/installed package/hash mismatch;
- log redaction/secret scanner incident.

Svaki alarm mora biti testiran kontrolisanim staging događajem i imati owner-a,
severity, SLO, runbook link i suppression/maintenance proceduru.

## 9. Threat-model review

Obavezno obuhvatiti:

- supply-chain/package/tag/key kompromitaciju;
- registry token exfiltration;
- worker HMAC replay/target confusion;
- arbitrary path/command/service/DB target injection;
- build-time secret/network pristup;
- DB credential broker/pipe impersonation;
- stale epoch/generation/callback i response loss;
- DNS rebinding/SSRF/domain takeover;
- payment webhook forgery/duplicate/out-of-order/partial capture;
- delivery token/log/referrer/APM curenje;
- malicious admin/overprivileged runtime;
- backup/secret mismatch i cloned installation identity;
- key compromise/rotation failure;
- cloud provider/CI/release authority trust.

Critical/high nalazi su NO-GO dok nisu popravljeni ili formalno prihvaćeni sa
kompenzujućom kontrolom, owner-om i rokom.

## 10. Worker/data/ops acceptance

- [ ] Nema hardkodovanog `.nr.test`, `_test`, dva-target ili local SID/port/path
  pravila u production adapteru.
- [ ] Izabrani provider adapter ima packed deploy/health/rollback E2E.
- [ ] Worker public endpoint je exact HTTPS i mrežno ograničen.
- [ ] Target policy je strict/hash-pinovan/bez tajni.
- [ ] Secret resolver/broker-i imaju service identity ACL i rotation test.
- [ ] Baze/role/grant matrice su odvojene i drift test je zelen.
- [ ] Fresh migration, upgrade, crash recovery i incompatible rollback rade.
- [ ] DB/worker/Master/CMS restore drill je prošao.
- [ ] Log/APM redaction i secret scan su čisti.
- [ ] Svi minimalni dashboard-i/alarmi su povezani i testirani.
- [ ] Threat-model nema otvoren critical/high NO-GO.
