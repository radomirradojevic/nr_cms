# Webshop schema cutover — operator runbook

Ovaj runbook se koristi **tek kada operator izričito odobri stvarni vendor ili client cutover**. Prompt 03 nije izvršio ovu proceduru nad `nr_cms_vendor_test` niti nad `nr_cms_client_test`; dokazi u implementaciji potiču isključivo iz izolovanih privremenih PostgreSQL fixture baza.

## Neizmenljivi ugovor

| Stavka | Vrednost |
| --- | --- |
| Schema | `webshop` |
| Legacy public model | tačno 45 allowlisted business tabela |
| Canonical model | 45 business tabela + `webshop.webshops` + `webshop.webshop_settings` |
| Manifest SHA-256 | `d68408691f5bd0e4079047c61b616ff1eefd303d262a87049aefdc30284887b8` |
| Legacy public fingerprint | `d8f5a9ad02e048e958d7cebe4b49e38919c96378207b0939f540c0220bd4ae20` |
| Canonical postcondition fingerprint | `7d742c85ec5c693f4e235cb33fa2b11643383790123cd49fc319477b8a1690e7` |
| Package migration | `0001_webshop_core.sql` |
| Package migration SHA-256 | `3f5abbf20f402e2bd7bf4e6598536d06c778fdde93a8703dffeb4c74469f757a` |

Ne menjati ove vrednosti u komandnoj liniji, ne izvršavati proizvoljan SQL i ne koristiti `CASCADE`. Script prihvata samo statički `vendor` ili `client` target iz manifesta.

## Preduslovi

1. Core provisioning iz Prompt 02 mora već biti izvršen za ciljni target i njegov receipt mora biti sačuvan.
2. Postoje oba static role-a za izabrani target:
   - vendor: `nr_cms_vendor_webshop_deployer` i `nr_cms_vendor_runtime`
   - client: `nr_cms_client_webshop_deployer` i `nr_cms_client_runtime`
3. Deployer credential je operator-only DPAPI secret; ne sme biti u CMS/worker `.env`, release-u, procesu ili logovima.
4. Zaustaviti CMS i worker instance koje pristupaju baš tom targetu; ne prekidati drugi target.
5. Napraviti konzistentan, provereno restorabilan PostgreSQL backup tačno tog targeta. Sačuvati kratak backup receipt u regularnom fajlu van source checkouta, bez symlink/reparse point-a i sa isključenim NTFS nasleđivanjem. ACL može sadržati samo LocalSystem, Administrators i aktivnog elevated operatora. Receipt ne sme sadržati lozinku, connection URL ili podatke korisnika.
6. Uveriti se da je operator otvorio PowerShell kao Administrator i da koristi odobren operator input/secret root. Ne unositi secret preko CLI argumenata.

Ako bilo koja stavka nedostaje, ne raditi cutover. Prvo rešiti provisioning/backup, zatim ponovo krenuti od dry-run koraka.

## Obavezni preflight

Iz `D:\nr_cms`, sa targetom koji se eksplicitno bira, pokrenuti samo dry-run. Ova komanda ne menja bazu:

```powershell
npm run db:webshop-schema-cutover -- --target vendor --expected-manifest-sha256 d68408691f5bd0e4079047c61b616ff1eefd303d262a87049aefdc30284887b8 --dry-run
```

Za client se menja samo `--target client`. Očekivan rezultat je jedan od sledećih:

- `operator_schema_cutover_required`: tačno prepoznat legacy public model, pa operator može nastaviti na apply;
- `idempotent`: canonical stanje je već dokazano; ne raditi novu apply komandu;
- greška o targetu, fingerprintu, rolama, backupu ili driftu: zaustaviti se. Ne popravljati bazu ručno i ne menjati manifest kako bi se greška zaobišla.

## Odobreni apply

Tek po uspešnom dry-run rezultatu `operator_schema_cutover_required`, nakon posebnog odobrenja za baš taj target i baš taj backup, koristiti ACL-protected backup receipt:

```powershell
npm run db:webshop-schema-cutover -- --target vendor --expected-manifest-sha256 d68408691f5bd0e4079047c61b616ff1eefd303d262a87049aefdc30284887b8 --apply --backup-receipt-file D:\nr_runtime\operator-input\vendor-webshop-cutover-backup.receipt
```

Komanda radi u jednoj transakciji: uzima advisory lock, proverava exact legacy strukturu i legacy fingerprint, premešta samo allowlisted 45 tabela u `webshop`, dodaje dva anchor-a, migrira versionirane metadata vrednosti, usklađuje FK/ACL/default privileges i proverava canonical fingerprint. Finansijska i order istorija se ne briše niti se koristi `CASCADE`.

Sačuvati redigovani receipt iz izlaza: target, operation, manifest/fingerprint hash-eve, privilege-manifest hash i aggregate hash. Ne čuvati connection string ni secret.

## Posle apply-a

1. Odmah ponoviti potpuno istu komandu sa `--dry-run`; rezultat mora biti `idempotent`.
2. Pokrenuti target-specific CMS migration/startup preflight. `pending` ili `drift` moraju zaustaviti service pre listen-a.
3. Proveriti da runtime može samo allowlisted CMS/Webshop CRUD, a ne može DDL, grant, `SET ROLE`, `nr_control` ni drugi target.
4. Tek nakon uspešne provere ponovo pokrenuti samo odgovarajuću CMS/worker instancu i nadzirati receipt/logove bez secreta.

## Povratak / incident

Nema automatskog rollback-a. Ako apply ne vrati dokazani receipt ili naknadni postcondition ne prođe, instanca ostaje zaustavljena. Obnoviti isključivo prethodno verifikovani backup u izolovanom restore testu, zatim u ciljni target po odobrenoj operativnoj proceduri. Ne vraćati tabele ručno, ne koristiti `DROP ... CASCADE` i ne pokretati vendor operaciju nad client bazom (ili obrnuto).
