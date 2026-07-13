# Faza 08 — P1 subscriptions, update prava i Customer License Issuer

> Finalna verifikacija 2026-07-12: **NIJE ZATVORENA — High runtime/concurrency blockeri**. Subscription/update i namespace testovi prolaze, ali subscription handler nema runtime adapter, lokalni Webshop capability nema host worker wiring, a customer activation advisory lock koristi helper-e van transakcije. Videti [11-final-verification-report.md](./11-final-verification-report.md).

## Cilj

Dovršiti licencni business model posle P0 osnove: odvojiti subscription/payment/entitlement/update statuse, podržati renewal i grace, definisati prava na addon verzije i učiniti `license-server-addon` jasnim, lokalnim Customer License Issuer-om sa sopstvenim issuer identitetom i ključevima.

## Deo A — Night Raven vendor subscriptions i update prava

### Domenske invarijante

- Subscription je billing ugovor, ne licenca.
- Payment status je stanje jedne transakcije, ne subscription-a.
- Vendor entitlement može ostati aktivan tokom definisanog payment grace-a.
- Cancellation može značiti „ne obnovi“, bez trenutnog opoziva već plaćenog perioda.
- `validUntil` kontroliše runtime korišćenje.
- `updatesUntil` kontroliše pravo na nove package verzije.
- Perpetual runtime licenca može imati konačan `updatesUntil`.
- Refund/chargeback može promeniti entitlement nezavisno od subscription provider statusa.

### Statusi

```ts
type VendorEntitlementStatus =
  | "pending"
  | "active"
  | "suspended"
  | "expired"
  | "revoked"
  | "canceled";

type VendorSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "paused"
  | "canceled"
  | "ended";
```

`canceled` subscription ne mora odmah menjati entitlement u canceled; može postaviti `cancelAtPeriodEnd` i ostaviti entitlement active do `currentPeriodEnd`.

### Centralne tabele

Dodati/kompletirati:

#### `vendor_subscriptions`

```text
id
customer_id/external_ref
provider_key
provider_subscription_id
provider_customer_id
plan_ref, price_ref, sku_id
status
current_period_start, current_period_end
grace_ends_at
cancel_at_period_end
canceled_at, ended_at
last_provider_event_at
version
UNIQUE(provider_key, provider_subscription_id)
```

#### `vendor_subscription_events`

Append-only, unique provider event, normalized type, occurredAt, payload hash, processing result.

#### Entitlement veza

`vendor_entitlements.subscription_id` je nullable. One-time/perpetual licence nemaju subscription. Renewal menja isti entitlement i appenduje lifecycle event.

### Subscription provider događaji

Webshop payment adapter treba proširiti odvojenim normalized subscription eventima:

```text
subscription_created
subscription_renewed
subscription_payment_failed
subscription_past_due
subscription_paused
subscription_resumed
subscription_cancel_scheduled
subscription_canceled
subscription_ended
```

Ne mapirati subscription event direktno na entitlement bez policy reducer-a.

Primer politike:

- successful renewal → produži `validUntil` i `updatesUntil` istog entitlementa;
- payment failed → subscription `past_due`, entitlement ostaje active do `graceEndsAt`;
- grace istekao → suspend/expire prema planu;
- cancel-at-period-end → entitlement active do plaćenog roka;
- chargeback → suspend/revoke nezavisno od budućeg subscription datuma;
- manual renewal → auditovan lifecycle command sa payment/admin source-om.

### Trial i grace

Trial mora imati:

- stabilan customer/installation identitet;
- `trialStartsAt`, `trialEndsAt`;
- definisanu aktivacionu/feature/update politiku;
- zaštitu od beskonačnog ponavljanja preko brisanja lokalne baze — centralni customer/installation history;
- jasan prelaz u paid ili expired.

Grace:

- payment grace i offline validation grace su različiti koncepti;
- payment grace je centralni business status;
- offline grace je lokalna availability politika potpisanog assertion-a;
- oba datuma mogu postojati, ali ne smeju se zvati samo `graceEndsAt` bez konteksta.

## Update entitlement

### Release metadata

Svaki potpisani addon release manifest iz faze 05 sadrži:

- package version;
- releasedAt;
- minimum/maximum CMS range;
- runtime contract/schema range;
- edition/channel;
- critical-security-update flag po potrebi.

### Odluka o update-u

Centralni endpoint, npr.:

```text
POST /api/v1/entitlements/{id}:authorize-update
```

Request sadrži current i target package/version, manifest hash, installation ID. Odgovor je potpisana kratkotrajna dozvola ili reason:

```text
allowed
entitlement_inactive
updates_expired
edition_mismatch
channel_not_allowed
cms_incompatible
schema_incompatible
target_not_found
```

Minimalno pravilo:

```text
targetRelease.releasedAt <= entitlement.updatesUntil
AND target edition/channel allowed
AND CMS/runtime/schema compatible
AND entitlement nije revoked/suspended
```

Security update izuzetak, ako se želi, mora biti eksplicitna vendor politika; ne uvoditi tihi bypass naplate.

Package download grant je vezan za entitlement, installation ID, target release hash i kratak rok. Ne vraća opšti registry credential.

## Deo B — Customer License Issuer

### Jasna granica nivoa 1 i nivoa 2

Nivo 1:

- `VendorAddonEntitlement` za pravo korišćenja `license-server-addon` addona;
- centralni Night Raven servis;
- vendor signing key i vendor activation.

Nivo 2:

- `CustomerIssuerIdentity`;
- `CustomerProduct`, `CustomerProductSku`;
- `CustomerProductLicense`;
- `CustomerIssuedActivation`;
- lokalna CMS baza kupca;
- lokalni issuer keys;
- nema automatskog slanja centralnom Night Raven servisu.

U kodu i UI-u koristiti ove domenske nazive. Fizičke legacy tabele mogu privremeno zadržati `license_server_*` prefix.

### Single-tenant odluka

Trenutna arhitektura je jedna organizacija/issuer po CMS instalaciji. P1 treba to eksplicitno da enforce-uje:

- singleton `customer_issuer_identity`;
- svi admin korisnici pripadaju istoj CMS instalaciji;
- API klijenti i proizvodi pripadaju tom issuer-u;
- nema tvrdnje da addon pruža multi-tenant SaaS.

Ako se kasnije uvede više nezavisnih tenant-a u jednoj bazi, to je zaseban redizajn: `tenantId` mora ući u sve PK/FK/unique/query scope invarijante. Ne dodavati opcioni `tenantId` samo formalno bez query enforcement-a.

### Customer issuer identity i keys

Dodati `customer_issuer_identity`:

```text
id uuid singleton
issuer_ref text unique
display_name
key_version
active_signing_kid
public_key_set jsonb/reference
created_at, updated_at
```

Privatni issuer key:

- generiše se lokalno pri inicijalizaciji addona;
- enkriptovan je installation/KMS ključem;
- nikada se ne šalje Night Raven centrali;
- ima backup/export/restore proceduru za vlasnika;
- rotacija podržava verification starih customer licenci;
- gubitak private key-a ne poništava validaciju već izdatih potpisanih licenci ako public key postoji, ali onemogućava novo signing/renewal dok se ne završi kontrolisan key recovery/rotation.

### Različit format i namespace

Night Raven vendor key i customer key moraju izgledati različito:

```text
NRV-...                    # Night Raven Vendor
NRC-<issuerRef>-...        # Night Raven Customer-issued ili drugi jasno različit prefix
```

Potpisani customer entitlement sadrži:

- `iss=customer issuer URI/ref`;
- `aud=customer product/app ID`;
- `kid` customer issuer key-a;
- customer license ID;
- product/SKU/edition/features;
- validity/update/offline policy;
- bez Night Raven vendor addon claim-ova.

Centralni Vendor License Service ne treba da validira `NRC-*` ključeve.

## Lokalni API client scopes

Trenutni lokalni API client može izdavati globalne lokalne proizvode. Dodati:

```text
customer_issuer_api_client_scopes
  api_client_id
  product_type_id
  action=catalog|issue|validate|renew|suspend|revoke
  environment
  revoked_at
```

Svaki issue/validate upit mora filtrirati po issuer ID-u, API client ID-u i product scope-u. Catalog vraća samo scoped proizvode.

## Customer product/license lifecycle

Lokalni model treba da podrži:

- perpetual;
- term;
- subscription reference koju kontroliše kupčev billing sistem;
- trial;
- active/suspended/expired/revoked/canceled;
- payment/business grace;
- activation limit po domain/device/server/seat tipu;
- domain transfer/deactivation;
- feature/edition/update entitlement;
- offline validation assertion.

Ne moraju svi UI workflow-i biti izgrađeni u jednom PR-u, ali statusi i API contract ne smeju objediniti payment/subscription/licence u jedno polje.

## Atomic customer activation

Trenutni count pa insert tok mora se zameniti istom vrstom atomike kao vendor activation:

1. Zaključati customer license red/advisory lock po license ID-u.
2. Proveriti lifecycle i policy.
3. Naći postojeću activation fingerprint vezu.
4. Pod lock-om prebrojati slotove.
5. Insert/rotate activation.
6. Audit/event u istoj transakciji.

Unique po fingerprint-u sprečava samo duplikat istog uređaja; ne sprečava dva paralelna različita uređaja da pređu limit bez lock-a.

## Runtime activation i validation

Public runtime endpointi moraju:

- imati distributed rate limit;
- hashovati license key pre lookup-a;
- ne vraćati customer PII;
- validirati issuer/product/app/domain/device binding;
- koristiti activation token hash, ne plaintext token;
- podržati deactivation bez otkrivanja admin credential-a;
- vratiti potpisani kratkotrajni assertion za offline korišćenje gde proizvod to zahteva;
- imati explicit reason codes bez enumeracije tuđih licenci.

`license-server-addon` vendor expiry policy iz faze 04 ostaje nadređena novim operacijama:

- nema novog customer issue-a ili activation-a posle vendor expiry-ja;
- postojeća validation/deactivation prema potpisanom `existingLicensePolicy`;
- lokalni customer podaci se ne brišu zbog vendor expiry-ja.

## Webshop ↔ Customer Issuer integracija

Kada kupac ima i Webshop i License Server addon na istoj CMS instalaciji, integracija ide kroz SDK capability, ne kroz centralni Night Raven servis:

```text
webshop payment captured
  -> local customer-license issue outbox
  -> Customer License Issuer capability
  -> local CustomerProductLicense
  -> delivery kupčevom customer-u
```

Manifest capability primer:

```text
customer-license-issuer.v1
```

Webshop proizvod čuva lokalni customer product/SKU reference. Addoni ne importuju međusobne interne data module. Host registry razrešava capability i contract version.

Ova integracija ne koristi `license-server.nrcms.com`, osim što svaki addon zasebno proverava sopstveni VendorAddonEntitlement.

## Backup i gubitak issuer ključa

Admin setup mora zahtevati:

- enkriptovani export issuer key backup-a ili potvrdu managed KMS backup-a;
- prikaz issuer fingerprint-a;
- recovery test pre označavanja setup-a završenim;
- dokumentaciju da gubitak privatnog ključa utiče na signing/renewal;
- key rotation/recovery ceremoniju koja čuva stare public verification key-eve;
- nikada slanje privatnog customer key-a Night Raven vendor podršci bez eksplicitnog, posebno bezbednog recovery proizvoda.

## Test-first redosled

### Vendor subscription/update

1. Renewal produžava isti entitlement, ne izdaje novi.
2. Failed renewal ulazi u payment grace bez instant pada sajta.
3. Grace expiry suspenduje/ističe prema policy-ju.
4. Cancel-at-period-end zadržava entitlement do roka.
5. Chargeback ima prednost nad naknadnim renewal webhookom.
6. Perpetual runtime + expired updates odbija novu verziju, ali stara radi.
7. Release pre/posle `updatesUntil` granice.
8. Edition/channel/CMS/schema mismatch.
9. Update grant je vezan za installation i artifact hash.

### Customer issuer

1. Customer-issued license nikada ne kreira red/poziv u centralnoj Vendor DB.
2. Vendor i customer key prefix/issuer nisu zamenljivi.
3. Customer API client bez product scope-a ne može issue/validate.
4. Dve paralelne različite aktivacije ne prelaze limit.
5. Deaktivacija oslobađa slot prema policy-ju.
6. Domain transfer je auditovan i stari binding prestaje da važi.
7. Runtime odgovor ne curi customer PII.
8. Customer issuer key rotation validira stare i nove licence.
9. Backup/export/restore u novu instancu prema kontrolisanoj recovery proceduri.
10. Gubitak key-a daje jasno recovery stanje, ne generiše tihi novi issuer.
11. LSA vendor expiry blokira novi issue/activate, ali ne briše lokalne podatke.
12. Webshop lokalno izdaje customer licencu kroz capability bez vendor centralnog poziva.
13. Pokušaj cross-client/cross-product pristupa vraća generički 404/403.

## Acceptance kriterijumi

- Subscription, payment, entitlement, activation i update statusi su odvojeni.
- Renewal menja isti stabilni entitlement.
- `updatesUntil` se sprovodi pre package download/install-a.
- Customer licence ostaju isključivo u kupčevoj CMS bazi u podrazumevanom režimu.
- Customer issuer ima zaseban issuer ID, prefix i keypair.
- Vendor private key nikada nije dostupan customer instalaciji.
- Lokalni API klijenti imaju product/action scopes.
- Customer activation limit je concurrency-safe.
- Webshop/LSA lokalna integracija koristi SDK capability, ne cross-addon private import.
- Key backup/restore i rotation su testirani.

## Rollout i rollback

1. Dodati nullable subscription/update/issuer kolone i nove tabele.
2. Backfill vendor entitlement `updatesUntil` prema dokumentovanoj legacy politici; ne izmišljati pravo bez business odluke.
3. Uvesti subscription reducer u shadow režimu.
4. Aktivirati jedan interni subscription SKU.
5. Generisati customer issuer identity/key na test LSA instalaciji.
6. Dual-validirati legacy i novi customer license format.
7. Prebaciti nove customer licence na novi issuer format.
8. Uključiti lokalni Webshop → Customer Issuer capability.
9. Legacy format povući tek nakon isteka/rotacije definisanog perioda.

Rollback ne spaja vendor i customer modele niti vraća isti key namespace. Subscription event ledger i issuer public key history se ne brišu. Ako je novi customer key već izdao licence, njegov public key mora ostati dostupan za verification čak i ako se novo izdavanje privremeno vrati na compatibility mode.

## Implementation record — 2026-07-12

Implementirane su additive centralne tabele `vendor_subscriptions`,
`vendor_subscription_events` i `vendor_release_manifests` kroz migraciju
`0005_vendor_subscriptions_updates`. `licenses` ostaje fizička kompatibilna
Vendor Entitlement tabela, sa nullable subscription/trial/payment-grace
referencama. Reducer razlikuje trial/payment grace od lokalnog offline grace-a;
renewal produžava isti entitlement, cancel-at-period-end ga ne prekida pre
plaćenog `currentPeriodEnd`, a terminalni revoke/canceled entitlement odbija
zakasneli renewal.

`POST /api/v1/entitlements/{id}:authorize-update` traži autentifikovanog,
scoped klijenta, aktivnu installation binding vezu i centralno objavljen release
manifest. Odluka proverava `updatesUntil`, status entitlementa, edition,
channel, CMS/schema compatibility i exact package hash. Ovo sprečava da runtime
ili Webshop sam prijavi proizvoljan target manifest.

CMS migracija `0086_customer_license_issuer` uvodi single-tenant
`customer_issuer_identity`, lokalni encrypted key history, lokalne API product
scope-ove i durable `customer_issuer_issue_outbox`. Customer ključ ima `NRC-`
namespace, lokalni Ed25519 `kid` i ne šalje se centralnom servisu. Export/restore
čuva isti issuer ref i stare public ključeve; conflict drugog issuera na istoj
CMS instalaciji je fail-closed. Webshop ima samo SDK capability contract
`customer-license-issuer`; nema private addon import ni Vendor License Service
poziv.

Pre rollout-a: generisati test/staging issuer kroz kontrolisan setup sa
`LICENSE_SERVER_SECRET_KEY`, dodeliti minimalne local API scopes, registrovati
stvarne release manifeste, pokrenuti PostgreSQL concurrency/restore drill i tek
onda uključiti lokalni Webshop issue outbox worker. Ne rotirati postojeće
customer ili production ključeve ovim patch-em.

### High-blocker remediation — 2026-07-12

`applyVendorSubscriptionEvent()` sada ima stvarni versioned runtime ulaz:
`POST /api/v2/vendor/subscriptions/events` prihvata samo contract `1`, bounded
provider identifikatore i postojeću HMAC v2/idempotency autentikaciju, pa tek
onda prosleđuje normalizovan događaj reduceru. Update authorize ruta ima
fail-closed `NRLS_RUNTIME_UPDATES_ENABLED=false` kill-switch; LSA activation
ruta ima nezavisni `NRLS_RUNTIME_ACTIVATIONS_ENABLED=false` kill-switch.

CMS migracija `0088_customer_issuer_durable_outbox` proširuje lokalni Customer
Issuer outbox lease/retry/dead-letter metapodacima i dodaje lokalni Webshop
outbox event `order.customer_license_issue_requested`. Webshop ga upisuje u
istoj captured-payment transakciji. Javni `LicenseServerAddon` contract
registruje `customerLicenseIssuer`; host ga razrešava preko loadera, bez
Webshop → LSA private importa. Customer issuer worker koristi samo CMS DB i
lokalni sistemski API identitet; nema `fetch`, Vendor License Service URL ili
centralni entitlement/key payload.

Customer activation sada prosleđuje isti `tx` kroz advisory lock, lookup,
fingerprint lookup, count, insert/rotate i audit. Unit race test pokreće 100
paralelnih zahteva nad lock/count/insert modelom; PostgreSQL endpoint race i
Webshop → issuer → delivery staging E2E ostaju rollout dokaz, ne lokalno
izvršen test.
