# Night Raven CMS — GPT-5.6 Sol Architecture, Security and Integration Review Prompt

Radi kao **Principal Software Architect, Senior Application Security Engineer i senior TypeScript/Next.js code reviewer**. Potrebno je da izvršiš veoma detaljnu, skeptičnu i praktičnu analizu arhitekture i implementacije Night Raven CMS-a, njegovih komercijalnih addona i centralnog license servera.

Nemoj raditi samo površni pregled foldera ili prepričavanje koda. Prati stvarne tokove izvršavanja, API pozive, autentifikaciju, pristup bazi, aktivaciju addona, proveru licenci, payment/webhook tokove i ponašanje sistema u slučaju grešaka.

## 1. Kontekst projekta

Glavni projekat je:

`D:\nr_cms`

To je **Night Raven CMS**, baziran na Next.js-u, TypeScript-u i PostgreSQL-u.

CMS je osnovni proizvod, dok se komercijalne funkcionalnosti isporučuju kroz privatne addone.

Privatni projekti se nalaze u:

`D:\nr_cms\.private`

Potrebno je da analiziraš sledeće komponente:

### A. Night Raven CMS

Putanja:

`D:\nr_cms`

Ovo je osnovni CMS na koji se addoni instaliraju i sa kojim se integrišu.

Treba proveriti:

- kako CMS otkriva i učitava addone;
- kako addon registruje svoje rute, API endpoint-e, admin stranice, menije, dozvole, modele, migracije i konfiguraciju;
- da li postoji jasan i stabilan addon contract;
- koliko su addon i CMS međusobno povezani;
- da li addon direktno zavisi od internih detalja CMS-a;
- da li promena CMS-a može lako pokvariti addon;
- kako se proverava kompatibilnost verzije addona i CMS-a;
- kako se addon instalira, aktivira, deaktivira, ažurira i eventualno uklanja;
- da li privatni kod slučajno može završiti u javnom CMS repozitorijumu ili public buildu.

### B. `webshop` komercijalni addon

Putanja:

`D:\nr_cms\.private\webshop`

`webshop` je plaćeni addon koji korisnik može kupiti i instalirati na svoju Night Raven CMS instalaciju.

Pored standardnih webshop funkcija, moja lična instalacija ovog addona na:

`https://nrcms.com`

koristiće se kao prodavnica kroz koju ću prodavati Night Raven komercijalne addone:

- `webshop`
- `license-server-addon`

Kada kupac kupi jedan od tih addona, `webshop` instaliran na `nrcms.com` treba da komunicira sa mojim centralnim license serverom na:

`https://license-server.nrcms.com`

Centralni license server treba da generiše i upravlja licencom za kupljeni addon.

Proveri da li trenutna implementacija `webshop` addona pravilno podržava ovaj scenario.

### C. `license-server-addon` komercijalni addon

Putanja:

`D:\nr_cms\.private\license-server-addon`

Ovo je takođe plaćeni Night Raven CMS addon.

Njega kupuje korisnik koji želi da kroz svoju CMS instalaciju:

- generiše licence za svoje proizvode;
- prodaje svoje licencirane proizvode;
- aktivira licence;
- proverava validnost izdatih licenci;
- produžava ili ukida licence;
- upravlja istekom, suspenzijom i opozivom licenci;
- eventualno poveže licence sa svojim webshop proizvodima i narudžbinama.

Veoma je važno razlikovati dve uloge ovog addona:

1. `license-server-addon` je proizvod koji ja prodajem i koji mora imati sopstvenu validnu Night Raven licencu.
2. Kada se aktivira kod kupca, taj addon postaje njihov sistem za izdavanje licenci za njihove proizvode.

Dakle, `license-server-addon` mora preko mog centralnog license servera da proverava da li sam addon ima validnu licencu, ali podaci o licencama koje kupac izdaje svojim korisnicima pripadaju kupcu i ne bi trebalo automatski da završavaju na mom centralnom license serveru.

Posebno proveri da li kod pravilno odvaja ova dva nivoa licenciranja i da li postoji rizik od:

- mešanja mojih licenci i licenci korisnika addona;
- curenja podataka između različitih vlasnika licenci;
- pogrešne tenant izolacije;
- rekurzivnih ili nejasnih license validation tokova;
- korišćenja mog centralnog servera za podatke koji treba da ostanu kod korisnika;
- konflikta između licence samog addona i licenci koje addon izdaje.

### D. Moj privatni centralni `license-server`

Putanja:

`D:\nr_cms\.private\license-server`

Ovaj projekat nije addon koji će koristiti krajnji korisnici.

To je moj privatni, first-party centralni license server koji ću koristiti samo ja za:

- generisanje licenci za `webshop`;
- generisanje licenci za `license-server-addon`;
- aktivaciju tih licenci;
- proveru validnosti;
- produženje licence;
- opoziv i suspenziju;
- eventualno vezivanje licence za kupca, order, subscription, domen ili instalaciju;
- određivanje prava na nove verzije i update-e addona.

Planirano je da bude hostovan odvojeno na:

`https://license-server.nrcms.com`

Moja Night Raven prodavnica biće hostovana na:

`https://nrcms.com`

`webshop` na `nrcms.com` treba server-to-server komunikacijom da poziva `license-server.nrcms.com`.

Ne želim da CMS ili frontend direktno pristupaju bazi centralnog license servera.

## 2. Glavni cilj analize

Utvrdi da li je postojeća implementacija u skladu sa ovim planom i da li su odgovornosti četiri komponente pravilno razdvojene.

Nemoj pretpostaviti da je nešto implementirano samo zato što postoji naziv fajla, interfejs, komentar, dokumentacija ili TODO.

Za svaki važan tok utvrdi:

- da li stvarno postoji;
- gde počinje;
- koje module poziva;
- koji API endpoint koristi;
- kako se autentifikuje;
- koje podatke šalje;
- gde se podaci čuvaju;
- kako se rezultat vraća;
- kako se obrađuju greške;
- šta se dešava pri ponovljenom zahtevu;
- šta se dešava pri timeout-u ili delimičnom neuspehu.

## 3. Prvo napravi mapu stvarne arhitekture

Pregledaj strukturu sva četiri projekta i identifikuj:

- aplikacione entry point-e;
- addon loader ili registry;
- addon manifest fajlove;
- package zavisnosti;
- shared pakete;
- API klijente;
- API rute;
- server actions;
- webhook endpoint-e;
- middleware;
- auth sloj;
- permission i role sistem;
- Drizzle ili druge DB šeme;
- migracije;
- cron i background job logiku;
- konfiguracione i environment varijable;
- license validation middleware;
- payment integration sloj;
- frontend i server-side license checks;
- testove;
- deployment konfiguraciju;
- Git i build granice između javnog i privatnog koda.

Napravi Mermaid dijagram stvarne arhitekture i komunikacije između komponenti.

Dijagram treba da prikaže najmanje:

- Night Raven CMS;
- instalirani `webshop` addon;
- instalirani `license-server-addon`;
- `nrcms.com`;
- `license-server.nrcms.com`;
- baze podataka;
- kupca addona;
- administratora;
- payment provider;
- webhook tok;
- license creation;
- activation;
- validation;
- renewal;
- revocation.

Odvojeno prikaži:

1. moj first-party tok prodaje Night Raven addona;
2. tok u kojem kupac koristi `license-server-addon` da licencira svoje proizvode.

## 4. Analiza integracije addona sa CMS-om

Detaljno proveri kako se `webshop` i `license-server-addon` integrišu sa Night Raven CMS-om.

Posebno proveri:

### Addon lifecycle

- instalacija;
- inicijalna konfiguracija;
- aktivacija;
- deaktivacija;
- ažuriranje;
- DB migracije;
- rollback;
- uklanjanje;
- čišćenje podataka;
- ponašanje kada licenca istekne;
- ponašanje kada centralni license server nije dostupan.

### Registracija funkcionalnosti

- admin stranice;
- dashboard navigacija;
- API rute;
- frontend rute;
- permission-i;
- role provere;
- feature flagovi;
- background poslovi;
- webhook handler-i;
- modeli i tabele;
- global settings;
- forme;
- email template-i;
- cron poslovi.

### Coupling

Pronađi mesta gde addon:

- direktno importuje interne CMS module koji nisu stabilan javni API;
- zavisi od konkretnih putanja unutar CMS-a;
- menja core CMS fajlove;
- zahteva ručno kopiranje koda;
- duplira CMS funkcionalnost;
- može biti pokvaren promenom CMS verzije;
- može pokvariti CMS kada nije instaliran ili nije pravilno konfigurisan.

Predloži jasniji addon SDK, contract, manifest ili adapter sloj tamo gde je to potrebno.

### Server-side zaštita

Proveri da li se licenca proverava samo kroz skrivanje UI elemenata ili postoji stvarna server-side autorizacija.

Korisnik ne sme moći da zaobiđe licencu tako što će:

- direktno pozvati API endpoint;
- izmeniti frontend JavaScript;
- ukloniti UI proveru;
- ručno otvoriti admin rutu;
- pozvati server action;
- promeniti vrednost u local storage-u, cookie-ju ili klijentskom state-u;
- falsifikovati odgovor license servera.

## 5. Analiza kompletnog toka kupovine i izdavanja licence

Prati kompletan tok:

1. Kupac izabere `webshop` ili `license-server-addon`.
2. Kupac završi checkout.
3. Payment provider potvrdi plaćanje.
4. `webshop` primi i verifikuje webhook.
5. Order dobije odgovarajući status.
6. `webshop` server-to-server pozove `license-server.nrcms.com`.
7. Centralni license server kreira licencu.
8. Licenca se vezuje za odgovarajućeg kupca, proizvod, order i plan.
9. Kupac dobije license key ili activation podatke.
10. Kupac instalira addon.
11. Addon aktivira licencu.
12. Addon periodično proverava licencu.
13. Licenca se produžava, suspenduje, ističe ili opoziva.
14. Prava na update se odobravaju ili odbijaju.

Za svaki korak navedi:

- gde je implementiran;
- relevantne fajlove i funkcije;
- da li je kompletan;
- da li postoji bezbednosni problem;
- da li postoji race condition;
- da li postoji mogućnost duplog generisanja licence;
- da li je operacija idempotentna;
- kako se radi retry;
- kako se rešava delimični neuspeh;
- da li order može biti označen kao završen iako licenca nije kreirana;
- da li je moguć ručni recovery.

Posebno proveri da li postoji stabilna veza između:

- payment transaction ID-a;
- webhook event ID-a;
- order ID-a;
- order item ID-a;
- product ID-a;
- price ili plan ID-a;
- customer ID-a;
- license ID-a;
- activation ID-a;
- subscription ID-a.

## 6. Security review

Uradi detaljan security review komunikacije između:

- `nrcms.com`;
- `license-server.nrcms.com`;
- instaliranih addona;
- njihovih korisnika;
- payment provider webhook-ova.

Proveri najmanje sledeće:

### Autentifikacija servisa

- da li `nrcms.com` ima poseban server credential za centralni license server;
- da li se taj credential nalazi isključivo na serveru;
- da li može završiti u browser bundle-u;
- da li postoji rotacija credential-a;
- da li se koristi različit credential za development, staging i production;
- da li je moguće precizno opozvati kompromitovan credential;
- da li autentifikacija zavisi samo od CORS-a, domena ili `Origin` header-a, što nije dovoljno.

### Integritet zahteva i odgovora

Proveri potrebu i implementaciju:

- HMAC potpisa;
- asimetričnih digitalnih potpisa;
- timestamp-a;
- nonce-a;
- zaštite od replay napada;
- kratkotrajnog tokena;
- request ID-a;
- idempotency key-a;
- provere da odgovor zaista dolazi od centralnog license servera.

Proceni da li bi arhitektura trebalo da koristi asimetrično potpisane license podatke, gde:

- privatni ključ ostaje samo na centralnom license serveru;
- addon poseduje samo javni ključ;
- addon može lokalno proveriti potpis;
- kompromitovanje addona ne omogućava izdavanje novih validnih licenci.

Nemoj unapred pretpostaviti da je to jedino rešenje, ali proceni da li je za ovaj sistem prikladnije od običnog deljenog secret-a.

### License key bezbednost

Proveri:

- format i entropiju license key-a;
- mogućnost pogađanja ili enumeracije;
- čuvanje license key-a u bazi;
- logovanje punog ključa;
- prikaz u admin interfejsu;
- slanje emailom;
- reset i rotaciju;
- hashovanje ili enkripciju;
- prefix ključa;
- redaction u logovima;
- zaštitu od brute-force validacije.

### API zaštita

Proveri:

- rate limiting;
- brute-force zaštitu;
- input validaciju;
- Zod ili drugi schema validation;
- authorization;
- tenant izolaciju;
- IDOR ranjivosti;
- SSRF;
- SQL injection;
- XSS;
- CSRF;
- CORS;
- session fixation;
- privilege escalation;
- mass assignment;
- leaking kroz error poruke;
- secret leakage;
- log injection;
- dependency rizike;
- nebezbedne webhook endpoint-e;
- nepravilno poverenje u client-supplied podatke.

### Payment webhook bezbednost

Proveri:

- verifikaciju potpisa webhook-a;
- korišćenje originalnog/raw body-ja kada provider to zahteva;
- idempotentnu obradu;
- sprečavanje duple obrade;
- replay protection;
- redosled događaja;
- out-of-order webhook događaje;
- refund;
- chargeback;
- cancellation;
- failed renewal;
- subscription pause;
- ručno produženje;
- vraćanje već iskorišćenog webhook event-a.

Payment success sa frontenda ne sme samostalno biti dokaz da je plaćanje izvršeno.

## 7. License model i business rules

Pronađi trenutni model licenci i proveri da li jasno podržava:

- perpetual licencu;
- vremenski ograničenu licencu;
- subscription licencu;
- trial;
- grace period;
- suspended stanje;
- revoked stanje;
- expired stanje;
- cancelled stanje;
- pending activation stanje;
- maksimalan broj aktivacija;
- deaktivaciju stare instalacije;
- vezivanje za domen;
- vezivanje za CMS installation ID;
- promenu domena;
- staging i development domene;
- localhost;
- wildcard subdomene;
- multi-site korišćenje;
- prava na update;
- kompatibilnost sa verzijama;
- edition ili plan;
- feature entitlements.

Proveri da li su razdvojeni:

- `license status`;
- `subscription status`;
- `payment status`;
- `order status`;
- `activation status`;
- `update entitlement status`.

Ovi statusi ne treba da budu jedna ista vrednost niti automatski sinonimi.

Proceni ponašanje addona kada:

- licenca istekne dok je korisnik prijavljen;
- validation endpoint privremeno ne radi;
- DNS ne radi;
- dođe do timeout-a;
- centralni server vrati 500;
- server vrati nevalidan potpis;
- sistemski sat korisnika nije tačan;
- korisnik kopira bazu na drugi domen;
- korisnik klonira celu instalaciju;
- korisnik pokuša da promeni kod addona;
- korisnik ima validnu licencu, ali nema pravo na novu verziju.

Jasno proceni da li sistem treba da bude fail-open ili fail-closed za različite vrste grešaka.

Nemoj predlagati ponašanje koje bi zbog kratkotrajnog pada mog servera odmah oborilo ceo sajt kupca. Razmotri bezbedan cache, grace period i poslednju uspešnu proveru.

## 8. Posebna analiza `license-server-addon` proizvoda

Ovo je kritičan deo.

Proveri da li `license-server-addon` ima jasnu granicu između:

### Nivo 1: licenca samog addona

To je licenca koju moj centralni server izdaje kupcu kako bi kupac smeo da koristi `license-server-addon`.

### Nivo 2: licence koje kupac izdaje svojim korisnicima

To su licence koje kupac generiše kroz sopstveni instalirani `license-server-addon`.

Podaci nivoa 2 treba da pripadaju kupcu i njegovoj instalaciji, osim ako je izričito implementiran i dokumentovan poseban cloud/SaaS režim.

Proveri:

- da li postoje odvojene DB tabele i modeli;
- da li modeli imaju jasna imena;
- da li se koriste različiti API klijenti;
- da li se koriste različiti cryptographic keys;
- da li se koriste različiti secrets;
- da li se razlikuju issuer, audience i product namespace;
- da li kupac može slučajno generisati licencu koja izgleda kao Night Raven licenca;
- da li korisnička instalacija ikada dobija privatni ključ mog centralnog license servera;
- da li compromise jedne korisničke instalacije ugrožava druge kupce ili moje licence;
- da li svaki kupac ima sopstveni issuer identitet i keys;
- kako se backup-uju i rotiraju njihovi ključevi;
- šta se dešava ako korisnik izgubi privatni ključ;
- kako se sprečava cross-tenant pristup.

Predloži bolje nazive za servise, klase, tabele i domenske entitete ako trenutno ime `license-server`, `license-server-addon`, `license`, `product` ili `customer` izaziva nejasnoću.

Na primer, proceni da li je korisno razdvojiti koncepte poput:

- Night Raven Vendor License Service;
- Addon License Client;
- Customer License Issuer;
- Customer Product License;
- Night Raven Addon Entitlement;
- Addon Activation;
- Customer-Issued Activation.

Nemoj menjati nazive samo estetski. Predloži promene samo kada smanjuju stvarnu arhitektonsku ili bezbednosnu nejasnoću.

## 9. Deployment analiza

Analiziraj planirani deployment:

- Night Raven sa `webshop` addonom: `https://nrcms.com`
- centralni license server: `https://license-server.nrcms.com`

Proveri:

- environment varijable;
- API base URL konfiguraciju;
- production/staging/development razdvajanje;
- TLS;
- CORS allowlist;
- DNS;
- reverse proxy;
- trusted proxy podešavanja;
- cookies i domenske granice;
- SameSite/Secure/HttpOnly;
- CSP;
- secret management;
- Vercel environment secrets;
- baze podataka;
- connection pooling;
- region baze i aplikacije;
- serverless stateless ponašanje;
- timeout-e;
- background job izvršavanje;
- cron;
- retry;
- queue ili outbox potrebu;
- audit log;
- monitoring;
- alerting;
- backup;
- disaster recovery;
- key rotation;
- log redaction.

Centralni license server i `nrcms.com` ne treba da dele session cookie samo zato što koriste isti parent domen, osim ako za to postoji veoma dobar i bezbedno implementiran razlog.

Proveri da li je bolje da komuniciraju isključivo server-to-server API pozivima sa posebnim service credentials.

## 10. Git, package i build granice

Proveri da li:

- `.private` pravilno ostaje van javnog Git repozitorijuma;
- private addon može slučajno završiti u Next.js buildu javnog CMS-a;
- postoje problematični symlink-ovi;
- postoje relative import-i iz javnog u privatni projekat ili obrnuto;
- svaki privatni projekat treba da bude zaseban Git repozitorijum;
- postoje odvojeni `package.json`, lock fajlovi i build procesi;
- addon koristi published package, local package, workspace ili source import;
- build na Vercel-u može pristupiti potrebnom privatnom kodu;
- deployment jednog projekta može neočekivano uključiti drugi;
- secrets mogu završiti u source mapama ili browser bundle-u;
- public CMS može da se build-uje i radi kada privatni addoni nisu prisutni.

Predloži održivu strukturu repozitorijuma i distribucije addona, ali uzmi u obzir da je osnovni CMS javni projekat, a komercijalni addoni moraju ostati privatni.

## 11. Database review

Za sve relevantne DB šeme proveri:

- primarne i strane ključeve;
- unique constraints;
- tenant ID;
- indekse;
- soft delete;
- audit kolone;
- statusne kolone;
- timestamps;
- timezone;
- transakcije;
- izolaciju;
- optimistic locking;
- race conditions;
- idempotency;
- cleanup;
- migracije;
- rollback;
- referencijalni integritet.

Posebno proveri da li baza garantuje da jedan plaćeni order item neće slučajno proizvesti više nezavisnih licenci, osim kada je to eksplicitno dozvoljeno.

Proveri da li operacije poput:

- webhook received;
- payment confirmed;
- license requested;
- license created;
- email queued;
- order completed

imaju pouzdan state machine ili outbox/saga pristup.

## 12. Testovi koje moraš da proceniš ili predložiš

Proveri postojeće testove i predloži nedostajuće:

- unit testove;
- integration testove;
- contract testove između `webshop` i centralnog servera;
- addon compatibility testove;
- E2E testove;
- webhook testove;
- security testove;
- tenancy testove;
- concurrency testove;
- retry testove;
- failure recovery testove;
- migration testove;
- upgrade testove;
- license expiry testove;
- clock skew testove;
- key rotation testove;
- revocation testove;
- refund i chargeback testove.

Obavezno napravi konkretan E2E test plan za:

1. uspešnu kupovinu `webshop` addona;
2. uspešnu kupovinu `license-server-addon` addona;
3. dupli webhook;
4. payment uspešan, license server nedostupan;
5. license kreirana, ali odgovor prema webshopu izgubljen;
6. ponovljeni zahtev sa istim idempotency key-em;
7. refund;
8. chargeback;
9. istek licence;
10. obnova licence;
11. opoziv;
12. promena domena;
13. previše aktivacija;
14. klonirana CMS instalacija;
15. nedostupan centralni server tokom grace perioda;
16. nevalidan ili falsifikovan license-server odgovor;
17. korisnik `license-server-addon` addona izdaje licencu za svoj proizvod;
18. pokušaj pristupa licencama drugog tenant-a.

## 13. Pravila rada tokom analize

Radi prvenstveno read-only analizu.

Nemoj odmah menjati kod.

Ne donosi zaključke na osnovu naziva fajlova. Otvori i prati relevantan kod.

Koristi pretragu kroz sva četiri projekta da pronađeš:

- sve reference na `license`;
- sve reference na `activation`;
- sve reference na `entitlement`;
- sve reference na `webhook`;
- sve reference na `order`;
- sve reference na `subscription`;
- sve reference na `addon`;
- sve API pozive između projekata;
- sve environment varijable;
- sve secrets;
- sve hardkodovane URL-ove;
- sve TODO/FIXME komentare;
- sve mock ili placeholder implementacije.

Ne prikazuj pune secret vrednosti čak i ako ih pronađeš. Redactuj ih u izveštaju.

Nemoj tvrditi da je sistem bezbedan samo zato što koristi HTTPS, JWT, CORS, Clerk ili neku biblioteku. Proveri tačnu implementaciju.

Nemoj predlagati komplikovanu mikroservisnu arhitekturu bez jasnog razloga. Prednost daj najjednostavnijem rešenju koje je bezbedno, pouzdano i održivo.

Razdvoji:

- ono što si stvarno potvrdio u kodu;
- ono što delimično postoji;
- ono što nedostaje;
- ono što ne možeš potvrditi;
- preporučeno buduće poboljšanje.

## 14. Obavezni format završnog izveštaja

Ceo završni odgovor napiši na **srpskom jeziku, latinicom**.

Tehničke nazive, nazive fajlova, funkcija, ruta i kod ostavi u originalnom obliku.

Izveštaj organizuj ovim redosledom:

### 1. Izvršni sažetak

Objasni ukratko:

- kako sistem trenutno radi;
- da li prati opisani plan;
- najveće prednosti;
- najveće rizike;
- da li je spreman za production.

### 2. Potvrđeno razumevanje četiri komponente

Za svaku komponentu objasni njenu stvarnu odgovornost i granicu.

### 3. Stvarna arhitektura

Prikaži Mermaid dijagram i tekstualno objašnjenje.

### 4. Matrica odgovornosti

Napravi tabelu:

| Funkcionalnost | Night Raven CMS | webshop | license-server-addon | centralni license-server |
|---|---|---|---|---|

Za svaku funkcionalnost navedi gde treba da pripada i gde je trenutno implementirana.

### 5. Analiza ključnih tokova

Prikaži stvarni tok:

- kupovine;
- izdavanja licence;
- aktivacije;
- validacije;
- obnove;
- opoziva;
- update entitlement-a;
- korisničkog izdavanja licenci kroz `license-server-addon`.

### 6. Nalazi

Svaki problem navedi u formatu:

- **ID**
- **Severity:** Critical / High / Medium / Low
- **Status:** Confirmed / Probable / Needs verification
- **Komponenta**
- **Fajl i približne linije**
- **Opis**
- **Dokaz iz koda**
- **Posledica**
- **Realni scenario zloupotrebe ili kvara**
- **Predloženi fix**
- **Kompleksnost fixa:** Small / Medium / Large

Nemoj prijavljivati generičke best-practice probleme bez dokaza da su relevantni za ovaj projekat.

### 7. Šta je dobro implementirano

Navedi konkretne pozitivne nalaze sa referencama na kod.

### 8. Šta nedostaje ili je samo delimično implementirano

Jasno razdvoji nepostojeću funkcionalnost od buga.

### 9. Security assessment

Daj posebno mišljenje o:

- service-to-service autentifikaciji;
- potpisivanju licenci;
- zaštiti tajni;
- webhook bezbednosti;
- tenant izolaciji;
- server-side enforcement-u;
- replay napadima;
- brute-force zaštiti;
- audit logovima;
- key management-u.

### 10. Deployment assessment

Proceni spremnost deploymenta na:

- `nrcms.com`;
- `license-server.nrcms.com`.

### 11. Predložena ciljna arhitektura

Predloži minimalnu, praktičnu ciljnu arhitekturu.

Ne redizajniraj ceo sistem ako nije potrebno.

Jasno napiši šta treba:

- zadržati;
- popraviti;
- premestiti;
- odvojiti;
- ukloniti;
- dodati.

### 12. Prioritetni plan popravki

Podeli ga na:

- **P0 – mora pre produkcije**
- **P1 – veoma važno**
- **P2 – preporučeno**
- **P3 – buduće poboljšanje**

Za svaki korak navedi konkretne fajlove ili module koje treba menjati.

### 13. Predlog implementacije

Za najvažnije probleme prikaži:

- predloženi interfejs;
- API contract;
- request i response primere;
- status kodove;
- idempotency pristup;
- model baze;
- pseudokod ili konkretan TypeScript primer;
- predlog migracije postojećih podataka.

Nemoj menjati postojeći kod bez moje posebne naredbe, ali možeš prikazati diff ili patch predlog.

### 14. Test plan

Daj konkretne testove, očekivane rezultate i negativne scenarije.

### 15. Konačna ocena

Daj ocenu od 1 do 10 za:

- arhitekturu;
- integraciju addona;
- security;
- licensing model;
- otpornost na greške;
- održavanje;
- production readiness.

Na kraju napiši jednu od sledećih jasnih presuda:

- **Spremno za produkciju**
- **Spremno uz manje popravke**
- **Nije spremno dok se ne reše P0/P1 problemi**
- **Potreban je značajniji redizajn**

Presudu obrazloži konkretnim činjenicama iz koda.

## 15. Najvažnije pitanje na koje moraš odgovoriti

Na kraju mi potpuno jasno odgovori:

**Da li postojeća arhitektura i implementacija omogućavaju da `webshop` i `license-server-addon` budu zasebni komercijalni Night Raven CMS addoni, dok moj privatni `license-server` na `license-server.nrcms.com` ostaje odvojeni first-party servis koji koristim isključivo za izdavanje i proveru licenci za ta dva addona?**

Takođe odgovori:

- da li su trust boundaries pravilno postavljene;
- da li je dualna uloga `license-server-addon` addona pravilno rešena;
- da li postoji mogućnost da korisničke licence budu pomešane sa Night Raven addon licencama;
- da li `webshop` na `nrcms.com` pouzdano i bezbedno komunicira sa centralnim license serverom;
- šta tačno mora biti popravljeno pre prve stvarne prodaje;
- kojim redosledom treba izvršiti popravke.

Budi direktan, kritičan i konkretan. Nemoj ublažavati nalaze da bi odgovor zvučao pozitivnije. Cilj je da otkrijemo probleme pre produkcije i pre nego što prvi kupac dobije licencu.
