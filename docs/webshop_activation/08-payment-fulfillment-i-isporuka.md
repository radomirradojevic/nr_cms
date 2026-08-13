# 08 — Checkout, uplata, fulfillment i isporuka

## Cilj

Master licenca se izdaje jednom, i samo jednom, nakon autoritativno potvrđene pune uplate. Izdati ključ se čuva šifrovano i kupcu se isporučuje kroz bezbedan order-delivery tok.

## 1. Rollout precondition

Prompt 18 je završio V2 rollout. Promenljive `WEBSHOP_PAYMENT_STATE_V2`,
`WEBSHOP_LICENSE_OUTBOX_V2` i `VENDOR_LICENSE_API_V2` su uklonjene; payment,
fulfillment i master API V2 putanje su jedine autoritativne putanje.

Release ostaje dozvoljen tek kada:

- sve potrebne migracije postoje;
- V2 API client/KID/scopes rade;
- catalog sync radi;
- purchase intent i domain snapshot rade;
- secure delivery radi.

Ako bilo koji uslov padne, startup/release gate mora fail-closed; nema legacy
flag fallback-a.

## 2. Autoritativno payment stanje

Payment provider callback/webhook mora:

1. proveriti provider potpis nad originalnim body bytes;
2. ograničiti body size;
3. normalizovati provider event type;
4. upisati immutable payment inbox event sa unique provider event ID-em;
5. vratiti idempotentan odgovor za duplicate;
6. reducer obrađuje event u DB transakciji;
7. ne poziva master unutar webhook transakcije.

## 3. P0: puna, a ne bilo koja pozitivna uplata

Current provider integration već odbija neke obične partial-capture slučajeve kada dobije eksplicitni amount/cumulative koji nije jednak totalu. Međutim, sam V2 reducer i dalje može označiti bilo koji pozitivan capture kao `paid`, a događaj u kome su amount i cumulative oba `null` može implicitno pasti nazad na puni order total. Zato postojeća provera nije dovoljan end-to-end dokaz.

TARGET:

    captured_total_minor >= order_total_minor
    AND currency == order_currency
    AND provider transaction belongs to checkout/order
    AND event signature is valid
    AND captured_total_minor is explicitly derived from verified provider data

Tek tada `paymentStatus` postaje tačno `paid` i prvi put se enqueue-uje fulfillment. `captured_total_minor` ostaje zasebna kumulativna finansijska činjenica; `captured` nije drugi naziv niti dodatna enum vrednost za `paid`.

Odvojeni vendor-local `riskStatus` je closed enum `none|security_review|paid_security_review|cleared|refund_required`. DB CHECK/Drizzle/TypeScript moraju biti isti. Samo dual-control audited review sa reason-om sme da menja review stanje u `cleared|refund_required`; novi lokalni provider/fraud/dispute signal vraća `cleared` u review i povećava `riskLifecycleVersion`. Current master purchase-intent hold je druga osa: `masterSecurityHoldActive`, monotoni `masterSecurityHoldVersion`, closed `masterSecurityHoldDisposition=reversible_hold|hard_disable|null`, reason i changed-at mirroruju HMAC-verifikovan master status, ali ne menjaju `riskStatus`, `riskLifecycleVersion` ni frozen four-field `issuanceFence`. Kada active=false, disposition/reason/changed-at su null. Jedini istorijski hard-disable autoritet je zaseban top-level mirror `masterHardDisableOccurred/blockId/at/reasonCode/postIssueCompensation`; current clear ga ne briše. Pre-issue enqueue/send i response acceptance zahtevaju exact `paymentStatus=paid AND riskStatus IN (none,cleared) AND masterSecurityHoldActive=false AND masterHardDisableOccurred=false` uz iste local fence verzije i svež master observation. Post-issue notification/token/reveal ne vezuje pravo zauvek za finansijski `paid`: zahteva durable committed issue, latest-started=latest-applied fresh HMAC `/api/v1/entitlements/validate` observation `valid=true,status=active` za isti environment/entitlement/domain/issue/causal tuple, neisteklu licencu, `postIssueReconciliationStatus=resolved_active`, odsustvo pending/revoke compensation, `riskStatus IN (none,cleared)`, current hold false i top-level hard-disable false. Reversible hold daje izvedeni fulfillment `paused_security_review`; hard disable daje terminalni refund/revoke review. Nijedno nije autoritativni vendor risk enum write.

`postIssueReconciliationStatus` je DB CHECK/Drizzle/TypeScript closed enum sa tačno četiri vrednosti:

    resolved_active | review_pending | compensation_pending | resolved_revoked

Kolona je nullable samo dok issue nema durable committed entitlement/frozen response; DB CHECK zahteva `committed_at IS NULL AND entitlement_id IS NULL => post_issue_reconciliation_status IS NULL`, odnosno svaki committed entitlement mora imati non-null jednu od četiri vrednosti. Prvi durable committed result u istoj transakciji uvek postavlja `review_pending`, čak i u normalnom current-fence slučaju; sledeći fresh validate/CAS tek radi `review_pending -> resolved_active`. Time crash posle čuvanja ključa, a pre online validacije, ostaje fail-closed. Partial refund, reversible-hold ili vendor-local `security_review|paid_security_review` race ostaje u `review_pending`, bez delivery-ja i bez automatskog revoke-a. Dispute-open race takođe durable vezuje/stashuje isti entitlement i enqueue-uje tačno jednu `suspend` lifecycle operaciju; ni suspend ni review ne otkrivaju ključ. Jedan unique, version-CAS-ovan audited decision red po `(issueId,financialLifecycleVersion,riskLifecycleVersion,masterSecurityHoldVersion)` bira dozvoljeni sledeći ishod; konkurentna odluka je conflict. `retain_active` posle clearance-a reversible hold-a, audited local `cleared` ili partial-refund retain odluke zahteva da current causal review bude razrešen, da nema novog terminalnog događaja i da fresh master validation potvrdi isti entitlement; tada vraća `review_pending -> resolved_active` bez drugog issue-a, iako je current lifecycle-version tuple opravdano viši od pre-issue snapshot-a. Dispute won tek posle potvrđenog `reinstate` i fresh active validation vraća isti entitlement u `resolved_active`; dispute lost, `refund_required`, `revoke`, hard disable, full refund ili reversal radi `review_pending|resolved_active -> compensation_pending -> resolved_revoked` kroz tačno jednu causal compensation operaciju. Nijedan drugi string/tranzicija nije dozvoljen, a delivery je moguća samo u `resolved_active`.

Expand/backfill/contract migracija prvo dodaje nullable kolonu i enum/CHECK u deferred obliku, zatim svaki postojeći committed/issued legacy red bez vrednosti postavlja na `review_pending`, nikada na `resolved_active`. Reconciliation worker pod row/version lock-om pokušava namenski issued-key decrypt, exact master validate i current gates; validan red prelazi u `resolved_active`, a unknown KID, undecryptable ciphertext, ID/domain/status mismatch ili outage ostaje `review_pending` uz manual-review incident. Tek posle zero-null-for-committed provere CHECK postaje validan/enforced. Rollback aplikacije pre contract faze ignoriše novu kolonu, ali ne briše je niti vraća fail-open. Fixture pokriva pending issue sa null, crash između committed+`review_pending` i validate-a, legacy committed backfill i undecryptable red koji ostaje blokiran.

„Master-confirmed active/non-expired” ima jedan exact server-only dokaz. Vendor neposredno pre `resolved_active` odluke, notification send/ACK reconciliation-a, guest token exchange-a i reveal-a dekriptuje issued key samo u memoriji i HMAC-authenticated poziva postojeći `POST /api/v1/entitlements/validate` sa strict body-jem `{contractVersion:1,licenseKey,domain}` za isti canonical order domain. Prihvata samo strict 200 body `{contractVersion:1,entitlementId,licenseId,reason,status,valid,validUntil,updatesUntil}` bez unknown polja, gde `valid=true`, `reason=null`, `status="active"`, `entitlementId=licenseId=<ISSUE_ENTITLEMENT_ID>` i nullable `validUntil` nije istekao. Key/request body se ne loguju niti durable čuvaju.

Pre svakog network call-a vendor pod issue lock-om monotono povećava `validationObservationGeneration`, insertuje pending `post_issue_license_observations` red i vezuje ga za issue/entitlement/domain/license-key fingerprint plus current financial/risk/master-hold/hard-disable/post-issue decision verzije. Response se primenjuje samo CAS-om ako je generation i ceo causal tuple i dalje current; niža/zakašnjela generation ostaje evidence-only `ignored` i nikada ne prepisuje noviju. Timeout ostavlja najnoviju generation `pending/unknown`, pa gate ostaje zatvoren; novi pokušaj dobija višu generation. Delivery zahteva `latestStartedGeneration=latestAppliedGeneration`, latest rezultat active/valid, nula novijeg pending reda, fresh purchase-intent status iz istog causal prozora i observation age najviše `WEBSHOP_POST_ISSUE_LICENSE_STATUS_MAX_AGE_SECONDS=60` (startup prihvata 15..300). Red čuva samo generation/binding, entitlement/domain, observed-at, response JCS hash, status/validity projection i causal versions, bez key-a. Frozen issue response, timeout, stale/mismatch ili master outage je fail-closed. Concurrency fixture zadržava generation N `active` response, zatim generation N+1 dobija `revoked|suspended`; kasni N mora biti ignored i ne može vratiti delivery.

Over-capture i partial capture moraju imati eksplicitnu policy:

- prvi verifikovani pozitivan zbir ispod total-a prelazi u tačno `partially_captured`; nulti zbir ostaje `pending` ili `authorized` prema dokazanoj provider činjenici;
- over-capture se alarmira, ali ne izdaje dodatnu licencu;
- više partial događaja sabira se idempotentno;
- `null`/missing amount nikada se ne pretvara implicitno u order total;
- provider adapter koji ne može dokazati cumulative total mora ostaviti događaj u review/pending stanju;
- refund se računa prema stvarno captured iznosu.

Dodati DB testove:

- 1 od 100 ne izdaje licencu;
- 40 + 60 izdaje jednom;
- duplicate 60 ne izdaje drugi put;
- 110 od očekivanih 100 emituje over-capture alert/reconciliation, ali izdaje najviše jednu licencu;
- pogrešna valuta ne izdaje;
- capture za drugi order ne izdaje.
- capture sa `amount=null` i `cumulative=null` ne izdaje.

## 4. Atomic enqueue

U transakciji koja prvi put potvrdi pun capture:

1. zaključati order/payment aggregate;
2. potvrditi da fulfillment već nije enqueue-ovan;
3. za jedini `order_kind=webshop_license_single` domain-bound order item kreirati ili naći `webshop_license_server_issues`; više/mixed itema je V1 contract violation;
4. kreirati webshop_license_server_operations operation=issue;
5. postaviti order item fulfillmentStatus=pending;
6. commitovati.

Unique zaštite:

    jedan issue po orderItemId
    jedan issue po (vendorApiClientId, masterPurchaseIntentJti)
    jedan operation idempotency key
    jedan central entitlement po issue-u

HTTP poziv masteru se radi posle commit-a iz workera/cron joba.

## 5. Ispravan issue request

Body prema master POST /api/v1/entitlements:

    {
      "contractVersion": 1,
      "environment": "development",
      "orderRef": "<VENDOR_ORDER_ID>",
      "orderItemRef": "<VENDOR_ORDER_ITEM_ID>",
      "masterPurchaseIntentJti": "<MASTER_PURCHASE_INTENT_UUID>",
      "purchaseIntentSnapshotHash": "sha256:<HEX>",
      "issuanceFence": {
        "fulfillmentGeneration": 1,
        "paymentAggregateVersion": 3,
        "financialLifecycleVersion": 2,
        "riskLifecycleVersion": 0
      },
      "payment": {
        "paymentAggregateId": "<UUID>",
        "paymentAggregateHash": "sha256:<HEX>",
        "paymentAuthorizationId": "<UUID>",
        "paymentProvider": "<STABLE_PROVIDER_ADAPTER_ID>",
        "providerCheckoutRef": "<OPAQUE_PROVIDER_SESSION_ID>",
        "currency": "EUR",
        "orderTotalMinor": 10000,
        "capturedTotalMinor": 10000,
        "captureEvidence": [
          {
            "provider": "<STABLE_PROVIDER_ADAPTER_ID>",
            "captureRef": "<AUTHORITATIVE_UNIQUE_PROVIDER_CAPTURE_OR_BALANCE_TRANSACTION_ID>",
            "transactionRef": "<REAL_OPAQUE_PROVIDER_TRANSACTION_ID>",
            "amountMinor": 10000,
            "currency": "EUR",
            "capturedAt": "<RFC3339_UTC_TIMESTAMP>"
          }
        ]
      },
      "customer": {
        "externalRef": "<CUSTOMER_USER_OR_ORDER_REF>",
        "email": "<CUSTOMER_EMAIL>",
        "name": "<OPTIONAL_NAME>"
      },
      "product": {
        "offerKey": "nr-cms-webshop-license",
        "productTypeId": "<MASTER_PRODUCT_TYPE_ID>",
        "vendorProductRef": "nr-cms-webshop-license",
        "addonKey": "webshop",
        "sku": "webshop-365",
        "catalogVersion": "<VERSION>",
        "priceRef": "<OPTIONAL_PROVIDER_PRICE_ID>"
      },
      "subscriptionRef": null,
      "domain": "client.nr.test",
      "quantity": 1
    }

### GAP

Current code koristi:

    paymentTransactionRef=webshop:<orderId>
    webhookEventRef=null

Current contract takođe ne šalje `masterPurchaseIntentJti`, `purchaseIntentSnapshotHash`, environment ni payment-authorization/aggregate dokaz, pa master ne može da dokaže da je vendor-commerce issuance vezan za ranije potrošen intent i odobren provider checkout.

### TARGET

Payment inbox/reducer mora snapshotovati stvarne opaque provider transaction/event ID-eve u lokalnom normalizovanom payment ledgeru. Fulfillment čita finansijske capture činjenice iz DB, ne iz browsera. Ne šalje hash/izmišljeni `webshop:<orderId>` umesto stvarnog provider transaction/capture identiteta. `eventRef` ostaje samo u lokalnom immutable inbox/audit povezivanju i ne šalje se masteru.

`captureEvidence` je lista od 1 do 1000 jedinstvenih autoritativnih finansijskih činjenica, sortirana po UTF-8 byte vrednosti `(provider + "\n" + captureRef)`. Svaki red mora imati `provider == paymentProvider`; cross-provider aggregate se odbija. `(provider,captureRef)` je unique u payment ledgeru; dva različita webhook `eventRef` koja opisuju isti capture samo dobijaju lokalne audit veze ka istom redu i ne menjaju `captureEvidence`, iznos ili hash. `eventRef` zato nije polje ovog wire objekta niti input `paymentAggregateHash`-a. `transactionRef` grupiše provider payment. Provider ID odgovara `^[a-z0-9_]{1,50}$`; amounti su pozitivni JSON integeri u minor units, `orderTotalMinor` i `capturedTotalMinor` su non-negative JSON integeri, a svaka vrednost mora biti `<= 9007199254740991`. Parser koristi lossless integer/BigInt pre bilo kakvog JavaScript `number` cast-a. Currency je isti uppercase ISO 4217 kod, a `capturedAt` je provider-authoritativno canonical RFC 3339 UTC vreme finansijske činjenice, ne vreme prijema webhooka.

Za adapter sa stvarnim delta capture-ima svaki `(provider,captureRef)` red je immutable i `amountMinor` je delta tog capture-a; drugi event sa istim identitetom i drugim finansijskim poljima je conflict/manual review. Adapter koji daje samo autoritativni cumulative total sme u V1 da učestvuje samo ako provider daje jedan stabilni financial-object `captureRef` i stabilni `transactionRef/capturedAt` za sve snapshotove iste naplate. Lokalni reducer tada održava jedan monotonic-max red i u frozen evidence-u emituje tačno jedan red čiji je `amountMinor` verifikovani cumulative max; ne proizvodi arrival-order delta redove. Niži/jednak reordered snapshot ne menja red, a viši ga menja samo pre freeze-a. Bez takvog stabilnog provider identiteta ili kada bi cumulative i delta redovi morali da se mešaju, događaj ostaje pending/manual review i ne izdaje licencu. Fixture obrađuje isti skup cumulative snapshotova u oba redosleda i zahteva identične frozen evidence bytes/hash.

`capturedTotalMinor` je tačan zbir iznosa canonical unique evidence redova (delta redova ili jedinog dozvoljenog cumulative-max reda), može biti veći od `orderTotalMinor`, a nijedno polje ne dolazi iz browsera. Vendor i master nezavisno rade overflow-safe BigInt sumu; zbir veći od `9007199254740991`, bilo koji unsafe/non-integer/negative broj ili `capturedTotalMinor != sum(captureEvidence[].amountMinor)` odbija se pre full-capture poređenja. Exact hash je `sha256:` + lowercase SHA-256 RFC 8785/JCS bytes strogo validiranog objekta `{contractVersion:1,paymentAggregateId,orderRef,paymentAuthorizationId,paymentProvider,providerCheckoutRef,currency,orderTotalMinor,capturedTotalMinor,captureEvidence}`. Master rekonstruiše taj objekat iz parsiranih polja, proverava canonical sort/unique/provider/currency/bounds/recomputed sum i sam izračunava hash; ne veruje vendorovom zbiru ili hash-u. Tek zatim zahteva `capturedTotalMinor >= orderTotalMinor`. Reducer durable zamrzava ovu issuance evidence revision kada prvi put postane `paid`; kasniji event-ref audit linkovi i refund/dispute događaji ne prepisuju issue request. Fixture mora poslati isti captureRef kroz dva različita eventRef-a u oba redosleda i dokazati identične evidence bytes/hash i jedan amount, isti opaque checkout ref pod drugim providerom i rejection, mismatch prosleđenog total-a/zbir-a, 1001 evidence red i integer/sum overflow rejection.

`issuanceFence` ima exact četiri obavezna non-negative JSON integer polja bez unknown polja. Vendor ih snapshotuje u issue operation-u, uključuje u canonical request-body/idempotency hash i pre send-a i pri response CAS-u poredi sa current lokalnim verzijama. Master strict parsira i immutable vezuje isti tuple za issue operation/replay rezultat, ali ga ne tretira kao zamenu za payment dokaz koji sam proverava; drugi tuple sa istim idempotency key-em je `409 idempotency_conflict`.

Za domain-bound Webshop commerce issuance master pod row lock-om dodatno zahteva da je purchase intent u terminalnom `consumed` stanju bez security hold-a i vezan za isti API client/environment, `orderRef`, `orderItemRef`, snapshot hash, domain, offer key, product type, vendor product reference, SKU, quantity i catalog version. Takođe proverava `paymentAuthorizationId/paymentProvider/providerCheckoutRef` kao `used` authorization istog JTI/order/item/snapshot-a, zatim strict parsira 1..1000 canonical-sortiranih unique capture redova, proverava isti provider/currency i safe integer granice, BigInt-om recompute-uje `capturedTotalMinor`, sam recompute-uje canonical aggregate hash i tek onda zahteva pun capture. `licenses.purchase_intent_id` je nullable FK za manual/legacy tokove, ali ima filtered unique constraint kada nije null. Master iz intenta, ne vendor body-ja, kopira domain-verification method/time/challenge/evidence hash u immutable license audit snapshot i u produkciji zahteva `https_well_known`. Vendor-commerce scope ne sme izdati ovu licencu bez intenta.

Master cardinality je unique `(vendor_api_client_id, order_item_ref)` i filtered unique `purchase_intent_id`. Pored toga normalizovana `vendor_payment_capture_bindings` tabela ima unique `(vendor_api_client_id, payment_provider, capture_ref)` i immutable vezu ka `payment_aggregate_id`, `order_ref`, purchase-intent JTI i prvom issue operation-u. Exact replay istog issue/request hash-a nalazi istu vezu i prolazi; isti stvarni capture vezan za drugi aggregate/order/JTI dobija audited `409 payment_evidence_conflict` pre izdavanja. `eventRef` nije ovaj identitet. Prvi V1 order ima tačno jedan license item/JTI, pa jedan provider checkout/capture evidence finansira najviše jednu licencu. Budući multi-item contract mora versionirano uvesti jedan order-level aggregate koji svi itemi referenciraju; ne sme kopirati iste capture redove kao nezavisno finansiranje. Vendor payment inbox zasebno deduplikuje provider event ref.

HMAC V2 headers uključuju configured KID. Idempotency key ostaje stabilan za order item, nezavisno od retry-a.

## 6. Master issue odgovor

Očekivano:

    {
      "contractVersion": 1,
      "entitlementId": "<UUID>",
      "licenseKey": "<ONE_TIME_PLAINTEXT>",
      "licenseKeyRef": "<REDACTED_REF>",
      "status": "active",
      "validUntil": "<ISO_OR_NULL>",
      "updatesUntil": "<ISO_OR_NULL>",
      "activationLimit": 1,
      "features": ["webshop"]
    }

Master:

- u idempotency cache-u čuva šifrovan finalni response;
- isti key/hash posle commita vraća isti rezultat;
- isti key/drugi hash vraća 409;
- nikada ne loguje licenseKey;
- product requiresDomain odbija null;
- čuva domain=client.nr.test.

Processing redosled je normativan. Master prvo verifikuje HMAC/client/schema/size i izračuna canonical body hash, zatim pod issue-operation lock-om radi idempotency lookup. Exact key/body za već `committed` operation vraća frozen encrypted rezultat pre current-state precondition provere; zato response-loss replay radi iako je ista commit transakcija već promenila payment authorization `used -> paid`. Isti key/drugi body i dalje odmah daje `409`. Samo novi ili `pending|blocked` operation zatim proverava current intent/authorization/payment/hold: novi/pending issue zahteva authorization `used`, top-level `hardDisable.occurred=false` i odsustvo auth hard-disable markera, dok je `paid` dozvoljen isključivo kao binding istog već committed operation-a, nikada kao osnova novog issue-a. Vendor koji primi committed replay ipak pre delivery-ja ponovo proverava top-level marker; ako je true, rezultat ide samo u idempotentnu revoke compensation. Commit licence, capture-bindinga, operation rezultata i `used -> paid` je jedna transakcija. Fixture gubi response posle tog commita, potvrđuje current authorization `paid` i dobija byte-identičan isti entitlement/key bez druge licence; zaseban hard-disable race dokazuje no-delivery + jednu compensation.

Precondition reversible security hold nije finalni cached issuance rezultat. Stable idempotency red vezuje key/request hash za jedan issue operation sa stanjem `pending|blocked|committed|terminal_failed`. `reversible_hold` atomski daje `blocked`, čuva master intent/security-block version i exact sanitizovan `409 intent_security_hold` odgovor; replay dok je blok aktivan vraća isti blocked body i ne poziva issuer. Taj master block version nije deo vendor `issuanceFence` i njegovo hold/clear menjanje ne menja vendor `riskLifecycleVersion`. Dual-control clear povećava master block version i auditovano stavlja isti operation identity `blocked -> pending`, ali sam ne pokreće issuer. `hard_disable` nikada ne koristi resumable `blocked`: novi/pending issue dobija terminalni `security_disabled`, authorization dobija durable hard-disable marker i vendor ide u refund/revoke review; kasniji block clear ne oživljava operation. Vendor pre retry-ja reversible hold-a pod lokalnim order/payment/issue lock-om zahteva potpuno nepromenjen four-field fence i odsustvo lokalnog risk/refund/hard-disable događaja, pa tek onda šalje isti idempotency key i byte-identičan body. Ako se lokalni fence promenio pre send-a, stari body se ne šalje. Ako je master ipak već commitovao pre kasnijeg događaja, rezultat se klasifikuje po njegovoj reverzibilnosti: local `security_review|paid_security_review`, reversible master hold, dispute open i partial refund daju `review_pending`, encrypted sensitive result i no-delivery bez automatskog revoke-a; audited local `cleared`, cleared master hold, dispute won+reinstate ili partial-refund `retain_active` mogu vratiti isti entitlement u `resolved_active` samo uz corresponding causal decision, current-state CAS i fresh validate-active proveru. Pre-issue replay i dalje zahteva isti old fence, ali post-commit reconciliation ne šalje drugi issue i zato sme da prihvati viši, auditovano razrešen lifecycle tuple. `refund_required`, hard disable, full refund/reversal, dispute lost ili explicit revoke jedini odmah daju `compensation_pending` i tačno jedan causal revoke. Prvi `committed` rezultat se enkriptovano zamrzava zauvek. Isti key/drugi body je uvek `409 idempotency_conflict`; terminal product/binding greška je `terminal_failed` i ne resume-uje se. Fixture pokriva reversible hold pre prvog send-a, master `pending -> blocked`, više blocked replay-a, clear `blocked -> pending`, isti body/fence success, post-commit hold/clear i local risk/clear bez druge licence, dispute open→won/lost, hard disable bez resume-a i response loss posle commita.

## 7. Čuvanje na vendor strani

Po uspehu vendor u jednoj transakciji:

- upisuje centralEntitlementId;
- prvo deterministički računa license-key fingerprint potreban za AAD i redacted reference, bez logovanja plaintexta;
- zatim šifruje `licenseKey` namenskim `WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KEY` ključem, sa već izračunatim fingerprintom u AAD-u, i upisuje aktivni `WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KID`;
- čuva samo redacted licenseKeyRef u response snapshotu;
- postavlja remoteStatus=active;
- postavlja issue status=issued;
- ažurira normalizovani issue/fulfillment read model vezan za order item sa issue ID-em/statusom; immutable business snapshot/hash se ne menja;
- rekalkuliše order fulfillment;
- enqueue-uje customer notification.

Plaintext key treba da postoji samo u memoriji tokom response obrade i renderovanja autorizovanog reveal-a.

`WEBSHOP_LICENSE_SERVER_SECRET_KEY` ostaje isključivo KEK za master API credential koji vendor čuva u License Server settings-u. Ne koristiti ga za nove izdate license key zapise.

### 7.1 Issued-license key envelope i rotacija

Dodati server-only modul, na primer `webshop-issued-license-key-envelope.ts`, odvojen od API-secret helpera i postojećeg internog Webshop license-key envelope-a. Ciljni ciphertext je versionirani AES-256-GCM envelope:

    {
      "v": 1,
      "alg": "aes-256-gcm",
      "kid": "local-issued-license-v1",
      "iv": "<BASE64URL>",
      "ciphertext": "<BASE64URL>",
      "tag": "<BASE64URL>"
    }

Exact canonical AAD contract je:

    webshop-issued-license-key:v1:<ISSUE_ID>:<ORDER_ITEM_ID>:<FINGERPRINT>

Marker i delimiteri su literalni ASCII, ID-evi su canonical lowercase UUID stringovi bez braces, fingerprint je lowercase 64-hex, a AES-GCM dobija UTF-8 bytes cele linije bez završnog newline-a. Za ovaj envelope fingerprint contract ostaje `lowercaseHex(SHA-256(UTF8(licenseKey.trim())))`, kako bi postojeći redovi mogli deterministički da se migriraju. Puni fingerprint se čuva server-side, ali se ne loguje ili prikazuje kupcu; UI/audit koriste redigovanu referencu. AAD koristi `orderItemId`, ne `orderId`.

`webshop_license_server_issues.license_key_kid` i envelope `kid` moraju biti jednaki. Aktivna konfiguracija je:

    WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KEY=<32_BYTE_BASE64URL_OR_HEX>
    WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KID=local-issued-license-v1
    WEBSHOP_ISSUED_LICENSE_KEY_DECRYPTION_KEYS_JSON=<JSON_MAP_ONLY_OLD_KIDS_TO_KEYS>

Decrypt keyring se sastoji od aktivnog KID/key para i eksplicitnih starih KID-eva. Novi write uvek koristi samo aktivni KID. Ne prihvatati KID ili algoritam iz nepoverljivog inputa bez allowlist-e.

Rotacija:

1. dodati novi KID/key kao aktivan, a prethodni u old-key keyring;
2. proveriti da novi issue-i koriste novi KID;
3. batch rewrap worker pod `FOR UPDATE SKIP LOCKED` dekriptuje stari envelope i odmah ga šifruje novim ključem;
4. update koristi row lock ili optimistic version i auditira samo issue ID, old/new KID i rezultat — nikada plaintext;
5. broj redova po starom KID-u mora pasti na nulu i backup-retention period mora proći pre uklanjanja starog ključa;
6. reveal i retry testovi moraju raditi tokom overlap perioda.

AS-BUILT redovi koje je `encryptLicenseServerSecret()` napravio sa `WEBSHOP_LICENSE_SERVER_SECRET_KEY`, a nemaju `license_key_kid`, ne smeju dobiti KID prostim SQL update-om. Compatibility reader ih klasifikuje kao `legacy-license-server-secret-v1`, dekriptuje isključivo kroz eksplicitnu legacy granu i batch rewrap-uje u novi envelope. Posle dokaza da nema legacy redova ta grana se uklanja. Nijedan novi write ne koristi legacy format.

### Trenutna rupa i zaključana migracija

V2 `completeIssueClaim` šifruje key u issue tabeli, dok legacy tok pokušava da duplira mutable issue stanje u `fulfillmentDataSnapshot`. Cilj je jedan normalizovani V2 read model: `webshop_license_server_issues` i povezani fulfillment/notification redovi su jedini mutable autoritet za issue status, remote entitlement ID, encrypted key/KID, attempts i delivery. `fulfillmentDataSnapshot` ostaje byte-for-byte immutable poslovni snapshot iz checkouta; ni V2 ni compatibility worker ga ne ažuriraju. Migracija prvo backfill-uje normalizovane redove iz dokazivih legacy vrednosti, poredi snapshot hash, zatim uklanja legacy write granu. Conflict ili nečitljiv legacy ciphertext ide u manual review, nikada u silent overwrite snapshot-a.

## 8. P0: secure customer delivery

### Trenutni problem

- webshop_order_emails ne joinuje webshop_license_server_issues;
- license-only stavka bez file download URL-a može biti preskočena;
- storefront order access ne dekriptuje external issued key;
- deliveredAt se ne postavlja kroz stvarni reveal;
- email helper može progutati grešku, pa outbox označi event completed iako email nije poslat.

### Ciljno rešenje

Podrazumevano ne slati raw reusable license key emailom. Poslati expiring secure delivery link.

Za signed-in kupca:

- order page proverava Clerk user ownership;
- server-side read model joinuje issue po orderItemId;
- pre dekripcije zahteva post-issue gate: issue `committed`, `licenseLifecycleStatus=active`, business validity nije istekla, `postIssueReconciliationStatus=resolved_active`, nema pending/revoke compensation i vendor risk je `none|cleared`; `paymentStatus` može biti `partially_refunded` samo nakon audited `retain_active` odluke za isti entitlement;
- reveal je POST action sa CSRF/origin proverom;
- neposredno pre reveal-a proverava lokalni top-level `masterHardDisableOccurred=false`; ako je poslednji master status observation stariji od bounded delivery max-age-a, sinhrono poziva fresh `:status`. Master nedostupan/stale/marker=true je fail-closed i ne dekriptuje ključ;
- key se dekriptuje tek nakon auth provere.

Za guest checkout:

- generisati tačno 32 CSPRNG bytes i kodirati base64url bez paddinga (43 ASCII karaktera);
- u bazi čuvati samo `sha256:` + lowercase SHA-256 nad UTF-8 token stringom;
- token vezati za order, customer email hash, purpose=license_reveal i expiry;
- email URL sadrži opaque token, ne license key;
- token ima bounded TTL i može se rotirati/resendovati;
- rate limit i audit važe za svaki reveal.

Guest token exchange i kasniji Reveal koriste isti hard-disable gate. Ako hard disable nastane nakon emaila, reconciliation atomski revoke-uje svaki još-neexchanged delivery token i enqueue-uje/čeka tačno jednu master revoke compensation; već poslati URL tada više ne otkriva ključ. `paid + masterHardDisableOccurred=true` nikada nije delivery-ready, čak i kada current `securityHold.active=false` posle clear-a.

Token ima najmanje 256 bita entropije, zato je unkeyed SHA-256 verifier bezbedan i ne postoji delivery signing/HMAC secret, KID ili rotacija ključa. Tabela ima unique `token_hash`, `purpose=license_reveal`, order/customer-email hash, `created_at`, `expires_at`, `exchanged_at`, `revoked_at` i delivery-link version. Poređenje decoded hash bytes je constant-time. Resend atomski revoke-uje prethodni hash i generiše novi token; plaintext postoji samo u memoriji jednog notification attempt-a dok se sastavlja provider request. Uspešan POST exchange postavlja kratkotrajnu Secure/HttpOnly/SameSite=Lax guest delivery session i radi 303 na čistu URL putanju, pa reveal više ne nosi token. Expired/exchanged/revoked token ne može otvoriti novu session; email scanner GET sam ga ne troši.

Predložena ruta:

    https://vendor.nr.test/licenses/order-delivery/<OPAQUE_TOKEN>

Pošto bearer postoji u path-u prvog email linka, ova ruta ima obaveznu edge/app log politiku: Caddy za matcher `/licenses/order-delivery/*` ne zapisuje raw URI/path/query (log se isključuje ili se pre emitovanja menja stabilnim route template-om `/licenses/order-delivery/:token`), a Next.js, tracing, error reporting i metrics koriste samo route template, request ID i hash/fingerprint nakon server-side validacije. Raw `Referer`/request header dump je zabranjen. Integration test šalje poznat canary token kroz Caddy i Next, zatim skenira access/app/telemetry/error logove i mora dokazati da se canary nigde ne pojavljuje.

Stranica:

- `Cache-Control: no-store, private`, `Pragma: no-cache` i `Referrer-Policy: no-referrer`;
- robots noindex;
- ne učitava third-party analytics;
- prikazuje order item, SKU, domain i rok;
- key prikazuje tek posle eksplicitnog Reveal;
- ima Copy dugme;
- ne ubacuje key u URL, log ili telemetry;
- na prvi uspešan reveal postavlja deliveredAt;
- svaki reveal audit event koristi key fingerprint, ne plaintext.

Ako se poslovno ipak izabere raw key u emailu, to mora biti poseban opt-in policy sa testovima redactiona. Nije podrazumevana preporuka.

## 9. Email outbox

order.customer_notification_requested mora biti retryable.

Izmeniti email API tako da:

- vraća success rezultat sa provider message ID-em; ili
- baca sanitizovanu grešku koju outbox vidi.

Ne gutati exception i vraćati void.

Outbox treba:

- attempt_count inkrement;
- pravi exponential backoff iz aktuelnog attempt count-a;
- max_attempts;
- next_attempt_at;
- lease recovery;
- dead_lettered_at;
- manual retry action;
- deduplication key po order item-u i notification version-u.

Hash-only token model zahteva email adapter sa durable provider idempotency key-em i retrieve/reconcile API-jem; bez oba svojstva ovaj model nije dozvoljen i morao bi se uvesti poseban encrypted-at-rest delivery-token contract. Exact outbox state sadrži `notificationId`, monotonu `generation`, `providerMessageKey=webshop-license-delivery:v1:<notificationId>:<generation>`, provider message ID/status, `deliveryLinkId` i lease — nikada plaintext token. Attempt radi:

1. pod order/issue/notification lock-om zahteva current committed issue, post-issue active/non-expired lifecycle projekciju bez pending review/compensation, vendor risk `none|cleared`, fresh monotoni purchase-intent `:status` snapshot, `masterSecurityHoldActive=false` i top-level `masterHardDisableOccurred=false`; zatim kreira novu generation, atomski revoke-uje prethodni neuspešno-poslati link, generiše token/hash i čuva `preparing` red;
2. van transakcije šalje email sa `providerMessageKey` kao provider idempotency key-em;
3. neposredno pre send-a i pri potvrđenom provider ACK-u ponavlja local marker/hold/fence CAS; marker koji se pojavio u međuvremenu revoke-uje link, ne označava delivery i pokreće compensation. Inače trajno čuva message ID/`accepted_at` i više ne rotira taj token;
4. posle crash-a/timeout-a prvo radi provider retrieve po istom key-u: `accepted|sent|delivered` sme dovršiti isti red samo posle fresh status + local marker/hold/fence CAS-a; marker=true revoke-uje link i prelazi u compensation. Unknown response ostaje u reconciliation retry-u; tek autoritativni `not_found` ili definitivni pre-accept failure uz ponovljeni clear gate dopušta transakcioni revoke starog hash-a i generation+1 sa novim tokenom;
5. nikada ne šalje drugi link naslepo dok je ishod prethodnog provider operation-a nepoznat.

Crash fixture prekida proces (a) posle hash commita/pre provider call-a, (b) posle provider accept-a/pre local ACK-a i (c) posle local ACK-a. Dokazuje da su svi neposlati tokeni revoked, da se prihvaćeni email ne duplira, da poslati link ostaje validan samo dok top-level hard-disable marker nije postavljen i da plaintext/canary nije durable niti u logu. Zaseban race postavlja hard disable pre send-a, posle provider accept-a i pre reveal-a; sva tri daju no-key-delivery i tačno jednu compensation operaciju.

Trenutni fixed attemptCount=1 pri notification retry-u popraviti.

Email evidence:

- provider accepted ID;
- sentAt;
- template version;
- delivery link ID;
- bez tokena, email adrese u plaintext logu ili license key-a.

## 10. Fulfillment scheduler

Current ruta:

    GET/POST /api/cron/webshop-license-issues

koristi shared CRON_SECRET i obrađuje do 25 operacija.

TARGET:

- dedicated WEBSHOP_LICENSE_ISSUE_CRON_SECRET ili odvojeni worker identity;
- POST kao autoritativna mutaciona metoda;
- GET eventualno samo development compatibility, zatim ukloniti;
- request ID i audit;
- overlap zaštita;
- metrics za pending/retry/DLQ/age.

Ovaj dedicated secret trenutno ne postoji u runtime contractu, a lokalni cleanup ga tretira kao zastarelu vrednost. Ako se izabere secret umesto service identity-ja, isti change set mora:

1. dodati `WEBSHOP_LICENSE_ISSUE_CRON_SECRET` u vendor env template;
2. validirati njegovu minimalnu dužinu samo kada je license outbox uključen;
3. ažurirati `scripts/clean-local-runtime-env.mjs`;
4. promeniti `app/api/cron/webshop-license-issues/route.ts`/cron auth da koristi baš njega;
5. dodati auth negative test i dokumentovati rotaciju;
6. zadržati trenutni `CRON_SECRET` samo kao vremenski ograničen compatibility put.

Tok mora raditi i kada browser nikada ne vrati korisnika sa payment stranice.

## 11. Lifecycle posle izdavanja

| Događaj | Lokalna desired akcija | Master akcija |
|---|---|---|
| full refund | revoked | revoke/refund prema contractu |
| partial refund | `review_pending` dok audited policy ne odluči; podrazumevana odluka je `retain_active` | uz `retain_active` i fresh validate dokaz vraća isti entitlement u `resolved_active`; uz `revoke` ide jedan causal revoke |
| dispute open | suspended | suspend |
| dispute won | active | reinstate |
| dispute lost | revoked | revoke/chargeback |
| payment reversed pre fulfillment | canceled | ne izdavati ili odmah revoke ako je race |

Current worker praktično podržava samo suspend/revoke. Dovršiti reinstate i odabrane refund/chargeback rute pre lifecycle E2E testa.

Ako desired status postane revoked dok issue zahtev leti, uspešan kasni issue ne sme biti isporučen; current stale-success compensation obrazac zadržati i testirati. Partial refund se ne klasifikuje automatski kao revoke: dok odluka nije durable ostaje bez delivery-ja, a audited `retain_active` može vezati isti već committed entitlement i označiti `postIssueReconciliationStatus=resolved_active` bez drugog issue-a ili compensation-a.

Isti fencing važi za payment lifecycle race. Issue red trajno snapshotuje `paymentAggregateVersion`, `financialLifecycleVersion`, `riskLifecycleVersion` i desired fulfillment generation uz canonical request hash. Master hold mirror/version/disposition je zasebna gate osa, nije deo canonical issue body-ja/fence-a i ne povećava lokalni risk version. Worker pod order/payment/issue lock-om neposredno pre HTTP send-a ponovo zahteva current `paymentStatus=paid`, odsustvo aktivnog lokalnog dispute/risk-a, `masterSecurityHoldActive=false`, `masterHardDisableOccurred=false`, svež master observation i iste fence verzije. Full refund/reversal/chargeback pre send-a daje vendor `canceled`; lokalni dispute/risk ili reversible master hold daje vendor `paused_security_review`; hard disable daje terminalni refund/revoke review; nijedan ne radi master poziv. Ako je zahtev već stigao masteru, reversible hold daje master operation `blocked`, dok vendor ostaje `paused_security_review`; audited clear vraća master operation u `pending`, a vendor sme retry-ovati isti body samo ako lokalni fence nije promenjen. Hard disable terminalizuje pending operation ili, ako je issuance već committed, zahteva compensation; nikada se ne resume-uje posle clear-a. Posle mrežnog send-a direct response acceptance radi compare-and-swap nad istim verzijama i fresh master snapshotom. Mismatch se klasifikuje: terminalni full refund/reversal/lost dispute/revoke/hard-disable daje `compensation_pending`; reverzibilni local risk review, reversible hold, dispute open i partial refund daju `review_pending`, encrypted result i no-delivery. Audited local clear/master-hold clear, dispute won+reinstate ili partial-refund `retain_active`, uz current causal CAS i fresh validate-active proveru, mogu vratiti isti entitlement u `resolved_active` bez drugog issue-a; terminalna odluka koristi jedan compensation tok. Notification/delivery worker koristi post-issue gate, ne stari pre-issue `paymentStatus=paid` gate. Fixture pokriva full refund pre send-a i tokom commita, partial refund sa obe odluke, post-commit reversible hold/clear, local risk/clear, dispute open→won/lost, hard disable pre/posle commit-a i response-loss/crash granice, uz tačno jednu licencu i najviše jednu causal compensation operaciju.

## 12. Failure klasifikacija

Retryable:

- timeout;
- DNS/TLS privremena greška;
- HTTP 408/425/429;
- HTTP 5xx;
- izgubljen response posle mogućeg master commit-a.

Permanent/DLQ:

- 400 schema;
- 401 posle credential recheck-a;
- 403 scope/domain;
- 404 product/SKU;
- 409 idempotency hash conflict;
- invalid signed/structured response;
- package/business configuration mismatch.

401 može privremeno retry jednom posle credential refresh-a, ali ne beskonačno.

## 13. Lokalni payment test

Postoje dve legitimne opcije.

### Deterministički integration lane

Koristiti postojeći DB payment/outbox harness i potpisani provider fixture. Ovo dokazuje state machine bez spoljnog dashboarda.

### Pravi provider sandbox lane

Koristiti test credentiale i provider CLI forwarding ili privremeni HTTPS tunnel za webhook. Zabeležiti:

- provider event ID;
- transaction ID;
- potpis verification;
- order ID;
- master entitlement ID.

Ne praviti neautentifikovanu Mark paid rutu. Ako postoji admin manual capture akcija, ona mora proizvoditi isti normalizovani payment event i proći isti reducer/idempotency tok.

## 14. Fulfillment gate

Gate prolazi kada:

- partial payment ne izdaje;
- full capture izdaje tačno jednu licencu;
- duplicate webhook ne duplira issue;
- master DB domain je client.nr.test;
- order snapshot SKU odgovara izabranoj varijanti;
- real payment/event refs stižu masteru;
- key je encrypted at rest;
- email dobija secure link;
- kupac može autorizovano reveal-ovati key;
- email failure ide u retry/DLQ;
- full refund revoke-uje;
- dispute open suspenduje, won reinstates, lost revoke-uje;
- log scan ne nalazi license key, npm token ili HMAC secret.
