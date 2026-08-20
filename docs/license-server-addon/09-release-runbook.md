# 09 — Release, instalacija, upgrade i recovery runbook

Ovo je ciljni production runbook za **License Server add-on**. Ne izvršava se
automatski čitanjem dokumenta. Publish, Master release promena i customer
redeploy zahtevaju eksplicitno odobrenje operatora.

## 1. Uloge

- **Developer/release author:** priprema kod, migracije, testove i paket.
- **Vendorski Webshop:** prodaje License Server kao zaseban add-on pored Webshop
  add-on-a i nakon plaćanja pokreće Master fulfillment za odgovarajući ključ.
- **Master operator:** kreira/importuje/publikuje plaćeni add-on release.
- **Deployment operator/worker:** instalira odobren paket na ciljnu CMS
  instalaciju.
- **Customer administrator:** aktivira kupljenu licencu, potvrđuje backup i
  funkcionalni smoke test.

Jedna osoba može imati više uloga u razvoju, ali audit događaji ostaju odvojeni.

## 2. Pre-release uslovi

1. Svi dokumenti i javni ugovori odgovaraju implementaciji.
2. Root CMS, add-on i relevantni Webshop repo nemaju neobjašnjene promene.
3. Verzija, manifest, changelog, schema version i compatibility range su
   usklađeni.
4. Nijedna migracija nije destruktivna bez odobrenog plana/backup-a.
5. Nema development secret-a, bypass-a ili privatne putanje u artefaktu.
6. Security/dependency/license scan nema neodobren critical/high nalaz.
7. Test rezultati su vezani za konkretan commit i package digest.
8. Production env/secrets se proveravaju po imenima/prisustvu, bez ispisivanja
   vrednosti.

## 3. Lokalni verification gate

Iz `.private/license-server-addon` izvršiti postojeće ekvivalente:

```powershell
npm ci
npm run build:local
npm run test:db:local
npm run install:verify:next
npm run install:verify:next:db
npm run pack:verify
```

Za production release authority koristi se odobreni release build, ne
`run-with-local-release-authority` pomoćni wrapper. Sačuvati:

- test summary;
- `npm pack --dry-run` listu;
- tarball SHA-256;
- release manifest/provenance/SBOM digest;
- migration checksums;
- commit SHA i Node/npm/Next verzije.

## 4. Artefakt gate

Raspakovati finalni tarball u čist privremeni direktorijum i proveriti:

- samo manifestom dozvoljeni fajlovi;
- nema `.env`, source map-a sa tajnama, test baze ili privatnog ključa;
- `dist/server.js` je učitljiv pod `react-server` uslovom;
- puni admin UI i capability/jobs postoje iz release entrypoint-a;
- migration manifest nije prazan kada release menja schema-u;
- package name/version/digest se poklapaju sa potpisanim release zapisom;
- isolated Next.js 16.3 host build i start prolaze iz tarball-a, ne workspace
  source-a.

Prompt 02 as-built paket već sadrži neprazan `migrations.json` sa schema verzijama
1 i 2, stvarne SQL fajlove i release digest koji ih obuhvata. Tačni checksumovi i
test komande su u
[`13-prompt-02-migration-evidence.md`](./13-prompt-02-migration-evidence.md).

Prompt 03 je dodatno zaključao jedan development/release entrypoint, puni admin
dashboard i čist tarball Next 16.3 build/start/render. Komande, digest-i, tačne
renderovane putanje i vendorski paid-order dokaz nalaze se u
[`14-prompt-03-release-parity-evidence.md`](./14-prompt-03-release-parity-evidence.md).

Prompt 04 podiže package schema version na 3. Migracija
`0003_product_profiles_and_claim_schemas.sql` aditivno backfill-uje početne
objavljene Profile revizije i ne menja nijedan `license_server_licenses`
snapshot. Za pravi SHA-256 legacy backfill koristi tačno allowlist-ovani
`pgcrypto` u `public` schema-i: target provisioner ga unapred proverava/instalira,
a migracija isti zahtev ponavlja idempotentno pod advisory lock-om. Package
checksum, DB fixture i domain/admin dokazi su u
[`15-prompt-04-profile-claims-evidence.md`](./15-prompt-04-profile-claims-evidence.md).

Prompt 05 podiže package schema version na 4. Migracija
`0004_durable_operation_engine.sql` aditivno proširuje postojeće operation i
receipt modele; checksum je deo istog potpisanog release inventory-ja. Durable
worker koristi bounded DB lease/`SKIP LOCKED`, a dead-letter replay čuva isti
operation key i payload hash. Reveal-once traži dostupnu add-on encryption
tajnu, vraća plaintext samo uspešnom kontrolisanom pozivaocu i auditira pristup;
plaintext se ne upisuje u receipt JSON, metadata, log ili error. Tačni testovi i
digest su u
[`16-prompt-05-operation-engine-evidence.md`](./16-prompt-05-operation-engine-evidence.md).

Prompt 06 ne menja schema verziju: postojeće issuer/key/license snapshot kolone
već nose potreban model. Release sada obavezno sadrži CMS-nezavisni verifier,
`.nrls.json` envelope implementaciju i language-neutral JSON vektore; svi su deo
artifact digest-a i tarball allowlist/secret scan-a. Tačan dokaz je u
[`17-prompt-06-assertion-evidence.md`](./17-prompt-06-assertion-evidence.md).

## 5. Master release

Master zapis za add-on sadrži najmanje:

- addon key `license-server`;
- semantic version;
- CMS compatibility range;
- package locator/digest/size;
- release manifest i signing `kid`;
- provenance/SBOM/migration digest;
- status draft/published/revoked;
- rollout channel i release notes.

Redosled:

1. import/verifikacija draft release-a;
2. staging entitlement instalacija;
3. staging install/upgrade/E2E;
4. operator pregleda digest i dokaze;
5. eksplicitno publish odobrenje;
6. canary availability;
7. tek nakon canary gate-a širi rollout.

Master licenca samo daje pravo korišćenja add-on-a. Customer issuer key se kreira
na customer instalaciji i ne uploaduje se Master-u.

## 6. Fresh install

1. Kupiti zasebnu License Server add-on ponudu u vendorskom Night Raven CMS
   Webshop-u; vendor paid order mora izdati `NRLS-...` ključ za
   `addonKey: "license-server"`.
2. Preflight CMS/DB/storage/worker/compatibility i raspoloživ prostor na ciljnom
   CMS-u.
3. Otvoriti **Dashboard → License Server**, uneti kupljeni ključ i izabrati
   aktivaciju, istim korisničkim tokom kao u **Dashboard → Webshop**.
4. Potvrditi da je entitlement vezan za tačan installation fingerprint/domen i da
   je CMS prešao u `install_pending`.
5. Dobiti kratkoživeći, single-use install token.
6. Worker preuzima zasebno allowlist-ovan License Server paket, proverava
   potpis/digest i priprema novu release putanju.
7. Backup trenutnog CMS config/DB stanja.
8. Pokrenuti add-on migracije pod advisory lock-om.
9. Atomarno promeniti build-time registry i redeploy hosta.
10. Proveriti addon state `ready`, dashboard i API health.
11. Inicijalizovati customer issuer identity i odmah napraviti zaštićen backup.
12. Kreirati ograničen test Product/Profile i izdati/validirati test licencu.
13. Uključiti scheduler/outbox i proveriti metrike/alarme.

Customer Webshop add-on nije preduslov za ovaj install. „Isti tok kao Webshop”
znači isti CMS purchase/activation/managed-redeploy obrazac, ne instalaciju jednog
add-on-a unutar drugog.

Install token se ne čuva u CMS bazi, logu ili shell history-ju duže od potrebnog.

## 7. Upgrade

1. Pročitati breaking/migration/key format napomene.
2. Proveriti backup i poslednju uspešnu restore probu.
3. Zaustaviti ili drain-ovati job claim samo koliko migration plan zahteva.
4. Instalirati novu verziju u novu release putanju.
5. Pokrenuti forward migracije pod lock-om.
6. Build/redeploy sa novim registry-jem.
7. Smoke: admin, issuer/keyset, catalog, local capability, remote HMAC, runtime
   validate i pending outbox recovery.
8. Canary period pratiti error/latency/duplicates/dead-letter.
9. Zadržati prethodne binarne release-e prema retention planu.

Već preuzeta operation lease mora biti bezbedno nastavljiva ili isteći i biti
ponovo preuzeta; upgrade ne sme izdati duplikat.

## 8. Rollback i forward-fix

Prioritet je rollback aplikacionog release-a na prethodni paket ako je schema
backward-compatible. Destruktivni DB down migration se ne pokreće automatski.

Ako je nova migracija unapredila schema-u:

- koristiti prethodno testiran compatibility window; ili
- objaviti forward-fix verziju; ili
- obnoviti konzistentan backup samo uz formalnu odluku i prihvaćen gubitak posle
  RPO tačke.

Rollback ne menja issuerRef i ne generiše novi signing ključ. Master release se
po potrebi povlači da spreči nove instalacije, ali već postojeći customer podaci
se ne brišu.

## 9. Entitlement outage/degraded mode

- kratkotrajni Master outage koristi poslednji validni signed entitlement do
  definisanog grace-a;
- customer application validation ne pravi poziv Master-u;
- po isteku entitlement/grace-a add-on prelazi u dokumentovani
  `edit_existing_only` režim;
- novo izdavanje/publish/client creation se blokira;
- backup/export, audit i bezbedan pristup postojećim licencama ne smeju biti
  zarobljeni bez recovery puta;
- ponovno validan entitlement vraća `ready` bez reinstalacije ili promene
  customer issuer-a.

## 10. Key recovery

### Normalna rotacija

1. potvrditi backup i keyset cache policy;
2. kreirati novi Ed25519 ključ;
3. atomarno postaviti novi `activeSigningKid`;
4. stari prebaciti u `verification_only`;
5. objaviti novi keyset revision;
6. testirati novi i stari assertion;
7. povući stari javni ključ tek posle maksimalnog assertion TTL-a plus oba
   clock-skew prozora; proveriti da nakon tog trenutka keyset više ne sadrži stari
   `kid`.

### Restore

1. izolovati cilj i potvrditi da nema različitog issuerRef;
2. koristiti auditovani A256GCM export i zaseban 32-byte backup key; outer
   envelope ne sme sadržati PEM/private key;
3. obnoviti DB/ključeve i proveriti envelope autentikaciju, keypair-e,
   `issuerRef` i monotoni keyset revision;
4. validirati istorijski test assertion;
5. izdati novi test assertion;
6. tek tada vratiti traffic.

Ako descriptor vrati `recovery_required`, zaustaviti novo signing/issue, sačuvati
DB i audit dokaz i pokrenuti eksplicitni restore ili odobrenu rotaciju. Sam
descriptor/read ne sme kreirati zamenski issuer ili ključ.

### Compromise

Zaustaviti signing/issue, rotirati ključ, objaviti emergency keyset/revocation
signal, pregledati audit period, opozvati/reissue pogođene licence i obavestiti
integratore da urade online refresh. Obična rotacija nije dovoljan incident plan.

## 11. Post-deploy smoke

- dashboard iz finalnog paketa prikazuje sve module;
- health/issuer/keyset vraćaju očekivani issuer i contract verziju;
- catalog HMAC scope i ETag rade;
- local capability radi samo kada je zaseban add-on `ready`;
- jedan issue retry daje jednu licencu/receipt;
- reveal/download ne curi u log;
- activate/validate/deactivate i limit rade;
- refund/revoke menja online odluku;
- scheduler obrađuje retry i vidi se dead-letter;
- Master revalidation ne menja customer issuer;
- backup artefakt je napravljen i njegova lokacija/retention evidentirani.

## 12. Rollout evidencija

Za svaki rollout čuvati:

- release ID/version/commit/package digest/signing kid;
- ciljnu CMS installation ID i prethodnu verziju;
- migration ID-eve/checksum-e;
- backup ID i restore-test datum;
- početak/kraj, operatera i odobrenje;
- test/smoke rezultate;
- metrike tokom canary perioda;
- rollback/incident odluke.

Release je završen tek kada su evidence i monitoring gate zatvoreni, ne samo kada
je `npm publish` ili redeploy komanda uspela.
