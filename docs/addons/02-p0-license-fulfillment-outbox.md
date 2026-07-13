# Faza 02 — P0 pouzdani license fulfillment i outbox

> Finalna verifikacija 2026-07-12: **implementacija postoji, acceptance nije zatvoren**. Lease/stale-worker i data-invariant testovi prolaze; nema staging response-loss/queue-recovery/DLQ drill-a, a legacy plaintext license pool putanja ostaje aktivna. Videti [11-final-verification-report.md](./11-final-verification-report.md).

## Cilj

Obezbediti da potvrđeno plaćeni addon order proizvodi tačno jedan vendor entitlement, da prekid mreže ili procesa ne izgubi isporuku i da order postane `completed` tek kada je stvarna licenca bezbedno sačuvana i dostupna kupcu.

## Zavisnosti

- Finansijsko stanje i downstream događaji iz faze 01.
- Stabilan `/api/v1/entitlements` idempotency contract iz faze 03.
- Redaction/encryption smernice iz faze 07 treba primeniti odmah za nove kolone, iako je faza 07 širi P1 posao.

## Glavni moduli za izmenu

- `D:\nr_cms\.private\webshop\src\data\webshop-orders.ts`
- `D:\nr_cms\.private\webshop\src\data\webshop-order-domain.ts`
- `D:\nr_cms\.private\webshop\src\data\webshop-license-server-issues.ts`
- `D:\nr_cms\.private\webshop\src\data\webshop-license-server-api.ts`
- `D:\nr_cms\.private\webshop\src\data\webshop-order-emails.ts`
- `D:\nr_cms\app\api\cron\webshop-license-issues\route.ts`
- `D:\nr_cms\vercel.json`
- `D:\nr_cms\db\schema.ts`
- novi worker/outbox moduli i migration/test fajlovi.

## Ciljni fulfillment model

### Item status

Dodati first-class `fulfillmentStatus` na `webshop_order_items`, umesto da se autoritativni status krije samo u `fulfillmentDataSnapshot` JSON-u:

```text
not_required
pending
processing
fulfilled
failed
canceled
revoked
```

Pri kreiranju order item-a:

- physical item → `pending` ako zahteva shipping;
- digital download bez dodatne obaveze → prema stvarnom download entitlement toku;
- external license-server item → `pending`;
- service koji ne zahteva fulfillment → `not_required`.

### Order agregacija

Jedna funkcija treba da izvede order stanje iz paymenta i svih item-a:

```ts
deriveOrderLifecycle({ payment, items, physicalFulfillments })
```

Minimalna pravila:

- payment nije captured → order nije `completed`;
- bilo koji obavezni item `pending|processing|failed` → order nije `completed`;
- svi item-i `fulfilled|not_required` i payment captured → `completed`;
- `failed` mora biti vidljiv administratoru i kupcu kao recovery stanje, ne sakriven u JSON-u;
- mixed physical + digital order se završava tek nakon obe vrste fulfillmenta;
- full refund/chargeback može prebaciti fulfillment u `revoked`, ali audit/history se ne brišu.

## DB migracija

### `webshop_order_items`

Dodati:

- `fulfillment_status text`;
- `fulfilled_at timestamptz`;
- `fulfillment_failure_code text`;
- `fulfillment_last_error text` sa ograničenom/redigovanom vrednošću;
- `fulfillment_version integer not null default 0`.

Backfill status iz product type-a, postojećeg `fulfillmentDataSnapshot` i issue reda. Ne postaviti `fulfilled` samo zato što je order trenutno `completed`; ako issue nije `issued`, backfill mora označiti `failed` ili `pending` i generisati reconciliation izveštaj.

### `webshop_license_server_issues`

Dodati:

- `central_entitlement_id uuid/text` prema centralnom contract-u;
- `desired_status text not null default 'active'` sa `active|suspended|revoked`;
- `remote_status text not null default 'not_issued'` sa `not_issued|active|suspended|revoked|unknown`;
- `request_hash text`;
- `contract_version integer`;
- `lease_token uuid`;
- `lease_expires_at timestamptz`;
- `next_attempt_at timestamptz not null default now()`;
- `max_attempts integer not null`;
- `last_http_status integer`;
- `last_request_id text`;
- `dead_lettered_at timestamptz`;
- `completed_at timestamptz`;
- `encrypted_license_key text` i `license_key_kid text` ako se ključ i dalje čuva;
- `signed_entitlement text` ili referencu na bezbedno skladište;
- `response_signature_kid text`;
- `delivered_at timestamptz`;
- `revoked_at timestamptz`.

Staro `licenseKey` polje ne brisati u prvom deploymentu. Novi tok ne sme više pisati plaintext u njega.

`desiredStatus` je lokalna poslovna namera, a `remoteStatus` poslednje potvrđeno centralno stanje. Refund tokom issue-a zato može odmah postaviti `desiredStatus=revoked`; čak i ako in-flight issue završi kao `remoteStatus=active`, ključ se ne isporučuje i durable revoke komanda ostaje obavezna. Zakasneli issue success nikada ne vraća `desiredStatus` na active.

### `webshop_license_server_operations`

Za konkretne cross-service license komande koristiti domain-specific operation outbox:

```text
id uuid primary key
issue_id uuid not null
operation issue|suspend|revoke|reactivate|renew
reason text not null
source_type text not null
source_id text not null
idempotency_key text not null
request_hash text not null
request_snapshot jsonb redigovan
response_snapshot jsonb redigovan
status pending|processing|retry|succeeded|canceled|dead_letter
attempt_count, max_attempts
next_attempt_at
lease_token, lease_expires_at
last_attempt_at, last_http_status
last_error_code, last_error_message
completed_at, created_at, updated_at
UNIQUE(idempotency_key)
INDEX(status, next_attempt_at, created_at)
```

Idempotency key treba da bude izveden iz stabilne poslovne operacije:

```text
webshop-license-op:v1:{issueId}:{operation}:{sourceType}:{sourceId}
```

Originalni issue idempotency key se nikada ne menja tokom retry-ja. `sourceType/sourceId` omogućavaju da isti refund/chargeback event ne napravi dve revoke operacije, dok drugi legitimni lifecycle događaj ostaje zasebna komanda.

### `webshop_outbox_events`

Dodati generičku lokalnu outbox tabelu:

- `id uuid`;
- `event_type`;
- `aggregate_type`, `aggregate_id`;
- `deduplication_key`;
- `payload jsonb` — bez plaintext secret-a;
- `status=pending|processing|completed|failed|dead_letter`;
- `attempt_count`, `max_attempts`;
- `next_attempt_at`;
- `lease_token`, `lease_expires_at`;
- `last_error_code`, `last_error_message`;
- `created_at`, `processed_at`;
- unique `deduplication_key`;
- indeks `(status, next_attempt_at)`.

Generička outbox tabela ostaje za lokalne notification/recalculation/install događaje. Cross-service license mutation koristi `webshop_license_server_operations`. Lokalni event tipovi uključuju:

- `order.fulfillment_recalculate`;
- `order.customer_notification_requested`.

## Kreiranje issue-a

U istoj DB transakciji koja payment prvi put dovodi u captured stanje:

1. Identifikovati sve order item-e sa external license policy-jem.
2. Za svaki item uraditi idempotentni insert issue reda sa stabilnim key-em izvedenim iz order item identiteta i contract verzije, ne iz vremena ili pokušaja.
3. Postaviti item fulfillment na `pending`.
4. Insertovati `issue` red u `webshop_license_server_operations` sa unique idempotency key-em.
5. Postaviti order na `processing`, ne `completed`.
6. Commit.

Ne pozivati centralni servis sinhrono unutar payment DB transakcije. Opcioni post-commit "fast path" sme samo da probudi isti durable worker; ne sme imati zaseban business kod.

## Atomic worker claim

Worker u kratkoj transakciji claim-uje `webshop_license_server_operations` redove:

1. Bira jedan/dograničen broj `pending|failed` redova čiji je `nextAttemptAt <= now` i lease istekao.
2. Koristi `FOR UPDATE SKIP LOCKED`.
3. Postavlja novi nasumični `leaseToken`, `processing`, `leaseExpiresAt`, povećava attempt count.
4. Commituje pre HTTP poziva.

Posle HTTP poziva completion update mora imati uslov:

```text
WHERE id = :id
  AND lease_token = :leaseToken
  AND status = 'processing'
```

Stale worker sa starim tokenom ne sme promeniti red.

Lease recovery bira `processing` redove sa isteklim lease-om i vraća ih u retry stanje. Nijedan red ne sme zauvek ostati `issuing/processing` samo zbog process crash-a.

## Retry politika

Klasifikovati greške:

| Rezultat | Akcija |
|---|---|
| Timeout, DNS, connection reset | Retry exponential backoff + jitter |
| HTTP 429 | Retry prema `Retry-After` |
| HTTP 500/502/503/504 | Retry |
| HTTP 401 | Ne beskonačno retry; alert za credential/config problem |
| HTTP 403 scope | Dead-letter/config alert |
| HTTP 404 SKU | Dead-letter/catalog mismatch |
| HTTP 409 idempotency conflict | Dead-letter security/data-integrity incident |
| Invalid JSON/signature | Ne prihvatati; zadržati poslednje dobro stanje i alertovati |
| 200/201 validan potpis | Conditional success update |

Preporučeni backoff: 30 s, 2 min, 10 min, 1 h, 6 h, zatim periodični retry do definisanog poslovnog maksimuma. Plaćena neisporučena obaveza ne sme tiho biti obrisana posle max pokušaja; prelazi u DLQ i urgentni admin alert.

## Idempotency i izgubljen odgovor

`Idempotency-Key` za issue mora ostati isti tokom celog života order item-a. Request body se canonicalizuje i hash čuva lokalno.

Scenario:

1. Centralni servis kreira entitlement i commit-uje.
2. HTTP odgovor se izgubi.
3. Worker lease istekne/retry-uje isti request.
4. Centralni servis vidi isti key i isti hash.
5. Vraća originalni entitlement ID i isti semantički rezultat.
6. Lokalni worker upisuje success.

Novi key se ne generiše pri retry-ju.

## Obrada uspeha

U jednoj lokalnoj transakciji:

1. Conditional update operation reda preko lease tokena.
2. Sačuvati `centralEntitlementId`, potpisani entitlement, fingerprint i lifecycle datume na issue aggregate-u.
3. Postaviti `remoteStatus=active`, pa ponovo pročitati aktuelni `desiredStatus` pod lock-om.
4. Ako je `desiredStatus=active`, enkriptovati potreban ključ, redigovati snapshot i dozvoliti delivery.
5. Ako je `desiredStatus=suspended|revoked`, ne isporučiti ključ i kreirati odgovarajuću dependent operation komandu.
6. Postaviti item `fulfilled` samo kada je željeno i udaljeno stanje aktivno; inače zadržati/reizvesti odgovarajući status.
7. Insertovati `order.fulfillment_recalculate` i notification outbox.
8. Ponovo izvesti order status; `completed` samo ako su svi uslovi zadovoljeni.
9. Commit.

Email/portal obaveštenje se izvršava posle commit-a preko outbox-a. Ne duplirati email pri ponovljenom worker success-u.

## Refund, chargeback i issue race

Definisati sledeća pravila:

- Refund pre slanja issue-a: `desiredStatus=revoked`, pending issue operation postaje `canceled` i centralni issue se ne šalje.
- Refund dok je issue request u letu: `desiredStatus=revoked`; centralni issue sme završiti, ali rezultat se ne isporučuje i revoke operation mora dovesti `remoteStatus` u revoked.
- Refund posle issue-a: queue-ovati idempotentni lifecycle zahtev za poznati `centralEntitlementId`.
- Chargeback opened: prema politici suspendovati entitlement.
- Chargeback lost: opozvati entitlement.
- Chargeback won: ne vraćati automatski revoked entitlement bez eksplicitne, auditovane reinstate odluke.
- Worker mora proveriti aktuelni financial state pre slanja, ali centralni servis ostaje odgovoran da lifecycle komande primeni monotono/idempotentno.

## Policy kada Webshop addon licenca istekne

Worker mora razlikovati:

- novu prodaju, koja je zabranjena;
- već potvrđeno plaćenu obavezu, koja mora biti ispunjena;
- refund/chargeback/revoke obavezu, koja uvek mora biti obrađena.

Zato worker ne treba slučajno da zaobilazi addon gate direktnim private importom. Addon manifest/capability treba eksplicitno deklarisati `settle_existing_obligations`, a host policy to dozvoljava u expired/read-only režimu.

## Scheduler/cron

Queue/outbox worker je primarni mehanizam. Cron je safety-net:

- route mora podržati `GET` ako je Vercel Cron;
- mora biti u `vercel.json`;
- autentifikacija koristi poseban cron secret i timing-safe proveru gde je primenljivo;
- jedan cron poziv procesira bounded batch i ne zavisi od dugog serverless request-a;
- cron vraća metrike broja claimed/succeeded/retried/dead-letter redova;
- ruta poziva registrovanu addon job capability, ne `@/.private` source.

## Manual recovery ekran

Admin-only ekran treba da prikaže bez secret-a:

- order/order item;
- payment status;
- issue status i central entitlement ID;
- attempt count, last error code, next attempt;
- lease status;
- request ID/correlation ID;
- akcije `retry now`, `cancel pending`, `reconcile central status`, `re-send notification`.

Akcije moraju biti idempotentne i auditovane. `retry now` ne menja idempotency key.

## Backfill postojećih podataka

Napraviti read-only preflight izveštaj:

- completed digital orders bez issued issue-a;
- issue `issuing` stariji od očekivanog lease-a;
- `desiredStatus != remoteStatus`, posebno refundovan/chargeback order sa udaljeno aktivnim entitlementom;
- duplicate/konfliktni order item/license fingerprint odnosi;
- refundovan/chargeback order sa issued licencom;
- plaintext license key lokacije.

Zatim:

1. Backfill item fulfillment status.
2. Stare `issuing` redove vratiti u retry samo posle centralne idempotency provere.
3. Kreirati nedostajuće reconciliation outbox redove sa deterministic dedup key-em.
4. Ne slati email automatski za istorijske redove dok admin ne potvrdi kampanju.
5. Postepeno enkriptovati/maknuti plaintext kopije prema fazi 07.

## Test-first redosled

Dodati integration/E2E testove:

1. Payment success + centralni 503 → `paid + processing`, ne completed.
2. Centralni commit + izgubljen odgovor → retry vraća isti entitlement.
3. Dva workera claim-uju batch → svaki issue samo jednom.
4. Stale worker ne može prepisati success sa failed.
5. Process crash posle claim-a → lease recovery ponavlja posao.
6. Stari `issuing` red se oporavlja.
7. 429 poštuje Retry-After.
8. 403 scope i 409 conflict završavaju u DLQ/alertu.
9. Mixed physical + license order se ne završava prerano.
10. Email outbox šalje tačno jedno obaveštenje.
11. Refund pre issue-a otkazuje issue.
12. Refund u letu završava sa centralno opozvanim entitlementom.
13. Expired Webshop blokira novu kupovinu, ali obrađuje postojeći paid issue i refund.
14. Cron GET route radi iz production-like konfiguracije.
15. Stale issue success pri `desiredStatus=revoked` ne isporučuje ključ i ne menja desired stanje.

## Acceptance kriterijumi

- Nema direktnog post-commit issue business toka van outbox worker-a.
- Nijedan paid order sa obaveznom neizdatom licencom nije `completed`.
- Queue age i DLQ imaju metriku/alert.
- Worker je bezbedan pod najmanje 10 paralelnih instanci u integration testu.
- Izgubljen odgovor ne stvara drugu licencu.
- Refund/chargeback na kraju menjaju centralni entitlement.
- Puni ključevi nisu prisutni u response snapshot-u, logu ili order item JSON-u novog toka.

## Rollout i rollback

1. Deploy additive schema i backfill alat.
2. Dual-write postojeći issue + novi outbox bez slanja iz V2 worker-a.
3. Uporediti broj payment-captured item-a i kreiranih outbox redova.
4. Uključiti V2 worker na staging-u i jednom internom proizvodu.
5. Zaustaviti V1 direct worker pre globalnog V2 uključivanja da dva toka ne rade paralelno.
6. Uključiti `WEBSHOP_LICENSE_OUTBOX_V2`.
7. Pratiti queue age, issue latency, duplicate conflict i completion delay.

Rollback isključuje V2 claim worker, ali ne briše outbox/issue podatke. V1 direct worker se ne vraća ako centralni contract ili statusi više nisu kompatibilni; koristi se forward-fix ili kontrolisani compatibility adapter.

## Implementation record — 2026-07-12

Implementiran je additive `0081_webshop_license_fulfillment_outbox` migration. On
uvodi first-class item fulfillment status/version i proširuje issue agregat sa
desired/remote statusom, central entitlement ID-jem, request hashom, lease/retry
poljima i šifrovanim storage poljima za novi tok. Uvedene su i durable
`webshop_license_server_operations` i `webshop_outbox_events` tabele.

V2 payment reducer pri prvom capture-u u istoj lokalnoj transakciji kreira issue
i `issue` operation red, označava addon item kao pending i order kao processing.
Worker claim koristi PostgreSQL `FOR UPDATE SKIP LOCKED`, lease token i
conditional completion. Centralni V2 issue koristi stabilni idempotency ključ;
retry zadržava isti ključ. Success ne čuva plaintext ključ u issue response
snapshot-u niti order-item JSON-u, već samo enkriptovanu vrednost i redigovani
key reference. Refund/chargeback menjaju desired status i stvaraju/canceluju
lifecycle operacije pod istim financial reducer lock-om.

Notification se enqueue-uje tek po fulfillment commit-u i lokalni outbox ga
obrađuje odvojeno. Cron podržava GET/POST, bounded batch i timing-safe secret
proveru; koristi privremeni izolovani adapter bez statičkog public-to-private
importa do formalnog job capability contract-a iz faze 05.

Ovaj zapis **ne zatvara fazu 02**. Potvrđeni su pure fulfillment/retry scenariji,
Webshop unit suite i PostgreSQL 10-worker SKIP LOCKED/stale-token test. Nedostaju
application-level E2E fixture-i koji stvarno seed-u kompletan Webshop order i
pozivaju centralni V2 test servis za response-loss, refund-in-flight, DLQ/manual
retry, expired-addon i mixed physical/digital scenarije; admin recovery UI i
queue-age/DLQ metrics/alerti takođe nisu završeni. `WEBSHOP_LICENSE_OUTBOX_V2`
ostaje `false` dok ti dokazi ne prođu.
