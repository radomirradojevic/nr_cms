# Prompt 11 — Runtime aktivacije i kompletan lifecycle: as-built evidence

Datum poslednje provere: 2026-08-20. Ovo je source, contract i izolovani
PostgreSQL dokaz; nije production publish/deploy niti live provider događaj.

## Implementirano

- V1 i V2 `activate/validate/deactivate` koriste isti runtime servis, isti
  immutable policy/profile/schema/custom-claim snapshot i obavezno proveravaju
  tačan audience. Uspešan activate/validate vraća Ed25519 Customer License
  Assertion V2 lease; maksimalni assertion TTL je 3600 s, a default clock skew
  60 s.
- Device/server fingerprint, seat ID i domain se kanonizuju pre salted SHA-256
  hashovanja. Activation token je kriptografski random, plaintext postoji samo
  u odgovoru koji ga izdaje, poredi se timing-safe i u bazi postoji samo unique
  hash. Novi activation i validation redovi ne čuvaju raw domain, platformu,
  hardware fingerprint/inventory niti proizvoljan metadata inventar.
- PostgreSQL transaction-scoped advisory lock serijalizuje aktivacije jedne
  licence. Device i server dele `maxDevices` bucket; domain i seat imaju zasebne
  limite; floating seat red prestaje da zauzima limit po isteku lease-a i validna
  provera ga produžava. Test pokreće 128 stvarnih paralelnih DB zahteva.
- `renew/suspend/resume/revoke/refund/chargeback` prolaze kroz strogu atomarnu
  state mašinu. Terminalni `revoked/refunded/chargeback` ne mogu da se resume-uju
  niti pretvore jedan u drugi. Duplikat iste terminalne akcije je idempotentan;
  renew mora stvarno produžiti expiry, a suspend/resume ne menjaju terminalno
  stanje. Terminalna tranzicija u istoj transakciji opoziva aktivne activations
  i auditira redacted reason code/hash.
- Webshop lifecycle outbox nastaje samo kada autoritativni payment reducer
  prihvati refund/dispute tranziciju (`transitionApplied`). Subscription seam
  zahteva isti literal accepted fence i validan budući expiry za renew.
  Duplicate/stale provider fact ne kreira novu operaciju; kasni dispute-won ne
  može oživeti refundovanu/chargeback licencu.
- Local V2 capability i remote NRLS2 adapter šalju isti `LifecycleCommandV2` i
  primaju isti accepted/status/receipt model. Svaka Webshop lifecycle operacija
  čuva sopstveni issuer operation ID: timeout/restart prelazi na poll, nikad na
  novi lifecycle/issue rezultat. Retry, lease, dead-letter i admin replay ostaju
  u postojećem durable worker-u. Delivery notification worker claim-uje dospele
  redove jednim PostgreSQL `FOR UPDATE SKIP LOCKED` CTE-om, pa paralelni workeri
  ne mogu dvaput preuzeti isti e-mail/reveal tok.
- Refund/chargeback pre završetka issue-a ne može napraviti orphan posle
  nepoznatog timeout-a: durable issue se reconciliše, receipt se sačuva, delivery
  je blokiran kada desired status nije active, pa terminalna lifecycle operacija
  završava isti license ID. Terminalni rezultat opoziva još aktivne delivery
  tokene.
- `online_rejected` odmah odbija korišćenje. Tokom stvarnog issuer outage-a
  aplikacija može koristiti samo već potpisani i lokalno verifikovani lease do
  ranijeg od policy offline-grace kraja i business expiry-ja. Refund/revoke ne
  može retroaktivno poništiti offline dokument koji customer već poseduje;
  admin UI ovo eksplicitno prikazuje.

## Reproducibilne provere

| Komanda | Rezultat |
| --- | --- |
| `npm --prefix .private/license-server-addon run typecheck` | PASS: release + host typecheck. |
| `npm --prefix .private/license-server-addon run test:db:local` | PASS: 86/86 bez skipova; stvarni 128-way activation race, V1/V2 audience/runtime, lifecycle matrica, Master fetch outage, issuer signing outage/restore, clock/offline vektori. |
| `npm --prefix .private/webshop run typecheck` | PASS: release + host typecheck. |
| `npm --prefix .private/webshop run test` | PASS: 192/192; lifecycle/transport/payment source ugovori. |
| `npm --prefix .private/webshop run test:payment:db` | PASS: 3/3; duplicate/late financial facts i parallel over-refund ostaju terminalni. |
| `npm --prefix .private/webshop run test:fulfillment:db` | PASS: 1/1; issue timeout/restart, dva profila, atomarni delivery claim/retry/reveal plus remote suspend/resume/refund, zaseban lifecycle poll ID, token revoke i late-resume zabrana. |
| `node scripts/verify-webshop-schema-fixture.mjs --expect-hash=d54b3734a846d91f9321b90f2d78da8a5f82cd15648b828df4ba0fe0a9f31341` | PASS: migration 0010 i 64-table package schema fingerprint. |

## Acceptance mapa

| ID | Status | Dokaz |
| --- | --- | --- |
| LIFE-01 | zelen | Stroga issuer i Webshop state mašina, stable idempotency, atomic row lock, audit reason i illegal-transition dead-letter. |
| LIFE-02 | zelen za code/isolated DB | Webshop accepted refund/chargeback kreira durable lifecycle; terminalni issuer status opoziva activations i sledeći online validate odbija. |
| RUN-01 | zelen | 128 paralelnih PostgreSQL device/server aktivacija daju tačno preostali broj mesta; limit nije probijen. |
| RUN-02 | zelen | Device+server shared bucket, domain, seat i floating lease matrica; normalizovani salted hash i minimalan inventory. |
| RUN-03 | zelen | Signed TTL/skew/expiry, issuer-unavailable offline grace, online rejection i grace-expired clock vektori. |
| RUN-04 | zelen | Suspended/refunded/revoked/chargeback online odbijaju; refund opoziva aktivacije, a kasni resume završava kao konflikt bez promene licence. |

Live payment/subscription provider i production outage drill ostaju staging/release
gate-ovi. Nisu predstavljeni kao deo ovog izolovanog dokaza.
