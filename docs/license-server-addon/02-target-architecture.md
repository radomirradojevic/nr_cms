# 02 — Ciljna arhitektura

## 1. Komponente i odgovornost

### A. Centralni Master License Server

Privatni sistem autora Night Raven CMS-a:

- prodaje licencu za `webshop`, `license-server` i buduće add-on-e;
- aktivira entitlement na CMS installation fingerprint i dozvoljeni domen;
- izdaje kratkoživeći install token deployment worker-u;
- periodično potvrđuje pravo korišćenja add-on-a;
- može add-on prebaciti u `edit_existing_only` kada entitlement više ne važi.

Master nikada ne izdaje licence za aplikacije kupca License Server add-on-a.

### B. NR CMS host

- autentifikuje administratora i proverava permission-e;
- učitava samo add-on iz verifikovanog build-time registry-ja;
- pruža verzionisani SDK/host services;
- izvršava migracije, job scheduler i audit integraciju;
- usmerava `/dashboard/license-server/*` i `/api/license-server/*` ka add-on-u;
- čuva samo Master entitlement potreban da gate-uje add-on.

### C. License Server add-on

Zasebno instaliran plaćeni add-on:

- poseduje customer issuer identity i signing ključeve;
- poseduje product types, license profiles/SKU-ove i claim schema verzije;
- izdaje, aktivira, validira, obnavlja, suspenduje i opoziva licence;
- pruža lokalni capability i udaljeni HTTPS API;
- pruža admin UI, audit, outbox, backup i javni keyset;
- radi samo u okviru Master entitlement stanja koje mu host prosledi.

### D. Webshop add-on

Nezavisan commerce add-on:

- prodaje digitalni proizvod;
- bira način isporuke licence: ručni unos, pool ili License Server konekcija;
- sinhronizuje issuer katalog i pin-uje profil/reviziju na order item;
- šalje idempotent issue/lifecycle komande;
- čuva receipt i tajnu isporuke po svojim secure-delivery pravilima;
- ne zna privatni signing ključ i ne upisuje direktno u issuer tabele.

### E. Licencirana aplikacija

Aplikacija koju pravi korisnik License Server add-on-a:

- prihvata licencni ključ ili potpisani `.nrls.json`/assertion;
- proverava potpis, audience, vreme, policy i custom claims;
- po potrebi aktivira uređaj/domen/seat;
- periodično online validira status ili poštuje offline lease/grace;
- nema HMAC administrative/issue secret.

### F. Add-on deployment worker

Operativni servis za instalaciju privatnog paketa:

- preuzima jednokratni install token;
- verifikuje digest, potpis, provenance, SBOM i kompatibilnost;
- priprema novu verziju, izvršava migracije i redeploy;
- vodi state machine i omogućava kontrolisan rollback.

To nije deo runtime licenciranja aplikacija niti proizvod za krajnjeg kupca.

## 2. Topologija instalacije

### 2.1 Webshop i License Server u istom CMS-u

Add-on-i su zasebno instalirani, ali koriste lokalni transport:

```text
Webshop fulfillment
    -> Addon SDK customerLicenseIssuer.v2
        -> License Server issue outbox
            -> issuer engine
                -> receipt nazad u Webshop
```

Nema HTTP HMAC secret-a, ali ima auth kontekst, permission, idempotency,
durable operation i audit. „Lokalno” ne znači direktan import privatnog modula
ili direktan DB upis.

### 2.2 Webshop i License Server na različitim CMS instalacijama

```text
Webshop fulfillment
    -> HTTPS + HMAC + nonce + idempotency key
        -> /api/license-server/v2/operations/issues
            -> issuer outbox/engine
                -> poll ili potpisani webhook receipt
```

Konekcija čuva base URL, client ID, šifrovan secret, environment, scopes,
issuer reference i poslednju potvrđenu catalog revision.

### 2.3 Aplikacija krajnjeg kupca

```text
application
    -> offline: verify signed assertion with cached public keyset
    -> online: activate/validate with license key + activation token
```

Javni keyset nije tajna. Issue HMAC secret nikada ne ide u desktop, mobile,
browser ili distribuirani server binary.

## 3. Trust granice

```text
[Author Master]
  potpisuje pravo na add-on
        |
        v
[Customer CMS host] --učitava--> [License Server add-on]
        |                              |
        | local capability             | public runtime API/keyset
        v                              v
    [Webshop] ----------------> [Customer application]
        |
        | order/payment authority
        v
 [Webshop customer]
```

- Master i customer issuer imaju različite issuer ID-eve i keyset-ove.
- CMS entitlement dokazuje pravo korišćenja add-on-a; customer license assertion
  dokazuje pravo korišćenja aplikacije korisnika add-on-a.
- Nijedan token ne sme biti prihvaćen u pogrešnom trust domenu.
- `iss`, `aud`, `typ`, `kid` i verzija ugovora obavezno se proveravaju.

## 4. Kanonski tokovi

### 4.1 Kupovina i instalacija add-on-a

1. CMS administrator kupuje License Server add-on od autora.
2. Master veže entitlement za CMS installation fingerprint/domen.
3. CMS aktivira entitlement i traži kratkoživeći install token.
4. Deployment worker instalira verifikovani paket i pokreće migracije.
5. CMS redeploy učitava paket iz registry-ja.
6. Add-on kreira customer issuer identity; privatni ključ ostaje šifrovan lokalno.
7. Periodična Master revalidacija održava `ready` ili restriktivni režim.

### 4.2 Kreiranje proizvoda za licenciranje

1. Administrator kreira Product Type za svoju aplikaciju.
2. Objavljuje verziju custom claim schema-e.
3. Kreira License Profile/SKU, npr. `desktop-pro`, i pin-uje schema verziju.
4. Definiše trajanje, aktivacije, features, limite, audience, offline pravila,
   default claims i dozvoljene order override-e.
5. Objavljena revizija postaje immutable; promena stvara novu reviziju.

### 4.3 Webshop izdavanje

1. Administrator u Webshop-u kreira License Server konekciju.
2. Webshop proverava health/issuer identitet i sinhronizuje katalog.
3. Na digitalnom proizvodu bira konekciju i profil.
4. Pri checkout-u order item čuva snapshot veze, profile ID/revision i mapiranja.
5. Tek nakon autoritativnog `paid` događaja Webshop kreira issue operation.
6. License Server atomarno validira profil/claims i izdaje licencu jednom.
7. Webshop dobija receipt, šifruje delivery secret i označava item fulfilled.
8. Retry sa istim operation key-em vraća isti rezultat, ne novu licencu.

### 4.4 Runtime validacija

1. Aplikacija proverava lokalni potpisani assertion.
2. Ako policy zahteva, šalje activate sa normalizovanim fingerprint-om.
3. Server proverava status, rok, audience, binding i limit u transakciji.
4. Vraća activation token i kratkoživi signed lease/assertion.
5. Aplikacija online validira pre isteka intervala; offline radi najduže do
   `offlineGraceEndsAt`.

### 4.5 Refund, chargeback i opoziv

1. Webshop emituje idempotent lifecycle operation sa originalnim order item ref.
2. License Server menja status i piše audit događaj.
3. Sledeća online validacija odbija licencu; offline assertion ostaje ograničen
   sopstvenim kratkim rokom/grace pravilom.
4. Webshop prikazuje konačan ili pending/dead-letter status administratoru.

## 5. Stanja

### Add-on runtime

`not_installed -> install_pending -> license_required -> ready`

Greške vode u `license_invalid`, `license_expired/edit_existing_only` ili
`disabled`, bez brisanja customer podataka.

### Issue operation

`pending -> processing -> succeeded`

Privremena greška: `processing -> retry_wait -> processing`.
Trajna greška: `processing -> failed` ili posle limita `dead_letter`.
Ponovljeni isti operation key vraća postojeću operaciju/receipt.

### Licenca

`active -> suspended -> active`, ili `active/suspended -> revoked|refunded|chargeback`.
Vremenski istek daje efektivni `expired`, bez menjanja istorijskog snapshot-a.

## 6. Zabranjene prečice

- Webshop ne importuje `.private/license-server-addon/src/*`.
- Add-on ne koristi centralni Master za izdavanje customer licenci.
- Browser ne dobija issuer HMAC secret niti privatni signing ključ.
- Lokalni tok nije „fire and forget”; mora imati proverljiv receipt.
- Metadata nije nevalidiran proizvoljni payload.
- Promena SKU-a ne menja policy već izdate licence.
- Release paket ne sme imati drugačiji proizvodni UI/ugovor od testiranog izvora.
