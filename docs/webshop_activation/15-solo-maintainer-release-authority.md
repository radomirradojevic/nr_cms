# 15 — Solo maintainer release authority

## Status i prioritet

**ZAKLJUČENA ODLUKA.** Repo radomirradojevic/webshop je private repo sa jednim
maintainerom. Dok se izričito ne donese nova odluka, ovaj dokument ima
prednost nad starijim zahtevom za GitHub private-release Environment
required-reviewer pravilom u dokumentima 03 i 11.

GitHub required-reviewer gate za private repository nije dostupan na trenutnom
planu. Enterprise se ne uvodi samo radi tog UI koraka. Umesto toga release
authority je jedan namenski, lokalni, operator-kontrolisan računar. Ovo nije
oslabljen automatski publish: privatni signing key i credential za objavu
nikada nisu dostupni GitHub Actions-u.

Odluka važi za svaki production release Webshop paketa, uključujući budući
0.6.0. Local/dev/fixture release-i i dalje nikada nisu production-eligible.

## 1. Granice odgovornosti

| Komponenta | Sme | Ne sme |
| --- | --- | --- |
| GitHub Actions CI | checkout, dependency graph, build, test, npm pack provera, generisanje non-secret evidence artefakta | čitati production private key, čitati publish token, npm publish, kreirati/pushovati tag, kreirati GitHub Release, pisati package |
| Release-authority računar | nezavisno ponoviti proveru, potpisati exact manifest, objaviti exact tarball, kreirati potpisani annotated tag i create-only attestation asset | biti običan dev checkout, koristiti .private iz deploymenta, nastaviti posle failed provere, koristiti local/fixture KID |
| Master import operator | read-only preuzeti immutable evidence i pokrenuti auditovani release import/publish | poverovati CI izlazu bez lokalnog potpisa/registry evidence-a, imati Webshop private signing key |
| Deployment worker | read-only preuzeti i verifikovati već objavljeni paket | imati write:packages, release signing key ili tag/write GitHub credential |

Jedan maintainer ne daje dvostruku ljudsku kontrolu. Zaštita je namerno
razdvajanje ovlašćenja: kompromitovan PR, GitHub workflow ili CI runner ne može
potpisati ili objaviti produkcioni paket, jer nema ni jedan od potrebnih
privatnih credentiala.

## 2. Trajna pravila

1. Production signing key postoji samo na release-authority računaru ili u
   njegovom operator-kontrolisanom HSM/KMS-u. Nije GitHub secret, Actions env,
   self-hosted runner fajl, source repo, npm tarball, CI artifact ni master
   secret.
2. GitHub workflowi imaju najviše read-only repository dozvole koje im zaista
   trebaju. Nijedan workflow nema packages write, contents write niti
   production signing-key/publish-token secret-ref.
   Standardni verification runneri su GitHub-hosted `windows-2025` i
   `ubuntu-24.04`, ne persistent self-hosted računari.
3. Push, pull request i workflow dispatch mogu pokrenuti samo verification.
   Ne mogu napraviti production tag, GitHub Release ili package version.
4. Samo lokalna operator komanda sme pozvati npm publish za
   @radomirradojevic/webshop. Ona objavljuje prethodno verifikovani, imenovani
   .tgz fajl; nikada ne objavljuje direktorijum ili SemVer range.
5. Svaki release je vezan za exact Webshop commit SHA, exact CMS commit SHA,
   package version, tarball SHA-256/SRI, manifest hash, dependency/migration
   hash, CI run URL/ID i production KID. Nema latest, moving master ili
   ponovne upotrebe verzije.
6. Tag je GPG/SSH-potpisani annotated v<exact-version> tag na istom Webshop
   commitu. Tek posle uspešnog package publish-a lokalna authority ga pushuje.
   Tag ili GitHub Release asset nikada se ne overwrite-uju.
7. Neuspeh je fail-closed. Paket bez uspešnog taga/attestation-a nije eligible
   za master import ili deployment. Ne objavljuje se drugi tarball pod istom
   verzijom radi popravke.

## 3. Release-authority računar i credentiali

Pre prvog pravog release-a operator određuje jedan namenski, ažuriran Windows
računar. Predloženi root, van repozitorijuma i van cloud-sync foldera, je:

    D:\nr_release_authority

Njegova struktura je operator-owned i ne commit-uje se:

    D:\nr_release_authority\work\<webshop-commit-sha>
    D:\nr_release_authority\evidence\<release-id>
    D:\nr_release_authority\secrets\webshop-release-signing-key.v1.dpapi
    D:\nr_release_authority\secrets\github-packages-publish-token.v1.dpapi
    D:\nr_release_authority\secrets\webshop-release-tag-signing-ssh.v1
    D:\nr_release_authority\secrets\webshop-release-tag-signing-ssh.v1.pub

Datoteke sa nastavkom .dpapi su versionirani os-secret-ref contract: sadržaj je
zaštićen postojećim Windows DPAPI LocalMachine helperom. Authority se zato
pokreće iz elevated operator sesije, a secret root ima inheritance-disabled ACL
samo za SYSTEM i Administrators. Nema shared Users write dozvole,
reparse/symlink ulaza, backupa u repozitorijumu ili plaintext kopije. Private
signing key se otključava samo u memoriji signing child procesa preko stdin
handle-a; plaintext key fajl se ne ostavlja na disku niti u environment
promenljivama.

Pošto postojeći DPAPI seal helper namerno prihvata jednu redakcijski bezbednu
liniju, ulaz za Webshop signing ref je canonical standard-base64 kodiran PKCS#8
Ed25519 PEM, bez whitespace-a ili završnog newline-a. Authority ga po unseal-u
strict dekodira i šalje samo kroz stdin handle signing child-u; plaintext PEM
se ne snima kao fajl. Publish-token ref je zasebna jedna tekstualna linija.

Četiri credentiala su odvojena:

- Ed25519 release key potpisuje samo ReleaseManifestPayloadV2 i publication
  attestation sa jednim aktivnim production KID-em iz hash pinovanog
  AddonReleaseKeysetV1.
- GitHub Packages publish token je classic PAT sa najmanjim potrebnim
  write:packages pristupom za ovaj package; nije deployment read token i ne
  koristi se za git push.
- Git tag/release credential je odvojeni Git/SSH ili GitHub credential u
  Windows Git Credential Manager-u, odnosno GPG/SSH agentu. Ima pravo da
  napravi potreban tag/release zapis u webshop repou i ne prosleđuje se npm-u.
- Git tag signing key je zaseban Ed25519 SSH ključ. Privatni deo ostaje samo
  u operator-only authority secret rootu (SYSTEM i Administrators, bez
  nasleđivanja ACL-a); javni deo se create-only registruje kao GitHub SSH
  signing key. Authority pre tagovanja proverava par ključeva i da GitHub
  registruje baš isti javni ključ. Ne koristi JWS release key za Git tag i ne
  prihvata ambientni `user.signingkey`.

CI dodatno dobija zaseban `NR_CMS_READ_TOKEN`: fine-grained GitHub token koji
može čitati samo privatni `radomirradojevic/nr_cms` repo (`Contents: Read-only`).
On je GitHub Actions repository secret u Webshop repou, nije authority secret,
nema packages/write dozvole i nikada ne sme biti korišćen za publish. Publish
token ostaje classic PAT, jer GitHub Packages npm autentikacija koristi taj
token tip; treba mu samo `write:packages`, bez `delete:packages` i bez
proširivanja postojećeg interaktivnog `gh` tokena.

Pre stvarnog korišćenja svaki credential se proverava u izolovanom,
redigovanom preflightu. Njegova vrednost, putanja protected fajla, CLI argument,
environment dump i log nikada ne sadrže secret. Public keyset, njegov SHA-256 i
KID nisu secret, ali su integrity-sensitive i menjaju se isključivo kroz
postojeći chained keyset/rotation contract iz dokumenta 03.

### 3.1 Prvi credential setup

1. CI token se kreira kao fine-grained PAT pod imenom `nr-webshop-ci-cms-read`,
   sa resource owner `radomirradojevic`, pristupom samo repou `nr_cms` i
   `Contents: Read-only` dozvolom. Kopira se direktno u Webshop repository
   Actions secret `NR_CMS_READ_TOKEN`; ne prolazi kroz lokalni fajl, `.env`,
   chat ili release-authority root.
2. Publish token se kreira kao zaseban **classic** PAT pod imenom
   `nr-webshop-local-publisher`, sa `write:packages` i bez `delete:packages`,
   `workflow` ili drugih nepotrebnih scope-ova. Postojeći interaktivni `gh`
   token se ne proširuje i ne koristi za npm publish.
3. Iz elevated Administrator PowerShell sesije, iz čistog Webshop checkouta,
   operator pokreće:

       powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\provision-release-authority-publish-token.ps1

   Skripta prihvata classic PAT samo kao skriveni `SecureString`, odbija
   newline/fine-grained token i existing secret-ref, pa kreira operator-only
   DPAPI LocalMachine `github-packages-publish-token.v1.dpapi`. Ne postoji
   plaintext token fajl, overwrite ni `--force` putanja.
4. Nakon Git for Windows 2.34+ i `gh auth refresh --scopes
   write:ssh_signing_key`, operator iz elevated Administrator PowerShell
   sesije pokreće:

       powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\provision-release-authority-tag-signing-key.ps1

   Zatim iz normalne operator sesije pokreće:

       npm run release:authority:register-tag-signing-key

   Prva komanda je create-only i lokalno pravi namenski Ed25519 SSH ključ sa
   operator-only ACL-om. Druga samo registruje njegov javni deo u GitHub-u;
   ponavljanje je idempotentno samo kada GitHub već sadrži isti ključ. `gh`
   credential za ovu registraciju zahteva `write:ssh_signing_key`, ne sme se
   koristiti za npm publish i ne čuva se u authority secret rootu.

## 4. Ciljna implementacija komandi

Sledeća imena su TARGET interfejs. Ne tvrde da su danas sve komande
implementirane; pre 0.6.0 moraju biti dodate, testirane i dokumentovane u
.private/webshop.

| Komanda | Izvršavanje | Svrha |
| --- | --- | --- |
| npm run release:ci:verify -- --webshop-sha <SHA> --cms-sha <SHA> | GitHub Actions | read-only Windows x64 + clean host verification; emituje immutable non-secret candidate evidence |
| npm run release:authority:preflight -- --webshop-sha <SHA> --cms-sha <SHA> --ci-run <URL> | release-authority | preuzima/validira CI evidence, clean source i trust material, bez potpisa/publish-a |
| npm run release:authority:publish -- --webshop-sha <SHA> --cms-sha <SHA> --ci-run <URL> | release-authority | ponavlja sve provere, gradi/potpisuje exact tarball, objavljuje ga, potom pravi tag i attestation |
| npm run release:authority:reconcile -- --release-id <UUID> | release-authority | jedini recovery put za uspešno objavljen paket čiji tag ili asset korak nije završen |

Komande prihvataju samo validne 40-lowercase-hex SHA vrednosti i apsolutne,
regularne, non-symlink evidence putanje pod authority rootom. Ne prihvataju
key, raw token, arbitrary registry URL, arbitrary tag, source path, SQL ili
override/skip flag. Stvarna implementacija koristi operator-credential
broker/secret-ref, ne .env fajl.

### 4.1 Šta CI dokazuje

CI se pokreće nad exact commitom i verzijom, bez production credentiala. Mora:

1. proveriti repository/ref identitet i da Webshop SHA pripada odobrenoj release
   grani, a CMS SHA dozvoljenom pinovanom ref-u;
2. na stvarnom Windows x64 okruženju proizvesti i proveriti canonical
   release-dependency-lock.json;
3. uraditi frozen install bez lifecycle skripti, lint/typecheck/test,
   release check, verify npm pack i clean Next host install proveru;
4. emitovati JCS candidate evidence: source SHA-eve, package version,
   artifact/dependency/migration hash-eve, test command rezultate, runner
   identitet i SHA-256 svakog artefakta;
5. odbiti local/fixture KID, unsafe tar putanju, source/.env/private-key leak i
   nedeterministički rezultat.

CI evidence je dokaz testa, ne signing authority. Release-authority ponovo
računa i upoređuje sve security-relevant hash-eve; mismatch je incident, ne
razlog za lokalni override.

### 4.2 Šta lokalna authority proverava i radi

Preflight prvo proverava da je CI run baš za isti repo, Webshop SHA, CMS SHA i
verziju i da je uspešan. Zatim iz clean archive checkouta, a ne iz
D:\nr_cms\.private\webshop radnog stabla, ponavlja pack/install/hash provere.
Obavezno proverava:

- prazan worktree i isti HEAD/commit objekat;
- da package version i v<version> još ne postoje u registryju odnosno kao
  remote tag;
- da je production KID aktivan, vremenski važeći, na allowlisti i da se
  public-keyset hash slaže sa pinom;
- candidate evidence hash, migration descriptor/SQL/postcondition hash,
  Windows dependency graph i full artifact inventory;
- da nema source, .env, credentiala, private key-a, ADS/link/traversal putanje
  ili neinventarisanog fajla u finalnom tarballu;
- reproducibilnost svih non-signature release vrednosti u odnosu na CI evidence.

Tek tada komanda dobija kratkotrajni in-memory handle za signing key i od njega
pravi finalni signed manifest i tarball. Npm publish dobija publish token samo
u one-shot child procesu preko privremenog user config-a koji se posle briše.
Niti parent proces, niti CI evidence, niti tarball ne dobijaju token.

Local authority **ne šalje** `npm publish --provenance`: npm provenance zahteva
podržani cloud CI/CD runner, dok je ovaj namerno operator-kontrolisani lokalni
publish tok za private GitHub Packages. Umesto lažne provenance tvrdnje,
authority obavezno isporučuje potpisani `ReleaseManifestPayloadV2`, SBOM,
Windows dependency graph, registry read-back SHA/SRI i create-only potpisani
`release-publication-attestation.json`. Ako se u budućnosti uvede zaseban
podržani cloud publish tok, on mora imati novi threat-model i ne sme dobiti
ovaj local signing key ili publish token.

Posle uspešnog registry odgovora authority read-back-om proverava package
version ID, exact tarball SHA/SRI i attested publishedAt. Iz toga pravi i
potpisuje detached release-publication-attestation.json. Tek sada kreira
GPG/SSH-potpisani annotated v<version> tag na već provereni Webshop SHA,
pushuje samo taj tag, i create-only dodaje attestation kao GitHub Release asset.
Lokalni evidence direktorijum trajno čuva redigovan receipt sa svim hash-evima,
KID-em, GitHub package-version ID-em, tag SHA-om i vremenima.

## 5. Normalan release tok

1. Maintainer poveća SemVer, commituje Webshop i kompatibilni CMS kod i pushuje
   source commit.
2. Pokreće read-only CI verification za exact Webshop i CMS SHA. Push/PR
   proveravaju isti tip gate-a, ali ne mogu promovisati release.
3. Pregleda zeleni CI rezultat, source SHA-eve i candidate evidence.
4. Na release-authority računaru pokreće preflight nad tim istim SHA-evima i CI
   runom.
5. Ako je preflight zelen, eksplicitno pokreće publish. To je jedina svesna
   production odluka jednog maintainer-a.
6. Komanda potpisuje, objavljuje exact immutable package, read-back-om
   potvrđuje registry evidence, pushuje signed tag i dodaje create-only
   attestation asset.
7. Tek tada se immutable evidence read-only prenosi na master operatora za
   odvojeni release import pa release publish. To je poseban katalog korak;
   package publish sam po sebi ne aktivira CMS.

## 6. Neuspeh, retry i opoziv

Cross-system publish i tag nisu atomska transakcija. Zato receipt vodi state:

    preflighted -> package_published -> tag_pushed -> attestation_published

- Pre package_published: nakon otklanjanja uzroka može se ponoviti pun
  preflight/publish.
- Posle package_published, a pre taga: ne radi se novi npm publish i ne menja
  se tarball. Authority blokira master import/deployment, čuva exact receipt i
  dozvoljava samo reconcile da ponovo proveri isti
  package/version/SHA/manifest, pa napravi nedostajući tag. Ako je registry
  prihvatio publish, ali je proces pukao pre create-only
  `package_published.json` receipt-a, reconcile sme prvo da koristi samo
  postojeći `preflighted.json`, jedini regularni authority tarball i
  token-autorizovan registry read-back. Tek kada package-version ID, publishedAt
  i byte-identičan tarball SHA/SRI prođu, on create-only upisuje isti receipt i
  nastavlja. Bilo koji missing/drifted/drugi tarball ili keyset mismatch ostaje
  incident; nema republish-a niti ručnog pravljenja receipt-a.
- Posle taga, a pre attestation asseta: reconcile sme create-only dodati
  nedostajući asset za isti release ID i hash. Postojeći drugačiji asset je
  incident, nikada overwrite.
- Ako je signing key ili publish credential kompromitovan, slediti incident
  runbook 10: revoke credential/KID, povući pogođene master release redove i
  nikada ne prepisivati već objavljenu package verziju.

## 7. Obavezne provere pre prve implementacije

Pre prvog pravog release-a dopuniti workflow i lokalni CLI tako da testovi
dokažu sledeće:

- CI job nema packages write/contents write, production key niti publish token;
  fixture koji traži bilo koji od njih pada.
- običan push, PR i workflow dispatch ne mogu pozvati npm publish, git tag,
  git push tag ili GitHub Release create API;
- authority CLI odbija stale/pogrešan CI run, drugačiji SHA, već postojeću
  package verziju/tag, inactive/local KID i bilo koji candidate hash mismatch;
- publish child ne ostavlja token u procesu, logu, npm cache-u, evidence-u ili
  tarballu;
- samo authority može dovesti release receipt do attestation_published, a
  reconcile je idempotentan i ne clobberuje postojeće GitHub/npm stanje;
- master import odbija paket bez validnog local-authority potpisa, registry
  read-back evidence-a, signed taga i detached attestation-a.

Dok ovi testovi i komande ne postoje, 0.6.0 se ne taguje i ne objavljuje.

## 8. Buduća promena odluke

Ako repo dobije više maintainer-a ili GitHub Enterprise, može se dodati
obavezno nezavisno reviewer odobrenje. To je nova, verzionirana odluka:
ažuriraju se ovaj dokument, dokument 03, workflow dozvole i threat model;
production key se i tada ne vraća automatski u običan CI runner bez zasebne
bezbednosne revizije.
