# 02 — Tajne, ključevi, KID-evi i rotacija

## 1. Principi

1. Svaka kriptografska namena ima drugi ključ.
2. Development/staging/production nikada ne dele tajnu ili privatni ključ.
3. KID je javni identifikator verzije, ne tajna i ne sam ključ.
4. Privatni ključ/tajna se čuva u KMS/secret manageru ili OS-protected store-u,
   ne u Git-u, bazi posla, target policy JSON-u ili release evidence-u.
5. Public keyset je hash-pinovan, verzionisan i nosi status/validity.
6. Rotacija se prvo testira u staging-u, zatim radi uz active/old overlap tamo gde
   protokol to zahteva.
7. Backup bez pripadajućeg decryption/wrapping ključa nije obnovljiv backup.
8. Nijedan operator ne treba trajno da poseduje sve trust zone credentiale.

## 2. Inventar po komponenti

### 2.1 CMS/Webshop target

| Namena | Konfiguracija | Pravilo |
| --- | --- | --- |
| Installation private-key envelope | `NR_ADDON_INSTALLATION_ENCRYPTION_KEY`, `NR_ADDON_INSTALLATION_ENCRYPTION_KID` | 32-byte base64url; KID obavezan van development-a. |
| Webshop cart hash | `WEBSHOP_CART_TOKEN_SALT` | najmanje 32 karaktera; poseban po targetu/environmentu. |
| Download token signing | `WEBSHOP_DOWNLOAD_TOKEN_SECRET` | najmanje 32 karaktera; ne deliti sa cron/delivery. |
| Download audit hashing | `WEBSHOP_DOWNLOAD_EVENT_HASH_SECRET` | posebna tajna; nije token secret. |
| Master API client envelope | `WEBSHOP_LICENSE_SERVER_SECRET_KEY` | čuva HMAC credentiale; ne koristiti za licencni key ciphertext. |
| Issued license key envelope | `WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KEY`, `_KID`, `_DECRYPTION_KEYS_JSON` | aktivni 32-byte base64url KEK, prethodni samo tokom rewrap/retention-a. |
| Purchase session | `WEBSHOP_PURCHASE_INTENT_SESSION_SECRET` | vendor-only, odvojeno od cart/download. |
| Fulfillment/delivery scheduler | `CRON_SECRET`, `WEBSHOP_DELIVERY_WORKER_SECRET` | post-issue ruta nikad ne prihvata opšti `CRON_SECRET`. |
| Entitlement revalidation worker | `WEBSHOP_ENTITLEMENT_REVALIDATION_WORKER_SECRET` | zaseban bearer secret. |
| Transfer approval derivation | `NR_ADDON_TRANSFER_APPROVAL_SECRET`, `_KID` | active/old verzije moraju pokriti pending transfer expiry. |
| CMS -> worker HMAC | `NR_ADDON_DEPLOYMENT_WORKER_AUTH_KID`, `_SECRET` | po targetu; nije registry credential. |
| Worker -> CMS result HMAC | `WEBSHOP_DEPLOYMENT_RESULT_AUTH_KID`, `_SECRET`, `_OLD_SECRETS_JSON` | druga tajna od request smera; overlap za pending callback/retry. |
| Stripe payment | `WEBSHOP_STRIPE_SECRET_KEY`, `WEBSHOP_STRIPE_WEBHOOK_SECRET` | Stripe-managed; webhook signing secret nije API key. Provisionovati samo ako je Stripe odobren. |
| PayPal payment | `WEBSHOP_PAYPAL_CLIENT_ID`, `WEBSHOP_PAYPAL_CLIENT_SECRET`, `WEBSHOP_PAYPAL_WEBHOOK_ID` | Sandbox i Live app su odvojeni; client secret je tajna, webhook ID nije potpisni secret ali je security-sensitive binding ka exact endpoint-u. Provisionovati samo ako je PayPal odobren. |
| Delivery e-mail | `RESEND_API_KEY` ili SMTP credential | minimalan provider scope; ne stavljati u Webshop DB. |

Core `CLERK_SECRET_KEY`, Turnstile secret, storage token, `IP_HASH_SALT` i
provider credentiali ostaju takođe odvojeni po targetu/environmentu.

### 2.2 Master License Server

| Namena | Konfiguracija | Pravilo |
| --- | --- | --- |
| At-rest envelope | `NRLS_SECRET_ENCRYPTION_KEY`, `_KID`, `_DECRYPTION_KEYS_JSON` | 32-byte aktivni KEK; old map ne sme sadržati active KID. |
| Entitlement/lifecycle signing | `NRLS_VENDOR_SIGNING_PRIVATE_KEY`, `_KID`; public keyset file/hash | Ed25519; privatni materijal samo u centralnom secret store-u. |
| Purchase-intent signing | `NRLS_PURCHASE_INTENT_SIGNING_PRIVATE_KEY`, `_KID`; public keyset file/hash | drugi Ed25519 ključ/trust purpose. |
| Add-on release trust | `NRLS_ADDON_RELEASE_PUBLIC_KEYS_FILE`, `_SHA256`, `_ALLOWED_KIDS` | Master nema release private key; production allowlist obavezan. |
| Nonce cleanup | `NRLS_NONCE_CLEANUP_CRON_SECRET` | dedicated scheduler credential. |
| API client HMAC | verzionisani DB zapis šifrovan Master KEK-om | scope/environment/action vezan; reveal-once. |
| Release operator DB | `NRLS_RELEASE_OPERATOR_DATABASE_URL_FILE`, `_DB_ROLE` | CLI-only least-privilege role; web runtime ga ne vidi. |

Entitlement, purchase-intent i add-on release JWS moraju imati različite `typ`,
issuer/audience i KID allowliste. Customer ne sme moći purchase-intent javnim
ključem da potvrdi entitlement ili obrnuto.

### 2.3 Release authority

- Ed25519 production release signing key se koristi samo na namenskom authority
  računaru/procesu.
- Konfiguracija obuhvata protected signing key handle/file, aktivni
  `NR_ADDON_RELEASE_SIGNING_KID`, production KID allowlist i GitHub publish
  credential sa minimalnim scope-om.
- GitHub CI radi read-only verifikaciju; nema Master mutation credential.
- Public release keyset se verzioniše i hash-pin je u Master/worker target policy-ju.
- Local KID prefiksi `local-dev:`, `local-build-fixture` i `local-acceptance:` su
  trajno zabranjeni u production release-u.

Detaljan authority tok ostaje u [dokumentu 15](../15-solo-maintainer-release-authority.md).

### 2.4 Deployment worker

Najmanje po targetu:

- CMS -> worker request HMAC ref/KID;
- worker -> CMS result HMAC ref/KID;
- GitHub Packages read token ref;
- target DB deployer credential ref;
- worker PostgreSQL runtime credential;
- opcioni provider deployment credential za izabrani adapter.

Trenutni Windows model koristi DPAPI LocalMachine + service-SID ACL i hash-pinovan
unseal helper. Production implementacija mora zadržati purpose/target/version
binding i zabraniti `NR_ADDON_DEPLOYMENT_WORKER_TEST_SECRET_MAP_JSON` van testa.

## 3. KID i keyset format

Preporučeni KID oblik:

```text
<system>-<purpose>-<environment>-<yyyy>-<sequence>
```

Primer strukture, ne stvarna vrednost:

```text
nrls-entitlement-production-2026-01
webshop-issued-kek-production-2026-01
worker-client-result-production-2026-01
```

KID:

- ne sadrži secret, hostname korisnika ili e-mail;
- stabilan je za jednu key verziju;
- ne reciklira se posle revokacije;
- odgovara regex/dužini konkretnog ugovora;
- ulazi u audit/evidence, dok ključ ne ulazi.

Public keyset zapis ima najmanje `kid`, `alg`, public key, `status`, `notBefore`,
`notAfter`. Active signing KID mora postojati kao `active`. Stari ključ ostaje
`verification_only` dok najduži validni artefakt/retry/backup retention ne istekne.

## 4. Provisioning procedura

Za svaku tajnu/ključ:

1. Odrediti owner-a, purpose, environment, target i rotacioni interval.
2. Generisati u odobrenom secrets/KMS/OS procesu; ne u dokumentovanoj komandnoj
   liniji koja ostavlja vrednost u history-ju.
3. Upisati vrednost direktno u target secret store/encrypted env.
4. U evidence upisati samo secret reference, KID, datum, owner i public key/hash.
5. Ograničiti ACL/service identity na tačno jedan consumer.
6. Restartovati ili redeployovati samo potreban servis.
7. Pokrenuti startup/env validator i purpose-specific smoke.
8. Potvrditi da client bundle, process listing, logs i build artefakti nemaju
   vrednost.
9. Napraviti/obnoviti emergency escrow prema policy-ju i testirati restore.

Nikada ne kopirati production `.env` iz vendor targeta u client target.

## 5. Standardna rotacija

### 5.1 Envelope KEK

1. Sačuvati stari KID/key kroz zaštićeni old-key map/secret version.
2. Provisionovati novi aktivni key/KID.
3. Deployovati reader koji čita active + old, a piše samo novi.
4. Pokrenuti bounded rewrap/backfill sa compare-and-set zaštitom.
5. Izmeriti ciphertext count po KID-u i unknown/legacy greške.
6. Napraviti novi backup i restore test.
7. Ukloniti stari key tek kada je count nula i retention više ne zahteva stare
   snapshotove.

Issued-license KEK mora biti različit od `WEBSHOP_LICENSE_SERVER_SECRET_KEY`.

### 5.2 JWS signing key

1. Objaviti novi public key kao budući/active prema ugovoru.
2. Sačekati propagation/cache gate.
3. Prebaciti signer na novi KID.
4. Verifikovati novi i prethodni JWS.
5. Stari key ostaviti `verification_only` do isteka svih potpisanih artefakata i
   outage/replay retention-a.
6. Tek zatim ga `retired`; compromise koristi hitni `revoked` tok.

### 5.3 HMAC request/result/API client

1. Dodati novu verziju secret-a i KID.
2. Receiver privremeno prihvata active + old, sender piše novi.
3. Retry/outbox redovi ostaju vezani za originalni KID gde ugovor to zahteva.
4. Izmeriti korišćenje starog KID-a.
5. Zatvoriti/rehashovati pending operacije ili sačekati bounded retention.
6. Revokovati stari i negativno testirati replay.

Request i response smer worker-a rotiraju se odvojeno.

## 6. Compromise postupak

Za svaki incident prvo identifikovati purpose; ne rotirati nasumično sve ključeve
bez plana jer se može izgubiti mogućnost validacije/recovery-ja.

### Release signing key

- zaustaviti authority publish;
- označiti KID revoked u trusted keyset-u i distribuirati hash-pinovanu verziju;
- withdraw pogođene Master release-e za novi izbor;
- inventarisati artefakte potpisane u incident window-u;
- objaviti novi release samo iz clean authority-ja.

### Entitlement/purchase signing key

- zaustaviti odgovarajuće issue tokove;
- rotirati purpose-specific keyset;
- zadržati/ukinuti prethodni key prema dokazanoj kompromitaciji;
- prinuditi revalidation ili reissue gde je potrebno;
- ne mešati dva trust purpose-a.

### HMAC/payment/e-mail credential

- revoke kod receiver/provider-a;
- provisionovati novu verziju;
- pretražiti audit za neautorizovane issue/deploy/payment/mail događaje;
- reconcile poslovne posledice idempotentnim statusima;
- sačuvati incident timeline bez secret vrednosti.

Za PayPal rotacija znači napraviti/aktivirati novu Live app credential verziju
ili rotirati secret u Dashboard-u, zatim ažurirati secret reference i proveriti
OAuth/create/capture health sa checkout-om zatvorenim. Promena webhook endpoint-a
stvara/provisionuje novi exact webhook ID; Sandbox ID se nikada ne koristi kao
Live zamena. Stari credential se ukida tek kada nema requesta koji ga koriste i
reconciliation potvrdi očekivani app/merchant identitet.

### At-rest KEK

- zaustaviti write/reveal koji koristi ugroženi key;
- rotirati i rewrapovati;
- proceniti koji ciphertext/plaintext je mogao biti otkriven;
- ne brisati old key pre restore/reconciliation odluke.

## 7. Backup i recovery

Secret backup mora biti:

- šifrovan drugim recovery mehanizmom;
- odvojen od DB dump-a i source repoa;
- access-auditovan;
- vezan za environment/target/purpose/KID;
- testirano obnovljiv u izolaciji;
- sa definisanim RPO/RTO i dva nezavisna owner/approval koraka za kritične
  signing ključeve.

Restore mora dokazati:

- installation identity fingerprint se nije promenio;
- stari entitlement/purchase JWS se validira odgovarajućim keyset-om;
- Webshop dekriptuje validan issued-key envelope samo autorizovanim putem;
- worker rezultat za pending originalni KID može da se reconcile-uje;
- Master API client secret version i nonce/idempotency ledger ostaju usklađeni;
- nema vendor/client cross-target kloniranja.

## 8. Evidence i NO-GO

Za svaki keyset čuvati redigovanu tabelu:

| Purpose | Environment | Owner | Active KID | Old verification/decryption KID | Public/keyset hash | Last rotation | Restore tested |
| --- | --- | --- | --- | --- | --- | --- | --- |

Produkcija je NO-GO ako:

- postoji development/local/test KID;
- active private key/tajna je u Git-u, `.env` backupu bez zaštite ili bazi posla;
- nema old-key overlap tamo gde postoje pending retry/validni artefakti;
- keyset hash/pin nije usklađen između signer-a i verifier-a;
- backup/restore nije testiran;
- isti ključ ima dve namene;
- owner/incident kontakt nije definisan;
- secret vrednost se pojavila u build/test/log/APM evidence-u.
