# Night Raven CMS — produkcijski deployment i ručni E2E test

Verzija dokumenta: 27. avgust 2026.

Ovaj runbook pokriva tri javna sistema i jedan namerno izostavljen sistem:

| Uloga | Javni domen | Aplikacija | Addoni u buildu |
| --- | --- | --- | --- |
| Master License Server | `https://ls.nrcms.com` | zaseban NRLS repozitorijum | nema CMS addona |
| Vendor webshop | `https://vendor.nrcms.com` | Night Raven CMS, profil `vendor` | Webshop |
| Klijentski CMS | `https://client.nrcms.com` | Night Raven CMS, profil `client` | Webshop + License Server add-on |
| Deployment worker | nema domen u ovom profilu | nije potreban | immutable preinstalled deployment ga zamenjuje |

## 0. Zatečeni javni baseline

Read-only provera 27. avgusta 2026. pokazala je:

| Domena/endpoint | Rezultat | Operativna odluka |
| --- | --- | --- |
| `ls.nrcms.com/api/v1/health` | HTTP 200, NRLS `0.1.0`, Vercel | postojeći servis radi, ali se mora ažurirati |
| `ls.nrcms.com/.well-known/nr-license-keys.json` | HTTP 200, KID počinje sa `dev-ed25519` | ne koristiti taj dev ključ za produkcijski test |
| Master purchase-intent i addon-release keyset endpointi | HTTP 404 | deploymentovati novu Master verziju i fresh production key material |
| `vendor.nrcms.com` i `client.nrcms.com` | Vercel `DEPLOYMENT_NOT_FOUND`, HTTP 404 | kreirati/povezati dva CMS projekta i redeployovati |
| `worker.nrcms.com` | Vercel `DEPLOYMENT_NOT_FOUND`, HTTP 404 | očekivano; worker domen se ne kreira u izabranom profilu |

Zato za konkretan test iz ovog dokumenta ne primenjivati pravilo „sačuvaj postojeće production ključeve“ iz odeljka 6.1: trenutni javni ključ je razvojni. Pratiti odeljak 6.2, sačuvati nove private vrednosti isključivo u secret store-u, redeployovati Master i tek posle svih keyset HTTP 200 provera izdati vendor lifetime ključ.

## 1. Konačna arhitektura

GitHub čuva izvorni kod, ali javna instanca nije samo kopija repozitorijuma. Svaki deployment mora imati zaseban projekat ili servis, domen, runtime secrets, bazu, storage, migration identitet, release pin i raspored periodičnih poslova.

Vendor i client mogu koristiti isti CMS repozitorijum i isti commit, ali moraju biti dva odvojena Vercel projekta ili dva odvojena kontejnerska servisa. Razlikuju ih `NR_CMS_DEPLOYMENT_PROFILE`, domen, baza, secrets i lista ugrađenih addona. Master je zasebna aplikacija i zaseban deployment.

Addoni se ne instaliraju pisanjem u filesystem pokrenute Vercel funkcije. Potpisani privatni npm paketi se proveravaju i ugrađuju u immutable build. Aktivacija zatim vezuje licencu za tačan paket, release ID, migration ledger, CMS commit, instalacioni Ed25519 ključ i javni domen.

Produkcijska aktivacija prolazi samo ako su istovremeno validni:

1. plaćena ili ručno izdata licenca na Masteru;
2. potpis challenge-a privatnim instalacionim ključem CMS instance;
3. kratkotrajni HTTPS dokaz na `/.well-known/nr-license-domain-proof/<challenge-id>`;
4. kompatibilan, objavljen i potpisan release iz Master kataloga;
5. tačan preinstalled paket i primenjen addon migration ledger.

Na Vercelu se dodatno beleži stabilni `NR_VERCEL_PROJECT_ID`. On je identifikator projekta, dok HTTPS dokaz i instalacioni potpis čine bezbednosnu potvrdu.

## 2. Zašto jedan GitHub pull nije dovoljan

Jedan repozitorijum može da bude povezan sa više Vercel projekata, ali svaki projekat poseduje sopstveni deployment config. Za ovaj scenario potrebno je:

- Vercel projekat `nrcms-master` iz Master repozitorijuma;
- Vercel projekat `nrcms-vendor` iz CMS repozitorijuma sa profilom `vendor`;
- Vercel projekat `nrcms-client` iz istog CMS repozitorijuma sa profilom `client`;
- tri odvojene PostgreSQL baze i najmanje odvojene runtime/migrator role;
- privatni GitHub Packages read token tokom install/build faze;
- tri seta environment promenljivih;
- tri custom domena i odgovarajući DNS/TLS;
- Vercel Blob po CMS projektu ili trajan VPS storage;
- eksplicitna migracija i backup/PITR referenca.

Na VPS-u iste granice postoje kao odvojeni kontejneri. Git `pull` samo ažurira izvor; zatim se gradi novi image, proveravaju release potpisi, izvršavaju kontrolisane migracije i tek onda menja runtime.

## 3. Fajlovi isporučeni uz rešenje

- `deploy/env/ls.nrcms.com.env.example` — kompletan Master primer;
- `deploy/env/vendor.nrcms.com.env.example` — kompletan vendor primer, PayPal Sandbox;
- `deploy/env/client.nrcms.com.env.example` — kompletan client primer;
- `vercel.json` — install/build komande i CMS cron poslovi;
- `.private/license-server/vercel.json` — Master build i nonce-cleanup cron;
- `deploy/docker/Dockerfile.cms` — CMS builder, migrator i runtime target;
- `.private/license-server/Dockerfile` — Master builder, migrator i runtime target;
- `deploy/docker/compose.production.example.yml` — kompletan VPS primer;
- `deploy/docker/Caddyfile.production.example` — TLS reverse proxy za sva tri domena;
- `deploy/docker/run-production-crons.sh` — CMS background job runner za VPS;
- `deploy/docker/run-license-server-cron.sh` — Master cleanup runner za VPS;
- `scripts/provision-vendor-webshop-master.mjs` — idempotentna vendor→Master V1 konekcija i catalog sync.

## 4. Preduslovi

Pre prvog deploymenta obezbediti:

- vlasništvo nad `nrcms.com` DNS zonom;
- tri PostgreSQL baze: `master_license_server`, `vendor_cms`, `client_cms`;
- backup/PITR uključen pre migracija;
- Clerk production aplikaciju i dozvoljene origin-e za vendor i client;
- Turnstile site/secret parove sa tačnim hostname-ovima;
- Resend domen i API ključ za vendor isporuku licenci;
- PayPal Developer Sandbox Business i Personal nalog;
- GitHub fine-grained/PAT token sa read pristupom privatnim Packages paketima;
- release public keyset i njegov SHA-256 pin;
- admin identitet za Master i admin korisnike za oba CMS-a.

Ne koristiti istu bazu, encryption key, HMAC secret, Clerk secret ili PayPal credential na dva servisa. Placeholdere `REPLACE...` ne deploymentovati.

## 5. Baze i migracione role

Za svaki CMS koristiti tri različite PostgreSQL login role:

- runtime rola u `DATABASE_URL`;
- core migrator u `NR_CORE_MIGRATOR_DATABASE_URL`;
- addon migrator u `NR_ADDON_MIGRATOR_DATABASE_URL`.

Za Master koristiti runtime rolu u `DATABASE_URL` i migrator u `NRLS_MIGRATOR_DATABASE_URL`. Host, baza i provider resource ID moraju se podudarati sa eksplicitnim `NR_MIGRATION_EXPECTED_*` vrednostima.

Pre rollout-a:

```text
npm run db:migrate:production:dry-run          # Master repo
node scripts/run-drizzle-migrations.mjs --production --dry-run   # CMS repo
```

Za CMS pre migracije upisati tačnu listu pending tagova u `NR_MIGRATION_EXPECTED_LIST`. Kada je baza current, prazna vrednost je ispravna. Addon migrator zahteva `NR_ADDON_MIGRATION_BACKUP_CONFIRMED=true` i konkretnu `NR_ADDON_MIGRATION_BACKUP_REFERENCE` vrednost.

## 6. Master License Server — `ls.nrcms.com`

### 6.1 Existing Master

Ako postojeći `ls.nrcms.com` već ima production ključeve, ne rotirati ih samo zbog ovog testa. Sačuvati postojeće private key vrednosti, KID-jeve, javne keyset bytes i SHA pinove. Novi BASE64 env oblik je transportna alternativa FILE obliku; tačno jedan izvor po keysetu mora biti postavljen.

Javni endpointi posle deploya moraju vratiti HTTP 200 i JSON:

```text
https://ls.nrcms.com/.well-known/nr-license-keys.json
https://ls.nrcms.com/.well-known/nr-purchase-intent-keys.json
https://ls.nrcms.com/.well-known/nr-addon-release-keys.json
https://ls.nrcms.com/api/v1/health
```

Logički issuer ostaje `https://license-server.nrcms.com`; transportni URL je `https://ls.nrcms.com`.

### 6.2 Fresh Master key material

Za potpuno nov Master, sa operator checkout-a i ACL-zaštićenim `NRLS_OPERATOR_OUTPUT_DIR` direktorijumom:

```text
npm run keys:production:generate -- --apply --label 2026-08-initial
```

Komanda generiše dva Ed25519 para, canonical keyset bytes, BASE64 vrednosti i SHA-256 pinove. Rezultat je jedan mode-0600 JSON fajl. Privatni sadržaj kopirati direktno u secret store i potom ukloniti sa radne stanice po internoj politici. Release authority keyset se ne generiše ovom komandom; preuzima se iz zaštićenog addon release procesa.

Za ostale 32-byte secrets može se koristiti:

```text
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Svaki poziv generiše novu vrednost. Ne kopirati jedan rezultat u više env polja.

### 6.3 Deploy Mastera

Prvo deploymentovati Master, jer CMS buildovi preuzimaju njegov release keyset.

Vercel:

1. Importovati Master repozitorijum kao novi Vercel projekat.
2. Dodati kompletan sadržaj Master env primera u Production scope.
3. `CRON_SECRET` mora biti identičan `NRLS_NONCE_CLEANUP_CRON_SECRET` vrednosti.
4. Povezati `ls.nrcms.com` custom domen.
5. Deploy; `prebuild` radi proverenu production migraciju, a `vercel.json` registruje hourly cleanup.

VPS:

```text
docker compose -f deploy/docker/compose.production.example.yml \
  --profile migrate run --rm license-server-migrate
docker compose -f deploy/docker/compose.production.example.yml up -d license-server license-server-cron
```

### 6.4 Admin bootstrap

Master mora imati tačno jednog aktivnog admina pre commerce provisioning-a. Password se čita samo iz apsolutnog, operator-only fajla:

```text
npm run admin:bootstrap -- --password-file /secure/input/master-admin-password
```

Na VPS operator kontejneru, fajl staviti u `deploy/docker/operator-input` i koristiti putanju `/var/lib/nrls/operator-input/master-admin-password`.

### 6.5 Import i publish addon release-a

Ako postojeći Master već ima tačno objavljene Webshop `0.6.44` i License Server add-on `0.2.1` release-e, samo proveriti katalog. Na fresh Masteru svaki potpisani tarball i publication attestation prvo stagingovati van source i runtime direktorijuma, proveriti SHA-256, pa izvršiti:

```text
npm run release:import -- \
  --attestation /secure/release/attestation.json \
  --change-ref CHG-2026-001 \
  --expected-attestation-sha256 <64-hex> \
  --expected-tarball-sha256 <64-hex> \
  --tarball /secure/release/package.tgz

npm run release:publish -- \
  --change-ref CHG-2026-001 \
  --expected-attestation-sha256 <64-hex> \
  --release-id <uuid-from-import>
```

Release CLI koristi posebnu `NRLS_RELEASE_OPERATOR_DB_ROLE` rolu i URL iz ACL-zaštićenog fajla `NRLS_RELEASE_OPERATOR_DATABASE_URL_FILE`.

### 6.6 Master commerce foundation i vendor credential

Komanda kreira oba addon product type-a, osam SKU-ova, oba purchase offer-a i vendor API credential:

```text
npm run production:commerce:provision -- --apply
```

Secret se ne ispisuje u konzolu. Celokupni credential se upisuje kao mode-0600 `vendor-commerce-credential.json` u `NRLS_OPERATOR_OUTPUT_DIR`. Sačuvati taj fajl za sledeći vendor bootstrap korak. Za namernu rotaciju koristi se `--rotate-credential`; overlap je 24 sata.

### 6.7 Lifetime ključ za vendor Webshop

Posle foundation provisioning-a:

```text
npm run license:manual:lifetime -- \
  --apply \
  --addon-key webshop \
  --domain vendor.nrcms.com \
  --reference vendor-bootstrap-2026-08
```

Ključ je zapisan samo u zaštićeni output fajl. Isti `--reference` je idempotency identitet; ne menjati ga pri bezbednom retry-u. Ovaj manual issuer je politikom ograničen na `vendor.nrcms.com`, lifetime SKU i jednu aktivaciju.

## 7. Vendor CMS — `vendor.nrcms.com`

### 7.1 Deployment profil

Vendor build sadrži samo Webshop paket. `LICENSE_SERVER_ENABLED=false` i `LICENSE_SERVER_INSTALL_MODE=disabled` su obavezni: vendor izdavanje licenci ide preko zasebnog Mastera, ne preko embedded client addona.

Vercel:

1. Importovati CMS repozitorijum kao projekat `nrcms-vendor`.
2. Root Directory ostaviti na CMS root-u.
3. Kopirati vendor env primer u Production scope.
4. Postaviti stvarni Vercel Project ID u `NR_VERCEL_PROJECT_ID` ili koristiti sistemski `VERCEL_PROJECT_ID`.
5. Povezati zasebnu vendor bazu i Vercel Blob.
6. Povezati `vendor.nrcms.com`, zatim deploy.

Install komanda preuzima tačno `@radomirradojevic/webshop@0.6.44`, proverava tarball, potpisani release manifest, release KID, dependency lock i keyset SHA. Build komanda validira env, izvršava core/addon migracije i gradi immutable registry.

### 7.2 Aktivacija Webshop addona

1. Prijaviti se kao CMS admin.
2. Otvoriti `/dashboard/webshop`.
3. Uneti lifetime ključ iz Master operator output fajla.
4. Pokrenuti aktivaciju.
5. Master izdaje challenge; CMS objavljuje kratkotrajni HTTPS proof; Master proverava domen i potpis; CMS zatim atomski upisuje preinstalled release kao `ready`.
6. Proveriti da dashboard prikazuje exact package version/release i da `https://vendor.nrcms.com/api/health/live` vraća Webshop status `ready`.

### 7.3 Vendor→Master konekcija i katalog

Na operator checkout-u koji sadrži CMS i `.private/webshop` repozitorijum, učitati vendor production env i pokrenuti:

```text
npm run vendor:master:provision -- \
  --apply \
  --actor-id <CMS_ADMIN_USER_ID> \
  --credential-file /secure/output/vendor-commerce-credential.json
```

Komanda prihvata samo tačan Master output contract, enkriptuje HMAC secret vendor KEK-om, idempotentno kreira/ažurira `https://ls.nrcms.com/api/v1` konekciju i zahteva tačno osam production catalog stavki.

### 7.4 Dva vendor proizvoda

U `/dashboard/webshop/products` napraviti dva digitalna proizvoda:

1. slug `nr-cms-webshop-license`, naslov `NR CMS webshop license`;
2. slug `nr-cms-license-server-license`, naslov `NR CMS License Server add-on license`.

Za oba izabrati license-server fulfillment preko `Night Raven Master License Server`, zatim odgovarajući Master product type. Svaki proizvod mora imati tačno četiri aktivne varijante:

| Webshop SKU | Trajanje | License Server SKU | Trajanje |
| --- | ---: | --- | ---: |
| `webshop-30` | 30 dana | `license-server-30` | 30 dana |
| `webshop-183` | 183 dana | `license-server-183` | 183 dana |
| `webshop-365` | 365 dana | `license-server-365` | 365 dana |
| `webshop-1000000` | lifetime | `license-server-1000000` | lifetime |

Svakoj varijanti dodeliti pozitivnu Sandbox test cenu i ISO valutu. Aktiviranje proizvoda će fail-closed odbiti pogrešan slug, izostavljen SKU, duplikat, pogrešan addon type, environment ili catalog version.

### 7.5 PayPal Sandbox

U PayPal Developer Dashboard-u:

1. koristiti Sandbox Business nalog kao seller;
2. kreirati Sandbox REST app;
3. kopirati Client ID i Secret u vendor env;
4. kreirati webhook sa URL-om `https://vendor.nrcms.com/api/webshop/payments/webhooks/paypal`;
5. kopirati webhook ID u `WEBSHOP_PAYPAL_WEBHOOK_ID`;
6. registrovati podržane događaje navedene u sledećoj tabeli;
7. redeployovati, jer env promena ne menja već izgrađen deployment;
8. u Webshop Settings → Payments omogućiti samo PayPal za ovaj test.

| Grupa | Događaji |
| --- | --- |
| Checkout/capture | `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.PENDING`, `PAYMENT.CAPTURE.DECLINED`, `PAYMENT.CAPTURE.DENIED` |
| Otkaz/refund | `CHECKOUT.PAYMENT-APPROVAL.REVERSED`, `PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.CAPTURE.REVERSED`, `PAYMENT.REFUND.PENDING`, `PAYMENT.REFUND.FAILED` |
| Dispute | `CUSTOMER.DISPUTE.CREATED`, `CUSTOMER.DISPUTE.UPDATED`, `CUSTOMER.DISPUTE.RESOLVED` |

Sandbox invarianti su:

```text
WEBSHOP_PAYMENTS_MODE=test
WEBSHOP_PAYPAL_API_BASE_URL=https://api-m.sandbox.paypal.com
```

Adapter proverava PayPal webhook potpis kod PayPal API-ja, pin-uje Sandbox cert/API origin, proverava iznos i valutu i idempotentno redukuje event. Browser return nije dovoljan dokaz plaćanja bez capture/webhook potvrde.

## 8. Client CMS — `client.nrcms.com`

### 8.1 Deployment

Kreirati drugi Vercel projekat iz istog CMS repozitorijuma. Ne klonirati vendor projekat sa istim env setom. Client mora imati:

- sopstvenu bazu i storage;
- profil `client`;
- Webshop `0.6.44` i License Server add-on `0.2.1` u buildu;
- sopstvene encryption keys/secrets;
- `NEXT_PUBLIC_APP_URL=https://client.nrcms.com`;
- sopstveni `NR_VERCEL_PROJECT_ID`;
- Webshop storefront i checkout inicijalno isključene dok se licence i lokalni issuer ne podese.

### 8.2 Kupovina licenci

1. Na `/dashboard/license-server` izabrati Buy. CMS server-side traži Master purchase intent za `client.nrcms.com` i browser šalje potpisani intent na vendor webshop.
2. Izabrati License Server lifetime ili željeno trajanje.
3. Platiti PayPal Sandbox Personal buyer nalogom.
4. Sačuvati isporučeni License Server ključ/fajl.
5. Ponoviti tok sa `/dashboard/webshop` za Webshop licencu.
6. U vendor Orders proveriti `paid`, `fulfilled`, Master entitlement ID i isporuku bez duplog issue-a.

Purchase intent je vezan za `client.nrcms.com`, installation ID, fingerprint, offer, catalog version i dozvoljene SKU-ove. Ručno otvaranje običnog product URL-a ne zaobilazi intent.

### 8.3 Aktivacija addona

Preporučen redosled:

1. aktivirati License Server add-on na `/dashboard/license-server`;
2. proveriti da je stanje `ready` i API root dostupan;
3. aktivirati Webshop na `/dashboard/webshop`;
4. proveriti oba statusa u `/api/health/live`;
5. sačuvati activation ID-jeve za audit.

Svaka aktivacija ponovo radi javni HTTPS domain proof. Vercel filesystem se ne menja; aktivira se paket koji je već u tačno tom buildu.

### 8.4 Webshop + lokalni License Server add-on

Pošto su oba addona u istoj `client.nrcms.com` aplikaciji, koristiti lokalni transport:

1. otvoriti Webshop → Settings → License servers;
2. kliknuti Add License Server connection;
3. Name: `Client local License Server`;
4. Transport: `Local License Server add-on`;
5. Environment: `production`;
6. kliknuti Test connection;
7. potvrditi otkriveni issuerRef i sačuvati;
8. kliknuti Sync now i zahtevati uspešan catalog revision.

Lokalni transport ne traži Client ID ili shared secret: host poziva potpisanu capability granicu aktivnog addona. Ako se License Server jednog dana fizički izdvoji na drugi domen, tada napraviti API client sa `catalog`, `issue`, `status`, `lifecycle` scopes, sačuvati one-time secret i koristiti remote base URL `https://HOST/api/license-server/v2`.

### 8.5 Test proizvoda koji izdaje licencu

1. U `/dashboard/license-server` napraviti product type i najmanje jedan aktivan SKU/profil za test.
2. U Webshop Settings sinhronizovati lokalni katalog.
3. U Webshop Products napraviti digitalni proizvod.
4. License key policy postaviti na `license_server`.
5. Izabrati `Client local License Server` i mapirati sinhronizovani profil/SKU.
6. Postaviti pozitivnu cenu, status active i fulfillment policy.
7. Za ručni test uključiti `WEBSHOP_STOREFRONT_ENABLED=true` i `WEBSHOP_CHECKOUT_ENABLED=true`, zatim redeployovati.
8. Kao jednostavan prvi test omogućiti bank transfer/COD i admin potvrdu; zatim proveriti issuer outbox, one-time delivery, potpisani assertion i download headers.

## 9. Worker i periodični poslovi

`worker.nrcms.com` deployment worker nije potreban u izabranom `preinstalled` profilu. On je namenjen starom/naprednom `managed_redeploy` toku koji po aktivaciji pokreće novi deployment. Ovde CI/Vercel/Docker build već ugrađuje tačne pakete, pa bi javni worker samo povećao attack surface.

Zato:

- ne kreirati DNS za `worker.nrcms.com`;
- ne postavljati worker secrets;
- ne pokretati addon deployment worker;
- ostaviti `*_INSTALL_MODE=preinstalled`;
- ne mešati `managed_redeploy` env sa ovim profilom.

Background poslovi ipak jesu potrebni. Na Vercelu ih registruju oba `vercel.json` fajla. Na VPS-u ih izvršavaju interni cron kontejneri i oni nemaju javni domen. Obuhvataju content publishing, license fulfillment, post-issue/reconciliation, daily entitlement revalidation, customer issuer operations i Master nonce/rate-limit cleanup.

## 10. VPS deployment

Kopirati `.example` env fajlove u iste nazive bez `.example`, zatim za oba CMS-a promeniti:

```text
WEBSHOP_DEPLOYMENT_MODE=self_hosted
LICENSE_SERVER_DEPLOYMENT_MODE=self_hosted
STORAGE_PROVIDER=local
UPLOADS_DIR=/app/data/uploads
```

`NR_VERCEL_PROJECT_ID` se u self-hosted modu ignoriše. Izvesti BuildKit secret i build pinove u shell, ne u Git:

```text
export NR_GITHUB_PACKAGES_READ_TOKEN='...'
export NR_CMS_RELEASE_SHA='<40-hex-commit>'
export NR_ADDON_RELEASE_PUBLIC_KEYS_SHA256='<64-hex>'
export VENDOR_CLERK_PUBLISHABLE_KEY='pk_live_...'
export VENDOR_TURNSTILE_SITE_KEY='...'
export CLIENT_CLERK_PUBLISHABLE_KEY='pk_live_...'
export CLIENT_TURNSTILE_SITE_KEY='...'
```

Redosled:

```text
docker compose -f deploy/docker/compose.production.example.yml build
docker compose -f deploy/docker/compose.production.example.yml \
  --profile migrate run --rm license-server-migrate
docker compose -f deploy/docker/compose.production.example.yml \
  --profile migrate run --rm vendor-migrate
docker compose -f deploy/docker/compose.production.example.yml \
  --profile migrate run --rm client-migrate
docker compose -f deploy/docker/compose.production.example.yml up -d
```

Caddy automatski pribavlja TLS sertifikate kada A/AAAA zapisi pokazuju na VPS i portovi 80/443 su otvoreni. Ako su neki servisi na Vercelu, ukloniti njihove Caddy blokove i servise iz lokalne compose kopije.

## 11. Mešoviti deployment

Podržane kombinacije uključuju:

- Master VPS, vendor Vercel, client Vercel;
- Master Vercel, vendor VPS, client Vercel;
- Master Vercel, vendor Vercel, client VPS;
- sva tri na Vercelu;
- sva tri na jednom ili više VPS-ova.

Jedini obavezni mrežni odnosi su javni HTTPS: vendor/client moraju dohvatiti Master, Master mora dohvatiti njihov well-known proof, PayPal mora dohvatiti vendor webhook, a browser mora dohvatiti javne storefront/API rute. Ne koristiti privatni HTTP hostname za domain proof.

## 12. Ručni E2E acceptance plan

Izvršiti sledećim redom i sačuvati timestamp, deployment ID, commit SHA, release ID, order ID i activation ID:

1. Master health i sva tri keyset endpointa vraćaju 200.
2. Vendor/client health vraćaju 200, exact hostname i package tuple.
3. Vendor lifetime Webshop aktivacija uspeva preko HTTPS proof-a.
4. Vendor Master catalog sync vraća osam stavki.
5. Oba vendor proizvoda su dostupna samo preko purchase intent toka.
6. Client kupuje License Server licencu PayPal Sandbox nalogom.
7. Ponovljeni webhook ne pravi drugi entitlement.
8. Client kupuje Webshop licencu.
9. Oba client addona se aktiviraju i ostaju `ready` posle hladnog redeploya.
10. Local License Server connection test i catalog sync prolaze.
11. Client test proizvod posle plaćanja kreira tačno jednu issuer operaciju i jednu licencu.
12. One-time reveal se može potrošiti samo jednom; download ima `no-store`, `nosniff`, attachment i `no-referrer`.
13. Refund u PayPal Sandbox-u propagira refund/lifecycle stanje bez duplog eventa.
14. Pogrešan domen, istekli challenge, promenjen proof payload i pogrešan installation key se odbijaju.
15. Cron logovi pokazuju uspešan rad, bez stalno rastućeg pending/retry reda.

## 13. Prelazak sa PayPal Sandbox na Live

Tek posle potpunog Sandbox acceptance-a:

1. napraviti poseban Live PayPal app i Live webhook;
2. promeniti `WEBSHOP_PAYMENTS_MODE=live`;
3. postaviti `WEBSHOP_PAYPAL_API_BASE_URL=https://api-m.paypal.com`;
4. zameniti Client ID, Secret i Webhook ID Live vrednostima;
5. zadržati isti javni webhook URL;
6. redeployovati vendor;
7. u Webshop Payments proveriti da status kaže Live i da su client/webhook configured;
8. izvršiti mali realni payment/refund test po poslovnoj proceduri.

Promena samo `WEBSHOP_PAYMENTS_MODE` nije dovoljna i namerno će fail-closed odbiti Sandbox API origin ili Sandbox cert u Live modu.

## 14. Rollback i incidenti

- Ne raditi `git reset --hard`, ručno brisanje migration ledger-a ili direktno menjanje entitlement statusa.
- Vercel rollback/promote vraća code image, ali ne vraća bazu. DB rollback radi se samo iz testiranog PITR/snapshot plana.
- Ako addon migracija padne, runtime ne podizati dok ledger i backup referenca nisu pregledani.
- Ako PayPal webhook zakaže, sačuvati event ID i koristiti retry; ne kreirati ručno drugi order/entitlement.
- Ako credential procuri, rotirati tačno taj credential/KID i sačuvati audit reference; ne menjati sve secrets odjednom bez matrice zavisnosti.
- Ako domain proof ne prolazi, proveriti DNS, TLS, tačan `NEXT_PUBLIC_APP_URL`, challenge expiry i da Master može javno da dohvati putanju bez redirecta.

## 15. Završni GO kriterijumi

GO je dozvoljen samo kada su ispunjeni svi uslovi:

- nema `REPLACE` placeholdera;
- baze i role su odvojene i backup je potvrđen;
- sva tri domena imaju validan TLS;
- release keyset SHA pin se poklapa sa tačnim bytes;
- Master ima po jedan objavljeni kompatibilan release za oba addona;
- vendor Webshop i oba client addona su `ready`;
- PayPal dashboard i Webshop dashboard oba prikazuju Sandbox test konfiguraciju;
- cron poslovi rade;
- ručni E2E plan je prošao bez duplog issue-a ili ručne DB korekcije;
- worker domen i worker credentials nisu izloženi u preinstalled profilu.

## 16. Referentna dokumentacija

- Vercel Projects: `https://vercel.com/docs/projects`
- Vercel monorepos i više projekata: `https://vercel.com/docs/monorepos`
- Vercel Functions runtime/filesystem: `https://vercel.com/docs/functions/runtimes`
- Vercel environment variables: `https://vercel.com/docs/environment-variables`
- Vercel deployment promotion: `https://vercel.com/docs/deployments/promoting-a-deployment`
- PayPal Developer Dashboard: `https://developer.paypal.com/dashboard/`
- PayPal Sandbox accounts: `https://developer.paypal.com/sandbox-testing/accounts`
- PayPal REST API base URLs: `https://developer.paypal.com/api/make-api-requests`
- PayPal webhook event names: `https://developer.paypal.com/api/rest/webhooks/event-names/`

Sledeći dodaci u PDF-u sadrže kompletne `.env` primere iz repozitorijuma. Oni su template-i, ne secrets fajlovi.
