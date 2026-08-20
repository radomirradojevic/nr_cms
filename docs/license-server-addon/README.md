# License Server add-on — tehnička dokumentacija

Ovaj direktorijum je autoritativna specifikacija za razvoj i produkciono
puštanje plaćenog `@nr-cms/license-server` add-on-a. Dokumentacija je revidirana 20. avgusta 2026. poređenjem sa stvarnim stanjem u:

- `.private/license-server-addon`;
- javnom CMS ugovoru u `lib/license-server-addon` i `packages/addon-sdk`;
- Webshop modelu, podešavanjima i fulfillment tokovima;
- centralnom `.private/license-server` sistemu.

## Tri odvojena proizvoda/sistema

| Sistem                          | Vlasnik i svrha                                                                                                                                                                                                             | Šta ne radi                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Centralni Master License Server | Isključivo autor Night Raven CMS-a. Izdaje i proverava licence/entitlement-e za plaćene add-on-e: Webshop, License Server add-on i budući Web Conference add-on. Prodaja se obavlja kroz vendorski Night Raven CMS Webshop. | Ne generiše licence za proizvode krajnjih kupaca korisnika add-on-a.                          |
| License Server add-on           | Plaćeni, zasebno instaliran NR CMS add-on. Njegov vlasnik definiše sopstvene proizvode, profile licenci, custom claims i izdaje licence za svoje aplikacije.                                                                | Ne instalira se „u Webshop”, ne dobija Master privatne ključeve i ne deli Master bazu.        |
| Webshop add-on                  | Na vendorskom Night Raven CMS-u prodaje NR add-on licence; na customer CMS-u prodaje proizvode tog korisnika. Za digitalni proizvod-licencu bira `pool` ili konfigurisani License Server.                                   | Ne implementira sopstveni generator i ne pristupa privatnim tabelama License Server add-on-a. |

License Server i Webshop mogu biti instalirani u istom CMS-u, ali su i tada
nezavisni add-on-i. Komuniciraju kroz verzionisan javni capability ugovor. Kada
su na različitim instalacijama, koriste HTTPS API sa HMAC autentikacijom.

## Obavezni tok kupovine, aktivacije i instalacije

License Server add-on mora da se kupuje i aktivira **na isti način kao Webshop
add-on**:

1. Vendorski Night Raven CMS Webshop prikazuje License Server kao zaseban plaćeni
   add-on pored Webshop add-on-a.
2. Posle uspešne kupovine centralni Master izdaje kupljeni `NRLS-...` add-on ključ
   za `addonKey: "license-server"`.
3. Kupac na ciljnoj Night Raven CMS instalaciji otvara **Dashboard → License
   Server**, unosi kupljeni ključ i bira aktivaciju, analogno toku **Dashboard →
   Webshop**.
4. CMS preko centralnog Master-a vezuje entitlement za installation
   fingerprint/domen. U `managed_redeploy` režimu uspešna aktivacija pokreće isti
   kontrolisani install lifecycle kao za Webshop: kratkoživeći install token,
   verifikacija dozvoljenog paketa, migracije, build-time registry i redeploy.
5. Dok paket nije bezbedno instaliran stanje ostaje `install_pending`; tek
   uspešan install/redeploy prelazi u `ready`.

Ovo je isti purchase/activation/install obrazac, ali License Server ostaje
zaseban paket i proizvod. Kupac ne mora da poseduje niti instalira Webshop add-on
na svom CMS-u da bi koristio License Server. Vendorski Webshop obavlja prodaju,
centralni Master licencira add-on, a customer License Server tek nakon instalacije
izdaje licence za proizvode tog kupca.

## Redosled čitanja

0. [00-reproducible-baseline.md](./00-reproducible-baseline.md) — svež Prompt 00
   as-built dokaz, komande, rezultati i početna acceptance mapa.
1. [ADR-0001](./adr/0001-customer-issuer-v2-boundary.md) — prihvaćena Master /
   customer issuer granica, kanonski purchase/install tok i V2 capability odluka.
2. [01-current-state-and-gaps.md](./01-current-state-and-gaps.md) — provereno
   postojeće stanje i stvarni jazovi.
3. [02-target-architecture.md](./02-target-architecture.md) — granice sistema,
   tokovi i trust model.
4. [03-data-model-and-engine.md](./03-data-model-and-engine.md) — entiteti,
   invarianti, migracije i transakcije.
5. [04-documented-api-contract.md](./04-documented-api-contract.md) — lokalni i
   udaljeni API ugovori.
6. [05-webshop-integration.md](./05-webshop-integration.md) — podešavanje
   konekcije, katalog, izdavanje i digitalna isporuka.
7. [06-implementation-phases.md](./06-implementation-phases.md) — faze i gate-ovi.
8. [07-security-operations-and-tests.md](./07-security-operations-and-tests.md)
   — zaštita, operacije, backup i test matrica.
9. [08-developer-examples.md](./08-developer-examples.md) — primeri integracije
   aplikacija koje proveravaju licence.
10. [09-release-runbook.md](./09-release-runbook.md) — build, publish, install,
    upgrade, rollback i recovery.
11. [10-custom-license-profiles-and-signed-claims.md](./10-custom-license-profiles-and-signed-claims.md)
    — tipovi licenci, custom podaci i potpisani assertion-i.
12. [11-production-acceptance-and-traceability.md](./11-production-acceptance-and-traceability.md)
    — Definition of Done i sledljivost zahteva.
13. [12-implementation-prompts.md](./12-implementation-prompts.md) — preporučeni
    promptovi koji se izvršavaju redom.
14. [13-prompt-02-migration-evidence.md](./13-prompt-02-migration-evidence.md) —
    Prompt 02 as-built inventura, migration/install dokazi i acceptance mapa.
15. [14-prompt-03-release-parity-evidence.md](./14-prompt-03-release-parity-evidence.md)
    — Prompt 03 source/packed parity, puni admin, vendorska ponuda i clean-host
    dokazi.
16. [15-prompt-04-profile-claims-evidence.md](./15-prompt-04-profile-claims-evidence.md)
    — Prompt 04 Product Type/Profile revision, restricted custom schema,
    deterministic claims, migracija i admin wizard dokazi.
17. [16-prompt-05-operation-engine-evidence.md](./16-prompt-05-operation-engine-evidence.md)
    — Prompt 05 durable issue/lifecycle engine, idempotency, lease/retry,
    reveal-once, V1 adapter i fault-injection dokazi.
18. [17-prompt-06-assertion-evidence.md](./17-prompt-06-assertion-evidence.md)
    — Prompt 06 customer assertion V2, public JWK keyset, rotacija,
    backup/restore, `.nrls.json`, verifier i language-neutral vektori.
19. [18-prompt-07-http-api-evidence.md](./18-prompt-07-http-api-evidence.md)
    — Prompt 07 HTTP V2 router, NRLS2 HMAC/nonce/scope zaštita, OpenAPI,
    domain/remote parity i packaged Next 16.3 dokazi.
20. [19-prompt-08-local-capability-evidence.md](./19-prompt-08-local-capability-evidence.md)
    — Prompt 08 local V2 capability, V1 status bridge, singleton scheduler,
    domain/local/HTTP vektori i Webshop restart dokazi.
21. [20-prompt-09-webshop-connections-evidence.md](./20-prompt-09-webshop-connections-evidence.md)
    — Prompt 09 jedinstvene local/remote Webshop konekcije, katalog, issuer
    pinning, migracija, checkout snapshot i bezbednosni dokazi.
22. [21-prompt-10-webshop-fulfillment-evidence.md](./21-prompt-10-webshop-fulfillment-evidence.md)
    — Prompt 10 immutable claim mapping, paid-order issue/reconciliation,
    receipt, reveal-once i potpisana `.nrls.json` isporuka.

23. [22-prompt-11-runtime-lifecycle-evidence.md](./22-prompt-11-runtime-lifecycle-evidence.md)
    — Prompt 11 runtime aktivacija, atomic limit, signed lease/offline odluka i
    Webshop-to-issuer lifecycle dokaz.
24. [23-prompt-12-production-admin-evidence.md](./23-prompt-12-production-admin-evidence.md)
    — Prompt 12 packed produkcioni admin, granularni permission-i, support
    mutacije, šifrovani reveal-once artifact-i i clean Next host dokaz.
25. [24-prompt-13-security-recovery-evidence.md](./24-prompt-13-security-recovery-evidence.md)
    — Prompt 13 threat model, envelope rotacija, persistent abuse kontrole,
    observability/alarmi, v3 backup/restore drill, incident runbook i scan dokaz.
26. [security-threat-model.md](./security-threat-model.md) i
    [incident-response-runbook.md](./incident-response-runbook.md) — operativni
    trust-boundary pregled i procedure za security/recovery incidente.
27. [25-prompt-14-sdk-consumer-evidence.md](./25-prompt-14-sdk-consumer-evidence.md)
    — Prompt 14 dependency-free verifier, pinned keyset cache/refresh, javni
    vektori, clean consumer fixture, finalni OpenAPI modeli i V1 → V2 vodič.

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
4. Njegova kupovina, unos `NRLS-...` ključa, aktivacija i kontrolisana instalacija
   prate isti CMS lifecycle kao Webshop add-on; Webshop nije runtime preduslov.
5. Webshop bira izvor licence po proizvodu: ručni unos, pool ili konfigurisani
   License Server. Generator pripada License Server-u.
6. Lokalna integracija ne sme da zavisi od privatnih importa ili direktnog upisa
   u tuđe tabele. Koristi `customerLicenseIssuer.v1` ili njegovu naslednu verziju.
7. Udaljena integracija mora koristiti TLS, scope-ovan HMAC klijent,
   anti-replay zaštitu i idempotency ključ.
8. Izdavanje mora biti tačno-jednom sa stanovišta poslovnog rezultata, čak i kada
   se transport ponovi.
9. Custom claims su validirani podaci, ne izvršivi kod i ne tajno skladište.
10. Privatni signing ključ nikada se ne vraća Webshop-u niti klijentskoj
    aplikaciji.
11. Release se ne proglašava produkcionim dok su build artefakt, migracije,
    instalacija i E2E test provereni iz spakovanog paketa.

## Autoritativni izvori u kodu

Dok se implementacija ne uskladi sa ciljem, trenutno stanje proveravati u:

- `lib/license-server-addon/contract.ts` — CMS runtime ugovor;
- `packages/addon-sdk/src/customer-license-issuer-v1.ts` — lokalni capability;
- `packages/addon-sdk/src/customer-license-issuer-v2.ts` — zaključan V2 javni
  capability ugovor;
- `packages/addon-sdk/src/customer-license-issuer-jobs-v1.ts` — versioned
  scheduler job input/result ugovor;
- `.private/license-server-addon/migrations.json` i `migrations/*.sql` —
  package-owned schema manifest i aditivne migracije;
- `.private/license-server-addon/src/lib/canonical-json.ts`, `claim-schema.ts` i
  `profile-domain.ts` — ograničenja, normalizacija, hash-evi i effective claims;
- `.private/license-server-addon/src/data/claim-schemas.ts` i `profiles.ts` —
  draft/publish/deprecate servisi i immutable revision granica;
- `.private/license-server-addon/src/lib/operation-domain.ts` i
  `src/data/operations.ts` — kanonski operation payload, jedinstveni durable
  issue/lifecycle application service, receipt, lease/retry i reveal policy;
- `.private/license-server-addon/src/data/customer-issuer-capability-v2.ts` i
  `customer-issuer-scheduler.ts` — local V2 adapter i DB singleton scheduler;
- `.private/license-server-addon/src/data/licenses.ts` — postojeći V1/admin HTTP
  compatibility adapter preko durable operation servisa, ne zaseban issuer;
- `.private/license-server-addon/src/api/routes.ts` — postojeće HTTP rute;
- `.private/license-server-addon/src/data/customer-issuer-outbox.ts` — legacy
  outbox compatibility re-export; novi poslovni tok poseduje `operations.ts`;
- `.private/license-server-addon/src/lib/policies.ts` — postojeći policy šabloni;
- `.private/license-server-addon/src/data/customer-issuer.ts` — identitet,
  snapshot-only potpisivanje, rotacija i šifrovani backup/restore;
- `.private/license-server-addon/src/lib/customer-license-assertion-v2.ts` —
  strogi V2 assertion, JWK verifier i `.nrls.json` envelope;
- `.private/license-server-addon/src/lib/customer-license-verifier.ts` i
  `src/lib/customer-license-consumer.ts` — CMS-nezavisni strogi verifier i
  pinned issuer/keyset cache/refresh klijent;
- `.private/license-server-addon/test-vectors/customer-license-assertion-v2.json`,
  `customer-license-consumer-v2.json` i `examples/typescript-consumer/` —
  jezički neutralni vektori i clean copyable consumer fixture;
- `.private/license-server-addon/src/api/v2-contract.ts` — autoritativne stroge
  V2 request/response schema-e iz kojih nastaje packed OpenAPI 3.1 dokument;
- `.private/license-server-addon/src/addon.tsx` — jedini funkcionalni
  development/release ulaz; `src/release-addon.tsx` je compatibility re-export;
- `lib/license-server-addon/operations-cron-adapter.ts` i
  `app/api/cron/license-server-operations/route.ts` — entitlement-aware host
  scheduler wiring;
- `.private/webshop/src/data/webshop-customer-license-issuer.ts` i fulfillment
  outbox — V1 enqueue/V2 status compatibility tok bez privatnog coupling-a.

Ako se kod i ova specifikacija razlikuju, `01-current-state-and-gaps.md` opisuje
jaz, a dokumenti 02–12 opisuju cilj koji implementacija treba da dostigne.
