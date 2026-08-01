# 07 — Buy link, purchase intent i domain binding

## Cilj

Klik na **Buy webshop license** sa client CMS-a mora otvoriti tačan vendor proizvod i preneti neizmenjivu informaciju da se buduća licenca izdaje za:

    client.nr.test

Browser-supplied domain, hidden input ili query string nisu dokaz i ne smeju direktno postati license domain. Autoritet je kratkotrajni master-signed purchase intent, vezan za installation identity client CMS-a.

## 1. Zašto trenutni HMAC model nije finalan

AS-BUILT `lib/webshop-addon/buy-link.ts` pravi 30-minutni HMAC payload sa poljima `addon`, `domain`, `expiresAt` i `v`.

Problem:

- svaki distribuirani client CMS bi morao da zna isti `WEBSHOP_BUY_LINK_SECRET` koji vendor koristi za proveru;
- kompromitovan jedan klijent kompromitovao bi potpisivanje svih buy linkova;
- vendor trenutno payload ne proverava;
- nema durable replay/consumption stanja;
- domen se ne prenosi kroz cart, checkout i order;
- query transport bi token izložio browser history-ju, access logovima, referreru i analyticsu.

Isti secret na vendor/client instanci može služiti samo kao kratkotrajni lokalni spike. Ne koristiti ga kao završenu implementaciju niti kao E2E dokaz.

## 2. Cilj: master-signed purchase intent

Client CMS već ima installation Ed25519 identity i zna master URL. Master izdaje kratkotrajni potpisani purchase intent tek posle proof-of-possession toka.

Exact route contract:

    POST /api/addons/purchase-intents

sa `contractVersion=1` i `action=challenge|complete`, analogno activation toku, ali sa posebnim challenge purpose-om, tabelom i rate-limit bucketom. Ne uvoditi paralelni endpoint ili query action.

Challenge request:

    {
      "contractVersion": 1,
      "action": "challenge",
      "addonKey": "webshop",
      "canonicalDomain": "client.nr.test",
      "installationId": "<UUID>",
      "installationPublicKey": "<PEM>",
      "installationKeyFingerprint": "sha256:<HEX>",
      "installationFingerprintScheme": "ed25519_spki_der_sha256_v1",
      "vendorAudience": "https://vendor.nr.test",
      "offerKey": "nr-cms-webshop-license"
    }

Challenge response:

    {
      "contractVersion": 1,
      "action": "challenge",
      "challengeId": "<UUID>",
      "challengePurpose": "webshop_purchase_intent",
      "proofPayload": "<BASE64URL_CANONICAL_BYTES>",
      "domainVerification": {
        "required": true,
        "method": "https_well_known",
        "path": "/.well-known/nr-license-domain-proof/<SAME_CHALLENGE_UUID>"
      },
      "expiresAt": "<ISO_TIMESTAMP>"
    }

U development profilu za exact allowlisted `.nr.test` host response umesto toga ima `required=false`, `method=development_allowlist_exemption` i `path=null`. To je eksplicitni test izuzetak, ne tvrdnja o DNS vlasništvu.

Client dekodira `proofPayload` i Ed25519 privatnim installation key-em potpisuje baš te bytes, bez rekonstrukcije JSON-a. U production profilu isti potpis i payload izlaže i na masterom zadatoj exact well-known putanji. Complete request je:

    {
      "contractVersion": 1,
      "action": "complete",
      "challengeId": "<UUID>",
      "installationId": "<SAME_UUID>",
      "installationKeyFingerprint": "sha256:<SAME_HEX>",
      "installationFingerprintScheme": "ed25519_spki_der_sha256_v1",
      "proofSignature": "<BASE64URL_ED25519_SIGNATURE>"
    }

Complete response je:

    {
      "contractVersion": 1,
      "action": "complete",
      "purchaseIntent": "<COMPACT_JWS>"
    }

`installationFingerprintScheme` je obavezno tačno `ed25519_spki_der_sha256_v1` za novi purchase intent, a `installationKeyFingerprint` koristi taj exact algoritam i legacy rebind pravila kao activation contract iz dokumenta 05: hashira se canonical SPKI DER, ne raw PEM. Legacy `legacy_pem_utf8_sha256_v0` identity mora prvo proći dedicated signed rebind/re-enroll; ne može dobiti novi purchase intent metadata-only promenom scheme vrednosti. Client potpisuje challenge privatnim installation key-em. Master proverava:

- canonical-domain contract;
- public key/fingerprint/scheme podudaranje;
- installation proof-of-possession;
- audience allowlist;
- aktivni server-side purchase-offer mapping za `(offerKey, addonKey, vendorAudience)`;
- rate limit;
- challenge expiry i atomsko one-time trošenje.
- u production profilu uspešan HTTPS well-known domain-control dokaz opisan u odeljku 8.

`proofPayload` canonical bytes moraju vezati marker `NRV-WEBSHOP-PURCHASE-INTENT-CHALLENGE-V1`, challenge ID/nonce/purpose/expiry i sve vrednosti iz challenge requesta, uključujući fingerprint scheme. Master ledger čuva njihov hash i pri complete-u ne prima niti veruje ponovljenim domain/product/audience poljima. Complete sa drugim installation ID/fingerprint/scheme tuple-om, isteklim ili već potrošenim challenge-om se odbija.

Za purchase intent nije potrebna postojeća Webshop licenca. Korisnik upravo pokušava da je kupi. Installation PoP ovde dokazuje kontrolu nad konkretnom CMS installation identity, ne postojanje licence.

Client nikada ne zna niti šalje master DB `productTypeId`. Javni config je samo stabilni:

    WEBSHOP_BUY_OFFER_KEY=nr-cms-webshop-license

`vendorAudience` takođe nije browser input niti zaseban drift-prone secret/config. CMS pri startupu strict parsira server-side `WEBSHOP_BUY_URL`: dozvoljen je samo HTTPS URL bez userinfo-a, query-ja ili fragmenta, sa exact normalizovanom putanjom `/licenses/purchase-intents/accept`; hostname se IDNA/lowercase normalizuje, default port 443 se uklanja, a drugi port je dozvoljen samo ako ga konkretan environment policy eksplicitno allowlistuje. `vendorAudience` se zatim izvodi tačno kao normalizovani `new URL(WEBSHOP_BUY_URL).origin`, persistira u challenge redu i proof payloadu i mora biti byte-equal JWS `aud` claim-u i master offer mappingu. Browser ne šalje audience, a forwarded/Host/Origin header ne može ga promeniti. Startup i shared fixture odbijaju userinfo, HTTP, query/fragment, pogrešnu acceptance putanju, path trailing-slash mismatch i neočekivani non-default port; URL sa eksplicitnim `:443` daje isti origin kao bez porta.

Master dobija `productTypeId`, `vendorProductRef` i allowed SKU listu iz provisionovanog `vendor_purchase_offers` reda:

    id uuid primary key
    environment text
    offer_key text
    addon_key text
    product_type_id uuid references product_types(id)
    vendor_audience text
    vendor_api_client_id uuid references api_clients(id)
    vendor_product_ref text
    status draft|active|catalog_revalidation_required|disabled|security_disabled
    catalog_version text
    disabled_reason text null
    security_disabled_at timestamptz null
    created_at/updated_at timestamptz

    unique (environment, offer_key, addon_key, vendor_audience)
    foreign key (environment, catalog_version)
      references vendor_catalog_revisions(environment, catalog_version)

Aktivacija offer-a proverava da je vezani vendor API client active u istom environmentu i ima potrebne purchase/issue scope-ove, kao i da product type ima `addonKey=webshop`, `requiresDomain=true` i tačno četiri aktivna dozvoljena SKU-a. Complete koristi mapping snapshot iz challenge ledgera; ne radi lookup na osnovu browser-supplied UUID-a ili vendor product URL-a. `:accept` authenticated client mora biti tačno `vendor_api_client_id` iz snapshotovanog offer-a pre bilo kakve state promene.

Exact offer/catalog policy matrica je:

| Promena | Novi challenge/complete | `issued`/`accepted`/`reserved` | `consumed`/payment/issue |
|---|---|---|---|
| normalna nova catalog revision ili `catalog_revalidation_required` | blokirano dok se offer ne revalidira | nastavlja po immutable istorijskom snapshotu i bounded rokovima | nastavlja po istom snapshotu |
| administrativni `disabled` iz komercijalnog razloga | blokirano | već izdati intent se honoruje do checkout expiry-ja; novi se ne izdaje | nastavlja; paid order ostaje poslovna obaveza |
| normalno povlačenje SKU-a u novoj revision | novi intent ga ne dobija | stari intent ga može izabrati samo ako je u njegovom `allowedSkus` snapshotu | nastavlja po starom duration/activationLimit snapshotu |
| hard `security_disabled` offer/SKU block | blokirano | master pod lock-om prelazi `issued|accepted|reserved -> canceled`; vendor reconciliation uklanja checkout pre payment-a | svaki `consumed` intent dobija immutable top-level hard-disable marker i bez authorization-a; `issued|used -> invalidated_for_security`, a već `paid` ostaje finansijski paid uz `postIssueCompensation=required|completed`; nema resume-a i captured/issued slučaj ide u refund/revoke review |
| reversible security hold konkretnog snapshot SKU-a/order-a | blokirano dok traje | stanje intenta se ne resetuje, ali accept/reserve/payment akcija je gate-ovana | `consumed` i `issued|used` authorization ostaju isti do originalnog expiry-ja; nema redirecta/issue-a dok hold traje, a dual-control clear može nastaviti isti tok |

Samo reversible security hold može se dual-control auditovanom odlukom očistiti za isti consumed order/snapshot, posle čega se nastavlja isti neistekli payment/issue idempotency operation, ili završiti refund/revoke odlukom. Hard disable se može ukloniti za buduće kupovine, ali ne oživljava canceled intent ili invalidated authorization. Nikada se ne resetuje JTI niti automatski pravi drugi order. `:accept`/`:reserve`/`:consume` zato proveravaju immutable offer/product/catalog snapshot i aktuelni explicit block/disposition; normalna mutable status/version promena ne menja već izdati contract. Background transition audit mora zabeležiti operatora, reason, disposition, affected KID/SKU/catalog i svaku canceled/held/invalidated vezu.

Security block konkretnog istorijskog SKU snapshot-a nije izveden iz današnjeg mutable SKU statusa. Autoritet je append-audited tabela:

    vendor_purchase_security_blocks
    id uuid primary key
    environment text not null
    catalog_version text not null
    product_type_id uuid not null
    sku text not null
    reason_code text not null
    disposition reversible_hold|hard_disable not null
    effective_at timestamptz not null
    created_by text not null
    cleared_at timestamptz null
    cleared_by text null
    version integer not null

    foreign key (environment, catalog_version)
      references vendor_catalog_revisions(environment, catalog_version)
    partial unique (environment, catalog_version, product_type_id, sku)
      where cleared_at is null

Svaki hard-disable block ima i tačno jedan durable propagation red:

    vendor_purchase_security_block_reconciliations
    block_id uuid primary key references vendor_purchase_security_blocks(id)
    generation_id uuid unique not null
    status pending|running|completed|failed not null
    affected_cutoff timestamptz not null
    scan_cursor text null
    affected_count bigint not null
    processed_count bigint not null
    attempt_count integer not null
    last_error_code text null
    started_at/completed_at timestamptz null

`affected_cutoff` i generation nastaju u istoj transakciji kao block/outbox red. Cursor je samo resume pomoć; svaka obrada je idempotentna po `(block_id,intent_id)` i završni `completed` se commit-uje tek kada ponovljeni locked scan do cutoff-a nalazi nula intent/authorization/license redova bez očekivanog terminalnog markera/compensation veze. `failed` je fail-closed stanje koje se retry-uje ili incidentno rešava; nije DLQ koji dopušta clearance.

Aktivan red ili offer `security_disabled` je immediate fail-closed autoritet. U istoj transakciji njegov admin service upisuje durable reconciliation outbox i generation red. Za `hard_disable` batch pod row lock-om pre-consume intente prebacuje u `canceled`, a na svakom consumed intentu bezuslovno upisuje immutable intent-level `hard_disabled_at/block_id/reason/compensation` marker, čak i kada authorization još ne postoji. Ako authorization postoji pre issue commita, menja `issued|used -> invalidated_for_security`; ako je već `paid`, ostavlja finansijsko stanje i pokreće revoke compensation. Za `reversible_hold` stanje intenta i još-neistekle `issued|used` authorization ostaje nepromenjeno, ali zaseban hold gate blokira sve sledeće payment/redirect/issue akcije. Svaka `:accept/:reserve/:consume/:authorize-payment/:commit-payment-authorization/:status`, issue i delivery-reconciliation ruta proverava i current block i svaki applicable istorijski hard-disable generation sa `status!=completed`, nezavisno od `cleared_at`, plus durable intent marker; zato crash usred batch-a ne otvara prozor. Admin clear hard-disable-a za buduću prodaju pod block+generation lock-om sme da postavi `cleared_*` tek kada propagation ima `status=completed`, `processed_count=affected_count`, nema failed/DLQ reda i završni rescan je prazan. Pre toga clearance je `409 hard_disable_propagation_incomplete`. Clearing ne briše red/generation/markere, već povećava version i zahteva dual-control audit; hard-disabled canceled/consumed/`invalidated_for_security` red se nikada ne oživljava niti marker briše. Posle clearance-a reversible hold-a ista neistekla authorization nastavlja sa istim ID-em/provider bindingom; ako je authorization ili provider session u međuvremenu istekao, V1 je ne oživljava niti automatski pravi drugi authorization/JTI/order, već order ide u auditovani cancel/refund/restart-purchase tok. Fixture prekida hard-disable batch posle prvog od više intent-a, pokušava clear i issue za još-neobrađeni consumed red i zahteva oba odbijanja; posle idempotentnog resume-a/completed rescan-a clear je dozvoljen samo za buduću prodaju, dok svi pogođeni intenti ostaju markerovani.

## 3. Jedini dozvoljeni wire schema contract

Producer, vendor verifier, fixture-i i testovi moraju koristiti potpuno isti schema contract. Ne uvoditi alias polja poput `v`, `intentVersion`, `productRef` ili zaseban `masterPurchaseIntentId`.

Protected header:

    {
      "alg": "EdDSA",
      "kid": "<PURCHASE_INTENT_SIGNING_KID>",
      "typ": "NRV-WEBSHOP-PURCHASE-INTENT+JWT"
    }

Payload:

    {
      "contractVersion": 1,
      "jti": "<UUID>",
      "iss": "https://license-server.nrcms.com",
      "aud": "https://vendor.nr.test",
      "iat": 1785456000,
      "nbf": 1785456000,
      "exp": 1785457800,
      "tokenUse": "purchase_intent",
      "environment": "development",
      "addonKey": "webshop",
      "offerKey": "nr-cms-webshop-license",
      "productTypeId": "<MASTER_WEBSHOP_PRODUCT_TYPE_UUID>",
      "vendorProductRef": "nr-cms-webshop-license",
      "catalogVersion": "<VERSION>",
      "allowedSkus": [
        "webshop-30",
        "webshop-183",
        "webshop-365",
        "webshop-1000000"
      ],
      "canonicalDomain": "client.nr.test",
      "installationId": "<UUID>",
      "installationKeyFingerprint": "sha256:<HEX>",
      "installationFingerprintScheme": "ed25519_spki_der_sha256_v1",
      "domainVerificationMethod": "development_allowlist_exemption",
      "domainVerifiedAt": 1785456000,
      "domainVerificationChallengeId": "<PURCHASE_CHALLENGE_UUID>"
    }

`jti` je UUID i ujedno autoritativni master purchase-intent ID. U svim downstream zapisima naziva se `masterPurchaseIntentJti`. `environment` je tačno `development|staging|production`, mora odgovarati authenticated API client/offer/catalog environmentu i prefiksu `catalogVersion`; vendor ga poredi sa sopstvenim runtime profilom. `installationFingerprintScheme` je exact closed-enum claim i za V1 issuance mora biti `ed25519_spki_der_sha256_v1`. `iat`, `nbf`, `exp` i `domainVerifiedAt` su JSON number NumericDate vrednosti u sekundama, ne stringovi. `domainVerificationMethod` je tačno `https_well_known` u produkciji ili `development_allowlist_exemption` za explicit allowlisted `.nr.test` test. Brojevi iznad su samo schema primer; implementacija koristi aktuelni clock i kontrolisan test clock.

Postojeći addon-entitlement contract koristi stabilni issuer identitet `https://license-server.nrcms.com`, iako je lokalni transport endpoint `NRLS_PUBLIC_URL=https://license.nr.test`. Purchase-intent verifier koristi isti eksplicitni issuer contract. Promena issuer-a je zasebna verzionisana producer/consumer migracija i ne izvodi se iz request `Host` headera.

Purchase intent koristi zaseban Ed25519 key pair i KID, različit od addon-entitlement signing key-a. Exact public-key discovery ruta je:

    GET /.well-known/nr-purchase-intent-keys.json

Vendor je dobija isključivo iz `NR_PURCHASE_INTENT_PUBLIC_KEYS_URL`, ne iz JWS headera/payload-a niti spajanjem nepoverljivog URL-a. Response koristi puni exact chained keyset contract iz dokumenta 02, uključujući integer `sequence`, `previousKeysetSha256`, typed RFC 3339 vremena i anti-rollback pravila, sa `purpose=purchase_intent`. Verifier prihvata potpis samo sa vremenski važećim `active|verification_only` ključem i odmah odbija `revoked`. Takođe zahteva exact algoritam, purpose, `typ`, `tokenUse`, issuer, audience, environment, contractVersion, vreme i claims. Entitlement token nikada ne sme proći kao purchase intent niti obrnuto.

## 4. Master purchase-intent ledger

Dodati tabelu `vendor_purchase_intents`:

    id uuid primary key                 -- identično JWS jti
    contract_version integer
    environment text
    token_hash text unique              -- hash compact JWS-a, ne raw token
    signing_kid text
    addon_key text
    offer_key text
    product_type_id uuid
    vendor_product_ref text
    catalog_version text
    canonical_domain text
    installation_id uuid
    installation_key_fingerprint text
    installation_fingerprint_scheme text
    domain_verification_method https_well_known|development_allowlist_exemption
    domain_verified_at timestamptz
    domain_verification_challenge_id uuid
    domain_verification_evidence_hash text
    vendor_audience text
    allowed_skus jsonb
    status issued|accepted|reserved|consumed|expired|canceled
    expected_vendor_client_id uuid
    accepted_vendor_client_id uuid null
    issued_at timestamptz
    expires_at timestamptz
    accepted_at timestamptz null
    checkout_expires_at timestamptz null
    reserved_at timestamptz null
    reservation_expires_at timestamptz null
    reserved_cart_ref text null
    reserved_checkout_ref text null
    consumed_at timestamptz null
    canceled_at timestamptz null
    order_ref text null
    order_item_ref text null
    purchase_intent_snapshot_hash text null
    selected_sku text null
    selected_quantity integer null
    hard_disabled_at timestamptz null
    hard_disable_block_id uuid null
    hard_disable_reason_code text null
    hard_disable_post_issue_compensation not_required|required|completed null
    version integer

Ne čuvati raw JWS. JTI, `signing_kid` i neosetljivi claimovi se čuvaju jer su potrebni za state machine, selektivni key-compromise odgovor i audit; token se identifikuje hashom. `(environment,catalog_version)` ima composite FK na immutable master catalog history snapshot, tako da consume/issue mogu rekonstruisati tadašnji SKU duration/activationLimit/edition/features i posle kasnije catalog mutacije, bez cross-environment lookup-a. Current reversible hold se ne duplira u intent kolonama: autoritet je aktivni `vendor_purchase_security_blocks` red/version/disposition pod lock-om, a status snapshot se računa iz njega. Intent čuva samo immutable istorijski `hard_disabled_*` marker koji current block clear nikada ne briše.

## 5. Master transition API i state machine

Vendor koristi isti HMAC V2 client/KID model kao za catalog/issue. Dodati sledeće master rute:

    POST /api/v1/purchase-intents/{jti}:accept
    POST /api/v1/purchase-intents/{jti}:reserve
    POST /api/v1/purchase-intents/{jti}:release
    POST /api/v1/purchase-intents/{jti}:consume
    POST /api/v1/purchase-intents/{jti}:status
    POST /api/v1/purchase-intents/{jti}:authorize-payment
    POST /api/v1/purchase-intents/{jti}:commit-payment-authorization

Svaka ruta zahteva:

- HMAC V2 nad originalnim body bytes;
- poseban action scope (`purchase_intent.accept`, `.reserve`, `.release`, `.consume`, `.status`, `.payment_authorize`, `.payment_commit`);
- `Idempotency-Key` i request-body hash;
- isti vendor API client za sve tranzicije jednog intenta;
- exact `aud`/vendor-client binding;
- DB row lock ili optimistic `version` compare-and-swap;
- za mutacije stabilan business rezultat za isti idempotency key/request hash; `:status` koristi poseban observation contract ispod;
- `409` za isti key sa drugim hashom ili nedozvoljenu tranziciju.

Minimalni JSON body contracti su:

    :accept
    {
      "contractVersion": 1,
      "tokenHash": "sha256:<COMPACT_JWS_HASH>",
      "vendorProductRef": "nr-cms-webshop-license"
    }

    :reserve
    {
      "contractVersion": 1,
      "cartRef": "<VENDOR_CART_ID>",
      "checkoutRef": "<VENDOR_CHECKOUT_ID>"
    }

    :release
    {
      "contractVersion": 1,
      "checkoutRef": "<VENDOR_CHECKOUT_ID>",
      "reason": "abandoned|reservation_expired|customer_canceled"
    }

    :consume
    {
      "contractVersion": 1,
      "environment": "development",
      "orderRef": "<VENDOR_ORDER_ID>",
      "orderItemRef": "<VENDOR_ORDER_ITEM_ID>",
      "canonicalDomain": "client.nr.test",
      "offerKey": "nr-cms-webshop-license",
      "productTypeId": "<MASTER_WEBSHOP_PRODUCT_TYPE_UUID>",
      "vendorProductRef": "nr-cms-webshop-license",
      "sku": "webshop-365",
      "quantity": 1,
      "catalogVersion": "<VERSION>",
      "purchaseIntentSnapshotHash": "sha256:<HEX>"
    }

    :status
    {
      "contractVersion": 1
    }

    :authorize-payment
    {
      "contractVersion": 1,
      "environment": "development",
      "orderRef": "<VENDOR_ORDER_ID>",
      "orderItemRef": "<VENDOR_ORDER_ITEM_ID>",
      "purchaseIntentSnapshotHash": "sha256:<HEX>",
      "paymentProvider": "<STABLE_PROVIDER_ADAPTER_ID>"
    }

    :commit-payment-authorization
    {
      "contractVersion": 1,
      "paymentAuthorizationId": "<UUID>",
      "paymentProvider": "<STABLE_PROVIDER_ADAPTER_ID>",
      "providerCheckoutRef": "<OPAQUE_PROVIDER_SESSION_ID>",
      "providerSessionExpiresAt": "<RFC3339_UTC_TIMESTAMP>"
    }

Svaka uspešna transition ruta vraća HTTP `200`, `Content-Type: application/json` i isti exact envelope:

    {
      "contractVersion": 1,
      "action": "accept|reserve|release|consume",
      "masterPurchaseIntentJti": "<UUID>",
      "status": "accepted|reserved|consumed|expired",
      "version": 3,
      "checkoutExpiresAt": "<ISO_TIMESTAMP_OR_NULL>",
      "reservation": {
        "cartRef": "<VENDOR_CART_ID>",
        "checkoutRef": "<VENDOR_CHECKOUT_ID>",
        "expiresAt": "<ISO_TIMESTAMP>"
      },
      "consumption": {
        "orderRef": "<VENDOR_ORDER_ID>",
        "orderItemRef": "<VENDOR_ORDER_ITEM_ID>",
        "purchaseIntentSnapshotHash": "sha256:<HEX>",
        "consumedAt": "<ISO_TIMESTAMP>"
      }
    }

`reservation` je objekat samo za status `reserved`, inače `null`; `consumption` je objekat samo za `consumed`, inače `null`. `checkoutExpiresAt` je non-null posle accept-a, uključujući originalni rok u `expired` odgovoru. Action odgovara pozvanoj ruti i `:release` daje samo `status=accepted|expired`. Kada `:release` pod lock-om prvi utvrdi da je postojeća rezervacija upravo istekla, atomski terminalizuje intent i vraća/freeze-uje HTTP 200 transition envelope sa `status=expired`; exact replay tog istog idempotency key/body-ja vraća iste bytes. Bilo koja nova mutacija nad već terminalnim expired intentom vraća `410 intent_expired`. Read-only `:status` uvek vraća HTTP 200 current terminalni `expired|canceled` snapshot za vidljiv/autorizovan intent. Prvi uspeh mutacije durable čuva HTTP status i canonical response bytes uz idempotency red; exact replay vraća iste bytes, ne novo vreme/verziju/request ID.

Sve neuspešne rute koriste jedini error schema:

    {
      "contractVersion": 1,
      "error": {
        "code": "invalid_schema|invalid_auth|scope_denied|not_found|intent_expired|intent_canceled|intent_security_hold|security_disabled|payment_authorization_expired|payment_authorization_invalidated|payment_authorization_already_used|invalid_transition|binding_conflict|idempotency_conflict|version_conflict|rate_limited|temporarily_unavailable|internal_error",
        "message": "<SANITIZED_STABLE_MESSAGE>",
        "requestId": "<UUID>",
        "retryable": false,
        "currentStatus": "<STATUS_OR_NULL>",
        "currentVersion": "<INTEGER_OR_NULL>"
      }
    }

HTTP matrica je: schema `400`; auth `401`; scope/client/audience `403` (javni code može ostati `scope_denied`); nepostojeći vidljiv resurs `404`; nova mutacija nad već expired/canceled intentom ili expired/invalidated/`invalidated_for_security` payment authorization-om `410`; already-used sa drugim provider ref-om, reversible security hold i transition/binding/idempotency/version conflict `409`; hard security disable koristi `409 security_disabled` pri prvom gate-u, zatim terminalni authorization marker; rate limit `429` sa `Retry-After`; klasifikovan privremeni dependency problem `503`; neočekivana greška `500`. Izuzeci su exact replay ranije freeze-ovanog uspeha, prvi `:release` transition-to-expired iz prethodnog pasusa i read-only `:status`, koji vraća current terminalni snapshot kao HTTP 200. Isti već-used authorization sa istim request/idempotency/body bindingom vraća originalni `200` samo ako nije naknadno hard-disabled; hard-disable marker ima prioritet za nove payment/issue akcije. Samo `429/503/500` imaju `retryable=true`; reversible hold ima `retryable=false` na HTTP nivou i prelazi u audited paused/manual-review stanje, ne u automatski hot loop. Timeout bez odgovora vendor klasifikuje retryable. Auth error ne otkriva current status/version. Shared fixture pokriva svaki action, transition-to-expired 200, already-expired mutation 410, terminal status 200, exact replay bytes i svaki code/status/retryability par.

Master, ne vendor, bira `checkoutExpiresAt` i `reservationExpiresAt` iz bounded konfiguracije i vraća ih u odgovor zajedno sa statusom/verzijom. Vendor ne može proizvoljno produžiti rok.

`:status` je read-only authenticated reconciliation i vraća exact body:

```json
{
  "contractVersion": 1,
  "action": "status",
  "masterPurchaseIntentJti": "<UUID>",
  "status": "issued|accepted|reserved|consumed|expired|canceled",
  "version": 3,
  "securityHold": {
    "active": false,
    "version": 0,
    "disposition": null,
    "reasonCode": null,
    "changedAt": null
  },
  "hardDisable": {
    "occurred": false,
    "blockId": null,
    "at": null,
    "reasonCode": null,
    "postIssueCompensation": null
  },
  "checkoutExpiresAt": "<ISO_TIMESTAMP_OR_NULL>",
  "reservationExpiresAt": "<ISO_TIMESTAMP_OR_NULL>",
  "orderRef": "<VENDOR_ORDER_ID_OR_NULL>",
  "orderItemRef": "<VENDOR_ORDER_ITEM_ID_OR_NULL>",
  "purchaseIntentSnapshotHash": "sha256:<HEX_OR_NULL>",
  "paymentAuthorization": {
    "paymentAuthorizationId": "<UUID>",
    "status": "issued|used|paid|invalidated|invalidated_for_security|expired",
    "issuedAcceptUntil": "<ISO_TIMESTAMP>",
    "usedExpiresAt": "<ISO_TIMESTAMP_OR_NULL>"
  }
}
```

Top-level `hardDisable` je immutable intent/order marker i postoji nezavisno od current `securityHold` i od toga da li payment authorization već postoji. Kada `occurred=true`, block ID/time/reason su non-null i compensation je `not_required|required|completed`; kada je false, sva četiri su null. Hard disable nad consumed intentom postavlja ovaj marker i povećava intent version čak i ako je vendor offline ili authorization još nije kreirana. Administrativni clear current block-a nikada ga ne briše. Zato consumed/no-authorization, `invalidated_for_security` i već `paid` slučaj svi ostaju vidljivi i terminalno gate-ovani.

`paymentAuthorization` je null dok authorization ne postoji, inače je exact objekat iznad. Za `issued` je `usedExpiresAt=null`; uspešan commit trajno postavlja non-null `usedExpiresAt`, a `used|paid` i terminalna stanja ga ne skrivaju. `issuedAcceptUntil` ostaje istorijski binding dokaz i posle commita, ali više nije efektivni capture rok. Jedini wire autoritet za istorijski hard disable je top-level `hardDisable`; nema drugog nested markera koji može da odstupi. Pre issue commita authorization prelazi u `invalidated_for_security`, dok hard disable posle issue commita ostavlja authorization `paid` i top-level compensation prelazi `required -> completed` prema idempotentnom revoke toku. Hard-disable snapshot ostaje u status odgovoru i nakon što je aktuelni `securityHold.active` postao false zbog administrativnog clear-a. Ruta ne vraća provider checkout ref, entitlement/key ili payment/customer payload.

`:status` nije frozen business-idempotency snapshot kroz različita posmatranja. Svaki poll koristi novi `Idempotency-Key=purchase-intent-status:v1:<JTI>:<OBSERVATION_UUID>`; transport retry istog observation key/body-ja vraća iste response bytes, a novi observation key pod row lock-om čita current stanje. Svaka status-visible promena povećava jedan monotoni top-level `version`: intent/hold/clear, authorization create/binding i svaki authorization state transition, hard-disable marker i compensation transition. `securityHold.version` se dodatno povećava samo za current hold/clear promene. Vendor durable čuva najveći top-level version i terminalni hard-disable marker i ignoriše zakašnjeli response sa nižom verzijom; isti version sa različitim response hashom je master incident, ne last-write-wins. Payment/issuance/delivery gate zahteva svež uspešan observation prema kratkom lokalnom max-age policy-ju i zatim autoritativnu master proveru u mutacionoj ruti. Fixture radi status bez hold-a, aktivira reversible hold, zatim dokazuje da novi observation vidi veću verziju/hold dok retry starog observation-a ostaje byte-identical i ne može prepisati novije stanje; poseban out-of-order fixture prolazi `authorization=null -> issued -> used -> paid` sa strogo rastućim top-level version-om. Drugi fixture drži vendor offline tokom hard disable-a i njegovog kasnijeg clear-a: consumed/no-auth ima top-level marker, pre-commit red ostaje `invalidated_for_security`, a post-commit red ostaje `paid + hardDisable.occurred=true + postIssueCompensation=required|completed`; nijedan ne otvara redirect/issue/delivery, a post-commit grana ima tačno jednu revoke compensation.

Aktivan hold ima non-null stable `disposition=reversible_hold|hard_disable`, `reasonCode` i `changedAt`; sva četiri su null/false konzistentno kada nije aktivan. Ruta ne vraća raw token, domain evidence, customer/payment podatke ili approval tajnu. Vendor reconciliation worker periodično proverava sve non-terminalne lokalne intente i svaki consumed order dok delivery ili compensation nije terminalna; canceled/hard-disabled rezultat zatvara cart/checkout i vodi order u refund/revoke review. Master-sourced reversible hold se na vendoru čuva u zasebnim poljima `masterSecurityHoldActive`, `masterSecurityHoldVersion`, `masterSecurityHoldDisposition`, `masterSecurityHoldReasonCode`, `masterSecurityHoldChangedAt` i daje izvedeni fulfillment prikaz `paused_security_review`; ne menja vendor-local `riskStatus` niti `riskLifecycleVersion`. Lokalni fraud/dispute signal i dalje menja tu vendor risk osu. Time reversible master hold/clear može pauzirati/nastaviti isti već vezani issue body bez promene `issuanceFence`; hard disable ne resume-uje. Local response cache nije dovoljan payment gate.

Neposredno pre kreiranja provider payment session-a vendor mora pozvati `:authorize-payment`. Master pod intent row lock-om zahteva `consumed`, potpuno isti environment/order/item/snapshot binding, bez security hold-a i bez security-disabled offer/SKU bloka, zatim durable pravi kratkotrajnu autorizaciju sa najviše 120 sekundi TTL-a. Exact response je:

```json
{
  "contractVersion": 1,
  "action": "authorize_payment",
  "masterPurchaseIntentJti": "<UUID>",
  "status": "consumed",
  "securityHold": false,
  "paymentAuthorizationId": "<UUID>",
  "paymentProvider": "<SAME_STABLE_PROVIDER_ADAPTER_ID>",
  "issuedAcceptUntil": "<ISO_TIMESTAMP>",
  "version": 3
}
```

Tabela `purchase_intent_payment_authorizations` ima unique authorization ID i dodatni unique `purchase_intent_jti`: V1 dozvoljava tačno jednu autorizaciju/provider session za jedan consumed intent/order. `:authorize-payment` već prima i validira stable `paymentProvider` (`^[a-z0-9_]{1,50}$`), pre provider session kreiranja. Red čuva environment/order/item/snapshot hash, intent version, status, `issued_at`, `issued_accept_until`, nullable `used_at/used_expires_at/paid_at/invalidated_at`, nullable immutable `hard_disabled_at/block_id/reason`, taj immutable `payment_provider`, opaque provider session ref/expiry i request/idempotency hash; `(payment_provider, provider_checkout_ref)` je unique kada je ref non-null. `issued_accept_until` je jedini kratki, najviše 120 sekundi dug rok za kreiranje i commit provider-session bindinga; nije rok do kog kupac mora završiti plaćanje. Concurrent ili kasniji `:authorize-payment` za isti JTI i isti provider vraća isti outstanding authorization ako je još `issued|used`; drugi provider je binding conflict, a posle `paid|invalidated|invalidated_for_security|expired` ne kreira novi. Reversible security hold ne menja authorization state, već blokira `:authorize-payment`/`:commit-payment-authorization` i checkout redirect dok je active; postojeći `issued|used` red nastavlja samo posle clearance-a i samo ako njegov efektivni rok još važi. Hard disable menja `issued|used -> invalidated_for_security`; clearing block-a nikada ga ne resume-uje, a late capture se samo knjiži i vodi u refund/revoke review. Vendor upisuje authorization ID uz payment session pre redirecta. Capture koji zbog neizbežne provider race stigne posle kasnijeg reversible master hold-a ostaje finansijska činjenica, ali izvedeni fulfillment status prelazi u `paused_security_review` i ne radi auto-issue; vendor-local `riskStatus/riskLifecycleVersion` se ne menjaju samo zbog tog master događaja. Master issue ruta ponovo pod lock-om proverava consumed binding, authorization `used`, `now < used_expires_at`, odsustvo hard-disable markera/hold-a i isti provider ref; reversible hold atomski menja master issue operation `pending -> blocked`, vraća stable `intent_security_hold` business error i ne dobija novi idempotency key. Replay istog zahteva ostaje `blocked` dok je isti security-block version; audited dual-control clear menja `blocked -> pending`, a izdavanje se izvršava tek kada vendor, posle ponovne lokalne fence provere, pošalje isti body/key. Hard disable daje terminalni `security_disabled` ishod/compensation policy, ne `blocked -> pending`.

Authorization state machine je tačno `issued -> used -> paid`, `issued -> invalidated|expired|invalidated_for_security` i `used -> expired|invalidated_for_security`. Nijedno terminalno stanje se ne vraća u issued/used i V1 nema drugi payment attempt/session za isti JTI/order. Vendor prvo durable čuva `issued` authorization, zatim kreira provider session sa provider idempotency key-em tačno `webshop-license-checkout:v1:<paymentAuthorizationId>`. Lokalni payment-session operation ima unique authorization ID, stable `paymentProvider`, canonical provider request hash i status `creating|created|committed|failed`; timeout posle provider commita radi retrieve-by-idempotency-key ili sačuvanim provider ref-om u istom provider namespace-u i nikada ne pravi novu session. Zatim vendor lokalno čuva opaque session reference i poziva `:commit-payment-authorization` pre browser redirecta. Master pod authorization/intent lock-om zahteva isti vendor client, živ `issued` red sa `now < issued_accept_until` i `now < intent.checkout_expires_at`, bez hard-disable markera i odsustvo hold/security block-a, zatim unique vezuje `(paymentProvider, providerCheckoutRef)`. Jedini V1 order/payment-policy deadline je već persisted `vendor_purchase_intents.checkout_expires_at`, koji master bira pre consume-a i consume ga zamrzava uz order binding; ne uvodi se drugo `payment_completion_expires_at` polje. Prosleđeni provider expiry mora biti u budućnosti, a master postavlja `used_expires_at=min(providerSessionExpiresAt,intent.checkout_expires_at)` i `used_at`. Posle tog commita kratki `issued_accept_until` više nije efektivni payment/issue rok. Success je:

```json
{
  "contractVersion": 1,
  "action": "commit_payment_authorization",
  "masterPurchaseIntentJti": "<UUID>",
  "paymentAuthorizationId": "<UUID>",
  "authorizationStatus": "used",
  "paymentProvider": "<SAME_STABLE_PROVIDER_ADAPTER_ID>",
  "providerCheckoutRef": "<SAME_OPAQUE_PROVIDER_SESSION_ID>",
  "providerSessionExpiresAt": "<SAME_RFC3339_TIMESTAMP>",
  "usedExpiresAt": "<MASTER_EFFECTIVE_RFC3339_TIMESTAMP>",
  "usedAt": "<ISO_TIMESTAMP>"
}
```

Isti idempotency key/body vraća iste bytes; isti authorization ili provider ref sa drugim bindingom je `409`. Ako commit stigne na ili posle `issued_accept_until`, pada terminalno, vendor best-effort otkazuje provider session i ne redirectuje kupca. Reversible hold ne invalidira `issued|used` red, već blokira novu session/commit/redirect/issue akciju dok je aktivan; hard disable terminalno upisuje `invalidated_for_security` i ne resume-uje se. Vendor pokušava provider cancellation kada je podržana, ali kasni capture se i dalje knjiži. Payment reducer priznaje auto-fulfillment samo kada webhook provider checkout reference odgovara `used` authorization-u bez hard-disable markera istog JTI/order/item snapshot-a i capture je došao pre `used_expires_at`; master issue commit tada u istoj transakciji menja authorization `used -> paid`. Capture posle `used_expires_at` ostaje finansijska činjenica i ide u manual refund/reconciliation, bez auto-issue-a. Inače finansijska činjenica ostaje u svom financial statusu i licenca se ne izdaje: vendor-local provider/fraud/dispute menja `riskStatus`, reversible master hold menja samo zasebni `masterSecurityHoldActive/version/disposition` mirror i izvedeni `paused_security_review`, a hard disable vodi u refund/revoke review. Closed risk enum je `none|security_review|paid_security_review|cleared|refund_required`; samo dual-control audited review sme preći iz review stanja u `cleared|refund_required`, a fulfillment zahteva `paid + (none|cleared) + no master hold/hard-disable marker`. Failed/canceled/expired provider session ne dobija novu V1 autorizaciju u istom toku: kupac eksplicitno pokreće novi master purchase intent i novu porudžbinu; retry načina plaćanja je dozvoljen samo unutar iste još-payable provider session-e. Status odgovor za authorization uvek vraća efektivni rok: `issued` nosi `issuedAcceptUntil` i `usedExpiresAt=null`, `used` nosi oba persisted roka, a terminalno stanje ne skriva ranije bindinge. Fixture dokazuje commit na 121. sekundi kao failure, commit pre 120. sekunde pa capture posle 120. sekunde ali pre `usedExpiresAt` kao validan issue, i capture posle `usedExpiresAt` kao financial-only/manual-review bez nove autorizacije.

Dozvoljene tranzicije:

    issued -> accepted -> reserved -> consumed
    issued|accepted|reserved -> expired
    issued|accepted|reserved -> canceled
    reserved -> accepted

`issued` ističe prema JWS `exp`. Uspešan `:accept` pre tog roka postavlja bounded `checkout_expires_at`; `:reserve` i `:consume` moraju se završiti pre tog master checkout roka. `reserved -> accepted` je dozvoljen samo eksplicitnim `:release` pozivom ili istekom reservation lease-a, i samo pre nego što postoji trajna order veza. Ako je u tom trenutku i `checkout_expires_at <= now`, rezultat je `reserved -> expired`, ne `accepted`. `consumed` je terminalan. Cleanup job zaključava redove i oslobađa samo istekle reservation lease-ove bez `order_ref`/`purchase_intent_snapshot_hash` veze.

`expired` postavlja master cleanup prema odgovarajućem roku. `canceled` je eksplicitna master admin/security/internal revocation tranzicija sa auditom; vendor-commerce client je ne dobija kao opšti način da ponovo koristi intent.

Semantika ruta:

- `:accept` prvo zahteva da authenticated client odgovara immutable `expected_vendor_client_id` snapshotu, zatim ga upisuje kao `accepted_vendor_client_id` i potvrđuje token/audience/istorijski offer-product snapshot, rok i odsustvo explicit security block-a; normalna catalog/offer promena ne obara intent;
- `:reserve` pravi vremenski ograničen checkout lease i atomski čuva `reserved_cart_ref`/`reserved_checkout_ref`; replay mora imati iste reference, a drugi cart/checkout dobija conflict;
- `:release` zahteva isti persisted checkout ref i odsustvo trajne order veze. `abandoned|customer_canceled` vraća u `accepted` samo dok je master checkout rok živ; `reservation_expired` dodatno zahteva da je reservation lease stvarno istekao. Ako je checkout rok istekao, sva tri daju `expired`. Ruta čisti current reservation reference uz append-only transition audit i nikada ne odvaja već kreiranu porudžbinu;
- `:consume` ponovo proverava claim domain/istorijski offer-product snapshot/allowed SKU/quantity, environment i odsustvo security block-a, rekonstruiše snapshot hash, atomski vezuje `vendorClientId`, order/item, izabrani SKU/catalog i hash i prelazi u terminalni `consumed`.

Consumed intent ostaje potrošen i ako payment kasnije padne. Više pokušaja načina plaćanja dozvoljeno je samo unutar iste još važeće provider session-e/authorization-a; terminalno failed/canceled/expired stanje ne pravi drugu session za taj intent/order. Novi pokušaj tada zahteva novi intent i novu porudžbinu. Tako jedan intent ne može završiti u dve naplative ili plaćene porudžbine/session-e.

## 6. Browser transport: POST telo, bez tokena u URL-u

`WEBSHOP_BUY_URL` je konfiguracija tačnog vendor acceptance endpointa:

    WEBSHOP_BUY_URL=https://vendor.nr.test/licenses/purchase-intents/accept

Client activation strana server-side dobija JWS, a **Buy webshop license** prikazuje top-level HTML formu:

    method=POST
    action=https://vendor.nr.test/licenses/purchase-intents/accept
    enctype=application/x-www-form-urlencoded
    hidden purchaseIntent=<COMPACT_JWS>

Ne koristiti `?intent=...`, fragment, client-side analytics event sa tokenom niti JavaScript redirect koji token stavlja u URL. Hidden polje nosi samo potpisani JWS; ne šalje odvojene `domain`, `productTypeId` ili `sku` vrednosti koje bi vendor mogao greškom da tretira kao autoritet.

Vendor acceptance endpoint:

1. prihvata samo `POST` i očekivani content type;
2. ima strogi body-size limit;
3. ne loguje request body;
4. opciono proverava allowlisted `Origin` kao defense-in-depth, ali JWS i master ledger ostaju autoritet;
5. verifikuje exact wire schema, potpis, issuer/audience/type/vreme i canonical claims;
6. poziva master `:accept` sa stabilnim idempotency key-em;
7. kreira ili idempotentno nalazi lokalni vendor intent red;
8. postavlja `Secure`, `HttpOnly`, `SameSite=Lax` session cookie sa opaque lokalnom referencom;
9. vraća `303 See Other` na čistu product URL putanju, npr. `/licenses/p/nr-cms-webshop-license`.

Ovo mora biti javni Next Route Handler, a ne Server Action, jer je ulaz namerno top-level cross-origin form POST. Exact routable fajl je **core CMS wrapper** `app/licenses/purchase-intents/accept/route.ts`, koji mora biti deo pinovanog base CMS commita pre bilo koje aktivacije. Next ne otkriva package-ov `.private/webshop/app/**` niti `node_modules/@radomirradojevic/webshop/app/**`; takav fajl nije deployment mehanizam. Core wrapper nema statički import private package-a, već kroz postojeći addon registry/loader poziva typed `handleApiRoute({method:"POST",path:["licenses","purchase-intents","accept"],request,userId:null,licenseMode:"ready"})`. Raw telo ne parsira, kopira ili loguje pre package handlera. Package dispatcher mora imati exact method/path granu i sam sprovodi sledeći verifier/master/ledger contract.

Kada registry nema Webshop entry ili addon nije instaliran, wrapper vraća stabilan `404 addon_not_installed` bez set-cookie/body echo-a; kada installation postoji ali active serving fence, maintenance, invalid/revoked license ili loaded/promoted tuple mismatch blokira runtime, vraća `503 addon_not_ready` sa bounded `Retry-After` i bez poziva package handlera. Samo exact `ready` runtime poziva delegate. Time core-bootstrap release može bez private package-a bezbedno sadržati rutu, dok vendor acceptance postaje aktivan tek posle njegove ručno licencirane Webshop instalacije.

`proxy.ts` — nikada `middleware.ts` — propušta samo exact `POST /licenses/purchase-intents/accept` pre interactive Clerk redirecta. Ako aplikacija ima globalni Origin/CSRF filter, jedini izuzetak je isti method/path/content-type/body-limit tuple; izuzetak ne važi za Server Actions, druge rute ili druge metode i ne preskače route-ov JWS/master/replay contract. Endpoint ne koristi postojeći vendor cookie kao autoritet i ne radi state mutation pre verifikacije.

Posle offline provere JWS potpisa/claimova, prisutan non-null `Origin` mora biti validan HTTPS origin i jednak `https://<canonicalDomain>` iz verifikovanog claim-a po canonical-origin pravilima; forged mismatch se odbija pre master `:accept`. Odsutan Origin ili literal `null` ne smatra se dokazom domena, ali se ne odbija samo zbog toga, jer browser/privacy/sandbox režimi mogu ukloniti origin i nije moguće održavati globalnu allowlistu svih customer domena. U toj grani potpisani one-time JWS, master `:accept`, installation/domain binding i replay ledger ostaju jedini autoritet. `Sec-Fetch-Site` je audit/defense-in-depth signal, ne authorization input. Real-browser fixture pokriva proizvoljan verifikovani production customer origin, local `client.nr.test`, absent/`null` Origin i forged Origin; samo forged non-null mismatch pada, a nijedna grana ne loguje body/JWS.

Registry-only route inventory je deo CMS `runtimeContractVersion="1"`. Implementacija mora imati jedinstven typed manifest/test koji inventariše svaki Next-discovered host entry i njegov package delegate: `app/api/webshop/[...webshopPath]/route.ts`, `app/api/webhooks/paddle/route.ts`, `app/[slug]/downloads/[...downloadPath]/route.ts`, `app/[slug]/page.tsx`, `app/[slug]/[...webshopPath]/page.tsx`, `app/dashboard/webshop/page.tsx`, `app/api/cron/webshop-license-issues/route.ts`, core entitlement cron i novi `app/licenses/purchase-intents/accept/route.ts`. `app/api/files/[id]/route.ts` mora ukloniti direktnu zavisnost od root Webshop business tabela i koristiti typed addon authorization hook ili package API delegate. Provider webhook/return rute koje su ispod `/api/webshop/**` pokriva catch-all; svaki legacy vanity webhook dobija eksplicitni core wrapper kao Paddle. Cron wrapper poziva samo deklarisani `addon.jobs` handler uz dedicated auth. Build pada ako package deklarisani route/job capability nema tačno jedan core binding ili ako wrapper referencira nepostojeću typed granu. Package `app/**` fajl sam po sebi nikada se ne računa kao binding.

Caddy/app access log ne sadrži body. Pošto se token ne nalazi u URL-u, ne završava u browser history-ju, query logovima, referreru ili analytics URL-u. I dalje je kratkotrajni bearer artefakt: ne čuvati ga u localStorage-u, sessionStorage-u ili client telemetry-ju.

Direktan `GET` proizvoda bez prihvaćene server-side intent sesije može prikazati opšte informacije i cene, ali Add to cart za domain-bound licencu mora biti onemogućen uz poruku da kupac pokrene kupovinu iz svog CMS-a.

## 7. Vendor lokalni ledger

Dodati tabelu `webshop_purchase_intents`:

    id uuid primary key
    master_purchase_intent_jti uuid unique
    token_hash text unique
    contract_version integer
    environment text
    signing_kid text
    webshop_id uuid
    product_id uuid
    product_type_id uuid
    offer_key text
    vendor_product_ref text
    catalog_version text
    canonical_domain text
    source_installation_id uuid
    source_installation_fingerprint text
    source_installation_fingerprint_scheme text
    domain_verification_method https_well_known|development_allowlist_exemption
    domain_verified_at timestamptz
    domain_verification_challenge_id uuid
    allowed_skus jsonb
    status accepted|reserved|consumed|expired|canceled
    expires_at timestamptz
    checkout_expires_at timestamptz null
    reservation_expires_at timestamptz null
    cart_id uuid null
    checkout_session_id uuid null
    order_id uuid null
    order_item_id uuid null
    purchase_intent_snapshot_hash text null
    created_at timestamptz
    consumed_at timestamptz null
    version integer

Vendor lokalno čuva rok i `signing_kid` koji je verifikovao; ne sme ih promeniti niti menjati domain, product type, vendor product reference ili allowed SKUs. JWS `exp` ograničava početni acceptance, a master `checkout_expires_at` nastavak checkouta. Master status je autoritativan za cross-service one-time garanciju.

## 8. Domain confirmation

Pre Add to cart kupac mora videti:

    This license will be bound to: client.nr.test

i potvrditi checkbox. Domen nije editabilno polje.

Installation PoP dokazuje kontrolu nad CMS installation privatnim ključem koji tvrdi domen; sam po sebi ne dokazuje kontrolu nad hostname-om. Zato je production domain-control dokaz obavezan pre izdavanja purchase intenta, aktivacije nove licence i transfera.

Zaključani production protokol je HTTPS well-known dokaz. Nakon challenge odgovora CMS privremeno izlaže tačno:

    GET https://<canonicalDomain>/.well-known/nr-license-domain-proof/<challengeId>

sa `Content-Type: application/json` i body-jem:

    {
      "contractVersion": 1,
      "purpose": "nr_license_domain_control",
      "challengeId": "<UUID>",
      "canonicalDomain": "example.com",
      "installationId": "<UUID>",
      "installationKeyFingerprint": "sha256:<HEX>",
      "installationFingerprintScheme": "ed25519_spki_der_sha256_v1",
      "proofPayload": "<SAME_BASE64URL_CANONICAL_BYTES>",
      "proofSignature": "<SAME_BASE64URL_ED25519_SIGNATURE>"
    }

CMS response sastavlja isključivo iz server-side challenge reda; route ne prima query parametre i ne izlaže license key, private key ili raw purchase intent. Master pri `action=complete` sam konstruiše URL iz već zaključanog `canonicalDomain`, zahteva port 443 i exact putanju, ne prati redirect, ograničava DNS/connect/read rok, JSON veličinu i content type, i koristi SSRF zaštitu sa DNS resolution pinningom. Production odbija loopback, private, link-local, multicast, reserved i mixed public/private DNS rezultate pre i tokom konekcije. Host iz response-a ili `Host`/forwarded headera ne menja očekivani domen.

Master zatim proverava da se sva polja, uključujući fingerprint scheme, slažu sa challenge ledgerom, da je signature validan nad decoded `proofPayload` bytes i da challenge nije istekao/potrošen. Čuva `method=https_well_known`, `verified_at`, challenge ID i SHA-256 canonical evidence body-ja. Tek tada atomski troši challenge i potpisuje intent. Produkcioni dokaz važi samo za taj challenge; ne postoji neograničen cache vlasništva.

Za development profil postoji samo eksplicitni `development_allowlist_exemption` za `vendor.nr.test` i `client.nr.test`. Master ne radi javni SSRF fetch za te lokalne hostove, ali u intent/licenci čuva da je korišćen izuzetak. UI, audit i testovi ga nikada ne nazivaju DNS ownership dokazom. Ovaj izuzetak se startup validacijom zabranjuje kada je `NRLS_ENVIRONMENT=production`.

Za drugi domen kupac pokreće novi intent iz odgovarajućeg CMS-a ili poseban domain-transfer proces.

## 9. Cart binding i reservation

Pri Add to cart server action-u:

1. učitati lokalni intent iz HttpOnly session reference;
2. proveriti local i master status/expiry/product;
3. proveriti da selected external SKU pripada `allowedSkus` i mapiranom `productTypeId`;
4. force `quantity=1`;
5. upisati immutable cart metadata:

       masterPurchaseIntentJti
       purchaseIntentContractVersion
       environment
       canonicalDomain
       offerKey
       externalProductTypeId
       vendorProductRef
       externalSku
       catalogVersion

6. pri kreiranju checkouta pozvati master `:reserve` i tek posle potvrde postaviti local `reserved` stanje/lease; snapshot hash se još ne računa jer order/item ID-evi ne postoje;
7. normalizovan nullable `purchase_intent_id` FK na cart itemu mora imati unique constraint, tako da jedan intent može pripadati tačno jednoj cart liniji;
8. Add to cart za JTI koji već postoji vraća postojeću liniju samo ako je zahtev identičan; ne kreira drugu liniju i ne povećava quantity;
9. promena SKU-a koristi posebnu server action operaciju `replaceLicenseVariant`, pod cart/intent lock-om menja istu liniju samo dok je intent `accepted` i quantity ostaje 1; nakon reservation-a promena je zabranjena;
10. sprečiti merge različitih intent/domain/SKU linija i pri checkoutu zahtevati tačno jednu cart liniju za dati JTI.

Browser polje domain se ignoriše; server koristi ledger.

Order item takođe dobija normalizovan nullable `purchase_intent_id` sa filtered unique constraintom. Prvi contract dodatno zahteva `order_kind=webshop_license_single`: checkout/cart/order sadrži tačno jednu liniju, ona je quantity 1 i nosi tačno jedan JTI; drugi license intent, običan proizvod i mixed cart su server-side odbijeni pre reservation/payment-a. Unique partial order constraint i domain-service transaction/konkurentni test dokazuju najviše jedan non-canceled order item za taj order kind. Vendor transakcija iz odeljka 10 zaključava intent i cart, potvrđuje jedinu vezanu liniju i kreira tačno jedan order item. JSON metadata ostaje audit snapshot, ali se jedinstvenost ne zasniva na JSON polju. Budući multi-item checkout zahteva novi order-level payment-aggregate contract version, ne reuse V1 provider ref-a preko više JTI-ja.

## 10. Kreiranje porudžbine i consume protokol

Cross-service transakcija ne postoji, zato pre početka payment-a koristiti sledeći recovery-safe redosled:

1. master `:reserve` mora biti potvrđen;
2. vendor DB transakcija kreira tačno jedan order/order item sa stanjem `intent_confirmation_pending` i immutable snapshot hashom;
3. posle commita vendor poziva master `:consume` sa order/item referencama, licencnim snapshot poljima i `purchaseIntentSnapshotHash`;
4. isti consume poziv se bezbedno ponavlja posle timeout-a ili gubitka odgovora, sa istim idempotency key-em i body-jem;
5. potvrđen `consumed` odgovor menja order u `payment_authorization_pending`, ali još ne otvara provider session;
6. neposredno pre provider redirecta vendor dobija svež `:authorize-payment` odgovor, durable vezuje njegov ID/expiry za isti order i kreira session;
7. vendor poziva `:commit-payment-authorization` sa tom session referencom i browser preusmerava provideru tek posle `used` odgovora;
8. ako master vrati terminalni conflict/cancel/hold, order se otkazuje ili prelazi u security review pre payment-a; ne naplaćivati;
9. recovery worker nalazi `intent_confirmation_pending` redove i ponavlja identičan `:consume` zahtev; za `payment_authorization_pending` nikad ne pravi drugu provider session dok ne utvrdi da prethodna ne postoji, već retry-uje commit istog ID/body-ja.

Order-item `fulfillmentDataSnapshot` sadrži:

    {
      "delivery": "license",
      "licenseKeyPolicy": "license_server",
       "licenseServer": {
         "licenseServerId": "<UUID>",
         "environment": "development",
        "offerKey": "nr-cms-webshop-license",
        "productTypeId": "<MASTER_PRODUCT_TYPE_ID>",
        "vendorProductRef": "nr-cms-webshop-license",
        "sku": "webshop-365",
        "domain": "client.nr.test",
        "masterPurchaseIntentJti": "<UUID>",
        "purchaseIntentContractVersion": 1,
        "purchaseIntentSnapshotHash": "sha256:<HEX>",
        "catalogVersion": "<VERSION>"
      }
    }

Snapshot je immutable poslovni input za payment i fulfillment. Ne sadrži mutable issue/remote/fulfillment status niti issue ID. Ta polja žive u normalizovanom `webshop_license_server_issues`/operation/read modelu vezanom FK-om za order item; email i storefront rade join. DB trigger/guard ili jedini domain writer i integration test moraju dokazati da issuance/retry/delivery ne menjaju snapshot bytes ili `purchaseIntentSnapshotHash`. Payment return URL prenosi samo bezbednu checkout/session referencu; domain se uvek ponovo učitava iz order snapshot-a.

`purchaseIntentSnapshotHash` nije hash objekta koji već sadrži sam hash. Izračunava se kao SHA-256 nad UTF-8 canonical JSON reprezentacijom tačno ovog `PurchaseIntentOrderBindingV1` objekta:

    {
      "contractVersion": 1,
      "masterPurchaseIntentJti": "<UUID>",
      "environment": "development",
      "orderRef": "<VENDOR_ORDER_ID>",
      "orderItemRef": "<VENDOR_ORDER_ITEM_ID>",
      "canonicalDomain": "client.nr.test",
      "offerKey": "nr-cms-webshop-license",
      "productTypeId": "<MASTER_PRODUCT_TYPE_ID>",
      "vendorProductRef": "nr-cms-webshop-license",
      "sku": "webshop-365",
      "quantity": 1,
      "catalogVersion": "<VERSION>"
    }

Canonical bytes su RFC 8785/JCS reprezentacija objekta i contract se naziva `NRV-WEBSHOP-PURCHASE-BINDING-JCS-1`. Koristiti isti verzionisani fixture u vendoru i masteru; ne oslanjati se na slučajan property insertion order. Rezultat se zapisuje kao lowercase `sha256:<64_HEX>`. UUID-evi order-a/itema generišu se pre inserta, pa vendor u istoj DB transakciji može napraviti objekat, hash i immutable order snapshot bez naknadnog editovanja poslovnih polja.

## 11. Vezivanje issuance-a za consumed intent

Master issue request iz dokumenta 08 obavezno šalje:

    masterPurchaseIntentJti
    purchaseIntentSnapshotHash
    environment
    issuanceFence.fulfillmentGeneration
    issuanceFence.paymentAggregateVersion
    issuanceFence.financialLifecycleVersion
    issuanceFence.riskLifecycleVersion
    payment.paymentAuthorizationId
    payment.paymentProvider
    payment.providerCheckoutRef
    payment.paymentAggregateId
    payment.paymentAggregateHash
    payment.captureEvidence[]

pored `orderRef` i `orderItemRef`. `issuanceFence` je strict objekat sa tačno ta četiri obavezna non-negative JSON integer polja, bez unknown/missing polja; ulazi u full canonical issue body/request hash i immutable master issue-operation binding, ali ne u payment aggregate hash. Isti idempotency key sa promenjenim fence tuple-om je `409 idempotency_conflict`, čak i kada su intent i payment aggregate isti. `captureEvidence[]` koristi autoritativni provider `captureRef` kao financial dedupe identitet; webhook `eventRef` je samo inbox dedupe/audit podatak i ne identifikuje capture. Lista ima 1..1000 canonical-sortiranih unique redova; amount/total vrednosti su lossless safe integeri `<=9007199254740991`. Vendor i master nezavisno BigInt-om recompute-uju zbir, zahtevaju `capturedTotalMinor == sum(amountMinor)`, a master iz validiranog objekta sam recompute-uje JCS aggregate hash pre full-capture provere. Mismatch, unsafe integer, 1001 red ili sum overflow je strict rejection. Master pod row lock-om proverava da je intent:

- `consumed`, bez aktivnog hold-a i bez hard-disable markera;
- potrošen od istog autentifikovanog vendor API client-a;
- u istom environmentu kao client, intent, catalog snapshot i issue request;
- vezan za isti order/order item i snapshot hash;
- vezan za istu `used` payment autorizaciju bez `invalidated_for_security` markera, isti opaque provider checkout ref i master-recomputed canonical payment aggregate hash;
- issue operation immutable čuva isti exact issuance-fence tuple; master ga strict validira i vraća samo stored replay za isti full body hash, dok vendor pre send-a i pri response CAS-u proverava da lokalne četiri verzije nisu promenjene;
- vezan za isti domain, offer, product type, vendor product reference i SKU;
- još nije vezan za drugu licencu.

Dodati nullable FK `licenses.purchase_intent_id -> vendor_purchase_intents.id` i filtered unique constraint za non-null vrednosti. Pri issuance-u master kopira `domain_verification_method`, `domain_verified_at`, `domain_verification_challenge_id` i evidence hash u immutable license audit snapshot; production issue se odbija ako intent nema uspešan `https_well_known` dokaz. Manual/admin licence i legacy issuance bez purchase intenta ostaju dozvoljeni samo kroz eksplicitno odvojenu akciju/scope i imaju `purchase_intent_id=null`; vendor-commerce issue za domain-bound Webshop proizvod zahteva intent.

Posle auth/schema/body-hash provere master prvo radi issue idempotency lookup. Response-loss retry istog već `committed` issue key/body-ja vraća isti entitlement/licencni ključ prema encrypted replay contractu iako je authorization u commit transakciji već prešla `used -> paid`; current `used` precondition važi samo za novi/pending operation. Drugi order, snapshot ili request hash dobija conflict.

## 12. Canonicalization contract

Jedna funkcionalna specifikacija i isti fixture-i važe u CMS-u, Webshopu i masteru.

Za apsolutni origin input:

- dozvoljeni su samo `http:` i `https:`;
- `username` i `password` moraju biti prazni;
- pathname mora biti tačno `/`;
- query i fragment moraju biti prazni;
- hostname se izdvaja, a port se odbacuje tek nakon uspešne validacije.

Za hostname/host:port input:

- odbiti userinfo, putanju, query i fragment;
- port se ne čuva u licencnom domenu;
- hostname se normalizuje na lowercase WHATWG/IDNA ASCII oblik;
- uklanja se jedna završna tačka;
- zatim se validiraju DNS label-e, dužina, control karakteri i wildcard zabrana.

Produkcijska policy je zaključana: license domain mora biti DNS hostname; odbijaju se IP literal-i, `localhost` i development-only `.nr.test` hostname-i. Development profil eksplicitno dozvoljava samo allowlisted `.nr.test` hostname-e potrebne za test. Nema IP izuzetka u prvom E2E-u.

| Input | Profil | Očekivano |
|---|---|---|
| `https://Client.NR.Test` | development | `client.nr.test` |
| `client.nr.test:3002` | development | `client.nr.test` |
| `https://client.nr.test/` | development | `client.nr.test` |
| `https://client.nr.test./` | development | `client.nr.test` |
| origin sa query/fragmentom | svi | reject |
| URL sa userinfo | svi | reject |
| origin sa putanjom različitom od `/` | svi | reject |
| IPv4 ili IPv6 literal | svi | reject |
| `localhost` | svi | reject |
| `.nr.test` van development allowlist-e | svi | reject |
| `unknown`, prazno ili malformed | svi | reject |

Dodati IDN/trailing-dot/port fixture-e i dokazati identičan rezultat u sva tri repozitorijuma.

## 13. Security i recovery testovi

- izmenjen jedan byte JWS-a;
- pogrešan issuer, audience, typ, tokenUse ili contractVersion;
- istekao/not-yet-valid token;
- unknown signing KID;
- raw token se ne pojavljuje u URL-u, logu, referreru, analyticsu ili DB-u;
- replay `accept`, `reserve` i `consume` sa istim idempotency key/body-jem vraća isti rezultat;
- isti idempotency key sa drugim body-jem daje conflict;
- isti intent u dve browser sesije ne pravi dva order-a;
- isti intent dodat konkurentno ili sa dve SKU variante ne pravi dve cart/order linije;
- SKU replace posle reservation-a se odbija;
- consume response loss se oporavlja bez drugog order-a;
- drugi product ili SKU van `allowedSkus`;
- promenjen hidden domain ili SKU se ignoriše/odbija;
- cart merge sa drugim intentom;
- checkout posle local/master expiry-ja;
- abandoned reservation lease se oslobađa samo pre order veze;
- payment se ne može započeti dok master consume nije potvrđen;
- failed payment nad consumed intentom može retry samo isti order;
- issuance bez consumed intenta ili sa drugim snapshot hashom se odbija;
- client i vendor canonical domain se nikada ne zamene.
- production well-known dokaz sa redirectom, private DNS odgovorom, drugim challengeom ili drugim installation potpisom se odbija;
- production startup odbija `development_allowlist_exemption` policy.

## 14. Gate

Gate prolazi kada:

- Buy dugme sa client CMS-a POST-uje intent na exact vendor acceptance endpoint;
- token nikada nije u URL-u i ne sadrži shared secret;
- vendor prikazuje `client.nr.test` sa čistog product URL-a;
- tampered/expired/replayed intent je odbijen;
- cart i checkout nose server-side `masterPurchaseIntentJti` i immutable snapshot;
- DB constraint garantuje jedan JTI → jedna cart linija → jedan order item;
- master potvrđuje `reserved -> consumed` pre početka payment-a;
- response loss ne stvara drugi order ili drugo consumption stanje;
- order item snapshot sadrži `client.nr.test` i snapshot hash;
- master issue dobija i proverava isti JTI/hash/domain/SKU/order;
- unique FK garantuje najviše jednu licencu po intentu;
- production intent/licenca imaju svež HTTPS domain-control evidence, dok lokalni E2E eksplicitno beleži development izuzetak;
- direktna poseta proizvodu bez accepted intenta ne može dodati domain-bound licencu u cart.
