# PayPal Sandbox E2E runbook

Status: **P0 CODE GATE PASS / REAL SANDBOX NIJE JOŠ IZVRŠEN**

Datum specifikacije: 2026-08-14 (Europe/Belgrade)

Ovaj dokument je PayPal nastavak lokalnog
[Prompt 18 E2E dokaza](19-prompt18-e2e-evidence-2026-08-13.md). Stripe test
tok iz tog dokaza ostaje PASS i ne ponavlja se zato da bi se PayPal proglasio
spremnim. PayPal dobija sopstveni provider dokaz, sopstvene sandbox
credentiale, stvarne PayPal Sandbox API pozive i stvarne sandbox webhookove.

Implementacioni prompt za izvršenje ovog runbook-a nalazi se u
[Promptu 19](21-prompt19-paypal-sandbox-e2e.md).
Lokalni rezultat, release-candidate tuple, PP-01..PP-18 matrica i trenutni
spoljašnji blocker zabeleženi su u
[Prompt 19 evidence-u](22-prompt19-paypal-sandbox-evidence-2026-08-14.md).

## 1. Šta već postoji

Webshop paket već ima:

- payment provider ključ `paypal` i checkout podešavanje;
- PayPal OAuth client-credentials poziv;
- Orders v2 `create` sa `intent=CAPTURE`;
- PayPal approval redirect i bezbednosnu proveru approval URL-a;
- return callback koji radi server-side capture;
- webhook signature verification preko PayPal API-ja;
- refund poziv nad PayPal capture ID-em;
- pending-payment resume akciju;
- payment reducer, fulfillment outbox, license issue i delivery infrastrukturu.

Postojeći testovi potvrđuju pojedine domenske i fixture ugovore, ali ne
potvrđuju realan PayPal Sandbox tok. Zato se u evidence-u ne sme napisati da je
PayPal E2E PASS pre završetka svih obaveznih stavki ispod.

## 2. P0 code gate pre realnog Sandbox testa

Prompt 19 implementacija u Webshop `0.6.25`, commit
`95002515c2eee56f9c4fe31b4a1a2c082bf2bea3`, zatvorila je sledeći code gate i
potvrdila ga provider fixture, route/contract i PostgreSQL integration testovima.
Lista ostaje autoritativan zahtev i za buduće regresije; realan Sandbox dokaz
se i dalje izvršava odvojeno.

Pre Sandbox browser testa obavezno:

1. Direktan PayPal capture i podržani webhookovi moraju emitovati kompletan
   `NormalizedPaymentEventV2`, bez oslanjanja na legacy normalizer.
2. `PAYMENT.CAPTURE.COMPLETED` mora nositi:
   - `paymentReference` jednak PayPal order ID-u;
   - `captureReference` jednak autoritativnom PayPal capture ID-u;
   - `transactionReference` jednak capture ID-u ili drugom dokumentovanom
     autoritativnom financial ID-u;
   - `captureMode=delta`, stvaran positive amount/currency;
   - stvarno PayPal `create_time` kao `providerEventCreatedAt`;
   - stabilan provider event ID.
3. `CHECKOUT.ORDER.APPROVED` i `PAYMENT.CAPTURE.PENDING` ne smeju sami izdati
   licencu. Izdavanje je dozvoljeno tek posle completed capture činjenice.
4. Refund događaj mora imati PayPal refund ID kao `adjustmentReference`,
   originalni order/capture binding, amount/currency, provider vreme i
   pending/completed/failed semantiku bez duplog refund agregata.
5. PayPal dispute/chargeback događaji moraju biti mapirani na postojeći
   `dispute_opened|dispute_won|dispute_lost` ugovor prema zvaničnim payloadima,
   ili provider ostaje production NO-GO dok postoji dokumentovan, alarmiran i
   testiran fail-closed/manual-review tok. Nepoznat događaj se samo auditovano
   ignoriše i nikad ne menja finansijsko stanje.
6. `rawSafeMetadata` mora biti allowlistovan. Ne čuvati ceo PayPal order,
   payer email, adresu ili raw webhook kao navodno bezbedan metadata objekat.
   Originalni webhook može postojati samo u već definisanom šifrovanom inbox
   polju sa retention pravilom.
7. Lokalni confirmation token u return URL-u mora dobiti ime koje se ne sudara
   sa PayPal `token=<PAYPAL_ORDER_ID>` parametrom. Callback proverava da PayPal
   `token` odgovara durable `providerReference` pre capture-a.
8. `WEBSHOP_PAYPAL_API_BASE_URL` mora fail-closed pratiti mode:
   - test: `https://api-m.sandbox.paypal.com`;
   - live: `https://api-m.paypal.com`;
   - production ne prihvata proizvoljan override koji bi primio OAuth secret.
9. Dodati fixture/contract testove za create, approved, pending, completed,
   declined/denied/failed, partial/full refund, duplicate, unknown event,
   malformed/missing verification headere, pogrešan verification status,
   return-token mismatch i redakciju PII-ja.

Ovaj P0 gate je **PASS-LOCAL**. To nije provider-real Sandbox PASS niti dozvola
za PayPal Live.

## 3. Izolacija testa

Ne menjati niti brisati Prompt 18 Stripe dokaz, `WEB-1008`, postojeći client
entitlement ili aktivnu client instalaciju da bi se napravilo mesto za PayPal.

Koristiti jedno od sledećeg, ovim redosledom:

1. novi disposable development customer target sa zasebnim domenom, bazom,
   installation identitetom, deployment root-om i worker policy redom;
2. potpuno novo izolovano okruženje sa istim četiri-servisa contractom;
3. postojeći client target samo uz zasebno operatorsko odobrenje, prethodni
   verifikovan backup i dokumentovan restore — nije podrazumevana opcija.

Ako se dodaje development domen, mora biti eksplicitno dodat u development-only
domain allowlistu i zabranjen u staging/production profilu. Worker ne sme dobiti
arbitrary request-provided path, service ili komandu samo radi ovog testa.

## 4. PayPal Sandbox provisioning

**MANUAL/EXTERNAL:**

1. U PayPal Developer Dashboard-u napraviti ili izabrati REST aplikaciju u
   Sandbox režimu.
2. Koristiti Sandbox Business nalog kao prodavca i zaseban Sandbox Personal
   nalog kao kupca.
3. Sačuvati client ID, client secret i naloge isključivo u test secret store-u.
4. Napraviti Sandbox webhook za tačnu javno dostupnu HTTPS rutu:

       POST https://<paypal-e2e-ingress>/api/webshop/payments/webhooks/paypal

5. Pretplatiti webhook najmanje na podržane capture/order/refund događaje iz P0
   mape. Dispute događaje uključiti kada je njihovo V2 mapiranje implementirano.
6. Sačuvati samo webhook ID/reference u evidence-u; ne secret ili Sandbox
   lozinke.

PayPal ne može da pozove `vendor.nr.test`. Preporučen dokaz je javni staging
origin. Privremeni tunnel je dozvoljen samo za izolovani development E2E ako:

- izlaže samo potreban HTTPS webhook path;
- ne izlaže dashboard/admin/DB/worker;
- ne menja body ili obavezne PayPal headere;
- ima vremenski ograničen URL/credential i gasi se posle testa;
- njegov URL nije production dokaz niti se commituje.

PayPal Webhook Simulator je samo reachability pomoć. Njegovi mock događaji se
ne mogu potvrditi pozivom PayPal `verify-webhook-signature` API-ja i zato nisu
zamena za stvaran sandbox payment webhook.

## 5. Vendor test konfiguracija

U vendor runtime secret store-u, bez ispisa vrednosti:

```text
WEBSHOP_PAYMENTS_MODE=test
WEBSHOP_PAYPAL_CLIENT_ID=<sandbox client ID>
WEBSHOP_PAYPAL_CLIENT_SECRET=<sandbox secret>
WEBSHOP_PAYPAL_WEBHOOK_ID=<exact sandbox webhook ID>
WEBSHOP_PAYPAL_API_BASE_URL=https://api-m.sandbox.paypal.com
```

API base može biti izostavljen ako kod za `test` bira isti zvanični endpoint.
Za determinističan prolaz omogućiti PayPal u Webshop Settings. Stripe može
ostati konfigurisan, ali test narudžbina mora eksplicitno izabrati PayPal i
durable payment red mora imati `providerKey=paypal`.

Pre browser toka dokazati:

- env validation, typecheck, test i production build su zeleni;
- provider status prikazuje PayPal kao ready;
- OAuth token poziv ide samo na sandbox host;
- webhook ID pripada istoj Sandbox aplikaciji;
- egress/CSP dozvoljava samo potrebne PayPal HTTPS hostove;
- logovi ne sadrže Authorization header, client secret ili Sandbox lozinku.

## 6. Glavni real-Sandbox E2E

### 6.1 Purchase intent i checkout

1. Na disposable customer CMS-u pokrenuti `Buy webshop license`.
2. Dokazati isti signed POST/domain/JTI/catalog/SKU ugovor kao u Promptu 18.
3. Izabrati kontrolisani SKU, količinu 1 i PayPal kao payment metodu.
4. `:authorize-payment` i `:commit-payment-authorization` moraju nositi exact
   `paymentProvider=paypal` i isti PayPal order/provider checkout ref.
5. Jedan checkout submit pravi tačno jedan PayPal Sandbox order uz stabilan
   `PayPal-Request-Id`; response-loss/retry ne pravi drugi order.
6. Browser redirect mora ići na HTTPS `paypal.com`/`*.paypal.com` approval URL,
   konkretno Sandbox host za ovaj test. Lažni sibling host i HTTP URL padaju.

### 6.2 Buyer approval, return i capture

1. Prijaviti se Sandbox Personal buyer nalogom, ne stvarnim PayPal nalogom.
2. Potvrditi test kupovinu.
3. PayPal vraća browser na vendor capture callback.
4. Callback proverava lokalni order token i PayPal order token binding, zatim
   radi server-side capture sa stabilnim idempotency ključem.
5. Povratak callback-a i stvarni webhook smeju stići bilo kojim redosledom.
   Samo jedan unique capture ulazi u aggregate.
6. Konačno stanje mora biti:
   - payment `paid` sa captured totalom jednakim order totalu;
   - order/fulfillment `completed/fulfilled` po postojećem ugovoru;
   - jedna canonical capture evidence stavka sa PayPal capture ID-em;
   - jedan license issue operation i tačno jedan Master entitlement;
   - secure delivery bez raw licence u e-mailu/logu/evidence-u.
7. Disposable customer tim ključem završava activation i worker deployment u
   `ready`, bez `.private` u runtime release-u.

### 6.3 Autoritativni provider dokaz

U PayPal Sandbox Business nalogu i lokalnoj bazi proveriti isti tuple:

- PayPal order ID;
- PayPal capture ID;
- amount/currency/status `COMPLETED`;
- Webshop order/payment ID;
- purchase intent JTI i payment authorization ID;
- payment aggregate/capture evidence hash;
- Master entitlement ID;
- bez buyer PII-ja u evidence dokumentu.

## 7. Obavezna PayPal test matrica

| ID | Scenario | Vrsta dokaza | Očekivanje |
| --- | --- | --- | --- |
| PP-01 | OAuth + create order | real Sandbox | Jedan order, sandbox endpoint i stabilan request ID. |
| PP-02 | Buyer approve + return capture | real Sandbox/browser | Jedan completed capture i jedna licenca. |
| PP-03 | Stvarni signed completed webhook | real Sandbox | Verification `SUCCESS`; isti capture se deduplikuje. |
| PP-04 | Webhook pre return / return pre webhook | dva realna prolaza ili kontrolisan fault harness | Redosled ne menja cardinality ili finalni rezultat. |
| PP-05 | Buyer cancel | real Sandbox/browser | Nema capture/licence; pending order se može bezbedno nastaviti ili isteći po policy-ju. |
| PP-06 | Prekid browsera pa Continue PayPal payment | real Sandbox/browser | Koristi isti allowlistovan approval URL i isti PayPal order. |
| PP-07 | Duplicate webhook/redelivery | real Sandbox resend gde je dostupan | `duplicate=true`/ekvivalent; nema drugog capture-a, maila ili licence. |
| PP-08 | Capture timeout/response loss | kontrolisan integration harness + sandbox gde je bezbedno | Retry sa istim request ID-em, bez double capture-a. |
| PP-09 | Invalid/missing PayPal headers | fixture/integration | Odbijeno pre business mutacije i pre nepotrebnog OAuth poziva. |
| PP-10 | Verification status nije `SUCCESS` | fixture/integration | HTTP failure, audit, bez payment mutacije. |
| PP-11 | Forged/mismatched PayPal return token | browser/route integration | Odbijeno, capture API se ne poziva. |
| PP-12 | Amount/currency/order mismatch | fixture/DB integration | Event failed/manual reconciliation; nema issuance-a. |
| PP-13 | `PENDING`, denied/failed i unknown event | fixture + podržani Sandbox negative test | Nema licence; unknown je auditovano ignored. |
| PP-14 | Full refund | real Sandbox API + webhook | Jedan refund; entitlement lifecycle/revalidation daje očekivanu revoke odluku. |
| PP-15 | Partial refund | real Sandbox API ako proizvod/policy dozvoljava + DB dokaz | Aggregate je `partially_refunded`; nema over-refund-a. |
| PP-16 | Duplicate refund/response loss | integration + Sandbox retry | Jedan adjustment po PayPal refund ID-u. |
| PP-17 | Dispute open/updated/resolved u korist kupca i prodavca | zvanični fixture + real Sandbox dispute gde je dostupan nalogu | `CUSTOMER.DISPUTE.*` se vezuje za originalni seller transaction/capture i daje suspend/restore/revoke po reducer ugovoru. Fixture sam nije provider-real PASS. |
| PP-18 | PII/secret scan | log/APM/DB evidence scan | Nema secret-a, payer adrese/e-maila, approval tokena ili raw licence u redigovanom evidence-u. |

Real Sandbox i fixture dokaz moraju biti označeni odvojeno. Fixture PASS se ne
predstavlja kao provider webhook/capture PASS.

## 8. Regression matrica posle izmene adaptera

Pokrenuti najmanje:

```powershell
cd D:\nr_cms\.private\webshop
npm run typecheck
npm run test
npm run test:payment:db
npm run build:check
npm run pack:verify
```

Zatim u root CMS-u pokrenuti relevantne typecheck/test/build i payment/fulfillment
DB integration gate-ove. Ako package bytes budu promenjeni, potreban je novi
SemVer, clean release-authority build, hosted package publish, Master
import/publish i kontrolisan vendor redeploy pre realnog browser testa. Ne
patchovati aktivni `node_modules`.

## 9. Evidence paket

Napraviti novi dated evidence MD; ne prepisivati Prompt 18 dokaz. Dozvoljeno je:

- source commit, package version/digest i Master release ID;
- redigovan PayPal Sandbox app/webhook ID;
- order/capture/event/refund ID i amount/currency;
- Webshop order/payment/authorization/JTI/aggregate ID;
- entitlement/activation/operation/job ID;
- test imena, brojevi PASS/FAIL i run ID;
- rezultat secret/PII skena.

Zabranjeno je zapisati client secret, access token, buyer password, kompletan
approval URL/token, raw webhook, payer email/adresu ili raw licencni ključ.

## 10. Definition of Done

PayPal Sandbox E2E je PASS tek kada:

- P0 V2 capture/refund/return/redaction gapovi imaju regression testove;
- PP-01 do PP-18 imaju dokaz; ako PayPal nalog/Sandbox ne izloži realan dispute
  scenario, PP-17 ostaje eksplicitan production NO-GO sa testiranim
  manual-review/lifecycle planom, a ne PASS;
- najmanje jedan stvarni Sandbox payment i stvarni verifikovani webhook daju
  istu jednu captured financial činjenicu;
- jedna PayPal kupovina daje jednu licencu i jedan disposable customer `ready`
  deployment;
- refund/revalidation/compensation ne stvaraju duplu licencu;
- Stripe Prompt 18 regression ostaje zelen;
- svi secret/PII podaci su redigovani;
- evidence dokument jasno kaže `Sandbox`, nikad `live` ili production PASS.

Do tada je status **PAYPAL SANDBOX E2E NOT PROVEN**.

## 11. Zvanične PayPal reference

- [Sandbox testing guide](https://developer.paypal.com/tools/sandbox/)
- [REST API i Sandbox nalozi](https://developer.paypal.com/api/rest/)
- [Orders v2 API](https://developer.paypal.com/docs/api/orders/v2/)
- [REST idempotency](https://developer.paypal.com/api/rest/reference/idempotency/)
- [Webhook signature verification](https://developer.paypal.com/api/webhooks/v1/verify-webhook-signature-post/)
- [Webhook Simulator ograničenja](https://developer.paypal.com/api/rest/webhooks/simulator/)
- [Sandbox negative testing](https://developer.paypal.com/tools/sandbox/negative-testing/request-headers/)
