# Prompt 19 — PayPal Sandbox E2E i payment-provider production hardening

Status izvršenja 2026-08-14: P0 kod, lokalni testovi i release candidate su
završeni; provider-real Sandbox deo čeka spoljašnje credentiale/webhook i
release/deploy odobrenje. Videti
[dated evidence](22-prompt19-paypal-sandbox-evidence-2026-08-14.md).

Ovaj fajl je copy/paste prompt za naredni implementacioni rad. Ne tvrdi da je
izvršen. Stripe Prompt 18 dokaz ostaje PASS; cilj ovog prompta je da postojeći
PayPal provider dovede do istog nivoa stvarnog sandbox dokaza, bez regresije
Stripe toka.

```text
Nastavi rad u D:\nr_cms i povezanim privatnim repozitorijumima, prvenstveno
D:\nr_cms\.private\webshop. Obavezno pročitaj i poštuj:

- D:\nr_cms\AGENTS.md
- docs/webshop_activation/README.md
- docs/webshop_activation/19-prompt18-e2e-evidence-2026-08-13.md
- docs/webshop_activation/20-paypal-sandbox-e2e-runbook.md
- docs/webshop_activation/09-lokalni-e2e-runbook.md, faze D–F
- docs/webshop_activation/production/03-stripe-live-and-email.md
- docs/webshop_activation/production/07-paypal-sandbox-and-live.md
- docs/webshop_activation/production/05-staging-canary-and-rollout.md
- docs/webshop_activation/production/06-env-matrix-and-go-live-checklist.md

Cilj:

Implementiraj i dokaži kompletan PayPal Sandbox E2E za kupovinu Webshop
licence, koristeći postojeći PayPal Orders v2 provider, stvarni PayPal Sandbox
Business/Personal nalog, stvarni signed sandbox webhook, V2 payment reducer,
Master issuance, secure delivery i disposable customer activation/deployment.
Ne implementiraj PayPal ispočetka. Audituj postojeći kod i popravi samo stvarne
gapove. Ne proglašavaj fixture/simulator PASS realnim Sandbox PASS-om.

Kritični P0 zahtevi:

1. Migriraj PayPal adapter sa legacy VerifiedPaymentEvent izlaza na kompletan
   NormalizedPaymentEventV2 za direct capture i sve podržane webhookove.
2. Completed capture mora imati stabilan PayPal order ID, capture ID,
   transaction/capture reference, stvaran provider create_time, delta amount,
   currency i unique event ID, tako da recordCaptureEvidence, aggregate freeze i
   license fulfillment rade bez compatibility praznih polja.
3. Approved/pending događaj nikada ne izdaje licencu; samo completed capture.
4. Refund mapiranje mora razlikovati pending/completed/failed, vezati refund ID
   za originalni payment/capture i ostati idempotentno.
5. Mapiraj PayPal `CUSTOMER.DISPUTE.CREATED|UPDATED|RESOLVED` lifecycle prema
   zvaničnim payloadima na dispute_opened/won/lost, uz lookup/binding originalnog
   seller transaction/capture ID-a. Izvrši i realan Sandbox dispute scenario.
   Ako konkretan nalog/Sandbox to ne omogući, uradi zvanične fixture-e, ali
   ostavi eksplicitan production NO-GO/manual-review gate dok provider-real dokaz
   ne postoji.
6. Ukloni čuvanje celog PayPal order/webhook payload-a iz rawSafeMetadata.
   Koristi strogu allowlistu bez payer PII-ja; originalni webhook samo kroz
   postojeće šifrovano inbox polje i retention ugovor.
7. Ispravi return callback contract tako da se lokalni confirmation token ne
   sudara sa PayPal token query parametrom. Pre capture-a proveri da PayPal order
   token odgovara durable providerReference. Dodaj negativne testove.
8. Zaključaj API host prema WEBSHOP_PAYMENTS_MODE: sandbox host za test, live
   host za live; production mora odbiti arbitrary override/host koji bi primio
   OAuth secret.
9. Zadrži PayPal-Request-Id idempotency za create/capture/refund i dokaži
   response-loss/duplicate ponašanje.

Testovi pre spoljašnje mutacije:

- unit/fixture testovi za create, approval URL allowlistu, approved, pending,
  completed, failed/denied, refund pending/completed/failed, duplicate, unknown,
  invalid/missing verification headers i verification_status failure;
- DB integration za capture evidence, duplicate/out-of-order, amount/currency
  mismatch, partial/full refund i najviše jednu license issue operaciju;
- route/browser test za return token/order binding i Continue PayPal payment;
- log/metadata test koji odbija payer PII, authorization/access token i raw
  licence;
- postojeći Stripe testovi i Prompt 18 payment/fulfillment regression moraju
  ostati zeleni.

Real Sandbox E2E:

1. Ne diraj postojeći client entitlement/instalaciju. Provisionuj disposable
   development/staging customer target sa zasebnim domenom, bazom,
   installation identitetom, runtime root-om i statičkom worker policy stavkom.
2. Kada je potreban korisnikov PayPal login ili credential, zaustavi se i traži
   samo minimalnu manualnu radnju. Nikada ne traži da se secret pošalje u chat,
   Git ili evidence.
3. Konfiguriši test-only WEBSHOP_PAYPAL_CLIENT_ID,
   WEBSHOP_PAYPAL_CLIENT_SECRET, WEBSHOP_PAYPAL_WEBHOOK_ID i zvanični sandbox
   API base. Webhook mora biti javni HTTPS endpoint; vendor.nr.test nije
   dostupan PayPal-u. Tunnel, ako se odobri, izlaže samo webhook path i gasi se
   posle testa.
4. Koristi Sandbox Personal buyer i Sandbox Business seller. Ne koristi stvarni
   novac ili live nalog.
5. Izvrši PP-01..PP-18 matricu iz dokumenta 20. Za real-provider scenarije
   sačuvaj redigovane PayPal order/capture/event/refund ID-eve i poveži ih sa
   Webshop payment/order/JTI/authorization/aggregate i Master entitlement ID-em.
6. Dokaži oba redosleda return/webhook ili kontrolisanim fault harnessom dokaži
   istu invariantnu obradu. Jedan PayPal capture mora napraviti tačno jednu
   licencu, jedan secure delivery i jedan ready disposable customer deployment.
7. Izvrši full refund i lifecycle/revalidation dokaz. Partial refund radi samo
   ako ga postojeći proizvod/policy dozvoljava; u suprotnom fixture + jasna
   beleška bez lažnog PASS-a.

Release pravila:

- Ne patchuj node_modules ili current runtime.
- Ako package bytes menjaju, bumpuj SemVer, napravi clean authority build,
  test/typecheck/build/pack/reproducibility dokaz, zatim stani za eksplicitno
  odobrenje pre package publish-a, Master import/publish-a i target redeploy-a.
- Ne tretiraj postojeća široka odobrenja kao novu dozvolu za eksterni publish,
  produkciju, live PayPal ili destruktivne operacije.
- Poštuj zasebne repo granice i ne commituj tuđe/unrelated izmene.

Definition of Done:

- svi P0 PayPal V2/security gapovi su ispravljeni i testirani;
- real Sandbox order, capture i signed webhook su povezani u jednu finansijsku
  činjenicu;
- jedna PayPal kupovina izdaje jednu licencu i disposable client završava ready;
- refund/reconciliation/lifecycle, duplicate i response-loss grane su dokazane;
- Stripe regression ostaje PASS;
- nijedan secret, buyer PII, approval token ili raw licenca nije u logu,
  evidence-u ili Git-u;
- napravi novi dated evidence MD u docs/webshop_activation, jasno označen kao
  PayPal Sandbox, sa PASS/FAIL za svaki PP scenario i preostalim production
  blockerima;
- ažuriraj production GO/NO-GO dokumente samo dokazanim stanjem.

Ne zaustavljaj se na planu: implementiraj, testiraj i vodi redigovan evidence.
Stani samo za neophodan PayPal login/secret provisioning, novu eksternu
mutaciju/publish ili stvarni blocker koji se ne može bezbedno rešiti lokalno.
```
