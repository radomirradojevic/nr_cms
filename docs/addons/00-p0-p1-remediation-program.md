# Faza 00 — P0/P1 remediation program i globalne invarijante

> Finalna verifikacija 2026-07-12: **NIJE ZATVORENA**. Finansijski i queue DB testovi prolaze, ali globalne trust, atomic customer activation, private build, migration-checksum i staging E2E invarijante nisu dokazane. Autoritativni rezultat je u [11-final-verification-report.md](./11-final-verification-report.md).

## Cilj

Definisati zajednički jezik, granice odgovornosti, rollout pravila i invarijante koje sve kasnije faze moraju poštovati. Ovaj dokument ima prednost nad lokalnim prečicama u pojedinačnoj fazi: ako implementacija krši neku globalnu invarijantu, faza nije završena.

## Komponente i autoritet

| Komponenta | Autoritativna odgovornost | Ne sme biti autoritet za |
|---|---|---|
| Night Raven CMS | Host runtime, auth/permissions adapteri, addon registry, jobs i lokalne migracije | Vendor payment ili centralni entitlement status |
| `webshop` | Order, payment, provider webhook inbox, refund ledger i fulfillment orkestracija | Samostalno kreiranje Night Raven vendor licence |
| `license-server-addon` nivo 1 | Lokalni cache/klijent licence samog addona | Customer-issued licence |
| `license-server-addon` nivo 2 | Customer Product License, customer activation i lokalni issuer | Night Raven addon entitlement |
| Centralni `license-server` | Night Raven Vendor Entitlement, vendor activation, update prava i lifecycle | Customer-issued license podaci kupčevog proizvoda |
| Payment provider | Autoritativni eksterni finansijski događaji | Order fulfillment ili license lifecycle bez lokalne poslovne obrade |

## Obavezna terminologija

U novom kodu i migracijama koristiti jasne domenske nazive:

- `VendorAddonEntitlement`: pravo kupca da koristi Night Raven addon.
- `VendorAddonActivation`: vezivanje vendor entitlementa za Night Raven instalaciju.
- `CustomerLicenseIssuer`: lokalna funkcionalnost kupljenog `license-server-addon` addona.
- `CustomerProductLicense`: licenca koju kupac izdaje svom korisniku.
- `CustomerIssuedActivation`: aktivacija customer product licence.
- `PaymentStatus`: finansijski status potvrđen provider događajima.
- `OrderStatus`: komercijalni status ordera.
- `FulfillmentStatus`: status isporuke svakog order item-a.
- `SubscriptionStatus`: stanje billing ugovora; nije sinonim za entitlement.
- `UpdateEntitlementStatus`: pravo na određenu addon verziju; nije sinonim za runtime licencu.

Stare nazive ne treba masovno menjati u jednom P0 patch-u. Nove tabele/API contract-i treba da koriste jasne nazive, dok se UI rename može raditi postepeno.

## Globalne invarijante

### Finansijske invarijante

1. Frontend redirect ili success page nikada nisu dokaz plaćanja.
2. Samo verifikovan provider webhook ili eksplicitno verifikovan provider API rezultat mogu promeniti payment u `paid`.
3. Provider event se trajno evidentira pre poslovne tranzicije.
4. `(providerKey, providerEventId)` je jedinstven.
5. Refund i chargeback stanja ne mogu biti vraćena na `paid` zakasnelim događajem.
6. Suma uspešnih refund-a ne može preći captured amount.
7. Refund request ima sopstveni stabilni UUID; amount nije idempotency identitet.
8. Istek licence Webshop addona blokira nove prodaje, ali ne blokira reconciliaciju već nastalih finansijskih obaveza.

### Order i fulfillment invarijante

1. `paymentStatus`, `orderStatus` i `fulfillmentStatus` menjaju se odvojeno.
2. `paid` ne znači automatski `completed`.
3. Order je `completed` tek kada je payment u dozvoljenom captured stanju i svi obavezni item fulfillment taskovi su terminalno uspešni.
4. License issue failure ostavlja order u vidljivom recovery stanju.
5. Jedan order item proizvodi najviše jedan aktivni vendor entitlement, osim ako business model eksplicitno dozvoljava quantity > 1 sa zasebnim seat/entitlement identitetima.
6. Slanje emaila je posledica durable state promene, ne deo kritične transakcije koja kreira licencu.

### Idempotency i concurrency invarijante

1. Svaka cross-service mutation zahteva `Idempotency-Key`.
2. Idempotency record čuva canonical request hash.
3. Isti key + isti hash vraća isti semantički rezultat.
4. Isti key + drugi hash vraća `409 idempotency_conflict`.
5. Retry nakon izgubljenog odgovora ne kreira drugi entitlement.
6. Atomic DB unique constraint je poslednja linija odbrane; `SELECT` pa `INSERT` bez conflict recovery-ja nije dovoljno.
7. Worker mora koristiti lease token i conditional completion update.
8. Activation-limit provera i insert moraju biti jedna atomska operacija.

### Trust i kriptografske invarijante

1. Centralni signing private key postoji samo na centralnom servisu/KMS-u.
2. CMS/addon dobija samo vendor public verification key-eve.
3. Customer License Issuer ima zaseban issuer ID i zaseban key materijal; nikada vendor private key.
4. Potpisani entitlement sadrži `iss`, `aud`, `kid`, entitlement ID, addon key, installation ID, status, prava, `iat` i `exp`/validity.
5. Nevalidan potpis nikada ne menja poslednje poznato dobro stanje.
6. Literal development secret mora izazvati production startup failure, ne tihi fallback.
7. Secrets i puni license keys ne smeju biti u URL-u, access logu, error logu ili neredigovanom JSON snapshot-u.

### Addon/build invarijante

1. Javni CMS repo se build-uje i testira bez `.private` direktorijuma.
2. Tracked public fajl ne importuje `@/.private/...` niti relativnu privatnu putanju.
3. Addon package identitet i verzija dolaze iz jednog manifesta.
4. `ready` znači: paket je stvarno učitan, contract kompatibilan, checksum verifikovan i migracije primenjene.
5. License activation sama po sebi ne znači da je package instaliran.
6. Addon update nije dozvoljen ako `updatesUntil` ili compatibility range ne dozvoljava novu verziju.

## Ciljna statusna razdvajanja

Tačne enum vrednosti finalizovati u fazama 01–04, ali domenski slojevi moraju ostati odvojeni:

| Domena | Minimalna stanja |
|---|---|
| Payment | `pending`, `authorized`, `paid`, `partially_refunded`, `refunded`, `disputed`, `chargeback`, `failed`, `canceled` |
| Order | `pending_payment`, `confirmed`, `processing`, `completed`, `canceled`, `refunded` |
| Item fulfillment | `not_required`, `pending`, `processing`, `fulfilled`, `failed`, `canceled`, `revoked` |
| Vendor entitlement | `pending`, `active`, `suspended`, `expired`, `revoked`, `canceled` |
| Vendor activation | `pending`, `active`, `deactivated`, `revoked` |
| Subscription | `trialing`, `active`, `past_due`, `paused`, `canceled`, `ended` |
| Update pravo | izvedeno iz `updatesUntil`, channel-a, edition-a i target verzije |
| Addon install | `not_installed`, `license_accepted`, `install_pending`, `installed`, `migration_pending`, `ready`, `failed`, `disabled` |

Ne praviti jedan univerzalni status enum.

## Feature flagovi za bezbedan rollout

Pre početka implementacije dodati ili definisati server-side feature flagove:

- `WEBSHOP_PAYMENT_STATE_V2`
- `WEBSHOP_LICENSE_OUTBOX_V2`
- `VENDOR_LICENSE_API_V2`
- `VENDOR_SIGNED_ENTITLEMENTS_V1`
- `ADDON_INSTALL_RECONCILIATION_V1`
- `ADDON_SDK_V1`

Pravila:

- Flagovi nisu license enforcement i ne smeju biti client-controlled.
- Svaki dual-write flag mora imati metriku poređenja starog i novog rezultata.
- Production default ostaje `false` dok acceptance testovi ne prođu.
- Rollback flag ne sme zahtevati rollback već primenjene additive migracije.

## Cross-repository contract verzionisanje

Preporučeni minimum:

```text
@nr-cms/vendor-license-contracts
  schemas/catalog-v1.ts
  schemas/entitlement-v1.ts
  schemas/events-v1.ts
  canonical-signature-v1.ts
  test-vectors/

@nr-cms/addon-sdk
  manifest-v1.ts
  host-v1.ts
  migrations-v1.ts
  testing/
```

Ako deljeni privatni package još nije moguć, privremeno držati JSON Schema/OpenAPI dokument i identične contract test vectors u oba repozitorijuma. Ručno duplirani TypeScript interfejsi bez contract testa nisu prihvatljiv završni rezultat.

## Pravila migracija

1. Svaka migracija mora imati jedinstveni ID i checksum.
2. Prvo additive nullable kolone/tabele/indeksi bez promene starog čitanja.
3. Backfill mora biti restartable i merljiv.
4. Unique/check constraint dodavati tek nakon preflight query-ja koji dokazuje da nema konflikata.
5. Velike indekse na produkciji kreirati bez dugog blocking lock-a gde platforma to podržava.
6. Ne brisati staru kolonu najmanje jedan stabilan release posle prelaska čitanja.
7. Svaka faza mora navesti restore ili forward-fix postupak; down migracija nije uvek bezbedna.

## Environment matrica

Za development, staging i production moraju postojati različiti:

- payment provider credentials i webhook secrets;
- centralni API client ID/secret;
- vendor signing key/key ID;
- secret-encryption key;
- installation identity;
- baze i storage;
- public base URL i allowed domains;
- queue/cron credentials.

Production validacija mora odbiti:

- localhost/private-network centralni base URL;
- HTTP umesto HTTPS;
- development fallback secrets;
- isti credential fingerprint kao staging;
- nedostajući public verification key;
- nepoznat `kid` bez kontrolisanog key refresh-a.

## Observability standard

Svaka cross-service operacija nosi:

- `requestId`;
- `correlationId` — obično order item ili entitlement workflow ID;
- `idempotencyKey` fingerprint, nikada pun secret;
- actor/service identitet;
- event type i rezultat;
- trajanje i HTTP status;
- retry count i next-attempt vreme.

Logovi moraju redigovati:

- license key;
- API secret;
- signing/encryption key;
- entitlement/package token;
- webhook signature;
- session cookie;
- authorization header;
- nepotreban customer PII.

## Definition of done za svaku fazu

Faza je završena tek kada:

- schema i contract su dokumentovani;
- migracija je proverena na kopiji production-like baze;
- bug-reproduction test postoji;
- unit i integration testovi prolaze;
- relevantni contract/E2E scenariji prolaze;
- metrics/log redaction su provereni;
- feature flag i rollback su isprobani;
- nema novih public → `.private` importa;
- Git diff sadrži samo planirane fajlove;
- odgovarajući dokument je ažuriran stvarnim konačnim ponašanjem.
