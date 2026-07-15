# Faza 03 — P0 Night Raven Vendor License Service

> Istorijska beleška: legacy `/api/v1/licenses` i `/api/v1/licenses/validate` rute su uklonjene nakon nulte upotrebe. Aktuelni ugovor je `/api/v1/entitlements`.

> Finalna verifikacija 2026-07-12: **centralni contract i PostgreSQL testovi prolaze, faza nije produkciono zatvorena**. Centralni production-like build prolazi sa test identitetima; staging scope/provisioning, E2E i rollout dokaz nedostaju. Videti [11-final-verification-report.md](./11-final-verification-report.md).

## Cilj

Pretvoriti privatni centralni `license-server` u autoritativni, versioned servis za Night Raven addon entitlements sa potpunim product scope-om, bezbednom idempotency semantikom i lifecycle komandama potrebnim za issue, renewal, refund, chargeback, suspension i revocation.

Fizički projekat može ostati `D:\nr_cms\.private\license-server`. U domenskom kodu i API dokumentaciji koristiti naziv **Night Raven Vendor License Service** kako se ne bi mešao sa Customer License Issuer funkcijom kupljenog addona.

## Potvrđeni problemi koje faza rešava

- Validation upit filtrira samo `licenseKeyHash`, ne i autentifikovani API client.
- Svaki aktivan API klijent može izdavati svaki aktivan product/SKU.
- Domain allowlist se zaobilazi slanjem `domain=null`.
- Webshop očekuje catalog koji centralni servis nema.
- Customer email/name se šalju, ali centralni Zod contract i schema ih ne prihvataju.
- Idempotency je `SELECT -> INSERT`, nije concurrency-safe i nema request hash conflict.
- Drugi key za isti order item može napraviti novu licencu.
- Model nema stabilnu payment/subscription/customer/update/lifecycle vezu.
- Ne postoje izvršne renew/suspend/revoke/refund/chargeback komande.
- Audit insert i entitlement insert nisu jedna atomska poslovna transakcija.

## Glavni moduli za izmenu

- `D:\nr_cms\.private\license-server\src\db\schema.ts`
- `D:\nr_cms\.private\license-server\src\data\licenses.ts`
- `D:\nr_cms\.private\license-server\src\lib\api-auth.ts`
- `D:\nr_cms\.private\license-server\src\lib\license-keys.ts`
- `D:\nr_cms\.private\license-server\src\lib\audit.ts`
- `D:\nr_cms\.private\license-server\app\api\v1\licenses\route.ts`
- `D:\nr_cms\.private\license-server\app\api\v1\licenses\validate\route.ts`
- nove `/api/v1/catalog` i `/api/v1/entitlements/*` rute;
- admin actions/pages za entitlement lifecycle;
- centralne Drizzle migracije, env schema i testovi;
- deljeni vendor-license contract/test vectors.

## P0 scope i P1 ekstenzije

P0 mora isporučiti:

- catalog;
- issue;
- validate/status lookup sa pravilnim scope-om;
- suspend;
- revoke;
- refund;
- chargeback;
- jednostavan renew/extend;
- customer/order/payment reference;
- idempotency/request hash;
- product/action scope;
- audit/lifecycle evente.

Pun subscription orchestration i update channel politika završavaju se u fazi 08, ali schema iz ove faze mora imati stabilne nullable reference i `updatesUntil` da kasnija migracija ne menja identitet entitlementa.

## Ciljni API namespace

Uvesti `/api/v1/entitlements` kao novi autoritativni contract. Stari `/api/v1/licenses` ostaviti privremeno iza compatibility adaptera i deprecation metrike. Novi Webshop ne treba da poziva legacy rutu.

Minimalne rute:

```text
GET  /api/v1/health
GET  /api/v1/catalog
POST /api/v1/entitlements
GET  /api/v1/entitlements/{id}
POST /api/v1/entitlements/{id}:renew
POST /api/v1/entitlements/{id}:suspend
POST /api/v1/entitlements/{id}:reinstate
POST /api/v1/entitlements/{id}:revoke
POST /api/v1/entitlements/{id}:refund
POST /api/v1/entitlements/{id}:chargeback
POST /api/v1/entitlements:validate
```

Activation rute su detaljno obrađene u fazi 04.

## Service authentication V2

Canonical string treba versionovati:

```text
NRLS-HMAC-V2
<METHOD>
<NORMALIZED_PATH_AND_QUERY>
<TIMESTAMP>
<NONCE>
<CLIENT_ID>
<IDEMPOTENCY_KEY_OR_EMPTY>
<BODY_SHA256>
```

Obavezni headeri:

```text
X-NRLS-Auth-Version: 2
X-NRLS-Client-Id
X-NRLS-Timestamp
X-NRLS-Nonce
X-NRLS-Signature
Idempotency-Key       # svaka mutation ruta
X-Request-Id          # opciono od klijenta; server generiše ako nedostaje
```

Pravila:

- Timestamp skew ostaje bounded.
- Nonce se čuva uz API client i ima cleanup/retention job.
- GET catalog mora koristiti isti HMAC contract; `api-auth.ts` više ne sme biti ograničen samo na POST.
- Idempotency key je deo potpisa.
- Reverse proxy headeru se ne veruje kao identitetu klijenta.
- Production URL mora biti HTTPS.
- API client secret rotation koristi `kid`/secret version i kratak overlap, ne samo instant replace.

## Authorization model

Dodati `api_client_scopes` ili preciznije `api_client_product_scopes`:

```text
id
api_client_id
product_type_id nullable       # null samo za eksplicitni global admin service scope
sku_id nullable
action                         # catalog|issue|validate|renew|suspend|revoke|refund|chargeback
environment                    # development|staging|production
created_at, revoked_at
UNIQUE(api_client_id, product_type_id, sku_id, action, environment)
```

Za `nrcms.com` production credential dozvoliti samo Night Raven addon proizvode koje prodavnica stvarno prodaje. Staging credential ne sme moći da izdaje production entitlements.

Svaka ruta sprovodi scope posle autentifikacije, pre čitanja/izmene entitlementa. Validation mora filtrirati najmanje po `licenses.apiClientId = authenticatedClient.id`, osim ako je uveden zaseban, eksplicitno autorizovan validator scope sa issuer boundary-jem.

Domain pravilo:

- ako API client ili proizvod zahteva domen, `domain=null` je `400/403`, ne bypass;
- normalizacija koristi validan URL/hostname parser;
- ukloniti userinfo, port prema politici, trailing dot i IDN normalizovati;
- wildcard/staging/localhost pravila su eksplicitna product politika, ne string hack.

## Catalog contract

`GET /api/v1/catalog` vraća samo SKU-eve vidljive autentifikovanom klijentu:

```json
{
  "contractVersion": 1,
  "catalogVersion": "2026-07-11T10:00:00Z:42",
  "productTypes": [
    {
      "id": "uuid",
      "addonKey": "webshop",
      "title": "Night Raven Webshop",
      "status": "active",
      "skus": [
        {
          "id": "uuid",
          "sku": "WEBSHOP-1Y",
          "edition": "standard",
          "licenseType": "term",
          "durationDays": 365,
          "activationLimit": 1,
          "features": ["webshop"],
          "updatePolicy": { "includedDays": 365 },
          "status": "active"
        }
      ]
    }
  ]
}
```

Catalog ID/SKU se ne smeju implicitno menjati između okruženja bez mapping-a. Webshop product konfiguracija čuva centralni `productTypeId`, SKU i catalog version snapshot korišćen pri kupovini.

## Issue contract

`POST /api/v1/entitlements`

```json
{
  "contractVersion": 1,
  "orderRef": "NR-2026-000123",
  "orderItemRef": "01J...",
  "paymentTransactionRef": "stripe:pi_...",
  "webhookEventRef": "evt_...",
  "customer": {
    "externalRef": "cus_...",
    "email": "buyer@example.com",
    "name": "Optional display name"
  },
  "product": {
    "productTypeId": "uuid",
    "addonKey": "webshop",
    "sku": "WEBSHOP-1Y",
    "priceRef": "price_..."
  },
  "subscriptionRef": null,
  "domain": "example.com",
  "quantity": 1
}
```

PII minimizacija:

- `customer.externalRef` je primarna veza;
- email čuvati samo ako je potreban za vendor support/ownership i definisati retention;
- ne stavljati customer podatke u entitlement potpis ako nisu potrebni runtime-u;
- nikada vraćati PII u validation odgovor namenjen nepoverljivom runtime klijentu.

Success `201`:

```json
{
  "contractVersion": 1,
  "entitlementId": "uuid",
  "licenseKey": "NRV-...",
  "licenseKeyRef": "NRV-...last4",
  "status": "active",
  "validUntil": "2027-07-11T00:00:00Z",
  "updatesUntil": "2027-07-11T00:00:00Z",
  "activationLimit": 1,
  "features": ["webshop"],
  "signedEntitlement": "base64url.signature",
  "kid": "nrv-ed25519-2026-01",
  "createdAt": "2026-07-11T00:00:00Z"
}
```

## Idempotency model

Dodati `idempotency_records`:

```text
id
api_client_id
route_key
idempotency_key
request_hash
status=processing|completed|failed
response_status
response_body_encrypted/redacted
resource_type
resource_id
locked_until
created_at, completed_at, expires_at
UNIQUE(api_client_id, route_key, idempotency_key)
```

Algoritam u transakciji:

1. Izračunati canonical request hash posle schema validacije.
2. Insertovati idempotency red ili zaključati postojeći.
3. Postojeći completed + isti hash → vratiti originalni semantički odgovor.
4. Postojeći red + drugi hash → `409 idempotency_conflict`.
5. Aktivni `processing` → bounded wait ili `409/425 request_in_progress` sa retry informacijom.
6. Istečeni processing lease → bezbedan recovery uz proveru resource ID-a.
7. Proveriti product/action scope.
8. Kreirati entitlement, lifecycle event i audit u istoj DB transakciji.
9. Sačuvati response status/resource i označiti completed.

Pored idempotency unique-a, dodati business unique koji garantuje da jedan Webshop order item/SKU ne dobije dva nezavisna entitlementa:

```text
UNIQUE(api_client_id, order_item_ref, sku_id)
```

Ako quantity > 1 kasnije znači više entitlementa, identitet mora uključiti eksplicitan `unitRef/seatRef`, ne novi nasumični idempotency key.

## License key strategija

Za nove entitlements preporučeno:

- generisati najmanje 128 bita CSPRNG vrednosti;
- čuvati SHA-256/HMAC lookup hash;
- plaintext čuvati samo envelope-encrypted ako portal/replay zahteva ponovno prikazivanje;
- encryption key je iz KMS/secret store-a, sa `kid`;
- response/idempotency cache je enkriptovan i redigovan u logovima;
- prefix razlikuje vendor ključ od customer-issued ključa, npr. `NRV-` naspram `NRC-<issuerRef>-`.

Postojeće determinističke `NRLS-` ključeve ne rotirati automatski bez migration/customer communication plana. Obeležiti ih `keyFormatVersion=legacy-1` i podržati validation tokom definisanog perioda.

## DB model — praktična additive migracija

Radi smanjenja rizika fizička `licenses` tabela može ostati tokom P0, ali domain layer treba da je tretira kao Vendor Entitlement. Rename tabele nije uslov P0.

Dodati/normalizovati:

- `customer_external_ref`, opciono email/name;
- `payment_transaction_ref`, `webhook_event_ref`, `subscription_ref`, `price_ref`;
- `valid_from`, `valid_until`, `updates_until`;
- `activation_limit`;
- `edition`, `plan_ref`;
- `status` proširiti na `pending|active|suspended|expired|revoked|canceled`;
- `suspended_at`, `expired_at`, `revoked_at`, `canceled_at`;
- `status_reason_code`;
- `lifecycle_version bigint not null default 0`;
- `key_format_version`, `license_key_kid`;
- `created_by_event_id`/source reference;
- `metadata` bez autoritativnih polja koja već imaju kolone.

Dodati tabele:

- `vendor_entitlement_events` — append-only lifecycle audit;
- `idempotency_records`;
- `api_client_product_scopes`;
- activation tabelu iz faze 04;
- opciono `vendor_customers` ako se isti customer koristi za više entitlementa.

Autoritativne activations više ne smeju ostati u `licensePayload` JSON-u.

## Lifecycle komande

Svaka komanda ima sopstveni idempotency key, request hash, reason code, source reference i očekivanu prethodnu `lifecycleVersion` ili server-side lock.

### Renew

- produžava isti entitlement;
- ne izdaje novi license key;
- beleži prethodni i novi `validUntil/updatesUntil`;
- mora biti vezan za renewal payment/subscription event;
- ne obnavlja revoked/chargeback entitlement bez posebne reinstate politike.

### Suspend

- privremeno onemogućava nove activation/update operacije;
- ponašanje postojećih aktivacija je deo potpisane policy vrednosti;
- koristi se npr. za otvoreni dispute ili past-due grace kraj.

### Revoke

- terminalna bezbednosna/admin odluka;
- zahteva reason i audit actor;
- ne briše license/activation istoriju.

### Refund

- full refund tipično opoziva entitlement;
- partial refund ne sme automatski opozvati ako business policy to ne zahteva; request nosi amount i refund ID;
- duplicate provider refund ID je no-op.

### Chargeback

- open dispute može suspendovati;
- lost dispute opoziva;
- won dispute ne radi automatski reinstate bez eksplicitne politike.

## Monotonic lifecycle

Komande moraju nositi `sourceOccurredAt`, ali centralni servis ne treba slepo da sortira samo po klijentskom timestamp-u. Koristiti:

- unique provider/source event reference;
- lifecycle version;
- status transition matrix;
- terminalne invarijante;
- eksplicitnu admin reinstate komandu.

Npr. zakasneli `issue` retry ne može vratiti revoked entitlement u active, jer business unique pronalazi postojeći resurs i vraća njegov aktuelni status.

## Backfill i compatibility

1. Napraviti preflight listu duplicate order item refs, API client/SKU odnosa i license payload activation JSON-a.
2. Dodati nullable kolone i nove tabele.
3. Backfill status/lifecycle datume iz postojećih kolona/payload-a.
4. Kreirati default scopes za postojeće API klijente na osnovu stvarno korišćenih proizvoda; ne davati globalni wildcard bez ručne potvrde.
5. Backfill request hash za postojeće idempotency redove gde se original može canonicalno rekonstruisati; ostale označiti legacy.
6. Dodati business unique tek posle rešavanja konflikata.
7. Legacy `/api/v1/licenses` dual-write-uje novi model i emituje deprecation metriku.
8. Webshop prebaciti na V2.
9. Legacy rutu ukloniti tek posle dokazano nulte upotrebe.

## Test-first redosled

Centralni servis trenutno nema stvarne testove; pre refaktora postaviti test harness sa izolovanom PostgreSQL bazom.

Obavezni testovi:

1. API client A ne može validirati entitlement klijenta B.
2. API client bez Webshop issue scope-a dobija 403.
3. Domain-required client sa `domain=null` se odbija.
4. Catalog vraća samo scoped proizvode.
5. Dva paralelna ista issue zahteva daju jedan entitlement i isti odgovor.
6. Isti idempotency key sa različitim body-jem daje 409.
7. Drugi key za isti order item/SKU ne kreira drugi entitlement.
8. Issue + audit/event su atomski; simulirana audit greška ne ostavlja polukreiran rezultat.
9. Lost response retry vraća isti entitlement/key prema definisanoj secure replay politici.
10. Renew produžava isti entitlement.
11. Suspend/revoke/refund/chargeback su idempotentni.
12. Zakasneli issue/renew ne oživljava revoked/chargeback entitlement.
13. Validation odgovor ne curi customer PII.
14. Legacy key validacija radi tokom compatibility perioda.
15. HMAC V2 test vectors identično prolaze u Webshop i centralnom repozitorijumu.
16. Nonce replay i timestamp skew.
17. Secret rotation overlap sa starim i novim `kid`-em.

## Acceptance kriterijumi

- Cross-client validation i cross-product issuance su dokazano blokirani.
- Catalog contract odgovara Webshop consumer contract testu.
- Jedan order item/SKU ne može proizvesti dva entitlementa ni sa različitim idempotency key-em.
- Sve mutation rute implementiraju isti idempotency/request-hash middleware.
- Refund i chargeback menjaju isti entitlement koji je nastao kupovinom.
- Centralni servis čuva stabilnu customer/order/payment/subscription/update vezu.
- Nema neredigovanog license key-a ili API secret-a u audit/error logovima.
- Centralni unit/integration/contract suite prolazi u CI-ju.

## Rollout i rollback

1. Deploy additive centralne migracije.
2. Kreirati scopes za staging API client.
3. Uključiti V2 catalog/issue na staging-u.
4. Legacy rutu držati read/dual-write kompatibilnom.
5. Prebaciti interni `nrcms.com` Webshop na V2 iza `VENDOR_LICENSE_API_V2` flaga.
6. Pratiti idempotency conflict, scope denial, duplicate business key i lifecycle latency metrike.
7. Tek posle kompletnog E2E seta kreirati production-scoped credential.

Rollback vraća Webshop na compatibility adapter samo ako nema semantičkog gubitka lifecycle događaja. Nove entitlement/event/scopes tabele se ne brišu. Ako je V2 već obradio refund/revoke, legacy V1 odgovor mora prikazati aktuelni status, ne staro stanje.

## Implementation record — 2026-07-12

Implementiran je `0002_vendor_license_v2` kao additive migracija centralnog
Night Raven Vendor License Service-a. Ona proširuje postojeću `licenses` tabelu
u kompatibilni Vendor Addon Entitlement model i uvodi `api_client_product_scopes`,
`api_client_secret_versions`, `idempotency_records`, `vendor_entitlement_events`
i pripremnu `vendor_entitlement_activations` tabelu. Pre business unique indeksa
za `(api_client_id, order_item_ref, sku_id)` migracija eksplicitno prekida ako
nađe postojeće duplikate; stare kolone i legacy hash-evi ostaju.

Nove rute koriste `/api/v1/entitlements` i `/api/v1/catalog`, payload
`contractVersion: 1` i `NRLS-HMAC-V2` canonical string. HMAC obuhvata method,
normalizovan path/query, timestamp, nonce, client ID, `Idempotency-Key` i SHA-256
body hash. Katalog je autentifikovani GET. API client mora imati aktivni
product/SKU/action/environment scope; V2 validate i GET entitlement filtriraju
po autentifikovanom clientu pre vraćanja podataka. Null domain se odbija kada
ga zahteva client allowlist ili proizvod.

Issue, lifecycle event, audit i encrypted idempotency replay rezultat nastaju u
istoj transakciji. Novi `NRV-` ključevi su CSPRNG, čuvaju se kao SHA-256 lookup
hash i enkriptovana vrednost za bezbedan idempotency replay; postojeći `NRLS-`
ključevi ostaju `legacy-1` i validni su tokom compatibility perioda. Završni
activation/JWS tok nije implementiran.

Legacy `/api/v1/licenses` i `/validate` compatibility adapteri su uklonjeni
nakon potvrđene nulte upotrebe. Aktuelne integracije koriste V2 scope/validation
granice. V2 ostaje iza
`VENDOR_LICENSE_API_V2=false` dok staging rollout ne bude odobren.

Lokalni centralni PostgreSQL harness koristi samo `nrls_dev_test`; odbija
`nr_cms_dev_test` i svaki non-test target. U CI-ju je obavezan
`NRLS_TEST_DATABASE_URL`. Dokazani su HMAC/shared contract vektori, authenticated
scope-filtered catalog, cross-client validation zabrana, null-domain zabrana,
100 paralelnih istih issue zahteva (jedan entitlement), idempotency conflict,
lifecycle refund/chargeback/revoke nad istim entitlementom i transakcioni
rollback kada audit insert namerno padne.

Pre produkcionog rollout-a ostaju: ručno kreiranje production/staging scope-ova
posle preflighta, migration backfill/merenje postojećih duplicate order-item
referenci, KMS/envelope key management iz faze 07 i faza 02 outbox koji jedini
sme stvarno pozivati V2 issue/lifecycle API.
