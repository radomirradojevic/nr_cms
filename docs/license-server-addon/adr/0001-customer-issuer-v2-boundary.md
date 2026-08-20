# ADR-0001 — Customer issuer V2 javna granica

- Status: **prihvaćen**
- Datum: **2026-08-15**
- Obuhvat: `ARCH-01..06`, javni SDK i License Server add-on host bridge

## Kontekst

Night Raven koristi dva potpuno različita licencna domena:

1. centralni Master licencira plaćene Night Raven add-on-e;
2. customer License Server add-on licencira aplikacije i proizvode svog kupca.

Webshop može biti vendorski commerce sistem koji prodaje Night Raven add-on ili
customer commerce sistem koji traži izdavanje licence za proizvod tog korisnika.
Isto ime paketa ne sme spojiti ta dva trust domena niti njihove podatke.

Postojeći `customerLicenseIssuer.v1` je lokalni enqueue-only ugovor. Ne može
vratiti katalog, trajno stanje operacije, receipt ni lifecycle rezultat. V2 zato
mora biti javni, transport-neutralni ugovor pre implementacije novog engine-a.

## Odluka

### 1. Komercijalni i instalacioni tok

Kanonski tok License Server add-on-a je:

1. vendorski Night Raven CMS Webshop prikazuje zasebnu plaćenu License Server
   ponudu pored Webshop add-on ponude;
2. paid order traži od centralnog Master-a ključ/entitlement za
   `addonKey: "license-server"`;
3. kupac na ciljnom CMS-u otvara **Dashboard → License Server**, unosi kupljeni
   `NRLS-...` ključ i aktivira ga;
4. CMS koristi isti activation/managed-install lifecycle kao za Webshop:
   entitlement binding, `install_pending`, kratkoživeći install token,
   allowlist-ovan paket, migracije, build-time registry, redeploy i `ready`;
5. customer Webshop nije preduslov za kupovinu, aktivaciju ili instalaciju
   License Server add-on-a.

„Isti lifecycle” ne znači isti paket. Webshop i License Server imaju zasebne
addon key-eve, release-e, migracije, runtime ugovore i podatke.

### 2. Trust i ownership granica

| Oblast | Autoritet/vlasnik | Zabranjena prečica |
| --- | --- | --- |
| Night Raven add-on kupovina | Vendorski Webshop | Customer Webshop ne izdaje sebi add-on pravo. |
| Add-on ključ, entitlement i install token | Centralni Master | Master ne izdaje customer product licence. |
| Instalacija paketa | CMS host + deployment worker | Nema proizvoljne package/env/runtime putanje. |
| Customer issuer identity, signing ključevi, proizvodi i licence | License Server add-on na customer instalaciji | Nema Master baze, Master ključa ili Master issue fallback-a. |
| Customer order, fulfillment i secure delivery | Customer Webshop, ako je instaliran | Nema direktnog upisa u issuer tabele. |
| Provera customer licence | Aplikacija korisnika | Nema Vendor/Master credential-a. |

### 3. Javni V2 capability

Kanonski SDK export je
`@nr-cms/addon-sdk/customer-license-issuer-v2`. Add-on ga opciono izlaže kao
`customerLicenseIssuerV2` sa `contractVersion: "2"` i metodama:

- `describe()`;
- `catalog(input)`;
- `enqueueIssue(input)`;
- `getOperation(input)`;
- `enqueueLifecycle(input)`.

Komandni i rezultatski tipovi su JSON-serializable i ne importuju add-on,
Webshop, Master ili DB tipove. `idempotencyKey` je deo kanonske komande. Remote
adapter ga mapira na `Idempotency-Key` header; local adapter ga prosleđuje kao
polje. HMAC headeri, URL status endpoint-a i host auth kontekst pripadaju
adapteru, ne business payload-u.

Local i remote adapter moraju vratiti isti `OperationResultV2` i
`LicenseReceiptV2`. Remote adapter samo normalizuje HTTP
status/envelope u javni model; ne menja poslovnu semantiku.

### 4. Detekcija i fail-closed ponašanje

`loadCustomerLicenseIssuerCapabilityV2()` nikada tiho ne prelazi na V1 i ne vraća
neobjašnjen `null`. Rezultat je:

- `status: "available"` sa V2 capability-jem; ili
- `status: "unavailable"`, `requestedContractVersion: "2"` i razlog:
  `addon_not_installed`, `addon_invalid` ili `v2_not_exported`.

Kod `v2_not_exported` navode se stvarno detektovane verzije. Malformiran opcioni
V2 export čini instalirani host ugovor nevažećim; ne tretira se kao V1 fallback.

### 5. V1 kompatibilnost i deprecation

- Postojeći SDK subpath `@nr-cms/addon-sdk/customer-license-issuer`, njegovi tipovi
  i `customerLicenseIssuer` add-on property ostaju neizmenjeni.
- Tokom migracije add-on može istovremeno izložiti V1 i V2.
- Legacy V1 adapter sme mapirati `operationKey` na V2 `idempotencyKey` i postojeći
  product/SKU na unapred pin-ovanu V2 profile revision. V1 nema dovoljno podataka
  za custom claims, lifecycle ili receipt i ne sme ih izmišljati.
- Novi V2 consumer na `v2_not_exported` završava kontrolisanom compatibility
  greškom. Samo eksplicitno označen legacy Webshop tok sme privremeno koristiti
  V1 adapter.
- Datum deprecation-a se određuje tek kada packed local/remote V2 E2E prođe i sve
  podržane Webshop verzije koriste V2. Uklanjanje V1 zahteva breaking release.

## Posledice

- Prompt 01 je zaključao tipove i detekciju bez implementacije V2 issuer engine-a,
  HTTP V2 ruta, Webshop adaptera ili deployment-worker podrške.
- Stariji License Server paket koji izlaže samo V1 ispravno daje
  `unavailable/v2_not_exported`; od Prompt-a 08 aktuelni paket izlaže V1 i V2.
  Entitlement-aware host bridge dodatno vraća eksplicitni `addon_not_ready` za
  install/licensing stanje koje ne dozvoljava novu V2 komandu.
- Master ostaje control plane za pravo korišćenja add-on-a i nikada nije data
  plane ili fallback za licence koje customer issuer izdaje.

## Odbijene alternative

- **Proširiti V1 in-place:** odbijeno jer bi promenilo postojeći import i ugovor.
- **Koristiti Master entitlement V2 kao customer issuer V2:** odbijeno zbog
  pogrešnog trust domena, vlasništva podataka i semantike receipt-a.
- **Direktan Webshop import add-on source-a ili tabela:** odbijeno jer vezuje
  release-e i zaobilazi host permission/licensing granicu.
- **Različiti local i remote rezultati:** odbijeno jer onemogućava pouzdanu
  promenu transporta i zajedničke contract test vektore.

## Prompt 01 implementacioni dokaz

Implementirani javni ugovor i host detekcija provereni su 2026-08-15:

| Provera | Rezultat |
| --- | --- |
| `npm run typecheck` | PASS; uključuje pozitivne i negativne compile-time V2 fixture-e. |
| Ciljani SDK/bridge/V1/install testovi | PASS; 19/19, bez skipa. |
| Ciljani ESLint | PASS; bez warning-a. |
| License Server add-on `npm run typecheck` | PASS; release i host. |
| License Server add-on `npm run test:local` | PASS; 32 pass, 1 očekivani DB skip, 0 fail; V1 release capability ostaje zelen. |
| Webshop `npm run typecheck` | PASS; release i host. |
| `npm run acceptance:public-copy` | PASS u fizičkoj kopiji bez `.private`: 348 pass, 16 eksplicitnih DB/private skipova, 0 fail; Next.js 16.3 production build i NFT trace provera su prošli. |

Public-copy je usput otkrio dve postojeće harness nedoslednosti: javni
`.env.example` je bio izostavljen iako ga javni test čita, a isti test je
bezuslovno čitao namerno izostavljeni vendor-only `.env.example.vendor`. Filter i
test su usklađeni regression proverama; nijedan V2 contract failure nije skriven.
