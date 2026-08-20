# Prompt 03 — release entrypoint, admin parity i vendorska ponuda

Datum provere: **2026-08-16**. Ovaj dokument beleži as-built rezultat Prompt-a
03. Ne predstavlja `npm publish`, produkcioni Master publish, live kupovinu niti
production redeploy odobrenje.

## 1. Jedan proizvodni entrypoint

Development i release više nemaju dve UI implementacije:

- `src/addon.tsx` je jedini funkcionalni izvor add-on objekta;
- `src/release-addon.tsx` je samo compatibility re-export tog izvora;
- `dist/server.js` je mali server-only facade koji lenjo učitava
  `dist/runtime/addon.js`;
- `release-parity.json` je potpisani package artifact i zaključava očekivane
  dashboard/API/capability/job površine;
- build pravi samodovoljan runtime graph, uključujući potrebne javne SDK i host
  compatibility module, bez `@/` ili `.private` runtime importa.

| Površina | Development source | Spakovani release |
| --- | --- | --- |
| Dashboard | overview, API clients, products, profiles, licenses, activations, operations, validation events, API docs | isti skup kroz `dist/server.js` → `dist/runtime/addon.js` |
| Admin putanje | root, `api-clients`, `product-types`, `profiles`, `licenses`, `activations`, `operations`, `events`, `docs` | svih devet HTTP-renderovano iz čistog tarball-a |
| Mutacije | create/rotate/revoke klijenta, create product/profile, update profile, issue/status licence, revoke/reset activation | isti server actions iz jednog runtime grafa |
| HTTP API | health, issue, validate, activate, deactivate | isti V1 handler iz package export-a |
| Local capability | `customerLicenseIssuer.v1` | dostupan i izvršiv |
| V2 capability | još nije implementiran u privatnom domenskom engine-u | tačno i bez V1 fallback-a: `v2_not_exported` |
| Job | `customerLicenseIssuerOutbox` | dostupan iz package export-a |

Profiles i Operations nisu metrics placeholder-i: dashboard prikazuje postojeću
V1 profile/policy projekciju i durable issuer operation/outbox stanje. Novi V2
profile/schema business tok nije lažno implementiran u ovom promptu; pripada
kasnijim domenskim promptovima.

## 2. Auth, permission i license gate

Root dashboard delegat prvo zahteva autentifikovanog CMS administratora i
prosleđuje samo tačnu `ready` ili `edit_existing_only` add-on licencu. Package
renderer ponavlja boundary proveru za svaki dashboard path. Svaka server mutacija
ponovo izvršava `requireReadyLicenseServerAdmin`, pa URL ili direktan action poziv
ne mogu preskočiti auth/admin/`ready` proveru.

U `edit_existing_only` režimu čitanje ostaje dostupno, dok su create/rotate,
issue, lifecycle i ostale privilegovane mutacije uklonjene ili disabled. HTTP
putanja zadržava host auth/license gate i sopstveni HMAC/API-client auth.

## 3. Zasebna vendorska ponuda i Master fulfillment

License Server je odvojen od Webshop ponude na svim granicama:

| Polje | Webshop add-on | License Server add-on |
| --- | --- | --- |
| `addonKey` | `webshop` | `license-server` |
| offer/product ref/slug | `nr-cms-webshop-license` | `nr-cms-license-server-license` |
| SKU | `webshop-30/183/365/1000000` | `license-server-30/183/365/1000000` |
| cena | sopstvena vendorska variant cena | sopstvena, obavezna pozitivna vendorska variant cena |
| izdavalac add-on ključa | centralni Master | centralni Master |

Canonical tok je:

1. ciljni CMS generiše kratkoživeći Master-signed purchase intent za tačno
   `addonKey: "license-server"` i tačnu ponudu;
2. vendorski Night Raven CMS Webshop prihvata samo lokalno allowlist-ovanu
   License Server ponudu i njen zaseban proizvod/SKU/cenu;
3. paid fulfillment šalje Master-u zamrznut commerce dokaz sa istim
   `addonKey`, offer/product ref-om i SKU-om;
4. Master odbija cross-add-on zamenu, a za tačan dokaz izdaje `NRLS-...` ključ
   čiji `licensePayload.addonKey` ostaje `license-server`;
5. kupac unosi ključ u **Dashboard → License Server** i nastavlja Prompt 02
   `install_pending` → verifikovani managed install/redeploy → `ready` tok.

Customer issuer engine se ne koristi za prodaju Night Raven add-on licence.
Customer Webshop paket nije potreban na ciljnoj instalaciji; Webshop postoji na
vendorskom CMS-u kao prodajni kanal.

## 4. Package i isolated-host dokaz

Finalni lokalno potpisani release artifact SHA-256 je
`dc9e23c3f5242a7548ac74b6c64cdb7bec9f4c6e512bf11a33981b9afecaf7bf`.
Finalni `npm pack` tarball SHA-256 je
`77d47fd81258cc5cc5e6590b66e3e0553669eb962f4bf9ac9cc29fe6d62f9ba7`.
Isti signed state je dva puta spakovan u `pack:verify` i dao je isti digest.
Nova, zasebna ephemeral-local-authority sesija namerno daje novi signing `kid` i
potpis, pa njen ceo tarball digest nije isti; nepotpisani runtime artifact digest
ostaje gore navedeni `dc9e...`.

`pack:verify` prihvata samo očekivani manifest/digest/SBOM/provenance,
migracije, parity opis, deklaracije i `dist` runtime inventar. Odbija `.env`,
ključeve/secret obrasce, `src`, runtime snapshot, neočekivane TS/TSX fajlove i
source map-e. Svaki potpisani artifact mora stvarno postojati u tarball-u.

DB isolated Next 16.3 host je uradio frozen tarball install, build, start i HTTP
render sledećih putanja:

- `/dashboard/license-server`;
- `/dashboard/license-server/api-clients`;
- `/dashboard/license-server/product-types`;
- `/dashboard/license-server/profiles`;
- `/dashboard/license-server/licenses`;
- `/dashboard/license-server/activations`;
- `/dashboard/license-server/operations`;
- `/dashboard/license-server/events`;
- `/dashboard/license-server/docs`;
- `/api/license-server/v1/health`;
- `/verification` za V1, tačno V2-unavailable stanje i job.

Package UI se namerno ne renderuje sirovim Node `react-server` rendererom, jer
admin stablo legitimno koristi Next Client Component zavisnosti. Pravi Next host
je autoritativni RSC/UI dokaz; zasebni raw import test proverava server facade,
API, V1 capability i job.

## 5. Reproducibilne komande i konačni rezultati

| Repo | Komanda | Konačni rezultat |
| --- | --- | --- |
| add-on | `npm run typecheck` | PASS, release i host tsconfig |
| add-on | `npm run test:db:local` | PASS, 42/42, 0 skip |
| add-on | `npm run install:verify` | PASS; facade/API/V1/job i client-import boundary; DB namerno nije tražen |
| add-on | `npm run install:verify:next:db` | PASS; frozen install, Next 16.3 build/start i svih 11 putanja iz prethodnog odeljka |
| add-on | `npm run pack:verify` | PASS; tarball digest iznad |
| Webshop | `npm run test:local` | PASS, 176/176, 0 skip |
| Master | `npm run typecheck` | PASS |
| Master | `npm run test:db` | PASS, 81/81, uključujući paid License Server → pinned `NRLS-...` ključ |
| root | `npx tsx --test tests/license-server-addon-purchase-offer.test.ts` | PASS, 2/2 |
| root | `npm test` | PASS, 376 ukupno: 366 pass, 10 eksplicitnih DB/staging skip-ova |
| root | `npx tsx --test tests/license-server-addon-release.test.ts` | PASS, 3/3 |
| root | `$env:WEBSHOP_INSTALL_MODE='disabled'; $env:LICENSE_SERVER_INSTALL_MODE='disabled'; $env:NODE_USE_SYSTEM_CA='1'; npm run build` | PASS; oba package artifact-a verifikovana/registrovana, Next 16.3 compile/typecheck/static generation |

Build komanda koristi proces-lokalni validan development režim i ne menja
`.env`. Managed-install ponašanje nije time proglašeno disabled u proizvodu: ono
je nezavisno pokriveno DB activation/worker testovima iz Prompt-a 02 i packed
`ready` host testom iz ovog prompta.

### Neuspeh i skip koji nisu prećutani

- Prvi offline `npm ci` čistog hosta nije imao `pg-protocol` u lokalnom npm
  cache-u (`ENOTCACHED`). Nakon dozvoljenog dependency install-a isti frozen
  clean-host test je prošao; ovo nije package-code failure.
- Prvi `pack:verify` je pogrešno odbio planirani `dist/server.d.ts`. Allowlist je
  sužen tako da prihvata samo tu deklaraciju; ponovljeni audit je prošao.
- Prvi Webshop puni suite imao je 175/176 zbog bare
  `@nr-cms/addon-sdk` importa u packed runtime-u. Oba release builder-a sada
  ugrađuju tačne javne SDK module; ponovljeni Webshop suite je 176/176.
- Prvi DB Next host pokušaj je pokazao da raw Node render nije validna zamena za
  Next RSC host, a sledeći je imao krhku tekstualnu capability proveru. Test sada
  proverava semantičke `data-v1`, `data-v2` i `data-job` vrednosti u pravom Next
  hostu i prolazi.
- Prvi root build je otkrio da lokalni package copier izostavlja novi potpisani
  `release-parity.json`. Copier sada kopira taj opcioni artifact i regression
  test prolazi 3/3.
- Sledeći root build pokušaji su se ispravno zaustavili na nedostajućim
  deployment-worker env vrednostima, CA gate-u i nedozvoljenoj kombinaciji
  `development` + `managed_redeploy`. Nijedna vrednost nije upisana u `.env`;
  finalni validni fail-closed development build je prošao.
- Root `npm test` preskače 10 DB/staging scenarija. Relevantni add-on DB,
  Master paid-order DB i Prompt 02 managed-install DB paketi pokrenuti su
  zasebno; live production purchase/publish/redeploy nije izvršen.

## 6. Prompt 03 acceptance mapa

| ID | Status | Dokaz / preostali release gate |
| --- | --- | --- |
| PKG-01 | **zelen za lokalni release artifact** | Potpisani manifest, provenance, SBOM, potpuni artifact digest i tarball allowlist/secret audit. Production authority/publish ostaje operator gate. |
| PKG-02 | **zelen** | Jedan source entrypoint, eksplicitni parity artifact i puni packed dashboard/API/V1/job; nije metrics stub. |
| PKG-03 | **zelen** | Root koristi samo allowlist-ovani build-time registry/package export; local copier sada prenosi svaki potpisani artifact. |
| PKG-04 | **zelen** | Čist tarball instaliran, izgrađen, pokrenut i HTTP-renderovan u Next 16.3 hostu sa DB-om. |
| PKG-05 | **zelen za code/DB tok** | Zasebna ponuda i cena, signed purchase intent, paid Master fulfillment, cross-addon rejection i `NRLS-...` pinned na `license-server`. Live finansijska kupovina ostaje release gate. |
| PKG-06 | **zelen za code/DB tok** | Dashboard handoff koristi isti activation/managed-install lifecycle kao Webshop, bez customer Webshop zavisnosti; live produkcioni redeploy ostaje release gate. |

Prompt 03 ne implementira customer issuer V2 business engine. Javni V2 ugovor i
loader stanje iz Prompt-a 01 ostaju stabilni, a release tačno objavljuje
`v2_not_exported` dok kasniji prompt ne obezbedi punu implementaciju.
