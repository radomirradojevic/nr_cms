# Prompt 06 — Customer assertion V2 evidence

Datum provere: 16. avgust 2026. Ovaj dokument beleži as-built stanje Prompt-a
06. Nije izvršen production publish, deploy, live traffic niti promena Master
keyset-a.

## 1. Isporučeni ugovor

- `NRC-CUSTOMER-LICENSE+JWT` V2 je strict Ed25519 compact JWS: tačan
  `alg/typ/kid`, tačan payload shape, `iss/aud/jti/sub`, kratki assertion expiry i
  odvojena business validity pravila.
- Jedini signing ulaz učitava committed license red i immutable
  Profile/Schema/Policy/Claim snapshot. Pre potpisa ponovo proverava hash-eve i
  fail-closed claim klasifikaciju. Issue assertion, receipt, license binding,
  audit i operation commit-uju se u istoj transakciji.
- Activation i validation refresh vraćaju kratkoživi assertion vezan za stvarni
  activation ID. Issue receipt je vezan za stvarni receipt ID.
- Customer issuer zadržava postojeći `issuerRef`; nema importa ili poziva
  centralnom Master-u. Nedostupan/corrupt aktivni private key daje
  `recovery_required` i ne pravi novi identitet.
- `GET /api/license-server/v2/issuer` i `/v2/keys` su javne verification-only
  rute sa `ETag`, public cache policy, `304`, revision-om i isključivo public
  Ed25519 JWK materijalom. V2 issue/lifecycle HTTP i local capability nisu
  otvoreni ovim promptom.
- Normalna rotacija ostavlja stari ključ `verification_only` tokom maksimalnog
  TTL-a plus dva clock-skew prozora. Test proverava i da stari `kid` nestaje iz
  keyset-a nakon overlap-a.
- Backup je autentikovani A256GCM envelope sa zasebnim 32-byte backup ključem.
  Wrong-key restore se odbija; uspešan restore čuva `issuerRef`, proverava svaki
  keypair i ostavlja monotoni keyset revision.
- `.nrls.json` ima exact envelope shape. `keysetHint` mora biti HTTPS i nije
  trust anchor.
- Legacy V1 je eksplicitno `v: 1` i
  `typ: NRC-CUSTOMER-LICENSE-V1+JWT`; V2 verifier ga odbija bez silent
  reinterpretacije.

## 2. Vlasništvo i release sadržaj

| Deo | Vlasnik / dokaz |
| --- | --- |
| Assertion encode/strict verify/file envelope | `.private/license-server-addon/src/lib/customer-license-assertion-v2.ts` |
| Committed snapshot signing, JWK set, rotation, backup/restore | `.private/license-server-addon/src/data/customer-issuer.ts` |
| Issue receipt i activation binding | `src/data/operations.ts` i `src/data/activations.ts` u add-on paketu |
| Javni metadata API | `src/api/routes.ts`; root ostaje samo generički route bridge |
| Reference verifier | package export `@nr-cms/license-server/verifier`, izgrađen iz `src/lib/customer-license-verifier.ts` |
| Language-neutral vectors | package export `@nr-cms/license-server/test-vectors/customer-license-assertion-v2` i source `test-vectors/customer-license-assertion-v2.json` |
| Master keyset | van ovog toka; nije importovan, pozvan niti menjan |
| Webshop | consumer javnog issuer ugovora; ne poseduje signing ključ ili License Server tabele |

Prompt 06 nema novu migraciju. Package schema ostaje V4, jer su od ranijih
aditivnih migracija već postojali issuer identity/key status/overlap, license
snapshot, `signingKid` i `assertionDigest` modeli. Nije kreirana duplirana tabela
ili kolona.

Finalni release artifact SHA-256 je
`2afd10626c472315f94da08112c8dbae0c444d4c9b9b0f0c4b76c5cfbd3b9b9a`.
Finalni reproducibilni `pack:verify` tarball SHA-256 je
`7cffc275d7de729f05483214c5da2cd0a63b59cbdc23255e9030fb7de663f34f`.
Isolated-host komanda ponovo gradi i potpisuje paket sopstvenom efemernom local
authority instancom, pa njen tarball SHA može legitimno biti drugačiji; u
poslednjem prolazu bio je
`2ae4e660c51b10aeee9b1f68b34340c36176086f0f0478230fc25fcb452a2140`, uz isti
artifact SHA iznad.

## 3. Reproducibilne komande i rezultati

Sve komande su pokrenute iz navedenog direktorijuma. Secret vrednosti nisu
ispisivane niti upisivane u repo.

| Direktorijum / komanda | Rezultat |
| --- | --- |
| `.private/license-server-addon` — `npm run typecheck` | PASS: release i host TypeScript provera. |
| `.private/license-server-addon` — `npm run build:local` | PASS: 71 test, 67 pass, 4 očekivana DB skip-a; artifact `2afd...b9a`. |
| `.private/license-server-addon` — `npm run test:db:local` | PASS: 71/71, 0 skip; uključeni issue/activation assertion, rotation/overlap, recovery i restore DB testovi. |
| `.private/license-server-addon` — `npm run pack:verify` | PASS: dvostruki pack je byte-stabilan; allowlist, manifest inventory i secret/source scan čisti; tarball `7cff...f34f`. |
| `.private/license-server-addon` — `npm run install:verify:next:db` | PASS: frozen tarball install, Next 16.3 build/start, RSC/route import i DB HTTP render. Renderovane i `/api/license-server/v2/issuer`, `/v2/keys` i `/verification`; artifact `2afd...b9a`. |
| root — `npm run typecheck` | PASS. |
| root — `npm run test` | PASS: 378 ukupno, 368 pass, 10 očekivanih DB skipova, 0 failure. |
| root — development/private-workspace `npm run build` sa procesnim `WEBSHOP_INSTALL_MODE=disabled`, `LICENSE_SERVER_INSTALL_MODE=disabled`, `NODE_USE_SYSTEM_CA=1` | PASS: Next 16.3 production build i root registry sa finalnim License Server artifact-om `2afd...b9a`. Procesne vrednosti nisu upisane u `.env`. |
| `.private/webshop` — `npm run test:local` | PASS: 176/176, uključujući public capability-only boundary, bez centralnog fallback-a i zasebnu License Server ponudu. |
| root i add-on — `git diff --check` | PASS; samo postojeća Windows LF→CRLF upozorenja, bez whitespace greške. |

Static/consumer provere dodatno potvrđuju da `dist/verifier.js` nema
`createPrivateKey`, signing helper, `server-only`, CMS `@/` alias ili Master
dependency. JSON vektori ne sadrže private key/PEM.

## 4. Vektori i negativni slučajevi

Reproducibilni generator `scripts/print-customer-license-vectors.mjs --write`
proizvodi 13 statičnih slučajeva:

`valid`, `tampered`, `expired`, `not-yet-valid`, `wrong-issuer`,
`wrong-audience`, `wrong-version`, `wrong-typ`, `wrong-alg`, `unknown-kid`,
`normal-rotation-old`, `normal-rotation-new` i `malformed`.

Testovi dodatno pokrivaju token-provided key/header field, oversized/unsafe
envelope, business not-before/expiry/status, V1 token u V2 verifieru, wrong
backup key, corrupt aktivni private key i key-count invariant bez tihog recovery
generisanja.

## 5. Evidentirani neuspeli prolazi tokom implementacije

Nijedan failure nije prećutan:

1. Prvi verifier fixture je prosledio pogrešan expected issuer umesto da potpiše
   pogrešan `iss/aud`; fixture je ispravljen.
2. Prvi DB prolaz je rollback-ovao issue zbog lažnih fixture `policyHash`
   vrednosti; fixture-i sada koriste stvarni canonical hash.
3. Business `notBefore` test je otkrio gubitak milisekundi zbog prerane Unix
   seconds normalizacije; verifier sada poslovne datume poredi u milisekundama.
4. Posle activation E2E dopune statički test je očekivao pogrešan Drizzle tekst,
   a harness nije postavio namenski `LICENSE_SERVER_RUNTIME_HASH_SECRET`; oba
   test problema su ispravljena, bez slabljenja produkcionog fail-closed pravila.
5. Overlap test je prvo koristio pogrešno result polje/kod (`error` i
   `token_kid_unknown` umesto `code: unknown_kid`); finalni DB prolaz je zelen.
6. Prvi `pack:verify` je odbio novi `dist/verifier.d.ts`; allowlist je proširena
   samo na eksplicitna `server.d.ts` i `verifier.d.ts` imena.
7. Prvi isolated-host build je posledično pao u svom skrivenom signed-build
   koraku; reprodukovan je sa vidljivim DB build-om, ispravljen i finalno zelen.
8. Root build je fail-closed prijavio nedostajuće managed-worker promenljive,
   system CA i nepodržan `client/private_workspace` pokušaj. Finalni build koristi
   podržani `development/private_workspace` profil i disabled install transport.
9. Dodatni bundle scan je našao neiskorišćen `createPrivateKey` import u javnom
   verifier bundle-u. Crypto importi su razdvojeni tako da tree-shaking potpuno
   uklanja signing stranu; regression test zaključava ovu granicu.

## 6. Acceptance mapa

| ID | Status |
| --- | --- |
| CRYPTO-01 | Zelen: strict parser/verifier i kompletna vektorska matrica. |
| CRYPTO-02 | Zelen: public ETag/cache/revision JWK Set i bounded overlap. |
| CRYPTO-03 | Zelen: old/new token tokom normalne rotacije, isti `issuerRef`. |
| CRYPTO-04 | Zelen za code/DB restore drill; produkcioni datirani restore ostaje OPS-03 release gate. |
| CRYPTO-05 | Zelen: encrypted-at-rest/export, recovery-required stanje i čist paket. |
| CLAIM-04/05 | Zelen za signed committed snapshot i PII/internal projection. |
| DX-02 | Zelen: packed standalone verifier i language-neutral vektori. |
| ARCH-01/06 | Zelen za customer crypto/runtime granicu; nema Master issuer poziva. |

Otvoreno van Prompt-a 06: HTTP/HMAC V2 issue/lifecycle adapter (Prompt 07), local
V2 capability i scheduler wiring (Prompt 08), puni Webshop V2 mapping/fulfillment
i production/staging operativni gate-ovi.
