# Lokalni purchase → activation → managed install dokaz

Datum izvršenja: **2026-08-25 — 2026-08-26**

Status: **PASS (lokalni scope završen)**

Javni CMS staging i production deployment nisu bili deo ovog izvršenja. Lokalna
kupovina, Master aktivacija, produkciono potpisana publikacija paketa `0.2.1`,
Master import/publish i kontrolisana instalacija na customer CMS commit
`72a0f106…` jesu dokazani do finalnog `ready` stanja. Prethodno fail-closed
odbijanje nekompatibilnog `0.2.0` release-a ostaje zabeleženo kao negativni dokaz
da exact CMS SHA provera nije zaobiđena.

Ovaj dokument namerno ne sadrži license key, JWS, install token, registry
credential, HMAC secret niti bilo koji drugi bearer materijal.

## Rezultat po acceptance granici

| Granica                                      | Rezultat   | Dokaz / ograničenje                                                                                                                |
| -------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Lokalna vendorska kupovina                   | PASS       | Plaćeni Stripe lokalni order `WEB-1004`, SKU `license-server-30`; purchase intent je potrošen jednom.                              |
| Master izdavanje i V2 aktivacija             | PASS       | Master licenca je izdata; entitlement je vezan za installation i potvrđen svežim V2 Proof-of-Possession tokom managed lifecycle-a. |
| Produkciono potpisana publikacija `0.2.1`    | PASS       | Registry paket, publication attestation, receipt i javni keyset su objavljeni i nezavisno verifikovani.                            |
| Lokalni Master import/publish                | PASS       | Release `805adfee…` je importovan kao draft i zatim publikovan bez izmene immutable release identiteta.                            |
| `72a0f106…` CMS → managed `ready`            | PASS       | Epoch 4 je iz prvog pokušaja završio `callback_acked`; final phase je `ready`.                                                     |
| License Server bez customer Webshop add-on-a | PASS       | Aktivni release sadrži samo License Server; customer Webshop ostaje `not_installed`.                                               |
| Add-on migracije                             | PASS       | Svih osam migracija je evidentirano; schema version i finalni fingerprint odgovaraju release manifestu.                            |
| Lokalni servisi i hostovi                    | PASS       | Četiri deployment servisa rade; svih pet lokalnih HTTPS hostova vraća HTTP 200.                                                    |
| Javni CMS staging/production                 | VAN OPSEGA | Nije pokretan niti se ovde tvrdi javni CMS deployment dokaz.                                                                       |

## Kupovina i aktivacija

Vendorski Webshop je lokalno završio plaćeni Stripe tok za order `WEB-1004`.
Kupljena stavka je `license-server-30`, a centralni Master je izdao License Server
add-on licencu. Purchase intent
`a0d50ed5-2355-4e27-b698-15e4f7915499` je prešao kroz
accepted/reserved/consumed lifecycle i vezan je za order reference
`a6456cab-b5c0-4702-8d09-7fbd349d3d3a`.

Customer aktivacija `95407a16-6e8d-4737-8d44-34ae9a7a9abb` vezana je za
installation `ccf85491-eb0f-4f0c-931c-55afd414fec8`. Recovery revalidation
koristio je svež V2 Proof-of-Possession, tačan environment i tačan release.
Aktivacioni i licencni secret-i nisu zapisani u evidence-u.

## Produkciono potpisani package release `0.2.1`

Za zatvaranje exact-CMS compatibility kapije objavljen je immutable paket:

- package: `@radomirradojevic/license-server-addon@0.2.1`;
- source commit: `19a5735208f0089b5485837932da532023d12963`;
- CMS commit: `72a0f106256d1b7616780ef034d226270a0344f8`;
- release ID: `805adfee-4ee7-5937-ba3e-11c77bf53658`;
- release signing KID: `production-release:bfe65cdba790277d`;
- artifact SHA-256:
  `b8285f03876baf4a4e4cd4345111aeac9ab6b95ebedd00aa908cd40ddeacb072`;
- migration-set SHA-256:
  `e5b1e32557033ba532db00301725b9712c8a56cf190088d002912ace51503b44`;
- registry tarball SHA-256:
  `62135043d6123d09d2c877f7568e81aa34103a1dfac4f0cef57e631c81894114`.

Protected workflow run `32911852150` završio je uspešno. Registry version ID je
`1172104402`, a GitHub Release `v0.2.1` je objavljen sa tri javna evidence
asset-a: publication attestation, release public keyset i publication receipt.
Nezavisni offline Master verifier je iz preuzetih asset-a i registry tarball-a
potvrdio release ID, package/version, artifact hash i schema version `8`.

Pre produkcione publikacije verification-only run `32911412598` je na Linux
runner-u utvrdio kanonske artifact/migration digest-e bez registry ili release
upisa. Završni public CMS CI run `32911583439` prošao je kompletno. Prvi publish
pokušaj `32910982797` zaustavljen je pre registry upisa zato što je test skripta
ponovo gradila release i narušavala clean-source precondition; build/test skripte
su ispravljene pre uspešne publikacije.

Lokalni Master preflight je release prihvatio kao `nrls_release_operator`.
Import je kreirao draft sa istim release ID-em, a publish ga je prebacio u
`published`; potpisani identitet i digest-i nisu menjani.

## Prvi install incident i auditovani recovery

Prva deployment operacija
`8175e34c-c9b4-4382-ad2a-e8beebc336ef`, worker job
`049806fa-be0a-4b41-9756-c94cd59f0c44`, završila je kao
`maintenance_required` sa incidentom
`previous_runtime_schema_compatibility_unproven`. Terminalni receipt hash je:

```text
sha256:2a8e8d2e2f509031e30fa7c09a4eb3c64af7a4ab69891de0d28998e2615f2294
```

Uzrok nije bio razlika u SQL značenju, već istorijski naziv foreign-key
constraint-a (`_fk` naspram package `_fkey`) uz jednaku definiciju. Worker je
promenjen tako da proverava semantičku FK kompatibilnost, bez popuštanja schema
ili migration integriteta.

Pošto je ovo bila neuspešna početna instalacija bez installed evidence-a,
recovery nije rađen direktnom izmenom stanja. Auditovana clearance odluka vezala
je tačnu neuspešnu operaciju, job i recovery receipt, proverila odsustvo aktivnog
fence/candidate/operation stanja i otvorila novi deployment epoch sa
`generation=1`.

Epoch 2:

- operation: `c96d8599-0bb1-46f6-b461-7b1752bf2f4d`;
- worker job: `066467b3-37bd-4c1b-ace0-f23daa9c425b`;
- rezultat: `callback_acked`, attempt 1, final `ready`;
- terminalni/recovery evidence:
  `sha256:5eb627c259d040d6b25636b5c6c902618ec2e8c77945c4ecda8e6a0ea671fae5`;
- migration ledger:
  `sha256:62a298d48629fdd49f0ef1283e817b29031fb717312ecfc7eb45958a9e4b26e4`;
- serving fence: `resolved_success`.

## Prethodni epoch 2 runtime i schema dokaz

Epoch 2 je aktivirao junction:

```text
D:\nr_deploy\client\releases\core-bootstrap-c0f26fa29b5ffb1bf14ada6bcddb25349fe2adfb52dad7232ff4d4563ac3eb1b
```

Receipt i aktivni release potvrđuju:

- paket: `@radomirradojevic/license-server-addon@0.2.0`;
- release ID: `e84e77ca-b621-5e6b-90e7-5dd4548e6938`;
- paket sadrži samo `license-server`; customer Webshop nije instaliran;
- package schema version: `8`;
- build ID: `c0f26fa29b5ffb1bf14ada6bcddb25349fe2adfb52dad7232ff4d4563ac3eb1b`;
- aktivni CMS commit: `bee6ca64f247723cf2472def6408787b4d4f3dd5`.

Svih osam License Server migracija postoji u customer bazi. Migracija `0001` je
evidentirana kao `legacy_applied`, a `0002`–`0008` kao `applied`. Finalni schema
fingerprint je:

```text
ace5eb1b1748a2361effec15a53a57ef61ce7731fe71b0290a554dcf67d1d567
```

Polje `installed_schema_version` u zajedničkoj installation projekciji ostalo je
`NULL`: epoch 2 je izvršio worker pre naknadne finalization popravke. Epoch 4 u
nastavku daje live dokaz da worker commit
`5b4d687d73c0e6616b3eaad0721ca627d7cfc6d9` sada pravilno finalizuje schema
version i ostala installed evidence polja.

## Epoch 3: očekivano fail-closed odbijanje

Nakon CMS funkcionalnih popravki, postojeća operacija
`f937617b-6ddc-4bf3-a5df-412449bad713` i job
`37f6e7b0-33a8-4a25-bfc4-018449a9b66b` nastavljeni su bez nove aktivacije i bez
duplog dispatcha. Source/policy je očekivao CMS commit:

```text
72a0f106256d1b7616780ef034d226270a0344f8
```

Produkcijski potpisani manifest i publication attestation za paket `0.2.0`
(`releaseSigningKid=production-release:bfe65cdba790277d`, objavljen
`2026-08-22T04:41:45Z`) deklarisali su:

```text
bee6ca64f247723cf2472def6408787b4d4f3dd5
```

Verifier je zato vratio `release_expected_cms_commit_sha_mismatch`. Ovo je
nepromenljiva kompatibilnosna greška: ista potpisana ulazna polja ne mogu postati
ispravna retry-em. Otkriveni worker lifecycle problem, koji je ovakvu grešku
nepotrebno ponavljao, ispravljen je commitom
`35a3f64b768f78c0bafa8ad8be993d31d8b71576`. Isti job je potom završio:

- `callback_acked`, durable attempt 7;
- `error_class=permanent`;
- final `rejected_before_switch`;
- callback HTTP 200, potvrđen iz prvog result-outbox pokušaja;
- no-mutation receipt:
  `sha256:ae0ee18131a84364195910815dbcb1c1a9a01212a1924614868145fa80ee33c6`.

DB schema, release pointer, junction i prethodni receipt-proven runtime nisu
promenjeni. Customer projekcija je zato u tom istorijskom trenutku pokazivala
neuspeo željeni update uz `runtime_status=ready`: stari runtime je bio očuvan,
dok je License Server UI prikazivao `install_pending` / „Installation needs
attention”. Webshop je ostao `not_installed`.

Exact CMS SHA provera nije ublažena i ne sme biti zaobiđena pin override-om,
direktnim SQL-om ili ponovnim slanjem istog dispatcha.

## Epoch 4: `0.2.1` managed install do `ready`

Sveža V2 revalidacija postojeće plaćene aktivacije izabrala je publikovani
release `805adfee-4ee7-5937-ba3e-11c77bf53658` i otvorila tačno jednu novu
deployment nameru:

- deployment epoch: `4`, generation: `1`;
- operation: `4f6b157e-25d7-4bae-b22f-0034cbece252`;
- worker job: `b76d8437-cf4d-478a-a556-d93dee828ea8`;
- dispatch outbox: jedan pokušaj, worker acceptance HTTP `202`;
- worker terminal: `callback_acked`, attempt `1`, final phase `ready`;
- result callback outbox: `acknowledged`, jedan pokušaj, HTTP `200`;
- terminal/reconciliation evidence:
  `sha256:28f9d6e45aee7d2b955d254436242a6f6377c4b7701f5f0e64f2aeb3fdee5ef7`;
- migration ledger:
  `sha256:62a298d48629fdd49f0ef1283e817b29031fb717312ecfc7eb45958a9e4b26e4`;
- serving fence: `resolved_success`.

Aktivni junction je atomically prebačen na:

```text
D:\nr_deploy\client\releases\core-bootstrap-6b16e1a24e566d68a90388da1efe780f45d53cd0076346c34c2bea801d53732c
```

Managed receipt potvrđuje CMS commit `72a0f106256d1b7616780ef034d226270a0344f8`,
paket `@radomirradojevic/license-server-addon@0.2.1`, release ID `805adfee…`,
artifact digest `b8285f…`, build ID `6b16e1a2…` i schema version `8`.
Customer installation i runtime projekcije su obe `ready`; operation i customer
outbox su `completed`, bez error code-a.

Nezavisna read-only schema provera našla je svih 19 package-owned tabela. Ledger
sadrži `0001` kao `legacy_applied` i `0002`–`0008` kao `applied`, bez greške.
Observed fingerprint
`ace5eb1b1748a2361effec15a53a57ef61ce7731fe71b0290a554dcf67d1d567`
tačno odgovara descriptor-u `0008_production_admin_support.sql`.

Autentifikovani Playwright smoke test je potvrdio:

- `https://client.nr.test/dashboard/license-server`: HTTP 200, state `ready`,
  naslov `License Server`, bez activation input-a;
- `https://client.nr.test/dashboard/webshop`: HTTP 200, state
  `not_installed`, uz sopstveni activation input.

## Lokalna operativna provera

Posle finalizacije četiri Windows servisa bila su `Running` i `Automatic`:

- `NRAddonDeploymentWorker`;
- `NRAddonRegistryCredentialBroker`;
- `NRAddonBuildSandbox`;
- `NRAddonDbCredentialBroker`.

Lokalni hostovi `license.nr.test`, `client.nr.test`, `vendor.nr.test`,
`paypal.nr.test` i `deploy.nr.test/health` vratili su HTTP 200.

Verifikacija koda:

| Repo / provera                             | Rezultat                                                     |
| ------------------------------------------ | ------------------------------------------------------------ |
| CMS funkcionalni baseline                  | 409 ukupno: 398 prošlo, 11 environment-skipped, 0 neuspešnih |
| CMS release-workflow test                  | 2/2 prošlo                                                   |
| CMS public CI run `32911583439`            | PASS                                                         |
| CMS lint                                   | 0 grešaka; 12 prethodno postojećih upozorenja                |
| CMS typecheck / build                      | PASS / PASS                                                  |
| License Server package testovi             | 113 ukupno: 106 prošlo, 7 DB-env skipped, 0 neuspešnih       |
| License Server package typecheck/preflight | PASS / PASS                                                  |
| Worker testovi                             | 130 ukupno: 115 prošlo, 15 environment-skipped, 0 neuspešnih |
| Worker lint / typecheck / build            | PASS / PASS / PASS                                           |

## Objavljeni commit-i i preostala granica scope-a

Proverene i pushovane promene su:

- CMS `72a0f106256d1b7616780ef034d226270a0344f8` — V2 entitlement
  revalidation, Zod 4 parser i auditovani initial-install recovery;
- worker `b77a4e69e8fe8f75b294a76ed83a6d4fc65f9b06` — semantička FK
  compatibility provera;
- worker `5b4d687d73c0e6616b3eaad0721ca627d7cfc6d9` — installed evidence
  finalization;
- worker `35a3f64b768f78c0bafa8ad8be993d31d8b71576` — trajna klasifikacija
  nepromenljivog CMS/release neslaganja;
- add-on `19a5735208f0089b5485837932da532023d12963` — stabilan `0.2.1`
  build/test tok bez drugog release build-a;
- CMS workflow `b61619f…` — pinovani Linux artifact i migration digest-i za
  zaštićeni publisher.

Lokalna `72a0f106…` → `0.2.1` → `ready` kapija je zatvorena. Preostali javni CMS
staging/production rollout zahteva zasebnu odluku, javnu infrastrukturu i
operator evidence; nije izvršen niti se tvrdi u ovom dokumentu.
