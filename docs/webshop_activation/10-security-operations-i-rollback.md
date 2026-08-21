# Bezbednost, operations i rollback

Status: TARGET bezbednosni i operativni contract.

Ovaj sistem spaja tri odvojena rizika: pravo korišćenja addona, distribuciju privatnog izvršnog koda i finansijski fulfillment. Nijedan pojedinačni token ili servis ne sme sam da kontroliše sva tri.

## 1. Bezbednosni ciljevi

Sistem mora da obezbedi:

- privatni Webshop source i registry credential nisu dostupni CMS runtime procesu ili kupcu;
- samo odobren, potpisan i hash-verifikovan package release ulazi u build;
- licenca se izdaje samo za potvrđenu uplatu, tačan SKU i tačan canonical domen;
- licenca jednog domena/installation identiteta ne aktivira drugi;
- retries, duplicate webhookovi i response loss ne stvaraju duplikate;
- deployment jednog CMS targeta ne može menjati drugi target;
- master outage ima ograničenu, dokumentovanu grace politiku, bez beskonačnog fail-open rada;
- refund, dispute, revoke, deactivation i transfer ostavljaju audit trag;
- rollback koda ne prikriva neuspešnu migraciju ili već nastalu poslovnu obavezu;
- ključ licence, HMAC secret, signing private key i npm token ne cure kroz log, URL, bazni snapshot ili client bundle.

## 2. Trust zone model

| Zona | Sadrži | Sme da veruje | Ne sme da poseduje |
|---|---|---|---|
| Client browser | UI, kratkotrajna sesija/intent tranzit | HTTPS origin i server response | master/API/registry secret, signing private key |
| Vendor CMS runtime | checkout, order, outbox, encrypted issue rezultat | master javne ključeve i svoj API credential | npm publish/install token, master signing private key |
| Client CMS runtime | activation identity, verified entitlement cache | master entitlement public keyset | vendor-commerce secret, registry token |
| Master License Server | katalog, licence, scopes, aktivacije | svoj DB i signing/encryption key store | payment-provider secret ako direktno ne obrađuje payment |
| Deployment worker | immutable release build/deploy + sopstveni durable job/epoch/result DB | target allowlist, release public keys, secret store | korisnički license key, vendor order/customer podatke |
| GitHub Packages | privatni tarball | publish workflow identitet | runtime entitlement ili payment podatke |
| Payment/email provider | minimalan potreban payload | sopstvene potpisne credentiale | registry/master signing credentiale |

Granice se ne smeju spajati radi lakšeg lokalnog testiranja. Posebno, isti široko privilegovani token ne koristiti i za publish i za package read.

## 3. Inventar poverljivih vrednosti

| Tajna/ključ | Vlasnik | Gde se koristi | Skladištenje/rotacija |
|---|---|---|---|
| GitHub release/publish credential | GitHub Actions environment | samo publish job | GitHub-managed token ili najmanji publish scope; bez lokalnog `.env` |
| GitHub Packages read token | `NRAddonRegistryCredentialBroker` | samo credentialed fetch child A/B (`pacote` cache fill), nikada `npm ci`/install/build | registry-broker secret root; read-only/least privilege; ukloniti i canary-skenirati posle svakog fetch childa |
| Release signing private key | release pipeline | potpis manifest-a | zaštićeni GitHub Environment/HSM-like secret store; nikad u npm paketu |
| Release public keyset | worker/build | provera paketa | verzionisan/pinovan trusted config, sa hashom u deployment dokazu |
| Master entitlement signing private key | master | samo addon-entitlement JWS | master secret store; rotacija po KID-u |
| Master purchase-intent signing private key | master | samo `NRV-WEBSHOP-PURCHASE-INTENT+JWT` | zaseban key pair/KID/keyset; master secret store; bounded overlap |
| Master entitlement public keyset | CMS/vendor | provera potpisa | HTTPS JWKS + trajni pinovani cache/validity metadata |
| Master secret-at-rest encryption key + KID/keyring | master | API shared-secret ciphertext | `NRLS_SECRET_ENCRYPTION_*`; novi write aktivni KID, stare ključeve zadržati samo do batch rewrap-a |
| Vendor `WEBSHOP_LICENSE_SERVER_SECRET_KEY` + KID/keyring | vendor CMS | lokalna enkripcija master API secreta | vendor runtime secret store; `auth_secret_kid` uz red i versionirana rotacija |
| Vendor `WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KEY` + KID | vendor CMS | samo ciphertext ključeva koje master izda kupcima | odvojeni AES-GCM envelope/keyring; batch rewrap pre povlačenja starog KID-a |
| Vendor-commerce HMAC secret | vendor + master | V2 catalog/issue/lifecycle | na masteru hash/encrypted contract; na vendoru encrypted-at-rest; KID/version overlap |
| CMS installation private key | svaka CMS baza/instanca | challenge proof | AES-GCM ciphertext u toj bazi, KEK u njenom runtime secret store-u |
| `NR_ADDON_INSTALLATION_ENCRYPTION_KEY` + KID/keyring | pojedinačni CMS target | dekripcija installation key-a | različit vendor/client secret; `private_key_kid` uz red; backup uz DB |
| `NR_ADDON_TRANSFER_APPROVAL_SECRET` + KID/old-keyring | pojedinačni CMS target | deterministički source approval code za pending transfer | različit vendor/client secret; old KID ostaje do zatvaranja vezanih transfera; nije encryption/HMAC API key |
| Redeploy HMAC secret | CMS dispatcher + target worker | authenticated install job | zaseban po targetu/KID-u; rotacija sa kratkim overlapom |
| Deployment-result HMAC secret | target worker + odgovarajući CMS | authenticated final result callback | zaseban po targetu/KID-u i od redeploy secreta; durable retry/overlap |
| Payment webhook secret | vendor CMS | validacija provider eventa | provider/runtime secret store |
| Email provider credential | vendor CMS/notification worker | slanje delivery linka | runtime secret store |
| Cron/worker secret | odgovarajući scheduler/worker | interni job endpoint | dedicated po funkciji; ne koristiti jedan globalni `CRON_SECRET` dugoročno |

Sve tajne moraju imati vlasnika, datum kreiranja, KID/verziju gde je primenljivo, poslednju rotaciju i runbook za hitno opozivanje. Nikada ih ne unositi u Markdown dokumente.

## 4. Kriptografsko razdvajanje namena

Ne koristiti isti ključ za više protokola. Najmanje sledeće namene moraju biti razdvojene:

- Webshop release manifest signature;
- addon entitlement JWS;
- purchase-intent JWS;
- installation proof key po CMS instanci;
- per-CMS transfer-approval derivation HMAC;
- vendor-master API HMAC;
- CMS-worker callback HMAC;
- 256-bitni guest delivery bearer token se ne potpisuje/HMAC-uje; čuva se samo njegov unkeyed SHA-256, pa nema delivery secret koji bi se delio sa drugim namenama;
- enkripcija master API secreta;
- enkripcija installation private key-a;
- enkripcija izdatog license key-a.

Svaki potpisani objekat mora imati nedvosmislen `typ`, `iss`, `aud`, `kid`, verziju protokola i ograničen skup claimova. Verifikator prvo proverava algoritam i dozvoljeni KID, zatim issuer/audience/type, vreme, replay i poslovne claimove. Ne prihvatati algoritam ili key URL iz samog nepoverljivog payload-a.

### 4.1 Jedinstveni envelope rotation contract

Master zadržava svoj postojeći wrapped-DEK AES-256-GCM V2 format, koji je različit od CMS direct-envelope formata:

    {"v":2,"kid":"...","wrappedDek":"...","wrapIv":"...","wrapTag":"...","iv":"...","ciphertext":"...","tag":"..."}

Vendor master-credential i installation private key ciljano koriste direct AES-256-GCM envelope:

    {"v":2,"kid":"...","iv":"...","ciphertext":"...","tag":"..."}

Decoder se bira po storage purpose-u, pa ista brojčana verzija ne znači isti schema contract između servisa. Svaka klasa ima različit AAD marker:

    nrls-secret:v2:<TABLE>:<ROW_UUID>:<LOGICAL_FIELD>
    webshop-master-api-credential:v2:<LICENSE_SERVER_UUID>:<AUTH_CLIENT_ID>:<AUTH_KEY_ID>
    nr-addon-installation-private-key:v2:<INSTALLATION_UUID>:<CANONICAL_DOMAIN>:<FINGERPRINT>

Marker i identifikatori su literal ASCII, UUID je canonical lowercase, fingerprint lowercase, encoding UTF-8 bez završnog newline-a. Purpose-specific parser prvo zahteva poznatu envelope schema/verziju i exact AAD marker. Envelope `kid` mora biti identičan odgovarajućoj DB koloni (`auth_secret_kid`, `private_key_kid`, master secret-version KID odnosno issued-key `license_key_kid`); mismatch je fail-closed corruption/incident alert. Tek zatim decrypt bira jedan key preko tog KID-a; nikada ne bira iz envelope-a a auditira kolonu, niti pokušava sve ključeve redom. Novi write koristi samo aktivni KID, a startup proverava da je on različit po nameni i da svi keyring unosi imaju dozvoljen format/dužinu. Migration fixture pokriva validnu jednakost, svaki mismatch, pogrešan purpose/AAD i unknown KID pre decrypt-a.

Schema/migracija dodaje `auth_secret_kid` vendor license-server settings redu i `private_key_kid` installation identity redu. Masterov postojeći validni wrapped-DEK `v=2` sa KID-em je first-class compatibility format, ne legacy i ne prevodi se u direct envelope; pri KEK rotaciji samo se DEK ponovo wrap-uje aktivnim KID-em. Pre-master-V2 ili malformed/no-KID redovi klasifikuju se `legacy-nrls-secret-v1`; vendor/installation redovi bez dokazivog KID-a su `legacy-license-server-secret-v1` ili `legacy-addon-installation-v1`. Nije dozvoljen metadata-only SQL backfill, a fixture mora razlikovati existing master wrapped-DEK V2 od sve tri legacy klase.

Rotacija za svaku klasu je expand/rewrap/contract:

1. backup i restore fixture sa starim ključem;
2. dodati novi key kao active, stari u odgovarajući `*_DECRYPTION_KEYS_JSON`;
3. svi novi write-ovi koriste novi KID;
4. idempotentni batch worker pod row lock/optimistic version kontrolom dekriptuje explicit starom granom, validira plaintext/fingerprint i re-enkriptuje novim AAD/KID-em;
5. metrics/query potvrđuju nula starih i legacy redova, a activation/catalog/issue/reveal/restart/restore testovi prolaze;
6. tek posle backup retention prozora ukloniti stari keyring entry i legacy reader.

Installation rewrap ne menja Ed25519 key pair, installation UUID ili fingerprint. Vendor API-credential rewrap ne rotira HMAC credential; HMAC KID/secret rotation je zaseban protokol. Master rewrap ne menja API secret fingerprint ili client identitet.

## 5. Canonical domain contract

Jedan shared contract i isti test vektori koriste se u CMS-u, Webshopu i masteru:

1. ulaz je hostname/host:port ili apsolutni URL;
2. apsolutni URL koristi samo `http:`/`https:`, nema userinfo, pathname mu je tačno `/`, a query i fragment su prazni; nevažeći delovi se odbijaju, ne uklanjaju tiho;
3. hostname ulaz odbija userinfo, putanju, query i fragment;
4. tek posle uspešne validacije izdvaja se hostname i odbacuje port;
5. hostname je lowercase i IDN se normalizuje na definisani ASCII/punycode oblik, zatim se uklanja jedna završna tačka;
6. odbijaju se wildcard, prazno/`unknown` ime, control karakteri i nevažeće DNS label-e;
7. produkcija prihvata samo DNS hostname i odbija IP literal, `localhost` i development-only `.nr.test`; development eksplicitno allowlist-uje `vendor.nr.test`, `client.nr.test` i druge potrebne test hostove;
8. `vendor.nr.test` i `client.nr.test` ostaju različiti;
9. `localhost:3000` i `localhost:3002` se ne koriste kao različiti licencni domeni;
10. public origin (`https://client.nr.test`) i license domain (`client.nr.test`) su dva različita tipa vrednosti.

Canonical vrednost se računa server-side i snapshotuje. Nikada se ne prihvata hidden input ili query string kao autoritativan domen.

Lokalni Node proces mora verovati Caddy CA-u kroz `NODE_USE_SYSTEM_CA=1` na podržanom Node 24 runtime-u ili kroz pinovan `NODE_EXTRA_CA_CERTS` PEM. Ne koristiti `NODE_TLS_REJECT_UNAUTHORIZED=0`. TLS trust ne zamenjuje outbound host allowlist, DNS/private-address policy, redirect zabranu, timeout i response-size limit; svi uslovi moraju proći zajedno.

## 6. Purchase intent bezbednost

Ciljni purchase intent je kratkotrajni master-signed JWS, dobijen posle installation challenge/proof toka. Protected header sadrži `alg=EdDSA`, dozvoljeni `kid` i exact `typ=NRV-WEBSHOP-PURCHASE-INTENT+JWT`; jedini dozvoljeni payload contract je:

    contractVersion = 1
    iss = https://license-server.nrcms.com
    aud = https://vendor.nr.test
    jti = UUID, ujedno masterPurchaseIntentJti
    iat / nbf / exp
    tokenUse = purchase_intent
    addonKey = webshop
    offerKey = nr-cms-webshop-license
    productTypeId
    vendorProductRef = nr-cms-webshop-license
    environment = development
    catalogVersion
    allowedSkus
    canonicalDomain = client.nr.test
    installationId
    installationKeyFingerprint
    installationFingerprintScheme = ed25519_spki_der_sha256_v1
    domainVerificationMethod
    domainVerifiedAt
    domainVerificationChallengeId

`iss` je stabilni token issuer iz postojećeg entitlement contracta; lokalni transport/discovery endpoint ostaje `https://license.nr.test`. Promena issuer identiteta zahteva verzionisanu producer/consumer migraciju i ne izvodi se iz request Host headera.

`iat`, `nbf` i `exp` su JSON number NumericDate vrednosti, ne stringovi.

Pravila:

- TTL tipično 10–30 minuta; vrednost je konfiguracioni contract i testira se;
- vendor ne poznaje client shared secret;
- JTI ima durable ledger ili ekvivalentnu state machine zaštitu;
- client prenosi compact JWS top-level cross-origin `POST` formom u request telu; token nikada nije query/fragment;
- vendor acceptance ograničava content type/body size, ne loguje telo, verifikuje token, poziva authenticated master `:accept`, čuva samo JTI/hash/claims i vraća `303` na čist product URL;
- direktni `GET` proizvoda ne može dodati domain-bound licencu bez accepted server-side intent sesije;
- token se ne loguje, ne šalje analytics provideru i ne ostaje u referreru;
- master state machine je `issued -> accepted -> reserved -> consumed`, uz `release` samo pre durable order veze; `consumed` je terminalan i vezan za vendor client, order/order item i snapshot hash;
- payment se ne pokreće pre potvrđenog master `:consume`; response loss se ponavlja istim idempotency key-em/body-jem;
- vendor-commerce issuance zahteva isti consumed JTI/snapshot/domain/product/SKU/order binding i filtered unique FK garantuje najviše jednu licencu po intentu;
- normalizovani unique FK-evi garantuju jedan JTI → jedna cart linija → jedan order item; concurrent add ili dve SKU varijante ne mogu umnožiti intent;
- produkcioni intent zahteva svež `https_well_known` dokaz kontrole canonical domena; `development_allowlist_exemption` je dozvoljen samo za explicit `.nr.test` development hostove i čuva se kao takav u audit/license snapshotu;
- intent dozvoljava kupovinu, ali nije konačno pravo aktivacije;
- master activation je završni autoritet za license status, domain i slot.

## 7. Master API HMAC V2

Svaki vendor-master zahtev mora vezati potpis za:

- auth verziju i KID;
- HTTP metod;
- canonical path i canonical query;
- timestamp;
- jedinstveni nonce;
- hash originalnog body-ja;
- client identitet;
- idempotency key za mutacije.

Master:

- koristi constant-time signature poređenje;
- prihvata samo aktivan secret-version red;
- proverava dozvoljeni clock skew;
- atomski troši nonce u PostgreSQL store-u;
- proverava environment/product/SKU/action scope;
- ne otkriva da li je client, KID ili scope bio najbliži ispravnom kroz detaljnu javnu grešku;
- audit log može interno razlikovati razlog, ali ne sadrži secret/signature/body sa licencom.

Rotacija pravi novi KID i vremenski ograničen overlap; vendor se prvo prebacuje na novi KID, zatim se stari opoziva. `legacy-1` fallback nije ciljna produkciona politika.

## 8. Activation proof i installation identitet

Svaka CMS instalacija ima jedinstven Ed25519 key pair i random installation UUID. Master mora:

- parse-ovati public key kao strict Ed25519, izvesti canonical SPKI DER i izračunati `sha256:` + lowercase SHA-256 tih bytes; raw PEM tekst/newline se nikada ne hashira;
- challenge vezati za license, addon, canonical domain, deployment mode, installation ID, public key/fingerprint i expiry;
- dozvoliti jedno atomsko trošenje challenge-a;
- koristiti advisory/row lock pri proveri activation limita;
- proveravati i activation status pri svakoj revalidaciji;
- imati cleanup za istečene challenge redove;
- odbiti tihi reuse lokalnog identiteta ako je baza klonirana na drugi domen ili deployment mode.

DB CHECK/Drizzle/TypeScript koristi jedno canonical ime kolone `installation_fingerprint_scheme` i dozvoljava samo `legacy_pem_utf8_sha256_v0|ed25519_spki_der_sha256_v1`; novi red koristi drugi. Existing raw-PEM fingerprint je eksplicitni `legacy_pem_utf8_sha256_v0`; ne radi se metadata-only backfill. Dedicated rebind challenge zahteva potpis postojećim private key-em i pod activation/installation lock-om atomski menja fingerprint scheme/value i lifecycle version. Bez PoP-a potreban je novi installation identitet i audited re-enroll/transfer recovery. Shared fixture dokazuje isti fingerprint za LF/CRLF/legalno drugačije PEM wrap-ove istog DER-a i odbija RSA/EC/non-canonical input.

U produkciji installation PoP nije dovoljan dokaz kontrole hostname-a. Purchase, initial activation i transfer moraju završiti HTTPS well-known challenge iz dokumenta 07: master sam fetch-uje exact `https://<canonicalDomain>/.well-known/nr-license-domain-proof/<challengeId>` na portu 443, bez redirecta, uz public-DNS/SSRF pinning, response limit i proveru istih Ed25519 proof bytes. Evidence method/time/challenge/hash se čuvaju uz intent/activation/licencu. Development `.nr.test` izuzetak je zaseban status i production startup ga odbija.

Promena domena ne radi editovanjem `canonical_domain`. Potreban je poseban transfer tok sa dokazom kontrole starog i/ili novog installation identiteta, politikom odobrenja, slot tranzicijom i auditom.

Deactivation je potpisan, idempotentan zahtev. Ona oslobađa installation slot, ali ne briše automatski package, shop podatke, order-e ili poslovnu licencu.

### 8.1 Exact deactivation contract

Koristi se samo:

    POST /api/addons/licenses/deactivate

sa `contractVersion=1` i `action=challenge|complete`. Challenge body je:

    {
      "contractVersion": 1,
      "action": "challenge",
      "requestId": "<UUID>",
      "activationId": "<UUID>",
      "installationId": "<UUID>",
      "canonicalDomain": "client.example.com",
      "reason": "customer_request|site_retired"
    }

Master ne veruje ponovljenom domenu/installation ID-u već ih poredi sa aktivnim activation redom, pravi purpose-specific challenge i već tada durable kreira lifecycle operation čiji je `operationId` stabilan kroz complete/replay/status recovery. Challenge response je strict `{contractVersion:1,action:"challenge",operationId,challengeId,proofPayload,expiresAt}`. Base64url exact proof bytes vezuju marker `NRV-ADDON-DEACTIVATION-CHALLENGE-V1`, challenge/nonce/expiry, request ID, operation ID, activation/entitlement/addon, canonical domain, installation ID/fingerprint i reason. Complete body sadrži tačno `contractVersion=1`, `action=complete`, isti `operationId`, challenge ID i `proofSignature` nad tim bytes.

Master u jednoj transakciji zaključava challenge, activation, licencu i activation-slot scope; proverava signature/expiry/status/lifecycle version, atomski troši challenge, menja `active -> deactivated`, postavlja `deactivated_at`, povećava lifecycle version, oslobađa slot i čuva signed lifecycle receipt. Exact retry istog request/challenge/body-ja vraća isti rezultat; isti request ID sa drugim hashom je `409`. Već deactivated activation vraća prethodni rezultat samo ako operation binding odgovara, nikada ne utiče na drugu activation.

Complete response:

    {
      "contractVersion": 1,
      "action": "complete",
      "operationId": "<UUID>",
      "activationId": "<UUID>",
      "activationStatus": "deactivated",
      "slotReleased": true,
      "lifecycleVersion": 2,
      "deactivatedAt": "<ISO_TIMESTAMP>",
      "resultBodyHash": "sha256:<64_LOWERCASE_HEX>",
      "signedLifecycleReceipt": "<NRV-ADDON-LIFECYCLE-RECEIPT+JWT>"
    }

`resultBodyHash` nikada nije hash outer response-a, jer bi receipt koji ga sadrži napravio ciklus. Za deactivation master konstruiše strict `LifecycleOperationResultCoreV1` bez unknown polja:

```json
{
  "contractVersion": 1,
  "purpose": "addon_lifecycle_result_core",
  "lifecycleAction": "deactivate",
  "operationId": "<UUID>",
  "activationId": "<UUID>",
  "activationStatus": "deactivated",
  "slotReleased": true,
  "lifecycleVersion": 2,
  "deactivatedAt": "<ISO_TIMESTAMP>"
}
```

Exact računanje je `resultBodyHash="sha256:" + lowercaseHex(SHA-256(RFC8785_JCS(core)))`. Core namerno ne sadrži `resultBodyHash`, `signedLifecycleReceipt`, outer `action` ili bilo koji signature byte. Full response je flat projekcija istih business polja, zatim izračunati hash i receipt čiji claim vezuje baš taj hash. Master trajno čuva exact core JCS bytes, core hash i exact full-response bytes; exact replay vraća iste full-response bytes.

Fiksni deactivation fixture koristi gornju šemu sa operation `11111111-1111-4111-8111-111111111111`, activation `22222222-2222-4222-8222-222222222222` i vremenom `2026-07-31T12:00:00.000Z`. Exact JCS UTF-8 bytes su:

```text
{"activationId":"22222222-2222-4222-8222-222222222222","activationStatus":"deactivated","contractVersion":1,"deactivatedAt":"2026-07-31T12:00:00.000Z","lifecycleAction":"deactivate","lifecycleVersion":2,"operationId":"11111111-1111-4111-8111-111111111111","purpose":"addon_lifecycle_result_core","slotReleased":true}
```

Očekivani hash je `sha256:02dd22e6f473a77a90640f74311ba1f4d2db4961624f00b68012dd2034a0097f`. Producer i svi verifieri dele byte/hash fixture; hash outer response-a ili core-a sa receipt/hash poljem mora pasti.

Pre slanja finalnog `complete` CMS pod istim installation advisory fence-om durable kreira local lifecycle operation sa istim master-assigned operation ID-em i request/challenge/body hashom, postavlja `lifecycle_finalization_pending`, onemogućava addon pristup (`runtimeStatus=maintenance`/restricted UI bez brisanja podataka) i supersede-uje svaki non-terminalni deployment job. Tek zatim šalje master zahtev. CMS prvo verifikuje receipt/KID/claims, pa lokalno postavlja `deactivated`/`disabled` i kreira durable uninstall-or-disable operation prema policy-ju. Package i podaci se ne brišu u HTTP requestu. Timeout ili izgubljen response posle mogućeg master commita ostavlja CMS fail-safe u pending/maintenance stanju i ponavlja isti complete; network grace ga ne vraća u ready. Dok primljeni receipt važi, retry mora vratiti iste stored bytes. Kada važeći receipt nikada nije primljen ili je istekao i običan complete/replay više nije upotrebljiv, dozvoljen je samo exact lifecycle-status PoP/JWS contract iz sledećeg odeljka; pre original-complete cutoff-a on može vratiti samo `in_progress`. Običan revalidation, conflict/error, unknown outcome ili tuple mismatch nije dovoljan. Fixture prekida zahtev pre mastera i response posle master commita i dokazuje committed i terminal-not-committed recovery bez cached-active fallbacka.

#### Strict `LifecycleReceiptClaimsV1`

`signedLifecycleReceipt`, `signedSourceLifecycleReceipt` i `signedTargetLifecycleReceipt` koriste master entitlement signing authority/keyset, ali poseban token contract. Compact JWS protected header je strict objekat sa tačno tri polja i bez unknown polja:

```json
{
  "alg": "EdDSA",
  "kid": "<KNOWN_MASTER_ENTITLEMENT_SIGNING_KID>",
  "typ": "NRV-ADDON-LIFECYCLE-RECEIPT+JWT"
}
```

`alg` nema alternativu, `kid` mora postojati u trenutno prihvatljivom anti-rollback keyset snapshot-u, a `typ` mora biti byte-for-byte jednak gornjoj vrednosti. `crit`, `cty`, `jku`, `jwk`, `x5u`, `x5c` i svako drugo dodatno header polje se odbijaju. Parser odbija duplicate JSON keys, padding ili nestandardni alphabet u compact base64url segmentima i bilo koji JWS koji nema tačno tri segmenta.

`LifecycleReceiptClaimsV1` je zatvoren discriminated union. Zajednički claims svih varijanti su tačno:

```json
{
  "contractVersion": 1,
  "tokenUse": "addon_lifecycle_receipt",
  "iss": "<MASTER_ISSUER>",
  "aud": "nr-cms-addon-runtime",
  "jti": "<UUID>",
  "iat": 1785499200,
  "nbf": 1785499200,
  "exp": 1785502800,
  "lifecycleAction": "deactivate|transfer_source_complete",
  "receiptRole": "deactivation|transfer_source|transfer_target",
  "operationId": "<UUID>",
  "entitlementId": "<UUID>",
  "addonKey": "webshop",
  "lifecycleVersion": 2,
  "resultBodyHash": "sha256:<64_LOWERCASE_HEX>"
}
```

Ovo je prikaz zajedničkog preseka, ne payload koji se samostalno prihvata. `lifecycleAction` i `receiptRole` su dva obavezna diskriminatora i dozvoljena su samo tri para iz sledećih varijanti. Nijedna varijanta ne dozvoljava unknown polje, `null` umesto obaveznog polja, niti polje iz druge varijante.

Deactivation varijanta ima `lifecycleAction="deactivate"`, `receiptRole="deactivation"` i, pored svih zajedničkih claimova, tačno sledeća polja:

```json
{
  "activationId": "<UUID>",
  "activationStatus": "deactivated",
  "canonicalDomain": "client.example.com",
  "installationId": "<UUID>",
  "installationKeyFingerprint": "sha256:<64_LOWERCASE_HEX>",
  "installationFingerprintScheme": "legacy_pem_utf8_sha256_v0|ed25519_spki_der_sha256_v1",
  "slotReleased": true,
  "deactivatedAt": "2026-07-31T12:00:00.000Z"
}
```

`activationId`, `activationStatus`, `slotReleased`, `lifecycleVersion` i `deactivatedAt` moraju biti exact projekcija deactivation `LifecycleOperationResultCoreV1`; `operationId` i `lifecycleAction` takođe moraju biti jednaki core-u. Domain i installation tuple mora biti frozen source activation tuple nad kojim je lifecycle transakcija izvršena. `installationFingerprintScheme` je zatvoren enum iz identity contracta i mora odgovarati stored activation redu: postojeća activation sme se bezbedno deaktivirati i pod eksplicitnim legacy scheme-om, dok svaki novi/rebind identitet koristi `ed25519_spki_der_sha256_v1`. Fingerprint value mora biti izračunat upravo algoritmom navedenog scheme-a.

Transfer-source varijanta ima `lifecycleAction="transfer_source_complete"`, `receiptRole="transfer_source"`; transfer-target varijanta ima isti `lifecycleAction` i `receiptRole="transfer_target"`. Obe varijante, pored svih zajedničkih claimova, imaju isti zatvoren skup binding polja:

```json
{
  "transferId": "<UUID>",
  "status": "completed",
  "sourceActivationId": "<UUID>",
  "sourceActivationStatus": "transferred",
  "targetActivationId": "<UUID>",
  "targetActivationStatus": "active",
  "oldCanonicalDomain": "old.example.com",
  "newCanonicalDomain": "new.example.com",
  "sourceInstallationId": "<UUID>",
  "sourceInstallationKeyFingerprint": "sha256:<64_LOWERCASE_HEX>",
  "sourceInstallationFingerprintScheme": "legacy_pem_utf8_sha256_v0|ed25519_spki_der_sha256_v1",
  "targetInstallationId": "<UUID>",
  "targetInstallationKeyFingerprint": "sha256:<64_LOWERCASE_HEX>",
  "targetInstallationFingerprintScheme": "ed25519_spki_der_sha256_v1",
  "completedAt": "2026-07-31T12:05:00.000Z"
}
```

`operationId`, `lifecycleAction`, `transferId`, `status`, oba activation ID/status para, oba domena, `lifecycleVersion` i `completedAt` moraju biti exact projekcija jednog transfer `LifecycleOperationResultCoreV1`. Source i target receipt imaju različit `jti` i različit `receiptRole`, ali moraju imati identične `iss`, `aud`, operation/entitlement/addon, transfer, source/target identity, version/time business tuple i isti `resultBodyHash`. Ne postoji `transfer_target_complete` action i target receipt se ne računa iz posebnog target core-a. Za oba receipt-a koristi se isti transfer core i zato je njihov `resultBodyHash` byte-for-byte isti.

Source scheme mora odgovarati frozen source activation redu i zato može biti eksplicitni legacy ili canonical V1 scheme; novi target identity mora biti `ed25519_spki_der_sha256_v1`. Oba receipt-a nose iste scheme/value parove i verifier svaki fingerprint računa prema claimovanom, dozvoljenom scheme-u pre poređenja sa lokalnim/stored identity tuple-om.

Za sva tri union člana važe sledeći strict uslovi:

- UUID vrednosti su canonical lowercase RFC 4122 tekst; hash/fingerprint koristi exact `sha256:` prefiks i 64 lowercase hex cifre;
- `iss` je exact configured master issuer, `aud` je JSON string, ne niz, a `addonKey` je literal `webshop`; receipt bez očekivanog entitlement/addon bindinga se odbija;
- `iat`, `nbf` i `exp` su non-negative lossless JSON integer NumericDate sekunde, uz `iat <= nbf < exp`; `exp-iat` ne sme preći konfigurisani i startup-validirani lifecycle receipt TTL, a verifier primenjuje jedini dozvoljeni bounded clock-skew policy i smatra receipt nevažećim čim je `now >= exp`;
- ISO business vreme je canonical UTC sa tačno tri milisekundne cifre i `Z`; odgovara committed master redu, ne lokalnom satu verifiera;
- `lifecycleVersion` je pozitivan safe integer i mora biti finalna committed verzija; svi identity, domain, status i version claimovi moraju odgovarati istoj zaključanoj lifecycle operation reviziji;
- `resultBodyHash` je `sha256:` hash exact RFC 8785/JCS `LifecycleOperationResultCoreV1`, nikada outer response-a, payload-a receipt-a ili compact JWS-a. Producer računa core/hash pre konstruisanja claims-a; verifier rekonstruiše dozvoljeni core variant iz očekivanog/stored business rezultata i ponovo računa hash;
- receipt role se proverava prema lokalnom installation identitetu: deactivation samo na navedenom `installationId`, transfer-source samo na `sourceInstallationId`, transfer-target samo na `targetInstallationId`. Poznavanje drugog installation identiteta ili validan potpis nije dozvola za cross-role primenu;
- verifier ne prihvata lifecycle receipt kao entitlement snapshot, purchase intent, lifecycle-status JWS ili obrnuto, čak ni kada authority, `kid` i potpis jesu validni.

Producer najpre u lifecycle transakciji zamrzava exact result core/JCS bytes/hash i ceo identity tuple. Za jednu committed deactivation operation izdaje tačno jedan `deactivation` JTI/compact JWS; za jednu committed transfer operation izdaje tačno jedan `transfer_source` i jedan `transfer_target` JTI/JWS. Exact response replay vraća stored compact bytes i ne menja `iat`, `nbf`, `exp`, `jti`, signature ili serialization. Signer pre potpisa validira union i sve cross-field jednakosti, a operation red čuva role/JTI/payload hash/compact bytes uz core hash.

Verifier ograničeno parsira header/payload, proverava strict schema i duplikate, bira već verifikovan keyset ključ isključivo po dozvoljenom `kid`, verifikuje Ed25519 signature nad originalnim signing input bytes, zatim proverava issuer/audience/time/token-use, očekivani role i lokalni identity tuple, pa core projekciju i `resultBodyHash`. Nijedan claim ne utiče na stanje pre kompletne provere. Uspeh se durable vezuje za operation ID, role, JTI, compact-JWS hash i result-core hash; isti JTI sa drugačijim bytes/hashom je incident, ne nova verzija.

Obavezni shared producer/verifier fixture set koristi repository-only Ed25519 test key i frozen protected-header UTF-8 bytes, payload UTF-8 bytes, compact JWS i očekivani decoded union član:

| Fixture | Frozen business input | Očekivani `resultBodyHash` | Očekivanje |
|---|---|---|---|
| `lifecycle-receipt-deactivation-v1` | deactivation fixture iznad, plus frozen entitlement/domain/installation tuple | `sha256:02dd22e6f473a77a90640f74311ba1f4d2db4961624f00b68012dd2034a0097f` | producer daje jedan `deactivation` receipt; svi verifieri prihvataju iste bytes |
| `lifecycle-receipt-transfer-source-v1` | transfer fixture iz 8.2, plus frozen entitlement i oba installation tuple-a | `sha256:c9d1208383c306a9817055011748eec82c356c7b5bc2575bbb5e23bcd4caba02` | prihvata ga samo source role/verifier |
| `lifecycle-receipt-transfer-target-v1` | potpuno isti transfer core/tuple kao prethodni fixture, drugi frozen JTI i role | `sha256:c9d1208383c306a9817055011748eec82c356c7b5bc2575bbb5e23bcd4caba02` | prihvata ga samo target role/verifier |

Fixture generator mora dva puta proizvesti identične compact bytes iz istog frozen inputa; nezavisni master i CMS verifieri moraju dobiti isti rezultat. Test obavezno tvrdi da oba transfer receipt-a imaju isti core hash, ali različit JTI/role/signature payload, i da source+target receipt zajedno odgovaraju jednoj immutable operation reviziji.

Negativni fixture-i pojedinačno menjaju samo jednu stvar i moraju pasti pre state mutation-a: unknown ili duplicate header/payload polje; `alg=none`, drugi `typ`, unknown/revoked `kid`; audience kao niz, drugi issuer/token-use/addon/entitlement; float/string/overflow NumericDate, `nbf >= exp`, receipt na exact `exp`; non-canonical UUID/domain/hash/fingerprint; deactivation payload sa bilo kojim transfer poljem ili transfer payload sa deactivation poljem; nemoguć action/role/status par; `slotReleased=false`; core business polje ili hash promenjen za jedan byte; hash outer response-a; source receipt ponuđen target verifieru i obrnuto; zamenjen source/target installation/fingerprint; dva transfer receipt-a sa različitim core hashom/operation/transfer/version tuple-om; validan lifecycle receipt prosleđen entitlement, purchase-intent ili lifecycle-status verifieru. Posebni replay fixture dokazuje iste bytes pre isteka, odbijanje na/posle `exp` i recovery isključivo fresh lifecycle-status ugovorom.

Master lifecycle operation trajno čuva `result_replay_until` i startup/config validacija zahteva `result_replay_until >= receipt.exp`; exact core/hash/full-result bytes i oba transfer receipt-a moraju ostati dostupni najmanje do kasnijeg od tog roka i svake obavezne audit/backup retencije. Nije dozvoljeno ignorisati `exp` na zakašnjelom replay-u niti ponovo potpisati drugi receipt pod istim frozen resultom. Recovery kada validan receipt nije primljen ili je istekao koristi isključivo fresh purpose-specific signed status iz sledećeg odeljka, koji uključuje originalni operation ID/request hash i non-null result hash kada je stanje finalizovano. Boundary fixture pokriva dropped-before-master, replay neposredno pre/na `receipt.exp`, odbijanje expired receipt-a i uspešan fresh status recovery dok tombstone/core hash ostaju sačuvani.

V1 nema skrivene timing konstante. Master template/validator koristi tačno `NRLS_LIFECYCLE_RECEIPT_TTL_SECONDS=86400`, `NRLS_LIFECYCLE_RESULT_REPLAY_RETENTION_SECONDS=604800`, `NRLS_LIFECYCLE_ORIGINAL_COMPLETE_CUTOFF_SECONDS=86400` i `NRLS_LIFECYCLE_STATUS_JWS_TTL_SECONDS=300` kao lokalne default-e. Dozvoljene granice su redom `900..86400`, `86400..2592000`, `900..604800` i `60..300`; startup zahteva replay retention najmanje receipt TTL i original-complete cutoff najviše replay retention. Konkretni operation pre potpisa dodatno proverava `result_replay_until >= receipt.exp`. Original complete je prihvatljiv samo pre persisted cutoff-a; status close na `not_committed` tek posle cutoff-a pobeđuje isti row-lock/CAS. Status JWS `exp-iat` nikada nije duži od konfigurisanih najviše 300 sekundi. Sve četiri vrednosti, boundary clocks i startup rejection su shared master/CMS fixture-i; menjanje default-a zahteva versioniranu policy migraciju, ne ad hoc env override van granica.

### 8.1.1 Exact missing/post-expiry lifecycle-status recovery contract

CMS koristi ovaj tok kada nema validan primljeni lifecycle receipt — zato što originalni complete nikada nije stigao masteru, response/receipt je izgubljen ili je frozen receipt istekao — i obični exact complete/replay put više ne može dati važeći rezultat. CMS durable čuva `originalCompleteAcceptUntil` iz originalnog challenge-a. Može pitati ranije, ali tada dobija samo `in_progress`; terminalni status-close nije dozvoljen pre tog cutoff-a. Expired receipt se nikada ne produžava niti mu se ignoriše `exp`. Ruta je:

    POST /api/addons/licenses/lifecycle-status

Master lifecycle operation nastaje već pri originalnom deactivation/transfer challenge-u i najmanje ima `state=challenge_issued|finalizing|committed|terminal_not_committed`, `original_complete_accept_until`, nullable `final_request_body_hash/final_request_bound_at`, nullable stored result-core bytes/hash/full-response bytes i `result_replay_until`. `final_request_body_hash` je inicijalno `null`, jer originalni complete možda nikada neće stići masteru. Originalni complete pod istim operation row lock-om prvi CAS-binduje svoj strict JCS body hash i može mutirati samo pre `original_complete_accept_until`; status-close grana može pobediti isti CAS tek posle tog roka. Tačno jedna od njih može terminalizovati operation.

Prvi `action=challenge` body ima tačno:

```json
{
  "contractVersion": 1,
  "action": "challenge",
  "requestId": "<NEW_UUID>",
  "lifecycleOperationId": "<ORIGINAL_OPERATION_UUID>",
  "lifecycleAction": "deactivate|transfer_source_complete",
  "activationId": "<SOURCE_ACTIVATION_UUID>",
  "installationId": "<SOURCE_INSTALLATION_UUID>",
  "lifecycleRequestBodyHash": "sha256:<64_LOWERCASE_HEX>",
  "preLifecycleVersion": 1,
  "transferId": null
}
```

Za transfer je `transferId` canonical UUID; za deactivation mora biti JSON `null`. `lifecycleRequestBodyHash` je hash exact RFC 8785/JCS originalnog finalnog `deactivate complete` ili `transfer source_complete` body-ja koji je CMS durable sačuvao pre HTTP pokušaja. Ako master operation već ima non-null `final_request_body_hash`, strict parser zahteva jednakost. Ako je master vrednost još null, challenge transakcija je ne popunjava na operation redu: samo u purpose-specific status-challenge snapshot privremeno vezuje claimed hash, activation/installation/action/pre-version i trenutni operation state. Tako recovery ostaje moguć i kada je originalni final request pao pre mastera, ali caller bez originalnog installation PoP-a ne može trajno zatvoriti operation. Parser odbija unknown/missing polje, pogrešan action/UUID/hash, negative/non-integer version ili mismatch sa već vezanim operation hashom.

Master vraća `{contractVersion:1,action:"challenge",requestId,lifecycleOperationId,statusChallengeId,proofPayload,expiresAt}`. Exact base64url proof bytes imaju marker `NRV-ADDON-LIFECYCLE-STATUS-CHALLENGE-V1` i vezuju sve request vrednosti, claimed final-body hash, entitlement/addon/fingerprint, masterov trenutni operation state, `originalCompleteAcceptUntil`, nonce i expiry. CMS ih potpisuje originalnim source installation Ed25519 key-em. Complete body je strict:

```json
{
  "contractVersion": 1,
  "action": "complete",
  "requestId": "<SAME_NEW_UUID>",
  "lifecycleOperationId": "<ORIGINAL_OPERATION_UUID>",
  "statusChallengeId": "<UUID>",
  "proofSignature": "<BASE64URL_ED25519_SIGNATURE>"
}
```

Master pod operation/activation/license/transfer row lock-ovima verifikuje challenge, PoP i binding. Ako je operation `committed`, koristi tačno stored core hash/final tuple i ne izvršava lifecycle mutaciju ponovo. Ako originalni complete još može legitimno stići (`now <= original_complete_accept_until`) ili postoji proverljivo `finalizing` stanje koje nije bezbedno zatvoriti, vraća signed `in_progress` i CMS ostaje restricted.

Tek posle `original_complete_accept_until`, uz validan status PoP i dokaz da nijedna lifecycle mutacija/result core nije commitovana, status-complete radi jedan CAS: ako je operation hash null, vezuje ga za claimed `lifecycleRequestBodyHash`; ako je non-null zahteva exact match; zatim postavlja `terminal_not_committed`, čuva pre-operation final tuple/tombstone i troši challenge u istoj transakciji. Time kasniji originalni complete sa istim ili drugim body-jem ne može commitovati. Ako originalni complete i status-close krenu konkurentno, isti operation lock/CAS određuje pobednika: complete daje stored `committed`, ili status daje stored `not_committed`; nikada oba. Fixture obavezno pokriva request izgubljen pre mastera, status pre cutoff-a (`in_progress`), status posle cutoff-a (`not_committed`) i concurrent original-complete/status-close u oba moguća serializovana ishoda.

Complete response je `{contractVersion:1,action:"complete",requestId,lifecycleOperationId,signedLifecycleStatus:"<COMPACT_JWS>"}`. Protected header je exact `alg=EdDSA`, known `kid`, `typ=NRV-ADDON-LIFECYCLE-STATUS+JWT`; strict payload nema unknown polja i sadrži:

```json
{
  "contractVersion": 1,
  "tokenUse": "addon_lifecycle_status",
  "purpose": "original_operation_recovery",
  "iss": "<MASTER_ISSUER>",
  "aud": "nr-cms-addon-runtime",
  "jti": "<UUID>",
  "iat": 1785456000,
  "nbf": 1785456000,
  "exp": 1785456300,
  "lifecycleOperationId": "<ORIGINAL_UUID>",
  "lifecycleAction": "deactivate|transfer_source_complete",
  "lifecycleRequestBodyHash": "sha256:<64_LOWERCASE_HEX>",
  "operationOutcome": "committed|not_committed|in_progress",
  "resultBodyHash": "sha256:<64_LOWERCASE_HEX>",
  "activationId": "<SOURCE_ACTIVATION_UUID>",
  "entitlementId": "<UUID>",
  "addonKey": "webshop",
  "installationId": "<SOURCE_INSTALLATION_UUID>",
  "sourceCanonicalDomain": "<SOURCE_DOMAIN>",
  "licenseCanonicalDomain": "<CURRENT_LICENSE_DOMAIN>",
  "preLifecycleVersion": 1,
  "currentLifecycleVersion": 2,
  "activationStatus": "active|deactivated|transferred|revoked",
  "licenseStatus": "active|suspended|expired|revoked|canceled",
  "transferId": null,
  "targetActivationId": null,
  "targetInstallationId": null,
  "targetCanonicalDomain": null,
  "targetActivationStatus": null
}
```

`resultBodyHash` je non-null samo za `committed` i mora biti stored `LifecycleOperationResultCoreV1` hash; za druga dva outcome-a mora biti JSON null. Exact action/outcome matrica je:

| lifecycleAction | outcome | source `activationStatus` | lifecycle version | domain | transfer/target polja | result hash |
|---|---|---|---|---|---|---|
| deactivate | committed | `deactivated` | `current=pre+1` | `sourceCanonicalDomain=licenseCanonicalDomain` | svih pet transfer/target polja null | deactivation core hash |
| deactivate | not_committed | `active` | `current=pre` | source=license domain | svih pet null | null |
| deactivate | in_progress | `active` | `current=pre` | source=license domain | svih pet null | null |
| transfer_source_complete | committed | `transferred` | `current=pre+1` | license=target | transfer ID, target installation/domain/activation non-null; target status `active` | transfer core hash |
| transfer_source_complete | not_committed | `active` | `current=pre` | license=source | transfer ID, target installation/domain non-null; target activation/status null | null |
| transfer_source_complete | in_progress | `active` | `current=pre` | license=source | transfer ID, target installation/domain non-null; target activation/status null | null |

Ova matrica važi zato što su lifecycle mutacije atomske; `in_progress` nikada ne predstavlja polu-promenu domena/slota. Ako je zasebna kasnija lifecycle akcija promenila current tuple, recovery JWS može je auditirati kao mismatch, ali CMS ne primenjuje originalni outcome i ostaje restricted do revalidation/support recovery-ja. Signer odbija nemoguću kombinaciju pre potpisa, verifier je odbija posle potpisa. Ne postoje action-specific nepoznata dodatna polja i status nikada ne nosi license key.

JWS TTL je najviše 300 sekundi i nema outage grace. CMS prihvata `committed` samo ako operation/action/request hash/result hash i final source/target/domain/lifecycle tuple odgovaraju stored master resultu, zatim finalizuje local disabled/transferred stanje. `not_committed` sme vratiti pre-operation ready stanje samo uz isti source domain/installation, `activationStatus=active`, `licenseCanonicalDomain=sourceCanonicalDomain`, `currentLifecycleVersion=preLifecycleVersion`, null target activation i aktivnu licencu; svaka druga kombinacija ostaje restricted. `in_progress`, invalid/expired JWS, unknown KID ili mismatch ništa ne finalizuju.

Status idempotency namespace je exact unique `(lifecycle_operation_id, action, request_id)` sa jednim `body_hash`; `action` je `challenge|complete`, pa isti request ID sme povezati ta dva različita body-ja bez konflikta. Isti action/request ID/body vraća iste challenge odnosno complete response bytes dok su stored; isti action/request ID sa drugim body hashom daje `409 idempotency_conflict`. `statusChallengeId` je one-time: prvi validan complete ga troši zajedno sa stored signed resultom; exact complete replay vraća iste bytes i ne troši ponovo. Replay challenge-a posle consumption-a vraća isti već-consumed challenge, ne pravi novi. Posle isteka status JWS-a CMS koristi novi request ID i dobija novi challenge; stari request ID se nikada reciklira. `in_progress` response takođe je frozen samo za taj complete observation; sledeće posmatranje koristi novi request ID.

Master trajno zadržava minimalni lifecycle operation tombstone sa operation/action, nullable pa CAS-vezanim final request hashom, original-complete cutoff-om, outcome-om, result-core hashom, activation/installation/pre+final lifecycle tuple-om i transfer bindingom dok postoji entitlement/activation ili bilo koji CMS može legitimno oporavljati stanje; lifetime licenca zato nema time-based brisanje ovog tombstone-a. Purge pre tog uslova je zabranjen. Endpoint ima PoP rate limit/audit bez signature payload-a. Gubitak source private key-a ide u odvojeni dual-control support recovery i nije bypass ovog contracta. Shared fixtures pokrivaju challenge/complete sa istim request ID-em u dva action namespace-a, exact consumed replay, conflict samo unutar istog action-a i novi observation posle JWS expiry-ja.

### 8.2 Exact domain-transfer contract

Prvi contract podržava samo domain-bound licencu sa `activationLimit=1` i zahteva kontrolu i starog installation identiteta i novog installation identiteta/domena. Gubitak starog identiteta je zaseban audited support-recovery proces i nije implicitni bypass.

Koristi se samo:

    POST /api/addons/licenses/transfer

sa `contractVersion=1` i akcijama `prepare|target_complete|source_challenge|source_complete`. Target CMS započinje:

    {
      "contractVersion": 1,
      "action": "prepare",
      "requestId": "<UUID>",
      "licenseKey": "<USER_INPUT>",
      "sourceActivationId": "<UUID>",
      "targetCanonicalDomain": "new.example.com",
      "targetInstallationId": "<UUID>",
      "targetInstallationPublicKey": "<PEM>",
      "targetInstallationKeyFingerprint": "sha256:<HEX>"
    }

Master validira key/status/product policy, source activation i da novi domen nije isti; kreira `license_domain_transfers` red i target challenge. Tabela sadrži transfer/request/body hash, license/source activation i lifecycle-version snapshot, source/target domain+installation+fingerprint, target domain evidence, status, challenge reference, samo hash one-time source approval koda, `source_approval_derivation_kid`, `target_proved_at`, `source_proved_at`, expiries, result hash i audit vremena. Stabilna stanja su:

    requested -> target_proved -> completed
    requested|target_proved -> canceled|expired

`source_proved_at` se postavlja u istoj finalnoj transakciji koja prelazi `target_proved -> completed`; ne postoji polu-commitovano source-proved stanje koje je promenilo source activation bez završenog transfera.

Prepare response je tačno:

    {
      "contractVersion": 1,
      "action": "prepare",
      "transferId": "<UUID>",
      "status": "requested",
      "targetChallenge": {
        "challengeId": "<UUID>",
        "proofPayload": "<BASE64URL_CANONICAL_BYTES>",
        "domainVerification": {"required": true, "method": "https_well_known", "path": "/.well-known/nr-license-domain-proof/<CHALLENGE_ID>"},
        "expiresAt": "<ISO_TIMESTAMP>"
      },
      "transferExpiresAt": "<ISO_TIMESTAMP>"
    }

U `.nr.test` development profilu `domainVerification` ima `required=false`, `method=development_allowlist_exemption`, `path=null`.

Target iz dedicated per-CMS `NR_ADDON_TRANSFER_APPROVAL_SECRET` izvodi stabilni 256-bitni code, umesto da master generiše plaintext koji ne može replay-ovati. Exact UTF-8 bytes bez završnog newline-a su:

    NR-ADDON-TRANSFER-SOURCE-APPROVAL-V1\n<TRANSFER_UUID>\n<TARGET_INSTALLATION_UUID>\n<TARGET_CANONICAL_DOMAIN>

`sourceApprovalCode = base64url_no_padding(HMAC-SHA-256(secret, bytes))` i rezultat je tačno 43 ASCII base64url-no-padding karaktera. Exact hash input je taj tekstualni code kako je generisan, ne decoded HMAC bytes: `sourceApprovalCodeHash = "sha256:" + lowercaseHex(SHA-256(UTF8(sourceApprovalCode)))`, bez trimovanja, normalizacije ili završnog newline-a. Master dobija samo taj hash. Target local pending-transfer red čuva derivation KID, transfer binding i expiry, ne code; zato isti code može reprodukovati posle izgubljenog response-a. Aktivni/old derivation secret KID-evi imaju overlap najmanje do isteka svih vezanih transfera.

Target potpisuje exact master `NRV-ADDON-TRANSFER-TARGET-CHALLENGE-V1` bytes i šalje:

    {
      "contractVersion": 1,
      "action": "target_complete",
      "requestId": "<UUID>",
      "transferId": "<UUID>",
      "challengeId": "<UUID>",
      "proofSignature": "<BASE64URL_ED25519_SIGNATURE>",
      "sourceApprovalDerivationKid": "<TARGET_CMS_TRANSFER_APPROVAL_KID>",
      "approvalBindingSignature": "<BASE64URL_ED25519_SIGNATURE>",
      "sourceApprovalCodeHash": "sha256:<64_LOWERCASE_HEX>"
    }

`proofSignature` i dalje dokazuje exact master target-challenge bytes. Dodatni `approvalBindingSignature` je potpis istim target installation private key-em nad UTF-8 bytes bez završnog newline-a:

    NRV-ADDON-TRANSFER-APPROVAL-BINDING-V1\n<TRANSFER_UUID>\n<CHALLENGE_UUID>\n<SOURCE_APPROVAL_DERIVATION_KID>\n<SOURCE_APPROVAL_CODE_HASH>

KID odgovara `^[A-Za-z0-9._-]{1,100}$`, a code hash je exact lowercase `sha256:<64-hex>` dobijen isključivo prethodnim algoritmom. Shared fixture uključuje fiksni secret/transfer/installation/domain/code/hash vektor i negativne trim/newline/base64-decode varijante. Master proverava oba potpisa, transfer/target installation binding i request idempotency pre nego što u istoj transakciji immutable sačuva KID+hash. KID nije secret, ali nije browser-proizvoljna audit oznaka: promena KID-a ili hash-a ruši binding signature. Tako incident/rotacija može autoritativno pronaći i otkazati sve otvorene transfere pogođenog derivation KID-a.

U produkciji master u istom koraku zahteva novi HTTPS well-known domain-control dokaz iz dokumenta 07. Uspešan response je:

    {
      "contractVersion": 1,
      "action": "target_complete",
      "transferId": "<UUID>",
      "status": "target_proved",
      "sourceApprovalDerivationKid": "<SAME_KID>",
      "sourceApprovalRequired": true,
      "sourceApprovalCodeExpiresAt": "<ISO_TIMESTAMP>",
      "transferExpiresAt": "<ISO_TIMESTAMP>"
    }

Target tek posle ovog response-a prikazuje lokalno reprodukovani code u no-store stranici. Kod nikada nije u URL-u, emailu, logu, analyticsu ili master response-u. Isti idempotency replay vraća iste response bytes, a target reprodukuje isti code čak i kada je prvi response izgubljen.

Korisnik u starom CMS-u unosi transfer ID i source approval code. Source šalje:

    {
      "contractVersion": 1,
      "action": "source_challenge",
      "requestId": "<UUID>",
      "transferId": "<UUID>",
      "sourceApprovalCode": "<BASE64URL_256_BIT_CODE>",
      "sourceInstallationId": "<UUID>"
    }

Master prvo zahteva exact `^[A-Za-z0-9_-]{43}$` string, bez implicitnog trimovanja/dekodovanja, računa hash istim UTF-8 algoritmom iznad i tek zatim constant-time poredi decoded 32-byte hash vrednosti. Zatim vraća:

    {
      "contractVersion": 1,
      "action": "source_challenge",
      "transferId": "<UUID>",
      "status": "target_proved",
      "sourceChallenge": {
        "challengeId": "<UUID>",
        "operationId": "<SOURCE_LIFECYCLE_OPERATION_UUID>",
        "proofPayload": "<BASE64URL_CANONICAL_BYTES>",
        "expiresAt": "<ISO_TIMESTAMP>"
      }
    }

Master pri `source_challenge` durable kreira source lifecycle operation i vraća njegov `operationId`; exact `NRV-ADDON-TRANSFER-SOURCE-CHALLENGE-V1` bytes vezuju request/operation/challenge ID, oba domena/identiteta, licencu, source activation, lifecycle snapshot i expiry. Source complete body je:

    {
      "contractVersion": 1,
      "action": "source_complete",
      "requestId": "<UUID>",
      "operationId": "<SAME_SOURCE_LIFECYCLE_OPERATION_UUID>",
      "transferId": "<UUID>",
      "challengeId": "<UUID>",
      "proofSignature": "<BASE64URL_ED25519_SIGNATURE>"
    }

Kada oba dokaza postoje, master u jednoj serializable/row-lock transakciji ponovo proverava license status, nepromenjen lifecycle version, source `active`, transfer expiry, target domain evidence i activation limit. Zatim:

1. source activation menja u `transferred` i oslobađa stari slot;
2. license canonical domain menja sa old na target i lifecycle version raste;
3. target activation nastaje/reaktivira se kao `active` za isti entitlement i novi installation identitet;
4. transfer/code/challenges postaju consumed/completed;
5. audit i signed lifecycle receipts vezuju old/new domain, obe activation reference i transfer ID.

Sve se commit-uje ili se ništa ne menja. Uspešan source-complete response je:

    {
      "contractVersion": 1,
      "action": "source_complete",
      "operationId": "<UUID>",
      "transferId": "<UUID>",
      "status": "completed",
      "sourceActivationId": "<UUID>",
      "sourceActivationStatus": "transferred",
      "targetActivationId": "<UUID>",
      "targetActivationStatus": "active",
      "oldCanonicalDomain": "old.example.com",
      "newCanonicalDomain": "new.example.com",
      "lifecycleVersion": 2,
      "completedAt": "<ISO_TIMESTAMP>",
      "resultBodyHash": "sha256:<64_LOWERCASE_HEX>",
      "signedSourceLifecycleReceipt": "<JWS>",
      "signedTargetLifecycleReceipt": "<JWS>"
    }

Transfer koristi drugi strict variant istog `LifecycleOperationResultCoreV1` union-a:

```json
{
  "contractVersion": 1,
  "purpose": "addon_lifecycle_result_core",
  "lifecycleAction": "transfer_source_complete",
  "operationId": "<UUID>",
  "transferId": "<UUID>",
  "status": "completed",
  "sourceActivationId": "<UUID>",
  "sourceActivationStatus": "transferred",
  "targetActivationId": "<UUID>",
  "targetActivationStatus": "active",
  "oldCanonicalDomain": "old.example.com",
  "newCanonicalDomain": "new.example.com",
  "lifecycleVersion": 2,
  "completedAt": "<ISO_TIMESTAMP>"
}
```

I ovde se `resultBodyHash` računa samo nad RFC 8785/JCS core bytes. Ni hash ni dva receipt-a nisu deo core-a; source i target receipt moraju bindovati isti core hash. Full response flat-mapira iste business vrednosti i dodaje hash + oba receipt-a. Master čuva core bytes/hash i full response bytes kao jednu immutable operation reviziju. Conditional schema ne dozvoljava deactivation polja u transfer core-u niti transfer polja u deactivation core-u.

Fiksni transfer fixture koristi operation `33333333-3333-4333-8333-333333333333`, transfer `44444444-4444-4444-8444-444444444444`, source activation `55555555-5555-4555-8555-555555555555`, target activation `66666666-6666-4666-8666-666666666666`, domene `old.example.com`/`new.example.com` i vreme `2026-07-31T12:05:00.000Z`. Exact JCS UTF-8 bytes su:

```text
{"completedAt":"2026-07-31T12:05:00.000Z","contractVersion":1,"lifecycleAction":"transfer_source_complete","lifecycleVersion":2,"newCanonicalDomain":"new.example.com","oldCanonicalDomain":"old.example.com","operationId":"33333333-3333-4333-8333-333333333333","purpose":"addon_lifecycle_result_core","sourceActivationId":"55555555-5555-4555-8555-555555555555","sourceActivationStatus":"transferred","status":"completed","targetActivationId":"66666666-6666-4666-8666-666666666666","targetActivationStatus":"active","transferId":"44444444-4444-4444-8444-444444444444"}
```

Očekivani hash je `sha256:c9d1208383c306a9817055011748eec82c356c7b5bc2575bbb5e23bcd4caba02`. Shared fixture dodatno zamenjuje samo jedan receipt i dokazuje da oba verifiera i dalje zahtevaju isti stored core hash, ne hash outer response-a.

Pre slanja `source_complete` source CMS pod installation fence-om durable postavlja isti master-assigned `operationId`, request body hash i local `lifecycle_finalization_pending`, `runtimeStatus=maintenance`, blokira addon access i supersede-uje non-terminalne deployment operacije. Response-loss retry vraća iste stored bytes dok receipt/replay retention važi. Timeout ostavlja source fail-safe restricted i ponavlja isti operation; network grace ne vraća cached active snapshot. Conflict, expiry, promenjen license status/lifecycle ili zauzet target slot ostavljaju master source activation/domain netaknute. Kada validan receipt nikada nije primljen ili je istekao, koristi se isključivo exact PoP/JWS status contract iz 8.1.1 za isti operation/transfer/source/request-hash/lifecycle tuple; pre cutoff-a vraća `in_progress`, `committed` potvrđuje `transferred`, a `not_committed` vraća ready samo uz eksplicitno potpisan source `active`, isti domen i pre-operation lifecycle version. Target CMS zatim pokreće regularni activation challenge/complete sa istim ključem; master nalazi već kreiranu target activation i vraća compatible entitlement/release bez drugog slota. Fixture gubi originalni request pre mastera i response posle master commita i dokazuje da stari CMS ne služi addon dok target već postoji, da exact retry vraća isti receipt u retention roku i da status recovery ne pravi drugi slot.

Master License Server migracija u `.private/license-server` proširuje DB CHECK/Drizzle enum i TypeScript union za master tabelu `vendor_addon_activations.status` vrednošću `transferred`; nije dozvoljeno čuvati je kao slobodan string koji schema odbacuje. Odvojena CMS migracija/contract promena proširuje lokalni verifier/runtime union za primljeni `activationStatus=transferred`. Revalidation source installation identiteta koja dobije taj potpisani status odmah postavlja lokalni entitlement/install u terminalni `disabled` bez network grace-a, zaustavlja/supersede-uje non-terminalne deployment operacije i ne može regularnom activation rutom ponovo zauzeti slot. Povratak zahteva novi, auditovani transfer/support-recovery tok.

`requestId`/body hash, challenge consumption, transfer ID i result hash imaju unique/idempotency zaštitu. Greške koriste jedinstveni lifecycle envelope `{contractVersion:1,error:{code,message,requestId,retryable,currentStatus}}`; schema/proof/auth su `400/401/403`, not-found `404`, expiry `410`, state/binding/idempotency conflict `409`, rate limit `429`, transient/internal `503/500`. One-time code i license key se rediguju. Automatski expiry samo zatvara nedovršen transfer; nikada ne menja domen ili source activation. Admin cancel/recovery zahteva poseban scope, reason, dual-control audit i ne koristi običan customer endpoint.

## 9. Release i supply-chain bezbednost

### 9.1 Autoritativni release zapis

Master release catalog, potpisani package manifest i detached publication attestation moraju se exact složiti za:

- addon key;
- package name i exact semver;
- release ID;
- artifact SHA-256, signed production dependency-lock SHA-256, npm tarball SHA-256/SRI i embedded manifest SHA-256;
- provenance SHA-256, SBOM SHA-256 i publication-attestation SHA-256;
- GitHub registry package-version ID;
- source `releasedAt` i registry-attested `publishedAt` kao odvojena vremena;
- release signing KID i exact manifest/attestation contract version;
- runtime contract, CMS/Node/Next compatibility i minimum core schema;
- target schema, supported addon schema min/max, migration-bundle hash i signed migration inventory;
- sorted `supportedLicenseEditions` i release channel.

Catalog `status=draft|published|withdrawn` je promenljiva master lifecycle metadata i namerno nije deo jednakosti sa immutable embedded manifestom. Manifest, detached publication attestation i catalog moraju se složiti za immutable identity/integrity polja; samo `published` je eligible za novi activation/update.

`updatesUntil=null` znači neograničen update prozor za lifetime politiku. Kada nije null, selector poredi isključivo immutable attested `publishedAt <= updatesUntil`; source/commit `releasedAt` se nikada ne koristi da backdated build objavljen posle roka postane eligible. Master, entitlement producer, CMS verifier i worker dele fixture za oba slučaja.

Master import i worker verifikuju protiv statičkog read-only release public keyseta i pinovanog keyset SHA-256; import/job body ne može doneti sopstveni ključ. Rotacija koristi active + verification-only overlap i novi KID ne potpisuje release dok i master i worker ne potvrde novi keyset hash.

Aktivacija ne sme vraćati proizvoljan package iz user inputa niti oslanjati se samo na hardkodovani `PACKAGE_CONFIG`.

### 9.2 Worker allowlist

Prvi worker dozvoljava samo:

    @radomirradojevic/webshop

Odbija:

- package range, dist-tag i nevalidan semver;
- nepoznat addon/package mapping;
- URL, git dependency, local path i tarball putanju iz requesta;
- `@radomirradojevic/license-server-addon` dok njegov release pipeline nije posebno završen;
- production release potpisan development/fixture KID-em;
- request-provided filesystem path, command, service name ili target.

### 9.3 Registry credential

Worker generiše privremeni npm user config iz secret store-a. Token:

- ima samo `read:packages` i samo potreban owner/repository pristup gde platforma dozvoljava;
- ne upisuje se u CMS `.env`, committed `.npmrc` ili package lock;
- ne prosleđuje se build/runtime procesu kada više nije potreban;
- maskira se u stdout/stderr;
- privremeni fajl se briše u `finally` grani;
- rotira se odmah ako postoji sumnja da je završio u logu ili process dump-u.

Token dobija samo credentialed fetch child pokrenut kroz `NRAddonRegistryCredentialBroker`, koji nema pristup DB sealed root-u. Broker razrešava statički ref direktno u one-shot non-inheritable handle/job-private auth config childa i orchestratoru nikada ne vraća plaintext. Child A preuzima exact root packument/tarball i zatvara se pre secret-free root/manifest/dependency-lock verifikacije; tek verified graph proizvodi plan za zasebni child B koji fetchuje exact transitives/base-lock entry-je. Verifier/install/build rade pod zasebnim `NRAddonBuildSandbox` SID/AppContainer tokenom u no-breakaway kill-on-close Job Object-u; parent, build sandbox, DB controller i runtime nikada ne nasleđuju registry token. Posle svakog childa brišu se config/handle/env, radi se token-fingerprint canary scan i tek onda sledeća faza.

Worker pin-uje Node/npm/`pacote`/`cacache` i po jobu pravi prazan npm-compatible cacache sa packument index i content/integrity entry-jima. Secret-free offline auditor mora kroz isti pinovani `pacote` pročitati root, svaki signed-addon i trusted-base node sa `{offline:true}` i dokazati exact name/version/registry/SRI/edge tuple pre bilo kakvog `npm install`. Finalni install koristi disposable verified-cache kopiju i token-free user config sa samo exact npmjs/GitHub Packages registry mapama, bez `_authToken`/auth headera/secret ref-a; iste mape čuvaju iste offline packument cache key-eve. Outbound je OS-blokiran. Cache miss, dodatni index/content entry ili neplanirani manifest je permanent failure. Strict diff obuhvata sačuvane exact base `package.json` i `package-lock.json`, ne samo finalni dependency graph.

`npm ci --ignore-scripts` je početna politika. Svaki budući package lifecycle script mora proći eksplicitnu reviziju; ne uključivati ga samo zato što ga dependency očekuje.

Release-signed `release-dependency-lock.json` pin-uje kompletan addon-reachable produkcioni graph (node version/integrity/registry i prod/optional/peer edges) za target platformu. Worker ne smatra deployment-time novogenerisani lock autoritativnim: posle CMS+addon lock merge-a i installa rekonstruiše logički graph i zahteva exact signed `dependencyLockSha256`/node/edge/integrity jednakost. Dodat, nestao ili promenjen transitive node je permanent supply-chain failure pre DB mutacije/switch-a.

### 9.4 Migracije

Potpisani package sadrži stvarne migration payload-e i checksumove. Runner:

- uzima target-specific advisory lock;
- proverava da već primenjen migration ID ima isti checksum;
- zapisuje release ID i rezultat u `cms_addon_migrations`;
- ne izvršava nepoznat SQL iz mrežnog requesta;
- izvršava migracije samo unapred, ali V1 admission prihvata isključivo `destructive=false` i `rollbackPolicy=expand_compatible`; `destructive=true|rollbackPolicy=forward_only` odbija kao `unsupported_migration_policy` pre DB lease-a ili bilo kog phase/schema write-a. Contract/destructive faza je budući eksplicitni maintenance release/protokol, ne deo V1 managed aktivacije;
- ne označava release `ready` pre uspešne migracije i reconciliation-a.

Postojeće 45 Webshop business tabele u `public` nisu spremne za običan `legacy_applied`: današnji package 13-table `0001` nije ekvivalentan i ne pakuje SQL, pa je production-ineligible. Exact cutover contract je u dokumentu 03. Worker legacy stanje samo prepoznaje i vraća `operator_schema_cutover_required`; dedicated admin-authorized CLI pod backupom/lockovima premešta strogo allowlisted tabele u `webshop`, radi owner/anchor/settings/FK/index/ACL reconciliation i dokazuje signed `postconditionSchemaFingerprintSha256` plus privilege-manifest/row-count hash. Tek potom addon runner sme da upiše novi canonical baseline kao `legacy_applied`. Root business schema duplikati moraju biti uklonjeni, a rollback ne vraća tabele u `public`.

## 10. Deployment worker izolacija

Svaki target ima statičku konfiguraciju:

| Target | Endpoint/KID | Release root | Baza/env | Service |
|---|---|---|---|---|
| vendor | `https://deploy.nr.test/v1/hooks/vendor/webshop`, vendor KID | `D:\nr_deploy\vendor\releases` | vendor-only reference | vendor process |
| client | `https://deploy.nr.test/v1/hooks/client/webshop`, client KID | `D:\nr_deploy\client\releases` | client-only reference | client process |

Worker mora da:

- proveri realnu apsolutnu putanju pre bilo kog delete/move/switch koraka;
- nikada ne menja `D:\nr_cms` razvojni source;
- pravi novi release, ne patchuje aktivni `node_modules`;
- prvi addon-free `core-bootstrap-<BOOTSTRAP_ID>` release pravi samo operator-authorized worker CLI iz trusted pinovanog CMS source-a, verified base locka, praznog addon registryja i non-secret network-denied builda pod istim target mutex/path-containment pravilima; ad-hoc checkout `.next`/`node_modules` kopija nema autoritet;
- installation-scoped epoch/generation CAS drži odvojeno od target-wide mutexa; mutex ima job-store advisory lock + monotoni fencing token i ostaje aktivan do terminalnog success/recovery receipt-a, ali dozvoljava paralelnost različitih targeta;
- koristi non-interactive komande i timeout po fazi;
- koristi samo hash-pinovani `WindowsScmCmsServiceAdapterV1`: proverava literal service/SID i PID+process-start fingerprint, čeka SCM `STOPPED`, menja pointer, pa startuje isti named servis; nema `taskkill`, PID-only kill ili arbitrary-process fallback;
- prebacuje servis/manifest pointer atomskom i recoverable operacijom;
- čuva prethodni dobar release;
- posle switch-a radi HTTPS health i aplikacionu reconciliation proveru;
- DB phase izvršava long-lived controller pod zasebnim `NRAddonDbCredentialBroker` SID-em: samo on čita DPAPI LocalMachine sealed target credential, drži istu DB session/advisory konekciju, a parent dobija samo HMAC/sequence-verifikovane closed-command receipt-e preko pipe-a čiji ACL dozvoljava orchestrator+DB-broker i odbija build/registry SID;
- build/verifier identity direktno ne može pročitati DPAPI blob, pozvati broker pipe niti napraviti breakaway/detached potomka; canary testira file read + `CryptUnprotectData`, broker IPC i Job Object containment, jer samo env/handle sanitizacija nije authorization granica;
- posle migracija, a pre prvog service-stop/config/pointer write-a, kroz `begin_serving_mutation_fence` durable commit-uje active `cms_addon_serving_fences` red; od tog commita public gate zahteva nula active fence redova, uključujući crash pre stvarne mutacije i same-release redeploy;
- koristi redosled `begin serving fence -> service switch -> liveness/build/addon-loaded -> non-serving candidate reconciliation -> internal candidate readiness -> atomic serving promotion + terminal receipt/fence resolution`; public gate zahteva exact loaded/promoted tuple, terminalni receipt i nula active fence redova, a DB lease/session i target mutex se ne puštaju pre success/recovery/no-mutation receipt-a i odgovarajućeg resolution-a;
- šalje potpisan rezultat vezan za immutable historical operation/job snapshot i exact `reconciliation_receipt|recovery_receipt|no_mutation_receipt` hash; late callback ne menja current stanje.

Windows junction zamena je deo prvog lokalnog contracta samo kroz statički WinSW/SCM model i testirani service/worker ACL. Eventualna buduća target service konfiguracija sa eksplicitnim release path-om zahteva novi verzionirani adapter contract, threat review i migracioni runbook; nije tihi fallback. Ne koristiti delete/copy preko aktivnog release direktorijuma, ad-hoc checkout build ili `npm run dev` kao managed target.

## 11. Revalidation i outage politika

### 11.1 Problem današnjeg stanja

Trenutno CMS deklarativno ima do 14 dana network grace-a, ali:

- entitlement JWS ističe posle približno 7 dana;
- public-key stale cache traje približno 24 sata;
- cache nije trajan preko restarta;
- centralni `resolveEntitlementRuntimeMode()` policy nije povezan sa production putem.

Zato 14-dnevna tolerancija trenutno nije stvarna garancija.

### 11.2 Ciljna politika

Potpisani entitlement treba da razdvoji:

- poslovni `licenseValidUntil` — kada pravo stvarno prestaje; `null` je lifetime, bez sentinel datuma;
- `nextRevalidationAt` — tipično poslednji uspeh + 24 sata;
- `graceEndsAt` — najviše poslednji uspeh + 14 dana i nikada posle `licenseValidUntil`;
- kriptografski envelope `exp` — mora pokriti najdužu dozvoljenu offline upotrebu sa malom clock-skew tolerancijom, na primer 30 dana za redovno osvežavan snapshot.

Runtime može koristiti poslednji potpuno verifikovan i trajno sačuvan snapshot samo kada je revalidation pao zbog klasifikovane mrežne/5xx greške. Ne ignoriše se JWS `exp`; envelope se dizajnira tako da pokrije grace, dok uži poslovni rokovi ostaju eksplicitni claimovi.

Pravila:

- `active` signed odgovor osvežava snapshot, keyset, `lastSuccess`, `nextRevalidationAt` i `graceEndsAt`;
- signed `expired`, `suspended`, `revoked`, `canceled`, `activationStatus=deactivated` ili `activationStatus=transferred` se primenjuje odmah;
- 400/401/403/404, signature/key/claim mismatch i domain mismatch nisu outage i ne koriste grace;
- network timeout, DNS/TLS incident ili master 5xx može koristiti grace;
- grace nikada ne produžava vremenski ograničenu licencu posle non-null `licenseValidUntil`; lifetime i dalje podleže revalidation/grace/envelope rokovima;
- restart mora dati isti rezultat koristeći encrypted/validated DB snapshot i trajni trusted keyset;
- kada grace istekne, addon prelazi u jasno definisan restricted/disabled mod bez gubitka podataka;
- recovery nakon outage-a radi revalidation i state reconciliation pre povratka u `ready`.

Entitlement verifier koristi samo exact `GET /.well-known/nr-license-keys.json`. Master response dolazi iz hash-pinovanog `NRLS_ENTITLEMENT_PUBLIC_KEYSET_FILE` i ima exact schema `{contractVersion:1, issuer:"https://license-server.nrcms.com", purpose:"addon_entitlement", generatedAt, sequence, previousKeysetSha256, keys:[...]}`; `sequence` je pozitivan integer, sequence 1 ima `previousKeysetSha256=null`, a svaki sledeći keyset referencira plain lowercase `64-hex` SHA-256 exact prethodnih bytes, bez `sha256:` prefiksa. Svaki key ima `kid`, `alg:"EdDSA"`, `publicKeyPem`, RFC 3339 `notBefore`/`notAfter` i `status=active|verification_only|revoked`. Plain KID→PEM mapa nije target. CMS bootstrapuje trust samo iz provisionovanog file/hash para, zatim prihvata viši sequence preko trusted TLS-a nakon exact schema/issuer/purpose/time/chaining provere i atomski ga upisuje u `NR_ADDON_ENTITLEMENT_PUBLIC_KEYS_CACHE_FILE` zajedno sa source URL-om, exact bytes/content hashom, sequence-om i `lastVerifiedAt`.

Verifier prihvata samo vremenski važeći `active` ili `verification_only` KID; `revoked` odmah fail-closed odbija čak i ako je snapshot inače u grace-u. Niži sequence je rollback i odbija se; isti sequence+isti hash je idempotentan; isti sequence+drugi hash i viši sequence bez tačne prethodne hash veze se odbijaju. Planirana rotacija je dvostepena: novi KID se prvo objavljuje kao budući `verification_only`, a tek u sledećem chained sequence-u postaje jedini `active` dok stari prelazi u `verification_only`. Stari javni ključ ostaje verification-only najmanje dok svi legitimni snapshotovi koje je potpisao mogu biti provereni. Kompromitovan ključ se ne zadržava radi grace-a; primenjuje se incident runbook. Restart čita samo poslednju atomski završenu, prethodno validiranu cache kopiju i ponovo proverava njen content hash/schema/sequence pre upotrebe.

## 12. Payment i fulfillment bezbednost

- Provider webhook se verifikuje nad originalnim body bajtovima pre parsiranja/mutation-a.
- Webhook `eventRef` ima inbox unique constraint, ali financial dedupe koristi autoritativni opaque provider `captureRef`; isti capture kroz dva različita eventa povećava zbir samo jednom. Event-to-capture veze ostaju lokalni audit i `eventRef` nikada nije canonical capture-evidence/hash polje. Reducer je determinističan i tolerantan na reordered događaje.
- Exact finansijska osa je `pending|authorized|partially_captured|paid|partially_refunded|refunded|disputed|chargeback|failed|canceled`; risk osa je odvojeni vendor-local closed enum `none|security_review|paid_security_review|cleared|refund_required` sa DB CHECK/TypeScript unionom i ne glumi payment status. Samo dual-control audited review menja review u `cleared|refund_required`. Master hold je zaseban versioned/disposition mirror: reversible daje `paused_security_review`, hard disable terminalni marker/refund-revoke tok, a nijedan ne povećava lokalni `riskLifecycleVersion`. Fulfillment gate je `paid + (none|cleared) + no master hold/hard-disable marker`.
- Issue se ne radi u webhook transakciji; durable outbox nastaje atomski sa payment/order tranzicijom.
- V1 issue wire šalje exact `issuanceFence={fulfillmentGeneration,paymentAggregateVersion,financialLifecycleVersion,riskLifecycleVersion}` i normalizovani `payment` objekat sa `paymentAggregateId`, `paymentAuthorizationId`, stable `paymentProvider`, exact `providerCheckoutRef`, currency/order/captured minor iznosima, sorted `captureEvidence[]` (`provider`, `captureRef`, `transactionRef`, amount/currency/capturedAt) i RFC 8785/JCS `paymentAggregateHash`. Evidence ima 1..1000 canonical unique redova; svaki amount/total je lossless safe JSON integer `<=9007199254740991`. Vendor i master nezavisno BigInt-om recompute-uju zbir i zahtevaju `capturedTotalMinor == sum(amountMinor)`; master zatim sam rekonstruiše JCS aggregate/hash i tek onda proverava `capturedTotalMinor >= orderTotalMinor`. Mismatch, 1001 red, unsafe integer ili sum overflow pada pre issue-a. Fence ulazi u full request/idempotency hash i vendor response CAS, ali ne u finansijski aggregate hash. `(paymentProvider,providerCheckoutRef)` je namespace-bound unique, svi capture redovi imaju isti provider/currency, a master proverava `used` authorization bez hard-disable markera istog JTI/order/item snapshot-a i u issue transakciji ga menja u `paid`. Ne šalje se izmišljena `webshop:<orderId>` referenca; browser, customer profil, `eventRef` i raw webhook payload nisu issue input. Delta adapter ima immutable unique capture redove; cumulative-only V1 koristi jedan stabilni provider financial-object ref i jedan monotonic-max red, pa isti snapshot skup u različitom redosledu daje iste frozen bytes ili ostaje manual review. Shared no-go fixture pokriva total/sum mismatch, 1001 red, unsafe vrednost i sum overflow.
- Master create-only veza unique `(vendorApiClientId,paymentProvider,captureRef)` sprečava da isti stvarni capture finansira drugi aggregate/order/JTI/licencu; exact issue replay koristi istu vezu, a drugi binding je `409 payment_evidence_conflict`.
- Idempotency key je stabilan za isti order item/operation i ne koristi random vrednost po retry-u.
- Odgovor sa license key-em se pre durable čuvanja šifruje namenskim `WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KEY` ključem; API-credential KEK se ne koristi za ovu namenu.
- Issued-key AES-GCM envelope sadrži verziju i KID, koristi exact purpose/issue ID/order-item ID/fingerprint AAD iz dokumenta 08, a DB `license_key_kid` mora odgovarati envelope KID-u. Fingerprint se računa pre enkripcije.
- Decryptor prihvata aktivni i eksplicitno konfigurisane stare KID-eve; novi write koristi samo aktivni KID.
- Rotacija radi batch decrypt/rewrap pod row lock-om ili optimistic version kontrolom, bez plaintext loga; stari ključ se uklanja tek kada nema redova na starom KID-u i prođe backup-retention period.
- Legacy issue redovi bez KID-a koji su šifrovani API-secret helperom prolaze eksplicitnu `legacy-license-server-secret-v1` migracionu granu; ne dobijaju KID prostim metadata update-om.
- Plaintext se odmah uklanja iz promenljivih/log konteksta koliko runtime dozvoljava.
- Fulfillment i notification imaju odvojene attempt countere, exponential backoff, max attempts, DLQ i auditovan manual retry.
- Ne automatski re-issue-ovati novu licencu samo zato što je notification pao.

## 13. Bezbedna isporuka ključa

Podrazumevani email ne sadrži plaintext ključ. Sadrži HTTPS link sa kratkotrajnim, opaque tokenom. U bazi se čuva samo hash tokena i metadata.

Reveal endpoint:

- za signed-in kupca proverava order ownership;
- za gosta proverava token hash, expiry, audience/order binding i usage policy;
- koristi POST za reveal/copy mutation;
- odgovara sa `Cache-Control: no-store, private`, `Pragma: no-cache` i odgovarajućim CSP/referrer pravilima;
- nema analytics, chat widget ili third-party asset na reveal odgovoru;
- nikad ne stavlja ključ u URL, HTML metadata, structured log ili exception;
- auditira order, item, user/token fingerprint, vreme, rezultat i IP/user-agent prema privacy politici;
- postavlja `deliveredAt` tek posle uspešnog reveal-a;
- omogućava auditovan resend koji rotira/stornira prethodni aktivni guest token.

Prvi guest email link nužno nosi bearer token u path-u, zato Caddy za `/licenses/order-delivery/*` ne sme logovati raw URI/path/query: access log se za taj matcher isključuje ili se pre zapisa rediguje na route template `/licenses/order-delivery/:token`. Next.js route, tracing, metrics i error reporting takođe koriste samo template + request ID i nikad raw pathname/header dump. Odgovor postavlja exact `Referrer-Policy: no-referrer`. E2E canary test prolazi kroz Caddy i skenira edge/app/telemetry/error logove; poznati token se ne sme pojaviti ni jednom.

Hash-only delivery-token outbox sme koristiti samo email adapter koji podržava idempotent send i autoritativni retrieve/reconciliation po deterministic `providerMessageKey=webshop-license-delivery:v1:<notificationId>:<generation>`. Lookup samo po provider message ID-u nije dovoljan: taj ID ne postoji lokalno ako proces padne posle provider commita a pre ACK-a. Message ID je dodatni lookup tek posle durable upisa. Unknown key outcome ostaje reconciliation; novi token/generation je dozvoljen tek posle autoritativnog `not_found`/no-commit ili definitivnog pre-accept failure-a.

Admin podrška vidi fingerprint i status, ne plaintext po defaultu. Break-glass reveal zahteva pojačanu autentifikaciju i poseban audit događaj.

## 14. Logovanje, redakcija i audit

### 14.1 Nikada ne logovati

- plaintext license key ili njegov puni hash;
- API shared secret, HMAC signature ili registry token;
- signing/encryption private key;
- installation private key ciphertext zajedno sa KEK-om;
- purchase intent ili delivery token;
- puni payment/email credential;
- kompletan request body ako može sadržati navedene vrednosti.

Dozvoljene korelacione vrednosti:

    requestId
    traceId
    operationId
    deploymentJobId
    orderId / orderItemId
    master entitlementId
    installationId
    releaseId
    package version
    signing KID
    redigovani/fingerprintovani external reference
    status/error code/attempt count/duration

Koristiti centralni redaction filter i test koji u log fixture-u traži poznate canary secret vrednosti.

### 14.2 Audit događaji

Minimalno auditirati:

- admin bootstrap/login/password promenu;
- API client create/rotate/revoke i scope promenu;
- product/SKU/requiresDomain promenu;
- durable catalog revision/drift i purchase-offer revalidation;
- release import/activate/withdraw;
- manual license issue/suspend/revoke/transfer;
- purchase-intent issue/accept/reserve/release/consume/cancel i domain-proof evidence;
- activation challenge/complete/deactivate i transfer target/source/completion;
- deployment job accept/start/fail/switch/rollback/reconcile;
- payment state i fulfillment lifecycle;
- delivery reveal/resend/break-glass;
- signing key/keyset status promenu, envelope rewrap count i emergency credential revoke.

Audit red je append-only u aplikacionom smislu, sa kontrolisanim retentionom i bez tajni.

## 15. Metrics i alerting

Obavezne metrike:

- master API request count/latency po route/result bez high-cardinality secreta;
- auth failure/replay/rate-limit broj;
- activation challenge issued/expired/replayed/completed;
- domain-proof success/reject po reason klasi bez hostname high-cardinality labela;
- catalog revision/drift i offer revalidation-required broj;
- revalidation success, classified outage, invalid response i grace-age;
- install operation queue depth, age, attempts, DLQ i duration po fazi;
- active release i rollback count po targetu;
- payment inbox lag, duplicate count i invalid signature count;
- paid-but-unissued order count i najstarija starost;
- issue retry/DLQ i response-loss replay count;
- notification retry/DLQ i delivered/reveal latency;
- lifecycle operation backlog;
- nonce/challenge cleanup lag;
- trusted keyset age i unknown-KID greške;
- host-capability mismatch pre deploymenta;
- ciphertext count po purpose/KID-u i legacy/unknown-KID redovi.

Primer alertova:

- bilo koji paid order bez licence duže od definisanog SLO-a;
- install/revalidation DLQ > 0;
- master signing key ili keyset blizu isteka;
- veliki skok auth/replay/signature grešaka;
- više target rollbacka u kratkom periodu;
- aktivni CMS u grace stanju duže od 24/48 sata;
- notification backlog sa isteklim delivery tokenima;
- nonce/challenge cleanup nije radio prema rasporedu.

## 16. Backup i restore

Pre migracije ili release switch-a napraviti target-specific DB backup/snapshot i zapisati ID u deployment job. Za CMS deployment backup uključuje:

- PostgreSQL bazu;
- runtime storage/upload objekat ili verzionisanu referencu;
- encrypted installation identity redove;
- odgovarajući active+old installation, vendor master-credential i issued-license envelope KID/keyring secret versions iz secret backup procedure;
- active+old transfer-approval derivation KID/secret verzije koje su potrebne da svaki pending transfer posle restore-a reprodukuje isti approval code;
- aktivni i prethodni release manifest/pointer;
- env/config version reference, ne plaintext dump tajni.

Restore test mora dokazati da DB i secret key pripadaju istom targetu. Restore vendor baze na client target bez eksplicitne identity rotation/transfer procedure je zabranjen jer bi klonirao installation identitet.

Master restore mora očuvati:

- license/activation/idempotency/nonce/audit ledger;
- signing key verzije i hash-pinovani public keyseti potrebni za postojeće entitlement/purchase audit artefakte;
- active+old secret encryption key verzije potrebne za API client/replay podatke;
- release catalog i lifecycle istoriju.

Deployment worker PostgreSQL backup je zaseban i obuhvata durable jobs/leases, request replay/idempotency, per-target highest accepted epoch/fence, phase evidence i result outbox. Registry/deployment HMAC tajne nisu u SQL dumpu; active+old secret-store verzije backupuju se kroz kontrolisanu secret proceduru. Isolated restore ne sme odmah dispatchovati: za svaki target prvo read-only poredi restored highest epoch i non-terminalne operations sa autoritativnim CMS `installation_deployment_epoch`. Restore sa starijim/konfliktnim fence stanjem ide u incident/manual reconciliation, nikada ne vraća runtime ili callback unazad.

Backup koji nikada nije testirano restore-ovan nije dovoljan production gate.

## 17. Rollback po fazama

### 17.1 Pre release switch-a

Ako package download, verification, registry generation, build ili migration preflight padne:

- job prelazi u retryable/failed stanje;
- aktivni release i proces se ne menjaju;
- entitlement ostaje `install_pending` ili prethodno `ready`, sa jasnim desired/current release razlikama;
- privremeni registry credential se uklanja;
- novi nepotpuni release se karantiniše ili kasnije čisti posebnim postupkom.

### 17.2 Posle forward migracije, pre health uspeha

Kod se može vratiti samo na prethodnu verziju koja je deklarisano kompatibilna sa novom expand fazom šeme. Automatski down migration nije podrazumevana opcija.

Ako prethodni kod nije schema-compatible:

- zadržati novi kod u restricted maintenance modu ili primeniti unapred pripremljen forward fix;
- ne izvršavati ad-hoc destruktivni SQL;
- uključiti incident proceduru i restore samo uz odobren gubitak svih promena posle backup-a.

### 17.3 Posle uspešnog switch-a

Health i reconciliation failure pokreću rollback na prethodni kompatibilni release. Worker:

1. zapisuje failure fazu i dokaz;
2. vraća service pointer;
3. restartuje samo target servis;
4. proverava prethodni health;
5. čuva failed release za analizu;
6. CMS desired-operation `status` ostaje `failed`, ali odvojeni `runtime_status=ready` i installed/current polja pokazuju dokazano zdravi prethodni release; result je `finalPhase=rolled_back`. Admin vidi desired mismatch/`rollback_succeeded`, dok runtime/storefront može ostati dostupan. Initial failure nema prethodni release i ostaje `runtime_status=not_installed`. Ne uvoditi dvosmisleni `rollback_ready` status niti prikazivati željeni release kao uspešan.

Ako stara binarna verzija nije kompatibilna sa forward schema-om, pointer se ne vraća: result je `failed+maintenance_required`, `runtime_status=maintenance` i sledi forward fix. Neuspeo dozvoljeni rollback daje `failed+rollback_failed`, `runtime_status=unavailable` i incident/manual recovery. Ove vrednosti su exact worker callback contract iz dokumenta 05.

### 17.4 Poslovni rollback nije code rollback

Već captured payment i izdata licenca ostaju poslovna obaveza čak i ako novi deploy padne. Ne brišu se order/issue redovi. Sistem mora omogućiti:

- retry istog fulfillmenta;
- manual audited delivery;
- refund/revoke kroz definisani lifecycle;
- customer-support evidenciju.

Vraćanje koda ne sme ponovo izdati licencu niti „poništiti” provider događaj.

## 18. Incident runbookovi

### 18.1 Sumnja na registry token leak

1. Odmah opozvati token na GitHubu.
2. Zaustaviti nove deployment jobove; aktivni CMS može nastaviti sa već instaliranim paketom.
3. Pretražiti redigovane CI/worker logove i release fajlove za fingerprint/canary.
4. Izdati novi read credential i ažurirati worker secret version.
5. Dokazati clean install bez starog tokena.
6. Dokumentovati vreme, exposure scope i pogođene package verzije.

### 18.2 Release signing key kompromitovan

1. Zaustaviti publish/import i nove install/update dispatch-e za pogođeni KID.
2. Objaviti viši `AddonReleaseKeysetV1.sequence` koji chain-uje prethodni hash i zadržava pogođeni KID kao `status=revoked`; ne uklanjati ga niti ga ostaviti `verification_only`. Reprovision/pin master i svaki worker i zahtevati potvrdu novog sequence/hash-a.
3. Sve master release redove potpisane pogođenim KID-em iz incident scope-a prebaciti `published -> withdrawn`; catalog nema paralelni „trust status”.
4. CMS supersede-uje/canceluje svaki queued desired operation tog KID-a, a worker ponovo proverava revoked status neposredno pre mutacije i odbija već accepted/queued job.
5. Inventarisati već instalirane targete. Pod installation epoch/fence contractom reconcile-ovati ih prema nezavisno dokazano poznatom dobrom artifact/tarball/attestation evidence-u; ako takav dokaz ne postoji, postaviti maintenance umesto slepog zadržavanja ili brisanja.
6. Kreirati novi release signing pair, proći chained two-stage trust rollout za novi KID i rebuild/re-sign/re-publish pod novom package verzijom. Ne prepisivati immutable package verziju.
7. Auditirati publish/import/job/switch događaje, vreme mogućeg potpisa i svaki target rezultat; incident se ne zatvara dok queued i active inventory nisu reconciled.

### 18.3 Master entitlement signing key kompromitovan

1. Odmah zaustaviti novo activation complete, revalidation response i deactivation/transfer lifecycle-receipt potpisivanje; challenge/read-only audit može ostati, ali nijedan novi live receipt/entitlement ne izlazi starim key-em.
2. Generisati novi odvojeni pair/KID i objaviti viši chained entitlement keyset sequence u kome je stari KID tačno `revoked`, a novi jedini `active`. Incident rotacija nema verification-only grace za kompromitovan key.
3. Ažurirati pin/hash gde se statički provisionuje i forsirati fetch/cache refresh na svim CMS targetima. Activation/revalidation/lifecycle complete ostaju blokirani dok svaki relevantni target ne potvrdi novi sequence/hash i revoked vektor.
4. CMS odmah odbija svaki snapshot/receipt pogođenog KID-a kao cryptographic invalid bez network grace-a, čak i ako `exp/graceEndsAt` nisu prošli. Unknown ili anti-rollback keyset greška je takođe fail-closed.
5. Pod auditom pregledati legitimne activation/licence/lifecycle redove i tek zatim novim active key-em izdati svež V2 snapshot kroz regularnu PoP revalidation putanju. Do tada addon radi restricted/disabled prema policy-ju; ne prepisuje se KID u postojećem JWS-u.
6. Auditirati sve activation/revalidation/deactivation/transfer receipt događaje u pogođenom periodu i suspendovati/revoke-ovati neovlašćene state promene. Purchase-intent authority ostaje odvojena i ne rotira se automatski, jer reuse istog pair-a mora biti zabranjen.

### 18.4 Master purchase-intent signing key kompromitovan

1. Aktivirati kill switch za novi purchase-intent `challenge` i `complete`; vendor acceptance za pogođeni KID odmah blokirati.
2. Pogođeni KID označiti `revoked` u versioniranom keysetu, objaviti endpoint iz pinovanog fajla i forsirati vendor refresh. Kompromitovan ključ nikada ne ostaje `verification_only` radi overlap-a.
3. Pod DB lock-om `issued`, `accepted` i sve `reserved` intente tog KID-a prebaciti u `canceled`. Contract zabranjuje payment pre `consumed`, pa vendor authenticated reconciliation otkazuje svaki lokalni `intent_confirmation_pending` order bez naplate; ne pokušava se procena nepoznate pre-consume order veze na masteru.
4. `consumed` ostaje terminalan: ne resetovati JTI i ne stvarati novi intent/order automatski. Blokirati novo plaćanje/issuance dok se isti order, vendor client, domain proof i snapshot ne pregledaju.
5. Kreirati novi odvojeni Ed25519 pair/KID, provisionovati hash-pinovani keyset i dokazati challenge/accept/consume test pre nastavka issuance-a.
6. Auditirati sve accepted/reserved/consumed intente potpisane pogođenim KID-em, povezane order-e, payment-e i licence. Neovlašćene licence suspendovati/revoke-ovati kroz lifecycle, a legitimne re-issue/notification odluke povezati sa originalnim auditom.
7. Obavestiti operacije/kupce prema incident klasifikaciji i tek zatim postepeno vratiti challenge, vendor acceptance, checkout i issue switch-eve.

### 18.5 Vendor-master HMAC secret kompromitovan

1. Opozvati secret-version KID na masteru.
2. Privremeno zaustaviti vendor catalog/issue/lifecycle worker.
3. Kreirati novu verziju sa najmanjim scopes.
4. Ažurirati vendor encrypted settings i testirati catalog.
5. Pregledati nonce/idempotency/audit zapise za neovlašćene issue pozive.

### 18.6 At-rest KEK kompromitovan

Rutinski rewrap nije dovoljan kada je KEK možda otkrio plaintext:

1. **Master `NRLS_SECRET_ENCRYPTION_*`:** zaustaviti pogođene API tokove, uvesti novi KEK/KID, ali istovremeno smatrati sve dekriptabilne vendor HMAC secret-version vrednosti i replay response materijal izloženim. Opozvati/rotirati svaki pogođeni API credential KID, poništiti aktivne auth session/nonce artefakte gde je primenljivo, auditirati catalog/intent/issue/lifecycle pozive i tek zatim rewrap-ovati ciphertext novim KEK-om. Ako je encrypted final response sadržao customer license key, uključiti ga u issued-key incident scope.
2. **Vendor master-credential `WEBSHOP_LICENSE_SERVER_SECRET_KEY`:** prvo opozvati pogođeni master HMAC credential/version, provisionovati novi least-privilege credential, zatim ga čuvati pod novim vendor KEK/KID-em i rewrap-ovati samo istorijske neaktivne redove. Rewrap starog plaintext credentiala nije rotacija autentikacije.
3. **CMS installation `NR_ADDON_INSTALLATION_ENCRYPTION_KEY`:** smatrati Ed25519 installation private key izloženim. Master suspenduje/revoke-uje pogođenu activation, a audited recovery pravi nov installation UUID/key/fingerprint i ponavlja domain/installation proof kroz re-enroll/transfer proceduru. Ne rewrap-ovati isti privatni key i tvrditi da je identitet bezbedan.
4. **Vendor issued-license KEK:** pauzirati reveal, identifikovati svaki ciphertext/KID koji je mogao biti dekriptovan, suspendovati/revoke-ovati ili reissue-ovati customer licence prema incident policy-ju i poslati novu secure delivery notifikaciju. Novi KEK štiti nove ciphertextove; samo rewrap istog izloženog license key-a ne uklanja kompromitaciju.
5. Za svaku klasu sačuvati incident evidence, rotirati backup/secret-store kopije, uraditi zero-count/restore test i obavestiti pogođene korisnike prema klasifikaciji.

### 18.7 Transfer-approval derivation secret kompromitovan

1. Zaustaviti novi transfer `prepare/target_complete` na pogođenom CMS targetu.
2. Rotirati `NR_ADDON_TRANSFER_APPROVAL_SECRET/KID`; kompromitovani KID se ne koristi za overlap.
3. Sve master `requested|target_proved` transfere vezane za taj derivation KID otkazati uz audit i invalidirati source challenges/codes; target briše odgovarajuće local pending redove. Započeti novi transfer sa novim KID-em umesto reprodukovanja starog code-a.
4. Completed transfere ne vraćati automatski, ali pregledati source/target receipt i installation proof događaje; neovlašćeni completion ide u license/installation incident recovery.
5. Stari secret ukloniti iz runtime/backup keyring-a tek po potvrdi da nema otvorenih vezanih transfera.

### 18.8 Paid order ostao bez licence

1. Ne pokretati manual novo izdavanje sa novim idempotency key-em.
2. Naći postojeći order-item operation i master idempotency rezultat.
3. Klasifikovati: queue, auth/scope, master outage, response loss, invalid domain/SKU ili terminal business error.
4. Popraviti uzrok i retry-ovati isti operation.
5. Ako master nema commit, isti key bezbedno kreira prvi rezultat; ako ga ima, vraća isti entitlement.
6. Tek uz eksplicitnu ljudsku odluku raditi refund/revoke ili compensating operation.

### 18.9 Pogrešan domen ili pogrešan kupac

1. Suspendovati/revoke-ovati pogrešnu licencu prema incident politici.
2. Ne menjati domen direktnim SQL-om.
3. Sačuvati purchase intent, order snapshot i audit dokaze.
4. Koristiti odobren transfer/re-issue tok sa jasnom vezom prema originalnoj licenci i paymentu.
5. Obavestiti kupca bez slanja punog ključa u support poruci.

## 19. Kill switch i degradirani režimi

Potrebni su odvojeni switch-evi, ne jedan globalni prekidač:

- zabrani nove purchase intente;
- zabrani checkout licencnih proizvoda;
- zaustavi nova issuance enqueue-ovanja, ali zadrži inbox;
- pauziraj fulfillment worker uz očuvan queue;
- pauziraj deployment worker po targetu;
- povuci određeni release/package version;
- zabrani nove aktivacije uz nastavak revalidation-a;
- ograniči delivery reveal/resend;
- postavi storefront maintenance poruku.

Switch ne sme obrisati queue niti učiniti već plaćene order-e nevidljivim. Pri ponovnom uključivanju worker nastavlja iz durable stanja.

## 20. Retention i privatnost

Definisati i dokumentovati rokove za:

- payment webhook payload/derivate;
- purchase intent i replay ledger;
- nonce/challenge redove;
- delivery token hash i reveal audit;
- deployment build/log artefakte;
- license activation/revalidation audit;
- korisnički email/IP/user-agent podatke;
- revoked/expired license istoriju.

Minimizovati podatke: masteru nije potreban ceo order/customer profil; deployment workeru nisu potrebni domen kupca, email ili license key; email provideru nije potreban master API identitet. Pravo brisanja ličnih podataka ne sme uništiti minimalni finansijski/licencni audit koji zakonito mora ostati — koristiti pseudonimizaciju/fingerprint gde je moguće.

## 21. Production readiness gate

Pre produkcije mora biti dokazano:

- [ ] threat model je pregledan za stvarne cloud/service naloge;
- [ ] svi ključevi/tajne imaju vlasnika i testiranu rotaciju;
- [ ] production signing KID allowlista odbija sve development KID-eve;
- [ ] GitHub Packages read token nije u CMS runtime-u;
- [ ] master HMAC V2, scopes, nonce i idempotency integration testovi prolaze;
- [ ] purchase intent tamper/expiry/replay testovi prolaze;
- [ ] jedan JTI ne može dati dve cart/SKU/order-item/license veze ni pod konkurencijom;
- [ ] production HTTPS well-known domain-control i SSRF/DNS pinning testovi prolaze; development exemption je production-disabled;
- [ ] unchanged catalog čitanje ima stabilan durable version/ETag, a mutacija jedina menja revision;
- [ ] domain canonicalization test vektori su isti u sva tri repozitorijuma;
- [ ] worker target isolation, rollback i token-leak testovi prolaze;
- [ ] redeploy/result HMAC active+old KID rotacija zadržava pending request/result outbox retry i uklanja stari KID tek posle zero-outstanding/retention dokaza;
- [ ] outage grace radi preko restarta i nikad ne nadživljava licencu;
- [ ] entitlement/purchase keyset rotation i compromise runbook rade, uključujući revoked-KID ponašanje;
- [ ] master wrapped-DEK, vendor-credential, installation i issued-license envelope rewrap/zero-count/restore testovi prolaze;
- [ ] transfer-approval derivation secret ima testiranu planiranu rotaciju, pending-transfer restore i kompromitovani-KID cancel/restart proceduru;
- [ ] paid-but-unissued, DLQ, key expiry i rollback alertovi rade;
- [ ] restore je izveden u izolovanom okruženju;
- [ ] full refund/dispute/deactivation/transfer imaju auditovane tokove;
- [ ] activation/revalidation release izbor i worker recheck koriste isti host-capability descriptor hash;
- [ ] secure delivery nema ključ u URL-u, email body-ju ili logu;
- [ ] lokalni `.nr.test`, Caddy CA i test credentiali nisu preneti u produkciju;
- [ ] produkcijski webhook endpointi su javno dostupni samo gde moraju biti i svi potpisi se proveravaju.

Operativni E2E dokaz prati [09 — Lokalni E2E runbook](09-lokalni-e2e-runbook.md), a redosled izgradnje prati [11 — Implementacioni roadmap](11-implementation-roadmap.md).
