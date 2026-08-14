# 09 — Release, instalacija, upgrade i recovery runbook

Ovo je ciljni production runbook za **License Server add-on**. Ne izvršava se
automatski čitanjem dokumenta. Publish, Master release promena i customer
redeploy zahtevaju eksplicitno odobrenje operatora.

## 1. Uloge

- **Developer/release author:** priprema kod, migracije, testove i paket.
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

1. Preflight CMS/DB/storage/worker/compatibility i raspoloživ prostor.
2. Aktivirati entitlement za tačan installation fingerprint/domen.
3. Dobiti kratkoživeći, single-use install token.
4. Worker preuzima paket, proverava potpis/digest i priprema novu release putanju.
5. Backup trenutnog CMS config/DB stanja.
6. Pokrenuti add-on migracije pod advisory lock-om.
7. Atomarno promeniti build-time registry i redeploy hosta.
8. Proveriti addon state `ready`, dashboard i API health.
9. Inicijalizovati customer issuer identity i odmah napraviti zaštićen backup.
10. Kreirati ograničen test Product/Profile i izdati/validirati test licencu.
11. Uključiti scheduler/outbox i proveriti metrike/alarme.

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
7. povući stari javni ključ tek posle maksimalnog bezbednog roka.

### Restore

1. izolovati cilj i potvrditi da nema različitog issuerRef;
2. obnoviti DB + šifrovane ključeve + odgovarajući wrapping key;
3. proveriti checksum i issuerRef;
4. validirati istorijski test assertion;
5. izdati novi test assertion;
6. tek tada vratiti traffic.

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
