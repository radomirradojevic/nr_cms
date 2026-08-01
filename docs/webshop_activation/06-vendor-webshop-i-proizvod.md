# 06 — Vendor Webshop i licencni proizvod

## Cilj

Vendor CMS na https://vendor.nr.test koristi sopstvenu lifetime Webshop licencu, zatim prodaje četiri varijante proizvoda NR CMS Webshop license. Svaka varijanta mapira se na tačan SKU u master License Serveru.

## 1. Aktivirati vendor Webshop

Preduslovi:

- master provisioning gate iz dokumenta 04 je prošao;
- @radomirradojevic/webshop release je objavljen i registrovan;
- deployment worker za vendor target radi;
- vendor Global Settings publicSiteUrl je https://vendor.nr.test;
- vendor lifetime key je vezan za vendor.nr.test.

MANUAL:

1. Otvoriti vendor admin.
2. Otići na Content -> New content -> Webshop ili direktnu activation shell rutu.
3. Uneti ručno generisani lifetime key.
4. Očekivati status License accepted / install_pending, ne trenutni ready.
5. Sačekati worker job.
6. Potvrditi novi build i status ready.
7. Ponovo otvoriti Webshop admin.

DB evidence:

- webshop_addon_entitlements ima validan signed entitlement;
- vendor_addon_installation_identities canonical domain je vendor.nr.test;
- cms_addon_installations desired i installed release se podudaraju;
- `cms_addon_migrations` je `applied` za novi canonical baseline, ili `legacy_applied` isključivo posle operator-only schema cutover-a koji je dokazao exact manifest i postcondition fingerprint; release `0.5.0` se nikada ne prihvata kao produkcioni baseline;
- packageInstalledAt i readyAt nisu null.

Filesystem evidence:

    D:\nr_deploy\vendor\current\node_modules\@radomirradojevic\webshop

Ne sme postojati:

    D:\nr_cms-vendor\.private\webshop

## 2. Kreirati Webshop content

MANUAL:

1. Content -> New content -> Webshop.
2. Uneti title, na primer NR Licenses.
3. Izabrati stabilan slug, na primer licenses.
4. Objaviti content.
5. Proveriti:

       https://vendor.nr.test/licenses

6. Sačuvati shop slug kao deployment konfiguraciju/evidence.

Nemoj menjati slug posle objave bez redirect/migration plana; acceptance endpoint interno mapira stabilni `vendorProductRef` na ovaj canonical product URL.

## 3. Povezati vendor sa masterom

U Webshop Settings -> License Servers dodati:

    Title: Night Raven Master License Server
    Base API URL: https://license.nr.test/api/v1
    Client ID: <MASTER_ISSUED_CLIENT_ID>
    Key ID: <MASTER_ISSUED_KID>
    Shared secret: <ONE_TIME_REVEALED_SECRET>
    Status: active
    Show in policy menu: true

Key ID polje zahteva implementaciju iz dokumenta 04.

Shared secret se:

- šalje server action-u;
- šifruje sa `WEBSHOP_LICENSE_SERVER_SECRET_KEY`, koji je samo API-credential KEK;
- posle snimanja više ne prikazuje;
- ne čuva u product snapshotu;
- ne loguje.

Settings red čuva `auth_secret_kid` koji mora odgovarati envelope `kid=WEBSHOP_LICENSE_SERVER_SECRET_KID`. Stari `WEBSHOP_LICENSE_SERVER_SECRET_DECRYPTION_KEYS_JSON` unosi služe samo za kontrolisani batch rewrap. Legacy red bez KID-a klasifikuje se kao `legacy-license-server-secret-v1`, stvarno decrypt/validira i re-enkriptuje; ne sme dobiti novi KID običnim SQL update-om. KEK rotacija ne menja master Client ID, HMAC Key ID ili shared secret.

Ključevi licenci koje master kasnije izda kupcima ne koriste ovaj KEK; oni koriste odvojeni `WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KEY`/KID contract iz dokumenta 08.

Kliknuti Sync catalog.

Očekivani rezultat:

- HTTP 200 sa HMAC V2;
- product type Webshop license key;
- četiri aktivna SKU-a;
- lastCatalogStatus=success;
- itemCount=4;
- catalog snapshot sadrži durationDays 30, 183, 365 i 0.

Ako sync daje 401, ne pokušavati ručno da unese SKU. Prvo proveriti auth-version, KID, secret version, canonical path i clock.

## 4. P0: per-variant external SKU mapping

### Trenutni problem

Digital product ima product-level:

    licenseServerId
    licenseServerProductTypeId
    licenseServerSku

Jedan proizvod zato može izabrati samo jedan master SKU. Četiri storefront varijante bi sve izdale istu centralnu licencu.

### Ciljna šema

Proizvod zadržava:

    licenseServerId
    licenseServerProductTypeId

Varijanta dobija:

    externalLicenseSku text null

Dodatna target polja (kolone mogu privremeno biti nullable samo radi legacy migracije):

    externalLicenseSkuId text null
    externalLicenseCatalogVersion text null
    externalLicenseEnvironment text null

Ove kolone mogu biti nullable samo radi legacy/backfill kompatibilnosti. Za svaki novi domain-bound `license_server` proizvod i njegovu aktivnu varijantu i `externalLicenseCatalogVersion` i `externalLicenseEnvironment` su obavezni; server ih u wire/order snapshotu uvek naziva `catalogVersion` i `environment`. Verzija mora biti durable, environment-bound master revision oblika `nrls-catalog-v1:<ENVIRONMENT>:<DECIMAL_REVISION>:sha256:<64_LOWERCASE_HEX>` iz dokumenta 04. DB veza/revalidacija koristi kompozit `(externalLicenseEnvironment, externalLicenseCatalogVersion)` prema sinhronizovanom catalog-history redu; revision iz drugog environmenta se odbija. `syncedAt`, `generatedAt` i vreme GET zahteva su audit metadata i nisu zamena za version identitet.

Potrebno izmeniti:

    db/schema.ts
    odgovarajuću Drizzle migraciju
    .private/webshop/src/db/schema.ts ili package-local canonical schema
    webshop-product-domain.ts
    webshop-products.ts
    admin product actions
    serializers
    product-manager.tsx
    storefront/cart line read model
    order snapshot builder
    release migration manifest

Product-level licenseServerSku može privremeno ostati kao fallback samo za legacy single-SKU proizvode. Novi multi-SKU proizvod ne sme koristiti fallback.

### Validacija pri publish-u proizvoda

Za svaki active variant:

1. externalLicenseSku je obavezan;
2. postoji u poslednjem syncovanom catalogu;
3. pripada izabranom licenseServerId;
4. pripada izabranom productTypeId;
5. `externalLicenseCatalogVersion` je obavezan i odgovara syncovanom catalog zapisu;
6. `externalLicenseEnvironment` je obavezan i odgovara catalogu, vendor profilu i API client scope-u; kompozit `(externalLicenseEnvironment, externalLicenseCatalogVersion)` mora postojati u lokalnom immutable catalog history-ju;
7. catalog product i SKU su active;
8. local currency/price su validni;
9. duplicate external SKU mapping je dozvoljen samo uz eksplicitnu poslovnu odluku; za ovaj proizvod je zabranjen.

Ako bilo šta ne prolazi, proizvod ostaje draft.

### Snapshot

Kada se varijanta doda u cart, snapshotovati:

    localVariantId
    localSku
    offerKey
    externalProductTypeId
    vendorProductRef
    externalSku
    externalSkuId
    licenseServerId
    environment
    catalogVersion
    unitPriceMinor
    currency
    masterPurchaseIntentJti
    purchaseIntentContractVersion
    canonicalDomain

`purchaseIntentSnapshotHash` još ne postoji u cart fazi jer canonical binding uključuje buduće `orderRef`/`orderItemRef`. Generiše se tek u order-creation transakciji prema dokumentu 07 i zatim ostaje immutable.

Promena product mappinga posle toga ne menja postojeći checkout/order.

## 5. Kreirati proizvod

MANUAL, nakon per-variant implementacije:

    Title: NR CMS Webshop license
    Slug: nr-cms-webshop-license
    Product type: digital
    Delivery type: license
    License key policy: license_server
    License server: Night Raven Master License Server
    External product type: Webshop license key
    Status: active tek posle pune validacije

Predložene varijante:

| Customer label | Local SKU | External SKU | Trajanje |
|---|---|---|---:|
| 30 days | webshop-30 | webshop-30 | 30 |
| 6 months | webshop-183 | webshop-183 | 183 |
| 1 year | webshop-365 | webshop-365 | 365 |
| Lifetime | webshop-1000000 | webshop-1000000 | bez isteka |

Cene nisu definisane ovom specifikacijom. Operator unosi test cene i valutu. Svaka cena mora biti snapshotovana u order item.

Digital quantity je 1. Ako se kasnije dozvoli kupovina više licenci, svaka mora imati zaseban purchase intent/domain; quantity ne sme proizvesti više ključeva za jedan domain intent bez eksplicitnog contracta.

Javna product ruta:

    https://vendor.nr.test/licenses/p/nr-cms-webshop-license

Vendor/client env:

    WEBSHOP_BUY_URL=https://vendor.nr.test/licenses/purchase-intents/accept
    WEBSHOP_BUY_OFFER_KEY=nr-cms-webshop-license

Hardkodovanje URL-a u TypeScript kodu nije potrebno. Env/discovery je pravi sloj konfiguracije. Acceptance endpoint nakon verifikacije i master `:accept` tranzicije radi `303` na javnu product rutu; compact JWS nikada ne stavlja u njen query.

## 6. Storefront prikaz

Product page treba da prikaže:

- četiri varijante;
- ljudski naziv trajanja;
- cenu;
- canonical domain iz validnog purchase intenta;
- poruku da se licenca vezuje za taj domain;
- checkbox potvrde domena;
- upozorenje da transfer nije automatski;
- lifetime objašnjenje bez prikaza milion dana.

Ako validan purchase intent nedostaje:

- Add to cart je onemogućen za ovaj licencni proizvod;
- stranica objašnjava da kupovinu treba pokrenuti iz client CMS-a;
- ne koristi domain query kao trusted fallback.

Običan Webshop proizvod koji nije domain-bound nastavlja da radi bez purchase intenta.

## 7. Payment i notification postavke

Za prvi deterministički lokalni test:

- WEBSHOP_PAYMENTS_MODE=test;
- jedan test provider ili kontrolisani internal test adapter;
- customer receipt i status update email uključeni;
- EMAIL_PROVIDER stvarno konfigurisan ili test transport sa inspectable mailboxom;
- storefront i checkout uključeni tek kada product/purchase intent validacija prolazi.

Za realni provider sandbox, .nr.test nije javno routable. Potreban je provider CLI webhook forwarder ili privremeni HTTPS tunnel. Taj tunnel je samo payment callback origin; license canonical domain ostaje client.nr.test.

## 8. Vendor konfiguracioni gate

Gate prolazi kada:

- vendor addon je installed iz GitHub Packages i ready;
- shop content je objavljen;
- master API credential ima KID;
- catalog sync vraća četiri SKU-a;
- product ima četiri validna per-variant mappinga;
- direct product visit bez intenta ne može kupiti domain-bound licencu;
- validan client.nr.test intent prikazuje taj domen;
- cart quantity ostaje 1;
- order snapshot čuva izabrani external SKU i domen;
- secret se ne pojavljuje u HTML-u, logu ili snapshotu.
