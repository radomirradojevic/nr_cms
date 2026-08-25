# Lokalni purchase → activation → managed install dokaz

Datum izvršenja: **2026-08-25 — 2026-08-26**

Status: **DELIMIČNI PASS (lokalni scope)**

Javni staging i production nisu bili deo ovog izvršenja. Lokalna kupovina,
Master aktivacija, kontrolisana instalacija objavljenog paketa i recovery jesu
dokazani. Završni `ready` tok za noviji CMS commit `72a0f106…` nije zatvoren jer
je dostupni produkciono potpisani paket vezan za drugi, stariji CMS commit. Exact
SHA provera je ispravno ostala fail-closed.

Ovaj dokument namerno ne sadrži license key, JWS, install token, registry
credential, HMAC secret niti bilo koji drugi bearer materijal.

## Rezultat po acceptance granici

| Granica                                       | Rezultat       | Dokaz / ograničenje                                                                                                                |
| --------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Lokalna vendorska kupovina                    | PASS           | Plaćeni Stripe lokalni order `WEB-1004`, SKU `license-server-30`; purchase intent je potrošen jednom.                              |
| Master izdavanje i V2 aktivacija              | PASS           | Master licenca je izdata; entitlement je vezan za installation i potvrđen svežim V2 Proof-of-Possession tokom managed lifecycle-a. |
| Managed instalacija potpisanog `0.2.0` paketa | PASS           | Epoch 2 je završio `ready` za CMS commit koji potpisani release stvarno deklariše.                                                 |
| License Server bez customer Webshop add-on-a  | PASS           | Aktivni release sadrži samo License Server; customer Webshop ostaje `not_installed`.                                               |
| Add-on migracije                              | PASS           | Svih osam migracija je evidentirano; finalni schema fingerprint je stabilan.                                                       |
| Lokalni servisi i hostovi                     | PASS           | Četiri deployment servisa rade; svih pet lokalnih HTTPS hostova vraća HTTP 200.                                                    |
| `72a0f106…` CMS → `ready` UI                  | NIJE ZATVORENO | Objavljeni paket je vezan za `bee6ca64…`; epoch 3 je pravilno odbijen pre switch-a.                                                |
| Javni staging/production                      | VAN OPSEGA     | Nije pokretan niti se ovde tvrdi javni release dokaz.                                                                              |

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

## Instalirani runtime i schema dokaz

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
`NULL`: epoch 2 je izvršio worker pre naknadne finalization popravke. To ne menja
receipt, migration ledger ili direktno potvrđenu schema verziju. Popravka iz
worker commita `5b4d687d73c0e6616b3eaad0721ca627d7cfc6d9` ima test dokaz, ali još
nema uspešan live install dokaz i zato se ovde ne predstavlja kao takav.

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
promenjeni. Customer projekcija zato pokazuje neuspeo željeni install/update uz
`runtime_status=ready`: stari runtime je očuvan, dok License Server UI korektno
prikazuje `install_pending` / „Installation needs attention”. Webshop ostaje
`not_installed` i prikazuje sopstveni activation input.

Exact CMS SHA provera nije ublažena i ne sme biti zaobiđena pin override-om,
direktnim SQL-om ili ponovnim slanjem istog dispatcha.

## Lokalna operativna provera

Posle finalizacije četiri Windows servisa bila su `Running` i `Automatic`:

- `NRAddonDeploymentWorker`;
- `NRAddonRegistryCredentialBroker`;
- `NRAddonBuildSandbox`;
- `NRAddonDbCredentialBroker`.

Lokalni hostovi `license.nr.test`, `client.nr.test`, `vendor.nr.test`,
`paypal.nr.test` i `deploy.nr.test/health` vratili su HTTP 200.

Verifikacija koda:

| Repo / provera                                | Rezultat                                                     |
| --------------------------------------------- | ------------------------------------------------------------ |
| CMS testovi                                   | 409 ukupno: 398 prošlo, 11 environment-skipped, 0 neuspešnih |
| CMS lint                                      | 0 grešaka; 12 prethodno postojećih upozorenja                |
| CMS typecheck / build                         | PASS / PASS                                                  |
| Worker testovi                                | 141 ukupno: 125 prošlo, 16 environment-skipped, 0 neuspešnih |
| Worker ciljano deployment-executor testiranje | 23/23 prošlo                                                 |
| Worker lint / typecheck / build               | PASS / PASS / PASS                                           |

## Lokalni commit-i i sledeća legitimna kapija

Lokalno proverene promene su:

- CMS `72a0f106256d1b7616780ef034d226270a0344f8` — V2 entitlement
  revalidation, Zod 4 parser i auditovani initial-install recovery;
- worker `b77a4e69e8fe8f75b294a76ed83a6d4fc65f9b06` — semantička FK
  compatibility provera;
- worker `5b4d687d73c0e6616b3eaad0721ca627d7cfc6d9` — installed evidence
  finalization;
- worker `35a3f64b768f78c0bafa8ad8be993d31d8b71576` — trajna klasifikacija
  nepromenljivog CMS/release neslaganja.

Commit-i su lokalni; ovaj dokaz ne tvrdi da su pushovani.

Za zatvaranje `72a0f106…` → `ready` kapije potreban je zasebno odobren,
potpisan i objavljen License Server package release čiji manifest i publication
attestation deklarišu izabrani CMS commit. Tek tada treba pokrenuti novi
uobičajeni Master import/publish, aktivaciju/revalidation i managed deployment.
To je spoljašnja release odluka i nije prećutno autorizovana ovim lokalnim testom.
