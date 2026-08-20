# Prompt 12 — Produkcioni admin, permission-i i support tokovi: as-built evidence

Datum poslednje provere: 2026-08-20. Ovo je source, izolovani PostgreSQL i
packed Next.js 16.3 dokaz. Nije production publish/deploy niti zamena za
operator restore/incident drill.

## Implementirano

- Packed admin sada ima operativne stranice za Product Types, immutable
  Profile/Schema revisions, Licenses, Activations, API Clients/Scopes,
  Operations/Dead letters, Keys/Backup, Audit i assertion verifier. Liste imaju
  bounded search/filter/pagination, a detalji maskiraju customer e-mail, ime,
  domen i actor reference. Privatni ključ, HMAC secret i plaintext licencni
  ključ se ne renderuju.
- Canonical permission ugovor iz dokumenta 07 primenjen je na svaku od 23
  server action granice i na admin reveal rutu. Host proverava Clerk sesiju i
  admin rolu, prosleđuje trusted permission snapshot, a add-on ponavlja
  permission i license-mode odluku. Sakrivanje dugmeta koristi istu matricu samo
  kao UX pomoć i nije security boundary. Stari `license-server.*` nazivi se
  čitaju samo kao migracioni alias; novi kod i dokumentacija koriste
  `license_server.*`.
- Manual issue, suspend/resume/revoke, activation reset, client create/rotate/
  revoke, scope grant/revoke, signing-key rotation, šifrovani backup export/
  restore, dead-letter replay, claim preview i assertion verifier su dostupni
  kroz eksplicitne permission-e i audit događaje. Destruktivni ili publish
  tokovi traže potvrdu, a support reason je bounded reason code, ne slobodan PII
  tekst.
- API client secret, manual license key, encrypted backup, claim preview i
  verifier rezultat nikada ne idu kroz query string. Čuvaju se kao
  envelope-encrypted, actor-bound artifact sa hashovanim opaque tokenom,
  petominutnim rokom i atomic reveal-once CAS potrošnjom. Download odgovori su
  `no-store`, `no-referrer`, `nosniff`, same-origin i attachment-only. Audit ne
  sadrži token ni plaintext payload.
- Admin greške imaju stabilan user-actionable code i UUID correlation ID.
  Neočekivana DB/domain greška mapira se na bezbedan kod; dashboard ne prikazuje
  stack, SQL, exception tekst ili tajnu.
- Aditivna schema verzija 8 uvodi samo `license_server_admin_reveals`. Empty DB,
  upgrade, migration manifest/checksum, release inventory i rollback-compatible
  stari upisi provereni su stvarnom PostgreSQL migracijom.

## `edit_existing_only` matrica

| Operacija                                            | Ishod posle isteka add-on licence              |
| ---------------------------------------------------- | ---------------------------------------------- |
| čitanje, audit i assertion provera                   | dozvoljeno uz odgovarajući permission          |
| postojeći catalog draft/deprecate                    | dozvoljeno; published sadržaj ostaje immutable |
| suspend/revoke i activation reset                    | dozvoljeno kao restriktivna support radnja     |
| client rotate/revoke/scope revoke                    | dozvoljeno; create i scope grant blokirani     |
| signing-key rotate i šifrovani backup export/restore | dozvoljeno kao recovery tok                    |
| Product/SKU create, Profile/Schema publish           | blokirano                                      |
| manual/API issue, resume, dead-letter replay         | blokirano                                      |

Matrica je testirana preko svake deklarisane admin operacije, a svaka action
ponavlja server-side mode proveru. UI visibility test nije jedini dokaz.

## Reproducibilne provere

| Komanda                                                                 | Rezultat                                                                                                                    |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `npm --prefix .private/license-server-addon run typecheck`              | PASS: release i host typecheck.                                                                                             |
| `npm --prefix .private/license-server-addon run test:local`             | PASS: 85/92; sedam DB testova eksplicitno skipovano bez test DSN-a, bez failure-a.                                          |
| `npm --prefix .private/license-server-addon run test:db:local`          | PASS: 92/92 bez skipova; uključuje migration/upgrade, authz, exactly-once engine i konkurentni reveal-once.                 |
| `npm --prefix .private/license-server-addon run install:verify:next:db` | PASS: frozen tarball install, Next 16.3 build/start i HTTP render 12 admin stranica plus V1/V2 rute iz packed entrypoint-a. |
| `npm run typecheck`                                                     | PASS za CMS host ugovor i admin route wiring.                                                                               |
| `npm run lint`                                                          | PASS sa 0 grešaka; 12 ranije postojećih warning-a van Prompt 12 izmene.                                                     |
| `npm run test`                                                          | PASS: 370/380, deset eksplicitnih DB/deployment skipova i bez failure-a.                                                    |

Lokalni puni CMS `npm run build` zaustavio je postojeći runtime-env preflight pre
Next build-a zato što pet managed-deployment worker promenljivih nije podešeno u
lokalnom `.env`. Isti Prompt 12 paket je ipak prošao clean frozen tarball
install i stvarni Next.js 16.3 production build u izolovanom hostu; nedostajući
deployment credential-i nisu zamenjeni test vrednostima niti upisani u repo.

## Acceptance mapa

| ID     | Status | Dokaz                                                                                                                                                                                                     |
| ------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | zelen  | Svih 23 server actions imaju host/admin + canonical permission + mode gate; admin artifact ruta dodatno proverava trusted host auth snapshot, permission po artifact vrsti i actor binding.               |
| DX-03  | zelen  | Packed Profile wizard ima source-allowlisted claim preview, a packed verifier proverava assertion/audience; oba rezultata se preuzimaju kroz šifrovani reveal-once tok bez URL payload-a.                 |
| PKG-02 | zelen  | Jedini `src/addon.tsx` entrypoint i potpisani tarball renderuju kompletan admin, API V1/V2, capability i jobs u čistom Next 16.3 hostu; parity mapa i release inventory pokrivaju nove stranice/mutacije. |

Production publish/push artefakta, live Clerk permission provisioning, alarmi i
periodični restore drill ostaju release/runbook koraci. Oni nisu predstavljeni
kao deo ovog lokalnog acceptance dokaza.
