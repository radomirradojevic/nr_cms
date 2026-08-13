# 02 — Radni direktorijumi, HTTPS, baze i env

## Preduslovi

Već obezbeđeno:

- hosts zapisi za vendor.nr.test, license.nr.test i client.nr.test;
- lokalno pouzdan Caddy CA sertifikat;
- Caddy reverse proxy;
- tri prazne PostgreSQL baze za vendor, client i master;
- GitHub Packages je izabran kao private registry.

Ovaj dokument definiše šta implementacija i operator još moraju da urade da bi tri aplikaciona deploymenta, a zatim i novi worker proces, bili stvarno izolovani.

Deployment worker je četvrti, novi proces koji još ne postoji. Pre njegovog lokalnog E2E testa treba dodati još jedan hosts/Caddy origin:

    https://deploy.nr.test -> 127.0.0.1:3003

I ručno kreirati četvrtu, zasebnu PostgreSQL bazu `nr_addon_deployment_worker_test`; ona još nije među tri već pripremljene baze.

Postojeći trusted Caddy CA ostaje isti; ručno se dodaju hosts zapis i Caddy site. Ako se worker implementira na drugom portu, taj port se menja samo u Caddy/static worker konfiguraciji, ne u licencnom domenu ili HTTP job payload-u.

## 1. Deployment direktorijumi

### Pravilo

Deployment direktorijumi moraju nastati iz commita, ne kopiranjem trenutnog dirty development stabla.

Primer:

    git clone https://github.com/radomirradojevic/nr_cms.git D:\nr_cms-vendor
    git clone https://github.com/radomirradojevic/nr_cms.git D:\nr_cms-client
    git clone https://github.com/radomirradojevic/license-server.git D:\nr_license-server

Zatim zabeležiti odobrene SHA vrednosti i pinovati checkout:

    git -C D:\nr_cms-vendor switch --detach <CMS_SHA>
    git -C D:\nr_cms-client switch --detach <CMS_SHA>
    git -C D:\nr_license-server switch --detach <MASTER_SHA>

Obavezna provera:

    git -C D:\nr_cms-vendor rev-parse HEAD
    git -C D:\nr_cms-client rev-parse HEAD
    git -C D:\nr_license-server rev-parse HEAD
    Test-Path D:\nr_cms-vendor\.private
    Test-Path D:\nr_cms-client\.private

Prva dva SHA-a moraju biti ista. Poslednja dva Test-Path rezultata moraju biti False.

Ne praviti D:\nr_cms-vendor i D:\nr_cms-client kao obične kopije D:\nr_cms, jer bi se time mogli preneti:

- .private source;
- development .env;
- node_modules;
- .next;
- lokalni signing key-evi;
- .tmp registry input;
- storage i upload podaci.

## 2. Odvojeni runtime podaci

Svaka CMS instanca mora imati sopstveno:

| Resurs | Vendor | Client |
|---|---|---|
| DB | nr_cms_vendor_test | nr_cms_client_test |
| .env | D:\nr_cms-vendor\.env | D:\nr_cms-client\.env |
| node_modules | u vendor release-u | u client release-u |
| .next | u vendor release-u | u client release-u |
| upload storage | D:\nr_runtime\vendor\uploads | D:\nr_runtime\client\uploads |
| installation identity | samo vendor DB | samo client DB |
| addon install state | samo vendor DB | samo client DB |
| deployment release root | D:\nr_deploy\vendor\releases | D:\nr_deploy\client\releases |

Master ima:

| Resurs | Vrednost |
|---|---|
| DB | nr_license_server_test |
| .env | D:\nr_license-server\.env |
| build cache | D:\nr_license-server\.next |
| runtime | samo master aplikacija |

Pre Phase 2 release importa napraviti `D:\nr_runtime\trust` i u njega provisionovati odobreni `webshop-release-public-keys.json` iz release-authority procesa. Master signing authority dodatno upravlja fajlovima `nrls-entitlement-public-keys.json` i, u Phase 6, `nrls-purchase-intent-public-keys.json`. Fajlovi su public trust material, ali su integrity-sensitive: odgovarajući master/worker/vendor service identiteti dobijaju read-only, operator/key provisioning identitet write, a običan CMS/browser nema write. Pinovanu release-keyset vrednost dobiti sa:

    (Get-FileHash -Algorithm SHA256 D:\nr_runtime\trust\webshop-release-public-keys.json).Hash.ToLowerInvariant()

Istu vrednost uneti u master env i worker static target config. Ne kopirati private release signing key u ovaj direktorijum.

Analogno izračunati i upisati `NRLS_ENTITLEMENT_PUBLIC_KEYSET_SHA256` i `NRLS_PURCHASE_INTENT_PUBLIC_KEYSET_SHA256`. CMS dobija oba potrebna verifier keyseta samo preko njihovih exact HTTPS discovery ruta i čuva poslednju validnu kopiju u durable cache fajlu; master file hash sprečava da endpoint servira lokalno izmenjen keyset.

Nikada ne klonirati vendor bazu u client bazu nakon što je kreiran vendor_addon_installation_identities red. Klonirana baza bi klonirala installation ID i privatni key, pa dve instance više ne bi bile dva identiteta.

## 3. Caddy

Minimalni logički Caddyfile je:

    https://vendor.nr.test {
        reverse_proxy 127.0.0.1:3000
    }

    https://license.nr.test {
        reverse_proxy 127.0.0.1:3001
    }

    https://client.nr.test {
        reverse_proxy 127.0.0.1:3002
    }

    https://deploy.nr.test {
        reverse_proxy 127.0.0.1:3003
    }

Caddy standardno prosleđuje originalni Host i X-Forwarded-Proto. Javni application URL ipak mora biti eksplicitno zadat env promenljivom; kod ne treba da veruje proizvoljnom forwarded hostu za entitlement binding.

Provera:

    Invoke-WebRequest -UseBasicParsing https://vendor.nr.test
    Invoke-WebRequest -UseBasicParsing https://license.nr.test
    Invoke-WebRequest -UseBasicParsing https://client.nr.test
    Invoke-WebRequest -UseBasicParsing https://deploy.nr.test/health

Ako root ruta traži login ili vrati očekivani 3xx/4xx, to je i dalje dokaz TLS/routing sloja. Za automatizovan gate dodati posebne neosetljive health rute sa 200 odgovorom.

### 3.1 Node poverenje lokalnom Caddy CA-u

Windows/browser trust nije sam po sebi dovoljan dokaz za server-side Node `fetch`. Lokalni runtime je Node `v24.15.0`, koji podržava system CA store kada se proces pokrene sa:

    NODE_USE_SYSTEM_CA=1

Ovo postaviti kao process/service environment za vendor, client, master i Node-based worker, a ne kao nedokumentovan ključ u aplikacionom `.env` fajlu. Alternativa je:

    NODE_EXTRA_CA_CERTS=D:\<SECURE_PATH>\caddy-local-root-ca.pem

gde fajl sadrži samo provereni Caddy root CA u PEM formatu i ima kontrolisana prava. Ove promenljive Node čita pri startu procesa, pa aplikaciju treba restartovati posle izmene.

Server-side provera iz svakog odgovarajućeg process okruženja:

    node -e "fetch('https://license.nr.test/api/v1/health').then(r=>{console.log(r.status);process.exitCode=r.ok?0:1}).catch(e=>{console.error(e.message);process.exitCode=1})"

Za CMS-to-worker proveru analogno koristiti `https://deploy.nr.test/health` kada worker postoji. Nikada ne koristiti `NODE_TLS_REJECT_UNAUTHORIZED=0`, `curl -k` ili custom agent koji globalno gasi proveru sertifikata.

Autoritativna referenca: [Node `--use-system-ca`, `NODE_USE_SYSTEM_CA` i `NODE_EXTRA_CA_CERTS`](https://nodejs.org/docs/latest-v24.x/api/cli.html#--use-system-ca).

## 4. Next development origin

CMS next.config.ts već treba da sadrži samo hostname vrednosti:

    vendor.nr.test
    client.nr.test

Master next.config.ts:

    license.nr.test

Ne koristiti:

    https://vendor.nr.test
    vendor.nr.test:443

Next allowedDevOrigins očekuje origin hostname obrazac, a ne pun URL u ovom projektu. Posle izmene next.config.ts oba Next dev procesa moraju biti potpuno restartovana.

## 5. Obavezna izmena env profila pre clean deploymenta

### GAP

scripts/validate-runtime-env.mjs trenutno bira .env.example.vendor čim taj fajl postoji. Pošto je on deo CMS repoa, i client checkout se proverava prema vendor ugovoru.

package.json predev trenutno uvek pokreće addons:local, koji očekuje .private\webshop. Čist vendor/client checkout zato ne sme da koristi postojeći predev bez izmene.

### TARGET

Uvesti dve eksplicitne promenljive:

    NR_CMS_DEPLOYMENT_PROFILE=development|vendor|client
    NR_ADDON_SOURCE_MODE=private_workspace|registry|empty

Predložene kombinacije:

| Lokacija | Profile | Addon source |
|---|---|---|
| D:\nr_cms | development | private_workspace |
| D:\nr_cms-vendor | vendor | registry |
| D:\nr_cms-client | client | registry |

Validator mora:

1. zahtevati NR_CMS_DEPLOYMENT_PROFILE;
2. vendor profil proveravati prema .env.example.vendor;
3. client profil proveravati prema .env.example ili novom .env.example.client;
4. development profil proveravati prema eksplicitno odabranom development ugovoru;
5. odbiti nepoznatu kombinaciju profila i source mode-a;
6. zabraniti private_workspace van development profila;
7. imati unit test za sva tri profila.

Dodati scripts/prepare-dev-runtime.mjs i promeniti predev tako da:

    private_workspace -> pokrene setup-local-webshop-addon.mjs
    registry          -> pokrene samo generate-addon-registry.mjs
    empty             -> generiše prazan registry

Clean deployment nikada ne sme automatski tražiti .private.

Ove izmene moraju biti implementirane pre kopiranja env blokova ispod. Trenutni validator zahteva exact parity sa `.env.example.vendor` i odbio bi nove profile/source promenljive kao undocumented. Ciljna implementacija zato istovremeno:

1. dodaje profile/source ključeve u odgovarajuće template-e;
2. uvodi kompletan `.env.example.client`;
3. bira template po profilu;
4. zadržava exact-parity test za izabrani template;
5. ažurira `scripts/clean-local-runtime-env.mjs` za nove dokumentovane ključeve.

Env blokovi u odeljcima 6–8 su role-specific vrednosti i override-i, a ne zamena za kompletan template. Nakon implementacije kopirati ceo odgovarajući template, zadržati svaki aktivni `KEY=` red i tek onda uneti vrednosti ispod. Današnji vendor template, na primer, traži i paritet ključeva kao što su `RESEND_API_KEY`, `LICENSE_SERVER_SECRET_KEY`, `LICENSE_SERVER_BUY_URL`, `LICENSE_SERVER_BUY_LINK_SECRET` i `WEBSHOP_BANK_REDIRECT_WEBHOOK_SECRET`, čak i kada neka vrednost ostaje prazna jer je funkcija isključena.

## 6. Vendor CMS env

Sledeći blok opisuje vrednosti, ali ne sadrži realne secret-e.

Core:

    NR_CMS_DEPLOYMENT_PROFILE=vendor
    NR_LICENSE_ENVIRONMENT=development
    NR_ADDON_SOURCE_MODE=registry
    DATABASE_URL=postgresql://nr_cms_vendor_runtime:<PASSWORD>@127.0.0.1:5432/nr_cms_vendor_test
    NEXT_PUBLIC_APP_URL=https://vendor.nr.test
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<VENDOR_TEST_KEY>
    CLERK_SECRET_KEY=<VENDOR_TEST_SECRET>
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=<TEST_SITE_KEY>
    TURNSTILE_SECRET_KEY=<TEST_SECRET>
    EMAIL_PROVIDER=<resend-or-smtp>
    EMAIL_FROM=Night Raven Test <noreply@configured-test-domain>
    IP_HASH_SALT=<UNIQUE_32_PLUS_CHARS>
    CRON_SECRET=<UNIQUE_32_PLUS_CHARS>
    STORAGE_PROVIDER=local
    UPLOADS_DIR=D:\nr_runtime\vendor\uploads

Master i outbound:

    NR_MASTER_LICENSE_URL=https://license.nr.test
    NR_PURCHASE_INTENT_PUBLIC_KEYS_URL=https://license.nr.test/.well-known/nr-purchase-intent-keys.json
    NR_PURCHASE_INTENT_BOOTSTRAP_KEYSET_FILE=D:\nr_runtime\trust\nrls-purchase-intent-public-keys.json
    NR_PURCHASE_INTENT_BOOTSTRAP_KEYSET_SHA256=<64_HEX>
    NR_PURCHASE_INTENT_PUBLIC_KEYS_CACHE_FILE=D:\nr_runtime\vendor\trust\nrls-purchase-intent-keyset-cache.json
    NR_ADDON_ENTITLEMENT_BOOTSTRAP_KEYSET_FILE=D:\nr_runtime\trust\nrls-entitlement-public-keys.json
    NR_ADDON_ENTITLEMENT_BOOTSTRAP_KEYSET_SHA256=<64_HEX>
    NR_ADDON_ENTITLEMENT_PUBLIC_KEYS_CACHE_FILE=D:\nr_runtime\vendor\trust\nrls-entitlement-keyset-cache.json
    NR_ADDON_INSTALLATION_ENCRYPTION_KEY=<32_BYTE_BASE64URL>
    NR_ADDON_INSTALLATION_ENCRYPTION_KID=vendor-installation-v1
    NR_ADDON_INSTALLATION_DECRYPTION_KEYS_JSON={}
    NR_ADDON_TRANSFER_APPROVAL_SECRET=<32_BYTE_BASE64URL>
    NR_ADDON_TRANSFER_APPROVAL_KID=vendor-transfer-approval-v1
    NR_ADDON_TRANSFER_APPROVAL_OLD_SECRETS_JSON={}
    NR_ALLOW_INSECURE_LOOPBACK_HTTP=false
    NRLS_ALLOWED_OUTBOUND_HOSTS=license.nr.test,deploy.nr.test
    NRLS_ALLOW_SELF_HOSTED_OUTBOUND=true

P0 pre aktivacije: `lib/webshop-addon/license.ts` i `lib/vendor-addon-entitlements/public-keys.ts` trenutno eksplicitno postavljaju `allowSelfHosted` na rezultat loopback-HTTP provere. Zato `https://license.nr.test`, iako je na allowlist-i, biva odbijen kada DNS vrati `127.0.0.1`. Caller mora koristiti `NRLS_ALLOW_SELF_HOSTED_OUTBOUND=true` nezavisno od `NR_ALLOW_INSECURE_LOOPBACK_HTTP`; HTTPS, exact host allowlist, DNS pinning, timeout, redirect zabrana i response-size limit ostaju obavezni.

`NR_PURCHASE_INTENT_PUBLIC_KEYS_URL` je TARGET vendor-only verifier konfiguracija i mora biti dodat u vendor template/validator zajedno sa Phase 6 implementacijom. Client ga ne zahteva. URL je exact trusted discovery ruta; verifier ne izvodi key URL iz JWS-a. Prvi start sa praznim cache-om učitava odgovarajući read-only bootstrap keyset samo ako exact file SHA odgovara provisionovanom hash-u; nema TLS-only TOFU. Bootstrap može biti aktuelni sequence N i postaje current trust anchor, a prvi network update mora biti isti sequence/hash ili N+1 koji chain-uje taj hash. Cache fajlovi moraju biti service-account read/write, browser nedostupni i atomski zamenjeni tek posle TLS, schema, issuer/purpose, KID, validity i anti-rollback provere. Restart ne sme obrisati poslednji validni keyset. Template, validator, provisioning i restore test obuhvataju sva četiri vendor bootstrap/cache ključa.

Webshop:

    WEBSHOP_ENABLED=true
    WEBSHOP_STOREFRONT_ENABLED=true
    WEBSHOP_CHECKOUT_ENABLED=true
    WEBSHOP_INSTALL_MODE=managed_redeploy
    WEBSHOP_DEPLOYMENT_MODE=self_hosted
    WEBSHOP_PAYMENTS_MODE=test
    WEBSHOP_COOKIE_SECURE=true
    WEBSHOP_CART_TOKEN_SALT=<UNIQUE_32_PLUS_CHARS>
    WEBSHOP_DOWNLOAD_TOKEN_SECRET=<UNIQUE_32_PLUS_CHARS>
    WEBSHOP_DOWNLOAD_EVENT_HASH_SECRET=<UNIQUE_32_PLUS_CHARS>
    WEBSHOP_LICENSE_SERVER_SECRET_KEY=<32_BYTE_BASE64URL_OR_HEX>
    WEBSHOP_LICENSE_SERVER_SECRET_KID=vendor-master-api-v1
    WEBSHOP_LICENSE_SERVER_SECRET_DECRYPTION_KEYS_JSON={}
    WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KEY=<DIFFERENT_32_BYTE_BASE64URL_OR_HEX>
    WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KID=local-issued-license-v1
    WEBSHOP_ISSUED_LICENSE_KEY_DECRYPTION_KEYS_JSON={}
    WEBSHOP_POST_ISSUE_LICENSE_STATUS_MAX_AGE_SECONDS=60
    WEBSHOP_BUY_URL=https://vendor.nr.test/licenses/purchase-intents/accept
    WEBSHOP_BUY_OFFER_KEY=nr-cms-webshop-license
    WEBSHOP_PUBLIC_BASE_URL=https://vendor.nr.test
    WEBSHOP_LICENSE_ISSUE_CRON_SECRET=<TARGET_DEDICATED_SECRET_AFTER_PHASE_7>

Prompt 18 rollout je završen: `WEBSHOP_PAYMENT_STATE_V2`,
`WEBSHOP_LICENSE_OUTBOX_V2` i `VENDOR_LICENSE_API_V2` su uklonjeni iz
CMS/master runtime ugovora. V2 tok je autoritativan i ove promenljive ne treba
vraćati u `.env`.

`NR_LICENSE_ENVIRONMENT` je jedini CMS-side license environment autoritet i mora biti exact `development|staging|production`. Ne izvodi se iz `NODE_ENV`, deployment profila, URL-a, baze ili Caddy hosta. Activation/revalidation, purchase-intent/catalog/issue/validate/lifecycle requesti, entitlement/installation/operation redovi i deployment job snapshot moraju nositi istu vrednost. Startup odbija mismatch sa master contractom, a worker kasnije proverava job + target config + CMS DB snapshot + `NR_ADDON_DEPLOYMENT_WORKER_ENVIRONMENT`.

`WEBSHOP_BUY_URL` je trusted server config, ne browser vrednost. Startup ga prihvata samo kao HTTPS URL bez userinfo/query/fragmenta i sa exact `/licenses/purchase-intents/accept` putanjom; iz njegovog normalizovanog `URL.origin` izvodi jedini `vendorAudience` za master challenge. Ne uvoditi drugi audience env koji bi mogao da odstupi. Detaljan normalization i fixture contract je u dokumentu 07.

Deployment callback:

    WEBSHOP_REDEPLOY_WEBHOOK_URL=https://deploy.nr.test/v1/hooks/vendor/webshop
    WEBSHOP_REDEPLOY_AUTH_KID=<VENDOR_CALLBACK_KID>
    WEBSHOP_REDEPLOY_AUTH_SECRET=<32_BYTE_BASE64URL>
    WEBSHOP_REDEPLOY_AUTH_OLD_SECRETS_JSON={}
    WEBSHOP_DEPLOYMENT_RESULT_AUTH_KID=<VENDOR_RESULT_KID>
    WEBSHOP_DEPLOYMENT_RESULT_AUTH_SECRET=<DIFFERENT_32_BYTE_BASE64URL>
    WEBSHOP_DEPLOYMENT_RESULT_AUTH_OLD_SECRETS_JSON={}

Embedded License Server addon ostaje isključen:

    LICENSE_SERVER_ENABLED=false
    LICENSE_SERVER_INSTALL_MODE=disabled
    LICENSE_SERVER_DEPLOYMENT_MODE=self_hosted
    LICENSE_SERVER_CUSTOMER_ENVIRONMENT=development

Finalni master-signed purchase-intent tok ne koristi `WEBSHOP_BUY_LINK_SECRET`; ciljna template verzija treba da ga deprecated-uje/ukloni kada compatibility period prođe. Ako se pre toga namerno testira postojeći lokalni HMAC spike, vendor i client bi morali deliti baš taj jedan secret — suprotno pravilu o različitim instance secretima — ali vendor verifier/consumer trenutno ne postoji, pa taj spike nije validan E2E dokaz.

`WEBSHOP_BUY_OFFER_KEY` je javni stabilni logical-offer identitet, ne master DB UUID. Dodati ga u vendor/client template i validator u Phase 6. Client challenge šalje samo ovaj ključ; master ga mapira na product type, vendor product reference, catalog version i allowed SKU-eve kroz provisionovani offer red.

`WEBSHOP_LICENSE_SERVER_SECRET_KEY` šifruje samo vendorov master API credential. Svaki ciphertext dobija `WEBSHOP_LICENSE_SERVER_SECRET_KID`; keyring sadrži samo stare KID/key parove potrebne tokom rewrap-a. `WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KEY` je drugi, namenski ključ za licence koje master vrati posle kupovine; njegov KID se čuva uz svaki issue red. `WEBSHOP_ISSUED_LICENSE_KEY_DECRYPTION_KEYS_JSON` sadrži samo stare KID/key parove tokom kontrolisane rotacije i ostaje `{}` pri prvom clean setup-u. Sve nove ključeve prvo dodati u vendor template, validator i cleanup/redaction pravila; client profil ne zahteva issued-license par jer ne izvršava commerce issuance.

`WEBSHOP_POST_ISSUE_LICENSE_STATUS_MAX_AGE_SECONDS` je vendor-only TARGET gate za fresh server-side `POST /api/v1/entitlements/validate` evidence pre notification/token/reveal akcije. Default je 60; startup prihvata samo integer `15..300`. To nije cache TTL za dozvolu: timeout, stale/mismatch ili master outage fail-closed blokira dekripciju, a response red ne sadrži license key.

Installation identity envelope je treća, nezavisna klasa. `NR_ADDON_INSTALLATION_ENCRYPTION_KID` se čuva uz encrypted private-key red, a `NR_ADDON_INSTALLATION_DECRYPTION_KEYS_JSON` služi samo za stare installation KID-eve. Rotacija ovog KEK-a rewrap-uje isti Ed25519 private key; ne generiše novi installation identitet, ID ili fingerprint.

Transfer approval derivation je četvrta, nezavisna klasa. `NR_ADDON_TRANSFER_APPROVAL_SECRET/KID` služe isključivo da target CMS deterministički reprodukuje kratkotrajni source approval code iz transfer bindinga; nisu encryption KEK, installation private key niti HMAC credential prema masteru. Local pending-transfer red trajno čuva derivation KID, transfer/target binding i expiry, a `NR_ADDON_TRANSFER_APPROVAL_OLD_SECRETS_JSON` zadržava stari secret najmanje dok svaki transfer vezan za taj KID nije completed/canceled/expired. Aktivni/stari parovi moraju biti u vendor/client template-u, validatoru, startup testu, cleanup allowlist-i, redaction filteru i backup/restore proceduri u istom change setu.

Svi `*_DECRYPTION_KEYS_JSON` i `*_OLD_SECRETS_JSON` contracti su JSON objekti oblika `{"<OLD_KID>":"<32_BYTE_BASE64URL>"}`. Aktivni KID se ne duplira u old-key mapi, KID-evi moraju biti jedinstveni i startup fail-closed odbija vrednost koja se ne dekodira u tačno 32 bajta, duplicate active KID ili ciphertext sa nepoznatim KID-em.

Deployment HMAC rotacija je takođe stateful. Svaki CMS deployment outbox red trajno čuva `request_auth_kid` iz trenutka kreiranja, a svaki worker result outbox red `result_auth_kid`; retry istog exact body-ja ostaje na tom KID-u. Workerova per-target statička secret konfiguracija zato ima request-verifier active+old mapu i result-signer active+old mapu, istog sadržaja kao odgovarajući CMS active/old par. Rotacija prvo svuda doda novi KID, zatim ga postavlja active za nove operations, dok stari ostaje u old mapama. Stari se uklanja tek kada SQL/metrics dokažu nula non-terminalnih request/result outbox redova na tom KID-u i prođu replay/idempotency + backup retention rokovi. Ne potpisivati stari durable body novim KID-em bez posebne auditovane transport-resign operation verzije; prvi contract to ne podržava.

Payment V2 migracije i HMAC/scope/catalog gateovi su obavezni startup/release
uslovi; više se ne mogu zaobići rollout flagom.

## 7. Client CMS env

Core vrednosti su analogne, ali svi secret-i moraju biti različiti:

    NR_CMS_DEPLOYMENT_PROFILE=client
    NR_LICENSE_ENVIRONMENT=development
    NR_ADDON_SOURCE_MODE=registry
    DATABASE_URL=postgresql://nr_cms_client_runtime:<PASSWORD>@127.0.0.1:5432/nr_cms_client_test
    NEXT_PUBLIC_APP_URL=https://client.nr.test
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<CLIENT_TEST_KEY>
    CLERK_SECRET_KEY=<CLIENT_TEST_SECRET>
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=<TEST_SITE_KEY>
    TURNSTILE_SECRET_KEY=<TEST_SECRET>
    EMAIL_PROVIDER=<resend-or-smtp>
    EMAIL_FROM=Client CMS Test <noreply@configured-test-domain>
    IP_HASH_SALT=<UNIQUE_32_PLUS_CHARS>
    CRON_SECRET=<UNIQUE_32_PLUS_CHARS>
    STORAGE_PROVIDER=local
    UPLOADS_DIR=D:\nr_runtime\client\uploads

Activation:

    NR_MASTER_LICENSE_URL=https://license.nr.test
    NR_ADDON_ENTITLEMENT_BOOTSTRAP_KEYSET_FILE=D:\nr_runtime\trust\nrls-entitlement-public-keys.json
    NR_ADDON_ENTITLEMENT_BOOTSTRAP_KEYSET_SHA256=<64_HEX>
    NR_ADDON_ENTITLEMENT_PUBLIC_KEYS_CACHE_FILE=D:\nr_runtime\client\trust\nrls-entitlement-keyset-cache.json
    NR_ADDON_INSTALLATION_ENCRYPTION_KEY=<DIFFERENT_32_BYTE_BASE64URL>
    NR_ADDON_INSTALLATION_ENCRYPTION_KID=client-installation-v1
    NR_ADDON_INSTALLATION_DECRYPTION_KEYS_JSON={}
    NR_ADDON_TRANSFER_APPROVAL_SECRET=<DIFFERENT_32_BYTE_BASE64URL>
    NR_ADDON_TRANSFER_APPROVAL_KID=client-transfer-approval-v1
    NR_ADDON_TRANSFER_APPROVAL_OLD_SECRETS_JSON={}
    NR_ALLOW_INSECURE_LOOPBACK_HTTP=false
    NRLS_ALLOWED_OUTBOUND_HOSTS=license.nr.test,deploy.nr.test
    NRLS_ALLOW_SELF_HOSTED_OUTBOUND=true
    WEBSHOP_ENABLED=true
    WEBSHOP_STOREFRONT_ENABLED=false
    WEBSHOP_CHECKOUT_ENABLED=false
    WEBSHOP_INSTALL_MODE=managed_redeploy
    WEBSHOP_DEPLOYMENT_MODE=self_hosted
    WEBSHOP_PAYMENTS_MODE=test
    WEBSHOP_COOKIE_SECURE=true
    WEBSHOP_CART_TOKEN_SALT=<UNIQUE_32_PLUS_CHARS>
    WEBSHOP_DOWNLOAD_TOKEN_SECRET=<UNIQUE_32_PLUS_CHARS>
    WEBSHOP_DOWNLOAD_EVENT_HASH_SECRET=<UNIQUE_32_PLUS_CHARS>
    WEBSHOP_LICENSE_SERVER_SECRET_KEY=<UNIQUE_32_BYTE_KEY>
    WEBSHOP_LICENSE_SERVER_SECRET_KID=client-master-api-v1
    WEBSHOP_LICENSE_SERVER_SECRET_DECRYPTION_KEYS_JSON={}
    WEBSHOP_BUY_URL=https://vendor.nr.test/licenses/purchase-intents/accept
    WEBSHOP_BUY_OFFER_KEY=nr-cms-webshop-license
    WEBSHOP_REDEPLOY_WEBHOOK_URL=https://deploy.nr.test/v1/hooks/client/webshop
    WEBSHOP_REDEPLOY_AUTH_KID=<CLIENT_CALLBACK_KID>
    WEBSHOP_REDEPLOY_AUTH_SECRET=<32_BYTE_BASE64URL>
    WEBSHOP_REDEPLOY_AUTH_OLD_SECRETS_JSON={}
    WEBSHOP_DEPLOYMENT_RESULT_AUTH_KID=<CLIENT_RESULT_KID>
    WEBSHOP_DEPLOYMENT_RESULT_AUTH_SECRET=<DIFFERENT_32_BYTE_BASE64URL>
    WEBSHOP_DEPLOYMENT_RESULT_AUTH_OLD_SECRETS_JSON={}

Client nije vendor:

    LICENSE_SERVER_ENABLED=false
    LICENSE_SERVER_INSTALL_MODE=disabled

Završeni V2 rollout flagovi nisu deo client template-a ni runtime ugovora.

I za client finalni template ne zahteva `WEBSHOP_BUY_LINK_SECRET`. Privremeni shared-secret spike je jedini mogući izuzetak od različitih secret vrednosti, ali se ne koristi za kompletan E2E.

Client može imati WEBSHOP_ENABLED=true i prazan registry. To omogućava activation shell, ali ne Webshop runtime.

## 8. Master env

Pošto master validator zahteva tačan key parity sa .env.example, kopirati template i popuniti svaku aktivnu stavku bez dodavanja undocumented trajnih ključeva.

    DATABASE_URL=postgresql://<USER>:<PASSWORD>@127.0.0.1:5432/nr_license_server_test
    NR_MIGRATION_TARGET=development
    NR_MIGRATION_SERVICE=central
    NR_MIGRATION_EXPECTED_HOST=<LOCAL_EXPECTED_HOST>
    NR_MIGRATION_EXPECTED_DATABASE=nr_license_server_test
    NR_MIGRATION_EXPECTED_PROVIDER_RESOURCE_ID=<LOCAL_RESOURCE_ID>
    NR_MIGRATION_PROVIDER_RESOURCE_ID=<SAME_LOCAL_RESOURCE_ID>
    NRLS_ENVIRONMENT=development
    NRLS_PUBLIC_URL=https://license.nr.test
    NRLS_SECRET_ENCRYPTION_KEY=<32_BYTE_BASE64URL>
    NRLS_SECRET_ENCRYPTION_KID=local-master-v1
    NRLS_SECRET_DECRYPTION_KEYS_JSON={}
    NRLS_RATE_LIMIT_STORE=postgres
    NRLS_NONCE_CLEANUP_CRON_SECRET=<UNIQUE_32_PLUS_CHARS>
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=<TEST_SITE_KEY>
    TURNSTILE_SECRET_KEY=<TEST_SECRET>
    NRLS_VENDOR_SIGNING_PRIVATE_KEY=<ED25519_PRIVATE_PEM>
    NRLS_VENDOR_SIGNING_KID=local-entitlement-2026-01
    NRLS_ENTITLEMENT_PUBLIC_KEYSET_FILE=D:\nr_runtime\trust\nrls-entitlement-public-keys.json
    NRLS_ENTITLEMENT_PUBLIC_KEYSET_SHA256=<64_HEX>
    NRLS_PURCHASE_INTENT_SIGNING_PRIVATE_KEY=<DIFFERENT_ED25519_PRIVATE_PEM>
    NRLS_PURCHASE_INTENT_SIGNING_KID=local-purchase-intent-2026-01
    NRLS_PURCHASE_INTENT_PUBLIC_KEYSET_FILE=D:\nr_runtime\trust\nrls-purchase-intent-public-keys.json
    NRLS_PURCHASE_INTENT_PUBLIC_KEYSET_SHA256=<64_HEX>
    NRLS_PURCHASE_INTENT_TTL_SECONDS=1800
    NRLS_PURCHASE_INTENT_CHECKOUT_TTL_SECONDS=7200
    NRLS_PURCHASE_INTENT_RESERVATION_TTL_SECONDS=900
    NRLS_LIFECYCLE_RECEIPT_TTL_SECONDS=86400
    NRLS_LIFECYCLE_RESULT_REPLAY_RETENTION_SECONDS=604800
    NRLS_LIFECYCLE_ORIGINAL_COMPLETE_CUTOFF_SECONDS=86400
    NRLS_LIFECYCLE_STATUS_JWS_TTL_SECONDS=300
    NRLS_ADDON_RELEASE_PUBLIC_KEYS_FILE=D:\nr_runtime\trust\webshop-release-public-keys.json
    NRLS_ADDON_RELEASE_PUBLIC_KEYS_SHA256=<64_HEX>

Ne dodavati `NRLS_COOKIE_SECURE` u trenutni master `.env`: u `.env.example` je samo komentarisana opcija, dok master exact-parity validator priznaje samo aktivne `KEY=` redove. Za ovaj HTTPS origin secure cookie ponašanje se izvodi iz `NRLS_PUBLIC_URL`. Ako implementacija želi eksplicitni override, prvo ga treba učiniti aktivnim, testiranim delom template contracta.

`NR_MIGRATION_TARGET=development` je podržani lokalni/non-production režim. Posebna production zaštita se uključuje samo kada je vrednost tačno `production` ili kada se prosledi `--production`; tada običan `npm run db:migrate` namerno ne sme da zaobiđe eksplicitni production mode i target identity provere.

Za već kreiranu praznu lokalnu bazu izvršiti:

    npm run db:migrate:dry-run
    npm run db:migrate
    npm run db:migrate:dry-run

Prvi dry-run treba da prikaže pending migracije. Poslednji mora da vrati prazan pending skup i potvrđen checksum ledger. `db:migrate:offline` proverava samo migration fajlove/journal i ne inicijalizuje bazu.

Entitlement signing key, purchase-intent signing key i Webshop package release signing key moraju biti tri različita key pair-a. Purchase-intent ključevi/TTL vrednosti su TARGET Phase 6 ključevi: dodati ih u master `.env.example`, validator, startup crypto test, redaction i rotation runbook u istom change setu pre nego što se unesu u exact-parity `.env`.

Četiri lifecycle timing ključa su TARGET Phase 9 contract i ulaze zajedno u master `.env.example`, strict validator, startup test i status/receipt fixture-e. V1 granice su: receipt TTL `900..86400`, result replay retention `86400..2592000`, original-complete cutoff `900..604800`, status JWS TTL `60..300` sekundi. Startup dodatno zahteva `RESULT_REPLAY_RETENTION >= RECEIPT_TTL`, `ORIGINAL_COMPLETE_CUTOFF <= RESULT_REPLAY_RETENTION` i status TTL najviše 300; kršenje prekida start. Za committed operation master računa `receipt.exp=receipt.iat+RECEIPT_TTL` i `result_replay_until=committed_at+RESULT_REPLAY_RETENTION`, pri čemu konkretni `result_replay_until >= receipt.exp` mora važiti pre potpisivanja. Za missing/dropped-before-master operation `original_complete_cutoff=operation_created_at+ORIGINAL_COMPLETE_CUTOFF`; pre njega status je `in_progress`, a tek posle njega locked CAS može terminalno zatvoriti `not_committed`. Exact frozen result bytes čuvaju se do `result_replay_until`; minimalni tombstone ostaje po dužoj lifecycle retention politici iz dokumenta 10.

Entitlement i purchase-intent public keyset fajlovi imaju isti exact versionirani schema contract:

```json
{
  "contractVersion": 1,
  "issuer": "https://license-server.nrcms.com",
  "purpose": "addon_entitlement|purchase_intent",
  "generatedAt": "<RFC3339_UTC_TIMESTAMP>",
  "sequence": 1,
  "previousKeysetSha256": null,
  "keys": [
    {
      "kid": "<STABLE_UNIQUE_KID>",
      "alg": "EdDSA",
      "publicKeyPem": "<ED25519_PUBLIC_PEM>",
      "notBefore": "<RFC3339_UTC_TIMESTAMP>",
      "notAfter": null,
      "status": "active|verification_only|revoked"
    }
  ]
}
```

`issuer` je isti stabilni logical token issuer koji koriste entitlement/purchase JWS-i; nije lokalni discovery transport `https://license.nr.test`. Consumer odvojeno čuva source URL i ne izvodi issuer iz `Host` headera. `contractVersion` i `sequence` su JSON integeri; `generatedAt`, `notBefore` i non-null `notAfter` su canonical UTC RFC 3339 stringovi sa `Z`, sekundama i opciono tačno tri decimalne cifre; `previousKeysetSha256` je `null` samo za bootstrap sequence 1, a zatim lowercase 64-hex SHA-256 exact prethodnog JCS keyset byte sadržaja. `purpose` je u konkretnom fajlu jedna, ne pipe vrednost. Keyset ima najmanje jedan key, jedinstvene KID-eve i tačno jedan `active` key. `revoked` bezuslovno nadjačava vreme, cache i grace; `verification_only` verifikuje samo ranije artefakte i signing servis odbija da njime pravi novi JWS.

Master startup proverava pinovani file hash, schema/purpose/issuer, tačno jedan aktivni KID i da njegov public deo odgovara konfigurisanoj private polovini. Consumer trajno čuva poslednji prihvaćen `sequence`, content hash i exact bytes: niži sequence je rollback i odbija se; isti sequence + isti hash je idempotentan; isti sequence + drugi hash se odbija; viši sequence mora referencirati trenutni hash i imati non-decreasing `generatedAt`. Bootstrap trust dolazi samo iz provisionovanog file/hash para, nikada iz token-provided URL-a.

Planirana rotacija je dvostepena. U sequence N+1 novi key se objavi kao `verification_only` sa budućim `notBefore`, dok je stari još `active`; svi consumeri prvo potvrde novi keyset hash. U sequence N+2, ne pre `notBefore`, novi postaje jedini `active`, stari `verification_only`; signing se prebacuje tek kada master/CMS/vendor instance potvrde N+2. Stari se uklanja tek posle maksimalnog legitimnog envelope/rollback/retention prozora. Kompromitovan key preskače overlap: odmah postaje `revoked`, consumer cache se prisilno osvežava i važi incident runbook.

Plain KID→PEM mapa `NRLS_VENDOR_SIGNING_PUBLIC_KEYS_JSON` se migrira u bootstrap sequence 1 fixture i uklanja; nema dovoljan purpose, validity, revocation ni anti-rollback metadata contract.

`NRLS_SECRET_DECRYPTION_KEYS_JSON` je old-KID keyring za masterove enkriptovane API client secret-e i replay materijal. Novi write koristi samo aktivni `NRLS_SECRET_ENCRYPTION_KID`; startup odbija ciphertext sa nepoznatim KID-em. Batch rewrap pod row lock-om prebacuje stare redove na aktivni KID, a stari ključ se uklanja tek posle zero-count provere i uspešnog restore testa.

`NRLS_ADDON_RELEASE_PUBLIC_KEYS_*` su TARGET Phase 2 trust-config ključevi za master import verifier. Dodati ih u master template/validator zajedno sa startup proverom file ACL-a, JSON schema/KID allowlist-e i pinovanog SHA-256. Worker statička konfiguracija mora referencirati isti odobreni sadržaj/hash; private release signing key nikada nije na masteru ili workeru.

### 8.1 CMS core DB owner, migrator i runtime role

Prazne vendor/client baze ne migrira CMS runtime credential niti addon worker. Za svaki target provisioning uvodi tri exact, međusobno različite PostgreSQL role:

| Target | Core owner | Core migrator login | CMS runtime login |
|---|---|---|---|
| vendor | `nr_cms_vendor_core_owner` (`NOLOGIN`) | `nr_cms_vendor_core_migrator` | `nr_cms_vendor_runtime` |
| client | `nr_cms_client_core_owner` (`NOLOGIN`) | `nr_cms_client_core_migrator` | `nr_cms_client_runtime` |

Core migrator ima članstvo samo u svom `core_owner` i svaka migration session radi provereni `SET ROLE <TARGET_CORE_OWNER>`; nema superuser/CREATEROLE/CREATEDB/BYPASSRLS/replication, drugi target ili master/worker DB pristup. Core owner poseduje bazu, `public` core schema objekte i dedicated operator-only `nr_control` schema-u. `PUBLIC` nema database CREATE, schema CREATE ili object privilegije. CMS `DATABASE_URL` iz vendor/client env-a koristi isključivo runtime login; runtime nije član owner/migrator/deployer role i ne može DDL, `SET ROLE`, menjanje grantova ili čitanje `nr_control`.

Versionirani `CmsCorePrivilegeManifestV1` navodi database resource ID, owner/migrator/runtime role, schema-e i exact runtime CRUD/sequence grant politiku. Core owner za aplikacionu `public` schema-u postavlja default table `SELECT,INSERT,UPDATE,DELETE` i sequence `USAGE,SELECT` grantove runtime roli, a idempotentni grant reconciler isto primenjuje na već postojeće manifestom dozvoljene core/control-plane objekte. Operator-only provisioning/migration receipt i tajni metadata redovi nastaju u `nr_control`, nad kojim runtime nema ni `USAGE`; objekat kome CMS zaista treba pristup ne sme se koristiti kao lažni negative fixture. Webshop business schema ima odvojeni addon-owner/default-grant contract iz 9.1.

Operator-only idempotentni CLI-jevi su:

    npm run db:core:provision -- --target vendor --admin-password-file <ACL_PROTECTED_PATH> --migrator-password-file <ACL_PROTECTED_PATH> --runtime-password-file <ACL_PROTECTED_PATH>
    npm run db:core:provision -- --target client --admin-password-file <ACL_PROTECTED_PATH> --migrator-password-file <ACL_PROTECTED_PATH> --runtime-password-file <ACL_PROTECTED_PATH>
    npm run db:core:migrate -- --target vendor
    npm run db:core:migrate -- --target client

Provisioner proverava/adoptuje samo praznu ili tačno očekivanu postojeću target bazu, kreira/usklađuje role/owner/schema/default ACL bez resetovanja nepoznatog passworda i pravi DPAPI `LocalMachine` sealed core-migrator ref u `D:\nr_runtime\operator-secrets\<target>-cms-core-migrator.v1.dpapi`. Taj ref ima inheritance-disabled ACL samo za Administrators/SYSTEM; ne mogu ga čitati CMS service SID, addon orchestrator/build/registry/DB-broker identiteti ili drugi target. Password fajlovi imaju iste no-symlink/ACL/no-log uslove kao addon-deployer provisioning i operator ih uklanja tek posle smoke-a. `db:core:migrate` se pokreće elevated, razrešava statički target/ref, proverava manifest/database/role, uzima migration advisory lock, radi dry-run/checksum/apply/final-check kao core owner i zapisuje redigovani receipt; secret se ne stavlja u `.env`, CLI argument, child log ili release.

CMS service nikada automatski ne primenjuje core migracije pri startupu. Startup sa pending/drifted core ledgerom pada pre listen-a. Obavezni fixture-i pokrivaju potpuno praznu bazu, upgrade postojeće baze i isolated restore: migrator može primeniti exact signed/repository core set, runtime kroz stvarni service SID može normalan CMS CRUD nad manifestom dozvoljenim core tabelama i sekvencama, ali ne može `CREATE/ALTER/DROP`, `GRANT`, `SET ROLE`, `pg_authid`, `nr_control` ili drugi target; migrator nema runtime/business upotrebu izvan migration session-a. Posle restore-a owner/default ACL/explicit grant/ledger hash moraju biti identični pre service starta.

## 9. Deployment worker baza i env

Prvi contract koristi samo dedicated PostgreSQL; SQLite, in-memory queue i deljenje neke od tri aplikacione baze nisu dozvoljeni. MANUAL preko pgAdmin-a ili `psql` kao lokalni PostgreSQL administrator, sa stvarnim passwordom iz password managera:

```sql
CREATE ROLE nr_addon_deployment_worker_test LOGIN PASSWORD '<UNIQUE_LOCAL_PASSWORD>';
CREATE DATABASE nr_addon_deployment_worker_test OWNER nr_addon_deployment_worker_test;
REVOKE ALL ON DATABASE nr_addon_deployment_worker_test FROM PUBLIC;
```

Ako role već postoji, ne ponavljati `CREATE ROLE` niti resetovati password naslepo; proveriti owner/ACL read-only upitom i primeniti najmanju potrebnu korekciju. Worker role nema prava nad `nr_cms_vendor_test`, `nr_cms_client_test` ili `nr_license_server_test`. Purpose-specific target DB credential iz sledećeg odeljka zasebno se lease-uje samo migration/reconciliation fazi; worker job-store DB credential nikada ne može menjati CMS bazu.

### 9.1 Purpose-specific target DB credential broker

Prvi lokalni contract koristi local-only broker adapter `os_secret_ref_local`; to nije mrežni/HTTP servis. Konkretni Windows backend je zaključan na DPAPI `LocalMachine` sealed fajlove sa fail-closed NTFS ACL-om, ne na interaktivni Windows Credential Manager `CurrentUser` vault. DPAPI `LocalMachine` sam po sebi nije identity izolacija: svako ko može da pročita blob potencijalno može pozvati `CryptUnprotectData`, zato je zaseban service SID i NTFS ACL obavezna security granica. Plaintext target DB password nije u worker `.env`, `targets.json`, worker PostgreSQL bazi niti deployment jobu.

Windows execution model ima četiri odvojena identiteta i nijedan child ne nasleđuje širi token parenta:

| Identitet | Sme | Ne sme |
|---|---|---|
| `NT SERVICE\NRAddonDeploymentWorker` | samo worker-owned secret root za sopstveni job-DB credential i per-target redeploy/result HMAC keyring, target mutex, orkestracija i service adapter | registry token, target-DB sealed credential, CMS runtime/payment/email/Clerk secret root |
| `NT SERVICE\NRAddonBuildSandbox` | job-private source/cache/release tree i pinovani build alati | secret root, DB, service control i broker IPC |
| `NT SERVICE\NRAddonDbCredentialBroker` | samo target-DB sealed entry-je i DB-controller konekciju | GitHub token, build/source tree osim verified migration input handle-a |
| `NT SERVICE\NRAddonRegistryCredentialBroker` | samo GitHub Packages token ref i one-shot fetch child | target-DB sealed entry-je i DB-controller pipe |

Build/verifier se izvršava kroz restricted build-sandbox service/AppContainer token, sa Windows Job Object `KILL_ON_JOB_CLOSE`, zabranjenim breakaway-em i svim potomcima pod istim restricted tokenom. Broj child procesa može biti veći od jedan zbog Next/npm builda, ali nijedan ne sme izaći iz Job Object-a ili promeniti identity. Broker named pipe ACL-ovi ne uključuju build SID; capability je purpose/operation/phase-bound i nije dostupan kroz nasleđeni handle. Orchestratorov mali worker-owned secret root je odvojen od registry/DB/runtime root-ova, ACL-ovan samo za orchestrator/SYSTEM/Administrators, a njegovi handle-i su non-inheritable i nikada se ne prosleđuju child procesu. Orchestrator nema filesystem read nad target-DB/registry sealed blobovima, pa običan ili detached child ne može da iskoristi parent identity kao tajni čitač.

DB sealed entry-je čitaju samo `SYSTEM`, `Administrators` i dedicated DB-broker service SID; operator/Administrators imaju provision/rotate pravo:

    D:\nr_runtime\worker-secrets\vendor-webshop-db-deployer.v1.dpapi
    D:\nr_runtime\worker-secrets\client-webshop-db-deployer.v1.dpapi

Canonical reference-i su versionirani i ne sadrže putanju iz HTTP body-ja:

    dpapi-machine://nr-addon-worker/vendor/webshop-db-deployer/v1
    dpapi-machine://nr-addon-worker/client/webshop-db-deployer/v1

Svaki entry je DPAPI `LocalMachine` ciphertext versioniranog strict objekta `{contractVersion,targetProfile,database,username,password,createdAt}` za zasebnu target ulogu, na primer `nr_cms_vendor_webshop_deployer` odnosno `nr_cms_client_webshop_deployer`. File ACL mora biti inheritance-disabled i dozvoliti samo `SYSTEM`, `Administrators` i exact `NRAddonDbCredentialBroker` service SID; eksplicitno odbija orchestrator/build/registry SID. Startup odbija entry ako owner/ACL/path/root/ref ne odgovaraju. Implementirati idempotentni operator CLI u CMS repo-u:

    npm run db:addon-deployer:provision -- --target vendor --password-file <ABSOLUTE_ACL_PROTECTED_FILE>
    npm run db:addon-deployer:provision -- --target client --password-file <ABSOLUTE_ACL_PROTECTED_FILE>

CLI se pokreće elevated iz odgovarajućeg checkout/config root-a pod operatorovim target-DB owner credentialom, nikada pod worker job-store credentialom. Pre izmene proverava expected host/database/resource ID, exact DB-broker service SID i sealed-secret root, uzima advisory lock, kreira ili proverava exact target rolu, DPAPI-enkriptuje entry i atomski postavlja/verifikuje ACL; auditira samo role, secret-ref version/fingerprint i grant/ACL diff. Password ne sme biti argument, env, log ili audit vrednost. Preferirani unos je no-echo konzolni/OS protected handle; ako se koristi `--password-file`, CLI pre čitanja zahteva apsolutnu putanju van source-a, inheritance-disabled ACL samo za operatora/SYSTEM, odbija symlink/reparse point i ne briše fajl automatski. Operator ga uklanja recoverable procedurom tek kada service-identity broker smoke i restore test prođu. Pozitivni smoke se obavezno izvršava kroz DB-broker service identity, a negativni smoke kroz orchestrator i build identity; operatorov korisnički profil nije dokaz runtime pristupa.

Grant matrica target deployer role je fail-closed i generiše se iz versioniranog CMS-owned allowlist manifesta:

- `CONNECT` samo na sopstvenu vendor ili client bazu i `USAGE` samo na potrebne schema-e;
- `SELECT` nad entitlement/installation/operation/outbox/migration-ledger redovima potrebnim za fence;
- `INSERT/UPDATE` samo nad deployment operation/phase, `cms_addon_migrations` i installed/reconciliation kolonama koje shared data-access contract poseduje;
- DDL/DML samo nad eksplicitno allowlisted Webshop-owned tabelama, indeksima i sekvencama iz potpisanog migration bundle-a;
- bez prava nad Clerk/user/payment/email/core-content tabelama, bez `CREATEROLE`, `CREATEDB`, superuser, replication, bypass-RLS ili pristupa drugoj bazi.

Pošto PostgreSQL `ALTER` zahteva ownership, prvi contract zaključava dedicated `webshop` schema-u u svakoj target bazi. Vlasnik je odgovarajući `nr_cms_vendor_webshop_deployer|nr_cms_client_webshop_deployer`, dok CMS `DATABASE_URL` koristi tačno `nr_cms_vendor_runtime|nr_cms_client_runtime`; nijedna od ovih rola nije DB owner, superuser ili član druge role. Provisioning pod kontrolisanim DB owner nalogom kreira schema-u, `REVOKE ALL ... FROM PUBLIC`, daje runtime roli samo `USAGE ON SCHEMA webshop` i kao deployer postavlja exact default privileges:

```sql
ALTER DEFAULT PRIVILEGES FOR ROLE nr_cms_vendor_webshop_deployer IN SCHEMA webshop
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nr_cms_vendor_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE nr_cms_vendor_webshop_deployer IN SCHEMA webshop
  GRANT USAGE, SELECT ON SEQUENCES TO nr_cms_vendor_runtime;
```

Client koristi identične naredbe sa `nr_cms_client_webshop_deployer` i `nr_cms_client_runtime`. Ovo je per-database provisioning; vendor role nikada ne postoji kao grant principal u client bazi i obrnuto. Za postojeće/backfill objekte isti idempotentni provisioner eksplicitno dodeljuje exact table `SELECT,INSERT,UPDATE,DELETE` i sequence `USAGE,SELECT` samo objektima iz potpisanog Webshop ownership manifesta, zatim poredi `pg_namespace`, `pg_class`, owner i ACL sa očekivanim skupom. Default privileges nisu retroaktivne, pa zero-drift provera mora obuhvatiti i stare i upravo kreirane objekte.

`migrationPrivilegeManifestSha256` je hash canonical manifesta koji uključuje database resource ID, literal schema `webshop`, expected deployer owner, expected runtime role, dozvoljene object-name/prefix klase, runtime table/sequence grantove, zabranjene core schema-e i verziju grant reconciler-a. Signed addon migration descriptor može menjati samo deklarisane objekte u `webshop`; parser/SQL policy odbija `CREATE/ALTER/DROP SCHEMA`, promenu owner-a, role membership, `SET ROLE`, raw `GRANT/REVOKE`, search-path escape i kvalifikovan objekat izvan allowlist-e. Fixed controller grant-reconciler, ne addon SQL, posle svakog uspešnog DDL koraka pod istim lockom primenjuje manifestom dozvoljene grantove i ponovo auditira ACL pre candidate starta. Bilo koji dodatni grant ili owner drift je `privilege_manifest_mismatch` i nema service switch-a.

Pozitivni integration smoke posle migracije koja kreira novu tabelu i sekvencu pokreće se kroz stvarni target CMS service SID i njegovu runtime DB rolu: radi samo očekivani CRUD/nextval nad `webshop` objektima. Negativni smoke dokazuje da runtime rola ne može DDL/owner/deployer/role operacije ili `nr_control`, a addon deployer ne može Clerk/payment/email/core-content tabelu ili drugi target. Isti test se ponavlja posle isolated DB restore-a, jer dump/restore mora očuvati ili idempotentno ponovo uspostaviti owner/default-privilege/explicit-grant stanje pre service starta.

`targets.json` za svaki target sadrži samo non-secret vrednosti:

    migrationCredentialBrokerMode: os_secret_ref_local
    migrationCredentialSecretRef: <EXACT_OS_SECRET_REFERENCE>
    migrationDatabaseHost: 127.0.0.1
    migrationDatabasePort: 5432
    migrationDatabaseName: nr_cms_vendor_test|nr_cms_client_test
    migrationExpectedProviderResourceId: <PINNED_RESOURCE_ID>
    migrationPrivilegeManifestSha256: <64_LOWERCASE_HEX>
    migrationLeaseSeconds: 1800

Acquire je dozvoljen tek posle uspešnog secret-free verify/build gate-a i prima exact `(targetProfile, addonKey, installationId, operationId, deploymentEpoch, generation, releaseId)`. Orchestrator preko local ACL/capability-authenticated DB-broker pipe-a traži jedan job-private, long-lived `db-phase-controller` pod exact `NRAddonDbCredentialBroker` identity-jem. Controller sam razrešava statički DPAPI ref, vraća parentu samo redigovani `{leaseId,expiresAt,databaseIdentity,resourceId,credentialFingerprint}`, otvara jednu dedicated PostgreSQL session konekciju i drži je od pre prve CMS mutacije kroz migracije, service switch, reconciliation, bounded final readiness i eventualni terminalni rollback/maintenance receipt. Plaintext username/password/URL nikada se ne vraćaju parentu niti ulaze u env/CLI; postoje samo u controller memoriji do otvaranja konekcije.

Parent orchestrator i controller komuniciraju isključivo preko job-private duplex Windows named pipe-a čiji ACL dozvoljava tačno orchestrator i DB-broker SID, a eksplicitno ne build/registry SID. Jednokratni 256-bitni channel key prenosi DB broker kroz non-inheritable broker handle vezan za exact operation capability, ne kroz argument/env/fajl ili build-child handle; svaki strict-schema frame nosi monotoni sequence, operation tuple i HMAC, a replay/out-of-order/unknown command prekida phase. Closed commands su `verify_identity_and_lock`, `write_phase`, `apply_verified_migrations`, `begin_serving_mutation_fence`, `reconcile_candidate`, `finalize_ready_receipt`, `write_recovery_receipt`, `write_no_mutation_receipt`, `inspect_recovery` i `close`; proizvoljan SQL/path/command nije dozvoljen. `begin_serving_mutation_fence` mora durable commitovati aktivan per-target/addon fence pre service-stop/pointer write-a; samo terminalni receipt writer ga razrešava. Controller koristi pinovani shared CMS data-access/migration runner i verified migration bytes/hash iz job evidence-a. Parent pre i posle svake filesystem/service mutacije zahteva fresh fence receipt, ali ne dobija DB secret ili konekciju.

Lease je najviše 1800 sekundi i ceo mutation window ima kraći hard deadline/safety margin. Gubitak pipe-a, controller procesa, DB session/advisory lock-a, target mutexa ili lease ownershipa odmah zaustavlja nove mutacije. `finally` šalje close, zatvara konekciju/controller i release-uje lease; OS/DB crash automatski zatvara handle/session, a recovery sa novim lease-om prvo radi fenced DB/pointer/ledger inspection. Istek pre prve mutacije je retryable; istek/unknown stanje posle mutacije je incident/recovery, nikada implicitno odobrenje.

U lokalnom `os_secret_ref_local` modu DB password može biti dugovečan, ali je njegovo dekriptovanje phase-scoped u controlleru i broker lease je vremenski ograničen; dokumentacija ga ne naziva lažno dinamičkim PostgreSQL credentialom. Production zamena koristi isti controller/broker interface sa stvarno kratkotrajnim DB credentialom i eksplicitnim revoke-om. Rotacija je add-new sealed version -> DB-broker identity smoke + orchestrator/build deny-smoke -> static active-ref switch -> drain svih lease-ova starog fingerprinta -> revoke DB password/remove old sealed entry; worker DB backup ne sadrži nijednu secret vrednost, a secret backup/restore čuva DPAPI machine binding i ACL dokaz.

Predloženi private source root je `D:\nr_cms\.private\addon-deployment-worker` kao zaseban repo koji tek treba kreirati, a runtime env je ACL-zaštićen `D:\nr_runtime\worker\.env` van source/release root-a. Minimalni target env contract:

    NODE_ENV=development
    NR_ADDON_DEPLOYMENT_WORKER_ENVIRONMENT=development
    NR_ADDON_DEPLOYMENT_WORKER_PUBLIC_URL=https://deploy.nr.test
    NR_ADDON_DEPLOYMENT_WORKER_PORT=3003
    NR_ADDON_DEPLOYMENT_WORKER_DATABASE_URL=postgresql://nr_addon_deployment_worker_test:<PASSWORD>@127.0.0.1:5432/nr_addon_deployment_worker_test
    NODE_USE_SYSTEM_CA=1
    NR_ADDON_RELEASE_PUBLIC_KEYSET_FILE=D:\nr_runtime\trust\webshop-release-public-keys.json
    NR_ADDON_RELEASE_PUBLIC_KEYSET_SHA256=<64_HEX>
    NR_ADDON_WORKER_TARGET_CONFIG_FILE=D:\nr_runtime\worker\targets.json
    NR_ADDON_WORKER_GITHUB_PACKAGES_TOKEN_SECRET_REF=<OS_SECRET_STORE_REFERENCE>
    NR_ADDON_WORKER_CREDENTIAL_BROKER_MODE=os_secret_ref_local
    NR_ADDON_WORKER_MAX_CREDENTIAL_LEASE_SECONDS=1800

`targets.json` ne sadrži plaintext secret; svaki vendor/client target ima exact `licenseEnvironment=development` i referencira per-target request-verifier i result-signer active+old key mape i target DB deployer credential u OS secret store-u, release roots, static CMS SHA/source mirror, service adapter, health/result URL, public build-env file/hash i master evidence base URL iz dokumenta 05. Startup zahteva target `licenseEnvironment == NR_ADDON_DEPLOYMENT_WORKER_ENVIRONMENT`, zatim validira database name/resource ID, privilege-manifest hash, migration ledger, Caddy/public origin, keyset hash, target-path containment i postojanje/ACL secret reference-i pre slušanja porta, ali ne acquire-uje target DB secret pre migration faze.

Public build input nije target runtime `.env`. Provisionovati dva read-only JCS fajla van source/release root-a:

    D:\nr_runtime\worker\build-env\vendor.json
    D:\nr_runtime\worker\build-env\client.json

Exact `CmsPublicBuildEnvV1` objekat nema dodatna polja:

```json
{
  "contractVersion": 1,
  "targetProfile": "vendor|client",
  "values": {
    "NEXT_PUBLIC_APP_URL": "https://vendor.nr.test|https://client.nr.test",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": "<TARGET_PUBLIC_KEY>",
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY": "<TARGET_PUBLIC_SITE_KEY>",
    "WEBSHOP_PUBLIC_BASE_URL": "https://vendor.nr.test|https://client.nr.test"
  }
}
```

Svaki konkretni fajl bira po jednu vrednost, `targetProfile`/origin moraju odgovarati statičkom targetu, a key skup je exact. Worker konfiguracija čuva `buildEnvFile` i `buildEnvSha256=lowercaseHex(SHA-256(exact JCS bytes))`. Build child dodatno dobija samo konstantne `NODE_ENV=production`, `NEXT_TELEMETRY_DISABLED=1`, odgovarajući `NR_CMS_DEPLOYMENT_PROFILE`, `NR_ADDON_SOURCE_MODE=registry` i `NR_CMS_ENV_PHASE=build`. Validator mora implementirati ovu posebnu build fazu bez runtime secret zahteva. Fajlovi sadrže samo javne vrednosti, ali su integrity-sensitive jer ih Next ugrađuje u build; ne kopiraju se u release i njihovi hash-evi ulaze u worker phase evidence. Nijedan `CLERK_SECRET_KEY`, DB URL, payment/email secret, encryption/HMAC key ili registry token nije dozvoljen.

Target worker repo mora obezbediti:

    npm ci --ignore-scripts
    npm run env:validate
    npm run db:migrate:dry-run
    npm run db:migrate
    npm run dev -- --port 3003

Migracije kreiraju najmanje durable deployment jobs/leases, target-installation state/highest-epoch ključan po `(target_profile, addon_key, installation_id)`, request replay/idempotency, phase evidence, canonical terminal-result binding i result outbox. Pre prvog joba napraviti redigovano označen DB backup i uraditi isolated restore test; HMAC/registry/target-DB secret store se backupuje zasebnom secret procedurom, ne SQL dumpom.

## 10. Generisanje test secret-a

Za svaku vrednost pokrenuti komandu ponovo:

    node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"

Ne koristiti isti rezultat za:

- CRON_SECRET;
- IP_HASH_SALT;
- NR_ADDON_INSTALLATION_ENCRYPTION_KEY;
- svaki aktivni i stari installation-envelope key;
- svaki aktivni/stari transfer-approval derivation secret;
- WEBSHOP_CART_TOKEN_SALT;
- WEBSHOP_DOWNLOAD_TOKEN_SECRET;
- WEBSHOP_DOWNLOAD_EVENT_HASH_SECRET;
- WEBSHOP_LICENSE_SERVER_SECRET_KEY;
- svaki aktivni i stari vendor master-credential envelope key;
- WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KEY;
- redeploy HMAC;
- deployment-result HMAC;
- master encryption;
- svaki stari master secret-decryption key tokom rotacije;
- nonce cleanup cron.

Posle faze 7 generisati još jedan zaseban `WEBSHOP_LICENSE_ISSUE_CRON_SECRET`; njegova implementacija mora istovremeno promeniti vendor template, validator, cleanup script i cron auth rutu. Dok ta faza nije završena, stvarna ruta i dalje koristi postojeći `CRON_SECRET`.

Ed25519 entitlement key može se generisati OpenSSL-om:

    openssl genpkey -algorithm Ed25519 -out nrls-entitlement-private.pem
    openssl pkey -in nrls-entitlement-private.pem -pubout -out nrls-entitlement-public.pem

Private fajl čuvati van repozitorijuma. U .env PEM mora biti u formatu koji dotenv zaista parsira kao višelinijski PEM; dodati automated startup test koji poziva createPrivateKey pre podizanja servera.

Komande ponoviti sa drugim output imenima za purchase-intent i Webshop release key pair. Ne kopirati isti private key pod tri KID-a.

## 11. Instalacija dependencies i migracije

Pre prvog starta:

    npm ci --ignore-scripts

CMS migracije:

    npm run env:validate
    npm run db:core:migrate -- --target vendor
    npm run db:core:migrate -- --target client

Svaki poziv koristi operator-only core-migrator credential iz odeljka 8.1, radi dry-run/checksum/apply/final-check i mora završiti bez pending migracija. Obični `npm run db:migrate` sa CMS runtime `DATABASE_URL` nije autoritativna target procedura i mora pasti zbog nedostatka DDL prava.

Master:

    npm run env:validate
    npm run db:migrate:dry-run
    npm run db:migrate

Za vendor/client početni build registry je prazan dok licenca ne pokrene deployment worker. addons.registry.json i addon-release-public-keys.json ne treba ručno puniti nepouzdanim lokalnim vrednostima.

## 12. Start komande

Za pre-worker UI/HMR razvojni smoke, nakon implementacije env profile/predev popravke:

    npm run dev -- --port 3000
    npm run dev -- --port 3002

Master:

    npm run dev -- --port 3001

Deployment worker, nakon što bude implementiran, sluša samo na loopback portu 3003; operator ga pokreće komandom definisanom u njegovom zasebnom private repo-u, a CMS ga poziva isključivo preko `https://deploy.nr.test` target-specific rute.

Svaku komandu pokrenuti iz odgovarajućeg direktorijuma, ne iz D:\nr_cms.

Ručno pokrenut production-style smoke može koristiti build/start:

    npm run build
    npm run start -- --port <PORT>

Ove ručne `dev/start` komande nisu managed activation E2E. Deployment worker mora upravljati restartom i ne sme pokušati da zameni fajlove procesa koji radi iz istog release direktorijuma.

### 12.1 Obavezni lokalni managed-service model

Prvi Windows contract koristi WinSW kao hash-pinovani SCM wrapper i dva named servisa:

| Target | SCM service | Virtual service account | Current junction | Env fajl | Port |
|---|---|---|---|---|---|
| vendor | `NRVendorCms` | `NT SERVICE\NRVendorCms` | `D:\nr_deploy\vendor\current` | `D:\nr_cms-vendor\.env` | 3000 |
| client | `NRClientCms` | `NT SERVICE\NRClientCms` | `D:\nr_deploy\client\current` | `D:\nr_cms-client\.env` | 3002 |

Provisioning root je `D:\nr_runtime\service-supervisor`; sadrži jedan operator-approved `WinSW-x64.exe`, njegov version/hash receipt i fixed `nr-cms-service-launcher.ps1`. Per-target config/log root je `D:\nr_runtime\services\vendor|client`. WinSW executable, launcher i XML nisu u CMS release-u, imaju inheritance-disabled ACL i menjaju ih samo Administrators/SYSTEM kroz auditovan provisioning. Worker target config pin-uje apsolutnu wrapper/launcher/XML putanju i SHA-256 svakog fajla. Ne koristiti `nssm`, Task Scheduler, proizvoljan PID fajl ili `npm run dev` kao paralelni adapter.

Launcher prima samo literal `-Target vendor|client`; ne prima command/path/port/env iz deployment requesta. Iz svoje read-only static mape bira gornji current/env/port, strict parsira kompletan role template, zahteva `NODE_ENV=production`, `NR_CMS_DEPLOYMENT_PROFILE` i `NR_LICENSE_ENVIRONMENT`, zatim u child memoriji postavlja runtime env i `exec`-uje pinovani `node.exe` nad exact `<current>\node_modules\next\dist\bin\next start -H 127.0.0.1 -p <port>`. Ne štampa env, ne koristi shell interpolation i odbija current junction koji nije resolved ispod očekivanog release root-a. WinSW XML ima samo fixed launcher/target, restart policy `none` tokom worker-controlled switch-a, bounded stop timeout i log path; secret vrednosti nisu u XML-u ili SCM command line-u.

Operator jednom, iz elevated terminala:

1. provisionuje i hash-verifikuje wrapper/launcher/XML u navedenim rootovima;
2. kroz bootstrap contract iz sledećeg odeljka napravi prvi addon-free verified production release i `current` junction ka njemu;
3. instalira `NRVendorCms` i `NRClientCms` kroz njihove lokalne WinSW executable/XML parove, postavlja service SID unrestricted i logon identitet na odgovarajući virtual account;
4. ACL-uje svaki env/release/current read samo njegovom service SID-u, write samo target uploads/temp/log rootovima; vendor SID nema client pristup i obrnuto, oba nemaju `.private`/development-source/worker-secret pristup;
5. daje deployment-worker service identity-ju SCM `QUERY_STATUS|START|STOP` samo nad ova dva servisa i write/swap pravo samo nad odgovarajućim `current` junction parentom; nema `CHANGE_CONFIG`, install/delete service ili proizvoljan process-control grant;
6. startuje svaki servis kroz SCM i potvrđuje Caddy HTTPS liveness, exact PID/service mapping, port i loaded build/release ID.

WinSW `install/uninstall`, `sc.exe config/sidtype` i service-DACL promene zahtevaju administratora i pripadaju provisioning runbooku, ne deployment jobu. Implementacija mora čuvati read-only receipt sa WinSW/launcher/XML hashom, service name/SID-om i DACL smoke rezultatom bez env sadržaja. Restore na drugu mašinu zahteva ponovno lokalno provisionovanje service SID/ACL-a; kopiranje direktorijuma samo po sebi nije dovoljno.

#### 12.1.1 Prvi addon-free core release

Pre instalacije WinSW servisa `current` još ne postoji, pa prvi release ne sme nastati kopiranjem checkout `.next`/`node_modules` direktorijuma ili ručnim `npm run build` outputom. Zasebni worker repo mora imati operator-only CLI:

    npm run target:bootstrap -- --target vendor --cms-sha <PINNED_CMS_SHA>
    npm run target:bootstrap -- --target client --cms-sha <SAME_PINNED_CMS_SHA>

CLI prihvata samo literal target i CMS SHA koji već mora odgovarati statičkoj target allowlisti; sve putanje, build-env reference, Node/npm/pacote verzije i release root dobija iz target configa. Zahteva elevated/provisioning authorization ili namensku jednokratnu bootstrap capability, ali ne prima license key, entitlement, addon package, service command, env putanju ili arbitrary source URL. Pre rada uzima isti target mutex/fencing-token contract kao normalan deploy i odbija već pokrenut target servis ili current junction sa nepoznatim poreklom.

Za svaki target CLI:

1. eksportuje pinovani CMS commit iz trusted mirror-a u novi contained staging direktorijum i potvrđuje odsustvo `.private`, `.env`, `.next` i `node_modules`;
2. čuva i hashira exact base `package.json`/`package-lock.json`, pravi verified public base-lock fetch plan i job-private cache, zatim radi token-free offline `npm ci --ignore-scripts`; private GitHub Packages token i Webshop tarball nisu prisutni;
3. generiše i strict verifikuje prazan production addon registry/keyset projection, pa radi production build sa istim hash-pinovanim target `CmsPublicBuildEnvV1`, network-denied build sandboxom i core compatibility proverama kao normalan worker release;
4. proverava da nema addon entry-ja, addon DB migrationa, entitlementa ili installed-addon evidence-a; CMS core DB migracije su zaseban prethodni operator gate;
5. atomically finalizuje immutable `D:\nr_deploy\<target>\releases\core-bootstrap-<BOOTSTRAP_ID>` i signed/append-only `CoreBootstrapReleaseReceiptV1` sa targetom, CMS SHA-om, base manifest/lock, dependency inventory, build-env, toolchain, registry-empty, artifact/build ID i path-containment hash dokazima;
6. samo ako `current` ne postoji radi atomic first-junction create ka tom exact release-u, ponovo ga resolve/hash-verifikuje i tek potom dozvoljava WinSW install/start iz gornje procedure.

`BOOTSTRAP_ID` je deterministički lowercase SHA-256 identitet canonical target/CMS/base-lock/build-env/toolchain inputa, pa exact retry vraća isti receipt/release bez drugog build autoriteta. Isti target sa drugačijim inputom, parcijalni direktorijum, postojeći current koji nije vezan za isti receipt ili target/config drift daje conflict/incident i zahteva eksplicitno operator recovery; retry prvo inspectuje staging/final/current stanje i ili bezbedno nastavlja isti bootstrap ili ostavlja servis nezačet. Vendor i client dobijaju različite release direktorijume, receipts i build-env hash-eve čak i uz isti CMS SHA. Fixture prekida proces posle staging builda, posle final rename-a i pre/posle first-junction CAS-a i dokazuje idempotentan oporavak, kao i da vendor bootstrap ne može pisati client root. Ovaj bootstrap release je samo core serving osnova; prva validna Webshop aktivacija i dalje pravi novi immutable registry-based release normalnim deployment tokom.

### 12.2 Closed service-adapter contract

Workerov `WindowsScmCmsServiceAdapterV1` target dobija samo iz statičke rute. Dozvoljene metode su:

    inspectV1()
    stopV1({operationId, expectedPid, expectedProcessStartTime,
            expectedCurrentTarget, targetFencingToken})
    startV1({operationId, expectedCurrentTarget, expectedReleaseId,
             targetFencingToken})
    waitForStateV1({operationId, expectedState, targetFencingToken})

Service name, wrapper/config/launcher path, Node path, port, release root i env path nisu request polja. `inspectV1` proverava exact SCM name/SID/start type, wrapper/config/launcher hash, resolved current target containment, service PID/start time, process image/parent/command line i listening loopback port. `stopV1` radi compare-and-stop samo ako sva expected polja i current target/fencing token odgovaraju; čeka najviše 60 sekundi na SCM `STOPPED`. Ne koristi `taskkill`/wildcard/ime procesa i timeout daje incident bez pointer write-a. Tek potvrđen STOPPED dozvoljava atomic current-junction swap. `startV1` ponavlja hash/path/fence proveru, startuje samo named servis, čeka najviše 90 sekundi na `RUNNING`, zatim proverava novi PID/start time, exact resolved current path i internal loaded release/build health. Bilo koji `PAUSE_PENDING|STOP_PENDING` timeout, unexpected auto-restart, PID reuse, wrapper/config drift, port owner mismatch ili service DACL drift je fail-closed incident/recovery.

Adapter receipt za svaki poziv sadrži operation/target/fencing token, service name, pre/post SCM state, PID/start-time fingerprint, resolved current target, wrapper/config/launcher hashes i timestamp; nema env/command secret. Fixture dokazuje da vendor adapter ne može stop/start client servis, request ne može promeniti service/path/port, stop timeout ne vodi u kill/switch, config drift pada i isti operation recovery idempotentno završava pod target mutexom. Tek ovaj model se koristi u activation E2E-u; `npm run dev` ostaje odvojeni development smoke.

## 13. Infrastructure gate

Gate prolazi tek kada:

- vendor i client su na istom CMS SHA-u;
- oba checkouta nemaju .private;
- master je na zabeleženom master SHA-u;
- sve četiri service env validacije prolaze kada je worker u E2E scope-u;
- vendor/client/master baze i zasebna `nr_addon_deployment_worker_test` baza imaju očekivani migration ledger;
- vendor, client i master HTTPS origin-i odgovaraju;
- `deploy.nr.test` worker origin odgovara kada se testira activation deployment;
- HMR nema blocked cross-origin poruku;
- vendor i client imaju različite installation ID vrednosti;
- vendor može server-side da pozove https://license.nr.test;
- client može server-side da pozove https://license.nr.test;
- nijedan registry token nije u .env fajlovima.
