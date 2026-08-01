# Faza 01 — P0 payment i webhook state machine

> Finalna verifikacija 2026-07-12: **implementacija postoji, acceptance nije zatvoren**. Reducer, provider fixture-i i PostgreSQL refund/concurrency dokaz prolaze; kompletan provider sandbox checkout/webhook/reconciliation E2E nije izvršen. Videti [11-final-verification-report.md](./11-final-verification-report.md).

## Cilj

Ukloniti mogućnost da zakasneli ili ponovljeni payment događaj vrati finansijsko stanje unazad, pravilno modelovati partial refund i chargeback i obezbediti da svaka finansijska posledica bude idempotentna i auditabilna.

Ova faza ne izdaje licencu. Ona proizvodi pouzdano finansijsko stanje i durable događaj koji faza 02 koristi za fulfillment.

## Potvrđeni problemi koje faza rešava

- `payment_succeeded` grana može prepisati `refunded` stanje u `paid`.
- Stripe partial refund se svodi na generički full `payment_refunded`.
- Stripe dispute/chargeback događaji nisu modelovani.
- Paddle `adjustment.created` koristi adjustment ID kao payment reference i ne proverava `transaction_id`, `action` i `status`.
- Webhook se vraća sa 403 kada licenca Webshop addona nije `ready`.
- Manual refund sabira postojeće refund-e van zaštitne transakcije i koristi amount kao deo provider idempotency identiteta.
- Provider checkout može biti kreiran pre postojanja stabilnog lokalnog payment-attempt reda.

## Glavni moduli za izmenu

- `D:\nr_cms\.private\webshop\src\data\webshop-orders.ts`
- `D:\nr_cms\.private\webshop\src\data\webshop-order-domain.ts`
- `D:\nr_cms\.private\webshop\src\server\webhooks\payments.ts`
- `D:\nr_cms\.private\webshop\src\lib\webshop-payments\types.ts`
- `D:\nr_cms\.private\webshop\src\lib\webshop-payments\providers\stripe.ts`
- `D:\nr_cms\.private\webshop\src\lib\webshop-payments\providers\paddle.ts`
- `D:\nr_cms\.private\webshop\src\lib\webshop-payments\providers\paypal.ts`
- ostali provider adapteri koji implementiraju isti contract;
- `D:\nr_cms\db\schema.ts`
- nova root Drizzle migracija i relevantni Webshop testovi.

## Ciljni normalized payment event contract

Provider adapter ne sme direktno odlučivati konačni order status. On samo verifikuje autentičnost i vraća normalizovanu činjenicu:

```ts
export type NormalizedPaymentEventType =
  | "payment_authorized"
  | "payment_captured"
  | "payment_failed"
  | "payment_canceled"
  | "refund_pending"
  | "refund_succeeded"
  | "refund_failed"
  | "dispute_opened"
  | "dispute_won"
  | "dispute_lost";

export interface NormalizedPaymentEventV2 {
  version: 2;
  providerKey: PaymentProviderKey;
  providerEventId: string;
  providerEventCreatedAt: string | null;
  paymentReference: string;
  transactionReference: string | null;
  adjustmentReference: string | null;
  type: NormalizedPaymentEventType;
  amountMinor: number | null;
  cumulativeCapturedMinor: number | null;
  cumulativeRefundedMinor: number | null;
  currency: string;
  providerStatus: string | null;
  reasonCode: string | null;
  safeMetadata: Record<string, unknown>;
}
```

Pravila contract-a:

- `amountMinor` predstavlja iznos konkretnog događaja kada ga provider pouzdano daje.
- Cumulative vrednosti koristiti kad provider daje autoritativan total.
- Adapter mora razlikovati adjustment/refund ID od originalnog transaction/payment ID-a.
- Unknown događaj mora biti eksplicitno `ignored`, nikada mapiran na povoljnije stanje.
- `safeMetadata` mora biti redigovan pre DB upisa.
- Adapter ne sme verovati order ID-u bez provere da provider reference i amount/currency odgovaraju lokalnom paymentu.

## Provider mapping koji treba implementirati

### Stripe

- `payment_intent.succeeded` ili potvrđeni Checkout rezultat sa `payment_status=paid` → `payment_captured`.
- `checkout.session.completed` sam po sebi nije dovoljan za async metod ako payment još nije paid.
- `checkout.session.async_payment_succeeded` → `payment_captured`.
- `payment_intent.payment_failed` i `checkout.session.async_payment_failed` → `payment_failed`, uz proveru da li je retry postojećeg checkout-a i dalje moguć.
- `payment_intent.canceled` / definitivno istekao checkout → `payment_canceled` prema preciznoj provider semantici.
- Refund događaji moraju nositi amount i cumulative refunded amount; ne mapirati svaki refund na full refund.
- `charge.dispute.created` → `dispute_opened`.
- `charge.dispute.closed` sa provider outcome-om → `dispute_won` ili `dispute_lost`.
- Sačuvati Payment Intent/Charge vezu tako da refund/dispute može pouzdano naći originalni `webshop_payments` red.

### Paddle

- `transaction.paid` / `transaction.completed` → captured samo uz ispravan transaction ID, currency i total.
- Za `adjustment.created` i naredne adjustment evente koristiti `data.transaction_id` za originalni payment i `data.id` kao adjustment reference.
- Proveriti `action` (`refund`, `credit`, `chargeback` ili aktuelne Paddle vrednosti) i `status`; pending adjustment nije `refund_succeeded`.
- Chargeback/credit ne svoditi automatski na isti business događaj.
- Contract test fixture mora biti napravljen iz redigovanog realnog Paddle payload oblika.

### PayPal

- Proveriti prisustvo obaveznih webhook verification headera pre OAuth/network poziva.
- Unknown event ne sme podrazumevano postati `authorized`.
- Capture/refund/dispute ID mora biti vezan za originalni PayPal order/capture.
- Svaki outbound provider poziv mora imati timeout i redigovan error.

## DB migracija — additive korak

Ne praviti novu paralelnu payment-event tabelu ako postojeća `webshop_payment_events` može bezbedno da se proširi.

### `webshop_payment_events`

Dodati najmanje:

- `normalized_version integer`;
- `normalized_type text`;
- `provider_created_at timestamptz`;
- `payment_reference text`;
- `transaction_reference text`;
- `adjustment_reference text`;
- `amount_minor bigint`;
- `currency text`;
- `payload_hash text`;
- `processing_status text` sa `received|processed|ignored|failed`;
- `processing_attempt_count integer`;
- `last_processing_error text`;
- `processed_state_version integer`.

Zadržati postojeći unique `(provider_key, provider_event_id)`.

### `webshop_payments`

Dodati:

- `captured_amount_minor bigint not null default 0`;
- `refunded_amount_minor bigint not null default 0`;
- `disputed_amount_minor bigint not null default 0`;
- `state_version integer not null default 0`;
- `last_provider_event_at timestamptz`;
- `last_provider_event_id text`;
- nove status vrednosti `disputed`, `chargeback` i `canceled` gde nedostaju.

Dodati check invarijante:

```text
captured_amount_minor >= 0
refunded_amount_minor >= 0
refunded_amount_minor <= captured_amount_minor
disputed_amount_minor >= 0
```

### `webshop_payment_provider_references`

Jedan provider payment može tokom lifecycle-a imati više identifikatora. Dodati alias tabelu:

```text
id uuid primary key
payment_id uuid not null
provider_key text not null
reference_type merchant_payment|order|checkout_session|payment_intent|charge|capture|transaction|adjustment|dispute
reference text not null
created_at timestamptz not null
UNIQUE(provider_key, reference)
```

Refund/dispute event često ne nosi originalni merchant `paymentReference`. Payment se zato razrešava preko verifikovanog PaymentIntent/charge/capture/transaction aliasa, a ne kroz nepouzdan metadata string. Ako webhook stigne pre lokalnog čuvanja aliasa, durable inbox ostaje retryable umesto da događaj bude izgubljen.

### `webshop_refunds`

Dodati:

- `request_id uuid not null`;
- `idempotency_key text not null`;
- `provider_event_id text`;
- `provider_adjustment_id text`;
- `provider_transaction_reference text`;
- `requested_at`, `submitted_at`, `settled_at`;
- unique `request_id` i unique `(payment_id, idempotency_key)`;
- partial unique provider adjustment/event ID gde nije null.

### `webshop_payment_disputes`

Dodati novu tabelu ako dispute lifecycle ne može jasno da stane u postojeći refund model:

- `id`, `payment_id`, `order_id`;
- `provider_key`, `provider_dispute_id`;
- `amount_minor`, `currency`;
- `status=open|won|lost|closed`;
- `reason_code`;
- `opened_at`, `closed_at`;
- redigovani metadata i audit timestamps;
- unique `(provider_key, provider_dispute_id)`.

### `webshop_refund_items`

Za item-level posledice partial refund-a dodati:

```text
id uuid primary key
refund_id uuid not null
order_item_id uuid not null
quantity integer not null
amount_minor bigint not null
license_action none|suspend|revoke
created_at timestamptz not null
UNIQUE(refund_id, order_item_id)
```

Pravila:

- full refund automatski obuhvata sve item-e;
- admin partial refund licenciranog ordera mora eksplicitno odabrati pogođene item-e;
- provider partial refund bez pouzdane item alokacije dobija `requires_reconciliation` stanje i admin alert;
- takav nealokovan partial refund ne sme nasumično opozvati sve licence niti tiho ostaviti pretpostavljenu item odluku;
- dispute po defaultu može suspendovati sve licencne item-e dok se ne reši, prema dokumentovanoj business politici.

### `webshop_payment_attempts`

Preporučeno je uvesti mali durable attempt red pre outbound create-payment poziva:

- lokalni `attempt_id` i stabilan provider idempotency key;
- checkout session/order/customer/currency/amount snapshot;
- `creating|created|failed|expired` status;
- provider reference kada je poznat.

Retry checkout forme mora koristiti isti attempt dok je bezbedno, umesto generisanja novog provider session-a pri svakom submit-u.

### Inventory i license-key pool rezervacije

Pending online payment ne sme trajno pretvoriti inventory ili pre-generated license key u `sold`.

Dodati/normalizovati reservation model sa:

- stabilnim `paymentAttemptId/orderId` ownerom;
- `reservedAt` i `expiresAt`;
- statusom `reserved|committed|released`;
- conditional/row-lock update-om koji sprečava oversell;
- provider checkout expiry/recovery datumom;
- cleanup/reconciliation job-om.

Pravila:

- checkout creation samo rezerviše;
- prvi autoritativni capture commit-uje inventory/key;
- definitivan cancel/expiry/failure oslobađa rezervaciju ako payment nije captured;
- zakasneli capture posle lokalnog release-a mora ući u exception/reconciliation tok, ne proizvesti negativan stock ili dupli key;
- provider session sa recovery URL-om ostaje rezervisan samo do jasno definisanog recovery roka;
- stale pending redovi ne smeju neograničeno blokirati stock ili key pool;
- cleanup job koristi isti payment reducer i provider reconciliation, ne direktan status update.

## Transakciona obrada webhook-a

Implementirati sledeći redosled:

1. Proveriti minimalni header/body limit.
2. Pročitati raw body jednom.
3. Kriptografski verifikovati provider potpis.
4. Normalizovati payload bez menjanja baze.
5. U DB transakciji pokušati insert eventa.
6. Ako unique conflict pokazuje isti payload hash, vratiti idempotentni `200`.
7. Ako isti event ID ima drugi payload hash, zabeležiti security alert i ne procesirati payload.
8. Zaključati ciljni payment red (`FOR UPDATE`) ili koristiti `state_version` conditional update.
9. Proveriti provider/payment/order reference, amount i currency.
10. Primeniti transition/reducer.
11. Upisati refund/dispute redove i downstream outbox događaje u istoj transakciji.
12. Označiti event `processed` sa rezultujućim state version-om.
13. Tek posle commit-a slati `200` provideru.

Ako poslovna obrada privremeno padne posle verifikovanog inbox inserta, provideru se može vratiti retry status, ali ponavljanje mora nastaviti sa istog inbox reda. Ne ponavljati kriptografski prihvaćen event kao novi poslovni događaj.

## Monotonic reducer pravila

Reducer ne treba da bude samo numerički rank statusa, jer refund i dispute nisu jedna linearna osa. Finansijski status izvoditi iz captured/refunded/disputed iznosa i lifecycle događaja.

Minimalna pravila:

- zakasneli capture ne smanjuje `refundedAmountMinor` niti zatvara chargeback;
- full refund ostaje full refund čak i ako stariji success stigne kasnije;
- partial refund + novi partial refund sabiraju se idempotentno preko zasebnih refund ID-eva;
- duplicate refund event ne povećava sumu;
- dispute opened ne briše captured amount, već postavlja dispute stanje i proizvodi entitlement-suspend komandu;
- dispute won vraća prethodno finansijsko stanje bez automatskog izdavanja novog entitlementa ako je original trajno opozvan — to mora biti eksplicitna recovery komanda;
- dispute lost proizvodi terminalni chargeback događaj i revoke komandu;
- provider timestamp pomaže pri redu, ali ne sme biti jedina odbrana; cumulative amount i terminalne invarijante imaju prednost.

## Odvajanje addon licence od finansijske obaveze

U `handleWebshopPaymentWebhook` ukloniti rani 403 za `licenseMode !== "ready"`.

Uvesti dve odvojene odluke:

```ts
canStartNewCommerce(licenseMode): boolean
mustReconcileExistingFinancialObligation(): true
```

Expired/revoked Webshop addon:

- blokira novi checkout i novu prodaju;
- ne blokira signature verification, inbox, refund, chargeback, cancellation i cleanup;
- ne blokira fulfillment već potvrđeno plaćenog ordera, prema fazi 02;
- administratoru prikazuje read-only finansijski/recovery ekran.

## Manual refund tok

1. Admin akcija proverava admin auth, order/payment i refundabilni iznos.
2. U transakciji zaključava payment, ponovo računa već uspešno/pending refundovan iznos i kreira `webshop_refunds` red sa UUID `requestId`.
3. U istoj transakciji rezerviše refundabilni iznos uključujući sve `pending + succeeded` zahteve i upisuje item alokaciju.
4. Commit.
5. Provider poziv koristi `refund:<requestId>` kao idempotency key.
6. Response ažurira `submitted`, ali provider webhook/reconciliation potvrđuje konačni `succeeded/failed` status.
7. Webhook sa istim adjustment ID-em povezuje postojeći refund red, ne kreira duplikat.
8. Full ili item-alociran refund događaj u fazi 02 proizvodi suspend/revoke komandu samo za pogođene entitlemente.

## Test-first redosled

Pre produkcionog koda dodati testove koji reprodukuju:

1. `refund -> delayed payment_succeeded` ne vraća `paid`.
2. `chargeback_lost -> delayed capture` ostaje chargeback.
3. Dva identična webhook-a daju jedan event i jednu tranziciju.
4. Isti provider event ID sa drugim payload hash-om se odbija i alertuje.
5. Dva partial refund-a daju zbir, duplicate jednog ne menja zbir.
6. Refund suma preko captured iznosa se odbija.
7. Dve paralelne manual refund akcije ne prelaze captured amount.
8. Paddle pending adjustment ne menja stanje u refunded.
9. Paddle koristi `transaction_id`, ne adjustment ID, za pronalaženje paymenta.
10. Stripe dispute open/won/lost lifecycle.
11. Unknown PayPal/Stripe/Paddle događaj je ignored, ne authorized/paid.
12. Webhook se obrađuje u expired Webshop režimu, dok novi checkout ostaje blokiran.
13. Provider checkout retry koristi isti payment attempt/idempotency key.
14. Pending checkout rezerviše, ali ne prodaje inventory/key; capture commit-uje, a definitivni expiry oslobađa.
15. Stale reservation cleanup ne oslobađa resurs ako je provider u međuvremenu capture-ovao payment.

Testirati reducer kao pure unit, a inbox/transakcije sa stvarnom PostgreSQL bazom. Mock-only DB test nije dovoljan za lock i unique ponašanje.

## Acceptance kriterijumi

- Svi navedeni testovi prolaze najmanje 100 ponavljanja concurrency scenarija bez flake-a.
- Ne postoji kod putanja koja direktno postavlja `paid/completed` bez centralnog reducer-a.
- Svaki provider adapter prolazi isti contract test suite.
- Payment event audit pokazuje input event, prethodni state version i novi state version.
- Refund/chargeback proizvode tačno jedan downstream lifecycle outbox event.
- Webhook endpoint vraća idempotentni uspeh za već procesiran validan event.
- License mode više ne prekida finansijsku reconciliaciju.

## Rollout i rollback

1. Deploy additive migraciju.
2. U shadow režimu normalizovati događaje i porediti V1/V2 rezultat bez V2 mutation-a.
3. Ispraviti sva odstupanja na staging fixture-ima.
4. Uključiti `WEBSHOP_PAYMENT_STATE_V2` prvo za test webshop.
5. Pratiti duplicate, ignored, mismatch, refund-total i event-lag metrike.
6. Production uključiti uz mogućnost povratka čitanja na V1, ali nastaviti V2 inbox upis.

Rollback ne sme brisati nove event/refund/dispute podatke. Ako se V2 mutation isključi, financial inbox ostaje aktivan da nijedan provider događaj ne bude izgubljen.

## Implementation record — 2026-07-12

Implementiran je additive `0080_webshop_payment_state_v2` migration sa payment aggregate kolonama, V2 inbox poljima, provider reference alias tabelom, payment attempts, refund request/item tabelama i dispute tabelom. Migracija je proverena samo nad `TEST_DATABASE_URL` kopijom.

Kada je server-side `WEBSHOP_PAYMENT_STATE_V2=true`, `processVerifiedPaymentEvent` normalizuje verifikovani provider događaj i prosleđuje ga V2 transaction/reducer putu. Produkcioni default ostaje `false` tokom shadow/staging verifikacije. V2 put upisuje durable inbox sa hash proverom, zaključava payment red PostgreSQL `FOR UPDATE`, ažurira aggregate iznose/state version i ne završava order na capture-u. Refund request koristi zaseban UUID/idempotency ključ i pending+succeeded reservation iznosa pod istim lock-om.

Stripe, Paddle i PayPal adapteri su dopunjeni prema zvaničnim provider event semantikama; Paddle adjustment koristi `transaction_id` za payment i `id` kao adjustment ID, a nepoznati PayPal događaj se ignoriše. Webhook više ne vraća 403 kada addon licenca nije `ready`.

Faza nije zatvorena ovim zapisom: preostaju puni provider fixture/replay setovi, stvarni application-level DB integration scenariji za svaki navedeni provider i checkout/payment-attempt end-to-end testovi.

### Follow-up verification — 2026-07-12

Dodat je redigovan provider fixture set za Paddle adjustment `pending|approved|rejected`,
Stripe dispute `opened|won|lost` i ignorisani PayPal događaj. Fixture je otkrio da je Paddle
`pending` status bio ignorisan; sada se normalizuje kao `refund_pending`, pri čemu se originalni
`transaction_id` zadržava kao payment reference, a adjustment ID ostaje zaseban identitet.
Sada postoje application-level PostgreSQL scenariji koji prolaze kroz stvarne
`content → cart → checkout_session → order → payment` redove i V2 transaction
put: capture, dupli event, dva legitimna refund-a istog iznosa, refund →
zakasneli capture i dve paralelne refund činjenice od 60/100. Test dokazuje da
`FOR UPDATE` prihvata samo jedan settled refund i da odbijeni over-refund ne
ostavlja lažni `succeeded` refund red. Pokreće se isključivo kroz
`npm run test:payment:db` iz `.private/webshop`, čiji wrapper eksplicitno
učitava root `.env` i zamenjuje `DATABASE_URL` verifikovanim
`TEST_DATABASE_URL`.

Faza i dalje nije zatvorena: nedostaju checkout/payment-attempt E2E tok sa
stvarnim provider create/cancel/expiry rezervacijama, kompletni replay fixture-i
za svaki podržani provider i staging shadow/dual-write dokaz pre uključivanja
`WEBSHOP_PAYMENT_STATE_V2`.
