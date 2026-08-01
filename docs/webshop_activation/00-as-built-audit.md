# 00 — Audit postojećeg stanja

## Svrha

Ovaj dokument sprečava da implementacija krene od pogrešne pretpostavke. U njemu je odvojeno ono što kod već radi od onoga što tek treba napraviti.

## Sažeta matrica

| Oblast | Trenutno stanje | Presuda |
|---|---|---|
| Caddy HTTPS i posebni hostovi | vendor.nr.test, license.nr.test i client.nr.test su predviđeni i Next allowedDevOrigins već sadrži odgovarajuće hostname vrednosti | Caddy spreman; CMS outbound caller još blokira HTTPS host koji se razrešava na loopback |
| Tri baze | baze postoje, ali su prazne | spremno za migracije |
| Webshop package identity | @radomirradojevic/webshop, verzija 0.5.0, restricted GitHub Packages config | postoji |
| Webshop publish workflow | manual workflow, tag/version gate, clean export, potpisani manifest, verifikovan tarball | postoji; status stvarnog private package publish-a nije moguće dokazati samo iz lokalnog source-a |
| CMS build-time registry | allowlisted literal import i provera package manifesta/hash-eva/potpisa | postoji |
| CMS aktivacioni ekran | admin unosi key; postoji Buy dugme kada je URL moguće napraviti | postoji |
| Aktivacija | challenge/complete PoP tok i potpisani entitlement | postoji |
| Revalidacija | periodična provera centralnog entitlementa | postoji |
| Instalacija nakon aktivacije | callback se šalje best-effort, ali receiver/worker ne postoji | blokira E2E |
| Master empty-DB admin | kreira random password koji se nigde ne otkriva | blokira upravljanje praznom bazom |
| V2 API client secret | tabele postoje, admin create/rotate ne pune api_client_secret_versions | blokira V2 |
| V2 product scopes | tabela i enforcement postoje, admin UI/actions ne postoje | blokira V2 |
| V2 catalog sync | master ruta zahteva HMAC V2, Webshop catalog builder i dalje šalje legacy zaglavlja | blokira sync |
| Product requiresDomain | kolona postoji, admin create/edit tok je ne izlaže | blokira ispravan domain policy |
| Ručna licenca sa domenom | manual action upisuje domain=null | ne ispunjava vendor domain test |
| Četiri SKU-a u jednom proizvodu | external license SKU je product-level, ne variant-level | blokira traženi model |
| Buy link | client potpisuje domain payload deljenim HMAC secretom | samo parcijalno |
| Vendor prihvat purchase intenta | nema verifikacije niti trajnog snapshot-a kroz cart/checkout/order | ne postoji |
| Payment outbox | V2 payment state i license outbox postoje iza flagova | postoji, zahteva dopune |
| Izdavanje licence | master POST /api/v1/entitlements postoji i podržava domain | postoji |
| Delivery spoljne licence | ključ se šifruje u issue tabeli, ali customer delivery/email ga ne razrešava | nedovršeno |
| Enkripcija spoljne licence | issue tok koristi isti `encryptLicenseServerSecret()`/KEK kao master API credential i ne upisuje pouzdan issued-key KID | blokira key separation/rotation |
| Addon migracije | ledger tabele postoje; package nosi samo migrations.json, bez SQL sadržaja; runner ne postoji | blokira E2E; cilj je potpisani package bundle + worker runner iz 03/11 |
| Webshop DB ownership | root CMS `db/schema.ts` ima 45 business tabela u `public`, dok private package schema/`0001` ima nekompatibilan 13-table model; samo sedam imena se preklapa | P0 release blocker; potreban canonical `webshop` schema baseline, root/package source-of-truth razdvajanje i operator legacy cutover iz 03 |
| Env profil vendor/client | validator uvek bira .env.example.vendor kada taj fajl postoji | blokira čist client profil |
| Clean deployment dev start | predev uvek pokreće addons:local i očekuje .private | blokira clean deployment dev start |
| Lifetime activation expiry | master licencu bez `validUntil` u activation odgovoru pretvara u sentinel datum 2099-12-31, a CMS schema zahteva datum | V2 mora imati nullable business expiry |
| Deployment worker origin | postoje samo vendor/license/client Caddy site-ovi | pre worker E2E-a dodati `deploy.nr.test -> 127.0.0.1:3003` |

## Šta aktivacija trenutno radi

CMS implementacija je u:

    app/dashboard/webshop/actions.ts
    lib/webshop-addon/license.ts
    lib/vendor-addon-installation.ts
    lib/vendor-addon-entitlements/*

Master implementacija je u:

    .private/license-server/app/api/addons/licenses/activate/route.ts
    .private/license-server/app/api/addons/licenses/revalidate/route.ts
    .private/license-server/src/data/addon-activation.ts

Postojeći tok:

1. CMS određuje site domain.
2. CMS kreira ili učitava lokalni installation ID i Ed25519 key pair.
3. Privatni installation key ostaje šifrovan u CMS bazi.
4. CMS šalje license key, addonKey=webshop, domen, deployment mode, installation ID, fingerprint i public key masteru.
5. Master proverava licencu i vraća kratkotrajni challenge.
6. CMS potpisuje challenge privatnim installation key-em.
7. Master proverava potpis i activation limit.
8. Master vraća potpisani entitlement, packageName i packageVersion.
9. CMS kriptografski proverava entitlement preko master public-key endpointa.
10. CMS proverava da li package već postoji u build-time registryju.
11. Opcioni redeploy callback šalje se best-effort pre durable entitlement save-a i njegova greška se trenutno ignoriše.
12. Tek zatim CMS čuva entitlement i postavlja ready ako je package već učitan, inače install_pending.

Važan lokalni HTTPS GAP: activation, revalidation i public-key fetch caller trenutno prosleđuju `allowSelfHosted: localHttp`. Za `https://license.nr.test` je `localHttp=false`, pa se ignoriše `NRLS_ALLOW_SELF_HOSTED_OUTBOUND=true`; DNS rezultat `127.0.0.1` zato biva odbijen kao private address. P0 popravka mora odvojiti odluku „sme privatna/self-hosted adresa sa eksplicitne host allowliste” od odluke „sme nešifrovani loopback HTTP”. Za `.nr.test` se dozvoljava prvo, ali drugo ostaje `false`.

Aktivacija trenutno ne radi sledeće:

- ne preuzima npm paket;
- ne proverava GitHub Packages tarball;
- ne menja package.json ili lockfile;
- ne primenjuje addon migration ledger;
- ne gradi novu CMS verziju;
- ne restartuje proces;
- ne čuva pouzdan deployment job;
- ne vraća dovoljno release metapodataka za desired artifact reconciliation.

## Package granica

Development helper:

    scripts/setup-local-webshop-addon.mjs

gradi source iz:

    D:\nr_cms\.private\webshop

i kopira build rezultat u:

    D:\nr_cms\node_modules\@radomirradojevic\webshop

To je isključivo development pogodnost. Nije dokaz da hosted registry instalacija radi.

Production-style loader koristi:

    addons.registry.json
    addon-release-public-keys.json
    scripts/generate-addon-registry.mjs
    .generated/addon-registry.ts

Generator već odbija nepoznat package name i proverava:

- addonKey;
- package name i verziju;
- artifact SHA-256;
- provenance subject;
- release signing KID;
- Ed25519 potpis;
- svaki fajl u potpisanom inventoryju;
- server entrypoint.

Trenutna dva registry input fajla su prazna, što je ispravno za base CMS, ali deployment worker mora generisati neprazan, pinovan input za instalirani Webshop.

## Master Vendor License API

Autoritativne rute za vendor commerce su:

    GET  /api/v1/catalog
    POST /api/v1/entitlements
    POST /api/v1/entitlements/validate
    POST /api/v1/entitlements/{id}:renew
    POST /api/v1/entitlements/{id}:suspend
    POST /api/v1/entitlements/{id}:reinstate
    POST /api/v1/entitlements/{id}:revoke
    POST /api/v1/entitlements/{id}:refund
    POST /api/v1/entitlements/{id}:chargeback

Legacy /api/v1/licenses tok nije cilj ove implementacije.

HMAC V2 enforcement već zahteva:

- X-NRLS-Auth-Version: 2;
- X-NRLS-Client-Id;
- X-NRLS-Key-Id ili podrazumevani legacy-1;
- X-NRLS-Timestamp;
- X-NRLS-Nonce;
- X-NRLS-Signature;
- Idempotency-Key za mutacije;
- aktivan secret version;
- odgovarajući product/SKU/action/environment scope.

Problem je u admin i Webshop klijentskom sloju, a ne u osnovnoj master verifikaciji.

AS-BUILT catalog `catalogVersion` se formira pozivom `new Date().toISOString()` pri svakom GET-u. Zato dva neizmenjena čitanja imaju različit binding identitet. Cilj mora uvesti durable revision/content hash koji se menja samo u autoritativnoj catalog mutaciji; vreme čitanja ostaje zaseban `generatedAt`.

## Licencni product i SKU

Master već podržava:

- product_types.addon_key;
- product_types.requires_domain;
- SKU duration_days;
- SKU activation_limit;
- SKU edition, license_type, policy_template i features.

Duration 0 znači bez vremenskog isteka. Zato ciljne vrednosti glase:

| SKU | durationDays | Značenje |
|---|---:|---|
| webshop-30 | 30 | 30 dana |
| webshop-183 | 183 | približno pola godine |
| webshop-365 | 365 | godina |
| webshop-1000000 | 0 | lifetime |

Naziv webshop-1000000 je poslovna oznaka. U bazi ne treba upisati milion dana.

## Kritični blokatori pre E2E testa

P0 redosled:

1. Popraviti master admin bootstrap za praznu bazu.
2. Dovršiti API client secret versions, KID i product scopes.
3. Popraviti V2 catalog request i zameniti per-request timestamp stabilnim durable catalog revisionom.
4. Izložiti requiresDomain i domain u ručnom license generation toku.
5. Uvesti eksplicitni CMS deployment profil i odvojiti private-workspace dev setup od registry deploymenta.
6. Popraviti HTTPS self-hosted outbound politiku za `license.nr.test` i dodati `deploy.nr.test` worker origin.
7. Proširiti activation challenge signed host-capability descriptorom, response release metapodacima i trajno upisati install job.
8. Implementirati deployment worker i reconciliation.
9. Implementirati master-signed purchase intent i immutable domain snapshot.
10. Uvesti per-variant external SKU mapping.
11. Dovršiti bezbednu customer delivery stranicu i email.
12. Odvojiti issued-license KEK/KID od API-credential KEK-a i rewrap-ovati legacy issue redove.
13. Uvesti KID/keyring/rewrap za master secret, vendor API-credential i installation identity envelope; plain entitlement public-key mapu zameniti versioniranim keysetom.
14. Zaključati addon migration ownership/runner.
15. Tek zatim pokrenuti puni E2E.

U okviru activation contract promene, lifetime poslovni rok mora postati `null`. Kriptografski JWS i dalje ima kratkotrajan `exp` za envelope/revalidation, ali to nije datum isteka lifetime licence. Sentinel `2099-12-31` se ne prenosi u V2 contract.

## Poznate bezbednosne napomene

- Trenutni Webshop verifier mora dodatno eksplicitno odbiti release signing KID koji počinje sa local-dev: u bilo kom non-development deploymentu.
- packageInstallToken polja postoje u CMS response šemi, ali master ih ne izdaje. GitHub Packages read token ne sme biti vraćen kroz activation response.
- Dugovečni GitHub Packages read token pripada samo deployment worker secret store-u.
- Current buy-link shared secret nije prihvatljiv za distribuirane produkcione client CMS instance.
- Installation PoP potvrđuje CMS private-key kontrolu, ali ne i hostname kontrolu; produkcija zato zahteva zaseban HTTPS well-known domain proof. `.nr.test` koristi samo deklarisani development izuzetak.
- Port nije deo licencnog domena. Upravo zato se koriste vendor.nr.test i client.nr.test.
- localhost:3000 i localhost:3002 bi oba postala localhost i ne bi predstavljala dva različita entitlement domena.

## Izvorni fajlovi koje implementator mora prvo pročitati

CMS host:

    app/dashboard/webshop/actions.ts
    app/dashboard/webshop/page.tsx
    components/webshop-license-activation.tsx
    lib/webshop-addon/buy-link.ts
    lib/webshop-addon/license.ts
    lib/webshop-addon/loader.ts
    lib/addon-runtime/redeploy-callback.ts
    lib/addon-runtime/install-state.ts
    scripts/generate-addon-registry.mjs
    scripts/setup-local-webshop-addon.mjs
    scripts/validate-runtime-env.mjs
    db/schema.ts

Webshop:

    .private/webshop/src/data/webshop-license-server-api.ts
    .private/webshop/src/data/webshop-license-server-catalog.ts
    .private/webshop/src/data/webshop-license-fulfillment-outbox.ts
    .private/webshop/src/data/webshop-orders.ts
    .private/webshop/src/data/webshop-order-emails.ts
    .private/webshop/src/data/webshop-downloads.ts
    .private/webshop/src/admin/settings/actions.ts
    .private/webshop/src/admin/products/actions.ts
    .private/webshop/src/admin/products/product-manager.tsx

Master:

    .private/license-server/src/lib/bootstrap.ts
    .private/license-server/src/lib/api-auth.ts
    .private/license-server/src/lib/activation-domain.ts
    .private/license-server/src/data/addon-activation.ts
    .private/license-server/src/data/vendor-entitlements.ts
    .private/license-server/app/admin/actions.ts
    .private/license-server/src/db/schema.ts
