# 03 — Stripe live i produkcijska e-mail isporuka

Stripe je u ovom dokumentu opciona payment-provider grana, ne više implicitno
jedini mogući produkcijski provider. Za firmu kojoj Stripe ne može da odobri
nalog u njenoj državi ne koristiti lažne podatke ili tuđi nalog; izabrati PayPal
i slediti [zaseban PayPal runbook](./07-paypal-sandbox-and-live.md). E-mail
odeljci ovog dokumenta ostaju obavezni nezavisno od payment providera.

## 1. Preduslovi

Pre ovog dokumenta moraju biti zeleni:

- javni vendor origin i TLS;
- produkcijski Webshop/Master/worker ključevi;
- staging backup/restore i observability;
- packed Webshop release i Master release sa production dozvoljenim KID-om;
- `WEBSHOP_CHECKOUT_ENABLED=false` na produkciji dok se konfiguracija proverava.

Izabrani payment provider i e-mail prvo se dokazuju u javnom staging-u, zatim u
produkciji kroz kontrolisani canary. Browser redirect sam nije dokaz capture-a;
autoritativan je potpisani webhook/provider API dokaz i reducer stanje.

## 2. Stripe account i operativno vlasništvo

**EXTERNAL/OPERATOR:**

1. Završiti Stripe business verification, payout banku, poreske/business podatke
   i MFA za operatore.
2. Odvojiti test i live API credentiale; ograničiti pristup live Dashboard-u.
3. Definisati ko sme da radi refund, ko obrađuje dispute i ko rotira API/webhook
   secret.
4. Uključiti Stripe e-mail/alerting za webhook failure, dispute i payout problem.
5. Zapisati podržanu valutu/cenu i proveriti da Webshop amountMinor/currency
   odgovara objavljenom Master SKU-u.

Ne koristiti ličnu karticu/kupca bez unapred dogovorenog kontrolisanog smoke-a i
razumevanja naknade/refund roka.

## 3. Live Stripe konfiguracija

Vendor CMS secret store dobija:

```text
WEBSHOP_PAYMENTS_MODE=live
WEBSHOP_STRIPE_SECRET_KEY=<Stripe sk_live reference/value in secret store>
WEBSHOP_STRIPE_WEBHOOK_SECRET=<Stripe whsec reference/value in secret store>
WEBSHOP_PUBLIC_BASE_URL=https://<vendor-canonical-domain>
```

Kod fail-closed proverava da `live` koristi `sk_live_`; `test` zahteva `sk_test_`.
Webhook secret je zaseban i Stripe signature tolerancija je 300 sekundi, pa NTP
na vendor hostu mora biti zdrav i alarmiran.

`WEBSHOP_STRIPE_API_BASE_URL` ne postavljati u standardnoj produkciji; default je
`https://api.stripe.com`. Override je samo za eksplicitno testiran provider
gateway i mora proći isti TLS/egress threat review.

## 4. Stripe webhook

U Stripe Dashboard-u napraviti live endpoint:

```text
POST https://<vendor-canonical-domain>/api/webshop/payments/webhooks/stripe
```

Selektovati događaje koje trenutni reducer razume:

- `checkout.session.completed`;
- `checkout.session.async_payment_succeeded`;
- `checkout.session.async_payment_failed`;
- `checkout.session.expired`;
- `payment_intent.succeeded`;
- `payment_intent.payment_failed`;
- `payment_intent.canceled`;
- `charge.refunded`;
- `refund.updated`;
- `charge.dispute.created`;
- `charge.dispute.closed`.

Nepoznat događaj se bezbedno ignoriše, ali pretplata na nepotrebne evente pravi
buku. Endpoint/proxy mora:

- sačuvati exact raw body bytes;
- proslediti `Stripe-Signature` bez izmene;
- ne keširati i ne redirectovati;
- imati body/timeout granice kompatibilne sa Stripe-om;
- ne logovati signature/body/customer podatke;
- vratiti status dovoljno brzo, dok durable inbox/reducer nastavlja posao.

Sačuvati Stripe endpoint ID i signing-secret reference, ne signing secret.

## 5. Bezbedan redosled uključivanja live naplate

1. Deployovati produkcijski env sa `WEBSHOP_PAYMENTS_MODE=live`, live keys i
   `WEBSHOP_CHECKOUT_ENABLED=false`.
2. Pokrenuti `npm run env:validate`, build/start health i Webshop provider status.
3. Poslati Stripe Dashboard signed test event na live endpoint gde Stripe to
   podržava; potvrditi accepted/inbox/audit bez business issue-a.
4. Potvrditi NTP i 300-second signature window.
5. Uključiti storefront samo ako je sadržaj spreman; checkout ostaje zatvoren.
6. Otvoriti checkout za ograničen canary prozor/proizvod.
7. Napraviti jednu kontrolisanu minimalnu realnu uplatu za `webshop-30` ili
   unapred izabrani SKU, sa stvarnim javnim domenom.
8. Proveriti captured amount/currency, intent JTI/order/item binding, issuance
   fence, jedan entitlement, e-mail/reveal i client activation.
9. Izvršiti refund iz definisanog toka; proveriti Stripe webhook, compensation i
   entitlement lifecycle/revalidation.
10. Zatvoriti checkout ako bilo koji reconciliation/alert gate nije zelen.

Ne koristiti ručno „mark paid” ili direktan SQL kao live dokaz.

## 6. Stripe acceptance

- [ ] `WEBSHOP_PAYMENTS_MODE=live` i `sk_live_` par prolazi validator/provider.
- [ ] Webhook secret pripada exact live endpoint-u.
- [ ] Signed capture event daje jednu payment aggregate tranziciju.
- [ ] Duplicate isti event ne menja cardinality.
- [ ] `checkout.session.completed` bez `payment_status=paid` ne izdaje licencu.
- [ ] Partial/hold/risk/failed/canceled ne izdaju licencu.
- [ ] Amount/currency/provider reference/JTI/order/item/fence su usklađeni.
- [ ] Response loss/retry ne pravi drugi entitlement.
- [ ] Refund i dispute događaji daju definisanu lifecycle odluku.
- [ ] Stripe secret/signature/card/customer PII nisu u logu/evidence-u.
- [ ] Alarm za webhook failure i paid-but-unissued je aktivan.

## 7. Produkcijski delivery e-mail

Za licencu se šalje samo short-lived secure delivery link. Raw license key se ne
stavlja u subject, text, HTML ili provider metadata/tag.

Postojeći production-capable adapter je `resend`:

```text
EMAIL_PROVIDER=resend
WEBSHOP_DELIVERY_EMAIL_PROVIDER=resend
RESEND_API_KEY=<secret store reference/value>
EMAIL_FROM="Night Raven CMS <noreply@verified-domain>"
WEBSHOP_DELIVERY_EMAIL_FROM="Night Raven CMS <licenses@verified-domain>"  # opciono
WEBSHOP_RESEND_RECONCILIATION_MAX_PAGES=20                                # 1..100
```

`WEBSHOP_DELIVERY_EMAIL_PROVIDER=fixture` mora biti zabranjen production startup
validacijom pre GO-a. Generic core SMTP provider nije automatski dovoljan za
license delivery: delivery provider mora podržati autoritativni retrieve po
stabilnom `providerMessageKey` ili ekvivalentni idempotency/reconciliation
ugovor.

## 8. E-mail domen i provider provisioning

1. Verifikovati sending domen u Resend-u.
2. Objaviti provider DKIM zapise i SPF bez više konfliktnih SPF TXT zapisa.
3. Postaviti DMARC najmanje u monitoring modu, zatim po rezultatima preći na
   quarantine/reject; definisati report mailbox.
4. Postaviti From adresu na verifikovani domen i definisati Reply-To/support.
5. Ograničiti API key na potreban account/domen ako provider podržava scope.
6. Uključiti bounce/complaint/domain reputation alerting.
7. Definisati retention provider sadržaja i uskladiti privacy policy.
8. Potvrditi da provider message/tag metadata sadrži samo SHA-256 stabilnog
   provider key-a, ne order e-mail/licencu/token.

## 9. Idempotency i reconciliation

Adapter šalje:

- `Idempotency-Key: webshop-license-delivery:v1:<uuid>:<attempt>`;
- provider tag `nr_provider_key_sha256=<sha256(providerMessageKey)>`;
- secure link sa jednosmernim delivery tokenom.

Ako `send` timeoutuje posle mogućeg provider accept-a:

1. ne slati odmah novi mail/token;
2. pozvati `retrieve(providerMessageKey)`;
3. `accepted` završava isti outbox;
4. `not_found` dozvoljava kontrolisani retry prema state machine-u;
5. `unknown` ostaje retry/reconciliation, ne smatra se uspehom ili sigurnim
   neuspehom;
6. više od jednog matching provider message-a je incident/`unknown`.

Reconciliation page limit sprečava neograničen provider scan; alertovati kada je
potrebno više stranica ili provider retrieval nije dostupan.

## 10. E-mail acceptance

- [ ] Production startup odbija `fixture`.
- [ ] From domen, DKIM, SPF i DMARC su provereni.
- [ ] `send` sa istim provider key-em ne pravi drugi mail.
- [ ] Timeout/unknown commit se rešava retrieval-om.
- [ ] Provider message ID je sačuvan, a raw token/key nije u metadata/logu.
- [ ] Link ima `no-store`, `no-referrer`, jednokratnu exchange sesiju i istek.
- [ ] Neautorizovani/drugi customer ne može reveal-ovati licencu.
- [ ] Bounce/complaint/retry/DLQ i delivery latency alarmi rade.
- [ ] Token istekao pre isporuke daje support/reissue tok bez druge licence.
- [ ] APM/proxy/provider screenshot/evidence nema raw link ili license key.

## 11. Kill switch

Ako Stripe, PayPal ili delivery pokaže incident:

- prvo `WEBSHOP_CHECKOUT_ENABLED=false` da spreči nove checkout sesije;
- ne brisati postojeće payment/issue/delivery outbox redove;
- processing/reconciliation nastaviti samo ako je bezbedno;
- po potrebi `WEBSHOP_STOREFRONT_ENABLED=false` sakriva prodavnicu, ali nije
  zamena za payment/issue kill switch;
- revoke/rotate pogođeni provider credential;
- reconcile captured-but-unissued i issued-but-undelivered redove;
- refund/revoke kroz poslovni lifecycle, ne code rollback ili direktan SQL.
