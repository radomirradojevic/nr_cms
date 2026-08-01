# Night Raven addoni — P0/P1 remediation dokumentacija

Ovaj direktorijum je izvršni plan za rešavanje P0 i P1 problema pronađenih u arhitektonskom, bezbednosnom i integracionom pregledu Night Raven CMS-a, `webshop` addona, `license-server-addon` addona i privatnog centralnog `license-server` servisa.

Konačna verifikacija i stroga rollout presuda nalaze se u [11-final-verification-report.md](./11-final-verification-report.md). Rezultat od 2026-07-12 je **P0 nije završen**; production rollout nije odobren. Kontrolisani, ali trenutno blokirani production redosled je u [12-controlled-production-rollout-plan.md](./12-controlled-production-rollout-plan.md).

Dokumenti su namerno napisani kao implementacione specifikacije, a ne kao opšte preporuke. Njihova svrha je da kasniji agent ili developer može da uzme jednu fazu, proveri trenutno stanje koda, implementira je, pokrene navedene testove i dokaže acceptance kriterijume.

## Status

- Faze 01–08 imaju aplikacione promene, ali finalna verifikacija ih ne proglašava zatvorenim; as-built status i blockeri su u dokumentima 10 i 11.
- Svi P0 koraci su obavezni pre prve stvarne prodaje Night Raven addona.
- P1 koraci su obavezni pre opšte produkcione dostupnosti i pre oslanjanja na automatske update-e, subscriptions ili ozbiljniji broj kupaca.
- Ako se kod promeni pre izvršenja faze, instrukcije prvo uskladiti sa stvarnim runtime tokom. Naziv fajla, interfejs ili komentar nisu dokaz da je funkcionalnost implementirana.

## Redosled čitanja i izvršenja

| Redosled | Dokument | Prioritet | Glavni rezultat | Zavisnosti |
|---:|---|---|---|---|
| 0 | [Program i globalne invarijante](./00-p0-p1-remediation-program.md) | P0/P1 | Granice sistema, pravila rada i gates | Nema |
| 1 | [Payment i webhook state machine](./01-p0-payment-webhook-state-machine.md) | P0 | Monotonic payment obrada, refund i chargeback | Dokument 00 |
| 2 | [License fulfillment i outbox](./02-p0-license-fulfillment-outbox.md) | P0 | Order se završava tek posle pouzdane isporuke licence | Dokumenti 00–01; API contract iz 03 |
| 3 | [Vendor License Service](./03-p0-vendor-license-service.md) | P0 | Autoritativni centralni entitlement API i model | Dokument 00 |
| 4 | [Activation, signing i revalidation](./04-p0-activation-signing-revalidation.md) | P0 | Atomic activation, installation identity i potpisani entitlement | Dokument 03 |
| 5 | [Addon install i build granice](./05-p0-addon-install-and-build-boundaries.md) | P0 | Clean public build i pouzdan `install_pending -> ready` tok | Dokumenti 00, 03–04 |
| 6 | [Addon SDK, lifecycle i migracije](./06-p1-addon-sdk-lifecycle-migrations.md) | P1 | Stabilan addon contract i namespaced migracije | Dokument 05 |
| 7 | [Security, secrets i operations](./07-p1-security-operations-and-key-management.md) | P1 | Key management, distributed zaštita i operativna spremnost | Dokumenti 03–06 |
| 8 | [Subscriptions, update prava i customer issuer](./08-p1-subscriptions-updates-and-customer-issuer.md) | P1 | Jasni lifecycle statusi i dualni issuer model | Dokumenti 03–04, 06–07 |
| 9 | [Verifikacija, rollout i rollback](./09-verification-rollout-and-rollback.md) | P0/P1 | Contract/E2E/security testovi i kontrolisan production rollout | Sve prethodne faze |
| 10 | [Implementation status](./10-implementation-status.md) | P0/P1 | Trenutni as-built status i otvoreni blockeri | Sve prethodne faze |
| 11 | [Finalni verifikacioni izveštaj](./11-final-verification-report.md) | P0/P1 | Komande, rezultati, E2E/migration matrica i konačna presuda | Sve prethodne faze |
| 12 | [Kontrolisani production rollout plan](./12-controlled-production-rollout-plan.md) | P0/P1 | Gate-ovi, approval granice, env checklist, rollback i prvi interni canary | Dokumenti 09–11; izvršenje tek posle zatvaranja High blockera |

Faze 01 i početni additive DB deo faze 03 mogu se raditi paralelno. Faza 02 ne sme preći na novi worker dok endpoint i idempotency contract iz faze 03 nisu stabilni. Faze 04 i 05 moraju koristiti isti package/addon identitet i isti potpisani release manifest.

## P0 production gates

Prva stvarna prodaja nije dozvoljena dok nisu dokazani svi sledeći uslovi:

1. Refundovan ili chargeback order ne može zakasnelim success webhookom ponovo postati `paid`.
2. Partial refund, full refund i chargeback imaju amount-aware, idempotentnu obradu.
3. Refund/chargeback proizvode idempotentnu komandu centralnom servisu i menjaju vendor entitlement.
4. Digitalni order nije `completed` dok svi obavezni fulfillment taskovi nisu završeni.
5. Prekid mreže ili izgubljen HTTP odgovor ne proizvode duplu licencu.
6. Worker koristi atomic claim/lease i stale worker ne može prepisati noviji rezultat.
7. Centralni API klijent ne može izdavati ili validirati proizvod van svog scope-a.
8. Isti idempotency key sa različitim payloadom vraća `409`, a isti payload vraća isti rezultat.
9. Activation limit i installation binding su atomski; klon instalacije se detektuje.
10. Addon prihvata samo kriptografski validan, issuer/audience/install-bound entitlement.
11. Webshop i License Server addon imaju bounded revalidation/grace politiku.
12. Public CMS se build-uje i testira bez `.private` stabla.
13. Managed install pouzdano završava iz `install_pending` u `ready` i proverava tačan paket/verziju/checksum.
14. Financial webhook obrada nastavlja rad za već nastale obaveze i kada licenca Webshop addona nije `ready`.
15. Obavezni E2E scenariji iz dokumenta 09 prolaze u production-like okruženju.

## Način rada po fazi

Za svaku fazu koristiti poseban branch/PR i sledeći redosled:

1. Ponovo pročitati odgovarajući dokument i navedene module.
2. Napraviti kratku mapu aktuelnog runtime toka i zabeležiti odstupanja od instrukcija.
3. Prvo dodati additive migracije i kompatibilne modele.
4. Dodati testove koji reprodukuju postojeći bug; test mora prvo pasti iz očekivanog razloga.
5. Implementirati najmanju promenu koja zadovoljava invarijante faze.
6. Pokrenuti unit, integration, contract i relevantne E2E testove.
7. Dokazati acceptance kriterijume konkretnim komandama i rezultatima.
8. Proveriti rollback/feature flag put pre merge-a.
9. Ažurirati ovu dokumentaciju ako se konačni contract razlikuje.

Ne kombinovati destruktivno uklanjanje starih kolona sa prvim deploymentom novog toka. Sve migracije treba raditi po obrascu `expand -> dual read/write -> backfill -> enforce -> contract`.

## Obavezni cross-repository artefakti

Po završetku programa moraju postojati:

- versioned API contract ili deljeni schema paket za komunikaciju Webshop ↔ centralni servis;
- versioned `@nr-cms/addon-sdk` contract;
- potpisani addon release manifest;
- centralni DB migration ledger;
- CMS/addon namespaced migration ledger;
- payment provider fixture-i i normalized-event contract testovi;
- outbox/worker integration testovi sa stvarnom PostgreSQL transakcijom;
- activation/signature/key-rotation testovi;
- production deployment i rollback runbook;
- redigovana konfiguraciona matrica za development, staging i production.

## Pravila za budućeg agenta

- Poštovati `AGENTS.md` u root-u i eventualne dodatne instrukcije u privatnim repozitorijumima.
- Projekat koristi Next.js 16.2.4: koristiti `proxy.ts`, nikada `middleware.ts`; `params` i `searchParams` su Promise-i.
- Pre izmene Next.js ponašanja proveriti lokalnu dokumentaciju u `node_modules/next/dist/docs/`.
- Ne pretpostavljati da je route zaštićen samo zato što UI skriva link.
- Ne prikazivati niti kopirati stvarne secrets u test fixture, dokumentaciju ili tool output.
- Build skripta je verifikovana kao DB-neutralna; migracije ipak uvek pokretati samo kao zasebnu, eksplicitno odobrenu deployment fazu.
- Ne menjati status ili schema constraint bez migracionog i rollback plana.
- Ne zatvarati fazu samo zato što unit testovi prolaze; acceptance kriterijumi su obavezni.
