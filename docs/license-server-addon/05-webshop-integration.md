# 05 — Integracija sa Webshop add-on-om

## 1. Korisnički model

Webshop nudi tri načina da digitalni proizvod isporuči kao licencu:

1. **Manual** — administrator ručno unosi ključ posle porudžbine;
2. **License pool** — Webshop rezerviše unapred uneti ključ iz pool-a;
3. **License Server** — Webshop traži generisanje od izabrane konekcije.

`License Server` je jedini javni naziv generatora. Korisnik ne bira interne
pojmove `customer_issuer` naspram `license_server`. Transport je osobina
konekcije:

- `Local License Server add-on` — zaseban add-on u istom CMS-u;
- `Remote NR License Server` — add-on na drugoj NR CMS instalaciji.

Centralni autorov Master konektor za prodaju Night Raven add-on-a je sistemski,
odvojen i nije ponuđen klijentu kao generator njegovih proizvoda.

## 2. Podešavanje konekcije

### Lokalna konekcija

Webshop prikazuje opciju samo kada host potvrdi da je License Server add-on:

- instaliran i učitan;
- u `ready` modu;
- podržava `customerLicenseIssuer.v2`;
- ima inicijalizovan issuer identity.

Administrator daje display name, environment i potvrđuje issuerRef. Nema URL-a
ni HMAC secret-a. Webshop čuva capability contract verziju i health rezultat.

### Udaljena konekcija

Administrator unosi:

- HTTPS base URL;
- client ID i secret prikazan na udaljenom License Server-u;
- environment;
- opcioni očekivani issuerRef.

`Test connection` radi health, issuer, TLS/host proveru i scope-ovani catalog
poziv. Posle prve potvrde Webshop pin-uje issuerRef; promena zahteva ručnu
reautorizaciju. Secret se envelope-encryptuje i nikad se ponovo ne prikazuje.

### Status konekcije

Najmanje: `active`, `degraded`, `auth_failed`, `issuer_changed`, `disabled`.
Admin vidi poslednji uspešan health/catalog sync, revision, sanitized error code
i `Rotate credentials`, `Disable`, `Sync now` radnje.

## 3. Sinhronizacija kataloga

Webshop čuva lokalni read model, ne kopira issuer privatne podatke:

- issuerRef i catalog revision/ETag;
- Product Type ref/name/audience;
- Profile SKU/name/revision/status;
- policy summary, features/limits i trajanje;
- claim schema version/hash;
- dozvoljeni claim input-i i mapping izvori;
- deprecation/compatibility flagovi.

Sinhronizacija je ručna i periodična. `304` ne menja podatke. Nestanak profila ne
briše istorijske order snapshot-e. Novi checkout se blokira ako izabrana
revizija više nije aktivna ili nije potvrđena.

## 4. Podešavanje digitalnog proizvoda

Kada je delivery `license` ili `file_license`, administrator bira:

- source: manual, pool ili License Server;
- License Server connection;
- Product Type i License Profile;
- način prikaza: reveal key, download signed license file, oba;
- claim mapping, samo iz issuer-ove allowliste;
- fallback ponašanje: standardno **bez fallback-a** na pool/drugi issuer.

UI prikazuje šta će biti vezano: domen, organization/tenant, customer ref,
edition, seat limit i druga polja. Obavezna potvrda binding-a na storefront-u
koristi se samo kada je to poslovno pravilo konkretnog proizvoda; License Server
add-on ne zahteva univerzalni checkbox za svaku licencu.

## 5. Claim mapping

Početno podržani izvori:

- konstanta definisana na Webshop proizvodu/varijanti;
- product ID/slug i variant ID/SKU;
- order ID i order item ID;
- pseudonimizovani customer external ref;
- organization/tenant ID iz autentifikovanog naloga;
- normalizovan domen koji je kupac eksplicitno potvrdio;
- quantity/seat count uz issuer-ov min/max;
- unapred definisana, validirana checkout polja.

Nisu dozvoljeni proizvoljni JS, template eval, SQL/JSONPath nad celim orderom,
payment tokeni, session/cookie podaci ili neograničeni PII. Preview mora prikazati
efektivne claims i validacionu grešku pre publish-a proizvoda.

Mapping konfiguracija ima revision/hash i pin-uje se na order item.

## 6. Fulfillment state machine

```text
not_required
pending_payment
ready_to_issue
issue_pending
issued
delivered

issue_pending -> retry_wait -> issue_pending
issue_pending -> failed | dead_letter
issued -> delivery_failed -> delivered
```

Pravila:

1. Issue počinje samo iz autoritativnog, idempotentnog `paid` događaja.
2. Webshop operation key je stabilan po order item-u i nameni, npr.
   `webshop:<storeId>:<orderItemId>:issue:v1`.
3. Local i remote konekcija koriste isti Webshop operation/receipt zapis.
4. HTTP/capability timeout znači „status nepoznat”, ne „izdaj ponovo”. Prvo se
   čita postojeća operacija.
5. `issued` zahteva trajni receipt. `delivered` zahteva uspešno bezbedno
   skladištenje/isporuku.
6. Admin može retry/reconcile; ne može promeniti operation key radi zaobilaženja
   idempotency konflikta bez posebnog audited recovery toka.

## 7. Snapshot na order item-u

Najmanje:

- connection ID/transport i issuerRef;
- Product Type ref, Profile SKU i revision;
- catalog/schema/policy/mapping hash;
- sanitized claim input hash i efektivni claim snapshot bez tajni;
- issue operation/receipt/license reference;
- fulfillment/lifecycle status i last error code;
- timestamps i correlation ID.

Snapshot ne sadrži HMAC secret, privatni ključ ili plaintext licencni ključ u
običnom JSON-u.

## 8. Digitalna isporuka

Receipt se deli na:

- javne/sigurne podatke za listing: masked key, Product/Profile, status, rok;
- reveal secret: plaintext key, envelope-encrypted sa auditom;
- signed assertion/license file: integritet zaštićen potpisom, ali može sadržati
  customer-visible claims;
- internal-only issuer/Webshop metadata koja se nikad ne isporučuje kupcu.

E-mail sadrži link ka autentifikovanoj order/download strani, ne plaintext ključ.
Download/reveal ima rate limit, expiration po potrebi i audit. Signed assertion
nije tajna, ali privatni/PII claims se ipak minimizuju.

## 9. Lifecycle sinhronizacija

- refund pre issue-a otkazuje pending operation gde je bezbedno;
- refund posle issue-a šalje `refund`;
- chargeback šalje `chargeback`;
- subscription renewal šalje `renew` sa novim expiry-jem tek posle uspešne
  naplate;
- cancellation po isteku ne mora odmah revoke-ovati već plaćeni period;
- admin suspend/resume mora imati razlog i permission;
- svaka komanda je idempotentna i ima sopstveni operation key.

Ako je issuer nedostupan, Webshop ne lažno prikazuje uspeh: lifecycle ostaje
pending/retry/dead-letter i alarmira administratora.

## 10. Migracija postojećeg koda

1. Zadržati postojeći `license_server` UI naziv.
2. Uvesti connection transport/kind i mapirati postojeće remote zapise.
3. Sakriveni `customer_issuer` policy migrirati na `license_server` + lokalnu
   konekciju, bez menjanja istorijskih snapshot-a.
4. Uvesti zajednički V2 adapter koji vraća isti operation/receipt za capability i
   HTTP.
5. Postojeći autorov Master entitlement tok ostaviti u posebnom namespace-u i
   ne koristiti ga kao customer issuer API.
6. V1 fallback održati samo tokom vremenski ograničene migracije, uz metriku
   korišćenja i datum uklanjanja.

## 11. E2E acceptance scenario

Produkcioni scenario mora dokazati:

1. korisnik kupi i instalira License Server add-on;
2. kreira Product Type, custom schema i Profile;
3. Webshop uspostavi lokalnu ili udaljenu konekciju;
4. kreira digitalni proizvod sa mapping-om;
5. test order pre plaćanja ne izdaje licencu;
6. jedan `paid` događaj uz višestruke retry-je izdaje tačno jednu licencu;
7. kupac otvori reveal/download i aplikacija verifikuje potpis/claims;
8. aktivacioni limit izdrži konkurentne pozive;
9. refund/chargeback promeni online odluku;
10. key rotation i restart/redeploy ne prekidaju postojeću validaciju.
