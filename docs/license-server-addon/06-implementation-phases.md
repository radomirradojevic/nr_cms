# 06 — Faze implementacije

Faze se izvršavaju redom. „Kod postoji” nije dovoljan: gate zahteva dokaz iz
spakovanog add-on-a i odgovarajuće testove. Detaljni radni promptovi su u
`12-implementation-prompts.md`.

## Faza 0 — Zaključavanje ugovora i baseline-a

Ishod:

- dokumentovana granica Master / License Server add-on / Webshop;
- inventar V1 i capability V1;
- imenovani vlasnik svake tabele, secret-a i operacije;
- sačuvan baseline build/test rezultat;
- odluka o V2 endpoint/capability tipovima i compatibility periodu.

Gate:

- nijedna aktivna specifikacija ne tvrdi da se License Server instalira unutar
  Webshop add-on-a;
- contract testovi zaključavaju postojeće V1 ponašanje;
- postoji ADR za lokalni/remote jedinstveni issuer model.

## Faza 1 — Package/schema/release paritet

Ishod:

- add-on poseduje verzionisane migracije ili eksplicitno dokumentovan prelazni
  host-owned plan;
- `release-addon` izlaže puni podržani admin dashboard;
- package manifest, runtime ugovor, capability i jobs su tipizovani javnim SDK
  tipovima;
- build iz čistog checkout-a daje reproducibilan paket;
- izolirani Next.js 16.3 host instalira taj isti tarball.

Gate:

- empty DB install, upgrade sa prethodne schema-e i host restart prolaze;
- source-vs-packed feature parity test prolazi;
- nema privatnog source importa iz Webshop-a.

## Faza 2 — Product/Profile revision i custom schema

Ishod:

- Product Type i objavljivi License Profile revision model;
- verzionisan JSON Schema subset i UI editor/preview;
- default claims, override allowlist i mapping contract;
- canonicalization, schemaHash i policyHash;
- migracija postojećih SKU-ova bez promene izdatih snapshot-a.

Gate:

- objavljena revizija je immutable;
- invalid/oversized/deep/polluting claim payload se odbija;
- schema/profile change ne menja postojeću licencu;
- permission i audit testovi pokrivaju publish/deprecate.

## Faza 3 — Jedinstveni issuer operation engine

Ishod:

- durable IssueOperation i LifecycleOperation;
- exact business-once idempotency sa payload hash konfliktom;
- standardni receipt i kontrolisan reveal;
- local capability V2 i HTTP V2 adapteri nad istim application service-om;
- scheduler, lease, retry i dead-letter administracija.

Gate:

- local i remote contract vectors daju semantički isti rezultat;
- 100+ konkurentnih istih zahteva daje jednu licencu;
- crash u svakoj granici transakcije može bezbedno da se nastavi;
- receipt nikad ne curi u log/error.

## Faza 4 — Webshop konekcije i fulfillment

Ishod:

- `LicenseServerConnection` sa local/remote transportom;
- issuer pinning, health i catalog sync;
- jedan `license_server` izbor u product UI-u;
- claim mapping preview/revision;
- zajednički issue/status/receipt/delivery state machine;
- migracija skrivenog `customer_issuer` puta;
- lifecycle outbox za renew/refund/chargeback.

Gate:

- plaćeni order se izdaje/dostavlja jednom za oba transporta;
- timeout/restart/redeploy ne pravi duplikat;
- connection/profile/schema mismatch blokira novi checkout jasnom greškom;
- refund i chargeback su dokazano eventualno konzistentni.

## Faza 5 — Potpisani claims i verifier

Ishod:

- versioned signed customer license assertion;
- public issuer/keyset endpoint sa ETag/cache pravilima;
- key rotation overlap i compromised-key procedura;
- `.nrls.json` license file format;
- TypeScript verifier paket/reference implementacija i language-neutral test
  vectors;
- kratkoživi signed online lease za status-sensitive offline rad.

Gate:

- valid/tampered/expired/wrong-audience/unknown-kid test vectors prolaze;
- stari assertion radi posle normalne rotacije;
- compromised ključ se može povući po dokumentovanom postupku;
- verifier ne zahteva privatni ili HMAC secret.

## Faza 6 — Runtime lifecycle i admin proizvod

Ishod:

- puna activation/validate/deactivate semantika;
- renew/suspend/resume/revoke/refund/chargeback operacije;
- product/profile/schema/license/activation/client/operation admin UI;
- search, pagination, permission-i, audit i safe error UX;
- activation reset i support notes bez curenja PII/tajni.

Gate:

- device/domain/seat concurrency limiti se ne mogu probiti;
- add-on u `edit_existing_only` ne izdaje novo, ali omogućava bezbedno upravljanje
  postojećim podacima prema policy-ju;
- packed release UI E2E prolazi ključne administrativne tokove.

## Faza 7 — Security i operativna spremnost

Ishod:

- envelope encryption i verzije encryption ključa;
- backup/export/restore UI i runbook;
- HMAC/signing/encryption rotacija;
- persistent rate limits, anti-replay i abuse monitoring;
- metrike, structured sanitized logs, trace/correlation IDs i alarmi;
- retention, privacy export/pseudonymization i uninstall policy.

Gate:

- restore na novu instancu sa istim issuerRef validira stare licence;
- izgubljen wrapping ključ ima jasno deklarisan, testiran ishod;
- secret scan, dependency audit i threat-model review su čisti;
- dead-letter/queue/validation failure alarmi su dokazani.

## Faza 8 — Release candidate i kontrolisani rollout

Ishod:

- verzionisan, potpisan paket sa SBOM/provenance/digestom;
- Master release i entitlement mapa za tačnu verziju;
- install worker preflight/dry-run/rollback;
- staging local i remote E2E;
- canary instalacija i monitoring;
- operativni rollback/forward-fix paket.

Gate:

- kompletan checklist iz dokumenta 11 je zelen;
- nema otvorenog critical/high security problema;
- backup je provereno obnovljiv;
- canary period nema duplikate, izgubljene receipt-e ili issuer mismatch;
- produkcioni release zahteva eksplicitno ljudsko odobrenje.

## Paralelizacija koja je bezbedna

Posle faze 1 mogu paralelno:

- schema/profile UI i assertion specifikacija;
- verifier test vectors;
- Webshop read-only connection/catalog UI;
- observability model.

Ne treba paralelizovati pre zaključavanja ugovora:

- issue engine i Webshop fulfillment;
- package migracije i domenske schema izmene;
- signing format i verifier implementaciju;
- release publish i install/redeploy.

## Commit disciplina

Preporučen je mali, proverljiv commit po promptu/fazi. Svaki commit navodi:

- zahtev/gap koji zatvara;
- migraciju i compatibility uticaj;
- izvršene testove;
- preostali rizik;
- da li menja javni ugovor.

Ne objavljivati/push-ovati samo zato što je lokalni kod završen; publish i
deployment su zasebni, odobreni koraci release runbook-a.
