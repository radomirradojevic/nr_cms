# License Server add-on — tehnička dokumentacija

Ovaj direktorijum je autoritativna specifikacija za razvoj i produkciono
puštanje plaćenog `@nr-cms/license-server` add-on-a. Dokumentacija je revidirana
13. avgusta 2026. poređenjem sa stvarnim stanjem u:

- `.private/license-server-addon`;
- javnom CMS ugovoru u `lib/license-server-addon` i `packages/addon-sdk`;
- Webshop modelu, podešavanjima i fulfillment tokovima;
- centralnom `.private/license-server` sistemu.

## Tri odvojena proizvoda/sistema

| Sistem | Vlasnik i svrha | Šta ne radi |
| --- | --- | --- |
| Centralni Master License Server | Isključivo autor Night Raven CMS-a. Prodaje i licencira plaćene add-on-e: Webshop, License Server add-on i budući Web Conference add-on. | Ne generiše licence za proizvode krajnjih kupaca korisnika add-on-a. |
| License Server add-on | Plaćeni, zasebno instaliran NR CMS add-on. Njegov vlasnik definiše sopstvene proizvode, profile licenci, custom claims i izdaje licence za svoje aplikacije. | Ne instalira se „u Webshop”, ne dobija Master privatne ključeve i ne deli Master bazu. |
| Webshop add-on | Prodaje digitalne i fizičke proizvode. Za digitalni proizvod-licencu bira `pool` ili konfigurisani License Server. | Ne implementira sopstveni generator i ne pristupa privatnim tabelama License Server add-on-a. |

License Server i Webshop mogu biti instalirani u istom CMS-u, ali su i tada
nezavisni add-on-i. Komuniciraju kroz verzionisan javni capability ugovor. Kada
su na različitim instalacijama, koriste HTTPS API sa HMAC autentikacijom.

## Redosled čitanja

1. [01-current-state-and-gaps.md](./01-current-state-and-gaps.md) — provereno
   postojeće stanje i stvarni jazovi.
2. [02-target-architecture.md](./02-target-architecture.md) — granice sistema,
   tokovi i trust model.
3. [03-data-model-and-engine.md](./03-data-model-and-engine.md) — entiteti,
   invarianti, migracije i transakcije.
4. [04-documented-api-contract.md](./04-documented-api-contract.md) — lokalni i
   udaljeni API ugovori.
5. [05-webshop-integration.md](./05-webshop-integration.md) — podešavanje
   konekcije, katalog, izdavanje i digitalna isporuka.
6. [06-implementation-phases.md](./06-implementation-phases.md) — faze i gate-ovi.
7. [07-security-operations-and-tests.md](./07-security-operations-and-tests.md)
   — zaštita, operacije, backup i test matrica.
8. [08-developer-examples.md](./08-developer-examples.md) — primeri integracije
   aplikacija koje proveravaju licence.
9. [09-release-runbook.md](./09-release-runbook.md) — build, publish, install,
   upgrade, rollback i recovery.
10. [10-custom-license-profiles-and-signed-claims.md](./10-custom-license-profiles-and-signed-claims.md)
    — tipovi licenci, custom podaci i potpisani assertion-i.
11. [11-production-acceptance-and-traceability.md](./11-production-acceptance-and-traceability.md)
    — Definition of Done i sledljivost zahteva.
12. [12-implementation-prompts.md](./12-implementation-prompts.md) — preporučeni
    promptovi koji se izvršavaju redom.

## Oznake stanja

Dokumenti razlikuju sledeće oznake:

- **POSTOJI** — potvrđeno u trenutnom kodu ili testovima;
- **DELIMIČNO** — osnova postoji, ali ugovor ili produkcioni tok nije završen;
- **CILJ** — normativni zahtev za novu implementaciju;
- **VAN OPSEGA** — nije deo ovog add-on-a.

Opis ciljnog ponašanja nije tvrdnja da je ono već implementirano.

## Nepromenljiva pravila proizvoda

1. Master License Server i customer License Server nikada nisu ista instanca ili
   isti trust domen.
2. Master samo odlučuje da li instalacija sme da koristi License Server add-on.
   On ne učestvuje u svakoj licenci koju korisnik add-on-a izdaje.
3. License Server add-on je zaseban proizvod i ima sopstveni lifecycle,
   administraciju, ključeve, backup i API.
4. Webshop bira izvor licence po proizvodu: ručni unos, pool ili konfigurisani
   License Server. Generator pripada License Server-u.
5. Lokalna integracija ne sme da zavisi od privatnih importa ili direktnog upisa
   u tuđe tabele. Koristi `customerLicenseIssuer.v1` ili njegovu naslednu verziju.
6. Udaljena integracija mora koristiti TLS, scope-ovan HMAC klijent,
   anti-replay zaštitu i idempotency ključ.
7. Izdavanje mora biti tačno-jednom sa stanovišta poslovnog rezultata, čak i kada
   se transport ponovi.
8. Custom claims su validirani podaci, ne izvršivi kod i ne tajno skladište.
9. Privatni signing ključ nikada se ne vraća Webshop-u niti klijentskoj
   aplikaciji.
10. Release se ne proglašava produkcionim dok su build artefakt, migracije,
    instalacija i E2E test provereni iz spakovanog paketa.

## Autoritativni izvori u kodu

Dok se implementacija ne uskladi sa ciljem, trenutno stanje proveravati u:

- `lib/license-server-addon/contract.ts` — CMS runtime ugovor;
- `packages/addon-sdk/src/customer-license-issuer-v1.ts` — lokalni capability;
- `.private/license-server-addon/src/api/routes.ts` — postojeće HTTP rute;
- `.private/license-server-addon/src/data` — izdavanje, aktivacije i outbox;
- `.private/license-server-addon/src/lib/policies.ts` — postojeći policy šabloni;
- `.private/license-server-addon/src/data/customer-issuer.ts` — identitet,
  rotacija i potpisivanje;
- `.private/license-server-addon/src/release-addon.tsx` — stvarni release ulaz;
- Webshop schema/actions/fulfillment kod — postojeće konekcije i delivery tokovi.

Ako se kod i ova specifikacija razlikuju, `01-current-state-and-gaps.md` opisuje
jaz, a dokumenti 02–12 opisuju cilj koji implementacija treba da dostigne.
