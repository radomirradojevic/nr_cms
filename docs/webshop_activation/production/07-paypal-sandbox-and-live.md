# 07 — PayPal Sandbox, live nalog i produkcijski acceptance

Status 2026-08-14: **P0 CODE GATE PASS-LOCAL; REAL SANDBOX NOT EXECUTED;
PAYPAL LIVE NO-GO.** Dated dokaz i PP matrica su u
[Prompt 19 evidence-u](../22-prompt19-paypal-sandbox-evidence-2026-08-14.md).

## 1. Uloga ovog dokumenta

PayPal je već payment provider u Webshop kodu, ali još nije dokazano da realan
PayPal Sandbox capture prolazi kroz ceo V2 payment → Master issuance → delivery
→ customer activation tok. Zato postoje dva odvojena gate-a:

1. **PayPal Sandbox E2E**, definisan u
   [dokumentu 20](../20-paypal-sandbox-e2e-runbook.md);
2. **PayPal Live canary**, dozvoljen tek posle Sandbox PASS-a i verifikovanog
   PayPal Business naloga.

Stripe Prompt 18 test ostaje validan dokaz zajedničkog payment/fulfillment
ugovora, ali ne dokazuje PayPal adapter, PayPal webhook ili PayPal operacije.

Za firmu iz Srbije PayPal je trenutno realan kandidat za live provider: PayPal
navodi Srbiju kao zemlju koja može da šalje, prima i povlači novac. To ne znači
automatsko odobrenje konkretnog naloga, kartice, valute ili proizvoda. PayPal
Business verifikacija, ograničenja naloga i prihvatljivost delatnosti ostaju
spoljašnji produkcijski gate.

## 2. Trenutni code status i NO-GO stavke

**AS-BUILT:**

- OAuth, Orders v2 create/capture, approval redirect, webhook verification,
  refund i resume postoje;
- `WEBSHOP_PAYMENTS_MODE=test|live` bira podrazumevani Sandbox/Live API host;
- potrebne env promenljive postoje u root šablonima;
- PayPal je vidljiv u Webshop Settings samo kada su credentiali i webhook ID
  spremni.

**P0 zatvoreno lokalnim Prompt 19 dokazom:**

- adapter emituje kompletan `NormalizedPaymentEventV2` sa autoritativnim
  capture/refund/dispute referencama, provider vremenom i money podacima;
- return callback razdvaja lokalni `confirmationToken` od PayPal order `token`
  parametra i proverava durable `providerReference` pre capture-a;
- `rawSafeMetadata` je stroga allowlista bez payer/payee PII-ja;
- mode/API/approval/certificate hostovi su fail-closed vezani za Sandbox ili Live;
- refund pending/completed/failed i nedvosmisleni dispute open/won/lost tokovi
  su mapirani; dvosmislen ishod ostaje manual-review;
- return/webhook isti capture, money mismatch i partial/full refund imaju
  PostgreSQL integration dokaz.

**Preostali EXTERNAL/EVIDENCE NO-GO:** stvarni Sandbox
order/capture/signed-webhook/refund, jedan entitlement i disposable deployment
još ne postoje. Sam unos env credentiala nije dovoljan; mora se izvršiti puna
matrica iz dokumenta 20.

## 3. PayPal Business nalog i operativno vlasništvo

**EXTERNAL/OPERATOR:**

1. Otvoriti PayPal Business nalog na tačne podatke firme/preduzetnika.
2. Potvrditi email, identitet, pravni naziv, adresu i druge podatke koje PayPal
   zatraži; povezati odgovarajući payout račun ili karticu.
3. Ukloniti sve account limitations i potvrditi da nalog može da prima
   komercijalne uplate u izabranim valutama.
4. Uključiti MFA i ograničiti broj administratora.
5. Definisati owner-e za API credential, webhook, refund, dispute/chargeback,
   payout i incident.
6. Proveriti PayPal Acceptable Use/restricted activity pravila za softverske i
   digitalne licence.
7. Sa knjigovođom definisati evidentiranje priliva, PayPal naknada, konverzije,
   refund-a i poreza. PayPal nije zamena za račun/fakturu i poreske obaveze.
8. Uraditi malu nezavisnu payout proveru pre otvaranja javne prodaje.

Dokaz sadrži samo status naloga, datum i owner-a. Ne čuva lični dokument,
bankovne podatke ili screenshot sa saldom/PII-jem u Git-u.

## 4. Odvajanje Sandbox i Live resursa

Sandbox i Live moraju imati zasebno:

- REST app/client ID/client secret;
- Business/Personal naloge i transakcije;
- webhook endpoint zapis i webhook ID;
- provider order/capture/refund/event ID-eve;
- dashboards/evidence i rotacionu proceduru.

Sandbox client ID/secret ne rade na produkcijskom hostu, a Live credential se ne
koristi u staging-u. Ne kopirati webhook ID iz Sandbox aplikacije u Live env.

## 5. Env matrica

### Javni staging / Sandbox

```text
WEBSHOP_PAYMENTS_MODE=test
WEBSHOP_PAYPAL_CLIENT_ID=<sandbox client ID secret reference>
WEBSHOP_PAYPAL_CLIENT_SECRET=<sandbox secret reference>
WEBSHOP_PAYPAL_WEBHOOK_ID=<exact sandbox webhook ID>
WEBSHOP_PAYPAL_API_BASE_URL=https://api-m.sandbox.paypal.com
```

### Produkcija / Live

```text
WEBSHOP_PAYMENTS_MODE=live
WEBSHOP_PAYPAL_CLIENT_ID=<live client ID secret reference>
WEBSHOP_PAYPAL_CLIENT_SECRET=<live secret reference>
WEBSHOP_PAYPAL_WEBHOOK_ID=<exact live webhook ID>
WEBSHOP_PUBLIC_BASE_URL=https://<vendor-canonical-domain>
```

`WEBSHOP_PAYPAL_API_BASE_URL` u standardnoj produkciji izostaviti, tako da kod
bira `https://api-m.paypal.com`. Ako se eksplicitno postavi, validator mora
zahtevati baš taj exact origin za `live`; nema proxy/fallback hosta.

`WEBSHOP_PAYMENTS_MODE` je trenutno zajednički mode svih online provider-a.
Zato se ne sme istovremeno ostaviti Sandbox credential jednog i Live credential
drugog providera u istom runtime-u. Provider-i koji nisu odobreni ostaju
isključeni u Webshop Settings i njihove tajne nisu provisionovane.

## 6. Live webhook

U PayPal Developer Dashboard-u, pod **Live** aplikacijom, napraviti exact HTTPS
endpoint:

```text
POST https://<vendor-canonical-domain>/api/webshop/payments/webhooks/paypal
```

Posle Prompt 19 implementacije pretplatiti samo podržane događaje:

- `CHECKOUT.ORDER.APPROVED`;
- `CHECKOUT.PAYMENT-APPROVAL.REVERSED`;
- `PAYMENT.CAPTURE.COMPLETED`;
- `PAYMENT.CAPTURE.PENDING`;
- `PAYMENT.CAPTURE.DENIED`;
- `PAYMENT.CAPTURE.REFUNDED`;
- `PAYMENT.CAPTURE.REVERSED`;
- `PAYMENT.REFUND.PENDING`;
- `PAYMENT.REFUND.FAILED`;
- `CUSTOMER.DISPUTE.CREATED`;
- `CUSTOMER.DISPUTE.UPDATED`;
- `CUSTOMER.DISPUTE.RESOLVED`.

Ne koristiti `*` u produkciji bez posebnog razloga. Svaki pretplaćeni događaj
mora biti mapped ili auditovano ignored; ignored event nikad ne menja finansije.

Endpoint/proxy mora:

- prihvatiti javni HTTPS POST bez auth cookie-ja;
- proslediti exact body i sve `PAYPAL-*` verification headere;
- ne redirectovati, keširati ili logovati body/headere;
- ograničiti veličinu tela i vreme obrade;
- proveriti obavezne headere i certificate URL pre OAuth poziva;
- potvrditi potpis preko PayPal Live verification API-ja sa exact Live webhook
  ID-em;
- durable upisati/deduplikovati event pre reducer mutacije;
- vratiti 2xx tek za accepted ili bezbedno ignored događaj.

PayPal može ponoviti neuspešnu webhook dostavu više puta. Duplicate je očekivan
input, ne incident sam po sebi; drugi capture/refund/license jeste incident.

## 7. Sandbox acceptance pre Live credentiala

Obavezno završiti sve iz [PayPal Sandbox E2E runbook-a](../20-paypal-sandbox-e2e-runbook.md),
uključujući:

- stvarni Sandbox buyer approval;
- server-side completed capture;
- stvarni signed webhook sa verification `SUCCESS`;
- oba return/webhook redosleda;
- duplicate i response-loss;
- buyer cancel i resume;
- full refund i refund webhook;
- dispute open/resolve test koji PayPal Sandbox podržava;
- PII/secret scan;
- jedan entitlement i disposable customer activation/deployment.

Webhook Simulator nije acceptance dokaz jer simulator događaji nisu povezani
sa stvarnom transakcijom i ne mogu se potvrditi istim verification API tokom.

## 8. Bezbedan Live redosled

1. Verifikovati Business nalog i Live app, ali checkout držati zatvoren.
2. U secret store postaviti Live client ID/secret i exact Live webhook ID.
3. Deployovati sa:

       WEBSHOP_PAYMENTS_MODE=live
       WEBSHOP_STOREFRONT_ENABLED=false
       WEBSHOP_CHECKOUT_ENABLED=false

4. Pokrenuti env validation, health/build, provider readiness i outbound-host
   provere bez pravljenja ordera.
5. U PayPal Dashboard-u potvrditi exact Live webhook URL/subscriptions.
6. Uključiti storefront samo interno; potvrditi Buy/purchase-intent/domain proof
   bez payment submit-a.
7. Otvoriti checkout u kontrolisanom prozoru za jedan najjeftiniji SKU.
8. Napraviti jednu odobrenu minimalnu stvarnu kupovinu sa zasebnim PayPal buyer
   nalogom. Ne koristiti Sandbox nalog ili shared operatorski seller nalog kao
   kupca.
9. Sačekati autoritativni completed capture/webhook i dokazati jedan aggregate,
   jedan entitlement, jednu delivery poruku i uspešnu customer aktivaciju.
10. Izvršiti full refund kroz Webshop/admin ugovor; proveriti PayPal status,
    refund webhook, entitlement lifecycle i revalidation.
11. Proveriti payout/fee/reconciliation prikaz i alarme.
12. Zatvoriti checkout dok owner-i ne pregledaju redigovani evidence i daju GO.

Live payment i refund mogu proizvesti naknadu i stvarne računovodstvene događaje;
zahtevaju posebno odobrenje u trenutku izvršenja.

## 9. PayPal acceptance lista

- [ ] Business nalog je verified, bez limitation-a, sa MFA i payout proverom.
- [ ] PayPal Sandbox Prompt 19 je PASS na tačnoj release verziji.
- [ ] Live client/secret pripadaju exact Live aplikaciji i nisu Sandbox vrednosti.
- [ ] Live webhook ID pripada exact Live endpoint-u.
- [ ] API/OAuth/webhook verification ide samo na official Live host.
- [ ] Approval URL je HTTPS PayPal host i return token je vezan za isti order.
- [ ] Approved/pending bez completed capture-a ne izdaje licencu.
- [ ] Completed capture daje jednu canonical capture evidence stavku.
- [ ] Return/webhook redosled i duplicate ne menjaju cardinality.
- [ ] Amount/currency/order/JTI/authorization/fence su exact usklađeni.
- [ ] Full refund i duplicate refund imaju jedan adjustment/lifecycle rezultat.
- [ ] Dispute created/resolved daje suspend/revoke/restore odluku po policy-ju.
- [ ] Paid-but-unissued, invalid signature, webhook backlog, refund/dispute i
  account limitation alarmi rade.
- [ ] Payer PII, OAuth secret/token, approval token i raw licenca nisu u
  `rawSafeMetadata`, logu, APM-u, e-mailu ili evidence-u.
- [ ] Kontrolisani Live canary i refund imaju pisani review/GO.

## 10. Kill switch i incidenti

Pri PayPal incidentu prvo postaviti `WEBSHOP_CHECKOUT_ENABLED=false`. Ne brisati
payment/order/event/outbox redove i ne raditi ručni SQL `paid`.

Posebni stop kriterijumi:

- PayPal account limitation, credential compromise ili neočekivana promena
  merchant/currency/payout statusa;
- webhook signature/verification kvar;
- PayPal completed capture bez lokalne canonical capture evidence;
- lokalno paid bez PayPal completed činjenice;
- duplicate capture/refund/license;
- otvoren dispute bez lokalnog suspension/manual-review signala;
- PII/secret u logu ili metadata-i.

Rotirati samo pogođeni Live credential/webhook ID, ažurirati secret reference,
reconcile-ovati PayPal API/Dashboard sa durable lokalnim ledgerom i koristiti
refund/revoke/compensation lifecycle. Code rollback ne poništava novac.

## 11. Evidence paket

Sačuvati bez tajni i PII-ja:

- account/app environment (`Live`), verification status i owner;
- source commit/package/release tuple;
- webhook endpoint reference i event subscription listu;
- PayPal order/capture/event/refund/dispute ID, amount/currency/status;
- Webshop order/payment/JTI/authorization/aggregate i entitlement ID;
- delivery/activation/deployment rezultat bez tokena/licence;
- payout/reconciliation i alert rezultate bez salda/bankovnih podataka;
- operator approval, timestamp i otvorene rizike.

## 12. Zvanične reference

- [PayPal produkcijsko okruženje i Go Live](https://developer.paypal.com/api/rest/production/)
- [PayPal webhook integracija i retry ponašanje](https://developer.paypal.com/api/rest/webhooks/rest/)
- [Webhook event names](https://developer.paypal.com/api/rest/webhooks/event-names/)
- [Dispute webhookovi](https://developer.paypal.com/docs/disputes/webhooks/)
- [PayPal podrška po državama](https://developer.paypal.com/payouts/supported-features)
