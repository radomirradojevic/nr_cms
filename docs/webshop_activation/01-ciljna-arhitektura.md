# 01 — Ciljna arhitektura i granice

## Projekti i odgovornosti

### D:\nr_cms

Razvojni source i jedino mesto gde se menjaju:

- javni CMS host;
- addon SDK/loader;
- activation shell;
- host DB schema i migraciona infrastruktura;
- privatni Webshop source u .private\webshop;
- master source u .private\license-server;
- customer-owned License Server addon u .private\license-server-addon.

Ovaj direktorijum nije vendor niti client runtime deployment.

### D:\nr_cms-vendor

Vendor target checkout/config root odobrenog CMS commita:

- zaseban .env;
- baza nr_cms_vendor_test;
- origin https://vendor.nr.test;
- početni core CMS može se bootstrap-ovati odavde pre prvog worker switch-a;
- prodaje Webshop licence preko master License Servera.

Ne sadrži .private i ne učitava D:\nr_cms\.private\webshop. Njegov `.env` ostaje canonical target konfiguracija, ali posle prve uspešne aktivacije servis mora pokretati immutable worker release iz `D:\nr_deploy\vendor\current`; privatni package tada fizički postoji samo u `current\node_modules\@radomirradojevic\webshop` i pripadajućem verzionisanom release direktorijumu.

### D:\nr_cms-client

Drugi target checkout/config root istog CMS commita:

- zaseban .env;
- baza nr_cms_client_test;
- origin https://client.nr.test;
- pre aktivacije ima prazan addon registry;
- početni core CMS može se bootstrap-ovati odavde pre prvog worker switch-a.

Ne sadrži .private. Posle prve uspešne aktivacije servis se preusmerava na `D:\nr_deploy\client\current`, gde worker instalira isti private package iz GitHub Packages. Checkout/config root i aktivni immutable runtime zato nisu ista putanja.

### D:\nr_deploy\vendor i D:\nr_deploy\client

Worker-owned runtime prostor koji treba provisionovati pre E2E testa:

- `releases\<DEPLOYMENT_JOB_ID>` je immutable release sa core CMS-om, exact `node_modules` paketima i buildom;
- `current` je atomski service pointer/junction ili ekvivalentna target-service konfiguracija;
- worker nikada ne kopira `.private` u release;
- `.env` se ne kopira u release već se čita iz odgovarajućeg checkout/config root-a;
- pre prvog addon deploymenta proces može raditi iz clean checkout-a samo kao activation shell; nakon prvog uspešnog switch-a jedini aktivni runtime autoritet je `current`.

### D:\nr_license-server

Čist deployment odobrenog commita iz:

    D:\nr_cms\.private\license-server

Koristi:

- bazu nr_license_server_test;
- origin https://license.nr.test;
- master product catalog;
- vendor commerce API;
- activation i revalidation API;
- entitlement signing key.

Ne kopiraju se CMS izmene u ovaj direktorijum. U njega se promovišu samo izmene iz master License Server repozitorijuma.

### D:\nr_cms\.private\license-server-addon

Ovo nije master servis na portu 3001. To je privatni addon koji bi nekom kupcu omogućio da pokrene sopstveni issuer. Prvi Webshop E2E ga ne instalira i deployment worker ga mora odbiti dok taj package nema zaseban release pipeline.

## Kako se izmene promovišu

Ne kopira se svaka izmena naslepo u sva tri deploymenta.

Tok je:

1. CMS i host izmene se rade u D:\nr_cms.
2. Webshop izmene se rade u D:\nr_cms\.private\webshop.
3. Master izmene se rade u D:\nr_cms\.private\license-server.
4. Svaki repo dobija sopstveni test, commit i identitet.
5. Vendor i client se kreiraju/deployuju iz istog odobrenog CMS commit SHA.
6. Webshop se objavljuje kao immutable GitHub Packages verzija.
7. Master deployment se kreira iz svog odobrenog commit SHA.
8. Deployment evidence beleži sva tri SHA-a i package verziju/hash.

Vendor/client ne treba da vide privatni source. Oni vide samo npm artefakt.

## Logički tok

    client CMS
      |
      | 1. dokazuje installation identity; produkcija i HTTPS kontrolu domena
      |    pa traži master-signed purchase intent za client.nr.test
      v
    master License Server
      |
      | 2. vraća kratkotrajan potpisan intent
      v
    vendor Webshop
      |
      | 3. prihvata POST intent bez URL curenja
      | 4. unique JTI/FK + master accepted/reserved/consumed vezuju intent za jedan order item
      | 5. potvrđuje payment captured
      | 6. enqueue license issue operation sa JTI/snapshot hashom
      v
    master License Server
      |
      | 7. proverava consumed intent i izdaje entitlement/key vezan za client.nr.test i SKU
      v
    vendor Webshop
      |
      | 8. šifruje key namenskim issued-license KEK-om i šalje secure delivery link
      v
    client admin
      |
      | 9. unosi key u client CMS
      v
    master License Server
      |
      | 10. challenge/complete activation + signed entitlement/release target
      v
    deployment worker
      |
      | 11. private package install, verify, migrate, build, switch, health
      v
    client CMS Webshop ready

## Šta se dešava ispod haube kada admin unese key

Ispravan ciljni tok nije direktan npm install iz forme.

1. Server Action proverava Clerk sesiju i admin rolu.
2. Učitava canonical site domain i deployment identitet.
3. Kreira installation identity ako ne postoji.
4. Šalje challenge zahtev masteru sa signed host-capability descriptorom.
5. Potpisuje challenge lokalnim privatnim installation key-em.
6. Master proverava:
   - hash licence;
   - addonKey;
   - status i rok licence;
   - domain binding;
   - activation limit;
   - installation proof-of-possession.
   - production HTTPS domain-control proof ili eksplicitni `.nr.test` development izuzetak;
   - CMS/Node/Next/runtime/core/addon-schema kompatibilnost sa published release-om.
7. Master vraća:
   - potpisani entitlement;
   - activation ID;
   - exact package name;
   - exact package version;
   - artifact SHA-256;
   - release signing KID;
   - runtime/schema/CMS compatibility podatke.
8. CMS lokalno proverava entitlement potpis.
9. U jednoj transakciji upisuje entitlement, cms_addon_installations desired state i durable deployment operation.
10. HTTP zahtev se završava stanjem install_pending.
11. Odvojeni worker preuzima job.
12. Worker pravi novi izolovani release direktorijum.
13. Worker instalira exact package iz GitHub Packages pomoću svog secret-a.
14. Ponovo meri host-capability descriptor i verifikuje isti hash, package manifest, provenance, potpis, svaki artifact hash i compatibility.
15. Generiše build-time addon registry.
16. Gradi i verifikuje CMS pre bilo kakve DB mutacije.
17. Radi migration dry-run/backup precondition, zatim primenjuje potpisane migracije.
18. Prebacuje servis i radi health check.
19. Post-deploy reconciliation potvrđuje da desired i installed vrednosti odgovaraju.
20. Tek tada status postaje ready.

Ako korak pre DB migracije padne, stari release i baza ostaju nepromenjeni. Posle forward migracije automatski code rollback je dozvoljen samo kada prethodni release deklarisano podržava novu expand schema-u; inače sistem ostaje u restricted maintenance modu ili dobija forward fix prema dokumentu 10. U svim slučajevima job je failed/retry ili manual-review, a željeni addon ne dobija lažni `ready` status.

DB ownership je fizički razdvojen. Core CMS/control-plane tabele ostaju u `public` pod per-target core owner/migrator/runtime ugovorom; Webshop business model je isključivo u dedicated `webshop` schema-i čiji je owner addon deployer, a CMS runtime ima samo manifestom dozvoljen DML. Package, ne root `db/schema.ts`, poseduje canonical Webshop schema/migracije. Postojeći 45-table `public` model zahteva jednokratni backupovan operator cutover i exact structural/ACL postcondition pre `legacy_applied`; stari nekompatibilni 13-table package baseline nikada se ne izvršava. Addon-free core bootstrap zato nema Webshop business tabele ni private source, ali sadrži typed host route/job wrappere koji ostaju 404/disabled dok verified package nije serving.

## Zašto package nije u addons direktorijumu

Node package manager je vlasnik instaliranog package sadržaja. Kanonska putanja je:

    <release-root>\node_modules\@radomirradojevic\webshop

Root addons direktorijum bi napravio drugi, nestandardni package manager i otvorio pitanja:

- ko rešava transitive dependencies;
- ko proverava integrity;
- kako lockfile ostaje reproducibilan;
- kako Next vidi module;
- kako se rade update i rollback;
- kako se sprečava path traversal ili proizvoljan module import.

addons.registry.json nije kopija koda. To je pinovana build konfiguracija koja kaže koji već instalirani i verifikovani package sme da uđe u Next build.

## Deployment worker kao posebna trust zona

Worker jedini poseduje GitHub Packages read credential. CMS, browser, master entitlement response i vendor baza ga ne poseduju.

Worker ima i sopstvenu PostgreSQL bazu `nr_addon_deployment_worker_test` za durable request replay, jobs/leases, highest accepted epoch po exact `(targetProfile, addonKey, installationId)` ključu i result outbox. Epoch nije globalan samo po targetu: novi legitimni installation identitet može ponovo početi od epoch-a 1, dok stari identitet ostaje odvojeno ograđen CMS activation/fence stanjem. Ne koristi vendor/client/master bazu kao svoj queue i nema SQLite/in-memory fallback u prvom contractu. Ovu četvrtu bazu operator još mora ručno kreirati pre worker migracija/E2E-a; tri već pripremljene baze je ne uključuju.

Za lokalni E2E worker je četvrti proces:

    https://deploy.nr.test -> Caddy -> http://127.0.0.1:3003

CMS outbound policy mora imati `deploy.nr.test` na exact allowlist-i i eksplicitno dozvoljen self-hosted HTTPS target; ne koristi se nešifrovani callback.

Worker mora imati statičku konfiguraciju:

| Target | Dozvoljeni source | Release root | Javni health origin | Package allowlist |
|---|---|---|---|---|
| vendor | odobren CMS commit | D:\nr_deploy\vendor\releases | https://vendor.nr.test | samo @radomirradojevic/webshop |
| client | odobren CMS commit | D:\nr_deploy\client\releases | https://client.nr.test | samo @radomirradojevic/webshop |

Request ne sme da bira filesystem putanju, komandu, repo URL ili package name.

Poseban webhook URL po targetu je sigurniji za prvi self-hosted test:

    POST https://deploy.nr.test/v1/hooks/vendor/webshop
    POST https://deploy.nr.test/v1/hooks/client/webshop

Target se određuje rutom i konfiguracijom workera, ne vrednošću iz body-ja.

## Odvojene state mašine

Entitlement state:

    active
    suspended
    expired
    revoked
    canceled

Desired deployment-operation state:

    license_accepted
      -> install_pending
      -> installed
      -> migration_pending
      -> ready

    ready -> update_pending -> installed -> migration_pending -> ready
    aktivna faza -> failed
    ready -> disabled

Ovo su durable CMS operation faze i svaka ima tačno jednog autoritativnog writer-a. Activation transakcija upisuje `license_accepted -> install_pending`. Posle verifikovanog offline installa/builda worker uzima exact installation advisory fence i na istoj dedicated target-DB konekciji CAS-om upisuje fazu `installed`; ova faza znači samo „release je staged i verifikovan” i ne popunjava `installed*` serving-evidence kolone. Na istoj konekciji neposredno pre migration runnera upisuje `migration_pending`. Posle migracija, a pre prvog service-stop, service-config ili pointer write-a, controller durable commit-uje `active` red u `cms_addon_serving_fences`; od tog commita public gate zahteva nula active fence redova, čak i za same-release redeploy i crash pre stvarne service/pointer mutacije. `reconcileAddonCandidateOnConnectionV1` upisuje samo non-serving candidate evidence. Tek `finalizeAddonReadyReceiptOnConnectionV1` posle internal candidate-readiness provere u jednoj fenced transakciji promoviše candidate u `installed*`, postavlja `runtime_status=ready`/`status=ready`, upisuje immutable success receipt i CAS-om razrešava serving fence. Recovery/no-mutation writer na isti način atomski upisuje svoj terminalni receipt i odgovarajući fence resolution. Public gate dodatno zahteva da učitani release/build odgovara promoted tuple-u i terminalnom receipt-u aktuelnog pokušaja. Terminalni result callback samo durable vezuje/potvrđuje rezultat i zatvara transport/operation metadata; nikada drugi put ne upisuje `installed*`, current pointer ili serving runtime stanje.

Serving runtime state je odvojena osa:

    not_installed | ready | maintenance | unavailable

Zato neuspeo desired update posle uspešnog rollback-a ima `operation=failed` i `runtime=ready` sa prethodnim installed release-om. Forward-only schema failure ima `runtime=maintenance`; neuspeo rollback `runtime=unavailable`. Storefront ne izvodi dostupnost samo iz poslednjeg operation statusa.

Exact payment financial enum je:

    pending | authorized | partially_captured | paid |
    partially_refunded | refunded | disputed | chargeback |
    failed | canceled

Dozvoljene glavne tranzicije su `pending -> authorized|partially_captured|paid|failed|canceled`, `authorized -> partially_captured|paid|failed|canceled`, `partially_captured -> partially_captured|paid|partially_refunded|refunded`, `paid -> partially_refunded|refunded|disputed|chargeback`, `partially_refunded -> refunded|disputed|chargeback` i `disputed -> <pre_dispute_financial_status>|chargeback`. „Dispute won” je događaj koji vraća durable sačuvan pre-dispute status; `won/lost/open/captured` nisu dodatne payment enum vrednosti. `failed/canceled` su terminalni za tu payment attempt referencu. U prvom V1 license-checkout contractu jedan JTI/order ima tačno jednu payment authorization/session: novi pokušaj zahteva novi master purchase intent i novu porudžbinu, čiji je payment attempt novi normalizovani red; nikada se ne prepisuje provider istorija starog ordera.

`captured_total_minor` i `refunded_total_minor` su kumulativne finansijske činjenice iz verifikovanih provider događaja. Jedini financial status koji može otključati fulfillment je `paid`, kada je `captured_total_minor >= order_total_minor` u istoj valuti.

Odvojeni exact risk enum je:

    none | security_review | paid_security_review | cleared | refund_required

DB CHECK, Drizzle enum i TypeScript union moraju koristiti baš taj skup. Novi order počinje kao `none`. Vendor-local provider/fraud/dispute signal pre pune naplate daje `security_review`; puni capture uz takav aktivan lokalni signal daje `paid_security_review`; svaki novi lokalni signal iz `cleared` vraća odgovarajući review status i povećava `riskLifecycleVersion`. Samo dual-control admin odluka sa reason/audit zapisom menja `security_review|paid_security_review -> cleared|refund_required`; `refund_required` ne vraća fulfillment i ostaje audit odluka i kada finansijska osa postane `refunded|chargeback`. Current master purchase-intent hold se mirroruje zasebno kao `masterSecurityHoldActive/version/disposition/reason/changedAt`, gde je disposition `reversible_hold|hard_disable|null`; može dati izvedeni UI prikaz review-a, ali ne menja vendor `riskStatus`, `riskLifecycleVersion` ili four-field issuance fence. Top-level intent marker se odvojeno i trajno mirroruje kao `masterHardDisableOccurred/blockId/at/reasonCode/postIssueCompensation`; postoji i kada authorization nije kreirana ili je već `paid`, i current block clear ga ne briše.

Autoritativno polje finansijske ose svuda se zove `paymentStatus`. Pre-issue enqueue/send gate je `paymentStatus=paid AND riskStatus IN (none,cleared) AND masterSecurityHoldActive=false AND masterHardDisableOccurred=false`, uz four-field issuance fence i svež master status. Posle durable master commita notification/token/reveal ne zahteva da finansijski status zauvek ostane `paid`: zahteva committed entitlement, exact `postIssueReconciliationStatus=resolved_active`, vendor risk `none|cleared`, fresh current hold false/top-level hard-disable false i current-generation HMAC `/api/v1/entitlements/validate` dokaz `valid=true,status=active`, istog domain/entitlementa i neisteklog business roka. Local risk review, reversible master hold, dispute open ili partial refund posle commita daju `review_pending` i no-delivery; audited clear, won+reinstate ili retain-active mogu vratiti isti fresh-validated entitlement bez drugog issue-a. Samo `refund_required`, hard disable, full refund/reversal, lost dispute ili revoke daju `compensation_pending -> resolved_revoked` i jednu causal compensation. Nijedna risk/hold osa ne menja autoritativnu payment činjenicu.

Fulfillment state:

    pending
      -> processing
      -> fulfilled
      -> failed/dead_letter

`committed_review_pending`, `suspended` i `revoked` nisu dodatne persisted fulfillment enum vrednosti. To su izvedene UI/operativne projekcije dobijene iz durable issue rezultata, zasebnog `postIssueReconciliationStatus` i master license lifecycle-a. Na taj način retry/DLQ transport stanje ostaje nedvosmisleno, a delivery/revoke odluka ne može da se izgubi u opštem fulfillment statusu.

Post-issue reconciliation je zasebna closed osa:

    null pre committed entitlement-a
      -> review_pending
      -> resolved_active
      -> compensation_pending
      -> resolved_revoked

Committed response uvek prvo durable postavlja `review_pending`; fresh validation/CAS tek postavlja `resolved_active`. Time crash između čuvanja encrypted key-a i online validacije ostaje fail-closed.

Ove state mašine se ne smeju svesti na jedan boolean enabled.

License environment je zaseban identitet, ne izvedena oznaka. Oba CMS profila moraju imati exact `NR_LICENSE_ENVIRONMENT=development|staging|production`; master koristi `NRLS_ENVIRONMENT`, a worker `NR_ADDON_DEPLOYMENT_WORKER_ENVIRONMENT` plus per-target `licenseEnvironment`. Activation/revalidation, purchase/catalog/issue/validate/lifecycle, entitlement/operation/outbox i deployment request/result nose/persistiraju istu vrednost. Svaki mismatch pada pre business ili deployment mutacije; `NODE_ENV`, vendor/client profil, URL i naziv baze nisu zamena.

## Canonical domain ugovor

Jedna shared specifikacija i contract fixture set moraju važiti u CMS-u, Webshopu i masteru.

Pravila:

1. Prihvati HTTP(S) origin ili hostname input.
2. Odbij userinfo, putanju različitu od /, query i fragment kada se očekuje origin.
3. Uzmi URL.hostname.
4. Pretvori u lowercase.
5. Ukloni završnu tačku.
6. Normalizuj IDN prema WHATWG URL pravilima.
7. Ne čuvaj scheme ili port u licencnom domenu.
8. Odbij prazan i unknown domen.
9. Wildcard i transfer domena nisu implicitni.
10. Produkcija odbija IP literal, `localhost` i `.nr.test`; development prihvata samo eksplicitno allowlisted `.nr.test` hostname-e. IP literal-i nisu dozvoljeni ni u prvom lokalnom E2E-u.
11. Produkcijski domain-bound purchase/activation/transfer zahteva HTTPS well-known dokaz kontrole hostname-a; installation PoP sam nije dovoljan. Lokalni `.nr.test` zapis nosi explicit development exemption status.

Za ovaj test:

    vendor public origin: https://vendor.nr.test
    vendor license domain: vendor.nr.test
    client public origin: https://client.nr.test
    client license domain: client.nr.test

Caddy upstream port nema ulogu u entitlementu.

## Invarijante

- Jedan license key nikada se ne loguje u čistom tekstu.
- Jedan npm token nikada se ne čuva u CMS .env fajlu.
- Jedan payment webhook može biti obrađen više puta bez duple licence.
- Jedan order item proizvodi najviše jedan centralni entitlement.
- Jedan purchase-intent JTI pripada najviše jednoj cart liniji, jednom order itemu i jednoj licenci.
- Isti idempotency key sa drugačijim request hash-em je conflict.
- Product i SKU se snapshotuju u trenutku checkouta.
- Domain se snapshotuje pre kreiranja porudžbine i ne čita iz query stringa; purchase-intent JWS se prenosi samo POST telom.
- Payment se ne pokreće dok master ne potvrdi terminalni consumed binding za isti intent/order/item/snapshot hash.
- Ready zahteva validan entitlement i odgovarajući instalirani release.
- Istek licence ne deinstalira niti briše podatke.
- Rollback package-a ne pokreće automatske down migracije.
- Client i vendor storage, baza, installation identity i release root nikada se ne dele.
