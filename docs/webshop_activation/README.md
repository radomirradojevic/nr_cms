# Webshop licenca, kupovina i aktivacija — implementaciona dokumentacija

Status dokumenta: autoritativna tehnička specifikacija za implementaciju i lokalni E2E test.

Datum audita koda: 2026-08-01.

Ovaj direktorijum opisuje kako treba dovršiti i testirati ceo tok:

1. objavljivanje privatnog Webshop paketa;
2. ručna lifetime licenca za vendor CMS;
3. aktivacija i instalacija Webshop addona na vendor CMS-u;
4. prodaja četiri licencna SKU-a;
5. vezivanje kupljene licence za domen klijentskog CMS-a;
6. generisanje licence nakon potvrđene uplate;
7. bezbedna isporuka licence kupcu;
8. aktivacija i instalacija istog privatnog paketa na client CMS-u.

Dokumentacija je zasnovana na stvarnom stanju sledećih source stabala:

    D:\nr_cms
    D:\nr_cms\.private\webshop
    D:\nr_cms\.private\license-server
    D:\nr_cms\.private\license-server-addon

Predviđeni operator-managed checkout/config koreni van ovog source stabla su:

    D:\nr_cms-vendor
    D:\nr_cms-client
    D:\nr_license-server

`D:\nr_cms-vendor` i `D:\nr_cms-client` čuvaju target-specific `.env`, početni clean checkout i bootstrap konfiguraciju; nisu konačno mesto addon koda. Posle prvog uspešnog managed deploymenta aktivni immutable runtime-i su `D:\nr_deploy\vendor\current` i `D:\nr_deploy\client\current`, a verzionisani release-i su pod odgovarajućim `releases` direktorijumom. Dokumentacija ne menja niti pretpostavlja stanje direktorijuma van `D:\nr_cms`: operator proverava postojeće deployment-e i provisionuje samo ono što nedostaje.

Javni origin-i su:

    https://vendor.nr.test
    https://license.nr.test
    https://client.nr.test

Deployment worker je novi četvrti proces koji implementacija mora dodati:

    https://deploy.nr.test

AS-BUILT Caddy prosleđuje tri postojeće aplikacije:

    vendor.nr.test  -> 127.0.0.1:3000
    license.nr.test -> 127.0.0.1:3001
    client.nr.test  -> 127.0.0.1:3002

TARGET pre worker E2E-a dodaje se četvrti site:

    deploy.nr.test  -> 127.0.0.1:3003

Baze su:

    nr_cms_vendor_test
    nr_cms_client_test
    nr_license_server_test
    nr_addon_deployment_worker_test   # TARGET: operator je još ručno kreira pre worker E2E-a

## Kako čitati dokumentaciju

Svaki dokument razlikuje četiri vrste informacija:

- AS-BUILT — već postoji u trenutnom kodu;
- GAP — nedostaje ili trenutno ne radi kroz ceo tok;
- TARGET — obavezno ciljno rešenje;
- MANUAL — korak koji operator radi ručno.

Dokumentacija nije tvrdnja da je implementacija završena. Posebno, trenutni kod još nema deployment worker koji instalira paket nakon aktivacije, kompletan purchase-intent tok, potpuno operativan HMAC V2 admin setup, niti završenu isporuku spolja izgenerisanog ključa kupcu.

Za tok opisan u ovom direktorijumu, ova specifikacija ima prednost nad starijim statusnim/PASS tvrdnjama u `docs/addons`. Simulator ili fixture PASS nije dokaz stvarnog CMS → master → worker → vendor payment E2E-a; kompletan rezultat se priznaje samo po runbook-u 09 i gate-ovima iz roadmape 11.

## Redosled dokumenata

1. [00 — Audit postojećeg stanja](00-as-built-audit.md)
2. [01 — Ciljna arhitektura i granice](01-ciljna-arhitektura.md)
3. [02 — Radni direktorijumi, HTTPS, baze i env](02-instance-env-i-lokalna-infrastruktura.md)
4. [03 — GitHub Packages i Webshop release](03-github-packages-i-release.md)
5. [04 — Master License Server bootstrap, katalog i API klijent](04-master-license-server.md)
6. [05 — Aktivacija i deployment worker](05-aktivacija-i-deployment-worker.md)
7. [06 — Vendor Webshop i licencni proizvod](06-vendor-webshop-i-proizvod.md)
8. [07 — Buy link, purchase intent i domen](07-purchase-intent-i-domain-binding.md)
9. [08 — Checkout, uplata, fulfillment i email](08-payment-fulfillment-i-isporuka.md)
10. [09 — Kompletan lokalni E2E runbook](09-lokalni-e2e-runbook.md)
11. [10 — Bezbednost, observability i rollback](10-security-operations-i-rollback.md)
12. [11 — Implementacioni redosled i Definition of Done](11-implementation-roadmap.md)
13. [12 — Redosled copy/paste promptova za implementaciju](12-implementation-prompts.md)

## Zaključane odluke

- Hosted private registry je GitHub Packages.
- Webshop package identitet je @radomirradojevic/webshop.
- Privatni source ostaje u D:\nr_cms\.private\webshop samo za razvoj.
- Instalirani runtime paket se nalazi u node_modules\@radomirradojevic\webshop.
- Ne pravi se runtime kopija u root addons direktorijumu.
- Webshop business tabele pripadaju dedicated `webshop` PostgreSQL schema-i i package je njihov source of truth; CMS `public` zadržava samo core/control-plane objekte. Postojeći legacy `public` model prolazi isključivo kroz backupovan operator cutover.
- Next App Router ulazi postoje kao typed core CMS wrapperi u pinovanom base commitu; package `app/**` pod `node_modules` nije routable mehanizam. Wrapper poziva instalirani package kroz addon delegate contract.
- Vendor i client deployment ne smeju sadržati .private.
- Vendor i client koriste isti odobreni CMS commit, ali zasebne env fajlove, baze, storage, build cache i release direktorijume.
- Master License Server je odvojena aplikacija i odvojena baza; deployment worker je četvrti servis sa sopstvenom `nr_addon_deployment_worker_test` bazom, ne koristi CMS/master bazu kao queue.
- D:\nr_cms\.private\license-server-addon nije master servis. To je budući customer-owned issuer addon i nije deo prvog Webshop activation E2E testa.
- Licenca i npm paket su dve različite kontrole. Licenca daje pravo korišćenja; deployment worker instalira kriptografski verifikovan artefakt.
- Npm instalacija, build, migracije i restart se nikada ne izvršavaju u Server Action-u ili HTTP request handleru.
- Deployment worker je zaseban privatni servis iza `deploy.nr.test`; target određuje ruta/statička konfiguracija, ne request-provided putanja ili komanda.
- Managed lokalni deployment koristi hash-pinovane WinSW/SCM `NRVendorCms` i `NRClientCms` servise i deterministic addon-free core bootstrap; `npm run dev` je samo odvojeni UI/HMR smoke.
- Domen licence je canonical hostname bez scheme-a, porta, putanje ili trailing tačke.
- Produkcija dokazuje kontrolu domena exact HTTPS well-known challenge-om; lokalni `.nr.test` tok beleži samo explicit development izuzetak.
- Purchase intent ima jedan exact master-signed JWS contract, prenosi se POST telom bez URL query-ja i unique FK-ovima se vezuje za tačno jednu cart liniju, porudžbinu, order item i licencu.
- Master catalog koristi durable revision/content hash; vreme GET/sync zahteva nije `catalogVersion`.
- Activation/revalidation potpisuju host-capability descriptor, a worker ponovo meri isti CMS/runtime/schema identitet pre migracije/switch-a.
- Master wrapped-DEK secret store, vendor master-credential, CMS installation private key i vendor issued-license key koriste četiri zasebna at-rest KID/keyring/rewrap contracta; per-CMS transfer-approval derivation secret je peta, odvojena HMAC namena sa sopstvenom rotacijom.
- Za ovaj test vrednosti su vendor.nr.test i client.nr.test, a ne localhost.
- Licenca se izdaje tek nakon autoritativne potvrde captured/paid stanja.
- Sirov licencni ključ se podrazumevano ne šalje emailom. Email šalje bezbedan delivery link; ključ se prikazuje tek posle provere vlasništva nad porudžbinom.

## Minimalni cilj prvog E2E prolaza

Prvi uspešan prolaz mora dokazati:

    manual vendor lifetime key
      -> vendor activation
      -> private package deployment
      -> vendor webshop ready
      -> client purchase intent
      -> vendor checkout
      -> captured payment
      -> master entitlement for client.nr.test
      -> secure license delivery
      -> client activation
      -> private package deployment
      -> client webshop ready

Nijedan ručni SQL upis ne računa se kao završeni proizvodni tok. SQL se može koristiti samo za dijagnostiku ili eksplicitno označen privremeni bootstrap dok odgovarajući admin UI/CLI još nije implementiran.
